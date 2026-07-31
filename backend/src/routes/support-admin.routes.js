const express = require("express");

const router =
  express.Router();

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const {
  auditMutations
} = require(
  "../middleware/audit-action.middleware"
);

const {
  getSupportDashboard,
  createSupportTicket,
  updateSupportTicket,
  addSupportMessage
} = require(
  "../controllers/support-admin-prisma.controller"
);

router.use(
  authMiddleware
);

router.use(
  auditMutations("SUPPORT")
);

router.get(
  "/dashboard",
  getSupportDashboard
);

router.post(
  "/tickets",
  createSupportTicket
);

router.patch(
  "/tickets/:ticketId",
  updateSupportTicket
);

router.post(
  "/tickets/:ticketId/messages",
  addSupportMessage
);

module.exports = router;