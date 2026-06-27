const mongoose = require("mongoose");
const validator = require("validator");

const Product = require("../models/Product");

const allowedConditions = [
  "NEW",
  "LIKE_NEW",
  "USED_GOOD",
  "USED_DETAILS",
  "FOR_PARTS"
];

const allowedQualities = [
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "DAMAGED",
  "UNKNOWN"
];

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

const sanitizeText = (value) => {
  return validator.escape(String(value || "").trim());
};

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
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
      specialPriceReason,
      specialPriceExplanation,
      images
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

    if (
      specialPriceReason &&
      !allowedSpecialPriceReasons.includes(specialPriceReason)
    ) {
      return res.status(400).json({
        success: false,
        message: "Motivo de precio especial no válido"
      });
    }

    const safeImages = Array.isArray(images)
      ? images.slice(0, 8).map((item) => sanitizeText(item))
      : [];

    const product = await Product.create({
      title: sanitizeText(title),
      description: sanitizeText(description),
      price: numericPrice,
      category: sanitizeText(category),
      condition: condition || "USED_GOOD",
      quality: quality || "UNKNOWN",
      specialPriceReason: specialPriceReason || "NONE",
      specialPriceExplanation: specialPriceExplanation
        ? sanitizeText(specialPriceExplanation)
        : "",
      images: safeImages,
      seller: req.user._id,
      status: "ACTIVE",
      riskLevel: "LOW",
      confidenceScore: 70,
      evidenceRequired: []
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
    const products = await Product.find({
      status: { $ne: "DISABLED" }
    })
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
      quality,
      specialPriceExplanation,
      hasVideo,
      hasSerialNumber,
      hasInvoice
    } = req.body;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado"
      });
    }

    if (product.seller.toString() !== req.user._id.toString()) {
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

      product.images = images.slice(0, 8).map((item) => sanitizeText(item));
    }

    if (quality) {
      if (!allowedQualities.includes(quality)) {
        return res.status(400).json({
          success: false,
          message: "Calidad del producto no válida"
        });
      }

      product.quality = quality;
    }

    if (specialPriceExplanation) {
      product.specialPriceExplanation = sanitizeText(specialPriceExplanation);
    }

    let confidenceScore = 50;
    let evidenceRequired = [];

    if (product.images && product.images.length >= 3) {
      confidenceScore += 15;
    } else {
      evidenceRequired.push("Agregar al menos 3 fotos reales del producto");
    }

    if (Boolean(hasVideo)) {
      confidenceScore += 15;
    } else {
      evidenceRequired.push("Agregar un video corto funcionando");
    }

    if (Boolean(hasSerialNumber)) {
      confidenceScore += 10;
    } else {
      evidenceRequired.push("Agregar número de serie visible");
    }

    if (Boolean(hasInvoice)) {
      confidenceScore += 10;
    } else {
      evidenceRequired.push("Agregar factura o comprobante si aplica");
    }

    if (product.quality && product.quality !== "UNKNOWN") {
      confidenceScore += 10;
    } else {
      evidenceRequired.push("Indicar la calidad real del equipo");
    }

    if (
      product.specialPriceExplanation &&
      product.specialPriceExplanation.length >= 40
    ) {
      confidenceScore += 10;
    } else {
      evidenceRequired.push("Explicar mejor el motivo del precio bajo");
    }

    if (confidenceScore > 100) confidenceScore = 100;
    if (confidenceScore < 0) confidenceScore = 0;

    if (confidenceScore >= 85) product.riskLevel = "LOW";
    else if (confidenceScore >= 65) product.riskLevel = "MEDIUM";
    else product.riskLevel = "HIGH";

    product.confidenceScore = confidenceScore;
    product.evidenceRequired = evidenceRequired;

    await product.save();

    return res.json({
      success: true,
      message: "Evidencias actualizadas correctamente",
      resultado: {
        nivelDeRiesgo:
          product.riskLevel === "LOW"
            ? "Bajo"
            : product.riskLevel === "MEDIUM"
            ? "Medio"
            : "Alto",
        codigoInternoRiesgo: product.riskLevel,
        puntajeDeConfianza: product.confidenceScore,
        evidenciasPendientes: product.evidenceRequired
      },
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

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  improveProductEvidence
};