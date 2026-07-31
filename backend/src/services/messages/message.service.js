// backend/src/services/messages/message.service.js
// QSM Messenger core migrated to Prisma/PostgreSQL.

const fs = require("fs");
const path = require("path");

const prisma = require("../../utils/prisma");

const {
  signPrivateReferencesDeep
} = require("../storage.service");
const {
  analyzeMessageSecurity
} = require("./messageSecurity.service");

const {
  createNotification
} = require("../notification.service");

const {
  ALLOWED_MESSAGE_TYPES,
  sanitizeText,
  normalizeAttachments
} = require("../../utils/messages/messageController.utils");

const {
  getConversationRoom,
  emitNewMessage,
  emitMessageUpdated,
  emitMessageDeleted,
  emitMessagesRead,
  emitConversationUpdated
} = require("../../socket/message.socket");

const mapsPath = path.join(
  __dirname,
  "../../../RECOVERY_IMPORT_MAPS.json"
);

const readMaps = () => {
  try {
    if (!fs.existsSync(mapsPath)) {
      return {};
    }

    return JSON.parse(
      fs.readFileSync(mapsPath, "utf8")
        .replace(/^\uFEFF/, "")
    );
  } catch (error) {
    console.warn(
      "No se pudieron leer los mapas de recuperación del Messenger:",
      error.message
    );

    return {};
  }
};

const maps = readMaps();

const invertMap = (source = {}) =>
  Object.fromEntries(
    Object.entries(source).map(
      ([legacyId, prismaId]) => [String(prismaId), legacyId]
    )
  );

const inverseUserMap = invertMap(maps.userMap);

const badRequest = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const normalizeReference = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    /*
     * MongoDB ObjectId.
     */
    if (
      typeof value.toHexString ===
      "function"
    ) {
      return String(
        value.toHexString()
      ).trim();
    }

    /*
     * Buffer interno de algunos ObjectId.
     */
    if (Buffer.isBuffer(value)) {
      return value.toString("hex");
    }

    const nestedReference =
      value._id ??
      value.id ??
      value.userId;

    if (
      nestedReference !== undefined &&
      nestedReference !== null &&
      nestedReference !== value
    ) {
      return normalizeReference(
        nestedReference
      );
    }
  }

  const normalized =
    String(value).trim();

  return normalized ===
    "[object Object]"
      ? ""
      : normalized;
};

const parsePositiveInt = (value) => {
  const text = normalizeReference(value);

  if (!/^\d+$/.test(text)) {
    return null;
  }

  const number = Number(text);

  return Number.isSafeInteger(number) && number > 0
    ? number
    : null;
};

const resolveMappedId = (map = {}, value) => {
  const numericId = parsePositiveInt(value);

  if (numericId) {
    return numericId;
  }

  const legacyId = normalizeReference(value);
  const mapped = Number(map?.[legacyId]);

  return Number.isSafeInteger(mapped) && mapped > 0
    ? mapped
    : null;
};

const resolveConversationId = (value) =>
  resolveMappedId(maps.conversationMap, value);

const resolveMessageId = (value) =>
  resolveMappedId(maps.messageMap, value);

const resolveProductId = (value) =>
  resolveMappedId(maps.productMap, value);

const resolveOrderId = (value) =>
  resolveMappedId(maps.orderMap, value);

const userResolutionCache = new Map();

const resolvePrismaUserId = async (userReference) => {
  const reference =
    userReference && typeof userReference === "object"
      ? userReference
      : { id: userReference };

  const rawId = normalizeReference(
    reference.id ??
    reference._id ??
    reference.userId ??
    userReference
  );

  const directEmail = String(reference.email || "")
    .trim()
    .toLowerCase();

  const cacheKey = directEmail || rawId;

  if (cacheKey && userResolutionCache.has(cacheKey)) {
    return userResolutionCache.get(cacheKey);
  }

  const numericId = parsePositiveInt(rawId);

  if (numericId) {
    const exists = await prisma.user.findUnique({
      where: { id: numericId },
      select: { id: true }
    });

    if (exists) {
      userResolutionCache.set(cacheKey, exists.id);
      return exists.id;
    }
  }

  const mappedId = resolveMappedId(maps.userMap, rawId);

  if (mappedId) {
    const exists = await prisma.user.findUnique({
      where: { id: mappedId },
      select: { id: true }
    });

    if (exists) {
      userResolutionCache.set(cacheKey, exists.id);
      return exists.id;
    }
  }

  if (directEmail) {
    const byEmail = await prisma.user.findUnique({
      where: { email: directEmail },
      select: { id: true }
    });

    if (byEmail) {
      userResolutionCache.set(cacheKey, byEmail.id);
      return byEmail.id;
    }
  }

  if (rawId) {
    const byLegacyId = await prisma.user.findUnique({
      where: { legacyMongoId: rawId },
      select: { id: true }
    });

    if (byLegacyId) {
      userResolutionCache.set(cacheKey, byLegacyId.id);
      return byLegacyId.id;
    }
  }

  return null;
};

const ensureUserId = async (userReference) => {
  const userId = await resolvePrismaUserId(userReference);

  if (!userId) {
    badRequest("Usuario autenticado no válido.", 401);
  }

  return userId;
};

const ensureConversationId = (value) => {
  const conversationId = resolveConversationId(value);

  if (!conversationId) {
    badRequest(
      "conversationId es obligatorio y debe ser válido."
    );
  }

  return conversationId;
};

const ensureMessageId = (value) => {
  const messageId = resolveMessageId(value);

  if (!messageId) {
    badRequest("messageId no es válido.");
  }

  return messageId;
};

const toClientUserId = (prismaUserId) =>
  inverseUserMap[String(prismaUserId)] ||
  String(prismaUserId);

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  trustScore: true,
  isVerified: true,
  status: true,
  profilePhoto: true,
  createdAt: true
};

const productSelect = {
  id: true,
  title: true,
  price: true,
  images: true,
  imageUrl: true,
  qsmCode: true,
  status: true,
  sellerId: true
};

const shallowReplyInclude = {
  sender: { select: userSelect },
  receiver: { select: userSelect }
};

const messageInclude = {
  sender: { select: userSelect },
  receiver: { select: userSelect },
  product: { select: productSelect },
  order: true,
  replyTo: { include: shallowReplyInclude }
};

const conversationInclude = {
  product: { select: productSelect },
  order: true,
  lastMessageSender: { select: userSelect },
  participants: {
    include: {
      user: { select: userSelect }
    },
    orderBy: { id: "asc" }
  },
  labelAssignments: {
    include: {
      label: true,
      assignedBy: { select: userSelect }
    },
    orderBy: { assignedAt: "asc" }
  },
  pinnedMessages: {
    include: {
      message: { include: messageInclude },
      pinnedBy: { select: userSelect }
    },
    orderBy: { pinnedAt: "desc" }
  }
};

const serializeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    ...user,
    id: user.id,
    _id: toClientUserId(user.id),
    userId: user.id,
    prismaId: user.id
  };
};

const serializeProduct = (product) => {
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
    _id: String(order.id)
  };
};

const serializeReply = (message) => {
  if (!message) {
    return null;
  }

  return {
    ...message,
    _id: String(message.id),
    conversation: String(message.conversationId),
    sender: serializeUser(message.sender),
    receiver: serializeUser(message.receiver)
  };
};

const serializeMessage = (message) => {
  if (!message) {
    return null;
  }

  return {
    ...message,
    _id: String(message.id),
    conversation: String(message.conversationId),
    sender: serializeUser(message.sender),
    receiver: serializeUser(message.receiver),
    product: serializeProduct(message.product),
    order: serializeOrder(message.order),
    replyTo: serializeReply(message.replyTo),
    attachments: Array.isArray(message.attachments)
      ? message.attachments
      : [],
    reactions: Array.isArray(message.reactions)
      ? message.reactions
      : [],
    location:
      message.location && typeof message.location === "object"
        ? message.location
        : {}
  };
};

const serializeConversation = (conversation, currentUserId) => {
  const memberships = conversation.participants || [];
  const participants = memberships
    .map((membership) => serializeUser(membership.user))
    .filter(Boolean);

  const unread = {};
  const mutedBy = [];
  const archivedBy = [];
  const blockedBy = [];
  const favoriteBy = [];
  const pinnedBy = [];

  for (const membership of memberships) {
    const clientUserId = toClientUserId(membership.userId);

    unread[clientUserId] = Number(membership.unreadCount || 0);

    if (membership.muted) mutedBy.push(clientUserId);
    if (membership.archived) archivedBy.push(clientUserId);
    if (membership.blocked) blockedBy.push(clientUserId);
    if (membership.favorite) favoriteBy.push(clientUserId);

    if (membership.pinned) {
      pinnedBy.push({
        user: clientUserId,
        order: membership.pinnedOrder
      });
    }
  }

  const currentMembership = memberships.find(
    (membership) => membership.userId === currentUserId
  );

  return {
    ...conversation,
    id: conversation.id,
    _id: String(conversation.id),
    participants,
    product: serializeProduct(conversation.product),
    order: serializeOrder(conversation.order),
    lastMessage: {
      text: conversation.lastMessageText || "",
      sender: conversation.lastMessageSenderId
        ? toClientUserId(conversation.lastMessageSenderId)
        : null,
      createdAt: conversation.lastMessageAt || null
    },
    unread,
    unreadCount: Number(currentMembership?.unreadCount || 0),

    isMuted:
      Boolean(
        currentMembership?.muted
      ),

    isArchived:
      Boolean(
        currentMembership?.archived
      ),

    isBlocked:
      Boolean(
        currentMembership?.blocked
      ),

    isFavorite:
      Boolean(
        currentMembership?.favorite
      ),

    isPinned:
      Boolean(
        currentMembership?.pinned
      ),

    mutedBy,
    archivedBy,
    blockedBy,
    favoriteBy,
    pinnedBy,
    labels: (conversation.labelAssignments || []).map(
      (assignment) => ({
        ...assignment.label,
        _id: String(assignment.label.id),
        assignedBy: serializeUser(assignment.assignedBy),
        assignedAt: assignment.assignedAt
      })
    ),
    pinnedMessages: (conversation.pinnedMessages || []).map(
      (entry) => serializeMessage(entry.message)
    )
  };
};

const getConversationForUser = async (
  conversationReference,
  userId
) => {
  const conversationId = ensureConversationId(
    conversationReference
  );

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      participants: {
        some: { userId }
      }
    },
    include: conversationInclude
  });

  if (!conversation) {
    badRequest("Conversación no encontrada.", 404);
  }

  return conversation;
};

const mapSecurityAnalysis = (content) => {
  if (!content) {
    return {
      score: 0,
      riskLevel: "LOW",
      flagged: false,
      reasons: [],
      reasonStrings: [],
      recommendation: "",
      reasonText: "Mensaje sin señales críticas."
    };
  }

  const security = analyzeMessageSecurity(content);
  const reasons = Array.isArray(security.reasons)
    ? security.reasons
    : [];

  const reasonStrings = reasons
    .map((reason) =>
      typeof reason === "string"
        ? reason
        : reason?.title || reason?.message || reason?.reason || ""
    )
    .map((value) => String(value).trim())
    .filter(Boolean);

  return {
    ...security,
    reasons,
    reasonStrings,
    reasonText:
      reasonStrings.join(". ") ||
      "Mensaje sin señales críticas."
  };
};

const getConversations = async ({ userId: userReference }) => {
  const userId = await ensureUserId(userReference);

  const conversations = await prisma.conversation.findMany({
    where: {
      participants: {
        some: { userId }
      }
    },
    include: conversationInclude,
    orderBy: [
      { lastMessageAt: "desc" },
      { updatedAt: "desc" }
    ]
  });

  return conversations.map(
    (conversation) => serializeConversation(conversation, userId)
  );
};

const createConversation = async ({
  userId: userReference,
  receiverId: receiverReference,
  productId: productReference,
  orderId: orderReference
}) => {
  const userId = await ensureUserId(userReference);
  const receiverId = await resolvePrismaUserId(receiverReference);

  if (!receiverId) {
    badRequest(
      "receiverId es obligatorio y debe ser válido."
    );
  }

  if (receiverId === userId) {
    badRequest("No puedes crear una conversación contigo mismo.");
  }

  const productId = productReference
    ? resolveProductId(productReference)
    : null;

  const orderId = orderReference
    ? resolveOrderId(orderReference)
    : null;

  if (productReference && !productId) {
    badRequest("productId no es válido.");
  }

  if (orderReference && !orderId) {
    badRequest("orderId no es válido.");
  }

  const conversationLockKey = [
    `users:${[userId, receiverId]
      .sort((left, right) => left - right)
      .join(",")}`,
    `product:${productId ?? "NULL"}`,
    `order:${orderId ?? "NULL"}`
  ].join("|");

  const conversation =
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`
          SELECT pg_advisory_xact_lock(
            hashtext(${conversationLockKey})::bigint
          )
        `;

        let existing =
          await tx.conversation.findFirst({
            where: {
              productId,
              orderId,

              AND: [
                {
                  participants: {
                    some: {
                      userId
                    }
                  }
                },
                {
                  participants: {
                    some: {
                      userId:
                        receiverId
                    }
                  }
                }
              ]
            },

            include:
              conversationInclude
          });

        if (!existing) {
          existing =
            await tx.conversation.create({
              data: {
                productId,
                orderId,

                participants: {
                  create: [
                    {
                      userId
                    },
                    {
                      userId:
                        receiverId
                    }
                  ]
                }
              },

              include:
                conversationInclude
            });
        }

        return existing;
      }
    );

  return serializeConversation(conversation, userId);
};

const getConversationMessages = async ({
  userId: userReference,
  conversationId: conversationReference
}) => {
  const userId = await ensureUserId(userReference);
  const conversation = await getConversationForUser(
    conversationReference,
    userId
  );

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    include: messageInclude,
    orderBy: { createdAt: "asc" }
  });

  return messages.map(serializeMessage);
};

const markConversationAsRead = async ({
  io,
  userId: userReference,
  conversationId: conversationReference
}) => {
  const userId = await ensureUserId(userReference);
  const conversation = await getConversationForUser(
    conversationReference,
    userId
  );

  const now = new Date();

  await prisma.$transaction([
    prisma.message.updateMany({
      where: {
        conversationId: conversation.id,
        receiverId: userId,
        status: { not: "READ" }
      },
      data: {
        status: "READ",
        readAt: now
      }
    }),
    prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId
        }
      },
      data: {
        unreadCount: 0,
        lastReadAt: now
      }
    })
  ]);

  emitMessagesRead(io, conversation.id, {
    userId: toClientUserId(userId),
    readAt: now
  });

  return {
    success: true,
    message: "Mensajes marcados como leídos."
  };
};

const createFraudAlertSafely = async ({
  productId,
  securityAnalysis,
  context = "MESSAGE_SECURITY"
}) => {
  if (!productId || !securityAnalysis?.flagged) {
    return null;
  }

  try {
    return await prisma.fraudAlert.create({
      data: {
        productId,
        type: context,
        level: String(
          securityAnalysis.riskLevel || "HIGH"
        ).toUpperCase(),
        message: securityAnalysis.reasonText
      }
    });
  } catch (error) {
    console.error(
      "No se pudo registrar la alerta antifraude del mensaje:",
      error.message
    );

    return null;
  }
};

const sendMessage = async ({
  io,
  userId: userReference,
  body = {}
}) => {
  const userId = await ensureUserId(userReference);

  const safeAttachments = normalizeAttachments(body.attachments);
  const finalContent = sanitizeText(
    body.text || body.content || ""
  );

  if (
    !finalContent &&
    safeAttachments.length === 0 &&
    !body.location
  ) {
    badRequest("Debes enviar texto, archivo o ubicación.");
  }

  if (finalContent.length > 1000) {
    badRequest("El mensaje no puede superar los 1000 caracteres.");
  }

  const requestedType = String(body.messageType || "")
    .trim()
    .toUpperCase();

  if (
    requestedType &&
    !ALLOWED_MESSAGE_TYPES.includes(requestedType)
  ) {
    badRequest("Tipo de mensaje no válido.");
  }

  const conversation = await getConversationForUser(
    body.conversationId,
    userId
  );

  if (
    conversation.participants.some(
      (membership) => membership.blocked
    )
  ) {
    badRequest("Esta conversación está bloqueada.", 403);
  }

  const receiverMembership = conversation.participants.find(
    (membership) => membership.userId !== userId
  );

  if (!receiverMembership) {
    badRequest(
      "No se pudo identificar al receptor del mensaje."
    );
  }

  const receiverId = receiverMembership.userId;
  const replyToId = body.replyTo
    ? ensureMessageId(body.replyTo)
    : null;

  if (replyToId) {
    const reply = await prisma.message.findFirst({
      where: {
        id: replyToId,
        conversationId: conversation.id
      },
      select: { id: true }
    });

    if (!reply) {
      badRequest("replyTo no pertenece a esta conversación.");
    }
  }

  const productId = body.productId
    ? resolveProductId(body.productId)
    : conversation.productId;

  const orderId = body.orderId
    ? resolveOrderId(body.orderId)
    : conversation.orderId;

  if (body.productId && !productId) {
    badRequest("productId no es válido.");
  }

  if (body.orderId && !orderId) {
    badRequest("orderId no es válido.");
  }

  const securityAnalysis = mapSecurityAnalysis(finalContent);

  const resolvedMessageType =
    requestedType ||
    safeAttachments[0]?.type ||
    (body.location ? "LOCATION" : "TEXT");

  const displayContent =
    finalContent ||
    safeAttachments[0]?.name ||
    (body.location
      ? "Ubicación compartida"
      : "Archivo adjunto");

  const now = new Date();

  const created = await prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId: conversation.id,
        orderId,
        senderId: userId,
        receiverId,
        productId,
        replyToId,
        messageType: resolvedMessageType,
        content: displayContent,
        text: finalContent,
        attachments: safeAttachments,
        reactions: [],
        location:
          body.location && typeof body.location === "object"
            ? body.location
            : {},
        isFlagged: Boolean(securityAnalysis.flagged),
        riskLevel: String(
          securityAnalysis.riskLevel || "LOW"
        ).toUpperCase(),
        aiReason: securityAnalysis.reasonText,
        securityScore: Number(securityAnalysis.score || 0),
        securityReasons: securityAnalysis.reasonStrings,
        status: securityAnalysis.flagged
          ? "BLOCKED"
          : "SENT",
        createdAt: now,
        updatedAt: now
      },
      include: messageInclude
    });

    await tx.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageText: securityAnalysis.flagged
          ? "Mensaje bloqueado por seguridad"
          : displayContent,
        lastMessageSenderId: userId,
        lastMessageAt: now
      }
    });

    if (!securityAnalysis.flagged) {
      await tx.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: receiverId
          }
        },
        data: {
          unreadCount: { increment: 1 }
        }
      });
    }

    return message;
  });

  await createFraudAlertSafely({
    productId,
    securityAnalysis
  });

  if (securityAnalysis.flagged) {
    await createNotification(
      userId,
      "SECURITY_ALERT",
      "Mensaje bloqueado por seguridad",
      "Quick Secure Market detectó contenido potencialmente riesgoso dentro del mensaje."
    );
  } else if (!receiverMembership.muted) {
    await createNotification(
      receiverId,
      "NEW_MESSAGE",
      "Nuevo mensaje recibido",
      "Tienes un nuevo mensaje en Quick Secure Market."
    );
  }

  const serialized =
    await signPrivateReferencesDeep(
      serializeMessage(created)
    );

  emitNewMessage(io, conversation.id, serialized);

  if (io && !securityAnalysis.flagged) {
    io.to(`user:${toClientUserId(receiverId)}`)
      .except(
        getConversationRoom(
          conversation.id
        )
      )
      .emit(
      "message:new",
      {
        conversationId: String(conversation.id),
        message: serialized,
        sentAt: now
      }
    );
  }

  emitConversationUpdated(
    io,
    conversation.id,
    "conversation:updated",
    {
      lastMessage: {
        text: securityAnalysis.flagged
          ? "Mensaje bloqueado por seguridad"
          : displayContent,
        sender: toClientUserId(userId),
        createdAt: now
      }
    }
  );

  return {
    success: true,
    message: serialized,
    resultado: {
      estadoMensaje: serialized.status,
      riesgo: securityAnalysis.riskLevel,
      marcadoPorIA: Boolean(securityAnalysis.flagged),
      motivoIA: securityAnalysis.reasonText,
      puntuacionSeguridad: Number(securityAnalysis.score || 0)
    }
  };
};

const recalculateConversationLastMessage = async (
  conversationId
) => {
  const latestMessage = await prisma.message.findFirst({
    where: {
      conversationId,
      deletedForEveryone: false
    },
    orderBy: { createdAt: "desc" }
  });

  return prisma.conversation.update({
    where: { id: conversationId },
    data: latestMessage
      ? {
          lastMessageText:
            latestMessage.status === "BLOCKED"
              ? "Mensaje bloqueado por seguridad"
              : latestMessage.content,
          lastMessageSenderId: latestMessage.senderId,
          lastMessageAt: latestMessage.createdAt
        }
      : {
          lastMessageText: "Sin mensajes",
          lastMessageSenderId: null,
          lastMessageAt: null
        }
  });
};

const editMessage = async ({
  io,
  userId: userReference,
  messageId: messageReference,
  body = {}
}) => {
  const userId = await ensureUserId(userReference);
  const messageId = ensureMessageId(messageReference);
  const finalContent = sanitizeText(
    body.text || body.content || ""
  );

  if (!finalContent) {
    badRequest("El contenido del mensaje es obligatorio.");
  }

  if (finalContent.length > 1000) {
    badRequest("El mensaje no puede superar los 1000 caracteres.");
  }

  const current = await prisma.message.findUnique({
    where: { id: messageId }
  });

  if (!current) {
    badRequest("Mensaje no encontrado.", 404);
  }

  if (current.senderId !== userId) {
    badRequest(
      "No puedes editar un mensaje que no es tuyo.",
      403
    );
  }

  if (current.deletedForEveryone) {
    badRequest("No puedes editar un mensaje eliminado.");
  }

  await getConversationForUser(current.conversationId, userId);

  const securityAnalysis = mapSecurityAnalysis(finalContent);
  const now = new Date();

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      content: finalContent,
      text: finalContent,
      isEdited: true,
      editedAt: now,
      isFlagged: Boolean(securityAnalysis.flagged),
      riskLevel: String(
        securityAnalysis.riskLevel || "LOW"
      ).toUpperCase(),
      aiReason: securityAnalysis.reasonText,
      securityScore: Number(securityAnalysis.score || 0),
      securityReasons: securityAnalysis.reasonStrings,
      status: securityAnalysis.flagged
        ? "BLOCKED"
        : "SENT"
    },
    include: messageInclude
  });

  await recalculateConversationLastMessage(current.conversationId);

  await createFraudAlertSafely({
    productId: current.productId,
    securityAnalysis,
    context: "MESSAGE_EDIT_SECURITY"
  });

  const serialized =
    await signPrivateReferencesDeep(
      serializeMessage(updated)
    );

  emitMessageUpdated(
    io,
    current.conversationId,
    serialized
  );

  return {
    success: true,
    message: serialized,
    resultado: {
      estadoMensaje: serialized.status,
      riesgo: securityAnalysis.riskLevel,
      marcadoPorIA: Boolean(securityAnalysis.flagged),
      motivoIA: securityAnalysis.reasonText,
      puntuacionSeguridad: Number(securityAnalysis.score || 0)
    }
  };
};

const deleteMessage = async ({
  io,
  userId: userReference,
  messageId: messageReference
}) => {
  const userId = await ensureUserId(userReference);
  const messageId = ensureMessageId(messageReference);

  const current = await prisma.message.findUnique({
    where: { id: messageId }
  });

  if (!current) {
    badRequest("Mensaje no encontrado.", 404);
  }

  if (current.senderId !== userId) {
    badRequest(
      "No puedes eliminar un mensaje que no es tuyo.",
      403
    );
  }

  if (current.deletedForEveryone) {
    badRequest("Este mensaje ya fue eliminado.");
  }

  await getConversationForUser(current.conversationId, userId);

  const deletedAt = new Date();

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      deletedForEveryone: true,
      deletedAt,
      content: "Mensaje eliminado",
      text: "Mensaje eliminado",
      attachments: [],
      reactions: [],
      location: {},
      isFlagged: false,
      aiReason: "",
      riskLevel: "LOW",
      securityScore: 0,
      securityReasons: [],
      status: "SENT"
    },
    include: messageInclude
  });

  const conversation = await recalculateConversationLastMessage(
    current.conversationId
  );

  const serialized =
    await signPrivateReferencesDeep(
      serializeMessage(updated)
    );

  emitMessageDeleted(io, current.conversationId, {
    _id: String(messageId),
    id: messageId,
    conversationId: String(current.conversationId),
    deletedForEveryone: true,
    deletedAt,
    message: serialized
  });

  emitConversationUpdated(
    io,
    current.conversationId,
    "conversation:updated",
    {
      lastMessage: {
        text: conversation.lastMessageText,
        sender: conversation.lastMessageSenderId
          ? toClientUserId(conversation.lastMessageSenderId)
          : null,
        createdAt: conversation.lastMessageAt
      }
    }
  );

  return {
    success: true,
    message: serialized,
    deletedMessageId: String(messageId)
  };
};

const toggleParticipantField = async ({
  userReference,
  conversationReference,
  field,
  responseMessage
}) => {
  const userId = await ensureUserId(userReference);
  const conversation = await getConversationForUser(
    conversationReference,
    userId
  );

  const membership = conversation.participants.find(
    (item) => item.userId === userId
  );

  const enabled = !Boolean(membership?.[field]);

  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId: conversation.id,
        userId
      }
    },
    data: { [field]: enabled }
  });

  const refreshed = await prisma.conversation.findUnique({
    where: { id: conversation.id },
    include: conversationInclude
  });

  return {
    success: true,
    message: responseMessage,
    conversation: serializeConversation(refreshed, userId)
  };
};

const muteConversation = ({ userId, conversationId }) =>
  toggleParticipantField({
    userReference: userId,
    conversationReference: conversationId,
    field: "muted",
    responseMessage: "Estado de silencio actualizado."
  });

const archiveConversation = ({ userId, conversationId }) =>
  toggleParticipantField({
    userReference: userId,
    conversationReference: conversationId,
    field: "archived",
    responseMessage: "Estado de archivo actualizado."
  });

const favoriteConversation = ({ userId, conversationId }) =>
  toggleParticipantField({
    userReference: userId,
    conversationReference: conversationId,
    field: "favorite",
    responseMessage: "Favorito actualizado."
  });

const blockConversation = async ({
  userId: userReference,
  conversationId: conversationReference
}) => {
  const userId = await ensureUserId(userReference);
  const conversation = await getConversationForUser(
    conversationReference,
    userId
  );

  const membership = conversation.participants.find(
    (item) => item.userId === userId
  );

  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId: conversation.id,
        userId
      }
    },
    data: {
      blocked: !Boolean(membership?.blocked)
    }
  });

  const blockedCount = await prisma.conversationParticipant.count({
    where: {
      conversationId: conversation.id,
      blocked: true
    }
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      status: blockedCount > 0
        ? "BLOCKED"
        : "ACTIVE"
    }
  });

  const refreshed = await prisma.conversation.findUnique({
    where: { id: conversation.id },
    include: conversationInclude
  });

  return {
    success: true,
    message: "Estado de bloqueo actualizado.",
    conversation: serializeConversation(refreshed, userId)
  };
};

const slugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const addConversationLabel = async ({
  userId: userReference,
  conversationId: conversationReference,
  body = {}
}) => {
  const userId = await ensureUserId(userReference);
  const conversation = await getConversationForUser(
    conversationReference,
    userId
  );

  const name = sanitizeText(body.name || "");

  if (!name) {
    badRequest("El nombre de la etiqueta es obligatorio.");
  }

  const slug = slugify(name) || `label-${Date.now()}`;

  let label = await prisma.conversationLabel.findFirst({
    where: {
      slug,
      ownerId: userId
    }
  });

  if (!label) {
    label = await prisma.conversationLabel.create({
      data: {
        name,
        slug,
        color: String(body.color || "#1976d2"),
        icon: String(body.icon || "tag"),
        ownerId: userId,
        isSystem: false,
        isActive: true
      }
    });
  } else if (!label.isActive) {
    label = await prisma.conversationLabel.update({
      where: { id: label.id },
      data: { isActive: true }
    });
  }

  await prisma.conversationLabelAssignment.upsert({
    where: {
      conversationId_labelId_assignedById: {
        conversationId: conversation.id,
        labelId: label.id,
        assignedById: userId
      }
    },
    update: { assignedAt: new Date() },
    create: {
      conversationId: conversation.id,
      labelId: label.id,
      assignedById: userId
    }
  });

  const refreshed = await prisma.conversation.findUnique({
    where: { id: conversation.id },
    include: conversationInclude
  });

  return {
    success: true,
    message: "Etiqueta agregada.",
    conversation: serializeConversation(refreshed, userId)
  };
};

const pinMessage = async ({
  userId: userReference,
  messageId: messageReference
}) => {
  const userId = await ensureUserId(userReference);
  const messageId = ensureMessageId(messageReference);

  const message = await prisma.message.findUnique({
    where: { id: messageId }
  });

  if (!message) {
    badRequest("Mensaje no encontrado.", 404);
  }

  await getConversationForUser(message.conversationId, userId);

  const existing = await prisma.conversationPinnedMessage.findUnique({
    where: {
      conversationId_messageId_pinnedById: {
        conversationId: message.conversationId,
        messageId,
        pinnedById: userId
      }
    }
  });

  if (existing) {
    await prisma.conversationPinnedMessage.delete({
      where: { id: existing.id }
    });
  } else {
    await prisma.conversationPinnedMessage.create({
      data: {
        conversationId: message.conversationId,
        messageId,
        pinnedById: userId
      }
    });
  }

  const refreshed = await prisma.conversation.findUnique({
    where: { id: message.conversationId },
    include: conversationInclude
  });

  return {
    success: true,
    message: existing
      ? "Mensaje desfijado."
      : "Mensaje fijado.",
    conversation: serializeConversation(refreshed, userId)
  };
};

const searchMessages = async ({
  userId: userReference,
  query,
  conversationId: conversationReference
}) => {
  const userId = await ensureUserId(userReference);
  const safeQuery = sanitizeText(query || "");

  if (!safeQuery) {
    badRequest("Debes enviar un texto de búsqueda.");
  }

  const conversationId = conversationReference
    ? ensureConversationId(conversationReference)
    : null;

  if (conversationId) {
    await getConversationForUser(conversationId, userId);
  }

  const messages = await prisma.message.findMany({
    where: {
      deletedForEveryone: false,
      conversation: {
        participants: { some: { userId } }
      },
      ...(conversationId ? { conversationId } : {}),
      OR: [
        {
          text: {
            contains: safeQuery,
            mode: "insensitive"
          }
        },
        {
          content: {
            contains: safeQuery,
            mode: "insensitive"
          }
        }
      ]
    },
    include: messageInclude,
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return {
    success: true,
    count: messages.length,
    messages: messages.map(serializeMessage)
  };
};

const exportConversation = async ({
  userId: userReference,
  conversationId: conversationReference
}) => {
  const userId = await ensureUserId(userReference);
  const conversation = await getConversationForUser(
    conversationReference,
    userId
  );

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    include: messageInclude,
    orderBy: { createdAt: "asc" }
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { exportCount: { increment: 1 } }
  });

  return {
    success: true,
    fileName: `qsm-conversation-${conversation.id}.json`,
    exportedAt: new Date(),
    conversation: serializeConversation(conversation, userId),
    messages: messages.map(serializeMessage)
  };
};

module.exports = {
  getConversations,
  createConversation,
  getConversationMessages,
  markConversationAsRead,
  sendMessage,
  editMessage,
  deleteMessage,
  muteConversation,
  archiveConversation,
  blockConversation,
  favoriteConversation,
  addConversationLabel,
  pinMessage,
  searchMessages,
  exportConversation
};
