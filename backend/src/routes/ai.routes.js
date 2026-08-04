"use strict";

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");

const {
  getAiStatus,
  previewProductAnalysis,
  normalizeAnalysis
} = require("../controllers/ai.controller");

router.get("/status", getAiStatus);
router.post("/preview/product", authMiddleware, previewProductAnalysis);
router.post("/normalize", authMiddleware, normalizeAnalysis);

module.exports = router;
