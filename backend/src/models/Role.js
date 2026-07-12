const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },

    description: {
      type: String,
      trim: true,
      default: ""
    },

    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission"
      }
    ],

    isSystem: {
      type: Boolean,
      default: false
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

roleSchema.index({
  name: 1,
  isActive: 1
});

module.exports = mongoose.model(
  "Role",
  roleSchema
);