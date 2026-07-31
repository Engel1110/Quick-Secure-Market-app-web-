const prisma = require("../utils/prisma");

const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "SENIOR_ADMIN",
  "ADMIN",
  "SUPERVISOR"
];

const WAREHOUSE_ROLES = [
  "WAREHOUSE_MANAGER",
  "WAREHOUSE_SUPERVISOR",
  "WAREHOUSE_STAFF",
  "WAREHOUSE"
];

const DELIVERY_ROLES = [
  "DELIVERY_MANAGER",
  "DELIVERY_SUPERVISOR",
  "DELIVERY_AGENT",
  "DELIVERY"
];

const ORDER_INCLUDE = {
  product: {
    select: {
      id: true,
      title: true,
      category: true,
      qsmCode: true,
      riskLevel: true,
      location: true,
      imageUrl: true,
      images: true
    }
  },
  buyer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true
    }
  },
  seller: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true
    }
  }
};

function normalize(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function fullName(user) {
  return [
    user?.firstName,
    user?.lastName
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "Usuario QSM";
}

function productImage(product) {
  if (product?.imageUrl) {
    return product.imageUrl;
  }

  if (
    Array.isArray(product?.images) &&
    product.images.length > 0
  ) {
    return product.images[0];
  }

  return "";
}

function hasAccess(req, area) {
  const role =
    normalize(req.user?.role);

  const department =
    normalize(req.user?.department);

  const permissions =
    Array.isArray(req.user?.permissions)
      ? req.user.permissions.map(normalize)
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
    permissions.includes(area + ".VIEW")
  );
}

function warehouseStatus(order) {
  const status =
    normalize(order.warehouseStatus);

  const map = {
    IN_TRANSIT_TO_WAREHOUSE: "PENDING",
    WAITING_RECEPTION: "PENDING",
    PENDING: "PENDING",
    RECEIVED: "RECEIVED",
    IN_WAREHOUSE: "RECEIVED",
    UNDER_INSPECTION: "INSPECTION",
    APPROVED: "APPROVED",
    READY_FOR_PICKUP: "READY_FOR_PICKUP",
    HELD: "HELD",
    REJECTED: "REJECTED",
    BLOCKED: "HELD"
  };

  return map[status] || status || "PENDING";
}

function deliveryStatus(order) {
  const status =
    normalize(order.deliveryStatus);

  const map = {
    PENDING: "PENDING_ASSIGNMENT",
    PICKUP_REQUESTED: "PENDING_ASSIGNMENT",
    PENDING_ASSIGNMENT: "PENDING_ASSIGNMENT",
    ASSIGNED: "ASSIGNED",
    PICKED_UP: "PICKED_UP",
    PRODUCT_COLLECTED: "PICKED_UP",
    IN_TRANSIT: "IN_TRANSIT",
    OUT_FOR_DELIVERY: "IN_TRANSIT",
    WAITING_PIN: "WAITING_PIN",
    DELIVERED: "DELIVERED",
    FAILED: "FAILED",
    DELIVERY_FAILED: "FAILED",
    DELAYED: "DELAYED"
  };

  return map[status] || status || "PENDING_ASSIGNMENT";
}

function priority(order) {
  const risk =
    normalize(order.product?.riskLevel);

  if (
    risk === "HIGH" ||
    risk === "CRITICAL" ||
    order.disputeId
  ) {
    return "HIGH";
  }

  return "NORMAL";
}

function mapWarehouseOrder(order) {
  return {
    id: order.id,
    orderCode: order.orderCode,
    productId: order.productId,
    product: order.product?.title || "Producto QSM",
    productCode: order.product?.qsmCode || "",
    productImage: productImage(order.product),
    category: order.product?.category || "",
    buyer: fullName(order.buyer),
    seller: fullName(order.seller),
    status: warehouseStatus(order),
    rawStatus: order.warehouseStatus,
    priority: priority(order),
    warehouseAgentId: order.warehouseAgentId,
    trackingNumber: order.trackingNumber,
    trackingCompany: order.trackingCompany,
    receivedAt: order.warehouseReceivedAt,
    approvedAt: order.warehouseApprovedAt,
    readyForPickupAt: order.readyForPickupAt,
    warehouseNotes: order.warehouseNotes,
    inspectionNotes: order.inspectionNotes,
    paymentStatus: order.paymentStatus,
    escrowStatus: order.escrowStatus,
    timeline: Array.isArray(order.timeline)
      ? order.timeline
      : [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

function mapDeliveryOrder(order) {
  return {
    id: order.id,
    orderCode: order.orderCode,
    product: order.product?.title || "Producto QSM",
    productImage: productImage(order.product),
    buyer: {
      id: order.buyer?.id,
      name: fullName(order.buyer),
      phone: order.buyer?.phone || ""
    },
    seller: {
      id: order.seller?.id,
      name: fullName(order.seller),
      phone: order.seller?.phone || ""
    },
    status: deliveryStatus(order),
    rawStatus: order.deliveryStatus,
    priority: priority(order),
    deliveryAgentId: order.deliveryAgentId,
    pickupAddress: order.pickupAddress || "",
    deliveryAddress: order.deliveryAddress || "",
    pickupScheduledAt: order.pickupScheduledAt,
    outForDeliveryAt: order.outForDeliveryAt,
    trackingNumber: order.trackingNumber || "",
    trackingCompany: order.trackingCompany || "",
    pinVerified: Boolean(order.deliveryPinVerified),
    deliveryNotes: order.deliveryNotes,
    paymentStatus: order.paymentStatus,
    escrowStatus: order.escrowStatus,
    timeline: Array.isArray(order.timeline)
      ? order.timeline
      : [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

async function getWarehouseDashboard(req, res) {
  try {
    if (!hasAccess(req, "WAREHOUSE")) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso al area de Almacen."
      });
    }

    const orders =
      await prisma.order.findMany({
        where: {
          OR: [
            {
              deliveryMethod: "QSM_WAREHOUSE"
            },
            {
              warehouseStatus: {
                not: "NOT_REQUIRED"
              }
            }
          ]
        },
        include: ORDER_INCLUDE,
        orderBy: {
          updatedAt: "desc"
        }
      });

    const items =
      orders.map(mapWarehouseOrder);

    const countStatus = (status) =>
      items.filter(
        (item) => item.status === status
      ).length;

    return res.status(200).json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        kpis: {
          total: items.length,
          pending: countStatus("PENDING"),
          received: countStatus("RECEIVED"),
          inInspection: countStatus("INSPECTION"),
          approved: countStatus("APPROVED"),
          readyForPickup: countStatus("READY_FOR_PICKUP"),
          held:
            countStatus("HELD") +
            countStatus("REJECTED")
        },
        orders: items,
        agents: [],
        alerts: []
      }
    });
  } catch (error) {
    console.error(
      "Warehouse dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo cargar el Dashboard de Almacen.",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message
    });
  }
}

async function getDeliveryDashboard(req, res) {
  try {
    if (!hasAccess(req, "DELIVERY")) {
      return res.status(403).json({
        success: false,
        message: "No tienes acceso al area de Delivery."
      });
    }

    const orders =
      await prisma.order.findMany({
        where: {
          OR: [
            {
              deliveryMethod:
                "QSM_VERIFIED_DELIVERY"
            },
            {
              deliveryStatus: {
                in: [
                  "PICKUP_REQUESTED",
                  "PENDING_ASSIGNMENT",
                  "ASSIGNED",
                  "PICKED_UP",
                  "PRODUCT_COLLECTED",
                  "IN_TRANSIT",
                  "OUT_FOR_DELIVERY",
                  "WAITING_PIN",
                  "DELIVERED",
                  "FAILED",
                  "DELAYED"
                ]
              }
            }
          ]
        },
        include: ORDER_INCLUDE,
        orderBy: {
          updatedAt: "desc"
        }
      });

    const deliveries =
      orders.map(mapDeliveryOrder);

    const countStatus = (status) =>
      deliveries.filter(
        (item) => item.status === status
      ).length;

    return res.status(200).json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        kpis: {
          total: deliveries.length,
          pendingAssignment:
            countStatus("PENDING_ASSIGNMENT"),
          assigned: countStatus("ASSIGNED"),
          pickedUp: countStatus("PICKED_UP"),
          inTransit: countStatus("IN_TRANSIT"),
          waitingPin: countStatus("WAITING_PIN"),
          delivered: countStatus("DELIVERED"),
          failed: countStatus("FAILED"),
          delayed: countStatus("DELAYED")
        },
        deliveries,
        drivers: [],
        alerts: []
      }
    });
  } catch (error) {
    console.error(
      "Delivery dashboard error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo cargar el Dashboard de Delivery.",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message
    });
  }
}

module.exports = {
  getWarehouseDashboard,
  getDeliveryDashboard
};
