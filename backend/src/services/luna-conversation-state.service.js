"use strict";

/*
|--------------------------------------------------------------------------
| QSM - LUNA CONVERSATION STATE
|--------------------------------------------------------------------------
| FASE 17 BLOQUE 12 LOCAL
|
| Memoria contextual ligera.
|
| NO almacena el chat completo.
| NO usa Redis.
| NO usa servicios externos.
| NO genera costos.
|
| Mantiene pequeños datos estructurados:
|
| - tema
| - producto/categoría
| - presupuesto
| - necesidad
| - RAM
| - almacenamiento
| - intención anterior
| - dato esperado
|
|--------------------------------------------------------------------------
*/

const VERSION =
  "LUNA-CONVERSATION-STATE-17.12";

const MEMORY_TTL_MS =
  30 * 60 * 1000;

const MAX_USERS =
  500;

const memory =
  new Map();

/* ========================================================================
   ESTADO BASE
======================================================================== */

function createEmptyState({
  userKey,
  sessionId = null
} = {}) {
  const timestamp =
    Date.now();

  return {
    version:
      VERSION,

    userKey:
      String(
        userKey ||
        "anonymous"
      ),

    sessionId:
      sessionId ||
      null,

    topic:
      null,

    subtopic:
      null,

    product: {
      query:
        null,

      category:
        null,

      brand:
        null,

      model:
        null
    },

    preferences: {
      budgetMax:
        null,

      budgetMin:
        null,

      ramGb:
        null,

      storageGb:
        null,

      useCase:
        null,

      condition:
        null
    },

    lastIntent:
      null,

    previousIntent:
      null,

    waitingFor:
      null,

    lastUserMessage:
      null,

    turnCount:
      0,

    createdAt:
      timestamp,

    updatedAt:
      timestamp,

    expiresAt:
      timestamp +
      MEMORY_TTL_MS
  };
}

/* ========================================================================
   LIMPIEZA
======================================================================== */

function cleanupExpired() {
  const current =
    Date.now();

  for (
    const [
      key,
      state
    ]
    of memory.entries()
  ) {
    if (
      !state ||
      state.expiresAt <=
        current
    ) {
      memory.delete(
        key
      );
    }
  }
}

function enforceMemoryLimit() {
  if (
    memory.size <=
    MAX_USERS
  ) {
    return;
  }

  const states =
    Array
      .from(
        memory.entries()
      )
      .sort(
        (
          [, left],
          [, right]
        ) =>
          Number(
            left?.updatedAt ||
            0
          ) -
          Number(
            right?.updatedAt ||
            0
          )
      );

  const excess =
    memory.size -
    MAX_USERS;

  states
    .slice(
      0,
      excess
    )
    .forEach(
      ([key]) =>
        memory.delete(
          key
        )
    );
}

/* ========================================================================
   CLAVE PRIVADA
======================================================================== */

function buildConversationKey({
  userId = null,
  sessionId = null
} = {}) {
  /*
    Usuario autenticado tiene prioridad.

    Esto permite conservar una memoria mínima
    aunque el usuario limpie visualmente el chat
    y el frontend genere otro sessionId.
  */

  if (
    userId !== null &&
    userId !== undefined &&
    String(userId).trim()
  ) {
    return `USER:${String(
      userId
    ).trim()}`;
  }

  if (
    sessionId
  ) {
    return `SESSION:${String(
      sessionId
    ).trim()}`;
  }

  return null;
}

/* ========================================================================
   GET
======================================================================== */

function getConversationState({
  userId = null,
  sessionId = null
} = {}) {
  cleanupExpired();

  const key =
    buildConversationKey({
      userId,
      sessionId
    });

  if (!key) {
    return null;
  }

  const existing =
    memory.get(
      key
    );

  if (!existing) {
    return null;
  }

  if (
    existing.expiresAt <=
    Date.now()
  ) {
    memory.delete(
      key
    );

    return null;
  }

  /*
    Renovar ligeramente TTL por actividad.
  */

  existing.expiresAt =
    Date.now() +
    MEMORY_TTL_MS;

  return structuredClone(
    existing
  );
}

/* ========================================================================
   UPDATE
======================================================================== */

function updateConversationState({
  userId = null,
  sessionId = null,
  patch = {}
} = {}) {
  cleanupExpired();

  const key =
    buildConversationKey({
      userId,
      sessionId
    });

  if (!key) {
    return null;
  }

  const current =
    memory.get(
      key
    ) ||
    createEmptyState({
      userKey:
        key,

      sessionId
    });

  const timestamp =
    Date.now();

  const next = {
    ...current,

    ...patch,

    product: {
      ...current.product,
      ...(
        patch.product ||
        {}
      )
    },

    preferences: {
      ...current.preferences,
      ...(
        patch.preferences ||
        {}
      )
    },

    sessionId:
      sessionId ||
      current.sessionId,

    updatedAt:
      timestamp,

    expiresAt:
      timestamp +
      MEMORY_TTL_MS
  };

  memory.set(
    key,
    next
  );

  enforceMemoryLimit();

  return structuredClone(
    next
  );
}

/* ========================================================================
   CLEAR
======================================================================== */

function clearConversationState({
  userId = null,
  sessionId = null
} = {}) {
  const key =
    buildConversationKey({
      userId,
      sessionId
    });

  if (!key) {
    return false;
  }

  return memory.delete(
    key
  );
}

/* ========================================================================
   RESET TOPIC
======================================================================== */

function resetConversationTopic({
  userId = null,
  sessionId = null
} = {}) {
  const current =
    getConversationState({
      userId,
      sessionId
    });

  if (!current) {
    return null;
  }

  return updateConversationState({
    userId,
    sessionId,

    patch: {
      topic:
        null,

      subtopic:
        null,

      product: {
        query:
          null,

        category:
          null,

        brand:
          null,

        model:
          null
      },

      preferences: {
        budgetMax:
          null,

        budgetMin:
          null,

        ramGb:
          null,

        storageGb:
          null,

        useCase:
          null,

        condition:
          null
      },

      waitingFor:
        null
    }
  });
}

/* ========================================================================
   STATS
======================================================================== */

function getConversationMemoryStats() {
  cleanupExpired();

  return {
    entries:
      memory.size,

    maxEntries:
      MAX_USERS,

    ttlMinutes:
      MEMORY_TTL_MS /
      60000,

    persistent:
      false,

    databaseStorage:
      false,

    externalService:
      false
  };
}

module.exports = {
  VERSION,

  buildConversationKey,

  getConversationState,
  updateConversationState,
  clearConversationState,
  resetConversationTopic,

  getConversationMemoryStats
};
