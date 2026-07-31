const { prisma, getRequestUserId, parsePositiveInt } = require("../utils/prismaCompat");
const { createNotification } = require("../services/notification.service");

const ALLOWED_STATUS = ["PENDING", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "FAILED", "RETURNED"];
const generateTrackingCode = () => `QSM-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 90 + 10)}`;

function person(user) {
  return user ? { ...user, _id: String(user.id) } : user;
}

function serialize(shipping) {
  return {
    ...shipping,
    _id: String(shipping.id),
    order: shipping.order ? { ...shipping.order, _id: String(shipping.order.id) } : shipping.orderId,
    product: shipping.product ? { ...shipping.product, _id: String(shipping.product.id) } : shipping.productId,
    buyer: shipping.buyer ? person(shipping.buyer) : shipping.buyerId,
    seller: shipping.seller ? person(shipping.seller) : shipping.sellerId
  };
}

const include = {
  order: true,
  product: { select: { id: true, title: true, price: true, category: true } },
  buyer: { select: { id: true, firstName: true, lastName: true, email: true } },
  seller: { select: { id: true, firstName: true, lastName: true, email: true } }
};

async function createShipping(req, res) {
  try {
    const actorId = await getRequestUserId(req);
    const orderId = parsePositiveInt(req.body?.orderId);
    const deliveryAddress = String(req.body?.deliveryAddress || "").trim();
    if (!orderId || !deliveryAddress) return res.status(400).json({ message: "orderId y deliveryAddress son obligatorios" });

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ message: "Orden no encontrada" });
    if (order.sellerId !== actorId) return res.status(403).json({ message: "Solo el vendedor puede crear el envío" });

    const existing = await prisma.shipping.findUnique({ where: { orderId } });
    if (existing) return res.status(400).json({ message: "Esta orden ya tiene un envío creado" });

    const shipping = await prisma.$transaction(async (tx) => {
      const created = await tx.shipping.create({
        data: {
          orderId,
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          productId: order.productId,
          trackingCode: generateTrackingCode(),
          carrier: String(req.body?.carrier || "QSM Delivery").trim(),
          originAddress: String(req.body?.originAddress || "").trim(),
          deliveryAddress,
          deliveryNotes: String(req.body?.deliveryNotes || "").trim(),
          status: "PENDING"
        }
      });
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "SHIPPED",
          deliveryStatus: "PENDING",
          trackingNumber: created.trackingCode,
          trackingCompany: created.carrier,
          deliveryAddress
        }
      });
      return tx.shipping.findUnique({ where: { id: created.id }, include });
    });

    await createNotification(order.buyerId, "ORDER_SHIPPED", "Orden en proceso de envío", "El vendedor creó el envío de tu producto. Ya puedes consultar el tracking.");
    return res.status(201).json({ message: "Envío creado correctamente", shipping: serialize(shipping) });
  } catch (error) {
    console.error("Error creando envío:", error);
    return res.status(500).json({ message: "Error creando envío", error: error.message });
  }
}

async function updateShippingStatus(req, res) {
  try {
    const id = parsePositiveInt(req.params.shippingId);
    const status = String(req.body?.status || "").toUpperCase();
    if (!id) return res.status(400).json({ message: "Identificador de envío no válido" });
    if (!ALLOWED_STATUS.includes(status)) return res.status(400).json({ message: "Estado de envío no válido" });

    const current = await prisma.shipping.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ message: "Envío no encontrado" });

    const deliveredAt = status === "DELIVERED" ? new Date() : current.deliveredAt;
    const shipping = await prisma.$transaction(async (tx) => {
      await tx.shipping.update({ where: { id }, data: { status, deliveredAt } });
      const orderData = {
        deliveryStatus: status,
        ...(status === "DELIVERED" ? { status: "DELIVERED", deliveredAt } : {})
      };
      await tx.order.update({ where: { id: current.orderId }, data: orderData });
      return tx.shipping.findUnique({ where: { id }, include });
    });

    if (status === "DELIVERED") {
      await Promise.all([
        createNotification(current.buyerId, "ORDER_DELIVERED", "Orden entregada", "Tu orden fue marcada como entregada. Revisa el producto antes de confirmar."),
        createNotification(current.sellerId, "ORDER_DELIVERED", "Producto entregado", "El producto fue marcado como entregado al comprador.")
      ]);
    }
    return res.json({ message: "Estado de envío actualizado correctamente", shipping: serialize(shipping) });
  } catch (error) {
    console.error("Error actualizando envío:", error);
    return res.status(500).json({ message: "Error actualizando envío", error: error.message });
  }
}

async function getMyShippings(req, res) {
  try {
    const userId = await getRequestUserId(req);
    if (!userId) return res.status(401).json({ message: "Usuario no autenticado" });
    const shippings = await prisma.shipping.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      include,
      orderBy: { createdAt: "desc" }
    });
    return res.json({ message: "Envíos obtenidos correctamente", count: shippings.length, shippings: shippings.map(serialize) });
  } catch (error) {
    console.error("Error obteniendo envíos:", error);
    return res.status(500).json({ message: "Error obteniendo envíos", error: error.message });
  }
}

module.exports = { createShipping, updateShippingStatus, getMyShippings };
