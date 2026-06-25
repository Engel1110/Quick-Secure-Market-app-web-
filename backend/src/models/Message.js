const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    messageType: {
      type: String,
      enum: ["TEXT", "IMAGE", "VIDEO", "AUDIO", "LOCATION"],
      default: "TEXT"
    },

    content: {
      type: String,
      required: true
    },

    attachments: {
      type: [String],
      default: []
    },

    isFlagged: {
      type: Boolean,
      default: false
    },

    riskLevel: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "LOW"
    },

    aiReason: {
      type: String,
      default: ""
    },

    status: {
      type: String,
      enum: ["SENT", "DELIVERED", "READ", "BLOCKED"],
      default: "SENT"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);