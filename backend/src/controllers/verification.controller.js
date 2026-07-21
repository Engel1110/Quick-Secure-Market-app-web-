import Verification from "../models/Verification.js";
import User from "../models/User.js";

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const VERIFICATION_UPLOAD_PATH = "/uploads/verification";

const ADMIN_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "VERIFICATION_AGENT",
  "VERIFICATION_MANAGER"
];

const MANAGER_ROLES = [
  "ADMIN",
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "VERIFICATION_MANAGER"
];

const VERIFICATION_FIELDS = {
  firstName: "firstNameReview",
  lastName: "lastNameReview",
  phone: "phoneReview",
  address: "addressReview",
  profilePhoto: "profilePhotoReview",
  documentFront: "documentFrontReview",
  documentBack: "documentBackReview",
  selfie: "selfieReview"
};

/* =========================================================
   FUNCIONES AUXILIARES
========================================================= */

const getUserId = (req) => {
  return req.user?.id || req.user?._id;
};

const fileUrl = (file) => {
  if (!file) return "";

  return `${VERIFICATION_UPLOAD_PATH}/${file.filename}`;
};

const isAdminUser = (user) => {
  if (!user) return false;

  if (user.isAdmin === true) return true;

  const role = String(user.role || "").toUpperCase();

  return ADMIN_ROLES.includes(role);
};

const isVerificationManager = (user) => {
  if (!user) return false;

  if (user.isAdmin === true) return true;

  const role = String(user.role || "").toUpperCase();

  return MANAGER_ROLES.includes(role);
};

const calculateTrustScore = (verification) => {
  let score = 50;

  if (verification.firstName && verification.lastName) {
    score += 5;
  }

  if (verification.phone) {
    score += 5;
  }

  if (verification.documentNumber) {
    score += 10;
  }

  if (
    verification.address &&
    verification.city &&
    verification.province
  ) {
    score += 10;
  }

  if (verification.profilePhotoUrl) {
    score += 5;
  }

  if (verification.documentFrontUrl) {
    score += 5;
  }

  if (verification.documentBackUrl) {
    score += 5;
  }

  if (verification.selfieUrl) {
    score += 10;
  }

  if (verification.status === "APPROVED") {
    score += 15;
  }

  return Math.min(score, 100);
};

const getVerificationOrFail = async (verificationId, res) => {
  const verification = await Verification.findById(verificationId);

  if (!verification) {
    res.status(404).json({
      success: false,
      message: "Verificación no encontrada."
    });

    return null;
  }

  return verification;
};

const getVerificationByUserOrCreate = async (userId, userData = {}) => {
  let verification = await Verification.findOne({
    user: userId
  });

  if (!verification) {
    verification = await Verification.create({
      user: userId,
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      phone: userData.phone || "",
      status: "NOT_STARTED"
    });
  }

  return verification;
};

const updateReviewStatus = ({
  verification,
  field,
  status,
  reviewerId,
  reason = ""
}) => {
  const reviewFieldName = VERIFICATION_FIELDS[field];

  if (!reviewFieldName) {
    return false;
  }

  if (!verification[reviewFieldName]) {
    verification[reviewFieldName] = {};
  }

  verification[reviewFieldName].status = status;
  verification[reviewFieldName].rejectionReason =
    status === "APPROVED" ? "" : String(reason || "").trim();

  verification[reviewFieldName].reviewedBy = reviewerId;
  verification[reviewFieldName].reviewedAt = new Date();

  return true;
};

const requiredReviewFieldsApproved = (verification) => {
  const requiredReviews = [
    verification.firstNameReview,
    verification.lastNameReview,
    verification.phoneReview,
    verification.addressReview,
    verification.profilePhotoReview,
    verification.documentFrontReview,
    verification.documentBackReview,
    verification.selfieReview
  ];

  return requiredReviews.every(
    (review) => review?.status === "APPROVED"
  );
};

const syncVerificationStatusWithUser = async ({
  userId,
  verificationStatus,
  trustScore,
  isVerified = false,
  sellerEnabled
}) => {
  const update = {
    verificationStatus,
    trustScore,
    isVerified
  };

  if (typeof sellerEnabled === "boolean") {
    update.sellerEnabled = sellerEnabled;
  }

  return User.findByIdAndUpdate(userId, update, {
    new: true
  });
};

/* =========================================================
   USUARIO
========================================================= */

/**
 * GET /api/verifications/me
 */
export const getMyVerification = async (req, res) => {
  try {
    const userId = getUserId(req);

    const verification = await getVerificationByUserOrCreate(
      userId,
      req.user
    );

    await verification.populate(
      "user",
      "firstName lastName email trustScore isVerified verificationStatus"
    );

    return res.status(200).json({
      success: true,
      verification
    });
  } catch (error) {
    console.error("getMyVerification error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo obtener la verificación."
    });
  }
};

/**
 * PUT /api/verifications/me/draft
 */
export const saveVerificationDraft = async (req, res) => {
  try {
    const userId = getUserId(req);

    const verification = await getVerificationByUserOrCreate(
      userId,
      req.user
    );

    if (
      verification.status === "APPROVED" ||
      verification.status === "UNDER_REVIEW"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No puedes editar esta verificación en su estado actual."
      });
    }

    const editableFields = [
      "firstName",
      "lastName",
      "phone",
      "documentType",
      "documentNumber",
      "address",
      "city",
      "province",
      "country",
      "gender",
      "birthDate"
    ];

    editableFields.forEach((field) => {
      if (
        Object.prototype.hasOwnProperty.call(req.body, field) &&
        req.body[field] !== undefined
      ) {
        verification[field] = req.body[field];
      }
    });

    if (!verification.status) {
      verification.status = "NOT_STARTED";
    }

    verification.trustScore = calculateTrustScore(verification);

    await verification.save();

    return res.status(200).json({
      success: true,
      message: "Borrador guardado correctamente.",
      verification
    });
  } catch (error) {
    console.error("saveVerificationDraft error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo guardar el borrador."
    });
  }
};

/**
 * POST /api/verifications/me/submit
 */
export const submitVerification = async (req, res) => {
  try {
    const userId = getUserId(req);

    const {
      firstName,
      lastName,
      phone,
      documentType,
      documentNumber,
      address,
      city,
      province,
      country,
      gender,
      birthDate
    } = req.body;

    const files = req.files || {};

    const verification = await getVerificationByUserOrCreate(
      userId,
      req.user
    );

    if (
      verification.status === "UNDER_REVIEW" ||
      verification.status === "APPROVED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Esta verificación no puede enviarse nuevamente en su estado actual."
      });
    }

    verification.firstName =
      firstName ?? verification.firstName;

    verification.lastName =
      lastName ?? verification.lastName;

    verification.phone =
      phone ?? verification.phone;

    verification.documentType =
      documentType ?? verification.documentType;

    verification.documentNumber =
      documentNumber ?? verification.documentNumber;

    verification.address =
      address ?? verification.address;

    verification.city =
      city ?? verification.city;

    verification.province =
      province ?? verification.province;

    verification.country =
      country ?? verification.country;

    verification.gender =
      gender ?? verification.gender;

    verification.birthDate =
      birthDate ?? verification.birthDate;

    if (files.profilePhoto?.[0]) {
      verification.profilePhotoUrl = fileUrl(
        files.profilePhoto[0]
      );

      if (verification.profilePhotoReview) {
        verification.profilePhotoReview.status = "PENDING";
        verification.profilePhotoReview.submittedAt = new Date();
        verification.profilePhotoReview.rejectionReason = "";
      }
    }

    if (files.documentFront?.[0]) {
      verification.documentFrontUrl = fileUrl(
        files.documentFront[0]
      );

      if (verification.documentFrontReview) {
        verification.documentFrontReview.status = "PENDING";
        verification.documentFrontReview.submittedAt = new Date();
        verification.documentFrontReview.rejectionReason = "";
      }
    }

    if (files.documentBack?.[0]) {
      verification.documentBackUrl = fileUrl(
        files.documentBack[0]
      );

      if (verification.documentBackReview) {
        verification.documentBackReview.status = "PENDING";
        verification.documentBackReview.submittedAt = new Date();
        verification.documentBackReview.rejectionReason = "";
      }
    }

    if (files.selfie?.[0]) {
      verification.selfieUrl = fileUrl(files.selfie[0]);

      if (verification.selfieReview) {
        verification.selfieReview.status = "PENDING";
        verification.selfieReview.submittedAt = new Date();
        verification.selfieReview.rejectionReason = "";
      }
    }

    const requiredFields = [
      verification.firstName,
      verification.lastName,
      verification.phone,
      verification.documentType,
      verification.documentNumber,
      verification.address,
      verification.city,
      verification.province,
      verification.profilePhotoUrl,
      verification.documentFrontUrl,
      verification.documentBackUrl,
      verification.selfieUrl
    ];

    const missingRequiredData = requiredFields.some(
      (value) => !value
    );

    if (missingRequiredData) {
      return res.status(400).json({
        success: false,
        message:
          "Debes completar todos los datos y documentos requeridos."
      });
    }

    if (typeof verification.submit === "function") {
      verification.submit();
    } else {
      verification.status = "PENDING_REVIEW";
      verification.submittedAt = new Date();
      verification.rejectionReason = "";
    }

    verification.trustScore = calculateTrustScore(verification);

    await verification.save();

    const user = await User.findById(userId);

    if (user) {
      user.firstName = verification.firstName;
      user.lastName = verification.lastName;
      user.phone = verification.phone;
      user.verificationStatus = verification.status;
      user.trustScore = verification.trustScore;
      user.isVerified = false;
      user.sellerEnabled = false;

      if (verification.profilePhotoUrl) {
        user.pendingProfilePhoto =
          verification.profilePhotoUrl;

        user.profilePhotoStatus = "PENDING";
        user.profilePhotoRejectedReason = "";
      }

      await user.save();
    }

    return res.status(201).json({
      success: true,
      message: "Verificación enviada correctamente.",
      verification
    });
  } catch (error) {
    console.error("submitVerification error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo enviar la verificación."
    });
  }
};

/**
 * POST /api/verifications/me/resubmit
 */
export const resubmitVerification = async (req, res) => {
  try {
    const userId = getUserId(req);

    const verification = await Verification.findOne({
      user: userId
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "No existe una verificación para reenviar."
      });
    }

    const allowedStatuses = [
      "REJECTED",
      "RESUBMISSION_REQUIRED"
    ];

    if (!allowedStatuses.includes(verification.status)) {
      return res.status(400).json({
        success: false,
        message:
          "Esta verificación no requiere un nuevo envío."
      });
    }

    req.params = req.params || {};

    return submitVerification(req, res);
  } catch (error) {
    console.error("resubmitVerification error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo reenviar la verificación."
    });
  }
};

/* =========================================================
   SUBIDA INDIVIDUAL DE ARCHIVOS
========================================================= */

export const uploadProfilePhoto = async (req, res) => {
  try {
    const userId = getUserId(req);
    const file = req.file || req.files?.profilePhoto?.[0];

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Debes seleccionar una foto de perfil."
      });
    }

    const verification = await getVerificationByUserOrCreate(
      userId,
      req.user
    );

    verification.profilePhotoUrl = fileUrl(file);

    if (verification.profilePhotoReview) {
      verification.profilePhotoReview.status = "PENDING";
      verification.profilePhotoReview.submittedAt = new Date();
      verification.profilePhotoReview.rejectionReason = "";
    }

    verification.trustScore = calculateTrustScore(verification);

    await verification.save();

    await User.findByIdAndUpdate(userId, {
      pendingProfilePhoto: verification.profilePhotoUrl,
      profilePhotoStatus: "PENDING",
      profilePhotoRejectedReason: ""
    });

    return res.status(200).json({
      success: true,
      message: "Foto de perfil subida correctamente.",
      verification
    });
  } catch (error) {
    console.error("uploadProfilePhoto error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo subir la foto de perfil."
    });
  }
};

export const uploadDocumentFront = async (req, res) => {
  try {
    const userId = getUserId(req);
    const file = req.file || req.files?.documentFront?.[0];

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Debes seleccionar el documento frontal."
      });
    }

    const verification = await getVerificationByUserOrCreate(
      userId,
      req.user
    );

    verification.documentFrontUrl = fileUrl(file);

    if (verification.documentFrontReview) {
      verification.documentFrontReview.status = "PENDING";
      verification.documentFrontReview.submittedAt = new Date();
      verification.documentFrontReview.rejectionReason = "";
    }

    verification.trustScore = calculateTrustScore(verification);

    await verification.save();

    return res.status(200).json({
      success: true,
      message: "Documento frontal subido correctamente.",
      verification
    });
  } catch (error) {
    console.error("uploadDocumentFront error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo subir el documento frontal."
    });
  }
};

export const uploadDocumentBack = async (req, res) => {
  try {
    const userId = getUserId(req);
    const file = req.file || req.files?.documentBack?.[0];

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Debes seleccionar el documento trasero."
      });
    }

    const verification = await getVerificationByUserOrCreate(
      userId,
      req.user
    );

    verification.documentBackUrl = fileUrl(file);

    if (verification.documentBackReview) {
      verification.documentBackReview.status = "PENDING";
      verification.documentBackReview.submittedAt = new Date();
      verification.documentBackReview.rejectionReason = "";
    }

    verification.trustScore = calculateTrustScore(verification);

    await verification.save();

    return res.status(200).json({
      success: true,
      message: "Documento trasero subido correctamente.",
      verification
    });
  } catch (error) {
    console.error("uploadDocumentBack error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo subir el documento trasero."
    });
  }
};

export const uploadSelfie = async (req, res) => {
  try {
    const userId = getUserId(req);
    const file = req.file || req.files?.selfie?.[0];

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Debes seleccionar una selfie."
      });
    }

    const verification = await getVerificationByUserOrCreate(
      userId,
      req.user
    );

    verification.selfieUrl = fileUrl(file);

    if (verification.selfieReview) {
      verification.selfieReview.status = "PENDING";
      verification.selfieReview.submittedAt = new Date();
      verification.selfieReview.rejectionReason = "";
    }

    verification.trustScore = calculateTrustScore(verification);

    await verification.save();

    return res.status(200).json({
      success: true,
      message: "Selfie subida correctamente.",
      verification
    });
  } catch (error) {
    console.error("uploadSelfie error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo subir la selfie."
    });
  }
};

/* =========================================================
   COMPROBACIÓN FACIAL PERIÓDICA
========================================================= */

export const dailyCheck = async (req, res) => {
  try {
    const userId = getUserId(req);

    const verification = await Verification.findOne({
      user: userId
    });

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Primero debes iniciar tu verificación."
      });
    }

    if (verification.status !== "APPROVED") {
      return res.status(400).json({
        success: false,
        message:
          "Debes tener la identidad aprobada para realizar esta validación."
      });
    }

    const checkData = {
      checkedAt: new Date(),
      status: "PASSED",
      score: req.body?.score ?? null,
      notes: req.body?.notes || ""
    };

    if (typeof verification.recordDailyCheck === "function") {
      verification.recordDailyCheck(checkData);
    } else {
      verification.lastDailyCheck = new Date();

      if (!Array.isArray(verification.dailyChecks)) {
        verification.dailyChecks = [];
      }

      verification.dailyChecks.push(checkData);
    }

    verification.trustScore = Math.min(
      (verification.trustScore || 50) + 1,
      100
    );

    await verification.save();

    await User.findByIdAndUpdate(userId, {
      trustScore: verification.trustScore,
      lastFaceVerification: new Date(),
      requireFaceCheck: false
    });

    return res.status(200).json({
      success: true,
      message: "Validación facial completada correctamente.",
      verification
    });
  } catch (error) {
    console.error("dailyCheck error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo completar la validación facial."
    });
  }
};

/* =========================================================
   BACKOFFICE
========================================================= */

/**
 * GET /api/admin/verifications
 */
export const getAllVerifications = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para ver las verificaciones."
      });
    }

    const {
      status,
      search,
      documentType,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (documentType) {
      filter.documentType = documentType;
    }

    if (search) {
      const regex = new RegExp(search, "i");

      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { documentNumber: regex },
        { phone: regex }
      ];
    }

    const currentPage = Math.max(Number(page) || 1, 1);
    const pageLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const skip = (currentPage - 1) * pageLimit;

    const [verifications, total] = await Promise.all([
      Verification.find(filter)
        .populate("user", "firstName lastName email role")
        .populate(
          "reviewedBy",
          "firstName lastName email role"
        )
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),

      Verification.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: currentPage,
      pages: Math.ceil(total / pageLimit),
      verifications
    });
  } catch (error) {
    console.error("getAllVerifications error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudieron obtener las verificaciones."
    });
  }
};

/**
 * GET /api/admin/verifications/stats
 */
export const getVerificationStats = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "No tienes permisos para ver estadísticas."
      });
    }

    const groupedStatuses = await Verification.aggregate([
      {
        $group: {
          _id: "$status",
          total: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      NOT_STARTED: 0,
      PENDING: 0,
      PENDING_REVIEW: 0,
      UNDER_REVIEW: 0,
      APPROVED: 0,
      REJECTED: 0,
      RESUBMISSION_REQUIRED: 0
    };

    groupedStatuses.forEach((item) => {
      if (item._id) {
        stats[item._id] = item.total;
      }
    });

    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("getVerificationStats error:", error);

    return res.status(500).json({
      success: false,
      message:
        "No se pudieron obtener las estadísticas de verificación."
    });
  }
};

/**
 * GET /api/admin/verifications/:id
 */
export const getVerificationById = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para ver esta verificación."
      });
    }

    const verification = await Verification.findById(
      req.params.id
    )
      .populate(
        "user",
        "firstName lastName email phone role trustScore isVerified verificationStatus"
      )
      .populate(
        "reviewedBy",
        "firstName lastName email role"
      );

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verificación no encontrada."
      });
    }

    return res.status(200).json({
      success: true,
      verification
    });
  } catch (error) {
    console.error("getVerificationById error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo obtener la verificación."
    });
  }
};

/**
 * PUT /api/admin/verifications/:id/start-review
 */
export const startVerificationReview = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para iniciar esta revisión."
      });
    }

    const reviewerId = getUserId(req);

    const verification = await getVerificationOrFail(
      req.params.id,
      res
    );

    if (!verification) return;

    if (verification.status === "APPROVED") {
      return res.status(400).json({
        success: false,
        message:
          "Una verificación aprobada no puede iniciarse nuevamente."
      });
    }

    if (typeof verification.startReview === "function") {
      verification.startReview(reviewerId);
    } else {
      verification.status = "UNDER_REVIEW";
      verification.reviewedBy = reviewerId;
      verification.reviewStartedAt = new Date();
    }

    await verification.save();

    await syncVerificationStatusWithUser({
      userId: verification.user,
      verificationStatus: "UNDER_REVIEW",
      trustScore: verification.trustScore,
      isVerified: false,
      sellerEnabled: false
    });

    return res.status(200).json({
      success: true,
      message: "Revisión iniciada correctamente.",
      verification
    });
  } catch (error) {
    console.error("startVerificationReview error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo iniciar la revisión."
    });
  }
};

/* =========================================================
   REVISIÓN DE CAMPOS
========================================================= */

export const approveVerificationField = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para aprobar campos."
      });
    }

    const { field } = req.params;
    const reviewerId = getUserId(req);

    if (!VERIFICATION_FIELDS[field]) {
      return res.status(400).json({
        success: false,
        message: "Campo de verificación inválido."
      });
    }

    const verification = await getVerificationOrFail(
      req.params.id,
      res
    );

    if (!verification) return;

    updateReviewStatus({
      verification,
      field,
      status: "APPROVED",
      reviewerId
    });

    if (
      verification.status === "PENDING_REVIEW" ||
      verification.status === "PENDING"
    ) {
      verification.status = "UNDER_REVIEW";
    }

    await verification.save();

    return res.status(200).json({
      success: true,
      message: "Campo aprobado correctamente.",
      field,
      verification
    });
  } catch (error) {
    console.error("approveVerificationField error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo aprobar el campo."
    });
  }
};

export const rejectVerificationField = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para rechazar campos."
      });
    }

    const { field } = req.params;
    const reviewerId = getUserId(req);
    const reason = String(req.body?.reason || "").trim();

    if (!VERIFICATION_FIELDS[field]) {
      return res.status(400).json({
        success: false,
        message: "Campo de verificación inválido."
      });
    }

    if (!reason) {
      return res.status(400).json({
        success: false,
        message:
          "Debes indicar el motivo del rechazo."
      });
    }

    const verification = await getVerificationOrFail(
      req.params.id,
      res
    );

    if (!verification) return;

    updateReviewStatus({
      verification,
      field,
      status: "REJECTED",
      reviewerId,
      reason
    });

    verification.status = "RESUBMISSION_REQUIRED";
    verification.rejectionReason = reason;

    await verification.save();

    const user = await User.findById(verification.user);

    if (user) {
      if (
        typeof user.requestIdentityResubmission === "function"
      ) {
        user.requestIdentityResubmission(
          reviewerId,
          reason
        );
      } else {
        user.verificationStatus =
          "RESUBMISSION_REQUIRED";

        user.isVerified = false;
        user.sellerEnabled = false;
      }

      if (field === "profilePhoto") {
        user.profilePhotoStatus =
          "RESUBMISSION_REQUIRED";

        user.profilePhotoRejectedReason = reason;
        user.profilePhotoApprovedAt = null;
        user.profilePhotoApprovedBy = null;
      }

      await user.save();
    }

    return res.status(200).json({
      success: true,
      message:
        "Campo rechazado. Se solicitó una corrección al usuario.",
      field,
      verification
    });
  } catch (error) {
    console.error("rejectVerificationField error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo rechazar el campo."
    });
  }
};

/* =========================================================
   APROBACIÓN GENERAL
========================================================= */

export const approveVerification = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para aprobar verificaciones."
      });
    }

    const reviewerId = getUserId(req);
    const notes = String(req.body?.notes || "").trim();

    const verification = await getVerificationOrFail(
      req.params.id,
      res
    );

    if (!verification) return;

    if (!requiredReviewFieldsApproved(verification)) {
      return res.status(400).json({
        success: false,
        message:
          "No se puede aprobar. Existen campos pendientes o rechazados."
      });
    }

    if (typeof verification.approve === "function") {
      verification.approve(reviewerId, notes);
    } else {
      verification.status = "APPROVED";
      verification.rejectionReason = "";
      verification.reviewedBy = reviewerId;
      verification.reviewedAt = new Date();
      verification.approvedAt = new Date();
    }

    verification.trustScore = calculateTrustScore(verification);

    const user = await User.findById(verification.user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "El usuario relacionado con esta verificación no existe."
      });
    }

    user.firstName = verification.firstName;
    user.lastName = verification.lastName;
    user.phone = verification.phone;

    if (verification.address !== undefined) {
      user.address = verification.address;
    }

    if (verification.city !== undefined) {
      user.city = verification.city;
    }

    if (verification.province !== undefined) {
      user.province = verification.province;
    }

    if (verification.country !== undefined) {
      user.country = verification.country;
    }

    if (verification.gender !== undefined) {
      user.gender = verification.gender;
    }

    if (verification.birthDate !== undefined) {
      user.birthDate = verification.birthDate;
    }

    if (verification.documentType !== undefined) {
      user.documentType = verification.documentType;
    }

    if (verification.documentNumber !== undefined) {
      user.documentNumber =
        verification.documentNumber;
    }

    if (verification.profilePhotoUrl) {
      user.pendingProfilePhoto =
        verification.profilePhotoUrl;
    }

    if (typeof user.enableSeller === "function") {
      user.enableSeller(reviewerId, notes);
    } else {
      user.verificationStatus = "APPROVED";
      user.isVerified = true;
      user.sellerEnabled = true;
      user.identityApprovedAt = new Date();
      user.identityApprovedBy = reviewerId;

      if (user.pendingProfilePhoto) {
        user.profilePhoto = user.pendingProfilePhoto;
        user.pendingProfilePhoto = "";
      }

      user.profilePhotoStatus = "APPROVED";
      user.profilePhotoRejectedReason = "";
      user.profilePhotoApprovedAt = new Date();
      user.profilePhotoApprovedBy = reviewerId;
    }

    user.trustScore = verification.trustScore;

    await verification.save();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Verificación aprobada correctamente.",
      verification,
      user
    });
  } catch (error) {
    console.error("approveVerification error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo aprobar la verificación."
    });
  }
};

export const rejectVerification = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para rechazar verificaciones."
      });
    }

    const reviewerId = getUserId(req);
    const reason = String(req.body?.reason || "").trim();

    if (!reason) {
      return res.status(400).json({
        success: false,
        message:
          "Debes indicar el motivo del rechazo."
      });
    }

    const verification = await getVerificationOrFail(
      req.params.id,
      res
    );

    if (!verification) return;

    if (typeof verification.reject === "function") {
      verification.reject(reviewerId, reason);
    } else {
      verification.status = "REJECTED";
      verification.rejectionReason = reason;
      verification.reviewedBy = reviewerId;
      verification.reviewedAt = new Date();
    }

    verification.trustScore = calculateTrustScore(verification);

    const user = await User.findById(verification.user);

    if (user) {
      if (typeof user.rejectIdentity === "function") {
        user.rejectIdentity(reviewerId, reason);
      } else {
        user.verificationStatus = "REJECTED";
        user.isVerified = false;
        user.sellerEnabled = false;
        user.identityRejectionReason = reason;
      }

      user.trustScore = verification.trustScore;

      await user.save();
    }

    await verification.save();

    return res.status(200).json({
      success: true,
      message: "Verificación rechazada correctamente.",
      verification
    });
  } catch (error) {
    console.error("rejectVerification error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo rechazar la verificación."
    });
  }
};

export const requestVerificationResubmission = async (
  req,
  res
) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permisos para solicitar correcciones."
      });
    }

    const reviewerId = getUserId(req);
    const reason = String(req.body?.reason || "").trim();

    if (!reason) {
      return res.status(400).json({
        success: false,
        message:
          "Debes indicar qué debe corregir el usuario."
      });
    }

    const verification = await getVerificationOrFail(
      req.params.id,
      res
    );

    if (!verification) return;

    if (
      typeof verification.requestResubmission === "function"
    ) {
      verification.requestResubmission(
        reviewerId,
        reason
      );
    } else {
      verification.status = "RESUBMISSION_REQUIRED";
      verification.rejectionReason = reason;
      verification.reviewedBy = reviewerId;
      verification.reviewedAt = new Date();
    }

    const user = await User.findById(verification.user);

    if (user) {
      if (
        typeof user.requestIdentityResubmission === "function"
      ) {
        user.requestIdentityResubmission(
          reviewerId,
          reason
        );
      } else {
        user.verificationStatus =
          "RESUBMISSION_REQUIRED";

        user.isVerified = false;
        user.sellerEnabled = false;
        user.identityRejectionReason = reason;
      }

      await user.save();
    }

    await verification.save();

    return res.status(200).json({
      success: true,
      message:
        "Se solicitó correctamente el reenvío de información.",
      verification
    });
  } catch (error) {
    console.error(
      "requestVerificationResubmission error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo solicitar el reenvío de información."
    });
  }
};

/* =========================================================
   COMPATIBILIDAD CON LA RUTA ANTERIOR
========================================================= */

/**
 * Conserva compatibilidad con el frontend anterior.
 * PUT /api/verifications/:id/review
 */
export const reviewVerification = async (req, res) => {
  const { status } = req.body;

  if (status === "APPROVED") {
    return approveVerification(req, res);
  }

  if (status === "REJECTED") {
    req.body.reason =
      req.body.reason ||
      req.body.rejectionReason;

    return rejectVerification(req, res);
  }

  if (
    status === "RESUBMISSION_REQUIRED" ||
    status === "NEEDS_REVIEW"
  ) {
    req.body.reason =
      req.body.reason ||
      req.body.rejectionReason;

    return requestVerificationResubmission(req, res);
  }

  return res.status(400).json({
    success: false,
    message: "Estado de revisión inválido."
  });
};

/* =========================================================
   REABRIR VERIFICACIÓN
========================================================= */

export const reopenVerification = async (req, res) => {
  try {
    if (!isVerificationManager(req.user)) {
      return res.status(403).json({
        success: false,
        message:
          "Solo un administrador superior puede reabrir verificaciones."
      });
    }

    const reason = String(req.body?.reason || "").trim();
    const reviewerId = getUserId(req);

    if (!reason) {
      return res.status(400).json({
        success: false,
        message:
          "Debes indicar el motivo para reabrir la verificación."
      });
    }

    const verification = await getVerificationOrFail(
      req.params.id,
      res
    );

    if (!verification) return;

    verification.status = "UNDER_REVIEW";
    verification.rejectionReason = reason;
    verification.reviewedBy = reviewerId;
    verification.reviewStartedAt = new Date();
    verification.reviewedAt = null;
    verification.approvedAt = null;

    await verification.save();

    await syncVerificationStatusWithUser({
      userId: verification.user,
      verificationStatus: "UNDER_REVIEW",
      trustScore: verification.trustScore,
      isVerified: false,
      sellerEnabled: false
    });

    return res.status(200).json({
      success: true,
      message: "Verificación reabierta correctamente.",
      verification
    });
  } catch (error) {
    console.error("reopenVerification error:", error);

    return res.status(500).json({
      success: false,
      message: "No se pudo reabrir la verificación."
    });
  }
};