const {
  createAuditLogSafe
} = require(
  "../services/audit-prisma.service"
);

const WRITE_METHODS = new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE"
]);

const SENSITIVE_KEY =
  /password|token|secret|authorization|cookie|otp|pin|cvv|card|securityCode/i;

function normalize(
  value,
  fallback = ""
) {
  const normalized = String(
    value || fallback
  )
    .trim()
    .toUpperCase()
    .replace(
      /[^A-Z0-9]+/g,
      "_"
    )
    .replace(
      /^_+|_+$/g,
      ""
    );

  return normalized || fallback;
}

function sanitize(
  value,
  depth = 0
) {
  if (depth > 4) {
    return "[MAX_DEPTH]";
  }

  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    typeof value === "string"
  ) {
    return value.length > 500
      ? `${value.slice(0, 500)}...`
      : value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 25)
      .map((item) =>
        sanitize(
          item,
          depth + 1
        )
      );
  }

  if (
    typeof value === "object"
  ) {
    return Object.entries(value)
      .slice(0, 50)
      .reduce(
        (
          result,
          [key, item]
        ) => {
          result[key] =
            SENSITIVE_KEY.test(key)
              ? "[REDACTED]"
              : sanitize(
                  item,
                  depth + 1
                );

          return result;
        },
        {}
      );
  }

  return String(value);
}

function deriveAction(
  req,
  moduleName
) {
  if (req.body?.action) {
    return normalize(
      req.body.action,
      "UNKNOWN_ACTION"
    );
  }

  const status =
    req.body?.status ||
    req.body?.newStatus ||
    req.body?.orderStatus ||
    req.body?.paymentStatus;

  if (status) {
    return normalize(
      `${moduleName}_${status}`
    );
  }

  const operation = {
    POST: "CREATE",
    PUT: "UPDATE",
    PATCH: "UPDATE",
    DELETE: "DELETE"
  }[req.method] || req.method;

  const routeName =
    normalize(
      req.route?.path ||
        req.path ||
        moduleName,
      moduleName
    );

  return normalize(
    `${operation}_${routeName}`
  );
}

function deriveEntityId(req) {
  const parameter =
    Object.values(
      req.params || {}
    ).find((value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim()
    );

  if (parameter) {
    return String(parameter);
  }

  const body =
    req.body || {};

  const candidates = [
    body.entityId,
    body.targetId,
    body.userId,
    body.productId,
    body.reportId,
    body.orderId,
    body.paymentId,
    body.disputeId,
    body.sessionId,
    body.deviceId,
    body.id
  ];

  const value =
    candidates.find((candidate) =>
      candidate !== undefined &&
      candidate !== null &&
      String(candidate).trim()
    );

  return value
    ? String(value)
    : "";
}

function deriveSeverity(
  action,
  method
) {
  if (
    /DELETE|BAN|BLOCK_USER|REFUND|PAYOUT|RELEASE_ESCROW/.test(
      action
    )
  ) {
    return "CRITICAL";
  }

  if (
    /SUSPEND|RESTORE|RESOLVE|HIDE|CLOSE|BLOCK_DEVICE|STATUS/.test(
      action
    )
  ) {
    return "HIGH";
  }

  if (
    method === "PATCH" ||
    method === "PUT"
  ) {
    return "MEDIUM";
  }

  return "LOW";
}

function auditMutations(
  moduleName
) {
  const auditModule =
    normalize(
      moduleName,
      "SYSTEM"
    );

  return function auditAction(
    req,
    res,
    next
  ) {
    if (
      !WRITE_METHODS.has(
        req.method
      )
    ) {
      return next();
    }

    const startedAt =
      Date.now();

    let responseMessage = "";

    const originalJson =
      res.json.bind(res);

    res.json = function auditedJson(
      body
    ) {
      responseMessage =
        String(
          body?.message || ""
        ).trim();

      return originalJson(body);
    };

    res.once(
      "finish",
      () => {
        if (
          res.statusCode < 200 ||
          res.statusCode >= 400
        ) {
          return;
        }

        const action =
          deriveAction(
            req,
            auditModule
          );

        const severity =
          deriveSeverity(
            action,
            req.method
          );

        void createAuditLogSafe({
          req,

          module:
            auditModule,

          action,

          description:
            responseMessage ||
            `Acción ${action} ejecutada en ${auditModule}.`,

          entityType:
            auditModule,

          entityId:
            deriveEntityId(req),

          severity,

          status:
            "SUCCESS",

          reviewStatus:
            severity === "CRITICAL"
              ? "PENDING"
              : "NOT_REQUIRED",

          after:
            sanitize(
              req.body || {}
            ),

          metadata: {
            params:
              sanitize(
                req.params || {}
              ),

            responseStatus:
              res.statusCode,

            durationMs:
              Date.now() -
              startedAt
          }
        });
      }
    );

    return next();
  };
}

module.exports = {
  auditMutations
};