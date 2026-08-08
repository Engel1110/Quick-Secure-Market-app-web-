"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA NATURAL CONTINUATION MIDDLEWARE
|--------------------------------------------------------------------------
| FASE 17.5 BLOQUE F
|--------------------------------------------------------------------------
*/

const {
  detectContinuationIntent,
  resolveNaturalContinuation
} = require(
  "../services/luna-natural-continuation.service"
);

const {
  updateConversationState
} = require(
  "../services/luna-conversation-state.service"
);


function getUserId(req) {

  return (
    req?.prismaUser?.id ||
    req?.user?.id ||
    req?.user?.userId ||
    req?.auth?.userId ||
    null
  );
}


function getSessionId(req) {

  return (
    req?.body?.sessionId ||
    req?.body
      ?.context
      ?.memory
      ?.sessionId ||
    null
  );
}


function lunaNaturalContinuation(
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


    const intent =
      detectContinuationIntent(
        message
      );


    if (!intent) {
      return next();
    }


    const state =
      req
        ?.lunaConversationState;


    if (
      !state ||
      state.topic !==
        "MARKETPLACE"
    ) {

      return next();
    }


    const results =
      Array.isArray(
        state.results
      )
        ? state.results
        : [];


    if (!results.length) {

      /*
        No inventar producto.
        Dejamos pasar al fallback.
      */

      return next();
    }


    const result =
      resolveNaturalContinuation({

        intent,

        results,

        selectedIndex:
          Number(
            state
              ?.selectedResultIndex ||
            0
          ),

        state

      });


    if (
      !result.ok ||
      !result.answer
    ) {

      return next();
    }


    const updated =
      updateConversationState({

        userId:
          getUserId(req),

        sessionId:
          getSessionId(req),

        patch: {

          selectedResultIndex:
            result.selectedIndex,

          selectedResultId:
            result
              ?.option
              ?.id ||
            null,

          previousIntent:
            state
              ?.lastIntent ||
            null,

          lastIntent:
            `CONTINUATION_${intent}`,

          lastUserMessage:
            message
        }

      }) ||
      state;


    req.lunaConversationState =
      updated;


    return res
      .status(200)
      .json({

        success:
          true,

        assistant:
          "LUNA",

        provider:
          "QSM_NATURAL_CONTINUATION",

        model:
          "LUNA-LOCAL-17.5-F",

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
              `CONTINUATION_${intent}`,

            confidence:
              1
          },

          message:
            result.answer,

          selected:
            result.option,

          selectedResultIndex:
            result.selectedIndex,

          conversationState:
            updated,

          contextLoaded:
            true,

          memoryEnabled:
            true,

          generatedAt:
            new Date()
              .toISOString(),

          version:
            "QSM-LUNA-LOCAL-17.5-F"
        }
      });

  }
  catch (error) {

    console.error(
      "[LUNA NATURAL CONTINUATION][ERROR]",
      error?.message ||
      error
    );

    return next();
  }
}


module.exports = {
  lunaNaturalContinuation
};
