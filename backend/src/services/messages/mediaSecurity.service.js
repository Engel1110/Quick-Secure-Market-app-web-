const path = require("path");

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "application/pdf", "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip", "application/x-rar-compressed"
]);

const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".msi", ".bat", ".cmd", ".ps1", ".vbs",
  ".js", ".jar", ".scr", ".dll", ".sh", ".php", ".py"
]);

function validateMediaFile(file) {
  const extension = path.extname(file?.originalname || "").toLowerCase();

  if (BLOCKED_EXTENSIONS.has(extension)) {
    return { valid: false, message: `Extensión bloqueada: ${extension}` };
  }

  if (!ALLOWED_MIME_TYPES.has(file?.mimetype)) {
    return { valid: false, message: `Tipo no permitido: ${file?.mimetype}` };
  }

  return { valid: true };
}

function classifyMedia(file) {
  const mime = String(file?.mimetype || "");
  if (mime.startsWith("image/")) return "IMAGE";
  if (mime.startsWith("video/")) return "VIDEO";
  if (mime === "application/pdf") return "PDF";
  return "FILE";
}

module.exports = { validateMediaFile, classifyMedia };
