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
  listWarehouseItems,
  getWarehouseItem,
  getWarehouseStatistics,
  getWarehouseTimeline,
  getRecentActivity,
  getWarehouseKpis,
  receiveWarehouseItem,
  approveInspection,
  assignLocation,
  markReadyForDelivery
} = require(
  "../controllers/warehouse.controller"
);

router.use(authMiddleware);

router.use(
  auditMutations("WAREHOUSE")
);

router.get(
  "/",
  listWarehouseItems
);

router.get(
  "/statistics",
  getWarehouseStatistics
);

router.get(
  "/recent-activity",
  getRecentActivity
);

router.get(
  "/kpis",
  getWarehouseKpis
);

router.patch(
  "/:warehouseItemId/receive",
  receiveWarehouseItem
);

router.patch(
  "/:warehouseItemId/approve-inspection",
  approveInspection
);

router.patch(
  "/:warehouseItemId/assign-location",
  assignLocation
);

router.patch(
  "/:warehouseItemId/ready-for-delivery",
  markReadyForDelivery
);

router.get(
  "/:warehouseItemId/timeline",
  getWarehouseTimeline
);

router.get(
  "/:warehouseItemId",
  getWarehouseItem
);

module.exports = router;
