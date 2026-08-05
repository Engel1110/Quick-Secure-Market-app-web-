"use strict";

/* QSM_FASE5_2_8_SELLER_PROFILE_TEST */

const prisma = require("../src/utils/prisma");

const {
  resetSellerProfile,
  recordPublishedProduct,
  recordCompletedSale,
  recordSellerResponse,
  calculateSellerReputation,
  calculateSellerSpecialties,
  generateSellerRecommendations
} = require(
  "../src/services/luna-seller-profile.service"
);

async function main() {
  const user = await prisma.user.findFirst({
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
      "No existe ningún usuario para la prueba."
    );
  }

  console.log(
    `Vendedor: ${user.email} (ID ${user.id})`
  );

  await resetSellerProfile({
    userId: user.id
  });

  await recordPublishedProduct({
    userId: user.id,
    product: {
      productId: 920001,
      title: "Laptop ASUS Gaming",
      category: "Tecnología",
      brand: "ASUS",
      price: 55000,
      status: "ACTIVE",
      riskScore: 10
    }
  });

  await recordPublishedProduct({
    userId: user.id,
    product: {
      productId: 920002,
      title: "Monitor ASUS Gaming",
      category: "Tecnología",
      brand: "ASUS",
      price: 22000,
      status: "ACTIVE",
      riskScore: 5
    }
  });

  await recordCompletedSale({
    userId: user.id,
    sale: {
      orderId: 930001,
      productId: 920001,
      buyerId: 2,
      title: "Laptop ASUS Gaming",
      category: "Tecnología",
      brand: "ASUS",
      total: 55000,
      quantity: 1,
      status: "COMPLETED"
    }
  });

  await recordSellerResponse({
    userId: user.id,
    metric: {
      conversationId: "TEST-CONVERSATION-1",
      responseMinutes: 12,
      channel: "MESSAGES"
    }
  });

  await recordSellerResponse({
    userId: user.id,
    metric: {
      conversationId: "TEST-CONVERSATION-2",
      responseMinutes: 28,
      channel: "MESSAGES"
    }
  });

  let profile =
    await calculateSellerSpecialties({
      userId: user.id
    });

  if (
    profile.performance?.totalPublications !== 2
  ) {
    throw new Error(
      "Las publicaciones no fueron registradas."
    );
  }

  if (
    profile.performance?.soldProducts !== 1
  ) {
    throw new Error(
      "La venta no fue registrada."
    );
  }

  if (
    profile.responseMetrics?.totalResponses !== 2
  ) {
    throw new Error(
      "Los tiempos de respuesta no fueron registrados."
    );
  }

  if (
    profile.responseMetrics
      ?.averageResponseMinutes !== 20
  ) {
    throw new Error(
      "El promedio de respuesta es incorrecto."
    );
  }

  if (
    profile.dominantCategories?.[0]?.name !==
    "TECNOLOGÍA"
  ) {
    throw new Error(
      "La categoría dominante no fue calculada."
    );
  }

  if (
    profile.dominantBrands?.[0]?.name !==
    "ASUS"
  ) {
    throw new Error(
      "La marca dominante no fue calculada."
    );
  }

  profile =
    await calculateSellerReputation({
      userId: user.id,
      metrics: {
        trustScore: 90,
        positiveReviews: 10,
        negativeReviews: 1,
        disputesReceived: 0,
        warningsReceived: 0,
        verificationStatus: "APPROVED"
      }
    });

  if (
    Number(profile.reputation?.sellerScore || 0) <= 0
  ) {
    throw new Error(
      "La reputación comercial no fue calculada."
    );
  }

  profile =
    await generateSellerRecommendations({
      userId: user.id
    });

  if (
    !Array.isArray(profile.recommendations) ||
    profile.recommendations.length === 0
  ) {
    throw new Error(
      "LUNA no generó recomendaciones."
    );
  }

  console.log("");
  console.log(
    "PERFIL DEL VENDEDOR VALIDADO EN SUPABASE"
  );

  console.log({
    publicaciones:
      profile.performance.totalPublications,
    ventas:
      profile.performance.soldProducts,
    conversion:
      profile.performance.conversionRate,
    respuestaPromedio:
      profile.responseMetrics.averageResponseMinutes,
    categoriaDominante:
      profile.dominantCategories[0],
    marcaDominante:
      profile.dominantBrands[0],
    sellerScore:
      profile.reputation.sellerScore,
    recomendaciones:
      profile.recommendations.length
  });

  await resetSellerProfile({
    userId: user.id
  });

  console.log("");
  console.log(
    "FASE 5.2.8 COMPLETADA CORRECTAMENTE"
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
