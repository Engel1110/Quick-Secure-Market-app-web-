const fs = require("fs");
const path = require("path");

const prisma = require(
  "../../utils/prisma"
);

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const mapsPath = path.join(
  __dirname,
  "../../../RECOVERY_IMPORT_MAPS.json"
);

function readMaps() {
  try {
    if (!fs.existsSync(mapsPath)) {
      return {};
    }

    return JSON.parse(
      fs
        .readFileSync(
          mapsPath,
          "utf8"
        )
        .replace(/^\uFEFF/, "")
    );
  } catch (error) {
    console.warn(
      "No se pudieron leer los mapas del Messenger:",
      error.message
    );

    return {};
  }
}

const maps = readMaps();

function createError(
  message,
  statusCode = 400
) {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
}

function normalizeReference(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value === "object"
  ) {
    const nested =
      value.id ??
      value._id ??
      value.userId;

    if (
      nested !== undefined &&
      nested !== value
    ) {
      return normalizeReference(
        nested
      );
    }
  }

  const normalized =
    String(value).trim();

  return normalized ===
    "[object Object]"
      ? ""
      : normalized;
}

function parsePositiveInt(value) {
  const normalized =
    normalizeReference(value);

  if (
    !/^\d+$/.test(
      normalized
    )
  ) {
    return null;
  }

  const number =
    Number(normalized);

  return (
    Number.isSafeInteger(number) &&
    number > 0
  )
    ? number
    : null;
}

function resolveMappedId(
  map,
  value
) {
  const numericId =
    parsePositiveInt(value);

  if (numericId) {
    return numericId;
  }

  const legacyId =
    normalizeReference(value);

  const mappedId =
    Number(
      map?.[legacyId]
    );

  return (
    Number.isSafeInteger(
      mappedId
    ) &&
    mappedId > 0
  )
    ? mappedId
    : null;
}

function pagination(query = {}) {
  const requestedPage =
    Number(query.page || 1);

  const requestedLimit =
    Number(
      query.limit ||
      DEFAULT_LIMIT
    );

  const page =
    Number.isFinite(
      requestedPage
    )
      ? Math.max(
          Math.floor(
            requestedPage
          ),
          1
        )
      : 1;

  const limit =
    Number.isFinite(
      requestedLimit
    )
      ? Math.min(
          Math.max(
            Math.floor(
              requestedLimit
            ),
            1
          ),
          MAX_LIMIT
        )
      : DEFAULT_LIMIT;

  return {
    page,
    limit,
    skip:
      (page - 1) *
      limit
  };
}

function dateRange(
  from,
  to
) {
  if (!from && !to) {
    return null;
  }

  const range = {};

  if (from) {
    const date =
      new Date(from);

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      date.setHours(
        0,
        0,
        0,
        0
      );

      range.gte =
        date;
    }
  }

  if (to) {
    const date =
      new Date(to);

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      date.setHours(
        23,
        59,
        59,
        999
      );

      range.lte =
        date;
    }
  }

  return Object.keys(
    range
  ).length
    ? range
    : null;
}

function normalizeBoolean(
  value
) {
  return String(
    value || ""
  ).toLowerCase() ===
    "true";
}

function normalizeAttachments(
  attachments
) {
  return Array.isArray(
    attachments
  )
    ? attachments
    : [];
}

function attachmentMimeType(
  attachment
) {
  return String(
    attachment?.mimeType ||
    attachment?.mimetype ||
    attachment?.type ||
    ""
  ).toLowerCase();
}

function attachmentName(
  attachment
) {
  return String(
    attachment?.name ||
    attachment?.fileName ||
    attachment?.filename ||
    ""
  );
}

function matchesAttachmentFilter(
  attachments,
  query
) {
  const files =
    normalizeAttachments(
      attachments
    );

  const hasAttachments =
    normalizeBoolean(
      query.hasAttachments
    );

  const fileType =
    String(
      query.fileType || ""
    )
      .trim()
      .toUpperCase();

  if (
    hasAttachments &&
    files.length === 0
  ) {
    return false;
  }

  if (!fileType) {
    return true;
  }

  if (fileType === "FILE") {
    return files.length > 0;
  }

  return files.some(
    (attachment) => {
      const mimeType =
        attachmentMimeType(
          attachment
        );

      const name =
        attachmentName(
          attachment
        ).toLowerCase();

      if (
        fileType === "IMAGE"
      ) {
        return mimeType.startsWith(
          "image/"
        );
      }

      if (
        fileType === "VIDEO"
      ) {
        return mimeType.startsWith(
          "video/"
        );
      }

      if (
        fileType === "AUDIO"
      ) {
        return mimeType.startsWith(
          "audio/"
        );
      }

      if (
        fileType === "PDF"
      ) {
        return (
          mimeType ===
            "application/pdf" ||
          name.endsWith(".pdf")
        );
      }

      return true;
    }
  );
}

function matchesText(
  message,
  searchText
) {
  if (!searchText) {
    return true;
  }

  const normalizedSearch =
    searchText.toLowerCase();

  const content =
    String(
      message.content || ""
    ).toLowerCase();

  const text =
    String(
      message.text || ""
    ).toLowerCase();

  const attachmentMatch =
    normalizeAttachments(
      message.attachments
    ).some(
      (attachment) =>
        attachmentName(
          attachment
        )
          .toLowerCase()
          .includes(
            normalizedSearch
          )
    );

  return (
    content.includes(
      normalizedSearch
    ) ||
    text.includes(
      normalizedSearch
    ) ||
    attachmentMatch
  );
}

function person(user) {
  if (!user) {
    return null;
  }

  const name = [
    user.firstName,
    user.lastName
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    _id:
      String(user.id),

    id:
      user.id,

    name:
      name ||
      user.email ||
      "Usuario QSM",

    firstName:
      user.firstName ||
      "",

    lastName:
      user.lastName ||
      "",

    email:
      user.email ||
      "",

    role:
      user.role ||
      "USER"
  };
}

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true
};

function serializeMessage(
  message,
  searchText
) {
  const preview =
    String(
      message.content ||
      message.text ||
      ""
    ).slice(
      0,
      220
    );

  return {
    ...message,

    _id:
      String(message.id),

    conversationId:
      message.conversationId,

    sender:
      person(
        message.sender
      ),

    receiver:
      person(
        message.receiver
      ),

    conversation:
      message.conversation
        ? {
            ...message.conversation,

            _id:
              String(
                message
                  .conversation
                  .id
              ),

            lastMessage: {
              content:
                message
                  .conversation
                  .lastMessageText ||
                ""
            }
          }
        : null,

    order:
      message.order
        ? {
            ...message.order,
            _id:
              String(
                message.order.id
              )
          }
        : null,

    product:
      message.product
        ? {
            ...message.product,

            _id:
              String(
                message.product.id
              ),

            name:
              message.product.title
          }
        : null,

    attachments:
      normalizeAttachments(
        message.attachments
      ),

    searchMeta: {
      matchedText:
        searchText ||
        null,

      preview
    }
  };
}

function serializeConversation(
  row
) {
  const conversation =
    row.conversation;

  const product =
    conversation.product
      ? {
          ...conversation.product,

          _id:
            String(
              conversation
                .product
                .id
            ),

          name:
            conversation
              .product
              .title
        }
      : null;

  const participants =
    conversation.participants.map(
      (participant) => ({
        ...person(
          participant.user
        ),

        unreadCount:
          participant.unreadCount,

        muted:
          participant.muted,

        archived:
          participant.archived,

        blocked:
          participant.blocked,

        favorite:
          participant.favorite,

        pinned:
          participant.pinned
      })
    );

  const labels =
    conversation
      .labelAssignments
      .map(
        (assignment) => ({
          ...assignment.label,

          _id:
            String(
              assignment
                .label
                .id
            ),

          assignedById:
            assignment
              .assignedById,

          assignedAt:
            assignment
              .assignedAt
        })
      );

  return {
    ...conversation,

    _id:
      String(
        conversation.id
      ),

    title:
      product?.name ||
      `Conversación #${conversation.id}`,

    subject:
      product?.name ||
      `Conversación #${conversation.id}`,

    product,

    order:
      conversation.order
        ? {
            ...conversation.order,

            _id:
              String(
                conversation
                  .order
                  .id
              )
          }
        : null,

    participants,
    labels,

    lastMessage: {
      content:
        conversation
          .lastMessageText ||
        "",

      senderId:
        conversation
          .lastMessageSenderId,

      createdAt:
        conversation
          .lastMessageAt
    },

    archived:
      row.archived,

    favorite:
      row.favorite,

    pinned:
      row.pinned,

    muted:
      row.muted,

    blocked:
      row.blocked,

    unreadCount:
      row.unreadCount
  };
}

async function resolveCurrentUserId(
  userReference
) {
  const userId =
    resolveMappedId(
      maps.userMap,
      userReference
    );

  if (!userId) {
    throw createError(
      "Usuario autenticado no válido.",
      401
    );
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id:
          userId
      },

      select: {
        id:
          true
      }
    });

  if (!user) {
    throw createError(
      "Usuario autenticado no encontrado.",
      401
    );
  }

  return user.id;
}

async function resolveLabelId(
  value
) {
  const numericId =
    parsePositiveInt(value);

  if (numericId) {
    return numericId;
  }

  const legacyMongoId =
    normalizeReference(value);

  if (!legacyMongoId) {
    return null;
  }

  const mappedId =
    Number(
      maps.conversationLabelMap?.[
        legacyMongoId
      ] ||
      maps.labelMap?.[
        legacyMongoId
      ]
    );

  if (
    Number.isSafeInteger(
      mappedId
    ) &&
    mappedId > 0
  ) {
    return mappedId;
  }

  const label =
    await prisma
      .conversationLabel
      .findFirst({
        where: {
          legacyMongoId
        },

        select: {
          id:
            true
        }
      });

  return label?.id ||
    null;
}

async function accessibleConversations(
  userReference,
  query = {}
) {
  const userId =
    await resolveCurrentUserId(
      userReference
    );

  const participantWhere = {
    userId
  };

  if (
    query.archived === "true"
  ) {
    participantWhere.archived =
      true;
  }

  if (
    query.archived === "false"
  ) {
    participantWhere.archived =
      false;
  }

  if (
    query.favorite === "true"
  ) {
    participantWhere.favorite =
      true;
  }

  if (
    query.pinned === "true"
  ) {
    participantWhere.pinned =
      true;
  }

  const conversationWhere = {};

  if (query.category) {
    conversationWhere.category =
      String(
        query.category
      ).toUpperCase();
  }

  if (query.priority) {
    conversationWhere.priority =
      String(
        query.priority
      ).toUpperCase();
  }

  if (
    query.conversationId
  ) {
    const conversationId =
      resolveMappedId(
        maps.conversationMap,
        query.conversationId
      );

    if (!conversationId) {
      return {
        userId,
        rows: []
      };
    }

    conversationWhere.id =
      conversationId;
  }

  if (query.labelId) {
    const labelId =
      await resolveLabelId(
        query.labelId
      );

    if (!labelId) {
      return {
        userId,
        rows: []
      };
    }

    conversationWhere
      .labelAssignments = {
        some: {
          labelId,
          assignedById:
            userId
        }
      };
  }

  const range =
    dateRange(
      query.from,
      query.to
    );

  if (
    range &&
    query.searchMode ===
      "CONVERSATIONS"
  ) {
    conversationWhere.updatedAt =
      range;
  }

  if (
    Object.keys(
      conversationWhere
    ).length
  ) {
    participantWhere.conversation = {
      is:
        conversationWhere
    };
  }

  const rows =
    await prisma
      .conversationParticipant
      .findMany({
        where:
          participantWhere,

        select: {
          conversationId:
            true
        }
      });

  return {
    userId,

    rows
  };
}

async function searchMessages({
  userId:
    userReference,
  query = {}
}) {
  const {
    page,
    limit,
    skip
  } =
    pagination(query);

  const access =
    await accessibleConversations(
      userReference,
      query
    );

  const conversationIds =
    access.rows.map(
      (row) =>
        row.conversationId
    );

  if (
    conversationIds.length === 0
  ) {
    return {
      items: [],

      pagination: {
        page,
        limit,
        total:
          0,
        pages:
          0
      }
    };
  }

  const where = {
    conversationId: {
      in:
        conversationIds
    }
  };

  const range =
    dateRange(
      query.from,
      query.to
    );

  if (range) {
    where.createdAt =
      range;
  }

  if (query.senderId) {
    const senderId =
      resolveMappedId(
        maps.userMap,
        query.senderId
      );

    if (!senderId) {
      return {
        items: [],

        pagination: {
          page,
          limit,
          total:
            0,
          pages:
            0
        }
      };
    }

    where.senderId =
      senderId;
  }

  if (query.orderId) {
    const orderId =
      resolveMappedId(
        maps.orderMap,
        query.orderId
      );

    if (!orderId) {
      return {
        items: [],

        pagination: {
          page,
          limit,
          total:
            0,
          pages:
            0
        }
      };
    }

    where.orderId =
      orderId;
  }

  if (query.productId) {
    const productId =
      resolveMappedId(
        maps.productMap,
        query.productId
      );

    if (!productId) {
      return {
        items: [],

        pagination: {
          page,
          limit,
          total:
            0,
          pages:
            0
        }
      };
    }

    where.productId =
      productId;
  }

  if (
    normalizeBoolean(
      query.hasAiAlert
    )
  ) {
    where.riskLevel = {
      in: [
        "HIGH",
        "CRITICAL"
      ]
    };
  }

  if (
    normalizeBoolean(
      query.reported
    )
  ) {
    where.isFlagged =
      true;
  }

  const orderBy =
    query.sort ===
    "OLDEST"
      ? {
          createdAt:
            "asc"
        }
      : {
          createdAt:
            "desc"
        };

  const candidates =
    await prisma.message.findMany({
      where,
      orderBy,

      include: {
        sender: {
          select:
            userSelect
        },

        receiver: {
          select:
            userSelect
        },

        conversation: {
          select: {
            id:
              true,

            category:
              true,

            priority:
              true,

            status:
              true,

            lastMessageText:
              true,

            lastMessageSenderId:
              true,

            lastMessageAt:
              true,

            updatedAt:
              true
          }
        },

        order: {
          select: {
            id:
              true
          }
        },

        product: {
          select: {
            id:
              true,

            title:
              true,

            qsmCode:
              true,

            imageUrl:
              true,

            images:
              true
          }
        }
      }
    });

  const searchText =
    String(
      query.q || ""
    ).trim();

  const filtered =
    candidates.filter(
      (message) =>
        matchesText(
          message,
          searchText
        ) &&
        matchesAttachmentFilter(
          message.attachments,
          query
        )
    );

  const total =
    filtered.length;

  const items =
    filtered
      .slice(
        skip,
        skip + limit
      )
      .map(
        (message) =>
          serializeMessage(
            message,
            searchText
          )
      );

  return {
    items,

    pagination: {
      page,
      limit,
      total,

      pages:
        total
          ? Math.ceil(
              total /
              limit
            )
          : 0
    }
  };
}

async function searchConversations({
  userId:
    userReference,
  query = {}
}) {
  const {
    page,
    limit,
    skip
  } =
    pagination(query);

  const access =
    await accessibleConversations(
      userReference,
      {
        ...query,
        searchMode:
          "CONVERSATIONS"
      }
    );

  const conversationIds =
    access.rows.map(
      (row) =>
        row.conversationId
    );

  if (
    conversationIds.length === 0
  ) {
    return {
      items: [],

      pagination: {
        page,
        limit,
        total:
          0,
        pages:
          0
      }
    };
  }

  const participantRows =
    await prisma
      .conversationParticipant
      .findMany({
        where: {
          userId:
            access.userId,

          conversationId: {
            in:
              conversationIds
          }
        },

        include: {
          conversation: {
            include: {
              product: {
                select: {
                  id:
                    true,

                  title:
                    true,

                  qsmCode:
                    true,

                  imageUrl:
                    true,

                  images:
                    true
                }
              },

              order: {
                select: {
                  id:
                    true
                }
              },

              participants: {
                include: {
                  user: {
                    select:
                      userSelect
                  }
                }
              },

              labelAssignments: {
                include: {
                  label:
                    true
                }
              }
            }
          }
        }
      });

  const searchText =
    String(
      query.q || ""
    )
      .trim()
      .toLowerCase();

  const filtered =
    participantRows
      .filter(
        (row) => {
          if (!searchText) {
            return true;
          }

          const conversation =
            row.conversation;

          const values = [
            conversation
              .lastMessageText,

            conversation
              .product
              ?.title,

            conversation
              .product
              ?.qsmCode,

            `Conversación ${conversation.id}`,

            conversation.orderId
              ? String(
                  conversation
                    .orderId
                )
              : ""
          ];

          return values.some(
            (value) =>
              String(value || "")
                .toLowerCase()
                .includes(
                  searchText
                )
          );
        }
      )
      .sort(
        (left, right) =>
          new Date(
            right
              .conversation
              .updatedAt
          ).getTime() -
          new Date(
            left
              .conversation
              .updatedAt
          ).getTime()
      );

  const total =
    filtered.length;

  const items =
    filtered
      .slice(
        skip,
        skip + limit
      )
      .map(
        serializeConversation
      );

  return {
    items,

    pagination: {
      page,
      limit,
      total,

      pages:
        total
          ? Math.ceil(
              total /
              limit
            )
          : 0
    }
  };
}

module.exports = {
  searchMessages,
  searchConversations
};