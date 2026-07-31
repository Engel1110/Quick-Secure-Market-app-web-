const crypto = require("crypto");
const prisma = require("../utils/prisma");

/*
|--------------------------------------------------------------------------
| Roles y estados
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

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  trustScore: true,
  isVerified: true,
  status: true
};

const PRODUCT_SELECT = {
  id: true,
  title: true,
  description: true,
  price: true,
  category: true,
  condition: true,
  images: true,
  imageUrl: true,
  status: true,
  sellerId: true,
  location: true
};

const ORDER_SELECT = {
  id: true,
  orderCode: true,
  productId: true,
  buyerId: true,
  sellerId: true,
  price: true,
  protectionFee: true,
  shippingFee: true,
  totalAmount: true,
  reserveFee: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  escrowStatus: true,
  deliveryMethod: true,
  deliveryStatus: true,
  warehouseStatus: true,
  createdAt: true,
  updatedAt: true
};

const DISPUTE_INCLUDE = {
  order: {
    select: ORDER_SELECT
  },
  product: {
    select: PRODUCT_SELECT
  },
  buyer: {
    select: USER_SELECT
  },
  seller: {
    select: USER_SELECT
  },
  assignedAdmin: {
    select: USER_SELECT
  },
  assignedWarehouseUser: {
    select: USER_SELECT
  }
};

/*
|--------------------------------------------------------------------------
| Utilidades generales
|--------------------------------------------------------------------------
*/

const parsePositiveInt = (value) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const normalizeRole = (role) => {
  return String(role || "")
    .trim()
    .toUpperCase();
};

const sanitizeText = (
  value,
  maximumLength = 5000
) => {
  return String(value || "")
    .trim()
    .slice(0, maximumLength);
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
    values = evidence.split(/\r?\n|,/);
  }

  if (
    typeof evidenceText === "string"
  ) {
    values.push(
      ...evidenceText.split(/\r?\n/)
    );
  }

  return [
    ...new Set(
      values
        .map((item) =>
          sanitizeText(item, 2000)
        )
        .filter(Boolean)
        .slice(0, 10)
    )
  ];
};

const safeJsonArray = (value) => {
  return Array.isArray(value)
    ? [...value]
    : [];
};

const safeJsonObject = (value) => {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? { ...value }
    : {};
};

const isAdmin = (user) => {
  return ADMIN_ROLES.includes(
    normalizeRole(user?.role)
  );
};

const canReviewDisputes = (user) => {
  return REVIEW_ROLES.includes(
    normalizeRole(user?.role)
  );
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

const getProtectedAmount = (order) => {
  const candidates = [
    order?.totalAmount,
    order?.price
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

const createDisputeCode = () => {
  return `QSM-DSP-${Date.now()
    .toString()
    .slice(-8)}-${crypto
    .randomInt(100, 1000)}`;
};

/*
|--------------------------------------------------------------------------
| Puente temporal MongoDB Auth -> Prisma
|--------------------------------------------------------------------------
*/

const resolvePrismaUser = async (req) => {
  const possibleIds = [
    req.user?.id,
    req.user?.userId,
    req.user?._id
  ];

  for (const possibleId of possibleIds) {
    const numericId =
      parsePositiveInt(possibleId);

    if (numericId) {
      const user =
        await prisma.user.findUnique({
          where: {
            id: numericId
          }
        });

      if (user) {
        return user;
      }
    }
  }

  const email = String(
    req.user?.email || ""
  )
    .trim()
    .toLowerCase();

  if (!email) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      email
    }
  });
};

/*
|--------------------------------------------------------------------------
| Timeline, auditoría y mensajes JSON
|--------------------------------------------------------------------------
*/

const addTimeline = (
  timeline,
  data
) => {
  const result =
    safeJsonArray(timeline);

  result.push({
    id: crypto.randomUUID(),
    type:
      data.type || "OTHER",
    title:
      data.title || "Actividad",
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
    occurredAt:
      new Date().toISOString()
  });

  return result;
};

const addAudit = (
  auditLog,
  data
) => {
  const result =
    safeJsonArray(auditLog);

  result.push({
    id: crypto.randomUUID(),
    action:
      data.action,
    actor:
      data.actor || null,
    actorRole:
      data.actorRole ||
      "SYSTEM",
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
    createdAt:
      new Date().toISOString()
  });

  return result;
};

const getParticipantRole = (
  dispute,
  user
) => {
  if (
    dispute.buyerId ===
    user.id
  ) {
    return "BUYER";
  }

  if (
    dispute.sellerId ===
    user.id
  ) {
    return "SELLER";
  }

  const role =
    normalizeRole(user.role);

  if (role === "AUDITOR") {
    return "AUDITOR";
  }

  if (
    role === "SENIOR_ADMIN"
  ) {
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

/*
|--------------------------------------------------------------------------
| Permisos
|--------------------------------------------------------------------------
*/

const isDisputeParticipant = (
  dispute,
  userId
) => {
  return (
    dispute.buyerId === userId ||
    dispute.sellerId === userId
  );
};

const canAccessDispute = (
  dispute,
  user
) => {
  return (
    isDisputeParticipant(
      dispute,
      user.id
    ) ||
    canReviewDisputes(user)
  );
};

/*
|--------------------------------------------------------------------------
| Notificaciones y Socket.IO
|--------------------------------------------------------------------------
*/

const createNotificationSafe =
  async (
    client,
    userId,
    type,
    title,
    message
  ) => {
    if (!userId) {
      return;
    }

    try {
      await client.notification.create({
        data: {
          userId,
          title,
          message:
            type
              ? `[${type}] ${message}`
              : message,
          read: false
        }
      });
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
    const io =
      req.app.get("io");

    if (!io || !userId) {
      return;
    }

    io
      .to(`user:${userId}`)
      .emit(
        eventName,
        payload
      );
  } catch (error) {
    console.error(
      "No se pudo emitir evento Socket.IO:",
      error.message
    );
  }
};

/*
|--------------------------------------------------------------------------
| Serialización compatible con el frontend
|--------------------------------------------------------------------------
*/

const serializeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    ...user,
    _id: String(user.id)
  };
};

const serializeProduct = (
  product
) => {
  if (!product) {
    return null;
  }

  return {
    ...product,
    _id: String(product.id)
  };
};

const serializeOrder = (order) => {
  if (!order) {
    return null;
  }

  return {
    ...order,
    _id: String(order.id),
    total:
      Number(order.totalAmount || 0)
  };
};

const hydrateMessages = async (
  messages
) => {
  const safeMessages =
    safeJsonArray(messages);

  const senderIds = [
    ...new Set(
      safeMessages
        .map((message) =>
          parsePositiveInt(
            message.senderId ??
            message.sender
          )
        )
        .filter(Boolean)
    )
  ];

  const users = senderIds.length
    ? await prisma.user.findMany({
        where: {
          id: {
            in: senderIds
          }
        },
        select: USER_SELECT
      })
    : [];

  const userMap = new Map(
    users.map((user) => [
      user.id,
      user
    ])
  );

  return safeMessages.map(
    (message) => {
      const senderId =
        parsePositiveInt(
          message.senderId ??
          message.sender
        );

      const sender =
        senderId
          ? userMap.get(senderId)
          : null;

      return {
        ...message,
        _id:
          message._id ||
          message.id ||
          crypto.randomUUID(),
        senderId:
          senderId || null,
        sender:
          sender
            ? serializeUser(sender)
            : senderId,
        text:
          message.text ||
          message.message ||
          "",
        message:
          message.message ||
          message.text ||
          "",
        createdAt:
          message.createdAt ||
          new Date().toISOString()
      };
    }
  );
};

const serializeDispute =
  async (
    dispute,
    requestUser
  ) => {
    if (!dispute) {
      return null;
    }

    const reviewer =
      canReviewDisputes(
        requestUser
      );

    const timeline =
      safeJsonArray(
        dispute.timeline
      ).filter(
        (event) =>
          reviewer ||
          !event?.isInternal
      );

    const messages =
      await hydrateMessages(
        safeJsonArray(
          dispute.messages
        ).filter(
          (message) =>
            reviewer ||
            !message?.isInternal
        )
      );

    const serialized = {
      ...dispute,
      _id:
        String(dispute.id),
      disputeId:
        dispute.id,
      order:
        serializeOrder(
          dispute.order
        ),
      product:
        serializeProduct(
          dispute.product
        ),
      buyer:
        serializeUser(
          dispute.buyer
        ),
      seller:
        serializeUser(
          dispute.seller
        ),
      assignedAdmin:
        serializeUser(
          dispute.assignedAdmin
        ),
      assignedWarehouseUser:
        serializeUser(
          dispute.assignedWarehouseUser
        ),
      details:
        dispute.description,
      evidenceText:
        Array.isArray(
          dispute.evidence
        )
          ? dispute.evidence.join(
              "\n"
            )
          : "",
      escrowAmount:
        Number(
          dispute.protectedAmount ||
          0
        ),
      timeline,
      messages,
      resolution:
        dispute.resolutionData &&
        Object.keys(
          safeJsonObject(
            dispute.resolutionData
          )
        ).length
          ? dispute.resolutionData
          : dispute.resolution
    };

    if (!reviewer) {
      delete serialized.auditLog;
      delete serialized.internalNotes;
      delete serialized.adminNotes;
    }

    return serialized;
  };

/*
|--------------------------------------------------------------------------
| Consulta completa
|--------------------------------------------------------------------------
*/

const getDisputeRecord = async (
  disputeId,
  client = prisma
) => {
  return client.dispute.findUnique({
    where: {
      id: disputeId
    },
    include:
      DISPUTE_INCLUDE
  });
};

/*
|--------------------------------------------------------------------------
| Manejo de errores
|--------------------------------------------------------------------------
*/

const handleError = (
  res,
  error,
  message
) => {
  console.error(message, error);

  if (
    error?.code === "P2002"
  ) {
    return res.status(409).json({
      success: false,
      message:
        "Ya existe una disputa para esta orden."
    });
  }

  if (
    error?.code === "P2025"
  ) {
    return res.status(404).json({
      success: false,
      message:
        "La disputa solicitada no fue encontrada."
    });
  }

  return res.status(500).json({
    success: false,
    message,
    error:
      process.env.NODE_ENV ===
      "production"
        ? undefined
        : error.message
  });
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
    } = req.body || {};

    const numericOrderId =
      parsePositiveInt(orderId);

    const normalizedReason =
      sanitizeText(reason, 300);

    const normalizedDescription =
      sanitizeText(
        description || details,
        5000
      );

    if (
      !numericOrderId ||
      !normalizedReason ||
      !normalizedDescription
    ) {
      return res.status(400).json({
        success: false,
        message:
          "orderId, reason y description son obligatorios."
      });
    }

    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "Tu usuario autenticado todavía no existe en Supabase."
      });
    }

    const order =
      await prisma.order.findUnique({
        where: {
          id: numericOrderId
        },
        include: {
          product: {
            select:
              PRODUCT_SELECT
          }
        }
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "La orden indicada no fue encontrada."
      });
    }

    if (
      order.buyerId !==
      prismaUser.id
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Solo el comprador de la orden puede abrir una disputa."
      });
    }

    if (
      order.status ===
        "COMPLETED" ||
      order.escrowStatus ===
        "RELEASED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No puedes abrir una disputa sobre una orden completada."
      });
    }

    if (
      order.status ===
        "CANCELLED" ||
      order.escrowStatus ===
        "REFUNDED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No puedes abrir una disputa sobre una orden cancelada o reembolsada."
      });
    }

    const existingDispute =
      await prisma.dispute.findUnique({
        where: {
          orderId:
            numericOrderId
        },
        select: {
          id: true,
          status: true
        }
      });

    if (existingDispute) {
      return res.status(409).json({
        success: false,
        message:
          "Esta orden ya tiene una disputa registrada.",
        disputeId:
          existingDispute.id
      });
    }

    const safeEvidence =
      normalizeEvidence(
        evidence,
        evidenceText
      );

    const now =
      new Date();

    let timeline = [];

    timeline = addTimeline(
      timeline,
      {
        type:
          "DISPUTE_CREATED",
        title:
          "Disputa creada",
        description:
          "El comprador abrió una disputa y QSM retuvo el pago para revisión.",
        performedBy:
          prismaUser.id,
        performedByRole:
          "BUYER",
        newStatus:
          "OPEN"
      }
    );

    timeline = addTimeline(
      timeline,
      {
        type:
          "PAYMENT_HELD",
        title:
          "Pago retenido",
        description:
          "Los fondos de la orden quedaron protegidos mientras se revisa el caso.",
        performedBy:
          null,
        performedByRole:
          "SYSTEM",
        newStatus:
          "OPEN"
      }
    );

    const requestMetadata =
      getRequestMetadata(req);

    const auditLog =
      addAudit(
        [],
        {
          action:
            "DISPUTE_CREATED",
          actor:
            prismaUser.id,
          actorRole:
            "BUYER",
          ...requestMetadata,
          before:
            null,
          after: {
            status:
              "OPEN",
            orderId:
              numericOrderId
          }
        }
      );

    const createdId =
      await prisma.$transaction(
        async (tx) => {
          const created =
            await tx.dispute.create({
              data: {
                disputeCode:
                  createDisputeCode(),
                orderId:
                  numericOrderId,
                productId:
                  order.productId,
                buyerId:
                  order.buyerId,
                sellerId:
                  order.sellerId,
                reason:
                  normalizedReason,
                description:
                  normalizedDescription,
                evidence:
                  safeEvidence,
                status:
                  "OPEN",
                priority:
                  "MEDIUM",
                protectedAmount:
                  getProtectedAmount(
                    order
                  ),
                currency:
                  "DOP",
                lastActivityAt:
                  now,
                timeline,
                auditLog
              }
            });

          await tx.order.update({
            where: {
              id:
                numericOrderId
            },
            data: {
              status:
                "DISPUTED",
              escrowStatus:
                "HELD",
              disputeReason:
                normalizedReason,
              disputeOpenedById:
                prismaUser.id,
              disputeOpenedAt:
                now
            }
          });

          await createNotificationSafe(
            tx,
            order.sellerId,
            "DISPUTE_OPENED",
            "Disputa abierta",
            "El comprador abrió una disputa. El pago permanecerá retenido mientras QSM revisa el caso."
          );

          await createNotificationSafe(
            tx,
            order.buyerId,
            "DISPUTE_OPENED",
            "Disputa creada correctamente",
            "Tu disputa fue registrada y Quick Secure Market revisará el caso."
          );

          return created.id;
        },
        {
          maxWait:
            20000,
          timeout:
            60000
        }
      );

    const populatedDispute =
      await getDisputeRecord(
        createdId
      );

    emitUserEvent(
      req,
      order.sellerId,
      "dispute:created",
      {
        disputeId:
          createdId,
        orderId:
          numericOrderId,
        status:
          "OPEN"
      }
    );

    emitUserEvent(
      req,
      order.buyerId,
      "dispute:created",
      {
        disputeId:
          createdId,
        orderId:
          numericOrderId,
        status:
          "OPEN"
      }
    );

    return res.status(201).json({
      success: true,
      message:
        "Disputa creada correctamente. El pago quedó retenido para revisión.",
      dispute:
        await serializeDispute(
          populatedDispute,
          prismaUser
        )
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Ocurrió un error creando la disputa."
    );
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
    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "Tu usuario autenticado todavía no existe en Supabase.",
        disputes: [],
        count: 0
      });
    }

    const {
      status,
      search,
      sort = "newest",
      page = 1,
      limit = 50
    } = req.query || {};

    const safePage =
      Math.max(
        Number(page) || 1,
        1
      );

    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) || 50,
          1
        ),
        100
      );

    const where = {
      isArchived:
        false,
      OR: [
        {
          buyerId:
            prismaUser.id
        },
        {
          sellerId:
            prismaUser.id
        }
      ]
    };

    if (
      status &&
      normalizeRole(status) !==
      "ALL"
    ) {
      where.status =
        normalizeRole(status);
    }

    const normalizedSearch =
      sanitizeText(
        search,
        100
      );

    if (normalizedSearch) {
      where.AND = [
        {
          OR: [
            {
              disputeCode: {
                contains:
                  normalizedSearch,
                mode:
                  "insensitive"
              }
            },
            {
              reason: {
                contains:
                  normalizedSearch,
                mode:
                  "insensitive"
              }
            },
            {
              description: {
                contains:
                  normalizedSearch,
                mode:
                  "insensitive"
              }
            }
          ]
        }
      ];
    }

    let orderBy = {
      createdAt:
        "desc"
    };

    if (sort === "oldest") {
      orderBy = {
        createdAt:
          "asc"
      };
    }

    if (sort === "activity") {
      orderBy = {
        lastActivityAt:
          "desc"
      };
    }

    const [
      disputes,
      total
    ] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include:
          DISPUTE_INCLUDE,
        orderBy,
        skip:
          (safePage - 1) *
          safeLimit,
        take:
          safeLimit
      }),

      prisma.dispute.count({
        where
      })
    ]);

    const serialized =
      await Promise.all(
        disputes.map(
          (dispute) =>
            serializeDispute(
              dispute,
              prismaUser
            )
        )
      );

    return res.status(200).json({
      success: true,
      message:
        "Disputas obtenidas correctamente.",
      count:
        serialized.length,
      total,
      page:
        safePage,
      pages:
        Math.ceil(
          total / safeLimit
        ),
      disputes:
        serialized
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Ocurrió un error obteniendo las disputas."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Resumen
|--------------------------------------------------------------------------
*/

const getDisputesSummary = async (
  req,
  res
) => {
  try {
    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "Tu usuario autenticado todavía no existe en Supabase."
      });
    }

    const where =
      canReviewDisputes(
        prismaUser
      )
        ? {
            isArchived:
              false
          }
        : {
            isArchived:
              false,
            OR: [
              {
                buyerId:
                  prismaUser.id
              },
              {
                sellerId:
                  prismaUser.id
              }
            ]
          };

    const disputes =
      await prisma.dispute.findMany({
        where,
        select: {
          status:
            true,
          protectedAmount:
            true,
          lastActivityAt:
            true,
          updatedAt:
            true,
          createdAt:
            true
        }
      });

    const summary = {
      total:
        disputes.length,
      open:
        0,
      review:
        0,
      waitingEvidence:
        0,
      resolved:
        0,
      active:
        0,
      protectedAmount:
        0,
      lastUpdatedAt:
        null
    };

    for (
      const dispute of disputes
    ) {
      if (
        dispute.status ===
        "OPEN"
      ) {
        summary.open += 1;
      }

      if (
        [
          "UNDER_REVIEW",
          "IN_REVIEW",
          "ESCALATED",
          "READY_TO_RESOLVE"
        ].includes(
          dispute.status
        )
      ) {
        summary.review += 1;
      }

      if (
        dispute.status ===
        "WAITING_EVIDENCE"
      ) {
        summary.waitingEvidence += 1;
      }

      if (
        FINAL_STATUSES.includes(
          dispute.status
        )
      ) {
        summary.resolved += 1;
      } else {
        summary.active += 1;
        summary.protectedAmount +=
          Number(
            dispute.protectedAmount ||
            0
          );
      }

      const activityDate =
        dispute.lastActivityAt ||
        dispute.updatedAt ||
        dispute.createdAt;

      if (
        activityDate &&
        (
          !summary.lastUpdatedAt ||
          activityDate >
          summary.lastUpdatedAt
        )
      ) {
        summary.lastUpdatedAt =
          activityDate;
      }
    }

    return res.status(200).json({
      success: true,
      summary,
      ...summary
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "No se pudo obtener el resumen de disputas."
    );
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
    const disputeId =
      parsePositiveInt(
        req.params.disputeId
      );

    if (!disputeId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la disputa no es válido."
      });
    }

    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "Tu usuario autenticado todavía no existe en Supabase."
      });
    }

    const dispute =
      await getDisputeRecord(
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
        prismaUser
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
        await serializeDispute(
          dispute,
          prismaUser
        )
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Ocurrió un error obteniendo la disputa."
    );
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
    const disputeId =
      parsePositiveInt(
        req.params.disputeId
      );

    if (!disputeId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la disputa no es válido."
      });
    }

    const safeMessage =
      sanitizeText(
        req.body?.message ||
        req.body?.text,
        5000
      );

    if (!safeMessage) {
      return res.status(400).json({
        success: false,
        message:
          "Debes escribir un mensaje."
      });
    }

    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "Tu usuario autenticado todavía no existe en Supabase."
      });
    }

    const dispute =
      await getDisputeRecord(
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
        prismaUser
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
        prismaUser
      );

    const internalMessage =
      Boolean(
        req.body?.isInternal
      ) &&
      canReviewDisputes(
        prismaUser
      );

    const message = {
      id:
        crypto.randomUUID(),
      _id:
        crypto.randomUUID(),
      senderId:
        prismaUser.id,
      senderRole,
      message:
        safeMessage,
      text:
        safeMessage,
      type:
        "TEXT",
      attachments:
        [],
      isInternal:
        internalMessage,
      isSystemMessage:
        false,
      isEdited:
        false,
      editedAt:
        null,
      deletedAt:
        null,
      readBy: [
        {
          userId:
            prismaUser.id,
          readAt:
            new Date().toISOString()
        }
      ],
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    };

    const messages =
      safeJsonArray(
        dispute.messages
      );

    messages.push(message);

    let timeline =
      safeJsonArray(
        dispute.timeline
      );

    if (!internalMessage) {
      timeline =
        addTimeline(
          timeline,
          {
            type:
              "MESSAGE_SENT",
            title:
              "Nuevo mensaje",
            description:
              `${senderRole} agregó un mensaje al caso.`,
            performedBy:
              prismaUser.id,
            performedByRole:
              senderRole,
            newStatus:
              dispute.status
          }
        );
    }

    const requestMetadata =
      getRequestMetadata(req);

    const auditLog =
      addAudit(
        dispute.auditLog,
        {
          action:
            "DISPUTE_MESSAGE_SENT",
          actor:
            prismaUser.id,
          actorRole:
            senderRole,
          ...requestMetadata,
          metadata: {
            internal:
              internalMessage
          }
        }
      );

    let buyerUnreadCount =
      dispute.buyerUnreadCount;

    let sellerUnreadCount =
      dispute.sellerUnreadCount;

    let adminUnreadCount =
      dispute.adminUnreadCount;

    if (
      senderRole === "BUYER"
    ) {
      sellerUnreadCount += 1;
      adminUnreadCount += 1;
    }

    if (
      senderRole === "SELLER"
    ) {
      buyerUnreadCount += 1;
      adminUnreadCount += 1;
    }

    if (
      [
        "ADMIN",
        "SENIOR_ADMIN",
        "AUDITOR"
      ].includes(senderRole)
    ) {
      buyerUnreadCount += 1;
      sellerUnreadCount += 1;
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.dispute.update({
          where: {
            id:
              dispute.id
          },
          data: {
            messages,
            timeline,
            auditLog,
            lastMessageAt:
              new Date(),
            lastActivityAt:
              new Date(),
            buyerUnreadCount,
            sellerUnreadCount,
            adminUnreadCount
          }
        });

        if (!internalMessage) {
          if (
            senderRole !==
            "BUYER"
          ) {
            await createNotificationSafe(
              tx,
              dispute.buyerId,
              "DISPUTE_MESSAGE",
              "Nueva respuesta en tu disputa",
              "Se agregó un nuevo mensaje al caso."
            );
          }

          if (
            senderRole !==
            "SELLER"
          ) {
            await createNotificationSafe(
              tx,
              dispute.sellerId,
              "DISPUTE_MESSAGE",
              "Nueva respuesta en una disputa",
              "Se agregó un nuevo mensaje al caso."
            );
          }
        }
      },
      {
        maxWait:
          20000,
        timeout:
          60000
      }
    );

    const updated =
      await getDisputeRecord(
        dispute.id
      );

    if (!internalMessage) {
      emitUserEvent(
        req,
        dispute.buyerId,
        "dispute:message",
        {
          disputeId:
            dispute.id,
          message
        }
      );

      emitUserEvent(
        req,
        dispute.sellerId,
        "dispute:message",
        {
          disputeId:
            dispute.id,
          message
        }
      );
    }

    return res.status(201).json({
      success: true,
      message:
        "Mensaje agregado correctamente.",
      disputeMessage:
        message,
      data:
        message,
      dispute:
        await serializeDispute(
          updated,
          prismaUser
        )
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "No se pudo agregar el mensaje."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Cambiar estado
|--------------------------------------------------------------------------
*/

const updateDisputeStatus = async (
  req,
  res
) => {
  try {
    const disputeId =
      parsePositiveInt(
        req.params.disputeId
      );

    if (!disputeId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la disputa no es válido."
      });
    }

    const normalizedStatus =
      normalizeRole(
        req.body?.status
      );

    if (!normalizedStatus) {
      return res.status(400).json({
        success: false,
        message:
          "Debes indicar el nuevo estado."
      });
    }

    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "Tu usuario autenticado todavía no existe en Supabase."
      });
    }

    const dispute =
      await getDisputeRecord(
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
        prismaUser
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

    if (
      [
        "RESOLVED_BUYER",
        "RESOLVED_SELLER"
      ].includes(
        normalizedStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La resolución financiera debe realizarse desde el flujo administrativo de resolución."
      });
    }

    const allowedStatuses =
      isAdmin(prismaUser)
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
          isAdmin(prismaUser)
            ? "El estado solicitado no forma parte del flujo administrativo."
            : "No tienes permiso para asignar ese estado."
      });
    }

    if (
      dispute.status ===
      normalizedStatus
    ) {
      return res.status(200).json({
        success: true,
        message:
          "La disputa ya tiene ese estado.",
        dispute:
          await serializeDispute(
            dispute,
            prismaUser
          )
      });
    }

    const previousStatus =
      dispute.status;

    const performerRole =
      getParticipantRole(
        dispute,
        prismaUser
      );

    const safeNote =
      sanitizeText(
        req.body?.note ||
        req.body?.reason,
        2000
      );

    const timeline =
      addTimeline(
        dispute.timeline,
        {
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
            prismaUser.id,
          performedByRole:
            performerRole,
          previousStatus,
          newStatus:
            normalizedStatus
        }
      );

    const requestMetadata =
      getRequestMetadata(req);

    const auditLog =
      addAudit(
        dispute.auditLog,
        {
          action:
            "DISPUTE_STATUS_UPDATED",
          actor:
            prismaUser.id,
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
        }
      );

    await prisma.$transaction(
      async (tx) => {
        await tx.dispute.update({
          where: {
            id:
              dispute.id
          },
          data: {
            status:
              normalizedStatus,
            escalatedAt:
              normalizedStatus ===
              "ESCALATED"
                ? new Date()
                : dispute.escalatedAt,
            lastActivityAt:
              new Date(),
            timeline,
            auditLog
          }
        });

        await createNotificationSafe(
          tx,
          dispute.buyerId,
          "DISPUTE_STATUS_UPDATED",
          "Estado de disputa actualizado",
          `El caso ahora se encuentra en estado ${normalizedStatus}.`
        );

        await createNotificationSafe(
          tx,
          dispute.sellerId,
          "DISPUTE_STATUS_UPDATED",
          "Estado de disputa actualizado",
          `El caso ahora se encuentra en estado ${normalizedStatus}.`
        );
      },
      {
        maxWait:
          20000,
        timeout:
          60000
      }
    );

    const updated =
      await getDisputeRecord(
        dispute.id
      );

    const eventPayload = {
      disputeId:
        dispute.id,
      previousStatus,
      status:
        normalizedStatus,
      updatedAt:
        new Date()
    };

    emitUserEvent(
      req,
      dispute.buyerId,
      "dispute:status",
      eventPayload
    );

    emitUserEvent(
      req,
      dispute.sellerId,
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
        await serializeDispute(
          updated,
          prismaUser
        )
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "No se pudo actualizar el estado de la disputa."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Administración: listar todas
|--------------------------------------------------------------------------
*/

const getAllDisputes = async (
  req,
  res
) => {
  try {
    const prismaUser =
      await resolvePrismaUser(req);

    if (
      !prismaUser ||
      !canReviewDisputes(
        prismaUser
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permiso para revisar todas las disputas."
      });
    }

    const {
      status,
      priority,
      search,
      page = 1,
      limit = 50,
      sort = "newest"
    } = req.query || {};

    const safePage =
      Math.max(
        Number(page) || 1,
        1
      );

    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) || 50,
          1
        ),
        100
      );

    const where = {
      isArchived:
        false
    };

    if (
      status &&
      normalizeRole(status) !==
      "ALL"
    ) {
      where.status =
        normalizeRole(status);
    }

    if (
      priority &&
      normalizeRole(priority) !==
      "ALL"
    ) {
      where.priority =
        normalizeRole(priority);
    }

    const normalizedSearch =
      sanitizeText(
        search,
        100
      );

    if (normalizedSearch) {
      where.OR = [
        {
          disputeCode: {
            contains:
              normalizedSearch,
            mode:
              "insensitive"
          }
        },
        {
          reason: {
            contains:
              normalizedSearch,
            mode:
              "insensitive"
          }
        },
        {
          description: {
            contains:
              normalizedSearch,
            mode:
              "insensitive"
          }
        }
      ];
    }

    let orderBy = {
      createdAt:
        "desc"
    };

    if (sort === "oldest") {
      orderBy = {
        createdAt:
          "asc"
      };
    }

    if (sort === "activity") {
      orderBy = {
        lastActivityAt:
          "desc"
      };
    }

    if (sort === "priority") {
      orderBy = [
        {
          priority:
            "desc"
        },
        {
          createdAt:
            "desc"
        }
      ];
    }

    const [
      disputes,
      total
    ] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include:
          DISPUTE_INCLUDE,
        orderBy,
        skip:
          (safePage - 1) *
          safeLimit,
        take:
          safeLimit
      }),

      prisma.dispute.count({
        where
      })
    ]);

    const serialized =
      await Promise.all(
        disputes.map(
          (dispute) =>
            serializeDispute(
              dispute,
              prismaUser
            )
        )
      );

    return res.status(200).json({
      success: true,
      message:
        "Todas las disputas fueron obtenidas correctamente.",
      count:
        serialized.length,
      total,
      page:
        safePage,
      pages:
        Math.ceil(
          total / safeLimit
        ),
      disputes:
        serialized
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "No se pudieron obtener las disputas."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Administración: resolver
|--------------------------------------------------------------------------
*/

const resolveDispute = async (
  req,
  res
) => {
  try {
    const disputeId =
      parsePositiveInt(
        req.params.disputeId
      );

    if (!disputeId) {
      return res.status(400).json({
        success: false,
        message:
          "El identificador de la disputa no es válido."
      });
    }

    const normalizedAction =
      normalizeRole(
        req.body?.action
      );

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

    const prismaUser =
      await resolvePrismaUser(req);

    if (
      !prismaUser ||
      !isAdmin(prismaUser)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Solo un administrador puede resolver la disputa."
      });
    }

    const dispute =
      await getDisputeRecord(
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
      await prisma.order.findUnique({
        where: {
          id:
            dispute.orderId
        }
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "La orden relacionada no fue encontrada."
      });
    }

    if (
      ![
        "HELD",
        "UNDER_REVIEW",
        "PENDING"
      ].includes(
        order.escrowStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La orden no tiene fondos retenidos para resolver."
      });
    }

    const previousStatus =
      dispute.status;

    let finalStatus;
    let orderStatus;
    let escrowStatus;
    let paymentStatus;
    let notificationTitle;
    let buyerMessage;
    let sellerMessage;

    if (
      normalizedAction ===
      "REFUND_BUYER"
    ) {
      finalStatus =
        "REFUNDED";
      orderStatus =
        "CANCELLED";
      escrowStatus =
        "REFUNDED";
      paymentStatus =
        "REFUNDED";
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
      orderStatus =
        "COMPLETED";
      escrowStatus =
        "RELEASED";
      paymentStatus =
        "RELEASED";
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
      orderStatus =
        "COMPLETED";
      escrowStatus =
        "RELEASED";
      paymentStatus =
        "RELEASED";
      notificationTitle =
        "Disputa rechazada";
      buyerMessage =
        "Quick Secure Market rechazó la disputa después de revisar el caso.";
      sellerMessage =
        "La disputa fue rechazada y el pago fue liberado a tu favor.";
    }

    const safeAdminNotes =
      sanitizeText(
        req.body?.adminNotes ||
        req.body?.decision,
        5000
      );

    const now =
      new Date();

    const resolutionData = {
      action:
        normalizedAction,
      decision:
        safeAdminNotes,
      amount:
        Number(
          dispute.protectedAmount ||
          getProtectedAmount(
            order
          )
        ),
      currency:
        dispute.currency ||
        "DOP",
      resolvedBy:
        prismaUser.id,
      resolvedAt:
        now.toISOString()
    };

    let timeline =
      addTimeline(
        dispute.timeline,
        {
          type:
            "DISPUTE_RESOLVED",
          title:
            notificationTitle,
          description:
            safeAdminNotes ||
            "Quick Secure Market emitió una resolución final.",
          performedBy:
            prismaUser.id,
          performedByRole:
            "ADMIN",
          previousStatus,
          newStatus:
            finalStatus
        }
      );

    timeline =
      addTimeline(
        timeline,
        {
          type:
            finalStatus ===
            "REFUNDED"
              ? "PAYMENT_REFUNDED"
              : "PAYMENT_RELEASED",
          title:
            finalStatus ===
            "REFUNDED"
              ? "Pago reembolsado"
              : "Pago liberado",
          description:
            finalStatus ===
            "REFUNDED"
              ? "Los fondos fueron marcados para reembolso al comprador."
              : "Los fondos fueron liberados al vendedor.",
          performedBy:
            prismaUser.id,
          performedByRole:
            "ADMIN",
          previousStatus,
          newStatus:
            finalStatus
        }
      );

    const requestMetadata =
      getRequestMetadata(req);

    const auditLog =
      addAudit(
        dispute.auditLog,
        {
          action:
            "DISPUTE_RESOLVED",
          actor:
            prismaUser.id,
          actorRole:
            "ADMIN",
          ...requestMetadata,
          before: {
            status:
              previousStatus,
            orderStatus:
              order.status,
            escrowStatus:
              order.escrowStatus
          },
          after: {
            status:
              finalStatus,
            orderStatus,
            escrowStatus,
            paymentStatus
          },
          metadata: {
            resolutionAction:
              normalizedAction
          }
        }
      );

    await prisma.$transaction(
      async (tx) => {
        await tx.dispute.update({
          where: {
            id:
              dispute.id
          },
          data: {
            status:
              finalStatus,
            adminNotes:
              safeAdminNotes,
            resolutionData,
            resolvedAt:
              now,
            lastActivityAt:
              now,
            timeline,
            auditLog
          }
        });

        await tx.order.update({
          where: {
            id:
              order.id
          },
          data: {
            status:
              orderStatus,
            escrowStatus,
            paymentStatus,
            refundedAt:
              finalStatus ===
              "REFUNDED"
                ? now
                : order.refundedAt,
            releasedAt:
              finalStatus !==
              "REFUNDED"
                ? now
                : order.releasedAt
          }
        });

        await tx.payment.updateMany({
          where: {
            orderId:
              order.id,
            status: {
              in: [
                "HELD",
                "PENDING",
                "UNDER_REVIEW"
              ]
            }
          },
          data: {
            status:
              paymentStatus,
            notes:
              finalStatus ===
              "REFUNDED"
                ? "Pago reembolsado al comprador por resolución de disputa."
                : "Pago liberado al vendedor por resolución de disputa."
          }
        });

        await createNotificationSafe(
          tx,
          dispute.buyerId,
          "DISPUTE_RESOLVED",
          notificationTitle,
          buyerMessage
        );

        await createNotificationSafe(
          tx,
          dispute.sellerId,
          normalizedAction ===
          "REFUND_BUYER"
            ? "DISPUTE_RESOLVED"
            : "PAYMENT_RELEASED",
          notificationTitle,
          sellerMessage
        );
      },
      {
        maxWait:
          20000,
        timeout:
          60000
      }
    );

    const updated =
      await getDisputeRecord(
        dispute.id
      );

    const socketPayload = {
      disputeId:
        dispute.id,
      action:
        normalizedAction,
      previousStatus,
      status:
        finalStatus,
      orderStatus,
      escrowStatus
    };

    emitUserEvent(
      req,
      dispute.buyerId,
      "dispute:resolved",
      socketPayload
    );

    emitUserEvent(
      req,
      dispute.sellerId,
      "dispute:resolved",
      socketPayload
    );

    const payment =
      await prisma.payment.findFirst({
        where: {
          orderId:
            order.id
        }
      });

    return res.status(200).json({
      success: true,
      message:
        "Disputa resuelta correctamente.",
      action:
        normalizedAction,
      dispute:
        await serializeDispute(
          updated,
          prismaUser
        ),
      order:
        serializeOrder(
          await prisma.order.findUnique({
            where: {
              id:
                order.id
            }
          })
        ),
      payment:
        payment
          ? {
              ...payment,
              _id:
                String(payment.id)
            }
          : null
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Ocurrió un error resolviendo la disputa."
    );
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
