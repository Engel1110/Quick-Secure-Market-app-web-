"use strict";

/* QSM_FASE5_9_BLOCK1_MARKETPLACE_ORCHESTRATOR */

const {
  getBuyerInsights
} = require("./luna-buyer-profile.service");

const {
  getSellerProfile,
  generateSellerRecommendations
} = require("./luna-seller-profile.service");

const {
  getSavedProductScore,
  getPersonalizedProductRecommendations,
  compareProductAlternatives
} = require("./luna-product-score.service");

const {
  analyzeProductMarketPrice,
  scanMarketPriceOpportunities
} = require("./luna-market-price.service");

const {
  analyzeRealTransactionRisk
} = require("./luna-transaction-risk.service");

const {
  analyzeListingDraft,
  improveListingDraft
} = require("./luna-listing-assistant.service");

const {
  buildPrivateContextualResponse
} = require(
  "./luna-conversation-intelligence.service"
);

const {
  analyzePurchaseDecision,
  analyzeRealPurchaseDecision
} = require("./luna-purchase-assistant.service");

function normalizeAction(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function requireUserId(userId) {
  const id = Number(userId);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Se requiere un usuario autenticado."
    );
  }

  return id;
}

function requireProductId(productId) {
  const id = Number(productId);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      "Se requiere un producto válido."
    );
  }

  return id;
}

async function executeMarketplaceAction({
  action,
  userId,
  payload = {}
}) {
  const normalizedAction =
    normalizeAction(action);

  const numericUserId =
    requireUserId(userId);

  switch (normalizedAction) {
    case "BUYER_PROFILE":
      return getBuyerInsights({
        userId: numericUserId
      });

    case "SELLER_PROFILE":
      return getSellerProfile({
        userId: numericUserId
      });

    case "SELLER_RECOMMENDATIONS":
      return generateSellerRecommendations({
        userId: numericUserId
      });

    case "PRODUCT_SCORE":
      return getSavedProductScore({
        productId:
          requireProductId(
            payload.productId
          )
      });

    case "PRODUCT_RECOMMENDATIONS":
      return getPersonalizedProductRecommendations({
        userId:
          numericUserId,
        filters:
          payload.filters ||
          payload
      });

    case "COMPARE_PRODUCTS":
      return compareProductAlternatives({
        userId:
          numericUserId,
        productId:
          requireProductId(
            payload.productId
          ),
        limit:
          payload.limit || 5
      });

    case "MARKET_PRICE":
      return analyzeProductMarketPrice({
        productId:
          requireProductId(
            payload.productId
          )
      });

    case "MARKET_OPPORTUNITIES":
      return scanMarketPriceOpportunities({
        filters:
          payload.filters ||
          payload
      });

    case "TRANSACTION_RISK":
      return analyzeRealTransactionRisk({
        buyerId:
          numericUserId,
        productId:
          requireProductId(
            payload.productId
          ),
        transaction:
          payload.transaction || {},
        messages:
          Array.isArray(
            payload.messages
          )
            ? payload.messages
            : []
      });

    case "LISTING_ANALYZE":
      return analyzeListingDraft(
        payload.product ||
        payload
      );

    case "LISTING_IMPROVE":
      return improveListingDraft(
        payload.product ||
        payload
      );

    case "CONVERSATION":
      return buildPrivateContextualResponse({
        message:
          payload.message || "",
        userId:
          numericUserId,
        productId:
          payload.productId || null,
        page:
          payload.page ||
          "MARKETPLACE"
      });

    case "PURCHASE_ANALYZE":
      return analyzePurchaseDecision({
        userId:
          numericUserId,
        productId:
          requireProductId(
            payload.productId
          )
      });

    case "PURCHASE_COMPLETE":
      return analyzeRealPurchaseDecision({
        userId:
          numericUserId,
        productId:
          requireProductId(
            payload.productId
          ),
        transaction:
          payload.transaction || {},
        messages:
          Array.isArray(
            payload.messages
          )
            ? payload.messages
            : []
      });

    default:
      throw new Error(
        `Acción de Marketplace no reconocida: ${
          normalizedAction || "VACÍA"
        }`
      );
  }
}

function getMarketplaceCapabilities() {
  return {
    assistant: "LUNA",
    phase: "5.9",
    actions: [
      "BUYER_PROFILE",
      "SELLER_PROFILE",
      "SELLER_RECOMMENDATIONS",
      "PRODUCT_SCORE",
      "PRODUCT_RECOMMENDATIONS",
      "COMPARE_PRODUCTS",
      "MARKET_PRICE",
      "MARKET_OPPORTUNITIES",
      "TRANSACTION_RISK",
      "LISTING_ANALYZE",
      "LISTING_IMPROVE",
      "CONVERSATION",
      "PURCHASE_ANALYZE",
      "PURCHASE_COMPLETE"
    ],
    version:
      "QSM-LUNA-MARKETPLACE-ORCHESTRATOR-1.0"
  };
}

/* QSM_FASE5_9_BLOCK2_MARKETPLACE_BUNDLE */

async function executeSafeMarketplaceAction({
  action,
  userId,
  payload = {}
}) {
  try {
    const result =
      await executeMarketplaceAction({
        action,
        userId,
        payload
      });

    return {
      success: true,
      action,
      result,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      action,
      result: null,
      error:
        error.message ||
        "No se pudo completar la acción."
    };
  }
}

async function buildMarketplaceBundle({
  userId,
  productId = null,
  includePurchaseAnalysis = true
}) {
  const numericUserId =
    requireUserId(userId);

  const numericProductId =
    productId
      ? requireProductId(productId)
      : null;

  const tasks = [
    executeSafeMarketplaceAction({
      action: "BUYER_PROFILE",
      userId: numericUserId
    }),

    executeSafeMarketplaceAction({
      action: "SELLER_PROFILE",
      userId: numericUserId
    }),

    executeSafeMarketplaceAction({
      action: "SELLER_RECOMMENDATIONS",
      userId: numericUserId
    }),

    executeSafeMarketplaceAction({
      action: "PRODUCT_RECOMMENDATIONS",
      userId: numericUserId,
      payload: {
        limit: 5
      }
    }),

    executeSafeMarketplaceAction({
      action: "MARKET_OPPORTUNITIES",
      userId: numericUserId,
      payload: {
        limit: 5
      }
    })
  ];

  if (numericProductId) {
    tasks.push(
      executeSafeMarketplaceAction({
        action: "PRODUCT_SCORE",
        userId: numericUserId,
        payload: {
          productId:
            numericProductId
        }
      }),

      executeSafeMarketplaceAction({
        action: "MARKET_PRICE",
        userId: numericUserId,
        payload: {
          productId:
            numericProductId
        }
      }),

      executeSafeMarketplaceAction({
        action: "COMPARE_PRODUCTS",
        userId: numericUserId,
        payload: {
          productId:
            numericProductId,
          limit: 5
        }
      })
    );

    if (includePurchaseAnalysis) {
      tasks.push(
        executeSafeMarketplaceAction({
          action: "PURCHASE_ANALYZE",
          userId: numericUserId,
          payload: {
            productId:
              numericProductId
          }
        })
      );
    }
  }

  const results =
    await Promise.all(tasks);

  const sections =
    Object.fromEntries(
      results.map((item) => [
        item.action,
        item
      ])
    );

  const successful =
    results.filter(
      (item) => item.success
    );

  const failed =
    results.filter(
      (item) => !item.success
    );

  const productScore =
    sections.PRODUCT_SCORE
      ?.result
      ?.score ?? null;

  const purchaseDecision =
    sections.PURCHASE_ANALYZE
      ?.result
      ?.decision ?? null;

  const recommendationCount =
    sections.PRODUCT_RECOMMENDATIONS
      ?.result
      ?.recommendations
      ?.length ?? 0;

  const opportunityCount =
    sections.MARKET_OPPORTUNITIES
      ?.result
      ?.bestOpportunities
      ?.length ?? 0;

  return {
    assistant: "LUNA",
    phase: "5.9",
    userId:
      numericUserId,
    productId:
      numericProductId,
    status:
      failed.length === 0
        ? "COMPLETE"
        : successful.length > 0
          ? "PARTIAL"
          : "FAILED",
    summary: {
      totalActions:
        results.length,
      successfulActions:
        successful.length,
      failedActions:
        failed.length,
      recommendationCount,
      opportunityCount,
      productScore,
      purchaseDecision
    },
    sections,
    errors:
      failed.map((item) => ({
        action:
          item.action,
        message:
          item.error
      })),
    generatedAt:
      new Date().toISOString(),
    version:
      "QSM-LUNA-MARKETPLACE-BUNDLE-1.0"
  };
}

module.exports = {
  executeMarketplaceAction,
  getMarketplaceCapabilities,
  buildMarketplaceBundle
};
