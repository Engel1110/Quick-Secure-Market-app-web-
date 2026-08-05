"use strict";

/* QSM_FASE5_9_BLOCK3_FINAL_MARKETPLACE_TEST */

const prisma = require("../src/utils/prisma");

const {
  executeMarketplaceAction,
  getMarketplaceCapabilities,
  buildMarketplaceBundle
} = require(
  "../src/services/luna-marketplace-orchestrator.service"
);

async function main() {
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
        title: true,
        price: true
      }
    });

  if (!product) {
    throw new Error(
      "No existe un producto activo para la prueba."
    );
  }

  console.log(
    `Usuario: ${user.email} (ID ${user.id})`
  );

  console.log(
    `Producto: ${product.title} (ID ${product.id})`
  );

  /* CAPACIDADES */

  const capabilities =
    getMarketplaceCapabilities();

  if (
    capabilities.assistant !== "LUNA" ||
    capabilities.phase !== "5.9"
  ) {
    throw new Error(
      "Las capacidades del orquestador no son válidas."
    );
  }

  if (
    !Array.isArray(capabilities.actions) ||
    capabilities.actions.length < 14
  ) {
    throw new Error(
      "El orquestador no contiene todas las acciones esperadas."
    );
  }

  const requiredActions = [
    "BUYER_PROFILE",
    "SELLER_PROFILE",
    "PRODUCT_SCORE",
    "PRODUCT_RECOMMENDATIONS",
    "COMPARE_PRODUCTS",
    "MARKET_PRICE",
    "MARKET_OPPORTUNITIES",
    "TRANSACTION_RISK",
    "LISTING_ANALYZE",
    "LISTING_IMPROVE",
    "CONVERSATION",
    "PURCHASE_ANALYZE",
    "PURCHASE_COMPLETE"
  ];

  for (const action of requiredActions) {
    if (!capabilities.actions.includes(action)) {
      throw new Error(
        `Falta la capacidad ${action}.`
      );
    }
  }

  /* ACCIÓN INDIVIDUAL */

  const productScore =
    await executeMarketplaceAction({
      action: "PRODUCT_SCORE",
      userId: user.id,
      payload: {
        productId: product.id
      }
    });

  if (
    !Number.isFinite(
      Number(productScore.score)
    )
  ) {
    throw new Error(
      "PRODUCT_SCORE no generó un puntaje válido."
    );
  }

  if (
    Number(productScore.score) < 0 ||
    Number(productScore.score) > 100
  ) {
    throw new Error(
      "El score está fuera del rango permitido."
    );
  }

  /* ASISTENTE DE PUBLICACIÓN */

  const listingAnalysis =
    await executeMarketplaceAction({
      action: "LISTING_ANALYZE",
      userId: user.id,
      payload: {
        product: {
          title:
            "Laptop ASUS Gaming Seminueva",
          description:
            "Laptop gaming en excelente estado, con poco uso, cargador original incluido, garantía disponible y entrega coordinada dentro de QSM.",
          price:
            55000,
          category:
            "Tecnología",
          condition:
            "Seminuevo",
          images: [
            "image-1.jpg",
            "image-2.jpg",
            "image-3.jpg"
          ]
        }
      }
    });

  if (
    !Number.isFinite(
      Number(listingAnalysis.score)
    ) ||
    typeof listingAnalysis.canPublish !==
      "boolean"
  ) {
    throw new Error(
      "LISTING_ANALYZE no devolvió un análisis válido."
    );
  }

  /* CONVERSACIÓN PRIVADA */

  const conversation =
    await executeMarketplaceAction({
      action: "CONVERSATION",
      userId: user.id,
      payload: {
        message:
          "¿Este producto es seguro?",
        productId:
          product.id,
        page:
          "PRODUCT_DETAILS"
      }
    });

  if (
    conversation.authenticated !== true ||
    conversation.accessLevel !== "PRIVATE" ||
    conversation.contextLoaded !== true
  ) {
    throw new Error(
      "La conversación privada no cargó correctamente."
    );
  }

  /* BUNDLE GENERAL */

  const bundle =
    await buildMarketplaceBundle({
      userId:
        user.id,
      productId:
        product.id,
      includePurchaseAnalysis:
        false
    });

  if (
    bundle.assistant !== "LUNA" ||
    bundle.phase !== "5.9"
  ) {
    throw new Error(
      "El bundle no pertenece a LUNA 5.9."
    );
  }

  if (
    !["COMPLETE", "PARTIAL"].includes(
      bundle.status
    )
  ) {
    throw new Error(
      `El bundle terminó con estado ${bundle.status}.`
    );
  }

  if (
    !bundle.summary ||
    bundle.summary.totalActions < 8
  ) {
    throw new Error(
      "El bundle no ejecutó todas las áreas esperadas."
    );
  }

  if (
    bundle.summary.successfulActions < 5
  ) {
    throw new Error(
      "Muy pocas acciones del Marketplace fueron completadas."
    );
  }

  if (
    !bundle.sections?.BUYER_PROFILE ||
    !bundle.sections?.SELLER_PROFILE ||
    !bundle.sections?.PRODUCT_SCORE ||
    !bundle.sections?.MARKET_PRICE ||
    !bundle.sections?.COMPARE_PRODUCTS
  ) {
    throw new Error(
      "El bundle no contiene las secciones principales."
    );
  }

  if (
    bundle.sections.PRODUCT_SCORE
      .success !== true
  ) {
    throw new Error(
      "El score del producto falló dentro del bundle."
    );
  }

  if (
    Number(
      bundle.sections.PRODUCT_SCORE
        .result?.score
    ) !== Number(productScore.score)
  ) {
    throw new Error(
      "El score del bundle no coincide con la acción individual."
    );
  }

  console.log("");
  console.log(
    "ORQUESTADOR DE MARKETPLACE VALIDADO CORRECTAMENTE"
  );

  console.log({
    capacidades:
      capabilities.actions.length,

    producto: {
      id:
        product.id,
      titulo:
        product.title,
      score:
        productScore.score,
      clasificacion:
        productScore.classificationLabel
    },

    publicacion: {
      score:
        listingAnalysis.score,
      puedePublicar:
        listingAnalysis.canPublish
    },

    conversacion: {
      acceso:
        conversation.accessLevel,
      contexto:
        conversation.contextLoaded
    },

    bundle: {
      estado:
        bundle.status,
      acciones:
        bundle.summary.totalActions,
      exitosas:
        bundle.summary.successfulActions,
      fallidas:
        bundle.summary.failedActions,
      recomendaciones:
        bundle.summary.recommendationCount,
      oportunidades:
        bundle.summary.opportunityCount
    }
  });

  if (bundle.errors.length > 0) {
    console.log("");
    console.log(
      "ACCIONES OPCIONALES NO COMPLETADAS:"
    );

    console.log(bundle.errors);
  }

  console.log("");
  console.log(
    "FASE 5.9 COMPLETADA CORRECTAMENTE"
  );

  console.log(
    "FASE 5 MARKETPLACE INTELIGENTE COMPLETADA CORRECTAMENTE"
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
