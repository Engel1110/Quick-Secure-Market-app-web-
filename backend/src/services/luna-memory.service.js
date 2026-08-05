"use strict";

/* QSM_FASE4_7_1_PERSISTENT_MEMORY */

const prisma = require("../utils/prisma");

const MAX_MESSAGES = 20;
const MAX_SESSIONS = 10;
const MEMORY_TTL_DAYS = 30;
const MEMORY_KEY = "lunaConversationMemory";
const MEMORY_ENABLED_KEY = "lunaMemoryEnabled";

/* QSM_FASE4_7_3_MEMORY_RETENTION */
function pruneMemories(memories = {}) {
  const expirationTime =
    Date.now() -
    MEMORY_TTL_DAYS * 24 * 60 * 60 * 1000;

  const activeEntries =
    Object.entries(memories)
      .filter(([, memory]) => {
        const updatedAt =
          new Date(
            memory?.updatedAt || 0
          ).getTime();

        return (
          Number.isFinite(updatedAt) &&
          updatedAt >= expirationTime
        );
      })
      .sort(([, first], [, second]) =>
        String(second?.updatedAt || "")
          .localeCompare(
            String(first?.updatedAt || "")
          )
      )
      .slice(0, MAX_SESSIONS);

  return Object.fromEntries(activeEntries);
}

function normalizeSessionId(value) {
  return String(value || "")
    .trim()
    .slice(0, 120);
}

function normalizeMessage(message = {}) {
  const role = String(
    message.role || "USER"
  )
    .trim()
    .toUpperCase();

  return {
    role: ["USER", "LUNA", "SYSTEM"].includes(role)
      ? role
      : "USER",
    content: String(
      message.content || ""
    )
      .trim()
      .slice(0, 4000),
    page: String(
      message.page || "GENERAL"
    )
      .trim()
      .toUpperCase()
      .slice(0, 80),
    createdAt:
      message.createdAt ||
      new Date().toISOString()
  };
}

async function readUserSetting(userId) {
  const setting =
    await prisma.userSetting.findUnique({
      where: {
        userId: Number(userId)
      }
    });

  const data =
    setting?.data &&
    typeof setting.data === "object"
      ? setting.data
      : {};

  return {
    setting,
    data
  };
}

async function writeMemory({
  userId,
  memory
}) {
  const {
    data
  } = await readUserSetting(userId);

  const nextData = {
    ...data,
    [MEMORY_KEY]: memory
  };

  await prisma.userSetting.upsert({
    where: {
      userId: Number(userId)
    },
    update: {
      data: nextData
    },
    create: {
      userId: Number(userId),
      data: nextData
    }
  });

  return memory;
}

async function getConversationMemory({
  sessionId,
  userId
}) {
  const key =
    normalizeSessionId(sessionId);

  if (!key || !userId) {
    return null;
  }

  const {
    data
  } = await readUserSetting(userId);

  const memories =
    data[MEMORY_KEY] &&
    typeof data[MEMORY_KEY] === "object"
      ? data[MEMORY_KEY]
      : {};

  return (
    memories[key] || {
      sessionId: key,
      userId: Number(userId),
      messages: [],
      updatedAt: null
    }
  );
}

async function saveConversationMessage({
  sessionId,
  userId,
  message
}) {
  const memoryEnabled =
    await getMemoryPreference({
      userId
    });

  if (!memoryEnabled) {
    return {
      sessionId:
        normalizeSessionId(sessionId),
      userId: Number(userId),
      messages: [],
      updatedAt: null,
      memoryDisabled: true
    };
  }

  const key =
    normalizeSessionId(sessionId);

  if (!key) {
    throw new Error(
      "Se requiere un sessionId válido."
    );
  }

  if (!userId) {
    throw new Error(
      "Se requiere un usuario autenticado."
    );
  }

  const normalized =
    normalizeMessage(message);

  if (!normalized.content) {
    throw new Error(
      "El mensaje no puede estar vacío."
    );
  }

  const {
    data
  } = await readUserSetting(userId);

  const memories =
    data[MEMORY_KEY] &&
    typeof data[MEMORY_KEY] === "object"
      ? {
          ...data[MEMORY_KEY]
        }
      : {};

  const current =
    memories[key] || {
      sessionId: key,
      userId: Number(userId),
      messages: [],
      updatedAt: null
    };

  current.messages = [
    ...current.messages,
    normalized
  ].slice(-MAX_MESSAGES);

  current.updatedAt =
    new Date().toISOString();

  memories[key] = current;

  const cleanedMemories =
    pruneMemories(memories);

  await writeMemory({
    userId,
    memory: cleanedMemories
  });

  return current;
}

async function clearConversationMemory({
  sessionId,
  userId
}) {
  const memoryEnabled =
    await getMemoryPreference({
      userId
    });

  if (!memoryEnabled) {
    return {
      sessionId:
        normalizeSessionId(sessionId),
      userId: Number(userId),
      messages: [],
      updatedAt: null,
      memoryDisabled: true
    };
  }

  const key =
    normalizeSessionId(sessionId);

  if (!key || !userId) {
    return false;
  }

  const {
    data
  } = await readUserSetting(userId);

  const memories =
    data[MEMORY_KEY] &&
    typeof data[MEMORY_KEY] === "object"
      ? {
          ...data[MEMORY_KEY]
        }
      : {};

  if (!memories[key]) {
    return false;
  }

  delete memories[key];

  await writeMemory({
    userId,
    memory: memories
  });

  return true;
}

/* QSM_FASE4_7_2_MEMORY_MANAGEMENT */

async function listConversationMemories({
  userId
}) {
  if (!userId) {
    return [];
  }

  const { data } =
    await readUserSetting(userId);

  const memories =
    data[MEMORY_KEY] &&
    typeof data[MEMORY_KEY] === "object"
      ? data[MEMORY_KEY]
      : {};

  const cleanedMemories =
    pruneMemories(memories);

  return Object.values(cleanedMemories)
    .map((memory) => ({
      sessionId: memory.sessionId,
      messageCount:
        Array.isArray(memory.messages)
          ? memory.messages.length
          : 0,
      updatedAt: memory.updatedAt || null
    }))
    .sort((a, b) =>
      String(b.updatedAt || "").localeCompare(
        String(a.updatedAt || "")
      )
    );
}

async function clearAllConversationMemories({
  userId
}) {
  if (!userId) {
    return false;
  }

  await writeMemory({
    userId,
    memory: {}
  });

  return true;
}

/* QSM_FASE4_7_4_MEMORY_PREFERENCE */

async function getMemoryPreference({
  userId
}) {
  if (!userId) {
    return false;
  }

  const { data } =
    await readUserSetting(userId);

  return data[MEMORY_ENABLED_KEY] !== false;
}

async function setMemoryPreference({
  userId,
  enabled
}) {
  if (!userId) {
    throw new Error(
      "Se requiere un usuario autenticado."
    );
  }

  const { data } =
    await readUserSetting(userId);

  const nextData = {
    ...data,
    [MEMORY_ENABLED_KEY]:
      Boolean(enabled)
  };

  await prisma.userSetting.upsert({
    where: {
      userId: Number(userId)
    },
    update: {
      data: nextData
    },
    create: {
      userId: Number(userId),
      data: nextData
    }
  });

  if (!enabled) {
    await clearAllConversationMemories({
      userId
    });
  }

  return Boolean(enabled);
}

module.exports = {
  saveConversationMessage,
  getConversationMemory,
  clearConversationMemory,
  listConversationMemories,
  clearAllConversationMemories,
  getMemoryPreference,
  setMemoryPreference
};
