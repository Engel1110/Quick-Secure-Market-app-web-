"use strict";

const prisma = require("../utils/prisma");

/* QSM_FASE5_7_BLOCK1_CONVERSATION_INTELLIGENCE */

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function asObject(value) {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? value
    : {};
}

function detectIntent(message) {
  const text = normalizeText(message);

  if (!text) {
    return {
      code: "EMPTY",
      confidence: 100
    };
  }

  const intents = [
    {
      code: "REGISTER",
      terms: [
        "registrarme",
        "registro",
        "crear cuenta",
        "abrir cuenta",
        "cómo me registro"
      ]
    },
    {
      code: "LOGIN",
      terms: [
        "iniciar sesión",
        "entrar",
        "login",
        "acceder",
        "contraseña"
      ]
    },
    {
      code: "BUY_PRODUCT",
      terms: [
        "comprar",
        "quiero comprar",
        "cómo compro",
        "hacer una compra",
        "pagar"
      ]
    },
    {
      code: "SELL_PRODUCT",
      terms: [
        "vender",
        "publicar",
        "crear publicación",
        "subir producto",
        "quiero vender"
      ]
    },
    {
      code: "PRODUCT_SEARCH",
      terms: [
        "buscar producto",
        "recomiéndame",
        "recomendar",
        "qué producto",
        "mejor opción"
      ]
    },
    {
      code: "PRICE_ANALYSIS",
      terms: [
        "precio justo",
        "está caro",
        "está barato",
        "comparar precio",
        "buena oferta"
      ]
    },
    {
      code: "SECURITY",
      terms: [
        "seguro",
        "fraude",
        "estafa",
        "riesgo",
        "confianza"
      ]
    },
    {
      code: "ORDER_STATUS",
      terms: [
        "mi pedido",
        "orden",
        "seguimiento",
        "dónde está",
        "estado de compra"
      ]
    },
    {
      code: "DISPUTE",
      terms: [
        "disputa",
        "reclamo",
        "problema con vendedor",
        "problema con comprador",
        "devolución"
      ]
    },
    {
      code: "PLATFORM_INFO",
      terms: [
        "qué es qsm",
        "cómo funciona",
        "conocer plataforma",
        "qué puedo hacer",
        "ayuda"
      ]
    }
  ];

  for (const intent of intents) {
    const matches =
      intent.terms.filter((term) =>
        text.includes(term)
      );

    if (matches.length > 0) {
      return {
        code: intent.code,
        confidence: Math.min(
          100,
          70 + matches.length * 10
        ),
        matches
      };
    }
  }

  return {
    code: "GENERAL",
    confidence: 50,
    matches: []
  };
}

function getPublicResponse(intent) {
  const responses = {
    REGISTER: {
      message:
        "Para utilizar todas las funciones de QSM debes crear una cuenta. Selecciona Registrarse, completa tus datos y verifica tu correo.",
      actions: [
        {
          code: "GO_REGISTER",
          label: "Crear cuenta",
          route: "/register"
        }
      ]
    },

    LOGIN: {
      message:
        "Selecciona Iniciar sesión e introduce tu correo y contraseña. También puedes recuperar tu contraseña desde esa pantalla.",
      actions: [
        {
          code: "GO_LOGIN",
          label: "Iniciar sesión",
          route: "/login"
        }
      ]
    },

    PLATFORM_INFO: {
      message:
        "QSM es una plataforma académica de compraventa segura. Puedes registrarte como comprador o vendedor, publicar productos y gestionar compras dentro de la plataforma.",
      actions: [
        {
          code: "GO_REGISTER",
          label: "Conocer QSM",
          route: "/register"
        }
      ]
    }
  };

  return responses[intent] || {
    message:
      "Puedo explicarte cómo registrarte, iniciar sesión y conocer las funciones generales de QSM. Para consultar productos, compras, usuarios o información privada debes iniciar sesión.",
    actions: [
      {
        code: "GO_REGISTER",
        label: "Crear cuenta",
        route: "/register"
      },
      {
        code: "GO_LOGIN",
        label: "Iniciar sesión",
        route: "/login"
      }
    ]
  };
}

function getAuthenticatedResponse({
  intent,
  context
}) {
  const responses = {
    BUY_PRODUCT: {
      message:
        "Puedo ayudarte a revisar el producto, comparar su precio, analizar la confianza del vendedor y verificar riesgos antes de comprar.",
      actions: [
        "ANALYZE_PRODUCT",
        "COMPARE_PRICE",
        "CHECK_TRANSACTION_RISK"
      ]
    },

    SELL_PRODUCT: {
      message:
        "Puedo revisar tu publicación antes de subirla, mejorar el título y la descripción, detectar campos faltantes y recomendar un precio.",
      actions: [
        "ANALYZE_LISTING",
        "IMPROVE_LISTING",
        "ANALYZE_PRICE"
      ]
    },

    PRODUCT_SEARCH: {
      message:
        "Puedo recomendarte productos utilizando tus búsquedas, categorías favoritas, marcas, presupuesto y nivel de seguridad.",
      actions: [
        "GET_RECOMMENDATIONS",
        "COMPARE_PRODUCTS"
      ]
    },

    PRICE_ANALYSIS: {
      message:
        "Puedo comparar el precio con publicaciones similares y decirte si parece una oferta, un precio justo o un precio elevado.",
      actions: [
        "ANALYZE_MARKET_PRICE",
        "GET_MARKET_OPPORTUNITIES"
      ]
    },

    SECURITY: {
      message:
        "Puedo revisar señales de fraude, Trust Score, verificación, reputación, solicitudes de pago externo y riesgo de la operación.",
      actions: [
        "CHECK_TRANSACTION_RISK",
        "CHECK_SELLER_REPUTATION"
      ]
    },

    ORDER_STATUS: {
      message:
        "Puedo ayudarte a consultar el estado de tus órdenes y explicarte en qué etapa se encuentra la compra.",
      actions: [
        "GET_ORDER_STATUS"
      ]
    },

    DISPUTE: {
      message:
        "Puedo orientarte para crear o revisar una disputa y mostrarte las acciones disponibles según el estado del caso.",
      actions: [
        "OPEN_DISPUTE",
        "GET_DISPUTE_STATUS"
      ]
    }
  };

  const selected =
    responses[intent] || {
      message:
        "Estoy lista para ayudarte con compras, ventas, publicaciones, seguridad, precios, órdenes y recomendaciones dentro de QSM.",
      actions: [
        "SHOW_AVAILABLE_HELP"
      ]
    };

  return {
    ...selected,
    contextUsed:
      Boolean(
        context &&
        Object.keys(context).length
      )
  };
}

function protectSensitiveInformation({
  authenticated,
  result
}) {
  if (authenticated) {
    return result;
  }

  return {
    ...result,
    sensitiveDataBlocked: true,
    userData: undefined,
    orders: undefined,
    payments: undefined,
    disputes: undefined,
    sellerProfile: undefined,
    buyerProfile: undefined,
    transactionHistory: undefined,
    internalMetrics: undefined
  };
}

function buildConversationResponse({
  message,
  authenticated = false,
  user = {},
  context = {}
}) {
  const intentResult =
    detectIntent(message);

  const baseResponse =
    authenticated
      ? getAuthenticatedResponse({
          intent: intentResult.code,
          context: asObject(context)
        })
      : getPublicResponse(
          intentResult.code
        );

  const result = {
    assistant: "LUNA",
    authenticated:
      Boolean(authenticated),
    accessLevel:
      authenticated
        ? "PRIVATE"
        : "PUBLIC_LIMITED",
    intent:
      intentResult,
    message:
      baseResponse.message,
    actions:
      baseResponse.actions || [],
    user: authenticated
      ? {
          id:
            user.id ||
            user.userId ||
            null,
          name:
            user.firstName ||
            user.name ||
            null
        }
      : null,
    restrictions:
      authenticated
        ? []
        : [
            "NO_USER_DATA",
            "NO_ORDER_DATA",
            "NO_PAYMENT_DATA",
            "NO_DISPUTE_DATA",
            "NO_INTERNAL_INFORMATION"
          ],
    generatedAt:
      new Date().toISOString(),
    version:
      "QSM-LUNA-CONVERSATION-1.0"
  };

  return protectSensitiveInformation({
    authenticated,
    result
  });
}

/* QSM_FASE5_7_BLOCK2_PRIVATE_CONTEXT */

async function getPrivateConversationContext({
  userId,
  productId = null
}) {
  const numericUserId =
    Number(userId);

  if (
    !Number.isInteger(numericUserId) ||
    numericUserId <= 0
  ) {
    throw new Error(
      "Se requiere un usuario autenticado."
    );
  }

  const user =
    await prisma.user.findUnique({
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
    });

  if (!user) {
    throw new Error(
      "Usuario no encontrado."
    );
  }

  const setting =
    await prisma.userSetting.findUnique({
      where: {
        userId: numericUserId
      }
    });

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

  const memoryEnabled =
    settingData.lunaMemoryEnabled !== false;

  const [
    buyerOrders,
    sellerOrders
  ] = await Promise.all([
    prisma.order.findMany({
      where: {
        buyerId: numericUserId
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
    }),

    prisma.order.findMany({
      where: {
        sellerId: numericUserId
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
    })
  ]);

  let product = null;

  const numericProductId =
    Number(productId);

  if (
    Number.isInteger(numericProductId) &&
    numericProductId > 0
  ) {
    product =
      await prisma.product.findUnique({
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
      });
  }

  return {
    user: {
      id: user.id,
      name: [
        user.firstName,
        user.lastName
      ]
        .filter(Boolean)
        .join(" "),
      email: user.email,
      role: user.role,
      trustScore:
        user.trustScore ?? 0,
      status: user.status,
      verified:
        user.isVerified === true,
      buyerEnabled:
        user.buyerEnabled === true,
      sellerEnabled:
        user.sellerEnabled === true
    },

    buyerProfile: {
      topCategory:
        buyerProfile.favoriteCategories?.[0] ||
        null,
      topBrand:
        buyerProfile.favoriteBrands?.[0] ||
        null,
      priceRange:
        buyerProfile.priceRange ||
        null,
      totalSearches:
        buyerProfile.totalSearches || 0,
      totalPurchases:
        buyerProfile.totalPurchases || 0
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
          ?.conversionRate || 0,
      averageResponseMinutes:
        sellerProfile.responseMetrics
          ?.averageResponseMinutes || 0
    },

    orders: {
      purchases:
        buyerOrders,
      sales:
        sellerOrders
    },

    product,

    memoryEnabled,

    loadedAt:
      new Date().toISOString()
  };
}

function buildContextAwareMessage({
  intent,
  context
}) {
  const user =
    asObject(context.user);

  const buyerProfile =
    asObject(context.buyerProfile);

  const sellerProfile =
    asObject(context.sellerProfile);

  const product =
    context.product &&
    typeof context.product === "object"
      ? context.product
      : null;

  const purchases =
    Array.isArray(
      context.orders?.purchases
    )
      ? context.orders.purchases
      : [];

  const sales =
    Array.isArray(
      context.orders?.sales
    )
      ? context.orders.sales
      : [];

  if (
    intent === "PRODUCT_SEARCH" &&
    buyerProfile.topCategory?.name
  ) {
    return (
      `Según tu actividad, tu categoría principal es ` +
      `${buyerProfile.topCategory.name}. ` +
      `Puedo buscar opciones dentro de tu rango de precio y ordenarlas por seguridad.`
    );
  }

  if (
    intent === "PRICE_ANALYSIS" &&
    product
  ) {
    return (
      `Puedo analizar el precio de ${product.title} ` +
      `y compararlo con publicaciones similares disponibles en QSM.`
    );
  }

  if (
    intent === "SECURITY" &&
    product
  ) {
    return (
      `Puedo revisar el riesgo de ${product.title}, ` +
      `la reputación del vendedor y cualquier señal de pago externo.`
    );
  }

  if (intent === "ORDER_STATUS") {
    if (purchases.length === 0) {
      return (
        "No encontré compras recientes asociadas a tu cuenta."
      );
    }

    const latestOrder =
      purchases[0];

    return (
      `Tu compra más reciente es la orden ${latestOrder.id} ` +
      `y actualmente está en estado ${latestOrder.status}.`
    );
  }

  if (intent === "SELL_PRODUCT") {
    return (
      `Actualmente tienes ${sellerProfile.totalPublications || 0} ` +
      `publicación(es) registradas y ${sellerProfile.soldProducts || 0} ` +
      `venta(s) completadas. Puedo ayudarte a mejorar tu próxima publicación.`
    );
  }

  if (intent === "DISPUTE") {
    return (
      "Puedo ayudarte a revisar tus casos y explicarte las acciones disponibles sin mostrar información de otros usuarios."
    );
  }

  if (
    intent === "GENERAL" &&
    sales.length > 0
  ) {
    return (
      `Hola ${user.name || ""}. ` +
      `Puedo ayudarte con tus compras, publicaciones, ventas, precios, seguridad y órdenes recientes.`
    ).trim();
  }

  return null;
}

async function buildPrivateContextualResponse({
  message,
  userId,
  productId = null,
  page = "GENERAL"
}) {
  const context =
    await getPrivateConversationContext({
      userId,
      productId
    });

  const baseResponse =
    buildConversationResponse({
      message,
      authenticated: true,
      user: context.user,
      context: {
        page,
        productId,
        memoryEnabled:
          context.memoryEnabled
      }
    });

  const contextualMessage =
    buildContextAwareMessage({
      intent:
        baseResponse.intent.code,
      context
    });

  return {
    ...baseResponse,
    message:
      contextualMessage ||
      baseResponse.message,
    context: {
      user:
        context.user,
      buyerProfile:
        context.buyerProfile,
      sellerProfile:
        context.sellerProfile,
      orders:
        context.orders,
      product:
        context.product,
      memoryEnabled:
        context.memoryEnabled
    },
    contextLoaded: true
  };
}

module.exports = {
  detectIntent,
  buildConversationResponse,
  protectSensitiveInformation,
  getPrivateConversationContext,
  buildPrivateContextualResponse
};
