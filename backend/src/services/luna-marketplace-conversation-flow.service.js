"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA MARKETPLACE CONVERSATION FLOW
|--------------------------------------------------------------------------
| FASE 17.5 BLOQUE D
|
| Decide qué preguntar después sin repetir preguntas.
|--------------------------------------------------------------------------
*/

const VERSION =
  "LUNA-MARKETPLACE-FLOW-17.5-D";

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    );
}

function detectFamily(
  query
) {
  const text =
    normalizeText(
      query
    );

  if (
    [
      "laptop",
      "notebook",
      "portatil",
      "computadora",
      "pc"
    ].some(
      item =>
        text.includes(item)
    )
  ) {
    return "COMPUTER";
  }

  if (
    [
      "iphone",
      "celular",
      "telefono",
      "smartphone",
      "samsung",
      "xiaomi",
      "pixel"
    ].some(
      item =>
        text.includes(item)
    )
  ) {
    return "PHONE";
  }

  return "GENERAL";
}

function nextMarketplaceStep(
  state
) {
  if (
    !state ||
    state.topic !==
      "MARKETPLACE"
  ) {
    return {
      ready:
        false,

      step:
        null
    };
  }

  const product =
    state?.product?.query ||
    null;

  const preferences =
    state?.preferences ||
    {};

  if (!product) {
    return {
      ready:
        false,

      step:
        "product",

      answer:
        "¿Qué producto deseas buscar?"
    };
  }

  if (
    !Number.isFinite(
      Number(
        preferences.budgetMax
      )
    ) ||
    Number(
      preferences.budgetMax
    ) <= 0
  ) {
    return {
      ready:
        false,

      step:
        "budget",

      answer:
        `Perfecto. ¿Cuál es tu presupuesto máximo para ${product}?`
    };
  }

  const family =
    detectFamily(
      product
    );

  if (
    family ===
      "COMPUTER"
  ) {
    if (
      !preferences.useCase
    ) {
      return {
        ready:
          false,

        step:
          "useCase",

        answer:
          "Perfecto. ¿Para qué la necesitas principalmente: estudiar, oficina, programar, diseño o juegos?"
      };
    }

    if (
      !Number.isFinite(
        Number(
          preferences.ramGb
        )
      )
    ) {
      return {
        ready:
          false,

        step:
          "ram",

        answer:
          "Entendido. ¿Cuánta RAM prefieres? Por ejemplo: 8, 16 o 32 GB."
      };
    }

    if (
      !Number.isFinite(
        Number(
          preferences.storageGb
        )
      )
    ) {
      return {
        ready:
          false,

        step:
          "storage",

        answer:
          "Perfecto. ¿Qué almacenamiento buscas? Por ejemplo: 256 GB, 512 GB o 1 TB."
      };
    }

    if (
      !preferences.condition
    ) {
      return {
        ready:
          false,

        step:
          "condition",

        answer:
          "¿La prefieres nueva, usada o te da igual la condición?"
      };
    }
  }

  if (
    family ===
      "PHONE"
  ) {
    if (
      !Number.isFinite(
        Number(
          preferences.storageGb
        )
      )
    ) {
      return {
        ready:
          false,

        step:
          "storage",

        answer:
          "Perfecto. ¿Qué almacenamiento prefieres? Por ejemplo: 128 GB, 256 GB o 512 GB."
      };
    }

    if (
      !preferences.condition
    ) {
      return {
        ready:
          false,

        step:
          "condition",

        answer:
          "¿Lo prefieres nuevo, usado o te da igual la condición?"
      };
    }
  }

  return {
    ready:
      true,

    step:
      "results",

    answer:
      null
  };
}

function buildAcknowledgement(
  resolvedType,
  value
) {
  switch (
    resolvedType
  ) {

    case "BUDGET":
      return "Perfecto.";

    case "USE_CASE":
      return "Entendido.";

    case "RAM":
      return `Perfecto, ${value} GB de RAM.`;

    case "STORAGE":
      return `Perfecto, ${value} GB de almacenamiento.`;

    case "CONDITION":
      return "Entendido.";

    case "PRODUCT":
      return "Perfecto.";

    default:
      return "";
  }
}

module.exports = {
  VERSION,
  detectFamily,
  nextMarketplaceStep,
  buildAcknowledgement
};
