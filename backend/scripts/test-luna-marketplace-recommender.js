"use strict";

/* QSM_FASE5_3_MARKETPLACE_RECOMMENDER_TEST */

const prisma = require("../src/utils/prisma");

const {
  calculateAndSaveProductScore,
  getPersonalizedProductRecommendations,
  compareProductAlternatives
} = require(
  "../src/services/luna-product-score.service"
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
        title: true
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

  const score =
    await calculateAndSaveProductScore({
      productId: product.id
    });

  if (
    !Number.isFinite(score.score) ||
    score.score < 0 ||
    score.score > 100
  ) {
    throw new Error(
      "El score generado no es válido."
    );
  }

  const recommendations =
    await getPersonalizedProductRecommendations({
      userId: user.id,
      filters: {
        limit: 5
      }
    });

  if (
    !Array.isArray(
      recommendations.recommendations
    )
  ) {
    throw new Error(
      "El recomendador no devolvió una lista válida."
    );
  }

  const comparison =
    await compareProductAlternatives({
      productId: product.id,
      userId: user.id,
      limit: 5
    });

  if (
    comparison.target?.productId !==
    product.id
  ) {
    throw new Error(
      "La comparación no reconoció el producto principal."
    );
  }

  if (
    !Array.isArray(
      comparison.alternatives
    )
  ) {
    throw new Error(
      "La comparación no devolvió alternativas válidas."
    );
  }

  console.log("");
  console.log(
    "RECOMENDADOR INTELIGENTE VALIDADO EN SUPABASE"
  );

  console.log({
    score: score.score,
    clasificacion:
      score.classificationLabel,
    recomendaciones:
      recommendations.recommendations.length,
    alternativas:
      comparison.alternatives.length,
    mejoresAlternativas:
      comparison.betterAlternatives
  });

  console.log("");
  console.log(
    "FASE 5.3 COMPLETADA CORRECTAMENTE"
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
