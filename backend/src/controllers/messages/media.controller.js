const fs = require("fs/promises");
const mongoose = require("mongoose");
const Conversation = require("../../models/Conversation");
const {
  classifyMedia
} = require("../../services/messages/mediaSecurity.service");

function getUserId(req) {
  return req.user?._id || req.user?.id || req.userId || "";
}

function isParticipant(conversation, userId) {
  return conversation.participants.some(
    (participant) =>
      String(participant?._id || participant) === String(userId)
  );
}

async function cleanup(files) {
  await Promise.all(
    (files || []).map(async (file) => {
      try {
        await fs.unlink(file.path);
      } catch {}
    })
  );
}

const uploadMessageMedia = async (req, res) => {
  try {
    const { conversationId } = req.body;
    const files = Array.isArray(req.files) ? req.files : [];

    if (!mongoose.Types.ObjectId.isValid(String(conversationId || ""))) {
      await cleanup(files);
      return res.status(400).json({
        success: false,
        message: "Conversación inválida."
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation || !isParticipant(conversation, getUserId(req))) {
      await cleanup(files);
      return res.status(403).json({
        success: false,
        message: "No tienes acceso a esta conversación."
      });
    }

    const baseUrl =
      process.env.PUBLIC_API_URL ||
      `${req.protocol}://${req.get("host")}`;

    const uploaded = files.map((file) => ({
      name: file.originalname,
      url: `${baseUrl}/uploads/messages/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
      type: classifyMedia(file),
      storageProvider: "LOCAL",
      storageKey: file.filename
    }));

    return res.status(201).json({
      success: true,
      files: uploaded
    });
  } catch (error) {
    await cleanup(req.files || []);

    return res.status(500).json({
      success: false,
      message: "No se pudieron subir los archivos.",
      error: error.message
    });
  }
};

module.exports = { uploadMessageMedia };
