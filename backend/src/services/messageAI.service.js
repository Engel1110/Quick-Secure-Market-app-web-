const analyzeMessage = (content) => {
  const text = String(content || "").toLowerCase();

  let isFlagged = false;
  let riskLevel = "LOW";
  let aiReason = "Mensaje sin señales críticas.";

  const suspiciousPatterns = [
    "whatsapp",
    "wsp",
    "telegram",
    "signal",
    "instagram",
    "facebook",
    "messenger",
    "tiktok",
    "snapchat",

    "gmail",
    "hotmail",
    "outlook",
    "@gmail",
    "@hotmail",
    "@outlook",

    "zelle",
    "paypal",
    "cashapp",
    "venmo",
    "western union",
    "moneygram",

    "binance",
    "usdt",
    "btc",
    "bitcoin",
    "ethereum",
    "crypto",

    "transferencia",
    "deposito",
    "depósito",
    "pagame",
    "págame",
    "mándame el dinero",
    "mandame el dinero",
    "fuera de la plataforma",
    "fuera de qsm",
    "no uses qsm",
    "no lo hagas por qsm",
    "directo conmigo",
    "trato directo",

    "llamame",
    "llámame",
    "escribeme",
    "escríbeme",
    "contactame",
    "contáctame"
  ];

  const phonePattern =
    /(\+?1?\s?)?(\(?809\)?|\(?829\)?|\(?849\)?)[\s.-]?\d{3}[\s.-]?\d{4}/i;

  const emailPattern =
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

  const urlPattern =
    /(https?:\/\/|www\.|t\.me|wa\.me|bit\.ly|tinyurl|linktr\.ee)/i;

  const hasSuspiciousText = suspiciousPatterns.some((pattern) =>
    text.includes(pattern)
  );

  const hasPhone = phonePattern.test(text);
  const hasEmail = emailPattern.test(text);
  const hasUrl = urlPattern.test(text);

  if (hasPhone) {
    isFlagged = true;
    riskLevel = "HIGH";
    aiReason =
      "Se detectó un posible número telefónico compartido fuera de QSM.";
  }

  if (hasEmail) {
    isFlagged = true;
    riskLevel = "HIGH";
    aiReason =
      "Se detectó un correo electrónico compartido fuera de QSM.";
  }

  if (hasUrl) {
    isFlagged = true;
    riskLevel = "HIGH";
    aiReason =
      "Se detectó un enlace externo potencialmente utilizado para sacar la conversación de QSM.";
  }

  if (hasSuspiciousText) {
    isFlagged = true;
    riskLevel = "HIGH";
    aiReason =
      "El mensaje intenta mover la conversación o el pago fuera de Quick Secure Market.";
  }

  return {
    isFlagged,
    riskLevel,
    aiReason
  };
};

module.exports = {
  analyzeMessage
};