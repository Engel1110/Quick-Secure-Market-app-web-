const getIo = (req) => req?.app?.get("io") || null;

function emitToConversation(req, conversationId, event, payload) {
  const io = getIo(req);
  if (!io || !conversationId) return false;
  io.to(`conversation:${conversationId}`).emit(event, payload);
  return true;
}

function emitToUser(req, userId, event, payload) {
  const io = getIo(req);
  if (!io || !userId) return false;
  io.to(`user:${userId}`).emit(event, payload);
  return true;
}

module.exports = { getIo, emitToConversation, emitToUser };
