const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  createReview,
  getMyReviews,
  getUserReviews
} = require("../controllers/review.controller");

router.post("/", authMiddleware, createReview);
router.get("/my-reviews", authMiddleware, getMyReviews);
router.get("/user/:userId", authMiddleware, getUserReviews);

module.exports = router;