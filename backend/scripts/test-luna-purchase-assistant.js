"use strict";

/* QSM_FASE5_8_BLOCK3_PURCHASE_ASSISTANT_TEST */

const prisma = require("../src/utils/prisma");

const {
  analyzePurchaseDecision,
  analyzeRealPurchaseDecision,
  getPurchaseDecisionHistory
} = require(
  "../src/services/luna-purchase-assistant.service"
);

async function main() {
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
    `Comprador: ${buyer.email} (ID ${buyer.id})`
  );

  console.log(
    `Producto: ${product.title} (ID ${product.id})`
  );

  /* ANÁLISIS BASE */

  const baseDecision =
    await analyzePurchaseDecision({
      userId: buyer.id,
      productId: product.id
    });

  if (
    !Number.isFinite(
      Number(baseDecision.purchaseScore)
    )
  ) {
    throw new Error(
      "El análisis base no generó un puntaje válido."
    );
  }

  if (
    !baseDecision.decision ||
    !baseDecision.decision.code
  ) {
    throw new Error(
      "El análisis base no generó una decisión."
    );
  }

  if (
    baseDecision.purchaseScore < 0 ||
    baseDecision.purchaseScore > 100
  ) {
    throw new Error(
      "El puntaje base está fuera del rango permitido."
    );
  }

  /* ANÁLISIS COMPLETO REAL */

  const realDecision =
    await analyzeRealPurchaseDecision({
      userId: buyer.id,
      productId: product.id,
      transaction: {
        amount:
          Number(product.price || 0),
        failedPayments: 0,
        notes:
          "Compra académica simulada procesada dentro de QSM."
      },
      messages: [
        {
          content:
            "Realizaremos la comunicación y el proceso dentro de QSM."
        }
      ]
    });

  if (
    realDecision.buyerId !== buyer.id
  ) {
    throw new Error(
      "La decisión real no reconoció al comprador."
    );
  }

  if (
    realDecision.product?.id !==
    product.id
  ) {
    throw new Error(
      "La decisión real no reconoció el producto."
    );
  }

  if (
    realDecision.saved !== true ||
    !realDecision.decisionId
  ) {
    throw new Error(
      "La decisión real no fue guardada en Supabase."
    );
  }

  if (
    !Number.isFinite(
      Number(realDecision.purchaseScore)
    )
  ) {
    throw new Error(
      "La decisión real no generó un puntaje válido."
    );
  }

  if (
    !realDecision.transactionRisk ||
    !realDecision.transactionRisk.decision
  ) {
    throw new Error(
      "El control antifraude no fue integrado."
    );
  }

  if (
    !realDecision.comparison ||
    !Array.isArray(
      realDecision.comparison.alternatives
    )
  ) {
    throw new Error(
      "La comparación de alternativas no fue integrada."
    );
  }

  if (
    !Array.isArray(realDecision.actions) ||
    realDecision.actions.length === 0
  ) {
    throw new Error(
      "LUNA no generó acciones para la compra."
    );
  }

  /* HISTORIAL EN SUPABASE */

  const history =
    await getPurchaseDecisionHistory({
      userId: buyer.id
    });

  if (
    !Array.isArray(history.history) ||
    history.history.length === 0
  ) {
    throw new Error(
      "El historial de decisiones está vacío."
    );
  }

  const savedDecision =
    history.history.find(
      (item) =>
        item.id ===
        realDecision.decisionId
    );

  if (!savedDecision) {
    throw new Error(
      "La decisión no aparece en el historial."
    );
  }

  console.log("");
  console.log(
    "ASISTENTE DE COMPRA VALIDADO EN SUPABASE"
  );

  console.log({
    analisisBase: {
      puntaje:
        baseDecision.purchaseScore,
      decision:
        baseDecision.decision.label
    },

    analisisCompleto: {
      puntaje:
        realDecision.purchaseScore,
      decision:
        realDecision.decision.label,
      puedeContinuar:
        realDecision.canContinue,
      revisionManual:
        realDecision.requiresManualReview,
      guardado:
        realDecision.saved
    },

    antifraude: {
      riesgo:
        realDecision.transactionRisk
          .riskScore,
      decision:
        realDecision.transactionRisk
          .decision
    },

    comparacion: {
      alternativas:
        realDecision.comparison
          .alternatives.length,
      mejoresAlternativas:
        realDecision.comparison
          .betterAlternatives
    },

    acciones:
      realDecision.actions,

    historial:
      history.total
  });

  console.log("");
  console.log(
    "FASE 5.8 COMPLETADA CORRECTAMENTE"
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
