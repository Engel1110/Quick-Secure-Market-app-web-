"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA CONTEXTUAL COMPARISON MIDDLEWARE
|--------------------------------------------------------------------------
| FASE 17.5 BLOQUE E
|--------------------------------------------------------------------------
*/

const {
  detectContextualComparison,
  compareCurrentOptions
} = require(
  "../services/luna-contextual-comparison.service"
);

function getOptions(req) {
  return (
    req?.lunaMarketplaceResults ||
    req?.body
      ?.lunaMarketplaceResults ||
    req?.lunaConversationState
      ?.results ||
    req?.body
      ?.context
      ?.marketplace
      ?.options ||
    []
  );
}

function lunaContextualComparison(
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

    const type =
      detectContextualComparison(
        message
      );

    if (!type) {
      return next();
    }

    const state =
      req
        ?.lunaConversationState;

    if (
      state?.topic !==
      "MARKETPLACE"
    ) {
      return next();
    }

    const options =
      getOptions(req);

    if (
      !Array.isArray(options) ||
      !options.length
    ) {
      /*
        No inventar resultados.
        Dejamos pasar para fallback contextual.
      */

      return next();
    }

    const result =
      compareCurrentOptions({
        type,
        options,
        currentIndex:
          Number(
            state
              ?.selectedResultIndex ||
            0
          )
      });

    if (
      !result.ok ||
      !result.answer
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
          "QSM_CONTEXTUAL_COMPARISON",

        model:
          "LUNA-LOCAL-17.5-E",

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
              `CONTEXT_${type}`,

            confidence:
              1
          },

          message:
            result.answer,

          selected:
            result.selected ||
            null,

          comparisonType:
            type,

          conversationState:
            state,

          generatedAt:
            new Date()
              .toISOString(),

          version:
            "QSM-LUNA-LOCAL-17.5-E"
        }
      });
  }
  catch (error) {
    console.error(
      "[LUNA CONTEXTUAL COMPARISON][ERROR]",
      error?.message ||
      error
    );

    return next();
  }
}

module.exports = {
  lunaContextualComparison
};
