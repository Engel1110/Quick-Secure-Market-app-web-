"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA LANGUAGE NORMALIZER
|--------------------------------------------------------------------------
| FASE 17 BLOQUE 11 FIX RESTORE
|--------------------------------------------------------------------------
*/

const VERSION =
  "LUNA-LANGUAGE-17.11-FIX";

function normalizeBasic(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9ñ\s$€%./-]/gi,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

const DOMAIN_ALIASES =
  Object.freeze({

    iphone: [
      "aifon",
      "ayfon",
      "ifon",
      "iphon",
      "iphone",
      "iphne"
    ],

    laptop: [
      "lapto",
      "lapt",
      "laptop",
      "portatil",
      "notebook"
    ],

    celular: [
      "cel",
      "cell",
      "celu",
      "celular",
      "telefono",
      "smartphone",
      "movil"
    ],

    playstation: [
      "play",
      "pley",
      "playstation",
      "ps"
    ],

    "playstation 5": [
      "ps5",
      "play 5",
      "playstation5",
      "playstation 5"
    ],

    computadora: [
      "computadora",
      "computador",
      "pc",
      "ordenador"
    ],

    television: [
      "television",
      "televisor",
      "tv"
    ],

    audifonos: [
      "audifono",
      "audifonos",
      "auricular",
      "auriculares",
      "headset"
    ],

    compra: [
      "compra",
      "conpra",
      "compr",
      "compre",
      "comprado"
    ],

    compras: [
      "compras",
      "conpras"
    ],

    pedido: [
      "pedido",
      "pedio",
      "pedidoo",
      "orden"
    ],

    pedidos: [
      "pedidos",
      "ordenes"
    ],

    venta: [
      "venta",
      "benta",
      "vendido"
    ],

    ventas: [
      "ventas",
      "bentas"
    ],

    confianza: [
      "confianza",
      "confiansa",
      "trust",
      "score",
      "puntuacion",
      "reputacion"
    ],

    verificado: [
      "verificado",
      "verificao",
      "verificada",
      "verified"
    ],

    disputa: [
      "disputa",
      "disput",
      "reclamo"
    ],

    disputas: [
      "disputas",
      "reclamos"
    ],

    mensaje: [
      "mensaje",
      "mensage",
      "msj"
    ],

    mensajes: [
      "mensajes",
      "mensages"
    ],

    barato: [
      "barato",
      "economico",
      "economica"
    ],

    presupuesto: [
      "presupuesto",
      "presupesto",
      "presup",
      "budget"
    ],

    almacenamiento: [
      "almacenamiento",
      "memoria",
      "storage"
    ],

    procesador: [
      "procesador",
      "cpu",
      "processor"
    ],

    seguridad: [
      "seguridad",
      "seguro",
      "riesgo",
      "fraude"
    ]
  });

const PHRASE_ALIASES =
  Object.freeze([
    {
      patterns: [
        "que he comprado",
        "que compre",
        "lo que compre",
        "cosas que compre"
      ],

      replacement:
        "mis compras"
    },

    {
      patterns: [
        "como van mis pedidos",
        "como estan mis pedidos",
        "estado de mis pedidos"
      ],

      replacement:
        "mis compras"
    },

    {
      patterns: [
        "que he vendido",
        "lo que vendi",
        "cosas que vendi"
      ],

      replacement:
        "mis ventas"
    },

    {
      patterns: [
        "tengo algun reclamo",
        "tengo reclamos",
        "hay algun reclamo"
      ],

      replacement:
        "tengo disputas"
    },

    {
      patterns: [
        "mi puntuacion qsm",
        "mi score qsm",
        "mi reputacion qsm"
      ],

      replacement:
        "mi confianza qsm"
    },

    {
      patterns: [
        "quiero gastar menos",
        "algo mas economico",
        "uno economico"
      ],

      replacement:
        "quiero uno mas barato"
    }
  ]);

function levenshtein(
  left,
  right
) {
  const a =
    normalizeBasic(left);

  const b =
    normalizeBasic(right);

  if (a === b) {
    return 0;
  }

  if (!a.length) {
    return b.length;
  }

  if (!b.length) {
    return a.length;
  }

  const previous =
    Array.from(
      {
        length:
          b.length + 1
      },
      (_, index) =>
        index
    );

  const current =
    new Array(
      b.length + 1
    );

  for (
    let i = 1;
    i <= a.length;
    i += 1
  ) {
    current[0] =
      i;

    for (
      let j = 1;
      j <= b.length;
      j += 1
    ) {
      const cost =
        a[i - 1] ===
        b[j - 1]
          ? 0
          : 1;

      current[j] =
        Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] +
            cost
        );
    }

    for (
      let j = 0;
      j <= b.length;
      j += 1
    ) {
      previous[j] =
        current[j];
    }
  }

  return previous[
    b.length
  ];
}

function spellingSimilarity(
  left,
  right
) {
  const a =
    normalizeBasic(left);

  const b =
    normalizeBasic(right);

  const maximum =
    Math.max(
      a.length,
      b.length
    );

  if (!maximum) {
    return 1;
  }

  return Math.max(
    0,
    1 -
      (
        levenshtein(
          a,
          b
        ) /
        maximum
      )
  );
}

const ALIAS_LOOKUP =
  (() => {
    const result =
      new Map();

    Object
      .entries(
        DOMAIN_ALIASES
      )
      .forEach(
        (
          [
            canonical,
            aliases
          ]
        ) => {
          result.set(
            normalizeBasic(
              canonical
            ),
            canonical
          );

          aliases.forEach(
            (alias) => {
              result.set(
                normalizeBasic(
                  alias
                ),
                canonical
              );
            }
          );
        }
      );

    return result;
  })();

const VOCABULARY =
  Array.from(
    new Set([
      ...ALIAS_LOOKUP.keys(),
      ...Object.keys(
        DOMAIN_ALIASES
      ).map(
        normalizeBasic
      )
    ])
  );

function findApproximateTerm(
  token
) {
  const normalized =
    normalizeBasic(
      token
    );

  if (
    !normalized ||
    normalized.length < 3
  ) {
    return null;
  }

  const direct =
    ALIAS_LOOKUP.get(
      normalized
    );

  if (direct) {
    return {
      original:
        token,

      canonical:
        direct,

      confidence:
        1,

      method:
        "ALIAS"
    };
  }

  let best =
    null;

  for (
    const candidate
    of VOCABULARY
  ) {
    if (
      Math.abs(
        candidate.length -
        normalized.length
      ) > 2
    ) {
      continue;
    }

    const similarity =
      spellingSimilarity(
        normalized,
        candidate
      );

    if (
      !best ||
      similarity >
        best.similarity
    ) {
      best = {
        candidate,
        similarity
      };
    }
  }

  if (!best) {
    return null;
  }

  const threshold =
    normalized.length <= 4
      ? 0.75
      : 0.72;

  if (
    best.similarity <
    threshold
  ) {
    return null;
  }

  const canonical =
    ALIAS_LOOKUP.get(
      best.candidate
    ) ||
    best.candidate;

  return {
    original:
      token,

    canonical,

    confidence:
      Number(
        best.similarity
          .toFixed(4)
      ),

    method:
      "FUZZY"
  };
}

function normalizeTokens(
  text
) {
  const tokens =
    normalizeBasic(text)
      .split(" ")
      .filter(Boolean);

  const corrections = [];

  const output =
    tokens.map(
      (token) => {
        const match =
          findApproximateTerm(
            token
          );

        if (
          !match ||
          normalizeBasic(
            match.canonical
          ) ===
          normalizeBasic(
            token
          )
        ) {
          return token;
        }

        corrections.push(
          match
        );

        return match
          .canonical;
      }
    );

  return {
    text:
      output
        .join(" ")
        .replace(
          /\s+/g,
          " "
        )
        .trim(),

    corrections
  };
}

function applyPhraseAliases(
  value
) {
  let text =
    normalizeBasic(
      value
    );

  const transformations = [];

  for (
    const definition
    of PHRASE_ALIASES
  ) {
    for (
      const pattern
      of definition.patterns
    ) {
      const normalizedPattern =
        normalizeBasic(
          pattern
        );

      if (
        text.includes(
          normalizedPattern
        )
      ) {
        transformations.push({
          original:
            normalizedPattern,

          canonical:
            definition.replacement,

          method:
            "PHRASE_ALIAS"
        });

        text =
          text.replace(
            normalizedPattern,
            definition.replacement
          );

        break;
      }
    }
  }

  return {
    text:
      text
        .replace(
          /\s+/g,
          " "
        )
        .trim(),

    transformations
  };
}


/*
| QSM_FASE17_BLOCK11_FIX3_FINAL_PHRASES
*/

function normalizeFinalConversationPhrase(
  value
) {
  let text =
    normalizeBasic(
      value
    );

  const rules = [
    /*
      Compras
    */
    [
      /\bcuanta\s+compra\s+tengo\b/g,
      "cuantas compras tengo"
    ],

    [
      /\bcuanto\s+compra\s+tengo\b/g,
      "cuantas compras tengo"
    ],

    [
      /\bcuanta\s+compras\s+tengo\b/g,
      "cuantas compras tengo"
    ],

    [
      /\bcuantas\s+compra\s+tengo\b/g,
      "cuantas compras tengo"
    ],

    [
      /\bque\s+compra\s+tengo\b/g,
      "que compras tengo"
    ],

    [
      /\btengo\s+compra\s+pendiente\b/g,
      "tengo compras pendientes"
    ],

    /*
      Disputas / reclamos
    */
    [
      /\btengo\s+algun\s+disputa\b/g,
      "tengo disputas"
    ],

    [
      /\btengo\s+alguna\s+disputa\b/g,
      "tengo disputas"
    ],

    [
      /\bhay\s+algun\s+disputa\b/g,
      "hay alguna disputa"
    ],

    [
      /\btengo\s+algun\s+reclamo\b/g,
      "tengo disputas"
    ],

    [
      /\btengo\s+alguna\s+reclamo\b/g,
      "tengo disputas"
    ],

    /*
      Ventas
    */
    [
      /\bcuanta\s+venta\s+tengo\b/g,
      "cuantas ventas tengo"
    ],

    [
      /\bcuanto\s+venta\s+tengo\b/g,
      "cuantas ventas tengo"
    ],

    /*
      Mensajes
    */
    [
      /\bcuanto\s+mensaje\s+tengo\b/g,
      "cuantos mensajes tengo"
    ]
  ];

  for (
    const [
      pattern,
      replacement
    ]
    of rules
  ) {
    text =
      text.replace(
        pattern,
        replacement
      );
  }

  return text
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function normalizeConversationalInput(
  input
) {
  const original =
    String(
      input || ""
    );

  const basic =
    normalizeBasic(
      original
    );

  const tokenResult =
    normalizeTokens(
      basic
    );

  const phraseResult =
    applyPhraseAliases(
      tokenResult.text
    );

  const corrections = [
    ...tokenResult.corrections,
    ...phraseResult.transformations
  ];

  /*
    FIX 3:
    corregimos también la estructura completa
    después de corregir tokens individuales.
  */

  const finalText =
    normalizeFinalConversationPhrase(
      phraseResult.text
    );

  const changed =
    normalizeBasic(
      original
    ) !==
    normalizeBasic(
      finalText
    );

  const fuzzyScores =
    corrections
      .filter(
        (item) =>
          item.method ===
          "FUZZY"
      )
      .map(
        (item) =>
          Number(
            item.confidence
          )
      )
      .filter(
        Number.isFinite
      );

  const linguisticConfidence =
    fuzzyScores.length
      ? Math.min(
          ...fuzzyScores
        )
      : 1;

  return {
    version:
      VERSION,

    original,

    normalized:
      basic,

    canonicalText:
      finalText,

    changed,

    corrections,

    correctionCount:
      corrections.length,

    linguisticConfidence:
      Number(
        linguisticConfidence
          .toFixed(4)
      )
  };
}

module.exports = {
  VERSION,
  DOMAIN_ALIASES,
  PHRASE_ALIASES,

  normalizeBasic,
  levenshtein,
  spellingSimilarity,
  findApproximateTerm,
  normalizeConversationalInput
};
