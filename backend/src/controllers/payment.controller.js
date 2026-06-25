const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const Order = require("../models/Order");

const { createNotification } = require("../services/notification.service");

const allowedPaymentMethods = ["QSM_ESCROW", "CARD", "BANK_TRANSFER", "CASH"];

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const generateTransactionCode = () => {
  return `QSM-PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

const createEscrowPayment = async (req, res) => {
  try {
    const { orderId, method } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId es obligatorio"
      });
    }

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "orderId no es válido"
      });
    }

    if (method && !allowedPaymentMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Método de pago no válido"
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada"
      });
    }

    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Solo el comprador puede iniciar el pago"
      });
    }

    if (order.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Esta orden no está disponible para pago"
      });
    }

    const existingPayment = await Payment.findOne({ order: orderId });

    if (existingPayment) {
      return res.status(400).json({
        success: false,
        message: "Esta orden ya tiene un pago registrado"
      });
    }

    const payment = await Payment.create({
      order: order._id,
      buyer: order.buyer,
      seller: order.seller,
      amount: order.price,
      method: method || "QSM_ESCROW",
      status: "HELD",
      transactionCode: generateTransactionCode(),
      notes: "Pago retenido por Quick Secure Market hasta confirmar entrega."
    });

    order.status = "PAID";
    order.escrowStatus = "HELD";
    await order.save();

    await createNotification(
      order.buyer,
      "PAYMENT_RELEASED",
      "Pago retenido en escrow",
      "Tu pago fue retenido por Quick Secure Market hasta confirmar la entrega."
    );

    await createNotification(
      order.seller,
      "PRODUCT_SOLD",
      "Pago recibido en escrow",
      "El comprador pagó la orden. El dinero queda retenido hasta completar la entrega."
    );

    return res.status(201).json({
      success: true,
      message: "Pago escrow creado correctamente",
      payment,
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creando pago escrow",
      error: error.message
    });
  }
};

const releasePaymentToSeller = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "paymentId no es válido"
      });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Pago no encontrado"
      });
    }

    if (payment.status !== "HELD") {
      return res.status(400).json({
        success: false,
        message: "Este pago no está retenido o ya fue procesado"
      });
    }

    const order = await Order.findById(payment.order);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada"
      });
    }

    payment.status = "RELEASED";
    payment.notes = "Pago liberado al vendedor.";
    await payment.save();

    order.status = "COMPLETED";
    order.escrowStatus = "RELEASED";
    await order.save();

    await createNotification(
      payment.seller,
      "PAYMENT_RELEASED",
      "Pago liberado",
      "Quick Secure Market liberó el pago de esta orden a tu favor."
    );

    await createNotification(
      payment.buyer,
      "ORDER_DELIVERED",
      "Orden completada",
      "La orden fue completada y el pago fue liberado al vendedor."
    );

    return res.json({
      success: true,
      message: "Pago liberado correctamente al vendedor",
      payment,
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error liberando pago",
      error: error.message
    });
  }
};

const refundPaymentToBuyer = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!isValidObjectId(paymentId)) {
      return res.status(400).json({
        success: false,
        message: "paymentId no es válido"
      });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Pago no encontrado"
      });
    }

    if (payment.status !== "HELD") {
      return res.status(400).json({
        success: false,
        message: "Este pago no está retenido o ya fue procesado"
      });
    }

    const order = await Order.findById(payment.order);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada"
      });
    }

    payment.status = "REFUNDED";
    payment.notes = "Pago reembolsado al comprador.";
    await payment.save();

    order.status = "CANCELLED";
    order.escrowStatus = "REFUNDED";
    await order.save();

    await createNotification(
      payment.buyer,
      "DISPUTE_RESOLVED",
      "Pago reembolsado",
      "Quick Secure Market reembolsó el pago de esta orden."
    );

    await createNotification(
      payment.seller,
      "DISPUTE_RESOLVED",
      "Pago reembolsado al comprador",
      "El pago de la orden fue devuelto al comprador."
    );

    return res.json({
      success: true,
      message: "Pago reembolsado correctamente al comprador",
      payment,
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error reembolsando pago",
      error: error.message
    });
  }
};

const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      $or: [{ buyer: req.user._id }, { seller: req.user._id }]
    })
      .populate("order")
      .populate("buyer", "firstName lastName email trustScore isVerified")
      .populate("seller", "firstName lastName email trustScore isVerified")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: "Pagos obtenidos correctamente",
      count: payments.length,
      payments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error obteniendo pagos",
      error: error.message
    });
  }
};

module.exports = {
  createEscrowPayment,
  releasePaymentToSeller,
  refundPaymentToBuyer,
  getMyPayments
};