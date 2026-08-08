"use strict";

const {
  detectMarketplaceIntent,
  extractMarketplaceQuery,
  expandSearchTerms
} = require(
  "../src/middleware/luna-marketplace-search.middleware"
);

function check(
  condition,
  message
) {
  if (!condition) {
    throw new Error(
      message
    );
  }
}

const tests = [
  {
    input:
      "Luna, quiero un iPhone",

    expected:
      "iphone"
  },

  {
    input:
      "¿Tienen iPhone 15?",

    expected:
      "iphone 15"
  },

  {
    input:
      "Busco una laptop Lenovo",

    expected:
      "laptop lenovo"
  },

  {
    input:
      "Quiero comprar un Samsung S25",

    expected:
      "un samsung s25"
  }
];

console.log("");
console.log(
  "=== TEST LUNA MARKETPLACE ==="
);

tests.forEach(
  (test) => {
    const detected =
      detectMarketplaceIntent(
        test.input
      );

    const query =
      extractMarketplaceQuery(
        test.input
      );

    console.log("");
    console.log(
      test.input
    );

    console.log(
      "Detectado:",
      detected
    );

    console.log(
      "Query:",
      query
    );

    console.log(
      "Términos:",
      expandSearchTerms(
        query
      )
    );

    check(
      detected === true,
      `No detectó: ${test.input}`
    );

    check(
      query.length > 1,
      `Query vacía: ${test.input}`
    );
  }
);

check(
  detectMarketplaceIntent(
    "¿Cuál es mi confianza?"
  ) === false,
  "Confianza no debe entrar a Marketplace."
);

check(
  detectMarketplaceIntent(
    "¿Qué es un iPhone 15?"
  ) === false,
  "Conocimiento externo no debe entrar a Marketplace."
);

console.log("");
console.log(
  "[OK] Confianza -> no interceptada"
);

console.log(
  "[OK] ¿Qué es...? -> reservado para Gemini futuro"
);

console.log("");
console.log(
  "LUNA MARKETPLACE TEST COMPLETADO"
);
