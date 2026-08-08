"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA SEARCH RESET MIDDLEWARE
|--------------------------------------------------------------------------
| FASE 17.5 BLOQUE C - FINAL RECOVERY
|--------------------------------------------------------------------------
*/

const {
  detectSearchReset,
  buildResetResponse
} = require(
  "../services/luna-search-reset.service"
);

const {
  resetConversationTopic,
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
    req?.body?.context?.memory?.sessionId ||
    null
  );
}


function lunaSearchReset(
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


    if (
      !message ||
      !detectSearchReset(
        message
      )
    ) {

      return next();
    }


    const userId =
      getUserId(req);

    const sessionId =
      getSessionId(req);


    resetConversationTopic({
      userId,
      sessionId
    });


    const updated =
      updateConversationState({

        userId,
        sessionId,

        patch: {

          topic:
            "MARKETPLACE",

          product: {
            query:
              null,

            category:
              null,

            brand:
              null,

            model:
              null
          },

          preferences: {
            budgetMax:
              null,

            budgetMin:
              null,

            ramGb:
              null,

            storageGb:
              null,

            useCase:
              null,

            condition:
              null
          },

          results:
            [],

          selectedResultIndex:
            0,

          selectedResultId:
            null,

          waitingFor:
            "product",

          previousIntent:
            req
              ?.lunaConversationState
              ?.lastIntent ||
            null,

          lastIntent:
            "MARKETPLACE_RESET",

          lastUserMessage:
            message
        }
      });


    req.lunaConversationState =
      updated;

    req.lunaConversationReset =
      true;


    const answer =
      buildResetResponse(
        message
      );


    return res
      .status(200)
      .json({

        success:
          true,

        assistant:
          "LUNA",

        provider:
          "QSM_SEARCH_RESET",

        model:
          "LUNA-LOCAL-17.5-C",

        answer,

        response:
          answer,

        contextual:
          true,

        result: {

          assistant:
            "LUNA",

          intent: {
            code:
              "MARKETPLACE_RESET",

            confidence:
              1
          },

          message:
            answer,

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
            "QSM-LUNA-LOCAL-17.5-C"
        }
      });

  }
  catch (error) {

    console.error(
      "[LUNA SEARCH RESET][ERROR]",
      error?.message ||
      error
    );

    return next();
  }
}


module.exports = {
  lunaSearchReset
};
