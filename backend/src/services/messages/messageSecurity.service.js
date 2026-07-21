const DEFAULT_RULES = [
  {
    code: "EXTERNAL_MESSAGING",
    level: "MEDIUM",
    weight: 22,
    title: "Intento de sacar la conversación de QSM",
    recommendation:
      "Mantén la comunicación y los acuerdos dentro de QSM.",
    patterns: [
      /\bwhats\s*app\b/i,
      /\bwa\.me\b/i,
      /\btelegram\b/i,
      /\bt\.me\b/i,
      /\bescr[ií]beme\s+por\s+(fuera|privado)\b/i
    ]
  },
  {
    code: "PHONE_NUMBER",
    level: "MEDIUM",
    weight: 18,
    title: "Posible número telefónico",
    recommendation:
      "Evita compartir números personales antes de completar la operación.",
    patterns: [
      /(?:\+?1[\s.-]?)?\(?8(?:09|29|49)\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/i,
      /\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/i
    ]
  },
  {
    code: "EMAIL_ADDRESS",
    level: "LOW",
    weight: 10,
    title: "Correo electrónico detectado",
    recommendation:
      "No es necesario compartir correos para completar una compra dentro de QSM.",
    patterns: [
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
    ]
  },
  {
    code: "EXTERNAL_PAYMENT",
    level: "HIGH",
    weight: 38,
    title: "Solicitud de pago fuera de QSM",
    recommendation:
      "No envíes dinero por transferencia directa. Utiliza Pago Protegido QSM.",
    patterns: [
      /\btransfi[eé]reme\b/i,
      /\bdep[oó]sitame\b/i,
      /\bdep[oó]sito\s+directo\b/i,
      /\bpago\s+por\s+fuera\b/i,
      /\bsin\s+usar\s+qsm\b/i,
      /\bwestern\s+union\b/i,
      /\bremesa\b/i
    ]
  },
  {
    code: "BANK_INFORMATION",
    level: "HIGH",
    weight: 35,
    title: "Información bancaria detectada",
    recommendation:
      "No compartas cuentas bancarias, tarjetas ni credenciales dentro del chat.",
    patterns: [
      /\bcuenta\s+(bancaria|corriente|de\s+ahorro)\b/i,
      /\bn[uú]mero\s+de\s+cuenta\b/i,
      /\biban\b/i,
      /\bswift\b/i,
      /\btarjeta\s+\d{4}/i
    ]
  },
  {
    code: "CREDENTIAL_REQUEST",
    level: "CRITICAL",
    weight: 55,
    title: "Solicitud de credenciales o código",
    recommendation:
      "Nunca compartas contraseñas, códigos OTP, PIN ni códigos bancarios.",
    patterns: [
      /\bcontrase[nñ]a\b/i,
      /\bc[oó]digo\s+(otp|de\s+verificaci[oó]n|bancario)\b/i,
      /\bpin\s+(de|bancario|seguridad)\b/i,
      /\btoken\s+bancario\b/i
    ]
  },
  {
    code: "SUSPICIOUS_LINK",
    level: "MEDIUM",
    weight: 20,
    title: "Enlace externo detectado",
    recommendation:
      "Abre enlaces externos únicamente cuando confíes en el remitente.",
    patterns: [
      /https?:\/\/[^\s]+/i,
      /\bwww\.[^\s]+/i
    ]
  },
  {
    code: "PRESSURE_LANGUAGE",
    level: "MEDIUM",
    weight: 16,
    title: "Lenguaje de presión o urgencia",
    recommendation:
      "No tomes decisiones apresuradas. Verifica el producto y la operación.",
    patterns: [
      /\bsolo\s+ahora\b/i,
      /\b[uú]ltima\s+oportunidad\b/i,
      /\bdebes\s+pagar\s+ya\b/i,
      /\bap[uú]rate\b/i,
      /\bse\s+lo\s+vendo\s+a\s+otro\b/i
    ]
  },
  {
    code: "IDENTITY_DOCUMENT",
    level: "HIGH",
    weight: 30,
    title: "Documento personal solicitado",
    recommendation:
      "No envíes cédula, pasaporte ni documentos personales por el chat.",
    patterns: [
      /\bc[eé]dula\b/i,
      /\bpasaporte\b/i,
      /\blicencia\s+de\s+conducir\b/i,
      /\bfoto\s+del\s+documento\b/i
    ]
  }
];

const LEVEL_VALUES = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function analyzeMessageSecurity(text, customRules = []) {
  const content = normalizeText(text);

  if (!content) {
    return {
      score: 0,
      riskLevel: "LOW",
      flagged: false,
      reasons: [],
      recommendation: ""
    };
  }

  const rules = [...DEFAULT_RULES, ...customRules];
  const reasons = [];
  let score = 0;
  let highestLevel = "LOW";

  rules.forEach((rule) => {
    const matched = rule.patterns.some((pattern) => pattern.test(content));

    if (!matched) {
      return;
    }

    score += Number(rule.weight || 0);

    if (
      LEVEL_VALUES[rule.level] >
      LEVEL_VALUES[highestLevel]
    ) {
      highestLevel = rule.level;
    }

    reasons.push({
      code: rule.code,
      level: rule.level,
      title: rule.title,
      recommendation: rule.recommendation
    });
  });

  score = Math.min(100, score);

  const calculatedLevel =
    score >= 70
      ? "CRITICAL"
      : score >= 45
      ? "HIGH"
      : score >= 20
      ? "MEDIUM"
      : "LOW";

  if (
    LEVEL_VALUES[calculatedLevel] >
    LEVEL_VALUES[highestLevel]
  ) {
    highestLevel = calculatedLevel;
  }

  const recommendation =
    reasons.find(
      (reason) =>
        reason.level === "CRITICAL"
    )?.recommendation ||
    reasons.find(
      (reason) =>
        reason.level === "HIGH"
    )?.recommendation ||
    reasons[0]?.recommendation ||
    "";

  return {
    score,
    riskLevel: highestLevel,
    flagged: reasons.length > 0,
    reasons,
    recommendation
  };
}

function summarizeConversationSecurity(messages = []) {
  const validMessages = Array.isArray(messages)
    ? messages
    : [];

  const flaggedMessages = validMessages.filter(
    (message) => message?.isFlagged
  );

  const scores = validMessages.map((message) => {
    const explicitScore = Number(
      message?.securityScore ||
      message?.fraudRiskScore ||
      0
    );

    if (Number.isFinite(explicitScore)) {
      return explicitScore;
    }

    return 0;
  });

  const maximumScore =
    scores.length > 0
      ? Math.max(...scores)
      : 0;

  const criticalCount =
    validMessages.filter(
      (message) =>
        message?.riskLevel === "CRITICAL"
    ).length;

  const highCount =
    validMessages.filter(
      (message) =>
        message?.riskLevel === "HIGH"
    ).length;

  const riskLevel =
    criticalCount > 0
      ? "CRITICAL"
      : highCount > 0 ||
        maximumScore >= 45
      ? "HIGH"
      : flaggedMessages.length > 0 ||
        maximumScore >= 20
      ? "MEDIUM"
      : "LOW";

  return {
    riskLevel,
    score: maximumScore,
    flaggedMessages: flaggedMessages.length,
    criticalCount,
    highCount,
    totalMessages: validMessages.length
  };
}

module.exports = {
  analyzeMessageSecurity,
  summarizeConversationSecurity,
  DEFAULT_RULES
};
