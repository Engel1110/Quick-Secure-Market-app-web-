const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const {
  validateMediaFile
} = require("../services/messages/mediaSecurity.service");

const uploadDir = path.join(process.cwd(), "uploads", "messages");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, uploadDir);
  },
  filename(req, file, callback) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});

const messageMediaUpload = multer({
  storage,
  limits: {
    files: 8,
    fileSize: 25 * 1024 * 1024
  },
  fileFilter(req, file, callback) {
    const result = validateMediaFile(file);

    if (!result.valid) {
      return callback(new Error(result.message));
    }

    callback(null, true);
  }
});

module.exports = { messageMediaUpload };
