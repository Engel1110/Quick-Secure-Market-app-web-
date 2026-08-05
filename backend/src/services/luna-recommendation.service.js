"use strict";

/* QSM_FASE4_5_PRODUCT_RECOMMENDATIONS */

function normalizeProduct(product = {}) {
  return {
    id:
      product.id ||
      product._id ||
      product.productId ||
      null,
    title: String(product.title || "").trim(),
    price: Number(product.price || 0),
    condition:
      String(product.condition || "UNKNOWN")
        .trim()
        .toUpperCase(),
    category:
      String(product.category || "")
        .trim()
        .toUpperCase(),
    trustScore: Number(
      product.seller?.trustScore ??
      product.trustScore ??
      0
    ),
    riskScore: Number(
      product.aiAnalysis?.riskScore ??
      product.riskScore ??
      0
    ),
    verified: Boolean(
      product.seller?.isVerified ??
      product.isVerified
    )
  };
}

function calculateProductScore(product) {
  let score = 50;

  score += Math.min(
    25,
    Math.max(0, product.trustScore / 4)
  );

  score -= Math.min(
    35,
    Math.max(0, product.riskScore / 3)
  );

  if (product.verified) {
    score += 10;
  }

  if (product.price <= 0) {
    score -= 30;
  }

  return Math.max(
    0,
    Math.min(100, Math.round(score))
  );
}

function compareProducts(products = []) {
  const normalized = products
    .map(normalizeProduct)
    .filter(
      (product) =>
        product.id ||
        product.title
    )
    .map((product) => ({
      ...product,
      recommendationScore:
        calculateProductScore(product)
    }));

  const validPrices = normalized
    .map((product) => product.price)
    .filter((price) => price > 0);

  const averagePrice =
    validPrices.length > 0
      ? validPrices.reduce(
          (total, price) => total + price,
          0
        ) / validPrices.length
      : 0;

  const ranked = normalized
    .map((product) => {
      const priceDifference =
        averagePrice > 0
          ? Math.round(
              ((product.price - averagePrice) /
                averagePrice) *
                100
            )
          : 0;

      const reasons = [];

      if (product.verified) {
        reasons.push("Vendedor verificado.");
      }

      if (product.trustScore >= 70) {
        reasons.push("Buen nivel de confianza.");
      }

      if (product.riskScore >= 60) {
        reasons.push(
          "Requiere una revisión adicional antes de comprar."
        );
      }

      if (priceDifference <= -10) {
        reasons.push(
          "Precio inferior al promedio de la comparación."
        );
      }

      if (priceDifference >= 20) {
        reasons.push(
          "Precio considerablemente superior al promedio."
        );
      }

      return {
        ...product,
        priceDifference,
        reasons
      };
    })
    .sort(
      (a, b) =>
        b.recommendationScore -
        a.recommendationScore
    );

  return {
    total: ranked.length,
    averagePrice: Math.round(
      averagePrice * 100
    ) / 100,
    recommendedProduct:
      ranked[0] || null,
    products: ranked,
    disclaimer:
      "La recomendación es orientativa. Revisa el producto, el vendedor y las condiciones antes de comprar."
  };
}

module.exports = {
  compareProducts
};
