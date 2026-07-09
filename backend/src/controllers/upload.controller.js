const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No se recibió ningún archivo"
      });
    }

    const fileUrl = `/uploads/chat/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      message: "Archivo subido correctamente",
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: fileUrl
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error subiendo archivo",
      error: error.message
    });
  }
};

module.exports = {
  uploadFile
};