const prisma = require("../utils/prisma");

const VIEW_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "AUDITOR",
  "MODERATION_MANAGER",
  "MODERATOR"
];

const WRITE_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "MODERATION_MANAGER",
  "MODERATOR"
];

const VALID_STATUSES = [
  "OPEN",
  "IN_REVIEW",
  "ESCALATED",
  "ACTION_TAKEN",
  "RESOLVED",
  "DISMISSED"
];

const VALID_ACTIONS = [
  "DISMISS_REPORT",
  "RESOLVE_REPORT",
  "WARN_USER",
  "SUSPEND_USER",
  "BAN_USER",
  "RESTORE_USER",
  "HIDE_CONTENT",
  "RESTORE_CONTENT"
];

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

function asObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
      ? value
      : {};
}

function personName(user) {
  const name = [
    user?.firstName,
    user?.lastName
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Usuario QSM";
}

function hasAccess(req, write = false) {
  const role = normalize(req.user?.role);
  const department = normalize(req.user?.department);

  const departments = Array.isArray(req.user?.departments)
    ? req.user.departments.map(normalize)
    : [];

  const permissions = Array.isArray(req.user?.permissions)
    ? req.user.permissions.map(normalize)
    : [];

  const roles = write ? WRITE_ROLES : VIEW_ROLES;

  return (
    roles.includes(role) ||
    department === "MODERATION" ||
    departments.includes("MODERATION") ||
    permissions.includes("*") ||
    permissions.includes("MODERATION.VIEW") ||
    permissions.includes("MODERATION.MANAGE")
  );
}

function deny(res) {
  return res.status(403).json({
    success: false,
    message: "No tienes permisos para acceder a Moderación."
  });
}

function moderationState(product) {
  return asObject(
    asObject(product?.aiAnalysis).moderation
  );
}

function parseProductId(value) {
  const direct = Number(value);

  if (Number.isInteger(direct) && direct > 0) {
    return direct;
  }

  const match = String(value || "").match(/(\d+)$/);
  const parsed = Number(match?.[1]);

  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : null;
}

function priority(product) {
  const level = normalize(product.riskLevel);

  if (level === "CRITICAL") return "CRITICAL";
  if (level === "HIGH") return "HIGH";
  if (level === "MEDIUM") return "MEDIUM";

  return "LOW";
}

function relativeTime(value) {
  if (!value) return "Sin actualización";

  const date = new Date(value);
  const difference = Date.now() - date.getTime();

  if (!Number.isFinite(difference)) {
    return "Sin actualización";
  }

  const minutes = Math.max(
    0,
    Math.floor(difference / 60000)
  );

  if (minutes < 1) return "Ahora";
  if (minutes < 60) return "Hace " + minutes + " min";

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return "Hace " + hours + " h";

  const days = Math.floor(hours / 24);

  return (
    "Hace " +
    days +
    " día" +
    (days === 1 ? "" : "s")
  );
}

function reportReason(product) {
  const alerts = Array.isArray(product.fraudAlerts)
    ? product.fraudAlerts
    : [];

  const types = alerts.map((alert) =>
    normalize(alert.type)
  );

  if (types.some((type) => type.includes("COUNTERFEIT"))) {
    return "COUNTERFEIT";
  }

  if (types.some((type) => type.includes("PROHIBITED"))) {
    return "PROHIBITED";
  }

  if (types.some((type) => type.includes("IMAGE"))) {
    return "STOLEN_IMAGE";
  }

  return "FRAUD";
}

function reportSource(product) {
  const analysis = asObject(product.aiAnalysis);

  const source = normalize(
    analysis.source ||
    analysis.analysisSource ||
    analysis.engine
  );

  return source.includes("AI")
    ? "AI_DETECTION"
    : "RULE_ENGINE";
}

function uniqueStrings(values) {
  return [
    ...new Set(
      values
        .flat()
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  ];
}

function isCandidate(product) {
  const moderation = moderationState(product);
  const risk = normalize(product.riskLevel);
  const status = normalize(product.status);

  return (
    Boolean(moderation.status) ||
    ["MEDIUM", "HIGH", "CRITICAL"].includes(risk) ||
    [
      "UNDER_REVIEW",
      "HIDDEN",
      "DISABLED",
      "BLOCKED"
    ].includes(status) ||
    product.fraudAlerts.length > 0
  );
}

function serializeReport(product) {
  const moderation = moderationState(product);
  const seller = product.seller || {};
  const alerts = product.fraudAlerts || [];
  const latestAlert = alerts[0] || null;

  let status = normalize(moderation.status);

  if (!VALID_STATUSES.includes(status)) {
    status = "OPEN";
  }

  const evidence = uniqueStrings([
    product.riskLabel,
    "Puntuación de riesgo: " +
      Number(product.riskScore || 0) +
      "/100",
    product.evidenceRequired || [],
    alerts.map((alert) => alert.message),
    moderation.actionReason
  ]);

  return {
    id: "MOD-PRODUCT-" + product.id,
    type: "PRODUCT",
    targetId: String(product.id),
    title:
      latestAlert?.message ||
      "Revisión de " + product.title,
    description:
      product.riskLabel ||
      "Publicación enviada a Moderación.",
    reason: reportReason(product),
    status,
    priority: priority(product),
    source: reportSource(product),
    aiScore: Number(product.riskScore || 0),

    /* QSM_FASE3_5_LUNA_ANALYSIS */
    aiAnalysis: asObject(product.aiAnalysis),
    createdAt: product.createdAt,
    lastUpdate: relativeTime(
      moderation.updatedAt || product.updatedAt
    ),
    target: {
      id: String(product.id),
      name: product.title,
      price: Number(product.price || 0),
      status: product.status,
      image:
        product.imageUrl ||
        product.images?.[0] ||
        ""
    },
    reportedUser: {
      id: String(seller.id || ""),
      name: personName(seller),
      email: seller.email || "",
      trustScore: Number(seller.trustScore || 0),
      accountStatus: seller.status || "PENDING",
      warnings: Number(
        moderation.warningCount || 0
      ),
      reportsReceived: Number(
        seller.fraudReports || 0
      )
    },
    reportedBy: {
      id: "SYSTEM",
      name:
        reportSource(product) === "AI_DETECTION"
          ? "Motor IA QSM"
          : "Motor de riesgo QSM"
    },
    assignedModerator:
      moderation.assignedModeratorId
        ? {
            id: String(
              moderation.assignedModeratorId
            ),
            name:
              moderation.assignedModeratorName ||
              "Moderador QSM"
          }
        : null,
    evidence,
    moderationAction: moderation.action || null,
    actionReason: moderation.actionReason || null,
    relatedEntities: {
      productId: String(product.id),
      userId: String(seller.id || "")
    }
  };
}

const productInclude = {
  seller: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      trustScore: true,
      status: true,
      fraudReports: true
    }
  },
  fraudAlerts: {
    orderBy: {
      createdAt: "desc"
    },
    take: 20
  }
};

async function findProduct(id) {
  return prisma.product.findUnique({
    where: { id },
    include: productInclude
  });
}

async function getModerationDashboard(req, res) {
  try {
    if (!hasAccess(req)) {
      return deny(res);
    }

    const [
      products,
      moderators,
      suspendedUsers,
      bannedUsers
    ] = await Promise.all([
      prisma.product.findMany({
        where: {
          deletedAt: null
        },
        include: productInclude,
        orderBy: {
          updatedAt: "desc"
        },
        take: 500
      }),

      prisma.user.findMany({
        where: {
          role: {
            in: [
              "SUPER_ADMIN",
              "SENIOR_ADMIN",
              "ADMIN",
              "MODERATION_MANAGER",
              "MODERATOR"
            ]
          },
          status: {
            notIn: [
              "SUSPENDED",
              "BANNED",
              "DELETED"
            ]
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          activeSessions: true
        },
        orderBy: {
          firstName: "asc"
        }
      }),

      prisma.user.count({
        where: {
          status: "SUSPENDED"
        }
      }),

      prisma.user.count({
        where: {
          status: "BANNED"
        }
      })
    ]);

    const reports = products
      .filter(isCandidate)
      .map(serializeReport);

    const resolvedStatuses = [
      "RESOLVED",
      "DISMISSED",
      "ACTION_TAKEN"
    ];

    const reportedUsers = new Set(
      reports
        .map((report) => report.reportedUser?.id)
        .filter(Boolean)
    );

    const trustScores = reports
      .map((report) =>
        Number(report.reportedUser?.trustScore)
      )
      .filter(Number.isFinite);

    const averageTrustScore =
      trustScores.length > 0
        ? Math.round(
            trustScores.reduce(
              (total, score) => total + score,
              0
            ) / trustScores.length
          )
        : 0;

    const moderatorRows = moderators.map(
      (moderator) => {
        const id = String(moderator.id);

        return {
          id,
          name: personName(moderator),
          activeCases: reports.filter(
            (report) =>
              String(
                report.assignedModerator?.id || ""
              ) === id &&
              [
                "OPEN",
                "IN_REVIEW",
                "ESCALATED"
              ].includes(report.status)
          ).length,
          resolvedToday: 0,
          averageTime: "—",
          accuracy: 0,
          online:
            Number(moderator.activeSessions || 0) > 0
        };
      }
    );

    const aiAlerts = reports
      .filter(
        (report) =>
          report.source === "AI_DETECTION"
      )
      .slice(0, 12)
      .map((report) => ({
        id: "AI-" + report.targetId,
        title: report.title,
        description: report.description,
        severity: report.priority,
        score: report.aiScore,
        reportId: report.id
      }));

    const recentActivity = reports
      .slice(0, 10)
      .map((report) => ({
        id: "ACT-" + report.id,
        icon:
          report.priority === "CRITICAL"
            ? "🚨"
            : "🛡️",
        title: "Publicación analizada",
        description:
          report.target.name +
          " · " +
          report.priority,
        time: report.lastUpdate
      }));

    const resolvedCount = reports.filter(
      (report) =>
        resolvedStatuses.includes(report.status)
    ).length;

    return res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        kpis: {
          openReports: reports.filter(
            (report) => report.status === "OPEN"
          ).length,
          inReview: reports.filter(
            (report) =>
              report.status === "IN_REVIEW"
          ).length,
          aiDetected: aiAlerts.length,
          reportedProducts: reports.length,
          reportedUsers: reportedUsers.size,
          suspendedUsers,
          bannedUsers,
          resolvedToday: 0,
          averageTrustScore,
          resolutionRate:
            reports.length > 0
              ? Math.round(
                  (resolvedCount / reports.length) *
                    100
                )
              : 0
        },
        reports,
        moderators: moderatorRows,
        aiAlerts,
        recentActivity
      }
    });
  } catch (error) {
    console.error(
      "Error cargando Moderación:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No fue posible cargar Moderación.",
      error: error.message
    });
  }
}

async function updateModerationReport(req, res) {
  try {
    if (!hasAccess(req, true)) {
      return deny(res);
    }

    const productId = parseProductId(
      req.params.reportId
    );

    if (!productId) {
      return res.status(400).json({
        success: false,
        message:
          "Identificador de reporte inválido."
      });
    }

    const product = await findProduct(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado."
      });
    }

    const currentAnalysis = asObject(
      product.aiAnalysis
    );

    const moderation = {
      ...moderationState(product),
      updatedAt: new Date().toISOString(),
      updatedById:
        req.prismaUser?.id ||
        req.user?.id ||
        null,
      updatedByName: personName(
        req.prismaUser || req.user
      )
    };

    const requestedStatus = normalize(
      req.body?.status
    );

    if (VALID_STATUSES.includes(requestedStatus)) {
      moderation.status = requestedStatus;
    }

    if (
      Object.prototype.hasOwnProperty.call(
        req.body || {},
        "assignedModerator"
      )
    ) {
      const assigned = asObject(
        req.body.assignedModerator
      );

      moderation.assignedModeratorId =
        assigned.id || null;

      moderation.assignedModeratorName =
        assigned.name || null;
    }

    await prisma.product.update({
      where: {
        id: productId
      },
      data: {
        aiAnalysis: {
          ...currentAnalysis,
          moderation
        }
      }
    });

    const updated = await findProduct(productId);

    return res.json({
      success: true,
      message:
        "Reporte actualizado correctamente.",
      report: serializeReport(updated)
    });
  } catch (error) {
    console.error(
      "Error actualizando reporte:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No fue posible actualizar el reporte.",
      error: error.message
    });
  }
}

async function applyModerationAction(req, res) {
  try {
    if (!hasAccess(req, true)) {
      return deny(res);
    }

    const action = normalize(req.body?.action);

    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        success: false,
        message:
          "Acción de moderación inválida."
      });
    }

    const productId = parseProductId(
      req.body?.targetId ||
      req.body?.reportId
    );

    if (!productId) {
      return res.status(400).json({
        success: false,
        message:
          "Producto de moderación inválido."
      });
    }

    const product = await findProduct(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado."
      });
    }

    const reason = String(
      req.body?.reason || ""
    ).trim();

    const moderatorId =
      req.prismaUser?.id ||
      req.user?.id ||
      null;

    const currentAnalysis = asObject(
      product.aiAnalysis
    );

    const moderation = {
      ...moderationState(product),
      action,
      actionReason: reason,
      actionById: moderatorId,
      actionByName: personName(
        req.prismaUser || req.user
      ),
      updatedAt: new Date().toISOString()
    };

    /* QSM_FASE3_5_MODERATOR_DECISION */
    const moderatorDecision = {
      action,
      reason,
      moderatorId,
      moderatorName: moderation.actionByName,
      decidedAt: moderation.updatedAt,
      lunaDecision:
        currentAnalysis.decision || null,
      lunaRiskLevel:
        currentAnalysis.riskLevel ||
        product.riskLevel ||
        null,
      lunaRiskScore: Number(
        currentAnalysis.riskScore ??
        product.riskScore ??
        0
      )
    };

    if (action === "DISMISS_REPORT") {
      moderation.status = "DISMISSED";
    } else if (action === "RESOLVE_REPORT") {
      moderation.status = "RESOLVED";
    } else {
      moderation.status = "ACTION_TAKEN";
    }

    if (action === "WARN_USER") {
      moderation.warningCount =
        Number(moderation.warningCount || 0) + 1;
    }

    await prisma.$transaction(async (tx) => {
      const productData = {
        aiAnalysis: {
          ...currentAnalysis,
          moderation,
          moderatorDecision
        }
      };

      /* QSM_FASE3_6_PRODUCT_STATUS */
      if (action === "HIDE_CONTENT") {
        productData.status = "HIDDEN";
      }

      if (action === "RESTORE_CONTENT") {
        productData.status = "ACTIVE";
      }

      if (action === "DISMISS_REPORT") {
        productData.status = "ACTIVE";
      }

      if (action === "RESOLVE_REPORT") {
        productData.status = "ACTIVE";
      }

      if (
        action === "BAN_USER" ||
        action === "SUSPEND_USER"
      ) {
        productData.status = "HIDDEN";
      }

      await tx.product.update({
        where: {
          id: productId
        },
        data: productData
      });

      const sellerId = product.sellerId;

      if (sellerId && action === "SUSPEND_USER") {
        await tx.user.update({
          where: {
            id: sellerId
          },
          data: {
            status: "SUSPENDED",
            securityLevel: "LOCKED",
            suspensionReason:
              reason ||
              "Suspensión aplicada por Moderación.",
            suspendedAt: new Date(),
            suspendedById: moderatorId
          }
        });
      }

      if (sellerId && action === "BAN_USER") {
        await tx.user.update({
          where: {
            id: sellerId
          },
          data: {
            status: "BANNED",
            securityLevel: "LOCKED",
            suspensionReason:
              reason ||
              "Cuenta bloqueada por Moderación.",
            bannedAt: new Date(),
            bannedById: moderatorId
          }
        });
      }

      if (sellerId && action === "RESTORE_USER") {
        await tx.user.update({
          where: {
            id: sellerId
          },
          data: {
            status: "ACTIVE",
            securityLevel: "NORMAL",
            suspensionReason: "",
            suspendedAt: null,
            suspendedById: null,
            bannedAt: null,
            bannedById: null
          }
        });
      }
    });

    const updated = await findProduct(productId);

    return res.json({
      success: true,
      message:
        "Acción de moderación aplicada correctamente.",
      action,
      report: serializeReport(updated)
    });
  } catch (error) {
    console.error(
      "Error aplicando moderación:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No fue posible aplicar la acción.",
      error: error.message
    });
  }
}

module.exports = {
  getModerationDashboard,
  updateModerationReport,
  applyModerationAction
};
