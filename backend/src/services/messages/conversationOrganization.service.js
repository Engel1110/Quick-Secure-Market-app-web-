const fs = require("fs");
const path = require("path");

const prisma = require(
  "../../utils/prisma"
);

const MAX_PINNED_CONVERSATIONS = 5;

const SYSTEM_LABELS = [
  {
    name: "Compra",
    slug: "compra",
    color: "#22c55e",
    icon: "shopping-bag"
  },
  {
    name: "Venta",
    slug: "venta",
    color: "#3b82f6",
    icon: "store"
  },
  {
    name: "Soporte",
    slug: "soporte",
    color: "#8b5cf6",
    icon: "headphones"
  },
  {
    name: "Disputa",
    slug: "disputa",
    color: "#ef4444",
    icon: "shield-alert"
  },
  {
    name: "Pago",
    slug: "pago",
    color: "#14b8a6",
    icon: "credit-card"
  },
  {
    name: "Entrega",
    slug: "entrega",
    color: "#f59e0b",
    icon: "truck"
  },
  {
    name: "Reembolso",
    slug: "reembolso",
    color: "#ec4899",
    icon: "rotate-ccw"
  },
  {
    name: "Urgente",
    slug: "urgente",
    color: "#f97316",
    icon: "siren"
  },
  {
    name: "IA",
    slug: "ia",
    color: "#06b6d4",
    icon: "bot"
  },
  {
    name: "Riesgo Alto",
    slug: "riesgo-alto",
    color: "#dc2626",
    icon: "triangle-alert"
  }
];

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

function bad(
  message,
  statusCode = 400
) {
  const error = new Error(message);

  error.statusCode = statusCode;

  throw error;
}

function normalizeReference(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (typeof value === "object") {
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

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  return (
    Number.isSafeInteger(parsed) &&
    parsed > 0
  )
    ? parsed
    : null;
}

function mappedId(
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

  const result =
    Number(map?.[legacyId]);

  return (
    Number.isSafeInteger(result) &&
    result > 0
  )
    ? result
    : null;
}

async function resolveUserId(value) {
  const userId =
    mappedId(
      maps.userMap,
      value
    );

  if (!userId) {
    bad(
      "Usuario autenticado no válido.",
      401
    );
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id: userId
      },

      select: {
        id: true
      }
    });

  if (!user) {
    bad(
      "Usuario autenticado no encontrado.",
      401
    );
  }

  return user.id;
}

async function resolveConversationId(value) {
  const direct =
    mappedId(
      maps.conversationMap,
      value
    );

  if (direct) {
    return direct;
  }

  const legacyMongoId =
    normalizeReference(value);

  if (!legacyMongoId) {
    return null;
  }

  const conversation =
    await prisma.conversation.findFirst({
      where: {
        legacyMongoId
      },

      select: {
        id: true
      }
    });

  return conversation?.id || null;
}

async function resolveLabelId(value) {
  const direct =
    mappedId(
      maps.conversationLabelMap ||
        maps.labelMap,
      value
    );

  if (direct) {
    return direct;
  }

  const legacyMongoId =
    normalizeReference(value);

  if (!legacyMongoId) {
    return null;
  }

  const label =
    await prisma.conversationLabel.findFirst({
      where: {
        legacyMongoId
      },

      select: {
        id: true
      }
    });

  return label?.id || null;
}

function slugify(value) {
  const slug =
    String(value || "")
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .toLowerCase()
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-|-$/g,
        ""
      )
      .slice(0, 50);

  return slug || "etiqueta";
}

function serializeLabel(label) {
  if (!label) {
    return null;
  }

  return {
    ...label,

    _id:
      String(label.id),

    owner:
      label.ownerId
        ? String(
            label.ownerId
          )
        : null
  };
}

async function getConversationForUser(
  conversationReference,
  userReference
) {
  const [
    conversationId,
    userId
  ] =
    await Promise.all([
      resolveConversationId(
        conversationReference
      ),
      resolveUserId(
        userReference
      )
    ]);

  if (!conversationId) {
    bad(
      "conversationId inválido."
    );
  }

  const participant =
    await prisma
      .conversationParticipant
      .findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId
          }
        },

        include: {
          conversation: true
        }
      });

  if (!participant) {
    const conversationExists =
      await prisma.conversation.findUnique({
        where: {
          id: conversationId
        },

        select: {
          id: true
        }
      });

    if (!conversationExists) {
      bad(
        "Conversación no encontrada.",
        404
      );
    }

    bad(
      "No tienes acceso a esta conversación.",
      403
    );
  }

  return {
    conversationId,
    userId,
    participant,
    conversation:
      participant.conversation
  };
}

async function ensureSystemLabels() {
  const labels = [];

  for (const definition of SYSTEM_LABELS) {
    const existing =
      await prisma
        .conversationLabel
        .findFirst({
          where: {
            slug:
              definition.slug,

            ownerId:
              null
          }
        });

    if (existing) {
      const updated =
        await prisma
          .conversationLabel
          .update({
            where: {
              id:
                existing.id
            },

            data: {
              name:
                definition.name,

              color:
                definition.color,

              icon:
                definition.icon,

              isSystem:
                true,

              isActive:
                true
            }
          });

      labels.push(updated);
      continue;
    }

    const created =
      await prisma
        .conversationLabel
        .create({
          data: {
            ...definition,

            isSystem:
              true,

            ownerId:
              null,

            isActive:
              true
          }
        });

    labels.push(created);
  }

  return labels
    .sort((left, right) =>
      left.name.localeCompare(
        right.name,
        "es"
      )
    )
    .map(serializeLabel);
}

async function toggleFavorite({
  conversationId,
  userId,
  enabled
}) {
  const access =
    await getConversationForUser(
      conversationId,
      userId
    );

  const favorite =
    typeof enabled === "boolean"
      ? enabled
      : !access.participant.favorite;

  const participant =
    await prisma
      .conversationParticipant
      .update({
        where: {
          conversationId_userId: {
            conversationId:
              access.conversationId,

            userId:
              access.userId
          }
        },

        data: {
          favorite
        }
      });

  return {
    conversation:
      access.conversation,

    participant,
    favorite
  };
}

async function pinConversation({
  conversationId,
  userId
}) {
  const access =
    await getConversationForUser(
      conversationId,
      userId
    );

  if (access.participant.pinned) {
    return {
      conversation:
        access.conversation,

      pinned: true,

      order:
        access.participant
          .pinnedOrder || 1
    };
  }

  const pinnedCount =
    await prisma
      .conversationParticipant
      .count({
        where: {
          userId:
            access.userId,

          pinned:
            true
        }
      });

  if (
    pinnedCount >=
    MAX_PINNED_CONVERSATIONS
  ) {
    bad(
      `Solo puedes fijar ${MAX_PINNED_CONVERSATIONS} conversaciones.`,
      409
    );
  }

  const maximum =
    await prisma
      .conversationParticipant
      .aggregate({
        where: {
          userId:
            access.userId,

          pinned:
            true
        },

        _max: {
          pinnedOrder:
            true
        }
      });

  const order =
    Number(
      maximum._max
        .pinnedOrder || 0
    ) + 1;

  const participant =
    await prisma
      .conversationParticipant
      .update({
        where: {
          conversationId_userId: {
            conversationId:
              access.conversationId,

            userId:
              access.userId
          }
        },

        data: {
          pinned:
            true,

          pinnedOrder:
            order
        }
      });

  return {
    conversation:
      access.conversation,

    participant,
    pinned:
      true,

    order
  };
}

async function unpinConversation({
  conversationId,
  userId
}) {
  const access =
    await getConversationForUser(
      conversationId,
      userId
    );

  const participant =
    await prisma
      .conversationParticipant
      .update({
        where: {
          conversationId_userId: {
            conversationId:
              access.conversationId,

            userId:
              access.userId
          }
        },

        data: {
          pinned:
            false,

          pinnedOrder:
            null
        }
      });

  return {
    conversation:
      access.conversation,

    participant,
    pinned:
      false
  };
}

async function reorderPinned({
  userId,
  orderedConversationIds = []
}) {
  const resolvedUserId =
    await resolveUserId(userId);

  const resolvedIds =
    await Promise.all(
      (
        Array.isArray(
          orderedConversationIds
        )
          ? orderedConversationIds
          : []
      )
        .slice(
          0,
          MAX_PINNED_CONVERSATIONS
        )
        .map(
          resolveConversationId
        )
    );

  const uniqueIds = [
    ...new Set(
      resolvedIds.filter(Boolean)
    )
  ];

  const updates = [];

  for (
    let index = 0;
    index < uniqueIds.length;
    index++
  ) {
    const conversationId =
      uniqueIds[index];

    const participant =
      await prisma
        .conversationParticipant
        .findUnique({
          where: {
            conversationId_userId: {
              conversationId,
              userId:
                resolvedUserId
            }
          }
        });

    if (
      !participant ||
      !participant.pinned
    ) {
      continue;
    }

    updates.push(
      prisma
        .conversationParticipant
        .update({
          where: {
            conversationId_userId: {
              conversationId,
              userId:
                resolvedUserId
            }
          },

          data: {
            pinnedOrder:
              index + 1
          },

          include: {
            conversation:
              true
          }
        })
    );
  }

  const rows =
    updates.length
      ? await prisma.$transaction(
          updates
        )
      : [];

  return rows.map(
    (row) => ({
      ...row.conversation,

      _id:
        String(
          row.conversation.id
        ),

      pinned:
        row.pinned,

      pinnedOrder:
        row.pinnedOrder
    })
  );
}

async function archiveConversation({
  conversationId,
  userId
}) {
  const access =
    await getConversationForUser(
      conversationId,
      userId
    );

  const participant =
    await prisma
      .conversationParticipant
      .update({
        where: {
          conversationId_userId: {
            conversationId:
              access.conversationId,

            userId:
              access.userId
          }
        },

        data: {
          archived:
            true
        }
      });

  return {
    conversation:
      access.conversation,

    participant,
    archived:
      true
  };
}

async function restoreConversation({
  conversationId,
  userId
}) {
  const access =
    await getConversationForUser(
      conversationId,
      userId
    );

  const participant =
    await prisma
      .conversationParticipant
      .update({
        where: {
          conversationId_userId: {
            conversationId:
              access.conversationId,

            userId:
              access.userId
          }
        },

        data: {
          archived:
            false
        }
      });

  return {
    conversation:
      access.conversation,

    participant,
    archived:
      false
  };
}

async function createCustomLabel({
  userId,
  name,
  color,
  icon
}) {
  const resolvedUserId =
    await resolveUserId(userId);

  const normalizedName =
    String(name || "")
      .trim()
      .slice(0, 40);

  if (!normalizedName) {
    bad(
      "El nombre de la etiqueta es obligatorio."
    );
  }

  const slug =
    slugify(normalizedName);

  const existing =
    await prisma
      .conversationLabel
      .findFirst({
        where: {
          slug,
          ownerId:
            resolvedUserId
        }
      });

  const data = {
    name:
      normalizedName,

    slug,

    color:
      String(
        color || "#8b5cf6"
      ),

    icon:
      String(
        icon || "tag"
      ),

    isSystem:
      false,

    ownerId:
      resolvedUserId,

    isActive:
      true
  };

  const label =
    existing
      ? await prisma
          .conversationLabel
          .update({
            where: {
              id:
                existing.id
            },

            data
          })
      : await prisma
          .conversationLabel
          .create({
            data
          });

  return serializeLabel(label);
}

async function updateCustomLabel({
  labelId,
  userId,
  name,
  color,
  icon
}) {
  const [
    resolvedLabelId,
    resolvedUserId
  ] =
    await Promise.all([
      resolveLabelId(labelId),
      resolveUserId(userId)
    ]);

  if (!resolvedLabelId) {
    bad(
      "labelId inválido."
    );
  }

  const label =
    await prisma
      .conversationLabel
      .findFirst({
        where: {
          id:
            resolvedLabelId,

          ownerId:
            resolvedUserId,

          isSystem:
            false
        }
      });

  if (!label) {
    bad(
      "Etiqueta personalizada no encontrada.",
      404
    );
  }

  const data = {};

  if (name !== undefined) {
    const normalizedName =
      String(name)
        .trim()
        .slice(0, 40);

    if (!normalizedName) {
      bad(
        "El nombre de la etiqueta es obligatorio."
      );
    }

    data.name =
      normalizedName;

    data.slug =
      slugify(
        normalizedName
      );
  }

  if (color !== undefined) {
    data.color =
      String(color);
  }

  if (icon !== undefined) {
    data.icon =
      String(icon);
  }

  const updated =
    await prisma
      .conversationLabel
      .update({
        where: {
          id:
            label.id
        },

        data
      });

  return serializeLabel(updated);
}

async function deleteCustomLabel({
  labelId,
  userId
}) {
  const [
    resolvedLabelId,
    resolvedUserId
  ] =
    await Promise.all([
      resolveLabelId(labelId),
      resolveUserId(userId)
    ]);

  if (!resolvedLabelId) {
    bad(
      "labelId inválido."
    );
  }

  const label =
    await prisma
      .conversationLabel
      .findFirst({
        where: {
          id:
            resolvedLabelId,

          ownerId:
            resolvedUserId,

          isSystem:
            false
        }
      });

  if (!label) {
    bad(
      "Etiqueta personalizada no encontrada.",
      404
    );
  }

  const [
    updated
  ] =
    await prisma.$transaction([
      prisma
        .conversationLabel
        .update({
          where: {
            id:
              label.id
          },

          data: {
            isActive:
              false
          }
        }),

      prisma
        .conversationLabelAssignment
        .deleteMany({
          where: {
            labelId:
              label.id,

            assignedById:
              resolvedUserId
          }
        })
    ]);

  return serializeLabel(updated);
}

async function listAvailableLabels(
  userId
) {
  const resolvedUserId =
    await resolveUserId(userId);

  await ensureSystemLabels();

  const labels =
    await prisma
      .conversationLabel
      .findMany({
        where: {
          isActive:
            true,

          OR: [
            {
              isSystem:
                true,

              ownerId:
                null
            },
            {
              ownerId:
                resolvedUserId
            }
          ]
        },

        orderBy: [
          {
            isSystem:
              "desc"
          },
          {
            name:
              "asc"
          }
        ]
      });

  return labels.map(
    serializeLabel
  );
}

async function assignLabel({
  conversationId,
  labelId,
  userId
}) {
  const access =
    await getConversationForUser(
      conversationId,
      userId
    );

  const resolvedLabelId =
    await resolveLabelId(
      labelId
    );

  if (!resolvedLabelId) {
    bad(
      "labelId inválido."
    );
  }

  const label =
    await prisma
      .conversationLabel
      .findFirst({
        where: {
          id:
            resolvedLabelId,

          isActive:
            true,

          OR: [
            {
              isSystem:
                true,

              ownerId:
                null
            },
            {
              ownerId:
                access.userId
            }
          ]
        }
      });

  if (!label) {
    bad(
      "Etiqueta no disponible.",
      404
    );
  }

  await prisma
    .conversationLabelAssignment
    .upsert({
      where: {
        conversationId_labelId_assignedById: {
          conversationId:
            access.conversationId,

          labelId:
            label.id,

          assignedById:
            access.userId
        }
      },

      update: {
        assignedAt:
          new Date()
      },

      create: {
        conversationId:
          access.conversationId,

        labelId:
          label.id,

        assignedById:
          access.userId
      }
    });

  return {
    conversation:
      access.conversation,

    label:
      serializeLabel(label)
  };
}

async function removeLabel({
  conversationId,
  labelId,
  userId
}) {
  const access =
    await getConversationForUser(
      conversationId,
      userId
    );

  const resolvedLabelId =
    await resolveLabelId(
      labelId
    );

  if (!resolvedLabelId) {
    bad(
      "labelId inválido."
    );
  }

  await prisma
    .conversationLabelAssignment
    .deleteMany({
      where: {
        conversationId:
          access.conversationId,

        labelId:
          resolvedLabelId,

        assignedById:
          access.userId
      }
    });

  return {
    conversation:
      access.conversation,

    removed:
      true
  };
}

async function updateCategory({
  conversationId,
  userId,
  category,
  priority
}) {
  const access =
    await getConversationForUser(
      conversationId,
      userId
    );

  const categories = [
    "GENERAL",
    "BUY",
    "SELL",
    "SUPPORT",
    "DISPUTE"
  ];

  const priorities = [
    "LOW",
    "NORMAL",
    "HIGH",
    "CRITICAL"
  ];

  const data = {};

  if (category !== undefined) {
    const normalizedCategory =
      String(category)
        .trim()
        .toUpperCase();

    if (
      !categories.includes(
        normalizedCategory
      )
    ) {
      bad(
        "Categoría inválida."
      );
    }

    data.category =
      normalizedCategory;
  }

  if (priority !== undefined) {
    const normalizedPriority =
      String(priority)
        .trim()
        .toUpperCase();

    if (
      !priorities.includes(
        normalizedPriority
      )
    ) {
      bad(
        "Prioridad inválida."
      );
    }

    data.priority =
      normalizedPriority;
  }

  if (!Object.keys(data).length) {
    return access.conversation;
  }

  return prisma.conversation.update({
    where: {
      id:
        access.conversationId
    },

    data
  });
}

async function getOrganizationSummary(
  userId
) {
  const resolvedUserId =
    await resolveUserId(userId);

  const rows =
    await prisma
      .conversationParticipant
      .findMany({
        where: {
          userId:
            resolvedUserId
        },

        select: {
          unreadCount:
            true,

          favorite:
            true,

          pinned:
            true,

          archived:
            true,

          conversation: {
            select: {
              category:
                true,

              priority:
                true
            }
          }
        }
      });

  const categories = {
    GENERAL: 0,
    BUY: 0,
    SELL: 0,
    SUPPORT: 0,
    DISPUTE: 0
  };

  for (const row of rows) {
    const category =
      row.conversation
        ?.category ||
      "GENERAL";

    if (
      Object.prototype
        .hasOwnProperty.call(
          categories,
          category
        )
    ) {
      categories[category] += 1;
    }
  }

  return {
    total:
      rows.length,

    favorites:
      rows.filter(
        (row) =>
          row.favorite
      ).length,

    pinned:
      rows.filter(
        (row) =>
          row.pinned
      ).length,

    archived:
      rows.filter(
        (row) =>
          row.archived
      ).length,

    unread:
      rows.filter(
        (row) =>
          Number(
            row.unreadCount || 0
          ) > 0
      ).length,

    highRisk:
      rows.filter(
        (row) =>
          [
            "HIGH",
            "CRITICAL"
          ].includes(
            row.conversation
              ?.priority
          )
      ).length,

    categories
  };
}

module.exports = {
  MAX_PINNED_CONVERSATIONS,
  SYSTEM_LABELS,
  ensureSystemLabels,
  toggleFavorite,
  pinConversation,
  unpinConversation,
  reorderPinned,
  archiveConversation,
  restoreConversation,
  createCustomLabel,
  updateCustomLabel,
  deleteCustomLabel,
  listAvailableLabels,
  assignLabel,
  removeLabel,
  updateCategory,
  getOrganizationSummary
};