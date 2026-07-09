const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    emoji: {
      type: String,
      default: "👍"
    }
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    name: String,
    url: String,
    mimeType: String,
    size: Number,
    type: {
      type: String,
      enum: ["IMAGE", "VIDEO", "AUDIO", "PDF", "FILE"],
      default: "FILE"
    }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null
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
      default: null
    },

    messageType: {
      type: String,
      enum: [
        "TEXT",
        "IMAGE",
        "VIDEO",
        "AUDIO",
        "LOCATION",
        "FILE",
        "SYSTEM"
      ],
      default: "TEXT"
    },

    content: {
      type: String,
      required: true,
      trim: true
    },

    text: {
      type: String,
      default: ""
    },

    attachments: {
      type: [attachmentSchema],
      default: []
    },

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null
    },

    reactions: {
      type: [reactionSchema],
      default: []
    },

    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },

    voiceDuration: {
      type: Number,
      default: 0
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

    isEdited: {
      type: Boolean,
      default: false
    },

    editedAt: {
      type: Date,
      default: null
    },

    deletedForEveryone: {
      type: Boolean,
      default: false
    },

    deletedAt: {
      type: Date,
      default: null
    },

    status: {
      type: String,
      enum: [
        "SENT",
        "DELIVERED",
        "READ",
        "BLOCKED"
      ],
      default: "SENT"
    },

    deliveredAt: {
      type: Date,
      default: null
    },

    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Message", messageSchema);