const prisma = require("./prisma");

function parsePositiveInt(value) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

async function resolveUser(reference, select) {
  if (!reference) return null;

  const object = typeof reference === "object" ? reference : { id: reference };
  const rawId = object.id ?? object._id ?? object.userId ?? reference;
  const numericId = parsePositiveInt(rawId);

  if (numericId) {
    const found = await prisma.user.findUnique({
      where: { id: numericId },
      ...(select ? { select } : {})
    });
    if (found) return found;
  }

  const email = normalizeEmail(object.email);
  if (email) {
    const found = await prisma.user.findUnique({
      where: { email },
      ...(select ? { select } : {})
    });
    if (found) return found;
  }

  const legacyMongoId = String(rawId || "").trim();
  if (legacyMongoId && !numericId) {
    return prisma.user.findUnique({
      where: { legacyMongoId },
      ...(select ? { select } : {})
    });
  }

  return null;
}

async function resolveUserId(reference) {
  const user = await resolveUser(reference, { id: true });
  return user?.id || null;
}

async function getRequestUser(req, select) {
  if (req?.prismaUser?.id) {
    if (!select) return req.prismaUser;
    return prisma.user.findUnique({ where: { id: req.prismaUser.id }, select });
  }
  return resolveUser(req?.user || req?.userId, select);
}

async function getRequestUserId(req) {
  if (req?.prismaUser?.id) return req.prismaUser.id;
  return resolveUserId(req?.user || req?.userId);
}

function sanitizeUser(user) {
  if (!user) return null;
  const safe = { ...user, _id: String(user.id) };
  delete safe.password;
  delete safe.resetPasswordToken;
  delete safe.resetPasswordExpires;
  delete safe.twoFactorSecret;
  delete safe.profilePhotoPublicId;
  delete safe.pendingProfilePhotoPublicId;
  return safe;
}

function serializeIdEntity(entity) {
  if (!entity) return entity;
  return { ...entity, _id: String(entity.id) };
}

function getClientIp(req) {
  return String(
    req?.headers?.["x-forwarded-for"] ||
    req?.ip ||
    req?.socket?.remoteAddress ||
    ""
  ).split(",")[0].trim();
}

function getDeviceInfo(req) {
  return String(req?.headers?.["user-agent"] || "").trim().slice(0, 1000);
}

function isPrismaError(error, code) {
  return Boolean(error && error.code === code);
}

module.exports = {
  prisma,
  parsePositiveInt,
  normalizeEmail,
  resolveUser,
  resolveUserId,
  getRequestUser,
  getRequestUserId,
  sanitizeUser,
  serializeIdEntity,
  getClientIp,
  getDeviceInfo,
  isPrismaError
};
