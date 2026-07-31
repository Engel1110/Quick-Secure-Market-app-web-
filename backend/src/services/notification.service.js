const { prisma, resolveUserId } = require("../utils/prismaCompat");

async function createNotification(userReference, type, title, message) {
  const userId = await resolveUserId(userReference);
  if (!userId) {
    console.warn("Notificación omitida: usuario no encontrado en Supabase.");
    return null;
  }
  const normalizedType = String(type || "GENERAL").trim().toUpperCase();
  const normalizedTitle = String(title || "Notificación QSM").trim();
  const normalizedMessage = String(message || "").trim();
  return prisma.notification.create({
    data: {
      userId,
      title: normalizedTitle,
      message: `[${normalizedType}] ${normalizedMessage}`,
      read: false
    }
  });
}

module.exports = { createNotification };
