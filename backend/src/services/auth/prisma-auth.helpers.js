const jwt = require("jsonwebtoken");
const prisma = require("../../utils/prisma");

const FACE_CHECK_INTERVAL_HOURS = 72;

const INTERNAL_ADMIN_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "SUPERVISOR",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_SUPERVISOR",
  "WAREHOUSE_STAFF",
  "DELIVERY_MANAGER",
  "DELIVERY_SUPERVISOR",
  "DELIVERY_AGENT",
  "FINANCE_MANAGER",
  "FINANCE_AGENT",
  "AUDITOR",
  "DISPUTE_MANAGER",
  "DISPUTE_AGENT",
  "VERIFICATION_MANAGER",
  "VERIFICATION_AGENT",
  "SECURITY_MANAGER",
  "SECURITY_ANALYST",
  "SUPPORT_MANAGER",
  "SUPPORT_AGENT",
  "MODERATION_MANAGER",
  "MODERATOR"
];

const normalizeUpper = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET no está definido."
    );
  }

  return jwt.sign(
    {
      id: user.id,
      legacyMongoId:
        user.legacyMongoId || null,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      passwordVersion: Number(
        user.passwordVersion || 0
      )
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN ||
        "1d"
    }
  );
};

const shouldRequirePeriodicFaceCheck = (
  user
) => {
  if (!user?.isVerified) {
    return false;
  }

  if (!user.lastFaceVerification) {
    return true;
  }

  const lastFaceTime =
    new Date(
      user.lastFaceVerification
    ).getTime();

  if (Number.isNaN(lastFaceTime)) {
    return true;
  }

  const elapsedHours =
    (Date.now() - lastFaceTime) /
    (1000 * 60 * 60);

  return (
    elapsedHours >=
    FACE_CHECK_INTERVAL_HOURS
  );
};

const buildSafeUserResponse = (
  user
) => {
  const status =
    normalizeUpper(
      user.status || "ACTIVE"
    );

  const verificationStatus =
    normalizeUpper(
      user.verificationStatus ||
        "NOT_STARTED"
    );

  return {
    id: user.id,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    fullName:
      `${user.firstName || ""} ${
        user.lastName || ""
      }`.trim(),
    email: user.email || "",
    phone: user.phone || "",
    profilePhoto:
      user.profilePhoto || "",
    role: user.role || "USER",
    accountType:
      user.accountType || "CUSTOMER",
    status,

    registrationCompleted:
      Boolean(
        user.registrationCompleted
      ),

    registrationCompletedAt:
      user.registrationCompletedAt ||
      null,

    onboardingStatus:
      user.onboardingStatus ||
      "COMPLETED",

    buyerEnabled:
      Boolean(user.buyerEnabled),
    sellerEnabled:
      Boolean(user.sellerEnabled),
    canBuy:
      status === "ACTIVE" &&
      user.buyerEnabled === true,
    canSell:
      status === "ACTIVE" &&
      user.sellerEnabled === true &&
      verificationStatus ===
        "APPROVED",
    isVerified:
      Boolean(user.isVerified),
    verificationStatus,
    identityLevel:
      user.identityLevel || "LEVEL_0",
    identitySubmittedAt:
      user.identitySubmittedAt || null,
    identityReviewedAt:
      user.identityReviewedAt || null,
    identityRejectionReason:
      user.identityRejectionReason || "",
    trustScore:
      Number(user.trustScore || 0),
    securityLevel:
      user.securityLevel || "NORMAL",
    requireFaceCheck:
      Boolean(user.requireFaceCheck),
    lastFaceVerification:
      user.lastFaceVerification || null,
    lastLoginAt:
      user.lastLoginAt || null,
    passwordChangedAt:
      user.passwordChangedAt || null,
    createdAt:
      user.createdAt || null
  };
};

const buildSafeAdminResponse = (
  user
) => {
  const role =
    normalizeUpper(user.role);

  const department =
    normalizeUpper(
      user.department ||
        "ADMINISTRATION"
    );

  return {
    id: user.id,
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    fullName:
      `${user.firstName || ""} ${
        user.lastName || ""
      }`.trim(),
    email: user.email || "",
    profilePhoto:
      user.profilePhoto || "",
    accountType:
      normalizeUpper(
        user.accountType || "INTERNAL"
      ),
    role,
    department,
    departments:
      role === "SUPER_ADMIN"
        ? [
            "ADMINISTRATION",
            "WAREHOUSE",
            "DELIVERY",
            "FINANCE",
            "AUDIT",
            "DISPUTES",
            "VERIFICATION",
            "SECURITY",
            "SUPPORT",
            "MODERATION"
          ]
        : user.departments || [],
    employeeCode:
      user.employeeCode || "",
    permissions:
      role === "SUPER_ADMIN"
        ? ["*"]
        : user.permissions || [],
    status:
      normalizeUpper(
        user.status || "ACTIVE"
      ),
    securityLevel:
      user.securityLevel || "NORMAL",
    mustChangePassword:
      Boolean(user.mustChangePassword),
    lastLoginAt:
      user.lastLoginAt || null,
    activeSessions:
      Number(user.activeSessions || 0)
  };
};

const resolveUserFromDecoded = async (
  decoded
) => {
  const idText =
    String(decoded?.id || "").trim();

  if (/^\d+$/.test(idText)) {
    const byId =
      await prisma.user.findUnique({
        where: {
          id: Number(idText)
        }
      });

    if (byId) {
      return byId;
    }
  }

  const legacyMongoId =
    String(
      decoded?.legacyMongoId ||
      (/^[a-f\d]{24}$/i.test(idText)
        ? idText
        : "")
    ).trim();

  if (legacyMongoId) {
    const byLegacy =
      await prisma.user.findUnique({
        where: {
          legacyMongoId
        }
      });

    if (byLegacy) {
      return byLegacy;
    }
  }

  const email =
    normalizeEmail(decoded?.email);

  if (email) {
    return prisma.user.findUnique({
      where: {
        email
      }
    });
  }

  return null;
};

const toRequestUser = (user) => {
  const {
    password,
    documentId,
    twoFactorSecret,
    resetPasswordToken,
    resetPasswordExpires,
    cedulaFront,
    cedulaFrontPublicId,
    cedulaBack,
    cedulaBackPublicId,
    selfie,
    selfiePublicId,
    dailyVerificationPhoto,
    profilePhotoPublicId,
    pendingProfilePhoto,
    pendingProfilePhotoPublicId,
    ...safeUser
  } = user;

  return {
    ...safeUser,
    _id:
      user.legacyMongoId ||
      String(user.id)
  };
};

module.exports = {
  INTERNAL_ADMIN_ROLES,
  normalizeUpper,
  normalizeEmail,
  generateToken,
  shouldRequirePeriodicFaceCheck,
  buildSafeUserResponse,
  buildSafeAdminResponse,
  resolveUserFromDecoded,
  toRequestUser
};