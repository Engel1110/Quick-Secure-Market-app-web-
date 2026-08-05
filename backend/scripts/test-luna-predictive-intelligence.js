"use strict";

/* QSM_FASE8_BLOCK3_PREDICTIVE_TEST */

const prisma = require("../src/utils/prisma");

const {
  calculateTrend,
  predictSaleProbability,
  predictDemand,
  predictOperationalRisk,
  generatePredictiveSummary,
  getPredictiveCapabilities,
  getRealPredictiveData,
  generateRealPredictiveSummary,
  getPredictiveHistory
} = require(
  "../src/services/luna-predictive-intelligence.service"
);

async function main() {
  /* PRUEBAS LOCALES */

  const upwardTrend =
    calculateTrend([
      10,
      15,
      20,
      30
    ]);

  if (upwardTrend.code !== "UP") {
    throw new Error(
      "LUNA no detectó la tendencia ascendente."
    );
  }

  const salePrediction =
    predictSaleProbability({
      product: {
        score: 90,
        riskScore: 5,
        views: 150,
        favorites: 20,
        inquiries: 8,
        price: 45000
      },
      seller: {
        sellerScore: 88,
        trustScore: 90
      },
      market: {
        medianPrice: 50000
      }
    });

  if (
    !Number.isFinite(
      Number(
        salePrediction.probability
      )
    ) ||
    salePrediction.probability < 0 ||
    salePrediction.probability > 100
  ) {
    throw new Error(
      "La probabilidad de venta no es válida."
    );
  }

  if (
    salePrediction.likelyToSell !== true
  ) {
    throw new Error(
      "El escenario favorable no fue reconocido."
    );
  }

  const demandPrediction =
    predictDemand({
      history: [
        {
          sales: 2,
          searches: 20
        },
        {
          sales: 4,
          searches: 35
        },
        {
          sales: 7,
          searches: 70
        }
      ],
      currentActivity: {
        searches: 120,
        favorites: 25
      }
    });

  if (
    !Number.isFinite(
      Number(
        demandPrediction.demandScore
      )
    )
  ) {
    throw new Error(
      "La predicción de demanda no es válida."
    );
  }

  const operationalPrediction =
    predictOperationalRisk({
      history: [
        {
          healthScore: 90
        },
        {
          healthScore: 75
        },
        {
          healthScore: 55
        }
      ],
      current: {
        counters: {
          critical: 2,
          blocked: 2,
          overdue: 3
        }
      }
    });

  if (
    !Number.isFinite(
      Number(
        operationalPrediction.riskScore
      )
    )
  ) {
    throw new Error(
      "La predicción operacional no es válida."
    );
  }

  const localSummary =
    generatePredictiveSummary({
      sales: {
        product: {
          score: 85,
          riskScore: 10,
          views: 90,
          favorites: 12,
          inquiries: 5,
          price: 48000
        },
        seller: {
          sellerScore: 82,
          trustScore: 86
        },
        market: {
          medianPrice: 50000
        }
      },
      demand: {
        history: [
          {
            sales: 3,
            searches: 30
          },
          {
            sales: 5,
            searches: 50
          },
          {
            sales: 8,
            searches: 85
          }
        ],
        currentActivity: {
          searches: 100,
          favorites: 15
        }
      },
      operations: {
        history: [
          {
            healthScore: 80
          },
          {
            healthScore: 85
          }
        ],
        current: {
          counters: {
            critical: 0,
            blocked: 0,
            overdue: 1
          }
        }
      }
    });

  if (
    localSummary.assistant !== "LUNA" ||
    localSummary.phase !== "8" ||
    !Number.isFinite(
      Number(localSummary.globalScore)
    )
  ) {
    throw new Error(
      "El resumen predictivo local no es válido."
    );
  }

  /* CAPACIDADES */

  const capabilities =
    getPredictiveCapabilities();

  if (
    capabilities.assistant !== "LUNA" ||
    capabilities.phase !== "8"
  ) {
    throw new Error(
      "Las capacidades predictivas no son válidas."
    );
  }

  if (
    !Array.isArray(
      capabilities.capabilities
    ) ||
    !capabilities.capabilities.includes(
      "SALE_PROBABILITY"
    ) ||
    !capabilities.capabilities.includes(
      "DEMAND_FORECAST"
    ) ||
    !capabilities.capabilities.includes(
      "OPERATIONAL_RISK_FORECAST"
    )
  ) {
    throw new Error(
      "Faltan capacidades predictivas."
    );
  }

  /* USUARIO Y PRODUCTO REALES */

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
        price: true,
        sellerId: true
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

  /* DATOS REALES */

  const realData =
    await getRealPredictiveData({
      userId:
        user.id,
      productId:
        product.id
    });

  if (
    realData.userId !== user.id ||
    realData.product?.id !==
      product.id
  ) {
    throw new Error(
      "Los datos predictivos reales no reconocieron el usuario o producto."
    );
  }

  if (
    !Array.isArray(
      realData.demand?.history
    ) ||
    !Array.isArray(
      realData.operations?.history
    )
  ) {
    throw new Error(
      "Los historiales predictivos no son válidos."
    );
  }

  /* PREDICCIÓN REAL Y GUARDADO */

  const realPrediction =
    await generateRealPredictiveSummary({
      userId:
        user.id,
      productId:
        product.id
    });

  if (
    realPrediction.assistant !== "LUNA" ||
    realPrediction.phase !== "8"
  ) {
    throw new Error(
      "La predicción real no pertenece a la Fase 8."
    );
  }

  if (
    !Number.isFinite(
      Number(
        realPrediction.globalScore
      )
    ) ||
    realPrediction.globalScore < 0 ||
    realPrediction.globalScore > 100
  ) {
    throw new Error(
      "El indicador predictivo global no es válido."
    );
  }

  if (
    !realPrediction.predictions?.sale ||
    !realPrediction.predictions?.demand ||
    !realPrediction.predictions
      ?.operations
  ) {
    throw new Error(
      "La predicción real está incompleta."
    );
  }

  if (
    realPrediction.saved !== true ||
    !realPrediction.predictionId
  ) {
    throw new Error(
      "La predicción no fue guardada en Supabase."
    );
  }

  /* HISTORIAL */

  const history =
    await getPredictiveHistory({
      userId:
        user.id
    });

  if (
    !Array.isArray(history.history) ||
    history.history.length === 0
  ) {
    throw new Error(
      "El historial predictivo está vacío."
    );
  }

  const savedPrediction =
    history.history.find(
      (item) =>
        item.id ===
        realPrediction.predictionId
    );

  if (!savedPrediction) {
    throw new Error(
      "La predicción no aparece en el historial."
    );
  }

  console.log("");
  console.log(
    "INTELIGENCIA PREDICTIVA VALIDADA EN SUPABASE"
  );

  console.log({
    pruebaLocal: {
      tendencia:
        upwardTrend.label,
      probabilidadVenta:
        salePrediction.probability,
      demanda:
        demandPrediction.demandScore,
      riesgoOperacional:
        operationalPrediction.riskScore,
      indicadorGlobal:
        localSummary.globalScore
    },

    prediccionReal: {
      producto:
        realPrediction.productTitle,
      indicadorGlobal:
        realPrediction.globalScore,
      perspectiva:
        realPrediction.outlook,
      probabilidadVenta:
        realPrediction.predictions
          .sale.probability,
      tiempoEstimado:
        realPrediction.predictions
          .sale.expectedTime,
      demanda:
        realPrediction.predictions
          .demand.demandScore,
      riesgoOperacional:
        realPrediction.predictions
          .operations.riskScore,
      guardada:
        realPrediction.saved
    },

    historial:
      history.total
  });

  console.log("");
  console.log(
    "FASE 8 COMPLETADA CORRECTAMENTE"
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
