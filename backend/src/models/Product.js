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

    location: { type: String, default: "" },
    warranty: { type: String, default: "" },
    deliveryMethod: { type: String, default: "" },

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

    specialPriceExplanation: { type: String, default: "" },

    images: [{ type: String }],

    video: {
      url: { type: String, default: "" },
      thumbnail: { type: String, default: "" },
      duration: { type: Number, default: 0 }
    },

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

    confidenceScore: { type: Number, default: 70 },

    aiAnalysis: {
      imageScore: { type: Number, default: 0 },
      videoScore: { type: Number, default: 0 },
      priceScore: { type: Number, default: 0 },
      descriptionScore: { type: Number, default: 0 },
      sellerScore: { type: Number, default: 0 },
      fraudRiskScore: { type: Number, default: 0 }
    },

    evidenceRequired: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);