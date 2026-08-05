"use strict";

/* QSM_FASE5_2_1_SELLER_PROFILE */

const prisma = require("../utils/prisma");

const PROFILE_KEY = "lunaSellerProfile";

function createDefaultSellerProfile(userId) {
  const now = new Date().toISOString();

  return {
    userId: Number(userId),

    dominantCategories: [],
    dominantBrands: [],

    publishedProducts: [],
    completedSales: [],

    performance: {
      totalPublications: 0,
      activePublications: 0,
      hiddenPublications: 0,
      soldProducts: 0,
      cancelledSales: 0,
      conversionRate: 0
    },

    responseMetrics: {
      totalResponses: 0,
      averageResponseMinutes: 0,
      fastestResponseMinutes: 0,
      slowestResponseMinutes: 0
    },

    reputation: {
      trustScore: 0,
      sellerScore: 0,
      positiveReviews: 0,
      negativeReviews: 0,
      disputesReceived: 0,
      warningsReceived: 0,
      verificationStatus: "PENDING"
    },

    commercialProfile: {
      experienceLevel: "NEW",
      sellerType: "OCCASIONAL",
      averageProductPrice: 0,
      minimumProductPrice: 0,
      maximumProductPrice: 0
    },

    recommendations: [],

    lastActivityAt: null,
    createdAt: now,
    updatedAt: now
  };
}

async function readUserSetting(userId) {
  const numericUserId = Number(userId);

  if (
    !Number.isInteger(numericUserId) ||
    numericUserId <= 0
  ) {
    throw new Error(
      "Se requiere un vendedor válido."
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

  return {
    numericUserId,
    data
  };
}

async function saveSellerProfile({
  numericUserId,
  data,
  profile
}) {
  await prisma.userSetting.upsert({
    where: {
      userId: numericUserId
    },
    update: {
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    },
    create: {
      userId: numericUserId,
      data: {
        ...data,
        [PROFILE_KEY]: profile
      }
    }
  });

  return profile;
}

async function getSellerProfile({
  userId
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const existing =
    data[PROFILE_KEY] &&
    typeof data[PROFILE_KEY] === "object" &&
    !Array.isArray(data[PROFILE_KEY])
      ? data[PROFILE_KEY]
      : null;

  if (existing) {
    return existing;
  }

  const profile =
    createDefaultSellerProfile(
      numericUserId
    );

  return saveSellerProfile({
    numericUserId,
    data,
    profile
  });
}

async function resetSellerProfile({
  userId
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const profile =
    createDefaultSellerProfile(
      numericUserId
    );

  return saveSellerProfile({
    numericUserId,
    data,
    profile
  });
}

/* QSM_FASE5_2_2_PUBLICATIONS */

function normalizePublishedProduct(product = {}) {
  const productId = Number(
    product.id ||
    product.productId ||
    0
  );

  return {
    productId:
      Number.isInteger(productId) &&
      productId > 0
        ? productId
        : null,
    title: String(product.title || "")
      .trim()
      .slice(0, 180),
    category: String(product.category || "")
      .trim()
      .slice(0, 100),
    brand: String(product.brand || "")
      .trim()
      .slice(0, 100),
    price: Math.max(
      0,
      Number(product.price || 0)
    ),
    status: String(
      product.status || "ACTIVE"
    )
      .trim()
      .toUpperCase()
      .slice(0, 60),
    riskScore: Math.max(
      0,
      Math.min(
        100,
        Number(
          product.aiAnalysis?.riskScore ??
          product.riskScore ??
          0
        )
      )
    ),
    publishedAt:
      product.publishedAt ||
      product.createdAt ||
      new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

async function recordPublishedProduct({
  userId,
  product
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const existing =
    data[PROFILE_KEY] &&
    typeof data[PROFILE_KEY] === "object" &&
    !Array.isArray(data[PROFILE_KEY])
      ? data[PROFILE_KEY]
      : createDefaultSellerProfile(
          numericUserId
        );

  const normalized =
    normalizePublishedProduct(product);

  if (
    !normalized.productId &&
    !normalized.title
  ) {
    throw new Error(
      "La publicación no contiene información válida."
    );
  }

  const currentProducts =
    Array.isArray(existing.publishedProducts)
      ? existing.publishedProducts
      : [];

  const withoutDuplicate =
    currentProducts.filter((item) => {
      if (
        normalized.productId &&
        Number(item.productId) ===
          normalized.productId
      ) {
        return false;
      }

      return String(item.title || "")
        .trim()
        .toLowerCase() !==
        normalized.title.toLowerCase();
    });

  const publishedProducts = [
    normalized,
    ...withoutDuplicate
  ].slice(0, 150);

  const activePublications =
    publishedProducts.filter(
      (item) =>
        String(item.status).toUpperCase() ===
        "ACTIVE"
    ).length;

  const hiddenPublications =
    publishedProducts.filter(
      (item) =>
        String(item.status).toUpperCase() ===
        "HIDDEN"
    ).length;

  const prices =
    publishedProducts
      .map((item) => Number(item.price || 0))
      .filter((price) => price > 0);

  const now = new Date().toISOString();

  const profile = {
    ...existing,
    publishedProducts,
    performance: {
      ...existing.performance,
      totalPublications:
        publishedProducts.length,
      activePublications,
      hiddenPublications
    },
    commercialProfile: {
      ...existing.commercialProfile,
      averageProductPrice:
        prices.length > 0
          ? Math.round(
              prices.reduce(
                (sum, price) => sum + price,
                0
              ) / prices.length
            )
          : 0,
      minimumProductPrice:
        prices.length > 0
          ? Math.min(...prices)
          : 0,
      maximumProductPrice:
        prices.length > 0
          ? Math.max(...prices)
          : 0
    },
    lastActivityAt: now,
    updatedAt: now
  };

  await saveSellerProfile({
    numericUserId,
    data,
    profile
  });

  return {
    product: normalized,
    profile
  };
}

/* QSM_FASE5_2_3_COMPLETED_SALES */

function normalizeCompletedSale(sale = {}) {
  const product =
    sale.product &&
    typeof sale.product === "object"
      ? sale.product
      : sale;

  const orderId = Number(
    sale.orderId ||
    sale.id ||
    0
  );

  const productId = Number(
    sale.productId ||
    product.productId ||
    product.id ||
    0
  );

  return {
    orderId:
      Number.isInteger(orderId) && orderId > 0
        ? orderId
        : null,
    productId:
      Number.isInteger(productId) && productId > 0
        ? productId
        : null,
    buyerId:
      Number(sale.buyerId || 0) || null,
    title: String(product.title || "")
      .trim()
      .slice(0, 180),
    category: String(product.category || "")
      .trim()
      .slice(0, 100),
    brand: String(product.brand || "")
      .trim()
      .slice(0, 100),
    amount: Math.max(
      0,
      Number(
        sale.total ||
        sale.amount ||
        product.price ||
        0
      )
    ),
    quantity: Math.max(
      1,
      Number(sale.quantity || 1)
    ),
    status: String(
      sale.status || "COMPLETED"
    )
      .trim()
      .toUpperCase()
      .slice(0, 60),
    completedAt:
      sale.completedAt ||
      sale.deliveredAt ||
      new Date().toISOString()
  };
}

async function recordCompletedSale({
  userId,
  sale
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const existing =
    data[PROFILE_KEY] &&
    typeof data[PROFILE_KEY] === "object" &&
    !Array.isArray(data[PROFILE_KEY])
      ? data[PROFILE_KEY]
      : createDefaultSellerProfile(
          numericUserId
        );

  const normalized =
    normalizeCompletedSale(sale);

  if (
    !normalized.orderId &&
    !normalized.productId &&
    !normalized.title
  ) {
    throw new Error(
      "La venta no contiene información válida."
    );
  }

  const currentSales =
    Array.isArray(existing.completedSales)
      ? existing.completedSales
      : [];

  const withoutDuplicate =
    currentSales.filter((item) => {
      if (
        normalized.orderId &&
        Number(item.orderId) === normalized.orderId
      ) {
        return false;
      }

      return true;
    });

  const completedSales = [
    normalized,
    ...withoutDuplicate
  ].slice(0, 150);

  const soldProducts =
    completedSales.filter(
      (item) =>
        String(item.status).toUpperCase() ===
        "COMPLETED"
    ).length;

  const cancelledSales =
    completedSales.filter(
      (item) =>
        String(item.status).toUpperCase() ===
        "CANCELLED"
    ).length;

  const totalPublications =
    Number(
      existing.performance?.totalPublications || 0
    );

  const conversionRate =
    totalPublications > 0
      ? Math.round(
          (soldProducts / totalPublications) * 100
        )
      : 0;

  const now = new Date().toISOString();

  const profile = {
    ...existing,
    completedSales,
    performance: {
      ...existing.performance,
      soldProducts,
      cancelledSales,
      conversionRate
    },
    lastActivityAt: now,
    updatedAt: now
  };

  await saveSellerProfile({
    numericUserId,
    data,
    profile
  });

  return {
    sale: normalized,
    profile
  };
}

/* QSM_FASE5_2_4_RESPONSE_TIME */

function normalizeResponseMetric(metric = {}) {
  const responseMinutes = Math.max(
    0,
    Number(
      metric.responseMinutes ||
      metric.minutes ||
      0
    )
  );

  return {
    conversationId: String(
      metric.conversationId ||
      metric.messageId ||
      ""
    )
      .trim()
      .slice(0, 120),
    responseMinutes,
    channel: String(
      metric.channel || "MESSAGES"
    )
      .trim()
      .toUpperCase()
      .slice(0, 60),
    respondedAt:
      metric.respondedAt ||
      new Date().toISOString()
  };
}

async function recordSellerResponse({
  userId,
  metric
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const existing =
    data[PROFILE_KEY] &&
    typeof data[PROFILE_KEY] === "object" &&
    !Array.isArray(data[PROFILE_KEY])
      ? data[PROFILE_KEY]
      : createDefaultSellerProfile(
          numericUserId
        );

  const normalized =
    normalizeResponseMetric(metric);

  if (
    !Number.isFinite(
      normalized.responseMinutes
    )
  ) {
    throw new Error(
      "El tiempo de respuesta no es válido."
    );
  }

  const previousTotal =
    Number(
      existing.responseMetrics?.totalResponses || 0
    );

  const previousAverage =
    Number(
      existing.responseMetrics
        ?.averageResponseMinutes || 0
    );

  const totalResponses =
    previousTotal + 1;

  const averageResponseMinutes =
    Math.round(
      (
        previousAverage * previousTotal +
        normalized.responseMinutes
      ) / totalResponses
    );

  const previousFastest =
    Number(
      existing.responseMetrics
        ?.fastestResponseMinutes || 0
    );

  const previousSlowest =
    Number(
      existing.responseMetrics
        ?.slowestResponseMinutes || 0
    );

  const fastestResponseMinutes =
    previousTotal === 0
      ? normalized.responseMinutes
      : Math.min(
          previousFastest,
          normalized.responseMinutes
        );

  const slowestResponseMinutes =
    previousTotal === 0
      ? normalized.responseMinutes
      : Math.max(
          previousSlowest,
          normalized.responseMinutes
        );

  const now = new Date().toISOString();

  const profile = {
    ...existing,
    responseMetrics: {
      totalResponses,
      averageResponseMinutes,
      fastestResponseMinutes,
      slowestResponseMinutes,
      lastResponseAt:
        normalized.respondedAt
    },
    lastActivityAt: now,
    updatedAt: now
  };

  await saveSellerProfile({
    numericUserId,
    data,
    profile
  });

  return {
    metric: normalized,
    profile
  };
}

/* QSM_FASE5_2_5_SELLER_REPUTATION */

function clampScore(value) {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(Number(value || 0))
    )
  );
}

async function calculateSellerReputation({
  userId,
  metrics = {}
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const existing =
    data[PROFILE_KEY] &&
    typeof data[PROFILE_KEY] === "object" &&
    !Array.isArray(data[PROFILE_KEY])
      ? data[PROFILE_KEY]
      : createDefaultSellerProfile(
          numericUserId
        );

  const positiveReviews = Math.max(
    0,
    Number(
      metrics.positiveReviews ??
      existing.reputation?.positiveReviews ??
      0
    )
  );

  const negativeReviews = Math.max(
    0,
    Number(
      metrics.negativeReviews ??
      existing.reputation?.negativeReviews ??
      0
    )
  );

  const disputesReceived = Math.max(
    0,
    Number(
      metrics.disputesReceived ??
      existing.reputation?.disputesReceived ??
      0
    )
  );

  const warningsReceived = Math.max(
    0,
    Number(
      metrics.warningsReceived ??
      existing.reputation?.warningsReceived ??
      0
    )
  );

  const trustScore = clampScore(
    metrics.trustScore ??
    existing.reputation?.trustScore ??
    50
  );

  const verificationStatus = String(
    metrics.verificationStatus ??
    existing.reputation?.verificationStatus ??
    "PENDING"
  )
    .trim()
    .toUpperCase()
    .slice(0, 60);

  const soldProducts = Number(
    existing.performance?.soldProducts || 0
  );

  const cancelledSales = Number(
    existing.performance?.cancelledSales || 0
  );

  const conversionRate = Number(
    existing.performance?.conversionRate || 0
  );

  const averageResponseMinutes = Number(
    existing.responseMetrics
      ?.averageResponseMinutes || 0
  );

  const totalReviews =
    positiveReviews + negativeReviews;

  const reviewScore =
    totalReviews > 0
      ? (positiveReviews / totalReviews) * 100
      : 50;

  const responseScore =
    averageResponseMinutes <= 0
      ? 50
      : averageResponseMinutes <= 15
        ? 100
        : averageResponseMinutes <= 60
          ? 85
          : averageResponseMinutes <= 240
            ? 65
            : 40;

  const verificationScore =
    verificationStatus === "APPROVED" ||
    verificationStatus === "VERIFIED"
      ? 100
      : verificationStatus === "PENDING"
        ? 50
        : 20;

  const penalty =
    disputesReceived * 6 +
    warningsReceived * 5 +
    cancelledSales * 3;

  const sellerScore = clampScore(
    trustScore * 0.3 +
    reviewScore * 0.25 +
    conversionRate * 0.2 +
    responseScore * 0.15 +
    verificationScore * 0.1 -
    penalty
  );

  let experienceLevel = "NEW";

  if (soldProducts >= 50) {
    experienceLevel = "EXPERT";
  } else if (soldProducts >= 10) {
    experienceLevel = "FREQUENT";
  } else if (soldProducts >= 1) {
    experienceLevel = "ACTIVE";
  }

  let sellerType = "OCCASIONAL";

  if (soldProducts >= 50) {
    sellerType = "PROFESSIONAL";
  } else if (soldProducts >= 10) {
    sellerType = "REGULAR";
  }

  const now = new Date().toISOString();

  const profile = {
    ...existing,
    reputation: {
      trustScore,
      sellerScore,
      positiveReviews,
      negativeReviews,
      disputesReceived,
      warningsReceived,
      verificationStatus
    },
    commercialProfile: {
      ...existing.commercialProfile,
      experienceLevel,
      sellerType
    },
    lastActivityAt: now,
    updatedAt: now
  };

  await saveSellerProfile({
    numericUserId,
    data,
    profile
  });

  return profile;
}

/* QSM_FASE5_2_6_DOMINANT_CATEGORIES */

function countSellerValues(values = []) {
  const counts = new Map();

  values
    .map((value) =>
      String(value || "").trim()
    )
    .filter(Boolean)
    .forEach((value) => {
      const key = value.toUpperCase();

      counts.set(
        key,
        Number(counts.get(key) || 0) + 1
      );
    });

  return [...counts.entries()]
    .map(([name, count]) => ({
      name,
      count
    }))
    .sort((a, b) => b.count - a.count);
}

function calculateSellerPercentages(items = []) {
  const total =
    items.reduce(
      (sum, item) => sum + item.count,
      0
    );

  if (!total) {
    return [];
  }

  return items
    .slice(0, 10)
    .map((item) => ({
      name: item.name,
      count: item.count,
      percentage: Math.round(
        (item.count / total) * 100
      )
    }));
}

async function calculateSellerSpecialties({
  userId
}) {
  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  const existing =
    data[PROFILE_KEY] &&
    typeof data[PROFILE_KEY] === "object" &&
    !Array.isArray(data[PROFILE_KEY])
      ? data[PROFILE_KEY]
      : createDefaultSellerProfile(
          numericUserId
        );

  const publications =
    Array.isArray(existing.publishedProducts)
      ? existing.publishedProducts
      : [];

  const sales =
    Array.isArray(existing.completedSales)
      ? existing.completedSales
      : [];

  const categories = [
    ...publications.map(
      (item) => item.category
    ),
    ...sales.map(
      (item) => item.category
    )
  ];

  const brands = [
    ...publications.map(
      (item) => item.brand
    ),
    ...sales.map(
      (item) => item.brand
    )
  ];

  const dominantCategories =
    calculateSellerPercentages(
      countSellerValues(categories)
    );

  const dominantBrands =
    calculateSellerPercentages(
      countSellerValues(brands)
    );

  const now = new Date().toISOString();

  const profile = {
    ...existing,
    dominantCategories,
    dominantBrands,
    lastActivityAt: now,
    updatedAt: now
  };

  await saveSellerProfile({
    numericUserId,
    data,
    profile
  });

  return profile;
}

/* QSM_FASE5_2_7_SELLER_RECOMMENDATIONS */

async function generateSellerRecommendations({
  userId
}) {
  let profile =
    await calculateSellerSpecialties({
      userId
    });

  profile =
    await calculateSellerReputation({
      userId,
      metrics: profile.reputation || {}
    });

  const recommendations = [];

  const performance =
    profile.performance || {};

  const reputation =
    profile.reputation || {};

  const responseMetrics =
    profile.responseMetrics || {};

  const commercialProfile =
    profile.commercialProfile || {};

  const activePublications =
    Number(
      performance.activePublications || 0
    );

  const hiddenPublications =
    Number(
      performance.hiddenPublications || 0
    );

  const conversionRate =
    Number(
      performance.conversionRate || 0
    );

  const soldProducts =
    Number(
      performance.soldProducts || 0
    );

  const averageResponseMinutes =
    Number(
      responseMetrics.averageResponseMinutes || 0
    );

  const sellerScore =
    Number(
      reputation.sellerScore || 0
    );

  const warningsReceived =
    Number(
      reputation.warningsReceived || 0
    );

  const disputesReceived =
    Number(
      reputation.disputesReceived || 0
    );

  if (activePublications === 0) {
    recommendations.push({
      code: "CREATE_PUBLICATION",
      priority: "HIGH",
      area: "PUBLICATIONS",
      message:
        "Publica al menos un producto activo para comenzar a recibir compradores."
    });
  }

  if (hiddenPublications > 0) {
    recommendations.push({
      code: "REVIEW_HIDDEN_PUBLICATIONS",
      priority: "HIGH",
      area: "MODERATION",
      message:
        `Tienes ${hiddenPublications} publicación(es) ocultas. Revisa sus títulos, imágenes y descripciones.`
    });
  }

  if (
    activePublications >= 3 &&
    conversionRate < 20
  ) {
    recommendations.push({
      code: "IMPROVE_CONVERSION",
      priority: "HIGH",
      area: "SALES",
      message:
        "Tu conversión es baja. Mejora precios, fotografías y descripciones para aumentar ventas."
    });
  }

  if (averageResponseMinutes > 60) {
    recommendations.push({
      code: "IMPROVE_RESPONSE_TIME",
      priority: "MEDIUM",
      area: "MESSAGES",
      message:
        "Intenta responder en menos de una hora para aumentar la confianza del comprador."
    });
  }

  if (
    reputation.verificationStatus !== "APPROVED" &&
    reputation.verificationStatus !== "VERIFIED"
  ) {
    recommendations.push({
      code: "COMPLETE_VERIFICATION",
      priority: "HIGH",
      area: "VERIFICATION",
      message:
        "Completa tu verificación para mejorar la confianza y visibilidad de tus publicaciones."
    });
  }

  if (sellerScore < 60) {
    recommendations.push({
      code: "IMPROVE_REPUTATION",
      priority: "HIGH",
      area: "REPUTATION",
      message:
        "Tu reputación comercial necesita mejorar. Evita cancelaciones, disputas y advertencias."
    });
  }

  if (warningsReceived > 0) {
    recommendations.push({
      code: "REDUCE_WARNINGS",
      priority: "HIGH",
      area: "MODERATION",
      message:
        `Tienes ${warningsReceived} advertencia(s). Revisa las políticas antes de publicar.`
    });
  }

  if (disputesReceived > 0) {
    recommendations.push({
      code: "REDUCE_DISPUTES",
      priority: "HIGH",
      area: "DISPUTES",
      message:
        `Has recibido ${disputesReceived} disputa(s). Describe claramente el estado y condiciones de tus productos.`
    });
  }

  if (
    Array.isArray(profile.dominantCategories) &&
    profile.dominantCategories[0]?.name
  ) {
    recommendations.push({
      code: "FOCUS_TOP_CATEGORY",
      priority: "LOW",
      area: "MARKETPLACE",
      message:
        `Tu categoría más fuerte es ${profile.dominantCategories[0].name}. Considera publicar más productos relacionados.`
    });
  }

  if (
    Number(
      commercialProfile.averageProductPrice || 0
    ) > 0
  ) {
    recommendations.push({
      code: "REVIEW_PRICE_RANGE",
      priority: "LOW",
      area: "PRICING",
      message:
        `Tu precio promedio es RD${commercialProfile.averageProductPrice}. Compáralo con publicaciones similares.`
    });
  }

  if (
    soldProducts > 0 &&
    recommendations.length === 0
  ) {
    recommendations.push({
      code: "GOOD_PERFORMANCE",
      priority: "LOW",
      area: "GENERAL",
      message:
        "Tu desempeño es saludable. Mantén respuestas rápidas, precios competitivos y buena atención."
    });
  }

  const now = new Date().toISOString();

  const updatedProfile = {
    ...profile,
    recommendations,
    lastActivityAt: now,
    updatedAt: now
  };

  const {
    numericUserId,
    data
  } = await readUserSetting(userId);

  await saveSellerProfile({
    numericUserId,
    data,
    profile: updatedProfile
  });

  return updatedProfile;
}

module.exports = {
  getSellerProfile,
  resetSellerProfile,
  recordPublishedProduct,
  recordCompletedSale,
  recordSellerResponse,
  calculateSellerReputation,
  calculateSellerSpecialties,
  generateSellerRecommendations
};
