"use strict";

/* QSM_FASE5_4_BLOCK3_MARKET_PRICE_TEST */

const prisma = require("../src/utils/prisma");

const {
  analyzeProductMarketPrice,
  scanMarketPriceOpportunities
} = require(
  "../src/services/luna-market-price.service"
);

async function main() {
  const product =
    await prisma.product.findFirst({
      where: {
        status: "ACTIVE",
        price: {
          gt: 0
        }
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
      "No existe un producto activo con precio para la prueba."
    );
  }

  console.log(
    `Producto: ${product.title} (ID ${product.id})`
  );

  const analysis =
    await analyzeProductMarketPrice({
      productId: product.id
    });

  if (
    analysis.productId !== product.id
  ) {
    throw new Error(
      "El análisis no reconoció el producto."
    );
  }

  if (
    !analysis.classification ||
    !analysis.classification.code
  ) {
    throw new Error(
      "La clasificación de precio no fue generada."
    );
  }

  if (
    !analysis.market ||
    !Number.isFinite(
      Number(
        analysis.market.comparableProducts
      )
    )
  ) {
    throw new Error(
      "Las estadísticas de mercado no son válidas."
    );
  }

  const opportunities =
    await scanMarketPriceOpportunities({
      filters: {
        limit: 10
      }
    });

  if (
    !Array.isArray(
      opportunities.goodDeals
    )
  ) {
    throw new Error(
      "La lista de ofertas no es válida."
    );
  }

  if (
    !Array.isArray(
      opportunities.expensiveProducts
    )
  ) {
    throw new Error(
      "La lista de productos elevados no es válida."
    );
  }

  if (
    !Array.isArray(
      opportunities.bestOpportunities
    )
  ) {
    throw new Error(
      "El ranking de oportunidades no es válido."
    );
  }

  const savedProduct =
    await prisma.product.findUnique({
      where: {
        id: product.id
      },
      select: {
        aiAnalysis: true
      }
    });

  const savedAnalysis =
    savedProduct?.aiAnalysis
      ?.marketPriceAnalysis;

  if (
    !savedAnalysis ||
    savedAnalysis.productId !== product.id
  ) {
    throw new Error(
      "El análisis de precio no quedó guardado en Supabase."
    );
  }

  console.log("");
  console.log(
    "ANÁLISIS DE PRECIO VALIDADO EN SUPABASE"
  );

  console.log({
    producto:
      analysis.title,
    precioActual:
      analysis.currentPrice,
    precioMedio:
      analysis.market.medianPrice,
    comparables:
      analysis.market.comparableProducts,
    clasificacion:
      analysis.classification.label,
    ofertas:
      opportunities.goodDeals.length,
    preciosElevados:
      opportunities.expensiveProducts.length,
    oportunidades:
      opportunities.bestOpportunities.length
  });

  console.log("");
  console.log(
    "FASE 5.4 COMPLETADA CORRECTAMENTE"
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
