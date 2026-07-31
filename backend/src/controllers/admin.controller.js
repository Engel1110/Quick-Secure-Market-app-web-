const bcrypt = require("bcryptjs");
const { prisma, parsePositiveInt, getRequestUserId, sanitizeUser } = require("../utils/prismaCompat");
const { createAuditLog } = require("../services/audit.service");

function serializeProduct(product) {
  return { ...product, _id: String(product.id), seller: product.seller ? { ...product.seller, _id: String(product.seller.id) } : product.sellerId };
}

function serializeAudit(log) {
  return {
    ...log,
    _id: String(log.id),
    actor: log.actor ? { ...log.actor, _id: String(log.actor.id) } : log.actorId,
    targetType: log.entityType,
    targetId: log.entityId
  };
}

async function getAdminDashboard(_req, res) {
  try {
    const [users, verifiedUsers, products, orders, disputes, fraudAlerts, securityAlerts, paymentsHeld] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isVerified: true } }),
      prisma.product.count(),
      prisma.order.count(),
      prisma.dispute.count(),
      prisma.fraudAlert.count(),
      prisma.securityAlert.count(),
      prisma.payment.count({ where: { status: { in: ["HELD", "PENDING"] } } })
    ]);
    return res.json({
      message: "Dashboard administrativo obtenido correctamente",
      resumen: {
        usuariosTotales: users,
        usuariosVerificados: verifiedUsers,
        productosTotales: products,
        ordenesTotales: orders,
        disputasTotales: disputes,
        alertasAntifraude: fraudAlerts,
        alertasSeguridad: securityAlerts,
        pagosRetenidosEscrow: paymentsHeld
      }
    });
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo dashboard administrativo", error: error.message });
  }
}

async function getAllUsers(_req, res) {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    return res.json({ message: "Usuarios obtenidos correctamente", count: users.length, users: users.map(sanitizeUser) });
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo usuarios", error: error.message });
  }
}

async function getAllProducts(_req, res) {
  try {
    const products = await prisma.product.findMany({
      include: { seller: { select: { id: true, firstName: true, lastName: true, email: true, trustScore: true, isVerified: true } } },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ message: "Productos obtenidos correctamente", count: products.length, products: products.map(serializeProduct) });
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo productos", error: error.message });
  }
}

async function suspendUser(req, res) {
  try {
    const id = parsePositiveInt(req.params.userId);
    if (!id) return res.status(400).json({ message: "Identificador de usuario no válido" });
    const actorId = await getRequestUserId(req);
    const reason = String(req.body?.reason || "No especificado").trim();
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Usuario no encontrado" });
    const user = await prisma.user.update({
      where: { id },
      data: { status: "SUSPENDED", securityLevel: "LOCKED", accountLockedUntil: null, suspensionReason: reason, suspendedAt: new Date(), suspendedById: actorId, activeSessions: 0, passwordVersion: { increment: 1 } }
    });
    await createAuditLog({ req, action: "SUSPEND_USER", targetType: "USER", targetId: id, description: `Usuario suspendido. Motivo: ${reason}` });
    return res.json({ message: "Usuario suspendido correctamente", reason, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Error suspendiendo usuario", error: error.message });
  }
}

async function activateUser(req, res) {
  try {
    const id = parsePositiveInt(req.params.userId);
    if (!id) return res.status(400).json({ message: "Identificador de usuario no válido" });
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Usuario no encontrado" });
    const user = await prisma.user.update({
      where: { id },
      data: { status: "ACTIVE", securityLevel: "NORMAL", accountLockedUntil: null, suspensionReason: "", suspendedAt: null, suspendedById: null, bannedAt: null, bannedById: null, deletedAt: null, deletedById: null }
    });
    await createAuditLog({ req, action: "ACTIVATE_USER", targetType: "USER", targetId: id, description: "Usuario activado nuevamente" });
    return res.json({ message: "Usuario activado correctamente", user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Error activando usuario", error: error.message });
  }
}

async function disableProduct(req, res) {
  try {
    const id = parsePositiveInt(req.params.productId);
    if (!id) return res.status(400).json({ message: "Identificador de producto no válido" });
    const actorId = await getRequestUserId(req);
    const reason = String(req.body?.reason || "No especificado").trim();
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Producto no encontrado" });
    const product = await prisma.product.update({ where: { id }, data: { status: "DISABLED", deletedAt: new Date(), deletedBy: actorId, lastEditedAt: new Date(), lastEditedBy: actorId } });
    await createAuditLog({ req, action: "DISABLE_PRODUCT", targetType: "PRODUCT", targetId: id, description: `Producto deshabilitado. Motivo: ${reason}` });
    return res.json({ message: "Producto deshabilitado correctamente", reason, product: { ...product, _id: String(product.id) } });
  } catch (error) {
    return res.status(500).json({ message: "Error deshabilitando producto", error: error.message });
  }
}

async function getAuditLogs(_req, res) {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { actor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 500
    });
    return res.json({ message: "Logs de auditoría obtenidos correctamente", count: logs.length, logs: logs.map(serializeAudit) });
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo logs de auditoría", error: error.message });
  }
}

async function updateUserRole(req, res) {
  try {
    const id = parsePositiveInt(req.params.userId);
    const role = String(req.body?.role || "").trim().toUpperCase();
    const allowedRoles = ["USER", "ADMIN", "SENIOR_ADMIN", "AUDITOR", "VERIFICATION_AGENT"];
    if (!id || !allowedRoles.includes(role)) return res.status(400).json({ message: "Rol no válido" });
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Usuario no encontrado" });
    const user = await prisma.user.update({ where: { id }, data: { role, passwordVersion: { increment: 1 } } });
    await createAuditLog({ req, action: "UPDATE_USER_ROLE", targetType: "USER", targetId: id, description: `Rol actualizado a ${role}` });
    return res.json({ message: "Rol de usuario actualizado correctamente", user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Error actualizando rol de usuario", error: error.message });
  }
}

async function resetUserPassword(req, res) {
  try {
    const id = parsePositiveInt(req.params.userId);
    const newPassword = String(req.body?.newPassword || "");
    if (!id) return res.status(400).json({ message: "Identificador de usuario no válido" });
    if (newPassword.length < 8) return res.status(400).json({ message: "La contraseña debe tener mínimo 8 caracteres" });
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Usuario no encontrado" });
    const user = await prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(newPassword, 12), passwordChangedAt: new Date(), passwordVersion: { increment: 1 }, failedLoginAttempts: 0, accountLockedUntil: null, activeSessions: 0 }
    });
    await createAuditLog({ req, action: "RESET_USER_PASSWORD", targetType: "USER", targetId: id, description: `Contraseña reseteada para el usuario ${user.email}` });
    return res.json({ message: "Contraseña reseteada correctamente", user: { _id: String(user.id), id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, status: user.status } });
  } catch (error) {
    return res.status(500).json({ message: "Error reseteando contraseña", error: error.message });
  }
}

module.exports = { getAdminDashboard, getAllUsers, getAllProducts, suspendUser, activateUser, disableProduct, getAuditLogs, updateUserRole, resetUserPassword };
