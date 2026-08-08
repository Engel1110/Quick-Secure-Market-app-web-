"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA CONTEXT RESOLVER
|--------------------------------------------------------------------------
| FASE 17.5 BLOQUE B
|
| Interpreta mensajes cortos según:
| - waitingFor
| - topic
| - producto actual
| - preferencias acumuladas
|
|--------------------------------------------------------------------------
*/

const VERSION =
  "LUNA-CONTEXT-RESOLVER-17.5-B";

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

function parseCompactNumber(raw) {
  const text =
    normalizeText(raw)
      .replace(
        /,/g,
        ""
      );

  const match =
    text.match(
      /(\d+(?:\.\d+)?)\s*(mil|k)?/
    );

  if (!match) {
    return null;
  }

  let value =
    Number(
      match[1]
    );

  if (
    !Number.isFinite(
      value
    )
  ) {
    return null;
  }

  if (
    match[2] === "mil" ||
    match[2] === "k"
  ) {
    value *= 1000;
  }

  return Math.round(value);
}

function resolveBudget(
  message
) {
  const text =
    normalizeText(message);

  if (
    !/^(\d+(?:[.,]\d+)?)\s*(mil|k|pesos?)?$/.test(
      text
    )
  ) {
    return null;
  }

  const value =
    parseCompactNumber(
      text
    );

  if (
    !Number.isFinite(value) ||
    value < 1000
  ) {
    return null;
  }

  return value;
}

function resolveUseCase(
  message
) {
  const text =
    normalizeText(message);

  const map = [
    {
      code:
        "GAMING",

      words: [
        "juego",
        "juegos",
        "jugar",
        "gaming",
        "gamer"
      ]
    },

    {
      code:
        "PROGRAMMING",

      words: [
        "programar",
        "programacion",
        "software",
        "desarrollo",
        "coding",
        "developer"
      ]
    },

    {
      code:
        "STUDY",

      words: [
        "estudio",
        "estudiar",
        "universidad",
        "colegio",
        "clases"
      ]
    },

    {
      code:
        "OFFICE",

      words: [
        "oficina",
        "office",
        "excel",
        "word"
      ]
    },

    {
      code:
        "DESIGN",

      words: [
        "diseño",
        "diseno",
        "editar",
        "edicion",
        "photoshop",
        "video"
      ]
    }
  ];

  for (
    const item of map
  ) {
    if (
      item.words.some(
        word =>
          text.includes(
            word
          )
      )
    ) {
      return item.code;
    }
  }

  return null;
}

function resolveRam(
  message
) {
  const text =
    normalizeText(message);

  const match =
    text.match(
      /^(\d+)\s*(?:gb|g)?(?:\s*(?:de\s*)?ram)?$/
    );

  if (!match) {
    return null;
  }

  const value =
    Number(
      match[1]
    );

  const valid = [
    2,
    4,
    6,
    8,
    12,
    16,
    24,
    32,
    48,
    64,
    96,
    128
  ];

  return valid.includes(
    value
  )
    ? value
    : null;
}

function resolveStorage(
  message
) {
  const text =
    normalizeText(message);

  let match =
    text.match(
      /^(\d+)\s*tb$/
    );

  if (match) {
    return Number(
      match[1]
    ) * 1024;
  }

  match =
    text.match(
      /^(\d+)\s*(?:gb|g)?$/
    );

  if (!match) {
    return null;
  }

  const value =
    Number(
      match[1]
    );

  if (
    !Number.isFinite(
      value
    ) ||
    value < 32
  ) {
    return null;
  }

  return value;
}

function resolveProduct(
  message
) {
  let text =
    normalizeText(message);

  text =
    text
      .replace(
        /^(quiero|busco|necesito|quiero comprar|estoy buscando)\s+/,
        ""
      )
      .replace(
        /^(un|una|unos|unas)\s+/,
        ""
      )
      .trim();

  if (
    !text ||
    text.length < 2
  ) {
    return null;
  }

  return text;
}

/*
|--------------------------------------------------------------------------
| RESOLVER CONTEXTO
|--------------------------------------------------------------------------
*/

function resolveContextualMessage({
  message,
  state
} = {}) {
  const waitingFor =
    state?.waitingFor ||
    null;

  if (!waitingFor) {
    return {
      resolved:
        false
    };
  }

  if (
    waitingFor ===
    "budget"
  ) {
    const budget =
      resolveBudget(
        message
      );

    if (
      Number.isFinite(
        budget
      )
    ) {
      return {
        resolved:
          true,

        type:
          "BUDGET",

        value:
          budget,

        patch: {
          preferences: {
            budgetMax:
              budget
          }
        }
      };
    }
  }

  if (
    waitingFor ===
    "useCase"
  ) {
    const useCase =
      resolveUseCase(
        message
      );

    if (useCase) {
      return {
        resolved:
          true,

        type:
          "USE_CASE",

        value:
          useCase,

        patch: {
          preferences: {
            useCase
          }
        }
      };
    }
  }

  if (
    waitingFor ===
    "ram"
  ) {
    const ram =
      resolveRam(
        message
      );

    if (
      Number.isFinite(
        ram
      )
    ) {
      return {
        resolved:
          true,

        type:
          "RAM",

        value:
          ram,

        patch: {
          preferences: {
            ramGb:
              ram
          }
        }
      };
    }
  }

  if (
    waitingFor ===
    "storage"
  ) {
    const storage =
      resolveStorage(
        message
      );

    if (
      Number.isFinite(
        storage
      )
    ) {
      return {
        resolved:
          true,

        type:
          "STORAGE",

        value:
          storage,

        patch: {
          preferences: {
            storageGb:
              storage
          }
        }
      };
    }
  }

  if (
    waitingFor ===
    "product"
  ) {
    const product =
      resolveProduct(
        message
      );

    if (product) {
      return {
        resolved:
          true,

        type:
          "PRODUCT",

        value:
          product,

        patch: {
          topic:
            "MARKETPLACE",

          product: {
            query:
              product
          }
        }
      };
    }
  }

  return {
    resolved:
      false
  };
}

module.exports = {
  VERSION,

  resolveBudget,
  resolveUseCase,
  resolveRam,
  resolveStorage,
  resolveProduct,

  resolveContextualMessage
};
