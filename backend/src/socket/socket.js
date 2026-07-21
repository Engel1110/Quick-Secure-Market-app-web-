const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Dispute = require("../models/Dispute");

/*
|--------------------------------------------------------------------------
| Roles autorizados para el Back Office
|--------------------------------------------------------------------------
*/

const BACKOFFICE_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "AUDITOR",
  "DISPUTE_AGENT",
  "WAREHOUSE"
];

/*
|--------------------------------------------------------------------------
| Utilidades
|--------------------------------------------------------------------------
*/

const normalizeRole = (role) => {
  return String(role || "")
    .trim()
    .toUpperCase();
};

const getSocketToken = (socket) => {
  const authToken = socket.handshake.auth?.token;

  const authorizationHeader =
    socket.handshake.headers?.authorization;

  if (authToken) {
    return String(authToken).replace(
      /^Bearer\s+/i,
      ""
    );
  }

  if (authorizationHeader) {
    return String(
      authorizationHeader
    ).replace(/^Bearer\s+/i, "");
  }

  return "";
};

const getUserRoom = (userId) => {
  return `user:${userId}`;
};

const getDisputeRoom = (disputeId) => {
  return `dispute:${disputeId}`;
};

const isBackofficeUser = (user) => {
  return BACKOFFICE_ROLES.includes(
    normalizeRole(user?.role)
  );
};

const isParticipant = (
  dispute,
  userId
) => {
  const normalizedUserId =
    String(userId);

  const buyerId = String(
    dispute?.buyer?._id ||
      dispute?.buyer ||
      ""
  );

  const sellerId = String(
    dispute?.seller?._id ||
      dispute?.seller ||
      ""
  );

  return (
    buyerId === normalizedUserId ||
    sellerId === normalizedUserId
  );
};

/*
|--------------------------------------------------------------------------
| Autenticación de Socket.IO
|--------------------------------------------------------------------------
*/

const socketAuthMiddleware = async (
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

    if (!process.env.JWT_SECRET) {
      return next(
        new Error(
          "JWT_SECRET_NOT_CONFIGURED"
        )
      );
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const userId =
      decoded.id ||
      decoded.userId ||
      decoded._id;

    if (!userId) {
      return next(
        new Error(
          "INVALID_TOKEN_PAYLOAD"
        )
      );
    }

    const user = await User.findById(
      userId
    ).select(
      "_id firstName lastName email role status isActive"
    );

    if (!user) {
      return next(
        new Error(
          "USER_NOT_FOUND"
        )
      );
    }

    if (
      user.isActive === false ||
      String(user.status || "")
        .toUpperCase() ===
        "SUSPENDED" ||
      String(user.status || "")
        .toUpperCase() === "BANNED"
    ) {
      return next(
        new Error(
          "USER_NOT_ALLOWED"
        )
      );
    }

    socket.user = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: normalizeRole(
        user.role
      )
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

/*
|--------------------------------------------------------------------------
| Inicialización principal
|--------------------------------------------------------------------------
*/

const initializeSocket = (io) => {
  io.use(socketAuthMiddleware);

  io.on(
    "connection",
    async (socket) => {
      const userId = String(
        socket.user._id
      );

      const userRole =
        normalizeRole(
          socket.user.role
        );

      /*
      |--------------------------------------------------------------------------
      | Sala personal
      |--------------------------------------------------------------------------
      */

      socket.join(
        getUserRoom(userId)
      );

      /*
      |--------------------------------------------------------------------------
      | Sala general del Back Office
      |--------------------------------------------------------------------------
      */

      if (
        isBackofficeUser(
          socket.user
        )
      ) {
        socket.join(
          "admin-disputes"
        );

        socket.join(
          `role:${userRole}`
        );
      }

      socket.emit("socket:ready", {
        success: true,
        socketId: socket.id,
        userId,
        role: userRole
      });

      console.log(
        `🔌 Socket connected: ${socket.id} | user:${userId} | role:${userRole}`
      );

      /*
      |--------------------------------------------------------------------------
      | Entrar a una disputa
      |--------------------------------------------------------------------------
      */

      socket.on(
        "dispute:join",
        async (
          payload = {},
          callback
        ) => {
          try {
            const disputeId =
              String(
                payload.disputeId ||
                  ""
              ).trim();

            if (!disputeId) {
              const response = {
                success: false,
                message:
                  "disputeId es obligatorio."
              };

              if (
                typeof callback ===
                "function"
              ) {
                callback(response);
              }

              return;
            }

            const dispute =
              await Dispute.findById(
                disputeId
              ).select(
                "buyer seller assignedAdmin status"
              );

            if (!dispute) {
              const response = {
                success: false,
                message:
                  "Disputa no encontrada."
              };

              if (
                typeof callback ===
                "function"
              ) {
                callback(response);
              }

              return;
            }

            const assignedAdminId =
              String(
                dispute.assignedAdmin ||
                  ""
              );

            const allowed =
              isParticipant(
                dispute,
                userId
              ) ||
              isBackofficeUser(
                socket.user
              ) ||
              assignedAdminId ===
                userId;

            if (!allowed) {
              const response = {
                success: false,
                message:
                  "No tienes permiso para entrar a esta disputa."
              };

              if (
                typeof callback ===
                "function"
              ) {
                callback(response);
              }

              return;
            }

            const room =
              getDisputeRoom(
                disputeId
              );

            socket.join(room);

            socket.to(room).emit(
              "dispute:userJoined",
              {
                disputeId,
                user: {
                  _id:
                    socket.user._id,
                  firstName:
                    socket.user
                      .firstName,
                  lastName:
                    socket.user
                      .lastName,
                  role:
                    socket.user.role
                },
                joinedAt:
                  new Date()
              }
            );

            const response = {
              success: true,
              disputeId,
              room,
              status:
                dispute.status
            };

            if (
              typeof callback ===
              "function"
            ) {
              callback(response);
            }
          } catch (error) {
            console.error(
              "Error joining dispute room:",
              error
            );

            if (
              typeof callback ===
              "function"
            ) {
              callback({
                success: false,
                message:
                  "No se pudo entrar a la disputa."
              });
            }
          }
        }
      );

      /*
      |--------------------------------------------------------------------------
      | Salir de una disputa
      |--------------------------------------------------------------------------
      */

      socket.on(
        "dispute:leave",
        (
          payload = {},
          callback
        ) => {
          const disputeId =
            String(
              payload.disputeId ||
                ""
            ).trim();

          if (!disputeId) {
            if (
              typeof callback ===
              "function"
            ) {
              callback({
                success: false,
                message:
                  "disputeId es obligatorio."
              });
            }

            return;
          }

          const room =
            getDisputeRoom(
              disputeId
            );

          socket.leave(room);

          socket.to(room).emit(
            "dispute:userLeft",
            {
              disputeId,
              userId,
              leftAt: new Date()
            }
          );

          if (
            typeof callback ===
            "function"
          ) {
            callback({
              success: true,
              disputeId
            });
          }
        }
      );

      /*
      |--------------------------------------------------------------------------
      | Usuario escribiendo
      |--------------------------------------------------------------------------
      */

      socket.on(
        "dispute:typing",
        async (payload = {}) => {
          try {
            const disputeId =
              String(
                payload.disputeId ||
                  ""
              ).trim();

            if (!disputeId) {
              return;
            }

            const room =
              getDisputeRoom(
                disputeId
              );

            if (
              !socket.rooms.has(room)
            ) {
              return;
            }

            socket.to(room).emit(
              "dispute:typing",
              {
                disputeId,
                user: {
                  _id:
                    socket.user._id,
                  firstName:
                    socket.user
                      .firstName,
                  lastName:
                    socket.user
                      .lastName,
                  role:
                    socket.user.role
                },
                typing: true
              }
            );
          } catch (error) {
            console.error(
              "Socket typing error:",
              error.message
            );
          }
        }
      );

      /*
      |--------------------------------------------------------------------------
      | Usuario dejó de escribir
      |--------------------------------------------------------------------------
      */

      socket.on(
        "dispute:stopTyping",
        (payload = {}) => {
          const disputeId =
            String(
              payload.disputeId ||
                ""
            ).trim();

          if (!disputeId) {
            return;
          }

          const room =
            getDisputeRoom(
              disputeId
            );

          if (
            !socket.rooms.has(room)
          ) {
            return;
          }

          socket.to(room).emit(
            "dispute:stopTyping",
            {
              disputeId,
              userId:
                socket.user._id,
              typing: false
            }
          );
        }
      );

      /*
      |--------------------------------------------------------------------------
      | Confirmación de lectura
      |--------------------------------------------------------------------------
      */

      socket.on(
        "dispute:messageRead",
        async (
          payload = {},
          callback
        ) => {
          try {
            const disputeId =
              String(
                payload.disputeId ||
                  ""
              ).trim();

            const messageId =
              String(
                payload.messageId ||
                  ""
              ).trim();

            if (
              !disputeId ||
              !messageId
            ) {
              if (
                typeof callback ===
                "function"
              ) {
                callback({
                  success: false,
                  message:
                    "disputeId y messageId son obligatorios."
                });
              }

              return;
            }

            const dispute =
              await Dispute.findOne({
                _id: disputeId,
                "messages._id":
                  messageId
              });

            if (!dispute) {
              if (
                typeof callback ===
                "function"
              ) {
                callback({
                  success: false,
                  message:
                    "Disputa o mensaje no encontrado."
                });
              }

              return;
            }

            const allowed =
              isParticipant(
                dispute,
                userId
              ) ||
              isBackofficeUser(
                socket.user
              );

            if (!allowed) {
              if (
                typeof callback ===
                "function"
              ) {
                callback({
                  success: false,
                  message:
                    "No autorizado."
                });
              }

              return;
            }

            const message =
              dispute.messages.id(
                messageId
              );

            if (!message) {
              if (
                typeof callback ===
                "function"
              ) {
                callback({
                  success: false,
                  message:
                    "Mensaje no encontrado."
                });
              }

              return;
            }

            const alreadyRead =
              message.readBy.some(
                (entry) =>
                  String(
                    entry.user
                  ) === userId
              );

            if (!alreadyRead) {
              message.readBy.push({
                user:
                  socket.user._id,
                readAt:
                  new Date()
              });

              await dispute.save();
            }

            const eventPayload = {
              disputeId,
              messageId,
              readBy: {
                userId,
                readAt:
                  new Date()
              }
            };

            io.to(
              getDisputeRoom(
                disputeId
              )
            ).emit(
              "dispute:messageRead",
              eventPayload
            );

            if (
              typeof callback ===
              "function"
            ) {
              callback({
                success: true,
                ...eventPayload
              });
            }
          } catch (error) {
            console.error(
              "Socket messageRead error:",
              error
            );

            if (
              typeof callback ===
              "function"
            ) {
              callback({
                success: false,
                message:
                  "No se pudo marcar el mensaje como leído."
              });
            }
          }
        }
      );

      /*
      |--------------------------------------------------------------------------
      | Ping de conexión
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
              time: new Date()
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
          console.log(
            `🔌 Socket disconnected: ${socket.id} | reason:${reason}`
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

  return io;
};

module.exports = {
  initializeSocket,
  getUserRoom,
  getDisputeRoom,
  isBackofficeUser
};