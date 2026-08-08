"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA DYNAMIC CONTEXT MIDDLEWARE
|--------------------------------------------------------------------------
| FASE 17.5 BLOQUE G
|--------------------------------------------------------------------------
*/

const {
  detectDynamicContext,
  applyDynamicContext
} = require(
  "../services/luna-dynamic-context.service"
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


function lunaDynamicContext(
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


    const command =
      detectDynamicContext(
        message
      );


    if (!command) {
      return next();
    }


    const applied =
      applyDynamicContext({
        command,
        state
      });


    if (
      !applied.applied
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

          topic:
            "MARKETPLACE",

          preferences:
            applied.preferences,

          /*
            Resultados anteriores dejan de ser
            válidos cuando cambia el criterio.
          */

          results:
            [],

          selectedResultIndex:
            0,

          selectedResultId:
            null,

          previousIntent:
            state
              ?.lastIntent ||
            null,

          lastIntent:
            `DYNAMIC_${command.code}`,

          lastUserMessage:
            message
        }
      }) ||
      state;


    req.lunaConversationState =
      updated;


    req.lunaDynamicContext = {
      command:
        command.code,

      value:
        command.value ??
        null
    };


    /*
      No respondemos todavía.
      Dejamos que Flow/Marketplace use el estado actualizado.
    */

    req.lunaDynamicAcknowledgement =
      applied.explanation;


    return next();

  }
  catch (error) {

    console.error(
      "[LUNA DYNAMIC CONTEXT][ERROR]",
      error?.message ||
      error
    );

    return next();
  }
}


module.exports = {
  lunaDynamicContext
};
