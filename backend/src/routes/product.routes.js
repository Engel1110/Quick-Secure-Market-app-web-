const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  createProduct,
  getProducts,
  getProductById,
  improveProductEvidence
} = require("../controllers/product.controller");

// Rutas públicas para ver productos
router.get("/", getProducts);
router.get("/:id", getProductById);

// Rutas protegidas
router.post("/", authMiddleware, createProduct);
router.put("/:productId/evidence", authMiddleware, improveProductEvidence);

module.exports = router;