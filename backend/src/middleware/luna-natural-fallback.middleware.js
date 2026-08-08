"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA NATURAL FALLBACK MIDDLEWARE
|--------------------------------------------------------------------------
| FASE 17 BLOQUE 14 LOCAL
|
| Solo responde cuando los motores especializados
| anteriores NO resolvieron la solicitud.
|--------------------------------------------------------------------------
*/

const {
  buildNaturalFallback
} = require(
  "../services/luna-natural-fallback.service"
);

function getUser(req) {
  return (
    req?.prismaUser ||
    req?.user ||
    null
  );
}

function lunaNaturalFallback(
  req,
  res,
  _next
) {
  try {
    const message =
      String(
        req?.body?.message ||
        ""
      ).trim();

    const semantic =
      req
        ?.lunaSemantic ||
      null;

    const state =
      req
        ?.lunaConversationState ||
      null;

    const result =
      buildNaturalFallback({
        message,
        semantic,
        state,

        user:
          getUser(req)
      });

    return res
      .status(200)
      .json({
        success:
          true,

        assistant:
          "LUNA",

        provider:
          "QSM_LOCAL_CONVERSATION",

        model:
          "LUNA-LOCAL-17.14",

        answer:
          result.answer,

        response:
          result.answer,

        contextual:
          true,

        result: {
          assistant:
            "LUNA",

          intent: {
            code:
              result.code,

            semanticIntent:
              semantic
                ?.intent
                ?.code ||
              null,

            confidence:
              semantic
                ?.confidence ||
              0
          },

          message:
            result.answer,

          conversationState:
            state,

          contextLoaded:
            Boolean(state),

          memoryEnabled:
            Boolean(state),

          generatedAt:
            new Date()
              .toISOString(),

          version:
            "QSM-LUNA-LOCAL-17.14"
        }
      });
  }
  catch (error) {
    console.error(
      "[LUNA NATURAL FALLBACK][ERROR]",
      error?.message ||
      error
    );

    return res
      .status(200)
      .json({
        success:
          true,

        assistant:
          "LUNA",

        answer:
          "No pude interpretar bien ese mensaje. Intenta explicármelo de otra manera y continúo contigo.",

        response:
          "No pude interpretar bien ese mensaje. Intenta explicármelo de otra manera y continúo contigo."
      });
  }
}

module.exports = {
  lunaNaturalFallback
};
