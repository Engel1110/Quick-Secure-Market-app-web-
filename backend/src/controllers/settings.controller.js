const { prisma, getRequestUserId } = require("../utils/prismaCompat");

const ALLOWED_THEMES = ["dark", "light"];
const ALLOWED_ACCENT_COLORS = ["cyan", "purple", "pink", "blue", "green", "orange"];
const ALLOWED_LANGUAGES = ["es", "en"];
const ALLOWED_DENSITIES = ["comfortable", "compact", "spacious"];
const ALLOWED_SESSION_TIMEOUTS = ["15", "30", "60", "240"];

const defaultSettings = (userId) => ({
  user: userId,
  userId,
  theme: "dark",
  accentColor: "cyan",
  language: "es",
  density: "comfortable",
  animations: true,
  glassEffect: true,
  compactSidebar: false,
  notifications: { messages: true, orders: true, disputes: true, security: true, email: false },
  privacy: { showTrustScore: true, showLocation: true, allowMessages: true },
  security: { twoFactorEnabled: false, loginAlerts: true, sessionTimeout: "30" }
});

const hasOwn = (object, property) => Object.prototype.hasOwnProperty.call(object || {}, property);
const isBoolean = (value) => typeof value === "boolean";

function serialize(row, userId) {
  const data = { ...defaultSettings(userId), ...(row?.data || {}) };
  return { ...data, id: row?.id, _id: row?.id ? String(row.id) : undefined, user: userId, userId, createdAt: row?.createdAt, updatedAt: row?.updatedAt };
}

async function ensureSettings(userId) {
  return prisma.userSetting.upsert({
    where: { userId },
    update: {},
    create: { userId, data: defaultSettings(userId) }
  });
}

function validatePatch(body) {
  const enumChecks = [
    ["theme", ALLOWED_THEMES, "El tema seleccionado no es válido."],
    ["accentColor", ALLOWED_ACCENT_COLORS, "El color seleccionado no es válido."],
    ["language", ALLOWED_LANGUAGES, "El idioma seleccionado no es válido."],
    ["density", ALLOWED_DENSITIES, "La densidad seleccionada no es válida."]
  ];
  for (const [field, allowed, message] of enumChecks) {
    if (hasOwn(body, field) && !allowed.includes(body[field])) return message;
  }
  for (const field of ["animations", "glassEffect", "compactSidebar"]) {
    if (hasOwn(body, field) && !isBoolean(body[field])) return `El campo ${field} debe ser verdadero o falso.`;
  }
  for (const [section, fields] of Object.entries({
    notifications: ["messages", "orders", "disputes", "security", "email"],
    privacy: ["showTrustScore", "showLocation", "allowMessages"]
  })) {
    if (body[section] && typeof body[section] === "object") {
      for (const field of fields) {
        if (hasOwn(body[section], field) && !isBoolean(body[section][field])) return `La configuración ${section}.${field} debe ser verdadera o falsa.`;
      }
    }
  }
  if (body.security && typeof body.security === "object") {
    for (const field of ["twoFactorEnabled", "loginAlerts"]) {
      if (hasOwn(body.security, field) && !isBoolean(body.security[field])) return `La configuración security.${field} debe ser verdadera o falsa.`;
    }
    if (hasOwn(body.security, "sessionTimeout") && !ALLOWED_SESSION_TIMEOUTS.includes(String(body.security.sessionTimeout))) {
      return "El tiempo de sesión seleccionado no es válido.";
    }
  }
  return "";
}

async function getMySettings(req, res) {
  try {
    const userId = await getRequestUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Usuario no autenticado." });
    const row = await ensureSettings(userId);
    return res.status(200).json({ success: true, settings: serialize(row, userId) });
  } catch (error) {
    console.error("Error obteniendo configuraciones:", error);
    return res.status(500).json({ success: false, message: "No se pudo obtener la configuración.", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
}

async function updateMySettings(req, res) {
  try {
    const userId = await getRequestUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Usuario no autenticado." });
    const body = req.body || {};
    const validationError = validatePatch(body);
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    const row = await ensureSettings(userId);
    const current = serialize(row, userId);
    const next = { ...current };
    for (const field of ["theme", "accentColor", "language", "density", "animations", "glassEffect", "compactSidebar"]) {
      if (hasOwn(body, field)) next[field] = body[field];
    }
    for (const section of ["notifications", "privacy", "security"]) {
      if (body[section] && typeof body[section] === "object") next[section] = { ...current[section], ...body[section] };
    }
    if (next.security?.sessionTimeout !== undefined) next.security.sessionTimeout = String(next.security.sessionTimeout);

    const data = { ...next };
    for (const field of ["id", "_id", "user", "userId", "createdAt", "updatedAt"]) delete data[field];
    const updated = await prisma.userSetting.update({ where: { userId }, data: { data } });
    return res.status(200).json({ success: true, message: "Configuración actualizada correctamente.", settings: serialize(updated, userId) });
  } catch (error) {
    console.error("Error actualizando configuraciones:", error);
    return res.status(500).json({ success: false, message: "No se pudo actualizar la configuración.", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
}

async function resetMySettings(req, res) {
  try {
    const userId = await getRequestUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Usuario no autenticado." });
    const updated = await prisma.userSetting.upsert({
      where: { userId },
      update: { data: defaultSettings(userId) },
      create: { userId, data: defaultSettings(userId) }
    });
    return res.status(200).json({ success: true, message: "Configuración restaurada correctamente.", settings: serialize(updated, userId) });
  } catch (error) {
    console.error("Error restaurando configuraciones:", error);
    return res.status(500).json({ success: false, message: "No se pudo restaurar la configuración.", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
}

module.exports = { getMySettings, updateMySettings, resetMySettings };
