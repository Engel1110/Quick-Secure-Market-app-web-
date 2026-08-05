"use strict";

/* QSM_FASE5_1_8_BUYER_PROFILE_TEST */

const prisma = require("../src/utils/prisma");

const {
  resetBuyerProfile,
  recordBuyerSearch,
  recordViewedProduct,
  setFavoriteProduct,
  recordPurchasedProduct,
  calculateBuyerPreferences,
  getBuyerInsights
} = require(
  "../src/services/luna-buyer-profile.service"
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
    `Usuario: ${user.email} (ID ${user.id})`
  );

  await resetBuyerProfile({
    userId: user.id
  });

  await recordBuyerSearch({
    userId: user.id,
    search: {
      query: "Laptop gaming ASUS",
      category: "Tecnología",
      brand: "ASUS",
      minimumPrice: 30000,
      maximumPrice: 65000,
      location: "Santo Domingo",
      resultsCount: 8
    }
  });

  await recordViewedProduct({
    userId: user.id,
    product: {
      productId: 900001,
      title: "Laptop ASUS Gaming",
      category: "Tecnología",
      brand: "ASUS",
      price: 55000,
      sellerId: 1
    }
  });

  await setFavoriteProduct({
    userId: user.id,
    favorite: true,
    product: {
      productId: 900001,
      title: "Laptop ASUS Gaming",
      category: "Tecnología",
      brand: "ASUS",
      price: 55000,
      sellerId: 1
    }
  });

  await recordPurchasedProduct({
    userId: user.id,
    purchase: {
      orderId: 990001,
      productId: 900001,
      title: "Laptop ASUS Gaming",
      category: "Tecnología",
      brand: "ASUS",
      total: 55000,
      quantity: 1,
      sellerId: 1,
      status: "COMPLETED"
    }
  });

  const profile =
    await calculateBuyerPreferences({
      userId: user.id
    });

  if (profile.totalSearches !== 1) {
    throw new Error(
      "La búsqueda no fue registrada."
    );
  }

  if (profile.totalViews !== 1) {
    throw new Error(
      "La visualización no fue registrada."
    );
  }

  if (profile.totalFavorites !== 1) {
    throw new Error(
      "El favorito no fue registrado."
    );
  }

  if (profile.totalPurchases !== 1) {
    throw new Error(
      "La compra no fue registrada."
    );
  }

  if (
    profile.favoriteCategories?.[0]?.name !==
    "TECNOLOGÍA"
  ) {
    throw new Error(
      "La categoría favorita no fue calculada."
    );
  }

  if (
    profile.favoriteBrands?.[0]?.name !==
    "ASUS"
  ) {
    throw new Error(
      "La marca favorita no fue calculada."
    );
  }

  const insights =
    await getBuyerInsights({
      userId: user.id
    });

  if (
    insights.topCategory?.name !==
    "TECNOLOGÍA"
  ) {
    throw new Error(
      "LUNA no recibió la categoría principal."
    );
  }

  if (insights.topBrand?.name !== "ASUS") {
    throw new Error(
      "LUNA no recibió la marca principal."
    );
  }

  console.log("");
  console.log(
    "PERFIL INTELIGENTE VALIDADO EN SUPABASE"
  );

  console.log({
    categoria: insights.topCategory,
    marca: insights.topBrand,
    rangoPrecio: insights.priceRange,
    actividad: insights.activity
  });

  await resetBuyerProfile({
    userId: user.id
  });

  console.log("");
  console.log(
    "FASE 5.1.8 COMPLETADA CORRECTAMENTE"
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
