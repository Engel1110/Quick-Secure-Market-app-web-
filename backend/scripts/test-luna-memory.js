"use strict";

/* QSM_FASE4_7_5_MEMORY_DATABASE_TEST */

const prisma = require("../src/utils/prisma");

const {
  saveConversationMessage,
  getConversationMemory,
  listConversationMemories,
  clearConversationMemory,
  getMemoryPreference,
  setMemoryPreference
} = require("../src/services/luna-memory.service");

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
      "No existe ningún usuario para ejecutar la prueba."
    );
  }

  const sessionId =
    `QSM-TEST-${Date.now()}`;

  console.log(
    `Usuario de prueba: ${user.email} (ID ${user.id})`
  );

  await setMemoryPreference({
    userId: user.id,
    enabled: true
  });

  const preference =
    await getMemoryPreference({
      userId: user.id
    });

  if (preference !== true) {
    throw new Error(
      "No fue posible activar la memoria."
    );
  }

  await saveConversationMessage({
    sessionId,
    userId: user.id,
    message: {
      role: "USER",
      content:
        "Prueba automática de memoria persistente.",
      page: "GENERAL"
    }
  });

  await saveConversationMessage({
    sessionId,
    userId: user.id,
    message: {
      role: "LUNA",
      content:
        "La memoria persistente funciona correctamente.",
      page: "GENERAL"
    }
  });

  const memory =
    await getConversationMemory({
      sessionId,
      userId: user.id
    });

  if (
    !memory ||
    !Array.isArray(memory.messages) ||
    memory.messages.length !== 2
  ) {
    throw new Error(
      "La memoria no fue guardada correctamente."
    );
  }

  const memories =
    await listConversationMemories({
      userId: user.id
    });

  const exists =
    memories.some(
      (item) =>
        item.sessionId === sessionId &&
        item.messageCount === 2
    );

  if (!exists) {
    throw new Error(
      "La sesión no apareció en el listado."
    );
  }

  const cleared =
    await clearConversationMemory({
      sessionId,
      userId: user.id
    });

  if (!cleared) {
    throw new Error(
      "La memoria de prueba no pudo eliminarse."
    );
  }

  const deletedMemory =
    await getConversationMemory({
      sessionId,
      userId: user.id
    });

  if (
    !deletedMemory ||
    deletedMemory.messages.length !== 0
  ) {
    throw new Error(
      "La memoria de prueba continúa almacenada."
    );
  }

  console.log("");
  console.log(
    "FASE 4.7.5: MEMORIA EN SUPABASE VALIDADA CORRECTAMENTE"
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
