const prisma = require("../utils/prisma");

const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "SUPERVISOR"
];

const WAREHOUSE_ROLES = [
  "WAREHOUSE",
  "WAREHOUSE_STAFF",
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_SUPERVISOR"
];

const DELIVERY_ROLES = [
  "DELIVERY",
  "DELIVERY_AGENT",
  "DELIVERY_MANAGER",
  "DELIVERY_SUPERVISOR"
];

const TERMINAL_STATUSES = [
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
  "REJECTED"
];

function normalize(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function parseId(value) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0
    ? id
    : null;
}

function appendTimeline(
  currentTimeline,
  {
    status,
    description,
    actorId,
    metadata = {}
  }
) {
  const timeline =
    Array.isArray(currentTimeline)
      ? [...currentTimeline]
      : [];

  timeline.push({
    status,
    description,
    createdBy: actorId || null,
    metadata,
    createdAt: new Date().toISOString()
  });

  return timeline;
}

async function resolveActor(req) {
  const possibleIds = [
    req.user?.id,
    req.user?.userId,
    req.user?._id
  ];

  for (const value of possibleIds) {
    const id = parseId(value);

    if (!id) {
      continue;
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id
        }
      });

    if (user) {
      return user;
    }
  }

  const email =
    String(req.user?.email || "")
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
}

function hasAreaAccess(
  req,
  actor,
  area
) {
  const role =
    normalize(
      req.user?.role ||
      actor?.role
    );

  const department =
    normalize(
      req.user?.department ||
      actor?.department
    );

  const permissions =
    Array.isArray(
      req.user?.permissions ||
      actor?.permissions
    )
      ? (
          req.user?.permissions ||
          actor?.permissions
        ).map(normalize)
      : [];

  const areaRoles =
    area === "WAREHOUSE"
      ? WAREHOUSE_ROLES
      : DELIVERY_ROLES;

  return (
    ADMIN_ROLES.includes(role) ||
    areaRoles.includes(role) ||
    department === area ||
    permissions.includes("*") ||
    permissions.includes(
      `${area}.UPDATE`
    ) ||
    permissions.includes(
      `${area}_UPDATE`
    )
  );
}

async function getOrder(id) {
  return prisma.order.findUnique({
    where: {
      id
    },

    include: {
      payments: {
        select: {
          id: true,
          status: true
        }
      },

      dispute: {
        select: {
          id: true,
          status: true
        }
      }
    }
  });
}

function hasProtectedFunds(order) {
  const orderPayment =
    normalize(order.paymentStatus);

  const escrow =
    normalize(order.escrowStatus);

  const paymentRecord =
    Array.isArray(order.payments) &&
    order.payments.some(
      (payment) =>
        [
          "HELD",
          "CONFIRMED",
          "UNDER_REVIEW"
        ].includes(
          normalize(payment.status)
        )
    );

  return (
    paymentRecord ||
    [
      "HELD",
      "CONFIRMED",
      "UNDER_REVIEW"
    ].includes(orderPayment) ||
    [
      "HELD",
      "FUNDED",
      "READY_TO_RELEASE"
    ].includes(escrow)
  );
}

function generateTracking(order) {
  if (order.trackingNumber) {
    return order.trackingNumber;
  }

  return `QSM-TRK-${String(
    order.id
  ).padStart(8, "0")}`;
}

async function notifySafe(
  client,
  userId,
  title,
  message
) {
  try {
    if (!userId) {
      return;
    }

    await client.notification.create({
      data: {
        userId,
        title,
        message,
        read: false
      }
    });
  } catch (error) {
    console.error(
      "Notification warning:",
      error.message
    );
  }
}

function orderIsBlocked(order) {
  return (
    TERMINAL_STATUSES.includes(
      normalize(order.status)
    ) ||
    (
      order.dispute &&
      normalize(order.dispute.status) !==
        "CLOSED"
    )
  );
}

async function updateWarehouseOrder(
  req,
  res
) {
  try {
    const orderId =
      parseId(req.params.id);

    const action =
      normalize(req.body?.action);

    const notes =
      String(req.body?.notes || "")
        .trim();

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "La orden enviada no es válida."
      });
    }

    const actor =
      await resolveActor(req);

    if (
      !actor ||
      !hasAreaAccess(
        req,
        actor,
        "WAREHOUSE"
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permiso para actualizar Almacén."
      });
    }

    const order =
      await getOrder(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Orden no encontrada."
      });
    }

    if (orderIsBlocked(order)) {
      return res.status(409).json({
        success: false,
        message:
          "La orden está cerrada, cancelada o en disputa."
      });
    }

    if (
      normalize(order.deliveryMethod) !==
        "QSM_WAREHOUSE" &&
      normalize(order.warehouseStatus) ===
        "NOT_REQUIRED"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Esta orden no pertenece al flujo de Almacén."
      });
    }

    if (!hasProtectedFunds(order)) {
      return res.status(409).json({
        success: false,
        message:
          "La orden no tiene fondos protegidos confirmados."
      });
    }

    const now = new Date();

    const data = {
      warehouseAgent: {
        connect: {
          id: actor.id
        }
      }
    };

    let eventStatus = "";
    let description = "";

    switch (action) {
      case "RECEIVE":
        data.status =
          "IN_WAREHOUSE";

        data.warehouseStatus =
          "RECEIVED";

        data.warehouseReceivedAt =
          order.warehouseReceivedAt ||
          now;

        data.warehouseConfirmedDelivery =
          true;

        data.warehouseConfirmedDeliveryAt =
          order.warehouseConfirmedDeliveryAt ||
          now;

        data.warehouseNotes =
          notes ||
          order.warehouseNotes;

        eventStatus =
          "WAREHOUSE_RECEIVED";

        description =
          "El producto fue recibido oficialmente en el almacén QSM.";

        break;

      case "START_INSPECTION":
        if (
          ![
            "RECEIVED",
            "IN_WAREHOUSE",
            "UNDER_INSPECTION"
          ].includes(
            normalize(
              order.warehouseStatus
            )
          )
        ) {
          return res.status(409).json({
            success: false,
            message:
              "Primero debes registrar la recepción del producto."
          });
        }

        data.status =
          "UNDER_INSPECTION";

        data.warehouseStatus =
          "UNDER_INSPECTION";

        data.inspectionNotes =
          notes ||
          order.inspectionNotes;

        eventStatus =
          "WAREHOUSE_INSPECTION_STARTED";

        description =
          "El almacén inició la inspección del producto.";

        break;

      case "APPROVE":
        if (
          ![
            "RECEIVED",
            "UNDER_INSPECTION"
          ].includes(
            normalize(
              order.warehouseStatus
            )
          )
        ) {
          return res.status(409).json({
            success: false,
            message:
              "El producto debe estar recibido o en inspección."
          });
        }

        data.status =
          "UNDER_INSPECTION";

        data.warehouseStatus =
          "APPROVED";

        data.warehouseApprovedAt =
          now;

        data.inspectionNotes =
          notes ||
          order.inspectionNotes;

        eventStatus =
          "WAREHOUSE_APPROVED";

        description =
          "La inspección fue aprobada por el almacén QSM.";

        break;

      case "HOLD":
        data.status =
          "UNDER_INSPECTION";

        data.warehouseStatus =
          "HELD";

        data.inspectionNotes =
          notes ||
          "Producto detenido para revisión adicional.";

        eventStatus =
          "WAREHOUSE_HELD";

        description =
          "El producto fue detenido para revisión adicional.";

        break;

      case "READY_FOR_DELIVERY":
        if (
          normalize(
            order.warehouseStatus
          ) !== "APPROVED"
        ) {
          return res.status(409).json({
            success: false,
            message:
              "La inspección debe estar aprobada antes del despacho."
          });
        }

        data.status =
          "READY_FOR_PICKUP";

        data.warehouseStatus =
          "READY_FOR_PICKUP";

        data.deliveryStatus =
          "PENDING_ASSIGNMENT";

        data.readyForPickupAt =
          now;

        data.trackingNumber =
          generateTracking(order);

        data.trackingCompany =
          order.trackingCompany ||
          "QSM Logistics";

        eventStatus =
          "READY_FOR_DELIVERY";

        description =
          "El producto está listo para ser entregado al área de Delivery.";

        break;

      default:
        return res.status(400).json({
          success: false,
          message:
            "Acción de Almacén no reconocida."
        });
    }

    data.timeline =
      appendTimeline(
        order.timeline,
        {
          status:
            eventStatus,

          description,

          actorId:
            actor.id,

          metadata: {
            action,
            notes,
            warehouseStatus:
              data.warehouseStatus
          }
        }
      );

    const updated =
      await prisma.$transaction(
        async (tx) => {
          const result =
            await tx.order.update({
              where: {
                id: order.id
              },
              data
            });

          await notifySafe(
            tx,
            order.buyerId,
            "Actualización de Almacén",
            `${description} Orden ${order.orderCode}.`
          );

          await notifySafe(
            tx,
            order.sellerId,
            "Actualización de Almacén",
            `${description} Orden ${order.orderCode}.`
          );

          return result;
        }
      );

    return res.status(200).json({
      success: true,
      message: description,
      order: updated
    });
  } catch (error) {
    console.error(
      "Warehouse action error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo actualizar la operación de Almacén.",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
}

async function updateDeliveryOrder(
  req,
  res
) {
  try {
    const orderId =
      parseId(req.params.id);

    const action =
      normalize(req.body?.action);

    const notes =
      String(req.body?.notes || "")
        .trim();

    const deliveryAddress =
      String(
        req.body?.deliveryAddress ||
        ""
      ).trim();

    const pickupAddress =
      String(
        req.body?.pickupAddress ||
        ""
      ).trim();

    const pin =
      String(req.body?.pin || "")
        .trim();

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "La orden enviada no es válida."
      });
    }

    const actor =
      await resolveActor(req);

    if (
      !actor ||
      !hasAreaAccess(
        req,
        actor,
        "DELIVERY"
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permiso para actualizar Delivery."
      });
    }

    const order =
      await getOrder(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Orden no encontrada."
      });
    }

    if (orderIsBlocked(order)) {
      return res.status(409).json({
        success: false,
        message:
          "La orden está cerrada, cancelada o en disputa."
      });
    }

    if (!hasProtectedFunds(order)) {
      return res.status(409).json({
        success: false,
        message:
          "La orden no tiene fondos protegidos confirmados."
      });
    }

    const now = new Date();

    const data = {
      deliveryNotes:
        notes ||
        order.deliveryNotes,

      pickupAddress:
        pickupAddress ||
        order.pickupAddress,

      deliveryAddress:
        deliveryAddress ||
        order.deliveryAddress
    };

    let eventStatus = "";
    let description = "";

    switch (action) {
      case "ASSIGN_SELF":
        data.deliveryAgent = {
          connect: {
            id: actor.id
          }
        };

        data.deliveryStatus =
          "ASSIGNED";

        data.trackingNumber =
          generateTracking(order);

        data.trackingCompany =
          order.trackingCompany ||
          "QSM Logistics";

        data.pickupScheduledAt =
          order.pickupScheduledAt ||
          now;

        eventStatus =
          "DELIVERY_AGENT_ASSIGNED";

        description =
          "Un agente de Delivery QSM fue asignado a la orden.";

        break;

      case "PICKUP":
        data.deliveryAgent = {
          connect: {
            id:
              order.deliveryAgentId ||
              actor.id
          }
        };

        data.deliveryStatus =
          "PRODUCT_COLLECTED";

        data.productCollectedAt =
          now;

        eventStatus =
          "PRODUCT_COLLECTED";

        description =
          "El agente confirmó la recogida del producto.";

        break;

      case "OUT_FOR_DELIVERY":
        data.deliveryAgent = {
          connect: {
            id:
              order.deliveryAgentId ||
              actor.id
          }
        };

        data.status =
          "OUT_FOR_DELIVERY";

        data.deliveryStatus =
          "OUT_FOR_DELIVERY";

        data.outForDeliveryAt =
          now;

        data.trackingNumber =
          generateTracking(order);

        data.trackingCompany =
          order.trackingCompany ||
          "QSM Logistics";

        eventStatus =
          "OUT_FOR_DELIVERY";

        description =
          "El producto salió hacia la dirección del comprador.";

        break;

      case "VERIFY_PIN":
        if (
          !/^\d{6}$/.test(pin)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "El PIN debe contener exactamente 6 números."
          });
        }

        if (
          pin !==
          String(order.deliveryPin)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "El PIN de entrega no coincide."
          });
        }

        data.deliveryAgent = {
          connect: {
            id:
              order.deliveryAgentId ||
              actor.id
          }
        };

        data.status =
          "DELIVERED";

        data.deliveryStatus =
          "DELIVERED";

        data.deliveredAt =
          now;

        data.deliveryPinVerified =
          true;

        data.deliveryPinVerifiedAt =
          now;

        data.deliveryPinVerifiedBy = {
          connect: {
            id: actor.id
          }
        };

        data.deliveryConfirmedByAgent =
          true;

        data.deliveryConfirmedByAgentAt =
          now;

        data.escrowStatus =
          normalize(
            order.escrowStatus
          ) === "RELEASED"
            ? "RELEASED"
            : "READY_TO_RELEASE";

        eventStatus =
          "DELIVERY_PIN_VERIFIED";

        description =
          "La entrega fue validada correctamente mediante el PIN QSM.";

        break;

      case "FAIL":
        data.deliveryAgent = {
          connect: {
            id:
              order.deliveryAgentId ||
              actor.id
          }
        };

        data.deliveryStatus =
          "FAILED";

        data.deliveryNotes =
          notes ||
          "Entrega no completada.";

        eventStatus =
          "DELIVERY_FAILED";

        description =
          "El intento de entrega no pudo completarse.";

        break;

      default:
        return res.status(400).json({
          success: false,
          message:
            "Acción de Delivery no reconocida."
        });
    }

    data.timeline =
      appendTimeline(
        order.timeline,
        {
          status:
            eventStatus,

          description,

          actorId:
            actor.id,

          metadata: {
            action,
            notes,
            trackingNumber:
              data.trackingNumber ||
              order.trackingNumber
          }
        }
      );

    const updated =
      await prisma.$transaction(
        async (tx) => {
          const result =
            await tx.order.update({
              where: {
                id: order.id
              },
              data
            });

          await notifySafe(
            tx,
            order.buyerId,
            "Actualización de Delivery",
            `${description} Orden ${order.orderCode}.`
          );

          await notifySafe(
            tx,
            order.sellerId,
            "Actualización de Delivery",
            `${description} Orden ${order.orderCode}.`
          );

          return result;
        }
      );

    return res.status(200).json({
      success: true,
      message: description,
      order: updated
    });
  } catch (error) {
    console.error(
      "Delivery action error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo actualizar la operación de Delivery.",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
}

module.exports = {
  updateWarehouseOrder,
  updateDeliveryOrder
};
