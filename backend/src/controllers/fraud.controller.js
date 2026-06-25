const FraudAlert = require("../models/FraudAlert");
const Product = require("../models/Product");

const { createNotification } = require("../services/notification.service");

const riskLevelSpanish = {
  LOW: "Bajo",
  MEDIUM: "Medio",
  HIGH: "Alto",
  CRITICAL: "Crítico"
};

const analyzeProductRisk = async (product) => {
  let riskLevel = "LOW";
  let confidenceScore = 80;
  let reasons = [];
  let evidenceRequired = [];

  const descriptionLength = product.description ? product.description.length : 0;
  const imageCount = product.images ? product.images.length : 0;

  if (
    product.price <= 10000 &&
    ["Gaming", "Tecnologia", "Tecnología", "Celulares", "Computadoras"].includes(product.category)
  ) {
    riskLevel = "HIGH";
    confidenceScore -= 35;
    reasons.push("Precio sospechosamente bajo para esta categoría en República Dominicana.");
    evidenceRequired.push(
      "Foto del equipo encendido",
      "Video corto funcionando",
      "Número de serie visible",
      "Explicación clara del precio bajo"
    );
  }

  if (descriptionLength < 40) {
    if (riskLevel !== "HIGH") riskLevel = "MEDIUM";
    confidenceScore -= 15;
    reasons.push("La descripción es muy corta para validar el estado real del producto.");
    evidenceRequired.push("Descripción más detallada del producto");
  }

  if (imageCount < 2) {
    if (riskLevel !== "HIGH") riskLevel = "MEDIUM";
    confidenceScore -= 10;
    reasons.push("El anuncio tiene pocas fotos.");
    evidenceRequired.push("Más fotos desde diferentes ángulos");
  }

  if (product.quality === "UNKNOWN") {
    if (riskLevel !== "HIGH") riskLevel = "MEDIUM";
    confidenceScore -= 10;
    reasons.push("La calidad del equipo no fue especificada correctamente.");
    evidenceRequired.push("Indicar la calidad real del equipo");
  }

  if (
    product.specialPriceReason !== "NONE" &&
    (!product.specialPriceExplanation || product.specialPriceExplanation.length < 30)
  ) {
    if (riskLevel !== "HIGH") riskLevel = "MEDIUM";
    confidenceScore -= 10;
    reasons.push("El motivo del precio especial necesita una explicación más completa.");
    evidenceRequired.push("Explicación más clara del motivo de venta rápida");
  }

  if (confidenceScore > 100) confidenceScore = 100;
  if (confidenceScore < 0) confidenceScore = 0;

  return {
    riskLevel,
    confidenceScore,
    reason: reasons.length
      ? reasons.join(" ")
      : "Producto sin señales críticas de fraude.",
    evidenceRequired
  };
};

const createFraudAlertForProduct = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        message: "El productId es obligatorio"
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: "Producto no encontrado"
      });
    }

    const analysis = await analyzeProductRisk(product);

    const alert = await FraudAlert.create({
      user: product.seller,
      product: product._id,
      riskLevel: analysis.riskLevel,
      reason: analysis.reason,
      evidenceRequired: analysis.evidenceRequired
    });

    product.riskLevel = analysis.riskLevel;
    product.confidenceScore = analysis.confidenceScore;
    product.evidenceRequired = analysis.evidenceRequired;
    await product.save();

    if (analysis.riskLevel === "HIGH" || analysis.riskLevel === "CRITICAL") {
      await createNotification(
        product.seller,
        "SECURITY_ALERT",
        "Alerta antifraude en tu publicación",
        "Quick Secure Market detectó señales de riesgo en tu producto. Revisa las evidencias requeridas para aumentar la confianza."
      );
    }

    res.status(201).json({
      message: "Análisis antifraude completado correctamente",
      resultado: {
        nivelDeRiesgo: riskLevelSpanish[analysis.riskLevel],
        codigoInternoRiesgo: analysis.riskLevel,
        puntajeDeConfianza: analysis.confidenceScore,
        motivo: analysis.reason,
        evidenciasRequeridas: analysis.evidenceRequired,
        recomendacionDelAsistente: [
          "Tu publicación fue analizada por Quick Secure Assistant.",
          "Si el precio está por debajo del mercado dominicano, agrega una explicación clara.",
          "Sube fotos reales desde varios ángulos.",
          "Agrega un video corto mostrando el equipo encendido y funcionando.",
          "Incluye número de serie, IMEI o factura si aplica.",
          "Mientras más evidencias agregues, mayor será tu puntaje de confianza."
        ]
      },
      alerta: alert
    });
  } catch (error) {
    res.status(500).json({
      message: "Error generando alerta antifraude",
      error: error.message
    });
  }
};

const getFraudAlerts = async (req, res) => {
  try {
    const alerts = await FraudAlert.find()
      .populate("user", "firstName lastName email trustScore isVerified")
      .populate("product", "title price category condition quality riskLevel confidenceScore evidenceRequired")
      .sort({ createdAt: -1 });

    res.json({
      message: "Alertas antifraude obtenidas correctamente",
      alerts
    });
  } catch (error) {
    res.status(500).json({
      message: "Error obteniendo alertas antifraude",
      error: error.message
    });
  }
};

module.exports = {
  createFraudAlertForProduct,
  getFraudAlerts
};