import express from "express";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite
} from "../controllers/favorite.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getFavorites);
router.get("/:productId/check", protect, checkFavorite);
router.post("/:productId", protect, addFavorite);
router.delete("/:productId", protect, removeFavorite);

export default router;
