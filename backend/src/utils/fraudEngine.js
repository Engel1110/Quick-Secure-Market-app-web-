const HIGH_RISK_KEYWORDS = [
  "iphone",
  "ipad",
  "macbook",
  "playstation",
  "ps5",
  "laptop",
  "rtx",
  "samsung",
  "apple"
];

const marketPrices = {
  iphone: 45000,
  "iphone 15": 55000,
  "iphone 13": 35000,
  laptop: 28000,
  playstation: 32000,
  ps5: 32000,
  ipad: 25000,
  samsung: 30000
};

const getConditionRisk = (condition = "") => {
  const text = condition.toLowerCase();

  if (text.includes("dañado") || text.includes("pieza") || text.includes("repuesto")) {
    return "DAMAGED_DECLARED";
  }

  if (text.includes("nuevo") || text.includes("como nuevo")) {
    return "LIKE_NEW";
  }

  return "USED";
};

const analyzeProductRisk = ({ title, category, price, condition, seller }) => {
  const alerts = [];
  const text = `${title} ${category}`.toLowerCase();
  const productCondition = getConditionRisk(condition);

  const matchedKeyword = Object.keys(marketPrices).find((keyword) =>
    text.includes(keyword)
  );

  if (matchedKeyword) {
    const referencePrice = marketPrices[matchedKeyword];
    const pricePercentage = Number(price) / referencePrice;

    if (pricePercentage < 0.45 && productCondition !== "DAMAGED_DECLARED") {
      alerts.push({
        type: "LOW_PRICE",
        level: "HIGH",
        message:
          "Precio demasiado bajo para un producto declarado como funcional. El vendedor debe justificar el precio antes de aprobación."
      });
    }

    if (pricePercentage < 0.45 && productCondition === "DAMAGED_DECLARED") {
      alerts.push({
        type: "LOW_PRICE",
        level: "MEDIUM",
        message:
          "Precio bajo permitido porque el producto fue declarado como dañado, para piezas o repuesto. Requiere revisión QSM."
      });
    }
  }

  const isHighRiskCategory = HIGH_RISK_KEYWORDS.some((keyword) =>
    text.includes(keyword)
  );

  if (isHighRiskCategory) {
    alerts.push({
      type: "HIGH_RISK_CATEGORY",
      level: "LOW",
      message:
        "Producto pertenece a una categoría sensible. Requiere verificación preventiva QSM."
    });
  }

  if (seller && seller.trustScore < 60) {
    alerts.push({
      type: "LOW_TRUST_SCORE",
      level: "HIGH",
      message:
        "El vendedor tiene bajo Trust Score. El producto requiere revisión manual."
    });
  }

  if (seller && seller.status !== "VERIFIED") {
    alerts.push({
      type: "SELLER_NOT_VERIFIED",
      level: "HIGH",
      message:
        "El vendedor no está verificado. No debe vender hasta completar validación de identidad."
    });
  }

  return alerts;
};

module.exports = {
  analyzeProductRisk
};