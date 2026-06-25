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
  requireRole("ADMIN", "SENIOR_ADMIN"),
  releasePaymentToSeller
);

router.put(
  "/:paymentId/refund",
  authMiddleware,
  requireRole("ADMIN", "SENIOR_ADMIN"),
  refundPaymentToBuyer
);

module.exports = router;