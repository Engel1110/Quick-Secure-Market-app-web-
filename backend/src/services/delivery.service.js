const prisma = require("../../config/prisma");

const {
    DELIVERY_STATUS,
    DELIVERY_EVENT,
    DELIVERY_PRIORITY
} = require("../constants/delivery.constants");

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function normalizeId(value, fieldName = "ID") {
    const id = Number(value);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`${fieldName} is invalid.`);
    }

    return id;
}

function buildPagination(page = 1, limit = 20) {
    const normalizedPage = Math.max(Number(page) || 1, 1);

    const normalizedLimit = Math.min(
        Math.max(Number(limit) || 20, 1),
        100
    );

    return {
        page: normalizedPage,
        limit: normalizedLimit,
        skip: (normalizedPage - 1) * normalizedLimit
    };
}

function buildDeliveryWhere(filters = {}) {
    const where = {};

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.priority) {
        where.priority = filters.priority;
    }

    if (filters.driverId) {
        where.driverId = Number(filters.driverId);
    }

    if (filters.vehicleId) {
        where.vehicleId = Number(filters.vehicleId);
    }

    if (filters.routeId) {
        where.routeId = Number(filters.routeId);
    }

    if (filters.warehouseItemId) {
        where.warehouseItemId = Number(
            filters.warehouseItemId
        );
    }

    if (filters.orderId) {
        where.orderId = Number(filters.orderId);
    }

    if (filters.startDate || filters.endDate) {
        where.createdAt = {};

        if (filters.startDate) {
            const startDate = new Date(
                filters.startDate
            );

            if (Number.isNaN(startDate.getTime())) {
                throw new Error(
                    "Start date is invalid."
                );
            }

            where.createdAt.gte = startDate;
        }

        if (filters.endDate) {
            const endDate = new Date(
                filters.endDate
            );

            if (Number.isNaN(endDate.getTime())) {
                throw new Error(
                    "End date is invalid."
                );
            }

            where.createdAt.lte = endDate;
        }
    }

    if (filters.search) {
        const search = String(
            filters.search
        ).trim();

        where.OR = [
            {
                trackingNumber: {
                    contains: search,
                    mode: "insensitive"
                }
            },
            {
                recipientName: {
                    contains: search,
                    mode: "insensitive"
                }
            },
            {
                recipientPhone: {
                    contains: search,
                    mode: "insensitive"
                }
            },
            {
                deliveryAddress: {
                    contains: search,
                    mode: "insensitive"
                }
            }
        ];
    }

    return where;
}

async function createTimelineEvent(
    tx,
    {
        deliveryId,
        employeeId,
        event,
        description,
        metadata
    }
) {
    return tx.deliveryTimeline.create({
        data: {
            deliveryId: Number(deliveryId),
            employeeId: employeeId
                ? Number(employeeId)
                : null,
            event,
            description:
                description || null,
            metadata: metadata || undefined
        }
    });
}

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

async function listDeliveries(filters = {}) {
    const {
        page,
        limit,
        skip
    } = buildPagination(
        filters.page,
        filters.limit
    );

    const where = buildDeliveryWhere(filters);

    const [
        deliveries,
        total
    ] = await prisma.$transaction([
        prisma.delivery.findMany({
            where,

            skip,

            take: limit,

            include: {
                warehouseItem: {
                    include: {
                        product: true,
                        seller: true,
                        buyer: true
                    }
                },

                order: true,

                driver: true,

                vehicle: true,

                route: true,

                attempts: {
                    orderBy: {
                        createdAt: "desc"
                    },

                    take: 1
                }
            },

            orderBy: {
                createdAt: "desc"
            }
        }),

        prisma.delivery.count({
            where
        })
    ]);

    return {
        deliveries,

        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(
                total / limit
            )
        }
    };
}

async function getDelivery(deliveryId) {
    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({
            where: {
                id
            },

            include: {
                warehouseItem: {
                    include: {
                        product: true,
                        seller: true,
                        buyer: true,
                        inspection: true,
                        location: true
                    }
                },

                order: true,

                driver: true,

                vehicle: true,

                route: true,

                attempts: {
                    orderBy: {
                        createdAt: "desc"
                    }
                },

                evidences: {
                    orderBy: {
                        createdAt: "desc"
                    }
                },

                incidents: {
                    orderBy: {
                        createdAt: "desc"
                    }
                },

                notes: {
                    include: {
                        employee: true
                    },

                    orderBy: {
                        createdAt: "desc"
                    }
                },

                timeline: {
                    include: {
                        employee: true
                    },

                    orderBy: {
                        createdAt: "desc"
                    }
                }
            }
        });

    if (!delivery) {
        throw new Error("Delivery not found.");
    }

    return delivery;
}

async function getDeliveryStatistics() {
    const [
        total,
        pending,
        readyForAssignment,
        driverAssigned,
        inTransit,
        attempted,
        delivered,
        failed,
        cancelled,
        returning,
        returned
    ] = await prisma.$transaction([
        prisma.delivery.count(),

        prisma.delivery.count({
            where: {
                status: DELIVERY_STATUS.PENDING
            }
        }),

        prisma.delivery.count({
            where: {
                status:
                    DELIVERY_STATUS.READY_FOR_ASSIGNMENT
            }
        }),

        prisma.delivery.count({
            where: {
                status:
                    DELIVERY_STATUS.DRIVER_ASSIGNED
            }
        }),

        prisma.delivery.count({
            where: {
                status:
                    DELIVERY_STATUS.IN_TRANSIT
            }
        }),

        prisma.delivery.count({
            where: {
                status:
                    DELIVERY_STATUS.DELIVERY_ATTEMPTED
            }
        }),

        prisma.delivery.count({
            where: {
                status:
                    DELIVERY_STATUS.DELIVERED
            }
        }),

        prisma.delivery.count({
            where: {
                status:
                    DELIVERY_STATUS.FAILED
            }
        }),

        prisma.delivery.count({
            where: {
                status:
                    DELIVERY_STATUS.CANCELLED
            }
        }),

        prisma.delivery.count({
            where: {
                status:
                    DELIVERY_STATUS.RETURNING_TO_WAREHOUSE
            }
        }),

        prisma.delivery.count({
            where: {
                status:
                    DELIVERY_STATUS.RETURNED_TO_WAREHOUSE
            }
        })
    ]);

    const completionRate =
        total > 0
            ? Number(
                  (
                      (delivered / total) *
                      100
                  ).toFixed(2)
              )
            : 0;

    return {
        total,
        pending,
        readyForAssignment,
        driverAssigned,
        inTransit,
        attempted,
        delivered,
        failed,
        cancelled,
        returning,
        returned,
        completionRate
    };
}

async function getDeliveryTimeline(deliveryId) {
    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({
            where: {
                id
            },

            select: {
                id: true
            }
        });

    if (!delivery) {
        throw new Error("Delivery not found.");
    }

    return prisma.deliveryTimeline.findMany({
        where: {
            deliveryId: id
        },

        include: {
            employee: true
        },

        orderBy: {
            createdAt: "desc"
        }
    });
}

/*
|--------------------------------------------------------------------------
| Delivery CRUD
|--------------------------------------------------------------------------
*/

async function createDelivery({
    warehouseItemId,
    orderId,
    employeeId,
    deliveryCompany,
    recipientName,
    recipientPhone,
    recipientDocument,
    deliveryAddress,
    reference,
    province,
    municipality,
    sector,
    latitude,
    longitude,
    scheduledDate,
    priority = DELIVERY_PRIORITY.NORMAL,
    notes
}) {
    const normalizedWarehouseItemId =
        warehouseItemId
            ? normalizeId(
                  warehouseItemId,
                  "Warehouse item ID"
              )
            : null;

    const normalizedOrderId = orderId
        ? normalizeId(orderId, "Order ID")
        : null;

    if (
        !normalizedWarehouseItemId &&
        !normalizedOrderId
    ) {
        throw new Error(
            "Warehouse item ID or order ID is required."
        );
    }

    if (
        !recipientName ||
        !String(recipientName).trim()
    ) {
        throw new Error(
            "Recipient name is required."
        );
    }

    if (
        !recipientPhone ||
        !String(recipientPhone).trim()
    ) {
        throw new Error(
            "Recipient phone is required."
        );
    }

    if (
        !deliveryAddress ||
        !String(deliveryAddress).trim()
    ) {
        throw new Error(
            "Delivery address is required."
        );
    }

    let normalizedScheduledDate = null;

    if (scheduledDate) {
        normalizedScheduledDate =
            new Date(scheduledDate);

        if (
            Number.isNaN(
                normalizedScheduledDate.getTime()
            )
        ) {
            throw new Error(
                "Scheduled date is invalid."
            );
        }
    }

    if (normalizedWarehouseItemId) {
        const warehouseItem =
            await prisma.warehouseItem.findUnique({
                where: {
                    id: normalizedWarehouseItemId
                }
            });

        if (!warehouseItem) {
            throw new Error(
                "Warehouse item not found."
            );
        }

        const existingDelivery =
            await prisma.delivery.findUnique({
                where: {
                    warehouseItemId:
                        normalizedWarehouseItemId
                }
            });

        if (existingDelivery) {
            throw new Error(
                "A delivery already exists for this warehouse item."
            );
        }
    }

    if (normalizedOrderId) {
        const order =
            await prisma.order.findUnique({
                where: {
                    id: normalizedOrderId
                }
            });

        if (!order) {
            throw new Error("Order not found.");
        }
    }

    return prisma.$transaction(async (tx) => {
        const trackingNumber =
            `QSM-DLV-${Date.now()}-${Math.floor(
                Math.random() * 10000
            )
                .toString()
                .padStart(4, "0")}`;

        const delivery =
            await tx.delivery.create({
                data: {
                    warehouseItemId:
                        normalizedWarehouseItemId,

                    orderId:
                        normalizedOrderId,

                    createdBy:
                        Number(employeeId),

                    trackingNumber,

                    deliveryCompany:
                        deliveryCompany || null,

                    recipientName:
                        String(
                            recipientName
                        ).trim(),

                    recipientPhone:
                        String(
                            recipientPhone
                        ).trim(),

                    recipientDocument:
                        recipientDocument
                            ? String(
                                  recipientDocument
                              ).trim()
                            : null,

                    deliveryAddress:
                        String(
                            deliveryAddress
                        ).trim(),

                    reference:
                        reference
                            ? String(
                                  reference
                              ).trim()
                            : null,

                    province:
                        province
                            ? String(
                                  province
                              ).trim()
                            : null,

                    municipality:
                        municipality
                            ? String(
                                  municipality
                              ).trim()
                            : null,

                    sector:
                        sector
                            ? String(
                                  sector
                              ).trim()
                            : null,

                    latitude:
                        latitude !== undefined &&
                        latitude !== null
                            ? Number(latitude)
                            : null,

                    longitude:
                        longitude !== undefined &&
                        longitude !== null
                            ? Number(longitude)
                            : null,

                    scheduledDate:
                        normalizedScheduledDate,

                    priority,

                    notes:
                        notes
                            ? String(notes).trim()
                            : null,

                    status:
                        DELIVERY_STATUS.READY_FOR_ASSIGNMENT
                }
            });

        await createTimelineEvent(tx, {
            deliveryId: delivery.id,
            employeeId,
            event:
                DELIVERY_EVENT.DELIVERY_CREATED,
            description:
                "Delivery created successfully.",
            metadata: {
                trackingNumber,
                warehouseItemId:
                    normalizedWarehouseItemId,
                orderId: normalizedOrderId
            }
        });

        return delivery;
    });
}

async function updateDelivery({
    deliveryId,
    employeeId,
    deliveryCompany,
    recipientName,
    recipientPhone,
    recipientDocument,
    deliveryAddress,
    reference,
    province,
    municipality,
    sector,
    latitude,
    longitude,
    scheduledDate,
    priority,
    notes
}) {
    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({
            where: {
                id
            }
        });

    if (!delivery) {
        throw new Error("Delivery not found.");
    }

    if (
        delivery.status ===
            DELIVERY_STATUS.DELIVERED ||
        delivery.status ===
            DELIVERY_STATUS.CANCELLED ||
        delivery.status ===
            DELIVERY_STATUS.RETURNED_TO_WAREHOUSE
    ) {
        throw new Error(
            "Delivery cannot be updated in its current status."
        );
    }

    let normalizedScheduledDate;

    if (scheduledDate !== undefined) {
        if (!scheduledDate) {
            normalizedScheduledDate = null;
        } else {
            normalizedScheduledDate =
                new Date(scheduledDate);

            if (
                Number.isNaN(
                    normalizedScheduledDate.getTime()
                )
            ) {
                throw new Error(
                    "Scheduled date is invalid."
                );
            }
        }
    }

    const updateData = {};

    if (deliveryCompany !== undefined) {
        updateData.deliveryCompany =
            deliveryCompany || null;
    }

    if (recipientName !== undefined) {
        updateData.recipientName =
            String(recipientName).trim();
    }

    if (recipientPhone !== undefined) {
        updateData.recipientPhone =
            String(recipientPhone).trim();
    }

    if (recipientDocument !== undefined) {
        updateData.recipientDocument =
            recipientDocument
                ? String(
                      recipientDocument
                  ).trim()
                : null;
    }

    if (deliveryAddress !== undefined) {
        updateData.deliveryAddress =
            String(deliveryAddress).trim();
    }

    if (reference !== undefined) {
        updateData.reference = reference
            ? String(reference).trim()
            : null;
    }

    if (province !== undefined) {
        updateData.province = province
            ? String(province).trim()
            : null;
    }

    if (municipality !== undefined) {
        updateData.municipality =
            municipality
                ? String(
                      municipality
                  ).trim()
                : null;
    }

    if (sector !== undefined) {
        updateData.sector = sector
            ? String(sector).trim()
            : null;
    }

    if (latitude !== undefined) {
        updateData.latitude =
            latitude !== null
                ? Number(latitude)
                : null;
    }

    if (longitude !== undefined) {
        updateData.longitude =
            longitude !== null
                ? Number(longitude)
                : null;
    }

    if (scheduledDate !== undefined) {
        updateData.scheduledDate =
            normalizedScheduledDate;
    }

    if (priority !== undefined) {
        updateData.priority = priority;
    }

    if (notes !== undefined) {
        updateData.notes = notes
            ? String(notes).trim()
            : null;
    }

    return prisma.$transaction(async (tx) => {
        const updated =
            await tx.delivery.update({
                where: {
                    id
                },

                data: updateData
            });

        await createTimelineEvent(tx, {
            deliveryId: id,
            employeeId,
            event:
                DELIVERY_EVENT.DELIVERY_UPDATED,
            description:
                "Delivery information updated.",
            metadata: updateData
        });

        return updated;
    });
}

async function cancelDelivery({
    deliveryId,
    employeeId,
    reason,
    notes
}) {
    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({
            where: {
                id
            }
        });

    if (!delivery) {
        throw new Error("Delivery not found.");
    }

    if (
        delivery.status ===
        DELIVERY_STATUS.DELIVERED
    ) {
        throw new Error(
            "A completed delivery cannot be cancelled."
        );
    }

    if (
        delivery.status ===
        DELIVERY_STATUS.CANCELLED
    ) {
        throw new Error(
            "Delivery is already cancelled."
        );
    }

    if (
        !reason ||
        !String(reason).trim()
    ) {
        throw new Error(
            "Cancellation reason is required."
        );
    }

    return prisma.$transaction(async (tx) => {
        const updated =
            await tx.delivery.update({
                where: {
                    id
                },

                data: {
                    status:
                        DELIVERY_STATUS.CANCELLED,

                    cancelledAt: new Date(),

                    cancelledBy:
                        Number(employeeId),

                    cancellationReason:
                        String(reason).trim(),

                    notes:
                        notes !== undefined
                            ? String(
                                  notes || ""
                              ).trim() || null
                            : delivery.notes
                }
            });

        await createTimelineEvent(tx, {
            deliveryId: id,
            employeeId,
            event:
                DELIVERY_EVENT.DELIVERY_CANCELLED,
            description:
                String(reason).trim()
        });

        return updated;
    });
}

async function deleteDelivery({
    deliveryId,
    employeeId
}) {
    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({
            where: {
                id
            }
        });

    if (!delivery) {
        throw new Error("Delivery not found.");
    }

    if (
        delivery.status !==
            DELIVERY_STATUS.PENDING &&
        delivery.status !==
            DELIVERY_STATUS.READY_FOR_ASSIGNMENT &&
        delivery.status !==
            DELIVERY_STATUS.CANCELLED
    ) {
        throw new Error(
            "Only pending, unassigned or cancelled deliveries can be deleted."
        );
    }

    return prisma.$transaction(async (tx) => {
        await tx.deliveryTimeline.deleteMany({
            where: {
                deliveryId: id
            }
        });

        await tx.delivery.delete({
            where: {
                id
            }
        });

        return {
            success: true,
            deliveryId: id,
            deletedBy: Number(employeeId)
        };
    });
}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
    // Dashboard
    listDeliveries,
    getDelivery,
    getDeliveryStatistics,
    getDeliveryTimeline,

    // Delivery
    createDelivery,
    updateDelivery,
    cancelDelivery,
    deleteDelivery
};
/*
|--------------------------------------------------------------------------
| Conductores
|--------------------------------------------------------------------------
*/

async function assignDriver({
    deliveryId,
    employeeId,
    driverId
}) {

    const id = normalizeId(deliveryId, "Delivery ID");
    const normalizedDriverId = normalizeId(driverId, "Driver ID");

    const delivery = await prisma.delivery.findUnique({
        where: { id }
    });

    if (!delivery)
        throw new Error("Delivery not found.");

    if (
        delivery.status === DELIVERY_STATUS.DELIVERED ||
        delivery.status === DELIVERY_STATUS.CANCELLED
    ) {
        throw new Error("Driver cannot be assigned.");
    }

    const driver = await prisma.deliveryDriver.findUnique({
        where: {
            id: normalizedDriverId
        }
    });

    if (!driver)
        throw new Error("Driver not found.");

    return prisma.$transaction(async (tx) => {

        const updated = await tx.delivery.update({

            where: { id },

            data: {

                driverId: normalizedDriverId,

                status: DELIVERY_STATUS.DRIVER_ASSIGNED,

                assignedDriverAt: new Date()

            }

        });

        await tx.deliveryDriver.update({

            where: {
                id: normalizedDriverId
            },

            data: {
                status: "ASSIGNED"
            }

        });

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event: DELIVERY_EVENT.DRIVER_ASSIGNED,

            description: "Driver assigned."

        });

        return updated;

    });

}

async function changeDriver({
    deliveryId,
    employeeId,
    driverId
}) {

    const id = normalizeId(deliveryId);
    const normalizedDriverId = normalizeId(driverId);

    const delivery = await prisma.delivery.findUnique({

        where: { id }

    });

    if (!delivery)
        throw new Error("Delivery not found.");

    return prisma.$transaction(async (tx) => {

        const updated = await tx.delivery.update({

            where: { id },

            data: {

                driverId: normalizedDriverId

            }

        });

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event: DELIVERY_EVENT.DRIVER_CHANGED,

            description: "Driver changed."

        });

        return updated;

    });

}

async function removeDriver({
    deliveryId,
    employeeId
}) {

    const id = normalizeId(deliveryId);

    const delivery = await prisma.delivery.findUnique({

        where: { id }

    });

    if (!delivery)
        throw new Error("Delivery not found.");

    return prisma.$transaction(async (tx) => {

        await tx.delivery.update({

            where: { id },

            data: {

                driverId: null,

                status: DELIVERY_STATUS.READY_FOR_ASSIGNMENT

            }

        });

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event: DELIVERY_EVENT.DRIVER_REMOVED,

            description: "Driver removed."

        });

        return {

            success: true

        };

    });

}

/*
|--------------------------------------------------------------------------
| Vehículos
|--------------------------------------------------------------------------
*/

async function assignVehicle({
    deliveryId,
    employeeId,
    vehicleId
}) {

    const id = normalizeId(deliveryId);
    const normalizedVehicleId = normalizeId(vehicleId);

    const vehicle = await prisma.deliveryVehicle.findUnique({

        where: {
            id: normalizedVehicleId
        }

    });

    if (!vehicle)
        throw new Error("Vehicle not found.");

    return prisma.$transaction(async (tx) => {

        const updated = await tx.delivery.update({

            where: { id },

            data: {

                vehicleId: normalizedVehicleId

            }

        });

        await tx.deliveryVehicle.update({

            where: {
                id: normalizedVehicleId
            },

            data: {

                status: "ASSIGNED"

            }

        });

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event: DELIVERY_EVENT.VEHICLE_ASSIGNED,

            description: "Vehicle assigned."

        });

        return updated;

    });

}

async function changeVehicle({
    deliveryId,
    employeeId,
    vehicleId
}) {

    const id = normalizeId(deliveryId);
    const normalizedVehicleId = normalizeId(vehicleId);

    return prisma.$transaction(async (tx) => {

        const updated = await tx.delivery.update({

            where: { id },

            data: {

                vehicleId: normalizedVehicleId

            }

        });

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event: DELIVERY_EVENT.VEHICLE_CHANGED,

            description: "Vehicle changed."

        });

        return updated;

    });

}

async function removeVehicle({
    deliveryId,
    employeeId
}) {

    const id = normalizeId(deliveryId);

    return prisma.$transaction(async (tx) => {

        await tx.delivery.update({

            where: { id },

            data: {

                vehicleId: null

            }

        });

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event: DELIVERY_EVENT.VEHICLE_REMOVED,

            description: "Vehicle removed."

        });

        return {

            success: true

        };

    });

}
/*
|--------------------------------------------------------------------------
| Rutas
|--------------------------------------------------------------------------
*/

async function assignRoute({
    deliveryId,
    employeeId,
    routeId
}) {

    const id = normalizeId(deliveryId, "Delivery ID");
    const normalizedRouteId = normalizeId(routeId, "Route ID");

    const delivery = await prisma.delivery.findUnique({
        where: { id }
    });

    if (!delivery)
        throw new Error("Delivery not found.");

    const route = await prisma.deliveryRoute.findUnique({
        where: {
            id: normalizedRouteId
        }
    });

    if (!route)
        throw new Error("Route not found.");

    return prisma.$transaction(async (tx) => {

        const updated = await tx.delivery.update({

            where: { id },

            data: {

                routeId: normalizedRouteId

            }

        });

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event: DELIVERY_EVENT.ROUTE_ASSIGNED,

            description: "Route assigned."

        });

        return updated;

    });

}

async function changeRoute({
    deliveryId,
    employeeId,
    routeId
}) {

    const id = normalizeId(deliveryId);
    const normalizedRouteId = normalizeId(routeId);

    return prisma.$transaction(async (tx) => {

        const updated = await tx.delivery.update({

            where: { id },

            data: {

                routeId: normalizedRouteId

            }

        });

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event: DELIVERY_EVENT.ROUTE_CHANGED,

            description: "Route changed."

        });

        return updated;

    });

}

async function removeRoute({
    deliveryId,
    employeeId
}) {

    const id = normalizeId(deliveryId);

    return prisma.$transaction(async (tx) => {

        await tx.delivery.update({

            where: { id },

            data: {

                routeId: null

            }

        });

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event: DELIVERY_EVENT.ROUTE_REMOVED,

            description: "Route removed."

        });

        return {

            success: true

        };

    });

}

/*
|--------------------------------------------------------------------------
| Tracking
|--------------------------------------------------------------------------
*/

async function startDelivery({
    deliveryId,
    employeeId
}) {

    const id = normalizeId(deliveryId);

    const delivery = await prisma.delivery.findUnique({

        where: { id }

    });

    if (!delivery)
        throw new Error("Delivery not found.");

    if (!delivery.driverId)
        throw new Error("Driver has not been assigned.");

    return prisma.$transaction(async (tx) => {

        const updated = await tx.delivery.update({

            where: { id },

            data: {

                status: DELIVERY_STATUS.IN_TRANSIT,

                pickedUpAt: new Date()

            }

        });

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event: DELIVERY_EVENT.PACKAGE_PICKED_UP,

            description: "Package picked up."

        });

        return updated;

    });

}

async function updateLocation({
    deliveryId,
    employeeId,
    latitude,
    longitude,
    accuracy,
    speed,
    heading
}) {

    const id = normalizeId(deliveryId);

    if (
        latitude === undefined ||
        longitude === undefined
    ) {
        throw new Error(
            "Latitude and longitude are required."
        );
    }

    const location =
        await prisma.deliveryLocation.create({

            data: {

                deliveryId: id,

                latitude: Number(latitude),

                longitude: Number(longitude),

                accuracy:
                    accuracy !== undefined
                        ? Number(accuracy)
                        : null,

                speed:
                    speed !== undefined
                        ? Number(speed)
                        : null,

                heading:
                    heading !== undefined
                        ? Number(heading)
                        : null

            }

        });

    await createTimelineEvent(prisma, {

        deliveryId: id,

        employeeId,

        event: DELIVERY_EVENT.LOCATION_UPDATED,

        description: "Location updated."

    });

    return location;

}

async function finishDelivery({
    deliveryId,
    employeeId
}) {

    const id = normalizeId(deliveryId);

    const delivery = await prisma.delivery.findUnique({

        where: { id }

    });

    if (!delivery)
        throw new Error("Delivery not found.");

    if (
        delivery.status !==
        DELIVERY_STATUS.IN_TRANSIT
    ) {
        throw new Error(
            "Delivery is not in transit."
        );
    }

    return prisma.$transaction(async (tx) => {

        const updated = await tx.delivery.update({

            where: { id },

            data: {

                deliveredAt: new Date(),

                status:
                    DELIVERY_STATUS.DELIVERED

            }

        });

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event:
                DELIVERY_EVENT.DELIVERY_CONFIRMED,

            description:
                "Delivery completed."

        });

        return updated;

    });

}

async function getTrackingHistory(
    deliveryId
) {

    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    return prisma.deliveryLocation.findMany({

        where: {

            deliveryId: id

        },

        orderBy: {

            createdAt: "asc"

        }

    });

}
/*
|--------------------------------------------------------------------------
| OTP
|--------------------------------------------------------------------------
*/

async function generateOtp({
    deliveryId,
    employeeId
}) {
    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({
            where: {
                id
            }
        });

    if (!delivery) {
        throw new Error(
            "Delivery not found."
        );
    }

    if (
        delivery.status ===
            DELIVERY_STATUS.DELIVERED ||
        delivery.status ===
            DELIVERY_STATUS.CANCELLED ||
        delivery.status ===
            DELIVERY_STATUS.RETURNED_TO_WAREHOUSE
    ) {
        throw new Error(
            "OTP cannot be generated for this delivery."
        );
    }

    const otpCode = Math.floor(
        100000 + Math.random() * 900000
    ).toString();

    const expiresAt = new Date(
        Date.now() + 10 * 60 * 1000
    );

    return prisma.$transaction(
        async (tx) => {
            await tx.deliveryOtp.updateMany({
                where: {
                    deliveryId: id,
                    status: "PENDING"
                },
                data: {
                    status: "EXPIRED"
                }
            });

            const otp =
                await tx.deliveryOtp.create({
                    data: {
                        deliveryId: id,
                        code: otpCode,
                        status: "PENDING",
                        attempts: 0,
                        expiresAt,
                        createdBy:
                            employeeId
                                ? Number(
                                      employeeId
                                  )
                                : null
                    }
                });

            await createTimelineEvent(
                tx,
                {
                    deliveryId: id,
                    employeeId,
                    event:
                        DELIVERY_EVENT.OTP_GENERATED,
                    description:
                        "Delivery OTP generated.",
                    metadata: {
                        expiresAt
                    }
                }
            );

            return otp;
        }
    );
}

async function verifyOtp({
    deliveryId,
    employeeId,
    code
}) {
    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    if (
        !code ||
        !String(code).trim()
    ) {
        throw new Error(
            "OTP code is required."
        );
    }

    const otp =
        await prisma.deliveryOtp.findFirst({
            where: {
                deliveryId: id,
                status: "PENDING"
            },
            orderBy: {
                createdAt: "desc"
            }
        });

    if (!otp) {
        throw new Error(
            "Active OTP not found."
        );
    }

    if (
        new Date() >
        new Date(otp.expiresAt)
    ) {
        await prisma.deliveryOtp.update({
            where: {
                id: otp.id
            },
            data: {
                status: "EXPIRED"
            }
        });

        throw new Error(
            "OTP has expired."
        );
    }

    if (otp.attempts >= 5) {
        await prisma.deliveryOtp.update({
            where: {
                id: otp.id
            },
            data: {
                status: "BLOCKED"
            }
        });

        throw new Error(
            "OTP is blocked."
        );
    }

    if (
        String(otp.code) !==
        String(code).trim()
    ) {
        const nextAttempts =
            otp.attempts + 1;

        await prisma.deliveryOtp.update({
            where: {
                id: otp.id
            },
            data: {
                attempts: nextAttempts,
                status:
                    nextAttempts >= 5
                        ? "BLOCKED"
                        : "PENDING"
            }
        });

        throw new Error(
            "OTP code is invalid."
        );
    }

    return prisma.$transaction(
        async (tx) => {
            const verified =
                await tx.deliveryOtp.update({
                    where: {
                        id: otp.id
                    },
                    data: {
                        status: "VERIFIED",
                        verifiedAt:
                            new Date(),
                        verifiedBy:
                            employeeId
                                ? Number(
                                      employeeId
                                  )
                                : null
                    }
                });

            await createTimelineEvent(
                tx,
                {
                    deliveryId: id,
                    employeeId,
                    event:
                        DELIVERY_EVENT.OTP_VERIFIED,
                    description:
                        "Delivery OTP verified."
                }
            );

            return verified;
        }
    );
}

async function resendOtp({
    deliveryId,
    employeeId
}) {
    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const lastOtp =
        await prisma.deliveryOtp.findFirst({
            where: {
                deliveryId: id
            },
            orderBy: {
                createdAt: "desc"
            }
        });

    if (lastOtp) {
        const elapsed =
            Date.now() -
            new Date(
                lastOtp.createdAt
            ).getTime();

        if (elapsed < 60000) {
            throw new Error(
                "Wait before requesting another OTP."
            );
        }
    }

    const otp = await generateOtp({
        deliveryId: id,
        employeeId
    });

    await createTimelineEvent(
        prisma,
        {
            deliveryId: id,
            employeeId,
            event:
                DELIVERY_EVENT.OTP_RESENT,
            description:
                "Delivery OTP resent."
        }
    );

    return otp;
}

/*
|--------------------------------------------------------------------------
| Intentos de entrega
|--------------------------------------------------------------------------
*/

async function createDeliveryAttempt({
    deliveryId,
    employeeId,
    result,
    reason,
    notes,
    latitude,
    longitude
}) {
    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({
            where: {
                id
            }
        });

    if (!delivery) {
        throw new Error(
            "Delivery not found."
        );
    }

    if (
        delivery.status !==
            DELIVERY_STATUS.IN_TRANSIT &&
        delivery.status !==
            DELIVERY_STATUS.DELIVERY_ATTEMPTED &&
        delivery.status !==
            DELIVERY_STATUS.RESCHEDULED
    ) {
        throw new Error(
            "Delivery attempt cannot be registered in its current status."
        );
    }

    if (
        !result ||
        !String(result).trim()
    ) {
        throw new Error(
            "Attempt result is required."
        );
    }

    return prisma.$transaction(
        async (tx) => {
            const attempt =
                await tx.deliveryAttempt.create({
                    data: {
                        deliveryId: id,
                        employeeId:
                            employeeId
                                ? Number(
                                      employeeId
                                  )
                                : null,
                        result:
                            String(
                                result
                            ).trim(),
                        reason:
                            reason
                                ? String(
                                      reason
                                  ).trim()
                                : null,
                        notes:
                            notes
                                ? String(
                                      notes
                                  ).trim()
                                : null,
                        latitude:
                            latitude !==
                                undefined &&
                            latitude !== null
                                ? Number(
                                      latitude
                                  )
                                : null,
                        longitude:
                            longitude !==
                                undefined &&
                            longitude !== null
                                ? Number(
                                      longitude
                                  )
                                : null
                    }
                });

            await tx.delivery.update({
                where: {
                    id
                },
                data: {
                    status:
                        DELIVERY_STATUS.DELIVERY_ATTEMPTED,
                    lastAttemptAt:
                        new Date()
                }
            });

            await createTimelineEvent(
                tx,
                {
                    deliveryId: id,
                    employeeId,
                    event:
                        DELIVERY_EVENT.DELIVERY_ATTEMPTED,
                    description:
                        "Delivery attempt registered.",
                    metadata: {
                        attemptId:
                            attempt.id,
                        result,
                        reason:
                            reason || null
                    }
                }
            );

            return attempt;
        }
    );
}

async function listDeliveryAttempts(
    deliveryId
) {
    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({
            where: {
                id
            },
            select: {
                id: true
            }
        });

    if (!delivery) {
        throw new Error(
            "Delivery not found."
        );
    }

    return prisma.deliveryAttempt.findMany({
        where: {
            deliveryId: id
        },
        include: {
            employee: true
        },
        orderBy: {
            createdAt: "desc"
        }
    });
}

async function rescheduleDelivery({
    deliveryId,
    employeeId,
    scheduledDate,
    reason,
    notes
}) {
    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    if (!scheduledDate) {
        throw new Error(
            "Scheduled date is required."
        );
    }

    const normalizedDate =
        new Date(scheduledDate);

    if (
        Number.isNaN(
            normalizedDate.getTime()
        )
    ) {
        throw new Error(
            "Scheduled date is invalid."
        );
    }

    if (
        normalizedDate <= new Date()
    ) {
        throw new Error(
            "Scheduled date must be in the future."
        );
    }

    const delivery =
        await prisma.delivery.findUnique({
            where: {
                id
            }
        });

    if (!delivery) {
        throw new Error(
            "Delivery not found."
        );
    }

    if (
        delivery.status ===
            DELIVERY_STATUS.DELIVERED ||
        delivery.status ===
            DELIVERY_STATUS.CANCELLED ||
        delivery.status ===
            DELIVERY_STATUS.RETURNED_TO_WAREHOUSE
    ) {
        throw new Error(
            "Delivery cannot be rescheduled."
        );
    }

    return prisma.$transaction(
        async (tx) => {
            const updated =
                await tx.delivery.update({
                    where: {
                        id
                    },
                    data: {
                        status:
                            DELIVERY_STATUS.RESCHEDULED,
                        scheduledDate:
                            normalizedDate,
                        rescheduledAt:
                            new Date(),
                        rescheduledBy:
                            employeeId
                                ? Number(
                                      employeeId
                                  )
                                : null,
                        rescheduleReason:
                            reason
                                ? String(
                                      reason
                                  ).trim()
                                : null,
                        notes:
                            notes !== undefined
                                ? String(
                                      notes || ""
                                  ).trim() ||
                                  null
                                : delivery.notes
                    }
                });

            await createTimelineEvent(
                tx,
                {
                    deliveryId: id,
                    employeeId,
                    event:
                        DELIVERY_EVENT.DELIVERY_RESCHEDULED,
                    description:
                        reason ||
                        "Delivery rescheduled.",
                    metadata: {
                        scheduledDate:
                            normalizedDate
                    }
                }
            );

            return updated;
        }
    );
}
/*
|--------------------------------------------------------------------------
| Confirmación de entrega
|--------------------------------------------------------------------------
*/

async function confirmDelivery({
    deliveryId,
    employeeId,
    otpCode,
    signature,
    receiverName,
    receiverDocument,
    notes
}) {

    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({

            where: { id }

        });

    if (!delivery)
        throw new Error("Delivery not found.");

    if (
        delivery.status !==
        DELIVERY_STATUS.IN_TRANSIT
    ) {
        throw new Error(
            "Delivery is not in transit."
        );
    }

    if (otpCode) {

        await verifyOtp({

            deliveryId: id,

            employeeId,

            code: otpCode

        });

    }

    return prisma.$transaction(async (tx) => {

        const updated =
            await tx.delivery.update({

                where: { id },

                data: {

                    status:
                        DELIVERY_STATUS.DELIVERED,

                    deliveredAt: new Date(),

                    deliveredBy:
                        Number(employeeId),

                    receiverName:
                        receiverName || null,

                    receiverDocument:
                        receiverDocument || null,

                    signature:
                        signature || null,

                    deliveryNotes:
                        notes || null

                }

            });

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event:
                DELIVERY_EVENT.DELIVERY_CONFIRMED,

            description:
                "Delivery confirmed."

        });

        return updated;

    });

}

async function failDelivery({
    deliveryId,
    employeeId,
    reason,
    notes
}) {

    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({

            where: { id }

        });

    if (!delivery)
        throw new Error("Delivery not found.");

    if (
        !reason ||
        !String(reason).trim()
    ) {
        throw new Error(
            "Failure reason is required."
        );
    }

    return prisma.$transaction(async (tx) => {

        const updated =
            await tx.delivery.update({

                where: { id },

                data: {

                    status:
                        DELIVERY_STATUS.FAILED,

                    failedAt: new Date(),

                    failedReason:
                        String(reason).trim(),

                    deliveryNotes:
                        notes || null

                }

            });

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event:
                DELIVERY_EVENT.DELIVERY_FAILED,

            description:
                String(reason).trim()

        });

        return updated;

    });

}

/*
|--------------------------------------------------------------------------
| Retorno a almacén
|--------------------------------------------------------------------------
*/

async function startReturn({
    deliveryId,
    employeeId,
    reason
}) {

    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({

            where: { id }

        });

    if (!delivery)
        throw new Error("Delivery not found.");

    return prisma.$transaction(async (tx) => {

        const updated =
            await tx.delivery.update({

                where: { id },

                data: {

                    status:
                        DELIVERY_STATUS.RETURNING_TO_WAREHOUSE,

                    returnStartedAt:
                        new Date(),

                    returnReason:
                        reason || null

                }

            });

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event:
                DELIVERY_EVENT.RETURN_STARTED,

            description:
                reason ||
                "Return to warehouse started."

        });

        return updated;

    });

}

async function confirmWarehouseReturn({
    deliveryId,
    employeeId,
    warehouseLocationId,
    notes
}) {

    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({

            where: { id }

        });

    if (!delivery)
        throw new Error("Delivery not found.");

    return prisma.$transaction(async (tx) => {

        const updated =
            await tx.delivery.update({

                where: { id },

                data: {

                    status:
                        DELIVERY_STATUS.RETURNED_TO_WAREHOUSE,

                    returnedAt: new Date(),

                    returnedBy:
                        Number(employeeId)

                }

            });

        if (
            delivery.warehouseItemId &&
            warehouseLocationId
        ) {

            await tx.warehouseItem.update({

                where: {

                    id: delivery.warehouseItemId

                },

                data: {

                    locationId:
                        Number(
                            warehouseLocationId
                        )

                }

            });

        }

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event:
                DELIVERY_EVENT.RETURN_COMPLETED,

            description:
                notes ||
                "Package returned to warehouse."

        });

        return updated;

    });

}

/*
|--------------------------------------------------------------------------
| Tracking público
|--------------------------------------------------------------------------
*/

async function publicTracking(
    trackingNumber
) {

    if (
        !trackingNumber ||
        !String(trackingNumber).trim()
    ) {
        throw new Error(
            "Tracking number is required."
        );
    }

    const delivery =
        await prisma.delivery.findFirst({

            where: {

                trackingNumber:
                    String(
                        trackingNumber
                    ).trim()

            },

            include: {

                timeline: {

                    orderBy: {

                        createdAt: "asc"

                    },

                    select: {

                        event: true,

                        description: true,

                        createdAt: true

                    }

                }

            }

        });

    if (!delivery)
        throw new Error(
            "Tracking number not found."
        );

    return {

        trackingNumber:
            delivery.trackingNumber,

        status:
            delivery.status,

        scheduledDate:
            delivery.scheduledDate,

        deliveredAt:
            delivery.deliveredAt,

        timeline:
            delivery.timeline

    };

}
/*
|--------------------------------------------------------------------------
| Evidencias
|--------------------------------------------------------------------------
*/

async function uploadEvidence({
    deliveryId,
    employeeId,
    type,
    fileName,
    fileUrl,
    mimeType,
    size,
    description,
    latitude,
    longitude,
    isPrimary = false
}) {
    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({
            where: {
                id
            },
            select: {
                id: true
            }
        });

    if (!delivery) {
        throw new Error(
            "Delivery not found."
        );
    }

    if (
        !type ||
        !String(type).trim()
    ) {
        throw new Error(
            "Evidence type is required."
        );
    }

    if (
        !fileUrl ||
        !String(fileUrl).trim()
    ) {
        throw new Error(
            "Evidence file URL is required."
        );
    }

    return prisma.$transaction(
        async (tx) => {
            if (isPrimary) {
                await tx.deliveryEvidence.updateMany({
                    where: {
                        deliveryId: id,
                        isPrimary: true
                    },
                    data: {
                        isPrimary: false
                    }
                });
            }

            const evidence =
                await tx.deliveryEvidence.create({
                    data: {
                        deliveryId: id,

                        employeeId:
                            employeeId
                                ? Number(employeeId)
                                : null,

                        type:
                            String(type).trim(),

                        fileName:
                            fileName
                                ? String(fileName).trim()
                                : null,

                        fileUrl:
                            String(fileUrl).trim(),

                        mimeType:
                            mimeType
                                ? String(mimeType).trim()
                                : null,

                        size:
                            size !== undefined &&
                            size !== null
                                ? Number(size)
                                : null,

                        description:
                            description
                                ? String(description).trim()
                                : null,

                        latitude:
                            latitude !== undefined &&
                            latitude !== null
                                ? Number(latitude)
                                : null,

                        longitude:
                            longitude !== undefined &&
                            longitude !== null
                                ? Number(longitude)
                                : null,

                        isPrimary: Boolean(
                            isPrimary
                        )
                    }
                });

            await createTimelineEvent(
                tx,
                {
                    deliveryId: id,
                    employeeId,
                    event:
                        DELIVERY_EVENT.EVIDENCE_UPLOADED,
                    description:
                        "Delivery evidence uploaded.",
                    metadata: {
                        evidenceId:
                            evidence.id,
                        type:
                            evidence.type,
                        isPrimary:
                            evidence.isPrimary
                    }
                }
            );

            return evidence;
        }
    );
}

async function listEvidence(
    deliveryId
) {
    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({
            where: {
                id
            },
            select: {
                id: true
            }
        });

    if (!delivery) {
        throw new Error(
            "Delivery not found."
        );
    }

    return prisma.deliveryEvidence.findMany({
        where: {
            deliveryId: id
        },

        include: {
            employee: true
        },

        orderBy: [
            {
                isPrimary: "desc"
            },
            {
                createdAt: "desc"
            }
        ]
    });
}

async function getEvidence(
    evidenceId
) {
    const id = normalizeId(
        evidenceId,
        "Evidence ID"
    );

    const evidence =
        await prisma.deliveryEvidence.findUnique({
            where: {
                id
            },

            include: {
                delivery: true,
                employee: true
            }
        });

    if (!evidence) {
        throw new Error(
            "Evidence not found."
        );
    }

    return evidence;
}

async function updateEvidence({
    evidenceId,
    employeeId,
    type,
    fileName,
    fileUrl,
    mimeType,
    size,
    description,
    latitude,
    longitude,
    isPrimary
}) {
    const id = normalizeId(
        evidenceId,
        "Evidence ID"
    );

    const evidence =
        await prisma.deliveryEvidence.findUnique({
            where: {
                id
            }
        });

    if (!evidence) {
        throw new Error(
            "Evidence not found."
        );
    }

    const updateData = {};

    if (type !== undefined) {
        updateData.type =
            String(type).trim();
    }

    if (fileName !== undefined) {
        updateData.fileName =
            fileName
                ? String(fileName).trim()
                : null;
    }

    if (fileUrl !== undefined) {
        updateData.fileUrl =
            fileUrl
                ? String(fileUrl).trim()
                : null;
    }

    if (mimeType !== undefined) {
        updateData.mimeType =
            mimeType
                ? String(mimeType).trim()
                : null;
    }

    if (size !== undefined) {
        updateData.size =
            size !== null
                ? Number(size)
                : null;
    }

    if (description !== undefined) {
        updateData.description =
            description
                ? String(description).trim()
                : null;
    }

    if (latitude !== undefined) {
        updateData.latitude =
            latitude !== null
                ? Number(latitude)
                : null;
    }

    if (longitude !== undefined) {
        updateData.longitude =
            longitude !== null
                ? Number(longitude)
                : null;
    }

    if (isPrimary !== undefined) {
        updateData.isPrimary =
            Boolean(isPrimary);
    }

    return prisma.$transaction(
        async (tx) => {
            if (isPrimary === true) {
                await tx.deliveryEvidence.updateMany({
                    where: {
                        deliveryId:
                            evidence.deliveryId,
                        id: {
                            not: id
                        },
                        isPrimary: true
                    },
                    data: {
                        isPrimary: false
                    }
                });
            }

            const updated =
                await tx.deliveryEvidence.update({
                    where: {
                        id
                    },
                    data: updateData
                });

            await createTimelineEvent(
                tx,
                {
                    deliveryId:
                        evidence.deliveryId,
                    employeeId,
                    event:
                        DELIVERY_EVENT.EVIDENCE_UPDATED,
                    description:
                        "Delivery evidence updated.",
                    metadata: {
                        evidenceId: id,
                        changes:
                            updateData
                    }
                }
            );

            return updated;
        }
    );
}

async function deleteEvidence({
    evidenceId,
    employeeId
}) {
    const id = normalizeId(
        evidenceId,
        "Evidence ID"
    );

    const evidence =
        await prisma.deliveryEvidence.findUnique({
            where: {
                id
            }
        });

    if (!evidence) {
        throw new Error(
            "Evidence not found."
        );
    }

    return prisma.$transaction(
        async (tx) => {
            await tx.deliveryEvidence.delete({
                where: {
                    id
                }
            });

            await createTimelineEvent(
                tx,
                {
                    deliveryId:
                        evidence.deliveryId,
                    employeeId,
                    event:
                        DELIVERY_EVENT.EVIDENCE_DELETED,
                    description:
                        "Delivery evidence deleted.",
                    metadata: {
                        evidenceId: id,
                        type:
                            evidence.type,
                        fileUrl:
                            evidence.fileUrl
                    }
                }
            );

            return {
                success: true,
                evidenceId: id
            };
        }
    );
}

async function setPrimaryEvidence({
    evidenceId,
    employeeId
}) {
    const id = normalizeId(
        evidenceId,
        "Evidence ID"
    );

    const evidence =
        await prisma.deliveryEvidence.findUnique({
            where: {
                id
            }
        });

    if (!evidence) {
        throw new Error(
            "Evidence not found."
        );
    }

    return prisma.$transaction(
        async (tx) => {
            await tx.deliveryEvidence.updateMany({
                where: {
                    deliveryId:
                        evidence.deliveryId,
                    isPrimary: true
                },
                data: {
                    isPrimary: false
                }
            });

            const updated =
                await tx.deliveryEvidence.update({
                    where: {
                        id
                    },
                    data: {
                        isPrimary: true
                    }
                });

            await createTimelineEvent(
                tx,
                {
                    deliveryId:
                        evidence.deliveryId,
                    employeeId,
                    event:
                        DELIVERY_EVENT.PRIMARY_EVIDENCE_SET,
                    description:
                        "Primary delivery evidence set.",
                    metadata: {
                        evidenceId: id
                    }
                }
            );

            return updated;
        }
    );
}
/*
|--------------------------------------------------------------------------
| Incidentes
|--------------------------------------------------------------------------
*/

async function createIncident({
    deliveryId,
    employeeId,
    type,
    severity,
    title,
    description,
    latitude,
    longitude
}) {

    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({

            where: { id }

        });

    if (!delivery)
        throw new Error("Delivery not found.");

    if (!type)
        throw new Error("Incident type is required.");

    if (!severity)
        throw new Error("Incident severity is required.");

    if (!title)
        throw new Error("Incident title is required.");

    return prisma.$transaction(async (tx) => {

        const incident =
            await tx.deliveryIncident.create({

                data: {

                    deliveryId: id,

                    employeeId:
                        Number(employeeId),

                    type,

                    severity,

                    title: String(title).trim(),

                    description:
                        description || null,

                    latitude:
                        latitude !== undefined
                            ? Number(latitude)
                            : null,

                    longitude:
                        longitude !== undefined
                            ? Number(longitude)
                            : null,

                    status: "OPEN"

                }

            });

        await createTimelineEvent(tx, {

            deliveryId: id,

            employeeId,

            event:
                DELIVERY_EVENT.INCIDENT_CREATED,

            description:
                incident.title,

            metadata: {

                incidentId: incident.id,

                severity

            }

        });

        return incident;

    });

}

async function listIncidents(
    deliveryId
) {

    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    return prisma.deliveryIncident.findMany({

        where: {

            deliveryId: id

        },

        include: {

            employee: true

        },

        orderBy: {

            createdAt: "desc"

        }

    });

}

async function resolveIncident({
    incidentId,
    employeeId,
    resolution
}) {

    const id = normalizeId(
        incidentId,
        "Incident ID"
    );

    const incident =
        await prisma.deliveryIncident.findUnique({

            where: { id }

        });

    if (!incident)
        throw new Error("Incident not found.");

    if (incident.status === "RESOLVED")
        throw new Error("Incident already resolved.");

    return prisma.$transaction(async (tx) => {

        const updated =
            await tx.deliveryIncident.update({

                where: { id },

                data: {

                    status: "RESOLVED",

                    resolution:
                        resolution || null,

                    resolvedAt:
                        new Date(),

                    resolvedBy:
                        Number(employeeId)

                }

            });

        await createTimelineEvent(tx, {

            deliveryId:
                incident.deliveryId,

            employeeId,

            event:
                DELIVERY_EVENT.INCIDENT_RESOLVED,

            description:
                "Incident resolved."

        });

        return updated;

    });

}

/*
|--------------------------------------------------------------------------
| Notas internas
|--------------------------------------------------------------------------
*/

async function addInternalNote({
    deliveryId,
    employeeId,
    note
}) {

    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    if (!note)
        throw new Error("Note is required.");

    const internalNote =
        await prisma.deliveryNote.create({

            data: {

                deliveryId: id,

                employeeId:
                    Number(employeeId),

                note:
                    String(note).trim()

            }

        });

    await createTimelineEvent(prisma, {

        deliveryId: id,

        employeeId,

        event:
            DELIVERY_EVENT.INTERNAL_NOTE_ADDED,

        description:
            "Internal note added."

    });

    return internalNote;

}

async function getInternalNotes(
    deliveryId
) {

    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    return prisma.deliveryNote.findMany({

        where: {

            deliveryId: id

        },

        include: {

            employee: true

        },

        orderBy: {

            createdAt: "desc"

        }

    });

}

async function updateInternalNote({
    noteId,
    employeeId,
    note
}) {

    const id = normalizeId(
        noteId,
        "Note ID"
    );

    const existing =
        await prisma.deliveryNote.findUnique({

            where: { id }

        });

    if (!existing)
        throw new Error("Note not found.");

    const updated =
        await prisma.deliveryNote.update({

            where: { id },

            data: {

                note:
                    String(note).trim()

            }

        });

    await createTimelineEvent(prisma, {

        deliveryId:
            existing.deliveryId,

        employeeId,

        event:
            DELIVERY_EVENT.INTERNAL_NOTE_UPDATED,

        description:
            "Internal note updated."

    });

    return updated;

}

async function deleteInternalNote({
    noteId,
    employeeId
}) {

    const id = normalizeId(
        noteId,
        "Note ID"
    );

    const existing =
        await prisma.deliveryNote.findUnique({

            where: { id }

        });

    if (!existing)
        throw new Error("Note not found.");

    await prisma.deliveryNote.delete({

        where: { id }

    });

    await createTimelineEvent(prisma, {

        deliveryId:
            existing.deliveryId,

        employeeId,

        event:
            DELIVERY_EVENT.INTERNAL_NOTE_DELETED,

        description:
            "Internal note deleted."

    });

    return {

        success: true,

        noteId: id

    };

}
/*
|--------------------------------------------------------------------------
| Auditoría
|--------------------------------------------------------------------------
*/

async function getAuditHistory(
    deliveryId
) {

    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    return prisma.deliveryTimeline.findMany({

        where: {

            deliveryId: id

        },

        include: {

            employee: true

        },

        orderBy: {

            createdAt: "desc"

        }

    });

}

async function getDriverActivity(
    driverId
) {

    const id = normalizeId(
        driverId,
        "Driver ID"
    );

    return prisma.delivery.findMany({

        where: {

            driverId: id

        },

        include: {

            vehicle: true,
            route: true

        },

        orderBy: {

            updatedAt: "desc"

        }

    });

}

async function getVehicleActivity(
    vehicleId
) {

    const id = normalizeId(
        vehicleId,
        "Vehicle ID"
    );

    return prisma.delivery.findMany({

        where: {

            vehicleId: id

        },

        include: {

            driver: true,
            route: true

        },

        orderBy: {

            updatedAt: "desc"

        }

    });

}

async function getRecentActivity(
    limit = 30
) {

    return prisma.deliveryTimeline.findMany({

        take: Number(limit),

        include: {

            employee: true

        },

        orderBy: {

            createdAt: "desc"

        }

    });

}

/*
|--------------------------------------------------------------------------
| KPIs
|--------------------------------------------------------------------------
*/

async function getDeliveryKpis() {

    const [

        total,

        delivered,

        failed,

        inTransit,

        pending,

        attempted

    ] = await prisma.$transaction([

        prisma.delivery.count(),

        prisma.delivery.count({

            where: {

                status:
                    DELIVERY_STATUS.DELIVERED

            }

        }),

        prisma.delivery.count({

            where: {

                status:
                    DELIVERY_STATUS.FAILED

            }

        }),

        prisma.delivery.count({

            where: {

                status:
                    DELIVERY_STATUS.IN_TRANSIT

            }

        }),

        prisma.delivery.count({

            where: {

                status:
                    DELIVERY_STATUS.PENDING

            }

        }),

        prisma.delivery.count({

            where: {

                status:
                    DELIVERY_STATUS.DELIVERY_ATTEMPTED

            }

        })

    ]);

    return {

        total,

        delivered,

        failed,

        pending,

        attempted,

        inTransit,

        successRate:
            total > 0
                ? Number(
                      (
                          delivered /
                          total *
                          100
                      ).toFixed(2)
                  )
                : 0,

        failureRate:
            total > 0
                ? Number(
                      (
                          failed /
                          total *
                          100
                      ).toFixed(2)
                  )
                : 0

    };

}

/*
|--------------------------------------------------------------------------
| Reportes
|--------------------------------------------------------------------------
*/

async function generateDeliveryReport(
    filters = {}
) {

    return listDeliveries(filters);

}

async function exportDeliveryReport(
    filters = {}
) {

    const report =
        await generateDeliveryReport(
            filters
        );

    return {

        generatedAt:
            new Date(),

        total:
            report.pagination.total,

        report

    };

}

/*
|--------------------------------------------------------------------------
| Herramientas
|--------------------------------------------------------------------------
*/

async function scanDeliveryQr(
    qrCode
) {

    if (!qrCode)
        throw new Error(
            "QR code is required."
        );

    const delivery =
        await prisma.delivery.findFirst({

            where: {

                trackingNumber:
                    String(qrCode).trim()

            }

        });

    if (!delivery)
        throw new Error(
            "Delivery not found."
        );

    return delivery;

}

async function generateDeliveryLabel(
    deliveryId
) {

    const id = normalizeId(
        deliveryId,
        "Delivery ID"
    );

    const delivery =
        await prisma.delivery.findUnique({

            where: {

                id

            },

            include: {

                driver: true,
                vehicle: true

            }

        });

    if (!delivery)
        throw new Error(
            "Delivery not found."
        );

    return {

        trackingNumber:
            delivery.trackingNumber,

        recipient:
            delivery.recipientName,

        phone:
            delivery.recipientPhone,

        address:
            delivery.deliveryAddress,

        route:
            delivery.routeId,

        driver:
            delivery.driver,

        vehicle:
            delivery.vehicle,

        qr:
            delivery.trackingNumber

    };

}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {

    // Dashboard
    listDeliveries,
    getDelivery,
    getDeliveryStatistics,
    getDeliveryTimeline,

    // Delivery
    createDelivery,
    updateDelivery,
    cancelDelivery,
    deleteDelivery,

    // Conductores
    assignDriver,
    changeDriver,
    removeDriver,

    // Vehículos
    assignVehicle,
    changeVehicle,
    removeVehicle,

    // Rutas
    assignRoute,
    changeRoute,
    removeRoute,

    // Tracking
    startDelivery,
    updateLocation,
    finishDelivery,
    getTrackingHistory,

    // OTP
    generateOtp,
    verifyOtp,
    resendOtp,

    // Intentos
    createDeliveryAttempt,
    listDeliveryAttempts,
    rescheduleDelivery,

    // Confirmación
    confirmDelivery,
    failDelivery,

    // Retornos
    startReturn,
    confirmWarehouseReturn,

    // Tracking público
    publicTracking,

    // Evidencias
    uploadEvidence,
    listEvidence,
    getEvidence,
    updateEvidence,
    deleteEvidence,
    setPrimaryEvidence,

    // Incidentes
    createIncident,
    listIncidents,
    resolveIncident,

    // Notas internas
    addInternalNote,
    getInternalNotes,
    updateInternalNote,
    deleteInternalNote,

    // Auditoría
    getAuditHistory,
    getDriverActivity,
    getVehicleActivity,
    getRecentActivity,

    // KPIs
    getDeliveryKpis,

    // Reportes
    generateDeliveryReport,
    exportDeliveryReport,

    // Herramientas
    scanDeliveryQr,
    generateDeliveryLabel

};