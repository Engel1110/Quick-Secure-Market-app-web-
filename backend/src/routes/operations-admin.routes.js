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
  getWarehouseDashboard,
  getDeliveryDashboard
} = require(
  "../controllers/operations-admin-prisma.controller"
);

const {
  updateWarehouseOrder,
  updateDeliveryOrder
} = require(
  "../controllers/operations-actions-prisma.controller"
);

router.use(authMiddleware);

router.use(
  auditMutations("OPERATIONS")
);

router.get(
  "/warehouse/dashboard",
  getWarehouseDashboard
);

router.patch(
  "/warehouse/orders/:id/action",
  updateWarehouseOrder
);

router.get(
  "/delivery/dashboard",
  getDeliveryDashboard
);

router.patch(
  "/delivery/orders/:id/action",
  updateDeliveryOrder
);

module.exports = router;
