const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

const productImageFolder = path.join(__dirname, "../../uploads/products/images");
const productVideoFolder = path.join(__dirname, "../../uploads/products/videos");
const chatFolder = path.join(__dirname, "../../uploads/chat");

fs.mkdirSync(productImageFolder, { recursive: true });
fs.mkdirSync(productVideoFolder, { recursive: true });
fs.mkdirSync(chatFolder, { recursive: true });

const productStorage = multer.diskStorage({
  destination(req, file, cb) {
    if (file.mimetype.startsWith("image")) return cb(null, productImageFolder);
    if (file.mimetype.startsWith("video")) return cb(null, productVideoFolder);
    cb(new Error("Tipo de archivo no soportado"));
  },

  filename(req, file, cb) {
    const extension = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1000000)}${extension}`);
  }
});

const chatStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, chatFolder);
  },

  filename(req, file, cb) {
    const extension = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1000000)}${extension}`);
  }
});

const productUpload = multer({
  storage: productStorage,
  limits: {
    fileSize: 100 * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith("image") || file.mimetype.startsWith("video")) {
      return cb(null, true);
    }

    cb(new Error("Solo imágenes y videos"));
  }
});

const chatUpload = multer({
  storage: chatStorage,
  limits: {
    fileSize: 25 * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/webm",
      "application/pdf"
    ];

    if (allowedTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    cb(new Error("Tipo de archivo no permitido para chat"));
  }
});

router.post(
  "/",
  authMiddleware,
  productUpload.fields([
    { name: "images", maxCount: 8 },
    { name: "video", maxCount: 1 }
  ]),
  (req, res) => {
    const images = [];
    let video = null;

    if (req.files.images) {
      req.files.images.forEach((file) => {
        images.push("/uploads/products/images/" + file.filename);
      });
    }

    if (req.files.video && req.files.video.length) {
      video = {
        url: "/uploads/products/videos/" + req.files.video[0].filename,
        thumbnail: "",
        duration: 0
      };
    }

    res.json({
      success: true,
      images,
      video
    });
  }
);

router.post("/chat", authMiddleware, chatUpload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No se recibió ningún archivo"
    });
  }

  res.status(201).json({
    success: true,
    message: "Archivo subido correctamente",
    file: {
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: "/uploads/chat/" + req.file.filename
    }
  });
});

module.exports = router;