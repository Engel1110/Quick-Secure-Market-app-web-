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
  updateAiMemoryPreference
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
