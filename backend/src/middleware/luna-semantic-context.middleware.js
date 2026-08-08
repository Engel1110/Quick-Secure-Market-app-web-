"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA SEMANTIC CONTEXT MIDDLEWARE
|--------------------------------------------------------------------------
| FASE 17 BLOQUE 10 LOCAL
|
| Analiza el mensaje una sola vez y deja el resultado
| disponible para todos los motores posteriores.
|--------------------------------------------------------------------------
*/

const {
  analyzeLunaMessage
} = require(
  "../services/luna-semantic-core.service"
);

function resolvePreviousTopic(
  req
) {
  return (
    req?.lunaConversationState
      ?.topic ||
    req?.body
      ?.context
      ?.conversationTopic ||
    req?.body
      ?.conversationTopic ||
    null
  );
}

function lunaSemanticContext(
  req,
  _res,
  next
) {
  try {
    const message =
      String(
        req?.body
          ?.message ||
        ""
      ).trim();

    if (!message) {
      return next();
    }

    const previousTopic =
      resolvePreviousTopic(
        req
      );

    const semantic =
      analyzeLunaMessage({
        message,
        previousTopic
      });

    /*
      NO respondemos aquí.

      Solamente enriquecemos req.
    */

    req.lunaSemantic =
      semantic;

    /*
      También dejamos información mínima
      disponible en el body para compatibilidad
      con motores posteriores.
    */

    if (
      req.body &&
      typeof req.body ===
        "object"
    ) {
      req.body.lunaSemantic = {
        intent:
          semantic
            .intent
            ?.code ||
          null,

        family:
          semantic
            .intent
            ?.family ||
          null,

        confidence:
          semantic
            .confidence,

        confidenceLevel:
          semantic
            .confidenceLevel,

        likelyContinuation:
          semantic
            .shape
            .likelyContinuation
      };
    }

    /*
      Debug controlado.
    */

    if (
      process.env
        .NODE_ENV !==
        "production"
    ) {
      console.log(
        "[LUNA SEMANTIC]",
        {
          message:
            message.slice(
              0,
              80
            ),

          intent:
            semantic
              .intent
              ?.code ||
            "UNKNOWN",

          confidence:
            semantic
              .confidence,

          level:
            semantic
              .confidenceLevel,

          continuation:
            semantic
              .shape
              .likelyContinuation
        }
      );
    }

    return next();
  }
  catch (error) {
    /*
      El motor semántico jamás debe tumbar
      la conversación existente.
    */

    console.error(
      "[LUNA SEMANTIC][ERROR]",
      error?.message ||
      error
    );

    return next();
  }
}

module.exports = {
  lunaSemanticContext
};
