"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA CONTEXT RESOLVER MIDDLEWARE
|--------------------------------------------------------------------------
| FASE 17.5 BLOQUE B
|--------------------------------------------------------------------------
*/

const {
  resolveContextualMessage
} = require(
  "../services/luna-context-resolver.service"
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

function mergePatch(
  state,
  patch
) {
  return {
    ...patch,

    product: {
      ...(
        state?.product ||
        {}
      ),

      ...(
        patch?.product ||
        {}
      )
    },

    preferences: {
      ...(
        state?.preferences ||
        {}
      ),

      ...(
        patch?.preferences ||
        {}
      )
    }
  };
}

function lunaContextResolver(
  req,
  _res,
  next
) {
  try {
    const state =
      req
        ?.lunaConversationState;

    const message =
      String(
        req?.body?.message ||
        ""
      ).trim();

    if (
      !state ||
      !message
    ) {
      return next();
    }

    const result =
      resolveContextualMessage({
        message,
        state
      });

    if (
      !result.resolved
    ) {
      return next();
    }

    const userId =
      getUserId(req);

    const sessionId =
      getSessionId(req);

    const merged =
      mergePatch(
        state,
        result.patch
      );

    const updated =
      updateConversationState({
        userId,
        sessionId,

        patch: {
          ...merged,

          previousIntent:
            state
              ?.lastIntent ||
            null,

          lastIntent:
            `CONTEXT_${result.type}`,

          lastUserMessage:
            message,

          /*
            La siguiente capa recalculará
            waitingFor según el nuevo estado.
          */
          waitingFor:
            null
        }
      });

    req.lunaConversationState =
      updated;

    req.lunaContextResolved = {
      type:
        result.type,

      value:
        result.value
    };

    if (
      req.body &&
      typeof req.body ===
        "object"
    ) {
      req.body.lunaContextResolved = {
        type:
          result.type,

        value:
          result.value
      };

      req.body.lunaConversationState = {
        topic:
          updated?.topic ||
          null,

        product:
          updated?.product ||
          {},

        preferences:
          updated
            ?.preferences ||
          {},

        waitingFor:
          updated
            ?.waitingFor ||
          null,

        lastIntent:
          updated
            ?.lastIntent ||
          null
      };
    }

    if (
      process.env
        .NODE_ENV !==
      "production"
    ) {
      console.log(
        "[LUNA CONTEXT RESOLVER]",
        {
          waitingFor:
            state
              ?.waitingFor,

          resolved:
            result.type,

          value:
            result.value
        }
      );
    }

    return next();
  }
  catch (error) {
    console.error(
      "[LUNA CONTEXT RESOLVER][ERROR]",
      error?.message ||
      error
    );

    return next();
  }
}

module.exports = {
  lunaContextResolver
};
