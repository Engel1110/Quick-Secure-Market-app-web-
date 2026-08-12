"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA / FRAUDSHIELD OPENAI PROVIDER
|--------------------------------------------------------------------------
|
| OpenAI es el proveedor inteligente principal de QSM.
|
| Responsabilidades:
| - LUNA conversational intelligence
| - FraudShield semantic analysis
| - Explanations
| - Contextual reasoning
|
| Las reglas críticas de seguridad continúan bajo control del backend QSM.
|--------------------------------------------------------------------------
*/

const OpenAI =
  require("openai");

const {
  getLunaProviderConfig
} = require(
  "../config/luna-provider.config"
);

class LunaOpenAIProviderError
  extends Error {

  constructor(
    message,
    {
      code =
        "OPENAI_PROVIDER_ERROR",

      cause =
        null
    } = {}
  ) {

    super(message);

    this.name =
      "LunaOpenAIProviderError";

    this.code =
      code;

    this.provider =
      "OPENAI";

    this.cause =
      cause;
  }
}

function getClient() {

  const apiKey =
    String(
      process.env
        .OPENAI_API_KEY ||
      ""
    ).trim();

  if (!apiKey) {

    throw new LunaOpenAIProviderError(
      "OPENAI_API_KEY no está configurada.",
      {
        code:
          "OPENAI_API_KEY_MISSING"
      }
    );
  }

  return new OpenAI({
    apiKey
  });
}

function buildConversationText(
  conversation = []
) {

  if (
    !Array.isArray(
      conversation
    )
  ) {
    return "";
  }

  return conversation
    .slice(-12)
    .map((item) => {

      const role =
        item?.role ||
        "unknown";

      const content =
        item?.content ||
        item?.text ||
        "";

      return (
        `${role}: ${content}`
      );
    })
    .join("\n");
}

async function executeOpenAIProvider({
  message = "",
  internalContext = null,
  conversation = [],
  systemPrompt = null
} = {}) {

  const config =
    getLunaProviderConfig();

  if (
    !config
      .openai
      .enabled
  ) {

    throw new LunaOpenAIProviderError(
      "OpenAI no está habilitado.",
      {
        code:
          "OPENAI_DISABLED"
      }
    );
  }

  const client =
    getClient();

  const model =
    config
      .openai
      .model;

  const history =
    buildConversationText(
      conversation
    );

  const contextText =
    internalContext
      ? JSON.stringify(
          internalContext,
          null,
          2
        )
      : "Sin contexto interno.";

  const instructions =
    systemPrompt ||
`
Eres LUNA, la inteligencia principal de Quick Secure Market (QSM).

QSM es una plataforma de compra y venta segura.

Tus funciones:
- orientar al usuario;
- interpretar contexto;
- ayudar con Marketplace;
- explicar compras y ventas;
- asistir con seguridad;
- colaborar con FraudShield AI;
- explicar señales de riesgo.

Reglas:
- responde en español salvo que el usuario pida otro idioma;
- utiliza únicamente el contexto QSM suministrado para datos privados;
- no inventes órdenes, pagos, usuarios ni estados;
- no bloquees cuentas;
- no canceles transacciones;
- no declares que alguien cometió fraude como hecho;
- cuando analices riesgo, habla de señales, probabilidad o necesidad de revisión;
- las decisiones críticas pertenecen al backend y al BackOffice de QSM.
`.trim();

  try {

    const response =
      await client
        .responses
        .create({

          model,

          instructions,

          store: false,

          input:
`
CONTEXTO INTERNO QSM:
${contextText}

CONVERSACIÓN RECIENTE:
${history || "Sin historial."}

MENSAJE:
${String(message || "").trim()}
`.trim()

        });

    const text =
      String(
        response
          .output_text ||
        ""
      ).trim();

    if (!text) {

      throw new Error(
        "OpenAI devolvió una respuesta vacía."
      );
    }

    return {
      success: true,

      provider:
        "OPENAI",

      model,

      text,

      responseId:
        response.id ||
        null
    };

  } catch (error) {

    throw new LunaOpenAIProviderError(
      error?.message ||
      "Error ejecutando OpenAI.",
      {
        code:
          error?.status === 429
            ? "OPENAI_RATE_LIMIT"
            : "OPENAI_REQUEST_FAILED",

        cause:
          error
      }
    );
  }
}

function getOpenAIProviderStatus() {

  const config =
    getLunaProviderConfig();

  return {
    provider:
      "OPENAI",

    enabled:
      Boolean(
        config
          .openai
          .enabled
      ),

    hasApiKey:
      Boolean(
        config
          .openai
          .hasApiKey
      ),

    model:
      config
        .openai
        .model,

    ready:
      Boolean(
        config
          .openai
          .enabled &&
        config
          .openai
          .hasApiKey
      ),

    stage:
      "PRODUCTION_READY",

    consumesQuota:
      true
  };
}

module.exports = {
  LunaOpenAIProviderError,
  executeOpenAIProvider,
  getOpenAIProviderStatus
};
