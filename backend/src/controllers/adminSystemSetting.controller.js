const validator = require("validator");
const { prisma, getRequestUserId, getClientIp, getDeviceInfo } = require("../utils/prismaCompat");

const GLOBAL_SETTINGS_KEY = "GLOBAL_SYSTEM_SETTINGS";
const ALLOWED_CURRENCIES = ["DOP", "USD"];
const SECTIONS = ["platform", "verification", "finance", "operations", "security", "communication", "moderation", "automation"];

const BOOLEAN_FIELDS = {
  platform: ["marketplaceEnabled", "registrationEnabled", "loginEnabled", "purchasesEnabled", "salesEnabled", "maintenanceMode"],
  verification: ["kycRequiredForBuying", "kycRequiredForSelling", "kycRequiredForWithdrawals", "faceVerificationEnabled", "periodicFaceCheckEnabled"],
  finance: ["escrowEnabled", "walletEnabled", "withdrawalsEnabled", "refundsEnabled"],
  operations: ["warehouseInspectionRequired", "deliveryPinRequired", "buyerConfirmationRequired"],
  security: ["adminTwoFactorRequired", "userTwoFactorAvailable", "suspiciousIpDetectionEnabled", "suspiciousDeviceDetectionEnabled", "forcePasswordChangeForInternalUsers"],
  communication: ["emailNotificationsEnabled", "pushNotificationsEnabled", "smsNotificationsEnabled", "adminAlertsEnabled", "securityAlertsEnabled", "orderNotificationsEnabled", "disputeNotificationsEnabled"],
  moderation: ["automaticProductReviewEnabled", "requireProductApproval", "hideReportedProductsAutomatically", "allowUserReviews", "allowProductComments"],
  automation: ["fraudDetectionEnabled", "aiModerationEnabled", "automaticRiskScoringEnabled", "automaticDisputePrioritizationEnabled", "automaticSecurityAlertsEnabled"]
};

const NUMBER_FIELDS = {
  verification: { periodicFaceCheckHours: [1, 8760], minimumSellerTrustScore: [0, 100], minimumBuyerTrustScore: [0, 100] },
  finance: { platformCommissionPercent: [0, 100], sellerCommissionPercent: [0, 100], buyerServiceFeePercent: [0, 100], minimumWithdrawalAmount: [0, 1e9], maximumWithdrawalAmount: [0, 1e9], escrowReleaseHours: [0, 720] },
  operations: { maximumDeliveryDays: [1, 90], orderCancellationMinutes: [0, 10080], disputeOpeningDays: [1, 90], disputeResolutionDays: [1, 180] },
  security: { adminSessionTimeoutMinutes: [5, 1440], userSessionTimeoutMinutes: [5, 10080], maximumLoginAttempts: [1, 20], accountLockMinutes: [1, 1440] },
  moderation: { reportsBeforeAutomaticHide: [1, 1000] }
};

function defaults() {
  return {
    platform: { marketplaceEnabled: true, registrationEnabled: true, loginEnabled: true, purchasesEnabled: true, salesEnabled: true, maintenanceMode: false, maintenanceMessage: "" },
    verification: { kycRequiredForBuying: false, kycRequiredForSelling: true, kycRequiredForWithdrawals: true, faceVerificationEnabled: true, periodicFaceCheckEnabled: true, periodicFaceCheckHours: 720, minimumSellerTrustScore: 50, minimumBuyerTrustScore: 30 },
    finance: { escrowEnabled: true, walletEnabled: true, withdrawalsEnabled: true, refundsEnabled: true, currency: "DOP", platformCommissionPercent: 5, sellerCommissionPercent: 0, buyerServiceFeePercent: 0, minimumWithdrawalAmount: 500, maximumWithdrawalAmount: 1000000, escrowReleaseHours: 24 },
    operations: { warehouseInspectionRequired: true, deliveryPinRequired: true, buyerConfirmationRequired: true, maximumDeliveryDays: 7, orderCancellationMinutes: 30, disputeOpeningDays: 3, disputeResolutionDays: 15 },
    security: { adminTwoFactorRequired: false, userTwoFactorAvailable: true, suspiciousIpDetectionEnabled: true, suspiciousDeviceDetectionEnabled: true, forcePasswordChangeForInternalUsers: true, adminSessionTimeoutMinutes: 60, userSessionTimeoutMinutes: 240, maximumLoginAttempts: 5, accountLockMinutes: 30 },
    communication: { emailNotificationsEnabled: true, pushNotificationsEnabled: true, smsNotificationsEnabled: false, adminAlertsEnabled: true, securityAlertsEnabled: true, orderNotificationsEnabled: true, disputeNotificationsEnabled: true, supportEmail: "support@qsm.local", noReplyEmail: "noreply@qsm.local" },
    moderation: { automaticProductReviewEnabled: true, requireProductApproval: false, hideReportedProductsAutomatically: true, allowUserReviews: true, allowProductComments: true, reportsBeforeAutomaticHide: 5 },
    automation: { fraudDetectionEnabled: true, aiModerationEnabled: true, automaticRiskScoringEnabled: true, automaticDisputePrioritizationEnabled: true, automaticSecurityAlertsEnabled: true }
  };
}

function mergeDefaults(data) {
  const base = defaults();
  for (const section of SECTIONS) base[section] = { ...base[section], ...(data?.[section] || {}) };
  return base;
}

function validateAndMerge(current, body) {
  const next = mergeDefaults(current);
  const errors = [];
  for (const section of SECTIONS) {
    if (!Object.prototype.hasOwnProperty.call(body || {}, section)) continue;
    const incoming = body[section];
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
      errors.push(`${section} debe ser un objeto.`);
      continue;
    }
    for (const field of BOOLEAN_FIELDS[section] || []) {
      if (!Object.prototype.hasOwnProperty.call(incoming, field)) continue;
      if (typeof incoming[field] !== "boolean") errors.push(`${section}.${field} debe ser verdadero o falso.`);
      else next[section][field] = incoming[field];
    }
    for (const [field, [min, max]] of Object.entries(NUMBER_FIELDS[section] || {})) {
      if (!Object.prototype.hasOwnProperty.call(incoming, field)) continue;
      const value = Number(incoming[field]);
      if (!Number.isFinite(value) || value < min || value > max) errors.push(`${section}.${field} debe estar entre ${min} y ${max}.`);
      else next[section][field] = value;
    }
  }
  if (body?.platform && Object.prototype.hasOwnProperty.call(body.platform, "maintenanceMessage")) next.platform.maintenanceMessage = String(body.platform.maintenanceMessage || "").trim().slice(0, 1000);
  for (const field of ["supportEmail", "noReplyEmail"]) {
    if (body?.communication && Object.prototype.hasOwnProperty.call(body.communication, field)) {
      const value = String(body.communication[field] || "").trim().toLowerCase();
      if (value && !validator.isEmail(value)) errors.push(`communication.${field} debe contener un correo válido.`);
      else next.communication[field] = value;
    }
  }
  if (body?.finance && Object.prototype.hasOwnProperty.call(body.finance, "currency")) {
    const value = String(body.finance.currency || "").trim().toUpperCase();
    if (!ALLOWED_CURRENCIES.includes(value)) errors.push("finance.currency debe ser DOP o USD.");
    else next.finance.currency = value;
  }
  return { next, errors };
}

async function getRow() {
  return prisma.systemSetting.upsert({
    where: { key: GLOBAL_SETTINGS_KEY },
    update: {},
    create: { key: GLOBAL_SETTINGS_KEY, data: defaults() }
  });
}

function serialize(row) {
  return { ...mergeDefaults(row.data), id: row.id, _id: String(row.id), key: row.key, updatedBy: row.updatedById, lastResetBy: row.lastResetById, lastResetAt: row.lastResetAt, createdAt: row.createdAt, updatedAt: row.updatedAt };
}

async function audit(req, action, description, before, after) {
  try {
    const actorId = await getRequestUserId(req);
    await prisma.auditLog.create({
      data: {
        actorId,
        actorName: [req.user?.firstName, req.user?.lastName].filter(Boolean).join(" "),
        actorRole: String(req.user?.role || "").toUpperCase(),
        module: "SYSTEM_SETTINGS",
        action,
        description,
        entityType: "SYSTEM_SETTING",
        entityId: GLOBAL_SETTINGS_KEY,
        method: req.method || "",
        endpoint: req.originalUrl || "",
        ipAddress: getClientIp(req),
        deviceInfo: getDeviceInfo(req),
        severity: "HIGH",
        status: "SUCCESS",
        before,
        after,
        metadata: {}
      }
    });
  } catch (error) {
    console.error("No se pudo registrar auditoría de System Settings:", error.message);
  }
}

async function getSystemSettings(_req, res) {
  try {
    const row = await getRow();
    return res.status(200).json({ success: true, settings: serialize(row) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "No se pudo obtener la configuración global de QSM.", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
}

async function updateSystemSettings(req, res) {
  try {
    const actorId = await getRequestUserId(req);
    if (!actorId) return res.status(401).json({ success: false, message: "Usuario administrativo no autenticado." });
    const row = await getRow();
    const before = mergeDefaults(row.data);
    const { next, errors } = validateAndMerge(before, req.body || {});
    if (errors.length) return res.status(400).json({ success: false, message: "Una o más configuraciones no son válidas.", errors });
    const updated = await prisma.systemSetting.update({ where: { key: GLOBAL_SETTINGS_KEY }, data: { data: next, updatedById: actorId } });
    await audit(req, "SYSTEM_SETTINGS_UPDATED", "Configuración global de QSM actualizada.", before, next);
    return res.status(200).json({ success: true, message: "Configuración global actualizada correctamente.", settings: serialize(updated) });
  } catch (error) {
    console.error("Error actualizando configuración global:", error);
    return res.status(500).json({ success: false, message: "No se pudo actualizar la configuración global de QSM.", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
}

async function resetSystemSettings(req, res) {
  try {
    const actorId = await getRequestUserId(req);
    if (!actorId) return res.status(401).json({ success: false, message: "Usuario administrativo no autenticado." });

    const confirmation = String(req.body?.confirmation || "").trim().toUpperCase();
    if (confirmation !== "RESET_SYSTEM_SETTINGS") {
      return res.status(400).json({
        success: false,
        message: "Debes confirmar la restauración enviando confirmation: RESET_SYSTEM_SETTINGS."
      });
    }

    const row = await getRow();
    const before = mergeDefaults(row.data);
    const next = defaults();
    const updated = await prisma.systemSetting.update({ where: { key: GLOBAL_SETTINGS_KEY }, data: { data: next, updatedById: actorId, lastResetById: actorId, lastResetAt: new Date() } });
    await audit(req, "SYSTEM_SETTINGS_RESET", "Configuración global restaurada a sus valores predeterminados.", before, next);
    return res.status(200).json({ success: true, message: "Configuración global restaurada correctamente.", settings: serialize(updated) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "No se pudo restaurar la configuración global de QSM.", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
}

async function getSystemStatus(_req, res) {
  try {
    const row = await getRow();
    const settings = mergeDefaults(row.data);
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      success: true,
      status: settings.platform.maintenanceMode ? "MAINTENANCE" : "OPERATIONAL",
      database: "connected",
      settings: {
        marketplaceEnabled: settings.platform.marketplaceEnabled,
        registrationEnabled: settings.platform.registrationEnabled,
        loginEnabled: settings.platform.loginEnabled,
        maintenanceMode: settings.platform.maintenanceMode,
        maintenanceMessage: settings.platform.maintenanceMessage
      },
      updatedAt: row.updatedAt
    });
  } catch (error) {
    return res.status(503).json({ success: false, status: "DEGRADED", database: "disconnected", message: "No se pudo consultar el estado del sistema." });
  }
}

module.exports = { getSystemSettings, updateSystemSettings, resetSystemSettings, getSystemStatus };
