const Message = require("../../models/Message");

const reactToMessage = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id || req.userId;
    const { messageId } = req.params;
    const emoji = String(req.body?.emoji || "").trim();

    if (!emoji) return res.status(400).json({ success: false, message: "Selecciona una reacción." });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ success: false, message: "Mensaje no encontrado." });

    const index = message.reactions.findIndex((reaction) => String(reaction.user) === String(userId));

    if (index >= 0) {
      if (message.reactions[index].emoji === emoji) message.reactions.splice(index, 1);
      else message.reactions[index].emoji = emoji;
    } else {
      message.reactions.push({ user: userId, emoji });
    }

    await message.save();

    const updated = await Message.findById(message._id)
      .populate("sender", "firstName lastName email profilePhoto avatar")
      .populate("receiver", "firstName lastName email profilePhoto avatar")
      .populate("replyTo");

    req.app.get("io")?.to(`conversation:${message.conversation}`).emit("message:updated", { message: updated });

    return res.json({ success: true, message: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: "No se pudo registrar la reacción.", error: error.message });
  }
};

module.exports = { reactToMessage };
