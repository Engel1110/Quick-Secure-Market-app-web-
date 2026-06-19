const express = require("express");
const {
  createReview,
  getUserReputation
} = require("../controllers/review.controller");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", protect, createReview);
router.get("/user/:userId", getUserReputation);

module.exports = router;