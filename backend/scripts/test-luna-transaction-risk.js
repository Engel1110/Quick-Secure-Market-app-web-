"use strict";

/* QSM_FASE5_6_BLOCK3_TRANSACTION_RISK_TEST */

const prisma = require("../src/utils/prisma");

const {
  analyzeTransactionRisk,
  analyzeRealTransactionRisk,
  getTransactionRiskHistory
} = require(
  "../src/services/luna-transaction-risk.service"
);

async function main() {
  const safeResult =
    analyzeTransactionRisk({
      buyer: {
        trustScore: 90,
        isVerified: true,
        accountAgeDays: 365,
        recentOrders: 2,
        failedPayments: 0,
        disputes: 0
      },
      seller: {
        trustScore: 92,
        sellerScore: 88,
        isVerified: true,
        verificationStatus: "VERIFIED",
        disputes: 0
      },
      product: {
        price: 25000,
        riskScore: 5,
        description:
          "Producto vendido y pagado dentro de QSM."
      },
      transaction: {
        amount: 25000
      },
      messages: [
        {
          content:
            "Realizaremos todo el proceso dentro de QSM."
        }
      ]
    });

  if (
    safeResult.decision !== "ALLOW"
  ) {
    throw new Error(
      "La operación segura no fue permitida."
    );
  }

  const dangerousResult =
    analyzeTransactionRisk({
      buyer: {
        trustScore: 20,
        isVerified: false,
        accountAgeDays: 2,
        recentOrders: 8,
        failedPayments: 4,
        disputes: 4
      },
      seller: {
        trustScore: 15,
        sellerScore: 20,
        isVerified: false,
        verificationStatus: "PENDING",
        disputes: 5
      },
      product: {
        price: 150000,
        riskScore: 95,
        description:
          "Escríbeme por WhatsApp y paga por transferencia directa."
      },
      transaction: {
        amount: 150000,
        notes:
          "Pago fuera de la plataforma."
      },
      messages: [
        {
          content:
            "Envíame el dinero por WhatsApp."
        }
      ]
    });

  if (
    dangerousResult.decision !== "BLOCK"
  ) {
    throw new Error(
      "La operación peligrosa no fue bloqueada."
    );
  }

  if (
    dangerousResult.riskScore < 80
  ) {
    throw new Error(
      "El riesgo peligroso quedó por debajo del nivel crítico."
    );
  }

  const buyer =
    await prisma.user.findFirst({
      orderBy: {
        id: "asc"
      },
      select: {
        id: true,
        email: true
      }
    });

  if (!buyer) {
    throw new Error(
      "No existe un comprador para la prueba."
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
        sellerId: true,
        price: true
      }
    });

  if (!product) {
    throw new Error(
      "No existe un producto activo para la prueba."
    );
  }

  console.log(
    `Comprador: ${buyer.email} (ID ${buyer.id})`
  );

  console.log(
    `Producto: ${product.title} (ID ${product.id})`
  );

  const realResult =
    await analyzeRealTransactionRisk({
      buyerId: buyer.id,
      productId: product.id,
      transaction: {
        amount:
          Number(product.price || 0),
        failedPayments: 0,
        notes:
          "Operación académica simulada dentro de QSM."
      },
      messages: [
        {
          content:
            "La compra será procesada dentro de QSM."
        }
      ]
    });

  if (
    realResult.buyerId !== buyer.id ||
    realResult.productId !== product.id
  ) {
    throw new Error(
      "El análisis real no reconoció la operación."
    );
  }

  if (
    realResult.saved !== true
  ) {
    throw new Error(
      "El análisis real no fue guardado en Supabase."
    );
  }

  if (
    !Number.isFinite(
      Number(realResult.riskScore)
    )
  ) {
    throw new Error(
      "El análisis real no generó un riesgo válido."
    );
  }

  const history =
    await getTransactionRiskHistory({
      userId: buyer.id
    });

  if (
    !Array.isArray(history.history) ||
    history.history.length === 0
  ) {
    throw new Error(
      "El historial de riesgo está vacío."
    );
  }

  const savedEntry =
    history.history.find(
      (item) =>
        Number(item.productId) ===
          product.id &&
        Number(item.buyerId) ===
          buyer.id
    );

  if (!savedEntry) {
    throw new Error(
      "La operación analizada no aparece en el historial."
    );
  }

  console.log("");
  console.log(
    "ANTIFRAUDE PREVENTIVO VALIDADO EN SUPABASE"
  );

  console.log({
    escenarioSeguro: {
      riesgo:
        safeResult.riskScore,
      decision:
        safeResult.decision
    },
    escenarioPeligroso: {
      riesgo:
        dangerousResult.riskScore,
      decision:
        dangerousResult.decision,
      pagoExterno:
        dangerousResult.factors
          .externalPaymentDetected
    },
    pruebaReal: {
      riesgo:
        realResult.riskScore,
      nivel:
        realResult.riskLevel.label,
      decision:
        realResult.decision,
      guardado:
        realResult.saved
    },
    historial:
      history.total
  });

  console.log("");
  console.log(
    "FASE 5.6 COMPLETADA CORRECTAMENTE"
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
