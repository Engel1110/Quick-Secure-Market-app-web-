"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA SMART FALLBACK MIDDLEWARE
|--------------------------------------------------------------------------
| FASE 17.5 BLOQUE I
|--------------------------------------------------------------------------
*/

const {
  buildSmartFallback
} = require(
  "../services/luna-smart-fallback.service"
);


function lunaSmartFallback(
  req,
  res,
  next
) {

  try {

    const message =
      String(
        req?.body?.message ||
        ""
      ).trim();


    if (!message) {
      return next();
    }


    const result =
      buildSmartFallback({

        message,

        semantic:
          req
            ?.lunaSemantic ||
          req
            ?.body
            ?.lunaSemantic ||
          null,

        state:
          req
            ?.lunaConversationState ||
          req
            ?.body
            ?.lunaConversationState ||
          null

      });


    if (
      !result?.handled ||
      !result?.answer
    ) {

      return next();
    }


    return res
      .status(200)
      .json({

        success:
          true,

        assistant:
          "LUNA",

        provider:
          "QSM_SMART_FALLBACK",

        model:
          "LUNA-LOCAL-17.5-I",

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
              `SMART_FALLBACK_${result.code}`,

            semanticIntent:
              req
                ?.lunaSemantic
                ?.intent
                ?.code ||
              null,

            confidence:
              req
                ?.lunaSemantic
                ?.confidence ||
              0
          },

          message:
            result.answer,

          fallbackCode:
            result.code,

          conversationState:
            req
              ?.lunaConversationState ||
            null,

          contextLoaded:
            Boolean(
              req
                ?.lunaConversationState
            ),

          memoryEnabled:
            true,

          generatedAt:
            new Date()
              .toISOString(),

          version:
            "QSM-LUNA-LOCAL-17.5-I"
        }
      });

  }
  catch (error) {

    console.error(
      "[LUNA SMART FALLBACK][ERROR]",
      error?.message ||
      error
    );

    /*
      No romper el endpoint.
      El motor anterior todavía puede intentar responder.
    */

    return next();
  }
}


module.exports = {
  lunaSmartFallback
};
