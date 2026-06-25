const mongoose = require("mongoose");

const vehicleReportSchema = new mongoose.Schema(
  {
    vin: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },

    plate: {
      type: String,
      default: ""
    },

    brand: {
      type: String,
      default: ""
    },

    model: {
      type: String,
      default: ""
    },

    year: {
      type: Number,
      default: null
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    carfaxStatus: {
      type: String,
      enum: ["PENDING", "FOUND", "NOT_FOUND", "ERROR"],
      default: "PENDING"
    },

    accidentReported: {
      type: Boolean,
      default: false
    },

    salvageTitle: {
      type: Boolean,
      default: false
    },

    ownersCount: {
      type: Number,
      default: 0
    },

    mileageStatus: {
      type: String,
      enum: ["UNKNOWN", "CONSISTENT", "INCONSISTENT"],
      default: "UNKNOWN"
    },

    vehicleScore: {
      type: Number,
      default: 70
    },

    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "LOW"
    },

    reportSummary: {
      type: String,
      default: ""
    },

    rawCarfaxData: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("VehicleReport", vehicleReportSchema);