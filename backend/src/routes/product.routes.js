const express = require("express");
const {
  createProduct,
  getProducts,
  getProductById,
  getMyProducts,
  updateProduct,
  deleteProduct
} = require("../controllers/product.controller");

const { protect } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/", getProducts);
router.get("/my-products", protect, getMyProducts);
router.get("/:id", getProductById);

router.post("/", protect, createProduct);
router.put("/:id", protect, updateProduct);
router.delete("/:id", protect, deleteProduct);

module.exports = router;