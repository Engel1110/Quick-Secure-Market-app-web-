/*
| QSM_FASE17_BLOCK11_FIX2_REAL_LANGUAGE_PIPELINE
*/
"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA SEMANTIC CORE
|--------------------------------------------------------------------------
| FASE 17 BLOQUE 10 LOCAL
|
| Motor local de interpretación conversacional.
|
| NO usa Gemini.
| NO usa OpenAI.
| NO usa APIs externas.
| NO genera costo.
|
| Su trabajo NO es responder directamente.
|
| Su trabajo es interpretar:
|
| - intención probable
| - nivel de confianza
| - intenciones alternativas
| - continuidad probable
| - estructura del mensaje
|
|--------------------------------------------------------------------------
*/

/*
| QSM_FASE17_BLOCK11_LOCAL_LANGUAGE_LAYER
*/

const {
  normalizeConversationalInput
} = require(
  "./luna-language-normalizer.service"
);
const VERSION =
  "LUNA-SEMANTIC-CORE-17.10";

/* ========================================================================
   NORMALIZACIÓN
======================================================================== */

function normalizeText(value) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9ñáéíóúü\s$€%./-]/gi,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function tokenize(value) {
  return normalizeText(
    value
  )
    .split(" ")
    .map(
      (token) =>
        token.trim()
    )
    .filter(
      (token) =>
        token.length > 1
    );
}

/* ========================================================================
   STOP WORDS
======================================================================== */

const STOP_WORDS =
  new Set([
    "a",
    "al",
    "algo",
    "como",
    "con",
    "cual",
    "cuales",
    "de",
    "del",
    "el",
    "ella",
    "en",
    "es",
    "esa",
    "ese",
    "eso",
    "esta",
    "este",
    "esto",
    "hay",
    "la",
    "las",
    "lo",
    "los",
    "me",
    "mi",
    "mis",
    "para",
    "por",
    "que",
    "se",
    "si",
    "su",
    "sus",
    "tengo",
    "tiene",
    "tienes",
    "tu",
    "un",
    "una",
    "unos",
    "unas",
    "y",
    "ya"
  ]);

function meaningfulTokens(
  value
) {
  return tokenize(value)
    .filter(
      (token) =>
        !STOP_WORDS.has(
          token
        )
    );
}

/* ========================================================================
   DICE COEFFICIENT
======================================================================== */

function getBigrams(value) {
  const text =
    normalizeText(value)
      .replace(
        /\s+/g,
        " "
      );

  if (
    text.length <
    2
  ) {
    return [
      text
    ];
  }

  const result = [];

  for (
    let index = 0;
    index <
      text.length - 1;
    index += 1
  ) {
    result.push(
      text.slice(
        index,
        index + 2
      )
    );
  }

  return result;
}

function diceSimilarity(
  left,
  right
) {
  const a =
    getBigrams(left);

  const b =
    getBigrams(right);

  if (
    !a.length ||
    !b.length
  ) {
    return 0;
  }

  const used =
    new Array(
      b.length
    ).fill(false);

  let matches =
    0;

  for (
    const item of a
  ) {
    const position =
      b.findIndex(
        (
          candidate,
          index
        ) =>
          !used[index] &&
          candidate === item
      );

    if (
      position !== -1
    ) {
      used[position] =
        true;

      matches += 1;
    }
  }

  return (
    2 *
    matches
  ) /
  (
    a.length +
    b.length
  );
}

/* ========================================================================
   JACCARD POR PALABRAS
======================================================================== */

function jaccardSimilarity(
  left,
  right
) {
  const leftSet =
    new Set(
      meaningfulTokens(
        left
      )
    );

  const rightSet =
    new Set(
      meaningfulTokens(
        right
      )
    );

  if (
    leftSet.size === 0 ||
    rightSet.size === 0
  ) {
    return 0;
  }

  let intersection =
    0;

  leftSet.forEach(
    (token) => {
      if (
        rightSet.has(
          token
        )
      ) {
        intersection +=
          1;
      }
    }
  );

  const union =
    new Set([
      ...leftSet,
      ...rightSet
    ]).size;

  return union
    ? intersection /
        union
    : 0;
}

/* ========================================================================
   COBERTURA DE CONCEPTOS
======================================================================== */

function tokenCoverage(
  message,
  example
) {
  const messageTokens =
    new Set(
      meaningfulTokens(
        message
      )
    );

  const exampleTokens =
    meaningfulTokens(
      example
    );

  if (
    !exampleTokens.length
  ) {
    return 0;
  }

  let matches =
    0;

  exampleTokens.forEach(
    (token) => {
      if (
        messageTokens.has(
          token
        )
      ) {
        matches +=
          1;
      }
    }
  );

  return matches /
    exampleTokens.length;
}

/* ========================================================================
   SIMILITUD COMBINADA
======================================================================== */

function comparePhrases(
  message,
  example
) {
  const normalizedMessage =
    normalizeText(
      message
    );

  const normalizedExample =
    normalizeText(
      example
    );

  if (
    !normalizedMessage ||
    !normalizedExample
  ) {
    return 0;
  }

  if (
    normalizedMessage ===
    normalizedExample
  ) {
    return 1;
  }

  const dice =
    diceSimilarity(
      normalizedMessage,
      normalizedExample
    );

  const jaccard =
    jaccardSimilarity(
      normalizedMessage,
      normalizedExample
    );

  const coverage =
    tokenCoverage(
      normalizedMessage,
      normalizedExample
    );

  /*
    Pesos iniciales.

    Bloque 11 agregará:
    - spelling aproximado
    - aliases
    - corrección fonética ligera
  */

  const score =
    (
      dice *
      0.35
    ) +
    (
      jaccard *
      0.35
    ) +
    (
      coverage *
      0.30
    );

  return Number(
    Math.min(
      1,
      Math.max(
        0,
        score
      )
    ).toFixed(4)
  );
}

/* ========================================================================
   INTENCIONES BASE
======================================================================== */

const INTENT_CATALOG =
  Object.freeze({

    GREETING: {
      family:
        "CONVERSATION",

      examples: [
        "hola",
        "buenas",
        "buenos dias",
        "buenas tardes",
        "buenas noches",
        "como estas",
        "que tal luna",
        "hola luna"
      ]
    },

    HELP: {
      family:
        "CONVERSATION",

      examples: [
        "ayudame",
        "necesito ayuda",
        "que puedes hacer",
        "en que puedes ayudarme",
        "que sabes hacer",
        "como me ayudas"
      ]
    },

    TRUST: {
      family:
        "ACCOUNT",

      examples: [
        "cual es mi confianza",
        "cuanto tengo de confianza",
        "como esta mi nivel de confianza",
        "dime mi puntuacion qsm",
        "como esta mi score",
        "que puntuacion tengo",
        "como esta mi reputacion"
      ]
    },

    VERIFICATION: {
      family:
        "ACCOUNT",

      examples: [
        "estoy verificado",
        "mi cuenta esta verificada",
        "como va mi verificacion",
        "ya estoy verificado",
        "mi identidad esta aprobada",
        "estado de mi verificacion"
      ]
    },

    PURCHASES: {
      family:
        "COMMERCE",

      examples: [
        "cuantas compras tengo",
        "que he comprado",
        "mis compras",
        "como van mis pedidos",
        "tengo compras pendientes",
        "dime lo que compre",
        "que cosas he comprado",
        "que pedidos tengo",
        "mis ordenes como comprador",
        "tengo algo comprado"
      ]
    },

    SALES: {
      family:
        "COMMERCE",

      examples: [
        "cuantas ventas tengo",
        "que he vendido",
        "mis ventas",
        "como van mis ventas",
        "tengo ventas pendientes",
        "que productos he vendido",
        "mis ordenes como vendedor"
      ]
    },

    DISPUTES: {
      family:
        "SUPPORT",

      examples: [
        "tengo disputas",
        "cuantas disputas tengo",
        "tengo algun reclamo",
        "hay problemas en mis compras",
        "tengo algun caso abierto",
        "mis disputas",
        "mis reclamos",
        "hay alguna disputa"
      ]
    },

    MESSAGES: {
      family:
        "COMMUNICATION",

      examples: [
        "tengo mensajes",
        "tengo mensajes sin leer",
        "quien me escribio",
        "hay mensajes nuevos",
        "mis mensajes",
        "revisa mis mensajes"
      ]
    },

    MARKETPLACE_SEARCH: {
      family:
        "MARKETPLACE",

      examples: [
        "quiero comprar un producto",
        "estoy buscando un producto",
        "busco un celular",
        "quiero un telefono",
        "necesito una laptop",
        "tienen iphone",
        "que tienen disponible",
        "buscame algo",
        "quiero comprar",
        "que productos hay"
      ]
    },

    MARKETPLACE_BUDGET: {
      family:
        "MARKETPLACE",

      examples: [
        "tengo un presupuesto",
        "puedo gastar",
        "mi presupuesto es",
        "tengo 30000 pesos",
        "hasta 30 mil",
        "no quiero gastar mas de",
        "quiero algo por debajo de"
      ]
    },

    MARKETPLACE_COMPARE: {
      family:
        "MARKETPLACE",

      examples: [
        "comparame esos productos",
        "cual tiene mejores caracteristicas",
        "comparame esos dos productos",
        "comparar las opciones",
        "cual tiene mas almacenamiento",
        "cual tiene mejor procesador"
      ]
    },

    MARKETPLACE_CHEAPER: {
      family:
        "MARKETPLACE",

      examples: [
        "quiero uno mas barato",
        "hay algo mas economico",
        "quiero gastar menos",
        "cual cuesta menos",
        "dame uno de menor precio"
      ]
    },

    MARKETPLACE_MORE_TRUSTED: {
      family:
        "MARKETPLACE",

      examples: [
        "quiero ver opciones verificadas",
        "cuales estan verificadas",
        "quiero productos seguros",
        "muestrame las opciones verificadas",
        "cual tiene vendedor verificado"
      ]
    },

    SECURITY: {
      family:
        "SECURITY",

      examples: [
        "mi cuenta esta segura",
        "tengo algun riesgo",
        "hay riesgo de fraude",
        "revisa mi seguridad",
        "tengo problemas de seguridad",
        "hay algo sospechoso"
      ]
    },

    ACCOUNT_PRIORITY: {
      family:
        "ACCOUNT",

      examples: [
        "que debo revisar primero",
        "que deberia hacer primero",
        "que tengo pendiente",
        "por donde comienzo",
        "que es lo mas importante ahora"
      ]
    }

  });

/* ========================================================================
   CLASIFICACIÓN
======================================================================== */

function scoreIntent(
  message,
  intentCode,
  definition
) {
  let best =
    0;

  let bestExample =
    null;

  for (
    const example
    of definition.examples
  ) {
    const score =
      comparePhrases(
        message,
        example
      );

    if (
      score >
      best
    ) {
      best =
        score;

      bestExample =
        example;
    }
  }

  return {
    code:
      intentCode,

    family:
      definition.family,

    score:
      best,

    matchedExample:
      bestExample
  };
}

function classifyIntent(
  message
) {
  const language =
    normalizeConversationalInput(
      message
    );

  const interpretedMessage =
    language.canonicalText ||
    String(
      message ||
      ""
    );

  const normalized =
    normalizeText(
      interpretedMessage
    );

  if (!normalized) {
    return {
      primary:
        null,

      alternatives:
        [],

      confidence:
        0,

      confidenceLevel:
        "NONE"
    };
  }

  const ranked =
    Object
      .entries(
        INTENT_CATALOG
      )
      .map(
        (
          [
            code,
            definition
          ]
        ) =>
          scoreIntent(
            normalized,
            code,
            definition
          )
      )
      .sort(
        (a, b) =>
          b.score -
          a.score
      );

  const first =
    ranked[0] ||
    null;

  const second =
    ranked[1] ||
    null;

  if (!first) {
    return {
      primary:
        null,

      alternatives:
        [],

      confidence:
        0,

      confidenceLevel:
        "NONE"
    };
  }

  let confidence =
    first.score;

  /*
    Si hay mucha distancia respecto a
    la segunda opción, aumentamos
    ligeramente la seguridad.
  */

  if (
    second &&
    first.score -
      second.score >=
      0.20
  ) {
    confidence +=
      0.07;
  }

  confidence =
    Math.min(
      1,
      confidence
    );

  let confidenceLevel =
    "LOW";

  if (
    confidence >=
    0.78
  ) {
    confidenceLevel =
      "HIGH";
  }
  else if (
    confidence >=
    0.54
  ) {
    confidenceLevel =
      "MEDIUM";
  }

  /*
    Evitar adjudicar intención si
    realmente la similitud es mínima.
  */

  const primary =
    confidence >=
      0.30
      ? {
          code:
            first.code,

          family:
            first.family,

          matchedExample:
            first
              .matchedExample,

          score:
            Number(
              confidence.toFixed(
                4
              )
            )
        }
      : null;

  return {
    primary,

    alternatives:
      ranked
        .slice(1, 4)
        .filter(
          (item) =>
            item.score >=
              0.20
        )
        .map(
          (item) => ({
            code:
              item.code,

            family:
              item.family,

            score:
              item.score
          })
        ),

    confidence:
      Number(
        confidence.toFixed(
          4
        )
      ),

    confidenceLevel
  };
}

/* ========================================================================
   ESTRUCTURA DEL MENSAJE
======================================================================== */

function detectMessageShape(
  message
) {
  const text =
    normalizeText(
      message
    );

  const tokens =
    tokenize(
      text
    );

  const hasQuestion =
    /[?¿]/.test(
      String(
        message ||
        ""
      )
    ) ||
    /^(que|como|cuando|donde|cual|cuanto|por que|porque|tengo|hay)\b/.test(
      text
    );

  const numericOnly =
    /^[0-9\s.,$€%-]+$/.test(
      text
    );

  const veryShort =
    tokens.length <=
      3;

  const continuationWords = [
    "y",
    "entonces",
    "tambien",
    "ese",
    "esa",
    "eso",
    "otro",
    "otra",
    "primero",
    "segundo",
    "tercero",
    "mas",
    "menos",
    "mejor",
    "peor"
  ];

  const likelyContinuation =
    veryShort ||
    continuationWords.some(
      (word) =>
        text === word ||
        text.startsWith(
          `${word} `
        )
    ) ||
    numericOnly;

  return {
    tokenCount:
      tokens.length,

    hasQuestion,

    veryShort,

    numericOnly,

    likelyContinuation
  };
}

/* ========================================================================
   ANALISIS COMPLETO
======================================================================== */

function analyzeLunaMessage({
  message,
  previousTopic = null
} = {}) {
  const language =
    normalizeConversationalInput(
      message
    );

  const interpretedMessage =
    language.canonicalText ||
    String(
      message ||
      ""
    );

  const normalized =
    normalizeText(
      interpretedMessage
    );

  const classification =
    classifyIntent(
      interpretedMessage
    );

  const shape =
    detectMessageShape(
      message
    );

  /*
    Bloque 12 utilizará previousTopic
    para resolver referencias y continuidad
    de forma persistente.

    Aquí solamente marcamos la posibilidad.
  */

  const continuity = {
    likely:
      Boolean(
        shape
          .likelyContinuation &&
        previousTopic
      ),

    previousTopic:
      previousTopic ||
      null
  };

  return {
    version:
      VERSION,

    original:
      String(
        message ||
        ""
      ),

    normalized,

    interpreted:
      interpretedMessage,

    language: {
      changed:
        language.changed,

      correctionCount:
        language.correctionCount,

      corrections:
        language.corrections,

      confidence:
        language.linguisticConfidence
    },

    intent:
      classification
        .primary,

    alternatives:
      classification
        .alternatives,

    confidence:
      classification
        .confidence,

    confidenceLevel:
      classification
        .confidenceLevel,

    shape,

    continuity,

    requiresClarification:
      classification
        .confidenceLevel ===
        "LOW",

    generatedAt:
      new Date()
        .toISOString()
  };
}

/* ========================================================================
   PUBLIC API
======================================================================== */

function getSemanticCapabilities() {
  return {
    version:
      VERSION,

    externalAi:
      false,

    cost:
      0,

    capabilities: {
      phraseSimilarity:
        true,

      intentRanking:
        true,

      confidenceScoring:
        true,

      alternativeIntents:
        true,

      continuationDetection:
        true,

      messageShape:
        true,

      typoCorrection:
        false,

      persistentContext:
        false,

      intelligentFallback:
        false
    },

    upcoming: {
      typoCorrection:
        "BLOCK_11",

      persistentContext:
        "BLOCK_12",

      marketplaceGuidance:
        "BLOCK_13",

      intelligentFallback:
        "BLOCK_14"
    }
  };
}

module.exports = {
  VERSION,
  INTENT_CATALOG,

  normalizeText,
  tokenize,
  meaningfulTokens,

  diceSimilarity,
  jaccardSimilarity,
  comparePhrases,

  classifyIntent,
  detectMessageShape,
  analyzeLunaMessage,

  getSemanticCapabilities
};
