const validator = require("validator");
const { prisma, parsePositiveInt, getRequestUserId } = require("../utils/prismaCompat");
const { analyzeReview } = require("../services/reviewAI.service");

const sanitizeText = (value) => validator.escape(String(value || "").trim());
const userSelect = { id: true, firstName: true, lastName: true, email: true, trustScore: true, isVerified: true };
const productSelect = { id: true, title: true, price: true, category: true };

function serialize(review) {
  return {
    ...review,
    _id: String(review.id),
    order: review.order ? { ...review.order, _id: String(review.order.id) } : review.orderId,
    product: review.product ? { ...review.product, _id: String(review.product.id) } : review.productId,
    reviewer: review.reviewer ? { ...review.reviewer, _id: String(review.reviewer.id) } : review.reviewerId,
    reviewedUser: review.reviewed ? { ...review.reviewed, _id: String(review.reviewed.id) } : review.reviewedId,
    reviewed: review.reviewed ? { ...review.reviewed, _id: String(review.reviewed.id) } : undefined
  };
}

const include = { reviewer: { select: userSelect }, reviewed: { select: userSelect }, product: { select: productSelect }, order: true };

async function createReview(req, res) {
  try {
    const orderId = parsePositiveInt(req.body?.orderId);
    const reviewerId = await getRequestUserId(req);
    const rating = Number(req.body?.rating);
    if (!orderId || !rating) return res.status(400).json({ success: false, message: "orderId y rating son obligatorios" });
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) return res.status(400).json({ success: false, message: "El rating debe ser un número entre 1 y 5" });
    const comment = sanitizeText(req.body?.comment || "");
    if (comment.length > 500) return res.status(400).json({ success: false, message: "El comentario no puede superar los 500 caracteres" });

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.status(404).json({ success: false, message: "Orden no encontrada" });
    if (![order.buyerId, order.sellerId].includes(reviewerId)) return res.status(403).json({ success: false, message: "Solo comprador o vendedor pueden calificar esta orden" });
    if (!["DELIVERED", "COMPLETED"].includes(String(order.status).toUpperCase())) return res.status(400).json({ success: false, message: "Solo puedes calificar una orden entregada o completada" });

    const existing = await prisma.review.findFirst({ where: { orderId, reviewerId } });
    if (existing) return res.status(400).json({ success: false, message: "Ya calificaste esta orden" });

    const reviewedId = order.buyerId === reviewerId ? order.sellerId : order.buyerId;
    const analysis = analyzeReview(comment);

    const result = await prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: { orderId, productId: order.productId, reviewerId, reviewedId, rating: Math.round(rating), comment, sentimentLabel: analysis.sentimentLabel, sentimentScore: analysis.sentimentScore }
      });
      const reviews = await tx.review.findMany({ where: { reviewedId }, select: { rating: true, sentimentLabel: true } });
      const target = await tx.user.findUnique({ where: { id: reviewedId } });
      const average = reviews.reduce((sum, item) => sum + item.rating, 0) / Math.max(reviews.length, 1);
      const positive = reviews.filter((item) => item.sentimentLabel === "POSITIVE").length;
      const negative = reviews.filter((item) => item.sentimentLabel === "NEGATIVE").length;
      let trustScore = target?.isVerified ? 70 : 50;
      trustScore += average * 5 + positive * 2 - negative * 5;
      trustScore = Math.max(0, Math.min(100, Math.round(trustScore)));
      await tx.user.update({ where: { id: reviewedId }, data: { trustScore } });
      const full = await tx.review.findUnique({ where: { id: review.id }, include });
      return { review: full, trustScore };
    });

    return res.status(201).json({
      success: true,
      message: "Review creada correctamente",
      resultado: { usuarioCalificado: reviewedId, rating, sentimiento: analysis.sentimentLabel, puntajeSentimiento: analysis.sentimentScore, nuevoTrustScore: result.trustScore },
      review: serialize(result.review)
    });
  } catch (error) {
    console.error("Error creando review:", error);
    return res.status(500).json({ success: false, message: "Error creando review", error: error.message });
  }
}

async function getMyReviews(req, res) {
  try {
    const reviewerId = await getRequestUserId(req);
    const reviews = await prisma.review.findMany({ where: { reviewerId }, include, orderBy: { createdAt: "desc" } });
    return res.json({ success: true, message: "Mis reviews obtenidas correctamente", count: reviews.length, reviews: reviews.map(serialize) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error obteniendo mis reviews", error: error.message });
  }
}

async function getUserReviews(req, res) {
  try {
    const reviewedId = parsePositiveInt(req.params.userId);
    if (!reviewedId) return res.status(400).json({ success: false, message: "userId no es válido" });
    const reviews = await prisma.review.findMany({ where: { reviewedId }, include, orderBy: { createdAt: "desc" } });
    return res.json({ success: true, message: "Reviews del usuario obtenidas correctamente", count: reviews.length, reviews: reviews.map(serialize) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error obteniendo reviews del usuario", error: error.message });
  }
}

module.exports = { createReview, getMyReviews, getUserReviews };
