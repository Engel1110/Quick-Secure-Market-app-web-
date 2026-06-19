const prisma = require("../utils/prisma");

const createReview = async (req, res) => {
  try {
    const { orderId, rating, comment, reviewedId } = req.body;

    if (!orderId || !rating || !reviewedId) {
      return res.status(400).json({
        message: "orderId, rating y reviewedId son obligatorios"
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "La calificación debe estar entre 1 y 5"
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) }
    });

    if (!order) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    if (order.status !== "DELIVERED") {
      return res.status(400).json({
        message: "Solo se puede calificar una orden entregada"
      });
    }

    const isParticipant =
      order.buyerId === req.user.id || order.sellerId === req.user.id;

    if (!isParticipant) {
      return res.status(403).json({
        message: "Solo comprador o vendedor pueden calificar esta orden"
      });
    }

    if (Number(reviewedId) === req.user.id) {
      return res.status(400).json({
        message: "No puedes calificarte a ti mismo"
      });
    }

    const review = await prisma.review.create({
      data: {
        rating: Number(rating),
        comment,
        reviewerId: req.user.id,
        reviewedId: Number(reviewedId)
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            trustScore: true,
            isVerified: true
          }
        },
        reviewed: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            trustScore: true,
            isVerified: true
          }
        }
      }
    });

    const reviewsReceived = await prisma.review.findMany({
      where: { reviewedId: Number(reviewedId) }
    });

    const average =
      reviewsReceived.reduce((sum, item) => sum + item.rating, 0) /
      reviewsReceived.length;

    const newTrustScore = Math.min(100, Math.round(average * 20));

    await prisma.user.update({
      where: { id: Number(reviewedId) },
      data: { trustScore: newTrustScore }
    });

    return res.status(201).json({
      message: "Reseña creada correctamente",
      averageRating: Number(average.toFixed(2)),
      newTrustScore,
      review
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error creando reseña"
    });
  }
};

const getUserReputation = async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isVerified: true,
        trustScore: true,
        status: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const reviews = await prisma.review.findMany({
      where: { reviewedId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isVerified: true,
            trustScore: true
          }
        }
      }
    });

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;

    return res.json({
      user,
      totalReviews: reviews.length,
      averageRating: Number(averageRating.toFixed(2)),
      reviews
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error obteniendo reputación"
    });
  }
};

module.exports = {
  createReview,
  getUserReputation
};