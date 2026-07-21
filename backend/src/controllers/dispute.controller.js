const mongoose = require("mongoose");
const validator = require("validator");

const Dispute = require("../models/Dispute");
const Order = require("../models/Order");
const Payment = require("../models/Payment");

const {
  createNotification
} = require("../services/notification.service");

/*
|--------------------------------------------------------------------------
| Constantes
|--------------------------------------------------------------------------
*/

const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN"
];

const REVIEW_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "AUDITOR"
];

const FINAL_STATUSES = [
  "RESOLVED",
  "REFUNDED",
  "REJECTED",
  "CLOSED"
];

const ADMIN_WORKFLOW_STATUSES = [
  "OPEN",
  "WAITING_SELLER",
  "WAITING_BUYER",
  "WAITING_EVIDENCE",
  "WAITING_WAREHOUSE",
  "WAITING_QSM",
  "UNDER_REVIEW",
  "IN_REVIEW",
  "ESCALATED",
  "READY_TO_RESOLVE"
];

const USER_WORKFLOW_STATUSES = [
  "WAITING_SELLER",
  "WAITING_BUYER",
  "WAITING_EVIDENCE",
  "WAITING_QSM"
];

const ALLOWED_RESOLUTION_ACTIONS = [
  "REFUND_BUYER",
  "RELEASE_TO_SELLER",
  "REJECT_DISPUTE"
];

/*
|--------------------------------------------------------------------------
| Utilidades
|--------------------------------------------------------------------------
*/

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const sanitizeText = (
  value,
  maximumLength = 5000
) => {
  return validator
    .escape(
      String(value || "")
        .trim()
        .slice(0, maximumLength)
    );
};

const normalizeRole = (role) => {
  return String(role || "")
    .trim()
    .toUpperCase();
};

const getUserRole = (user) => {
  return normalizeRole(
    user?.role ||
      user?.systemRole ||
      user?.adminRole
  );
};

const isAdmin = (user) => {
  return ADMIN_ROLES.includes(
    getUserRole(user)
  );
};

const canReviewDisputes = (user) => {
  return REVIEW_ROLES.includes(
    getUserRole(user)
  );
};

const objectIdToString = (value) => {
  if (!value) {
    return "";
  }

  if (value._id) {
    return String(value._id);
  }

  return String(value);
};

const isDisputeParticipant = (
  dispute,
  userId
) => {
  const normalizedUserId =
    objectIdToString(userId);

  return (
    objectIdToString(dispute.buyer) ===
      normalizedUserId ||
    objectIdToString(dispute.seller) ===
      normalizedUserId
  );
};

const canAccessDispute = (
  dispute,
  user
) => {
  return (
    isDisputeParticipant(
      dispute,
      user?._id
    ) ||
    canReviewDisputes(user)
  );
};

const getParticipantRole = (
  dispute,
  user
) => {
  const userId = objectIdToString(
    user?._id
  );

  if (
    objectIdToString(dispute.buyer) ===
    userId
  ) {
    return "BUYER";
  }

  if (
    objectIdToString(dispute.seller) ===
    userId
  ) {
    return "SELLER";
  }

  const role = getUserRole(user);

  if (role === "AUDITOR") {
    return "AUDITOR";
  }

  if (role === "SENIOR_ADMIN") {
    return "SENIOR_ADMIN";
  }

  if (
    role === "ADMIN" ||
    role === "SUPER_ADMIN"
  ) {
    return "ADMIN";
  }

  return "SYSTEM";
};

const getOrderProtectedAmount = (
  order
) => {
  const candidates = [
    order?.totalAmount,
    order?.total,
    order?.amount,
    order?.subtotal,
    order?.price,
    order?.product?.price
  ];

  for (const candidate of candidates) {
    const amount = Number(candidate);

    if (
      Number.isFinite(amount) &&
      amount > 0
    ) {
      return amount;
    }
  }

  return 0;
};

const normalizeEvidence = (
  evidence,
  evidenceText
) => {
  let values = [];

  if (Array.isArray(evidence)) {
    values = evidence;
  } else if (
    typeof evidence === "string"
  ) {
    values = evidence
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (
    evidenceText &&
    typeof evidenceText === "string"
  ) {
    values.push(
      ...evidenceText
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    );
  }

  return [
    ...new Set(
      values
        .slice(0, 10)
        .map((item) =>
          sanitizeText(item, 2000)
        )
        .filter(Boolean)
    )
  ];
};

const getRequestMetadata = (req) => {
  const forwardedFor =
    req.headers["x-forwarded-for"];

  const ipAddress = Array.isArray(
    forwardedFor
  )
    ? forwardedFor[0]
    : String(
        forwardedFor ||
          req.ip ||
          req.socket?.remoteAddress ||
          ""
      )
        .split(",")[0]
        .trim();

  return {
    ipAddress,
    userAgent: sanitizeText(
      req.headers["user-agent"],
      1000
    )
  };
};

const addTimeline = (
  dispute,
  data
) => {
  if (
    typeof dispute.addTimelineEvent ===
    "function"
  ) {
    dispute.addTimelineEvent(data);
    return;
  }

  if (!Array.isArray(dispute.timeline)) {
    dispute.timeline = [];
  }

  dispute.timeline.push({
    type: data.type || "OTHER",
    title: data.title,
    description:
      data.description || "",
    performedBy:
      data.performedBy || null,
    performedByRole:
      data.performedByRole ||
      "SYSTEM",
    previousStatus:
      data.previousStatus || "",
    newStatus:
      data.newStatus || "",
    metadata:
      data.metadata || {},
    isInternal:
      Boolean(data.isInternal),
    occurredAt: new Date()
  });
};

const addAudit = (
  dispute,
  data
) => {
  if (
    typeof dispute.addAuditEntry ===
    "function"
  ) {
    dispute.addAuditEntry(data);
    return;
  }

  if (!Array.isArray(dispute.auditLog)) {
    dispute.auditLog = [];
  }

  dispute.auditLog.push({
    action: data.action,
    actor: data.actor || null,
    actorRole:
      data.actorRole || "SYSTEM",
    ipAddress:
      data.ipAddress || "",
    userAgent:
      data.userAgent || "",
    before:
      data.before || null,
    after:
      data.after || null,
    metadata:
      data.metadata || {},
    createdAt: new Date()
  });
};

const safeCreateNotification =
  async (
    userId,
    type,
    title,
    message
  ) => {
    if (!userId) {
      return;
    }

    try {
      await createNotification(
        userId,
        type,
        title,
        message
      );
    } catch (error) {
      console.error(
        "No se pudo crear la notificación:",
        error.message
      );
    }
  };

const emitUserEvent = (
  req,
  userId,
  eventName,
  payload
) => {
  try {
    const io = req.app.get("io");

    if (!io || !userId) {
      return;
    }

    io
      .to(`user:${userId}`)
      .emit(eventName, payload);
  } catch (error) {
    console.error(
      "No se pudo emitir evento Socket.IO:",
      error.message
    );
  }
};

const serializeDispute = (
  dispute,
  user
) => {
  const plainDispute =
    typeof dispute.toObject ===
    "function"
      ? dispute.toObject()
      : { ...dispute };

  if (!canReviewDisputes(user)) {
    delete plainDispute.auditLog;
    delete plainDispute.internalNotes;

    if (
      Array.isArray(
        plainDispute.timeline
      )
    ) {
      plainDispute.timeline =
        plainDispute.timeline.filter(
          (event) =>
            !event.isInternal
        );
    }

    if (
      Array.isArray(
        plainDispute.messages
      )
    ) {
      plainDispute.messages =
        plainDispute.messages.filter(
          (message) =>
            !message.isInternal
        );
    }
  }

  return plainDispute;
};

const populateDisputeQuery = (
  query
) => {
  return query
    .populate(
      "order"
    )
    .populate(
      "product",
      "title price category condition images seller"
    )
    .populate(
      "buyer",
      "firstName lastName email trustScore isVerified avatar"
    )
    .populate(
      "seller",
      "firstName lastName email trustScore isVerified avatar"
    )
    .populate(
      "assignedAdmin",
      "firstName lastName email role"
    )
    .populate(
      "messages.sender",
      "firstName lastName email avatar role"
    )
    .populate(
      "timeline.performedBy",
      "firstName lastName email role"
    );
};

/*
|--------------------------------------------------------------------------
| Crear disputa
|--------------------------------------------------------------------------
*/

const createDispute = async (
  req,
  res
) => {
  try {
    const {
      orderId,
      reason,
      description,
      details,
      evidence,
      evidenceText
    } = req.body;

    const normalizedDescription =
      sanitizeText(
        description || details,
        5000
      );

    const normalizedReason =
      sanitizeText(reason, 300);

    if (
      !orderId ||
      !normalizedReason ||
      !normalizedDescription
    ) {
      return res.status(400).json({
        success: false,
        message:
          "orderId, reason y description son obligatorios."
      });
    }

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la orden no es válido."
      });
    }

    const order = await Order.findById(
      orderId
    ).populate("product");

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "La orden indicada no fue encontrada."
      });
    }

    if (
      objectIdToString(order.buyer) !==
      objectIdToString(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Solo el comprador de la orden puede abrir una disputa."
      });
    }

    if (
      order.status === "COMPLETED" ||
      order.escrowStatus === "RELEASED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No puedes abrir una disputa sobre una orden completada."
      });
    }

    if (
      order.status === "CANCELLED" ||
      order.escrowStatus === "REFUNDED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No puedes abrir una disputa sobre una orden cancelada o reembolsada."
      });
    }

    const existingDispute =
      await Dispute.findOne({
        order: order._id,
        status: {
          $nin: FINAL_STATUSES
        }
      });

    if (existingDispute) {
      return res.status(409).json({
        success: false,
        message:
          "Esta orden ya tiene una disputa activa.",
        disputeId:
          existingDispute._id
      });
    }

    const safeEvidence =
      normalizeEvidence(
        evidence,
        evidenceText
      );

    const protectedAmount =
      getOrderProtectedAmount(order);

    const dispute =
      await Dispute.create({
        order: order._id,
        buyer: order.buyer,
        seller: order.seller,
        product:
          order.product?._id ||
          order.product,
        reason: normalizedReason,
        description:
          normalizedDescription,
        evidence: safeEvidence,
        status: "OPEN",
        priority: "MEDIUM",
        protectedAmount,
        currency:
          order.currency || "DOP",
        lastActivityAt:
          new Date()
      });

    const requestMetadata =
      getRequestMetadata(req);

    addAudit(dispute, {
      action: "DISPUTE_CREATED",
      actor: req.user._id,
      actorRole: "BUYER",
      ...requestMetadata,
      before: null,
      after: {
        status: "OPEN",
        order: order._id
      }
    });

    order.status = "DISPUTED";
    order.escrowStatus = "HELD";

    await Promise.all([
      dispute.save(),
      order.save()
    ]);

    await Promise.all([
      safeCreateNotification(
        order.seller,
        "DISPUTE_OPENED",
        "Disputa abierta",
        "El comprador abrió una disputa. El pago permanecerá retenido mientras QSM revisa el caso."
      ),

      safeCreateNotification(
        order.buyer,
        "DISPUTE_OPENED",
        "Disputa creada correctamente",
        "Tu disputa fue registrada y Quick Secure Market revisará el caso."
      )
    ]);

    emitUserEvent(
      req,
      order.seller,
      "dispute:created",
      {
        disputeId:
          dispute._id,
        orderId: order._id,
        status:
          dispute.status
      }
    );

    emitUserEvent(
      req,
      order.buyer,
      "dispute:created",
      {
        disputeId:
          dispute._id,
        orderId: order._id,
        status:
          dispute.status
      }
    );

    const populatedDispute =
      await populateDisputeQuery(
        Dispute.findById(
          dispute._id
        )
      );

    return res.status(201).json({
      success: true,
      message:
        "Disputa creada correctamente. El pago quedó retenido para revisión.",
      dispute:
        serializeDispute(
          populatedDispute,
          req.user
        )
    });
  } catch (error) {
    console.error(
      "Error creando disputa:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Ocurrió un error creando la disputa.",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Listar disputas del usuario
|--------------------------------------------------------------------------
*/

const getMyDisputes = async (
  req,
  res
) => {
  try {
    const {
      status,
      search,
      sort = "newest",
      page = 1,
      limit = 50
    } = req.query;

    const query = {
      $or: [
        {
          buyer:
            req.user._id
        },
        {
          seller:
            req.user._id
        }
      ],
      isArchived: {
        $ne: true
      }
    };

    if (
      status &&
      status !== "ALL"
    ) {
      query.status =
        normalizeRole(status);
    }

    const normalizedSearch =
      String(search || "")
        .trim()
        .slice(0, 100);

    if (normalizedSearch) {
      query.$and = [
        {
          $or: [
            {
              disputeCode: {
                $regex:
                  normalizedSearch,
                $options: "i"
              }
            },
            {
              reason: {
                $regex:
                  normalizedSearch,
                $options: "i"
              }
            },
            {
              description: {
                $regex:
                  normalizedSearch,
                $options: "i"
              }
            }
          ]
        }
      ];
    }

    const safePage = Math.max(
      Number(page) || 1,
      1
    );

    const safeLimit = Math.min(
      Math.max(
        Number(limit) || 50,
        1
      ),
      100
    );

    const sortOptions =
      sort === "oldest"
        ? { createdAt: 1 }
        : sort === "activity"
          ? {
              lastActivityAt: -1
            }
          : {
              createdAt: -1
            };

    const [
      disputes,
      total
    ] = await Promise.all([
      populateDisputeQuery(
        Dispute.find(query)
      )
        .sort(sortOptions)
        .skip(
          (safePage - 1) *
            safeLimit
        )
        .limit(safeLimit),

      Dispute.countDocuments(
        query
      )
    ]);

    return res.status(200).json({
      success: true,
      message:
        "Disputas obtenidas correctamente.",
      count:
        disputes.length,
      total,
      page:
        safePage,
      pages:
        Math.ceil(
          total / safeLimit
        ),
      disputes:
        disputes.map(
          (dispute) =>
            serializeDispute(
              dispute,
              req.user
            )
        )
    });
  } catch (error) {
    console.error(
      "Error obteniendo disputas:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Ocurrió un error obteniendo las disputas.",
      disputes: [],
      count: 0
    });
  }
};

/*
|--------------------------------------------------------------------------
| Resumen para Dashboard
|--------------------------------------------------------------------------
*/

const getDisputesSummary = async (
  req,
  res
) => {
  try {
    const match = canReviewDisputes(
      req.user
    )
      ? {
          isArchived: {
            $ne: true
          }
        }
      : {
          $or: [
            {
              buyer:
                req.user._id
            },
            {
              seller:
                req.user._id
            }
          ],
          isArchived: {
            $ne: true
          }
        };

    const disputes =
      await Dispute.find(match)
        .select(
          "status protectedAmount updatedAt createdAt"
        )
        .lean();

    const summary = {
      total:
        disputes.length,

      open: 0,

      review: 0,

      waitingEvidence: 0,

      resolved: 0,

      active: 0,

      protectedAmount: 0,

      lastUpdatedAt: null
    };

    for (const dispute of disputes) {
      const status =
        dispute.status;

      if (status === "OPEN") {
        summary.open += 1;
      }

      if (
        [
          "UNDER_REVIEW",
          "IN_REVIEW",
          "ESCALATED",
          "READY_TO_RESOLVE"
        ].includes(status)
      ) {
        summary.review += 1;
      }

      if (
        status ===
        "WAITING_EVIDENCE"
      ) {
        summary.waitingEvidence += 1;
      }

      if (
        FINAL_STATUSES.includes(
          status
        )
      ) {
        summary.resolved += 1;
      } else {
        summary.active += 1;

        summary.protectedAmount +=
          Number(
            dispute.protectedAmount
          ) || 0;
      }

      const activityDate =
        dispute.updatedAt ||
        dispute.createdAt;

      if (
        activityDate &&
        (
          !summary.lastUpdatedAt ||
          new Date(activityDate) >
            new Date(
              summary.lastUpdatedAt
            )
        )
      ) {
        summary.lastUpdatedAt =
          activityDate;
      }
    }

    return res.status(200).json({
      success: true,
      summary,

      // Compatibilidad directa con componentes
      total:
        summary.total,
      open:
        summary.open,
      review:
        summary.review,
      resolved:
        summary.resolved,
      active:
        summary.active,
      protectedAmount:
        summary.protectedAmount,
      lastUpdatedAt:
        summary.lastUpdatedAt
    });
  } catch (error) {
    console.error(
      "Error obteniendo resumen de disputas:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo obtener el resumen de disputas.",
      summary: {
        total: 0,
        open: 0,
        review: 0,
        waitingEvidence: 0,
        resolved: 0,
        active: 0,
        protectedAmount: 0,
        lastUpdatedAt: null
      }
    });
  }
};

/*
|--------------------------------------------------------------------------
| Obtener disputa por ID
|--------------------------------------------------------------------------
*/

const getDisputeById = async (
  req,
  res
) => {
  try {
    const {
      disputeId
    } = req.params;

    if (
      !isValidObjectId(
        disputeId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la disputa no es válido."
      });
    }

    const dispute =
      await populateDisputeQuery(
        Dispute.findById(
          disputeId
        )
      );

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message:
          "Disputa no encontrada."
      });
    }

    if (
      !canAccessDispute(
        dispute,
        req.user
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permiso para consultar esta disputa."
      });
    }

    return res.status(200).json({
      success: true,
      dispute:
        serializeDispute(
          dispute,
          req.user
        )
    });
  } catch (error) {
    console.error(
      "Error obteniendo disputa:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Ocurrió un error obteniendo la disputa."
    });
  }
};

/*
|--------------------------------------------------------------------------
| Agregar mensaje
|--------------------------------------------------------------------------
*/

const addDisputeMessage = async (
  req,
  res
) => {
  try {
    const {
      disputeId
    } = req.params;

    const {
      message,
      text,
      isInternal = false
    } = req.body;

    if (
      !isValidObjectId(
        disputeId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la disputa no es válido."
      });
    }

    const safeMessage =
      sanitizeText(
        message || text,
        5000
      );

    if (!safeMessage) {
      return res.status(400).json({
        success: false,
        message:
          "Debes escribir un mensaje."
      });
    }

    const dispute =
      await Dispute.findById(
        disputeId
      );

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message:
          "Disputa no encontrada."
      });
    }

    if (
      !canAccessDispute(
        dispute,
        req.user
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permiso para participar en esta disputa."
      });
    }

    if (
      FINAL_STATUSES.includes(
        dispute.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No se pueden enviar mensajes porque la disputa ya está cerrada."
      });
    }

    const senderRole =
      getParticipantRole(
        dispute,
        req.user
      );

    const internalMessage =
      Boolean(isInternal) &&
      canReviewDisputes(
        req.user
      );

    dispute.messages.push({
      sender:
        req.user._id,
      senderRole,
      message:
        safeMessage,
      type: "TEXT",
      attachments: [],
      isInternal:
        internalMessage,
      isSystemMessage:
        false,
      readBy: [
        {
          user:
            req.user._id,
          readAt:
            new Date()
        }
      ]
    });

    dispute.lastMessageAt =
      new Date();

    dispute.lastActivityAt =
      new Date();

    if (!internalMessage) {
      addTimeline(dispute, {
        type: "MESSAGE_SENT",
        title:
          "Nuevo mensaje",
        description:
          `${senderRole} agregó un mensaje al caso.`,
        performedBy:
          req.user._id,
        performedByRole:
          senderRole,
        newStatus:
          dispute.status
      });
    }

    const requestMetadata =
      getRequestMetadata(req);

    addAudit(dispute, {
      action:
        "DISPUTE_MESSAGE_SENT",
      actor:
        req.user._id,
      actorRole:
        senderRole,
      ...requestMetadata,
      metadata: {
        internal:
          internalMessage
      }
    });

    if (
      senderRole === "BUYER"
    ) {
      dispute.sellerUnreadCount =
        Number(
          dispute.sellerUnreadCount
        ) + 1;

      dispute.adminUnreadCount =
        Number(
          dispute.adminUnreadCount
        ) + 1;
    }

    if (
      senderRole === "SELLER"
    ) {
      dispute.buyerUnreadCount =
        Number(
          dispute.buyerUnreadCount
        ) + 1;

      dispute.adminUnreadCount =
        Number(
          dispute.adminUnreadCount
        ) + 1;
    }

    if (
      [
        "ADMIN",
        "SENIOR_ADMIN",
        "AUDITOR"
      ].includes(senderRole)
    ) {
      dispute.buyerUnreadCount =
        Number(
          dispute.buyerUnreadCount
        ) + 1;

      dispute.sellerUnreadCount =
        Number(
          dispute.sellerUnreadCount
        ) + 1;
    }

    await dispute.save();

    const lastMessage =
      dispute.messages[
        dispute.messages.length - 1
      ];

    if (!internalMessage) {
      const notificationPromises = [];

      if (
        senderRole !== "BUYER"
      ) {
        notificationPromises.push(
          safeCreateNotification(
            dispute.buyer,
            "DISPUTE_MESSAGE",
            "Nueva respuesta en tu disputa",
            "Se agregó un nuevo mensaje al caso."
          )
        );
      }

      if (
        senderRole !== "SELLER"
      ) {
        notificationPromises.push(
          safeCreateNotification(
            dispute.seller,
            "DISPUTE_MESSAGE",
            "Nueva respuesta en una disputa",
            "Se agregó un nuevo mensaje al caso."
          )
        );
      }

      await Promise.all(
        notificationPromises
      );

      emitUserEvent(
        req,
        dispute.buyer,
        "dispute:message",
        {
          disputeId:
            dispute._id,
          message:
            lastMessage
        }
      );

      emitUserEvent(
        req,
        dispute.seller,
        "dispute:message",
        {
          disputeId:
            dispute._id,
          message:
            lastMessage
        }
      );
    }

    return res.status(201).json({
      success: true,
      message:
        "Mensaje agregado correctamente.",
      disputeId:
        dispute._id,
      disputeMessage:
        lastMessage,
      data:
        lastMessage
    });
  } catch (error) {
    console.error(
      "Error agregando mensaje:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo agregar el mensaje."
    });
  }
};

/*
|--------------------------------------------------------------------------
| Cambiar estado de la disputa
|--------------------------------------------------------------------------
*/

const updateDisputeStatus = async (
  req,
  res
) => {
  try {
    const {
      disputeId
    } = req.params;

    const {
      status,
      note,
      reason
    } = req.body;

    if (
      !isValidObjectId(
        disputeId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la disputa no es válido."
      });
    }

    const normalizedStatus =
      normalizeRole(status);

    if (!normalizedStatus) {
      return res.status(400).json({
        success: false,
        message:
          "Debes indicar el nuevo estado."
      });
    }

    const dispute =
      await Dispute.findById(
        disputeId
      );

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message:
          "Disputa no encontrada."
      });
    }

    if (
      !canAccessDispute(
        dispute,
        req.user
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permiso para cambiar el estado de esta disputa."
      });
    }

    if (
      FINAL_STATUSES.includes(
        dispute.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Esta disputa ya fue resuelta o cerrada."
      });
    }

    const userIsAdmin =
      isAdmin(req.user);

    const allowedStatuses =
      userIsAdmin
        ? ADMIN_WORKFLOW_STATUSES
        : USER_WORKFLOW_STATUSES;

    if (
      !allowedStatuses.includes(
        normalizedStatus
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          userIsAdmin
            ? "El estado solicitado no forma parte del flujo administrativo."
            : "No tienes permiso para asignar ese estado."
      });
    }

    const previousStatus =
      dispute.status;

    if (
      previousStatus ===
      normalizedStatus
    ) {
      return res.status(200).json({
        success: true,
        message:
          "La disputa ya tiene ese estado.",
        dispute:
          serializeDispute(
            dispute,
            req.user
          )
      });
    }

    const performerRole =
      getParticipantRole(
        dispute,
        req.user
      );

    dispute.status =
      normalizedStatus;

    if (
      normalizedStatus ===
      "ESCALATED"
    ) {
      dispute.escalatedAt =
        new Date();
    }

    dispute.lastActivityAt =
      new Date();

    const safeNote =
      sanitizeText(
        note || reason,
        2000
      );

    addTimeline(dispute, {
      type:
        normalizedStatus ===
        "ESCALATED"
          ? "CASE_ESCALATED"
          : "STATUS_CHANGED",

      title:
        "Estado actualizado",

      description:
        safeNote ||
        `El estado cambió de ${previousStatus} a ${normalizedStatus}.`,

      performedBy:
        req.user._id,

      performedByRole:
        performerRole,

      previousStatus,

      newStatus:
        normalizedStatus
    });

    const requestMetadata =
      getRequestMetadata(req);

    addAudit(dispute, {
      action:
        "DISPUTE_STATUS_UPDATED",

      actor:
        req.user._id,

      actorRole:
        performerRole,

      ...requestMetadata,

      before: {
        status:
          previousStatus
      },

      after: {
        status:
          normalizedStatus
      }
    });

    await dispute.save();

    await Promise.all([
      safeCreateNotification(
        dispute.buyer,
        "DISPUTE_STATUS_UPDATED",
        "Estado de disputa actualizado",
        `El caso ahora se encuentra en estado ${normalizedStatus}.`
      ),

      safeCreateNotification(
        dispute.seller,
        "DISPUTE_STATUS_UPDATED",
        "Estado de disputa actualizado",
        `El caso ahora se encuentra en estado ${normalizedStatus}.`
      )
    ]);

    const eventPayload = {
      disputeId:
        dispute._id,
      previousStatus,
      status:
        normalizedStatus,
      updatedAt:
        new Date()
    };

    emitUserEvent(
      req,
      dispute.buyer,
      "dispute:status",
      eventPayload
    );

    emitUserEvent(
      req,
      dispute.seller,
      "dispute:status",
      eventPayload
    );

    return res.status(200).json({
      success: true,
      message:
        "Estado actualizado correctamente.",
      previousStatus,
      status:
        normalizedStatus,
      dispute:
        serializeDispute(
          dispute,
          req.user
        )
    });
  } catch (error) {
    console.error(
      "Error actualizando estado:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo actualizar el estado de la disputa."
    });
  }
};

/*
|--------------------------------------------------------------------------
| Obtener todas las disputas — Administración
|--------------------------------------------------------------------------
*/

const getAllDisputes = async (
  req,
  res
) => {
  try {
    const {
      status,
      priority,
      search,
      page = 1,
      limit = 50,
      sort = "newest"
    } = req.query;

    const query = {
      isArchived: {
        $ne: true
      }
    };

    if (
      status &&
      status !== "ALL"
    ) {
      query.status =
        normalizeRole(status);
    }

    if (
      priority &&
      priority !== "ALL"
    ) {
      query.priority =
        normalizeRole(priority);
    }

    const normalizedSearch =
      String(search || "")
        .trim()
        .slice(0, 100);

    if (normalizedSearch) {
      query.$or = [
        {
          disputeCode: {
            $regex:
              normalizedSearch,
            $options: "i"
          }
        },
        {
          reason: {
            $regex:
              normalizedSearch,
            $options: "i"
          }
        },
        {
          description: {
            $regex:
              normalizedSearch,
            $options: "i"
          }
        }
      ];
    }

    const safePage = Math.max(
      Number(page) || 1,
      1
    );

    const safeLimit = Math.min(
      Math.max(
        Number(limit) || 50,
        1
      ),
      100
    );

    const sortOptions =
      sort === "oldest"
        ? { createdAt: 1 }
        : sort === "priority"
          ? {
              priority: -1,
              createdAt: -1
            }
          : sort === "activity"
            ? {
                lastActivityAt: -1
              }
            : {
                createdAt: -1
              };

    const [
      disputes,
      total
    ] = await Promise.all([
      populateDisputeQuery(
        Dispute.find(query)
      )
        .sort(sortOptions)
        .skip(
          (safePage - 1) *
            safeLimit
        )
        .limit(safeLimit),

      Dispute.countDocuments(
        query
      )
    ]);

    return res.status(200).json({
      success: true,
      message:
        "Todas las disputas fueron obtenidas correctamente.",
      count:
        disputes.length,
      total,
      page:
        safePage,
      pages:
        Math.ceil(
          total / safeLimit
        ),
      disputes:
        disputes.map(
          (dispute) =>
            serializeDispute(
              dispute,
              req.user
            )
        )
    });
  } catch (error) {
    console.error(
      "Error obteniendo todas las disputas:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudieron obtener las disputas.",
      disputes: [],
      count: 0
    });
  }
};

/*
|--------------------------------------------------------------------------
| Resolver disputa — Administración
|--------------------------------------------------------------------------
*/

const resolveDispute = async (
  req,
  res
) => {
  try {
    const {
      disputeId
    } = req.params;

    const {
      action,
      adminNotes,
      decision
    } = req.body;

    if (
      !isValidObjectId(
        disputeId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la disputa no es válido."
      });
    }

    const normalizedAction =
      normalizeRole(action);

    if (
      !ALLOWED_RESOLUTION_ACTIONS.includes(
        normalizedAction
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La acción de resolución no es válida."
      });
    }

    const dispute =
      await Dispute.findById(
        disputeId
      );

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message:
          "Disputa no encontrada."
      });
    }

    if (
      FINAL_STATUSES.includes(
        dispute.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Esta disputa ya fue resuelta."
      });
    }

    const order =
      await Order.findById(
        dispute.order
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "La orden relacionada no fue encontrada."
      });
    }

    if (
      order.escrowStatus !==
      "HELD"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La orden no tiene fondos retenidos para resolver."
      });
    }

    const payment =
      await Payment.findOne({
        order:
          order._id
      });

    const previousStatus =
      dispute.status;

    let finalStatus = "";
    let notificationTitle = "";
    let buyerMessage = "";
    let sellerMessage = "";

    if (
      normalizedAction ===
      "REFUND_BUYER"
    ) {
      finalStatus = "REFUNDED";

      dispute.status =
        finalStatus;

      order.status =
        "CANCELLED";

      order.escrowStatus =
        "REFUNDED";

      if (
        payment &&
        payment.status === "HELD"
      ) {
        payment.status =
          "REFUNDED";

        payment.notes =
          "Pago reembolsado al comprador por resolución de disputa.";
      }

      notificationTitle =
        "Disputa resuelta a favor del comprador";

      buyerMessage =
        "Quick Secure Market aprobó el reembolso de la orden.";

      sellerMessage =
        "Quick Secure Market resolvió la disputa y aprobó el reembolso al comprador.";
    }

    if (
      normalizedAction ===
      "RELEASE_TO_SELLER"
    ) {
      finalStatus =
        "RESOLVED";

      dispute.status =
        finalStatus;

      order.status =
        "COMPLETED";

      order.escrowStatus =
        "RELEASED";

      if (
        payment &&
        payment.status === "HELD"
      ) {
        payment.status =
          "RELEASED";

        payment.notes =
          "Pago liberado al vendedor por resolución de disputa.";
      }

      notificationTitle =
        "Disputa resuelta a favor del vendedor";

      buyerMessage =
        "Quick Secure Market resolvió el caso y liberó el pago al vendedor.";

      sellerMessage =
        "Quick Secure Market liberó el pago de la orden a tu favor.";
    }

    if (
      normalizedAction ===
      "REJECT_DISPUTE"
    ) {
      finalStatus =
        "REJECTED";

      dispute.status =
        finalStatus;

      order.status =
        "COMPLETED";

      order.escrowStatus =
        "RELEASED";

      if (
        payment &&
        payment.status === "HELD"
      ) {
        payment.status =
          "RELEASED";

        payment.notes =
          "Pago liberado porque la disputa fue rechazada.";
      }

      notificationTitle =
        "Disputa rechazada";

      buyerMessage =
        "Quick Secure Market rechazó la disputa después de revisar el caso.";

      sellerMessage =
        "La disputa fue rechazada y el pago fue liberado a tu favor.";
    }

    const safeAdminNotes =
      sanitizeText(
        adminNotes || decision,
        5000
      );

    dispute.adminNotes =
      safeAdminNotes;

    dispute.resolvedAt =
      new Date();

    dispute.lastActivityAt =
      new Date();

    dispute.resolution = {
      action:
        normalizedAction,
      decision:
        safeAdminNotes,
      amount:
        Number(
          dispute.protectedAmount
        ) ||
        getOrderProtectedAmount(
          order
        ),
      currency:
        dispute.currency ||
        order.currency ||
        "DOP",
      resolvedBy:
        req.user._id,
      resolvedAt:
        new Date()
    };

    addTimeline(dispute, {
      type:
        "DISPUTE_RESOLVED",
      title:
        notificationTitle,
      description:
        safeAdminNotes ||
        "Quick Secure Market emitió una resolución final.",
      performedBy:
        req.user._id,
      performedByRole:
        getParticipantRole(
          dispute,
          req.user
        ),
      previousStatus,
      newStatus:
        finalStatus
    });

    if (
      finalStatus ===
      "REFUNDED"
    ) {
      addTimeline(dispute, {
        type:
          "PAYMENT_REFUNDED",
        title:
          "Pago reembolsado",
        description:
          "Los fondos fueron marcados para reembolso al comprador.",
        performedBy:
          req.user._id,
        performedByRole:
          "ADMIN",
        previousStatus,
        newStatus:
          finalStatus
      });
    } else {
      addTimeline(dispute, {
        type:
          "PAYMENT_RELEASED",
        title:
          "Pago liberado",
        description:
          "Los fondos fueron liberados al vendedor.",
        performedBy:
          req.user._id,
        performedByRole:
          "ADMIN",
        previousStatus,
        newStatus:
          finalStatus
      });
    }

    const requestMetadata =
      getRequestMetadata(req);

    addAudit(dispute, {
      action:
        "DISPUTE_RESOLVED",
      actor:
        req.user._id,
      actorRole:
        getParticipantRole(
          dispute,
          req.user
        ),
      ...requestMetadata,
      before: {
        status:
          previousStatus,
        orderStatus:
          "DISPUTED",
        escrowStatus:
          "HELD"
      },
      after: {
        status:
          finalStatus,
        orderStatus:
          order.status,
        escrowStatus:
          order.escrowStatus,
        paymentStatus:
          payment?.status ||
          null
      },
      metadata: {
        resolutionAction:
          normalizedAction
      }
    });

    const saveOperations = [
      dispute.save(),
      order.save()
    ];

    if (payment) {
      saveOperations.push(
        payment.save()
      );
    }

    await Promise.all(
      saveOperations
    );

    await Promise.all([
      safeCreateNotification(
        dispute.buyer,
        "DISPUTE_RESOLVED",
        notificationTitle,
        buyerMessage
      ),

      safeCreateNotification(
        dispute.seller,
        normalizedAction ===
          "REFUND_BUYER"
          ? "DISPUTE_RESOLVED"
          : "PAYMENT_RELEASED",
        notificationTitle,
        sellerMessage
      )
    ]);

    const socketPayload = {
      disputeId:
        dispute._id,
      action:
        normalizedAction,
      previousStatus,
      status:
        finalStatus,
      orderStatus:
        order.status,
      escrowStatus:
        order.escrowStatus
    };

    emitUserEvent(
      req,
      dispute.buyer,
      "dispute:resolved",
      socketPayload
    );

    emitUserEvent(
      req,
      dispute.seller,
      "dispute:resolved",
      socketPayload
    );

    const populatedDispute =
      await populateDisputeQuery(
        Dispute.findById(
          dispute._id
        )
      );

    return res.status(200).json({
      success: true,
      message:
        "Disputa resuelta correctamente.",
      action:
        normalizedAction,
      dispute:
        serializeDispute(
          populatedDispute,
          req.user
        ),
      order,
      payment:
        payment || null
    });
  } catch (error) {
    console.error(
      "Error resolviendo disputa:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Ocurrió un error resolviendo la disputa.",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Exportaciones
|--------------------------------------------------------------------------
*/

module.exports = {
  createDispute,
  getMyDisputes,
  getDisputeById,
  getDisputesSummary,
  getAllDisputes,
  addDisputeMessage,
  updateDisputeStatus,
  resolveDispute
};