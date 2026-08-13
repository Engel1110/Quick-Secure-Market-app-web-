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

/* QSM_BLOQUE10_GEMINI_BRAIN */

const {
  routeLunaRequest
} = require(
  "../services/luna-provider-router.service"
);


async function lunaSmartFallback(
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


    /*
    |--------------------------------------------------------------------------
    | GEMINI - CEREBRO EXTERNO DE LUNA
    |--------------------------------------------------------------------------
    */

    try {

      const state =
        req?.lunaConversationState ||
        req?.body?.lunaConversationState ||
        null;

      const semantic =
        req?.lunaSemantic ||
        req?.body?.lunaSemantic ||
        null;

      const providerResult =
        await routeLunaRequest({

          message,

          intent:
            semantic?.intent?.code ||
            null,

          internalContext: {

            source:
              "QSM_LUNA_SMART_FALLBACK",

            topic:
              state?.topic ||
              null,

            product:
              state?.product?.query ||
              null,

            preferences:
              state?.preferences ||
              {},

            semanticIntent:
              semantic?.intent?.code ||
              null

          },

          conversation:
            Array.isArray(
              req?.body?.conversation
            )
              ? req.body.conversation
              : [],

          systemPrompt:
            [
              "Eres LUNA, la asistente inteligente de Quick Secure Market (QSM).",
              "Responde en español natural, claro y profesional.",
              "Usa conocimiento general cuando la pregunta no dependa de datos privados de QSM.",
              "No inventes compras, usuarios, vendedores, disputas, balances ni estados internos.",
              "Si el usuario cambia de tema, responde a la pregunta actual.",
              "Tu identidad frente al usuario es LUNA."
            ].join(" ")

        });


      const providerText =
        String(
          providerResult?.text ||
          providerResult?.message ||
          ""
        ).trim();


      if (
        providerResult?.provider === "GEMINI" &&
        providerText
      ) {

        return res
          .status(200)
          .json({

            success: true,

            assistant:
              "LUNA",

            provider:
              "GEMINI",

            model:
              providerResult?.model ||
              null,

            answer:
              providerText,

            response:
              providerText,

            externalKnowledge:
              true,

            contextual:
              Boolean(state),

            result: {

              assistant:
                "LUNA",

              message:
                providerText,

              provider:
                "GEMINI",

              route:
                providerResult?.router?.route ||
                "GEMINI",

              externalKnowledge:
                true,

              conversationState:
                state,

              generatedAt:
                new Date().toISOString(),

              version:
                "QSM-LUNA-GEMINI-BRAIN-10.1"

            }

          });

      }

    }
    catch (providerError) {

      console.warn(
        "[LUNA GEMINI BRAIN][FALLBACK_LOCAL]",
        providerError?.code ||
        providerError?.message ||
        providerError
      );

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
