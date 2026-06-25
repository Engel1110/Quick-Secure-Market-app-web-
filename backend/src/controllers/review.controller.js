const mongoose = require("mongoose");
const validator = require("validator");

const Review = require("../models/Review");
const Order = require("../models/Order");
const User = require("../models/User");

const { analyzeReview } = require("../services/reviewAI.service");

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const sanitizeText = (value) => {
  return validator.escape(String(value || "").trim());
};

const createReview = async (req, res) => {
  try {
    const { orderId, rating, comment } = req.body;

    if (!orderId || !rating) {
      return res.status(400).json({
        success: false,
        message: "orderId y rating son obligatorios"
      });
    }

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message: "orderId no es válido"
      });
    }

    const numericRating = Number(rating);

    if (
      Number.isNaN(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "El rating debe ser un número entre 1 y 5"
      });
    }

    const safeComment = sanitizeText(comment || "");

    if (safeComment.length > 500) {
      return res.status(400).json({
        success: false,
        message: "El comentario no puede superar los 500 caracteres"
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Orden no encontrada"
      });
    }

    if (
      order.buyer.toString() !== req.user._id.toString() &&
      order.seller.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Solo comprador o vendedor pueden calificar esta orden"
      });
    }

    if (!["DELIVERED", "COMPLETED"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Solo puedes calificar una orden entregada o completada"
      });
    }

    const existingReview = await Review.findOne({
      order: order._id,
      reviewer: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: "Ya calificaste esta orden"
      });
    }

    const reviewedUser =
      order.buyer.toString() === req.user._id.toString()
        ? order.seller
        : order.buyer;

    const analysis = analyzeReview(safeComment);

    const review = await Review.create({
      order: order._id,
      reviewer: req.user._id,
      reviewedUser,
      product: order.product,
      rating: numericRating,
      comment: safeComment,
      sentimentLabel: analysis.sentimentLabel,
      sentimentScore: analysis.sentimentScore
    });

    const userReviews = await Review.find({ reviewedUser });

    const averageRating =
      userReviews.reduce((sum, item) => sum + item.rating, 0) /
      userReviews.length;

    const positiveReviews = userReviews.filter(
      (item) => item.sentimentLabel === "POSITIVE"
    ).length;

    const negativeReviews = userReviews.filter(
      (item) => item.sentimentLabel === "NEGATIVE"
    ).length;

    const reviewedUserData = await User.findById(reviewedUser);

    if (reviewedUserData) {
      let trustScore = reviewedUserData.isVerified ? 70 : 50;

      trustScore += averageRating * 5;
      trustScore += positiveReviews * 2;
      trustScore -= negativeReviews * 5;

      if (trustScore > 100) trustScore = 100;
      if (trustScore < 0) trustScore = 0;

      reviewedUserData.trustScore = Math.round(trustScore);
      await reviewedUserData.save();
    }

    return res.status(201).json({
      success: true,
      message: "Review creada correctamente",
      resultado: {
        usuarioCalificado: reviewedUser,
        rating: numericRating,
        sentimiento: analysis.sentimentLabel,
        puntajeSentimiento: analysis.sentimentScore,
        nuevoTrustScore: reviewedUserData ? reviewedUserData.trustScore : null
      },
      review
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creando review",
      error: error.message
    });
  }
};

const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      reviewer: req.user._id
    })
      .populate("reviewedUser", "firstName lastName email trustScore isVerified")
      .populate("product", "title price category")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: "Mis reviews obtenidas correctamente",
      count: reviews.length,
      reviews
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error obteniendo mis reviews",
      error: error.message
    });
  }
};

const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: "userId no es válido"
      });
    }

    const reviews = await Review.find({
      reviewedUser: userId
    })
      .populate("reviewer", "firstName lastName email trustScore isVerified")
      .populate("product", "title price category")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: "Reviews del usuario obtenidas correctamente",
      count: reviews.length,
      reviews
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error obteniendo reviews del usuario",
      error: error.message
    });
  }
};

module.exports = {
  createReview,
  getMyReviews,
  getUserReviews
};