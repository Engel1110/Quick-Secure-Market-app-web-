const mongoose = require("mongoose");

const Order = require("../models/Order");
const Product = require("../models/Product");

const { createNotification } = require("../services/notification.service");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const createOrder = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "El productId es obligatorio"
      });
    }

    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "El productId no es válido"
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado"
      });
    }

    if (product.status !== "ACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Este producto no está disponible"
      });
    }

    if (product.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "No puedes comprar tu propio producto"
      });
    }

    const order = await Order.create({
      product: product._id,
      buyer: req.user._id,
      seller: product.seller,
      price: product.price,
      status: "PENDING",
      escrowStatus: "HELD",
      paymentMethod: "QSM_ESCROW"
    });

    product.status = "SOLD";
    await product.save();

    await createNotification(
      product.seller,
      "PRODUCT_SOLD",
      "Producto vendido",
      `Tu producto "${product.title}" fue vendido. El pago queda retenido en escrow hasta completar la entrega.`
    );

    await createNotification(
      req.user._id,
      "PRODUCT_SOLD",
      "Compra creada correctamente",
      `Tu compra de "${product.title}" fue creada. Quick Secure Market retendrá el pago hasta confirmar la entrega.`
    );

    return res.status(201).json({
      success: true,
      message: "Orden creada correctamente",
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creando orden",
      error: error.message
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ buyer: req.user._id }, { seller: req.user._id }]
    })
      .populate("product", "title price category condition images status riskLevel confidenceScore")
      .populate("buyer", "firstName lastName email trustScore isVerified")
      .populate("seller", "firstName lastName email trustScore isVerified")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error obteniendo órdenes",
      error: error.message
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "El id de la orden no es válido"
      });
    }

    const order = await Order.findById(id)
      .populate("product")
      .populate("buyer", "firstName lastName email trustScore isVerified")
      .populate("seller", "firstName lastName email trustScore isVerified");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada"
      });
    }

    const isBuyer = order.buyer._id.toString() === req.user._id.toString();
    const isSeller = order.seller._id.toString() === req.user._id.toString();

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para ver esta orden"
      });
    }

    return res.json({
      success: true,
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error obteniendo orden",
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById
};