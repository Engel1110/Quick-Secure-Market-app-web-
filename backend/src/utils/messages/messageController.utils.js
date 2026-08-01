"use strict";

const {
  prisma,
  parsePositiveInt
} = require(
  "../../utils/prismaCompat"
);

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

const isValidObjectId = (
  value
) =>
  Boolean(
    parsePositiveInt(value)
  );

const sanitizeText = (
  value = ""
) =>
  value === null ||
  value === undefined
    ? ""
    : String(value)
        .replace(/\0/g, "")
        .trim();

function normalizeAttachments(
  attachments = []
) {
  if (
    !Array.isArray(
      attachments
    )
  ) {
    return [];
  }

  return attachments
    .filter(
      (attachment) =>
        attachment &&
        typeof attachment ===
          "object"
    )
    .map((attachment) => {
      const type =
        String(
          attachment.type ||
          "FILE"
        ).toUpperCase();

      const storageRef =
        sanitizeText(
          attachment.storageRef ||
          (
            String(
              attachment.url ||
              attachment.path ||
              ""
            ).startsWith(
              "qsm-private://"
            )
              ? (
                  attachment.url ||
                  attachment.path
                )
              : ""
          )
        );

      const url =
        storageRef ||
        sanitizeText(
          attachment.url ||
          attachment.path ||
          ""
        );

      const normalized = {
        name:
          sanitizeText(
            attachment.name ||
            attachment.filename ||
            "Archivo adjunto"
          ),
        url,
        mimeType:
          sanitizeText(
            attachment.mimeType ||
            attachment.mimetype ||
            ""
          ),
        size:
          Number(
            attachment.size ||
            0
          ),
        type:
          ALLOWED_MESSAGE_TYPES.includes(
            type
          ) &&
          ![
            "TEXT",
            "LOCATION",
            "SYSTEM"
          ].includes(type)
            ? type
            : "FILE"
      };

      if (storageRef) {
        normalized.storageRef =
          storageRef;
      }

      if (
        attachment.storagePath
      ) {
        normalized.storagePath =
          sanitizeText(
            attachment.storagePath
          );
      }

      if (attachment.bucket) {
        normalized.bucket =
          sanitizeText(
            attachment.bucket
          );
      }

      return normalized;
    })
    .filter(
      (attachment) =>
        attachment.url ||
        attachment.name
    );
}

function toggleObjectIdInArray(
  values = [],
  objectId
) {
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

  return exists
    ? normalizedValues.filter(
        (value) =>
          String(value) !==
          String(objectId)
      )
    : [
        ...normalizedValues,
        objectId
      ];
}

function serializeMessage(
  message
) {
  if (!message) {
    return null;
  }

  return {
    ...message,
    _id:
      String(message.id),
    conversation:
      String(
        message.conversationId
      ),
    sender:
      message.sender
        ? {
            ...message.sender,
            _id:
              String(
                message.sender.id
              )
          }
        : String(
            message.senderId
          ),
    receiver:
      message.receiver
        ? {
            ...message.receiver,
            _id:
              String(
                message.receiver.id
              )
          }
        : String(
            message.receiverId
          ),
    replyTo:
      message.replyTo
        ? serializeMessage(
            message.replyTo
          )
        : null,
    product:
      message.product
        ? {
            ...message.product,
            _id:
              String(
                message.product.id
              )
          }
        : message.productId,
    order:
      message.order
        ? {
            ...message.order,
            _id:
              String(
                message.order.id
              )
          }
        : message.orderId
  };
}

async function populateMessage(
  messageId
) {
  const id =
    parsePositiveInt(
      messageId
    );

  if (!id) {
    return null;
  }

  const message =
    await prisma.message.findUnique({
      where: {
        id
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            receiver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            images: true
          }
        },
        order: true
      }
    });

  return serializeMessage(
    message
  );
}

const getUserId = (
  req
) =>
  req?.prismaUser?.id ||
  parsePositiveInt(
    req?.user?.id ??
    req?.user?._id ??
    req?.userId
  );

function sendError(
  res,
  error,
  fallbackMessage =
    "Error procesando la solicitud"
) {
  const statusCode =
    Number(
      error?.statusCode ||
      error?.status ||
      500
    );

  const finalStatusCode =
    Number.isInteger(
      statusCode
    ) &&
    statusCode >= 400 &&
    statusCode <= 599
      ? statusCode
      : 500;

  return res
    .status(finalStatusCode)
    .json({
      success: false,
      message:
      finalStatusCode >= 500 &&
      process.env.NODE_ENV === "production"
        ? fallbackMessage
        : error?.message || fallbackMessage,
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error?.stack
    });
}

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