/*
Usa este attachmentSchema:

const attachmentSchema = new mongoose.Schema(
  {
    name: String,
    url: { type: String, required: true },
    mimeType: String,
    size: { type: Number, default: 0 },
    type: {
      type: String,
      enum: ["IMAGE", "VIDEO", "PDF", "FILE"],
      default: "FILE"
    },
    storageProvider: {
      type: String,
      enum: ["LOCAL", "CLOUDINARY", "S3", "SUPABASE"],
      default: "LOCAL"
    },
    storageKey: String,
    width: Number,
    height: Number,
    duration: Number,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { _id: false }
);

En messageSchema:

attachments: {
  type: [attachmentSchema],
  default: []
}
*/
