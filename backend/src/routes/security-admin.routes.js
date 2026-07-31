const express = require("express");

const router =
  express.Router();

const {
  auditMutations
} = require(
  "../middleware/audit-action.middleware"
);

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const {
  getSecurityDashboard,
  updateSecurityAlert,
  applySecurityAction
} = require(
  "../controllers/security-admin-prisma.controller"
);

router.use(
  authMiddleware
);

router.use(
  auditMutations("SECURITY")
);

router.get(
  "/dashboard",
  getSecurityDashboard
);

router.patch(
  "/alerts/:alertId",
  updateSecurityAlert
);

router.post(
  "/actions",
  applySecurityAction
);

module.exports = router;