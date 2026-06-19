const prisma = require("../utils/prisma");

const createDispute = async (req, res) => {
  try {
    const { orderId, reason, evidence } = req.body;

    if (!orderId || !reason) {
      return res.status(400).json({
        message: "orderId y reason son obligatorios"
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) }
    });

    if (!order) {
      return res.status(404).json({
        message: "Orden no encontrada"
      });
    }

    if (order.buyerId !== req.user.id && order.sellerId !== req.user.id) {
      return res.status(403).json({
        message: "Solo comprador o vendedor pueden abrir disputa"
      });
    }

    const dispute = await prisma.dispute.create({
      data: {
        orderId: Number(orderId),
        reason,
        resolution: evidence || null,
        status: "OPEN"
      },
      include: {
        order: true
      }
    });

    await prisma.order.update({
      where: { id: Number(orderId) },
      data: {
        status: "DISPUTE",
        paymentStatus: "HELD"
      }
    });

    return res.status(201).json({
      message: "Disputa abierta correctamente. El pago queda retenido hasta revisión QSM.",
      dispute
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error creando disputa"
    });
  }
};

const getMyDisputes = async (req, res) => {
  try {
    const disputes = await prisma.dispute.findMany({
      where: {
        order: {
          OR: [
            { buyerId: req.user.id },
            { sellerId: req.user.id }
          ]
        }
      },
      include: {
        order: {
          include: {
            product: true,
            buyer: true,
            seller: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.json({
      count: disputes.length,
      disputes
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error obteniendo disputas"
    });
  }
};

const getAllDisputes = async (req, res) => {
  try {
    const disputes = await prisma.dispute.findMany({
      include: {
        order: {
          include: {
            product: true,
            buyer: true,
            seller: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.json({
      count: disputes.length,
      disputes
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error obteniendo disputas"
    });
  }
};

const resolveDispute = async (req, res) => {
  try {
    const disputeId = Number(req.params.id);
    const { resolution, action } = req.body;

    if (!resolution || !action) {
      return res.status(400).json({
        message: "resolution y action son obligatorios"
      });
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { order: true }
    });

    if (!dispute) {
      return res.status(404).json({
        message: "Disputa no encontrada"
      });
    }

    let paymentStatus = dispute.order.paymentStatus;
    let orderStatus = "DELIVERED";

    if (action === "REFUND_BUYER") {
      paymentStatus = "REFUNDED";
      orderStatus = "REFUNDED";
    }

    if (action === "RELEASE_TO_SELLER") {
      paymentStatus = "RELEASED";
      orderStatus = "DELIVERED";
    }

    const updatedDispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: "RESOLVED",
        resolution
      },
      include: {
        order: true
      }
    });

    await prisma.order.update({
      where: { id: dispute.orderId },
      data: {
        status: orderStatus,
        paymentStatus
      }
    });

    return res.json({
      message: "Disputa resuelta correctamente",
      action,
      dispute: updatedDispute
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error resolviendo disputa"
    });
  }
};

module.exports = {
  createDispute,
  getMyDisputes,
  getAllDisputes,
  resolveDispute
};