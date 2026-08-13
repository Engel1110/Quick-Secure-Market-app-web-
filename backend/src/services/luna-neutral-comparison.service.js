"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA NEUTRAL COMPARISON
|--------------------------------------------------------------------------
| FASE 17 BLOQUE 15 LOCAL
|
| Compara PRODUCTOS, no vendedores.
|
| Ranking:
| - ajuste a lo pedido
| - presupuesto
| - especificaciones
| - condición
| - precio
|
| Trust/verificación:
| - se muestran
| - NO determinan el ganador
|--------------------------------------------------------------------------
*/

const prisma =
  require("../utils/prisma");

const VERSION =
  "LUNA-NEUTRAL-COMPARISON-17.15";

const MAX_RESULTS =
  6;

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ñ\s./-]/gi, " ")
    .replace(/\s+/g, " ")
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

function productText(product) {
  return normalizeText(
    [
      product?.title,
      product?.description,
      product?.brand,
      product?.model,
      product?.category,
      product?.storageCapacity,
      product?.condition,
      product?.quality
    ]
      .filter(Boolean)
      .join(" ")
  );
}

/*
| QSM_FASE17_BLOCK15_FIX_VALUE_PRIORITY
*/

function detectCompareIntent(message) {
  const text =
    normalizeText(message);

  if (!text) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | 1. CALIDAD / PRECIO
  |--------------------------------------------------------------------------
  | Tiene prioridad sobre frases genéricas como:
  | "cual tiene mejor..."
  */

  if (
    [
      "calidad precio",
      "calidad/precio",
      "mejor calidad precio",
      "mejor relacion calidad precio",
      "mejor por el precio",
      "mejor por su precio",
      "cual conviene por el precio",
      "cual vale mas la pena",
      "cual vale la pena",
      "mejor opcion por lo que cuesta"
    ].some(
      (phrase) =>
        text.includes(
          normalizeText(
            phrase
          )
        )
    )
  ) {
    return "VALUE";
  }

  /*
  |--------------------------------------------------------------------------
  | 2. FILTRO VERIFICADO
  |--------------------------------------------------------------------------
  */

  if (
    [
      "solo verificadas",
      "solo verificados",
      "productos verificados",
      "vendedores verificados",
      "muestrame verificadas",
      "muestrame los verificados",
      "quiero opciones verificadas"
    ].some(
      (phrase) =>
        text.includes(
          normalizeText(
            phrase
          )
        )
    )
  ) {
    return "VERIFIED_FILTER";
  }

  /*
  |--------------------------------------------------------------------------
  | 3. PRECIO
  |--------------------------------------------------------------------------
  */

  if (
    [
      "mas barato",
      "menos caro",
      "mas economico",
      "menor precio",
      "quiero gastar menos",
      "cual cuesta menos",
      "el mas barato"
    ].some(
      (phrase) =>
        text.includes(
          normalizeText(
            phrase
          )
        )
    )
  ) {
    return "PRICE";
  }

  /*
  |--------------------------------------------------------------------------
  | 4. COMPARACION GENERAL
  |--------------------------------------------------------------------------
  | Va al final porque es la intención más amplia.
  */

  if (
    [
      "comparame",
      "compara",
      "comparar",
      "diferencia entre estas opciones",
      "cual conviene mas",
      "cual me conviene",
      "cual tiene mejor",
      "cual tiene mas ram",
      "cual tiene mas memoria",
      "cual tiene mejor procesador"
    ].some(
      (phrase) =>
        text.includes(
          normalizeText(
            phrase
          )
        )
    )
  ) {
    return "COMPARE";
  }

  return null;
}

function calculateSpecificationMatch(
  product,
  preferences
) {
  const text =
    productText(product);

  let score = 0;

  const ram =
    Number(
      preferences?.ramGb
    );

  if (
    Number.isFinite(ram) &&
    ram > 0
  ) {
    if (
      [
        `${ram}gb ram`,
        `${ram} gb ram`,
        `ram ${ram}gb`,
        `ram ${ram} gb`
      ].some(
        (pattern) =>
          text.includes(
            pattern
          )
      )
    ) {
      score += 30;
    }
  }

  const storage =
    Number(
      preferences?.storageGb
    );

  if (
    Number.isFinite(storage) &&
    storage > 0
  ) {
    const patterns = [
      `${storage}gb`,
      `${storage} gb`
    ];

    if (
      storage >= 1024
    ) {
      const tb =
        storage / 1024;

      patterns.push(
        `${tb}tb`,
        `${tb} tb`
      );
    }

    if (
      patterns.some(
        (pattern) =>
          text.includes(
            pattern
          )
      )
    ) {
      score += 25;
    }
  }

  return score;
}

function calculateUseCaseMatch(
  product,
  useCase
) {
  if (!useCase) {
    return 0;
  }

  const text =
    productText(product);

  const map = {
    PROGRAMMING: [
      "programacion",
      "developer",
      "desarrollo",
      "coding",
      "ryzen",
      "intel",
      "ssd",
      "ram"
    ],

    GAMING: [
      "gaming",
      "gamer",
      "gpu",
      "rtx",
      "radeon",
      "juegos"
    ],

    STUDY: [
      "estudio",
      "estudiante",
      "office",
      "clases"
    ],

    OFFICE: [
      "oficina",
      "office",
      "excel",
      "word"
    ],

    DESIGN: [
      "diseno",
      "photoshop",
      "adobe",
      "edicion",
      "video"
    ],

    PHOTOGRAPHY: [
      "camara",
      "fotografia",
      "video",
      "grabar"
    ]
  };

  const terms =
    map[useCase] ||
    [];

  let matches = 0;

  terms.forEach(
    (term) => {
      if (
        text.includes(
          term
        )
      ) {
        matches += 1;
      }
    }
  );

  return Math.min(
    30,
    matches * 6
  );
}

function calculateConditionScore(
  product
) {
  const condition =
    normalizeText(
      product?.condition
    );

  if (
    condition.includes(
      "nuevo"
    ) ||
    condition.includes(
      "new"
    )
  ) {
    return 10;
  }

  if (
    condition.includes(
      "como nuevo"
    ) ||
    condition.includes(
      "excelente"
    )
  ) {
    return 8;
  }

  if (
    condition.includes(
      "usado"
    )
  ) {
    return 5;
  }

  return 4;
}

function calculateBudgetFit(
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

  if (
    price > budget
  ) {
    return -100;
  }

  const ratio =
    price / budget;

  if (
    ratio >= 0.75 &&
    ratio <= 1
  ) {
    return 20;
  }

  if (
    ratio >= 0.50
  ) {
    return 15;
  }

  return 10;
}

function calculateValueScore({
  product,
  preferences
}) {
  /*
    Importante:
    NO usamos seller.trustScore.
  */

  const specs =
    calculateSpecificationMatch(
      product,
      preferences
    );

  const use =
    calculateUseCaseMatch(
      product,
      preferences?.useCase
    );

  const condition =
    calculateConditionScore(
      product
    );

  const budget =
    calculateBudgetFit(
      product,
      preferences?.budgetMax
    );

  return Number(
    (
      specs +
      use +
      condition +
      budget
    ).toFixed(2)
  );
}

async function loadCandidates(
  state
) {
  const query =
    String(
      state?.product?.query ||
      ""
    ).trim();

  if (!query) {
    return [];
  }

  const budget =
    Number(
      state?.preferences
        ?.budgetMax
    );

  const terms =
    normalizeText(query)
      .split(" ")
      .filter(
        (token) =>
          token.length >= 2
      );

  const OR =
    Array.from(
      new Set([
        normalizeText(query),
        ...terms
      ])
    )
      .filter(Boolean)
      .flatMap(
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

  const where = {
    status:
      "ACTIVE",

    deletedAt:
      null,

    OR
  };

  if (
    Number.isFinite(budget) &&
    budget > 0
  ) {
    where.price = {
      lte:
        budget
    };
  }

  return prisma.product.findMany({
    where,

    take:
      80,

    select: {
      id: true,
      qsmCode: true,
      title: true,
      description: true,
      price: true,
      brand: true,
      model: true,
      category: true,
      condition: true,
      quality: true,
      storageCapacity: true,
      isQsmVerified: true,
      verificationStatus: true,

      seller: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          trustScore: true,
          isVerified: true,
          verificationStatus: true
        }
      }
    }
  });
}

function securityInfo(
  product
) {
  return {
    productVerified:
      Boolean(
        product?.isQsmVerified
      ) ||
      String(
        product?.verificationStatus ||
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
  };
}

function rankForValue(
  products,
  preferences
) {
  return [...products]
    .map(
      (product) => ({
        ...product,

        lunaValueScore:
          calculateValueScore({
            product,
            preferences
          })
      })
    )
    .sort(
      (left, right) => {
        if (
          right
            .lunaValueScore !==
          left
            .lunaValueScore
        ) {
          return (
            right
              .lunaValueScore -
            left
              .lunaValueScore
          );
        }

        return (
          Number(
            left.price ||
            Infinity
          ) -
          Number(
            right.price ||
            Infinity
          )
        );
      }
    );
}

function rankByPrice(
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

function filterVerified(
  products
) {
  return products.filter(
    (product) => {
      const security =
        securityInfo(
          product
        );

      return (
        security.productVerified ||
        security.sellerVerified
      );
    }
  );
}

function serialize(
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
      product.storageCapacity,

    valueScore:
      product
        .lunaValueScore ??
      null,

    security:
      securityInfo(
        product
      )
  };
}

function buildValueExplanation(
  product,
  preferences
) {
  const reasons = [];

  if (
    Number.isFinite(
      Number(
        preferences?.budgetMax
      )
    )
  ) {
    reasons.push(
      `entra en tu presupuesto de ${formatMoney(
        preferences.budgetMax
      )}`
    );
  }

  if (
    Number.isFinite(
      Number(
        preferences?.ramGb
      )
    )
  ) {
    reasons.push(
      `se está comparando con tu preferencia de ${preferences.ramGb} GB de RAM`
    );
  }

  if (
    preferences?.useCase
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
        "fotografía/video"
    };

    reasons.push(
      `se está evaluando para ${
        labels[
          preferences.useCase
        ] ||
        "el uso indicado"
      }`
    );
  }

  const price =
    formatMoney(
      product.price
    );

  if (price) {
    reasons.push(
      `cuesta ${price}`
    );
  }

  return reasons;
}

async function buildNeutralComparison({
  state,
  mode
}) {
  const candidates =
    await loadCandidates(
      state
    );

  if (!candidates.length) {
    return {
      answer:
        "No encontré opciones suficientes para hacer una comparación útil con los criterios actuales.",

      options: []
    };
  }

  let results =
    candidates;

  if (
    mode ===
    "VERIFIED_FILTER"
  ) {
    results =
      filterVerified(
        candidates
      );
  }
  else if (
    mode ===
    "PRICE"
  ) {
    results =
      rankByPrice(
        candidates
      );
  }
  else {
    results =
      rankForValue(
        candidates,
        state?.preferences ||
        {}
      );
  }

  results =
    results.slice(
      0,
      MAX_RESULTS
    );

  if (!results.length) {
    return {
      answer:
        "No encontré publicaciones que cumplan ese filtro actualmente.",

      options: []
    };
  }

  let answer = "";

  if (
    mode ===
    "PRICE"
  ) {
    answer =
      `Ordené las opciones por precio, de menor a mayor. La más económica está en ${formatMoney(
        results[0].price
      )}.`;
  }
  else if (
    mode ===
    "VERIFIED_FILTER"
  ) {
    answer =
      `Encontré ${results.length} ${
        results.length === 1
          ? "opción con verificación"
          : "opciones con algún indicador de verificación"
      }. La verificación se usa aquí porque tú la pediste como filtro, no para favorecer automáticamente a un vendedor.`;
  }
  else {
    const first =
      results[0];

    const reasons =
      buildValueExplanation(
        first,
        state?.preferences ||
        {}
      );

    answer =
      `Comparé las opciones por ajuste a tus necesidades y relación calidad/precio. Una de las que mejor encaja es "${first.title}"`;

    if (
      reasons.length
    ) {
      answer +=
        ` porque ${reasons.join(
          ", "
        )}`;
    }

    answer +=
      ". No estoy eligiendo un vendedor ganador; te muestro varias alternativas para que tú decidas.";
  }

  return {
    answer,

    options:
      results.map(
        serialize
      ),

    neutrality: {
      trustScoreUsedForRanking:
        false,

      sellerVerificationUsedForRanking:
        false,

      sellerPreference:
        false
    }
  };
}

module.exports = {
  VERSION,

  detectCompareIntent,
  calculateValueScore,
  rankForValue,
  rankByPrice,
  filterVerified,
  buildNeutralComparison
};
