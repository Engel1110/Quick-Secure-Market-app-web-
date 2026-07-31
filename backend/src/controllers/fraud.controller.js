const { prisma, parsePositiveInt } = require("../utils/prismaCompat");
const { createNotification } = require("../services/notification.service");

const riskLevelSpanish = { LOW: "Bajo", MEDIUM: "Medio", HIGH: "Alto", CRITICAL: "Crítico" };

async function analyzeProductRisk(product) {
  let riskLevel = "LOW";
  let confidenceScore = 80;
  const reasons = [];
  const evidenceRequired = [];
  const descriptionLength = String(product.description || "").length;
  const imageCount = Array.isArray(product.images) ? product.images.length : 0;

  if (Number(product.price) <= 10000 && ["Gaming", "Tecnologia", "Tecnología", "Celulares", "Computadoras"].includes(product.category)) {
    riskLevel = "HIGH";
    confidenceScore -= 35;
    reasons.push("Precio sospechosamente bajo para esta categoría en República Dominicana.");
    evidenceRequired.push("Foto del equipo encendido", "Video corto funcionando", "Número de serie visible", "Explicación clara del precio bajo");
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
  if (product.specialPriceReason !== "NONE" && String(product.specialPriceExplanation || "").length < 30) {
    if (riskLevel !== "HIGH") riskLevel = "MEDIUM";
    confidenceScore -= 10;
    reasons.push("El motivo del precio especial necesita una explicación más completa.");
    evidenceRequired.push("Explicación más clara del motivo de venta rápida");
  }
  return {
    riskLevel,
    confidenceScore: Math.max(0, Math.min(100, confidenceScore)),
    reason: reasons.length ? reasons.join(" ") : "Producto sin señales críticas de fraude.",
    evidenceRequired: [...new Set(evidenceRequired)]
  };
}

function serializeAlert(alert) {
  return {
    ...alert,
    _id: String(alert.id),
    riskLevel: alert.level,
    reason: alert.message,
    user: alert.product?.seller ? { ...alert.product.seller, _id: String(alert.product.seller.id) } : undefined,
    product: alert.product ? { ...alert.product, _id: String(alert.product.id) } : alert.productId,
    evidenceRequired: alert.product?.evidenceRequired || []
  };
}

async function createFraudAlertForProduct(req, res) {
  try {
    const productId = parsePositiveInt(req.body?.productId);
    if (!productId) return res.status(400).json({ message: "El productId es obligatorio" });
    const product = await prisma.product.findUnique({ where: { id: productId }, include: { seller: true } });
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });

    const analysis = await analyzeProductRisk(product);
    const [alert] = await prisma.$transaction([
      prisma.fraudAlert.create({
        data: { productId, type: "PRODUCT_RISK", level: analysis.riskLevel, message: analysis.reason },
        include: { product: { include: { seller: true } } }
      }),
      prisma.product.update({
        where: { id: productId },
        data: {
          riskLevel: analysis.riskLevel,
          riskLabel: riskLevelSpanish[analysis.riskLevel],
          riskScore: 100 - analysis.confidenceScore,
          confidenceScore: analysis.confidenceScore,
          evidenceRequired: analysis.evidenceRequired
        }
      })
    ]);

    if (["HIGH", "CRITICAL"].includes(analysis.riskLevel)) {
      await createNotification(product.sellerId, "SECURITY_ALERT", "Alerta antifraude en tu publicación", "Quick Secure Market detectó señales de riesgo en tu producto. Revisa las evidencias requeridas para aumentar la confianza.");
    }

    return res.status(201).json({
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
      alerta: serializeAlert(alert)
    });
  } catch (error) {
    console.error("Error generando alerta antifraude:", error);
    return res.status(500).json({ message: "Error generando alerta antifraude", error: error.message });
  }
}

async function getFraudAlerts(_req, res) {
  try {
    const alerts = await prisma.fraudAlert.findMany({
      include: {
        product: {
          include: {
            seller: { select: { id: true, firstName: true, lastName: true, email: true, trustScore: true, isVerified: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ message: "Alertas antifraude obtenidas correctamente", alerts: alerts.map(serializeAlert) });
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo alertas antifraude", error: error.message });
  }
}

module.exports = { createFraudAlertForProduct, getFraudAlerts };
