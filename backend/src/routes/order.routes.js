const express = require("express");
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  confirmDelivery
} = require("../controllers/order.controller");

const { protect, adminOnly } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", protect, createOrder);
router.get("/my-orders", protect, getMyOrders);
router.get("/", protect, adminOnly, getAllOrders);
router.put("/:id/status", protect, adminOnly, updateOrderStatus);
router.post("/:id/confirm-delivery", protect, confirmDelivery);

module.exports = router;