const mongoose = require("mongoose");

const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");

const {
  analyzeMessageSecurity,
  summarizeConversationSecurity
} = require("../../services/messages/messageSecurity.service");

function getUserId(req) {
  return (
    req.user?._id ||
    req.user?.id ||
    req.userId ||
    ""
  );
}

function isParticipant(conversation, userId) {
  return conversation.participants.some(
    (participant) =>
      String(participant?._id || participant) ===
      String(userId)
  );
}

const analyzeText = async (req, res) => {
  try {
    const result = analyzeMessageSecurity(
      req.body?.text
    );

    return res.json({
      success: true,
      analysis: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "No se pudo analizar el contenido.",
      error: error.message
    });
  }
};

const analyzeConversation = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { conversationId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        String(conversationId)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Conversación inválida."
      });
    }

    const conversation =
      await Conversation.findById(
        conversationId
      );

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversación no encontrada."
      });
    }

    if (!isParticipant(conversation, userId)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes acceso a esta conversación."
      });
    }

    const messages =
      await Message.find({
        conversation:
          conversationId,
        deletedForEveryone: {
          $ne: true
        }
      })
        .sort({
          createdAt: -1
        })
        .limit(250)
        .lean();

    const summary =
      summarizeConversationSecurity(
        messages
      );

    const alerts = messages
      .filter(
        (message) =>
          message.isFlagged
      )
      .slice(0, 20)
      .map((message) => ({
        messageId:
          message._id,
        sender:
          message.sender,
        riskLevel:
          message.riskLevel,
        reason:
          message.aiReason,
        createdAt:
          message.createdAt
      }));

    return res.json({
      success: true,
      security: {
        ...summary,
        alerts
      }
    });
  } catch (error) {
    console.error(
      "Error analizando conversación:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo analizar la conversación.",
      error:
        error.message
    });
  }
};

const reportMessage = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { messageId } = req.params;
    const reason = String(
      req.body?.reason || ""
    ).trim();

    if (reason.length < 5) {
      return res.status(400).json({
        success: false,
        message:
          "Debes indicar un motivo válido."
      });
    }

    const message =
      await Message.findById(
        messageId
      );

    if (!message) {
      return res.status(404).json({
        success: false,
        message:
          "Mensaje no encontrado."
      });
    }

    const conversation =
      await Conversation.findById(
        message.conversation
      );

    if (
      !conversation ||
      !isParticipant(
        conversation,
        userId
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No puedes reportar este mensaje."
      });
    }

    message.isFlagged = true;

    if (
      !["HIGH", "CRITICAL"].includes(
        message.riskLevel
      )
    ) {
      message.riskLevel =
        "HIGH";
    }

    message.aiReason =
      [
        message.aiReason,
        `Reporte del usuario: ${reason}`
      ]
        .filter(Boolean)
        .join(" | ");

    await message.save();

    const io =
      req.app.get("io");

    if (io) {
      io.to(
        `conversation:${message.conversation}`
      ).emit(
        "message:updated",
        {
          message
        }
      );
    }

    return res.json({
      success: true,
      message:
        "El mensaje fue reportado para revisión.",
      data:
        message
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "No se pudo reportar el mensaje.",
      error:
        error.message
    });
  }
};

module.exports = {
  analyzeText,
  analyzeConversation,
  reportMessage
};
