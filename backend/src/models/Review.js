const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
{
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        required: true,
        unique: true
    },

    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    reviewedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
    },

    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },

    comment: {
        type: String,
        default: ""
    },

    sentimentScore: {
        type: Number,
        default: 50
    },

    sentimentLabel: {
        type: String,
        enum: [
            "POSITIVE",
            "NEUTRAL",
            "NEGATIVE"
        ],
        default: "NEUTRAL"
    }

},
{
    timestamps: true
});

module.exports = mongoose.model("Review", reviewSchema);