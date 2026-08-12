"use strict";

/*
|--------------------------------------------------------------------------
| QSM - GEMINI PROVIDER
|--------------------------------------------------------------------------
|
| Proveedor principal de inteligencia de:
|
| - LUNA
| - FraudShield AI
| - análisis contextual
| - explicaciones
| - Marketplace intelligence
|
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
        "GEMINI_PROVIDER_ERROR",

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
      "GEMINI";

    this.cause =
      cause;
  }
}


async function getGeminiClient() {

  const {
    GoogleGenAI
  } =
    await import(
      "@google/genai"
    );

  const apiKey =
    String(
      process.env
        .GEMINI_API_KEY ||
      ""
    ).trim();

  if (!apiKey) {

    throw new LunaExternalProviderError(
      "GEMINI_API_KEY no está configurada.",
      {
        code:
          "GEMINI_API_KEY_MISSING"
      }
    );
  }

  return new GoogleGenAI({
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
        String(
          item?.role ||
          "usuario"
        );

      const text =
        String(
          item?.content ||
          item?.text ||
          ""
        );

      return (
        `${role}: ${text}`
      );
    })
    .join("\n");
}


async function executeGeminiProvider({
  message = "",
  internalContext = null,
  conversation = [],
  systemPrompt = null
} = {}) {

  const config =
    getLunaProviderConfig();

  if (
    !config
      .gemini
      .enabled
  ) {

    throw new LunaExternalProviderError(
      "Gemini no está habilitado.",
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
      "Gemini no tiene API key.",
      {
        code:
          "GEMINI_API_KEY_MISSING"
      }
    );
  }


  const ai =
    await getGeminiClient();


  const model =
    config
      .gemini
      .model;


  const conversationText =
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
      : "Sin contexto interno disponible.";


  const instructions =
    systemPrompt ||
`
Eres LUNA, la inteligencia principal de
Quick Secure Market (QSM).

También colaboras con FraudShield AI,
el sistema preventivo de riesgo y fraude
de QSM.

Tu misión es:

- orientar al usuario;
- comprender conversaciones naturales;
- ayudar con Marketplace;
- analizar productos;
- explicar compras y ventas;
- interpretar señales de seguridad;
- explicar riesgos de forma clara;
- apoyar FraudShield AI.

REGLAS IMPORTANTES:

1. Responde normalmente en español.

2. Nunca inventes información privada
   de QSM.

3. Los datos privados solo pueden
   provenir del contexto suministrado
   por el backend.

4. Nunca declares que una persona
   "es un estafador" como hecho.

5. Utiliza expresiones como:
   "señales de riesgo",
   "riesgo elevado",
   "requiere revisión".

6. No bloquees usuarios.

7. No canceles compras.

8. No modifiques estados críticos.

9. Las decisiones finales pertenecen
   al backend y al BackOffice de QSM.

10. FraudShield AI funciona como
    sistema preventivo y de apoyo.
`.trim();


  const input =
`
CONTEXTO QSM:

${contextText}


CONVERSACIÓN RECIENTE:

${conversationText || "Sin conversación previa."}


MENSAJE ACTUAL:

${String(message || "").trim()}
`.trim();


  try {

    const request =
      ai.models.generateContent({

        model,

        contents:
          input,

        config: {

          systemInstruction:
            instructions,

          temperature:
            0.4,

          maxOutputTokens:
            1200

        }

      });


    const timeout =
      new Promise(
        (_, reject) => {

          setTimeout(
            () => {

              reject(
                new Error(
                  "GEMINI_TIMEOUT"
                )
              );

            },
            config
              .externalTimeoutMs
          );

        }
      );


    const response =
      await Promise.race([
        request,
        timeout
      ]);


    const text =
      String(
        response?.text ||
        ""
      ).trim();


    if (!text) {

      throw new Error(
        "Gemini devolvió una respuesta vacía."
      );
    }


    return {

      success:
        true,

      provider:
        "GEMINI",

      model,

      text

    };


  } catch (error) {

    let code =
      "GEMINI_REQUEST_FAILED";


    if (
      String(
        error?.message ||
        ""
      ).includes(
        "429"
      )
    ) {

      code =
        "GEMINI_RATE_LIMIT";

    }


    if (
      String(
        error?.message ||
        ""
      ).includes(
        "GEMINI_TIMEOUT"
      )
    ) {

      code =
        "GEMINI_TIMEOUT";

    }


    throw new LunaExternalProviderError(
      error?.message ||
      "Error ejecutando Gemini.",
      {
        code,
        cause:
          error
      }
    );
  }
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

    model:
      config
        .gemini
        .model,

    ready:
      Boolean(
        config
          .gemini
          .enabled &&
        config
          .gemini
          .hasApiKey
      ),

    stage:
      "ACTIVE",

    consumesQuota:
      true,

    description:
      "Gemini es la inteligencia externa principal de QSM."
  };
}


module.exports = {

  LunaExternalProviderError,

  executeGeminiProvider,

  getGeminiProviderStatus

};
