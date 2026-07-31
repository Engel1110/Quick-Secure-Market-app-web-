const { prisma, getRequestUserId, parsePositiveInt } = require("../utils/prismaCompat");

function generateVehicleScore(report) {
  let score = 100;
  if (report.accidentReported) score -= 25;
  if (report.salvageTitle) score -= 40;
  if (Number(report.ownersCount || 0) > 3) score -= 10;
  if (String(report.mileageStatus || "").toUpperCase() !== "NORMAL") score -= 15;
  return Math.max(score, 0);
}

function riskFromScore(score) {
  if (score >= 80) return "LOW";
  if (score >= 60) return "MEDIUM";
  return "HIGH";
}

async function mockCarfaxLookup(vin) {
  const suffix = String(vin || "").slice(-1);
  const number = Number.parseInt(suffix, 16);
  const seed = Number.isFinite(number) ? number : 1;
  return {
    carfaxStatus: "COMPLETED",
    accidentReported: seed % 7 === 0,
    salvageTitle: seed % 13 === 0,
    ownersCount: (seed % 4) + 1,
    mileageStatus: seed % 9 === 0 ? "INCONSISTENT" : "NORMAL"
  };
}

function serialize(report) {
  return { ...report, _id: String(report.id), seller: report.sellerId };
}

async function createVehicleReport(req, res) {
  try {
    const sellerId = await getRequestUserId(req);
    if (!sellerId) return res.status(401).json({ success: false, message: "Usuario no autenticado." });
    const body = req.body || {};
    const vin = String(body.vin || "").trim().toUpperCase();
    if (vin.length < 8) return res.status(400).json({ success: false, message: "El VIN no es válido." });

    const lookup = await mockCarfaxLookup(vin);
    const vehicleScore = generateVehicleScore(lookup);
    const report = await prisma.vehicleReport.create({
      data: {
        sellerId,
        vin,
        plate: String(body.plate || "").trim().toUpperCase(),
        brand: String(body.brand || "").trim(),
        model: String(body.model || "").trim(),
        year: parsePositiveInt(body.year),
        ...lookup,
        vehicleScore,
        riskLevel: riskFromScore(vehicleScore),
        reportSummary: vehicleScore >= 80 ? "Vehículo con riesgo bajo." : vehicleScore >= 60 ? "Vehículo con señales que requieren revisión." : "Vehículo con riesgo elevado.",
        rawCarfaxData: lookup
      }
    });
    return res.status(201).json({ success: true, message: "Reporte vehicular generado correctamente.", report: serialize(report) });
  } catch (error) {
    console.error("Error creando reporte vehicular:", error);
    return res.status(500).json({ success: false, message: "No se pudo crear el reporte vehicular.", error: error.message });
  }
}

async function getMyVehicleReports(req, res) {
  try {
    const sellerId = await getRequestUserId(req);
    if (!sellerId) return res.status(401).json({ success: false, message: "Usuario no autenticado." });
    const reports = await prisma.vehicleReport.findMany({ where: { sellerId }, orderBy: { createdAt: "desc" } });
    return res.json({ success: true, count: reports.length, reports: reports.map(serialize) });
  } catch (error) {
    console.error("Error obteniendo reportes vehiculares:", error);
    return res.status(500).json({ success: false, message: "No se pudieron obtener los reportes vehiculares." });
  }
}

module.exports = { createVehicleReport, getMyVehicleReports };
