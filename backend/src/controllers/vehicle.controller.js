const VehicleReport = require("../models/VehicleReport");

const analyzeVehicleRisk = (data) => {
  let score = 90;
  let riskLevel = "LOW";
  let reasons = [];

  if (data.accidentReported) {
    score -= 25;
    reasons.push("El vehículo tiene accidentes reportados.");
  }

  if (data.salvageTitle) {
    score -= 40;
    reasons.push("El vehículo tiene historial salvage.");
  }

  if (data.mileageStatus === "INCONSISTENT") {
    score -= 30;
    reasons.push("El millaje presenta inconsistencias.");
  }

  if (data.ownersCount >= 4) {
    score -= 10;
    reasons.push("El vehículo tiene múltiples dueños registrados.");
  }

  if (score < 0) score = 0;

  if (score >= 80) riskLevel = "LOW";
  else if (score >= 60) riskLevel = "MEDIUM";
  else if (score >= 35) riskLevel = "HIGH";
  else riskLevel = "CRITICAL";

  return {
    vehicleScore: score,
    riskLevel,
    reportSummary: reasons.length
      ? reasons.join(" ")
      : "Vehículo sin señales críticas en el reporte."
  };
};

const mockCarfaxLookup = async (vin) => {
  return {
    vin,
    accidentReported: false,
    salvageTitle: false,
    ownersCount: 2,
    mileageStatus: "CONSISTENT",
    carfaxStatus: "FOUND",
    rawCarfaxData: {
      source: "CARFAX_DEMO",
      note: "Este es un reporte demo. La integración real requiere API Key de CARFAX."
    }
  };
};

const createVehicleReport = async (req, res) => {
  try {
    const { vin, plate, brand, model, year } = req.body;

    if (!vin) {
      return res.status(400).json({
        message: "El VIN es obligatorio"
      });
    }

    if (vin.length !== 17) {
      return res.status(400).json({
        message: "El VIN debe tener 17 caracteres"
      });
    }

    const carfaxData = await mockCarfaxLookup(vin);

    const analysis = analyzeVehicleRisk(carfaxData);

    const report = await VehicleReport.create({
      vin,
      plate,
      brand,
      model,
      year,
      seller: req.user._id,
      carfaxStatus: carfaxData.carfaxStatus,
      accidentReported: carfaxData.accidentReported,
      salvageTitle: carfaxData.salvageTitle,
      ownersCount: carfaxData.ownersCount,
      mileageStatus: carfaxData.mileageStatus,
      vehicleScore: analysis.vehicleScore,
      riskLevel: analysis.riskLevel,
      reportSummary: analysis.reportSummary,
      rawCarfaxData: carfaxData.rawCarfaxData
    });

    res.status(201).json({
      message: "Reporte vehicular creado correctamente",
      resultado: {
        vin: report.vin,
        puntajeVehiculo: report.vehicleScore,
        nivelDeRiesgo:
          report.riskLevel === "LOW"
            ? "Bajo"
            : report.riskLevel === "MEDIUM"
            ? "Medio"
            : report.riskLevel === "HIGH"
            ? "Alto"
            : "Crítico",
        accidenteReportado: report.accidentReported,
        salvage: report.salvageTitle,
        cantidadDeDueños: report.ownersCount,
        estadoMillaje: report.mileageStatus,
        resumen: report.reportSummary
      },
      report
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creando reporte vehicular",
      error: error.message
    });
  }
};

const getMyVehicleReports = async (req, res) => {
  try {
    const reports = await VehicleReport.find({ seller: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      message: "Reportes vehiculares obtenidos correctamente",
      count: reports.length,
      reports
    });
  } catch (error) {
    res.status(500).json({
      message: "Error obteniendo reportes vehiculares",
      error: error.message
    });
  }
};

module.exports = {
  createVehicleReport,
  getMyVehicleReports
};