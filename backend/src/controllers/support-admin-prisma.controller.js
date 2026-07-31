const prisma = require("../utils/prisma");

const {
  createNotification
} = require(
  "../services/notification.service"
);

const VIEW_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "AUDITOR",
  "SUPPORT_MANAGER",
  "SUPPORT_AGENT",
  "HELPDESK"
];

const WRITE_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "SUPPORT_MANAGER",
  "SUPPORT_AGENT",
  "HELPDESK"
];

const VALID_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_USER",
  "ESCALATED",
  "RESOLVED",
  "CLOSED"
];

const VALID_CATEGORIES = [
  "ACCOUNT",
  "VERIFICATION",
  "ORDER",
  "DELIVERY",
  "PAYMENT",
  "DISPUTE",
  "PRODUCT",
  "TECHNICAL"
];

const VALID_PRIORITIES = [
  "LOW",
  "NORMAL",
  "MEDIUM",
  "HIGH",
  "CRITICAL"
];

const VALID_CHANNELS = [
  "WEB",
  "CHAT",
  "EMAIL",
  "PHONE"
];

function normalize(
  value,
  fallback = ""
) {
  const result = String(
    value || fallback
  )
    .trim()
    .toUpperCase();

  return result || fallback;
}

function asArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function personName(user) {
  const name = [
    user?.firstName,
    user?.lastName
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    name ||
    user?.name ||
    user?.email ||
    "Usuario QSM"
  );
}

function parseId(value) {
  const direct =
    Number(value);

  if (
    Number.isSafeInteger(direct) &&
    direct > 0
  ) {
    return direct;
  }

  const match =
    String(value || "").match(
      /(\d+)$/
    );

  const parsed =
    Number(match?.[1]);

  return Number.isSafeInteger(parsed) &&
    parsed > 0
    ? parsed
    : null;
}

function hasAccess(
  req,
  write = false
) {
  const role =
    normalize(req.user?.role);

  const department =
    normalize(
      req.user?.department
    );

  const departments =
    asArray(
      req.user?.departments
    ).map(normalize);

  const permissions =
    asArray(
      req.user?.permissions
    ).map(normalize);

  const roles =
    write
      ? WRITE_ROLES
      : VIEW_ROLES;

  return (
    roles.includes(role) ||
    department === "SUPPORT" ||
    departments.includes(
      "SUPPORT"
    ) ||
    permissions.includes("*") ||
    permissions.includes(
      "SUPPORT.VIEW"
    ) ||
    permissions.includes(
      "SUPPORT.MANAGE"
    ) ||
    permissions.includes(
      "SUPPORT_VIEW"
    ) ||
    permissions.includes(
      "SUPPORT_MANAGE"
    )
  );
}

function isSupportAgent(user) {
  const role =
    normalize(user?.role);

  const department =
    normalize(
      user?.department
    );

  const departments =
    asArray(
      user?.departments
    ).map(normalize);

  const permissions =
    asArray(
      user?.permissions
    ).map(normalize);

  return (
    WRITE_ROLES.includes(role) ||
    department === "SUPPORT" ||
    departments.includes(
      "SUPPORT"
    ) ||
    permissions.includes("*") ||
    permissions.includes(
      "SUPPORT.MANAGE"
    ) ||
    permissions.includes(
      "SUPPORT_MANAGE"
    )
  );
}

function deny(res) {
  return res
    .status(403)
    .json({
      success: false,
      message:
        "No tienes permisos para acceder a Soporte."
    });
}

function relativeTime(value) {
  if (!value) {
    return "Sin actividad";
  }

  const milliseconds =
    Date.now() -
    new Date(value).getTime();

  if (
    !Number.isFinite(milliseconds) ||
    milliseconds < 60000
  ) {
    return "Ahora";
  }

  const minutes =
    Math.floor(
      milliseconds / 60000
    );

  if (minutes < 60) {
    return `Hace ${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `Hace ${hours} h`;
  }

  return `Hace ${Math.floor(
    hours / 24
  )} d`;
}

function serializeMessage(message) {
  return {
    id:
      `MSG-${message.id}`,

    numericId:
      message.id,

    author:
      message.authorName ||
      personName(
        message.author
      ),

    role:
      message.authorRole ||
      "Usuario",

    message:
      message.message,

    isInternal:
      message.isInternal,

    createdAt:
      message.createdAt,

    time:
      relativeTime(
        message.createdAt
      )
  };
}

function serializeTicket(ticket) {
  return {
    id:
      `SUP-${ticket.id}`,

    numericId:
      ticket.id,

    subject:
      ticket.subject,

    description:
      ticket.description,

    category:
      ticket.category,

    status:
      ticket.status,

    priority:
      ticket.priority,

    user: {
      id:
        `USR-${ticket.userId}`,

      numericId:
        ticket.userId,

      name:
        personName(
          ticket.user
        ),

      email:
        ticket.user?.email ||
        "",

      trustScore:
        Number(
          ticket.user?.trustScore ||
            0
        )
    },

    assignedAgent:
      ticket.assignedAgent
        ? {
            id:
              `AGT-${ticket.assignedAgent.id}`,

            numericId:
              ticket.assignedAgent.id,

            name:
              personName(
                ticket.assignedAgent
              )
          }
        : null,

    createdAt:
      ticket.createdAt,

    updatedAt:
      ticket.updatedAt,

    lastUpdate:
      relativeTime(
        ticket.lastMessageAt ||
        ticket.updatedAt
      ),

    unreadMessages:
      Number(
        ticket.unreadMessages ||
          0
      ),

    channel:
      ticket.channel,

    relatedEntity: {
      type:
        ticket.relatedEntityType ||
        "GENERAL",

      id:
        ticket.relatedEntityId ||
        "N/D"
    },

    messages:
      asArray(
        ticket.messages
      ).map(
        serializeMessage
      )
  };
}

async function notifyUser(
  userId,
  title,
  message
) {
  try {
    await createNotification(
      userId,
      "SUPPORT_UPDATE",
      title,
      message
    );
  } catch (error) {
    console.warn(
      "No se pudo crear la notificación de Soporte:",
      error.message
    );
  }
}

async function getSupportDashboard(
  req,
  res
) {
  try {
    if (!hasAccess(req)) {
      return deny(res);
    }

    const now =
      new Date();

    const today =
      new Date(now);

    today.setHours(
      0,
      0,
      0,
      0
    );

    const [
      tickets,
      users
    ] =
      await Promise.all([
        prisma.supportTicket.findMany({
          orderBy: [
            {
              updatedAt:
                "desc"
            },
            {
              createdAt:
                "desc"
            }
          ],

          take:
            500,

          include: {
            user:
              true,

            assignedAgent:
              true,

            messages: {
              orderBy: {
                createdAt:
                  "asc"
              }
            }
          }
        }),

        prisma.user.findMany({
          orderBy: [
            {
              firstName:
                "asc"
            },
            {
              lastName:
                "asc"
            }
          ]
        })
      ]);

    const supportUsers =
      users.filter(
        isSupportAgent
      );

    const agents =
      supportUsers.map(
        (agent) => {
          const assigned =
            tickets.filter(
              (ticket) =>
                ticket.assignedAgentId ===
                agent.id
            );

          const active =
            assigned.filter(
              (ticket) =>
                ![
                  "RESOLVED",
                  "CLOSED"
                ].includes(
                  ticket.status
                )
            );

          const resolvedToday =
            assigned.filter(
              (ticket) =>
                ticket.resolvedAt &&
                new Date(
                  ticket.resolvedAt
                ) >= today
            ).length;

          const responseTimes =
            assigned
              .filter(
                (ticket) =>
                  ticket.firstResponseAt
              )
              .map(
                (ticket) =>
                  Math.max(
                    0,
                    Math.round(
                      (
                        new Date(
                          ticket.firstResponseAt
                        ).getTime() -
                        new Date(
                          ticket.createdAt
                        ).getTime()
                      ) /
                        60000
                    )
                  )
              );

          const averageMinutes =
            responseTimes.length
              ? Math.round(
                  responseTimes.reduce(
                    (
                      total,
                      value
                    ) =>
                      total + value,
                    0
                  ) /
                    responseTimes.length
                )
              : null;

          return {
            id:
              `AGT-${agent.id}`,

            numericId:
              agent.id,

            name:
              personName(agent),

            activeTickets:
              active.length,

            resolvedToday,

            responseTime:
              averageMinutes === null
                ? "N/D"
                : `${averageMinutes} min`,

            satisfaction:
              null
          };
        }
      );

    const totalClosed =
      tickets.filter(
        (ticket) =>
          [
            "RESOLVED",
            "CLOSED"
          ].includes(
            ticket.status
          )
      ).length;

    const resolutionRate =
      tickets.length
        ? Math.round(
            totalClosed /
              tickets.length *
              100
          )
        : 100;

    const criticalOpen =
      tickets.filter(
        (ticket) =>
          ticket.priority ===
            "CRITICAL" &&
          ![
            "RESOLVED",
            "CLOSED"
          ].includes(
            ticket.status
          )
      );

    const escalated =
      tickets.filter(
        (ticket) =>
          ticket.status ===
          "ESCALATED"
      );

    const unassigned =
      tickets.filter(
        (ticket) =>
          !ticket.assignedAgentId &&
          ![
            "RESOLVED",
            "CLOSED"
          ].includes(
            ticket.status
          )
      );

    const alerts = [];

    if (criticalOpen.length) {
      alerts.push({
        id:
          "SUPPORT-CRITICAL",

        title:
          `${criticalOpen.length} casos críticos`,

        description:
          "Existen tickets críticos pendientes de resolución.",

        severity:
          "CRITICAL"
      });
    }

    if (escalated.length) {
      alerts.push({
        id:
          "SUPPORT-ESCALATED",

        title:
          `${escalated.length} casos escalados`,

        description:
          "Existen tickets enviados a otro nivel de atención.",

        severity:
          "HIGH"
      });
    }

    if (unassigned.length) {
      alerts.push({
        id:
          "SUPPORT-UNASSIGNED",

        title:
          `${unassigned.length} tickets sin agente`,

        description:
          "Hay casos pendientes de asignación.",

        severity:
          "MEDIUM"
      });
    }

    const recentActivity =
      tickets
        .slice(0, 8)
        .map(
          (ticket) => ({
            id:
              `ACT-${ticket.id}`,

            title:
              `${ticket.status}: ${ticket.subject}`,

            description:
              ticket.assignedAgent
                ? `Asignado a ${personName(
                    ticket.assignedAgent
                  )}.`
                : "Ticket sin agente asignado.",

            time:
              relativeTime(
                ticket.updatedAt
              ),

            icon:
              ticket.priority ===
              "CRITICAL"
                ? "🚨"
                : ticket.status ===
                    "RESOLVED"
                  ? "✅"
                  : "🎫"
          })
        );

    return res.json({
      success: true,

      data: {
        generatedAt:
          now,

        kpis: {
          open:
            tickets.filter(
              (ticket) =>
                ticket.status ===
                "OPEN"
            ).length,

          inProgress:
            tickets.filter(
              (ticket) =>
                ticket.status ===
                "IN_PROGRESS"
            ).length,

          waitingUser:
            tickets.filter(
              (ticket) =>
                ticket.status ===
                "WAITING_USER"
            ).length,

          escalated:
            escalated.length,

          resolvedToday:
            tickets.filter(
              (ticket) =>
                ticket.resolvedAt &&
                new Date(
                  ticket.resolvedAt
                ) >= today
            ).length,

          critical:
            criticalOpen.length,

          activeAgents:
            agents.length,

          resolutionRate
        },

        tickets:
          tickets.map(
            serializeTicket
          ),

        agents,
        alerts,
        recentActivity
      }
    });
  } catch (error) {
    console.error(
      "Error cargando Soporte:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo cargar el dashboard de Soporte.",
        error:
          error.message
      });
  }
}

async function createSupportTicket(
  req,
  res
) {
  try {
    if (!hasAccess(req, true)) {
      return deny(res);
    }

    const subject =
      String(
        req.body?.subject ||
          ""
      ).trim();

    if (!subject) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "El asunto del ticket es obligatorio."
        });
    }

    const requestedUserId =
      parseId(
        req.body?.userId
      );

    const userEmail =
      String(
        req.body?.userEmail ||
          ""
      )
        .trim()
        .toLowerCase();

    let user = null;

    if (requestedUserId) {
      user =
        await prisma.user.findUnique({
          where: {
            id:
              requestedUserId
          }
        });
    } else if (userEmail) {
      user =
        await prisma.user.findUnique({
          where: {
            email:
              userEmail
          }
        });
    }

    if (!user) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "No se encontró el usuario del ticket."
        });
    }

    const category =
      normalize(
        req.body?.category,
        "TECHNICAL"
      );

    const priority =
      normalize(
        req.body?.priority,
        "NORMAL"
      );

    const channel =
      normalize(
        req.body?.channel,
        "WEB"
      );

    if (
      !VALID_CATEGORIES.includes(
        category
      ) ||
      !VALID_PRIORITIES.includes(
        priority
      ) ||
      !VALID_CHANNELS.includes(
        channel
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Categoría, prioridad o canal inválido."
        });
    }

    const description =
      String(
        req.body?.description ||
          ""
      ).trim();

    const ticket =
      await prisma.supportTicket.create({
        data: {
          userId:
            user.id,

          subject,
          description,
          category,
          priority,
          channel,

          relatedEntityType:
            normalize(
              req.body
                ?.relatedEntityType
            ),

          relatedEntityId:
            String(
              req.body
                ?.relatedEntityId ||
                ""
            ).trim(),

          lastMessageAt:
            description
              ? new Date()
              : null,

          unreadMessages:
            description
              ? 1
              : 0,

          messages:
            description
              ? {
                  create: {
                    authorId:
                      user.id,

                    authorName:
                      personName(
                        user
                      ),

                    authorRole:
                      "USER",

                    message:
                      description
                  }
                }
              : undefined
        },

        include: {
          user:
            true,

          assignedAgent:
            true,

          messages: {
            orderBy: {
              createdAt:
                "asc"
            }
          }
        }
      });

    await notifyUser(
      user.id,
      "Ticket de soporte creado",
      `Tu ticket ${ticket.id} fue creado correctamente.`
    );

    return res
      .status(201)
      .json({
        success: true,
        message:
          "Ticket creado correctamente.",
        ticket:
          serializeTicket(
            ticket
          )
      });
  } catch (error) {
    console.error(
      "Error creando ticket:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo crear el ticket.",
        error:
          error.message
      });
  }
}

async function updateSupportTicket(
  req,
  res
) {
  try {
    if (!hasAccess(req, true)) {
      return deny(res);
    }

    const ticketId =
      parseId(
        req.params.ticketId
      );

    if (!ticketId) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Ticket inválido."
        });
    }

    const current =
      await prisma.supportTicket.findUnique({
        where: {
          id:
            ticketId
        }
      });

    if (!current) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Ticket no encontrado."
        });
    }

    const data = {};

    if (
      req.body?.status !==
      undefined
    ) {
      const status =
        normalize(
          req.body.status
        );

      if (
        !VALID_STATUSES.includes(
          status
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Estado de ticket inválido."
          });
      }

      data.status =
        status;

      if (
        status ===
        "IN_PROGRESS" &&
        !current.firstResponseAt
      ) {
        data.firstResponseAt =
          new Date();
      }

      data.resolvedAt =
        status ===
        "RESOLVED"
          ? new Date()
          : status ===
              "OPEN"
            ? null
            : undefined;

      data.closedAt =
        status ===
        "CLOSED"
          ? new Date()
          : status ===
              "OPEN"
            ? null
            : undefined;
    }

    const hasAgent =
      Object.prototype.hasOwnProperty.call(
        req.body || {},
        "assignedAgent"
      ) ||
      Object.prototype.hasOwnProperty.call(
        req.body || {},
        "assignedAgentId"
      );

    if (hasAgent) {
      const agentId =
        parseId(
          req.body
            ?.assignedAgentId ||
          req.body
            ?.assignedAgent?.id
        );

      if (agentId) {
        const agent =
          await prisma.user.findUnique({
            where: {
              id:
                agentId
            }
          });

        if (
          !agent ||
          !isSupportAgent(agent)
        ) {
          return res
            .status(400)
            .json({
              success: false,
              message:
                "El agente seleccionado no tiene acceso a Soporte."
            });
        }

        data.assignedAgentId =
          agent.id;

        if (!current.firstResponseAt) {
          data.firstResponseAt =
            new Date();
        }
      } else {
        data.assignedAgentId =
          null;
      }
    }

    const ticket =
      await prisma.supportTicket.update({
        where: {
          id:
            ticketId
        },

        data,

        include: {
          user:
            true,

          assignedAgent:
            true,

          messages: {
            orderBy: {
              createdAt:
                "asc"
            }
          }
        }
      });

    await notifyUser(
      ticket.userId,
      "Ticket actualizado",
      `Tu ticket SUP-${ticket.id} cambió a ${ticket.status}.`
    );

    return res.json({
      success: true,
      message:
        "Ticket actualizado correctamente.",
      ticket:
        serializeTicket(
          ticket
        )
    });
  } catch (error) {
    console.error(
      "Error actualizando ticket:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo actualizar el ticket.",
        error:
          error.message
      });
  }
}

async function addSupportMessage(
  req,
  res
) {
  try {
    if (!hasAccess(req, true)) {
      return deny(res);
    }

    const ticketId =
      parseId(
        req.params.ticketId
      );

    const messageText =
      String(
        req.body?.message ||
          ""
      ).trim();

    if (
      !ticketId ||
      !messageText
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "El ticket y el mensaje son obligatorios."
        });
    }

    const ticket =
      await prisma.supportTicket.findUnique({
        where: {
          id:
            ticketId
        }
      });

    if (!ticket) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            "Ticket no encontrado."
        });
    }

    const actor =
      req.prismaUser ||
      req.user ||
      {};

    const actorId =
      parseId(
        actor.id
      );

    const updatedTicket =
      await prisma.$transaction(
        async (tx) => {
          await tx.supportMessage.create({
            data: {
              ticketId,

              authorId:
                actorId,

              authorName:
                personName(
                  actor
                ),

              authorRole:
                normalize(
                  actor.role,
                  "SUPPORT_AGENT"
                ),

              message:
                messageText,

              isInternal:
                Boolean(
                  req.body
                    ?.isInternal
                )
            }
          });

          return tx.supportTicket.update({
            where: {
              id:
                ticketId
            },

            data: {
              lastMessageAt:
                new Date(),

              unreadMessages:
                0,

              status:
                ticket.status ===
                "OPEN"
                  ? "IN_PROGRESS"
                  : ticket.status,

              firstResponseAt:
                ticket.firstResponseAt ||
                new Date()
            },

            include: {
              user:
                true,

              assignedAgent:
                true,

              messages: {
                orderBy: {
                  createdAt:
                    "asc"
                }
              }
            }
          });
        }
      );

    await notifyUser(
      updatedTicket.userId,
      "Nueva respuesta de Soporte",
      messageText
    );

    return res
      .status(201)
      .json({
        success: true,
        message:
          "Mensaje enviado correctamente.",
        ticket:
          serializeTicket(
            updatedTicket
          )
      });
  } catch (error) {
    console.error(
      "Error enviando mensaje:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo enviar el mensaje.",
        error:
          error.message
      });
  }
}

module.exports = {
  getSupportDashboard,
  createSupportTicket,
  updateSupportTicket,
  addSupportMessage
};