"use strict";

/* QSM_FASE5_8_BLOCK1_PURCHASE_ASSISTANT */

const prisma = require("../utils/prisma");

const {
  getSavedProductScore
} = require("./luna-product-score.service");

const {
  analyzeProductMarketPrice
} = require("./luna-market-price.service");

const {
  compareProductAlternatives
} = require("./luna-product-score.service");

const {
  analyzeRealTransactionRisk
} = require("./luna-transaction-risk.service");

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

function getDecision(score, blockers = []) {
  if (blockers.length > 0) {
    return {
      code: "AVOID",
      label: "Evitar por ahora"
    };
  }

  if (score >= 85) {
    return {
      code: "BUY",
      label: "Buena opción de compra"
    };
  }

  if (score >= 70) {
    return {
      code: "COMPARE",
      label: "Comparar antes de comprar"
    };
  }

  if (score >= 50) {
    return {
      code: "REVIEW",
      label: "Revisar cuidadosamente"
    };
  }

  return {
    code: "AVOID",
    label: "No recomendado"
  };
}

async function getSellerProfile(userId) {
  const numericUserId =
    Number(userId);

  if (
    !Number.isInteger(numericUserId) ||
    numericUserId <= 0
  ) {
    return {};
  }

  const setting =
    await prisma.userSetting.findUnique({
      where: {
        userId: numericUserId
      }
    });

  const data =
    asObject(setting?.data);

  return asObject(
    data.lunaSellerProfile
  );
}

async function analyzePurchaseDecision({
  userId,
  productId
}) {
  const numericUserId =
    Number(userId);

  const numericProductId =
    Number(productId);

  if (
    !Number.isInteger(numericUserId) ||
    numericUserId <= 0
  ) {
    throw new Error(
      "Se requiere un comprador autenticado."
    );
  }

  if (
    !Number.isInteger(numericProductId) ||
    numericProductId <= 0
  ) {
    throw new Error(
      "Se requiere un producto válido."
    );
  }

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
    sellerProfile
  ] = await Promise.all([
    getSavedProductScore({
      productId: product.id
    }),

    analyzeProductMarketPrice({
      productId: product.id
    }),

    getSellerProfile(
      product.sellerId
    )
  ]);

  const reputation =
    asObject(
      sellerProfile.reputation
    );

  const responseMetrics =
    asObject(
      sellerProfile.responseMetrics
    );

  const reasons = [];
  const warnings = [];
  const blockers = [];

  let finalScore =
    Number(productScore.score || 0);

  const sellerScore =
    clampScore(
      reputation.sellerScore ??
      product.seller.trustScore ??
      50
    );

  const sellerTrustScore =
    clampScore(
      product.seller.trustScore ??
      reputation.trustScore ??
      50
    );

  const verificationStatus =
    String(
      reputation.verificationStatus ??
      (
        product.seller.isVerified
          ? "VERIFIED"
          : "PENDING"
      )
    ).toUpperCase();

  const sellerVerified =
    verificationStatus === "VERIFIED" ||
    verificationStatus === "APPROVED";

  const disputes =
    Math.max(
      0,
      Number(
        reputation.disputesReceived || 0
      )
    );

  const warningsReceived =
    Math.max(
      0,
      Number(
        reputation.warningsReceived || 0
      )
    );

  const responseMinutes =
    Math.max(
      0,
      Number(
        responseMetrics
          .averageResponseMinutes || 0
      )
    );

  if (sellerVerified) {
    finalScore += 5;
    reasons.push(
      "El vendedor está verificado."
    );
  } else {
    finalScore -= 8;
    warnings.push(
      "El vendedor todavía no está verificado."
    );
  }

  if (sellerTrustScore >= 80) {
    finalScore += 5;
    reasons.push(
      "El vendedor tiene un Trust Score alto."
    );
  } else if (sellerTrustScore < 40) {
    finalScore -= 15;
    warnings.push(
      "El Trust Score del vendedor es bajo."
    );
  }

  if (sellerScore >= 80) {
    finalScore += 5;
    reasons.push(
      "La reputación comercial del vendedor es buena."
    );
  } else if (sellerScore < 40) {
    finalScore -= 12;
    warnings.push(
      "La reputación comercial del vendedor es baja."
    );
  }

  if (
    responseMinutes > 0 &&
    responseMinutes <= 60
  ) {
    finalScore += 3;
    reasons.push(
      "El vendedor suele responder rápidamente."
    );
  } else if (responseMinutes > 240) {
    finalScore -= 5;
    warnings.push(
      "El vendedor suele tardar en responder."
    );
  }

  if (disputes > 0) {
    finalScore -= disputes * 4;

    warnings.push(
      `El vendedor tiene ${disputes} disputa(s) registrada(s).`
    );
  }

  if (warningsReceived > 0) {
    finalScore -= warningsReceived * 3;

    warnings.push(
      `El vendedor tiene ${warningsReceived} advertencia(s).`
    );
  }

  const priceCode =
    marketPrice.classification?.code ||
    "INSUFFICIENT_DATA";

  if (
    priceCode === "GREAT_DEAL" ||
    priceCode === "GOOD_PRICE"
  ) {
    finalScore += 8;
    reasons.push(
      "El precio parece competitivo."
    );
  } else if (priceCode === "FAIR_PRICE") {
    finalScore += 4;
    reasons.push(
      "El precio está dentro del rango esperado."
    );
  } else if (priceCode === "EXPENSIVE") {
    finalScore -= 10;
    warnings.push(
      "El producto parece costoso frente al mercado."
    );
  }

  const riskScore =
    clampScore(
      product.aiAnalysis?.riskScore ??
      productScore.factors?.riskScore ??
      0
    );

  if (riskScore >= 80) {
    blockers.push(
      "Riesgo de fraude crítico."
    );
  } else if (riskScore >= 60) {
    finalScore -= 25;
    warnings.push(
      "La publicación tiene un riesgo elevado."
    );
  } else if (riskScore <= 20) {
    finalScore += 5;
    reasons.push(
      "La publicación tiene riesgo bajo."
    );
  }

  if (
    String(product.status || "")
      .toUpperCase() !== "ACTIVE"
  ) {
    blockers.push(
      "La publicación no está activa."
    );
  }

  const description =
    String(
      product.description || ""
    ).toLowerCase();

  if (
    description.includes("whatsapp") ||
    description.includes(
      "fuera de la plataforma"
    ) ||
    description.includes(
      "transferencia directa"
    )
  ) {
    blockers.push(
      "La publicación solicita contacto o pago fuera de QSM."
    );
  }

  const purchaseScore =
    clampScore(finalScore);

  const decision =
    getDecision(
      purchaseScore,
      blockers
    );

  const actions = [];

  if (decision.code === "BUY") {
    actions.push(
      "CONTINUE_CHECKOUT"
    );
  }

  if (
    decision.code === "COMPARE" ||
    decision.code === "REVIEW"
  ) {
    actions.push(
      "COMPARE_PRODUCTS",
      "CHECK_SELLER_PROFILE"
    );
  }

  if (decision.code === "AVOID") {
    actions.push(
      "SHOW_ALTERNATIVES",
      "REPORT_PRODUCT"
    );
  }

  return {
    buyerId:
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
      sellerId:
        product.sellerId
    },
    purchaseScore,
    decision,
    canContinue:
      decision.code !== "AVOID",
    reasons:
      [...new Set(reasons)].slice(0, 12),
    warnings:
      [...new Set(warnings)].slice(0, 12),
    blockers:
      [...new Set(blockers)],
    actions:
      [...new Set(actions)],
    analysis: {
      productScore:
        productScore.score,
      productClassification:
        productScore.classificationLabel,
      marketPrice:
        marketPrice.classification,
      marketMedianPrice:
        marketPrice.market?.medianPrice || 0,
      sellerScore,
      sellerTrustScore,
      sellerVerified,
      responseMinutes,
      disputes,
      warningsReceived,
      riskScore
    },
    message:
      decision.code === "BUY"
        ? "Este producto parece una buena opción de compra."
        : decision.code === "COMPARE"
          ? "El producto puede convenirte, pero compara otras opciones antes de decidir."
          : decision.code === "REVIEW"
            ? "Debes revisar cuidadosamente el precio, el vendedor y las condiciones."
            : "No recomiendo continuar con esta compra por ahora.",
    analyzedAt:
      new Date().toISOString(),
    version:
      "QSM-LUNA-PURCHASE-ASSISTANT-1.0"
  };
}

/* QSM_FASE5_8_BLOCK2_REAL_PURCHASE_DECISION */

const PURCHASE_HISTORY_KEY =
  "lunaPurchaseDecisionHistory";

async function readPurchaseSetting(userId) {
  const numericUserId =
    Number(userId);

  const setting =
    await prisma.userSetting.findUnique({
      where: {
        userId: numericUserId
      }
    });

  return {
    numericUserId,
    data:
      setting?.data &&
      typeof setting.data === "object" &&
      !Array.isArray(setting.data)
        ? setting.data
        : {}
  };
}

async function savePurchaseDecision({
  userId,
  decision
}) {
  const {
    numericUserId,
    data
  } = await readPurchaseSetting(
    userId
  );

  const currentHistory =
    Array.isArray(
      data[PURCHASE_HISTORY_KEY]
    )
      ? data[PURCHASE_HISTORY_KEY]
      : [];

  const savedDecision = {
    id:
      `PURCHASE-${Date.now()}`,
    ...decision,
    savedAt:
      new Date().toISOString()
  };

  const history = [
    savedDecision,
    ...currentHistory
  ].slice(0, 50);

  await prisma.userSetting.upsert({
    where: {
      userId: numericUserId
    },
    update: {
      data: {
        ...data,
        [PURCHASE_HISTORY_KEY]:
          history
      }
    },
    create: {
      userId: numericUserId,
      data: {
        ...data,
        [PURCHASE_HISTORY_KEY]:
          history
      }
    }
  });

  return savedDecision;
}

function mergePurchaseDecision({
  purchaseAnalysis,
  transactionRisk,
  comparison
}) {
  const reasons = [
    ...(purchaseAnalysis.reasons || [])
  ];

  const warnings = [
    ...(purchaseAnalysis.warnings || [])
  ];

  const blockers = [
    ...(purchaseAnalysis.blockers || [])
  ];

  let purchaseScore =
    Number(
      purchaseAnalysis.purchaseScore || 0
    );

  if (
    transactionRisk.decision === "BLOCK"
  ) {
    purchaseScore = Math.min(
      purchaseScore,
      20
    );

    blockers.push(
      "El análisis antifraude bloqueó la operación."
    );
  }
  else if (
    transactionRisk.decision ===
    "MANUAL_REVIEW"
  ) {
    purchaseScore -= 25;

    warnings.push(
      "La operación requiere revisión manual."
    );
  }
  else if (
    transactionRisk.decision === "WARN"
  ) {
    purchaseScore -= 12;

    warnings.push(
      "El análisis antifraude detectó señales de precaución."
    );
  }
  else {
    purchaseScore += 5;

    reasons.push(
      "La operación superó el control antifraude."
    );
  }

  const alternatives =
    Array.isArray(
      comparison.alternatives
    )
      ? comparison.alternatives
      : [];

  const betterAlternatives =
    alternatives.filter(
      (item) =>
        Number(item.score || 0) >
          purchaseScore ||
        (
          Number(
            item.priceAdvantage
              ?.percentage || 0
          ) >= 10 &&
          Number(item.score || 0) >=
            purchaseScore - 5
        )
    );

  if (betterAlternatives.length > 0) {
    purchaseScore -= 5;

    warnings.push(
      `LUNA encontró ${betterAlternatives.length} alternativa(s) posiblemente mejores.`
    );
  }

  purchaseScore =
    clampScore(purchaseScore);

  const decision =
    getDecision(
      purchaseScore,
      blockers
    );

  const actions = [];

  if (
    transactionRisk.decision === "BLOCK"
  ) {
    actions.push(
      "BLOCK_CHECKOUT",
      "REPORT_PRODUCT"
    );
  }
  else if (
    transactionRisk.decision ===
    "MANUAL_REVIEW"
  ) {
    actions.push(
      "SEND_TO_MANUAL_REVIEW"
    );
  }
  else if (
    decision.code === "BUY"
  ) {
    actions.push(
      "CONTINUE_CHECKOUT"
    );
  }
  else if (
    decision.code === "COMPARE" ||
    betterAlternatives.length > 0
  ) {
    actions.push(
      "SHOW_ALTERNATIVES",
      "COMPARE_PRODUCTS"
    );
  }
  else if (
    decision.code === "REVIEW"
  ) {
    actions.push(
      "CHECK_SELLER_PROFILE",
      "REVIEW_PRODUCT"
    );
  }
  else {
    actions.push(
      "AVOID_PRODUCT",
      "SHOW_ALTERNATIVES"
    );
  }

  return {
    ...purchaseAnalysis,
    purchaseScore,
    decision,
    canContinue:
      decision.code !== "AVOID" &&
      transactionRisk.decision !==
        "BLOCK",
    requiresManualReview:
      transactionRisk.decision ===
      "MANUAL_REVIEW",
    reasons:
      [...new Set(reasons)].slice(0, 15),
    warnings:
      [...new Set(warnings)].slice(0, 15),
    blockers:
      [...new Set(blockers)],
    actions:
      [...new Set(actions)],
    transactionRisk: {
      riskScore:
        transactionRisk.riskScore,
      riskLevel:
        transactionRisk.riskLevel,
      decision:
        transactionRisk.decision,
      reasons:
        transactionRisk.reasons || []
    },
    comparison: {
      alternatives:
        alternatives.slice(0, 5),
      betterAlternatives:
        betterAlternatives.length,
      recommendation:
        comparison.recommendation
    },
    message:
      transactionRisk.decision === "BLOCK"
        ? "No recomiendo continuar. La operación fue bloqueada por seguridad."
        : transactionRisk.decision ===
            "MANUAL_REVIEW"
          ? "La compra necesita revisión manual antes de continuar."
          : decision.code === "BUY"
            ? "La compra parece conveniente y superó las validaciones disponibles."
            : betterAlternatives.length > 0
              ? "Encontré otras opciones que podrían ofrecerte mejor valor."
              : decision.code === "COMPARE"
                ? "Compara este producto con otras opciones antes de comprar."
                : decision.code === "REVIEW"
                  ? "Revisa cuidadosamente el producto y el vendedor."
                  : "No recomiendo continuar con esta compra por ahora.",
    analyzedAt:
      new Date().toISOString(),
    version:
      "QSM-LUNA-PURCHASE-ASSISTANT-2.0"
  };
}

async function analyzeRealPurchaseDecision({
  userId,
  productId,
  transaction = {},
  messages = []
}) {
  const numericUserId =
    Number(userId);

  const numericProductId =
    Number(productId);

  if (
    !Number.isInteger(numericUserId) ||
    numericUserId <= 0
  ) {
    throw new Error(
      "Se requiere un comprador autenticado."
    );
  }

  if (
    !Number.isInteger(numericProductId) ||
    numericProductId <= 0
  ) {
    throw new Error(
      "Se requiere un producto válido."
    );
  }

  const purchaseAnalysis =
    await analyzePurchaseDecision({
      userId:
        numericUserId,
      productId:
        numericProductId
    });

  const [
    transactionRisk,
    comparison
  ] = await Promise.all([
    analyzeRealTransactionRisk({
      buyerId:
        numericUserId,
      productId:
        numericProductId,
      transaction,
      messages
    }),

    compareProductAlternatives({
      productId:
        numericProductId,
      userId:
        numericUserId,
      limit: 5
    })
  ]);

  const finalDecision =
    mergePurchaseDecision({
      purchaseAnalysis,
      transactionRisk,
      comparison
    });

  const saved =
    await savePurchaseDecision({
      userId:
        numericUserId,
      decision:
        finalDecision
    });

  return {
    ...finalDecision,
    decisionId:
      saved.id,
    saved: true
  };
}

async function getPurchaseDecisionHistory({
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

  const {
    data
  } = await readPurchaseSetting(
    numericUserId
  );

  const history =
    Array.isArray(
      data[PURCHASE_HISTORY_KEY]
    )
      ? data[PURCHASE_HISTORY_KEY]
      : [];

  return {
    total:
      history.length,
    history
  };
}

module.exports = {
  analyzePurchaseDecision,
  analyzeRealPurchaseDecision,
  getPurchaseDecisionHistory
};
