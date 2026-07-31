const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const {
  createEscrowPayment,
  releasePaymentToSeller,
  refundPaymentToBuyer,
  getMyPayments
} = require("../controllers/payment.controller");

router.post("/escrow", authMiddleware, createEscrowPayment);

router.get("/my-payments", authMiddleware, getMyPayments);

router.put(
  "/:paymentId/release",
  authMiddleware,
  requireRole("SUPER_ADMIN", "SENIOR_ADMIN", "ADMIN"),
  releasePaymentToSeller
);

router.put(
  "/:paymentId/refund",
  authMiddleware,
  requireRole("SUPER_ADMIN", "SENIOR_ADMIN", "ADMIN"),
  refundPaymentToBuyer
);

module.exports = router;
