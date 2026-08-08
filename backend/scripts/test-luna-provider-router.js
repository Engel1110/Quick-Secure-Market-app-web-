"use strict";

const {
  decideLunaProviderRoute,
  getLunaProviderCapabilities
} = require(
  "../src/services/luna-provider-router.service"
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
  "=== TEST LUNA PROVIDER ROUTER ==="
);

const trust =
  decideLunaProviderRoute({
    message:
      "¿Cuál es mi confianza?",

    intent:
      "TRUST",

    qsmDataAvailable:
      true
  });

assert(
  trust.provider ===
    "INTERNAL",
  "TRUST debe usar INTERNAL."
);

console.log(
  "[OK] Confianza -> INTERNAL"
);

const purchases =
  decideLunaProviderRoute({
    message:
      "Háblame de mis compras.",

    intent:
      "PURCHASES",

    qsmDataAvailable:
      true
  });

assert(
  purchases.provider ===
    "INTERNAL",
  "PURCHASES debe usar INTERNAL."
);

console.log(
  "[OK] Compras -> INTERNAL"
);

const generalKnowledge =
  decideLunaProviderRoute({
    message:
      "¿Qué es un iPhone 15?"
  });

assert(
  generalKnowledge.provider ===
    "INTERNAL",
  "Etapa 1 debe mantener INTERNAL."
);

assert(
  generalKnowledge
    .externalCandidate ===
      true,
  "Debe reconocer candidato externo."
);

assert(
  generalKnowledge
    .externalAllowed ===
      false,
  "Gemini debe estar apagado."
);

console.log(
  "[OK] Pregunta general -> candidato Gemini detectado"
);

console.log(
  "[OK] Gemini -> BLOQUEADO en Etapa 1"
);

const recommendation =
  decideLunaProviderRoute({
    message:
      "Recomiéndame un celular para juegos"
  });

assert(
  recommendation
    .externalCandidate ===
      true,
  "Recomendación general debe ser candidata externa."
);

console.log(
  "[OK] Recomendaciones -> preparadas para Etapa 2"
);

const capabilities =
  getLunaProviderCapabilities();

assert(
  capabilities
    .primary
    .enabled === true,
  "INTERNAL debe estar activo."
);

assert(
  capabilities
    .external
    .ready === false,
  "Gemini no debe estar activo todavía."
);

console.log("");
console.log(
  JSON.stringify(
    capabilities,
    null,
    2
  )
);

console.log("");
console.log(
  "LUNA PROVIDER ROUTER: TEST COMPLETADO"
);
