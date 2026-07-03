import path from "path";
import Verification from "../models/Verification.js";
import User from "../models/User.js";

const fileUrl = (file) => {
  if (!file) return "";
  return `/uploads/verification/${file.filename}`;
};

const calculateTrustScore = (verification) => {
  let score = 50;

  if (verification.firstName && verification.lastName) score += 5;
  if (verification.phone) score += 5;
  if (verification.documentNumber) score += 10;
  if (verification.address && verification.city && verification.province) score += 10;
  if (verification.documentFrontUrl) score += 5;
  if (verification.documentBackUrl) score += 5;
  if (verification.selfieUrl) score += 10;
  if (verification.status === "APPROVED") score += 15;

  return Math.min(score, 100);
};

export const getMyVerification = async (req, res) => {
  const userId = req.user.id || req.user._id;

  let verification = await Verification.findOne({ user: userId }).populate(
    "user",
    "firstName lastName email trustScore isVerified verificationStatus"
  );

  if (!verification) {
    verification = await Verification.create({
      user: userId,
      firstName: req.user.firstName || "",
      lastName: req.user.lastName || "",
      phone: req.user.phone || "",
      status: "NOT_SUBMITTED"
    });
  }

  res.json({ verification });
};

export const submitVerification = async (req, res) => {
  const userId = req.user.id || req.user._id;

  const {
    firstName,
    lastName,
    phone,
    documentType,
    documentNumber,
    address,
    city,
    province,
    gender,
    birthDate
  } = req.body;

  const files = req.files || {};

  let verification = await Verification.findOne({ user: userId });

  if (!verification) {
    verification = new Verification({ user: userId });
  }

  verification.firstName = firstName || verification.firstName;
  verification.lastName = lastName || verification.lastName;
  verification.phone = phone || verification.phone;
  verification.documentType = documentType || verification.documentType;
  verification.documentNumber = documentNumber || verification.documentNumber;
  verification.address = address || verification.address;
  verification.city = city || verification.city;
  verification.province = province || verification.province;
  verification.gender = gender || verification.gender;
  verification.birthDate = birthDate || verification.birthDate;

  if (files.documentFront?.[0]) {
    verification.documentFrontUrl = fileUrl(files.documentFront[0]);
  }

  if (files.documentBack?.[0]) {
    verification.documentBackUrl = fileUrl(files.documentBack[0]);
  }

  if (files.selfie?.[0]) {
    verification.selfieUrl = fileUrl(files.selfie[0]);
  }

  verification.status = "PENDING";
  verification.trustScore = calculateTrustScore(verification);

  await verification.save();

  await User.findByIdAndUpdate(userId, {
    firstName: verification.firstName,
    lastName: verification.lastName,
    phone: verification.phone,
    verificationStatus: verification.status,
    trustScore: verification.trustScore,
    isVerified: false
  });

  res.status(201).json({
    message: "Verificación enviada correctamente.",
    verification
  });
};

export const dailyCheck = async (req, res) => {
  const userId = req.user.id || req.user._id;

  const verification = await Verification.findOne({ user: userId });

  if (!verification) {
    return res.status(404).json({
      message: "Primero debes iniciar tu verificación."
    });
  }

  verification.lastDailyCheck = new Date();
  verification.dailyChecks.push({
    checkedAt: new Date(),
    status: "PASSED"
  });

  verification.trustScore = Math.min((verification.trustScore || 50) + 1, 100);

  await verification.save();

  await User.findByIdAndUpdate(userId, {
    trustScore: verification.trustScore
  });

  res.json({
    message: "Validación diaria completada.",
    verification
  });
};

export const getAllVerifications = async (req, res) => {
  const isAdmin = req.user.role === "ADMIN" || req.user.isAdmin;

  if (!isAdmin) {
    return res.status(403).json({
      message: "Solo un administrador puede ver todas las verificaciones."
    });
  }

  const verifications = await Verification.find()
    .populate("user", "firstName lastName email")
    .sort({ createdAt: -1 });

  res.json({ verifications });
};

export const reviewVerification = async (req, res) => {
  const isAdmin = req.user.role === "ADMIN" || req.user.isAdmin;
  const { status, rejectionReason } = req.body;

  if (!isAdmin) {
    return res.status(403).json({
      message: "Solo un administrador puede aprobar o rechazar verificaciones."
    });
  }

  const validStatuses = ["APPROVED", "REJECTED", "NEEDS_REVIEW"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message: "Estado inválido."
    });
  }

  const verification = await Verification.findById(req.params.id);

  if (!verification) {
    return res.status(404).json({
      message: "Verificación no encontrada."
    });
  }

  verification.status = status;
  verification.rejectionReason = rejectionReason || "";
  verification.reviewedBy = req.user.id || req.user._id;
  verification.reviewedAt = new Date();
  verification.trustScore = calculateTrustScore(verification);

  await verification.save();

  await User.findByIdAndUpdate(verification.user, {
    verificationStatus: status,
    isVerified: status === "APPROVED",
    trustScore: verification.trustScore
  });

  res.json({
    message: "Verificación revisada correctamente.",
    verification
  });
};
