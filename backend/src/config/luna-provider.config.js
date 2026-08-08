"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA PROVIDER CONFIG
|--------------------------------------------------------------------------
| Fase 17 Bloque 5
|
| IMPORTANTE:
| - INTERNAL es el proveedor obligatorio.
| - GEMINI queda preparado pero DESACTIVADO.
| - Nunca colocar claves en este archivo.
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
      "GEMINI"
  });

const externalKnowledgeEnabled =
  parseBoolean(
    process.env
      .LUNA_EXTERNAL_KNOWLEDGE_ENABLED,
    false
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
      "17.5",

    primaryProvider:
      PROVIDERS.INTERNAL,

    externalKnowledgeEnabled,

    externalProvider,

    externalTimeoutMs:
      clampNumber(
        process.env
          .LUNA_EXTERNAL_TIMEOUT_MS,
        1000,
        30000,
        7000
      ),

    maxExternalPromptLength:
      clampNumber(
        process.env
          .LUNA_EXTERNAL_MAX_PROMPT_LENGTH,
        250,
        10000,
        3000
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
          "gemini-placeholder"
        ),

      hasApiKey:
        Boolean(
          String(
            process.env
              .GEMINI_API_KEY ||
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
