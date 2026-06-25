const Shipping = require("../models/Shipping");
const Order = require("../models/Order");

const { createNotification } = require("../services/notification.service");

const generateTrackingCode = () => {
  return "QSM-" + Date.now().toString().slice(-8);
};

const createShipping = async (req, res) => {
  try {
    const { orderId, deliveryAddress, originAddress, deliveryNotes, carrier } = req.body;

    if (!orderId || !deliveryAddress) {
      return res.status(400).json({
        message: "orderId y deliveryAddress son obligatorios"
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Orden no encontrada"
      });
    }

    if (order.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Solo el vendedor puede crear el envío"
      });
    }

    const existingShipping = await Shipping.findOne({ order: orderId });

    if (existingShipping) {
      return res.status(400).json({
        message: "Esta orden ya tiene un envío creado"
      });
    }

    const shipping = await Shipping.create({
      order: order._id,
      buyer: order.buyer,
      seller: order.seller,
      product: order.product,
      trackingCode: generateTrackingCode(),
      carrier: carrier || "QSM Delivery",
      originAddress: originAddress || "",
      deliveryAddress,
      deliveryNotes: deliveryNotes || "",
      status: "PENDING"
    });

    order.status = "SHIPPED";
    await order.save();

    await createNotification(
      order.buyer,
      "ORDER_SHIPPED",
      "Orden en proceso de envío",
      "El vendedor creó el envío de tu producto. Ya puedes consultar el tracking."
    );

    res.status(201).json({
      message: "Envío creado correctamente",
      shipping
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creando envío",
      error: error.message
    });
  }
};

const updateShippingStatus = async (req, res) => {
  try {
    const { shippingId } = req.params;
    const { status } = req.body;

    const allowedStatus = [
      "PENDING",
      "PICKED_UP",
      "IN_TRANSIT",
      "DELIVERED",
      "FAILED",
      "RETURNED"
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        message: "Estado de envío no válido"
      });
    }

    const shipping = await Shipping.findById(shippingId);

    if (!shipping) {
      return res.status(404).json({
        message: "Envío no encontrado"
      });
    }

    shipping.status = status;

    if (status === "DELIVERED") {
      shipping.deliveredAt = new Date();

      const order = await Order.findById(shipping.order);

      if (order) {
        order.status = "DELIVERED";
        await order.save();

        await createNotification(
          order.buyer,
          "ORDER_DELIVERED",
          "Orden entregada",
          "Tu orden fue marcada como entregada. Revisa el producto antes de confirmar."
        );

        await createNotification(
          order.seller,
          "ORDER_DELIVERED",
          "Producto entregado",
          "El producto fue marcado como entregado al comprador."
        );
      }
    }

    await shipping.save();

    res.json({
      message: "Estado de envío actualizado correctamente",
      shipping
    });
  } catch (error) {
    res.status(500).json({
      message: "Error actualizando envío",
      error: error.message
    });
  }
};

const getMyShippings = async (req, res) => {
  try {
    const shippings = await Shipping.find({
      $or: [{ buyer: req.user._id }, { seller: req.user._id }]
    })
      .populate("order")
      .populate("product", "title price category")
      .populate("buyer", "firstName lastName email")
      .populate("seller", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json({
      message: "Envíos obtenidos correctamente",
      count: shippings.length,
      shippings
    });
  } catch (error) {
    res.status(500).json({
      message: "Error obteniendo envíos",
      error: error.message
    });
  }
};

module.exports = {
  createShipping,
  updateShippingStatus,
  getMyShippings
};