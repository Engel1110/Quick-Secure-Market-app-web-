import mongoose from "mongoose";
const settingsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  theme: { type: String, enum: ["dark", "light"], default: "dark" },
  accentColor: { type: String, enum: ["cyan", "purple", "pink", "blue", "green", "orange"], default: "cyan" },
  language: { type: String, enum: ["es", "en"], default: "es" },
  density: { type: String, enum: ["comfortable", "compact", "spacious"], default: "comfortable" },
  animations: { type: Boolean, default: true },
  glassEffect: { type: Boolean, default: true },
  compactSidebar: { type: Boolean, default: false },
  notifications: { messages: { type: Boolean, default: true }, orders: { type: Boolean, default: true }, disputes: { type: Boolean, default: true }, security: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
  privacy: { showTrustScore: { type: Boolean, default: true }, showLocation: { type: Boolean, default: true }, allowMessages: { type: Boolean, default: true } },
  security: { twoFactorEnabled: { type: Boolean, default: false }, loginAlerts: { type: Boolean, default: true }, sessionTimeout: { type: String, default: "30" } }
}, { timestamps: true });
export default mongoose.model("Setting", settingsSchema);
