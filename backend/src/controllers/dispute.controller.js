const mongoose = require("mongoose");
const validator = require("validator");

const Dispute = require("../models/Dispute");
const Order = require("../models/Order");
const Payment = require("../models/Payment");

const { createNotification } = require("../services/notification.service");

const allowedActions = ["REFUND_BUYER", "RELEASE_TO_SELLER", "REJECT_DISPUTE"];

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const sanitizeText = (value) => {
  return validator.escape(String(value || "").trim());
};

const createDispute = async (req, res) => {
  try {
    const { orderId, reason, description, evidence } = req.body;

    if (!orderId || !reason || !description) {
      return res.status(400).json({
        success: false,
        message: "orderId, reason y description son obligatorios"
      });
    }

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "orderId no es válido"
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
        message: "Solo el comprador puede abrir una disputa"
      });
    }

    if (order.status === "COMPLETED" || order.escrowStatus === "RELEASED") {
      return res.status(400).json({
        success: false,
        message: "No puedes abrir disputa sobre una orden ya completada"
      });
    }

    if (order.status === "CANCELLED" || order.escrowStatus === "REFUNDED") {
      return res.status(400).json({
        success: false,
        message: "No puedes abrir disputa sobre una orden cancelada o reembolsada"
      });
    }

    const existingDispute = await Dispute.findOne({ order: orderId });

    if (existingDispute) {
      return res.status(400).json({
        success: false,
        message: "Esta orden ya tiene una disputa abierta"
      });
    }

    const safeEvidence = Array.isArray(evidence)
      ? evidence.slice(0, 10).map((item) => sanitizeText(item))
      : [];

    const dispute = await Dispute.create({
      order: order._id,
      buyer: order.buyer,
      seller: order.seller,
      product: order.product,
      reason: sanitizeText(reason),
      description: sanitizeText(description),
      evidence: safeEvidence,
      status: "OPEN"
    });

    order.status = "DISPUTED";
    order.escrowStatus = "HELD";
    await order.save();

    await createNotification(
      order.seller,
      "DISPUTE_OPENED",
      "Disputa abierta",
      "El comprador abrió una disputa en una orden. El pago queda retenido hasta revisión."
    );

    await createNotification(
      order.buyer,
      "DISPUTE_OPENED",
      "Disputa creada correctamente",
      "Tu disputa fue creada y Quick Secure Market revisará el caso."
    );

    return res.status(201).json({
      success: true,
      message:
        "Disputa creada correctamente. El pago queda retenido hasta revisión de Quick Secure Market.",
      dispute
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creando disputa",
      error: error.message
    });
  }
};

const getMyDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find({
      $or: [{ buyer: req.user._id }, { seller: req.user._id }]
    })
      .populate("order")
      .populate("product", "title price category condition")
      .populate("buyer", "firstName lastName email trustScore isVerified")
      .populate("seller", "firstName lastName email trustScore isVerified")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: "Disputas obtenidas correctamente",
      count: disputes.length,
      disputes
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error obteniendo disputas",
      error: error.message
    });
  }
};

const getAllDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find()
      .populate("order")
      .populate("product", "title price category condition")
      .populate("buyer", "firstName lastName email trustScore isVerified")
      .populate("seller", "firstName lastName email trustScore isVerified")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: "Todas las disputas obtenidas correctamente",
      count: disputes.length,
      disputes
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error obteniendo todas las disputas",
      error: error.message
    });
  }
};

const resolveDispute = async (req, res) => {
  try {
    const { disputeId } = req.params;
    const { action, adminNotes } = req.body;

    if (!disputeId || !isValidObjectId(disputeId)) {
      return res.status(400).json({
        success: false,
        message: "disputeId no es válido"
      });
    }

    if (!action || !allowedActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Acción no válida"
      });
    }

    const dispute = await Dispute.findById(disputeId);

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: "Disputa no encontrada"
      });
    }

    if (["RESOLVED", "REFUNDED", "REJECTED"].includes(dispute.status)) {
      return res.status(400).json({
        success: false,
        message: "Esta disputa ya fue resuelta"
      });
    }

    const order = await Order.findById(dispute.order);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Orden relacionada no encontrada"
      });
    }

    if (order.escrowStatus !== "HELD") {
      return res.status(400).json({
        success: false,
        message: "Esta orden no tiene fondos retenidos para resolver"
      });
    }

    const payment = await Payment.findOne({ order: order._id });

    if (action === "REFUND_BUYER") {
      dispute.status = "REFUNDED";
      order.status = "CANCELLED";
      order.escrowStatus = "REFUNDED";

      if (payment && payment.status === "HELD") {
        payment.status = "REFUNDED";
        payment.notes = "Pago reembolsado al comprador por resolución de disputa.";
        await payment.save();
      }

      await createNotification(
        dispute.buyer,
        "DISPUTE_RESOLVED",
        "Disputa resuelta a tu favor",
        "Quick Secure Market aprobó el reembolso de esta orden."
      );

      await createNotification(
        dispute.seller,
        "DISPUTE_RESOLVED",
        "Disputa resuelta",
        "Quick Secure Market resolvió la disputa y aprobó el reembolso al comprador."
      );
    }

    if (action === "RELEASE_TO_SELLER") {
      dispute.status = "RESOLVED";
      order.status = "COMPLETED";
      order.escrowStatus = "RELEASED";

      if (payment && payment.status === "HELD") {
        payment.status = "RELEASED";
        payment.notes = "Pago liberado al vendedor por resolución de disputa.";
        await payment.save();
      }

      await createNotification(
        dispute.seller,
        "PAYMENT_RELEASED",
        "Pago liberado",
        "Quick Secure Market liberó el pago de la orden a tu favor."
      );

      await createNotification(
        dispute.buyer,
        "DISPUTE_RESOLVED",
        "Disputa resuelta",
        "Quick Secure Market resolvió la disputa y liberó el pago al vendedor."
      );
    }

    if (action === "REJECT_DISPUTE") {
      dispute.status = "REJECTED";
      order.status = "COMPLETED";
      order.escrowStatus = "RELEASED";

      if (payment && payment.status === "HELD") {
        payment.status = "RELEASED";
        payment.notes = "Pago liberado al vendedor porque la disputa fue rechazada.";
        await payment.save();
      }

      await createNotification(
        dispute.buyer,
        "DISPUTE_RESOLVED",
        "Disputa rechazada",
        "Quick Secure Market rechazó la disputa después de revisar el caso."
      );

      await createNotification(
        dispute.seller,
        "PAYMENT_RELEASED",
        "Pago liberado",
        "La disputa fue rechazada y el pago fue liberado a tu favor."
      );
    }

    dispute.adminNotes = adminNotes ? sanitizeText(adminNotes) : "";

    await dispute.save();
    await order.save();

    return res.json({
      success: true,
      message: "Disputa resuelta correctamente por el administrador",
      action,
      dispute,
      order,
      payment: payment || null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error resolviendo disputa",
      error: error.message
    });
  }
};

module.exports = {
  createDispute,
  getMyDisputes,
  getAllDisputes,
  resolveDispute
};