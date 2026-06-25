const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  faceCheck,
  registerSession,
  getSecurityAlerts
} = require("../controllers/security.controller");

router.post("/face-check", authMiddleware, faceCheck);
router.post("/session", authMiddleware, registerSession);
router.get("/alerts", authMiddleware, getSecurityAlerts);

module.exports = router;