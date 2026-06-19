const prisma = require("../utils/prisma");

const generatePin = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const createOrder = async (req, res) => {
  try {
    const { productId, reserveFee = 0 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "productId es obligatorio" });
    }

    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
      include: { seller: true }
    });

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    if (product.status === "SOLD") {
      return res.status(400).json({ message: "Este producto ya fue vendido" });
    }

    if (product.sellerId === req.user.id) {
      return res.status(400).json({ message: "No puedes comprar tu propio producto" });
    }

    const order = await prisma.order.create({
      data: {
        productId: product.id,
        buyerId: req.user.id,
        sellerId: product.sellerId,
        totalAmount: product.price,
        reserveFee: Number(reserveFee),
        deliveryPin: generatePin(),
        status: "PENDING",
        paymentStatus: "HELD"
      },
      include: {
        product: true,
        buyer: {
          select: { id: true, firstName: true, lastName: true, email: true, trustScore: true, isVerified: true }
        },
        seller: {
          select: { id: true, firstName: true, lastName: true, email: true, trustScore: true, isVerified: true }
        }
      }
    });

    return res.status(201).json({
      message: "Orden creada correctamente. El pago queda retenido por QSM.",
      order
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error creando orden" });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { buyerId: req.user.id },
          { sellerId: req.user.id }
        ]
      },
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        buyer: {
          select: { id: true, firstName: true, lastName: true, email: true, trustScore: true, isVerified: true }
        },
        seller: {
          select: { id: true, firstName: true, lastName: true, email: true, trustScore: true, isVerified: true }
        }
      }
    });

    return res.json({ count: orders.length, orders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error obteniendo órdenes" });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        product: true,
        buyer: true,
        seller: true
      }
    });

    return res.json({ count: orders.length, orders });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error obteniendo órdenes" });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true }
    });

    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    return res.json({
      message: "Estado de orden actualizado",
      order: updatedOrder
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error actualizando orden" });
  }
};

const confirmDelivery = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { pin } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    if (order.buyerId !== req.user.id) {
      return res.status(403).json({ message: "Solo el comprador puede confirmar la entrega" });
    }

    if (order.deliveryPin !== pin) {
      return res.status(400).json({ message: "PIN incorrecto" });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "DELIVERED",
        paymentStatus: "RELEASED"
      }
    });

    await prisma.product.update({
      where: { id: order.productId },
      data: { status: "SOLD" }
    });

    return res.json({
      message: "Entrega confirmada. El dinero fue liberado al vendedor.",
      order: updatedOrder
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error confirmando entrega" });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  confirmDelivery
};