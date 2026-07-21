// backend/src/socket.js

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("./models/User");

const {
  initializeMessageSocket
} = require("./socket/message.socket");

const onlineUsers = new Map();

const splitOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);

const getAllowedOrigins = () =>
  Array.from(
    new Set([
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "https://quick-secure-market-app-web.vercel.app",
      ...splitOrigins(process.env.FRONTEND_URL),
      ...splitOrigins(process.env.ALLOWED_ORIGINS)
    ])
  );

const getSocketToken = (socket) => {
  const authToken =
    socket.handshake.auth?.token;

  const authorization =
    socket.handshake.headers?.authorization ||
    "";

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

const authenticateSocket = async (
  socket,
  next
) => {
  try {
    const token = getSocketToken(socket);

    if (!token) {
      return next(
        new Error("AUTH_TOKEN_REQUIRED")
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

    const payload = jwt.verify(
      token,
      secret
    );

    const userId =
      payload.userId ||
      payload.id ||
      payload._id ||
      payload.sub;

    if (
      !mongoose.Types.ObjectId.isValid(
        String(userId || "")
      )
    ) {
      return next(
        new Error("INVALID_USER_ID")
      );
    }

    const user = await User.findById(
      userId
    ).select(
      "_id firstName lastName name email role status isActive"
    );

    if (!user) {
      return next(
        new Error("USER_NOT_FOUND")
      );
    }

    const status = String(
      user.status || ""
    ).toUpperCase();

    if (
      user.isActive === false ||
      status === "SUSPENDED" ||
      status === "BANNED"
    ) {
      return next(
        new Error("USER_NOT_ALLOWED")
      );
    }

    socket.userId = String(user._id);

    socket.user = {
      _id: user._id,
      firstName:
        user.firstName || "",
      lastName:
        user.lastName || "",
      name:
        user.name || "",
      email:
        user.email || "",
      role: String(
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
        origin(
          origin,
          callback
        ) {
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

      /*
      |--------------------------------------------------------------------------
      | Sala personal
      |--------------------------------------------------------------------------
      */

      socket.join(
        `user:${userId}`
      );

      /*
      |--------------------------------------------------------------------------
      | Registrar módulo de mensajes
      |--------------------------------------------------------------------------
      */

      initializeMessageSocket(
        io,
        socket
      );

      /*
      |--------------------------------------------------------------------------
      | Presencia
      |--------------------------------------------------------------------------
      */

      const connections =
        onlineUsers.get(userId) ||
        new Set();

      connections.add(
        socket.id
      );

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

      /*
      |--------------------------------------------------------------------------
      | Ping
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | Desconexión
      |--------------------------------------------------------------------------
      */

      socket.on(
        "disconnect",
        (reason) => {
          const current =
            onlineUsers.get(
              userId
            );

          if (current) {
            current.delete(
              socket.id
            );

            if (
              current.size === 0
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
                    new Date().toISOString()
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