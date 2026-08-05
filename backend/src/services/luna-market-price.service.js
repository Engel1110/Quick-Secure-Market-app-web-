"use strict";

/* QSM_FASE5_4_BLOCK1_FAIR_PRICE */

const prisma = require("../utils/prisma");

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function asObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}

function getProductBrand(product = {}) {
  return (
    product.brand ||
    product.details?.brand ||
    product.specifications?.brand ||
    ""
  );
}

function getProductCategory(product = {}) {
  return (
    product.category?.name ||
    product.categoryName ||
    product.category ||
    ""
  );
}

function calculateMedian(values = []) {
  const sorted = values
    .map(Number)
    .filter(
      (value) =>
        Number.isFinite(value) &&
        value > 0
    )
    .sort((a, b) => a - b);

  if (sorted.length === 0) {
    return 0;
  }

  const middle =
    Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Math.round(
      (
        sorted[middle - 1] +
        sorted[middle]
      ) / 2
    );
  }

  return Math.round(
    sorted[middle]
  );
}

function classifyPrice({
  price,
  median
}) {
  if (price <= 0 || median <= 0) {
    return {
      code: "INSUFFICIENT_DATA",
      label: "Información insuficiente",
      score: 50
    };
  }

  const difference =
    ((price - median) / median) * 100;

  if (difference <= -20) {
    return {
      code: "GREAT_DEAL",
      label: "Excelente oferta",
      score: 100
    };
  }

  if (difference <= -8) {
    return {
      code: "GOOD_PRICE",
      label: "Buen precio",
      score: 90
    };
  }

  if (difference <= 8) {
    return {
      code: "FAIR_PRICE",
      label: "Precio justo",
      score: 80
    };
  }

  if (difference <= 20) {
    return {
      code: "SLIGHTLY_HIGH",
      label: "Precio algo elevado",
      score: 60
    };
  }

  return {
    code: "EXPENSIVE",
    label: "Precio elevado",
    score: 35
  };
}

function buildPriceExplanation({
  product,
  median,
  differencePercentage,
  classification,
  comparableCount
}) {
  const title =
    product.title || "Este producto";

  if (classification.code === "GREAT_DEAL") {
    return (
      `${title} está aproximadamente ` +
      `${Math.abs(differencePercentage)}% por debajo ` +
      `del precio típico encontrado. Parece una excelente oferta, ` +
      `pero conviene revisar el estado y la reputación del vendedor.`
    );
  }

  if (classification.code === "GOOD_PRICE") {
    return (
      `${title} tiene un precio competitivo. ` +
      `Está cerca de ${Math.abs(differencePercentage)}% ` +
      `por debajo del valor medio del mercado.`
    );
  }

  if (classification.code === "FAIR_PRICE") {
    return (
      `${title} tiene un precio razonable frente a ` +
      `${comparableCount} publicación(es) similares. ` +
      `El precio medio encontrado es RD$${median}.`
    );
  }

  if (classification.code === "SLIGHTLY_HIGH") {
    return (
      `${title} está aproximadamente ` +
      `${differencePercentage}% por encima del precio medio. ` +
      `Te recomiendo comparar las condiciones antes de comprar.`
    );
  }

  if (classification.code === "EXPENSIVE") {
    return (
      `${title} parece costoso frente a opciones similares. ` +
      `Está aproximadamente ${differencePercentage}% por encima ` +
      `del precio medio de RD$${median}.`
    );
  }

  return (
    "Todavía no hay suficientes productos similares " +
    "para determinar un precio justo."
  );
}

async function analyzeProductMarketPrice({
  productId
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

  const productPrice =
    Number(product.price || 0);

  const category =
    normalizeText(
      getProductCategory(product)
    );

  const brand =
    normalizeText(
      getProductBrand(product)
    );

  const candidates =
    await prisma.product.findMany({
      where: {
        id: {
          not: product.id
        },
        status: "ACTIVE",
        price: {
          gt: 0
        }
      },
      include: {
        seller: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 150
    });

  const comparableProducts =
    candidates.filter((candidate) => {
      const candidateCategory =
        normalizeText(
          getProductCategory(candidate)
        );

      const candidateBrand =
        normalizeText(
          getProductBrand(candidate)
        );

      if (
        category &&
        candidateCategory === category
      ) {
        return true;
      }

      if (
        brand &&
        candidateBrand === brand
      ) {
        return true;
      }

      return false;
    });

  const prices =
    comparableProducts
      .map((item) =>
        Number(item.price || 0)
      )
      .filter(
        (price) =>
          Number.isFinite(price) &&
          price > 0
      );

  const medianPrice =
    calculateMedian(prices);

  const averagePrice =
    prices.length > 0
      ? Math.round(
          prices.reduce(
            (sum, price) => sum + price,
            0
          ) / prices.length
        )
      : 0;

  const minimumPrice =
    prices.length > 0
      ? Math.min(...prices)
      : 0;

  const maximumPrice =
    prices.length > 0
      ? Math.max(...prices)
      : 0;

  const differencePercentage =
    medianPrice > 0
      ? Math.round(
          (
            (productPrice - medianPrice) /
            medianPrice
          ) * 100
        )
      : 0;

  const classification =
    classifyPrice({
      price: productPrice,
      median: medianPrice
    });

  const cheaperAlternatives =
    comparableProducts
      .filter(
        (item) =>
          Number(item.price || 0) <
          productPrice
      )
      .sort(
        (first, second) =>
          Number(first.price || 0) -
          Number(second.price || 0)
      )
      .slice(0, 5)
      .map((item) => ({
        productId: item.id,
        title: item.title,
        price:
          Number(item.price || 0),
        savings:
          Math.max(
            0,
            productPrice -
              Number(item.price || 0)
          ),
        sellerId:
          item.sellerId || null,
        sellerName:
          item.seller
            ? [
                item.seller.firstName,
                item.seller.lastName
              ]
                .filter(Boolean)
                .join(" ")
            : ""
      }));

  const result = {
    productId:
      product.id,
    title:
      product.title,
    currentPrice:
      productPrice,
    category:
      getProductCategory(product),
    brand:
      getProductBrand(product),
    market: {
      comparableProducts:
        comparableProducts.length,
      minimumPrice,
      maximumPrice,
      averagePrice,
      medianPrice
    },
    differencePercentage,
    classification,
    explanation:
      buildPriceExplanation({
        product,
        median:
          medianPrice,
        differencePercentage,
        classification,
        comparableCount:
          comparableProducts.length
      }),
    cheaperAlternatives,
    analyzedAt:
      new Date().toISOString(),
    version:
      "QSM-LUNA-MARKET-PRICE-1.0"
  };

  const currentAnalysis =
    asObject(product.aiAnalysis);

  await prisma.product.update({
    where: {
      id: product.id
    },
    data: {
      aiAnalysis: {
        ...currentAnalysis,
        marketPriceAnalysis:
          result
      }
    }
  });

  return result;
}

/* QSM_FASE5_4_BLOCK2_MARKET_OPPORTUNITIES */

function calculateOpportunityScore({
  product,
  medianPrice,
  comparableCount
}) {
  const price = Number(product.price || 0);

  if (
    price <= 0 ||
    medianPrice <= 0 ||
    comparableCount < 1
  ) {
    return 0;
  }

  const discount =
    ((medianPrice - price) / medianPrice) * 100;

  let score = 50;

  if (discount >= 30) {
    score += 40;
  } else if (discount >= 20) {
    score += 30;
  } else if (discount >= 10) {
    score += 20;
  } else if (discount > 0) {
    score += 10;
  } else {
    score -= Math.min(
      40,
      Math.abs(discount)
    );
  }

  const analysis =
    asObject(product.aiAnalysis);

  const recommendationScore =
    Number(
      analysis.recommendationScore?.score || 0
    );

  if (recommendationScore >= 85) {
    score += 10;
  } else if (recommendationScore >= 70) {
    score += 5;
  } else if (
    recommendationScore > 0 &&
    recommendationScore < 50
  ) {
    score -= 15;
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );
}

function getOpportunityLabel(score) {
  if (score >= 90) {
    return "Oferta destacada";
  }

  if (score >= 75) {
    return "Muy buena oportunidad";
  }

  if (score >= 60) {
    return "Buena oportunidad";
  }

  if (score >= 45) {
    return "Precio razonable";
  }

  return "Poco conveniente";
}

function buildOpportunityMessage({
  title,
  currentPrice,
  medianPrice,
  differencePercentage
}) {
  if (differencePercentage <= -20) {
    return (
      `${title} cuesta RD${currentPrice} y está ` +
      `${Math.abs(differencePercentage)}% por debajo ` +
      `del precio típico de RD${medianPrice}.`
    );
  }

  if (differencePercentage <= -8) {
    return (
      `${title} tiene un precio competitivo. ` +
      `Puedes ahorrar frente al promedio del mercado.`
    );
  }

  if (differencePercentage <= 8) {
    return (
      `${title} se encuentra dentro de un precio razonable.`
    );
  }

  return (
    `${title} está por encima del precio típico. ` +
    `Conviene revisar otras opciones antes de comprar.`
  );
}

async function scanMarketPriceOpportunities({
  filters = {}
}) {
  const limit = Math.max(
    1,
    Math.min(
      30,
      Number(filters.limit || 10)
    )
  );

  const categoryFilter =
    normalizeText(filters.category);

  const brandFilter =
    normalizeText(filters.brand);

  const maximumPrice =
    Math.max(
      0,
      Number(filters.maximumPrice || 0)
    );

  const products =
    await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        price: {
          gt: 0,
          ...(maximumPrice > 0
            ? {
                lte: maximumPrice
              }
            : {})
        }
      },
      include: {
        seller: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 250
    });

  const filteredProducts =
    products.filter((product) => {
      const category =
        normalizeText(
          getProductCategory(product)
        );

      const brand =
        normalizeText(
          getProductBrand(product)
        );

      if (
        categoryFilter &&
        !category.includes(categoryFilter)
      ) {
        return false;
      }

      if (
        brandFilter &&
        !brand.includes(brandFilter)
      ) {
        return false;
      }

      return true;
    });

  const opportunities =
    filteredProducts.map((product) => {
      const productCategory =
        normalizeText(
          getProductCategory(product)
        );

      const productBrand =
        normalizeText(
          getProductBrand(product)
        );

      const comparableProducts =
        products.filter((candidate) => {
          if (candidate.id === product.id) {
            return false;
          }

          const candidateCategory =
            normalizeText(
              getProductCategory(candidate)
            );

          const candidateBrand =
            normalizeText(
              getProductBrand(candidate)
            );

          if (
            productCategory &&
            candidateCategory === productCategory
          ) {
            return true;
          }

          if (
            productBrand &&
            candidateBrand === productBrand
          ) {
            return true;
          }

          return false;
        });

      const comparablePrices =
        comparableProducts
          .map((item) =>
            Number(item.price || 0)
          )
          .filter(
            (price) =>
              Number.isFinite(price) &&
              price > 0
          );

      const medianPrice =
        calculateMedian(
          comparablePrices
        );

      const currentPrice =
        Number(product.price || 0);

      const differencePercentage =
        medianPrice > 0
          ? Math.round(
              (
                (currentPrice - medianPrice) /
                medianPrice
              ) * 100
            )
          : 0;

      const opportunityScore =
        calculateOpportunityScore({
          product,
          medianPrice,
          comparableCount:
            comparableProducts.length
        });

      return {
        productId:
          product.id,
        title:
          product.title,
        currentPrice,
        medianPrice,
        differencePercentage,
        opportunityScore,
        opportunityLabel:
          getOpportunityLabel(
            opportunityScore
          ),
        category:
          getProductCategory(product),
        brand:
          getProductBrand(product),
        comparableProducts:
          comparableProducts.length,
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
        message:
          buildOpportunityMessage({
            title:
              product.title,
            currentPrice,
            medianPrice,
            differencePercentage
          })
      };
    });

  const ranked =
    opportunities
      .filter(
        (item) =>
          item.medianPrice > 0
      )
      .sort((first, second) => {
        if (
          second.opportunityScore !==
          first.opportunityScore
        ) {
          return (
            second.opportunityScore -
            first.opportunityScore
          );
        }

        return (
          first.currentPrice -
          second.currentPrice
        );
      });

  const goodDeals =
    ranked.filter(
      (item) =>
        item.differencePercentage <= -8
    );

  const expensiveProducts =
    ranked
      .filter(
        (item) =>
          item.differencePercentage >= 15
      )
      .sort(
        (first, second) =>
          second.differencePercentage -
          first.differencePercentage
      );

  return {
    totalAnalyzed:
      filteredProducts.length,
    totalComparable:
      ranked.length,
    goodDeals:
      goodDeals.slice(0, limit),
    expensiveProducts:
      expensiveProducts.slice(
        0,
        limit
      ),
    bestOpportunities:
      ranked.slice(0, limit),
    generatedAt:
      new Date().toISOString(),
    version:
      "QSM-LUNA-MARKET-OPPORTUNITIES-1.0"
  };
}

module.exports = {
  analyzeProductMarketPrice,
  scanMarketPriceOpportunities
};
