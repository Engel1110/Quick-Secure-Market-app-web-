const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");

const {
  createWarehouseRecord,
  updateWarehouseStatus,
  getWarehouseRecords
} = require("../controllers/warehouse.controller");

router.post(
  "/",
  authMiddleware,
  requireRole("ADMIN", "SENIOR_ADMIN"),
  createWarehouseRecord
);

router.put(
  "/:id",
  authMiddleware,
  requireRole("ADMIN", "SENIOR_ADMIN"),
  updateWarehouseStatus
);

router.get(
  "/",
  authMiddleware,
  requireRole("ADMIN", "SENIOR_ADMIN", "AUDITOR"),
  getWarehouseRecords
);

module.exports = router;