/*
|--------------------------------------------------------------------------
| QSM - LUNA CONTEXT SERVICE
|--------------------------------------------------------------------------
| Fase 17 Bloque 1
|
| Normaliza contexto seguro para LUNA.
| Este archivo NO consulta todavía endpoints privados.
|--------------------------------------------------------------------------
*/

const EMPTY_CONTEXT = {
  profile: null,

  verification: null,

  trustScore: null,

  products: {
    total: null,
    active: null
  },

  purchases: {
    total: null,
    pending: null
  },

  sales: {
    total: null,
    pending: null
  },

  messages: {
    unread: null
  },

  disputes: {
    total: null,
    open: null
  }
};

export function createEmptyLunaContext() {
  return structuredCloneSafe(
    EMPTY_CONTEXT
  );
}

export function buildLunaContext({
  user = null,
  dashboard = null,
  additional = null
} = {}) {
  const context =
    createEmptyLunaContext();

  if (user) {
    context.profile = {
      id:
        user?.id ??
        null,

      firstName:
        user?.firstName ??
        null,

      lastName:
        user?.lastName ??
        null,

      role:
        user?.role ??
        "USER",

      isVerified:
        Boolean(
          user?.isVerified
        )
    };

    context.verification =
      user?.verificationStatus ??
      null;

    context.trustScore =
      safeNumber(
        user?.trustScore
      );
  }

  if (dashboard) {
    const stats =
      dashboard?.stats ||
      dashboard;

    context.products.total =
      safeNumber(
        stats?.products
      );

    context.purchases.total =
      safeNumber(
        stats?.purchases
      );

    context.sales.total =
      safeNumber(
        stats?.sales
      );

    context.messages.unread =
      safeNumber(
        stats?.messages
      );

    context.disputes.open =
      safeNumber(
        stats?.disputes
      );
  }

  if (
    additional &&
    typeof additional ===
      "object"
  ) {
    return mergeContext(
      context,
      additional
    );
  }

  return context;
}

export function sanitizeLunaContext(
  value
) {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return createEmptyLunaContext();
  }

  /*
    Lista negra defensiva.
    Nunca enviamos estas propiedades al proveedor IA.
  */
  const blockedKeys =
    new Set([
      "password",
      "token",
      "accessToken",
      "refreshToken",
      "secret",
      "authorization",
      "cookie",
      "documentImage",
      "cardNumber",
      "cvv"
    ]);

  const walk = (
    input
  ) => {
    if (
      Array.isArray(input)
    ) {
      return input.map(
        walk
      );
    }

    if (
      input &&
      typeof input ===
        "object"
    ) {
      return Object.fromEntries(
        Object.entries(
          input
        )
          .filter(
            ([key]) =>
              !blockedKeys.has(
                key
              )
          )
          .map(
            ([key, item]) => [
              key,
              walk(item)
            ]
          )
      );
    }

    return input;
  };

  return walk(value);
}

function safeNumber(
  value
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function mergeContext(
  base,
  incoming
) {
  const result =
    structuredCloneSafe(
      base
    );

  Object.entries(
    incoming
  ).forEach(
    ([key, value]) => {
      if (
        value &&
        typeof value ===
          "object" &&
        !Array.isArray(value) &&
        result[key] &&
        typeof result[key] ===
          "object" &&
        !Array.isArray(
          result[key]
        )
      ) {
        result[key] = {
          ...result[key],
          ...value
        };
      } else {
        result[key] =
          value;
      }
    }
  );

  return sanitizeLunaContext(
    result
  );
}

function structuredCloneSafe(
  value
) {
  if (
    typeof structuredClone ===
      "function"
  ) {
    return structuredClone(
      value
    );
  }

  return JSON.parse(
    JSON.stringify(
      value
    )
  );
}


/* QSM_FASE17_BLOCK2_REAL_QSM_CONTEXT */

export function buildRuntimeLunaContext({
  user = null,
  stats = null,
  verification = null,
  recentPurchases = [],
  recentSales = [],
  recentDisputes = [],
  unreadMessages = null
} = {}) {
  const base =
    buildLunaContext({
      user,
      dashboard: {
        stats: stats || {}
      }
    });

  const safePurchases =
    Array.isArray(
      recentPurchases
    )
      ? recentPurchases
          .slice(0, 5)
          .map(
            normalizeOperation
          )
      : [];

  const safeSales =
    Array.isArray(
      recentSales
    )
      ? recentSales
          .slice(0, 5)
          .map(
            normalizeOperation
          )
      : [];

  const safeDisputes =
    Array.isArray(
      recentDisputes
    )
      ? recentDisputes
          .slice(0, 5)
          .map(
            normalizeDispute
          )
      : [];

  return sanitizeLunaContext({
    ...base,

    verification: {
      status:
        verification ??
        user?.verificationStatus ??
        null,

      isVerified:
        Boolean(
          user?.isVerified
        )
    },

    purchases: {
      ...base.purchases,

      recent:
        safePurchases
    },

    sales: {
      ...base.sales,

      recent:
        safeSales
    },

    disputes: {
      ...base.disputes,

      recent:
        safeDisputes
    },

    messages: {
      ...base.messages,

      unread:
        safeNumber(
          unreadMessages ??
          stats?.messages
        )
    }
  });
}

function normalizeOperation(
  item
) {
  if (
    !item ||
    typeof item !==
      "object"
  ) {
    return null;
  }

  return {
    id:
      item?.id ??
      null,

    status:
      item?.status ??
      null,

    title:
      item?.product?.title ??
      item?.title ??
      null,

    amount:
      safeNumber(
        item?.total ??
        item?.amount ??
        item?.price
      ),

    createdAt:
      item?.createdAt ??
      null
  };
}

function normalizeDispute(
  item
) {
  if (
    !item ||
    typeof item !==
      "object"
  ) {
    return null;
  }

  return {
    id:
      item?.id ??
      null,

    status:
      item?.status ??
      null,

    reason:
      item?.reason ??
      item?.title ??
      null,

    createdAt:
      item?.createdAt ??
      null
  };
}


export default {
  createEmptyLunaContext,
  buildLunaContext,
  buildRuntimeLunaContext,
  sanitizeLunaContext
};
