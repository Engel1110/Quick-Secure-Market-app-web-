"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA MARKETPLACE GUIDE MIDDLEWARE
|--------------------------------------------------------------------------
| FASE 17 BLOQUE 13 LOCAL
|--------------------------------------------------------------------------
*/

const {
  buildGuidedMarketplaceResult
} = require(
  "../services/luna-marketplace-guide.service"
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

function sendLunaResponse({
  req,
  res,
  answer,
  code,
  marketplace = null
}) {
  return res
    .status(200)
    .json({
      success:
        true,

      assistant:
        "LUNA",

      provider:
        "QSM_GUIDED_MARKETPLACE",

      model:
        "LUNA-LOCAL-17.13",

      answer,

      response:
        answer,

      contextual:
        true,

      result: {
        assistant:
          "LUNA",

        authenticated:
          Boolean(
            req?.user ||
            req?.prismaUser
          ),

        intent: {
          code,

          confidence:
            req
              ?.lunaSemantic
              ?.confidence ||
            1
        },

        state: {
          code:
            "READY",

          requiresAuthentication:
            false
        },

        message:
          answer,

        marketplace,

        conversationState:
          req
            .lunaConversationState ||
          null,

        contextLoaded:
          true,

        memoryEnabled:
          true,

        generatedAt:
          new Date()
            .toISOString(),

        version:
          "QSM-LUNA-GUIDED-17.13"
      }
    });
}

async function lunaMarketplaceGuide(
  req,
  res,
  next
) {
  try {
    const state =
      req
        ?.lunaConversationState;

    /*
      Solo participa cuando existe una
      conversación Marketplace real.
    */

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
      await buildGuidedMarketplaceResult(
        state
      );

    /*
      LUNA necesita una aclaración.
    */

    if (
      !result.ready &&
      result.reason ===
        "MORE_CONTEXT_REQUIRED"
    ) {
      const userId =
        getUserId(req);

      const sessionId =
        getSessionId(req);

      const updated =
        updateConversationState({
          userId,
          sessionId,

          patch: {
            waitingFor:
              result
                .waitingFor
          }
        });

      req.lunaConversationState =
        updated ||
        state;

      return sendLunaResponse({
        req,
        res,

        answer:
          result.answer,

        code:
          "MARKETPLACE_CLARIFICATION",

        marketplace: {
          query:
            state
              .product
              .query,

          waitingFor:
            result
              .waitingFor
        }
      });
    }

    /*
      Todavía no es responsabilidad
      de este middleware.
    */

    if (!result.ready) {
      return next();
    }

    /*
    | QSM_FASE17_5_BLOCK_F_RESULT_MEMORY
    |
    | Guardar solamente los resultados compactos
    | mostrados al usuario.
    */

    const userId =
      getUserId(req);

    const sessionId =
      getSessionId(req);

    const stateWithResults =
      updateConversationState({

        userId,
        sessionId,

        patch: {

          results:
            Array.isArray(
              result.options
            )
              ? result.options
              : [],

          selectedResultIndex:
            0,

          selectedResultId:
            result
              ?.options
              ?.[0]
              ?.id ||
            null,

          lastMarketplaceQuery:
            result.query ||
            null
        }
      });

    if (stateWithResults) {

      req.lunaConversationState =
        stateWithResults;
    }

    return sendLunaResponse({
      req,
      res,

      answer:
        result.answer,

      code:
        "MARKETPLACE_GUIDED_RESULTS",

      marketplace: {
        query:
          result.query,

        total:
          result.total,

        preferences:
          result.preferences,

        options:
          result.options,

        neutrality:
          result
            .neutrality
      }
    });
  }
  catch (error) {
    console.error(
      "[LUNA MARKETPLACE GUIDE][ERROR]",
      {
        name:
          error?.name,

        message:
          error?.message,

        code:
          error?.code,

        meta:
          error?.meta
      }
    );

    /*
      Nunca romper los motores existentes.
    */

    return next();
  }
}

module.exports = {
  lunaMarketplaceGuide
};
