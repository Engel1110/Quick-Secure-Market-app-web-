"use strict";

/* QSM_FASE7_BLOCK3_DIALOGUE_TEST */

const prisma = require("../src/utils/prisma");

const {
  detectConversationIntent,
  detectConversationEntities,
  processDialogue,
  getDialogueCapabilities,
  getRealDialogueContext,
  processRealDialogue,
  getRealDialogueSession
} = require(
  "../src/services/luna-dialogue-engine.service"
);

const {
  getMemoryPreference,
  setMemoryPreference,
  clearConversationMemory
} = require(
  "../src/services/luna-memory.service"
);

async function main() {
  /* INTENCIONES */

  const purchaseIntent =
    detectConversationIntent(
      "Quiero comprar este producto"
    );

  if (purchaseIntent.code !== "BUY") {
    throw new Error(
      "LUNA no detectó la intención de compra."
    );
  }

  const securityIntent =
    detectConversationIntent(
      "¿Este producto es seguro o puede ser una estafa?"
    );

  if (securityIntent.code !== "SECURITY") {
    throw new Error(
      "LUNA no detectó la intención de seguridad."
    );
  }

  /* ENTIDADES */

  const entities =
    detectConversationEntities(
      "Quiero revisar el producto 12 y la orden 25 por RD$55,000"
    );

  if (
    entities.productId !== 12 ||
    entities.orderId !== 25 ||
    entities.amount !== 55000
  ) {
    throw new Error(
      "LUNA no detectó correctamente las entidades."
    );
  }

  /* FILTRO PÚBLICO */

  const publicDialogue =
    processDialogue({
      message:
        "Quiero consultar mi orden 25",
      authenticated: false,
      context: {},
      history: []
    });

  if (
    publicDialogue.accessLevel !==
    "PUBLIC_LIMITED"
  ) {
    throw new Error(
      "El acceso público no fue limitado."
    );
  }

  if (
    publicDialogue.state
      .requiresAuthentication !== true
  ) {
    throw new Error(
      "La consulta privada pública no solicitó autenticación."
    );
  }

  if (
    !publicDialogue.restrictions.includes(
      "NO_ORDERS"
    )
  ) {
    throw new Error(
      "El filtro público no bloqueó las órdenes."
    );
  }

  /* CAPACIDADES */

  const capabilities =
    getDialogueCapabilities();

  if (
    capabilities.assistant !== "LUNA" ||
    capabilities.phase !== "7"
  ) {
    throw new Error(
      "Las capacidades de diálogo no son válidas."
    );
  }

  if (
    !capabilities.capabilities.includes(
      "INTENT_DETECTION"
    ) ||
    !capabilities.capabilities.includes(
      "PUBLIC_INFORMATION_FILTER"
    )
  ) {
    throw new Error(
      "Faltan capacidades de conversación."
    );
  }

  /* USUARIO REAL */

  const user =
    await prisma.user.findFirst({
      orderBy: {
        id: "asc"
      },
      select: {
        id: true,
        email: true
      }
    });

  if (!user) {
    throw new Error(
      "No existe un usuario para la prueba."
    );
  }

  const product =
    await prisma.product.findFirst({
      where: {
        status: "ACTIVE"
      },
      orderBy: {
        id: "asc"
      },
      select: {
        id: true,
        title: true
      }
    });

  const order =
    await prisma.order.findFirst({
      where: {
        OR: [
          {
            buyerId: user.id
          },
          {
            sellerId: user.id
          }
        ]
      },
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        status: true
      }
    });

  console.log(
    `Usuario: ${user.email} (ID ${user.id})`
  );

  if (product) {
    console.log(
      `Producto: ${product.title} (ID ${product.id})`
    );
  }

  if (order) {
    console.log(
      `Orden: ${order.id} (${order.status})`
    );
  }

  /* CONTEXTO REAL */

  const realContext =
    await getRealDialogueContext({
      userId:
        user.id,
      productId:
        product?.id || null,
      orderId:
        order?.id || null
    });

  if (
    realContext.user?.id !== user.id
  ) {
    throw new Error(
      "No se cargó el usuario real."
    );
  }

  if (
    product &&
    realContext.product?.id !==
      product.id
  ) {
    throw new Error(
      "No se cargó el producto contextual."
    );
  }

  if (
    order &&
    realContext.order?.id !==
      order.id
  ) {
    throw new Error(
      "No se cargó la orden contextual."
    );
  }

  if (
    !Array.isArray(
      realContext.recentOrders
        .purchases
    ) ||
    !Array.isArray(
      realContext.recentOrders
        .sales
    )
  ) {
    throw new Error(
      "No se cargaron las órdenes recientes."
    );
  }

  /* MEMORIA Y DIÁLOGO REAL */

  const sessionId =
    `QSM-FASE7-${Date.now()}`;

  const previousPreference =
    await getMemoryPreference({
      userId: user.id
    });

  await setMemoryPreference({
    userId:
      user.id,
    enabled:
      true
  });

  try {
    const firstDialogue =
      await processRealDialogue({
        userId:
          user.id,
        sessionId,
        message:
          product
            ? `¿El producto ${product.id} es seguro?`
            : "Ayúdame a buscar un producto seguro",
        context: {
          productId:
            product?.id || null,
          page:
            product
              ? "PRODUCT_DETAILS"
              : "MARKETPLACE"
        }
      });

    if (
      firstDialogue.authenticated !== true ||
      firstDialogue.accessLevel !==
        "PRIVATE" ||
      firstDialogue.contextLoaded !== true
    ) {
      throw new Error(
        "La conversación privada real no cargó correctamente."
      );
    }

    if (
      !firstDialogue.message ||
      typeof firstDialogue.message !==
        "string"
    ) {
      throw new Error(
        "LUNA no generó una respuesta real."
      );
    }

    const secondDialogue =
      await processRealDialogue({
        userId:
          user.id,
        sessionId,
        message:
          order
            ? `Consulta la orden ${order.id}`
            : "Muéstrame mi compra más reciente",
        context: {
          orderId:
            order?.id || null,
          page:
            "ORDERS"
        }
      });

    if (
      secondDialogue.historyUsed < 2
    ) {
      throw new Error(
        "LUNA no utilizó la memoria de la conversación."
      );
    }

    const session =
      await getRealDialogueSession({
        userId:
          user.id,
        sessionId
      });

    if (
      !Array.isArray(session.messages) ||
      session.messageCount < 4
    ) {
      throw new Error(
        "La conversación no fue guardada correctamente."
      );
    }

    console.log("");
    console.log(
      "CONVERSACIÓN INTELIGENTE VALIDADA EN SUPABASE"
    );

    console.log({
      intenciones: {
        compra:
          purchaseIntent.code,
        seguridad:
          securityIntent.code
      },

      entidades: {
        producto:
          entities.productId,
        orden:
          entities.orderId,
        monto:
          entities.amount
      },

      accesoPublico: {
        nivel:
          publicDialogue.accessLevel,
        autenticacionRequerida:
          publicDialogue.state
            .requiresAuthentication
      },

      contextoReal: {
        usuario:
          realContext.user.id,
        producto:
          realContext.product?.title ||
          "Sin producto",
        orden:
          realContext.order?.id ||
          "Sin orden",
        compras:
          realContext.recentOrders
            .purchases.length,
        ventas:
          realContext.recentOrders
            .sales.length
      },

      conversacion: {
        sesion:
          session.sessionId,
        mensajes:
          session.messageCount,
        memoriaUsada:
          secondDialogue.historyUsed,
        respuesta:
          secondDialogue.message
      }
    });
  }
  finally {
    await clearConversationMemory({
      userId:
        user.id,
      sessionId
    });

    await setMemoryPreference({
      userId:
        user.id,
      enabled:
        previousPreference !== false
    });
  }

  console.log("");
  console.log(
    "FASE 7 COMPLETADA CORRECTAMENTE"
  );
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      "ERROR EN LA PRUEBA:",
      error.message
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
