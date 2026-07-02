const mongoose = require("mongoose");
const validator = require("validator");

const Product = require("../models/Product");

const allowedConditions = ["NEW", "LIKE_NEW", "USED_GOOD", "USED_DETAILS", "FOR_PARTS"];
const allowedQualities = ["EXCELLENT", "GOOD", "FAIR", "DAMAGED", "UNKNOWN"];
const allowedSpecialPriceReasons = [
  "NONE",
  "URGENT_MONEY",
  "MOVING",
  "BOUGHT_ANOTHER",
  "NO_LONGER_USED",
  "MEDICAL_EXPENSE",
  "BUSINESS_LIQUIDATION",
  "OTHER"
];

const sanitizeText = (value) => validator.escape(String(value || "").trim());

const cleanFilePath = (value) => {
  if (!value) return "";
  return String(value)
    .trim()
    .replaceAll("&#x2F;", "/")
    .replaceAll("&amp;", "&");
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeImages = (images) => {
  if (!Array.isArray(images)) return [];

  return images
    .filter((item) => typeof item === "string" && item.trim())
    .slice(0, 8)
    .map((item) => cleanFilePath(item));
};

const normalizeVideo = (video) => {
  if (!video || typeof video !== "object") {
    return { url: "", thumbnail: "", duration: 0 };
  }

  return {
    url: cleanFilePath(video.url),
    thumbnail: cleanFilePath(video.thumbnail),
    duration: Number(video.duration || 0)
  };
};

const calculateProductAnalysis = ({
  images = [],
  video = {},
  description = "",
  price = 0,
  quality = "UNKNOWN",
  specialPriceExplanation = "",
  sellerTrustScore = 50
}) => {
  const evidenceRequired = [];

  let imageScore = 0;
  if (images.length >= 6) imageScore = 95;
  else if (images.length >= 3) imageScore = 80;
  else if (images.length >= 1) imageScore = 60;
  else evidenceRequired.push("Agregar fotos reales del producto");

  let videoScore = video?.url ? 90 : 0;
  if (!video?.url) evidenceRequired.push("Agregar un video corto del producto funcionando");

  let priceScore = Number(price) > 0 ? 80 : 0;
  if (!priceScore) evidenceRequired.push("Agregar un precio válido");

  let descriptionScore = 25;
  if (description.length >= 250) descriptionScore = 95;
  else if (description.length >= 120) descriptionScore = 80;
  else if (description.length >= 40) descriptionScore = 60;
  else evidenceRequired.push("Mejorar la descripción del producto");

  const sellerScore = Math.min(Number(sellerTrustScore || 50), 100);

  if (quality === "UNKNOWN") {
    evidenceRequired.push("Indicar la calidad real del producto");
  }

  if (!specialPriceExplanation || specialPriceExplanation.length < 30) {
    evidenceRequired.push("Explicar mejor el motivo de venta o precio");
  }

  const fraudRiskScore = Math.round(
    imageScore * 0.22 +
      videoScore * 0.18 +
      priceScore * 0.15 +
      descriptionScore * 0.22 +
      sellerScore * 0.23
  );

  let riskLevel = "LOW";
  if (fraudRiskScore < 45) riskLevel = "HIGH";
  else if (fraudRiskScore < 70) riskLevel = "MEDIUM";

  return {
    confidenceScore: fraudRiskScore,
    riskLevel,
    evidenceRequired,
    aiAnalysis: {
      imageScore,
      videoScore,
      priceScore,
      descriptionScore,
      sellerScore,
      fraudRiskScore
    }
  };
};

const createProduct = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      category,
      condition,
      quality,
      location,
      warranty,
      deliveryMethod,
      specialPriceReason,
      specialPriceExplanation,
      images,
      video
    } = req.body;

    if (!title || !description || !price || !category) {
      return res.status(400).json({
        success: false,
        message: "Título, descripción, precio y categoría son obligatorios"
      });
    }

    const numericPrice = Number(price);

    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "El precio debe ser un número válido mayor que cero"
      });
    }

    if (condition && !allowedConditions.includes(condition)) {
      return res.status(400).json({
        success: false,
        message: "Condición del producto no válida"
      });
    }

    if (quality && !allowedQualities.includes(quality)) {
      return res.status(400).json({
        success: false,
        message: "Calidad del producto no válida"
      });
    }

    if (specialPriceReason && !allowedSpecialPriceReasons.includes(specialPriceReason)) {
      return res.status(400).json({
        success: false,
        message: "Motivo de precio especial no válido"
      });
    }

    const safeImages = normalizeImages(images);
    const safeVideo = normalizeVideo(video);

    const analysis = calculateProductAnalysis({
      images: safeImages,
      video: safeVideo,
      description: String(description || ""),
      price: numericPrice,
      quality: quality || "UNKNOWN",
      specialPriceExplanation: specialPriceExplanation || "",
      sellerTrustScore: req.user?.trustScore || 50
    });

    const product = await Product.create({
      title: sanitizeText(title),
      description: sanitizeText(description),
      price: numericPrice,
      category: sanitizeText(category),
      condition: condition || "USED_GOOD",
      quality: quality || "UNKNOWN",
      location: location ? sanitizeText(location) : "",
      warranty: warranty ? sanitizeText(warranty) : "",
      deliveryMethod: deliveryMethod ? sanitizeText(deliveryMethod) : "",
      specialPriceReason: specialPriceReason || "NONE",
      specialPriceExplanation: specialPriceExplanation ? sanitizeText(specialPriceExplanation) : "",
      images: safeImages,
      video: safeVideo,
      seller: req.user._id,
      status: "ACTIVE",
      isQsmVerified: analysis.confidenceScore >= 85,
      riskLevel: analysis.riskLevel,
      confidenceScore: analysis.confidenceScore,
      aiAnalysis: analysis.aiAnalysis,
      evidenceRequired: analysis.evidenceRequired
    });

    return res.status(201).json({
      success: true,
      message: "Producto creado correctamente",
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creando producto",
      error: error.message
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({ status: { $ne: "DISABLED" } })
      .populate("seller", "firstName lastName email trustScore isVerified")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error obteniendo productos",
      error: error.message
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID de producto no válido"
      });
    }

    const product = await Product.findById(id).populate(
      "seller",
      "firstName lastName email trustScore isVerified"
    );

    if (!product || product.status === "DISABLED") {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado"
      });
    }

    return res.json({
      success: true,
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error obteniendo producto",
      error: error.message
    });
  }
};

const improveProductEvidence = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "productId no es válido"
      });
    }

    const {
      images,
      video,
      quality,
      location,
      warranty,
      deliveryMethod,
      specialPriceExplanation
    } = req.body;

    const product = await Product.findById(productId).populate("seller", "trustScore");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado"
      });
    }

    if (product.seller._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para modificar este producto"
      });
    }

    if (images) {
      if (!Array.isArray(images)) {
        return res.status(400).json({
          success: false,
          message: "images debe ser un arreglo"
        });
      }

      product.images = normalizeImages(images);
    }

    if (video) product.video = normalizeVideo(video);

    if (quality) {
      if (!allowedQualities.includes(quality)) {
        return res.status(400).json({
          success: false,
          message: "Calidad del producto no válida"
        });
      }

      product.quality = quality;
    }

    if (location) product.location = sanitizeText(location);
    if (warranty) product.warranty = sanitizeText(warranty);
    if (deliveryMethod) product.deliveryMethod = sanitizeText(deliveryMethod);
    if (specialPriceExplanation) product.specialPriceExplanation = sanitizeText(specialPriceExplanation);

    const analysis = calculateProductAnalysis({
      images: product.images,
      video: product.video,
      description: product.description,
      price: product.price,
      quality: product.quality,
      specialPriceExplanation: product.specialPriceExplanation,
      sellerTrustScore: product.seller?.trustScore || 50
    });

    product.riskLevel = analysis.riskLevel;
    product.confidenceScore = analysis.confidenceScore;
    product.aiAnalysis = analysis.aiAnalysis;
    product.evidenceRequired = analysis.evidenceRequired;
    product.isQsmVerified = analysis.confidenceScore >= 85;

    await product.save();

    return res.json({
      success: true,
      message: "Evidencias actualizadas correctamente",
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error actualizando evidencias",
      error: error.message
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  improveProductEvidence
};