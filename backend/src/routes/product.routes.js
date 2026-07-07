const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  createProduct,
  getProducts,
  getMyProducts,
  getProductById,
  improveProductEvidence,
  deleteProduct
} = require("../controllers/product.controller");

// Rutas públicas
router.get("/", getProducts);

// Esta debe ir antes de "/:id"
router.get("/my-products", authMiddleware, getMyProducts);

// Detalle público
router.get("/:id", getProductById);

// Rutas protegidas
router.post("/", authMiddleware, createProduct);
router.put("/:productId/evidence", authMiddleware, improveProductEvidence);
router.delete("/:id", authMiddleware, deleteProduct);

module.exports = router;