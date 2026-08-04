"use strict";

const {
  getCapabilities,
  buildAnalysis,
  analyzeProduct,
  MODULES
} = require("../services/qsm-ai-core.service");

const getAiStatus = async (_req, res) => {
  return res.json({
    success: true,
    status: "ACTIVE",
    ...getCapabilities()
  });
};

const previewProductAnalysis = async (req, res) => {
  try {
    const product = req.body?.product && typeof req.body.product === "object"
      ? req.body.product
      : req.body || {};
    const legacyAnalysis = req.body?.legacyAnalysis && typeof req.body.legacyAnalysis === "object"
      ? req.body.legacyAnalysis
      : {};
    const duplicateMatches = Array.isArray(req.body?.duplicateMatches)
      ? req.body.duplicateMatches
      : [];

    return res.json({
      success: true,
      analysis: analyzeProduct({ product, legacyAnalysis, duplicateMatches })
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "No se pudo completar el analisis QSM AI.",
      error: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
};

const normalizeAnalysis = async (req, res) => {
  try {
    return res.json({
      success: true,
      analysis: buildAnalysis({
        module: String(req.body?.module || MODULES.GENERAL).toUpperCase(),
        riskScore: req.body?.riskScore,
        riskLevel: req.body?.riskLevel,
        confidenceScore: req.body?.confidenceScore,
        decision: req.body?.decision,
        reasons: req.body?.reasons,
        recommendations: req.body?.recommendations,
        evidenceRequired: req.body?.evidenceRequired,
        signals: req.body?.signals,
        humanReviewRequired: req.body?.humanReviewRequired,
        source: req.body?.source || "QSM_AI_NORMALIZER",
        metadata: req.body?.metadata
      })
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Analisis invalido."
    });
  }
};

module.exports = {
  getAiStatus,
  previewProductAnalysis,
  normalizeAnalysis
};
