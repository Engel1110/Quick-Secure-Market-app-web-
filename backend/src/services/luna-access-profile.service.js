"use strict";

/* QSM_FASE4_3_ACCESS_PROFILES */

const PUBLIC_TOPICS = Object.freeze([
  "PLATFORM_INFO",
  "REGISTRATION",
  "LOGIN",
  "HOW_TO_BUY",
  "HOW_TO_SELL",
  "PUBLIC_SECURITY",
  "GENERAL_HELP"
]);

const USER_TOPICS = Object.freeze([
  ...PUBLIC_TOPICS,
  "MY_PROFILE",
  "MY_PRODUCTS",
  "MY_ORDERS",
  "MY_SALES",
  "MY_MESSAGES",
  "MY_VERIFICATION",
  "PRODUCT_RECOMMENDATIONS"
]);

const ROLE_TOPICS = Object.freeze({
  MODERATOR: [
    "MODERATION",
    "CONTENT_REPORTS",
    "USER_WARNINGS"
  ],
  KYC_ADMIN: [
    "KYC_REVIEW",
    "VERIFICATION_CASES"
  ],
  FINANCE: [
    "SIMULATED_PAYMENTS",
    "PAYMENT_VALIDATION",
    "REFUNDS"
  ],
  WAREHOUSE: [
    "WAREHOUSE_RECEPTION",
    "INSPECTION",
    "DELIVERY"
  ],
  SUPPORT: [
    "SUPPORT_CASES",
    "USER_GUIDANCE"
  ],
  SECURITY: [
    "SECURITY_ANALYSIS",
    "FRAUD_ALERTS"
  ],
  AUDITOR: [
    "AUDIT",
    "READ_ONLY_REPORTS"
  ],
  ADMIN: [
    "MODERATION",
    "DISPUTES",
    "AUDIT",
    "SECURITY_ANALYSIS"
  ],
  SENIOR_ADMIN: [
    "MODERATION",
    "DISPUTES",
    "AUDIT",
    "SECURITY_ANALYSIS",
    "ROLE_MANAGEMENT"
  ],
  SUPER_ADMIN: [
    "FULL_BACKOFFICE_ACCESS"
  ]
});

function getAccessProfile({
  authenticated = false,
  role = "VISITOR"
} = {}) {
  const normalizedRole =
    String(role || "VISITOR")
      .trim()
      .toUpperCase();

  if (!authenticated) {
    return {
      audience: "VISITOR",
      accessLevel: "PUBLIC",
      allowedTopics: PUBLIC_TOPICS,
      restricted: true,
      restrictionMessage:
        "Para acceder a información personalizada o interna debes iniciar sesión."
    };
  }

  const internalTopics =
    ROLE_TOPICS[normalizedRole];

  if (internalTopics) {
    return {
      audience: "BACKOFFICE",
      accessLevel: "BACKOFFICE",
      allowedTopics: [
        ...USER_TOPICS,
        ...internalTopics
      ],
      restricted: false,
      restrictionMessage: ""
    };
  }

  return {
    audience: "REGISTERED_USER",
    accessLevel: "REGISTERED_USER",
    allowedTopics: USER_TOPICS,
    restricted: false,
    restrictionMessage:
      "Solo puedes consultar información relacionada con tu propia cuenta."
  };
}

module.exports = {
  getAccessProfile
};
