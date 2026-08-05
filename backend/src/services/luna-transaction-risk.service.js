"use strict";

const prisma = require("../utils/prisma");

/* QSM_FASE5_6_BLOCK1_PREVENTIVE_FRAUD */

function clampScore(value) {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(Number(value || 0))
    )
  );
}

function asObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function containsExternalPaymentRequest(text) {
  const value = normalizeText(text);

  return [
    "whatsapp",
    "transferencia directa",
    "pago por fuera",
    "fuera de la plataforma",
    "depósito directo",
    "western union",
    "crypto",
    "bitcoin",
    "telegram"
  ].some((term) =>
    value.includes(term)
  );
}

function getRiskLevel(score) {
  if (score >= 80) {
    return {
      code: "CRITICAL",
      label: "Riesgo crítico"
    };
  }

  if (score >= 60) {
    return {
      code: "HIGH",
      label: "Riesgo alto"
    };
  }

  if (score >= 35) {
    return {
      code: "MEDIUM",
      label: "Riesgo medio"
    };
  }

  if (score >= 15) {
    return {
      code: "LOW",
      label: "Riesgo bajo"
    };
  }

  return {
    code: "MINIMAL",
    label: "Riesgo mínimo"
  };
}

function analyzeTransactionRisk(payload = {}) {
  const buyer =
    asObject(payload.buyer);

  const seller =
    asObject(payload.seller);

  const product =
    asObject(payload.product);

  const transaction =
    asObject(payload.transaction);

  const messages = Array.isArray(payload.messages)
    ? payload.messages
    : [];

  const reasons = [];
  const recommendations = [];

  let riskScore = 0;

  const amount = Math.max(
    0,
    Number(
      transaction.amount ??
      transaction.total ??
      product.price ??
      0
    )
  );

  const buyerTrustScore =
    clampScore(
      buyer.trustScore ?? 50
    );

  const sellerTrustScore =
    clampScore(
      seller.trustScore ?? 50
    );

  const sellerScore =
    clampScore(
      seller.sellerScore ?? 50
    );

  const productRiskScore =
    clampScore(
      product.riskScore ??
      product.aiAnalysis?.riskScore ??
      0
    );

  const buyerVerified =
    Boolean(
      buyer.isVerified ||
      buyer.verificationStatus === "VERIFIED" ||
      buyer.verificationStatus === "APPROVED"
    );

  const sellerVerified =
    Boolean(
      seller.isVerified ||
      seller.verificationStatus === "VERIFIED" ||
      seller.verificationStatus === "APPROVED"
    );

  const accountAgeDays =
    Math.max(
      0,
      Number(
        buyer.accountAgeDays ??
        transaction.accountAgeDays ??
        0
      )
    );

  const recentOrders =
    Math.max(
      0,
      Number(
        transaction.recentOrders ??
        buyer.recentOrders ??
        0
      )
    );

  const failedPayments =
    Math.max(
      0,
      Number(
        transaction.failedPayments ??
        buyer.failedPayments ??
        0
      )
    );

  const disputes =
    Math.max(
      0,
      Number(
        buyer.disputes ??
        seller.disputes ??
        0
      )
    );

  const externalText = [
    transaction.notes,
    product.description,
    ...messages.map((item) =>
      typeof item === "string"
        ? item
        : item?.content
    )
  ]
    .filter(Boolean)
    .join(" ");

  if (
    containsExternalPaymentRequest(
      externalText
    )
  ) {
    riskScore += 35;

    reasons.push(
      "Se detectó una solicitud de pago o contacto fuera de QSM."
    );

    recommendations.push(
      "Mantén la conversación y el pago dentro de QSM."
    );
  }

  if (productRiskScore >= 70) {
    riskScore += 25;

    reasons.push(
      "La publicación tiene un riesgo elevado."
    );
  } else if (productRiskScore >= 40) {
    riskScore += 12;

    reasons.push(
      "La publicación presenta señales de riesgo moderado."
    );
  }

  if (sellerTrustScore < 35) {
    riskScore += 20;

    reasons.push(
      "El Trust Score del vendedor es bajo."
    );
  } else if (sellerTrustScore < 55) {
    riskScore += 8;

    reasons.push(
      "La confianza del vendedor todavía es limitada."
    );
  }

  if (sellerScore < 35) {
    riskScore += 15;

    reasons.push(
      "La reputación comercial del vendedor es baja."
    );
  }

  if (!sellerVerified) {
    riskScore += 10;

    reasons.push(
      "El vendedor no está verificado."
    );

    recommendations.push(
      "Verifica la identidad y reputación del vendedor antes de pagar."
    );
  }

  if (!buyerVerified && amount >= 50000) {
    riskScore += 8;

    reasons.push(
      "Compra de valor elevado desde una cuenta no verificada."
    );
  }

  if (
    accountAgeDays > 0 &&
    accountAgeDays < 7 &&
    amount >= 30000
  ) {
    riskScore += 15;

    reasons.push(
      "La cuenta es reciente para una compra de alto valor."
    );
  }

  if (recentOrders >= 5) {
    riskScore += 10;

    reasons.push(
      "Se detectó una cantidad inusual de pedidos recientes."
    );
  }

  if (failedPayments >= 2) {
    riskScore += 15;

    reasons.push(
      "Existen varios intentos de pago fallidos."
    );
  }

  if (disputes >= 3) {
    riskScore += 15;

    reasons.push(
      "El usuario tiene varias disputas registradas."
    );
  }

  if (
    buyer.location &&
    transaction.location &&
    normalizeText(buyer.location) !==
      normalizeText(transaction.location)
  ) {
    riskScore += 8;

    reasons.push(
      "La ubicación de la operación no coincide con la habitual."
    );
  }

  if (
    amount >= 100000 &&
    sellerTrustScore < 70
  ) {
    riskScore += 10;

    reasons.push(
      "La operación tiene un monto elevado para el nivel de confianza disponible."
    );
  }

  if (
    buyerTrustScore >= 80 &&
    sellerTrustScore >= 80 &&
    sellerVerified &&
    productRiskScore <= 20
  ) {
    riskScore -= 15;

    reasons.push(
      "Comprador y vendedor tienen buenos indicadores de confianza."
    );
  }

  const finalRiskScore =
    clampScore(riskScore);

  const riskLevel =
    getRiskLevel(finalRiskScore);

  let decision = "ALLOW";

  if (finalRiskScore >= 80) {
    decision = "BLOCK";
  } else if (finalRiskScore >= 60) {
    decision = "MANUAL_REVIEW";
  } else if (finalRiskScore >= 35) {
    decision = "WARN";
  }

  if (decision === "BLOCK") {
    recommendations.push(
      "Bloquear temporalmente la operación y enviarla a revisión."
    );
  }

  if (decision === "MANUAL_REVIEW") {
    recommendations.push(
      "Solicitar revisión manual antes de aprobar el pago."
    );
  }

  if (decision === "WARN") {
    recommendations.push(
      "Mostrar una advertencia de seguridad antes de continuar."
    );
  }

  if (decision === "ALLOW") {
    recommendations.push(
      "La operación puede continuar con las validaciones normales."
    );
  }

  return {
    riskScore:
      finalRiskScore,
    riskLevel,
    decision,
    canContinue:
      decision !== "BLOCK",
    requiresManualReview:
      decision === "MANUAL_REVIEW",
    reasons:
      [...new Set(reasons)].slice(0, 15),
    recommendations:
      [...new Set(recommendations)].slice(0, 10),
    factors: {
      amount,
      buyerTrustScore,
      sellerTrustScore,
      sellerScore,
      productRiskScore,
      buyerVerified,
      sellerVerified,
      accountAgeDays,
      recentOrders,
      failedPayments,
      disputes,
      externalPaymentDetected:
        containsExternalPaymentRequest(
          externalText
        )
    },
    analyzedAt:
      new Date().toISOString(),
    version:
      "QSM-LUNA-FRAUD-PREVENTION-1.0"
  };
}

/* QSM_FASE5_6_BLOCK2_REAL_RISK */

const RISK_HISTORY_KEY =
  "lunaTransactionRiskHistory";

function getAccountAgeDays(createdAt) {
  if (!createdAt) {
    return 0;
  }

  const created =
    new Date(createdAt).getTime();

  if (!Number.isFinite(created)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (Date.now() - created) /
      (24 * 60 * 60 * 1000)
    )
  );
}

async function getUserSettingData(userId) {
  const setting =
    await prisma.userSetting.findUnique({
      where: {
        userId: Number(userId)
      }
    });

  return {
    setting,
    data:
      setting?.data &&
      typeof setting.data === "object" &&
      !Array.isArray(setting.data)
        ? setting.data
        : {}
  };
}

async function saveRiskHistory({
  userId,
  result
}) {
  const numericUserId =
    Number(userId);

  if (
    !Number.isInteger(numericUserId) ||
    numericUserId <= 0
  ) {
    return result;
  }

  const {
    data
  } = await getUserSettingData(
    numericUserId
  );

  const currentHistory =
    Array.isArray(
      data[RISK_HISTORY_KEY]
    )
      ? data[RISK_HISTORY_KEY]
      : [];

  const history = [
    {
      id:
        `RISK-${Date.now()}`,
      ...result
    },
    ...currentHistory
  ].slice(0, 50);

  await prisma.userSetting.upsert({
    where: {
      userId: numericUserId
    },
    update: {
      data: {
        ...data,
        [RISK_HISTORY_KEY]:
          history
      }
    },
    create: {
      userId: numericUserId,
      data: {
        ...data,
        [RISK_HISTORY_KEY]:
          history
      }
    }
  });

  return {
    ...result,
    saved: true
  };
}

async function analyzeRealTransactionRisk({
  buyerId,
  productId,
  transaction = {},
  messages = []
}) {
  const numericBuyerId =
    Number(buyerId);

  const numericProductId =
    Number(productId);

  if (
    !Number.isInteger(numericBuyerId) ||
    numericBuyerId <= 0
  ) {
    throw new Error(
      "Se requiere un comprador válido."
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

  const [
    buyer,
    product
  ] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: numericBuyerId
      }
    }),

    prisma.product.findUnique({
      where: {
        id: numericProductId
      },
      include: {
        seller: true
      }
    })
  ]);

  if (!buyer) {
    throw new Error(
      "Comprador no encontrado."
    );
  }

  if (!product) {
    throw new Error(
      "Producto no encontrado."
    );
  }

  if (!product.seller) {
    throw new Error(
      "El producto no tiene vendedor."
    );
  }

  const [
    buyerSetting,
    sellerSetting
  ] = await Promise.all([
    getUserSettingData(
      buyer.id
    ),
    getUserSettingData(
      product.seller.id
    )
  ]);

  const buyerProfile =
    asObject(
      buyerSetting.data
        .lunaBuyerProfile
    );

  const sellerProfile =
    asObject(
      sellerSetting.data
        .lunaSellerProfile
    );

  const sellerReputation =
    asObject(
      sellerProfile.reputation
    );

  const result =
    analyzeTransactionRisk({
      buyer: {
        id:
          buyer.id,
        trustScore:
          buyer.trustScore ?? 50,
        isVerified:
          buyer.isVerified === true,
        verificationStatus:
          buyer.isVerified
            ? "VERIFIED"
            : "PENDING",
        accountAgeDays:
          getAccountAgeDays(
            buyer.createdAt
          ),
        recentOrders:
          buyerProfile.totalPurchases ??
          0,
        failedPayments:
          transaction.failedPayments ??
          0,
        disputes:
          buyerProfile.disputes ??
          0,
        location:
          transaction.buyerLocation ??
          buyerProfile.location ??
          null
      },

      seller: {
        id:
          product.seller.id,
        trustScore:
          product.seller.trustScore ??
          sellerReputation.trustScore ??
          50,
        sellerScore:
          sellerReputation.sellerScore ??
          50,
        isVerified:
          product.seller.isVerified === true,
        verificationStatus:
          sellerReputation
            .verificationStatus ??
          (
            product.seller.isVerified
              ? "VERIFIED"
              : "PENDING"
          ),
        disputes:
          sellerReputation
            .disputesReceived ??
          0
      },

      product: {
        id:
          product.id,
        title:
          product.title,
        price:
          Number(product.price || 0),
        description:
          product.description || "",
        riskScore:
          product.aiAnalysis
            ?.riskScore ??
          product.aiAnalysis
            ?.recommendationScore
            ?.factors
            ?.riskScore ??
          0,
        aiAnalysis:
          product.aiAnalysis || {}
      },

      transaction: {
        ...transaction,
        amount:
          transaction.amount ??
          transaction.total ??
          product.price,
        location:
          transaction.location ??
          transaction.buyerLocation ??
          null
      },

      messages
    });

  const completeResult = {
    buyerId:
      buyer.id,
    productId:
      product.id,
    sellerId:
      product.seller.id,
    productTitle:
      product.title,
    amount:
      Number(
        transaction.amount ??
        transaction.total ??
        product.price ??
        0
      ),
    ...result
  };

  return saveRiskHistory({
    userId:
      buyer.id,
    result:
      completeResult
  });
}

async function getTransactionRiskHistory({
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
  } = await getUserSettingData(
    numericUserId
  );

  const history =
    Array.isArray(
      data[RISK_HISTORY_KEY]
    )
      ? data[RISK_HISTORY_KEY]
      : [];

  return {
    total:
      history.length,
    history
  };
}

module.exports = {
  analyzeTransactionRisk,
  analyzeRealTransactionRisk,
  getTransactionRiskHistory
};
