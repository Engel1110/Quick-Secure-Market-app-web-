const express = require("express");
const router = express.Router();

const {
  auditMutations
} = require(
  "../middleware/audit-action.middleware"
);

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const {
  getModerationDashboard,
  updateModerationReport,
  applyModerationAction
} = require(
  "../controllers/moderation-admin-prisma.controller"
);

router.use(authMiddleware);

router.use(
  auditMutations("MODERATION")
);

router.get(
  "/dashboard",
  getModerationDashboard
);

router.patch(
  "/reports/:reportId",
  updateModerationReport
);

router.post(
  "/actions",
  applyModerationAction
);

module.exports = router;