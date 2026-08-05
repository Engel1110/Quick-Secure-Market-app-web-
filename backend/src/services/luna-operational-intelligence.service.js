"use strict";

const prisma = require("../utils/prisma");

/* QSM_FASE6_BLOCK1_OPERATIONAL_INTELLIGENCE */

function asArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function clampScore(value) {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(Number(value || 0))
    )
  );
}

function getPriorityScore(item = {}) {
  let score = 20;

  const area =
    normalizeText(item.area);

  const status =
    normalizeText(item.status);

  const severity =
    normalizeText(item.severity);

  const ageHours =
    Math.max(
      0,
      Number(item.ageHours || 0)
    );

  if (
    severity === "CRITICAL" ||
    severity === "CRÍTICO"
  ) {
    score += 50;
  }
  else if (
    severity === "HIGH" ||
    severity === "ALTO"
  ) {
    score += 35;
  }
  else if (
    severity === "MEDIUM" ||
    severity === "MEDIO"
  ) {
    score += 20;
  }
  else if (
    severity === "LOW" ||
    severity === "BAJO"
  ) {
    score += 5;
  }

  if (
    status === "BLOCKED" ||
    status === "BLOQUEADO"
  ) {
    score += 25;
  }

  if (
    status === "OVERDUE" ||
    status === "VENCIDO"
  ) {
    score += 30;
  }

  if (ageHours >= 72) {
    score += 20;
  }
  else if (ageHours >= 24) {
    score += 12;
  }
  else if (ageHours >= 8) {
    score += 5;
  }

  if (
    area === "FINANCE" ||
    area === "FINANZAS"
  ) {
    score += 8;
  }

  if (
    area === "DISPUTES" ||
    area === "DISPUTAS"
  ) {
    score += 10;
  }

  if (
    area === "SECURITY" ||
    area === "SEGURIDAD"
  ) {
    score += 15;
  }

  if (
    area === "MODERATION" ||
    area === "MODERACIÓN"
  ) {
    score += 8;
  }

  return clampScore(score);
}

function getPriorityLevel(score) {
  if (score >= 85) {
    return {
      code: "CRITICAL",
      label: "Crítica"
    };
  }

  if (score >= 65) {
    return {
      code: "HIGH",
      label: "Alta"
    };
  }

  if (score >= 40) {
    return {
      code: "MEDIUM",
      label: "Media"
    };
  }

  return {
    code: "LOW",
    label: "Baja"
  };
}

function getRecommendedAction(item = {}) {
  const area =
    normalizeText(item.area);

  const status =
    normalizeText(item.status);

  if (
    status === "BLOCKED" ||
    status === "BLOQUEADO"
  ) {
    return "Resolver el bloqueo antes de continuar el flujo.";
  }

  if (
    area === "FINANCE" ||
    area === "FINANZAS"
  ) {
    return "Revisar y validar el pago simulado pendiente.";
  }

  if (
    area === "WAREHOUSE" ||
    area === "ALMACÉN"
  ) {
    return "Confirmar recepción, preparación o entrega del producto.";
  }

  if (
    area === "DISPUTES" ||
    area === "DISPUTAS"
  ) {
    return "Revisar evidencias y actualizar el estado de la disputa.";
  }

  if (
    area === "MODERATION" ||
    area === "MODERACIÓN"
  ) {
    return "Evaluar el reporte y aplicar la acción de moderación correspondiente.";
  }

  if (
    area === "SUPPORT" ||
    area === "SOPORTE"
  ) {
    return "Responder el caso y documentar la solución.";
  }

  if (
    area === "SECURITY" ||
    area === "SEGURIDAD"
  ) {
    return "Revisar inmediatamente las señales de riesgo detectadas.";
  }

  return "Revisar el caso y actualizar su estado.";
}

function normalizeOperationalItem(item = {}, index = 0) {
  const priorityScore =
    getPriorityScore(item);

  return {
    id:
      item.id ||
      `OP-${index + 1}`,
    area:
      normalizeText(
        item.area || "GENERAL"
      ),
    type:
      normalizeText(
        item.type || "TASK"
      ),
    title:
      String(
        item.title ||
        item.description ||
        "Tarea operacional"
      )
        .trim()
        .slice(0, 200),
    status:
      normalizeText(
        item.status || "PENDING"
      ),
    severity:
      normalizeText(
        item.severity || "MEDIUM"
      ),
    ageHours:
      Math.max(
        0,
        Number(item.ageHours || 0)
      ),
    assignedTo:
      item.assignedTo || null,
    relatedId:
      item.relatedId || null,
    priorityScore,
    priority:
      getPriorityLevel(
        priorityScore
      ),
    recommendedAction:
      getRecommendedAction(item)
  };
}

function analyzeOperationalQueue({
  items = []
}) {
  const normalized =
    asArray(items)
      .map(normalizeOperationalItem)
      .sort(
        (first, second) =>
          second.priorityScore -
          first.priorityScore
      );

  const critical =
    normalized.filter(
      (item) =>
        item.priority.code === "CRITICAL"
    );

  const high =
    normalized.filter(
      (item) =>
        item.priority.code === "HIGH"
    );

  const blocked =
    normalized.filter(
      (item) =>
        item.status === "BLOCKED" ||
        item.status === "BLOQUEADO"
    );

  const overdue =
    normalized.filter(
      (item) =>
        item.status === "OVERDUE" ||
        item.status === "VENCIDO"
    );

  const byArea =
    normalized.reduce(
      (result, item) => {
        result[item.area] =
          Number(
            result[item.area] || 0
          ) + 1;

        return result;
      },
      {}
    );

  const healthScore =
    normalized.length === 0
      ? 100
      : clampScore(
          100 -
          critical.length * 18 -
          high.length * 8 -
          blocked.length * 12 -
          overdue.length * 10
        );

  return {
    total:
      normalized.length,
    healthScore,
    healthStatus:
      healthScore >= 85
        ? "HEALTHY"
        : healthScore >= 65
          ? "ATTENTION"
          : healthScore >= 40
            ? "RISK"
            : "CRITICAL",
    counters: {
      critical:
        critical.length,
      high:
        high.length,
      blocked:
        blocked.length,
      overdue:
        overdue.length
    },
    byArea,
    priorityQueue:
      normalized,
    immediateActions:
      normalized
        .filter(
          (item) =>
            item.priority.code ===
              "CRITICAL" ||
            item.priority.code ===
              "HIGH"
        )
        .slice(0, 10)
        .map((item) => ({
          id:
            item.id,
          area:
            item.area,
          title:
            item.title,
          priority:
            item.priority,
          action:
            item.recommendedAction
        })),
    analyzedAt:
      new Date().toISOString(),
    version:
      "QSM-LUNA-OPERATIONS-1.0"
  };
}

function generateOperationalPlan({
  items = []
}) {
  const analysis =
    analyzeOperationalQueue({
      items
    });

  const plan =
    analysis.priorityQueue.map(
      (item, index) => ({
        order:
          index + 1,
        taskId:
          item.id,
        area:
          item.area,
        priority:
          item.priority,
        action:
          item.recommendedAction,
        target:
          item.priority.code === "CRITICAL"
            ? "Inmediato"
            : item.priority.code === "HIGH"
              ? "Menos de 4 horas"
              : item.priority.code === "MEDIUM"
                ? "Durante el día"
                : "Programar"
      })
    );

  return {
    ...analysis,
    plan,
    summary:
      analysis.total === 0
        ? "No existen tareas operacionales pendientes."
        : analysis.counters.critical > 0
          ? "Existen tareas críticas que requieren atención inmediata."
          : analysis.counters.high > 0
            ? "Existen tareas de prioridad alta pendientes."
            : "La operación se encuentra bajo control.",
    generatedAt:
      new Date().toISOString()
  };
}

function getOperationalCapabilities() {
  return {
    assistant: "LUNA",
    phase: "6",
    capabilities: [
      "PRIORITY_QUEUE",
      "OPERATIONAL_HEALTH",
      "BLOCKED_TASKS",
      "OVERDUE_TASKS",
      "AREA_SUMMARY",
      "ACTION_PLAN"
    ],
    supportedAreas: [
      "FINANZAS",
      "ALMACÉN",
      "DISPUTAS",
      "MODERACIÓN",
      "SOPORTE",
      "SEGURIDAD",
      "OPERACIONES"
    ],
    version:
      "QSM-LUNA-OPERATIONS-1.0"
  };
}

/* QSM_FASE6_BLOCK2_REAL_OPERATIONS */

const OPERATION_HISTORY_KEY =
  "lunaOperationalHistory";

function getAgeHours(createdAt) {
  if (!createdAt) {
    return 0;
  }

  const timestamp =
    new Date(createdAt).getTime();

  if (!Number.isFinite(timestamp)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (Date.now() - timestamp) /
      (60 * 60 * 1000)
    )
  );
}

function mapOrderArea(status) {
  const value =
    normalizeText(status);

  if (
    value.includes("PAYMENT") ||
    value.includes("FINANCE") ||
    value.includes("PAGO")
  ) {
    return "FINANZAS";
  }

  if (
    value.includes("WAREHOUSE") ||
    value.includes("RECEIVED") ||
    value.includes("READY") ||
    value.includes("DELIVERY") ||
    value.includes("SHIPPED")
  ) {
    return "ALMACÉN";
  }

  if (
    value.includes("DISPUTE") ||
    value.includes("CLAIM")
  ) {
    return "DISPUTAS";
  }

  if (
    value.includes("CANCEL") ||
    value.includes("FAILED")
  ) {
    return "SOPORTE";
  }

  return "OPERACIONES";
}

function mapOrderSeverity(status, ageHours) {
  const value =
    normalizeText(status);

  if (
    value.includes("FAILED") ||
    value.includes("DISPUTE") ||
    value.includes("BLOCKED")
  ) {
    return "CRITICAL";
  }

  if (
    value.includes("CANCEL") ||
    ageHours >= 72
  ) {
    return "HIGH";
  }

  if (ageHours >= 24) {
    return "MEDIUM";
  }

  return "LOW";
}

function mapOperationalStatus(status, ageHours) {
  const value =
    normalizeText(status);

  if (
    value.includes("BLOCKED") ||
    value.includes("FAILED")
  ) {
    return "BLOCKED";
  }

  if (
    ageHours >= 72 &&
    !value.includes("COMPLETED") &&
    !value.includes("DELIVERED") &&
    !value.includes("CANCELLED")
  ) {
    return "OVERDUE";
  }

  return value || "PENDING";
}

async function getOperationalDatabaseItems() {
  const [
    orders,
    hiddenProducts,
    settings
  ] = await Promise.all([
    prisma.order.findMany({
      orderBy: {
        createdAt: "desc"
      },
      take: 150,
      select: {
        id: true,
        status: true,
        totalAmount: true,
        buyerId: true,
        sellerId: true,
        createdAt: true,
        updatedAt: true
      }
    }),

    prisma.product.findMany({
      where: {
        status: {
          not: "ACTIVE"
        }
      },
      orderBy: {
        updatedAt: "desc"
      },
      take: 50,
      select: {
        id: true,
        title: true,
        status: true,
        sellerId: true,
        createdAt: true,
        updatedAt: true
      }
    }),

    prisma.userSetting.findMany({
      take: 100
    })
  ]);

  const orderItems =
    orders
      .filter((order) => {
        const status =
          normalizeText(order.status);

        return (
          !status.includes("COMPLETED") &&
          !status.includes("DELIVERED") &&
          !status.includes("CANCELLED")
        );
      })
      .map((order) => {
        const ageHours =
          getAgeHours(
            order.updatedAt ||
            order.createdAt
          );

        return {
          id:
            `ORDER-${order.id}`,
          area:
            mapOrderArea(order.status),
          type:
            "ORDER",
          title:
            `Orden ${order.id} pendiente en estado ${order.status}`,
          status:
            mapOperationalStatus(
              order.status,
              ageHours
            ),
          severity:
            mapOrderSeverity(
              order.status,
              ageHours
            ),
          ageHours,
          assignedTo:
            null,
          relatedId:
            order.id,
          metadata: {
            totalAmount:
              Number(
                order.totalAmount || 0
              ),
            buyerId:
              order.buyerId,
            sellerId:
              order.sellerId
          }
        };
      });

  const productItems =
    hiddenProducts.map((product) => {
      const ageHours =
        getAgeHours(
          product.updatedAt ||
          product.createdAt
        );

      return {
        id:
          `PRODUCT-${product.id}`,
        area:
          "MODERACIÓN",
        type:
          "PRODUCT",
        title:
          `Revisar publicación: ${product.title}`,
        status:
          mapOperationalStatus(
            product.status,
            ageHours
          ),
        severity:
          product.status === "HIDDEN"
            ? "HIGH"
            : "MEDIUM",
        ageHours,
        assignedTo:
          null,
        relatedId:
          product.id
      };
    });

  const securityItems = [];

  for (const setting of settings) {
    const data =
      setting?.data &&
      typeof setting.data === "object" &&
      !Array.isArray(setting.data)
        ? setting.data
        : {};

    const risks =
      Array.isArray(
        data.lunaTransactionRiskHistory
      )
        ? data.lunaTransactionRiskHistory
        : [];

    risks
      .filter((risk) =>
        ["BLOCK", "MANUAL_REVIEW"].includes(
          normalizeText(risk.decision)
        )
      )
      .slice(0, 5)
      .forEach((risk, index) => {
        securityItems.push({
          id:
            risk.id ||
            `RISK-${setting.userId}-${index}`,
          area:
            "SEGURIDAD",
          type:
            "TRANSACTION_RISK",
          title:
            risk.productTitle
              ? `Revisar riesgo de ${risk.productTitle}`
              : "Revisar operación con riesgo",
          status:
            risk.decision === "BLOCK"
              ? "BLOCKED"
              : "PENDING",
          severity:
            risk.decision === "BLOCK"
              ? "CRITICAL"
              : "HIGH",
          ageHours:
            getAgeHours(
              risk.analyzedAt ||
              risk.createdAt
            ),
          assignedTo:
            null,
          relatedId:
            risk.productId || null
        });
      });
  }

  return [
    ...orderItems,
    ...productItems,
    ...securityItems
  ];
}

async function saveOperationalAnalysis({
  userId,
  analysis
}) {
  const numericUserId =
    Number(userId);

  if (
    !Number.isInteger(numericUserId) ||
    numericUserId <= 0
  ) {
    return {
      ...analysis,
      saved: false
    };
  }

  const setting =
    await prisma.userSetting.findUnique({
      where: {
        userId: numericUserId
      }
    });

  const data =
    setting?.data &&
    typeof setting.data === "object" &&
    !Array.isArray(setting.data)
      ? setting.data
      : {};

  const currentHistory =
    Array.isArray(
      data[OPERATION_HISTORY_KEY]
    )
      ? data[OPERATION_HISTORY_KEY]
      : [];

  const entry = {
    id:
      `OPS-${Date.now()}`,
    healthScore:
      analysis.healthScore,
    healthStatus:
      analysis.healthStatus,
    total:
      analysis.total,
    counters:
      analysis.counters,
    byArea:
      analysis.byArea,
    generatedAt:
      new Date().toISOString()
  };

  const history = [
    entry,
    ...currentHistory
  ].slice(0, 30);

  await prisma.userSetting.upsert({
    where: {
      userId: numericUserId
    },
    update: {
      data: {
        ...data,
        [OPERATION_HISTORY_KEY]:
          history
      }
    },
    create: {
      userId: numericUserId,
      data: {
        ...data,
        [OPERATION_HISTORY_KEY]:
          history
      }
    }
  });

  return {
    ...analysis,
    analysisId:
      entry.id,
    saved: true
  };
}

async function analyzeRealOperations({
  userId
}) {
  const items =
    await getOperationalDatabaseItems();

  const analysis =
    generateOperationalPlan({
      items
    });

  return saveOperationalAnalysis({
    userId,
    analysis
  });
}

async function getOperationalHistory({
  userId
}) {
  const numericUserId =
    Number(userId);

  if (
    !Number.isInteger(numericUserId) ||
    numericUserId <= 0
  ) {
    throw new Error(
      "Se requiere un usuario válido."
    );
  }

  const setting =
    await prisma.userSetting.findUnique({
      where: {
        userId: numericUserId
      }
    });

  const data =
    setting?.data &&
    typeof setting.data === "object" &&
    !Array.isArray(setting.data)
      ? setting.data
      : {};

  const history =
    Array.isArray(
      data[OPERATION_HISTORY_KEY]
    )
      ? data[OPERATION_HISTORY_KEY]
      : [];

  return {
    total:
      history.length,
    history
  };
}

module.exports = {
  analyzeOperationalQueue,
  generateOperationalPlan,
  getOperationalCapabilities,
  getOperationalDatabaseItems,
  analyzeRealOperations,
  getOperationalHistory
};
