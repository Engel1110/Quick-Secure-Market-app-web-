const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },

    condition: {
      type: String,
      enum: ["NEW", "LIKE_NEW", "USED_GOOD", "USED_DETAILS", "FOR_PARTS"],
      default: "USED_GOOD"
    },

    quality: {
      type: String,
      enum: ["EXCELLENT", "GOOD", "FAIR", "DAMAGED", "UNKNOWN"],
      default: "UNKNOWN"
    },

    specialPriceReason: {
      type: String,
      enum: [
        "NONE",
        "URGENT_MONEY",
        "MOVING",
        "BOUGHT_ANOTHER",
        "NO_LONGER_USED",
        "MEDICAL_EXPENSE",
        "BUSINESS_LIQUIDATION",
        "OTHER"
      ],
      default: "NONE"
    },

    specialPriceExplanation: {
      type: String,
      default: ""
    },

    images: [{ type: String }],

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "PENDING", "SOLD", "DISABLED"],
      default: "ACTIVE"
    },

    isQsmVerified: { type: Boolean, default: false },

    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "LOW"
    },

    confidenceScore: {
      type: Number,
      default: 70
    },

    evidenceRequired: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);