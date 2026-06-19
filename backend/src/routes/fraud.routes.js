const express = require("express");
const {
  explainFraudAlert,
  getProductFraudInfo
} = require("../controllers/fraud.controller");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/explain", protect, explainFraudAlert);
router.get("/product/:productId", getProductFraudInfo);

module.exports = router;