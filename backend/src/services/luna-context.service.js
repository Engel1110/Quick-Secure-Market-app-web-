"use strict";

/* QSM_FASE4_4_CONTEXTUAL_ASSISTANT */

const PAGE_CONTEXTS = Object.freeze({
  MARKETPLACE: {
    title: "Marketplace",
    purpose:
      "Ayudar a buscar, comparar y evaluar publicaciones.",
    suggestions: [
      "Buscar productos",
      "Comparar precios",
      "Revisar señales de confianza"
    ]
  },

  PRODUCT: {
    title: "Producto",
    purpose:
      "Explicar la publicación y orientar antes de comprar.",
    suggestions: [
      "Revisar precio",
      "Evaluar vendedor",
      "Consultar detalles del producto"
    ]
  },

  NEW_PRODUCT: {
    title: "Nueva publicación",
    purpose:
      "Ayudar al vendedor a crear una publicación clara y segura.",
    suggestions: [
      "Mejorar título",
      "Completar descripción",
      "Revisar precio",
      "Agregar evidencias"
    ]
  },

  MESSAGES: {
    title: "Mensajes",
    purpose:
      "Orientar sobre conversaciones y comunicación segura.",
    suggestions: [
      "Detectar mensajes sospechosos",
      "Responder con seguridad",
      "Evitar pagos externos"
    ]
  },

  ORDERS: {
    title: "Órdenes",
    purpose:
      "Explicar el estado de compras y ventas.",
    suggestions: [
      "Consultar estado",
      "Revisar siguiente paso",
      "Entender el proceso de entrega"
    ]
  },

  VERIFICATION: {
    title: "Verificación",
    purpose:
      "Explicar el proceso KYC y los documentos requeridos.",
    suggestions: [
      "Revisar requisitos",
      "Consultar estado",
      "Corregir información"
    ]
  },

  DISPUTES: {
    title: "Disputas",
    purpose:
      "Orientar sobre casos, evidencias y respuestas.",
    suggestions: [
      "Agregar evidencia",
      "Consultar estado",
      "Preparar una respuesta"
    ]
  },

  MODERATION: {
    title: "Moderación",
    purpose:
      "Ayudar al personal autorizado a revisar riesgos y reportes.",
    suggestions: [
      "Revisar análisis de LUNA",
      "Consultar evidencias",
      "Evaluar acción recomendada"
    ]
  },

  GENERAL: {
    title: "QSM",
    purpose:
      "Orientar al usuario dentro de la plataforma.",
    suggestions: [
      "Conocer QSM",
      "Aprender a comprar",
      "Aprender a vender"
    ]
  }
});

function normalizePage(page) {
  const value =
    String(page || "GENERAL")
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");

  return PAGE_CONTEXTS[value]
    ? value
    : "GENERAL";
}

function getPageContext({
  page,
  accessLevel,
  role
} = {}) {
  const pageKey = normalizePage(page);
  const context = PAGE_CONTEXTS[pageKey];

  const restricted =
    accessLevel === "PUBLIC" &&
    [
      "MESSAGES",
      "ORDERS",
      "VERIFICATION",
      "DISPUTES",
      "MODERATION"
    ].includes(pageKey);

  if (restricted) {
    return {
      page: pageKey,
      title: context.title,
      restricted: true,
      message:
        "Debes iniciar sesión para recibir ayuda sobre esta área.",
      suggestions: [
        "Crear una cuenta",
        "Iniciar sesión",
        "Conocer cómo funciona QSM"
      ]
    };
  }

  if (
    pageKey === "MODERATION" &&
    accessLevel !== "BACKOFFICE"
  ) {
    return {
      page: pageKey,
      title: context.title,
      restricted: true,
      message:
        "Esta información está disponible únicamente para personal autorizado.",
      suggestions: []
    };
  }

  return {
    page: pageKey,
    title: context.title,
    purpose: context.purpose,
    suggestions: context.suggestions,
    restricted: false,
    role: role || "USER"
  };
}

module.exports = {
  getPageContext
};
