const mongoose = require("mongoose");
const validator = require("validator");

const Message = require("../models/Message");
const Order = require("../models/Order");
const FraudAlert = require("../models/FraudAlert");

const { analyzeMessage } = require("../services/messageAI.service");
const { createNotification } = require("../services/notification.service");

const allowedMessageTypes = ["TEXT", "IMAGE", "VIDEO", "AUDIO", "LOCATION"];

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const sanitizeText = (value) => {
  return validator.escape(String(value || "").trim());
};

const sendMessage = async (req, res) => {
  try {
    const { orderId, content, messageType, attachments } = req.body;

    if (!orderId || !content) {
      return res.status(400).json({
        success: false,
        message: "orderId y content son obligatorios"
      });
    }

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "orderId no es válido"
      });
    }

    if (messageType && !allowedMessageTypes.includes(messageType)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de mensaje no válido"
      });
    }

    const safeContent = sanitizeText(content);

    if (safeContent.length < 1 || safeContent.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "El mensaje debe tener entre 1 y 1000 caracteres"
      });
    }

    const safeAttachments = Array.isArray(attachments)
      ? attachments.slice(0, 5).map((item) => sanitizeText(item))
      : [];

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada"
      });
    }

    if (["CANCELLED", "COMPLETED"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "No se pueden enviar mensajes en una orden cerrada"
      });
    }

    const userId = req.user._id.toString();

    if (
      order.buyer.toString() !== userId &&
      order.seller.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para enviar mensajes en esta orden"
      });
    }

    const receiver =
      order.buyer.toString() === userId ? order.seller : order.buyer;

    const analysis = analyzeMessage(safeContent);

    const message = await Message.create({
      order: order._id,
      sender: req.user._id,
      receiver,
      product: order.product,
      messageType: messageType || "TEXT",
      content: safeContent,
      attachments: safeAttachments,
      isFlagged: analysis.isFlagged,
      riskLevel: analysis.riskLevel,
      aiReason: analysis.aiReason,
      status: analysis.isFlagged ? "BLOCKED" : "SENT"
    });

    if (analysis.isFlagged) {
      await FraudAlert.create({
        user: req.user._id,
        product: order.product,
        riskLevel: analysis.riskLevel,
        reason: analysis.aiReason,
        evidenceRequired: [
          "Revisar conversación",
          "Validar intento de pago fuera de QSM",
          "Revisar historial del usuario"
        ]
      });

      await createNotification(
        req.user._id,
        "SECURITY_ALERT",
        "Mensaje bloqueado por seguridad",
        "Quick Secure Market detectó un posible intento de mover la conversación o el pago fuera de la plataforma."
      );
    } else {
      await createNotification(
        receiver,
        "NEW_MESSAGE",
        "Nuevo mensaje recibido",
        "Tienes un nuevo mensaje relacionado con una orden en Quick Secure Market."
      );
    }

    return res.status(201).json({
      success: true,
      message: analysis.isFlagged
        ? "Mensaje bloqueado por seguridad. Quick Secure Market detectó posible intento de fraude."
        : "Mensaje enviado correctamente",
      resultado: {
        estadoMensaje: message.status,
        riesgo: analysis.riskLevel,
        marcadoPorIA: analysis.isFlagged,
        motivoIA: analysis.aiReason
      },
      data: message
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error enviando mensaje",
      error: error.message
    });
  }
};

const getOrderMessages = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "orderId no es válido"
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada"
      });
    }

    const userId = req.user._id.toString();

    if (
      order.buyer.toString() !== userId &&
      order.seller.toString() !== userId
    ) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para ver este chat"
      });
    }

    const messages = await Message.find({ order: orderId })
      .populate("sender", "firstName lastName email")
      .populate("receiver", "firstName lastName email")
      .sort({ createdAt: 1 });

    return res.json({
      success: true,
      message: "Mensajes obtenidos correctamente",
      count: messages.length,
      messages
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error obteniendo mensajes",
      error: error.message
    });
  }
};

module.exports = {
  sendMessage,
  getOrderMessages
};