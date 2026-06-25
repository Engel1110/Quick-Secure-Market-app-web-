const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  createFraudAlertForProduct,
  getFraudAlerts
} = require("../controllers/fraud.controller");

router.post("/analyze-product", authMiddleware, createFraudAlertForProduct);
router.get("/alerts", authMiddleware, getFraudAlerts);

module.exports = router;