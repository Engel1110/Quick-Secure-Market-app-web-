"use strict";

/* QSM_FASE9_BLOCK1_LUNA_PREMIUM */

const prisma = require("../utils/prisma");

const {
  buildMarketplaceBundle
} = require("./luna-marketplace-orchestrator.service");

const {
  generateRealPredictiveSummary
} = require("./luna-predictive-intelligence.service");

const {
  analyzeRealOperations
} = require("./luna-operational-intelligence.service");

const {
  processRealDialogue
} = require("./luna-dialogue-engine.service");

const PREMIUM_KEY =
  "lunaPremium";

const PREMIUM_USAGE_KEY =
  "lunaPremiumUsage";

const PLAN_DEFINITIONS = {
  FREE: {
    code: "FREE",
    label: "LUNA Gratis",
    monthlyPrice: 0,
    academicSimulation: true,
    limits: {
      conversationsPerDay: 20,
      productAnalysesPerDay: 5,
      predictionsPerDay: 2,
      operationalReportsPerDay: 1
    },
    features: [
      "PUBLIC_DIALOGUE",
      "PRIVATE_DIALOGUE",
      "BASIC_RECOMMENDATIONS",
      "PRODUCT_SCORE",
      "BASIC_SECURITY"
    ]
  },

  PREMIUM: {
    code: "PREMIUM",
    label: "LUNA Premium",
    monthlyPrice: 0,
    academicSimulation: true,
    limits: {
      conversationsPerDay: 200,
      productAnalysesPerDay: 50,
      predictionsPerDay: 25,
      operationalReportsPerDay: 15
    },
    features: [
      "PUBLIC_DIALOGUE",
      "PRIVATE_DIALOGUE",
      "ADVANCED_MEMORY",
      "PERSONALIZED_RECOMMENDATIONS",
      "PRODUCT_SCORE",
      "MARKET_PRICE",
      "PRODUCT_COMPARISON",
      "PURCHASE_ASSISTANT",
      "TRANSACTION_RISK",
      "LISTING_ASSISTANT",
      "OPERATIONAL_INTELLIGENCE",
      "PREDICTIVE_INTELLIGENCE",
      "PRIORITY_RESPONSES",
      "ADVANCED_REPORTS"
    ]
  },

  ADMIN: {
    code: "ADMIN",
    label: "LUNA Administrativa",
    monthlyPrice: 0,
    academicSimulation: true,
    limits: {
      conversationsPerDay: -1,
      productAnalysesPerDay: -1,
      predictionsPerDay: -1,
      operationalReportsPerDay: -1
    },
    features: [
      "ALL_FEATURES",
      "ADMIN_OPERATIONS",
      "ADMIN_SECURITY",
      "ADMIN_REPORTS",
      "SYSTEM_OVERVIEW"
    ]
  }
};

function asObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}

function validateUserId(userId) {
  const id = Number(userId);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Se requiere un usuario autenticado."
    );
  }

  return id;
}

function normalizePlan(value) {
  const plan =
    String(value || "FREE")
      .trim()
      .toUpperCase();

  return PLAN_DEFINITIONS[plan]
    ? plan
    : "FREE";
}

function getDateKey() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function createDefaultPremiumState() {
  const now =
    new Date().toISOString();

  return {
    plan: "FREE",
    status: "ACTIVE",
    academicSimulation: true,
    activatedAt: now,
    expiresAt: null,
    autoRenew: false,
    paymentStatus: "SIMULATED_FREE",
    updatedAt: now
  };
}

function createDefaultUsage() {
  return {
    date: getDateKey(),
    conversations: 0,
    productAnalyses: 0,
    predictions: 0,
    operationalReports: 0,
    updatedAt:
      new Date().toISOString()
  };
}

async function readUserSetting(userId) {
  const numericUserId =
    validateUserId(userId);

  const setting =
    await prisma.userSetting.findUnique({
      where: {
        userId: numericUserId
      }
    });

  const data =
    asObject(setting?.data);

  return {
    numericUserId,
    data
  };
}

async function savePremiumData({
  numericUserId,
  data,
  premium,
  usage
}) {
  const nextData = {
    ...data,
    [PREMIUM_KEY]:
      premium,
    [PREMIUM_USAGE_KEY]:
      usage
  };

  await prisma.userSetting.upsert({
    where: {
      userId: numericUserId
    },
    update: {
      data: nextData
    },
    create: {
      userId: numericUserId,
      data: nextData
    }
  });

  return {
    premium,
    usage
  };
}

async function getPremiumAccount({
  userId
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const storedPremium =
    asObject(data[PREMIUM_KEY]);

  const premium =
    Object.keys(storedPremium).length > 0
      ? storedPremium
      : createDefaultPremiumState();

  let usage =
    asObject(
      data[PREMIUM_USAGE_KEY]
    );

  if (
    !usage.date ||
    usage.date !== getDateKey()
  ) {
    usage =
      createDefaultUsage();
  }

  const plan =
    normalizePlan(premium.plan);

  const planDefinition =
    PLAN_DEFINITIONS[plan];

  if (
    Object.keys(storedPremium).length === 0 ||
    data[PREMIUM_USAGE_KEY]?.date !==
      usage.date
  ) {
    await savePremiumData({
      numericUserId,
      data,
      premium: {
        ...premium,
        plan
      },
      usage
    });
  }

  return {
    userId:
      numericUserId,
    premium: {
      ...premium,
      plan,
      definition:
        planDefinition
    },
    usage,
    availablePlans:
      Object.values(
        PLAN_DEFINITIONS
      )
  };
}

async function activatePremiumPlan({
  userId,
  plan = "PREMIUM",
  durationDays = 30
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const normalizedPlan =
    normalizePlan(plan);

  const days =
    Math.max(
      1,
      Math.min(
        365,
        Number(durationDays || 30)
      )
    );

  const now =
    new Date();

  const expiresAt =
    normalizedPlan === "FREE" ||
    normalizedPlan === "ADMIN"
      ? null
      : new Date(
          now.getTime() +
          days * 24 * 60 * 60 * 1000
        ).toISOString();

  const premium = {
    plan:
      normalizedPlan,
    status:
      "ACTIVE",
    academicSimulation:
      true,
    activatedAt:
      now.toISOString(),
    expiresAt,
    autoRenew:
      false,
    paymentStatus:
      normalizedPlan === "PREMIUM"
        ? "SIMULATED_APPROVED"
        : "SIMULATED_FREE",
    updatedAt:
      now.toISOString()
  };

  let usage =
    asObject(
      data[PREMIUM_USAGE_KEY]
    );

  if (
    usage.date !== getDateKey()
  ) {
    usage =
      createDefaultUsage();
  }

  await savePremiumData({
    numericUserId,
    data,
    premium,
    usage
  });

  return {
    success: true,
    message:
      normalizedPlan === "PREMIUM"
        ? "LUNA Premium fue activada mediante simulación académica."
        : `El plan ${normalizedPlan} fue activado.`,
    premium: {
      ...premium,
      definition:
        PLAN_DEFINITIONS[
          normalizedPlan
        ]
    },
    usage
  };
}

function isPremiumExpired(premium = {}) {
  if (!premium.expiresAt) {
    return false;
  }

  const expiration =
    new Date(
      premium.expiresAt
    ).getTime();

  return (
    Number.isFinite(expiration) &&
    expiration < Date.now()
  );
}

async function ensureActivePremiumState({
  userId
}) {
  const account =
    await getPremiumAccount({
      userId
    });

  if (
    account.premium.plan ===
      "PREMIUM" &&
    isPremiumExpired(
      account.premium
    )
  ) {
    return activatePremiumPlan({
      userId,
      plan: "FREE",
      durationDays: 30
    });
  }

  return account;
}

function hasPremiumFeature({
  account,
  feature
}) {
  const features =
    account?.premium
      ?.definition
      ?.features || [];

  return (
    features.includes(
      "ALL_FEATURES"
    ) ||
    features.includes(
      String(feature || "")
        .trim()
        .toUpperCase()
    )
  );
}

function getUsageField(action) {
  const actions = {
    CONVERSATION:
      "conversations",
    PRODUCT_ANALYSIS:
      "productAnalyses",
    PREDICTION:
      "predictions",
    OPERATIONAL_REPORT:
      "operationalReports"
  };

  return actions[
    String(action || "")
      .trim()
      .toUpperCase()
  ] || null;
}

function getLimitField(action) {
  const limits = {
    CONVERSATION:
      "conversationsPerDay",
    PRODUCT_ANALYSIS:
      "productAnalysesPerDay",
    PREDICTION:
      "predictionsPerDay",
    OPERATIONAL_REPORT:
      "operationalReportsPerDay"
  };

  return limits[
    String(action || "")
      .trim()
      .toUpperCase()
  ] || null;
}

async function consumePremiumUsage({
  userId,
  action
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const account =
    await ensureActivePremiumState({
      userId:
        numericUserId
    });

  const usageField =
    getUsageField(action);

  const limitField =
    getLimitField(action);

  if (
    !usageField ||
    !limitField
  ) {
    throw new Error(
      "La acción de consumo no es válida."
    );
  }

  const limits =
    account.premium
      .definition
      .limits;

  const limit =
    Number(
      limits[limitField]
    );

  const usage = {
    ...createDefaultUsage(),
    ...account.usage
  };

  const current =
    Number(
      usage[usageField] || 0
    );

  if (
    limit !== -1 &&
    current >= limit
  ) {
    return {
      allowed: false,
      action:
        String(action)
          .toUpperCase(),
      plan:
        account.premium.plan,
      used:
        current,
      limit,
      remaining: 0,
      message:
        "Alcanzaste el límite diario disponible para esta función."
    };
  }

  usage[usageField] =
    current + 1;

  usage.updatedAt =
    new Date().toISOString();

  const premium = {
    ...account.premium
  };

  delete premium.definition;

  await savePremiumData({
    numericUserId,
    data,
    premium,
    usage
  });

  return {
    allowed: true,
    action:
      String(action)
        .toUpperCase(),
    plan:
      account.premium.plan,
    used:
      usage[usageField],
    limit,
    remaining:
      limit === -1
        ? -1
        : Math.max(
            0,
            limit -
            usage[usageField]
          ),
    usage
  };
}

function getPremiumCapabilities() {
  return {
    assistant: "LUNA",
    phase: "9",
    academicSimulation: true,
    realPaymentsEnabled: false,
    plans:
      Object.values(
        PLAN_DEFINITIONS
      ),
    capabilities: [
      "PLAN_MANAGEMENT",
      "FEATURE_ACCESS",
      "DAILY_USAGE_LIMITS",
      "PREMIUM_SIMULATION",
      "AUTOMATIC_EXPIRATION",
      "USAGE_TRACKING"
    ],
    version:
      "QSM-LUNA-PREMIUM-1.0"
  };
}

/* QSM_FASE9_BLOCK2_PREMIUM_INTEGRATION */

function normalizePremiumAction(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function getPremiumActionDefinition(action) {
  const definitions = {
    MARKETPLACE_REPORT: {
      feature:
        "ADVANCED_REPORTS",
      usageAction:
        "PRODUCT_ANALYSIS"
    },

    PREDICTIVE_REPORT: {
      feature:
        "PREDICTIVE_INTELLIGENCE",
      usageAction:
        "PREDICTION"
    },

    OPERATIONAL_REPORT: {
      feature:
        "OPERATIONAL_INTELLIGENCE",
      usageAction:
        "OPERATIONAL_REPORT"
    },

    PRIORITY_CONVERSATION: {
      feature:
        "PRIORITY_RESPONSES",
      usageAction:
        "CONVERSATION"
    }
  };

  return definitions[
    normalizePremiumAction(action)
  ] || null;
}

async function checkPremiumAccess({
  userId,
  feature
}) {
  const account =
    await ensureActivePremiumState({
      userId
    });

  const normalizedFeature =
    String(feature || "")
      .trim()
      .toUpperCase();

  const allowed =
    hasPremiumFeature({
      account,
      feature:
        normalizedFeature
    });

  return {
    allowed,
    feature:
      normalizedFeature,
    plan:
      account.premium.plan,
    planLabel:
      account.premium
        .definition.label,
    message:
      allowed
        ? "La función está disponible."
        : "Esta función requiere LUNA Premium.",
    account
  };
}

async function executePremiumAction({
  userId,
  action,
  payload = {}
}) {
  const numericUserId =
    validateUserId(userId);

  const normalizedAction =
    normalizePremiumAction(action);

  const definition =
    getPremiumActionDefinition(
      normalizedAction
    );

  if (!definition) {
    throw new Error(
      `Acción Premium no reconocida: ${
        normalizedAction || "VACÍA"
      }`
    );
  }

  const access =
    await checkPremiumAccess({
      userId:
        numericUserId,
      feature:
        definition.feature
    });

  if (!access.allowed) {
    return {
      success: false,
      allowed: false,
      requiresPremium: true,
      action:
        normalizedAction,
      feature:
        definition.feature,
      plan:
        access.plan,
      message:
        access.message
    };
  }

  const usage =
    await consumePremiumUsage({
      userId:
        numericUserId,
      action:
        definition.usageAction
    });

  if (!usage.allowed) {
    return {
      success: false,
      allowed: false,
      requiresPremium: false,
      limitReached: true,
      action:
        normalizedAction,
      feature:
        definition.feature,
      plan:
        usage.plan,
      usage,
      message:
        usage.message
    };
  }

  let result;

  switch (normalizedAction) {
    case "MARKETPLACE_REPORT":
      result =
        await buildMarketplaceBundle({
          userId:
            numericUserId,
          productId:
            payload.productId ||
            null,
          includePurchaseAnalysis:
            payload
              .includePurchaseAnalysis !==
            false
        });
      break;

    case "PREDICTIVE_REPORT":
      result =
        await generateRealPredictiveSummary({
          userId:
            numericUserId,
          productId:
            payload.productId
        });
      break;

    case "OPERATIONAL_REPORT":
      result =
        await analyzeRealOperations({
          userId:
            numericUserId
        });
      break;

    case "PRIORITY_CONVERSATION":
      result =
        await processRealDialogue({
          userId:
            numericUserId,
          sessionId:
            payload.sessionId ||
            `PREMIUM-${numericUserId}`,
          message:
            payload.message ||
            "",
          context:
            payload.context ||
            {}
        });
      break;

    default:
      throw new Error(
        "La acción Premium no pudo ejecutarse."
      );
  }

  return {
    success: true,
    allowed: true,
    requiresPremium: false,
    action:
      normalizedAction,
    feature:
      definition.feature,
    plan:
      access.plan,
    usage,
    result,
    executedAt:
      new Date().toISOString()
  };
}

async function getPremiumDashboard({
  userId
}) {
  const account =
    await ensureActivePremiumState({
      userId
    });

  const limits =
    account.premium
      .definition
      .limits;

  const usage =
    account.usage;

  function buildUsageItem({
    used,
    limit
  }) {
    const numericUsed =
      Number(used || 0);

    const numericLimit =
      Number(limit);

    return {
      used:
        numericUsed,
      limit:
        numericLimit,
      unlimited:
        numericLimit === -1,
      remaining:
        numericLimit === -1
          ? -1
          : Math.max(
              0,
              numericLimit -
              numericUsed
            ),
      percentage:
        numericLimit === -1
          ? 0
          : numericLimit > 0
            ? Math.min(
                100,
                Math.round(
                  (
                    numericUsed /
                    numericLimit
                  ) * 100
                )
              )
            : 100
    };
  }

  return {
    assistant: "LUNA",
    phase: "9",
    userId:
      account.userId,
    plan: {
      code:
        account.premium.plan,
      label:
        account.premium
          .definition.label,
      status:
        account.premium.status,
      activatedAt:
        account.premium.activatedAt,
      expiresAt:
        account.premium.expiresAt,
      paymentStatus:
        account.premium.paymentStatus,
      academicSimulation:
        true
    },
    usage: {
      date:
        usage.date,

      conversations:
        buildUsageItem({
          used:
            usage.conversations,
          limit:
            limits
              .conversationsPerDay
        }),

      productAnalyses:
        buildUsageItem({
          used:
            usage.productAnalyses,
          limit:
            limits
              .productAnalysesPerDay
        }),

      predictions:
        buildUsageItem({
          used:
            usage.predictions,
          limit:
            limits
              .predictionsPerDay
        }),

      operationalReports:
        buildUsageItem({
          used:
            usage.operationalReports,
          limit:
            limits
              .operationalReportsPerDay
        })
    },
    features:
      account.premium
        .definition
        .features,
    availableActions: [
      "MARKETPLACE_REPORT",
      "PREDICTIVE_REPORT",
      "OPERATIONAL_REPORT",
      "PRIORITY_CONVERSATION"
    ],
    message:
      account.premium.plan ===
        "PREMIUM"
        ? "LUNA Premium está activa."
        : account.premium.plan ===
            "ADMIN"
          ? "LUNA Administrativa está activa."
          : "Actualmente utilizas LUNA Gratis.",
    generatedAt:
      new Date().toISOString(),
    version:
      "QSM-LUNA-PREMIUM-2.0"
  };
}

async function deactivatePremiumPlan({
  userId
}) {
  const result =
    await activatePremiumPlan({
      userId,
      plan: "FREE",
      durationDays: 30
    });

  return {
    ...result,
    message:
      "LUNA Premium fue desactivada y la cuenta regresó al plan gratuito."
  };
}

module.exports = {
  getPremiumAccount,
  activatePremiumPlan,
  ensureActivePremiumState,
  hasPremiumFeature,
  consumePremiumUsage,
  getPremiumCapabilities,
  checkPremiumAccess,
  executePremiumAction,
  getPremiumDashboard,
  deactivatePremiumPlan
};
