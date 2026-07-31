const crypto = require("crypto");
const prisma = require("../utils/prisma");

function normalizeUpper(
  value,
  fallback = ""
) {
  const normalized = String(
    value || fallback
  )
    .trim()
    .toUpperCase();

  return normalized || fallback;
}

function parsePositiveInt(value) {
  const number = Number(value);

  return Number.isSafeInteger(number) &&
    number > 0
    ? number
    : null;
}

function actorName(user) {
  const name = [
    user?.firstName,
    user?.lastName
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    name ||
    user?.name ||
    user?.email ||
    "Sistema QSM"
  );
}

function getClientIp(req) {
  const forwarded = String(
    req?.headers?.[
      "x-forwarded-for"
    ] || ""
  )
    .split(",")[0]
    .trim();

  return String(
    forwarded ||
      req?.socket?.remoteAddress ||
      req?.ip ||
      ""
  ).trim();
}

function sanitizeJson(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(
      JSON.stringify(
        value,
        (_key, item) => {
          if (
            typeof item ===
            "bigint"
          ) {
            return item.toString();
          }

          if (item instanceof Date) {
            return item.toISOString();
          }

          return item;
        }
      )
    );
  } catch {
    return {
      warning:
        "El valor no pudo serializarse.",
      value:
        String(value)
    };
  }
}

function stableValue(value) {
  if (
    Array.isArray(value)
  ) {
    return value.map(
      stableValue
    );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.keys(value)
      .sort()
      .reduce(
        (result, key) => {
          result[key] =
            stableValue(
              value[key]
            );

          return result;
        },
        {}
      );
  }

  return value;
}

function createIntegrityHash(
  payload
) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        stableValue(payload)
      )
    )
    .digest("hex");
}

async function createAuditLog(
  input = {}
) {
  const req =
    input.req || null;

  const requestUser =
    input.actor ||
    req?.prismaUser ||
    req?.user ||
    {};

  const actorId =
    parsePositiveInt(
      input.actorId ??
        requestUser.id ??
        requestUser._id
    );

  const before =
    sanitizeJson(
      input.before
    );

  const after =
    sanitizeJson(
      input.after
    );

  const metadata =
    sanitizeJson(
      input.metadata || {}
    ) || {};

  const payload = {
    actorId,

    actorName:
      String(
        input.actorName ||
          actorName(
            requestUser
          )
      ).trim(),

    actorRole:
      normalizeUpper(
        input.actorRole ||
          requestUser.role,
        actorId
          ? "USER"
          : "SYSTEM"
      ),

    module:
      normalizeUpper(
        input.module,
        "SYSTEM"
      ),

    action:
      normalizeUpper(
        input.action,
        "UNKNOWN_ACTION"
      ),

    description:
      String(
        input.description ||
          "Acción registrada por QSM."
      ).trim(),

    entityType:
      normalizeUpper(
        input.entityType,
        "SYSTEM"
      ),

    entityId:
      String(
        input.entityId || ""
      ).trim(),

    method:
      normalizeUpper(
        input.method ||
          req?.method
      ),

    endpoint:
      String(
        input.endpoint ||
          req?.originalUrl ||
          req?.url ||
          ""
      ).trim(),

    ipAddress:
      String(
        input.ipAddress ||
          getClientIp(req)
      ).trim(),

    deviceInfo:
      String(
        input.deviceInfo ||
          req?.headers?.[
            "user-agent"
          ] ||
          ""
      ).trim(),

    requestId:
      String(
        input.requestId ||
          req?.headers?.[
            "x-request-id"
          ] ||
          ""
      ).trim(),

    severity:
      normalizeUpper(
        input.severity,
        "LOW"
      ),

    status:
      normalizeUpper(
        input.status,
        "SUCCESS"
      ),

    before:
      before === undefined
        ? null
        : before,

    after:
      after === undefined
        ? null
        : after,

    metadata,

    reviewStatus:
      normalizeUpper(
        input.reviewStatus,
        "NOT_REQUIRED"
      )
  };

  const integrityHash =
    createIntegrityHash(
      payload
    );

  return prisma.auditLog.create({
    data: {
      ...payload,
      integrityHash
    }
  });
}

async function createAuditLogSafe(
  input = {}
) {
  try {
    return await createAuditLog(
      input
    );
  } catch (error) {
    console.warn(
      "No se pudo guardar la auditoría:",
      error.message
    );

    return null;
  }
}

module.exports = {
  createAuditLog,
  createAuditLogSafe,
  createIntegrityHash
};