"use strict";

const {
  detectRecommendationIntent,
  calculateRecommendationScore,
  rankBest,
  rankCheapest,
  rankTrusted
} = require(
  "../src/middleware/luna-marketplace-recommendation.middleware"
);

function assert(
  condition,
  message
) {
  if (!condition) {
    throw new Error(
      message
    );
  }
}

console.log("");
console.log(
  "=== TEST LUNA RECOMMENDATION ENGINE ==="
);

const intents = [
  [
    "¿Cuál me recomiendas?",
    "BEST"
  ],

  [
    "¿Y el más barato?",
    "CHEAPEST"
  ],

  [
    "¿Cuál tiene el vendedor más confiable?",
    "MOST_TRUSTED"
  ],

  [
    "Compárame los mejores",
    "COMPARE"
  ],

  [
    "Recomiéndame el mejor iPhone",
    "BEST"
  ]
];

intents.forEach(
  ([message, expected]) => {
    const result =
      detectRecommendationIntent(
        message
      );

    assert(
      result === expected,
      `${message}: esperado ${expected}, recibido ${result}`
    );

    console.log(
      `[OK] ${message} -> ${result}`
    );
  }
);

const mockProducts = [
  {
    id: 1,
    title: "Producto A",
    price: 50000,
    isQsmVerified: true,
    confidenceScore: 90,
    riskLevel: "LOW",

    seller: {
      trustScore: 95,
      isVerified: true,
      verificationStatus: "APPROVED"
    }
  },

  {
    id: 2,
    title: "Producto B",
    price: 30000,
    isQsmVerified: false,
    confidenceScore: 60,
    riskLevel: "MEDIUM",

    seller: {
      trustScore: 70,
      isVerified: false,
      verificationStatus: "PENDING"
    }
  },

  {
    id: 3,
    title: "Producto C",
    price: 40000,
    isQsmVerified: true,
    confidenceScore: 80,
    riskLevel: "LOW",

    seller: {
      trustScore: 88,
      isVerified: true,
      verificationStatus: "APPROVED"
    }
  }
];

const scoreA =
  calculateRecommendationScore(
    mockProducts[0]
  );

const scoreB =
  calculateRecommendationScore(
    mockProducts[1]
  );

assert(
  scoreA > scoreB,
  "Producto más seguro debe obtener mayor puntuación."
);

assert(
  rankBest(
    mockProducts
  )[0].id === 1,
  "BEST debe priorizar Producto A."
);

assert(
  rankCheapest(
    mockProducts
  )[0].id === 2,
  "CHEAPEST debe priorizar Producto B."
);

assert(
  rankTrusted(
    mockProducts
  )[0].id === 1,
  "TRUSTED debe priorizar Producto A."
);

console.log("");
console.log(
  "[OK] Ranking seguridad/confianza"
);

console.log(
  "[OK] Ranking precio"
);

console.log(
  "[OK] Ranking vendedor"
);

console.log("");
console.log(
  "LUNA RECOMMENDATION ENGINE: TEST COMPLETADO"
);
