/*
|--------------------------------------------------------------------------
| QSM - LUNA AI SERVICE
|--------------------------------------------------------------------------
| Fase 17 Bloque 1
|
| Capa de abstracción entre AiAssistant y el futuro backend IA.
|
| IMPORTANTE:
| - No colocar API keys aquí.
| - No llamar directamente OpenAI/Gemini/Groq/etc desde frontend.
| - Las futuras claves vivirán solamente en backend.
|--------------------------------------------------------------------------
*/

import {
  buildLunaSystemPrompt
} from "./luna-system-prompt";

import {
  sanitizeLunaContext
} from "./luna-context.service";

const DEFAULT_ENDPOINT =
  "/api/ai/luna/chat";

const DEFAULT_TIMEOUT =
  25000;

export class LunaAiError extends Error {
  constructor(
    message,
    {
      code =
        "LUNA_AI_ERROR",

      status =
        null,

      cause =
        null
    } = {}
  ) {
    super(message);

    this.name =
      "LunaAiError";

    this.code =
      code;

    this.status =
      status;

    this.cause =
      cause;
  }
}

export async function requestLunaAiResponse({
  message,
  conversation = [],
  user = null,
  context = null,
  endpoint = DEFAULT_ENDPOINT,
  signal = null
} = {}) {
  const cleanMessage =
    String(
      message || ""
    ).trim();

  if (!cleanMessage) {
    throw new LunaAiError(
      "El mensaje está vacío.",
      {
        code:
          "EMPTY_MESSAGE"
      }
    );
  }

  const safeConversation =
    normalizeConversation(
      conversation
    );

  const safeContext =
    sanitizeLunaContext(
      context
    );

  const payload = {
    message:
      cleanMessage,

    conversation:
      safeConversation,

    context:
      safeContext,

    systemPrompt:
      buildLunaSystemPrompt({
        user,
        context:
          safeContext
      }),

    metadata: {
      assistant:
        "LUNA",

      client:
        "QSM_WEB",

      version:
        "17.1"
    }
  };

  const controller =
    signal
      ? null
      : new AbortController();

  const timeoutId =
    controller
      ? window.setTimeout(
          () => {
            controller.abort();
          },
          DEFAULT_TIMEOUT
        )
      : null;

  try {
    const response =
      await fetch(
        endpoint,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          credentials:
            "include",

          body:
            JSON.stringify(
              payload
            ),

          signal:
            signal ||
            controller?.signal
        }
      );

    if (!response.ok) {
      throw new LunaAiError(
        `LUNA IA respondió con estado ${response.status}.`,
        {
          code:
            "HTTP_ERROR",

          status:
            response.status
        }
      );
    }

    const data =
      await response.json();

    const answer =
      extractAnswer(
        data
      );

    if (!answer) {
      throw new LunaAiError(
        "El proveedor IA no devolvió una respuesta válida.",
        {
          code:
            "INVALID_RESPONSE"
        }
      );
    }

    return {
      ok: true,

      answer,

      provider:
        data?.provider ||
        null,

      model:
        data?.model ||
        null,

      usage:
        data?.usage ||
        null,

      raw:
        data
    };
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      throw new LunaAiError(
        "La solicitud de LUNA tardó demasiado.",
        {
          code:
            "TIMEOUT",

          cause:
            error
        }
      );
    }

    if (
      error instanceof
        LunaAiError
    ) {
      throw error;
    }

    throw new LunaAiError(
      "No fue posible conectar con el motor IA de LUNA.",
      {
        code:
          "NETWORK_ERROR",

        cause:
          error
      }
    );
  } finally {
    if (timeoutId) {
      window.clearTimeout(
        timeoutId
      );
    }
  }
}

export function isLunaAiAvailable() {
  /*
    En Bloque 1 dejamos la infraestructura lista,
    pero NO activamos todavía llamadas reales.

    Bloques posteriores conectarán el backend y el proveedor.
  */

  return false;
}

export function getLunaAiConfiguration() {
  return {
    enabled:
      isLunaAiAvailable(),

    endpoint:
      DEFAULT_ENDPOINT,

    version:
      "17.1",

    architecture:
      "provider-agnostic"
  };
}

function normalizeConversation(
  conversation
) {
  if (
    !Array.isArray(
      conversation
    )
  ) {
    return [];
  }

  return conversation
    .slice(-20)
    .map(
      (item) => ({
        role:
          normalizeRole(
            item?.role ||
            item?.sender ||
            item?.type
          ),

        content:
          String(
            item?.content ||
            item?.text ||
            item?.message ||
            ""
          )
            .trim()
            .slice(
              0,
              4000
            )
      })
    )
    .filter(
      (item) =>
        item.content
    );
}

function normalizeRole(
  value
) {
  const role =
    String(
      value || ""
    )
      .trim()
      .toLowerCase();

  if (
    [
      "assistant",
      "luna",
      "bot"
    ].includes(role)
  ) {
    return "assistant";
  }

  return "user";
}

function extractAnswer(
  data
) {
  const candidates = [
    data?.answer,
    data?.message,
    data?.content,
    data?.response,
    data?.data?.answer,
    data?.data?.message
  ];

  const found =
    candidates.find(
      (value) =>
        typeof value ===
          "string" &&
        value.trim()
    );

  return found
    ? found.trim()
    : "";
}

export default {
  requestLunaAiResponse,
  isLunaAiAvailable,
  getLunaAiConfiguration
};
