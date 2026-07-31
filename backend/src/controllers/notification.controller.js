const { prisma, parsePositiveInt, getRequestUserId } = require("../utils/prismaCompat");

function extractNotificationType(message) {
  const text = String(message || "");
  const match = text.match(/^\[([A-Z0-9_]+)\]\s*/);
  return { type: match?.[1] || "GENERAL", message: match ? text.replace(match[0], "") : text };
}

function serializeNotification(notification) {
  const parsed = extractNotificationType(notification.message);
  return {
    ...notification,
    id: String(notification.id),
    _id: String(notification.id),
    type: parsed.type,
    message: parsed.message,
    read: Boolean(notification.read),
    isRead: Boolean(notification.read)
  };
}

async function getMyNotifications(req, res) {
  try {
    const userId = await getRequestUserId(req);
    if (!userId) return res.status(404).json({ success: false, message: "No se encontró el usuario en Supabase." });
    const notifications = await prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 });
    const serialized = notifications.map(serializeNotification);
    return res.json({ success: true, count: serialized.length, unreadCount: serialized.filter((item) => !item.read).length, notifications: serialized });
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);
    return res.status(500).json({ success: false, message: "Error obteniendo notificaciones." });
  }
}

async function markAsRead(req, res) {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "El identificador de la notificación no es válido." });
    const userId = await getRequestUserId(req);
    if (!userId) return res.status(404).json({ success: false, message: "No se encontró el usuario en Supabase." });
    const notification = await prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) return res.status(404).json({ success: false, message: "Notificación no encontrada." });
    const updated = notification.read ? notification : await prisma.notification.update({ where: { id }, data: { read: true } });
    return res.json({ success: true, message: "Notificación marcada como leída.", notification: serializeNotification(updated) });
  } catch (error) {
    console.error("Error actualizando notificación:", error);
    return res.status(500).json({ success: false, message: "Error actualizando la notificación." });
  }
}

async function markAllAsRead(req, res) {
  try {
    const userId = await getRequestUserId(req);
    if (!userId) return res.status(404).json({ success: false, message: "No se encontró el usuario en Supabase." });
    const result = await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return res.json({ success: true, message: "Todas las notificaciones fueron marcadas como leídas.", updatedCount: result.count });
  } catch (error) {
    console.error("Error marcando notificaciones:", error);
    return res.status(500).json({ success: false, message: "No fue posible marcar todas las notificaciones." });
  }
}

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
