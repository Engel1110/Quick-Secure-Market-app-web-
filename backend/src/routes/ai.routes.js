"use strict";

const express = require("express");
/* QSM_FASE17_BLOCK4_REAL_CONTEXT_BRIDGE */

/*
| QSM_FASE17_BLOCK4_FIX_FINAL_CONTEXT_ENGINE
*/

const {
  lunaContextEngine
} = require(
  "../middleware/luna-context-engine.middleware"
);

/*
| QSM_FASE17_BLOCK6_MARKETPLACE_SEARCH
*/

const {
  lunaMarketplaceSearch
} = require(
  "../middleware/luna-marketplace-search.middleware"
);

/*
| QSM_FASE17_BLOCK7_MARKETPLACE_RECOMMENDATION
*/

const {
  lunaMarketplaceRecommendation
} = require(
  "../middleware/luna-marketplace-recommendation.middleware"
);

/*
| QSM_FASE17_BLOCK8_FIX_MARKETPLACE_CONVERSATION
*/

const {
  lunaMarketplaceConversation
} = require(
  "../middleware/luna-marketplace-conversation.middleware"
);

/*
| QSM_FASE17_BLOCK9_SECURITY_PERFORMANCE
*/

const {
  lunaRequestGuard
} = require(
  "../middleware/luna-request-guard.middleware"
);

/*
| QSM_FASE17_BLOCK10_LOCAL_SEMANTIC_CORE
*/

const {
  lunaSemanticContext
} = require(
  "../middleware/luna-semantic-context.middleware"
);

/*
| QSM_FASE17_BLOCK12_LOCAL_CONVERSATION_STATE
*/

const {
  lunaConversationState
} = require(
  "../middleware/luna-conversation-state.middleware"
);

/*
| QSM_FASE17_BLOCK13_LOCAL_GUIDED_MARKETPLACE
*/

const {
  lunaMarketplaceGuide
} = require(
  "../middleware/luna-marketplace-guide.middleware"
);

/*
| QSM_FASE17_BLOCK14_LOCAL_NATURAL_FALLBACK
*/



/*
| QSM_FASE17_BLOCK15_LOCAL_NEUTRAL_COMPARISON
*/

const {
  lunaNeutralComparison
} = require(
  "../middleware/luna-neutral-comparison.middleware"
);

/*
| QSM_FASE17_5_BLOCK_B_CONTEXT_RESOLVER
*/

const {
  lunaContextResolver
} = require(
  "../middleware/luna-context-resolver.middleware"
);

/*
| QSM_FASE17_5_BLOCK_D_MARKETPLACE_FLOW
*/

const {
  lunaMarketplaceConversationFlow
} = require(
  "../middleware/luna-marketplace-conversation-flow.middleware"
);

/*
| QSM_FASE17_5_BLOCK_E_CONTEXTUAL_COMPARISON
*/

const {
  lunaContextualComparison
} = require(
  "../middleware/luna-contextual-comparison.middleware"
);

/*
| QSM_FASE17_5_BLOCK_F_NATURAL_CONTINUATION
*/

const {
  lunaNaturalContinuation
} = require(
  "../middleware/luna-natural-continuation.middleware"
);

/*
| QSM_FASE17_5_BLOCK_C_SEARCH_RESET_RESTORED
*/

const {
  lunaSearchReset
} = require(
  "../middleware/luna-search-reset.middleware"
);

/*
| QSM_FASE17_5_BLOCK_G_DYNAMIC_CONTEXT_RESTORED
*/

const {
  lunaDynamicContext
} = require(
  "../middleware/luna-dynamic-context.middleware"
);

/*
| QSM_FASE17_5_BLOCK_I_SMART_FALLBACK
*/

const {
  lunaSmartFallback
} = require(
  "../middleware/luna-smart-fallback.middleware"
);

const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");

/* QSM_FASE4_1_ACCESS_CONTROL */
const {





































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
} = require("../controllers/ai-access.controller");

const {
  getAiStatus,
  previewProductAnalysis,
  normalizeAnalysis
} = require("../controllers/ai.controller");

router.get("/status", getPublicAiStatus);

router.get(
  "/access/context",
  authMiddleware,
  getAiAccessContext
);

router.post(
  "/access/page-context",
  authMiddleware,
  getAiPageContext
);

router.post(
  "/recommendations/products",
  authMiddleware,
  getProductRecommendations
);

router.post(
  "/memory/message",
  authMiddleware,
  saveAiConversationMessage
);

router.get(
  "/memory/:sessionId",
  authMiddleware,
  getAiConversationMemory
);

router.delete(
  "/memory/:sessionId",
  authMiddleware,
  clearAiConversationMemory
);

router.get(
  "/memory",
  authMiddleware,
  listAiConversationMemories
);

router.delete(
  "/memory",
  authMiddleware,
  clearAllAiConversationMemories
);

router.get(
  "/memory-preference",
  authMiddleware,
  getAiMemoryPreference
);

router.put(
  "/memory-preference",
  authMiddleware,
  updateAiMemoryPreference
);
router.post("/preview/product", authMiddleware, previewProductAnalysis);
router.post("/normalize", authMiddleware, normalizeAnalysis);

module.exports = router;
/* QSM_FASE5_1_1_BUYER_PROFILE */
router.get(
  "/buyer-profile",
  authMiddleware,
  getAiBuyerProfile
);

router.delete(
  "/buyer-profile",
  authMiddleware,
  resetAiBuyerProfile
);
/* QSM_FASE5_1_2_SEARCH_TRACKING */
router.post(
  "/buyer-profile/search",
  authMiddleware,
  recordAiBuyerSearch
);
/* QSM_FASE5_1_3_PRODUCT_VIEWS */
router.post(
  "/buyer-profile/view",
  authMiddleware,
  recordAiViewedProduct
);

/* QSM_FASE5_1_4_FAVORITES */
router.post(
  "/buyer-profile/favorite",
  authMiddleware,
  updateAiBuyerFavorite
);
/* QSM_FASE5_1_5_PURCHASES */
router.post(
  "/buyer-profile/purchase",
  authMiddleware,
  recordAiBuyerPurchase
);
/* QSM_FASE5_1_6_PREFERENCE_CALCULATION */
router.post(
  "/buyer-profile/calculate",
  authMiddleware,
  calculateAiBuyerPreferences
);
/* QSM_FASE5_1_7_BUYER_INSIGHTS */
router.get(
  "/buyer-profile/insights",
  authMiddleware,
  getAiBuyerInsights
);
/* QSM_FASE5_2_1_SELLER_PROFILE */
router.get(
  "/seller-profile",
  authMiddleware,
  getAiSellerProfile
);

router.delete(
  "/seller-profile",
  authMiddleware,
  resetAiSellerProfile
);
/* QSM_FASE5_2_2_PUBLICATIONS */
router.post(
  "/seller-profile/publication",
  authMiddleware,
  recordAiSellerPublication
);
/* QSM_FASE5_2_3_COMPLETED_SALES */
router.post(
  "/seller-profile/sale",
  authMiddleware,
  recordAiSellerSale
);
/* QSM_FASE5_2_4_RESPONSE_TIME */
router.post(
  "/seller-profile/response",
  authMiddleware,
  recordAiSellerResponse
);
/* QSM_FASE5_2_5_SELLER_REPUTATION */
router.post(
  "/seller-profile/reputation",
  authMiddleware,
  calculateAiSellerReputation
);
/* QSM_FASE5_2_6_DOMINANT_CATEGORIES */
router.post(
  "/seller-profile/specialties",
  authMiddleware,
  calculateAiSellerSpecialties
);
/* QSM_FASE5_2_7_SELLER_RECOMMENDATIONS */
router.get(
  "/seller-profile/recommendations",
  authMiddleware,
  generateAiSellerRecommendations
);
/* QSM_FASE5_3_BLOCK1_PRODUCT_SCORE */
router.post(
  "/product-score",
  authMiddleware,
  calculateAiProductScore
);

router.get(
  "/product-score/:productId",
  authMiddleware,
  getAiProductScore
);
/* QSM_FASE5_3_BLOCK2_PERSONALIZED_RECOMMENDATIONS */
router.post(
  "/product-recommendations",
  authMiddleware,
  getAiProductRecommendations
);
/* QSM_FASE5_3_BLOCK3_PRODUCT_COMPARISON */
router.get(
  "/product-comparison/:productId",
  authMiddleware,
  compareAiProductAlternatives
);
/* QSM_FASE5_4_BLOCK1_FAIR_PRICE */
router.get(
  "/market-price/:productId",
  authMiddleware,
  analyzeAiProductMarketPrice
);
/* QSM_FASE5_4_BLOCK2_MARKET_OPPORTUNITIES */
router.get(
  "/market-opportunities",
  authMiddleware,
  getAiMarketOpportunities
);
/* QSM_FASE5_5_BLOCK1_LISTING_ASSISTANT */
router.post(
  "/listing-assistant/analyze",
  authMiddleware,
  analyzeAiListingDraft
);
/* QSM_FASE5_5_BLOCK2_LISTING_IMPROVEMENT */
router.post(
  "/listing-assistant/improve",
  authMiddleware,
  improveAiListingDraft
);
/* QSM_FASE5_6_BLOCK1_PREVENTIVE_FRAUD */
router.post(
  "/transaction-risk/analyze",
  authMiddleware,
  analyzeAiTransactionRisk
);
/* QSM_FASE5_6_BLOCK2_REAL_RISK */
router.post(
  "/transaction-risk/check",
  authMiddleware,
  analyzeAiRealTransactionRisk
);

router.get(
  "/transaction-risk/history",
  authMiddleware,
  getAiTransactionRiskHistory
);
/* QSM_FASE5_7_BLOCK1_CONVERSATION_INTELLIGENCE */
router.post(
  "/conversation/public",
  getPublicAiConversation
);

router.post(
  "/conversation/private",
  authMiddleware,
  getPrivateAiConversation
);
/* QSM_FASE5_7_BLOCK2_PRIVATE_CONTEXT */
router.post(
  "/conversation/contextual",
  authMiddleware,
  getContextualAiConversation
);
/* QSM_FASE5_8_BLOCK1_PURCHASE_ASSISTANT */
router.post(
  "/purchase-assistant/analyze",
  authMiddleware,
  analyzeAiPurchaseDecision
);
/* QSM_FASE5_8_BLOCK2_REAL_PURCHASE_DECISION */
router.post(
  "/purchase-assistant/check",
  authMiddleware,
  analyzeAiRealPurchaseDecision
);

router.get(
  "/purchase-assistant/history",
  authMiddleware,
  getAiPurchaseDecisionHistory
);
/* QSM_FASE5_9_BLOCK1_MARKETPLACE_ORCHESTRATOR */
router.get(
  "/marketplace/capabilities",
  authMiddleware,
  getAiMarketplaceCapabilities
);

router.post(
  "/marketplace/execute",
  authMiddleware,
  executeAiMarketplaceAction
);
/* QSM_FASE5_9_BLOCK2_MARKETPLACE_BUNDLE */
router.post(
  "/marketplace/bundle",
  authMiddleware,
  getAiMarketplaceBundle
);
/* QSM_FASE6_BLOCK1_OPERATIONAL_INTELLIGENCE */
router.get(
  "/operations/capabilities",
  authMiddleware,
  getAiOperationalCapabilities
);

router.post(
  "/operations/analyze",
  authMiddleware,
  analyzeAiOperationalQueue
);

router.post(
  "/operations/plan",
  authMiddleware,
  generateAiOperationalPlan
);
/* QSM_FASE6_BLOCK2_REAL_OPERATIONS */
router.get(
  "/operations/real",
  authMiddleware,
  analyzeAiRealOperations
);

router.get(
  "/operations/history",
  authMiddleware,
  getAiOperationalHistory
);
/* QSM_FASE7_BLOCK1_INTELLIGENT_DIALOGUE */
router.get(
  "/dialogue/capabilities",
  getAiDialogueCapabilities
);

router.post(
  "/dialogue/public",
  processPublicAiDialogue
);

router.post(
  "/dialogue/private",
  authMiddleware,
  processPrivateAiDialogue
);
/* QSM_FASE7_BLOCK2_REAL_DIALOGUE_CONTEXT */
router.post(
    "/dialogue/contextual",
    authMiddleware,
    /*
      Protección y optimización de LUNA.
    */
    lunaRequestGuard,
    /*
      Interpretación semántica local.
      No responde; enriquece la solicitud.
    */
    lunaSemanticContext,
    /*
      Memoria contextual ligera por usuario.
    */
    lunaConversationState,
    /*
      Bloque C - reinicio inteligente.
    */
    lunaSearchReset,
    /*
      Interpreta mensajes cortos según
      lo que LUNA estaba esperando.
    */
    lunaContextResolver,
    /*
      Bloque G - contexto semántico dinámico.
    */
    lunaDynamicContext,
    /*
      Flujo conversacional Marketplace:
      pregunta solo el próximo dato faltante.
    */
    /*
      Continuación natural de resultados previos.
    */
    lunaNaturalContinuation,

    lunaMarketplaceConversationFlow,
    /*
      Comparaciones contextuales sobre
      los resultados actuales.
    */
    lunaContextualComparison,
    /*
      Marketplace guiado por contexto,
      presupuesto y necesidad.
    */
    /*
      Comparación neutral sobre el contexto Marketplace.
    */
    lunaNeutralComparison,

    lunaMarketplaceGuide,
    /*
      Marketplace se evalúa antes de los
      motores generales de LUNA.
    */
    lunaMarketplaceSearch,
    /*
      Follow-ups, comparación y recomendación.
    */
    lunaMarketplaceRecommendation,
    /*
      Referencias naturales sobre resultados anteriores.
    */
    lunaMarketplaceConversation,

    /*
      Primero intenta responder utilizando
      información REAL de la cuenta.
    */
    lunaContextEngine,

    /*
      Si no corresponde a una intención
      contextual, continúa con el motor
      conversacional general.
    */
    /*
      Última capa local:
      respuesta natural, contextual o aclaración.
    */
    /*
      Bloque I - Smart Fallback contextual.
    */
    lunaSmartFallback,

    processRealAiDialogue
  );

router.get(
  "/dialogue/session/:sessionId",
  authMiddleware,
  getRealAiDialogueSession
);
/* QSM_FASE8_BLOCK1_PREDICTIVE_INTELLIGENCE */
router.get(
  "/predictive/capabilities",
  authMiddleware,
  getAiPredictiveCapabilities
);

router.post(
  "/predictive/sale",
  authMiddleware,
  predictAiProductSale
);

router.post(
  "/predictive/demand",
  authMiddleware,
  predictAiDemand
);

router.post(
  "/predictive/operations",
  authMiddleware,
  predictAiOperationalRisk
);

router.post(
  "/predictive/summary",
  authMiddleware,
  getAiPredictiveSummary
);
/* QSM_FASE8_BLOCK2_REAL_PREDICTIONS */
router.post(
  "/predictive/real",
  authMiddleware,
  generateAiRealPrediction
);

router.get(
  "/predictive/history",
  authMiddleware,
  getAiPredictiveHistory
);
/* QSM_FASE9_BLOCK1_LUNA_PREMIUM */
router.get(
  "/premium/capabilities",
  getAiPremiumCapabilities
);

router.get(
  "/premium/account",
  authMiddleware,
  getAiPremiumAccount
);

router.post(
  "/premium/activate",
  authMiddleware,
  activateAiPremiumPlan
);

router.post(
  "/premium/usage",
  authMiddleware,
  consumeAiPremiumUsage
);
/* QSM_FASE9_BLOCK2_PREMIUM_INTEGRATION */
router.get(
  "/premium/dashboard",
  authMiddleware,
  getAiPremiumDashboard
);

router.post(
  "/premium/check-access",
  authMiddleware,
  checkAiPremiumAccess
);

router.post(
  "/premium/execute",
  authMiddleware,
  executeAiPremiumAction
);

router.post(
  "/premium/deactivate",
  authMiddleware,
  deactivateAiPremiumPlan
);
