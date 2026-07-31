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
  "SECURITY_MANAGER",
  "SECURITY_ANALYST"
];

const WRITE_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "SECURITY_MANAGER",
  "SECURITY_ANALYST"
];

const VALID_ALERT_STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED"
];

const VALID_ACTIONS = [
  "SUSPEND_USER",
  "BLOCK_USER",
  "RESTORE_USER",
  "REQUIRE_FACE_CHECK",
  "CLOSE_USER_SESSIONS",
  "CLOSE_SESSION",
  "TRUST_DEVICE",
  "BLOCK_DEVICE"
];

const normalize = (value) => {
  return String(
    value || ""
  )
    .trim()
    .toUpperCase();
};

const personName = (user) => {
  const name = [
    user?.firstName,
    user?.lastName
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Usuario QSM";
};

const hasAccess = (
  req,
  write = false
) => {
  const role =
    normalize(req.user?.role);

  const department =
    normalize(
      req.user?.department
    );

  const departments =
    Array.isArray(
      req.user?.departments
    )
      ? req.user.departments.map(
          normalize
        )
      : [];

  const permissions =
    Array.isArray(
      req.user?.permissions
    )
      ? req.user.permissions.map(
          normalize
        )
      : [];

  const roles =
    write
      ? WRITE_ROLES
      : VIEW_ROLES;

  return (
    roles.includes(role) ||
    department === "SECURITY" ||
    departments.includes(
      "SECURITY"
    ) ||
    permissions.includes("*") ||
    permissions.includes(
      "SECURITY.VIEW"
    ) ||
    permissions.includes(
      "SECURITY.MANAGE"
    )
  );
};

const deny = (
  res
) => {
  return res
    .status(403)
    .json({
      success: false,
      message:
        "No tienes permisos para acceder a Seguridad."
    });
};

const parseEntityId = (
  value
) => {
  const direct =
    Number(value);

  if (
    Number.isSafeInteger(
      direct
    ) &&
    direct > 0
  ) {
    return direct;
  }

  const match =
    String(
      value || ""
    ).match(
      /(\d+)$/
    );

  const parsed =
    Number(match?.[1]);

  return Number.isSafeInteger(
    parsed
  ) &&
    parsed > 0
    ? parsed
    : null;
};

const relativeTime = (
  value
) => {
  if (!value) {
    return "Sin actividad";
  }

  const date =
    new Date(value);

  const milliseconds =
    Date.now() -
    date.getTime();

  if (
    !Number.isFinite(
      milliseconds
    ) ||
    milliseconds < 0
  ) {
    return "Ahora";
  }

  const minutes =
    Math.floor(
      milliseconds /
        60000
    );

  if (minutes < 1) {
    return "Ahora";
  }

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

  const days =
    Math.floor(
      hours / 24
    );

  return `Hace ${days} d`;
};

const detectBrowser = (
  deviceInfo
) => {
  const text =
    String(
      deviceInfo || ""
    );

  if (/Edg\//i.test(text)) {
    return "Edge";
  }

  if (/Chrome\//i.test(text)) {
    return "Chrome";
  }

  if (/Firefox\//i.test(text)) {
    return "Firefox";
  }

  if (
    /Safari\//i.test(text) &&
    !/Chrome\//i.test(text)
  ) {
    return "Safari";
  }

  return "Desconocido";
};

const detectOperatingSystem = (
  deviceInfo
) => {
  const text =
    String(
      deviceInfo || ""
    );

  if (/Windows/i.test(text)) {
    return "Windows";
  }

  if (/Android/i.test(text)) {
    return "Android";
  }

  if (
    /iPhone|iPad|iOS/i.test(
      text
    )
  ) {
    return "iPhone";
  }

  if (
    /Macintosh|Mac OS/i.test(
      text
    )
  ) {
    return "Mac";
  }

  if (/Linux/i.test(text)) {
    return "Linux";
  }

  return "Desconocido";
};

const calculateUserRisk = (
  user
) => {
  let score = 0;

  const securityLevel =
    normalize(
      user.securityLevel
    );

  const status =
    normalize(user.status);

  if (
    securityLevel ===
    "ELEVATED"
  ) {
    score += 35;
  }

  if (
    securityLevel ===
    "LOCKED"
  ) {
    score += 70;
  }

  if (
    status ===
    "SUSPENDED"
  ) {
    score += 60;
  }

  if (
    status ===
    "BANNED"
  ) {
    score += 90;
  }

  score += Math.min(
    25,
    Number(
      user.failedLoginAttempts ||
        0
    ) * 5
  );

  score += Math.min(
    20,
    Number(
      user.suspiciousLoginCount ||
        0
    ) * 5
  );

  score += Math.min(
    20,
    Number(
      user.fraudReports ||
        0
    ) * 5
  );

  const trustScore =
    Number(
      user.trustScore || 0
    );

  if (trustScore < 50) {
    score +=
      Math.min(
        25,
        50 - trustScore
      );
  }

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(score)
    )
  );
};

const publicUserStatus = (
  user
) => {
  const status =
    normalize(user.status);

  const securityLevel =
    normalize(
      user.securityLevel
    );

  if (
    status === "BANNED" ||
    securityLevel === "LOCKED"
  ) {
    return "BLOCKED";
  }

  if (
    status === "SUSPENDED"
  ) {
    return "SUSPENDED";
  }

  return "ACTIVE";
};

const getSecurityDashboard = async (
  req,
  res
) => {
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
      alerts,
      sessions,
      users
    ] =
      await Promise.all([
        prisma.securityAlert.findMany({
          orderBy: {
            createdAt:
              "desc"
          },

          take:
            300,

          include: {
            user: {
              select: {
                id:
                  true,

                firstName:
                  true,

                lastName:
                  true,

                email:
                  true
              }
            }
          }
        }),

        prisma.sessionLog.findMany({
          orderBy: {
            startedAt:
              "desc"
          },

          take:
            500,

          include: {
            user: {
              select: {
                id:
                  true,

                firstName:
                  true,

                lastName:
                  true,

                email:
                  true
              }
            }
          }
        }),

        prisma.user.findMany({
          orderBy: {
            updatedAt:
              "desc"
          },

          take:
            300,

          select: {
            id:
              true,

            firstName:
              true,

            lastName:
              true,

            email:
              true,

            trustScore:
              true,

            failedLoginAttempts:
              true,

            suspiciousLoginCount:
              true,

            fraudReports:
              true,

            securityLevel:
              true,

            requireFaceCheck:
              true,

            activeSessions:
              true,

            status:
              true,

            lastLoginAt:
              true,

            updatedAt:
              true
          }
        })
      ]);

    const sessionMap =
      new Map();

    sessions.forEach(
      (session) => {
        const current =
          sessionMap.get(
            session.userId
          ) || [];

        current.push(
          session
        );

        sessionMap.set(
          session.userId,
          current
        );
      }
    );

    const serializedUsers =
      users
        .map(
          (user) => {
            const userSessions =
              sessionMap.get(
                user.id
              ) || [];

            const uniqueDevices =
              new Set(
                userSessions
                  .map(
                    (session) =>
                      String(
                        session.deviceInfo ||
                          ""
                      ).trim()
                  )
                  .filter(Boolean)
              );

            const activeSessions =
              userSessions.filter(
                (session) =>
                  session.isActive
              ).length;

            return {
              id:
                `USR-${user.id}`,

              numericId:
                user.id,

              name:
                personName(user),

              email:
                user.email,

              trust:
                user.trustScore,

              aiRisk:
                calculateUserRisk(
                  user
                ),

              attempts:
                Number(
                  user.failedLoginAttempts ||
                    0
                ) +
                Number(
                  user.suspiciousLoginCount ||
                    0
                ),

              vpn:
                false,

              tor:
                false,

              status:
                publicUserStatus(
                  user
                ),

              devices:
                uniqueDevices.size,

              sessions:
                activeSessions,

              requireFaceCheck:
                user.requireFaceCheck,

              securityLevel:
                user.securityLevel,

              lastActivity:
                relativeTime(
                  user.lastLoginAt ||
                    user.updatedAt
                )
            };
          }
        )
        .sort(
          (first, second) =>
            second.aiRisk -
            first.aiRisk
        );

    const events =
      alerts.map(
        (alert) => ({
          id:
            `ALERT-${alert.id}`,

          icon:
            alert.riskLevel ===
            "CRITICAL"
              ? "🚨"
              : alert.riskLevel ===
                  "HIGH"
                ? "⚠️"
                : "🛡",

          title:
            alert.message,

          severity:
            alert.riskLevel,

          detail:
            alert.type,

          ip:
            alert.ipAddress,

          country:
            "",

          time:
            relativeTime(
              alert.createdAt
            ),

          status:
            alert.status,

          userId:
            `USR-${alert.userId}`,

          user:
            personName(
              alert.user
            ),

          email:
            alert.user?.email ||
            ""
        })
      );

    const logins =
      sessions.map(
        (session) => ({
          id:
            `LOGIN-${session.id}`,

          sessionId:
            `SES-${session.id}`,

          userId:
            `USR-${session.userId}`,

          user:
            personName(
              session.user
            ),

          email:
            session.user?.email ||
            "",

          country:
            session.country ||
            "",

          ip:
            session.ipAddress,

          device:
            session.operatingSystem ||
            detectOperatingSystem(
              session.deviceInfo
            ),

          browser:
            session.browser ||
            detectBrowser(
              session.deviceInfo
            ),

          vpn:
            false,

          tor:
            false,

          result:
            session.loginStatus,

          risk:
            session.riskLevel,

          time:
            relativeTime(
              session.startedAt
            )
        })
      );

    const activeSessions =
      sessions
        .filter(
          (session) =>
            session.isActive
        )
        .map(
          (session) => {
            const startedAt =
              new Date(
                session.startedAt
              );

            const durationMinutes =
              Math.max(
                0,
                Math.floor(
                  (
                    Date.now() -
                    startedAt.getTime()
                  ) /
                    60000
                )
              );

            const hours =
              Math.floor(
                durationMinutes /
                  60
              );

            const minutes =
              durationMinutes %
              60;

            return {
              id:
                `SES-${session.id}`,

              userId:
                `USR-${session.userId}`,

              user:
                personName(
                  session.user
                ),

              start:
                startedAt
                  .toLocaleTimeString(
                    "es-DO",
                    {
                      hour:
                        "2-digit",

                      minute:
                        "2-digit"
                    }
                  ),

              activity:
                relativeTime(
                  session.lastActivityAt
                ),

              ip:
                session.ipAddress,

              city:
                session.city ||
                "",

              duration:
                `${hours}h ${minutes}m`,

              risk:
                session.riskLevel
            };
          }
        );

    const devicesByKey =
      new Map();

    sessions.forEach(
      (session) => {
        const deviceInfo =
          String(
            session.deviceInfo ||
              "Dispositivo desconocido"
          ).trim();

        const key =
          `${session.userId}:${deviceInfo}`;

        const existing =
          devicesByKey.get(key);

        if (
          !existing ||
          new Date(
            session.lastActivityAt
          ) >
            new Date(
              existing.lastActivityAt
            )
        ) {
          devicesByKey.set(
            key,
            session
          );
        }
      }
    );

    const devices =
      [
        ...devicesByKey.values()
      ].map(
        (session) => ({
          id:
            `DEV-${session.id}`,

          sessionId:
            session.id,

          userId:
            `USR-${session.userId}`,

          user:
            personName(
              session.user
            ),

          os:
            session.operatingSystem ||
            detectOperatingSystem(
              session.deviceInfo
            ),

          browser:
            session.browser ||
            detectBrowser(
              session.deviceInfo
            ),

          ip:
            session.ipAddress,

          location:
            [
              session.city,
              session.country
            ]
              .filter(Boolean)
              .join(", "),

          activity:
            relativeTime(
              session.lastActivityAt
            ),

          trusted:
            session.trustedDevice,

          blocked:
            session.blockedDevice
        })
      );

    const alertsToday =
      alerts.filter(
        (alert) =>
          new Date(
            alert.createdAt
          ) >= today
      );

    const sessionsToday =
      sessions.filter(
        (session) =>
          new Date(
            session.startedAt
          ) >= today
      );

    const blockedUsers =
      serializedUsers.filter(
        (user) =>
          [
            "BLOCKED",
            "SUSPENDED"
          ].includes(
            user.status
          )
      ).length;

    const criticalOpen =
      alerts.filter(
        (alert) =>
          alert.status !==
            "RESOLVED" &&
          alert.riskLevel ===
            "CRITICAL"
      ).length;

    const highOpen =
      alerts.filter(
        (alert) =>
          alert.status !==
            "RESOLVED" &&
          alert.riskLevel ===
            "HIGH"
      ).length;

    const mediumOpen =
      alerts.filter(
        (alert) =>
          alert.status !==
            "RESOLVED" &&
          alert.riskLevel ===
            "MEDIUM"
      ).length;

    const score =
      Math.max(
        0,
        100 -
          criticalOpen * 15 -
          highOpen * 7 -
          mediumOpen * 3 -
          blockedUsers * 3
      );

    const threat =
      criticalOpen > 0
        ? "CRITICAL"
        : highOpen > 0
          ? "HIGH"
          : mediumOpen > 0
            ? "MEDIUM"
            : "LOW";

    const threatMap =
      new Map();

    alerts.forEach(
      (alert) => {
        const type =
          String(
            alert.type ||
              "OTRO"
          );

        threatMap.set(
          type,
          (
            threatMap.get(
              type
            ) || 0
          ) + 1
        );
      }
    );

    const threats =
      [
        ...threatMap.entries()
      ]
        .sort(
          (first, second) =>
            second[1] -
            first[1]
        )
        .slice(
          0,
          10
        )
        .map(
          (entry) => [
            entry[0],
            entry[1]
          ]
        );

    return res.json({
      success:
        true,

      generatedAt:
        now,

      data: {
        overview: {
          score,
          threat,
          uptime:
            "Sin monitor externo",
          lastScan:
            "Ahora"
        },

        kpis: {
          incidents:
            alertsToday.length,

          blocked:
            sessionsToday.filter(
              (session) =>
                session.loginStatus ===
                  "BLOCKED" ||
                session.blockedDevice
            ).length,

          attempts:
            sessionsToday.length,

          failed:
            sessionsToday.filter(
              (session) =>
                [
                  "FAILED",
                  "BLOCKED",
                  "FACE_REQUIRED"
                ].includes(
                  session.loginStatus
                )
            ).length,

          blockedUsers,

          bots:
            alerts.filter(
              (alert) =>
                normalize(
                  alert.type
                ).includes(
                  "BOT"
                )
            ).length,

          aiScore:
            score,

          servers:
            0
        },

        events,
        logins,
        users:
          serializedUsers,
        devices,
        sessions:
          activeSessions,
        threats,
        servers:
          [],
        owasp:
          [],
        backups:
          []
      }
    });
  } catch (error) {
    console.error(
      "Error cargando Security Center:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo cargar el Security Center.",
        error:
          error.message
      });
  }
};

const updateSecurityAlert = async (
  req,
  res
) => {
  try {
    if (!hasAccess(req, true)) {
      return deny(res);
    }

    const alertId =
      parseEntityId(
        req.params.alertId
      );

    if (!alertId) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Alerta inválida."
        });
    }

    const status =
      normalize(
        req.body?.status
      );

    if (
      !VALID_ALERT_STATUSES.includes(
        status
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Estado de alerta inválido."
        });
    }

    const adminId =
      Number(
        req.prismaUser?.id ||
          req.user?.id
      );

    const assignedToId =
      parseEntityId(
        req.body?.assignedToId
      );

    const alert =
      await prisma.securityAlert.update({
        where: {
          id:
            alertId
        },

        data: {
          status,

          assignedToId:
            assignedToId ||
            undefined,

          resolutionNotes:
            String(
              req.body
                ?.resolutionNotes ||
                ""
            ).trim(),

          resolvedAt:
            status ===
            "RESOLVED"
              ? new Date()
              : null,

          resolvedById:
            status ===
              "RESOLVED"
              ? adminId
              : null
        }
      });

    return res.json({
      success: true,
      message:
        "Alerta actualizada correctamente.",
      alert
    });
  } catch (error) {
    console.error(
      "Error actualizando alerta:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo actualizar la alerta.",
        error:
          error.message
      });
  }
};

const applySecurityAction = async (
  req,
  res
) => {
  try {
    if (!hasAccess(req, true)) {
      return deny(res);
    }

    const action =
      normalize(
        req.body?.action
      );

    if (
      !VALID_ACTIONS.includes(
        action
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Acción de Seguridad inválida."
        });
    }

    const adminId =
      Number(
        req.prismaUser?.id ||
          req.user?.id
      );

    const reason =
      String(
        req.body?.reason ||
          "Acción aplicada desde Security Center."
      ).trim();

    if (
      [
        "SUSPEND_USER",
        "BLOCK_USER",
        "RESTORE_USER",
        "REQUIRE_FACE_CHECK",
        "CLOSE_USER_SESSIONS"
      ].includes(action)
    ) {
      const userId =
        parseEntityId(
          req.body?.userId ||
            req.body?.targetId
        );

      if (!userId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Usuario inválido."
          });
      }

      const user =
        await prisma.user.findUnique({
          where: {
            id:
              userId
          }
        });

      if (!user) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Usuario no encontrado."
          });
      }

      if (
        action ===
        "SUSPEND_USER"
      ) {
        await prisma.user.update({
          where: {
            id:
              userId
          },

          data: {
            status:
              "SUSPENDED",

            suspensionReason:
              reason,

            suspendedAt:
              new Date(),

            suspendedById:
              adminId
          }
        });

        await createNotification(
          userId,
          "SECURITY_ALERT",
          "Cuenta suspendida",
          reason
        );
      }

      if (
        action ===
        "BLOCK_USER"
      ) {
        await prisma.$transaction([
          prisma.sessionLog.updateMany({
            where: {
              userId,
              isActive:
                true
            },

            data: {
              isActive:
                false,

              endedAt:
                new Date(),

              endedById:
                adminId
            }
          }),

          prisma.user.update({
            where: {
              id:
                userId
            },

            data: {
              status:
                "SUSPENDED",

              securityLevel:
                "LOCKED",

              requireFaceCheck:
                true,

              activeSessions:
                0,

              suspensionReason:
                reason,

              suspendedAt:
                new Date(),

              suspendedById:
                adminId
            }
          })
        ]);

        await createNotification(
          userId,
          "SECURITY_ALERT",
          "Cuenta bloqueada",
          reason
        );
      }

      if (
        action ===
        "RESTORE_USER"
      ) {
        await prisma.user.update({
          where: {
            id:
              userId
          },

          data: {
            status:
              "ACTIVE",

            securityLevel:
              "NORMAL",

            requireFaceCheck:
              false,

            accountLockedUntil:
              null,

            suspensionReason:
              "",

            suspendedAt:
              null,

            suspendedById:
              null,

            bannedAt:
              null,

            bannedById:
              null
          }
        });

        await createNotification(
          userId,
          "SECURITY_ALERT",
          "Cuenta restaurada",
          "Tu cuenta fue restaurada por Seguridad QSM."
        );
      }

      if (
        action ===
        "REQUIRE_FACE_CHECK"
      ) {
        await prisma.user.update({
          where: {
            id:
              userId
          },

          data: {
            requireFaceCheck:
              true,

            securityLevel:
              "ELEVATED"
          }
        });

        await createNotification(
          userId,
          "SECURITY_ALERT",
          "Verificación requerida",
          "Debes completar una nueva verificación facial."
        );
      }

      if (
        action ===
        "CLOSE_USER_SESSIONS"
      ) {
        await prisma.$transaction([
          prisma.sessionLog.updateMany({
            where: {
              userId,
              isActive:
                true
            },

            data: {
              isActive:
                false,

              endedAt:
                new Date(),

              endedById:
                adminId
            }
          }),

          prisma.user.update({
            where: {
              id:
                userId
            },

            data: {
              activeSessions:
                0
            }
          })
        ]);
      }

      return res.json({
        success: true,
        message:
          "Acción aplicada correctamente.",
        action,
        userId
      });
    }

    if (
      action ===
      "CLOSE_SESSION"
    ) {
      const sessionId =
        parseEntityId(
          req.body?.sessionId ||
            req.body?.targetId
        );

      if (!sessionId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Sesión inválida."
          });
      }

      const session =
        await prisma.sessionLog.findUnique({
          where: {
            id:
              sessionId
          }
        });

      if (!session) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Sesión no encontrada."
          });
      }

      await prisma.$transaction(
        async (tx) => {
          await tx.sessionLog.update({
            where: {
              id:
                sessionId
            },

            data: {
              isActive:
                false,

              endedAt:
                new Date(),

              endedById:
                adminId
            }
          });

          const activeSessions =
            await tx.sessionLog.count({
              where: {
                userId:
                  session.userId,

                isActive:
                  true
              }
            });

          await tx.user.update({
            where: {
              id:
                session.userId
            },

            data: {
              activeSessions
            }
          });
        }
      );

      return res.json({
        success: true,
        message:
          "Sesión finalizada correctamente.",
        sessionId
      });
    }

    if (
      [
        "TRUST_DEVICE",
        "BLOCK_DEVICE"
      ].includes(action)
    ) {
      const deviceId =
        parseEntityId(
          req.body?.deviceId ||
            req.body?.targetId
        );

      if (!deviceId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Dispositivo inválido."
          });
      }

      const sourceSession =
        await prisma.sessionLog.findUnique({
          where: {
            id:
              deviceId
          }
        });

      if (!sourceSession) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Dispositivo no encontrado."
          });
      }

      const isBlocking =
        action ===
        "BLOCK_DEVICE";

      await prisma.$transaction(
        async (tx) => {
          await tx.sessionLog.updateMany({
            where: {
              userId:
                sourceSession.userId,

              deviceInfo:
                sourceSession.deviceInfo
            },

            data: {
              trustedDevice:
                !isBlocking,

              blockedDevice:
                isBlocking,

              isActive:
                isBlocking
                  ? false
                  : undefined,

              endedAt:
                isBlocking
                  ? new Date()
                  : undefined,

              endedById:
                isBlocking
                  ? adminId
                  : undefined
            }
          });

          if (isBlocking) {
            await tx.securityAlert.create({
              data: {
                userId:
                  sourceSession.userId,

                type:
                  "DEVICE_BLOCKED",

                riskLevel:
                  "HIGH",

                message:
                  "Dispositivo bloqueado por el equipo de Seguridad.",

                ipAddress:
                  sourceSession.ipAddress,

                deviceInfo:
                  sourceSession.deviceInfo
              }
            });

            const activeSessions =
              await tx.sessionLog.count({
                where: {
                  userId:
                    sourceSession.userId,

                  isActive:
                    true
                }
              });

            await tx.user.update({
              where: {
                id:
                  sourceSession.userId
              },

              data: {
                activeSessions,
                requireFaceCheck:
                  true,

                securityLevel:
                  "ELEVATED"
              }
            });
          }
        }
      );

      return res.json({
        success: true,
        message:
          isBlocking
            ? "Dispositivo bloqueado correctamente."
            : "Dispositivo marcado como confiable.",
        deviceId
      });
    }

    return res
      .status(400)
      .json({
        success: false,
        message:
          "Acción no procesada."
      });
  } catch (error) {
    console.error(
      "Error aplicando acción de Seguridad:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "No se pudo aplicar la acción de Seguridad.",
        error:
          error.message
      });
  }
};

module.exports = {
  getSecurityDashboard,
  updateSecurityAlert,
  applySecurityAction
};