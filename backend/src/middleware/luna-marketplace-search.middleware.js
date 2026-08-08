"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA MARKETPLACE SEARCH ENGINE
|--------------------------------------------------------------------------
| Fase 17 Bloque 6
|
| Convierte lenguaje natural del usuario en búsquedas reales
| dentro del Marketplace QSM.
|
| NO usa Gemini.
| NO consulta Internet.
| NO inventa inventario.
|--------------------------------------------------------------------------
*/

const prisma =
  require("../utils/prisma");

const VERSION =
  "LUNA-MARKETPLACE-17.6";

const MAX_SCAN =
  80;

const MAX_RESULTS =
  5;

/* ========================================================================
   TEXTO
======================================================================== */

function normalizeText(
  value
) {
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

function titleCase(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .split(/\s+/)
    .map(
      (word) =>
        word
          ? word.charAt(0)
              .toUpperCase() +
            word.slice(1)
          : ""
    )
    .join(" ");
}

/* ========================================================================
   DETECTAR PETICIÓN DE MARKETPLACE
======================================================================== */

const MARKETPLACE_PHRASES = [
  "quiero un ",
  "quiero una ",
  "quiero comprar ",
  "quiero conseguir ",
  "busco un ",
  "busco una ",
  "estoy buscando ",
  "tienen ",
  "tienes ",
  "hay ",
  "tienen disponible ",
  "tienen disponibles ",
  "que tienen de ",
  "que hay de ",
  "que productos tienen ",
  "que productos hay ",
  "muestrame ",
  "muéstrame ",
  "ensenarme ",
  "enseñame ",
  "necesito un ",
  "necesito una "
];

const MARKETPLACE_HINTS = [
  "iphone",
  "samsung",
  "xiaomi",
  "motorola",
  "pixel",
  "telefono",
  "celular",
  "smartphone",
  "laptop",
  "computadora",
  "monitor",
  "tablet",
  "ipad",
  "macbook",
  "playstation",
  "ps5",
  "xbox",
  "nintendo",
  "televisor",
  "tv",
  "audifono",
  "audifonos",
  "airpods",
  "reloj",
  "smartwatch",
  "carro",
  "vehiculo",
  "motor",
  "ssd",
  "disco",
  "ram",
  "gpu",
  "tarjeta grafica"
];

function detectMarketplaceIntent(
  message
) {
  const text =
    normalizeText(
      message
    );

  if (!text) {
    return false;
  }

  const phraseMatch =
    MARKETPLACE_PHRASES.some(
      (phrase) =>
        text.includes(
          normalizeText(
            phrase
          )
        )
    );

  const productMatch =
    MARKETPLACE_HINTS.some(
      (hint) =>
        text.includes(
          hint
        )
    );

  /*
    Evitar apropiarse de preguntas generales
    que en Etapa 2 pertenecerán a Gemini.
  */
  const externalKnowledgeOnly =
    (
      text.startsWith(
        "que es "
      ) ||
      text.startsWith(
        "para que sirve "
      ) ||
      text.startsWith(
        "es bueno "
      ) ||
      text.startsWith(
        "es buena "
      )
    ) &&
    !phraseMatch;

  if (externalKnowledgeOnly) {
    return false;
  }

  return (
    phraseMatch ||
    (
      productMatch &&
      (
        text.includes(
          "disponible"
        ) ||
        text.includes(
          "marketplace"
        ) ||
        text.includes(
          "qsm"
        )
      )
    )
  );
}

/* ========================================================================
   EXTRAER LO QUE EL USUARIO BUSCA
======================================================================== */

const REMOVE_PATTERNS = [
  /^luna\s+/,
  /^por favor\s+/,

  /^quiero comprar\s+/,
  /^quiero conseguir\s+/,
  /^quiero un\s+/,
  /^quiero una\s+/,

  /^busco un\s+/,
  /^busco una\s+/,
  /^estoy buscando\s+/,

  /^necesito un\s+/,
  /^necesito una\s+/,

  /^tienen disponibles\s+/,
  /^tienen disponible\s+/,
  /^tienen\s+/,
  /^tienes\s+/,
  /^hay\s+/,

  /^que productos tienen\s+/,
  /^que productos hay\s+/,
  /^que tienen de\s+/,
  /^que hay de\s+/,

  /^muestrame\s+/,
  /^ensename\s+/
];

const TRAILING_PATTERNS = [
  /\s+en qsm$/,
  /\s+en el marketplace$/,
  /\s+disponible$/,
  /\s+disponibles$/,
  /\s+para comprar$/,
  /\s+por favor$/
];

function extractMarketplaceQuery(
  message
) {
  let text =
    normalizeText(
      message
    );

  for (
    const pattern
    of REMOVE_PATTERNS
  ) {
    text =
      text.replace(
        pattern,
        ""
      );
  }

  for (
    const pattern
    of TRAILING_PATTERNS
  ) {
    text =
      text.replace(
        pattern,
        ""
      );
  }

  text =
    text
      .replace(
        /\buno\b$/,
        ""
      )
      .trim();

  return text;
}

/* ========================================================================
   SINÓNIMOS CONTROLADOS
======================================================================== */

function expandSearchTerms(
  query
) {
  const original =
    normalizeText(
      query
    );

  const terms =
    new Set([
      original
    ]);

  const synonyms = {
    celular: [
      "telefono",
      "smartphone"
    ],

    telefono: [
      "celular",
      "smartphone"
    ],

    computadora: [
      "pc",
      "laptop"
    ],

    laptop: [
      "notebook",
      "portatil"
    ],

    television: [
      "televisor",
      "tv"
    ],

    televisor: [
      "tv",
      "television"
    ],

    audifonos: [
      "auriculares",
      "headset"
    ],

    ps5: [
      "playstation 5",
      "playstation"
    ]
  };

  Object.entries(
    synonyms
  ).forEach(
    ([key, values]) => {
      if (
        original.includes(
          key
        )
      ) {
        values.forEach(
          (value) =>
            terms.add(
              value
            )
        );
      }
    }
  );

  return Array
    .from(terms)
    .filter(Boolean)
    .slice(0, 6);
}

/* ========================================================================
   CONSULTA POSTGRESQL
======================================================================== */

async function searchMarketplace(
  query
) {
  const terms =
    expandSearchTerms(
      query
    );

  if (
    terms.length === 0
  ) {
    return [];
  }

  const whereTerms =
    terms.flatMap(
      (term) => [
        {
          title: {
            contains:
              term,

            mode:
              "insensitive"
          }
        },

        {
          brand: {
            contains:
              term,

            mode:
              "insensitive"
          }
        },

        {
          model: {
            contains:
              term,

            mode:
              "insensitive"
          }
        },

        {
          category: {
            contains:
              term,

            mode:
              "insensitive"
          }
        },

        {
          description: {
            contains:
              term,

            mode:
              "insensitive"
          }
        }
      ]
    );

  const products =
    await prisma.product.findMany({
      where: {
        status:
          "ACTIVE",

        deletedAt:
          null,

        OR:
          whereTerms
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

        title:
          true,

        price:
          true,

        category:
          true,

        condition:
          true,

        quality:
          true,

        brand:
          true,

        model:
          true,

        storageCapacity:
          true,

        location:
          true,

        warranty:
          true,

        qsmCode:
          true,

        status:
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

        createdAt:
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

  /*
    QSM Verified + vendedor verificado + trust score
    tienen prioridad en la respuesta.
  */
  return products.sort(
    (a, b) => {
      const aScore =
        (
          a.isQsmVerified
            ? 1000
            : 0
        ) +
        (
          a.seller
            ?.isVerified
            ? 500
            : 0
        ) +
        Number(
          a.seller
            ?.trustScore ||
          0
        ) +
        (
          Number(
            a.confidenceScore ||
            0
          ) / 10
        );

      const bScore =
        (
          b.isQsmVerified
            ? 1000
            : 0
        ) +
        (
          b.seller
            ?.isVerified
            ? 500
            : 0
        ) +
        Number(
          b.seller
            ?.trustScore ||
          0
        ) +
        (
          Number(
            b.confidenceScore ||
            0
          ) / 10
        );

      return (
        bScore -
        aScore
      );
    }
  );
}

/* ========================================================================
   ESTADÍSTICAS
======================================================================== */

function getMarketplaceStats(
  products
) {
  const prices =
    products
      .map(
        (item) =>
          Number(
            item?.price
          )
      )
      .filter(
        (price) =>
          Number.isFinite(
            price
          ) &&
          price >= 0
      );

  const verifiedSellerCount =
    products.filter(
      (item) =>
        Boolean(
          item
            ?.seller
            ?.isVerified
        )
    ).length;

  const qsmVerifiedCount =
    products.filter(
      (item) =>
        Boolean(
          item
            ?.isQsmVerified
        ) ||
        String(
          item
            ?.verificationStatus ||
          ""
        ).toUpperCase() ===
          "APPROVED"
    ).length;

  const trustedSellerCount =
    products.filter(
      (item) =>
        Number(
          item
            ?.seller
            ?.trustScore ||
          0
        ) >= 80
    ).length;

  return {
    total:
      products.length,

    verifiedSellerCount,

    qsmVerifiedCount,

    trustedSellerCount,

    minimumPrice:
      prices.length
        ? Math.min(
            ...prices
          )
        : null,

    maximumPrice:
      prices.length
        ? Math.max(
            ...prices
          )
        : null
  };
}

/* ========================================================================
   AGRUPACIÓN POR MODELO
======================================================================== */

function buildModelGroups(
  products
) {
  const groups =
    new Map();

  products.forEach(
    (product) => {
      const model =
        String(
          product?.model ||
          ""
        ).trim();

      const brand =
        String(
          product?.brand ||
          ""
        ).trim();

      let key =
        model;

      if (!key) {
        /*
          Si model está vacío usamos el título
          para no inventar un modelo.
        */
        key =
          String(
            product?.title ||
            "Sin modelo"
          )
            .trim();
      }

      if (
        brand &&
        key &&
        !normalizeText(
          key
        ).includes(
          normalizeText(
            brand
          )
        )
      ) {
        key =
          `${brand} ${key}`;
      }

      const current =
        groups.get(
          key
        ) || 0;

      groups.set(
        key,
        current + 1
      );
    }
  );

  return Array
    .from(
      groups.entries()
    )
    .map(
      ([name, count]) => ({
        name,
        count
      })
    )
    .sort(
      (a, b) =>
        b.count -
        a.count
    )
    .slice(0, 5);
}

/* ========================================================================
   FORMATO MONEDA
======================================================================== */

function formatMoney(
  value
) {
  const amount =
    Number(value);

  if (
    !Number.isFinite(
      amount
    )
  ) {
    return null;
  }

  return new Intl.NumberFormat(
    "es-DO",
    {
      style:
        "currency",

      currency:
        "DOP",

      maximumFractionDigits:
        0
    }
  ).format(
    amount
  );
}

/* ========================================================================
   RESPUESTA NATURAL
======================================================================== */

function buildMarketplaceAnswer({
  query,
  products
}) {
  const total =
    products.length;

  if (total === 0) {
    return {
      answer:
        `Ahora mismo no encontré "${query}" disponible en el Marketplace de QSM. ` +
        "Puedo ayudarte a buscar otro modelo, marca o categoría.",

      stats: {
        total:
          0
      },

      models: [],

      topProducts: []
    };
  }

  const stats =
    getMarketplaceStats(
      products
    );

  const models =
    buildModelGroups(
      products
    );

  const topProducts =
    products
      .slice(
        0,
        MAX_RESULTS
      )
      .map(
        (product) => ({
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
            Boolean(
              product
                .isQsmVerified
            ),

          sellerVerified:
            Boolean(
              product
                .seller
                ?.isVerified
            ),

          sellerTrustScore:
            Number(
              product
                .seller
                ?.trustScore ||
              0
            ),

          sellerName:
            [
              product
                .seller
                ?.firstName,

              product
                .seller
                ?.lastName
            ]
              .filter(
                Boolean
              )
              .join(" ")
        })
      );

  let answer =
    `Encontré ${total} ${
      total === 1
        ? "opción"
        : "opciones"
    } de ${titleCase(query)} disponibles en QSM.`;

  if (
    stats
      .verifiedSellerCount >
    0
  ) {
    answer +=
      ` ${stats.verifiedSellerCount} ${
        stats
          .verifiedSellerCount === 1
          ? "pertenece a un vendedor verificado"
          : "pertenecen a vendedores verificados"
      }.`;
  }

  if (
    stats
      .trustedSellerCount >
    0
  ) {
    answer +=
      ` ${stats.trustedSellerCount} ${
        stats
          .trustedSellerCount === 1
          ? "tiene un vendedor con confianza de 80/100 o superior"
          : "tienen vendedores con confianza de 80/100 o superior"
      }.`;
  }

  if (
    stats.minimumPrice !==
      null &&
    stats.maximumPrice !==
      null
  ) {
    if (
      stats.minimumPrice ===
      stats.maximumPrice
    ) {
      answer +=
        ` El precio disponible es ${formatMoney(
          stats.minimumPrice
        )}.`;
    } else {
      answer +=
        ` Los precios van desde ${formatMoney(
          stats.minimumPrice
        )} hasta ${formatMoney(
          stats.maximumPrice
        )}.`;
    }
  }

  if (
    models.length > 1
  ) {
    const modelText =
      models
        .slice(0, 4)
        .map(
          (item) =>
            `${item.name} (${item.count})`
        )
        .join(", ");

    answer +=
      ` Entre lo disponible encontré: ${modelText}.`;
  }

  const strongest =
    topProducts[0];

  if (strongest) {
    answer +=
      ` Una opción destacada es "${strongest.title}"`;

    if (
      Number.isFinite(
        Number(
          strongest.price
        )
      )
    ) {
      answer +=
        ` por ${formatMoney(
          strongest.price
        )}`;
    }

    if (
      strongest
        .sellerTrustScore >
      0
    ) {
      answer +=
        `, con vendedor de confianza ${strongest.sellerTrustScore}/100`;
    }

    answer += ".";
  }

  answer +=
    " Si quieres, puedo ayudarte a priorizar por precio, confianza del vendedor o modelo.";

  return {
    answer,
    stats,
    models,
    topProducts
  };
}

/* ========================================================================
   RESPUESTA HTTP
======================================================================== */

function sendMarketplaceResponse({
  req,
  res,
  query,
  result
}) {
  return res
    .status(200)
    .json({
      success:
        true,

      assistant:
        "LUNA",

      provider:
        "QSM_MARKETPLACE_ENGINE",

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

        accessLevel:
          "PRIVATE",

        intent: {
          code:
            "MARKETPLACE_SEARCH",

          matches: [
            query
          ],

          confidence:
            100
        },

        state: {
          code:
            "READY",

          requiresAuthentication:
            false
        },

        message:
          result.answer,

        actions: [
          {
            code:
              "OPEN_MARKETPLACE",

            label:
              "Ver en Marketplace",

            query
          }
        ],

        marketplace: {
          query,

          stats:
            result.stats,

          models:
            result.models,

          products:
            result.topProducts
        },

        context: {
          path:
            req
              ?.body
              ?.context
              ?.path ||
            null,

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
          Boolean(
            req?.body
              ?.conversation ||
            req?.body
              ?.history
          ),

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

async function lunaMarketplaceSearch(
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

  if (!message) {
    return next();
  }

  if (
    !detectMarketplaceIntent(
      message
    )
  ) {
    return next();
  }

  const query =
    extractMarketplaceQuery(
      message
    );

  if (
    !query ||
    query.length < 2
  ) {
    return next();
  }

  try {
    console.log(
      `[LUNA MARKETPLACE] QUERY="${query}"`
    );

    const products =
      await searchMarketplace(
        query
      );

    const result =
      buildMarketplaceAnswer({
        query,
        products
      });

    console.log(
      `[LUNA MARKETPLACE] RESULTADOS=${products.length}`
    );

    return sendMarketplaceResponse({
      req,
      res,
      query,
      result
    });
  } catch (error) {
    console.error(
      "[LUNA MARKETPLACE][ERROR]",
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
      Si falla la búsqueda inteligente,
      LUNA conserva su motor actual.
    */
    return next();
  }
}

module.exports = {
  lunaMarketplaceSearch,
  detectMarketplaceIntent,
  extractMarketplaceQuery,
  expandSearchTerms,
  buildMarketplaceAnswer
};
