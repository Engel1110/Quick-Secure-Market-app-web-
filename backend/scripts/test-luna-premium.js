"use strict";

/* QSM_FASE9_BLOCK3_PREMIUM_FINAL_TEST */

const prisma = require("../src/utils/prisma");

const {
  getPremiumAccount,
  activatePremiumPlan,
  ensureActivePremiumState,
  hasPremiumFeature,
  consumePremiumUsage,
  getPremiumCapabilities,
  checkPremiumAccess,
  executePremiumAction,
  getPremiumDashboard,
  deactivatePremiumPlan
} = require(
  "../src/services/luna-premium.service"
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

  console.log(
    `Usuario: ${user.email} (ID ${user.id})`
  );

  /* CAPACIDADES */

  const capabilities =
    getPremiumCapabilities();

  if (
    capabilities.assistant !== "LUNA" ||
    capabilities.phase !== "9"
  ) {
    throw new Error(
      "Las capacidades Premium no son válidas."
    );
  }

  if (
    capabilities.academicSimulation !== true ||
    capabilities.realPaymentsEnabled !== false
  ) {
    throw new Error(
      "LUNA Premium no está configurada como simulación académica."
    );
  }

  if (
    !Array.isArray(capabilities.plans) ||
    capabilities.plans.length < 3
  ) {
    throw new Error(
      "No se encontraron todos los planes."
    );
  }

  /* CUENTA INICIAL */

  const initialAccount =
    await getPremiumAccount({
      userId: user.id
    });

  if (
    initialAccount.userId !== user.id ||
    !initialAccount.premium ||
    !initialAccount.usage
  ) {
    throw new Error(
      "La cuenta Premium inicial no es válida."
    );
  }

  const previousPlan =
    initialAccount.premium.plan;

  /* ACTIVACIÓN PREMIUM */

  const activation =
    await activatePremiumPlan({
      userId: user.id,
      plan: "PREMIUM",
      durationDays: 30
    });

  if (
    activation.success !== true ||
    activation.premium.plan !== "PREMIUM"
  ) {
    throw new Error(
      "LUNA Premium no pudo activarse."
    );
  }

  if (
    activation.premium.paymentStatus !==
    "SIMULATED_APPROVED"
  ) {
    throw new Error(
      "La activación no utilizó el pago simulado."
    );
  }

  /* ESTADO ACTIVO */

  const activeAccount =
    await ensureActivePremiumState({
      userId: user.id
    });

  if (
    activeAccount.premium.plan !==
    "PREMIUM"
  ) {
    throw new Error(
      "El plan Premium no permaneció activo."
    );
  }

  /* FUNCIONES PREMIUM */

  const predictiveFeature =
    hasPremiumFeature({
      account: activeAccount,
      feature:
        "PREDICTIVE_INTELLIGENCE"
    });

  const operationalFeature =
    hasPremiumFeature({
      account: activeAccount,
      feature:
        "OPERATIONAL_INTELLIGENCE"
    });

  const reportsFeature =
    hasPremiumFeature({
      account: activeAccount,
      feature:
        "ADVANCED_REPORTS"
    });

  if (
    predictiveFeature !== true ||
    operationalFeature !== true ||
    reportsFeature !== true
  ) {
    throw new Error(
      "El plan Premium no habilitó todas las funciones esperadas."
    );
  }

  /* VALIDACIÓN DE ACCESO */

  const access =
    await checkPremiumAccess({
      userId: user.id,
      feature:
        "PREDICTIVE_INTELLIGENCE"
    });

  if (
    access.allowed !== true ||
    access.plan !== "PREMIUM"
  ) {
    throw new Error(
      "El acceso Premium no fue autorizado."
    );
  }

  /* CONSUMO DE USO */

  const conversationUsage =
    await consumePremiumUsage({
      userId: user.id,
      action: "CONVERSATION"
    });

  const productUsage =
    await consumePremiumUsage({
      userId: user.id,
      action: "PRODUCT_ANALYSIS"
    });

  const predictionUsage =
    await consumePremiumUsage({
      userId: user.id,
      action: "PREDICTION"
    });

  if (
    conversationUsage.allowed !== true ||
    productUsage.allowed !== true ||
    predictionUsage.allowed !== true
  ) {
    throw new Error(
      "No se pudo registrar el consumo Premium."
    );
  }

  /* EJECUCIÓN PREMIUM REAL */

  const operationalReport =
    await executePremiumAction({
      userId: user.id,
      action:
        "OPERATIONAL_REPORT",
      payload: {}
    });

  if (
    operationalReport.success !== true ||
    operationalReport.allowed !== true
  ) {
    throw new Error(
      "El reporte operacional Premium no pudo ejecutarse."
    );
  }

  if (
    !operationalReport.result ||
    !Number.isFinite(
      Number(
        operationalReport.result
          .healthScore
      )
    )
  ) {
    throw new Error(
      "El reporte operacional Premium no devolvió datos válidos."
    );
  }

  /* PANEL PREMIUM */

  const dashboard =
    await getPremiumDashboard({
      userId: user.id
    });

  if (
    dashboard.assistant !== "LUNA" ||
    dashboard.phase !== "9"
  ) {
    throw new Error(
      "El panel Premium no es válido."
    );
  }

  if (
    dashboard.plan.code !==
    "PREMIUM"
  ) {
    throw new Error(
      "El panel no reconoció el plan Premium."
    );
  }

  if (
    dashboard.plan.academicSimulation !==
    true
  ) {
    throw new Error(
      "El panel no identificó la simulación académica."
    );
  }

  if (
    !Array.isArray(
      dashboard.features
    ) ||
    !Array.isArray(
      dashboard.availableActions
    )
  ) {
    throw new Error(
      "El panel Premium está incompleto."
    );
  }

  if (
    Number(
      dashboard.usage
        .conversations.used
    ) < 1 ||
    Number(
      dashboard.usage
        .productAnalyses.used
    ) < 1 ||
    Number(
      dashboard.usage
        .predictions.used
    ) < 1 ||
    Number(
      dashboard.usage
        .operationalReports.used
    ) < 1
  ) {
    throw new Error(
      "El panel no reflejó correctamente el consumo."
    );
  }

  console.log("");
  console.log(
    "LUNA PREMIUM VALIDADA EN SUPABASE"
  );

  console.log({
    plan: {
      codigo:
        dashboard.plan.code,
      nombre:
        dashboard.plan.label,
      estado:
        dashboard.plan.status,
      simulacionAcademica:
        dashboard.plan
          .academicSimulation,
      pago:
        dashboard.plan
          .paymentStatus,
      vencimiento:
        dashboard.plan.expiresAt
    },

    acceso: {
      predicciones:
        predictiveFeature,
      operaciones:
        operationalFeature,
      reportes:
        reportsFeature
    },

    consumo: {
      conversaciones:
        dashboard.usage
          .conversations.used,
      analisisProductos:
        dashboard.usage
          .productAnalyses.used,
      predicciones:
        dashboard.usage
          .predictions.used,
      reportesOperacionales:
        dashboard.usage
          .operationalReports.used
    },

    operacion: {
      salud:
        operationalReport.result
          .healthScore,
      estado:
        operationalReport.result
          .healthStatus,
      tareas:
        operationalReport.result.total,
      guardado:
        operationalReport.result.saved
    }
  });

  /* RESTAURAR PLAN ANTERIOR */

  if (previousPlan === "PREMIUM") {
    await activatePremiumPlan({
      userId: user.id,
      plan: "PREMIUM",
      durationDays: 30
    });
  }
  else if (previousPlan === "ADMIN") {
    await activatePremiumPlan({
      userId: user.id,
      plan: "ADMIN",
      durationDays: 30
    });
  }
  else {
    await deactivatePremiumPlan({
      userId: user.id
    });
  }

  const restoredAccount =
    await getPremiumAccount({
      userId: user.id
    });

  if (
    restoredAccount.premium.plan !==
    previousPlan
  ) {
    throw new Error(
      "No fue posible restaurar el plan anterior."
    );
  }

  console.log("");
  console.log(
    "FASE 9 COMPLETADA CORRECTAMENTE"
  );

  console.log(
    "LUNA AI COMPLETADA CORRECTAMENTE"
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
