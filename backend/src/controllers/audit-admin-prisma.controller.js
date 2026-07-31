const prisma = require("../utils/prisma");

const {
  createAuditLogSafe
} = require(
  "../services/audit-prisma.service"
);

const VIEW_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "AUDITOR"
];

function normalize(value) {
  return String(
    value || ""
  )
    .trim()
    .toUpperCase();
}

function hasAccess(req) {
  const role =
    normalize(
      req.user?.role
    );

  const department =
    normalize(
      req.user?.department
    );

  const departments =
    Array.isArray(
      req.user?.departments
    )
      ? req.user.departments.map(
          normalize
        )
      : [];

  const permissions =
    Array.isArray(
      req.user?.permissions
    )
      ? req.user.permissions.map(
          normalize
        )
      : [];

  return (
    VIEW_ROLES.includes(role) ||
    department === "AUDIT" ||
    departments.includes(
      "AUDIT"
    ) ||
    permissions.includes("*") ||
    permissions.includes(
      "AUDIT.VIEW"
    ) ||
    permissions.includes(
      "AUDIT.MANAGE"
    )
  );
}

function deny(res) {
  return res
    .status(403)
    .json({
      success: false,
      message:
        "No tienes permisos para acceder a Auditoría."
    });
}

function relativeTime(value) {
  if (!value) {
    return "Sin fecha";
  }

  const milliseconds =
    Date.now() -
    new Date(
      value
    ).getTime();

  if (
    !Number.isFinite(
      milliseconds
    ) ||
    milliseconds < 60000
  ) {
    return "Ahora";
  }

  const minutes =
    Math.floor(
      milliseconds /
        60000
    );

  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `Hace ${hours} h`;
  }

  return `Hace ${Math.floor(
    hours / 24
  )} d`;
}

function serializeEvent(log) {
  return {
    id:
      `AUD-${log.id}`,

    actor: {
      id:
        log.actorId
          ? `USR-${log.actorId}`
          : "SYSTEM",

      name:
        log.actorName ||
        "Sistema QSM",

      role:
        log.actorRole ||
        "SYSTEM"
    },

    module:
      log.module,

    action:
      log.action,

    description:
      log.description,

    entityType:
      log.entityType,

    entityId:
      log.entityId,

    method:
      log.method,

    endpoint:
      log.endpoint,

    ip:
      log.ipAddress,

    device:
      log.deviceInfo,

    severity:
      log.severity,

    status:
      log.status,

    reviewStatus:
      log.reviewStatus,

    integrityHash:
      log.integrityHash,

    createdAt:
      log.createdAt,

    before:
      log.before,

    after:
      log.after,

    metadata:
      log.metadata
  };
}

function createAlerts(
  logs
) {
  const critical =
    logs.filter(
      (log) =>
        log.severity ===
        "CRITICAL"
    ).length;

  const reviews =
    logs.filter(
      (log) =>
        [
          "PENDING",
          "IN_REVIEW",
          "OPEN"
        ].includes(
          log.reviewStatus
        )
    ).length;

  const blocked =
    logs.filter(
      (log) =>
        log.status ===
          "BLOCKED" ||
        log.action.includes(
          "BLOCK"
        )
    ).length;

  const alerts = [];

  if (critical > 0) {
    alerts.push({
      id:
        "ALT-CRITICAL",

      title:
        `${critical} eventos críticos`,

      description:
        "Existen acciones críticas registradas en Auditoría.",

      severity:
        "CRITICAL"
    });
  }

  if (reviews > 0) {
    alerts.push({
      id:
        "ALT-REVIEWS",

      title:
        `${reviews} revisiones pendientes`,

      description:
        "Hay eventos pendientes de revisión manual.",

      severity:
        "MEDIUM"
    });
  }

  if (blocked > 0) {
    alerts.push({
      id:
        "ALT-BLOCKED",

      title:
        `${blocked} acciones bloqueadas`,

      description:
        "Se registraron bloqueos o intentos denegados.",

      severity:
        "HIGH"
    });
  }

  return alerts;
}

async function getAuditDashboard(
  req,
  res
) {
  try {
    if (!hasAccess(req)) {
      return deny(res);
    }

    const now =
      new Date();

    const today =
      new Date(now);

    today.setHours(
      0,
      0,
      0,
      0
    );

    const logs =
      await prisma.auditLog.findMany({
        orderBy: {
          createdAt:
            "desc"
        },

        take:
          1000
      });

    const todayLogs =
      logs.filter(
        (log) =>
          new Date(
            log.createdAt
          ) >= today
      );

    const completeLogs =
      logs.filter(
        (log) =>
          log.module &&
          log.action &&
          log.description &&
          log.entityType
      ).length;

    const hashedLogs =
      logs.filter(
        (log) =>
          Boolean(
            log.integrityHash
          )
      ).length;

    const total =
      logs.length;

    const integrityRate =
      total === 0
        ? 100
        : Number(
            (
              hashedLogs /
              total *
              100
            ).toFixed(1)
          );

    const coverageRate =
      total === 0
        ? 100
        : Number(
            (
              completeLogs /
              total *
              100
            ).toFixed(1)
          );

    const events =
      logs.map(
        serializeEvent
      );

    const recentActivity =
      logs
        .slice(0, 8)
        .map(
          (log) => ({
            id:
              `ACT-${log.id}`,

            title:
              log.action
                .replaceAll(
                  "_",
                  " "
                ),

            description:
              log.description,

            time:
              relativeTime(
                log.createdAt
              ),

            icon:
              log.severity ===
              "CRITICAL"
                ? "🚨"
                : log.severity ===
                    "HIGH"
                  ? "⚠️"
                  : "📋"
          })
        );

    return res.json({
      success: true,

      data: {
        generatedAt:
          now,

        kpis: {
          eventsToday:
            todayLogs.length,

          criticalEvents:
            todayLogs.filter(
              (log) =>
                log.severity ===
                "CRITICAL"
            ).length,

          administrativeChanges:
            todayLogs.filter(
              (log) =>
                log.module ===
                "ADMINISTRATION"
            ).length,

          blockedAttempts:
            todayLogs.filter(
              (log) =>
                log.status ===
                  "BLOCKED" ||
                log.action.includes(
                  "BLOCK"
                )
            ).length,

          openReviews:
            logs.filter(
              (log) =>
                [
                  "PENDING",
                  "IN_REVIEW",
                  "OPEN"
                ].includes(
                  log.reviewStatus
                )
            ).length,

          exportsToday:
            todayLogs.filter(
              (log) =>
                log.action ===
                "AUDIT_EXPORT"
            ).length,

          integrityRate,
          coverageRate
        },

        events,

        alerts:
          createAlerts(
            logs
          ),

        recentActivity
      }
    });
  } catch (error) {
    console.error(
      "Error cargando Auditoría:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo cargar Auditoría.",
        error:
          error.message
      });
  }
}

async function exportAuditReport(
  req,
  res
) {
  try {
    if (!hasAccess(req)) {
      return deny(res);
    }

    const logs =
      await prisma.auditLog.findMany({
        orderBy: {
          createdAt:
            "desc"
        },

        take:
          5000
      });

    await createAuditLogSafe({
      req,

      module:
        "AUDIT",

      action:
        "AUDIT_EXPORT",

      description:
        "Exportó el reporte general de Auditoría.",

      entityType:
        "AUDIT_REPORT",

      entityId:
        `EXPORT-${Date.now()}`,

      severity:
        "MEDIUM",

      status:
        "SUCCESS",

      metadata: {
        exportedRecords:
          logs.length
      }
    });

    const filename =
      `qsm-audit-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

    res.setHeader(
      "Content-Type",
      "application/json; charset=utf-8"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    return res.send(
      JSON.stringify(
        {
          generatedAt:
            new Date(),

          count:
            logs.length,

          events:
            logs.map(
              serializeEvent
            )
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(
      "Error exportando Auditoría:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo exportar Auditoría.",
        error:
          error.message
      });
  }
}

module.exports = {
  getAuditDashboard,
  exportAuditReport
};