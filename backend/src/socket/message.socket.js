// backend/src/socket/message.socket.js

const mongoose = require("mongoose");

const Conversation = require("../models/Conversation");

const getConversationRoom = (conversationId) =>
  `conversation:${conversationId}`;

const normalizeId = (value) =>
  String(value?._id || value || "");

const isValidObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(
    String(value || "")
  );

const isConversationParticipant = (
  conversation,
  userId
) =>
  Array.isArray(conversation?.participants) &&
  conversation.participants.some(
    (participant) =>
      normalizeId(participant) ===
      String(userId)
  );

const sendCallback = (
  callback,
  payload
) => {
  if (typeof callback === "function") {
    callback(payload);
  }
};

const getConversationForUser = async (
  conversationId,
  userId
) => {
  if (
    !isValidObjectId(conversationId)
  ) {
    return {
      success: false,
      statusCode: 400,
      message:
        "conversationId no es válido."
    };
  }

  const conversation =
    await Conversation.findById(
      conversationId
    ).select(
      "_id participants blockedBy status"
    );

  if (!conversation) {
    return {
      success: false,
      statusCode: 404,
      message:
        "Conversación no encontrada."
    };
  }

  if (
    !isConversationParticipant(
      conversation,
      userId
    )
  ) {
    return {
      success: false,
      statusCode: 403,
      message:
        "No tienes acceso a esta conversación."
    };
  }

  return {
    success: true,
    conversation
  };
};

const initializeMessageSocket = (
  io,
  socket
) => {
const userId = normalizeId(
  socket.user?._id ||
  socket.userId
);

  /*
  |--------------------------------------------------------------------------
  | Entrar a conversación
  |--------------------------------------------------------------------------
  */

  socket.on(
    "conversation:join",
    async (
      payload = {},
      callback
    ) => {
      try {
        const conversationId =
          String(
            payload.conversationId || ""
          ).trim();

        const result =
          await getConversationForUser(
            conversationId,
            userId
          );

        if (!result.success) {
          return sendCallback(
            callback,
            result
          );
        }

        const room =
          getConversationRoom(
            conversationId
          );

        socket.join(room);

        socket.to(room).emit(
          "conversation:userJoined",
          {
            conversationId,
            user: {
              _id: socket.user._id,
              firstName:
                socket.user.firstName,
              lastName:
                socket.user.lastName,
              role:
                socket.user.role
            },
            joinedAt: new Date()
          }
        );

        return sendCallback(
          callback,
          {
            success: true,
            conversationId,
            room
          }
        );
      } catch (error) {
        console.error(
          "Error joining conversation:",
          error
        );

        return sendCallback(
          callback,
          {
            success: false,
            message:
              "No se pudo entrar a la conversación."
          }
        );
      }
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Salir de conversación
  |--------------------------------------------------------------------------
  */

  socket.on(
    "conversation:leave",
    (
      payload = {},
      callback
    ) => {
      const conversationId =
        String(
          payload.conversationId || ""
        ).trim();

      if (
        !isValidObjectId(
          conversationId
        )
      ) {
        return sendCallback(
          callback,
          {
            success: false,
            message:
              "conversationId no es válido."
          }
        );
      }

      const room =
        getConversationRoom(
          conversationId
        );

      socket.leave(room);

      socket.to(room).emit(
        "conversation:userLeft",
        {
          conversationId,
          userId,
          leftAt: new Date()
        }
      );

      return sendCallback(
        callback,
        {
          success: true,
          conversationId
        }
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Usuario escribiendo
  |--------------------------------------------------------------------------
  */

  socket.on(
    "message:typing",
    async (payload = {}) => {
      try {
        const conversationId =
          String(
            payload.conversationId || ""
          ).trim();

        const room =
          getConversationRoom(
            conversationId
          );

        if (
          !socket.rooms.has(room)
        ) {
          return;
        }

        socket.to(room).emit(
          "message:typing",
          {
            conversationId,
            user: {
              _id: socket.user._id,
              firstName:
                socket.user.firstName,
              lastName:
                socket.user.lastName
            },
            typing: true,
            sentAt: new Date()
          }
        );
      } catch (error) {
        console.error(
          "Message typing error:",
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
    "message:stopTyping",
    (payload = {}) => {
      const conversationId =
        String(
          payload.conversationId || ""
        ).trim();

      const room =
        getConversationRoom(
          conversationId
        );

      if (
        !socket.rooms.has(room)
      ) {
        return;
      }

      socket.to(room).emit(
        "message:stopTyping",
        {
          conversationId,
          userId,
          typing: false,
          sentAt: new Date()
        }
      );
    }
  );

  /*
  |--------------------------------------------------------------------------
  | Confirmar presencia en conversación
  |--------------------------------------------------------------------------
  */

  socket.on(
    "conversation:presence",
    (
      payload = {},
      callback
    ) => {
      const conversationId =
        String(
          payload.conversationId || ""
        ).trim();

      const room =
        getConversationRoom(
          conversationId
        );

      return sendCallback(
        callback,
        {
          success:
            socket.rooms.has(room),
          conversationId,
          joined:
            socket.rooms.has(room)
        }
      );
    }
  );
};

const emitNewMessage = (
  io,
  conversationId,
  message
) => {
  if (
    !io ||
    !conversationId
  ) {
    return false;
  }

  io.to(
    getConversationRoom(
      conversationId
    )
  ).emit(
    "message:new",
    {
      conversationId:
        String(conversationId),
      message,
      sentAt: new Date()
    }
  );

  return true;
};

const emitMessageUpdated = (
  io,
  conversationId,
  message
) => {
  if (
    !io ||
    !conversationId
  ) {
    return false;
  }

  io.to(
    getConversationRoom(
      conversationId
    )
  ).emit(
    "message:updated",
    {
      conversationId:
        String(conversationId),
      message,
      updatedAt: new Date()
    }
  );

  return true;
};

const emitMessageDeleted = (
  io,
  conversationId,
  message
) => {
  if (
    !io ||
    !conversationId
  ) {
    return false;
  }

  io.to(
    getConversationRoom(
      conversationId
    )
  ).emit(
    "message:deleted",
    {
      conversationId:
        String(conversationId),
      messageId:
        normalizeId(message),
      message,
      deletedAt: new Date()
    }
  );

  return true;
};

const emitMessagesRead = (
  io,
  conversationId,
  payload
) => {
  if (
    !io ||
    !conversationId
  ) {
    return false;
  }

  io.to(
    getConversationRoom(
      conversationId
    )
  ).emit(
    "message:read",
    {
      conversationId:
        String(conversationId),
      ...payload,
      readAt:
        payload?.readAt ||
        new Date()
    }
  );

  return true;
};

const emitConversationUpdated = (
  io,
  conversationId,
  event,
  payload = {}
) => {
  if (
    !io ||
    !conversationId ||
    !event
  ) {
    return false;
  }

  io.to(
    getConversationRoom(
      conversationId
    )
  ).emit(
    event,
    {
      conversationId:
        String(conversationId),
      ...payload,
      updatedAt: new Date()
    }
  );

  return true;
};

module.exports = {
  initializeMessageSocket,
  getConversationRoom,
  emitNewMessage,
  emitMessageUpdated,
  emitMessageDeleted,
  emitMessagesRead,
  emitConversationUpdated
};