const prisma = require("../utils/prisma");

const explainFraudAlert = async (req, res) => {
  try {
    const { productId, reason, comment } = req.body;

    if (!productId || !reason) {
      return res.status(400).json({
        message: "productId y reason son obligatorios"
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: Number(productId) }
    });

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    if (product.sellerId !== req.user.id && req.user.role !== "ADMIN") {
      return res.status(403).json({
        message: "No tienes permiso para explicar este producto"
      });
    }

    const explanation = await prisma.fraudExplanation.upsert({
      where: { productId: Number(productId) },
      update: {
        reason,
        comment
      },
      create: {
        productId: Number(productId),
        reason,
        comment
      }
    });

    return res.status(201).json({
      message: "Explicación registrada correctamente. QSM revisará el producto.",
      explanation
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error registrando explicación"
    });
  }
};

const getProductFraudInfo = async (req, res) => {
  try {
    const productId = Number(req.params.productId);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        fraudAlerts: true,
        fraudExplanation: true,
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            trustScore: true,
            isVerified: true,
            status: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    return res.json({
      productId: product.id,
      qsmCode: product.qsmCode,
      title: product.title,
      price: product.price,
      condition: product.condition,
      seller: product.seller,
      alerts: product.fraudAlerts,
      explanation: product.fraudExplanation
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error obteniendo información antifraude"
    });
  }
};

module.exports = {
  explainFraudAlert,
  getProductFraudInfo
};