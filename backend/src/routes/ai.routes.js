"use strict";

const express = require("express");
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
