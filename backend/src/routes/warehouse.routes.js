const express = require("express");
const router = express.Router();

const {
  auditMutations
} = require(
  "../middleware/audit-action.middleware"
);

const authMiddleware = require("../middleware/auth.middleware");

const {
  listWarehouseItems,
  getWarehouseItem,
  getWarehouseStatistics,
  getWarehouseTimeline,
  getRecentActivity,
  getWarehouseKpis
} = require("../controllers/warehouse.controller");

/*
|--------------------------------------------------------------------------
| Rutas temporales compatibles con el esquema Warehouse actual
|--------------------------------------------------------------------------
| El módulo avanzado se reactivará cuando sus modelos Prisma sean migrados.
|--------------------------------------------------------------------------
*/

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

router.get(
  "/:warehouseItemId/timeline",
  getWarehouseTimeline
);

router.get(
  "/:warehouseItemId",
  getWarehouseItem
);

module.exports = router;
