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
/* QSM_FASE5_1_1_BUYER_PROFILE */
const {
  getBuyerProfile,
  resetBuyerProfile,
  recordBuyerSearch,
  recordViewedProduct,
  setFavoriteProduct,
  recordPurchasedProduct,
  calculateBuyerPreferences,
  getBuyerInsights
} = require("../services/luna-buyer-profile.service");
/* QSM_FASE5_2_1_SELLER_PROFILE */
const {
  getSellerProfile,
  resetSellerProfile,
  recordPublishedProduct,
  recordCompletedSale,
  recordSellerResponse,
  calculateSellerReputation,
  calculateSellerSpecialties,
  generateSellerRecommendations
} = require("../services/luna-seller-profile.service");
/* QSM_FASE5_3_BLOCK1_PRODUCT_SCORE */
const {
  calculateAndSaveProductScore,
  getSavedProductScore,
  getPersonalizedProductRecommendations,
  compareProductAlternatives
} = require("../services/luna-product-score.service");
/* QSM_FASE5_4_BLOCK1_FAIR_PRICE */
const {
  analyzeProductMarketPrice,
  scanMarketPriceOpportunities
} = require("../services/luna-market-price.service");
/* QSM_FASE5_5_BLOCK1_LISTING_ASSISTANT */
const {
  analyzeListingDraft,
  improveListingDraft
} = require("../services/luna-listing-assistant.service");
/* QSM_FASE5_6_BLOCK1_PREVENTIVE_FRAUD */
const {
  analyzeTransactionRisk,
  analyzeRealTransactionRisk,
  getTransactionRiskHistory
} = require("../services/luna-transaction-risk.service");
/* QSM_FASE5_7_BLOCK1_CONVERSATION_INTELLIGENCE */
const {
  buildConversationResponse,
  buildPrivateContextualResponse
} = require("../services/luna-conversation-intelligence.service");
/* QSM_FASE5_8_BLOCK1_PURCHASE_ASSISTANT */
const {
  analyzePurchaseDecision,
  analyzeRealPurchaseDecision,
  getPurchaseDecisionHistory
} = require("../services/luna-purchase-assistant.service");
/* QSM_FASE5_9_BLOCK1_MARKETPLACE_ORCHESTRATOR */
const {
  executeMarketplaceAction,
  getMarketplaceCapabilities,
  buildMarketplaceBundle
} = require("../services/luna-marketplace-orchestrator.service");
/* QSM_FASE6_BLOCK1_OPERATIONAL_INTELLIGENCE */
const {
  analyzeOperationalQueue,
  generateOperationalPlan,
  getOperationalCapabilities,
  analyzeRealOperations,
  getOperationalHistory
} = require("../services/luna-operational-intelligence.service");
/* QSM_FASE7_BLOCK1_INTELLIGENT_DIALOGUE */
const {
  processDialogue,
  getDialogueCapabilities,
  processRealDialogue,
  getRealDialogueSession
} = require("../services/luna-dialogue-engine.service");
/* QSM_FASE8_BLOCK1_PREDICTIVE_INTELLIGENCE */
const {
  predictSaleProbability,
  predictDemand,
  predictOperationalRisk,
  generatePredictiveSummary,
  getPredictiveCapabilities,
  generateRealPredictiveSummary,
  getPredictiveHistory
} = require("../services/luna-predictive-intelligence.service");
/* QSM_FASE9_BLOCK1_LUNA_PREMIUM */
const {
  getPremiumAccount,
  activatePremiumPlan,
  consumePremiumUsage,
  getPremiumCapabilities,
  checkPremiumAccess,
  executePremiumAction,
  getPremiumDashboard,
  deactivatePremiumPlan
} = require("../services/luna-premium.service");

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

async function getAiBuyerProfile(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const userId =
      user.id ||
      user.userId ||
      null;

    const profile =
      await getBuyerProfile({
        userId
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo cargar el perfil del comprador."
    });
  }
}

async function resetAiBuyerProfile(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const userId =
      user.id ||
      user.userId ||
      null;

    const profile =
      await resetBuyerProfile({
        userId
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo reiniciar el perfil del comprador."
    });
  }
}
async function recordAiBuyerSearch(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await recordBuyerSearch({
        userId:
          user.id ||
          user.userId ||
          null,
        search: req.body || {}
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      search: result.search,
      profile: result.profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo registrar la búsqueda."
    });
  }
}
async function recordAiViewedProduct(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await recordViewedProduct({
        userId:
          user.id ||
          user.userId ||
          null,
        product: req.body || {}
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      product: result.product,
      profile: result.profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo registrar el producto visto."
    });
  }
}
async function updateAiBuyerFavorite(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await setFavoriteProduct({
        userId: user.id || user.userId || null,
        product: req.body?.product || req.body || {},
        favorite: req.body?.favorite !== false
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      favorite: result.favorite,
      product: result.product,
      profile: result.profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo actualizar el favorito."
    });
  }
}
async function recordAiBuyerPurchase(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await recordPurchasedProduct({
        userId:
          user.id ||
          user.userId ||
          null,
        purchase: req.body || {}
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      purchase: result.purchase,
      profile: result.profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo registrar la compra."
    });
  }
}
async function calculateAiBuyerPreferences(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const profile =
      await calculateBuyerPreferences({
        userId:
          user.id ||
          user.userId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudieron calcular las preferencias."
    });
  }
}
async function getAiBuyerInsights(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const insights =
      await getBuyerInsights({
        userId:
          user.id ||
          user.userId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      insights
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo generar el perfil inteligente."
    });
  }
}
async function getAiSellerProfile(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const profile =
      await getSellerProfile({
        userId:
          user.id ||
          user.userId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo cargar el perfil del vendedor."
    });
  }
}

async function resetAiSellerProfile(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const profile =
      await resetSellerProfile({
        userId:
          user.id ||
          user.userId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo reiniciar el perfil del vendedor."
    });
  }
}
async function recordAiSellerPublication(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await recordPublishedProduct({
        userId:
          user.id ||
          user.userId ||
          null,
        product:
          req.body?.product ||
          req.body ||
          {}
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      product: result.product,
      profile: result.profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo registrar la publicación."
    });
  }
}
async function recordAiSellerSale(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await recordCompletedSale({
        userId:
          user.id ||
          user.userId ||
          null,
        sale:
          req.body?.sale ||
          req.body ||
          {}
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      sale: result.sale,
      profile: result.profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo registrar la venta."
    });
  }
}
async function recordAiSellerResponse(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await recordSellerResponse({
        userId:
          user.id ||
          user.userId ||
          null,
        metric:
          req.body || {}
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      metric: result.metric,
      profile: result.profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo registrar el tiempo de respuesta."
    });
  }
}
async function calculateAiSellerReputation(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const profile =
      await calculateSellerReputation({
        userId:
          user.id ||
          user.userId ||
          null,
        metrics:
          req.body || {}
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      reputation: profile.reputation,
      commercialProfile:
        profile.commercialProfile,
      profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo calcular la reputación."
    });
  }
}
async function calculateAiSellerSpecialties(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const profile =
      await calculateSellerSpecialties({
        userId:
          user.id ||
          user.userId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      dominantCategories:
        profile.dominantCategories,
      dominantBrands:
        profile.dominantBrands,
      profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudieron calcular las especialidades."
    });
  }
}
async function generateAiSellerRecommendations(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const profile =
      await generateSellerRecommendations({
        userId:
          user.id ||
          user.userId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      recommendations:
        profile.recommendations || [],
      profile
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudieron generar las recomendaciones."
    });
  }
}
async function calculateAiProductScore(req, res) {
  try {
    const result =
      await calculateAndSaveProductScore({
        productId:
          req.body?.productId ||
          req.params?.productId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo calcular el score del producto."
    });
  }
}

async function getAiProductScore(req, res) {
  try {
    const result =
      await getSavedProductScore({
        productId:
          req.params?.productId
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo consultar el score del producto."
    });
  }
}
async function getAiProductRecommendations(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await getPersonalizedProductRecommendations({
        userId:
          user.id ||
          user.userId ||
          null,
        filters: {
          ...(req.query || {}),
          ...(req.body || {})
        }
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.recommendations.length > 0
          ? "Revisé las opciones disponibles y organicé las que más te convienen."
          : "No encontré productos que coincidan con esos criterios.",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudieron generar las recomendaciones."
    });
  }
}
async function compareAiProductAlternatives(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await compareProductAlternatives({
        productId:
          req.params?.productId ||
          req.body?.productId,
        userId:
          user.id ||
          user.userId ||
          null,
        limit:
          req.query?.limit ||
          req.body?.limit ||
          5
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.recommendation,
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudieron comparar los productos."
    });
  }
}
async function analyzeAiProductMarketPrice(req, res) {
  try {
    const result =
      await analyzeProductMarketPrice({
        productId:
          req.params?.productId ||
          req.body?.productId
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.explanation,
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo analizar el precio del producto."
    });
  }
}
async function getAiMarketOpportunities(req, res) {
  try {
    const result =
      await scanMarketPriceOpportunities({
        filters: {
          ...(req.query || {}),
          ...(req.body || {})
        }
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.goodDeals.length > 0
          ? "Encontré ofertas que podrían ayudarte a ahorrar."
          : "No encontré ofertas destacadas con esos criterios.",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudieron analizar las oportunidades."
    });
  }
}
async function analyzeAiListingDraft(req, res) {
  try {
    const result =
      analyzeListingDraft(
        req.body?.product ||
        req.body ||
        {}
      );

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.canPublish
          ? "Tu publicación tiene la información mínima necesaria."
          : "Encontré algunos puntos que debes corregir antes de publicar.",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo analizar la publicación."
    });
  }
}
async function improveAiListingDraft(req, res) {
  try {
    const result =
      improveListingDraft(
        req.body?.product ||
        req.body ||
        {}
      );

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.message,
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo mejorar la publicación."
    });
  }
}
async function analyzeAiTransactionRisk(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.auth ||
      {};

    const result =
      analyzeTransactionRisk({
        ...(req.body || {}),
        buyer: {
          ...(req.body?.buyer || {}),
          id:
            req.body?.buyer?.id ||
            user.id ||
            user.userId ||
            null
        }
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.decision === "BLOCK"
          ? "La operación fue bloqueada preventivamente."
          : result.decision === "MANUAL_REVIEW"
            ? "La operación necesita revisión manual."
            : result.decision === "WARN"
              ? "Detecté señales que debes revisar antes de continuar."
              : "La operación puede continuar.",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo analizar el riesgo de la operación."
    });
  }
}
async function analyzeAiRealTransactionRisk(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.auth ||
      {};

    const result =
      await analyzeRealTransactionRisk({
        buyerId:
          user.id ||
          user.userId ||
          req.body?.buyerId,
        productId:
          req.body?.productId,
        transaction:
          req.body?.transaction ||
          {},
        messages:
          Array.isArray(
            req.body?.messages
          )
            ? req.body.messages
            : []
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.decision === "BLOCK"
          ? "La operación fue bloqueada preventivamente."
          : result.decision === "MANUAL_REVIEW"
            ? "La operación fue enviada a revisión manual."
            : result.decision === "WARN"
              ? "Detecté señales de riesgo antes de continuar."
              : "La operación superó el análisis preventivo.",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo analizar la operación real."
    });
  }
}

async function getAiTransactionRiskHistory(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.auth ||
      {};

    const result =
      await getTransactionRiskHistory({
        userId:
          user.id ||
          user.userId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo consultar el historial de riesgo."
    });
  }
}
async function getPublicAiConversation(req, res) {
  try {
    const result =
      buildConversationResponse({
        message:
          req.body?.message ||
          "",
        authenticated: false,
        context: {
          page:
            req.body?.page ||
            "PUBLIC"
        }
      });

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo procesar la conversación."
    });
  }
}

async function getPrivateAiConversation(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      buildConversationResponse({
        message:
          req.body?.message ||
          "",
        authenticated: true,
        user,
        context:
          req.body?.context ||
          {}
      });

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo procesar la conversación privada."
    });
  }
}
async function getContextualAiConversation(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const userId =
      user.id ||
      user.userId ||
      null;

    const result =
      await buildPrivateContextualResponse({
        message:
          req.body?.message ||
          "",
        userId,
        productId:
          req.body?.productId ||
          req.body?.context?.productId ||
          null,
        page:
          req.body?.page ||
          req.body?.context?.page ||
          "GENERAL"
      });

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo cargar el contexto de LUNA."
    });
  }
}
async function analyzeAiPurchaseDecision(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await analyzePurchaseDecision({
        userId:
          user.id ||
          user.userId ||
          null,
        productId:
          req.body?.productId ||
          req.params?.productId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.message,
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo analizar la decisión de compra."
    });
  }
}
async function analyzeAiRealPurchaseDecision(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await analyzeRealPurchaseDecision({
        userId:
          user.id ||
          user.userId ||
          null,
        productId:
          req.body?.productId ||
          req.params?.productId ||
          null,
        transaction:
          req.body?.transaction ||
          {},
        messages:
          Array.isArray(
            req.body?.messages
          )
            ? req.body.messages
            : []
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.message,
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo completar el análisis de compra."
    });
  }
}

async function getAiPurchaseDecisionHistory(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await getPurchaseDecisionHistory({
        userId:
          user.id ||
          user.userId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo consultar el historial de decisiones."
    });
  }
}
async function executeAiMarketplaceAction(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await executeMarketplaceAction({
        action:
          req.body?.action,
        userId:
          user.id ||
          user.userId ||
          null,
        payload:
          req.body?.payload ||
          {}
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      action:
        req.body?.action,
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo ejecutar la acción de Marketplace."
    });
  }
}

async function getAiMarketplaceCapabilities(req, res) {
  return res.json({
    success: true,
    ...getMarketplaceCapabilities()
  });
}
/* QSM_FASE5_9_BLOCK2_MARKETPLACE_BUNDLE */
async function getAiMarketplaceBundle(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await buildMarketplaceBundle({
        userId:
          user.id ||
          user.userId ||
          null,
        productId:
          req.body?.productId ||
          req.query?.productId ||
          null,
        includePurchaseAnalysis:
          req.body
            ?.includePurchaseAnalysis !==
          false
      });

    return res.json({
      success:
        result.status !== "FAILED",
      assistant: "LUNA",
      message:
        result.status === "COMPLETE"
          ? "El análisis inteligente del Marketplace fue completado."
          : result.status === "PARTIAL"
            ? "El análisis fue completado parcialmente."
            : "No fue posible completar el análisis.",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo generar el análisis del Marketplace."
    });
  }
}
async function analyzeAiOperationalQueue(req, res) {
  try {
    const result =
      analyzeOperationalQueue({
        items:
          req.body?.items || []
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo analizar la operación."
    });
  }
}

async function generateAiOperationalPlan(req, res) {
  try {
    const result =
      generateOperationalPlan({
        items:
          req.body?.items || []
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.summary,
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo generar el plan operacional."
    });
  }
}

async function getAiOperationalCapabilities(req, res) {
  return res.json({
    success: true,
    ...getOperationalCapabilities()
  });
}
/* QSM_FASE6_BLOCK2_REAL_OPERATIONS */

async function analyzeAiRealOperations(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await analyzeRealOperations({
        userId:
          user.id ||
          user.userId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.summary,
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo analizar la operación real."
    });
  }
}

async function getAiOperationalHistory(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await getOperationalHistory({
        userId:
          user.id ||
          user.userId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo consultar el historial operacional."
    });
  }
}
async function processPublicAiDialogue(req, res) {
  try {
    const result =
      processDialogue({
        message:
          req.body?.message || "",
        authenticated: false,
        context:
          req.body?.context || {},
        history:
          req.body?.history || []
      });

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo procesar la conversación pública."
    });
  }
}

async function processPrivateAiDialogue(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      processDialogue({
        message:
          req.body?.message || "",
        authenticated: true,
        user,
        context:
          req.body?.context || {},
        history:
          req.body?.history || []
      });

    return res.json({
      success: true,
      ...result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo procesar la conversación privada."
    });
  }
}

async function getAiDialogueCapabilities(req, res) {
  return res.json({
    success: true,
    ...getDialogueCapabilities()
  });
}
/* QSM_FASE7_BLOCK2_REAL_DIALOGUE_CONTEXT */

async function processRealAiDialogue(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await processRealDialogue({
        userId:
          user.id ||
          user.userId ||
          null,
        sessionId:
          req.body?.sessionId ||
          null,
        message:
          req.body?.message ||
          "",
        context:
          req.body?.context ||
          {}
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo procesar la conversación contextual."
    });
  }
}

async function getRealAiDialogueSession(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await getRealDialogueSession({
        userId:
          user.id ||
          user.userId ||
          null,
        sessionId:
          req.params?.sessionId
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo consultar la sesión."
    });
  }
}
async function predictAiProductSale(req, res) {
  try {
    const result =
      predictSaleProbability({
        product:
          req.body?.product || {},
        seller:
          req.body?.seller || {},
        market:
          req.body?.market || {}
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo predecir la probabilidad de venta."
    });
  }
}

async function predictAiDemand(req, res) {
  try {
    const result =
      predictDemand({
        history:
          req.body?.history || [],
        currentActivity:
          req.body?.currentActivity ||
          {}
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo predecir la demanda."
    });
  }
}

async function predictAiOperationalRisk(req, res) {
  try {
    const result =
      predictOperationalRisk({
        history:
          req.body?.history || [],
        current:
          req.body?.current || {}
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo predecir el riesgo operacional."
    });
  }
}

async function getAiPredictiveSummary(req, res) {
  try {
    const result =
      generatePredictiveSummary({
        sales:
          req.body?.sales || {},
        demand:
          req.body?.demand || {},
        operations:
          req.body?.operations || {}
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo generar el resumen predictivo."
    });
  }
}

async function getAiPredictiveCapabilities(req, res) {
  return res.json({
    success: true,
    ...getPredictiveCapabilities()
  });
}
/* QSM_FASE8_BLOCK2_REAL_PREDICTIONS */

async function generateAiRealPrediction(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await generateRealPredictiveSummary({
        userId:
          user.id ||
          user.userId ||
          null,
        productId:
          req.body?.productId ||
          req.params?.productId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.message,
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo generar la predicción real."
    });
  }
}

async function getAiPredictiveHistory(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await getPredictiveHistory({
        userId:
          user.id ||
          user.userId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo consultar el historial predictivo."
    });
  }
}
async function getAiPremiumAccount(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await getPremiumAccount({
        userId:
          user.id ||
          user.userId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo consultar LUNA Premium."
    });
  }
}

async function activateAiPremiumPlan(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await activatePremiumPlan({
        userId:
          user.id ||
          user.userId ||
          null,
        plan:
          req.body?.plan ||
          "PREMIUM",
        durationDays:
          req.body?.durationDays ||
          30
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.message,
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo activar el plan."
    });
  }
}

async function consumeAiPremiumUsage(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await consumePremiumUsage({
        userId:
          user.id ||
          user.userId ||
          null,
        action:
          req.body?.action
      });

    return res
      .status(
        result.allowed
          ? 200
          : 429
      )
      .json({
        success:
          result.allowed,
        assistant: "LUNA",
        result
      });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo registrar el uso de LUNA."
    });
  }
}

async function getAiPremiumCapabilities(req, res) {
  return res.json({
    success: true,
    ...getPremiumCapabilities()
  });
}
/* QSM_FASE9_BLOCK2_PREMIUM_INTEGRATION */

async function checkAiPremiumAccess(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await checkPremiumAccess({
        userId:
          user.id ||
          user.userId ||
          null,
        feature:
          req.body?.feature ||
          req.query?.feature ||
          ""
      });

    return res
      .status(
        result.allowed
          ? 200
          : 403
      )
      .json({
        success:
          result.allowed,
        assistant: "LUNA",
        result
      });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo validar el acceso Premium."
    });
  }
}

async function executeAiPremiumAction(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await executePremiumAction({
        userId:
          user.id ||
          user.userId ||
          null,
        action:
          req.body?.action,
        payload:
          req.body?.payload ||
          {}
      });

    return res
      .status(
        result.allowed
          ? 200
          : result.limitReached
            ? 429
            : 403
      )
      .json({
        success:
          result.success,
        assistant: "LUNA",
        message:
          result.message,
        result
      });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo ejecutar la función Premium."
    });
  }
}

async function getAiPremiumDashboard(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await getPremiumDashboard({
        userId:
          user.id ||
          user.userId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.message,
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo cargar el panel Premium."
    });
  }
}

async function deactivateAiPremiumPlan(req, res) {
  try {
    const user =
      req.prismaUser ||
      req.user ||
      req.admin ||
      req.auth ||
      {};

    const result =
      await deactivatePremiumPlan({
        userId:
          user.id ||
          user.userId ||
          null
      });

    return res.json({
      success: true,
      assistant: "LUNA",
      message:
        result.message,
      result
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "No se pudo desactivar LUNA Premium."
    });
  }
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
  updateAiMemoryPreference,
  getAiBuyerProfile,
  resetAiBuyerProfile,
  recordAiBuyerSearch,
  recordAiViewedProduct,
  updateAiBuyerFavorite,
  recordAiBuyerPurchase,
  calculateAiBuyerPreferences,
  getAiBuyerInsights,
  getAiSellerProfile,
  resetAiSellerProfile,
  recordAiSellerPublication,
  recordAiSellerSale,
  recordAiSellerResponse,
  calculateAiSellerReputation,
  calculateAiSellerSpecialties,
  generateAiSellerRecommendations,
  calculateAiProductScore,
  getAiProductScore,
  getAiProductRecommendations,
  compareAiProductAlternatives,
  analyzeAiProductMarketPrice,
  getAiMarketOpportunities,
  analyzeAiListingDraft,
  improveAiListingDraft,
  analyzeAiTransactionRisk,
  analyzeAiRealTransactionRisk,
  getAiTransactionRiskHistory,
  getPublicAiConversation,
  getPrivateAiConversation,
  getContextualAiConversation,
  analyzeAiPurchaseDecision,
  analyzeAiRealPurchaseDecision,
  getAiPurchaseDecisionHistory,
  executeAiMarketplaceAction,
  getAiMarketplaceCapabilities,
  getAiMarketplaceBundle,
  analyzeAiOperationalQueue,
  generateAiOperationalPlan,
  getAiOperationalCapabilities,
  analyzeAiRealOperations,
  getAiOperationalHistory,
  processPublicAiDialogue,
  processPrivateAiDialogue,
  getAiDialogueCapabilities,
  processRealAiDialogue,
  getRealAiDialogueSession,
  predictAiProductSale,
  predictAiDemand,
  predictAiOperationalRisk,
  getAiPredictiveSummary,
  getAiPredictiveCapabilities,
  generateAiRealPrediction,
  getAiPredictiveHistory,
  getAiPremiumAccount,
  activateAiPremiumPlan,
  consumeAiPremiumUsage,
  getAiPremiumCapabilities,
  checkAiPremiumAccess,
  executeAiPremiumAction,
  getAiPremiumDashboard,
  deactivateAiPremiumPlan
};
