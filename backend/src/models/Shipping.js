const mongoose = require("mongoose");

const shippingSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    trackingCode: {
      type: String,
      required: true,
      unique: true
    },

    carrier: {
      type: String,
      default: "QSM Delivery"
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "PICKED_UP",
        "IN_TRANSIT",
        "DELIVERED",
        "FAILED",
        "RETURNED"
      ],
      default: "PENDING"
    },

    originAddress: {
      type: String,
      default: ""
    },

    deliveryAddress: {
      type: String,
      required: true
    },

    deliveryNotes: {
      type: String,
      default: ""
    },

    deliveredAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shipping", shippingSchema);