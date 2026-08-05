"use strict";

/* QSM_FASE8_BLOCK1_PREDICTIVE_INTELLIGENCE */

const prisma = require("../utils/prisma");

const {
  getSavedProductScore
} = require("./luna-product-score.service");

const {
  analyzeProductMarketPrice
} = require("./luna-market-price.service");

const {
  analyzeRealOperations,
  getOperationalHistory
} = require("./luna-operational-intelligence.service");

function asArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function asObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
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

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function average(values = []) {
  const validValues =
    values
      .map(Number)
      .filter(Number.isFinite);

  if (validValues.length === 0) {
    return 0;
  }

  return (
    validValues.reduce(
      (sum, value) => sum + value,
      0
    ) / validValues.length
  );
}

function calculateTrend(values = []) {
  const validValues =
    values
      .map(Number)
      .filter(Number.isFinite);

  if (validValues.length < 2) {
    return {
      code: "STABLE",
      label: "Estable",
      percentage: 0
    };
  }

  const first =
    validValues[0];

  const last =
    validValues[
      validValues.length - 1
    ];

  if (first === 0) {
    return {
      code:
        last > 0
          ? "UP"
          : "STABLE",
      label:
        last > 0
          ? "En aumento"
          : "Estable",
      percentage:
        last > 0
          ? 100
          : 0
    };
  }

  const percentage =
    Math.round(
      ((last - first) / Math.abs(first)) *
      100
    );

  if (percentage >= 10) {
    return {
      code: "UP",
      label: "En aumento",
      percentage
    };
  }

  if (percentage <= -10) {
    return {
      code: "DOWN",
      label: "En descenso",
      percentage
    };
  }

  return {
    code: "STABLE",
    label: "Estable",
    percentage
  };
}

function getProbabilityLabel(score) {
  if (score >= 85) {
    return "Muy alta";
  }

  if (score >= 70) {
    return "Alta";
  }

  if (score >= 50) {
    return "Media";
  }

  if (score >= 30) {
    return "Baja";
  }

  return "Muy baja";
}

function predictSaleProbability({
  product = {},
  seller = {},
  market = {}
}) {
  const productData =
    asObject(product);

  const sellerData =
    asObject(seller);

  const marketData =
    asObject(market);

  const reasons = [];
  const recommendations = [];

  let probability = 35;

  const productScore =
    clampScore(
      productData.score ??
      productData.recommendationScore ??
      50
    );

  const sellerScore =
    clampScore(
      sellerData.sellerScore ??
      sellerData.trustScore ??
      50
    );

  const riskScore =
    clampScore(
      productData.riskScore ?? 0
    );

  const views =
    Math.max(
      0,
      Number(productData.views || 0)
    );

  const favorites =
    Math.max(
      0,
      Number(productData.favorites || 0)
    );

  const inquiries =
    Math.max(
      0,
      Number(productData.inquiries || 0)
    );

  const price =
    Math.max(
      0,
      Number(productData.price || 0)
    );

  const marketMedian =
    Math.max(
      0,
      Number(
        marketData.medianPrice ||
        marketData.averagePrice ||
        0
      )
    );

  if (productScore >= 85) {
    probability += 18;
    reasons.push(
      "El producto tiene una puntuación alta."
    );
  }
  else if (productScore >= 70) {
    probability += 10;
    reasons.push(
      "El producto tiene una puntuación favorable."
    );
  }
  else if (productScore < 45) {
    probability -= 15;
    recommendations.push(
      "Mejorar la publicación y sus indicadores de confianza."
    );
  }

  if (sellerScore >= 80) {
    probability += 12;
    reasons.push(
      "El vendedor tiene buena reputación."
    );
  }
  else if (sellerScore < 40) {
    probability -= 15;
    recommendations.push(
      "Mejorar reputación, verificación y atención al comprador."
    );
  }

  if (riskScore >= 70) {
    probability -= 30;
    recommendations.push(
      "Revisar las señales de riesgo antes de mantener la publicación activa."
    );
  }
  else if (riskScore <= 20) {
    probability += 8;
    reasons.push(
      "La publicación presenta riesgo bajo."
    );
  }

  if (views >= 100) {
    probability += 10;
    reasons.push(
      "La publicación tiene buena visibilidad."
    );
  }
  else if (views >= 25) {
    probability += 5;
  }
  else {
    recommendations.push(
      "Aumentar la visibilidad de la publicación."
    );
  }

  if (favorites >= 10) {
    probability += 10;
    reasons.push(
      "El producto genera interés entre compradores."
    );
  }
  else if (favorites >= 3) {
    probability += 5;
  }

  if (inquiries >= 5) {
    probability += 10;
    reasons.push(
      "Existen varias consultas de compradores."
    );
  }
  else if (inquiries >= 1) {
    probability += 4;
  }

  let pricePosition = "UNKNOWN";

  if (
    price > 0 &&
    marketMedian > 0
  ) {
    const difference =
      ((price - marketMedian) /
        marketMedian) *
      100;

    if (difference <= -10) {
      probability += 12;
      pricePosition = "BELOW_MARKET";

      reasons.push(
        "El precio está por debajo del mercado."
      );
    }
    else if (difference <= 10) {
      probability += 7;
      pricePosition = "FAIR";

      reasons.push(
        "El precio está dentro del rango esperado."
      );
    }
    else if (difference >= 25) {
      probability -= 18;
      pricePosition = "ABOVE_MARKET";

      recommendations.push(
        "Considerar una reducción de precio."
      );
    }
    else {
      probability -= 6;
      pricePosition = "SLIGHTLY_HIGH";
    }
  }

  const finalProbability =
    clampScore(probability);

  return {
    probability:
      finalProbability,
    probabilityLabel:
      getProbabilityLabel(
        finalProbability
      ),
    likelyToSell:
      finalProbability >= 60,
    expectedTime:
      finalProbability >= 85
        ? "1 a 7 días"
        : finalProbability >= 70
          ? "1 a 3 semanas"
          : finalProbability >= 50
            ? "1 a 2 meses"
            : "Más de 2 meses",
    reasons:
      [...new Set(reasons)].slice(0, 10),
    recommendations:
      [...new Set(recommendations)]
        .slice(0, 10),
    factors: {
      productScore,
      sellerScore,
      riskScore,
      views,
      favorites,
      inquiries,
      price,
      marketMedian,
      pricePosition
    },
    predictedAt:
      new Date().toISOString()
  };
}

function predictDemand({
  history = [],
  currentActivity = {}
}) {
  const records =
    asArray(history);

  const activity =
    asObject(currentActivity);

  const salesValues =
    records.map(
      (item) =>
        Number(
          item.sales ??
          item.completedSales ??
          0
        )
    );

  const searchValues =
    records.map(
      (item) =>
        Number(
          item.searches ??
          item.views ??
          0
        )
    );

  const salesTrend =
    calculateTrend(salesValues);

  const searchTrend =
    calculateTrend(searchValues);

  const averageSales =
    average(salesValues);

  const currentSearches =
    Math.max(
      0,
      Number(
        activity.searches ||
        activity.views ||
        0
      )
    );

  const currentFavorites =
    Math.max(
      0,
      Number(
        activity.favorites || 0
      )
    );

  let demandScore = 40;

  if (salesTrend.code === "UP") {
    demandScore += 20;
  }
  else if (
    salesTrend.code === "DOWN"
  ) {
    demandScore -= 15;
  }

  if (searchTrend.code === "UP") {
    demandScore += 15;
  }
  else if (
    searchTrend.code === "DOWN"
  ) {
    demandScore -= 10;
  }

  if (currentSearches >= 100) {
    demandScore += 15;
  }
  else if (currentSearches >= 25) {
    demandScore += 8;
  }

  if (currentFavorites >= 20) {
    demandScore += 10;
  }
  else if (currentFavorites >= 5) {
    demandScore += 5;
  }

  const finalDemandScore =
    clampScore(demandScore);

  const expectedSales =
    Math.max(
      0,
      Math.round(
        averageSales *
        (
          finalDemandScore >= 70
            ? 1.25
            : finalDemandScore < 40
              ? 0.75
              : 1
        )
      )
    );

  return {
    demandScore:
      finalDemandScore,
    demandLevel:
      finalDemandScore >= 80
        ? "VERY_HIGH"
        : finalDemandScore >= 65
          ? "HIGH"
          : finalDemandScore >= 45
            ? "MEDIUM"
            : finalDemandScore >= 25
              ? "LOW"
              : "VERY_LOW",
    salesTrend,
    searchTrend,
    averageSales:
      Math.round(averageSales),
    expectedSales,
    recommendation:
      finalDemandScore >= 70
        ? "La demanda parece favorable. Mantén disponibilidad y precios competitivos."
        : finalDemandScore >= 45
          ? "La demanda es estable. Revisa precio, visibilidad y competencia."
          : "La demanda parece baja. Considera ajustar precio, categoría o presentación.",
    predictedAt:
      new Date().toISOString()
  };
}

function predictOperationalRisk({
  history = [],
  current = {}
}) {
  const records =
    asArray(history);

  const currentData =
    asObject(current);

  const healthValues =
    records.map(
      (item) =>
        Number(item.healthScore || 0)
    );

  const healthTrend =
    calculateTrend(healthValues);

  const critical =
    Math.max(
      0,
      Number(
        currentData.critical ||
        currentData.counters?.critical ||
        0
      )
    );

  const blocked =
    Math.max(
      0,
      Number(
        currentData.blocked ||
        currentData.counters?.blocked ||
        0
      )
    );

  const overdue =
    Math.max(
      0,
      Number(
        currentData.overdue ||
        currentData.counters?.overdue ||
        0
      )
    );

  let riskScore =
    15 +
    critical * 18 +
    blocked * 14 +
    overdue * 10;

  if (healthTrend.code === "DOWN") {
    riskScore += 15;
  }

  if (healthTrend.code === "UP") {
    riskScore -= 10;
  }

  const finalRiskScore =
    clampScore(riskScore);

  return {
    riskScore:
      finalRiskScore,
    riskLevel:
      finalRiskScore >= 80
        ? "CRITICAL"
        : finalRiskScore >= 60
          ? "HIGH"
          : finalRiskScore >= 35
            ? "MEDIUM"
            : "LOW",
    healthTrend,
    predictedIncident:
      finalRiskScore >= 60,
    recommendation:
      finalRiskScore >= 80
        ? "Atender inmediatamente las tareas críticas, bloqueadas y vencidas."
        : finalRiskScore >= 60
          ? "Reforzar la revisión operacional durante las próximas horas."
          : finalRiskScore >= 35
            ? "Mantener seguimiento preventivo de las áreas con retrasos."
            : "La operación presenta un riesgo controlado.",
    factors: {
      critical,
      blocked,
      overdue
    },
    predictedAt:
      new Date().toISOString()
  };
}

function generatePredictiveSummary({
  sales = {},
  demand = {},
  operations = {}
}) {
  const salePrediction =
    predictSaleProbability(
      asObject(sales)
    );

  const demandPrediction =
    predictDemand(
      asObject(demand)
    );

  const operationalPrediction =
    predictOperationalRisk(
      asObject(operations)
    );

  const globalScore =
    clampScore(
      salePrediction.probability *
        0.4 +
      demandPrediction.demandScore *
        0.35 +
      (
        100 -
        operationalPrediction.riskScore
      ) *
        0.25
    );

  return {
    assistant: "LUNA",
    phase: "8",
    globalScore,
    outlook:
      globalScore >= 80
        ? "VERY_POSITIVE"
        : globalScore >= 65
          ? "POSITIVE"
          : globalScore >= 45
            ? "STABLE"
            : globalScore >= 30
              ? "CAUTION"
              : "NEGATIVE",
    predictions: {
      sale:
        salePrediction,
      demand:
        demandPrediction,
      operations:
        operationalPrediction
    },
    generatedAt:
      new Date().toISOString(),
    version:
      "QSM-LUNA-PREDICTIVE-1.0"
  };
}

function getPredictiveCapabilities() {
  return {
    assistant: "LUNA",
    phase: "8",
    capabilities: [
      "SALE_PROBABILITY",
      "EXPECTED_SALE_TIME",
      "DEMAND_FORECAST",
      "SALES_TREND",
      "SEARCH_TREND",
      "OPERATIONAL_RISK_FORECAST",
      "GLOBAL_PREDICTIVE_OUTLOOK"
    ],
    disclaimer:
      "Las predicciones son académicas y se basan únicamente en la información disponible dentro de QSM.",
    version:
      "QSM-LUNA-PREDICTIVE-1.0"
  };
}

/* QSM_FASE8_BLOCK2_REAL_PREDICTIONS */

const PREDICTION_HISTORY_KEY =
  "lunaPredictiveHistory";

function validatePredictiveUserId(userId) {
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

function validatePredictiveProductId(productId) {
  const id = Number(productId);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Se requiere un producto válido."
    );
  }

  return id;
}

function getMonthKey(date) {
  const value = new Date(date);

  if (
    Number.isNaN(
      value.getTime()
    )
  ) {
    return null;
  }

  return (
    `${value.getUTCFullYear()}-` +
    `${String(
      value.getUTCMonth() + 1
    ).padStart(2, "0")}`
  );
}

function buildMonthlySalesHistory(
  orders = [],
  months = 6
) {
  const now = new Date();
  const monthKeys = [];

  for (
    let index = months - 1;
    index >= 0;
    index -= 1
  ) {
    const date = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() - index,
        1
      )
    );

    monthKeys.push(
      getMonthKey(date)
    );
  }

  const counters =
    Object.fromEntries(
      monthKeys.map((key) => [
        key,
        {
          sales: 0,
          revenue: 0
        }
      ])
    );

  orders.forEach((order) => {
    const key =
      getMonthKey(order.createdAt);

    if (!key || !counters[key]) {
      return;
    }

    counters[key].sales += 1;

    counters[key].revenue +=
      Number(
        order.totalAmount || 0
      );
  });

  return monthKeys.map((month) => ({
    month,
    sales:
      counters[month].sales,
    revenue:
      Math.round(
        counters[month].revenue
      )
  }));
}

async function readPredictiveSetting(userId) {
  const numericUserId =
    validatePredictiveUserId(userId);

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

  return {
    numericUserId,
    data
  };
}

async function getRealPredictiveData({
  userId,
  productId
}) {
  const numericUserId =
    validatePredictiveUserId(userId);

  const numericProductId =
    validatePredictiveProductId(
      productId
    );

  const product =
    await prisma.product.findUnique({
      where: {
        id: numericProductId
      },
      include: {
        seller: true
      }
    });

  if (!product) {
    throw new Error(
      "Producto no encontrado."
    );
  }

  if (!product.seller) {
    throw new Error(
      "El producto no tiene vendedor asociado."
    );
  }

  const [
    productScore,
    marketPrice,
    sellerSetting,
    completedOrders
  ] = await Promise.all([
    getSavedProductScore({
      productId:
        numericProductId
    }),

    analyzeProductMarketPrice({
      productId:
        numericProductId
    }),

    prisma.userSetting.findUnique({
      where: {
        userId:
          Number(product.sellerId)
      }
    }),

    prisma.order.findMany({
      where: {
        sellerId:
          Number(product.sellerId),
        status: {
          in: [
            "COMPLETED",
            "DELIVERED"
          ]
        }
      },
      orderBy: {
        createdAt: "asc"
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true
      }
    })
  ]);

  const sellerData =
    sellerSetting?.data &&
    typeof sellerSetting.data ===
      "object" &&
    !Array.isArray(
      sellerSetting.data
    )
      ? sellerSetting.data
      : {};

  const sellerProfile =
    asObject(
      sellerData.lunaSellerProfile
    );

  const buyerProfile =
    asObject(
      (
        await readPredictiveSetting(
          numericUserId
        )
      ).data.lunaBuyerProfile
    );

  const publishedProducts =
    asArray(
      sellerProfile.publishedProducts
    );

  const currentPublishedProduct =
    publishedProducts.find(
      (item) =>
        Number(item.productId) ===
        numericProductId
    ) || {};

  const monthlyHistory =
    buildMonthlySalesHistory(
      completedOrders,
      6
    );

  const operationalHistory =
    await getOperationalHistory({
      userId:
        numericUserId
    });

  return {
    userId:
      numericUserId,

    product: {
      id:
        product.id,
      title:
        product.title,
      price:
        Number(product.price || 0),
      status:
        product.status,
      score:
        Number(
          productScore.score || 0
        ),
      riskScore:
        Number(
          product.aiAnalysis
            ?.riskScore ??
          productScore.factors
            ?.riskScore ??
          0
        ),
      views:
        Number(
          currentPublishedProduct.views ||
          product.aiAnalysis?.views ||
          0
        ),
      favorites:
        Number(
          currentPublishedProduct.favorites ||
          product.aiAnalysis?.favorites ||
          0
        ),
      inquiries:
        Number(
          currentPublishedProduct.inquiries ||
          product.aiAnalysis?.inquiries ||
          0
        )
    },

    seller: {
      id:
        product.seller.id,
      sellerScore:
        Number(
          sellerProfile.reputation
            ?.sellerScore ??
          product.seller.trustScore ??
          50
        ),
      trustScore:
        Number(
          product.seller.trustScore ??
          sellerProfile.reputation
            ?.trustScore ??
          50
        ),
      verified:
        product.seller.isVerified ===
        true,
      completedSales:
        completedOrders.length
    },

    market: {
      averagePrice:
        Number(
          marketPrice.market
            ?.averagePrice || 0
        ),
      medianPrice:
        Number(
          marketPrice.market
            ?.medianPrice || 0
        ),
      classification:
        marketPrice.classification ||
        null
    },

    demand: {
      history:
        monthlyHistory,
      currentActivity: {
        searches:
          Number(
            buyerProfile.totalSearches ||
            0
          ),
        views:
          Number(
            currentPublishedProduct.views ||
            product.aiAnalysis?.views ||
            0
          ),
        favorites:
          Number(
            currentPublishedProduct.favorites ||
            product.aiAnalysis?.favorites ||
            0
          )
      }
    },

    operations: {
      history:
        operationalHistory.history ||
        []
    }
  };
}

async function savePredictiveResult({
  userId,
  prediction
}) {
  const {
    numericUserId,
    data
  } = await readPredictiveSetting(
    userId
  );

  const currentHistory =
    Array.isArray(
      data[PREDICTION_HISTORY_KEY]
    )
      ? data[PREDICTION_HISTORY_KEY]
      : [];

  const entry = {
    id:
      `PRED-${Date.now()}`,
    productId:
      prediction.productId,
    globalScore:
      prediction.globalScore,
    outlook:
      prediction.outlook,
    saleProbability:
      prediction.predictions
        ?.sale
        ?.probability || 0,
    demandScore:
      prediction.predictions
        ?.demand
        ?.demandScore || 0,
    operationalRisk:
      prediction.predictions
        ?.operations
        ?.riskScore || 0,
    generatedAt:
      new Date().toISOString()
  };

  const history = [
    entry,
    ...currentHistory
  ].slice(0, 50);

  await prisma.userSetting.upsert({
    where: {
      userId:
        numericUserId
    },
    update: {
      data: {
        ...data,
        [PREDICTION_HISTORY_KEY]:
          history
      }
    },
    create: {
      userId:
        numericUserId,
      data: {
        ...data,
        [PREDICTION_HISTORY_KEY]:
          history
      }
    }
  });

  return {
    ...prediction,
    predictionId:
      entry.id,
    saved: true
  };
}

async function generateRealPredictiveSummary({
  userId,
  productId
}) {
  const source =
    await getRealPredictiveData({
      userId,
      productId
    });

  const operationalAnalysis =
    await analyzeRealOperations({
      userId:
        source.userId
    });

  const salePrediction =
    predictSaleProbability({
      product:
        source.product,
      seller:
        source.seller,
      market:
        source.market
    });

  const demandPrediction =
    predictDemand({
      history:
        source.demand.history,
      currentActivity:
        source.demand.currentActivity
    });

  const operationalPrediction =
    predictOperationalRisk({
      history:
        source.operations.history,
      current: {
        counters:
          operationalAnalysis.counters
      }
    });

  const globalScore =
    clampScore(
      salePrediction.probability *
        0.4 +
      demandPrediction.demandScore *
        0.35 +
      (
        100 -
        operationalPrediction.riskScore
      ) *
        0.25
    );

  const prediction = {
    assistant: "LUNA",
    phase: "8",
    userId:
      source.userId,
    productId:
      source.product.id,
    productTitle:
      source.product.title,
    globalScore,
    outlook:
      globalScore >= 80
        ? "VERY_POSITIVE"
        : globalScore >= 65
          ? "POSITIVE"
          : globalScore >= 45
            ? "STABLE"
            : globalScore >= 30
              ? "CAUTION"
              : "NEGATIVE",
    predictions: {
      sale:
        salePrediction,
      demand:
        demandPrediction,
      operations:
        operationalPrediction
    },
    source: {
      product:
        source.product,
      seller:
        source.seller,
      market:
        source.market,
      salesHistory:
        source.demand.history,
      operationalHealth: {
        score:
          operationalAnalysis.healthScore,
        status:
          operationalAnalysis.healthStatus
      }
    },
    message:
      salePrediction.probability >= 70
        ? "El producto presenta una probabilidad favorable de venta."
        : salePrediction.probability >= 50
          ? "El producto puede venderse, pero conviene mejorar algunos factores."
          : "La probabilidad de venta es baja y requiere ajustes.",
    generatedAt:
      new Date().toISOString(),
    version:
      "QSM-LUNA-PREDICTIVE-2.0"
  };

  return savePredictiveResult({
    userId:
      source.userId,
    prediction
  });
}

async function getPredictiveHistory({
  userId
}) {
  const {
    data
  } = await readPredictiveSetting(
    userId
  );

  const history =
    Array.isArray(
      data[PREDICTION_HISTORY_KEY]
    )
      ? data[PREDICTION_HISTORY_KEY]
      : [];

  return {
    total:
      history.length,
    history
  };
}

module.exports = {
  calculateTrend,
  predictSaleProbability,
  predictDemand,
  predictOperationalRisk,
  generatePredictiveSummary,
  getPredictiveCapabilities,
  getRealPredictiveData,
  generateRealPredictiveSummary,
  getPredictiveHistory
};
