const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const prisma = require("./utils/prisma");

const {
  initializeMessageSocket
} = require("./socket/message.socket");

const onlineUsers = new Map();

const { getAllowedOrigins } = require("./config/runtime.config");

const normalizeReference = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (typeof value === "object") {
    const nested =
      value.prismaId ??
      value.userId ??
      value.id ??
      value._id ??
      value.sub;

    if (
      nested !== undefined &&
      nested !== null &&
      nested !== value
    ) {
      return normalizeReference(
        nested
      );
    }
  }

  const normalized =
    String(value).trim();

  return normalized ===
    "[object Object]"
      ? ""
      : normalized;
};

function parsePositiveInt(value) {
  const normalized =
    normalizeReference(value);

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  return (
    Number.isSafeInteger(parsed) &&
    parsed > 0
  )
    ? parsed
    : null;
}

const getSocketToken = (socket) => {
  const authToken =
    socket.handshake.auth?.token;

  const authorization =
    socket.handshake.headers
      ?.authorization || "";

  if (authToken) {
    return String(authToken).replace(
      /^Bearer\s+/i,
      ""
    );
  }

  return String(authorization).replace(
    /^Bearer\s+/i,
    ""
  );
};

async function resolveSocketUser(payload) {
  const rawId =
    normalizeReference(
      payload.userId ??
      payload.id ??
      payload._id ??
      payload.sub
    );

  const email =
    String(payload.email || "")
      .trim()
      .toLowerCase();

  const select = {
    id: true,
    legacyMongoId: true,
    firstName: true,
    lastName: true,
    email: true,
    role: true,
    status: true,
    deletedAt: true
  };

  const numericId =
    parsePositiveInt(rawId);

  if (numericId) {
    const user =
      await prisma.user.findUnique({
        where: {
          id: numericId
        },
        select
      });

    if (user) {
      return user;
    }
  }

  if (email) {
    const user =
      await prisma.user.findUnique({
        where: {
          email
        },
        select
      });

    if (user) {
      return user;
    }
  }

  if (rawId) {
    const user =
      await prisma.user.findUnique({
        where: {
          legacyMongoId: rawId
        },
        select
      });

    if (user) {
      return user;
    }
  }

  return null;
}

const authenticateSocket = async (
  socket,
  next
) => {
  try {
    const token =
      getSocketToken(socket);

    if (!token) {
      return next(
        new Error(
          "AUTH_TOKEN_REQUIRED"
        )
      );
    }

    const secret =
      process.env.JWT_SECRET ||
      process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      return next(
        new Error(
          "JWT_SECRET_NOT_CONFIGURED"
        )
      );
    }

    const payload =
      jwt.verify(token, secret);

    const user =
      await resolveSocketUser(payload);

    if (!user) {
      return next(
        new Error("USER_NOT_FOUND")
      );
    }

    const status =
      String(user.status || "")
        .trim()
        .toUpperCase();

    const blockedStatuses =
      new Set([
        "SUSPENDED",
        "BANNED",
        "DELETED",
        "DISABLED"
      ]);

    if (
      user.deletedAt ||
      blockedStatuses.has(status)
    ) {
      return next(
        new Error(
          "USER_NOT_ALLOWED"
        )
      );
    }

    const fullName = [
      user.firstName,
      user.lastName
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    socket.userId =
      String(user.id);

    socket.user = {
      _id: String(user.id),
      id: user.id,
      firstName:
        user.firstName || "",
      lastName:
        user.lastName || "",
      name:
        fullName ||
        user.email ||
        "Usuario QSM",
      email:
        user.email || "",
      role:
        String(
          user.role || "USER"
        ).toUpperCase()
    };

    return next();
  } catch (error) {
    console.error(
      "Socket authentication error:",
      error.message
    );

    return next(
      new Error(
        "INVALID_OR_EXPIRED_TOKEN"
      )
    );
  }
};

const initializeSocket = (
  httpServer,
  app
) => {
  const io = new Server(
    httpServer,
    {
      cors: {
        origin(origin, callback) {
          const normalizedOrigin =
            String(origin || "")
              .trim()
              .replace(/\/$/, "");

          if (
            !origin ||
            getAllowedOrigins().includes(
              normalizedOrigin
            )
          ) {
            return callback(
              null,
              true
            );
          }

          return callback(
            new Error(
              "Origen no permitido por Socket.IO"
            )
          );
        },

        methods: [
          "GET",
          "POST",
          "PATCH",
          "PUT",
          "DELETE"
        ],

        credentials: true
      },

      transports: [
        "websocket",
        "polling"
      ],

      pingTimeout: 20000,
      pingInterval: 25000
    }
  );

  io.use(authenticateSocket);

  io.on(
    "connection",
    (socket) => {
      const userId =
        socket.userId;

      socket.join(
        `user:${userId}`
      );

      initializeMessageSocket(
        io,
        socket
      );

      const connections =
        onlineUsers.get(userId) ||
        new Set();

      connections.add(socket.id);

      onlineUsers.set(
        userId,
        connections
      );

      io.emit(
        "presence:changed",
        {
          userId,
          online: true,
          at:
            new Date().toISOString()
        }
      );

      socket.emit(
        "socket:ready",
        {
          success: true,
          socketId:
            socket.id,
          userId,
          user:
            socket.user
        }
      );

      console.log(
        `Socket conectado: ${socket.id} | usuario: ${userId}`
      );

      socket.on(
        "socket:ping",
        (callback) => {
          if (
            typeof callback ===
            "function"
          ) {
            callback({
              success: true,
              time:
                new Date().toISOString()
            });
          }
        }
      );

      socket.on(
        "disconnect",
        (reason) => {
          const connections =
            onlineUsers.get(userId);

          if (connections) {
            connections.delete(
              socket.id
            );

            if (
              connections.size === 0
            ) {
              onlineUsers.delete(
                userId
              );

              io.emit(
                "presence:changed",
                {
                  userId,
                  online: false,
                  at:
                    new Date()
                      .toISOString()
                }
              );
            }
          }

          console.log(
            `Socket desconectado: ${socket.id} | motivo: ${reason}`
          );
        }
      );

      socket.on(
        "error",
        (error) => {
          console.error(
            `Socket error ${socket.id}:`,
            error.message
          );
        }
      );
    }
  );

  app.set("io", io);

  return io;
};

module.exports = {
  initializeSocket,
  getAllowedOrigins
};