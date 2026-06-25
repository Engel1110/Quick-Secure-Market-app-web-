const User = require("../models/User");

const { createNotification } = require("../services/notification.service");

const submitKyc = async (req, res) => {
  try {
    const { cedulaFront, cedulaBack, selfie, location, phone } = req.body;

    if (!cedulaFront || !cedulaBack || !selfie) {
      return res.status(400).json({
        message: "Cédula frontal, cédula trasera y selfie son obligatorias"
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    user.cedulaFront = cedulaFront;
    user.cedulaBack = cedulaBack;
    user.selfie = selfie;
    user.phone = phone || user.phone;
    user.verificationStatus = "PENDING";
    user.identityLevel = "LEVEL_1";
    user.requireFaceCheck = true;

    await user.save();

    await createNotification(
      user._id,
      "FACE_CHECK_REQUIRED",
      "Verificación facial requerida",
      "Tu solicitud KYC fue enviada. Ahora deberás completar la validación facial."
    );

    res.status(200).json({
      message: "Solicitud KYC enviada correctamente. Queda pendiente de revisión.",
      user: {
        id: user._id,
        email: user.email,
        verificationStatus: user.verificationStatus,
        identityLevel: user.identityLevel,
        isVerified: user.isVerified,
        trustScore: user.trustScore,
        requireFaceCheck: user.requireFaceCheck
      }
    });
  } catch (error) {
    res.status(500).json({
      message: "Error enviando solicitud KYC",
      error: error.message
    });
  }
};

const approveKyc = async (req, res) => {
  try {
    const { userId } = req.params;
    const { faceMatchScore } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    user.verificationStatus = "APPROVED";
    user.isVerified = true;
    user.identityLevel = "LEVEL_2";
    user.faceMatchScore = faceMatchScore || 95;
    user.trustScore = 90;
    user.verificationDate = new Date();
    user.status = "ACTIVE";

    await user.save();

    await createNotification(
      user._id,
      "KYC_APPROVED",
      "Identidad verificada",
      "Tu identidad fue aprobada correctamente. Ya tienes mayor nivel de confianza en Quick Secure Market."
    );

    res.json({
      message: "KYC aprobado correctamente",
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "Error aprobando KYC",
      error: error.message
    });
  }
};

const rejectKyc = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    user.verificationStatus = "REJECTED";
    user.isVerified = false;
    user.identityLevel = "LEVEL_0";
    user.trustScore = 30;

    await user.save();

    await createNotification(
      user._id,
      "KYC_REJECTED",
      "KYC rechazado",
      "Tu verificación de identidad fue rechazada. Revisa tus documentos y vuelve a intentarlo."
    );

    res.json({
      message: "KYC rechazado correctamente",
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "Error rechazando KYC",
      error: error.message
    });
  }
};

module.exports = {
  submitKyc,
  approveKyc,
  rejectKyc
};