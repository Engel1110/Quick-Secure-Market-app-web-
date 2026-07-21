const mongoose = require("mongoose");

const Message = require("../../models/Message");

const ALLOWED_MESSAGE_TYPES = [
  "TEXT",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "PDF",
  "LOCATION",
  "FILE",
  "SYSTEM"
];

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};

const sanitizeText = (value = "") => {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(/\0/g, "")
    .trim();
};

const normalizeAttachments = (
  attachments = []
) => {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .filter(
      (attachment) =>
        attachment &&
        typeof attachment === "object"
    )
    .map((attachment) => {
      const type = String(
        attachment.type || "FILE"
      ).toUpperCase();

      return {
        name: sanitizeText(
          attachment.name ||
          attachment.filename ||
          "Archivo adjunto"
        ),

        url: sanitizeText(
          attachment.url ||
          attachment.path ||
          ""
        ),

        mimeType: sanitizeText(
          attachment.mimeType ||
          attachment.mimetype ||
          ""
        ),

        size: Number(
          attachment.size || 0
        ),

        type:
          ALLOWED_MESSAGE_TYPES.includes(
            type
          ) &&
          type !== "TEXT" &&
          type !== "LOCATION" &&
          type !== "SYSTEM"
            ? type
            : "FILE"
      };
    })
    .filter(
      (attachment) =>
        attachment.url ||
        attachment.name
    );
};

const toggleObjectIdInArray = (
  values = [],
  objectId
) => {
  const normalizedValues =
    Array.isArray(values)
      ? values
      : [];

  const exists =
    normalizedValues.some(
      (value) =>
        String(value) ===
        String(objectId)
    );

  if (exists) {
    return normalizedValues.filter(
      (value) =>
        String(value) !==
        String(objectId)
    );
  }

  return [
    ...normalizedValues,
    objectId
  ];
};

const populateMessage = async (
  messageId
) => {
  return Message.findById(
    messageId
  )
    .populate(
      "sender",
      "firstName lastName name email"
    )
    .populate(
      "receiver",
      "firstName lastName name email"
    )
    .populate("replyTo")
    .populate(
      "product",
      "title name price images"
    )
    .populate("order");
};

const getUserId = (req) => {
  return (
    req?.user?._id ||
    req?.user?.id ||
    req?.userId ||
    null
  );
};

const sendError = (
  res,
  error,
  fallbackMessage =
    "Error procesando la solicitud"
) => {
  const statusCode = Number(
    error?.statusCode ||
    error?.status ||
    500
  );

  const finalStatusCode =
    Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode <= 599
      ? statusCode
      : 500;

  return res
    .status(finalStatusCode)
    .json({
      success: false,

      message:
        error?.message ||
        fallbackMessage,

      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error?.stack
    });
};

module.exports = {
  ALLOWED_MESSAGE_TYPES,
  isValidObjectId,
  sanitizeText,
  normalizeAttachments,
  toggleObjectIdInArray,
  populateMessage,
  getUserId,
  sendError
};