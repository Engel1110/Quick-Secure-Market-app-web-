"use strict";

const {
  getPersonalityContext
} = require("../services/luna-personality.service");

const {
  getAccessProfile
} = require("../services/luna-access-profile.service");

/* QSM_FASE4_4_PAGE_CONTEXT */
const {
  getPageContext
} = require("../services/luna-context.service");

/* QSM_FASE4_5_RECOMMENDATIONS */
const {
  compareProducts
} = require("../services/luna-recommendation.service");

/* QSM_FASE4_6_MEMORY */
const {
  saveConversationMessage,
  getConversationMemory,
  clearConversationMemory,
  listConversationMemories,
  clearAllConversationMemories,
  getMemoryPreference,
  setMemoryPreference
} = require("../services/luna-memory.service");

function normalizeRole(req) {
  return String(
    req.prismaUser?.role ||
    req.user?.role ||
    req.admin?.role ||
    req.auth?.role ||
    "USER"
  )
    .trim()
    .toUpperCase();
}

function getPublicAiStatus(_req, res) {
  const profile = getAccessProfile({
    authenticated: false,
    role: "VISITOR"
  });

  return res.json({
    success: true,
    status: "ACTIVE",
    assistant: "LUNA",
    authenticated: false,
    ...profile,
    personality: getPersonalityContext({
      accessLevel: profile.accessLevel,
      role: "VISITOR"
    }),
    message:
      "LUNA puede ayudarte a conocer QSM, registrarte, comprar y vender con mayor seguridad."
  });
}

function getAiAccessContext(req, res) {
  const user =
    req.prismaUser ||
    req.user ||
    req.admin ||
    req.auth ||
    {};

  const role = normalizeRole(req);

  const profile = getAccessProfile({
    authenticated: true,
    role
  });

  return res.json({
    success: true,
    authenticated: true,
    assistant: "LUNA",
    ...profile,
    user: {
      id: user.id || user.userId || null,
      role,
      firstName: user.firstName || "",
      lastName: user.lastName || ""
    },
    personality: getPersonalityContext({
      accessLevel: profile.accessLevel,
      firstName: user.firstName || "",
      role
    })
  });
}

function getAiPageContext(req, res) {
  const user =
    req.prismaUser ||
    req.user ||
    req.admin ||
    req.auth ||
    {};

  const role = normalizeRole(req);

  const profile = getAccessProfile({
    authenticated: true,
    role
  });

  const context = getPageContext({
    page: req.body?.page,
    accessLevel: profile.accessLevel,
    role
  });

  return res.json({
    success: true,
    assistant: "LUNA",
    userId: user.id || user.userId || null,
    accessLevel: profile.accessLevel,
    context
  });
}

function getProductRecommendations(req, res) {
  const products =
    Array.isArray(req.body?.products)
      ? req.body.products
      : [];

  if (products.length < 2) {
    return res.status(400).json({
      success: false,
      message:
        "Debes enviar al menos dos productos para compararlos."
    });
  }

  const comparison =
    compareProducts(products);

  return res.json({
    success: true,
    assistant: "LUNA",
    comparison
  });
}

/* QSM_FASE4_7_1_ASYNC_MEMORY */
async function saveAiConversationMessage(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const memory =
      await saveConversationMessage({
        sessionId: req.body?.sessionId,
        userId:
          user.id ||
          user.userId ||
          null,
        message: req.body?.message
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      memory
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo guardar la conversación."
    });
  }
}

async function getAiConversationMemory(req, res) {
  const user =
    req.prismaUser ||
    req.user ||
    req.admin ||
    req.auth ||
    {};

  const memory =
    await getConversationMemory({
      sessionId: req.params?.sessionId,
      userId:
        user.id ||
        user.userId ||
        null
    });

  if (!memory) {
    return res.status(403).json({
      success: false,
      message:
        "No tienes acceso a esta conversación."
    });
  }

  return res.json({
    success: true,
    assistant: "LUNA",
    memory
  });
}

async function clearAiConversationMemory(req, res) {
  const user =
    req.prismaUser ||
    req.user ||
    req.admin ||
    req.auth ||
    {};

  const cleared =
    await clearConversationMemory({
      sessionId: req.params?.sessionId,
      userId:
        user.id ||
        user.userId ||
        null
    });

  return res.json({
    success: true,
    assistant: "LUNA",
    cleared
  });
}

async function listAiConversationMemories(req, res) {
  const user =
    req.prismaUser ||
    req.user ||
    req.admin ||
    req.auth ||
    {};

  const memories =
    await listConversationMemories({
      userId: user.id || user.userId || null
    });

  return res.json({
    success: true,
    assistant: "LUNA",
    total: memories.length,
    memories
  });
}

async function clearAllAiConversationMemories(req, res) {
  const user =
    req.prismaUser ||
    req.user ||
    req.admin ||
    req.auth ||
    {};

  const cleared =
    await clearAllConversationMemories({
      userId: user.id || user.userId || null
    });

  return res.json({
    success: true,
    assistant: "LUNA",
    cleared
  });
}

async function getAiMemoryPreference(req, res) {
  const user =
    req.prismaUser ||
    req.user ||
    req.admin ||
    req.auth ||
    {};

  const enabled =
    await getMemoryPreference({
      userId:
        user.id ||
        user.userId ||
        null
    });

  return res.json({
    success: true,
    assistant: "LUNA",
    memoryEnabled: enabled
  });
}

async function updateAiMemoryPreference(req, res) {
  const user =
    req.prismaUser ||
    req.user ||
    req.admin ||
    req.auth ||
    {};

  const enabled =
    await setMemoryPreference({
      userId:
        user.id ||
        user.userId ||
        null,
      enabled:
        req.body?.enabled !== false
    });

  return res.json({
    success: true,
    assistant: "LUNA",
    memoryEnabled: enabled
  });
}

module.exports = {
  getPublicAiStatus,
  getAiAccessContext,
  getAiPageContext,
  getProductRecommendations,
  saveAiConversationMessage,
  getAiConversationMemory,
  clearAiConversationMemory,
  listAiConversationMemories,
  clearAllAiConversationMemories,
  getAiMemoryPreference,
  updateAiMemoryPreference
};
