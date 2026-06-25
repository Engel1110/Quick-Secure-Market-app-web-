const AuditLog = require("../models/AuditLog");

const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress ||
    req.ip ||
    ""
  ).toString();
};

const getDeviceInfo = (req) => {
  return req.headers["user-agent"] || "Dispositivo desconocido";
};

const createAuditLog = async ({
  req,
  action,
  targetType,
  targetId,
  description
}) => {
  return await AuditLog.create({
    actor: req.user._id,
    actorRole: req.user.role,
    action,
    targetType,
    targetId: targetId || "",
    description,
    ipAddress: getClientIp(req),
    deviceInfo: getDeviceInfo(req)
  });
};

module.exports = {
  createAuditLog
};