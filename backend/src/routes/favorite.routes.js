const express = require("express");
const favoriteController = require("../controllers/favorite.controller");
const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

const protect = authMiddleware.protect || authMiddleware;

router.get("/", protect, favoriteController.getFavorites);
router.get("/:productId/check", protect, favoriteController.checkFavorite);
router.post("/:productId", protect, favoriteController.addFavorite);
router.delete("/:productId", protect, favoriteController.removeFavorite);

module.exports = router;