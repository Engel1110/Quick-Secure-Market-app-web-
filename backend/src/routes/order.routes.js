const express = require("express");

const router = express.Router();

const authMiddleware = require(
  "../middleware/auth.middleware"
);

const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  confirmReceipt,
  openDispute,
  sendToWarehouse,
  requestVerifiedDelivery
} = require(
  "../controllers/order.controller"
);

/*
|--------------------------------------------------------------------------
| Crear y consultar órdenes
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authMiddleware,
  createOrder
);

router.get(
  "/my-orders",
  authMiddleware,
  getMyOrders
);

/*
|--------------------------------------------------------------------------
| Acciones del comprador o vendedor
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/cancel",
  authMiddleware,
  cancelOrder
);

router.patch(
  "/:id/confirm-receipt",
  authMiddleware,
  confirmReceipt
);

router.post(
  "/:id/dispute",
  authMiddleware,
  openDispute
);

router.patch(
  "/:id/send-to-warehouse",
  authMiddleware,
  sendToWarehouse
);

router.patch(
  "/:id/request-delivery",
  authMiddleware,
  requestVerifiedDelivery
);

/*
|--------------------------------------------------------------------------
| Obtener una orden específica
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  authMiddleware,
  getOrderById
);

module.exports = router;