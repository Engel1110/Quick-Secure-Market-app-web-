"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA PROVIDER ROUTER
|--------------------------------------------------------------------------
| Fase 17 Bloque 5
|
| Decide qué cerebro debe utilizar LUNA.
|--------------------------------------------------------------------------
*/

const {
  PROVIDERS,
  getLunaProviderConfig,
  isExternalKnowledgeAvailable
} = require(
  "../config/luna-provider.config"
);

const {
  executeInternalProvider,
  getInternalProviderStatus
} = require(
  "../providers/luna-internal.provider"
);

const {
  executeGeminiProvider,
  getGeminiProviderStatus
} = require(
  "../providers/luna-gemini.provider"
);

const ROUTES =
  Object.freeze({
    INTERNAL:
      "INTERNAL",

    EXTERNAL:
      "EXTERNAL",

    INTERNAL_THEN_EXTERNAL:
      "INTERNAL_THEN_EXTERNAL",

    FALLBACK_INTERNAL:
      "FALLBACK_INTERNAL"
  });

const INTERNAL_INTENTS =
  new Set([
    "TRUST",
    "VERIFICATION",
    "PURCHASES",
    "SALES",
    "PRODUCTS",
    "DISPUTES",
    "ACCOUNT_PRIORITY",

    "MARKETPLACE_SEARCH",
    "MARKETPLACE_AVAILABILITY",
    "MARKETPLACE_PRICE",
    "SELLER_TRUST",
    "QSM_SECURITY",
    "QSM_PROFILE",
    "QSM_MESSAGES"
  ]);

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
    );
}

/*
|--------------------------------------------------------------------------
| Detectar preguntas de conocimiento GENERAL.
|--------------------------------------------------------------------------
|
| Importante:
| detectar EXTERNAL no significa que Gemini será llamado.
| En Etapa 1 simplemente queda registrado como una capacidad futura.
|--------------------------------------------------------------------------
*/

function looksLikeExternalKnowledgeQuestion(
  message
) {
  const text =
    normalizeText(
      message
    );

  if (!text) {
    return false;
  }

  const patterns = [
    "que es ",
    "que significa ",
    "para que sirve ",
    "es bueno ",
    "es buena ",
    "que tan bueno ",
    "que tan buena ",
    "ventajas de ",
    "desventajas de ",
    "caracteristicas de ",
    "especificaciones de ",
    "comparame ",
    "comparar ",
    "diferencia entre ",
    "cual es mejor ",
    "recomiendame un ",
    "recomiendame una "
  ];

  return patterns.some(
    (pattern) =>
      text.includes(
        pattern
      )
  );
}

/*
|--------------------------------------------------------------------------
| Determinar ruta
|--------------------------------------------------------------------------
*/

function decideLunaProviderRoute({
  message = "",
  intent = null,
  internalAnswerAvailable = false,
  qsmDataAvailable = false
} = {}) {
  const config =
    getLunaProviderConfig();

  const normalizedIntent =
    String(
      intent || ""
    )
      .trim()
      .toUpperCase();

  /*
    PRIORIDAD ABSOLUTA:
    la información privada QSM nunca debe depender
    de un proveedor externo.
  */
  if (
    INTERNAL_INTENTS.has(
      normalizedIntent
    ) ||
    internalAnswerAvailable ||
    qsmDataAvailable
  ) {
    return {
      route:
        ROUTES.INTERNAL,

      provider:
        PROVIDERS.INTERNAL,

      reason:
        "QSM_INTERNAL_DATA_PRIORITY",

      externalAllowed:
        false
    };
  }

  const externalQuestion =
    looksLikeExternalKnowledgeQuestion(
      message
    );

  if (!externalQuestion) {
    return {
      route:
        ROUTES.INTERNAL,

      provider:
        PROVIDERS.INTERNAL,

      reason:
        "DEFAULT_INTERNAL",

      externalAllowed:
        false
    };
  }

  /*
    Detectamos que sería útil conocimiento externo,
    pero todavía estamos en Etapa 1.
  */
  if (
    !config
      .externalKnowledgeEnabled
  ) {
    return {
      route:
        ROUTES.FALLBACK_INTERNAL,

      provider:
        PROVIDERS.INTERNAL,

      futureProvider:
        config
          .externalProvider,

      reason:
        "EXTERNAL_KNOWLEDGE_DISABLED",

      externalAllowed:
        false,

      externalCandidate:
        true
    };
  }

  if (
    !isExternalKnowledgeAvailable()
  ) {
    return {
      route:
        ROUTES.FALLBACK_INTERNAL,

      provider:
        PROVIDERS.INTERNAL,

      futureProvider:
        config
          .externalProvider,

      reason:
        "EXTERNAL_PROVIDER_NOT_READY",

      externalAllowed:
        false,

      externalCandidate:
        true
    };
  }

  return {
    route:
      ROUTES.EXTERNAL,

    provider:
      config
        .externalProvider,

    reason:
      "GENERAL_KNOWLEDGE_REQUIRED",

    externalAllowed:
      true,

    externalCandidate:
      true
  };
}

/*
|--------------------------------------------------------------------------
| Ejecución
|--------------------------------------------------------------------------
*/

async function routeLunaRequest({
  message,
  intent = null,

  internalAnswer = null,
  internalContext = null,

  qsmDataAvailable = false,

  conversation = [],

  metadata = null
} = {}) {
  const decision =
    decideLunaProviderRoute({
      message,
      intent,

      internalAnswerAvailable:
        Boolean(
          String(
            internalAnswer ||
            ""
          ).trim()
        ),

      qsmDataAvailable
    });

  /*
    Etapa 1:
    INTERNAL siempre será el destino efectivo.
  */
  if (
    decision
      .provider ===
        PROVIDERS.INTERNAL
  ) {
    const result =
      await executeInternalProvider({
        answer:
          internalAnswer,

        context:
          internalContext,

        intent,

        metadata: {
          ...(metadata || {}),

          router:
            decision
        }
      });

    return {
      ...result,

      router:
        decision
    };
  }

  /*
    Esta rama queda preparada para Etapa 2.
  */
  try {
    const externalResult =
      await executeGeminiProvider({
        message,

        internalContext,

        conversation
      });

    return {
      ...externalResult,

      router:
        decision
    };
  } catch (error) {

    /*
      Si Gemini llegara a fallar en Etapa 2,
      LUNA vuelve automáticamente al motor interno.
    */

    const fallback =
      await executeInternalProvider({
        answer:
          internalAnswer,

        context:
          internalContext,

        intent,

        metadata: {
          ...(metadata || {}),

          externalFailure: {
            provider:
              error?.provider ||
              decision.provider,

            code:
              error?.code ||
              "UNKNOWN_EXTERNAL_ERROR"
          }
        }
      });

    return {
      ...fallback,

      provider:
        PROVIDERS.INTERNAL,

      router: {
        ...decision,

        route:
          ROUTES.FALLBACK_INTERNAL,

        provider:
          PROVIDERS.INTERNAL,

        fallback:
          true
      }
    };
  }
}

function getLunaProviderCapabilities() {
  const config =
    getLunaProviderConfig();

  return {
    version:
      "17.5",

    stage:
      1,

    router:
      "ACTIVE",

    primary:
      getInternalProviderStatus(),

    external:
      getGeminiProviderStatus(),

    configuration: {
      externalKnowledgeEnabled:
        config
          .externalKnowledgeEnabled,

      externalProvider:
        config
          .externalProvider,

      externalTimeoutMs:
        config
          .externalTimeoutMs
    },

    futureReady: {
      gemini:
        true,

      webKnowledge:
        true,

      marketplaceFusion:
        true
    }
  };
}

module.exports = {
  ROUTES,

  decideLunaProviderRoute,
  routeLunaRequest,
  getLunaProviderCapabilities,
  looksLikeExternalKnowledgeQuestion
};
