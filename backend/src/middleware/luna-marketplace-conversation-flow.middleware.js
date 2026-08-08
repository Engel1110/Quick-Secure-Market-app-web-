"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA MARKETPLACE CONVERSATION FLOW MIDDLEWARE
|--------------------------------------------------------------------------
| FASE 17.5 BLOQUE D
|--------------------------------------------------------------------------
*/

const {
  nextMarketplaceStep
} = require(
  "../services/luna-marketplace-conversation-flow.service"
);

/*
| QSM_FASE17_5_BLOCK_H_FINAL
*/

const {
  buildAcknowledgement,
  buildTransition
} = require(
  "../services/luna-natural-response.service"
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

function sendFlowResponse({
  req,
  res,
  state,
  step,
  answer
}) {
  return res
    .status(200)
    .json({
      success:
        true,

      assistant:
        "LUNA",

      provider:
        "QSM_MARKETPLACE_FLOW",

      model:
        "LUNA-LOCAL-17.5-D",

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
            "MARKETPLACE_CONVERSATION",

          confidence:
            1
        },

        message:
          answer,

        conversationState:
          state,

        flow: {
          waitingFor:
            step,

          readyForResults:
            false
        },

        generatedAt:
          new Date()
            .toISOString(),

        version:
          "QSM-LUNA-LOCAL-17.5-D"
      }
    });
}

function lunaMarketplaceConversationFlow(
  req,
  res,
  next
) {
  try {
    let state =
      req
        ?.lunaConversationState;

    if (
      !state ||
      state.topic !==
        "MARKETPLACE"
    ) {
      return next();
    }

    /*
      Si hubo reset, el Bloque C responde antes.
    */

    if (
      req
        ?.lunaConversationReset
    ) {
      return next();
    }

    const flow =
      nextMarketplaceStep(
        state
      );

    if (
      flow.ready
    ) {
      return next();
    }

    const userId =
      getUserId(req);

    const sessionId =
      getSessionId(req);

    /*
      Guardar exactamente qué está esperando LUNA.
    */

    state =
      updateConversationState({
        userId,
        sessionId,

        patch: {
          waitingFor:
            flow.step
        }
      }) ||
      state;

    req.lunaConversationState =
      state;

    /*
      Si Context Resolver acaba de capturar
      un valor, agregar confirmación natural.
    */

    const resolved =
      req
        ?.lunaContextResolved;

    const acknowledgement =
      resolved
        ? buildAcknowledgement({
            type:
              resolved.type,

            value:
              resolved.value,

            seed:
              String(
                req?.body?.message ||
                ""
              )
          })
        : "";

    const transition =
      buildTransition({
        step:
          flow.step,

        product:
          state
            ?.product
            ?.query ||
          null,

        seed:
          String(
            req?.body?.message ||
            ""
          )
      }) ||
      flow.answer;

    const answer =
      [
        acknowledgement,
        transition
      ]
        .filter(Boolean)
        .join(" ");

    return sendFlowResponse({
      req,
      res,
      state,
      step:
        flow.step,
      answer
    });
  }
  catch (error) {
    console.error(
      "[LUNA MARKETPLACE FLOW][ERROR]",
      error?.message ||
      error
    );

    return next();
  }
}

module.exports = {
  lunaMarketplaceConversationFlow
};
