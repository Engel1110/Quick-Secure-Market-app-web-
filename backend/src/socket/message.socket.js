const prisma = require(
  "../utils/prisma"
);

const normalizeId = (value) =>
  String(
    value?._id ??
    value?.id ??
    value?.userId ??
    value ??
    ""
  ).trim();

function parsePositiveInt(value) {
  const normalized =
    normalizeId(value);

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

async function resolveUserId(value) {
  const numericId =
    parsePositiveInt(value);

  if (numericId) {
    return numericId;
  }

  const legacyMongoId =
    normalizeId(value);

  if (!legacyMongoId) {
    return null;
  }

  const user =
    await prisma.user.findUnique({
      where: {
        legacyMongoId
      },
      select: {
        id: true
      }
    });

  return user?.id || null;
}

async function resolveConversationId(value) {
  const numericId =
    parsePositiveInt(value);

  if (numericId) {
    return numericId;
  }

  const legacyMongoId =
    normalizeId(value);

  if (!legacyMongoId) {
    return null;
  }

  const conversation =
    await prisma.conversation.findFirst({
      where: {
        legacyMongoId
      },
      select: {
        id: true
      }
    });

  return conversation?.id || null;
}

const getConversationRoom = (
  conversationId
) =>
  `conversation:${normalizeId(
    conversationId
  )}`;

const sendCallback = (
  callback,
  payload
) => {
  if (typeof callback === "function") {
    callback(payload);
  }
};

async function getConversationForUser(
  conversationReference,
  userReference
) {
  const [
    conversationId,
    userId
  ] = await Promise.all([
    resolveConversationId(
      conversationReference
    ),
    resolveUserId(
      userReference
    )
  ]);

  if (!conversationId) {
    return {
      success: false,
      statusCode: 400,
      message:
        "conversationId no es válido."
    };
  }

  if (!userId) {
    return {
      success: false,
      statusCode: 401,
      message:
        "Usuario autenticado no válido."
    };
  }

  const participant =
    await prisma
      .conversationParticipant
      .findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId
          }
        },
        include: {
          conversation: {
            select: {
              id: true,
              status: true
            }
          }
        }
      });

  if (!participant) {
    const conversationExists =
      await prisma
        .conversation
        .findUnique({
          where: {
            id: conversationId
          },
          select: {
            id: true
          }
        });

    if (!conversationExists) {
      return {
        success: false,
        statusCode: 404,
        message:
          "Conversación no encontrada."
      };
    }

    return {
      success: false,
      statusCode: 403,
      message:
        "No tienes acceso a esta conversación."
    };
  }

  return {
    success: true,
    conversation:
      participant.conversation,
    participant,
    conversationId,
    userId
  };
}

const initializeMessageSocket = (
  io,
  socket
) => {
  const userId =
    normalizeId(
      socket.user?._id ||
      socket.userId
    );

  socket.on(
    "conversation:join",
    async (
      payload = {},
      callback
    ) => {
      try {
        const result =
          await getConversationForUser(
            payload.conversationId,
            userId
          );

        if (!result.success) {
          return sendCallback(
            callback,
            result
          );
        }

        const conversationId =
          String(
            result.conversationId
          );

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
              _id:
                socket.user._id,
              firstName:
                socket.user.firstName,
              lastName:
                socket.user.lastName,
              role:
                socket.user.role
            },
            joinedAt:
              new Date()
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

  socket.on(
    "conversation:leave",
    async (
      payload = {},
      callback
    ) => {
      try {
        const result =
          await getConversationForUser(
            payload.conversationId,
            userId
          );

        if (!result.success) {
          return sendCallback(
            callback,
            result
          );
        }

        const conversationId =
          String(
            result.conversationId
          );

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
            leftAt:
              new Date()
          }
        );

        return sendCallback(
          callback,
          {
            success: true,
            conversationId
          }
        );
      } catch {
        return sendCallback(
          callback,
          {
            success: false,
            message:
              "No se pudo salir de la conversación."
          }
        );
      }
    }
  );

  socket.on(
    "message:typing",
    async (payload = {}) => {
      try {
        const conversationId =
          await resolveConversationId(
            payload.conversationId
          );

        if (!conversationId) {
          return;
        }

        const room =
          getConversationRoom(
            conversationId
          );

        if (!socket.rooms.has(room)) {
          return;
        }

        socket.to(room).emit(
          "message:typing",
          {
            conversationId:
              String(conversationId),
            user: {
              _id:
                socket.user._id,
              firstName:
                socket.user.firstName,
              lastName:
                socket.user.lastName
            },
            typing: true,
            sentAt:
              new Date()
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

  socket.on(
    "message:stopTyping",
    async (payload = {}) => {
      const conversationId =
        await resolveConversationId(
          payload.conversationId
        );

      if (!conversationId) {
        return;
      }

      const room =
        getConversationRoom(
          conversationId
        );

      if (!socket.rooms.has(room)) {
        return;
      }

      socket.to(room).emit(
        "message:stopTyping",
        {
          conversationId:
            String(conversationId),
          userId,
          typing: false,
          sentAt:
            new Date()
        }
      );
    }
  );

  socket.on(
    "conversation:presence",
    async (
      payload = {},
      callback
    ) => {
      const conversationId =
        await resolveConversationId(
          payload.conversationId
        );

      if (!conversationId) {
        return sendCallback(
          callback,
          {
            success: false,
            conversationId: "",
            joined: false
          }
        );
      }

      const room =
        getConversationRoom(
          conversationId
        );

      return sendCallback(
        callback,
        {
          success:
            socket.rooms.has(room),
          conversationId:
            String(conversationId),
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
  if (!io || !conversationId) {
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
      sentAt:
        new Date()
    }
  );

  return true;
};

const emitMessageUpdated = (
  io,
  conversationId,
  message
) => {
  if (!io || !conversationId) {
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
      updatedAt:
        new Date()
    }
  );

  return true;
};

const emitMessageDeleted = (
  io,
  conversationId,
  message
) => {
  if (!io || !conversationId) {
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
      deletedAt:
        new Date()
    }
  );

  return true;
};

const emitMessagesRead = (
  io,
  conversationId,
  payload
) => {
  if (!io || !conversationId) {
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
      updatedAt:
        new Date()
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