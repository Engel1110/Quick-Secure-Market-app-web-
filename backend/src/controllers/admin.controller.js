const bcrypt = require("bcryptjs");
const { prisma, parsePositiveInt, getRequestUserId, sanitizeUser } = require("../utils/prismaCompat");
const { createAuditLog } = require("../services/audit.service");

function serializeProduct(product) {
  return { ...product, _id: String(product.id), seller: product.seller ? { ...product.seller, _id: String(product.seller.id) } : product.sellerId };
}

function serializeAudit(log) {
  return {
    ...log,
    _id: String(log.id),
    actor: log.actor ? { ...log.actor, _id: String(log.actor.id) } : log.actorId,
    targetType: log.entityType,
    targetId: log.entityId
  };
}

async function getAdminDashboard(_req, res) {
  try {
    const openDisputeStatuses = [
      "OPEN",
      "IN_REVIEW",
      "UNDER_REVIEW",
      "WAITING_EVIDENCE",
      "WAITING_BUYER",
      "WAITING_SELLER",
      "WAITING_QSM",
      "ESCALATED"
    ];

    const activeOrderStatuses = [
      "PENDING",
      "PROCESSING",
      "PAID",
      "HELD",
      "WAITING_FOR_SELLER",
      "WAITING_WAREHOUSE",
      "RECEIVED_AT_WAREHOUSE",
      "INSPECTION",
      "UNDER_INSPECTION",
      "APPROVED",
      "READY_FOR_PICKUP",
      "READY_FOR_DELIVERY",
      "ASSIGNED",
      "PICKED_UP",
      "OUT_FOR_DELIVERY",
      "IN_TRANSIT",
      "WAITING_PIN"
    ];

    const [
      usersTotal,
      usersVerified,
      usersSuspended,
      productsTotal,
      productsActive,
      productsRisk,
      ordersTotal,
      ordersActive,
      ordersCompleted,
      salesAggregate,
      paymentsHeldAggregate,
      paymentsReleasedAggregate,
      disputesTotal,
      disputesOpen,
      disputesCritical,
      fraudAlertsTotal,
      securityAlertsOpen,
      warehouseTotal,
      warehousePending,
      warehouseInspected,
      shippingTotal,
      shippingPending,
      shippingInTransit,
      shippingDelivered,
      orderGroups,
      recentOrders,
      recentAudit
    ] = await Promise.all([
      prisma.user.count(),

      prisma.user.count({
        where: {
          isVerified: true
        }
      }),

      prisma.user.count({
        where: {
          status: {
            in: [
              "SUSPENDED",
              "BANNED"
            ]
          }
        }
      }),

      prisma.product.count(),

      prisma.product.count({
        where: {
          status: "ACTIVE",
          deletedAt: null
        }
      }),

      prisma.product.count({
        where: {
          OR: [
            {
              riskLevel: {
                in: [
                  "HIGH",
                  "CRITICAL"
                ]
              }
            },
            {
              riskScore: {
                gte: 70
              }
            }
          ],
          deletedAt: null
        }
      }),

      prisma.order.count(),

      prisma.order.count({
        where: {
          status: {
            in: activeOrderStatuses
          }
        }
      }),

      prisma.order.count({
        where: {
          status: {
            in: [
              "COMPLETED",
              "DELIVERED"
            ]
          }
        }
      }),

      prisma.order.aggregate({
        _sum: {
          totalAmount: true
        }
      }),

      prisma.payment.aggregate({
        where: {
          status: {
            in: [
              "HELD",
              "PENDING",
              "UNDER_REVIEW"
            ]
          }
        },
        _sum: {
          amount: true
        }
      }),

      prisma.payment.aggregate({
        where: {
          status: "RELEASED"
        },
        _sum: {
          amount: true
        }
      }),

      prisma.dispute.count(),

      prisma.dispute.count({
        where: {
          status: {
            in: openDisputeStatuses
          },
          isArchived: false
        }
      }),

      prisma.dispute.count({
        where: {
          status: {
            in: openDisputeStatuses
          },
          priority: "CRITICAL",
          isArchived: false
        }
      }),

      prisma.fraudAlert.count(),

      prisma.securityAlert.count({
        where: {
          status: "OPEN"
        }
      }),

      prisma.warehouse.count(),

      prisma.warehouse.count({
        where: {
          OR: [
            {
              received: false
            },
            {
              inspected: false
            }
          ]
        }
      }),

      prisma.warehouse.count({
        where: {
          inspected: true
        }
      }),

      prisma.shipping.count(),

      prisma.shipping.count({
        where: {
          status: {
            in: [
              "PENDING",
              "PENDING_ASSIGNMENT",
              "ASSIGNED"
            ]
          }
        }
      }),

      prisma.shipping.count({
        where: {
          status: {
            in: [
              "PICKED_UP",
              "OUT_FOR_DELIVERY",
              "IN_TRANSIT",
              "WAITING_PIN"
            ]
          }
        }
      }),

      prisma.shipping.count({
        where: {
          status: "DELIVERED"
        }
      }),

      prisma.order.groupBy({
        by: [
          "status"
        ],
        _count: {
          _all: true
        }
      }),

      prisma.order.findMany({
        orderBy: {
          createdAt: "desc"
        },
        take: 8,
        select: {
          id: true,
          orderCode: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          product: {
            select: {
              id: true,
              title: true,
              qsmCode: true
            }
          },
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),

      prisma.auditLog.findMany({
        orderBy: {
          createdAt: "desc"
        },
        take: 8,
        select: {
          id: true,
          module: true,
          action: true,
          description: true,
          severity: true,
          status: true,
          actorName: true,
          createdAt: true
        }
      })
    ]);

    const orderStatusData =
      orderGroups
        .map((item) => ({
          id: String(
            item.status || "UNKNOWN"
          ).toLowerCase(),

          label:
            String(
              item.status || "UNKNOWN"
            )
              .replaceAll("_", " "),

          status:
            item.status || "UNKNOWN",

          value:
            Number(
              item._count?._all || 0
            )
        }))
        .sort(
          (a, b) =>
            b.value - a.value
        );

    const alerts = [];

    if (disputesCritical > 0) {
      alerts.push({
        id: "critical-disputes",
        icon: "!",
        title:
          disputesCritical +
          " disputas criticas",
        description:
          "Casos reales que requieren atencion prioritaria.",
        level: "critical",
        route:
          "/admin/disputes?priority=CRITICAL"
      });
    }

    if (securityAlertsOpen > 0) {
      alerts.push({
        id: "security-alerts",
        icon: "S",
        title:
          securityAlertsOpen +
          " alertas de seguridad",
        description:
          "Alertas abiertas registradas en el sistema.",
        level: "high",
        route:
          "/admin/security"
      });
    }

    if (productsRisk > 0) {
      alerts.push({
        id: "risk-products",
        icon: "P",
        title:
          productsRisk +
          " productos de alto riesgo",
        description:
          "Productos reales con riesgo alto o critico.",
        level: "high",
        route:
          "/admin/moderation"
      });
    }

    if (warehousePending > 0) {
      alerts.push({
        id: "warehouse-pending",
        icon: "W",
        title:
          warehousePending +
          " operaciones pendientes en almacen",
        description:
          "Productos pendientes de recepcion o inspeccion.",
        level: "medium",
        route:
          "/admin/warehouse"
      });
    }

    const departments = [
      {
        id: "warehouse",
        name: "Almacen",
        route: "/admin/warehouse",
        status:
          warehousePending > 0
            ? "warning"
            : "active",
        metrics: [
          {
            label: "Operaciones",
            value: warehouseTotal
          },
          {
            label: "Pendientes",
            value: warehousePending
          },
          {
            label: "Inspeccionados",
            value: warehouseInspected
          }
        ]
      },
      {
        id: "delivery",
        name: "Delivery",
        route: "/admin/delivery",
        status:
          shippingInTransit > 0
            ? "warning"
            : "active",
        metrics: [
          {
            label: "Operaciones",
            value: shippingTotal
          },
          {
            label: "Pendientes",
            value: shippingPending
          },
          {
            label: "En ruta",
            value: shippingInTransit
          },
          {
            label: "Entregadas",
            value: shippingDelivered
          }
        ]
      },
      {
        id: "finance",
        name: "Finanzas",
        route: "/admin/finance",
        status: "active",
        metrics: [
          {
            label: "En custodia",
            value:
              Number(
                paymentsHeldAggregate
                  ?._sum?.amount || 0
              )
          },
          {
            label: "Liberado",
            value:
              Number(
                paymentsReleasedAggregate
                  ?._sum?.amount || 0
              )
          }
        ],
        money: true
      },
      {
        id: "disputes",
        name: "Disputas",
        route: "/admin/disputes",
        status:
          disputesCritical > 0
            ? "danger"
            : disputesOpen > 0
              ? "warning"
              : "active",
        metrics: [
          {
            label: "Totales",
            value: disputesTotal
          },
          {
            label: "Abiertas",
            value: disputesOpen
          },
          {
            label: "Criticas",
            value: disputesCritical
          }
        ]
      },
      {
        id: "security",
        name: "Seguridad",
        route: "/admin/security",
        status:
          securityAlertsOpen > 0
            ? "danger"
            : "active",
        metrics: [
          {
            label: "Alertas abiertas",
            value: securityAlertsOpen
          },
          {
            label: "Alertas antifraude",
            value: fraudAlertsTotal
          }
        ]
      },
      {
        id: "audit",
        name: "Auditoria",
        route: "/admin/audit",
        status: "active",
        metrics: [
          {
            label: "Eventos recientes",
            value: recentAudit.length
          }
        ]
      }
    ];

    return res.status(200).json({
      success: true,
      message:
        "Dashboard administrativo real obtenido correctamente",

      generatedAt:
        new Date().toISOString(),

      summary: {
        usersTotal,
        usersVerified,
        usersSuspended,
        productsTotal,
        productsActive,
        ordersTotal,
        ordersActive,
        ordersCompleted,
        salesTotal:
          Number(
            salesAggregate
              ?._sum?.totalAmount || 0
          ),
        disputesTotal,
        disputesOpen,
        activeRisks:
          disputesCritical +
          productsRisk +
          securityAlertsOpen +
          fraudAlertsTotal
      },

      metrics: [
        {
          id: "users",
          label: "Usuarios totales",
          value: usersTotal,
          description:
            usersVerified +
            " usuarios verificados",
          icon: "U",
          color: "purple"
        },
        {
          id: "orders",
          label: "Ordenes totales",
          value: ordersTotal,
          description:
            ordersActive +
            " operaciones activas",
          icon: "O",
          color: "blue"
        },
        {
          id: "sales",
          label: "Ventas procesadas",
          value:
            Number(
              salesAggregate
                ?._sum?.totalAmount || 0
            ),
          description:
            ordersCompleted +
            " ordenes completadas",
          icon: "$",
          color: "green",
          money: true
        },
        {
          id: "risks",
          label: "Riesgos activos",
          value:
            disputesCritical +
            productsRisk +
            securityAlertsOpen +
            fraudAlertsTotal,
          description:
            "Casos reales que requieren revision",
          icon: "!",
          color: "red"
        }
      ],

      orderStatusData,

      recentOrders:
        recentOrders.map(
          (order) => ({
            id: order.id,
            orderCode:
              order.orderCode ||
              "QSM-" + order.id,
            status: order.status,
            amount:
              Number(
                order.totalAmount || 0
              ),
            product:
              order.product?.title ||
              "Producto QSM",
            productCode:
              order.product?.qsmCode ||
              "",
            buyer:
              [
                order.buyer?.firstName,
                order.buyer?.lastName
              ]
                .filter(Boolean)
                .join(" "),
            seller:
              [
                order.seller?.firstName,
                order.seller?.lastName
              ]
                .filter(Boolean)
                .join(" "),
            createdAt:
              order.createdAt
          })
        ),

      recentActivity:
        recentAudit.map(
          (event) => ({
            id: event.id,
            module: event.module,
            title:
              String(
                event.action || "EVENT"
              )
                .replaceAll("_", " "),
            description:
              event.description,
            actor:
              event.actorName ||
              "Sistema QSM",
            severity:
              event.severity,
            status:
              event.status,
            createdAt:
              event.createdAt
          })
        ),

      alerts,
      departments
    });
  } catch (error) {
    console.error(
      "Error obteniendo dashboard administrativo real:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Error obteniendo dashboard administrativo",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
}

async function getAllUsers(_req, res) {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    return res.json({ message: "Usuarios obtenidos correctamente", count: users.length, users: users.map(sanitizeUser) });
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo usuarios", error: error.message });
  }
}

async function getAllProducts(_req, res) {
  try {
    const products = await prisma.product.findMany({
      include: { seller: { select: { id: true, firstName: true, lastName: true, email: true, trustScore: true, isVerified: true } } },
      orderBy: { createdAt: "desc" }
    });
    return res.json({ message: "Productos obtenidos correctamente", count: products.length, products: products.map(serializeProduct) });
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo productos", error: error.message });
  }
}

async function suspendUser(req, res) {
  try {
    const id = parsePositiveInt(req.params.userId);
    if (!id) return res.status(400).json({ message: "Identificador de usuario no válido" });
    const actorId = await getRequestUserId(req);
    const reason = String(req.body?.reason || "No especificado").trim();
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Usuario no encontrado" });
    const user = await prisma.user.update({
      where: { id },
      data: { status: "SUSPENDED", securityLevel: "LOCKED", accountLockedUntil: null, suspensionReason: reason, suspendedAt: new Date(), suspendedById: actorId, activeSessions: 0, passwordVersion: { increment: 1 } }
    });
    await createAuditLog({ req, action: "SUSPEND_USER", targetType: "USER", targetId: id, description: `Usuario suspendido. Motivo: ${reason}` });
    return res.json({ message: "Usuario suspendido correctamente", reason, user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Error suspendiendo usuario", error: error.message });
  }
}

async function activateUser(req, res) {
  try {
    const id = parsePositiveInt(req.params.userId);
    if (!id) return res.status(400).json({ message: "Identificador de usuario no válido" });
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Usuario no encontrado" });
    const user = await prisma.user.update({
      where: { id },
      data: { status: "ACTIVE", securityLevel: "NORMAL", accountLockedUntil: null, suspensionReason: "", suspendedAt: null, suspendedById: null, bannedAt: null, bannedById: null, deletedAt: null, deletedById: null }
    });
    await createAuditLog({ req, action: "ACTIVATE_USER", targetType: "USER", targetId: id, description: "Usuario activado nuevamente" });
    return res.json({ message: "Usuario activado correctamente", user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Error activando usuario", error: error.message });
  }
}

async function disableProduct(req, res) {
  try {
    const id = parsePositiveInt(req.params.productId);
    if (!id) return res.status(400).json({ message: "Identificador de producto no válido" });
    const actorId = await getRequestUserId(req);
    const reason = String(req.body?.reason || "No especificado").trim();
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Producto no encontrado" });
    const product = await prisma.product.update({ where: { id }, data: { status: "DISABLED", deletedAt: new Date(), deletedBy: actorId, lastEditedAt: new Date(), lastEditedBy: actorId } });
    await createAuditLog({ req, action: "DISABLE_PRODUCT", targetType: "PRODUCT", targetId: id, description: `Producto deshabilitado. Motivo: ${reason}` });
    return res.json({ message: "Producto deshabilitado correctamente", reason, product: { ...product, _id: String(product.id) } });
  } catch (error) {
    return res.status(500).json({ message: "Error deshabilitando producto", error: error.message });
  }
}

async function getAuditLogs(_req, res) {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { actor: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 500
    });
    return res.json({ message: "Logs de auditoría obtenidos correctamente", count: logs.length, logs: logs.map(serializeAudit) });
  } catch (error) {
    return res.status(500).json({ message: "Error obteniendo logs de auditoría", error: error.message });
  }
}

async function updateUserRole(req, res) {
  try {
    const id = parsePositiveInt(req.params.userId);
    const role = String(req.body?.role || "").trim().toUpperCase();
    const allowedRoles = ["USER", "ADMIN", "SENIOR_ADMIN", "AUDITOR", "VERIFICATION_AGENT"];
    if (!id || !allowedRoles.includes(role)) return res.status(400).json({ message: "Rol no válido" });
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Usuario no encontrado" });
    const user = await prisma.user.update({ where: { id }, data: { role, passwordVersion: { increment: 1 } } });
    await createAuditLog({ req, action: "UPDATE_USER_ROLE", targetType: "USER", targetId: id, description: `Rol actualizado a ${role}` });
    return res.json({ message: "Rol de usuario actualizado correctamente", user: sanitizeUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Error actualizando rol de usuario", error: error.message });
  }
}

async function resetUserPassword(req, res) {
  try {
    const id = parsePositiveInt(req.params.userId);
    const newPassword = String(req.body?.newPassword || "");
    if (!id) return res.status(400).json({ message: "Identificador de usuario no válido" });
    if (newPassword.length < 8) return res.status(400).json({ message: "La contraseña debe tener mínimo 8 caracteres" });
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: "Usuario no encontrado" });
    const user = await prisma.user.update({
      where: { id },
      data: { password: await bcrypt.hash(newPassword, 12), passwordChangedAt: new Date(), passwordVersion: { increment: 1 }, failedLoginAttempts: 0, accountLockedUntil: null, activeSessions: 0 }
    });
    await createAuditLog({ req, action: "RESET_USER_PASSWORD", targetType: "USER", targetId: id, description: `Contraseña reseteada para el usuario ${user.email}` });
    return res.json({ message: "Contraseña reseteada correctamente", user: { _id: String(user.id), id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, status: user.status } });
  } catch (error) {
    return res.status(500).json({ message: "Error reseteando contraseña", error: error.message });
  }
}

module.exports = { getAdminDashboard, getAllUsers, getAllProducts, suspendUser, activateUser, disableProduct, getAuditLogs, updateUserRole, resetUserPassword };
