"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA GEMINI PROVIDER
|--------------------------------------------------------------------------
| Fase 17 Bloque 5
|
| ADAPTADOR PREPARADO PARA ETAPA 2.
|
| NO realiza peticiones a Google.
| NO instala SDK.
| NO usa una API key.
| NO consume cuota.
|--------------------------------------------------------------------------
*/

const {
  getLunaProviderConfig
} = require(
  "../config/luna-provider.config"
);

class LunaExternalProviderError
  extends Error {
  constructor(
    message,
    {
      code =
        "LUNA_EXTERNAL_PROVIDER_ERROR",

      provider =
        "GEMINI",

      cause =
        null
    } = {}
  ) {
    super(message);

    this.name =
      "LunaExternalProviderError";

    this.code =
      code;

    this.provider =
      provider;

    this.cause =
      cause;
  }
}

async function executeGeminiProvider({
  message,
  internalContext = null,
  conversation = []
} = {}) {
  const config =
    getLunaProviderConfig();

  /*
    Seguridad de Etapa 1:
    Gemini NO puede ejecutarse.
  */
  if (
    !config
      .externalKnowledgeEnabled
  ) {
    throw new LunaExternalProviderError(
      "El conocimiento externo de LUNA está desactivado.",
      {
        code:
          "EXTERNAL_KNOWLEDGE_DISABLED"
      }
    );
  }

  if (
    !config
      .gemini
      .enabled
  ) {
    throw new LunaExternalProviderError(
      "Gemini no está habilitado como proveedor.",
      {
        code:
          "GEMINI_DISABLED"
      }
    );
  }

  if (
    !config
      .gemini
      .hasApiKey
  ) {
    throw new LunaExternalProviderError(
      "Gemini no tiene una API key configurada.",
      {
        code:
          "GEMINI_API_KEY_MISSING"
      }
    );
  }

  /*
    ETAPA 2:
    Aquí se implementará la llamada real.

    Este throw es intencional.
  */
  throw new LunaExternalProviderError(
    "El adaptador Gemini está preparado, pero la integración real pertenece a la Etapa 2.",
    {
      code:
        "GEMINI_ADAPTER_NOT_ACTIVATED"
    }
  );
}

function getGeminiProviderStatus() {
  const config =
    getLunaProviderConfig();

  return {
    provider:
      "GEMINI",

    enabled:
      Boolean(
        config
          .gemini
          .enabled
      ),

    externalKnowledgeEnabled:
      Boolean(
        config
          .externalKnowledgeEnabled
      ),

    hasApiKey:
      Boolean(
        config
          .gemini
          .hasApiKey
      ),

    ready:
      false,

    stage:
      2,

    consumesQuota:
      false,

    description:
      "Adaptador preparado para conocimiento externo futuro."
  };
}

module.exports = {
  LunaExternalProviderError,
  executeGeminiProvider,
  getGeminiProviderStatus
};
