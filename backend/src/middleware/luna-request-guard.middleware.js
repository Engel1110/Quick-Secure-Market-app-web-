"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA REQUEST GUARD
|--------------------------------------------------------------------------
| Fase 17 Bloque 9
|
| Protección ligera del endpoint conversacional.
|--------------------------------------------------------------------------
*/

const MAX_MESSAGE_LENGTH =
  2500;

const MAX_HISTORY_ITEMS =
  24;

const MAX_HISTORY_ITEM_LENGTH =
  2500;

const RATE_WINDOW_MS =
  60000;

const MAX_REQUESTS_PER_WINDOW =
  35;

const rateBuckets =
  new Map();

/* ========================================================================
   HELPERS
======================================================================== */

function getUserIdentifier(
  req
) {
  return String(
    req?.prismaUser?.id ||
    req?.user?.id ||
    req?.user?.userId ||
    req?.auth?.userId ||
    req?.ip ||
    "anonymous"
  );
}

function cleanExpiredBuckets() {
  const current =
    Date.now();

  for (
    const [
      key,
      bucket
    ]
    of rateBuckets.entries()
  ) {
    if (
      !bucket ||
      current -
        bucket.startedAt >
        RATE_WINDOW_MS *
        2
    ) {
      rateBuckets.delete(
        key
      );
    }
  }
}

function consumeRateLimit(
  identifier
) {
  cleanExpiredBuckets();

  const current =
    Date.now();

  const bucket =
    rateBuckets.get(
      identifier
    );

  if (
    !bucket ||
    current -
      bucket.startedAt >=
      RATE_WINDOW_MS
  ) {
    rateBuckets.set(
      identifier,
      {
        count: 1,

        startedAt:
          current
      }
    );

    return {
      allowed:
        true,

      remaining:
        MAX_REQUESTS_PER_WINDOW -
        1
    };
  }

  if (
    bucket.count >=
      MAX_REQUESTS_PER_WINDOW
  ) {
    return {
      allowed:
        false,

      remaining:
        0,

      retryAfterMs:
        RATE_WINDOW_MS -
        (
          current -
          bucket.startedAt
        )
    };
  }

  bucket.count += 1;

  return {
    allowed:
      true,

    remaining:
      Math.max(
        0,
        MAX_REQUESTS_PER_WINDOW -
        bucket.count
      )
  };
}

function trimHistory(
  collection
) {
  if (
    !Array.isArray(
      collection
    )
  ) {
    return collection;
  }

  return collection
    .slice(
      -MAX_HISTORY_ITEMS
    )
    .map(
      (item) => {
        if (
          !item ||
          typeof item !==
            "object"
        ) {
          return item;
        }

        const clone = {
          ...item
        };

        [
          "content",
          "text",
          "message"
        ].forEach(
          (field) => {
            if (
              typeof clone[field] ===
                "string"
            ) {
              clone[field] =
                clone[field]
                  .trim()
                  .slice(
                    0,
                    MAX_HISTORY_ITEM_LENGTH
                  );
            }
          }
        );

        return clone;
      }
    );
}

function sanitizeBody(
  req
) {
  if (
    !req.body ||
    typeof req.body !==
      "object"
  ) {
    return;
  }

  if (
    typeof req.body.message ===
      "string"
  ) {
    req.body.message =
      req.body.message
        .trim()
        .slice(
          0,
          MAX_MESSAGE_LENGTH
        );
  }

  if (
    Array.isArray(
      req.body.conversation
    )
  ) {
    req.body.conversation =
      trimHistory(
        req.body.conversation
      );
  }

  if (
    Array.isArray(
      req.body.history
    )
  ) {
    req.body.history =
      trimHistory(
        req.body.history
      );
  }

  if (
    req.body.context &&
    typeof req.body.context ===
      "object"
  ) {
    if (
      Array.isArray(
        req.body
          .context
          .conversation
      )
    ) {
      req.body.context.conversation =
        trimHistory(
          req.body
            .context
            .conversation
        );
    }

    if (
      Array.isArray(
        req.body
          .context
          .recentMessages
      )
    ) {
      req.body.context.recentMessages =
        trimHistory(
          req.body
            .context
            .recentMessages
        );
    }
  }
}

/* ========================================================================
   MIDDLEWARE
======================================================================== */

function lunaRequestGuard(
  req,
  res,
  next
) {
  const startedAt =
    Date.now();

  try {
    const identifier =
      getUserIdentifier(
        req
      );

    const rate =
      consumeRateLimit(
        identifier
      );

    res.setHeader(
      "X-Luna-RateLimit-Limit",
      String(
        MAX_REQUESTS_PER_WINDOW
      )
    );

    res.setHeader(
      "X-Luna-RateLimit-Remaining",
      String(
        rate.remaining
      )
    );

    if (!rate.allowed) {
      const retrySeconds =
        Math.max(
          1,
          Math.ceil(
            rate.retryAfterMs /
            1000
          )
        );

      res.setHeader(
        "Retry-After",
        String(
          retrySeconds
        )
      );

      return res
        .status(429)
        .json({
          success:
            false,

          assistant:
            "LUNA",

          code:
            "LUNA_RATE_LIMIT",

          message:
            "Estoy recibiendo demasiadas solicitudes seguidas. Espera unos segundos y continuamos.",

          retryAfter:
            retrySeconds
        });
    }

    const originalMessage =
      req?.body?.message;

    if (
      typeof originalMessage !==
        "string" ||
      !originalMessage.trim()
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          assistant:
            "LUNA",

          code:
            "EMPTY_MESSAGE",

          message:
            "Necesito que escribas una pregunta para poder ayudarte."
        });
    }

    if (
      originalMessage.length >
        MAX_MESSAGE_LENGTH
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          assistant:
            "LUNA",

          code:
            "MESSAGE_TOO_LONG",

          message:
            `El mensaje es demasiado largo. El máximo permitido es ${MAX_MESSAGE_LENGTH} caracteres.`
        });
    }

    sanitizeBody(
      req
    );

    /*
      Medición interna del tiempo.
    */
    res.on(
      "finish",
      () => {
        const elapsed =
          Date.now() -
          startedAt;

        if (
          elapsed >=
          1500
        ) {
          console.log(
            `[LUNA PERFORMANCE] ${req.method} ${req.originalUrl} -> ${elapsed}ms`
          );
        }
      }
    );

    return next();
  } catch (error) {
    console.error(
      "[LUNA GUARD][ERROR]",
      error?.message ||
      error
    );

    /*
      Fallo del guard no debe tumbar
      el asistente completo.
    */
    return next();
  }
}

module.exports = {
  lunaRequestGuard
};
