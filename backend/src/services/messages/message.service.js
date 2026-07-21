// backend/src/services/messages/message.service.js

const Message = require("../../models/Message");
const Conversation = require("../../models/Conversation");
const FraudAlert = require("../../models/FraudAlert");

const {
  analyzeMessageSecurity
} = require("./messageSecurity.service");

const {
  createNotification
} = require("../notification.service");

const {
  ALLOWED_MESSAGE_TYPES,
  isValidObjectId,
  sanitizeText,
  normalizeAttachments,
  toggleObjectIdInArray,
  populateMessage
} = require("../../utils/messages/messageController.utils");

const {
  emitNewMessage,
  emitMessageUpdated,
  emitMessageDeleted,
  emitMessagesRead,
  emitConversationUpdated
} = require("../../socket/message.socket");

const badRequest = (
  message,
  statusCode = 400
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const ensureUserId = (userId) => {
  if (
    !userId ||
    !isValidObjectId(userId)
  ) {
    badRequest(
      "Usuario autenticado no válido.",
      401
    );
  }
};

const ensureConversationId = (
  conversationId
) => {
  if (
    !conversationId ||
    !isValidObjectId(conversationId)
  ) {
    badRequest(
      "conversationId es obligatorio y debe ser válido."
    );
  }
};

const ensureMessageId = (messageId) => {
  if (
    !messageId ||
    !isValidObjectId(messageId)
  ) {
    badRequest(
      "messageId no es válido."
    );
  }
};

const getConversationForUser = async (
  conversationId,
  userId
) => {
  ensureConversationId(
    conversationId
  );

  const conversation =
    await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

  if (!conversation) {
    badRequest(
      "Conversación no encontrada.",
      404
    );
  }

  return conversation;
};

const mapSecurityAnalysis = (
  content
) => {
  if (!content) {
    return {
      score: 0,
      riskLevel: "LOW",
      flagged: false,
      reasons: [],
      recommendation: "",
      reasonText:
        "Mensaje sin señales críticas."
    };
  }

  const security =
    analyzeMessageSecurity(content);

  const reasonText =
    security.reasons
      ?.map((reason) => reason.title)
      .filter(Boolean)
      .join(". ") ||
    "Mensaje sin señales críticas.";

  return {
    ...security,
    reasonText
  };
};

const getConversations = async ({
  userId
}) => {
  ensureUserId(userId);

  return Conversation.find({
    participants: userId,
    archivedBy: {
      $ne: userId
    }
  })
    .populate(
      "participants",
      "firstName lastName name email"
    )
    .populate(
      "product",
      "title name price images"
    )
    .populate("order")
    .populate("pinnedMessages")
    .sort({
      updatedAt: -1
    });
};

const createConversation = async ({
  userId,
  receiverId,
  productId,
  orderId
}) => {
  ensureUserId(userId);

  if (
    !receiverId ||
    !isValidObjectId(receiverId)
  ) {
    badRequest(
      "receiverId es obligatorio y debe ser válido."
    );
  }

  if (
    String(receiverId) ===
    String(userId)
  ) {
    badRequest(
      "No puedes crear una conversación contigo mismo."
    );
  }

  let conversation =
    await Conversation.findOne({
      participants: {
        $all: [userId, receiverId]
      },
      product: productId || null,
      order: orderId || null
    });

  if (!conversation) {
    conversation =
      await Conversation.create({
        participants: [
          userId,
          receiverId
        ],
        product:
          productId || null,
        order:
          orderId || null
      });
  }

  return Conversation.findById(
    conversation._id
  )
    .populate(
      "participants",
      "firstName lastName name email"
    )
    .populate(
      "product",
      "title name price images"
    )
    .populate("order")
    .populate("pinnedMessages");
};

const getConversationMessages = async ({
  userId,
  conversationId
}) => {

  ensureUserId(userId);

  const conversation =
    await getConversationForUser(
      conversationId,
      userId
    );

  return Message.find({
    conversation:
      conversation._id
  })
    .populate(
      "sender",
      "firstName lastName name email"
    )
    .populate(
      "receiver",
      "firstName lastName name email"
    )
    .populate("replyTo")
    .sort({
      createdAt: 1
    });

};

const markConversationAsRead =
async ({

  io,
  userId,
  conversationId

}) => {

  ensureUserId(userId);

  const conversation =
    await getConversationForUser(
      conversationId,
      userId
    );

  await Message.updateMany(

    {

      conversation:
        conversation._id,

      receiver:
        userId,

      status: {
        $ne: "READ"
      }

    },

    {

      status: "READ",

      readAt:
        new Date()

    }

  );

  emitMessagesRead(

    io,

    conversation._id,

    {

      userId,

      readAt:
        new Date()

    }

  );

  return {

    success: true,

    message:
      "Mensajes marcados como leídos."

  };

};

const sendMessage = async ({

  io,

  userId,

  body

}) => {

  ensureUserId(userId);

  const {

    conversationId,

    orderId,

    productId,

    text,

    content,

    messageType,

    attachments,

    replyTo,

    location

  } = body;

  const safeAttachments =
    normalizeAttachments(
      attachments
    );

  const finalContent =
    sanitizeText(
      text ||
      content ||
      ""
    );

  ensureConversationId(
    conversationId
  );

  if (
    !finalContent &&
    safeAttachments.length === 0 &&
    !location
  ) {
    badRequest(
      "Debes enviar texto, archivo o ubicación."
    );
  }

  if (
    messageType &&
    !ALLOWED_MESSAGE_TYPES.includes(
      messageType
    )
  ) {
    badRequest(
      "Tipo de mensaje no válido."
    );
  }

  if (
    finalContent.length > 1000
  ) {
    badRequest(
      "El mensaje no puede superar los 1000 caracteres."
    );
  }

  if (
    replyTo &&
    !isValidObjectId(replyTo)
  ) {
    badRequest(
      "replyTo no es válido."
    );
  }

  const conversation =
    await getConversationForUser(
      conversationId,
      userId
    );
      if (
    Array.isArray(
      conversation.blockedBy
    ) &&
    conversation.blockedBy.length > 0
  ) {
    badRequest(
      "Esta conversación está bloqueada.",
      403
    );
  }

  const receiver =
    conversation.participants.find(
      (participantId) =>
        String(participantId) !==
        String(userId)
    );

  if (!receiver) {
    badRequest(
      "No se pudo identificar al receptor del mensaje.",
      400
    );
  }

  const securityAnalysis =
    mapSecurityAnalysis(
      finalContent
    );

  const resolvedMessageType =
    messageType ||
    safeAttachments[0]?.type ||
    (location
      ? "LOCATION"
      : "TEXT");

  const message =
    await Message.create({
      conversation:
        conversation._id,

      order:
        orderId ||
        conversation.order ||
        null,

      sender:
        userId,

      receiver,

      product:
        productId ||
        conversation.product ||
        null,

      replyTo:
        replyTo || null,

      messageType:
        resolvedMessageType,

      content:
        finalContent ||
        safeAttachments[0]?.name ||
        (location
          ? "Ubicación compartida"
          : "Archivo adjunto"),

      text:
        finalContent,

      attachments:
        safeAttachments,

      location:
        location || undefined,

      isFlagged:
        securityAnalysis.flagged,

      riskLevel:
        securityAnalysis.riskLevel,

      aiReason:
        securityAnalysis.reasonText,

      securityScore:
        securityAnalysis.score,

      securityReasons:
        securityAnalysis.reasons,

      status:
        securityAnalysis.flagged
          ? "BLOCKED"
          : "SENT"
    });

  conversation.lastMessage = {
    text:
      securityAnalysis.flagged
        ? "Mensaje bloqueado por seguridad"
        : finalContent ||
          safeAttachments[0]?.name ||
          (location
            ? "Ubicación compartida"
            : "Archivo adjunto"),

    sender:
      userId,

    createdAt:
      new Date()
  };

  await conversation.save();

  if (
    securityAnalysis.flagged
  ) {
    await FraudAlert.create({
      user:
        userId,

      product:
        productId ||
        conversation.product ||
        null,

      riskLevel:
        securityAnalysis.riskLevel,

      reason:
        securityAnalysis.reasonText,

      evidenceRequired: [
        "Revisar conversación",
        "Validar intento de pago fuera de QSM",
        "Revisar historial del usuario"
      ]
    });

    await createNotification(
      userId,
      "SECURITY_ALERT",
      "Mensaje bloqueado por seguridad",
      "Quick Secure Market detectó contenido potencialmente riesgoso dentro del mensaje."
    );
  } else {
    await createNotification(
      receiver,
      "NEW_MESSAGE",
      "Nuevo mensaje recibido",
      "Tienes un nuevo mensaje en Quick Secure Market."
    );
  }

  const populatedMessage =
    await populateMessage(
      message._id
    );

  emitNewMessage(
    io,
    conversation._id,
    populatedMessage
  );

  emitConversationUpdated(
    io,
    conversation._id,
    "conversation:updated",
    {
      lastMessage:
        conversation.lastMessage
    }
  );

  return {
    success: true,

    message:
      populatedMessage,

    resultado: {
      estadoMensaje:
        populatedMessage.status,

      riesgo:
        securityAnalysis.riskLevel,

      marcadoPorIA:
        securityAnalysis.flagged,

      motivoIA:
        securityAnalysis.reasonText,

      puntuacionSeguridad:
        securityAnalysis.score
    }
  };
};
const editMessage = async ({

  io,
  userId,
  messageId,
  body

}) => {

  ensureUserId(userId);

  ensureMessageId(messageId);

  const finalContent =
    sanitizeText(
      body.text ||
      body.content ||
      ""
    );

  if (!finalContent) {
    badRequest(
      "El contenido del mensaje es obligatorio."
    );
  }

  if (
    finalContent.length > 1000
  ) {
    badRequest(
      "El mensaje no puede superar los 1000 caracteres."
    );
  }

  const message =
    await Message.findById(
      messageId
    );

  if (!message) {
    badRequest(
      "Mensaje no encontrado.",
      404
    );
  }

  if (
    String(message.sender) !==
    String(userId)
  ) {
    badRequest(
      "No puedes editar un mensaje que no es tuyo.",
      403
    );
  }

  if (
    message.deletedForEveryone
  ) {
    badRequest(
      "No puedes editar un mensaje eliminado."
    );
  }

  const securityAnalysis =
    mapSecurityAnalysis(
      finalContent
    );

  message.content =
    finalContent;

  message.text =
    finalContent;

  message.isEdited =
    true;

  message.editedAt =
    new Date();

  message.isFlagged =
    securityAnalysis.flagged;

  message.riskLevel =
    securityAnalysis.riskLevel;

  message.aiReason =
    securityAnalysis.reasonText;

  message.securityScore =
    securityAnalysis.score;

  message.securityReasons =
    securityAnalysis.reasons;

  message.status =
    securityAnalysis.flagged
      ? "BLOCKED"
      : "SENT";

  await message.save();

  const populatedMessage =
    await populateMessage(
      message._id
    );

  emitMessageUpdated(
    io,
    message.conversation,
    populatedMessage
  );

  if (
    securityAnalysis.flagged
  ) {

    await FraudAlert.create({

      user:
        userId,

      product:
        message.product ||
        null,

      riskLevel:
        securityAnalysis.riskLevel,

      reason:
        securityAnalysis.reasonText,

      evidenceRequired: [

        "Revisar edición del mensaje",

        "Validar intento de fraude",

        "Revisar historial del usuario"

      ]

    });

  }

  return {

    success: true,

    message:
      populatedMessage,

    resultado: {

      estadoMensaje:
        populatedMessage.status,

      riesgo:
        securityAnalysis.riskLevel,

      marcadoPorIA:
        securityAnalysis.flagged,

      motivoIA:
        securityAnalysis.reasonText,

      puntuacionSeguridad:
        securityAnalysis.score

    }

  };

};
const deleteMessage = async ({
  io,
  userId,
  messageId
}) => {
  ensureUserId(userId);

  ensureMessageId(messageId);

  const message =
    await Message.findById(
      messageId
    );

  if (!message) {
    badRequest(
      "Mensaje no encontrado.",
      404
    );
  }

  if (
    String(message.sender) !==
    String(userId)
  ) {
    badRequest(
      "No puedes eliminar un mensaje que no es tuyo.",
      403
    );
  }

  if (
    message.deletedForEveryone
  ) {
    badRequest(
      "Este mensaje ya fue eliminado."
    );
  }

  message.deletedForEveryone =
    true;

  message.deletedAt =
    new Date();

  message.content =
    "Mensaje eliminado";

  message.text =
    "Mensaje eliminado";

  message.attachments =
    [];

  message.location =
    undefined;

  message.isFlagged =
    false;

  message.aiReason =
    "";

  message.riskLevel =
    "LOW";

  message.securityScore =
    0;

  message.securityReasons =
    [];

  message.status =
    "SENT";

  await message.save();

  const conversation =
    await Conversation.findById(
      message.conversation
    );

  if (conversation) {
    const latestMessage =
      await Message.findOne({
        conversation:
          conversation._id,

        deletedForEveryone: {
          $ne: true
        }
      })
        .sort({
          createdAt: -1
        })
        .select(
          "text content sender createdAt attachments messageType"
        );

    if (latestMessage) {
      conversation.lastMessage = {
        text:
          latestMessage.text ||
          latestMessage.content ||
          latestMessage
            .attachments?.[0]
            ?.name ||
          "Archivo adjunto",

        sender:
          latestMessage.sender,

        createdAt:
          latestMessage.createdAt
      };
    } else {
      conversation.lastMessage = {
        text:
          "Sin mensajes",

        sender:
          null,

        createdAt:
          new Date()
      };
    }

    await conversation.save();
  }

  const populatedMessage =
    await populateMessage(
      message._id
    );

  emitMessageDeleted(
    io,
    message.conversation,
    {
      messageId:
        message._id,

      conversationId:
        message.conversation,

      deletedForEveryone:
        true,

      deletedAt:
        message.deletedAt,

      message:
        populatedMessage
    }
  );

  if (conversation) {
    emitConversationUpdated(
      io,
      conversation._id,
      "conversation:updated",
      {
        lastMessage:
          conversation.lastMessage
      }
    );
  }

  return {
    success: true,

    message:
      populatedMessage,

    deletedMessageId:
      message._id
  };
};
const muteConversation = async ({
  userId,
  conversationId
}) => {

  ensureUserId(userId);

  const conversation =
    await getConversationForUser(
      conversationId,
      userId
    );

  conversation.mutedBy =
    toggleObjectIdInArray(
      conversation.mutedBy || [],
      userId
    );

  await conversation.save();

  return {
    success: true,
    message:
      "Estado de silencio actualizado.",
    conversation
  };

};

const archiveConversation = async ({
  userId,
  conversationId
}) => {

  ensureUserId(userId);

  const conversation =
    await getConversationForUser(
      conversationId,
      userId
    );

  conversation.archivedBy =
    toggleObjectIdInArray(
      conversation.archivedBy || [],
      userId
    );

  await conversation.save();

  return {
    success: true,
    message:
      "Estado de archivo actualizado.",
    conversation
  };

};

const blockConversation = async ({
  userId,
  conversationId
}) => {

  ensureUserId(userId);

  const conversation =
    await getConversationForUser(
      conversationId,
      userId
    );

  conversation.blockedBy =
    toggleObjectIdInArray(
      conversation.blockedBy || [],
      userId
    );

  conversation.status =
    conversation.blockedBy.length > 0
      ? "BLOCKED"
      : "ACTIVE";

  await conversation.save();

  return {
    success: true,
    message:
      "Estado de bloqueo actualizado.",
    conversation
  };

};

const favoriteConversation = async ({
  userId,
  conversationId
}) => {

  ensureUserId(userId);

  const conversation =
    await getConversationForUser(
      conversationId,
      userId
    );

  conversation.favoriteBy =
    toggleObjectIdInArray(
      conversation.favoriteBy || [],
      userId
    );

  await conversation.save();

  return {
    success: true,
    message:
      "Favorito actualizado.",
    conversation
  };

};

const addConversationLabel = async ({
  userId,
  conversationId,
  body
}) => {

  ensureUserId(userId);

  const {
    name,
    color
  } = body;

  if (!name) {
    badRequest(
      "El nombre de la etiqueta es obligatorio."
    );
  }

  const conversation =
    await getConversationForUser(
      conversationId,
      userId
    );

  conversation.labels.push({

    name:
      sanitizeText(name),

    color:
      color ||
      "#1976d2",

    createdBy:
      userId

  });

  await conversation.save();

  return {

    success: true,

    message:
      "Etiqueta agregada.",

    conversation

  };

};

const pinMessage = async ({
  userId,
  messageId
}) => {
  ensureUserId(userId);
  ensureMessageId(messageId);

  const message = await Message.findById(
    messageId
  );

  if (!message) {
    badRequest(
      "Mensaje no encontrado.",
      404
    );
  }

  const conversation =
    await Conversation.findOne({
      _id: message.conversation,
      participants: userId
    });

  if (!conversation) {
    badRequest(
      "No tienes permiso para fijar este mensaje.",
      403
    );
  }

  conversation.pinnedMessages =
    toggleObjectIdInArray(
      conversation.pinnedMessages || [],
      messageId
    );

  await conversation.save();

  return {
    success: true,
    message:
      "Mensaje fijado actualizado.",
    conversation
  };
};

const searchMessages = async ({
  userId,
  query,
  conversationId
}) => {
  ensureUserId(userId);

  if (
    !query ||
    !String(query).trim()
  ) {
    badRequest(
      "Debes enviar un texto de búsqueda."
    );
  }

  if (
    conversationId &&
    !isValidObjectId(conversationId)
  ) {
    badRequest(
      "conversationId no es válido."
    );
  }

  const conversations =
    await Conversation.find({
      participants: userId,

      ...(conversationId
        ? {
            _id: conversationId
          }
        : {})
    }).select("_id");

  const conversationIds =
    conversations.map(
      (conversation) =>
        conversation._id
    );

  const safeQuery =
    sanitizeText(query);

  const escapedQuery =
    safeQuery.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const messages =
    await Message.find({
      conversation: {
        $in: conversationIds
      },

      deletedForEveryone: {
        $ne: true
      },

      $or: [
        {
          text: {
            $regex: escapedQuery,
            $options: "i"
          }
        },
        {
          content: {
            $regex: escapedQuery,
            $options: "i"
          }
        },
        {
          "attachments.name": {
            $regex: escapedQuery,
            $options: "i"
          }
        }
      ]
    })
      .populate(
        "sender",
        "firstName lastName name email"
      )
      .populate(
        "receiver",
        "firstName lastName name email"
      )
      .populate("replyTo")
      .sort({
        createdAt: -1
      });

  return {
    success: true,
    count: messages.length,
    messages
  };
};

const exportConversation = async ({
  userId,
  conversationId
}) => {
  ensureUserId(userId);

  ensureConversationId(
    conversationId
  );

  const conversation =
    await Conversation.findOne({
      _id: conversationId,
      participants: userId
    })
      .populate(
        "participants",
        "firstName lastName name email"
      )
      .populate(
        "product",
        "title name price"
      )
      .populate("order");

  if (!conversation) {
    badRequest(
      "Conversación no encontrada.",
      404
    );
  }

  const messages =
    await Message.find({
      conversation: conversationId
    })
      .populate(
        "sender",
        "firstName lastName name email"
      )
      .populate(
        "receiver",
        "firstName lastName name email"
      )
      .populate("replyTo")
      .sort({
        createdAt: 1
      });

  conversation.exportCount =
    (conversation.exportCount || 0) + 1;

  await conversation.save();

  return {
    success: true,

    fileName:
      `qsm-conversation-${conversationId}.json`,

    exportedAt:
      new Date(),

    conversation,
    messages
  };
};

module.exports = {
  getConversations,
  createConversation,
  getConversationMessages,
  markConversationAsRead,
  sendMessage,
  editMessage,
  deleteMessage,
  muteConversation,
  archiveConversation,
  blockConversation,
  favoriteConversation,
  addConversationLabel,
  pinMessage,
  searchMessages,
  exportConversation
};