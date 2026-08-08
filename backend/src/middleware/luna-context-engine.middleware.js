"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA CONTEXT ENGINE 17.4 FINAL
|--------------------------------------------------------------------------
|
| Capa contextual determinística basada en datos REALES.
|
| Tiene prioridad para:
| - confianza
| - verificación
| - compras
| - ventas
| - productos
| - disputas
| - prioridades de la cuenta
|
| Si no reconoce la intención:
| next() -> processRealAiDialogue
|--------------------------------------------------------------------------
*/

const prisma =
  require("../utils/prisma");

const VERSION =
  "LUNA-CONTEXT-17.4-FINAL";

/* ========================================================================
   UTILIDADES
======================================================================== */

function clean(value) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}

function includesAny(
  text,
  values
) {
  return values.some(
    (value) =>
      text.includes(value)
  );
}

function getAuthenticatedUser(
  req
) {
  return (
    req?.prismaUser ||
    req?.user ||
    null
  );
}

function getUserId(req) {
  const user =
    getAuthenticatedUser(req);

  const candidates = [
    user?.id,
    user?.userId,
    req?.auth?.id,
    req?.auth?.userId
  ];

  for (
    const candidate
    of candidates
  ) {
    const id =
      Number(candidate);

    if (
      Number.isSafeInteger(id) &&
      id > 0
    ) {
      return id;
    }
  }

  return null;
}

function getMessage(req) {
  return String(
    req?.body?.message ||
    req?.body?.question ||
    req?.body?.text ||
    ""
  ).trim();
}

function singularPlural(
  number,
  singular,
  plural
) {
  return Number(number) === 1
    ? singular
    : plural;
}

/* ========================================================================
   INTENCIONES
======================================================================== */

function detectContextIntent(
  message
) {
  const text =
    clean(message);

  /*
    PRIORIDAD debe evaluarse primero.
  */
  if (
    includesAny(
      text,
      [
        "que deberia revisar primero",
        "que debo revisar primero",
        "que revisar primero",
        "por donde empiezo",
        "que tengo pendiente",
        "algo pendiente",
        "riesgos pendientes",
        "que necesita mi atencion",
        "que requiere mi atencion",
        "que hago primero"
      ]
    )
  ) {
    return "ACCOUNT_PRIORITY";
  }

  if (
    includesAny(
      text,
      [
        "confianza",
        "trust score",
        "trustscore",
        "nivel de confianza",
        "mi score"
      ]
    )
  ) {
    return "TRUST";
  }

  if (
    includesAny(
      text,
      [
        "verificacion",
        "verificado",
        "verificada",
        "verificar identidad",
        "identidad verificada"
      ]
    )
  ) {
    return "VERIFICATION";
  }

  if (
    includesAny(
      text,
      [
        "mis disputas",
        "mi disputa",
        "disputas tengo",
        "disputa abierta",
        "disputas abiertas",
        "mis reclamos",
        "reclamos tengo"
      ]
    )
  ) {
    return "DISPUTES";
  }

  if (
    includesAny(
      text,
      [
        "mis compras",
        "mi compra",
        "compras tengo",
        "compras pendientes",
        "ordenes como comprador"
      ]
    )
  ) {
    return "PURCHASES";
  }

  if (
    includesAny(
      text,
      [
        "mis ventas",
        "mi venta",
        "ventas tengo",
        "ventas pendientes",
        "ordenes como vendedor"
      ]
    )
  ) {
    return "SALES";
  }

  if (
    includesAny(
      text,
      [
        "mis productos",
        "productos publicados",
        "productos tengo",
        "mis publicaciones"
      ]
    )
  ) {
    return "PRODUCTS";
  }

  return null;
}

/* ========================================================================
   CARGA REAL
======================================================================== */

async function getAccountSnapshot(
  userId
) {
  const [
    user,

    purchaseTotal,
    purchasePending,

    saleTotal,
    salePending,

    productTotal,

    disputeTotal,
    disputeOpen,

    recentPurchases,
    recentSales,
    recentDisputes
  ] = await Promise.all([

    prisma.user.findUnique({
      where: {
        id: userId
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        trustScore: true,
        isVerified: true,
        verificationStatus: true,
        status: true
      }
    }),

    prisma.order.count({
      where: {
        buyerId: userId
      }
    }),

    prisma.order.count({
      where: {
        buyerId: userId,

        status: {
          notIn: [
            "COMPLETED",
            "CANCELLED",
            "REFUNDED",
            "REJECTED"
          ]
        }
      }
    }),

    prisma.order.count({
      where: {
        sellerId: userId
      }
    }),

    prisma.order.count({
      where: {
        sellerId: userId,

        status: {
          notIn: [
            "COMPLETED",
            "CANCELLED",
            "REFUNDED",
            "REJECTED"
          ]
        }
      }
    }),

    prisma.product.count({
      where: {
        sellerId: userId
      }
    }),

    prisma.dispute.count({
      where: {
        OR: [
          {
            buyerId: userId
          },
          {
            sellerId: userId
          }
        ]
      }
    }),

    prisma.dispute.count({
      where: {
        OR: [
          {
            buyerId: userId
          },
          {
            sellerId: userId
          }
        ],

        status: {
          in: [
            "OPEN",
            "PENDING",
            "IN_REVIEW",
            "WAITING_EVIDENCE"
          ]
        }
      }
    }),

    prisma.order.findMany({
      where: {
        buyerId: userId
      },

      orderBy: {
        createdAt:
          "desc"
      },

      take: 5,

      select: {
        id: true,
        orderCode: true,
        status: true,
        totalAmount: true,
        createdAt: true,

        product: {
          select: {
            title: true
          }
        }
      }
    }),

    prisma.order.findMany({
      where: {
        sellerId: userId
      },

      orderBy: {
        createdAt:
          "desc"
      },

      take: 5,

      select: {
        id: true,
        orderCode: true,
        status: true,
        totalAmount: true,
        createdAt: true,

        product: {
          select: {
            title: true
          }
        }
      }
    }),

    prisma.dispute.findMany({
      where: {
        OR: [
          {
            buyerId: userId
          },
          {
            sellerId: userId
          }
        ]
      },

      orderBy: {
        createdAt:
          "desc"
      },

      take: 5,

      select: {
        id: true,
        disputeCode: true,
        status: true,
        reason: true,
        orderId: true,
        createdAt: true
      }
    })
  ]);

  return {
    user,

    purchases: {
      total:
        purchaseTotal,

      pending:
        purchasePending,

      recent:
        recentPurchases
    },

    sales: {
      total:
        saleTotal,

      pending:
        salePending,

      recent:
        recentSales
    },

    products: {
      total:
        productTotal
    },

    disputes: {
      total:
        disputeTotal,

      open:
        disputeOpen,

      recent:
        recentDisputes
    }
  };
}

/* ========================================================================
   RESPUESTAS
======================================================================== */

function buildTrustAnswer(
  snapshot
) {
  const score =
    Number(
      snapshot
        ?.user
        ?.trustScore
    );

  if (
    !Number.isFinite(score)
  ) {
    return (
      "No pude obtener tu nivel de confianza QSM en este momento."
    );
  }

  let level =
    "medio";

  if (score >= 80) {
    level =
      "alto";
  } else if (
    score < 50
  ) {
    level =
      "bajo";
  }

  if (score >= 80) {
    return (
      `Tu confianza QSM es ${score}/100, un nivel ${level}. ` +
      "Vas muy bien en ese aspecto."
    );
  }

  return (
    `Tu confianza QSM es ${score}/100, correspondiente a un nivel ${level}.`
  );
}

function buildVerificationAnswer(
  snapshot
) {
  const user =
    snapshot?.user;

  if (!user) {
    return (
      "No pude consultar tu estado de verificación ahora mismo."
    );
  }

  if (
    user.isVerified ||
    String(
      user.verificationStatus ||
      ""
    ).toUpperCase() ===
      "APPROVED"
  ) {
    return (
      "Sí. Tu identidad está verificada correctamente en QSM."
    );
  }

  return (
    `Tu verificación todavía está en estado ${
      user.verificationStatus ||
      "pendiente"
    }.`
  );
}

function buildPurchaseAnswer(
  snapshot
) {
  const {
    total,
    pending,
    recent
  } = snapshot.purchases;

  if (total === 0) {
    return (
      "No tienes compras registradas en QSM."
    );
  }

  let answer =
    `Tienes ${total} ${
      singularPlural(
        total,
        "compra registrada",
        "compras registradas"
      )
    }.`;

  if (pending > 0) {
    answer +=
      ` ${pending} ${
        singularPlural(
          pending,
          "está pendiente o en proceso",
          "están pendientes o en proceso"
        )
      }.`;
  } else {
    answer +=
      " No veo compras pendientes ahora mismo.";
  }

  const latest =
    recent?.[0];

  if (latest) {
    const name =
      latest?.product?.title ||
      latest?.orderCode ||
      `orden #${latest.id}`;

    answer +=
      ` La más reciente es ${name}, con estado ${latest.status}.`;
  }

  return answer;
}

function buildSalesAnswer(
  snapshot
) {
  const {
    total,
    pending
  } = snapshot.sales;

  if (total === 0) {
    return (
      "No tienes ventas registradas en QSM."
    );
  }

  let answer =
    `Tienes ${total} ${
      singularPlural(
        total,
        "venta registrada",
        "ventas registradas"
      )
    }.`;

  if (pending > 0) {
    answer +=
      ` ${pending} ${
        singularPlural(
          pending,
          "sigue pendiente o activa",
          "siguen pendientes o activas"
        )
      }.`;
  } else {
    answer +=
      " Actualmente no veo ventas pendientes.";
  }

  return answer;
}

function buildProductsAnswer(
  snapshot
) {
  const total =
    snapshot.products.total;

  if (total === 0) {
    return (
      "Actualmente no tienes productos publicados."
    );
  }

  return (
    `Tienes ${total} ${
      singularPlural(
        total,
        "producto publicado",
        "productos publicados"
      )
    } en QSM.`
  );
}

function buildDisputesAnswer(
  snapshot
) {
  const {
    total,
    open,
    recent
  } = snapshot.disputes;

  if (total === 0) {
    return (
      "No tienes disputas registradas actualmente. Esa parte de tu cuenta está limpia 👍."
    );
  }

  if (open === 0) {
    return (
      `Tienes ${total} ${
        singularPlural(
          total,
          "disputa registrada",
          "disputas registradas"
        )
      }, pero ninguna está abierta actualmente.`
    );
  }

  let answer =
    `Tienes ${open} ${
      singularPlural(
        open,
        "disputa activa",
        "disputas activas"
      )
    } que requieren atención.`;

  const recentOpen =
    recent?.find(
      (item) =>
        [
          "OPEN",
          "PENDING",
          "IN_REVIEW",
          "WAITING_EVIDENCE"
        ].includes(
          String(
            item.status ||
            ""
          ).toUpperCase()
        )
    );

  if (recentOpen) {
    answer +=
      ` La más reciente es ${
        recentOpen.disputeCode ||
        `#${recentOpen.id}`
      }, actualmente en estado ${recentOpen.status}.`;
  }

  return answer;
}

function buildPriorityAnswer(
  snapshot
) {
  const tasks = [];

  if (
    snapshot.disputes.open > 0
  ) {
    tasks.push({
      priority: 1,

      text:
        `${snapshot.disputes.open} ${
          singularPlural(
            snapshot.disputes.open,
            "disputa activa",
            "disputas activas"
          )
        }`
    });
  }

  if (
    snapshot.purchases.pending >
    0
  ) {
    tasks.push({
      priority: 2,

      text:
        `${snapshot.purchases.pending} ${
          singularPlural(
            snapshot.purchases.pending,
            "compra pendiente",
            "compras pendientes"
          )
        }`
    });
  }

  if (
    snapshot.user &&
    !snapshot.user.isVerified &&
    String(
      snapshot.user
        .verificationStatus ||
      ""
    ).toUpperCase() !==
      "APPROVED"
  ) {
    tasks.push({
      priority: 3,
      text:
        "tu verificación de identidad"
    });
  }

  if (
    snapshot.sales.pending > 0
  ) {
    tasks.push({
      priority: 4,

      text:
        `${snapshot.sales.pending} ${
          singularPlural(
            snapshot.sales.pending,
            "venta pendiente",
            "ventas pendientes"
          )
        }`
    });
  }

  tasks.sort(
    (a, b) =>
      a.priority -
      b.priority
  );

  if (tasks.length === 0) {
    return (
      "Ahora mismo no veo nada crítico que necesite tu atención inmediata. Tu cuenta está bastante al día."
    );
  }

  if (tasks.length === 1) {
    return (
      `Yo revisaría primero ${tasks[0].text}.`
    );
  }

  return (
    `Yo empezaría por ${tasks[0].text}. ` +
    `Después revisaría ${tasks
      .slice(1)
      .map(
        (item) =>
          item.text
      )
      .join(", ")}.`
  );
}

/* ========================================================================
   RESPUESTA API
======================================================================== */

function sendContextResponse({
  req,
  res,
  intent,
  message,
  snapshot
}) {
  return res.status(200).json({
    success: true,

    assistant:
      "LUNA",

    result: {
      assistant:
        "LUNA",

      authenticated:
        true,

      accessLevel:
        "PRIVATE",

      intent: {
        code:
          intent,

        matches: [
          intent
        ],

        confidence:
          100
      },

      state: {
        code:
          "READY",

        requiresAuthentication:
          false
      },

      message,

      actions: [],

      context: {
        path:
          req?.body?.context?.path ||
          req?.body?.context?.page ||
          null,

        qsm:
          snapshot,

        memory:
          req?.body
            ?.context
            ?.memory ||
          null
      },

      realContext:
        snapshot,

      contextLoaded:
        true,

      memoryEnabled:
        Boolean(
          req?.body?.conversation ||
          req?.body?.history
        ),

      generatedAt:
        new Date()
          .toISOString(),

      version:
        VERSION,

      provider:
        "QSM_CONTEXT_ENGINE"
    },

    provider:
      "QSM_CONTEXT_ENGINE",

    model:
      VERSION,

    answer:
      message,

    response:
      message,

    contextual:
      true
  });
}

/* ========================================================================
   MIDDLEWARE
======================================================================== */

async function lunaContextEngine(
  req,
  res,
  next
) {
  const message =
    getMessage(req);

  if (!message) {
    return next();
  }

  /*
  | QSM_FASE17_BLOCK14_SEMANTIC_CONTEXT_BRIDGE
  |
  | Semantic Core tiene prioridad cuando
  | reconoce una intención compatible.
  */

  const semanticIntent =
    String(
      req
        ?.lunaSemantic
        ?.intent
        ?.code ||
      ""
    )
      .trim()
      .toUpperCase();

  const semanticConfidence =
    Number(
      req
        ?.lunaSemantic
        ?.confidence ||
      0
    );

  const CONTEXT_INTENTS =
    new Set([
      "TRUST",
      "VERIFICATION",
      "PURCHASES",
      "SALES",
      "DISPUTES",
      "ACCOUNT_PRIORITY"
    ]);

  const intent =
    (
      semanticConfidence >=
        0.54 &&
      CONTEXT_INTENTS.has(
        semanticIntent
      )
    )
      ? semanticIntent
      : detectContextIntent(
          message
        );

  /*
    Conversación general:
    continúa con processRealAiDialogue.
  */
  if (!intent) {
    return next();
  }

  const userId =
    getUserId(req);

  if (!userId) {
    console.warn(
      "[LUNA CONTEXT FINAL] No se encontró userId."
    );

    return next();
  }

  try {
    console.log(
      `[LUNA CONTEXT FINAL] ${intent} | USER ${userId}`
    );

    const snapshot =
      await getAccountSnapshot(
        userId
      );

    let answer =
      null;

    switch (intent) {
      case "TRUST":
        answer =
          buildTrustAnswer(
            snapshot
          );
        break;

      case "VERIFICATION":
        answer =
          buildVerificationAnswer(
            snapshot
          );
        break;

      case "PURCHASES":
        answer =
          buildPurchaseAnswer(
            snapshot
          );
        break;

      case "SALES":
        answer =
          buildSalesAnswer(
            snapshot
          );
        break;

      case "PRODUCTS":
        answer =
          buildProductsAnswer(
            snapshot
          );
        break;

      case "DISPUTES":
        answer =
          buildDisputesAnswer(
            snapshot
          );
        break;

      case "ACCOUNT_PRIORITY":
        answer =
          buildPriorityAnswer(
            snapshot
          );
        break;

      default:
        return next();
    }

    if (!answer) {
      return next();
    }

    console.log(
      `[LUNA CONTEXT FINAL] RESPONDIDO: ${intent}`
    );

    return sendContextResponse({
      req,
      res,
      intent,
      message:
        answer,
      snapshot
    });
  } catch (error) {
    console.error(
      "[LUNA CONTEXT FINAL][ERROR]",
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
      Nunca rompe el chat.
    */
    return next();
  }
}

module.exports = {
  lunaContextEngine,
  detectContextIntent
};
