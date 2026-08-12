"use strict";

/*
|--------------------------------------------------------------------------
| QSM - AI PROVIDER CONFIG
|--------------------------------------------------------------------------
|
| GEMINI   = inteligencia principal
| INTERNAL = fallback local
| OPENAI   = preparado para uso futuro
|--------------------------------------------------------------------------
*/

const parseBoolean = (
  value,
  fallback = false
) => {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  return [
    "1",
    "true",
    "yes",
    "on"
  ].includes(
    String(value)
      .trim()
      .toLowerCase()
  );
};


const clampNumber = (
  value,
  min,
  max,
  fallback
) => {

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed)
  ) {
    return fallback;
  }

  return Math.min(
    max,
    Math.max(
      min,
      parsed
    )
  );
};


const PROVIDERS =
  Object.freeze({

    INTERNAL:
      "INTERNAL",

    GEMINI:
      "GEMINI",

    OPENAI:
      "OPENAI"

  });


const externalKnowledgeEnabled =
  parseBoolean(
    process.env
      .LUNA_EXTERNAL_KNOWLEDGE_ENABLED,
    true
  );


const requestedExternalProvider =
  String(
    process.env
      .LUNA_EXTERNAL_AI_PROVIDER ||
    "GEMINI"
  )
    .trim()
    .toUpperCase();


const externalProvider =
  Object.values(
    PROVIDERS
  ).includes(
    requestedExternalProvider
  )
    ? requestedExternalProvider
    : PROVIDERS.GEMINI;


const configuration =
  Object.freeze({

    version:
      "18.1",

    primaryProvider:
      PROVIDERS.GEMINI,

    fallbackProvider:
      PROVIDERS.INTERNAL,

    externalKnowledgeEnabled,

    externalProvider,

    externalTimeoutMs:
      clampNumber(
        process.env
          .LUNA_EXTERNAL_TIMEOUT_MS,
        1000,
        60000,
        15000
      ),

    maxExternalPromptLength:
      clampNumber(
        process.env
          .LUNA_EXTERNAL_MAX_PROMPT_LENGTH,
        250,
        20000,
        6000
      ),

    gemini: {

      enabled:
        externalKnowledgeEnabled &&
        externalProvider ===
          PROVIDERS.GEMINI,

      model:
        String(
          process.env
            .LUNA_GEMINI_MODEL ||
          "gemini-3.5-flash-lite"
        ).trim(),

      hasApiKey:
        Boolean(
          String(
            process.env
              .GEMINI_API_KEY ||
            ""
          ).trim()
        )
    },

    openai: {

      enabled:
        false,

      model:
        String(
          process.env
            .LUNA_OPENAI_MODEL ||
          "gpt-5-mini"
        ).trim(),

      hasApiKey:
        Boolean(
          String(
            process.env
              .OPENAI_API_KEY ||
            ""
          ).trim()
        )
    }

  });


function getLunaProviderConfig() {

  return {

    ...configuration,

    gemini: {
      ...configuration.gemini
    },

    openai: {
      ...configuration.openai
    }

  };
}


function isExternalKnowledgeAvailable() {

  if (
    !configuration
      .externalKnowledgeEnabled
  ) {
    return false;
  }

  if (
    configuration
      .externalProvider ===
        PROVIDERS.GEMINI
  ) {

    return Boolean(
      configuration
        .gemini
        .enabled &&
      configuration
        .gemini
        .hasApiKey
    );
  }

  return false;
}


module.exports = {

  PROVIDERS,

  getLunaProviderConfig,

  isExternalKnowledgeAvailable

};
