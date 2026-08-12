"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA AI PROVIDER ROUTER
|--------------------------------------------------------------------------
|
| GEMINI   = inteligencia principal
| INTERNAL = fallback local
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

    GEMINI:
      "GEMINI",

    INTERNAL:
      "INTERNAL",

    FALLBACK_INTERNAL:
      "FALLBACK_INTERNAL"

  });


function shouldUseGemini({
  message = ""
} = {}) {

  return Boolean(
    String(
      message ||
      ""
    ).trim()
  );
}


function decideLunaProviderRoute({
  message = ""
} = {}) {

  if (
    !shouldUseGemini({
      message
    })
  ) {

    return {

      route:
        ROUTES.INTERNAL,

      provider:
        PROVIDERS.INTERNAL,

      reason:
        "EMPTY_REQUEST"

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

      preferredProvider:
        PROVIDERS.GEMINI,

      reason:
        "GEMINI_NOT_AVAILABLE",

      fallback:
        true

    };
  }


  return {

    route:
      ROUTES.GEMINI,

    provider:
      PROVIDERS.GEMINI,

    reason:
      "GEMINI_PRIMARY",

    externalAllowed:
      true

  };
}


async function routeLunaRequest({

  message,

  intent = null,

  internalAnswer = null,

  internalContext = null,

  qsmDataAvailable = false,

  conversation = [],

  metadata = null,

  systemPrompt = null

} = {}) {


  const decision =
    decideLunaProviderRoute({
      message
    });


  if (
    decision.provider ===
      PROVIDERS.GEMINI
  ) {

    try {

      const result =
        await executeGeminiProvider({

          message,

          internalContext,

          conversation,

          systemPrompt

        });


      return {

        ...result,

        router:
          decision

      };


    } catch (error) {


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
                "GEMINI",

              code:
                error?.code ||
                "GEMINI_UNKNOWN_ERROR",

              message:
                error?.message ||
                null

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


  const internal =
    await executeInternalProvider({

      answer:
        internalAnswer,

      context:
        internalContext,

      intent,

      metadata

    });


  return {

    ...internal,

    router:
      decision

  };
}


function getLunaProviderCapabilities() {

  const config =
    getLunaProviderConfig();


  return {

    version:
      "18.1",

    stage:
      "GEMINI_PRIMARY",

    router:
      "ACTIVE",

    primary:
      getGeminiProviderStatus(),

    external:
      getGeminiProviderStatus(),

    fallback:
      getInternalProviderStatus(),

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

    architecture: {

      geminiPrimary:
        true,

      internalFallback:
        true,

      openaiPrimary:
        false,

      fraudShieldReady:
        true

    },

    futureReady: {

      fraudShield:
        true,

      structuredOutputs:
        true,

      imageAnalysis:
        true

    }

  };
}


module.exports = {

  ROUTES,

  decideLunaProviderRoute,

  routeLunaRequest,

  getLunaProviderCapabilities,

  shouldUseGemini

};
