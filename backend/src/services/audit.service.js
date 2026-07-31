const {
  prisma,
  getRequestUserId,
  getClientIp,
  getDeviceInfo
} = require("../utils/prismaCompat");

async function createAuditLog({ req, action, targetType, targetId, description }) {
  const actorId = await getRequestUserId(req);
  const actorRole = String(req?.user?.role || req?.prismaUser?.role || "").toUpperCase();
  const actorName = [req?.user?.firstName, req?.user?.lastName].filter(Boolean).join(" ").trim();
  return prisma.auditLog.create({
    data: {
      actorId,
      actorName,
      actorRole,
      module: String(targetType || "SYSTEM").toUpperCase(),
      action: String(action || "UNKNOWN").toUpperCase(),
      description: String(description || ""),
      entityType: String(targetType || "SYSTEM").toUpperCase(),
      entityId: String(targetId || ""),
      method: String(req?.method || ""),
      endpoint: String(req?.originalUrl || req?.url || ""),
      ipAddress: getClientIp(req),
      deviceInfo: getDeviceInfo(req),
      severity: "LOW",
      status: "SUCCESS",
      metadata: {}
    }
  });
}

module.exports = { createAuditLog };
