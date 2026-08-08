"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA NEUTRAL COMPARISON MIDDLEWARE
|--------------------------------------------------------------------------
| FASE 17 BLOQUE 15 LOCAL
|--------------------------------------------------------------------------
*/

const {
  detectCompareIntent,
  buildNeutralComparison
} = require(
  "../services/luna-neutral-comparison.service"
);

function sendResponse({
  req,
  res,
  mode,
  result
}) {
  return res
    .status(200)
    .json({
      success:
        true,

      assistant:
        "LUNA",

      provider:
        "QSM_NEUTRAL_COMPARISON",

      model:
        "LUNA-LOCAL-17.15",

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
            `MARKETPLACE_${mode}`,

          confidence:
            req
              ?.lunaSemantic
              ?.confidence ||
            1
        },

        message:
          result.answer,

        comparison: {
          mode,

          options:
            result.options,

          neutrality:
            result.neutrality
        },

        conversationState:
          req
            ?.lunaConversationState ||
          null,

        contextLoaded:
          true,

        memoryEnabled:
          true,

        generatedAt:
          new Date()
            .toISOString(),

        version:
          "QSM-LUNA-LOCAL-17.15"
      }
    });
}

async function lunaNeutralComparison(
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

    const mode =
      detectCompareIntent(
        message
      );

    if (!mode) {
      return next();
    }

    const state =
      req
        ?.lunaConversationState;

    if (
      !state ||
      state.topic !==
        "MARKETPLACE" ||
      !state
        ?.product
        ?.query
    ) {
      return next();
    }

    const result =
      await buildNeutralComparison({
        state,
        mode
      });

    return sendResponse({
      req,
      res,
      mode,
      result
    });
  }
  catch (error) {
    console.error(
      "[LUNA NEUTRAL COMPARISON][ERROR]",
      {
        name:
          error?.name,

        message:
          error?.message,

        code:
          error?.code
      }
    );

    return next();
  }
}

module.exports = {
  lunaNeutralComparison
};
