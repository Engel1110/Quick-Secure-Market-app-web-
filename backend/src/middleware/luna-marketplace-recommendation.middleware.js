"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA MARKETPLACE RECOMMENDATION ENGINE
|--------------------------------------------------------------------------
| Fase 17 Bloque 7
|
| Compara y recomienda productos REALES del Marketplace.
|
| Criterios:
| - QSM Verified
| - vendedor verificado
| - Trust Score
| - Confidence Score
| - precio
|
| Gemini sigue completamente apagado.
|--------------------------------------------------------------------------
*/

const prisma =
  require("../utils/prisma");

const {
  detectMarketplaceIntent,
  extractMarketplaceQuery,
  expandSearchTerms
} = require(
  "./luna-marketplace-search.middleware"
);

const VERSION =
  "LUNA-RECOMMENDATION-17.7";

const MAX_SCAN =
  60;

const MAX_COMPARE =
  3;

/* ========================================================================
   TEXTO
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
      /[¿?¡!,.;:()[\]{}]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function formatMoney(value) {
  const amount =
    Number(value);

  if (!Number.isFinite(amount)) {
    return null;
  }

  return new Intl.NumberFormat(
    "es-DO",
    {
      style: "currency",
      currency: "DOP",
      maximumFractionDigits: 0
    }
  ).format(amount);
}

/* ========================================================================
   DETECCIÓN DE INTENCIÓN
======================================================================== */

function detectRecommendationIntent(
  message
) {
  const text =
    normalizeText(message);

  if (!text) {
    return null;
  }

  if (
    [
      "mas barato",
      "más barato",
      "menor precio",
      "el barato",
      "la barata"
    ].some(
      (value) =>
        text.includes(
          normalizeText(value)
        )
    )
  ) {
    return "CHEAPEST";
  }

  if (
    [
      "mas confiable",
      "más confiable",
      "mejor vendedor",
      "vendedor mas confiable",
      "vendedor más confiable",
      "mayor confianza",
      "mas seguro",
      "más seguro"
    ].some(
      (value) =>
        text.includes(
          normalizeText(value)
        )
    )
  ) {
    return "MOST_TRUSTED";
  }

  if (
    [
      "comparame",
      "compárame",
      "comparar",
      "compara los",
      "comparalos",
      "compáralos",
      "diferencia entre"
    ].some(
      (value) =>
        text.includes(
          normalizeText(value)
        )
    )
  ) {
    return "COMPARE";
  }

  if (
    [
      "cual me recomiendas",
      "cuál me recomiendas",
      "que me recomiendas",
      "qué me recomiendas",
      "cual elegirias",
      "cuál elegirías",
      "cual escogerias",
      "cuál escogerías",
      "mejor opcion",
      "mejor opción",
      "el mejor",
      "la mejor",
      "recomiendame",
      "recomiéndame"
    ].some(
      (value) =>
        text.includes(
          normalizeText(value)
        )
    )
  ) {
    return "BEST";
  }

  return null;
}

/* ========================================================================
   RECUPERAR BÚSQUEDA ANTERIOR DE LA CONVERSACIÓN
======================================================================== */

function extractConversationMessages(
  req
) {
  const possible = [
    req?.body?.conversation,
    req?.body?.history,
    req?.body?.context?.conversation,
    req?.body?.context?.recentMessages
  ];

  const result = [];

  possible.forEach(
    (collection) => {
      if (!Array.isArray(collection)) {
        return;
      }

      collection.forEach(
        (item) => {
          const role =
            String(
              item?.role ||
              item?.sender ||
              ""
            ).toLowerCase();

          const content =
            String(
              item?.content ||
              item?.text ||
              item?.message ||
              ""
            ).trim();

          if (content) {
            result.push({
              role,
              content
            });
          }
        }
      );
    }
  );

  return result;
}

function findPreviousMarketplaceQuery(
  req
) {
  const messages =
    extractConversationMessages(req);

  for (
    let index =
      messages.length - 1;
    index >= 0;
    index -= 1
  ) {
    const item =
      messages[index];

    if (
      item.role &&
      item.role !== "user"
    ) {
      continue;
    }

    if (
      detectMarketplaceIntent(
        item.content
      )
    ) {
      const query =
        extractMarketplaceQuery(
          item.content
        );

      if (query) {
        return query;
      }
    }
  }

  return null;
}

/* ========================================================================
   QUERY DESDE LA PREGUNTA ACTUAL
======================================================================== */

function extractDirectRecommendationQuery(
  message
) {
  let text =
    normalizeText(message);

  const removals = [
    /^luna\s+/,
    /^recomiendame\s+/,
    /^recomienda\s+/,
    /^cual es el mejor\s+/,
    /^cual es la mejor\s+/,
    /^cual me recomiendas\s+/,
    /^que me recomiendas\s+/,
    /^quiero el mejor\s+/,
    /^quiero la mejor\s+/
  ];

  removals.forEach(
    (pattern) => {
      text =
        text.replace(
          pattern,
          ""
        );
    }
  );

  text =
    text
      .replace(
        /^(un|una|el|la)\s+/,
        ""
      )
      .replace(
        /\s+(disponible|disponibles|en qsm|del marketplace)$/,
        ""
      )
      .trim();

  /*
    Una frase como "¿cuál me recomiendas?"
    no contiene un producto.
  */
  if (
    !text ||
    [
      "me recomiendas",
      "recomiendas",
      "mejor",
      "mas barato",
      "mas confiable"
    ].includes(text)
  ) {
    return null;
  }

  return text;
}

/* ========================================================================
   CONSULTA REAL
======================================================================== */

async function searchProducts(
  query
) {
  const terms =
    expandSearchTerms(query);

  if (!terms.length) {
    return [];
  }

  const searchConditions =
    terms.flatMap(
      (term) => [
        {
          title: {
            contains: term,
            mode: "insensitive"
          }
        },

        {
          brand: {
            contains: term,
            mode: "insensitive"
          }
        },

        {
          model: {
            contains: term,
            mode: "insensitive"
          }
        },

        {
          category: {
            contains: term,
            mode: "insensitive"
          }
        },

        {
          description: {
            contains: term,
            mode: "insensitive"
          }
        }
      ]
    );

  return prisma.product.findMany({
    where: {
      status:
        "ACTIVE",

      deletedAt:
        null,

      OR:
        searchConditions
    },

    take:
      MAX_SCAN,

    orderBy: {
      createdAt:
        "desc"
    },

    select: {
      id:
        true,

      qsmCode:
        true,

      title:
        true,

      price:
        true,

      brand:
        true,

      model:
        true,

      category:
        true,

      condition:
        true,

      quality:
        true,

      storageCapacity:
        true,

      location:
        true,

      warranty:
        true,

      certified:
        true,

      isQsmVerified:
        true,

      verificationStatus:
        true,

      riskLevel:
        true,

      riskScore:
        true,

      publicationScore:
        true,

      confidenceScore:
        true,

      seller: {
        select: {
          id:
            true,

          firstName:
            true,

          lastName:
            true,

          trustScore:
            true,

          isVerified:
            true,

          verificationStatus:
            true,

          status:
            true
        }
      }
    }
  });
}

/* ========================================================================
   PUNTUACIONES
======================================================================== */

function getSellerTrust(
  product
) {
  const value =
    Number(
      product
        ?.seller
        ?.trustScore
    );

  return Number.isFinite(value)
    ? value
    : 0;
}

function getProductConfidence(
  product
) {
  const value =
    Number(
      product
        ?.confidenceScore
    );

  return Number.isFinite(value)
    ? value
    : 0;
}

function isVerifiedSeller(
  product
) {
  return Boolean(
    product
      ?.seller
      ?.isVerified
  ) ||
  String(
    product
      ?.seller
      ?.verificationStatus ||
    ""
  ).toUpperCase() ===
    "APPROVED";
}

function isVerifiedProduct(
  product
) {
  return Boolean(
    product?.isQsmVerified
  ) ||
  Boolean(
    product?.certified
  ) ||
  String(
    product
      ?.verificationStatus ||
    ""
  ).toUpperCase() ===
    "APPROVED";
}

function calculateRecommendationScore(
  product
) {
  let score = 0;

  if (
    isVerifiedProduct(
      product
    )
  ) {
    score += 35;
  }

  if (
    isVerifiedSeller(
      product
    )
  ) {
    score += 25;
  }

  score +=
    Math.min(
      25,
      getSellerTrust(
        product
      ) * 0.25
    );

  score +=
    Math.min(
      10,
      getProductConfidence(
        product
      ) * 0.1
    );

  const risk =
    String(
      product?.riskLevel ||
      ""
    ).toUpperCase();

  if (
    risk === "LOW"
  ) {
    score += 5;
  } else if (
    [
      "HIGH",
      "CRITICAL"
    ].includes(risk)
  ) {
    score -= 20;
  }

  return Number(
    score.toFixed(2)
  );
}

/* ========================================================================
   RANKINGS
======================================================================== */

function rankBest(
  products
) {
  return [...products]
    .map(
      (product) => ({
        ...product,

        lunaRecommendationScore:
          calculateRecommendationScore(
            product
          )
      })
    )
    .sort(
      (a, b) => {
        const scoreDifference =
          b.lunaRecommendationScore -
          a.lunaRecommendationScore;

        if (scoreDifference !== 0) {
          return scoreDifference;
        }

        return (
          Number(a.price || Infinity) -
          Number(b.price || Infinity)
        );
      }
    );
}

function rankCheapest(
  products
) {
  return [...products]
    .filter(
      (product) =>
        Number.isFinite(
          Number(
            product.price
          )
        )
    )
    .sort(
      (a, b) =>
        Number(a.price) -
        Number(b.price)
    );
}

function rankTrusted(
  products
) {
  return [...products]
    .sort(
      (a, b) => {
        if (
          isVerifiedSeller(a) !==
          isVerifiedSeller(b)
        ) {
          return (
            Number(
              isVerifiedSeller(b)
            ) -
            Number(
              isVerifiedSeller(a)
            )
          );
        }

        return (
          getSellerTrust(b) -
          getSellerTrust(a)
        );
      }
    );
}

/* ========================================================================
   SERIALIZAR
======================================================================== */

function serializeProduct(
  product
) {
  return {
    id:
      product.id,

    qsmCode:
      product.qsmCode,

    title:
      product.title,

    brand:
      product.brand,

    model:
      product.model,

    price:
      product.price,

    condition:
      product.condition,

    qsmVerified:
      isVerifiedProduct(
        product
      ),

    confidenceScore:
      getProductConfidence(
        product
      ),

    riskLevel:
      product.riskLevel,

    seller: {
      id:
        product
          ?.seller
          ?.id,

      name:
        [
          product
            ?.seller
            ?.firstName,

          product
            ?.seller
            ?.lastName
        ]
          .filter(Boolean)
          .join(" "),

      verified:
        isVerifiedSeller(
          product
        ),

      trustScore:
        getSellerTrust(
          product
        )
    },

    lunaRecommendationScore:
      product
        .lunaRecommendationScore ??
      calculateRecommendationScore(
        product
      )
  };
}

/* ========================================================================
   RESPUESTAS
======================================================================== */

function describeSecurity(
  product
) {
  const parts = [];

  if (
    isVerifiedProduct(
      product
    )
  ) {
    parts.push(
      "producto verificado por QSM"
    );
  }

  if (
    isVerifiedSeller(
      product
    )
  ) {
    parts.push(
      "vendedor verificado"
    );
  }

  const trust =
    getSellerTrust(
      product
    );

  if (trust > 0) {
    parts.push(
      `confianza ${trust}/100`
    );
  }

  return parts;
}

function buildBestAnswer(
  query,
  products
) {
  const ranked =
    rankBest(products);

  const best =
    ranked[0];

  if (!best) {
    return null;
  }

  let answer =
    `De las opciones de ${query} que encontré en QSM, yo priorizaría "${best.title}"`;

  const price =
    formatMoney(
      best.price
    );

  if (price) {
    answer +=
      ` por ${price}`;
  }

  const security =
    describeSecurity(
      best
    );

  if (security.length) {
    answer +=
      `: tiene ${security.join(", ")}`;
  }

  answer += ".";

  if (
    ranked.length > 1
  ) {
    answer +=
      ` También comparé ${ranked.length} opciones disponibles antes de darte esa recomendación.`;
  }

  answer +=
    " Esta recomendación se basa únicamente en los datos internos de QSM, no en información externa.";

  return {
    answer,
    products:
      ranked
        .slice(
          0,
          MAX_COMPARE
        )
        .map(
          serializeProduct
        )
  };
}

function buildCheapestAnswer(
  query,
  products
) {
  const ranked =
    rankCheapest(products);

  const cheapest =
    ranked[0];

  if (!cheapest) {
    return null;
  }

  const price =
    formatMoney(
      cheapest.price
    );

  let answer =
    `La opción más económica de ${query} que encontré es "${cheapest.title}"`;

  if (price) {
    answer +=
      ` por ${price}`;
  }

  const trust =
    getSellerTrust(
      cheapest
    );

  if (trust > 0) {
    answer +=
      `. El vendedor tiene ${trust}/100 de confianza`;
  }

  if (
    isVerifiedSeller(
      cheapest
    )
  ) {
    answer +=
      " y está verificado";
  }

  answer += ".";

  return {
    answer,

    products: [
      serializeProduct(
        cheapest
      )
    ]
  };
}

function buildTrustedAnswer(
  query,
  products
) {
  const ranked =
    rankTrusted(products);

  const best =
    ranked[0];

  if (!best) {
    return null;
  }

  const trust =
    getSellerTrust(best);

  let answer =
    `La opción de ${query} con el vendedor que considero más confiable es "${best.title}".`;

  if (trust > 0) {
    answer +=
      ` Ese vendedor tiene ${trust}/100 de confianza`;
  }

  if (
    isVerifiedSeller(
      best
    )
  ) {
    answer +=
      " y además está verificado";
  }

  const price =
    formatMoney(
      best.price
    );

  if (price) {
    answer +=
      `. El producto está publicado por ${price}`;
  }

  answer += ".";

  return {
    answer,

    products:
      ranked
        .slice(
          0,
          MAX_COMPARE
        )
        .map(
          serializeProduct
        )
  };
}

function buildCompareAnswer(
  query,
  products
) {
  const ranked =
    rankBest(products)
      .slice(
        0,
        MAX_COMPARE
      );

  if (!ranked.length) {
    return null;
  }

  let answer =
    `Comparé las mejores opciones de ${query} disponibles en QSM: `;

  answer +=
    ranked
      .map(
        (
          product,
          index
        ) => {
          const price =
            formatMoney(
              product.price
            ) ||
            "precio no disponible";

          const trust =
            getSellerTrust(
              product
            );

          return (
            `${index + 1}) ${product.title}, ${price}, ` +
            `confianza del vendedor ${trust}/100` +
            (
              isVerifiedSeller(
                product
              )
                ? ", vendedor verificado"
                : ""
            )
          );
        }
      )
      .join("; ");

  answer +=
    ". Para una compra más segura, yo priorizaría la primera opción de la lista.";

  return {
    answer,

    products:
      ranked.map(
        serializeProduct
      )
  };
}

/* ========================================================================
   HTTP
======================================================================== */

function sendRecommendationResponse({
  req,
  res,
  intent,
  query,
  result,
  total
}) {
  return res
    .status(200)
    .json({
      success:
        true,

      assistant:
        "LUNA",

      provider:
        "QSM_RECOMMENDATION_ENGINE",

      model:
        VERSION,

      answer:
        result.answer,

      response:
        result.answer,

      contextual:
        true,

      result: {
        assistant:
          "LUNA",

        authenticated:
          Boolean(
            req?.user ||
            req?.prismaUser
          ),

        intent: {
          code:
            `MARKETPLACE_${intent}`,

          matches: [
            query
          ],

          confidence:
            100
        },

        message:
          result.answer,

        recommendation: {
          query,

          mode:
            intent,

          totalCandidates:
            total,

          products:
            result.products
        },

        context: {
          memory:
            req
              ?.body
              ?.context
              ?.memory ||
            null
        },

        contextLoaded:
          true,

        memoryEnabled:
          true,

        generatedAt:
          new Date()
            .toISOString(),

        version:
          VERSION
      }
    });
}

/* ========================================================================
   MIDDLEWARE
======================================================================== */

async function lunaMarketplaceRecommendation(
  req,
  res,
  next
) {
  const message =
    String(
      req
        ?.body
        ?.message ||
      ""
    ).trim();

  const intent =
    detectRecommendationIntent(
      message
    );

  if (!intent) {
    return next();
  }

  /*
    Primero buscamos producto explícito
    en la pregunta actual.
  */
  let query =
    extractDirectRecommendationQuery(
      message
    );

  /*
    Si es un follow-up:
    "¿cuál me recomiendas?"
    usamos la búsqueda anterior.
  */
  if (!query) {
    query =
      findPreviousMarketplaceQuery(
        req
      );
  }

  /*
    Si no tenemos contexto de producto,
    no secuestramos la conversación.
    En Etapa 2 podrá entrar Gemini.
  */
  if (!query) {
    console.log(
      `[LUNA RECOMMENDATION] Sin contexto de Marketplace para "${message}"`
    );

    return next();
  }

  try {
    console.log(
      `[LUNA RECOMMENDATION] ${intent} | QUERY="${query}"`
    );

    const products =
      await searchProducts(
        query
      );

    if (!products.length) {
      return next();
    }

    let result =
      null;

    switch (intent) {
      case "CHEAPEST":
        result =
          buildCheapestAnswer(
            query,
            products
          );
        break;

      case "MOST_TRUSTED":
        result =
          buildTrustedAnswer(
            query,
            products
          );
        break;

      case "COMPARE":
        result =
          buildCompareAnswer(
            query,
            products
          );
        break;

      case "BEST":
      default:
        result =
          buildBestAnswer(
            query,
            products
          );
        break;
    }

    if (!result) {
      return next();
    }

    console.log(
      `[LUNA RECOMMENDATION] RESPONDIDO | candidatos=${products.length}`
    );

    return sendRecommendationResponse({
      req,
      res,
      intent,
      query,
      result,
      total:
        products.length
    });
  } catch (error) {
    console.error(
      "[LUNA RECOMMENDATION][ERROR]",
      {
        name:
          error?.name,

        message:
          error?.message,

        code:
          error?.code,

        meta:
          error?.meta
      }
    );

    /*
      Nunca romper LUNA.
    */
    return next();
  }
}

module.exports = {
  lunaMarketplaceRecommendation,
  detectRecommendationIntent,
  findPreviousMarketplaceQuery,
  calculateRecommendationScore,
  rankBest,
  rankCheapest,
  rankTrusted
};
