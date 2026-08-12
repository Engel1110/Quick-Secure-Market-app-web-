const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  createFraudAlertForProduct,
  getFraudAlerts
} = require("../controllers/fraud.controller");

router.post("/analyze-product", authMiddleware, createFraudAlertForProduct);
router.get("/alerts", authMiddleware, getFraudAlerts);



/*
|--------------------------------------------------------------------------
| QSM_BLOQUE9_4_FRAUDSHIELD_HISTORY
|--------------------------------------------------------------------------
*/

router.get(
  "/history",
  require("../controllers/fraud.controller")
    .getFraudShieldHistory
);



/*
|--------------------------------------------------------------------------
| QSM_BLOQUE9_5_FRAUD_MANAGE_ROUTE
|--------------------------------------------------------------------------
*/

router.patch(
  "/alerts/:alertId/manage",
  authMiddleware,
  require("../controllers/fraud.controller")
    .manageFraudAlert
);

module.exports = router;