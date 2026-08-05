"use strict";

const prisma = require("../utils/prisma");

const {
  saveConversationMessage,
  getConversationMemory
} = require("./luna-memory.service");

/* QSM_FASE7_BLOCK1_INTELLIGENT_DIALOGUE */

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function asArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function asObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}

function detectConversationIntent(message) {
  const text = normalizeText(message);

  const definitions = [
    {
      code: "GREETING",
      terms: [
        "hola",
        "buenas",
        "buen día",
        "buenas tardes",
        "buenas noches"
      ]
    },
    {
      code: "REGISTER",
      terms: [
        "registrarme",
        "crear cuenta",
        "registro",
        "abrir cuenta"
      ]
    },
    {
      code: "BUY",
      terms: [
        "comprar",
        "quiero comprar",
        "hacer una compra",
        "checkout"
      ]
    },
    {
      code: "SELL",
      terms: [
        "vender",
        "publicar producto",
        "crear publicación",
        "subir producto"
      ]
    },
    {
      code: "SEARCH",
      terms: [
        "buscar",
        "recomiéndame",
        "recomendar producto",
        "qué producto"
      ]
    },
    {
      code: "PRICE",
      terms: [
        "precio",
        "está caro",
        "está barato",
        "precio justo",
        "comparar precio"
      ]
    },
    {
      code: "SECURITY",
      terms: [
        "seguro",
        "estafa",
        "fraude",
        "riesgo",
        "confiable"
      ]
    },
    {
      code: "ORDER",
      terms: [
        "pedido",
        "orden",
        "mi compra",
        "seguimiento",
        "dónde está"
      ]
    },
    {
      code: "DISPUTE",
      terms: [
        "disputa",
        "reclamo",
        "devolución",
        "problema con vendedor",
        "problema con comprador"
      ]
    },
    {
      code: "SUPPORT",
      terms: [
        "ayuda",
        "soporte",
        "problema",
        "no funciona",
        "error"
      ]
    },
    {
      code: "THANKS",
      terms: [
        "gracias",
        "muchas gracias",
        "perfecto",
        "excelente"
      ]
    }
  ];

  let bestMatch = {
    code: "GENERAL",
    matches: [],
    confidence: 45
  };

  for (const definition of definitions) {
    const matches =
      definition.terms.filter((term) =>
        text.includes(term)
      );

    if (
      matches.length >
      bestMatch.matches.length
    ) {
      bestMatch = {
        code:
          definition.code,
        matches,
        confidence:
          Math.min(
            100,
            65 + matches.length * 12
          )
      };
    }
  }

  return bestMatch;
}

function detectConversationEntities(message) {
  const text =
    String(message || "").trim();

  const normalized =
    normalizeText(message);

  const entities = {
    productId: null,
    orderId: null,
    amount: null,
    category: null,
    brand: null
  };

  const productMatch =
    text.match(
      /(?:producto|product)\s*#?\s*(\d+)/i
    );

  if (productMatch) {
    entities.productId =
      Number(productMatch[1]);
  }

  const orderMatch =
    text.match(
      /(?:orden|pedido|order)\s*#?\s*(\d+)/i
    );

  if (orderMatch) {
    entities.orderId =
      Number(orderMatch[1]);
  }

  const amountMatch =
    text.match(
      /(?:rd\$|\$)\s*([\d,.]+)/i
    );

  if (amountMatch) {
    entities.amount =
      Number(
        amountMatch[1]
          .replace(/,/g, "")
      );
  }

  const categories = [
    "tecnología",
    "vehículos",
    "hogar",
    "moda",
    "electrónica",
    "celulares",
    "computadoras"
  ];

  entities.category =
    categories.find((category) =>
      normalized.includes(category)
    ) || null;

  const brands = [
    "apple",
    "samsung",
    "asus",
    "lenovo",
    "dell",
    "hp",
    "toyota",
    "honda",
    "kia"
  ];

  entities.brand =
    brands.find((brand) =>
      normalized.includes(brand)
    ) || null;

  return entities;
}

function determineConversationState({
  intent,
  authenticated,
  context
}) {
  if (!authenticated) {
    return {
      code: "PUBLIC_LIMITED",
      requiresAuthentication:
        ![
          "GREETING",
          "REGISTER",
          "SUPPORT",
          "THANKS",
          "GENERAL"
        ].includes(intent)
    };
  }

  if (
    intent === "BUY" &&
    !context.productId
  ) {
    return {
      code: "AWAITING_PRODUCT",
      requiresAuthentication: false
    };
  }

  if (
    intent === "ORDER" &&
    !context.orderId
  ) {
    return {
      code: "AWAITING_ORDER",
      requiresAuthentication: false
    };
  }

  if (
    intent === "DISPUTE" &&
    !context.orderId
  ) {
    return {
      code: "AWAITING_DISPUTE_CONTEXT",
      requiresAuthentication: false
    };
  }

  return {
    code: "READY",
    requiresAuthentication: false
  };
}

function getConversationActions({
  intent,
  state,
  authenticated
}) {
  if (
    !authenticated &&
    state.requiresAuthentication
  ) {
    return [
      {
        code: "GO_LOGIN",
        label: "Iniciar sesión",
        route: "/login"
      },
      {
        code: "GO_REGISTER",
        label: "Crear cuenta",
        route: "/register"
      }
    ];
  }

  const actions = {
    GREETING: [
      {
        code: "SHOW_HELP",
        label: "Ver ayuda"
      }
    ],
    REGISTER: [
      {
        code: "GO_REGISTER",
        label: "Crear cuenta",
        route: "/register"
      }
    ],
    BUY: [
      {
        code: "ANALYZE_PURCHASE",
        label: "Analizar compra"
      },
      {
        code: "COMPARE_PRODUCTS",
        label: "Comparar productos"
      }
    ],
    SELL: [
      {
        code: "ANALYZE_LISTING",
        label: "Revisar publicación"
      },
      {
        code: "IMPROVE_LISTING",
        label: "Mejorar publicación"
      }
    ],
    SEARCH: [
      {
        code: "GET_RECOMMENDATIONS",
        label: "Ver recomendaciones"
      }
    ],
    PRICE: [
      {
        code: "ANALYZE_MARKET_PRICE",
        label: "Analizar precio"
      }
    ],
    SECURITY: [
      {
        code: "CHECK_TRANSACTION_RISK",
        label: "Revisar seguridad"
      }
    ],
    ORDER: [
      {
        code: "GET_ORDER_STATUS",
        label: "Consultar orden"
      }
    ],
    DISPUTE: [
      {
        code: "OPEN_DISPUTE",
        label: "Crear disputa"
      },
      {
        code: "GET_DISPUTE_STATUS",
        label: "Consultar disputa"
      }
    ],
    SUPPORT: [
      {
        code: "OPEN_SUPPORT",
        label: "Ir a soporte"
      }
    ]
  };

  return actions[intent] || [
    {
      code: "SHOW_HELP",
      label: "Mostrar opciones"
    }
  ];
}

function buildDialogueMessage({
  intent,
  state,
  authenticated,
  entities,
  user
}) {
  if (
    !authenticated &&
    state.requiresAuthentication
  ) {
    return (
      "Para consultar información privada, productos personalizados, " +
      "órdenes, pagos o disputas debes iniciar sesión."
    );
  }

  if (state.code === "AWAITING_PRODUCT") {
    return (
      "Indícame qué producto deseas analizar o abre su página " +
      "para que pueda revisar precio, vendedor y seguridad."
    );
  }

  if (state.code === "AWAITING_ORDER") {
    return (
      "Indícame el número de la orden que deseas consultar."
    );
  }

  if (
    state.code ===
    "AWAITING_DISPUTE_CONTEXT"
  ) {
    return (
      "Indícame la orden o compra relacionada con el problema."
    );
  }

  const name =
    authenticated
      ? user.firstName ||
        user.name ||
        ""
      : "";

  const messages = {
    GREETING:
      `Hola${name ? ` ${name}` : ""}. Soy LUNA. ¿En qué puedo ayudarte?`,

    REGISTER:
      "Puedes crear tu cuenta desde la opción Registrarse y completar la verificación de correo.",

    BUY:
      entities.productId
        ? `Puedo analizar el producto ${entities.productId} antes de que continúes con la compra.`
        : "Puedo revisar el producto, su precio, vendedor y nivel de riesgo.",

    SELL:
      "Puedo revisar y mejorar tu publicación antes de subirla al Marketplace.",

    SEARCH:
      "Puedo recomendarte productos según tus preferencias, presupuesto y seguridad.",

    PRICE:
      "Puedo comparar el precio con productos similares y decirte si parece competitivo.",

    SECURITY:
      "Puedo revisar riesgo de fraude, reputación, verificación y solicitudes de pago externo.",

    ORDER:
      entities.orderId
        ? `Puedo consultar el estado de la orden ${entities.orderId}.`
        : "Puedo ayudarte a consultar el estado de tus órdenes.",

    DISPUTE:
      "Puedo orientarte para registrar o revisar una disputa dentro de QSM.",

    SUPPORT:
      "Explícame el problema y te indicaré el área o acción adecuada.",

    THANKS:
      "Con gusto. Estoy aquí para continuar ayudándote.",

    GENERAL:
      "Puedo ayudarte con compras, ventas, productos, precios, seguridad, órdenes y disputas."
  };

  return messages[intent] || messages.GENERAL;
}

function processDialogue({
  message,
  authenticated = false,
  user = {},
  context = {},
  history = []
}) {
  const intent =
    detectConversationIntent(message);

  const detectedEntities =
    detectConversationEntities(message);

  const suppliedContext =
    asObject(context);

  const mergedContext = {
    ...suppliedContext,
    productId:
      suppliedContext.productId ||
      detectedEntities.productId ||
      null,
    orderId:
      suppliedContext.orderId ||
      detectedEntities.orderId ||
      null
  };

  const state =
    determineConversationState({
      intent:
        intent.code,
      authenticated:
        Boolean(authenticated),
      context:
        mergedContext
    });

  const actions =
    getConversationActions({
      intent:
        intent.code,
      state,
      authenticated:
        Boolean(authenticated)
    });

  const responseMessage =
    buildDialogueMessage({
      intent:
        intent.code,
      state,
      authenticated:
        Boolean(authenticated),
      entities:
        detectedEntities,
      user:
        asObject(user)
    });

  const safeHistory =
    asArray(history)
      .slice(-10)
      .map((item) => ({
        role:
          String(
            item.role || "USER"
          ).toUpperCase(),
        content:
          String(
            item.content || ""
          ).slice(0, 1000)
      }));

  return {
    assistant: "LUNA",
    authenticated:
      Boolean(authenticated),
    accessLevel:
      authenticated
        ? "PRIVATE"
        : "PUBLIC_LIMITED",
    intent,
    entities:
      detectedEntities,
    state,
    message:
      responseMessage,
    actions,
    context:
      authenticated
        ? mergedContext
        : {
            page:
              mergedContext.page ||
              "PUBLIC"
          },
    historyUsed:
      safeHistory.length,
    restrictions:
      authenticated
        ? []
        : [
            "NO_PRIVATE_USER_DATA",
            "NO_ORDERS",
            "NO_PAYMENTS",
            "NO_DISPUTES",
            "NO_INTERNAL_METRICS"
          ],
    generatedAt:
      new Date().toISOString(),
    version:
      "QSM-LUNA-DIALOGUE-1.0"
  };
}

function getDialogueCapabilities() {
  return {
    assistant: "LUNA",
    phase: "7",
    capabilities: [
      "INTENT_DETECTION",
      "ENTITY_DETECTION",
      "DIALOGUE_STATE",
      "CONTEXT_AWARE_RESPONSES",
      "PUBLIC_INFORMATION_FILTER",
      "CONVERSATION_ACTIONS",
      "SHORT_HISTORY_CONTEXT"
    ],
    version:
      "QSM-LUNA-DIALOGUE-1.0"
  };
}

/* QSM_FASE7_BLOCK2_REAL_DIALOGUE_CONTEXT */

function validateDialogueUserId(userId) {
  const id = Number(userId);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Se requiere un usuario autenticado."
    );
  }

  return id;
}

function validateOptionalId(value) {
  const id = Number(value);

  return Number.isInteger(id) &&
    id > 0
    ? id
    : null;
}

async function getRealDialogueContext({
  userId,
  productId = null,
  orderId = null
}) {
  const numericUserId =
    validateDialogueUserId(userId);

  const numericProductId =
    validateOptionalId(productId);

  const numericOrderId =
    validateOptionalId(orderId);

  const [
    user,
    setting,
    product,
    order
  ] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: numericUserId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        trustScore: true,
        status: true,
        isVerified: true,
        buyerEnabled: true,
        sellerEnabled: true
      }
    }),

    prisma.userSetting.findUnique({
      where: {
        userId: numericUserId
      }
    }),

    numericProductId
      ? prisma.product.findUnique({
          where: {
            id: numericProductId
          },
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            status: true,
            sellerId: true,
            aiAnalysis: true
          }
        })
      : Promise.resolve(null),

    numericOrderId
      ? prisma.order.findFirst({
          where: {
            id: numericOrderId,
            OR: [
              {
                buyerId:
                  numericUserId
              },
              {
                sellerId:
                  numericUserId
              }
            ]
          },
          select: {
            id: true,
            status: true,
            totalAmount: true,
            buyerId: true,
            sellerId: true,
            createdAt: true,
            updatedAt: true
          }
        })
      : Promise.resolve(null)
  ]);

  if (!user) {
    throw new Error(
      "Usuario no encontrado."
    );
  }

  const settingData =
    asObject(setting?.data);

  const buyerProfile =
    asObject(
      settingData.lunaBuyerProfile
    );

  const sellerProfile =
    asObject(
      settingData.lunaSellerProfile
    );

  const recentPurchases =
    await prisma.order.findMany({
      where: {
        buyerId:
          numericUserId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5,
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true
      }
    });

  const recentSales =
    await prisma.order.findMany({
      where: {
        sellerId:
          numericUserId
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5,
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true
      }
    });

  return {
    user: {
      id:
        user.id,
      firstName:
        user.firstName,
      lastName:
        user.lastName,
      name:
        [
          user.firstName,
          user.lastName
        ]
          .filter(Boolean)
          .join(" "),
      email:
        user.email,
      role:
        user.role,
      trustScore:
        user.trustScore ?? 0,
      status:
        user.status,
      verified:
        user.isVerified === true,
      buyerEnabled:
        user.buyerEnabled === true,
      sellerEnabled:
        user.sellerEnabled === true
    },

    product,

    order,

    buyerProfile: {
      topCategory:
        buyerProfile
          .favoriteCategories?.[0] ||
        null,
      topBrand:
        buyerProfile
          .favoriteBrands?.[0] ||
        null,
      priceRange:
        buyerProfile.priceRange ||
        null,
      totalSearches:
        buyerProfile.totalSearches ||
        0,
      totalPurchases:
        buyerProfile.totalPurchases ||
        0
    },

    sellerProfile: {
      sellerScore:
        sellerProfile.reputation
          ?.sellerScore || 0,
      verificationStatus:
        sellerProfile.reputation
          ?.verificationStatus ||
        "PENDING",
      totalPublications:
        sellerProfile.performance
          ?.totalPublications || 0,
      soldProducts:
        sellerProfile.performance
          ?.soldProducts || 0,
      conversionRate:
        sellerProfile.performance
          ?.conversionRate || 0
    },

    recentOrders: {
      purchases:
        recentPurchases,
      sales:
        recentSales
    },

    memoryEnabled:
      settingData
        .lunaMemoryEnabled !== false,

    loadedAt:
      new Date().toISOString()
  };
}

function buildRealContextMessage({
  dialogue,
  context
}) {
  const intent =
    dialogue.intent?.code;

  const product =
    context.product;

  const order =
    context.order;

  const buyerProfile =
    asObject(
      context.buyerProfile
    );

  const sellerProfile =
    asObject(
      context.sellerProfile
    );

  if (
    intent === "SECURITY" &&
    product
  ) {
    return (
      `Puedo revisar la seguridad de ${product.title}, ` +
      "incluyendo el riesgo de la publicación y la confianza del vendedor."
    );
  }

  if (
    intent === "PRICE" &&
    product
  ) {
    return (
      `Puedo comparar el precio de ${product.title}, ` +
      `actualmente publicado por RD${Number(product.price || 0)}, ` +
      "con productos similares."
    );
  }

  if (
    intent === "BUY" &&
    product
  ) {
    return (
      `Antes de comprar ${product.title}, puedo analizar ` +
      "su precio, puntuación, vendedor y riesgo de la operación."
    );
  }

  if (
    intent === "ORDER" &&
    order
  ) {
    return (
      `La orden ${order.id} se encuentra actualmente ` +
      `en estado ${order.status}.`
    );
  }

  if (intent === "ORDER") {
    const purchases =
      asArray(
        context.recentOrders
          ?.purchases
      );

    if (purchases.length > 0) {
      return (
        `Tu compra más reciente es la orden ${purchases[0].id}, ` +
        `actualmente en estado ${purchases[0].status}.`
      );
    }

    return (
      "No encontré compras recientes asociadas a tu cuenta."
    );
  }

  if (intent === "SEARCH") {
    if (
      buyerProfile.topCategory?.name
    ) {
      return (
        `Tu categoría principal es ${buyerProfile.topCategory.name}. ` +
        "Puedo recomendarte productos relacionados y ordenarlos por seguridad."
      );
    }

    return (
      "Puedo recomendarte productos según tu actividad, presupuesto y seguridad."
    );
  }

  if (intent === "SELL") {
    return (
      `Tienes ${sellerProfile.totalPublications || 0} publicación(es) ` +
      `y ${sellerProfile.soldProducts || 0} venta(s) completadas. ` +
      "Puedo ayudarte a mejorar tu próxima publicación."
    );
  }

  if (
    intent === "DISPUTE" &&
    order
  ) {
    return (
      `Puedo ayudarte a registrar una disputa relacionada con la orden ${order.id}.`
    );
  }

  return dialogue.message;
}

async function processRealDialogue({
  userId,
  sessionId,
  message,
  context = {}
}) {
  const numericUserId =
    validateDialogueUserId(userId);

  const safeSessionId =
    String(
      sessionId ||
      `LUNA-${numericUserId}`
    )
      .trim()
      .slice(0, 120);

  const suppliedContext =
    asObject(context);

  const detectedEntities =
    detectConversationEntities(
      message
    );

  const productId =
    suppliedContext.productId ||
    detectedEntities.productId ||
    null;

  const orderId =
    suppliedContext.orderId ||
    detectedEntities.orderId ||
    null;

  const realContext =
    await getRealDialogueContext({
      userId:
        numericUserId,
      productId,
      orderId
    });

  const memory =
    realContext.memoryEnabled
      ? await getConversationMemory({
          sessionId:
            safeSessionId,
          userId:
            numericUserId
        })
      : {
          messages: []
        };

  const dialogue =
    processDialogue({
      message,
      authenticated: true,
      user:
        realContext.user,
      context: {
        ...suppliedContext,
        productId,
        orderId,
        page:
          suppliedContext.page ||
          "GENERAL"
      },
      history:
        memory?.messages || []
    });

  const finalMessage =
    buildRealContextMessage({
      dialogue,
      context:
        realContext
    });

  const result = {
    ...dialogue,
    message:
      finalMessage,
    sessionId:
      safeSessionId,
    realContext: {
      user:
        realContext.user,
      product:
        realContext.product,
      order:
        realContext.order,
      buyerProfile:
        realContext.buyerProfile,
      sellerProfile:
        realContext.sellerProfile,
      recentOrders:
        realContext.recentOrders
    },
    contextLoaded: true,
    memoryEnabled:
      realContext.memoryEnabled,
    version:
      "QSM-LUNA-DIALOGUE-2.0"
  };

  if (realContext.memoryEnabled) {
    await saveConversationMessage({
      sessionId:
        safeSessionId,
      userId:
        numericUserId,
      message: {
        role: "USER",
        content:
          String(message || ""),
        page:
          suppliedContext.page ||
          "GENERAL"
      }
    });

    await saveConversationMessage({
      sessionId:
        safeSessionId,
      userId:
        numericUserId,
      message: {
        role: "LUNA",
        content:
          finalMessage,
        page:
          suppliedContext.page ||
          "GENERAL",
        intent:
          dialogue.intent?.code ||
          "GENERAL"
      }
    });
  }

  return result;
}

async function getRealDialogueSession({
  userId,
  sessionId
}) {
  const numericUserId =
    validateDialogueUserId(userId);

  const safeSessionId =
    String(sessionId || "")
      .trim()
      .slice(0, 120);

  if (!safeSessionId) {
    throw new Error(
      "Se requiere una sesión válida."
    );
  }

  const memory =
    await getConversationMemory({
      sessionId:
        safeSessionId,
      userId:
        numericUserId
    });

  return {
    sessionId:
      safeSessionId,
    userId:
      numericUserId,
    messages:
      asArray(memory?.messages),
    messageCount:
      asArray(memory?.messages).length,
    updatedAt:
      memory?.updatedAt || null
  };
}

module.exports = {
  detectConversationIntent,
  detectConversationEntities,
  processDialogue,
  getDialogueCapabilities,
  getRealDialogueContext,
  processRealDialogue,
  getRealDialogueSession
};
