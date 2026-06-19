const express = require("express");
const {
  createWarehouseRecord,
  updateWarehouseStatus,
  getWarehouseRecords
} = require("../controllers/warehouse.controller");

const { protect, adminOnly } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", protect, adminOnly, createWarehouseRecord);
router.put("/:id", protect, adminOnly, updateWarehouseStatus);
router.get("/", protect, adminOnly, getWarehouseRecords);

module.exports = router;