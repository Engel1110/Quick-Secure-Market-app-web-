const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  submitKyc,
  approveKyc,
  rejectKyc
} = require("../controllers/kyc.controller");

router.post("/submit", authMiddleware, submitKyc);
router.put("/admin/:userId/approve", authMiddleware, approveKyc);
router.put("/admin/:userId/reject", authMiddleware, rejectKyc);

module.exports = router;