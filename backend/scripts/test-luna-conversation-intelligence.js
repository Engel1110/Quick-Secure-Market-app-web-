"use strict";

/* QSM_FASE5_7_BLOCK3_CONVERSATION_TEST */

const prisma = require("../src/utils/prisma");

const {
  detectIntent,
  buildConversationResponse,
  getPrivateConversationContext,
  buildPrivateContextualResponse
} = require(
  "../src/services/luna-conversation-intelligence.service"
);

async function main() {
  /* PRUEBA DE INTENCIONES */

  const registerIntent =
    detectIntent(
      "¿Cómo puedo registrarme?"
    );

  if (
    registerIntent.code !== "REGISTER"
  ) {
    throw new Error(
      "LUNA no detectó la intención de registro."
    );
  }

  const securityIntent =
    detectIntent(
      "¿Esta compra puede ser una estafa?"
    );

  if (
    securityIntent.code !== "SECURITY"
  ) {
    throw new Error(
      "LUNA no detectó la intención de seguridad."
    );
  }

  /* PRUEBA PÚBLICA */

  const publicResponse =
    buildConversationResponse({
      message:
        "Quiero ver mis compras y pagos.",
      authenticated: false
    });

  if (
    publicResponse.accessLevel !==
    "PUBLIC_LIMITED"
  ) {
    throw new Error(
      "El acceso público no fue limitado."
    );
  }

  if (
    publicResponse.sensitiveDataBlocked !==
    true
  ) {
    throw new Error(
      "La información sensible pública no fue bloqueada."
    );
  }

  if (
    !Array.isArray(
      publicResponse.restrictions
    ) ||
    !publicResponse.restrictions.includes(
      "NO_ORDER_DATA"
    ) ||
    !publicResponse.restrictions.includes(
      "NO_PAYMENT_DATA"
    )
  ) {
    throw new Error(
      "Las restricciones públicas están incompletas."
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

  console.log(
    `Usuario: ${user.email} (ID ${user.id})`
  );

  if (product) {
    console.log(
      `Producto contextual: ${product.title} (ID ${product.id})`
    );
  }

  /* CONTEXTO PRIVADO REAL */

  const privateContext =
    await getPrivateConversationContext({
      userId: user.id,
      productId:
        product?.id || null
    });

  if (
    privateContext.user?.id !==
    user.id
  ) {
    throw new Error(
      "LUNA no cargó el usuario autenticado."
    );
  }

  if (
    !privateContext.orders ||
    !Array.isArray(
      privateContext.orders.purchases
    ) ||
    !Array.isArray(
      privateContext.orders.sales
    )
  ) {
    throw new Error(
      "LUNA no cargó correctamente las órdenes."
    );
  }

  if (
    product &&
    privateContext.product?.id !==
      product.id
  ) {
    throw new Error(
      "LUNA no cargó el producto contextual."
    );
  }

  /* RESPUESTA PRIVADA */

  const privateResponse =
    await buildPrivateContextualResponse({
      message:
        product
          ? "¿Este producto es seguro?"
          : "Ayúdame con mis compras",
      userId:
        user.id,
      productId:
        product?.id || null,
      page:
        product
          ? "PRODUCT_DETAILS"
          : "DASHBOARD"
    });

  if (
    privateResponse.authenticated !== true
  ) {
    throw new Error(
      "La conversación privada no reconoció la autenticación."
    );
  }

  if (
    privateResponse.accessLevel !==
    "PRIVATE"
  ) {
    throw new Error(
      "El nivel privado no fue aplicado."
    );
  }

  if (
    privateResponse.contextLoaded !== true
  ) {
    throw new Error(
      "El contexto privado no fue cargado."
    );
  }

  if (
    privateResponse.context?.user?.id !==
    user.id
  ) {
    throw new Error(
      "La respuesta privada no contiene el usuario correcto."
    );
  }

  if (
    !privateResponse.message ||
    typeof privateResponse.message !==
      "string"
  ) {
    throw new Error(
      "LUNA no generó una respuesta contextual."
    );
  }

  console.log("");
  console.log(
    "CONVERSACIÓN INTELIGENTE VALIDADA CORRECTAMENTE"
  );

  console.log({
    intencionRegistro:
      registerIntent.code,
    intencionSeguridad:
      securityIntent.code,
    accesoPublico:
      publicResponse.accessLevel,
    informacionSensibleBloqueada:
      publicResponse.sensitiveDataBlocked,
    accesoPrivado:
      privateResponse.accessLevel,
    contextoCargado:
      privateResponse.contextLoaded,
    productoContextual:
      privateContext.product?.title ||
      "Sin producto",
    comprasRecientes:
      privateContext.orders
        .purchases.length,
    ventasRecientes:
      privateContext.orders
        .sales.length,
    respuesta:
      privateResponse.message
  });

  console.log("");
  console.log(
    "FASE 5.7 COMPLETADA CORRECTAMENTE"
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
