const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  createProduct,
  getProducts,
  getMyProducts,
  getProductById,
  updateProduct,
  improveProductEvidence,
  deleteProduct
} = require("../controllers/product.controller");

/*
|--------------------------------------------------------------------------
| Rutas públicas
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  getProducts
);

/*
|--------------------------------------------------------------------------
| Rutas protegidas específicas
|--------------------------------------------------------------------------
|
| Deben declararse antes de "/:id" para evitar que Express interprete
| "my-products" como un identificador de producto.
|--------------------------------------------------------------------------
*/

router.get(
  "/my-products",
  authMiddleware,
  getMyProducts
);

router.post(
  "/",
  authMiddleware,
  createProduct
);

router.put(
  "/:productId/evidence",
  authMiddleware,
  improveProductEvidence
);

/*
|--------------------------------------------------------------------------
| Detalle, edición y eliminación
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  getProductById
);

router.put(
  "/:id",
  authMiddleware,
  updateProduct
);

router.patch(
  "/:id",
  authMiddleware,
  updateProduct
);

router.delete(
  "/:id",
  authMiddleware,
  deleteProduct
);

module.exports = router;
