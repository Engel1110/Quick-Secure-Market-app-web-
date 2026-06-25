const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  createProduct,
  getProducts,
  improveProductEvidence
} = require("../controllers/product.controller");

router.get("/", getProducts);

router.post("/", authMiddleware, createProduct);

router.put(
  "/:productId/evidence",
  authMiddleware,
  improveProductEvidence
);

module.exports = router;