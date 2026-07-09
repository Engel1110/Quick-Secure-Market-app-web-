const mongoose = require("mongoose");
const validator = require("validator");

const Message = require("../../models/Message");
const Conversation = require("../../models/Conversation");
const FraudAlert = require("../../models/FraudAlert");

const { analyzeMessage } = require("../../services/messageAI.service");
const { createNotification } = require("../../services/notification.service");

const allowedMessageTypes = [
  "TEXT",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "LOCATION",
  "FILE",
  "SYSTEM"
];

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const sanitizeText = (value) => {
  return validator.escape(String(value || "").trim());
};

const getUserId = (req) => {
  return req.user._id || req.user.id;
};

const normalizeAttachmentType = (mimeType = "") => {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  if (mimeType === "application/pdf") return "PDF";
  return "FILE";
};

const normalizeAttachments = (attachments) => {
  if (!Array.isArray(attachments)) return [];

  return attachments.slice(0, 5).map((item) => {
    if (typeof item === "string") {
      return {
        name: item.split("/").pop() || "archivo",
        url: sanitizeText(item),
        mimeType: "",
        size: 0,
        type: "FILE"
      };
    }

    const mimeType = item.mimeType || item.mimetype || "";

    return {
      name: sanitizeText(
        item.name || item.originalName || item.filename || "archivo"
      ),
      url: sanitizeText(item.url || ""),
      mimeType: sanitizeText(mimeType),
      size: Number(item.size || 0),
      type: item.type || normalizeAttachmentType(mimeType)
    };
  });
};

const toggleObjectIdInArray = (array = [], value) => {
  const exists = array.some((item) => String(item) === String(value));

  if (exists) {
    return array.filter((item) => String(item) !== String(value));
  }

  return [...array, value];
};

const emitToConversation = (req, conversationId, eventName, payload) => {
  const io = req.app.get("io");

  if (io && conversationId) {
    io.to(`conversation:${conversationId}`).emit(eventName, payload);
  }
};

const populateMessage = async (messageId) => {
  return Message.findById(messageId)
    .populate("sender", "firstName lastName name email")
    .populate("receiver", "firstName lastName name email")
    .populate("replyTo");
};

const getConversations = async (req, res) => {
  try {
    const userId = getUserId(req);

    const conversations = await Conversation.find({
      participants: userId,
      archivedBy: { $ne: userId }
    })
      .populate("participants", "firstName lastName name email")
      .populate("product", "title name price images")
      .populate("order")
      .populate("pinnedMessages")
      .sort({ updatedAt: -1 });

    return res.json({
      success: true,
      conversations
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error cargando conversaciones",
      error: error.message
    });
  }
};

const createConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { receiverId, productId, orderId } = req.body;

    if (!receiverId || !isValidObjectId(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "receiverId es obligatorio y debe ser válido"
      });
    }

    if (String(receiverId) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "No puedes crear una conversación contigo mismo"
      });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, receiverId] },
      product: productId || null,
      order: orderId || null
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, receiverId],
        product: productId || null,
        order: orderId || null
      });
    }

    conversation = await Conversation.findById(conversation._id)
      .populate("participants", "firstName lastName name email")
      .populate("product", "title name price images")
      .populate("order")
      .populate("pinnedMessages");

    return res.status(201).json({
      success: true,
      conversation
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creando conversación",
      error: error.message
    });
  }
};

const getConversationMessages = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;

    if (!isValidObjectId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "conversationId no es válido"
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversación no encontrada"
      });
    }

    const messages = await Message.find({
      conversation: conversationId
    })
      .populate("sender", "firstName lastName name email")
      .populate("receiver", "firstName lastName name email")
      .populate("replyTo")
      .sort({ createdAt: 1 });

    return res.json({
      success: true,
      messages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error cargando mensajes",
      error: error.message
    });
  }
};

const markConversationAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;

    if (!isValidObjectId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "conversationId no es válido"
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversación no encontrada"
      });
    }

    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        status: { $ne: "READ" }
      },
      {
        status: "READ",
        readAt: new Date()
      }
    );

    emitToConversation(req, conversationId, "messagesRead", {
      conversationId,
      userId
    });

    return res.json({
      success: true,
      message: "Mensajes marcados como leídos"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error marcando mensajes como leídos",
      error: error.message
    });
  }
};

const sendMessage = async (req, res) => {
  try {
    const userId = getUserId(req);

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
    } = req.body;

    const safeAttachments = normalizeAttachments(attachments);
    const finalContent = sanitizeText(text || content || "");

    if (!conversationId || !isValidObjectId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "conversationId es obligatorio y debe ser válido"
      });
    }

    if (!finalContent && safeAttachments.length === 0 && !location) {
      return res.status(400).json({
        success: false,
        message: "Debes enviar texto, archivo o ubicación"
      });
    }

    if (messageType && !allowedMessageTypes.includes(messageType)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de mensaje no válido"
      });
    }

    if (finalContent.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "El mensaje no puede superar los 1000 caracteres"
      });
    }

    if (replyTo && !isValidObjectId(replyTo)) {
      return res.status(400).json({
        success: false,
        message: "replyTo no es válido"
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversación no encontrada"
      });
    }

    if (
      Array.isArray(conversation.blockedBy) &&
      conversation.blockedBy.length > 0
    ) {
      return res.status(403).json({
        success: false,
        message: "Esta conversación está bloqueada"
      });
    }

    const receiver = conversation.participants.find(
      (id) => String(id) !== String(userId)
    );

    let analysis = {
      isFlagged: false,
      riskLevel: "LOW",
      aiReason: "Mensaje sin señales críticas."
    };

    if (finalContent) {
      analysis = analyzeMessage(finalContent);
    }

    const resolvedMessageType =
      messageType ||
      safeAttachments[0]?.type ||
      (location ? "LOCATION" : "TEXT");

    const message = await Message.create({
      conversation: conversation._id,
      order: orderId || conversation.order || null,
      sender: userId,
      receiver,
      product: productId || conversation.product || null,
      replyTo: replyTo || null,
      messageType: resolvedMessageType,
      content: finalContent || safeAttachments[0]?.name || "Archivo adjunto",
      text: finalContent,
      attachments: safeAttachments,
      location: location || undefined,
      isFlagged: analysis.isFlagged,
      riskLevel: analysis.riskLevel,
      aiReason: analysis.aiReason,
      status: analysis.isFlagged ? "BLOCKED" : "SENT"
    });

    conversation.lastMessage = {
      text: analysis.isFlagged
        ? "Mensaje bloqueado por seguridad"
        : finalContent || safeAttachments[0]?.name || "Archivo adjunto",
      sender: userId,
      createdAt: new Date()
    };

    await conversation.save();

    if (analysis.isFlagged) {
      await FraudAlert.create({
        user: userId,
        product: productId || conversation.product || null,
        riskLevel: analysis.riskLevel,
        reason: analysis.aiReason,
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
        "Quick Secure Market detectó un posible intento de mover la conversación o el pago fuera de la plataforma."
      );
    } else {
      await createNotification(
        receiver,
        "NEW_MESSAGE",
        "Nuevo mensaje recibido",
        "Tienes un nuevo mensaje en Quick Secure Market."
      );
    }

    const populatedMessage = await populateMessage(message._id);

    emitToConversation(
      req,
      conversation._id,
      "newMessage",
      populatedMessage
    );

    return res.status(201).json({
      success: true,
      message: populatedMessage,
      resultado: {
        estadoMensaje: populatedMessage.status,
        riesgo: analysis.riskLevel,
        marcadoPorIA: analysis.isFlagged,
        motivoIA: analysis.aiReason
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error enviando mensaje",
      error: error.message
    });
  }
};

const editMessage = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { messageId } = req.params;
    const { text, content } = req.body;

    const finalContent = sanitizeText(text || content);

    if (!messageId || !isValidObjectId(messageId)) {
      return res.status(400).json({
        success: false,
        message: "messageId no es válido"
      });
    }

    if (!finalContent) {
      return res.status(400).json({
        success: false,
        message: "El contenido del mensaje es obligatorio"
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Mensaje no encontrado"
      });
    }

    if (String(message.sender) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "No puedes editar un mensaje que no es tuyo"
      });
    }

    if (message.deletedForEveryone) {
      return res.status(400).json({
        success: false,
        message: "No puedes editar un mensaje eliminado"
      });
    }

    const analysis = analyzeMessage(finalContent);

    message.content = finalContent;
    message.text = finalContent;
    message.isEdited = true;
    message.editedAt = new Date();
    message.isFlagged = analysis.isFlagged;
    message.riskLevel = analysis.riskLevel;
    message.aiReason = analysis.aiReason;
    message.status = analysis.isFlagged ? "BLOCKED" : "SENT";

    await message.save();

    const populatedMessage = await populateMessage(message._id);

    emitToConversation(
      req,
      message.conversation,
      "messageUpdated",
      populatedMessage
    );

    return res.json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error editando mensaje",
      error: error.message
    });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { messageId } = req.params;

    if (!messageId || !isValidObjectId(messageId)) {
      return res.status(400).json({
        success: false,
        message: "messageId no es válido"
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Mensaje no encontrado"
      });
    }

    if (String(message.sender) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "No puedes eliminar un mensaje que no es tuyo"
      });
    }

    message.deletedForEveryone = true;
    message.deletedAt = new Date();
    message.content = "Mensaje eliminado";
    message.text = "Mensaje eliminado";
    message.isFlagged = false;
    message.aiReason = "";
    message.riskLevel = "LOW";
    message.status = "SENT";

    await message.save();

    const populatedMessage = await populateMessage(message._id);

    emitToConversation(
      req,
      message.conversation,
      "messageUpdated",
      populatedMessage
    );

    return res.json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error eliminando mensaje",
      error: error.message
    });
  }
};

const muteConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversación no encontrada"
      });
    }

    conversation.mutedBy = toggleObjectIdInArray(
      conversation.mutedBy || [],
      userId
    );

    await conversation.save();

    return res.json({
      success: true,
      message: "Estado de silencio actualizado",
      conversation
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error silenciando conversación",
      error: error.message
    });
  }
};

const archiveConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversación no encontrada"
      });
    }

    conversation.archivedBy = toggleObjectIdInArray(
      conversation.archivedBy || [],
      userId
    );

    await conversation.save();

    return res.json({
      success: true,
      message: "Estado de archivo actualizado",
      conversation
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error archivando conversación",
      error: error.message
    });
  }
};

const blockConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversación no encontrada"
      });
    }

    conversation.blockedBy = toggleObjectIdInArray(
      conversation.blockedBy || [],
      userId
    );

    conversation.status =
      conversation.blockedBy.length > 0 ? "BLOCKED" : "ACTIVE";

    await conversation.save();

    return res.json({
      success: true,
      message: "Estado de bloqueo actualizado",
      conversation
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error bloqueando conversación",
      error: error.message
    });
  }
};

const favoriteConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversación no encontrada"
      });
    }

    conversation.favoriteBy = toggleObjectIdInArray(
      conversation.favoriteBy || [],
      userId
    );

    await conversation.save();

    return res.json({
      success: true,
      message: "Favorito actualizado",
      conversation
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error actualizando favorito",
      error: error.message
    });
  }
};

const addConversationLabel = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "El nombre de la etiqueta es obligatorio"
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversación no encontrada"
      });
    }

    conversation.labels.push({
      name: sanitizeText(name),
      color: color || "#1976d2",
      createdBy: userId
    });

    await conversation.save();

    return res.status(201).json({
      success: true,
      message: "Etiqueta agregada",
      conversation
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error agregando etiqueta",
      error: error.message
    });
  }
};

const pinMessage = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { messageId } = req.params;

    if (!messageId || !isValidObjectId(messageId)) {
      return res.status(400).json({
        success: false,
        message: "messageId no es válido"
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Mensaje no encontrado"
      });
    }

    const conversation = await Conversation.findOne({
      _id: message.conversation,
      participants: userId
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para fijar este mensaje"
      });
    }

    conversation.pinnedMessages = toggleObjectIdInArray(
      conversation.pinnedMessages || [],
      messageId
    );

    await conversation.save();

    return res.json({
      success: true,
      message: "Mensaje fijado actualizado",
      conversation
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fijando mensaje",
      error: error.message
    });
  }
};

const searchMessages = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { q, conversationId } = req.query;

    if (!q || !String(q).trim()) {
      return res.status(400).json({
        success: false,
        message: "Debes enviar un texto de búsqueda"
      });
    }

    if (conversationId && !isValidObjectId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "conversationId no es válido"
      });
    }

    const conversations = await Conversation.find({
      participants: userId,
      ...(conversationId ? { _id: conversationId } : {})
    }).select("_id");

    const conversationIds = conversations.map((item) => item._id);

    const safeQuery = sanitizeText(q);

    const messages = await Message.find({
      conversation: { $in: conversationIds },
      deletedForEveryone: { $ne: true },
      $or: [
        { text: { $regex: safeQuery, $options: "i" } },
        { content: { $regex: safeQuery, $options: "i" } },
        { "attachments.name": { $regex: safeQuery, $options: "i" } }
      ]
    })
      .populate("sender", "firstName lastName name email")
      .populate("receiver", "firstName lastName name email")
      .populate("replyTo")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error buscando mensajes",
      error: error.message
    });
  }
};

const exportConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;

    if (!conversationId || !isValidObjectId(conversationId)) {
      return res.status(400).json({
        success: false,
        message: "conversationId no es válido"
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId
    })
      .populate("participants", "firstName lastName name email")
      .populate("product", "title name price")
      .populate("order");

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversación no encontrada"
      });
    }

    const messages = await Message.find({
      conversation: conversationId
    })
      .populate("sender", "firstName lastName name email")
      .populate("receiver", "firstName lastName name email")
      .populate("replyTo")
      .sort({ createdAt: 1 });

    conversation.exportCount = (conversation.exportCount || 0) + 1;
    await conversation.save();

    return res.json({
      success: true,
      fileName: `qsm-conversation-${conversationId}.json`,
      exportedAt: new Date(),
      conversation,
      messages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error exportando conversación",
      error: error.message
    });
  }
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