"use strict";

const ENGINE = Object.freeze({
  name: "QSM_AI_CORE",
  version: "1.0.0",
  mode: "RULE_BASED",
  provider: "INTERNAL"
});

const MODULES = Object.freeze({
  PRODUCT: "PRODUCT",
  MESSAGE: "MESSAGE",
  REVIEW: "REVIEW",
  FRAUD: "FRAUD",
  MODERATION: "MODERATION",
  DISPUTE: "DISPUTE",
  SECURITY: "SECURITY",
  GENERAL: "GENERAL"
});

const LEVELS = Object.freeze({
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
});

const DECISIONS = Object.freeze({
  ALLOW: "ALLOW",
  ALLOW_WITH_WARNING: "ALLOW_WITH_WARNING",
  REVIEW_RECOMMENDED: "REVIEW_RECOMMENDED",
  HUMAN_REVIEW_REQUIRED: "HUMAN_REVIEW_REQUIRED",
  BLOCK_RECOMMENDED: "BLOCK_RECOMMENDED"
});

const clampNumber = (value, min, max, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const uniqueText = (values) => [
  ...new Set(
    (Array.isArray(values) ? values : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  )
];

const normalizeLevel = (riskScore, preferredLevel = "") => {
  const explicit = String(preferredLevel || "").trim().toUpperCase();
  if (Object.values(LEVELS).includes(explicit)) return explicit;
  if (riskScore >= 85) return LEVELS.CRITICAL;
  if (riskScore >= 65) return LEVELS.HIGH;
  if (riskScore >= 35) return LEVELS.MEDIUM;
  return LEVELS.LOW;
};

const decisionFromRisk = ({ riskScore, riskLevel, forceHumanReview = false }) => {
  if (forceHumanReview || riskLevel === LEVELS.CRITICAL) {
    return DECISIONS.HUMAN_REVIEW_REQUIRED;
  }
  if (riskScore >= 80) return DECISIONS.BLOCK_RECOMMENDED;
  if (riskScore >= 55) return DECISIONS.REVIEW_RECOMMENDED;
  if (riskScore >= 25) return DECISIONS.ALLOW_WITH_WARNING;
  return DECISIONS.ALLOW;
};

const buildAnalysis = ({
  module = MODULES.GENERAL,
  riskScore = 0,
  riskLevel = "",
  confidenceScore = null,
  decision = "",
  reasons = [],
  recommendations = [],
  evidenceRequired = [],
  signals = [],
  humanReviewRequired = false,
  source = "QSM_INTERNAL_RULES",
  metadata = {}
}) => {
  const normalizedRisk = Math.round(clampNumber(riskScore, 0, 100, 0));
  const normalizedConfidence = confidenceScore === null || confidenceScore === undefined
    ? 100 - normalizedRisk
    : Math.round(clampNumber(confidenceScore, 0, 100, 50));
  const normalizedLevel = normalizeLevel(normalizedRisk, riskLevel);
  const finalDecision = decision || decisionFromRisk({
    riskScore: normalizedRisk,
    riskLevel: normalizedLevel,
    forceHumanReview: humanReviewRequired
  });
  const requiresHumanReview = humanReviewRequired || [
    DECISIONS.HUMAN_REVIEW_REQUIRED,
    DECISIONS.BLOCK_RECOMMENDED
  ].includes(finalDecision);

  return {
    engine: ENGINE.name,
    engineVersion: ENGINE.version,
    mode: ENGINE.mode,
    provider: ENGINE.provider,
    module: Object.values(MODULES).includes(module) ? module : MODULES.GENERAL,
    source,
    riskScore: normalizedRisk,
    riskLevel: normalizedLevel,
    confidenceScore: normalizedConfidence,
    decision: finalDecision,
    humanReviewRequired: requiresHumanReview,
    reasons: uniqueText(reasons),
    recommendations: uniqueText(recommendations),
    evidenceRequired: uniqueText(evidenceRequired),
    signals: Array.isArray(signals) ? signals : [],
    metadata: metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {},
    generatedAt: new Date().toISOString()
  };
};

const analyzeProduct = ({ product = {}, legacyAnalysis = {}, duplicateMatches = [] }) => {
  const reasons = [];
  const recommendations = [];
  const evidenceRequired = [];
  const signals = [];
  const title = String(product.title || "").trim();
  const description = String(product.description || "").trim();
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const price = Number(product.price || 0);
  const category = String(product.category || "");
  const confidence = clampNumber(
    legacyAnalysis.confidenceScore ?? product.confidenceScore,
    0,
    100,
    50
  );
  let riskScore = clampNumber(
    legacyAnalysis.fraudRiskScore ?? product.riskScore ?? (100 - confidence),
    0,
    100,
    50
  );

  if (title.length < 5) {
    riskScore += 8;
    reasons.push("El titulo es demasiado corto.");
    recommendations.push("Usa marca, modelo y estado en el titulo.");
    signals.push({ code: "SHORT_TITLE", severity: LEVELS.MEDIUM });
  }

  if (description.length < 40) {
    riskScore += 12;
    reasons.push("La descripcion no permite validar correctamente el producto.");
    evidenceRequired.push("Descripcion detallada del estado y funcionamiento");
    signals.push({ code: "SHORT_DESCRIPTION", severity: LEVELS.MEDIUM });
  }

  if (images.length < 2) {
    riskScore += 10;
    reasons.push("La publicacion tiene pocas fotografias.");
    evidenceRequired.push("Fotografias reales desde diferentes angulos");
    signals.push({ code: "LOW_IMAGE_COUNT", severity: LEVELS.MEDIUM, value: images.length });
  }

  if (price <= 0) {
    riskScore += 20;
    reasons.push("El precio no es valido.");
    signals.push({ code: "INVALID_PRICE", severity: LEVELS.HIGH });
  }

  if (
    price > 0 &&
    price <= 10000 &&
    ["Gaming", "Tecnologia", "Tecnología", "Celulares", "Computadoras", "Laptops"].includes(category)
  ) {
    riskScore += 20;
    reasons.push("El precio es bajo para una categoria sensible.");
    recommendations.push("Solicitar explicacion del precio y evidencia de funcionamiento.");
    signals.push({ code: "LOW_PRICE_SENSITIVE_CATEGORY", severity: LEVELS.HIGH });
  }

  const matches = Array.isArray(duplicateMatches) ? duplicateMatches : [];

  if (matches.length > 0) {
    riskScore += Math.min(35, 15 + matches.length * 5);
    reasons.push("Existen publicaciones con identificadores o evidencias coincidentes.");
    recommendations.push("Enviar el producto a revision humana antes de aprobarlo.");
    signals.push({ code: "POSSIBLE_DUPLICATE", severity: LEVELS.HIGH, count: matches.length });
  }

  const normalizedRisk = Math.round(clampNumber(riskScore, 0, 100, 50));

  return buildAnalysis({
    module: MODULES.PRODUCT,
    riskScore: normalizedRisk,
    confidenceScore: 100 - normalizedRisk,
    reasons: [
      ...reasons,
      ...(Array.isArray(legacyAnalysis.reasons) ? legacyAnalysis.reasons : [])
    ],
    recommendations,
    evidenceRequired: [
      ...evidenceRequired,
      ...(Array.isArray(legacyAnalysis.evidenceRequired) ? legacyAnalysis.evidenceRequired : [])
    ],
    signals,
    humanReviewRequired: matches.length > 0 || normalizedRisk >= 70,
    source: "QSM_PRODUCT_CORE_V1",
    metadata: {
      publicationScore: legacyAnalysis.publicationScore ?? product.publicationScore ?? 0,
      publicationLevel: legacyAnalysis.publicationLevel ?? product.publicationLevel ?? "",
      previousConfidenceScore: confidence,
      duplicateCount: matches.length
    }
  });
};

const normalizeMessageAnalysis = (legacy = {}) => {
  const flagged = Boolean(legacy.isFlagged);
  const level = String(legacy.riskLevel || (flagged ? LEVELS.HIGH : LEVELS.LOW)).toUpperCase();
  const riskScore = level === LEVELS.CRITICAL ? 95 : level === LEVELS.HIGH ? 75 : level === LEVELS.MEDIUM ? 45 : flagged ? 35 : 10;

  return buildAnalysis({
    module: MODULES.MESSAGE,
    riskScore,
    riskLevel: level,
    reasons: legacy.aiReason ? [legacy.aiReason] : [],
    recommendations: flagged ? [
      "Mantener la conversacion y el pago dentro de QSM.",
      "Revisar el mensaje antes de continuar."
    ] : [],
    signals: flagged ? [{ code: "MESSAGE_POLICY_SIGNAL", severity: level }] : [],
    humanReviewRequired: level === LEVELS.CRITICAL,
    source: "QSM_MESSAGE_LEGACY_ADAPTER"
  });
};

const normalizeReviewAnalysis = (legacy = {}) => {
  const suspicious = Boolean(legacy.suspiciousReview);
  const score = clampNumber(legacy.sentimentScore, 0, 100, 50);
  const riskScore = suspicious ? 65 : legacy.sentimentLabel === "NEGATIVE" ? 35 : 10;

  return buildAnalysis({
    module: MODULES.REVIEW,
    riskScore,
    reasons: suspicious ? [
      "La resena contiene posibles datos de contacto o instrucciones fuera de QSM."
    ] : [],
    recommendations: suspicious ? ["Revisar la resena antes de publicarla."] : [],
    signals: [{
      code: "REVIEW_SENTIMENT",
      severity: suspicious ? LEVELS.HIGH : LEVELS.LOW,
      label: legacy.sentimentLabel || "NEUTRAL",
      score
    }],
    humanReviewRequired: suspicious,
    source: "QSM_REVIEW_LEGACY_ADAPTER",
    metadata: {
      sentimentLabel: legacy.sentimentLabel || "NEUTRAL",
      sentimentScore: score
    }
  });
};

const getCapabilities = () => ({
  engine: ENGINE,
  modules: Object.values(MODULES),
  decisions: Object.values(DECISIONS),
  levels: Object.values(LEVELS),
  capabilities: [
    { code: "PRODUCT_RISK", status: "ACTIVE" },
    { code: "DUPLICATE_SIGNALS", status: "ACTIVE" },
    { code: "MESSAGE_SAFETY", status: "ADAPTER_READY" },
    { code: "REVIEW_SENTIMENT", status: "ADAPTER_READY" },
    { code: "EXTERNAL_AI_PROVIDER", status: "NOT_CONNECTED" }
  ]
});

module.exports = {
  ENGINE,
  MODULES,
  LEVELS,
  DECISIONS,
  buildAnalysis,
  analyzeProduct,
  normalizeMessageAnalysis,
  normalizeReviewAnalysis,
  getCapabilities
};
