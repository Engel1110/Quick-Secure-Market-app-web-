"use strict";

/* QSM_FASE5_3_BLOCK1_PRODUCT_SCORE */

const prisma = require("../utils/prisma");

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

function asArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function getClassification(score) {
  if (score >= 95) return "EXCELLENT";
  if (score >= 85) return "VERY_RECOMMENDED";
  if (score >= 70) return "RECOMMENDED";
  if (score >= 50) return "ACCEPTABLE";
  if (score >= 30) return "RISKY";
  return "NOT_RECOMMENDED";
}

function getClassificationLabel(classification) {
  const labels = {
    EXCELLENT: "Excelente",
    VERY_RECOMMENDED: "Muy recomendado",
    RECOMMENDED: "Recomendado",
    ACCEPTABLE: "Aceptable",
    RISKY: "Riesgoso",
    NOT_RECOMMENDED: "No recomendado"
  };

  return labels[classification] || classification;
}

function calculatePublicationQuality(product) {
  const title =
    String(product.title || "").trim();

  const description =
    String(product.description || "").trim();

  const images = [
    ...asArray(product.images),
    ...asArray(product.photos)
  ];

  let score = 0;
  const reasons = [];

  if (title.length >= 12) {
    score += 8;
    reasons.push("Título claro");
  } else {
    reasons.push("El título necesita más detalle");
  }

  if (description.length >= 80) {
    score += 10;
    reasons.push("Descripción completa");
  } else if (description.length >= 30) {
    score += 5;
    reasons.push("Descripción aceptable");
  } else {
    reasons.push("La descripción es muy corta");
  }

  if (images.length >= 4) {
    score += 10;
    reasons.push("Buena cantidad de fotografías");
  } else if (images.length >= 2) {
    score += 6;
    reasons.push("Cantidad de fotografías aceptable");
  } else {
    reasons.push("Debe agregar más fotografías");
  }

  return {
    score,
    reasons
  };
}

function calculateProductScore({
  product,
  sellerProfile = {}
}) {
  const aiAnalysis =
    asObject(product.aiAnalysis);

  const moderation =
    asObject(aiAnalysis.moderation);

  const reputation =
    asObject(sellerProfile.reputation);

  const performance =
    asObject(sellerProfile.performance);

  const responseMetrics =
    asObject(sellerProfile.responseMetrics);

  const publicationQuality =
    calculatePublicationQuality(product);

  const reasons = [
    ...publicationQuality.reasons
  ];

  let score = 35 + publicationQuality.score;

  const riskScore = clampScore(
    aiAnalysis.riskScore ??
    product.riskScore ??
    product.confidenceScore ??
    0
  );

  if (riskScore <= 20) {
    score += 15;
    reasons.push("Riesgo de fraude bajo");
  } else if (riskScore <= 50) {
    score += 5;
    reasons.push("Riesgo moderado");
  } else {
    score -= 20;
    reasons.push("Riesgo de fraude elevado");
  }

  const sellerScore = clampScore(
    reputation.sellerScore ??
    product.seller?.sellerScore ??
    50
  );

  if (sellerScore >= 85) {
    score += 15;
    reasons.push("Vendedor con excelente reputación");
  } else if (sellerScore >= 65) {
    score += 8;
    reasons.push("Vendedor con buena reputación");
  } else if (sellerScore < 40) {
    score -= 12;
    reasons.push("Reputación del vendedor baja");
  }

  const trustScore = clampScore(
    reputation.trustScore ??
    product.seller?.trustScore ??
    50
  );

  if (trustScore >= 85) {
    score += 10;
    reasons.push("Trust Score alto");
  } else if (trustScore < 40) {
    score -= 10;
    reasons.push("Trust Score bajo");
  }

  const verificationStatus = String(
    reputation.verificationStatus ??
    product.seller?.verificationStatus ??
    product.seller?.kycStatus ??
    "PENDING"
  ).toUpperCase();

  if (
    verificationStatus === "APPROVED" ||
    verificationStatus === "VERIFIED"
  ) {
    score += 10;
    reasons.push("Vendedor verificado");
  } else {
    reasons.push("Vendedor pendiente de verificación");
  }

  const averageResponseMinutes =
    Number(
      responseMetrics.averageResponseMinutes || 0
    );

  if (
    averageResponseMinutes > 0 &&
    averageResponseMinutes <= 15
  ) {
    score += 8;
    reasons.push("Responde muy rápido");
  } else if (
    averageResponseMinutes > 15 &&
    averageResponseMinutes <= 60
  ) {
    score += 5;
    reasons.push("Buen tiempo de respuesta");
  } else if (averageResponseMinutes > 240) {
    score -= 5;
    reasons.push("Tiempo de respuesta lento");
  }

  const conversionRate =
    Number(performance.conversionRate || 0);

  if (conversionRate >= 50) {
    score += 7;
    reasons.push("Buen historial de conversión");
  } else if (conversionRate >= 20) {
    score += 3;
  }

  const disputesReceived =
    Number(reputation.disputesReceived || 0);

  const warningsReceived =
    Number(reputation.warningsReceived || 0);

  score -= disputesReceived * 5;
  score -= warningsReceived * 4;

  const status =
    String(product.status || "ACTIVE")
      .toUpperCase();

  if (status !== "ACTIVE") {
    score -= 25;
    reasons.push("La publicación no está activa");
  }

  if (
    moderation.status === "ACTION_TAKEN" ||
    moderation.status === "HIDDEN"
  ) {
    score -= 20;
    reasons.push("La publicación tuvo acción de moderación");
  }

  const finalScore = clampScore(score);
  const classification =
    getClassification(finalScore);

  return {
    score: finalScore,
    classification,
    classificationLabel:
      getClassificationLabel(classification),
    reasons: [...new Set(reasons)].slice(0, 12),
    factors: {
      riskScore,
      sellerScore,
      trustScore,
      verificationStatus,
      averageResponseMinutes,
      conversionRate,
      disputesReceived,
      warningsReceived,
      publicationQualityScore:
        publicationQuality.score
    },
    calculatedAt: new Date().toISOString(),
    version: "QSM-LUNA-SCORE-1.0"
  };
}

async function getSellerProfileData(userId) {
  if (!userId) {
    return {};
  }

  const setting =
    await prisma.userSetting.findUnique({
      where: {
        userId: Number(userId)
      }
    });

  const data = asObject(setting?.data);

  return asObject(
    data.lunaSellerProfile
  );
}

async function findProduct(productId) {
  const id = Number(productId);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Se requiere un producto válido."
    );
  }

  const product =
    await prisma.product.findUnique({
      where: {
        id
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

  return product;
}

async function calculateAndSaveProductScore({
  productId
}) {
  const product =
    await findProduct(productId);

  const sellerProfile =
    await getSellerProfileData(
      product.sellerId
    );

  const score =
    calculateProductScore({
      product,
      sellerProfile
    });

  const currentAnalysis =
    asObject(product.aiAnalysis);

  await prisma.product.update({
    where: {
      id: product.id
    },
    data: {
      aiAnalysis: {
        ...currentAnalysis,
        recommendationScore: score
      }
    }
  });

  return {
    productId: product.id,
    productTitle: product.title,
    ...score
  };
}

async function getSavedProductScore({
  productId
}) {
  const product =
    await findProduct(productId);

  const aiAnalysis =
    asObject(product.aiAnalysis);

  const savedScore =
    asObject(
      aiAnalysis.recommendationScore
    );

  if (
    typeof savedScore.score === "number"
  ) {
    return {
      productId: product.id,
      productTitle: product.title,
      ...savedScore
    };
  }

  return calculateAndSaveProductScore({
    productId: product.id
  });
}

/* QSM_FASE5_3_BLOCK2_PERSONALIZED_RECOMMENDATIONS */

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function getPreferencePercentage(
  preferences,
  value
) {
  if (
    !Array.isArray(preferences) ||
    !value
  ) {
    return 0;
  }

  const normalizedValue =
    normalizeText(value);

  const match =
    preferences.find(
      (item) =>
        normalizeText(item?.name) ===
        normalizedValue
    );

  return Number(
    match?.percentage || 0
  );
}

function getProductBrand(product = {}) {
  return (
    product.brand ||
    product.details?.brand ||
    product.specifications?.brand ||
    ""
  );
}

function getBuyerMatch({
  product,
  buyerProfile
}) {
  const reasons = [];
  let score = 0;

  const category =
    product.category?.name ||
    product.categoryName ||
    product.category ||
    "";

  const brand =
    getProductBrand(product);

  const categoryMatch =
    getPreferencePercentage(
      buyerProfile.favoriteCategories,
      category
    );

  const brandMatch =
    getPreferencePercentage(
      buyerProfile.favoriteBrands,
      brand
    );

  if (categoryMatch > 0) {
    score += Math.min(
      15,
      Math.round(categoryMatch * 0.15)
    );

    reasons.push(
      `Coincide con tu interés en ${category}.`
    );
  }

  if (brandMatch > 0) {
    score += Math.min(
      10,
      Math.round(brandMatch * 0.1)
    );

    reasons.push(
      `La marca ${brand} aparece entre tus preferencias.`
    );
  }

  const price =
    Number(product.price || 0);

  const minimum =
    Number(
      buyerProfile.priceRange?.minimum || 0
    );

  const maximum =
    Number(
      buyerProfile.priceRange?.maximum || 0
    );

  const average =
    Number(
      buyerProfile.priceRange?.average || 0
    );

  if (
    price > 0 &&
    minimum > 0 &&
    maximum > 0 &&
    price >= minimum &&
    price <= maximum
  ) {
    score += 15;

    reasons.push(
      "Está dentro de tu rango de precio habitual."
    );
  } else if (
    price > 0 &&
    average > 0
  ) {
    const difference =
      Math.abs(price - average) /
      average;

    if (difference <= 0.2) {
      score += 8;

      reasons.push(
        "Su precio está cerca de lo que normalmente buscas."
      );
    }
  }

  return {
    score,
    reasons
  };
}

function buildHumanExplanation({
  product,
  baseScore,
  personalizedScore,
  reasons
}) {
  const title =
    product.title ||
    "este producto";

  const firstReasons =
    reasons
      .filter(Boolean)
      .slice(0, 3);

  if (personalizedScore >= 90) {
    return (
      `${title} es una de las mejores opciones para ti. ` +
      firstReasons.join(" ")
    );
  }

  if (personalizedScore >= 75) {
    return (
      `${title} tiene una buena combinación de precio, ` +
      `seguridad y afinidad con tus preferencias. ` +
      firstReasons.join(" ")
    );
  }

  if (personalizedScore >= 60) {
    return (
      `${title} puede ser una opción aceptable, ` +
      `aunque te recomiendo compararlo antes de comprar. ` +
      firstReasons.join(" ")
    );
  }

  return (
    `${title} no está entre las opciones más fuertes para ti. ` +
    firstReasons.join(" ")
  );
}

async function getBuyerProfileData(userId) {
  if (!userId) {
    return {};
  }

  const setting =
    await prisma.userSetting.findUnique({
      where: {
        userId: Number(userId)
      }
    });

  const data =
    asObject(setting?.data);

  return asObject(
    data.lunaBuyerProfile
  );
}

async function getPersonalizedProductRecommendations({
  userId,
  filters = {}
}) {
  const numericUserId =
    Number(userId);

  if (
    !Number.isInteger(numericUserId) ||
    numericUserId <= 0
  ) {
    throw new Error(
      "Se requiere un comprador válido."
    );
  }

  const limit = Math.max(
    1,
    Math.min(
      20,
      Number(filters.limit || 10)
    )
  );

  const query =
    String(filters.query || "")
      .trim();

  const category =
    String(filters.category || "")
      .trim();

  const brand =
    String(filters.brand || "")
      .trim();

  const minimumPrice =
    Math.max(
      0,
      Number(filters.minimumPrice || 0)
    );

  const maximumPrice =
    Math.max(
      0,
      Number(filters.maximumPrice || 0)
    );

  const where = {
    status: "ACTIVE"
  };

  if (query) {
    where.OR = [
      {
        title: {
          contains: query,
          mode: "insensitive"
        }
      },
      {
        description: {
          contains: query,
          mode: "insensitive"
        }
      }
    ];
  }

  if (minimumPrice > 0 || maximumPrice > 0) {
    where.price = {};

    if (minimumPrice > 0) {
      where.price.gte =
        minimumPrice;
    }

    if (maximumPrice > 0) {
      where.price.lte =
        maximumPrice;
    }
  }

  const products =
    await prisma.product.findMany({
      where,
      include: {
        seller: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 100
    });

  const buyerProfile =
    await getBuyerProfileData(
      numericUserId
    );

  const filteredProducts =
    products.filter((product) => {
      if (category) {
        const productCategory =
          product.category?.name ||
          product.categoryName ||
          product.category ||
          "";

        if (
          !normalizeText(productCategory)
            .includes(
              normalizeText(category)
            )
        ) {
          return false;
        }
      }

      if (brand) {
        const productBrand =
          getProductBrand(product);

        if (
          !normalizeText(productBrand)
            .includes(
              normalizeText(brand)
            )
        ) {
          return false;
        }
      }

      return true;
    });

  const sellerIds = [
    ...new Set(
      filteredProducts
        .map((product) =>
          Number(product.sellerId || 0)
        )
        .filter((id) => id > 0)
    )
  ];

  const sellerSettings =
    sellerIds.length > 0
      ? await prisma.userSetting.findMany({
          where: {
            userId: {
              in: sellerIds
            }
          }
        })
      : [];

  const sellerProfiles =
    new Map(
      sellerSettings.map((setting) => {
        const data =
          asObject(setting.data);

        return [
          Number(setting.userId),
          asObject(
            data.lunaSellerProfile
          )
        ];
      })
    );

  const recommendations =
    filteredProducts.map((product) => {
      const sellerProfile =
        sellerProfiles.get(
          Number(product.sellerId)
        ) || {};

      const baseResult =
        calculateProductScore({
          product,
          sellerProfile
        });

      const buyerMatch =
        getBuyerMatch({
          product,
          buyerProfile
        });

      const personalizedScore =
        clampScore(
          baseResult.score +
          buyerMatch.score
        );

      const reasons = [
        ...buyerMatch.reasons,
        ...baseResult.reasons
      ];

      return {
        productId: product.id,
        title: product.title,
        description:
          product.description || "",
        price:
          Number(product.price || 0),
        status: product.status,
        sellerId:
          product.sellerId || null,
        sellerName:
          product.seller
            ? [
                product.seller.firstName,
                product.seller.lastName
              ]
                .filter(Boolean)
                .join(" ")
            : "",
        baseScore:
          baseResult.score,
        personalizedScore,
        classification:
          getClassification(
            personalizedScore
          ),
        classificationLabel:
          getClassificationLabel(
            getClassification(
              personalizedScore
            )
          ),
        reasons:
          [...new Set(reasons)]
            .slice(0, 8),
        explanation:
          buildHumanExplanation({
            product,
            baseScore:
              baseResult.score,
            personalizedScore,
            reasons
          }),
        factors: {
          ...baseResult.factors,
          buyerMatchScore:
            buyerMatch.score
        }
      };
    });

  recommendations.sort(
    (first, second) =>
      second.personalizedScore -
      first.personalizedScore
  );

  return {
    totalProducts:
      filteredProducts.length,
    returned:
      Math.min(
        limit,
        recommendations.length
      ),
    buyerProfileUsed:
      Boolean(
        buyerProfile &&
        Object.keys(buyerProfile).length
      ),
    recommendations:
      recommendations.slice(0, limit),
    generatedAt:
      new Date().toISOString()
  };
}

/* QSM_FASE5_3_BLOCK3_PRODUCT_COMPARISON */

function getComparableCategory(product = {}) {
  return normalizeText(
    product.category?.name ||
    product.categoryName ||
    product.category ||
    ""
  );
}

function calculatePriceAdvantage(
  targetPrice,
  alternativePrice
) {
  const target = Number(targetPrice || 0);
  const alternative =
    Number(alternativePrice || 0);

  if (target <= 0 || alternative <= 0) {
    return {
      percentage: 0,
      label: "Sin comparación de precio"
    };
  }

  const difference =
    Math.round(
      ((target - alternative) / target) * 100
    );

  if (difference > 0) {
    return {
      percentage: difference,
      label:
        `${difference}% más económico`
    };
  }

  if (difference < 0) {
    return {
      percentage: difference,
      label:
        `${Math.abs(difference)}% más costoso`
    };
  }

  return {
    percentage: 0,
    label: "Mismo precio"
  };
}

function buildComparisonVerdict({
  target,
  alternative,
  targetScore,
  alternativeScore,
  priceAdvantage
}) {
  const scoreDifference =
    alternativeScore - targetScore;

  if (
    scoreDifference >= 10 &&
    priceAdvantage.percentage >= 0
  ) {
    return (
      `${alternative.title} parece una mejor compra: ` +
      `tiene mayor puntuación de seguridad y no cuesta más.`
    );
  }

  if (priceAdvantage.percentage >= 15) {
    return (
      `${alternative.title} cuesta menos que ${target.title}. ` +
      `Conviene revisarlo antes de decidir.`
    );
  }

  if (scoreDifference >= 5) {
    return (
      `${alternative.title} tiene una evaluación ligeramente mejor, ` +
      `aunque debes comparar sus condiciones y descripción.`
    );
  }

  if (scoreDifference <= -10) {
    return (
      `${target.title} continúa siendo la opción más sólida ` +
      `frente a esta alternativa.`
    );
  }

  return (
    `${alternative.title} es una alternativa similar. ` +
    `La decisión dependerá del precio, estado y vendedor.`
  );
}

async function getSellerProfilesMap(products = []) {
  const sellerIds = [
    ...new Set(
      products
        .map((product) =>
          Number(product.sellerId || 0)
        )
        .filter((id) => id > 0)
    )
  ];

  if (sellerIds.length === 0) {
    return new Map();
  }

  const settings =
    await prisma.userSetting.findMany({
      where: {
        userId: {
          in: sellerIds
        }
      }
    });

  return new Map(
    settings.map((setting) => {
      const data =
        asObject(setting.data);

      return [
        Number(setting.userId),
        asObject(
          data.lunaSellerProfile
        )
      ];
    })
  );
}

async function compareProductAlternatives({
  productId,
  userId,
  limit = 5
}) {
  const id = Number(productId);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Se requiere un producto válido."
    );
  }

  const target =
    await prisma.product.findUnique({
      where: {
        id
      },
      include: {
        seller: true
      }
    });

  if (!target) {
    throw new Error(
      "Producto no encontrado."
    );
  }

  const numericLimit =
    Math.max(
      1,
      Math.min(
        10,
        Number(limit || 5)
      )
    );

  const targetPrice =
    Number(target.price || 0);

  const minimumPrice =
    targetPrice > 0
      ? Math.max(
          0,
          targetPrice * 0.6
        )
      : 0;

  const maximumPrice =
    targetPrice > 0
      ? targetPrice * 1.4
      : undefined;

  const where = {
    id: {
      not: target.id
    },
    status: "ACTIVE"
  };

  if (targetPrice > 0) {
    where.price = {
      gte: minimumPrice,
      lte: maximumPrice
    };
  }

  const candidates =
    await prisma.product.findMany({
      where,
      include: {
        seller: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 80
    });

  const targetCategory =
    getComparableCategory(target);

  const targetBrand =
    normalizeText(
      getProductBrand(target)
    );

  const relevantCandidates =
    candidates.filter((candidate) => {
      const candidateCategory =
        getComparableCategory(candidate);

      const candidateBrand =
        normalizeText(
          getProductBrand(candidate)
        );

      if (
        targetCategory &&
        candidateCategory === targetCategory
      ) {
        return true;
      }

      if (
        targetBrand &&
        candidateBrand === targetBrand
      ) {
        return true;
      }

      return (
        !targetCategory &&
        !targetBrand
      );
    });

  const productsForProfiles = [
    target,
    ...relevantCandidates
  ];

  const sellerProfiles =
    await getSellerProfilesMap(
      productsForProfiles
    );

  const buyerProfile =
    await getBuyerProfileData(userId);

  const targetSellerProfile =
    sellerProfiles.get(
      Number(target.sellerId)
    ) || {};

  const targetBase =
    calculateProductScore({
      product: target,
      sellerProfile:
        targetSellerProfile
    });

  const targetBuyerMatch =
    getBuyerMatch({
      product: target,
      buyerProfile
    });

  const targetPersonalizedScore =
    clampScore(
      targetBase.score +
      targetBuyerMatch.score
    );

  const alternatives =
    relevantCandidates
      .map((alternative) => {
        const sellerProfile =
          sellerProfiles.get(
            Number(alternative.sellerId)
          ) || {};

        const base =
          calculateProductScore({
            product: alternative,
            sellerProfile
          });

        const buyerMatch =
          getBuyerMatch({
            product: alternative,
            buyerProfile
          });

        const personalizedScore =
          clampScore(
            base.score +
            buyerMatch.score
          );

        const priceAdvantage =
          calculatePriceAdvantage(
            target.price,
            alternative.price
          );

        return {
          productId:
            alternative.id,
          title:
            alternative.title,
          price:
            Number(
              alternative.price || 0
            ),
          sellerId:
            alternative.sellerId || null,
          sellerName:
            alternative.seller
              ? [
                  alternative.seller.firstName,
                  alternative.seller.lastName
                ]
                  .filter(Boolean)
                  .join(" ")
              : "",
          score:
            personalizedScore,
          classification:
            getClassification(
              personalizedScore
            ),
          classificationLabel:
            getClassificationLabel(
              getClassification(
                personalizedScore
              )
            ),
          priceAdvantage,
          reasons: [
            ...buyerMatch.reasons,
            ...base.reasons
          ].slice(0, 6),
          verdict:
            buildComparisonVerdict({
              target,
              alternative,
              targetScore:
                targetPersonalizedScore,
              alternativeScore:
                personalizedScore,
              priceAdvantage
            })
        };
      })
      .sort((first, second) => {
        if (
          second.score !== first.score
        ) {
          return (
            second.score -
            first.score
          );
        }

        return first.price - second.price;
      })
      .slice(0, numericLimit);

  const betterAlternatives =
    alternatives.filter(
      (item) =>
        item.score >
          targetPersonalizedScore ||
        (
          item.score >=
            targetPersonalizedScore - 5 &&
          item.priceAdvantage.percentage >= 10
        )
    );

  return {
    target: {
      productId:
        target.id,
      title:
        target.title,
      price:
        Number(target.price || 0),
      score:
        targetPersonalizedScore,
      classification:
        getClassification(
          targetPersonalizedScore
        ),
      classificationLabel:
        getClassificationLabel(
          getClassification(
            targetPersonalizedScore
          )
        )
    },
    alternatives,
    betterAlternatives:
      betterAlternatives.length,
    recommendation:
      betterAlternatives.length > 0
        ? "Encontré alternativas que podrían ofrecerte mejor valor."
        : "Este producto continúa siendo una opción competitiva frente a los similares encontrados.",
    buyerProfileUsed:
      Boolean(
        buyerProfile &&
        Object.keys(buyerProfile).length
      ),
    generatedAt:
      new Date().toISOString()
  };
}

module.exports = {
  calculateProductScore,
  calculateAndSaveProductScore,
  getSavedProductScore,
  getPersonalizedProductRecommendations,
  compareProductAlternatives
};
