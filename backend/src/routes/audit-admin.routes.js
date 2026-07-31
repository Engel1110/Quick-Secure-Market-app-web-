const express = require("express");

const router =
  express.Router();

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const {
  getAuditDashboard,
  exportAuditReport
} = require(
  "../controllers/audit-admin-prisma.controller"
);

router.use(
  authMiddleware
);

router.get(
  "/dashboard",
  getAuditDashboard
);

router.get(
  "/export",
  exportAuditReport
);

module.exports = router;