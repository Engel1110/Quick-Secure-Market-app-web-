const express = require("express");
const {
  createDispute,
  getMyDisputes,
  getAllDisputes,
  resolveDispute
} = require("../controllers/dispute.controller");

const { protect, adminOnly } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", protect, createDispute);
router.get("/my-disputes", protect, getMyDisputes);
router.get("/", protect, adminOnly, getAllDisputes);
router.put("/:id/resolve", protect, adminOnly, resolveDispute);

module.exports = router;