"use strict";

/* QSM_FASE17_BLOCK4_DEBUG_TRACE */

const LUNA_DEBUG =
  true;

function lunaDebug(
  label,
  value = undefined
) {
  if (!LUNA_DEBUG) {
    return;
  }

  if (
    typeof value ===
      "undefined"
  ) {
    console.log(
      `[LUNA CONTEXT] ${label}`
    );

    return;
  }

  console.log(
    `[LUNA CONTEXT] ${label}`,
    value
  );
}

function lunaDebugError(
  label,
  error
) {
  if (!LUNA_DEBUG) {
    return;
  }

  console.error(
    `[LUNA CONTEXT][ERROR] ${label}`,
    {
      name:
        error?.name,

      message:
        error?.message,

      code:
        error?.code,

      meta:
        error?.meta,

      stack:
        error?.stack
    }
  );
}


/*
|--------------------------------------------------------------------------
| QSM FASE 17 BLOQUE 4
| LUNA - Context Bridge
|--------------------------------------------------------------------------
|
| Consulta datos reales de PostgreSQL/Supabase antes de pasar
| la pregunta al motor conversacional general.
|
| No usa API externa.
| No contiene claves.
| No inventa datos.
|
|--------------------------------------------------------------------------
*/

const prisma =
  require("../utils/prisma");

const ACTIVE_DISPUTE_STATUSES = [
  "OPEN",
  "IN_REVIEW",
  "WAITING_EVIDENCE"
];

const FINAL_ORDER_STATUSES = [
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
  "REJECTED"
];

/*
|--------------------------------------------------------------------------
| Normalización
|--------------------------------------------------------------------------
*/

function normalizeText(value) {
  return String(
    value || ""
  )
    .trim()
    .toLocaleLowerCase(
      "es-DO"
    )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    );
}

function getUserId(req) {
  const candidates = [
    req?.prismaUser?.id,
    req?.user?.id,
    req?.user?.userId,
    req?.auth?.userId
  ];

  for (const value of candidates) {
    const parsed =
      Number(value);

    if (
      Number.isSafeInteger(parsed) &&
      parsed > 0
    ) {
      return parsed;
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

function includesAny(
  text,
  words
) {
  return words.some(
    (word) =>
      text.includes(word)
  );
}

function plural(
  amount,
  singular,
  pluralForm
) {
  return amount === 1
    ? singular
    : pluralForm;
}

/*
|--------------------------------------------------------------------------
| Consultas reales
|--------------------------------------------------------------------------
*/

async function loadAccountContext(
  userId
) {
  const [
    user,
    purchaseCount,
    activePurchaseCount,
    saleCount,
    activeSaleCount,
    productCount,
    disputeCount,
    openDisputeCount,
    recentPurchases,
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
        isVerified: true,
        trustScore: true,
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
          notIn:
            FINAL_ORDER_STATUSES
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
          notIn:
            FINAL_ORDER_STATUSES
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
          in:
            ACTIVE_DISPUTE_STATUSES
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

      take: 3,

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

      take: 3,

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
        purchaseCount,

      active:
        activePurchaseCount,

      recent:
        recentPurchases
    },

    sales: {
      total:
        saleCount,

      active:
        activeSaleCount
    },

    products: {
      total:
        productCount
    },

    disputes: {
      total:
        disputeCount,

      open:
        openDisputeCount,

      recent:
        recentDisputes
    }
  };
}

/*
|--------------------------------------------------------------------------
| Respuestas contextuales
|--------------------------------------------------------------------------
*/

function answerPurchases(
  context
) {
  const total =
    context.purchases.total;

  const active =
    context.purchases.active;

  if (total === 0) {
    return (
      "No tienes compras registradas actualmente en QSM."
    );
  }

  let response =
    `Tienes ${total} ${
      plural(
        total,
        "compra registrada",
        "compras registradas"
      )
    } en QSM.`;

  if (active > 0) {
    response +=
      ` ${active} ${
        plural(
          active,
          "todavía requiere seguimiento",
          "todavía requieren seguimiento"
        )
      }.`;
  } else {
    response +=
      " Ahora mismo no veo compras activas que requieran seguimiento.";
  }

  const latest =
    context
      .purchases
      .recent?.[0];

  if (latest) {
    const title =
      latest?.product?.title ||
      latest?.orderCode ||
      `orden #${latest.id}`;

    response +=
      ` Tu compra más reciente es ${title} y está en estado ${latest.status}.`;
  }

  return response;
}

function answerSales(
  context
) {
  const total =
    context.sales.total;

  const active =
    context.sales.active;

  if (total === 0) {
    return (
      "No tienes ventas registradas actualmente en QSM."
    );
  }

  let response =
    `Tienes ${total} ${
      plural(
        total,
        "venta registrada",
        "ventas registradas"
      )
    }.`;

  if (active > 0) {
    response +=
      ` ${active} ${
        plural(
          active,
          "sigue activa",
          "siguen activas"
        )
      }.`;
  } else {
    response +=
      " No veo ventas activas pendientes en este momento.";
  }

  return response;
}

function answerDisputes(
  context
) {
  const total =
    context.disputes.total;

  const open =
    context.disputes.open;

  if (total === 0) {
    return (
      "No tienes disputas registradas en QSM. Por ahora esa parte está limpia 👍."
    );
  }

  if (open === 0) {
    return (
      `Tienes ${total} ${
        plural(
          total,
          "disputa registrada",
          "disputas registradas"
        )
      }, pero ninguna está abierta ahora mismo.`
    );
  }

  let response =
    `Tienes ${open} ${
      plural(
        open,
        "disputa activa",
        "disputas activas"
      )
    } que conviene revisar.`;

  const latestOpen =
    context
      .disputes
      .recent
      .find(
        (item) =>
          ACTIVE_DISPUTE_STATUSES
            .includes(
              String(
                item?.status ||
                ""
              ).toUpperCase()
            )
      );

  if (latestOpen) {
    response +=
      ` La más reciente es ${
        latestOpen.disputeCode ||
        `el caso #${latestOpen.id}`
      }, con estado ${latestOpen.status}.`;
  }

  return response;
}

function answerVerification(
  context
) {
  if (!context.user) {
    return null;
  }

  if (
    context.user.isVerified
  ) {
    return (
      `Tu identidad está verificada en QSM y tu nivel de confianza actual es ${context.user.trustScore}/100.`
    );
  }

  return (
    `Tu verificación todavía no está completada. Tu confianza actual es ${context.user.trustScore}/100. Te conviene completar la verificación de identidad antes de operaciones importantes.`
  );
}

function answerTrust(
  context
) {
  const score =
    Number(
      context?.user
        ?.trustScore
    );

  if (
    !Number.isFinite(score)
  ) {
    return null;
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

  return (
    `Tu confianza QSM actual es ${score}/100, que corresponde a un nivel ${level}.`
  );
}

function answerProducts(
  context
) {
  const total =
    context.products.total;

  if (total === 0) {
    return (
      "No tienes productos publicados actualmente en QSM."
    );
  }

  return (
    `Tienes ${total} ${
      plural(
        total,
        "producto publicado",
        "productos publicados"
      )
    } en QSM.`
  );
}

function answerPriority(
  context
) {
  const priorities = [];

  if (
    context.disputes.open > 0
  ) {
    priorities.push({
      level: 1,

      text:
        `${context.disputes.open} ${
          plural(
            context.disputes.open,
            "disputa activa",
            "disputas activas"
          )
        }`
    });
  }

  if (
    context.purchases.active > 0
  ) {
    priorities.push({
      level: 2,

      text:
        `${context.purchases.active} ${
          plural(
            context.purchases.active,
            "compra activa",
            "compras activas"
          )
        }`
    });
  }

  if (
    context.user &&
    !context.user.isVerified
  ) {
    priorities.push({
      level: 3,

      text:
        "verificación de identidad pendiente"
    });
  }

  if (
    context.sales.active > 0
  ) {
    priorities.push({
      level: 4,

      text:
        `${context.sales.active} ${
          plural(
            context.sales.active,
            "venta activa",
            "ventas activas"
          )
        }`
    });
  }

  priorities.sort(
    (a, b) =>
      a.level - b.level
  );

  if (
    priorities.length === 0
  ) {
    return (
      "Ahora mismo no veo operaciones críticas que requieran tu atención inmediata. Tu cuenta está bastante al día."
    );
  }

  const first =
    priorities[0];

  if (
    priorities.length === 1
  ) {
    return (
      `Lo primero que revisaría es ${first.text}.`
    );
  }

  return (
    `Yo empezaría por ${first.text}. Después revisaría ${priorities
      .slice(1)
      .map(
        (item) =>
          item.text
      )
      .join(", ")}.`
  );
}

function detectIntent(
  message
) {
  const text =
    normalizeText(
      message
    );

  if (
    includesAny(
      text,
      [
        "que revisar primero",
        "qué revisar primero",
        "que deberia revisar",
        "qué debería revisar",
        "que tengo pendiente",
        "qué tengo pendiente",
        "riesgos pendientes",
        "algo pendiente",
        "por donde empiezo",
        "por dónde empiezo"
      ]
    )
  ) {
    return "PRIORITY";
  }

  if (
    includesAny(
      text,
      [
        "disputa",
        "disputas",
        "reclamo",
        "reclamos"
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
        "compras pendientes"
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
        "ventas pendientes"
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
        "productos tengo",
        "productos publicados"
      ]
    )
  ) {
    return "PRODUCTS";
  }

  if (
    includesAny(
      text,
      [
        "verificacion",
        "verificado",
        "verificada",
        "identidad"
      ]
    )
  ) {
    return "VERIFICATION";
  }

  if (
    includesAny(
      text,
      [
        "confianza",
        "trust score",
        "trustscore"
      ]
    )
  ) {
    return "TRUST";
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

async function lunaContextBridge(
  req,
  res,
  next
) {
  try {
    lunaDebug(
      "=============================="
    );

    lunaDebug(
      "BRIDGE ACTIVO"
    );

    lunaDebug(
      "METHOD",
      req?.method
    );

    lunaDebug(
      "URL",
      req?.originalUrl ||
      req?.url
    );

    lunaDebug(
      "BODY MESSAGE",
      req?.body?.message
    );

    lunaDebug(
      "REQ.USER",
      req?.user || null
    );

    lunaDebug(
      "REQ.PRISMAUSER",
      req?.prismaUser || null
    );
    const message =
      getMessage(req);

    lunaDebug(
      "MESSAGE NORMALIZADO",
      message
    );

    if (!message) {
      lunaDebug(
        "SALIDA: mensaje vacío -> next()"
      );

      return next();
    }

    const intent =
      detectIntent(
        message
      );

    lunaDebug(
      "INTENT",
      intent
    );

    if (!intent) {
      lunaDebug(
        "SALIDA: intent no reconocido -> next()"
      );

      return next();
    }

    const userId =
      getUserId(req);

    lunaDebug(
      "USER ID",
      userId
    );

    if (!userId) {
      lunaDebug(
        "SALIDA: userId no disponible -> next()"
      );

      return next();
    }

    lunaDebug(
      "STEP 1: iniciando loadAccountContext"
    );

    const context =
      await loadAccountContext(
        userId
      );

    lunaDebug(
      "STEP 2: contexto cargado",
      {
        user:
          context?.user
            ? {
                id:
                  context.user.id,

                trustScore:
                  context.user.trustScore,

                isVerified:
                  context.user.isVerified
              }
            : null,

        purchases:
          context?.purchases,

        sales:
          context?.sales,

        products:
          context?.products,

        disputes:
          context?.disputes
      }
    );

    let response =
      null;

    switch (intent) {
      case "PURCHASES":
        response =
          answerPurchases(
            context
          );
        break;

      case "SALES":
        response =
          answerSales(
            context
          );
        break;

      case "PRODUCTS":
        response =
          answerProducts(
            context
          );
        break;

      case "DISPUTES":
        response =
          answerDisputes(
            context
          );
        break;

      case "VERIFICATION":
        response =
          answerVerification(
            context
          );
        break;

      case "TRUST":
        response =
          answerTrust(
            context
          );
        break;

      case "PRIORITY":
        response =
          answerPriority(
            context
          );
        break;

      default:
        response =
          null;
    }

    lunaDebug(
      "RESPUESTA GENERADA",
      response
    );

    if (!response) {
      lunaDebug(
        "SALIDA: respuesta vacía -> next()"
      );

      return next();
    }

    lunaDebug(
      "STEP 3: respuesta contextual enviada"
    );

    return res.status(200).json({
      success: true,

      response,

      reply:
        response,

      answer:
        response,

      provider:
        "QSM_CONTEXT_ENGINE",

      model:
        "LUNA_CONTEXT_17_4",

      intent,

      contextual:
        true,

      source:
        "QSM_DATABASE",

      sessionId:
        req?.body
          ?.sessionId ||
        null,

      meta: {
        realData:
          true,

        database:
          "POSTGRESQL_SUPABASE",

        fallbackUsed:
          false
      }
    });
  } catch (error) {
    lunaDebugError(
      "BRIDGE FALLÓ",
      error
    );

    lunaDebug(
      "FALLBACK: pasando a processRealAiDialogue"
    );

    return next();
  }
}

module.exports = {
  lunaContextBridge
};
