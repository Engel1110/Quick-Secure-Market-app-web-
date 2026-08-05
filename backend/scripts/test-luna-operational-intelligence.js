"use strict";

/* QSM_FASE6_BLOCK3_OPERATIONAL_TEST */

const prisma = require("../src/utils/prisma");

const {
  analyzeOperationalQueue,
  generateOperationalPlan,
  getOperationalCapabilities,
  getOperationalDatabaseItems,
  analyzeRealOperations,
  getOperationalHistory
} = require(
  "../src/services/luna-operational-intelligence.service"
);

async function main() {
  /* PRUEBA LOCAL */

  const testItems = [
    {
      id: "TEST-SECURITY-1",
      area: "SEGURIDAD",
      type: "TRANSACTION_RISK",
      title: "Operación bloqueada por riesgo",
      status: "BLOCKED",
      severity: "CRITICAL",
      ageHours: 10
    },
    {
      id: "TEST-FINANCE-1",
      area: "FINANZAS",
      type: "PAYMENT",
      title: "Pago pendiente de validación",
      status: "PENDING",
      severity: "HIGH",
      ageHours: 30
    },
    {
      id: "TEST-WAREHOUSE-1",
      area: "ALMACÉN",
      type: "ORDER",
      title: "Producto pendiente de recepción",
      status: "PENDING",
      severity: "MEDIUM",
      ageHours: 8
    }
  ];

  const localAnalysis =
    analyzeOperationalQueue({
      items: testItems
    });

  if (localAnalysis.total !== 3) {
    throw new Error(
      "El análisis local no procesó todas las tareas."
    );
  }

  if (
    localAnalysis.counters.critical < 1 ||
    localAnalysis.counters.blocked < 1
  ) {
    throw new Error(
      "LUNA no detectó la tarea crítica bloqueada."
    );
  }

  if (
    !Array.isArray(
      localAnalysis.priorityQueue
    ) ||
    localAnalysis.priorityQueue.length !== 3
  ) {
    throw new Error(
      "La cola de prioridad no es válida."
    );
  }

  if (
    localAnalysis.priorityQueue[0]
      .priority.code !== "CRITICAL"
  ) {
    throw new Error(
      "La tarea crítica no fue colocada primero."
    );
  }

  const localPlan =
    generateOperationalPlan({
      items: testItems
    });

  if (
    !Array.isArray(localPlan.plan) ||
    localPlan.plan.length !== 3
  ) {
    throw new Error(
      "El plan operacional no fue generado."
    );
  }

  if (
    localPlan.plan[0].target !==
    "Inmediato"
  ) {
    throw new Error(
      "La tarea crítica no recibió atención inmediata."
    );
  }

  /* CAPACIDADES */

  const capabilities =
    getOperationalCapabilities();

  if (
    capabilities.assistant !== "LUNA" ||
    capabilities.phase !== "6"
  ) {
    throw new Error(
      "Las capacidades operacionales no son válidas."
    );
  }

  if (
    !Array.isArray(
      capabilities.capabilities
    ) ||
    !capabilities.capabilities.includes(
      "PRIORITY_QUEUE"
    ) ||
    !capabilities.capabilities.includes(
      "ACTION_PLAN"
    )
  ) {
    throw new Error(
      "Faltan capacidades operacionales."
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

  console.log(
    `Usuario: ${user.email} (ID ${user.id})`
  );

  /* DATOS REALES */

  const databaseItems =
    await getOperationalDatabaseItems();

  if (!Array.isArray(databaseItems)) {
    throw new Error(
      "Los datos operacionales reales no son válidos."
    );
  }

  const realAnalysis =
    await analyzeRealOperations({
      userId: user.id
    });

  if (
    !Number.isFinite(
      Number(realAnalysis.healthScore)
    )
  ) {
    throw new Error(
      "No se generó un indicador de salud válido."
    );
  }

  if (
    realAnalysis.healthScore < 0 ||
    realAnalysis.healthScore > 100
  ) {
    throw new Error(
      "El indicador de salud está fuera del rango."
    );
  }

  if (
    !Array.isArray(
      realAnalysis.priorityQueue
    ) ||
    !Array.isArray(
      realAnalysis.plan
    )
  ) {
    throw new Error(
      "El análisis real no generó cola y plan."
    );
  }

  if (
    realAnalysis.saved !== true ||
    !realAnalysis.analysisId
  ) {
    throw new Error(
      "El análisis real no fue guardado en Supabase."
    );
  }

  /* HISTORIAL */

  const history =
    await getOperationalHistory({
      userId: user.id
    });

  if (
    !Array.isArray(history.history) ||
    history.history.length === 0
  ) {
    throw new Error(
      "El historial operacional está vacío."
    );
  }

  const savedAnalysis =
    history.history.find(
      (item) =>
        item.id ===
        realAnalysis.analysisId
    );

  if (!savedAnalysis) {
    throw new Error(
      "El análisis no aparece en el historial."
    );
  }

  console.log("");
  console.log(
    "INTELIGENCIA OPERACIONAL VALIDADA EN SUPABASE"
  );

  console.log({
    pruebaLocal: {
      total:
        localAnalysis.total,
      salud:
        localAnalysis.healthScore,
      criticas:
        localAnalysis.counters.critical,
      bloqueadas:
        localAnalysis.counters.blocked
    },

    operacionReal: {
      tareasDetectadas:
        databaseItems.length,
      salud:
        realAnalysis.healthScore,
      estado:
        realAnalysis.healthStatus,
      criticas:
        realAnalysis.counters.critical,
      altas:
        realAnalysis.counters.high,
      bloqueadas:
        realAnalysis.counters.blocked,
      vencidas:
        realAnalysis.counters.overdue,
      guardado:
        realAnalysis.saved
    },

    plan: {
      tareas:
        realAnalysis.plan.length,
      accionesInmediatas:
        realAnalysis.immediateActions.length
    },

    historial:
      history.total
  });

  console.log("");
  console.log(
    "FASE 6 COMPLETADA CORRECTAMENTE"
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
