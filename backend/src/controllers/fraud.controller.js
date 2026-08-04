const { prisma, parsePositiveInt } = require("../utils/prismaCompat");
const { createNotification } = require("../services/notification.service");
const { buildAnalysis, MODULES } = require("../services/qsm-ai-core.service");

const riskLevelSpanish = { LOW: "Bajo", MEDIUM: "Medio", HIGH: "Alto", CRITICAL: "CrÃ­tico" };

async function analyzeProductRisk(product) {
  let riskLevel = "LOW";
  let confidenceScore = 80;
  const reasons = [];
  const evidenceRequired = [];
  const descriptionLength = String(product.description || "").length;
  const imageCount = Array.isArray(product.images) ? product.images.length : 0;

  if (Number(product.price) <= 10000 && ["Gaming", "Tecnologia", "TecnologÃ­a", "Celulares", "Computadoras"].includes(product.category)) {
    riskLevel = "HIGH";
    confidenceScore -= 35;
    reasons.push("Precio sospechosamente bajo para esta categorÃ­a en RepÃºblica Dominicana.");
    evidenceRequired.push("Foto del equipo encendido", "Video corto funcionando", "NÃºmero de serie visible", "ExplicaciÃ³n clara del precio bajo");
  }
  if (descriptionLength < 40) {
    if (riskLevel !== "HIGH") riskLevel = "MEDIUM";
    confidenceScore -= 15;
    reasons.push("La descripciÃ³n es muy corta para validar el estado real del producto.");
    evidenceRequired.push("DescripciÃ³n mÃ¡s detallada del producto");
  }
  if (imageCount < 2) {
    if (riskLevel !== "HIGH") riskLevel = "MEDIUM";
    confidenceScore -= 10;
    reasons.push("El anuncio tiene pocas fotos.");
    evidenceRequired.push("MÃ¡s fotos desde diferentes Ã¡ngulos");
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
    reasons.push("El motivo del precio especial necesita una explicaciÃ³n mÃ¡s completa.");
    evidenceRequired.push("ExplicaciÃ³n mÃ¡s clara del motivo de venta rÃ¡pida");
  }
  return {
    riskLevel,
    confidenceScore: Math.max(0, Math.min(100, confidenceScore)),
    reason: reasons.length ? reasons.join(" ") : "Producto sin seÃ±ales crÃ­ticas de fraude.",
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

    const coreAnalysis = buildAnalysis({
      module: MODULES.FRAUD,
      riskScore: 100 - analysis.confidenceScore,
      riskLevel: analysis.riskLevel,
      confidenceScore: analysis.confidenceScore,
      reasons: analysis.reason ? [analysis.reason] : [],
      recommendations: [
        "Agregar evidencia real del producto.",
        "Mantener toda la operacion dentro de QSM.",
        "Solicitar revision humana cuando el riesgo sea alto."
      ],
      evidenceRequired: analysis.evidenceRequired,
      humanReviewRequired: ["HIGH", "CRITICAL"].includes(
        analysis.riskLevel
      ),
      source: "QSM_FRAUD_CONTROLLER_V1",
      metadata: { productId }
    });

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
      await createNotification(product.sellerId, "SECURITY_ALERT", "Alerta antifraude en tu publicaciÃ³n", "Quick Secure Market detectÃ³ seÃ±ales de riesgo en tu producto. Revisa las evidencias requeridas para aumentar la confianza.");
    }

    return res.status(201).json({
      message: "AnÃ¡lisis antifraude completado correctamente",
      resultado: {
        nivelDeRiesgo: riskLevelSpanish[analysis.riskLevel],
        codigoInternoRiesgo: analysis.riskLevel,
        puntajeDeConfianza: analysis.confidenceScore,
        motivo: analysis.reason,
        evidenciasRequeridas: analysis.evidenceRequired,
        recomendacionDelAsistente: [
          "Tu publicaciÃ³n fue analizada por Quick Secure Assistant.",
          "Si el precio estÃ¡ por debajo del mercado dominicano, agrega una explicaciÃ³n clara.",
          "Sube fotos reales desde varios Ã¡ngulos.",
          "Agrega un video corto mostrando el equipo encendido y funcionando.",
          "Incluye nÃºmero de serie, IMEI o factura si aplica.",
          "Mientras mÃ¡s evidencias agregues, mayor serÃ¡ tu puntaje de confianza."
        ]
      },
      alerta: serializeAlert(alert),
      qsmAiCore: coreAnalysis
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
