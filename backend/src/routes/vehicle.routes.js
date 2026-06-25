const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  createVehicleReport,
  getMyVehicleReports
} = require("../controllers/vehicle.controller");

router.post("/report", authMiddleware, createVehicleReport);
router.get("/my-reports", authMiddleware, getMyVehicleReports);

module.exports = router;