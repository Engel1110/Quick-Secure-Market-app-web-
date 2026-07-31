const express = require("express");

const router = express.Router();

const {
  auditMutations
} = require(
  "../middleware/audit-action.middleware"
);

const authMiddleware =
  require("../middleware/auth.middleware");

const {
  getFinanceDashboard,
  updateFinanceTransactionStatus
} = require(
  "../controllers/finance-admin-prisma.controller"
);

router.use(authMiddleware);

router.use(
  auditMutations("FINANCE")
);

router.get(
  "/dashboard",
  getFinanceDashboard
);

router.patch(
  "/transactions/:transactionId/status",
  updateFinanceTransactionStatus
);

module.exports = router;
