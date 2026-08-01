const express = require("express");

const router = express.Router();

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const {
  auditMutations
} = require(
  "../middleware/audit-action.middleware"
);

const {
  listDeliveries,
  getDelivery,
  getDeliveryStatistics,
  createDeliveryFromOrder,
  startDelivery,
  confirmDeliveryWithPin,
  markDeliveryFailed
} = require(
  "../controllers/delivery.controller"
);

router.use(authMiddleware);

router.use(
  auditMutations("DELIVERY")
);

router.get(
  "/",
  listDeliveries
);

router.get(
  "/statistics",
  getDeliveryStatistics
);

router.post(
  "/orders/:orderId",
  createDeliveryFromOrder
);

router.patch(
  "/:deliveryId/start",
  startDelivery
);

router.patch(
  "/:deliveryId/confirm-pin",
  confirmDeliveryWithPin
);

router.patch(
  "/:deliveryId/fail",
  markDeliveryFailed
);

router.get(
  "/:deliveryId",
  getDelivery
);

module.exports = router;
