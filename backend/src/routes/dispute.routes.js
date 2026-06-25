const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const {
  createDispute,
  getMyDisputes,
  getAllDisputes,
  resolveDispute
} = require("../controllers/dispute.controller");

router.post(
  "/",
  authMiddleware,
  createDispute
);

router.get(
  "/my-disputes",
  authMiddleware,
  getMyDisputes
);

router.get(
  "/admin/all",
  authMiddleware,
  requireRole("ADMIN", "SENIOR_ADMIN", "AUDITOR"),
  getAllDisputes
);

router.put(
  "/admin/:disputeId/resolve",
  authMiddleware,
  requireRole("ADMIN", "SENIOR_ADMIN"),
  resolveDispute
);

module.exports = router;