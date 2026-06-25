const analyzeReview = (comment) => {
  const text = String(comment || "").toLowerCase();

  let sentimentLabel = "NEUTRAL";
  let sentimentScore = 50;

  const positiveWords = [
    "excelente",
    "perfecto",
    "recomendado",
    "muy bueno",
    "responsable",
    "rápido",
    "honesto",
    "seguro",
    "confiable",
    "amable",
    "puntual",
    "todo bien",
    "tal como describe",
    "tal como describió",
    "volvería a comprar",
    "volveria a comprar"
  ];

  const negativeWords = [
    "malo",
    "terrible",
    "estafa",
    "estafador",
    "fraude",
    "lento",
    "mentiroso",
    "engaño",
    "engaño total",
    "no recomendado",
    "producto dañado",
    "producto roto",
    "falso",
    "incumplió",
    "incumplio"
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach((word) => {
    if (text.includes(word)) {
      positiveCount++;
    }
  });

  negativeWords.forEach((word) => {
    if (text.includes(word)) {
      negativeCount++;
    }
  });

  if (positiveCount > negativeCount) {
    sentimentLabel = "POSITIVE";
    sentimentScore = Math.min(
      100,
      70 + positiveCount * 5
    );
  }

  if (negativeCount > positiveCount) {
    sentimentLabel = "NEGATIVE";
    sentimentScore = Math.max(
      0,
      30 - negativeCount * 5
    );
  }

  if (positiveCount === negativeCount) {
    sentimentLabel = "NEUTRAL";
    sentimentScore = 50;
  }

  const suspiciousPatterns = [
    "te pago",
    "pagame",
    "págame",
    "whatsapp",
    "telegram",
    "llamame",
    "llámame",
    "809",
    "829",
    "849",
    "@gmail",
    "@hotmail",
    "@outlook"
  ];

  const suspiciousReview = suspiciousPatterns.some((item) =>
    text.includes(item)
  );

  return {
    sentimentLabel,
    sentimentScore,
    suspiciousReview
  };
};

module.exports = {
  analyzeReview
};