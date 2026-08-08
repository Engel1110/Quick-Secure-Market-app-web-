"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA MARKETPLACE GUIDE
|--------------------------------------------------------------------------
| FASE 17 BLOQUE 13 LOCAL
|
| Objetivo:
| convertir una búsqueda aislada en un pequeño flujo
| conversacional guiado por las necesidades del comprador.
|
| PRINCIPIO DE NEUTRALIDAD:
|
| El ranking NO utiliza:
| - Trust Score del vendedor
| - cantidad de ventas del vendedor
| - reputación del vendedor
|
| La confianza/verificación podrá mostrarse como información,
| pero no define cuál publicación aparece primero.
|--------------------------------------------------------------------------
*/

const prisma =
  require("../utils/prisma");

const VERSION =
  "LUNA-MARKETPLACE-GUIDE-17.13";

const MAX_DATABASE_RESULTS =
  80;

const MAX_VISIBLE_OPTIONS =
  6;

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
      /[^a-z0-9ñ\s./-]/gi,
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

  if (
    !Number.isFinite(amount)
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
  ).format(amount);
}

/* ========================================================================
   TIPO DE PRODUCTO
======================================================================== */

function detectProductFamily(
  query
) {
  const text =
    normalizeText(query);

  if (
    [
      "laptop",
      "notebook",
      "portatil",
      "computadora",
      "pc"
    ].some(
      (item) =>
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
      "pixel",
      "xiaomi",
      "motorola"
    ].some(
      (item) =>
        text.includes(item)
    )
  ) {
    return "PHONE";
  }

  if (
    [
      "playstation",
      "ps5",
      "xbox",
      "nintendo",
      "consola"
    ].some(
      (item) =>
        text.includes(item)
    )
  ) {
    return "CONSOLE";
  }

  return "GENERAL";
}

/* ========================================================================
   SIGUIENTE DATO NECESARIO
======================================================================== */

function resolveNextQuestion(
  state
) {
  const query =
    state
      ?.product
      ?.query;

  const preferences =
    state
      ?.preferences ||
    {};

  if (!query) {
    return null;
  }

  if (
    !Number.isFinite(
      Number(
        preferences
          .budgetMax
      )
    )
  ) {
    return {
      waitingFor:
        "budget",

      answer:
        `Claro. Para buscar ${query} sin mostrarte opciones que se salgan de lo que deseas gastar, ¿qué presupuesto máximo tienes aproximadamente?`
    };
  }

  const family =
    detectProductFamily(
      query
    );

  /*
    Computadoras:
    después del presupuesto el uso es
    muy importante para calidad/precio.
  */

  if (
    family ===
      "COMPUTER" &&
    !preferences.useCase
  ) {
    return {
      waitingFor:
        "useCase",

      answer:
        "Perfecto. ¿Para qué la necesitas principalmente? Por ejemplo: estudiar, oficina, programar, diseño o juegos."
    };
  }

  /*
    Teléfonos:
    podemos buscar con presupuesto inmediatamente.
    Luego el usuario podrá refinar cámara, gaming,
    almacenamiento, etc.
  */

  return null;
}

/* ========================================================================
   PALABRAS DE USO
======================================================================== */

const USE_CASE_TERMS =
  Object.freeze({

    PROGRAMMING: [
      "programar",
      "programacion",
      "developer",
      "desarrollo",
      "coding",
      "software",
      "visual studio",
      "docker",
      "node",
      "python"
    ],

    GAMING: [
      "gaming",
      "juegos",
      "jugar",
      "gamer",
      "gpu",
      "grafica"
    ],

    STUDY: [
      "estudio",
      "estudiar",
      "universidad",
      "colegio",
      "clases",
      "estudiante"
    ],

    OFFICE: [
      "oficina",
      "office",
      "excel",
      "word",
      "trabajo"
    ],

    DESIGN: [
      "diseno",
      "photoshop",
      "adobe",
      "edicion",
      "editar",
      "video"
    ],

    PHOTOGRAPHY: [
      "camara",
      "fotografia",
      "fotos",
      "video",
      "grabar"
    ]
  });

/* ========================================================================
   QUERY DB
======================================================================== */

function buildSearchConditions(
  query
) {
  const text =
    normalizeText(
      query
    );

  const tokens =
    text
      .split(" ")
      .filter(
        (token) =>
          token.length >= 2
      )
      .slice(0, 6);

  const terms =
    Array.from(
      new Set([
        text,
        ...tokens
      ])
    )
      .filter(Boolean);

  return terms
    .flatMap(
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
}

async function loadMarketplaceCandidates({
  query,
  budgetMax
}) {
  const numericBudget =
    Number(
      budgetMax
    );

  const where = {
    status:
      "ACTIVE",

    deletedAt:
      null,

    OR:
      buildSearchConditions(
        query
      )
  };

  if (
    Number.isFinite(
      numericBudget
    ) &&
    numericBudget > 0
  ) {
    where.price = {
      lte:
        numericBudget
    };
  }

  return prisma.product.findMany({
    where,

    take:
      MAX_DATABASE_RESULTS,

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

      description:
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

      isQsmVerified:
        true,

      verificationStatus:
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
            true
        }
      }
    }
  });
}

/* ========================================================================
   RELEVANCIA DEL PRODUCTO
======================================================================== */

function productSearchText(
  product
) {
  return normalizeText(
    [
      product?.title,
      product?.brand,
      product?.model,
      product?.category,
      product?.description,
      product?.storageCapacity
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function calculateQueryScore(
  product,
  query
) {
  const productText =
    productSearchText(
      product
    );

  const normalizedQuery =
    normalizeText(
      query
    );

  const queryTokens =
    normalizedQuery
      .split(" ")
      .filter(
        (token) =>
          token.length >= 2
      );

  let score =
    0;

  /*
    Coincidencia del término completo.
  */

  if (
    productText.includes(
      normalizedQuery
    )
  ) {
    score +=
      40;
  }

  /*
    Coincidencias individuales.
  */

  queryTokens.forEach(
    (token) => {
      if (
        productText.includes(
          token
        )
      ) {
        score +=
          12;
      }
    }
  );

  return score;
}

function calculateUseCaseScore(
  product,
  useCase
) {
  if (!useCase) {
    return 0;
  }

  const terms =
    USE_CASE_TERMS[
      useCase
    ] ||
    [];

  if (!terms.length) {
    return 0;
  }

  const productText =
    productSearchText(
      product
    );

  let matches =
    0;

  terms.forEach(
    (term) => {
      if (
        productText.includes(
          normalizeText(term)
        )
      ) {
        matches +=
          1;
      }
    }
  );

  return Math.min(
    30,
    matches *
      6
  );
}

function calculateSpecificationScore(
  product,
  preferences
) {
  const text =
    productSearchText(
      product
    );

  let score =
    0;

  const ram =
    Number(
      preferences
        ?.ramGb
    );

  if (
    Number.isFinite(ram) &&
    ram > 0
  ) {
    const ramPatterns = [
      `${ram}gb ram`,
      `${ram} gb ram`,
      `ram ${ram}gb`,
      `ram ${ram} gb`
    ];

    if (
      ramPatterns.some(
        (pattern) =>
          text.includes(
            pattern
          )
      )
    ) {
      score +=
        20;
    }
  }

  const storage =
    Number(
      preferences
        ?.storageGb
    );

  if (
    Number.isFinite(
      storage
    ) &&
    storage > 0
  ) {
    const storagePatterns = [
      `${storage}gb`,
      `${storage} gb`
    ];

    if (
      storage >= 1024
    ) {
      const tb =
        storage /
        1024;

      storagePatterns.push(
        `${tb}tb`,
        `${tb} tb`
      );
    }

    if (
      storagePatterns.some(
        (pattern) =>
          text.includes(
            pattern
          )
      )
    ) {
      score +=
        15;
    }
  }

  return score;
}

/* ========================================================================
   PRECIO / CALIDAD-PRECIO
======================================================================== */

function calculateBudgetScore(
  product,
  budgetMax
) {
  const price =
    Number(
      product?.price
    );

  const budget =
    Number(
      budgetMax
    );

  if (
    !Number.isFinite(price) ||
    !Number.isFinite(budget) ||
    budget <= 0
  ) {
    return 0;
  }

  /*
    No premiamos simplemente "ser el más caro".

    Damos una puntuación suave a productos
    dentro de una zona útil del presupuesto.

    70%-100% del presupuesto = buen ajuste.
    Productos más económicos continúan siendo
    perfectamente elegibles.
  */

  const ratio =
    price /
    budget;

  if (
    ratio >= 0.70 &&
    ratio <= 1
  ) {
    return 10;
  }

  if (
    ratio >= 0.45 &&
    ratio < 0.70
  ) {
    return 7;
  }

  return 4;
}

/* ========================================================================
   SCORE NEUTRAL
======================================================================== */

function calculateNeutralFitScore({
  product,
  query,
  preferences
}) {
  /*
    MUY IMPORTANTE:

    Aquí NO se utiliza:
    seller.trustScore
    seller.isVerified
    seller.id

    para ordenar resultados.
  */

  const queryScore =
    calculateQueryScore(
      product,
      query
    );

  const useCaseScore =
    calculateUseCaseScore(
      product,
      preferences
        ?.useCase
    );

  const specificationScore =
    calculateSpecificationScore(
      product,
      preferences
    );

  const budgetScore =
    calculateBudgetScore(
      product,
      preferences
        ?.budgetMax
    );

  return Number(
    (
      queryScore +
      useCaseScore +
      specificationScore +
      budgetScore
    ).toFixed(2)
  );
}

function rankNeutralOptions({
  products,
  query,
  preferences
}) {
  return products
    .map(
      (product) => ({
        ...product,

        lunaFitScore:
          calculateNeutralFitScore({
            product,
            query,
            preferences
          })
      })
    )
    .sort(
      (left, right) => {
        /*
          Primero compatibilidad con necesidad.

          En empate:
          menor precio primero.

          NO Trust Score.
        */

        if (
          right
            .lunaFitScore !==
          left
            .lunaFitScore
        ) {
          return (
            right
              .lunaFitScore -
            left
              .lunaFitScore
          );
        }

        const leftPrice =
          Number(
            left.price
          );

        const rightPrice =
          Number(
            right.price
          );

        if (
          Number.isFinite(
            leftPrice
          ) &&
          Number.isFinite(
            rightPrice
          )
        ) {
          return (
            leftPrice -
            rightPrice
          );
        }

        return 0;
      }
    );
}

/* ========================================================================
   PREFERRED RANGE
======================================================================== */

function selectVisibleOptions({
  ranked,
  budgetMax
}) {
  const budget =
    Number(
      budgetMax
    );

  if (
    !Number.isFinite(budget) ||
    budget <= 0
  ) {
    return ranked.slice(
      0,
      MAX_VISIBLE_OPTIONS
    );
  }

  /*
    Primero intentamos mostrar opciones entre
    80% y 100% del presupuesto, como en el ejemplo:

    RD$30,000
       ↓
    zona preferida RD$24,000–30,000

    Si hay pocas, completamos con opciones
    más económicas para NO excluir vendedores.
  */

  const preferredMin =
    budget *
    0.80;

  const preferred =
    ranked.filter(
      (product) => {
        const price =
          Number(
            product.price
          );

        return (
          Number.isFinite(
            price
          ) &&
          price >=
            preferredMin &&
          price <=
            budget
        );
      }
    );

  if (
    preferred.length >=
    MAX_VISIBLE_OPTIONS
  ) {
    return preferred.slice(
      0,
      MAX_VISIBLE_OPTIONS
    );
  }

  const selectedIds =
    new Set(
      preferred.map(
        (item) =>
          item.id
      )
    );

  const additional =
    ranked.filter(
      (item) =>
        !selectedIds.has(
          item.id
        )
    );

  return [
    ...preferred,
    ...additional
  ].slice(
    0,
    MAX_VISIBLE_OPTIONS
  );
}

/* ========================================================================
   SERIALIZAR
======================================================================== */

function serializeOption(
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

    storageCapacity:
      product
        .storageCapacity,

    fitScore:
      product
        .lunaFitScore,

    /*
      Información de seguridad visible,
      pero NO utilizada para ranking.
    */

    security: {
      productVerified:
        Boolean(
          product
            .isQsmVerified
        ) ||
        String(
          product
            .verificationStatus ||
          ""
        ).toUpperCase() ===
          "APPROVED",

      sellerVerified:
        Boolean(
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
          "APPROVED",

      sellerTrustScore:
        Number(
          product
            ?.seller
            ?.trustScore ||
          0
        )
    }
  };
}

/* ========================================================================
   RESPUESTA
======================================================================== */

function buildMarketplaceGuidedAnswer({
  query,
  preferences,
  candidates,
  visible
}) {
  const budget =
    Number(
      preferences
        ?.budgetMax
    );

  if (!candidates.length) {
    if (
      Number.isFinite(
        budget
      )
    ) {
      return (
        `Busqué ${query} dentro de tu presupuesto de ${formatMoney(
          budget
        )}, pero ahora mismo no encontré publicaciones activas que cumplan ese límite. ` +
        "Puedo ampliar un poco el presupuesto, cambiar alguna característica o buscar otra alternativa."
      );
    }

    return (
      `Ahora mismo no encontré ${query} disponible en QSM. Podemos intentar otra marca, modelo o categoría.`
    );
  }

  const prices =
    candidates
      .map(
        (item) =>
          Number(
            item.price
          )
      )
      .filter(
        Number.isFinite
      );

  let answer =
    `Encontré ${candidates.length} ${
      candidates.length === 1
        ? "opción"
        : "opciones"
    } de ${query}`;

  if (
    Number.isFinite(
      budget
    )
  ) {
    answer +=
      ` dentro de tu presupuesto máximo de ${formatMoney(
        budget
      )}`;
  }

  answer += ".";

  if (
    prices.length
  ) {
    const min =
      Math.min(
        ...prices
      );

    const max =
      Math.max(
        ...prices
      );

    if (
      min === max
    ) {
      answer +=
        ` El precio disponible es ${formatMoney(
          min
        )}.`;
    }
    else {
      answer +=
        ` Los precios encontrados van desde ${formatMoney(
          min
        )} hasta ${formatMoney(
          max
        )}.`;
    }
  }

  if (
    preferences
      ?.useCase
  ) {
    const labels = {
      PROGRAMMING:
        "programación",

      GAMING:
        "juegos",

      STUDY:
        "estudio",

      OFFICE:
        "oficina",

      DESIGN:
        "diseño/edición",

      PHOTOGRAPHY:
        "fotografía y video"
    };

    answer +=
      ` También tomé en cuenta que la necesitas para ${
        labels[
          preferences
            .useCase
        ] ||
        "el uso indicado"
      }.`;
  }

  if (
    Number.isFinite(
      Number(
        preferences
          ?.ramGb
      )
    )
  ) {
    answer +=
      ` Consideré tu preferencia de ${preferences.ramGb} GB de RAM cuando la publicación incluye ese dato.`;
  }

  if (
    Number.isFinite(
      Number(
        preferences
          ?.storageGb
      )
    )
  ) {
    answer +=
      ` También consideré ${preferences.storageGb} GB de almacenamiento cuando está especificado.`;
  }

  if (
    visible.length
  ) {
    answer +=
      ` Te preparé ${visible.length} ${
        visible.length === 1
          ? "alternativa"
          : "alternativas"
      } que se ajustan mejor a esos criterios.`;
  }

  answer +=
    " No estoy favoreciendo a un vendedor específico; el orden se basa en compatibilidad con lo que buscas y en precio.";

  return answer;
}

/* ========================================================================
   API PRINCIPAL
======================================================================== */

async function buildGuidedMarketplaceResult(
  state
) {
  const query =
    state
      ?.product
      ?.query;

  const preferences =
    state
      ?.preferences ||
    {};

  if (!query) {
    return {
      ready:
        false,

      reason:
        "PRODUCT_MISSING"
    };
  }

  const nextQuestion =
    resolveNextQuestion(
      state
    );

  if (nextQuestion) {
    return {
      ready:
        false,

      reason:
        "MORE_CONTEXT_REQUIRED",

      ...nextQuestion
    };
  }

  const candidates =
    await loadMarketplaceCandidates({
      query,

      budgetMax:
        preferences
          .budgetMax
    });

  const ranked =
    rankNeutralOptions({
      products:
        candidates,

      query,

      preferences
    });

  const visible =
    selectVisibleOptions({
      ranked,

      budgetMax:
        preferences
          .budgetMax
    });

  return {
    ready:
      true,

    query,

    preferences,

    total:
      candidates.length,

    answer:
      buildMarketplaceGuidedAnswer({
        query,
        preferences,
        candidates,
        visible
      }),

    options:
      visible.map(
        serializeOption
      ),

    neutrality: {
      sellerTrustUsedForRanking:
        false,

      sellerVerificationUsedForRanking:
        false,

      rankingFactors: [
        "PRODUCT_QUERY_MATCH",
        "USER_NEED",
        "REQUESTED_SPECIFICATIONS",
        "BUDGET_FIT",
        "PRICE"
      ]
    }
  };
}

module.exports = {
  VERSION,

  detectProductFamily,
  resolveNextQuestion,

  calculateNeutralFitScore,
  rankNeutralOptions,

  buildGuidedMarketplaceResult
};
