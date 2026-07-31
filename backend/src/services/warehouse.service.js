const prisma = require("../../config/prisma");

const {
    WAREHOUSE_STATUS,
    WAREHOUSE_EVENT
} = require("../constants/warehouse.constants");

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function buildPagination(page = 1, limit = 20) {

    page = Number(page) || 1;
    limit = Number(limit) || 20;

    if (page < 1) page = 1;
    if (limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    return {
        page,
        limit,
        skip: (page - 1) * limit
    };

}

function buildWhere(filters = {}) {

    const where = {};

    if (filters.status)
        where.status = filters.status;

    if (filters.sellerId)
        where.sellerId = Number(filters.sellerId);

    if (filters.buyerId)
        where.buyerId = Number(filters.buyerId);

    if (filters.trackingNumber)
        where.trackingNumber = {
            contains: filters.trackingNumber,
            mode: "insensitive"
        };

    if (filters.search) {

        where.OR = [

            {
                warehouseCode: {
                    contains: filters.search,
                    mode: "insensitive"
                }
            },

            {
                trackingNumber: {
                    contains: filters.search,
                    mode: "insensitive"
                }
            },

            {
                product: {
                    title: {
                        contains: filters.search,
                        mode: "insensitive"
                    }
                }
            }

        ];

    }

    return where;

}

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

async function listWarehouseItems(filters = {}) {

    const {
        page,
        limit,
        skip
    } = buildPagination(filters.page, filters.limit);

    const where = buildWhere(filters);

    const [items, total] = await prisma.$transaction([

        prisma.warehouseItem.findMany({

            where,

            skip,

            take: limit,

            include: {

                product: true,

                seller: true,

                buyer: true,

                inspection: true,

                location: true

            },

            orderBy: {

                createdAt: "desc"

            }

        }),

        prisma.warehouseItem.count({

            where

        })

    ]);

    return {

        page,

        limit,

        total,

        pages: Math.ceil(total / limit),

        items

    };

}

async function getWarehouseItem(id) {

    return prisma.warehouseItem.findUnique({

        where: {

            id: Number(id)

        },

        include: {

            product: true,

            seller: true,

            buyer: true,

            inspection: true,

            evidences: true,

            incidents: true,

            notes: true,

            timeline: {

                orderBy: {

                    createdAt: "asc"

                }

            }

        }

    });

}

async function getWarehouseStatistics() {

    const [

        total,

        awaiting,

        inspecting,

        approved,

        rejected,

        stored,

        dispatched,

        delivered

    ] = await prisma.$transaction([

        prisma.warehouseItem.count(),

        prisma.warehouseItem.count({
            where: {
                status: WAREHOUSE_STATUS.AWAITING_WAREHOUSE
            }
        }),

        prisma.warehouseItem.count({
            where: {
                status: WAREHOUSE_STATUS.INSPECTING
            }
        }),

        prisma.warehouseItem.count({
            where: {
                status: WAREHOUSE_STATUS.APPROVED
            }
        }),

        prisma.warehouseItem.count({
            where: {
                status: WAREHOUSE_STATUS.REJECTED
            }
        }),

        prisma.warehouseItem.count({
            where: {
                status: WAREHOUSE_STATUS.STORED
            }
        }),

        prisma.warehouseItem.count({
            where: {
                status: WAREHOUSE_STATUS.DISPATCHED
            }
        }),

        prisma.warehouseItem.count({
            where: {
                status: WAREHOUSE_STATUS.DELIVERED
            }
        })

    ]);

    return {

        total,

        awaiting,

        inspecting,

        approved,

        rejected,

        stored,

        dispatched,

        delivered

    };

}

async function getWarehouseTimeline(id) {

    return prisma.warehouseTimeline.findMany({

        where: {

            warehouseItemId: Number(id)

        },

        include: {

            employee: true

        },

        orderBy: {

            createdAt: "asc"

        }

    });

}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {

    listWarehouseItems,

    getWarehouseItem,

    getWarehouseStatistics,

    getWarehouseTimeline

};
/*
|--------------------------------------------------------------------------
| Recepción
|--------------------------------------------------------------------------
*/

async function receiveWarehouseItem({

    warehouseItemId,

    employeeId,

    receivedBy,

    weight,

    dimensions,

    packageCondition,

    trackingNumber,

    courier,

    notes

}) {

    const item = await prisma.warehouseItem.findUnique({

        where: {

            id: Number(warehouseItemId)

        }

    });

    if (!item)
        throw new Error("Warehouse item not found.");

    if (
        item.status !== WAREHOUSE_STATUS.AWAITING_WAREHOUSE
    ) {
        throw new Error(
            "Item cannot be received in its current status."
        );
    }

    return prisma.$transaction(async (tx) => {

        const updated = await tx.warehouseItem.update({

            where: {

                id: item.id

            },

            data: {

                status: WAREHOUSE_STATUS.RECEIVED,

                receivedAt: new Date(),

                receivedBy: employeeId,

                courier,

                trackingNumber,

                packageWeight: weight,

                packageDimensions: dimensions,

                packageCondition,

                notes

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: item.id,

                employeeId,

                event: WAREHOUSE_EVENT.RECEIVED,

                description: "Package received at warehouse."

            }

        });

        return updated;

    });

}

async function cancelWarehouseReception({

    warehouseItemId,

    employeeId,

    reason

}) {

    const item = await prisma.warehouseItem.findUnique({

        where: {

            id: Number(warehouseItemId)

        }

    });

    if (!item)
        throw new Error("Warehouse item not found.");

    return prisma.$transaction(async (tx) => {

        const updated = await tx.warehouseItem.update({

            where: {

                id: item.id

            },

            data: {

                status: WAREHOUSE_STATUS.AWAITING_WAREHOUSE

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: item.id,

                employeeId,

                event: WAREHOUSE_EVENT.RECEPTION_CANCELLED,

                description: reason

            }

        });

        return updated;

    });

}

async function confirmReception({

    warehouseItemId,

    employeeId

}) {

    const item = await prisma.warehouseItem.findUnique({

        where: {

            id: Number(warehouseItemId)

        }

    });

    if (!item)
        throw new Error("Warehouse item not found.");

    if (
        item.status !== WAREHOUSE_STATUS.RECEIVED
    ) {
        throw new Error("Reception not completed.");
    }

    return prisma.$transaction(async (tx) => {

        const updated = await tx.warehouseItem.update({

            where: {

                id: item.id

            },

            data: {

                status: WAREHOUSE_STATUS.INSPECTING

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: item.id,

                employeeId,

                event: WAREHOUSE_EVENT.INSPECTION_STARTED,

                description: "Inspection started."

            }

        });

        return updated;

    });

}

async function reopenReception({

    warehouseItemId,

    employeeId,

    reason

}) {

    const item = await prisma.warehouseItem.findUnique({

        where: {

            id: Number(warehouseItemId)

        }

    });

    if (!item)
        throw new Error("Warehouse item not found.");

    return prisma.$transaction(async (tx) => {

        const updated = await tx.warehouseItem.update({

            where: {

                id: item.id

            },

            data: {

                status: WAREHOUSE_STATUS.RECEIVED

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: item.id,

                employeeId,

                event: WAREHOUSE_EVENT.RECEPTION_REOPENED,

                description: reason

            }

        });

        return updated;

    });

}

async function scanTracking({

    trackingNumber

}) {

    return prisma.warehouseItem.findFirst({

        where: {

            trackingNumber

        },

        include: {

            product: true,

            seller: true,

            buyer: true,

            inspection: true,

            location: true

        }

    });

}

async function scanWarehouseId({

    warehouseCode

}) {

    return prisma.warehouseItem.findFirst({

        where: {

            warehouseCode

        },

        include: {

            product: true,

            seller: true,

            buyer: true,

            inspection: true,

            location: true

        }

    });

}
/*
|--------------------------------------------------------------------------
| Inspección
|--------------------------------------------------------------------------
*/

async function startInspection({

    warehouseItemId,

    employeeId,

    inspectorId,

    notes

}) {

    const item = await prisma.warehouseItem.findUnique({

        where: {

            id: Number(warehouseItemId)

        }

    });

    if (!item)
        throw new Error("Warehouse item not found.");

    if (
        item.status !== WAREHOUSE_STATUS.INSPECTING
    ) {
        throw new Error("Item is not ready for inspection.");
    }

    return prisma.$transaction(async (tx) => {

        const inspection = await tx.warehouseInspection.create({

            data: {

                warehouseItemId: item.id,

                inspectorId: inspectorId || employeeId,

                startedAt: new Date(),

                notes

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: item.id,

                employeeId,

                event: WAREHOUSE_EVENT.INSPECTION_STARTED,

                description: "Inspection started."

            }

        });

        return inspection;

    });

}

async function saveInspection({

    warehouseItemId,

    employeeId,

    inspectionData

}) {

    const inspection = await prisma.warehouseInspection.findFirst({

        where: {

            warehouseItemId: Number(warehouseItemId)

        }

    });

    if (!inspection)
        throw new Error("Inspection not found.");

    return prisma.$transaction(async (tx) => {

        const updated = await tx.warehouseInspection.update({

            where: {

                id: inspection.id

            },

            data: {

                ...inspectionData,

                updatedAt: new Date()

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId,

                employeeId,

                event: WAREHOUSE_EVENT.INSPECTION_UPDATED,

                description: "Inspection updated."

            }

        });

        return updated;

    });

}

async function approveInspection({

    warehouseItemId,

    employeeId,

    notes

}) {

    const item = await prisma.warehouseItem.findUnique({

        where: {

            id: Number(warehouseItemId)

        }

    });

    if (!item)
        throw new Error("Warehouse item not found.");

    return prisma.$transaction(async (tx) => {

        await tx.warehouseInspection.updateMany({

            where: {

                warehouseItemId: item.id

            },

            data: {

                status: "APPROVED",

                approvedAt: new Date(),

                notes

            }

        });

        const updated = await tx.warehouseItem.update({

            where: {

                id: item.id

            },

            data: {

                status: WAREHOUSE_STATUS.APPROVED

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: item.id,

                employeeId,

                event: WAREHOUSE_EVENT.INSPECTION_APPROVED,

                description: "Inspection approved."

            }

        });

        return updated;

    });

}

async function rejectInspection({

    warehouseItemId,

    employeeId,

    reason,

    notes

}) {

    const item = await prisma.warehouseItem.findUnique({

        where: {

            id: Number(warehouseItemId)

        }

    });

    if (!item)
        throw new Error("Warehouse item not found.");

    return prisma.$transaction(async (tx) => {

        await tx.warehouseInspection.updateMany({

            where: {

                warehouseItemId: item.id

            },

            data: {

                status: "REJECTED",

                rejectionReason: reason,

                notes,

                rejectedAt: new Date()

            }

        });

        const updated = await tx.warehouseItem.update({

            where: {

                id: item.id

            },

            data: {

                status: WAREHOUSE_STATUS.REJECTED

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: item.id,

                employeeId,

                event: WAREHOUSE_EVENT.INSPECTION_REJECTED,

                description: reason

            }

        });

        return updated;

    });

}

async function requestManualReview({

    warehouseItemId,

    employeeId,

    reason

}) {

    const inspection = await prisma.warehouseInspection.findFirst({

        where: {

            warehouseItemId: Number(warehouseItemId)

        }

    });

    if (!inspection)
        throw new Error("Inspection not found.");

    return prisma.$transaction(async (tx) => {

        const updated = await tx.warehouseInspection.update({

            where: {

                id: inspection.id

            },

            data: {

                status: "MANUAL_REVIEW",

                reviewReason: reason

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId,

                employeeId,

                event: WAREHOUSE_EVENT.MANUAL_REVIEW_REQUESTED,

                description: reason

            }

        });

        return updated;

    });

}

async function getInspection(

    warehouseItemId

) {

    return prisma.warehouseInspection.findFirst({

        where: {

            warehouseItemId: Number(warehouseItemId)

        },

        include: {

            inspector: true,

            evidences: true,

            warehouseItem: {

                include: {

                    product: true,

                    seller: true,

                    buyer: true

                }

            }

        }

    });

}
/*
|--------------------------------------------------------------------------
| Evidencias
|--------------------------------------------------------------------------
*/

async function uploadEvidence({

    warehouseItemId,

    employeeId,

    type,

    url,

    description,

    isPrimary = false

}) {

    const item = await prisma.warehouseItem.findUnique({

        where: {

            id: Number(warehouseItemId)

        }

    });

    if (!item)
        throw new Error("Warehouse item not found.");

    return prisma.$transaction(async (tx) => {

        if (isPrimary) {

            await tx.warehouseEvidence.updateMany({

                where: {

                    warehouseItemId: item.id,

                    isPrimary: true

                },

                data: {

                    isPrimary: false

                }

            });

        }

        const evidence = await tx.warehouseEvidence.create({

            data: {

                warehouseItemId: item.id,

                uploadedBy: employeeId,

                type,

                url,

                description,

                isPrimary

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: item.id,

                employeeId,

                event: WAREHOUSE_EVENT.EVIDENCE_UPLOADED,

                description: "Evidence uploaded."

            }

        });

        return evidence;

    });

}

async function listEvidence(

    warehouseItemId

) {

    return prisma.warehouseEvidence.findMany({

        where: {

            warehouseItemId: Number(warehouseItemId)

        },

        orderBy: {

            createdAt: "desc"

        }

    });

}

async function getEvidence(

    evidenceId

) {

    return prisma.warehouseEvidence.findUnique({

        where: {

            id: Number(evidenceId)

        },

        include: {

            uploadedEmployee: true,

            warehouseItem: {

                include: {

                    product: true

                }

            }

        }

    });

}

async function updateEvidence({

    evidenceId,

    employeeId,

    description,

    isPrimary

}) {

    return prisma.$transaction(async (tx) => {

        const evidence = await tx.warehouseEvidence.findUnique({

            where: {

                id: Number(evidenceId)

            }

        });

        if (!evidence)
            throw new Error("Evidence not found.");

        if (isPrimary) {

            await tx.warehouseEvidence.updateMany({

                where: {

                    warehouseItemId: evidence.warehouseItemId,

                    isPrimary: true

                },

                data: {

                    isPrimary: false

                }

            });

        }

        const updated = await tx.warehouseEvidence.update({

            where: {

                id: evidence.id

            },

            data: {

                description,

                isPrimary

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: evidence.warehouseItemId,

                employeeId,

                event: WAREHOUSE_EVENT.EVIDENCE_UPDATED,

                description: "Evidence updated."

            }

        });

        return updated;

    });

}

async function deleteEvidence({

    evidenceId,

    employeeId

}) {

    return prisma.$transaction(async (tx) => {

        const evidence = await tx.warehouseEvidence.findUnique({

            where: {

                id: Number(evidenceId)

            }

        });

        if (!evidence)
            throw new Error("Evidence not found.");

        await tx.warehouseEvidence.delete({

            where: {

                id: evidence.id

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: evidence.warehouseItemId,

                employeeId,

                event: WAREHOUSE_EVENT.EVIDENCE_DELETED,

                description: "Evidence deleted."

            }

        });

        return {

            success: true

        };

    });

}

async function setPrimaryEvidence({

    evidenceId,

    employeeId

}) {

    return prisma.$transaction(async (tx) => {

        const evidence = await tx.warehouseEvidence.findUnique({

            where: {

                id: Number(evidenceId)

            }

        });

        if (!evidence)
            throw new Error("Evidence not found.");

        await tx.warehouseEvidence.updateMany({

            where: {

                warehouseItemId: evidence.warehouseItemId,

                isPrimary: true

            },

            data: {

                isPrimary: false

            }

        });

        const updated = await tx.warehouseEvidence.update({

            where: {

                id: evidence.id

            },

            data: {

                isPrimary: true

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: evidence.warehouseItemId,

                employeeId,

                event: WAREHOUSE_EVENT.PRIMARY_EVIDENCE_CHANGED,

                description: "Primary evidence updated."

            }

        });

        return updated;

    });

}
/*
|--------------------------------------------------------------------------
| Inventario
|--------------------------------------------------------------------------
*/

async function assignLocation({

    warehouseItemId,

    employeeId,

    warehouseCode,

    zone,

    aisle,

    rack,

    shelf,

    bin,

    notes

}) {

    const item = await prisma.warehouseItem.findUnique({

        where: {
            id: Number(warehouseItemId)
        }

    });

    if (!item)
        throw new Error("Warehouse item not found.");

    return prisma.$transaction(async (tx) => {

        const location = await tx.warehouseLocation.upsert({

            where: {

                warehouseItemId: item.id

            },

            update: {

                warehouseCode,

                zone,

                aisle,

                rack,

                shelf,

                bin,

                notes,

                assignedBy: employeeId,

                assignedAt: new Date()

            },

            create: {

                warehouseItemId: item.id,

                warehouseCode,

                zone,

                aisle,

                rack,

                shelf,

                bin,

                notes,

                assignedBy: employeeId

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: item.id,

                employeeId,

                event: WAREHOUSE_EVENT.LOCATION_ASSIGNED,

                description:
                    `${warehouseCode}/${zone}/${rack}/${shelf}`

            }

        });

        return location;

    });

}

async function updateLocation({

    warehouseItemId,

    employeeId,

    warehouseCode,

    zone,

    aisle,

    rack,

    shelf,

    bin,

    reason,

    notes

}) {

    const location =
        await prisma.warehouseLocation.findUnique({

            where: {

                warehouseItemId:
                    Number(warehouseItemId)

            }

        });

    if (!location)
        throw new Error("Location not found.");

    return prisma.$transaction(async (tx) => {

        const updated =
            await tx.warehouseLocation.update({

                where: {

                    id: location.id

                },

                data: {

                    warehouseCode,

                    zone,

                    aisle,

                    rack,

                    shelf,

                    bin,

                    notes,

                    updatedAt: new Date()

                }

            });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId,

                employeeId,

                event:
                    WAREHOUSE_EVENT.LOCATION_UPDATED,

                description: reason

            }

        });

        return updated;

    });

}

async function removeLocation({

    warehouseItemId,

    employeeId,

    reason

}) {

    const location =
        await prisma.warehouseLocation.findUnique({

            where: {

                warehouseItemId:
                    Number(warehouseItemId)

            }

        });

    if (!location)
        throw new Error("Location not found.");

    return prisma.$transaction(async (tx) => {

        await tx.warehouseLocation.delete({

            where: {

                id: location.id

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId,

                employeeId,

                event:
                    WAREHOUSE_EVENT.LOCATION_REMOVED,

                description: reason

            }

        });

        return {

            success: true

        };

    });

}

async function getCurrentLocation(

    warehouseItemId

) {

    return prisma.warehouseLocation.findUnique({

        where: {

            warehouseItemId:
                Number(warehouseItemId)

        }

    });

}

async function getLocationHistory(

    warehouseItemId

) {

    return prisma.warehouseTimeline.findMany({

        where: {

            warehouseItemId:
                Number(warehouseItemId),

            event: {

                in: [

                    WAREHOUSE_EVENT.LOCATION_ASSIGNED,

                    WAREHOUSE_EVENT.LOCATION_UPDATED,

                    WAREHOUSE_EVENT.LOCATION_REMOVED,

                    WAREHOUSE_EVENT.TRANSFERRED

                ]

            }

        },

        include: {

            employee: true

        },

        orderBy: {

            createdAt: "desc"

        }

    });

}

async function transferWarehouseItem({

    warehouseItemId,

    employeeId,

    destinationWarehouseCode,

    destinationZone,

    destinationAisle,

    destinationRack,

    destinationShelf,

    destinationBin,

    reason,

    notes

}) {

    const item =
        await prisma.warehouseItem.findUnique({

            where: {

                id: Number(warehouseItemId)

            }

        });

    if (!item)
        throw new Error("Warehouse item not found.");

    return prisma.$transaction(async (tx) => {

        await tx.warehouseLocation.update({

            where: {

                warehouseItemId: item.id

            },

            data: {

                warehouseCode:
                    destinationWarehouseCode,

                zone:
                    destinationZone,

                aisle:
                    destinationAisle,

                rack:
                    destinationRack,

                shelf:
                    destinationShelf,

                bin:
                    destinationBin,

                notes

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: item.id,

                employeeId,

                event:
                    WAREHOUSE_EVENT.TRANSFERRED,

                description: reason

            }

        });

        return item;

    });

}

async function registerPhysicalCount({

    warehouseItemId,

    employeeId,

    found,

    condition,

    notes

}) {

    const item =
        await prisma.warehouseItem.findUnique({

            where: {

                id: Number(warehouseItemId)

            }

        });

    if (!item)
        throw new Error("Warehouse item not found.");

    return prisma.$transaction(async (tx) => {

        const count =
            await tx.warehousePhysicalCount.create({

                data: {

                    warehouseItemId: item.id,

                    employeeId,

                    found,

                    condition,

                    notes

                }

            });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: item.id,

                employeeId,

                event:
                    WAREHOUSE_EVENT.PHYSICAL_COUNT,

                description:
                    found
                        ? "Item found."
                        : "Item missing."

            }

        });

        return count;

    });

}
/*
|--------------------------------------------------------------------------
| Delivery
|--------------------------------------------------------------------------
*/

async function markReadyForDelivery({
    warehouseItemId,
    employeeId,
    deliveryCompany,
    priority,
    notes
}) {
    const item = await prisma.warehouseItem.findUnique({
        where: {
            id: Number(warehouseItemId)
        }
    });

    if (!item) {
        throw new Error("Warehouse item not found.");
    }

    if (
        item.status !== WAREHOUSE_STATUS.APPROVED &&
        item.status !== WAREHOUSE_STATUS.STORED
    ) {
        throw new Error(
            "Item is not ready to be sent to delivery."
        );
    }

    return prisma.$transaction(async (tx) => {
        const delivery = await tx.warehouseDelivery.upsert({
            where: {
                warehouseItemId: item.id
            },

            update: {
                deliveryCompany,
                priority: priority || "NORMAL",
                notes,
                preparedBy: employeeId,
                preparedAt: new Date(),
                status: "READY"
            },

            create: {
                warehouseItemId: item.id,
                deliveryCompany,
                priority: priority || "NORMAL",
                notes,
                preparedBy: employeeId,
                preparedAt: new Date(),
                status: "READY"
            }
        });

        await tx.warehouseItem.update({
            where: {
                id: item.id
            },

            data: {
                status: WAREHOUSE_STATUS.READY_FOR_DELIVERY
            }
        });

        await tx.warehouseTimeline.create({
            data: {
                warehouseItemId: item.id,
                employeeId,
                event: WAREHOUSE_EVENT.READY_FOR_DELIVERY,
                description: "Item ready for delivery."
            }
        });

        return delivery;
    });
}

async function assignDriver({
    warehouseItemId,
    employeeId,
    driverId,
    vehicleId,
    estimatedDelivery
}) {
    const delivery = await prisma.warehouseDelivery.findUnique({
        where: {
            warehouseItemId: Number(warehouseItemId)
        }
    });

    if (!delivery) {
        throw new Error("Delivery record not found.");
    }

    const normalizedDriverId = Number(driverId);

    if (
        !Number.isInteger(normalizedDriverId) ||
        normalizedDriverId <= 0
    ) {
        throw new Error("Driver is invalid.");
    }

    let normalizedEstimatedDelivery = null;

    if (estimatedDelivery) {
        normalizedEstimatedDelivery = new Date(
            estimatedDelivery
        );

        if (
            Number.isNaN(
                normalizedEstimatedDelivery.getTime()
            )
        ) {
            throw new Error(
                "Estimated delivery date is invalid."
            );
        }
    }

    return prisma.$transaction(async (tx) => {
        const updated = await tx.warehouseDelivery.update({
            where: {
                id: delivery.id
            },

            data: {
                driverId: normalizedDriverId,
                vehicleId: vehicleId
                    ? Number(vehicleId)
                    : null,
                assignedBy: employeeId,
                assignedAt: new Date(),
                estimatedDelivery:
                    normalizedEstimatedDelivery,
                status: "ASSIGNED"
            }
        });

        await tx.warehouseTimeline.create({
            data: {
                warehouseItemId:
                    delivery.warehouseItemId,
                employeeId,
                event: WAREHOUSE_EVENT.DRIVER_ASSIGNED,
                description: `Driver ${normalizedDriverId} assigned.`
            }
        });

        return updated;
    });
}

async function dispatchItem({
    warehouseItemId,
    employeeId
}) {
    const item = await prisma.warehouseItem.findUnique({
        where: {
            id: Number(warehouseItemId)
        },

        include: {
            delivery: true
        }
    });

    if (!item) {
        throw new Error("Warehouse item not found.");
    }

    if (
        item.status !==
        WAREHOUSE_STATUS.READY_FOR_DELIVERY
    ) {
        throw new Error(
            "Item is not ready for dispatch."
        );
    }

    if (!item.delivery) {
        throw new Error("Delivery record not found.");
    }

    if (!item.delivery.driverId) {
        throw new Error(
            "A driver must be assigned before dispatch."
        );
    }

    return prisma.$transaction(async (tx) => {
        const delivery = await tx.warehouseDelivery.update({
            where: {
                id: item.delivery.id
            },

            data: {
                status: "DISPATCHED",
                dispatchedBy: employeeId,
                dispatchedAt: new Date()
            }
        });

        await tx.warehouseItem.update({
            where: {
                id: item.id
            },

            data: {
                status: WAREHOUSE_STATUS.DISPATCHED,
                dispatchedAt: new Date()
            }
        });

        await tx.warehouseTimeline.create({
            data: {
                warehouseItemId: item.id,
                employeeId,
                event: WAREHOUSE_EVENT.DISPATCHED,
                description: "Item dispatched."
            }
        });

        return delivery;
    });
}

async function registerDeliveryAttempt({
    warehouseItemId,
    driverId,
    reason,
    latitude,
    longitude,
    notes
}) {
    const delivery = await prisma.warehouseDelivery.findUnique({
        where: {
            warehouseItemId: Number(warehouseItemId)
        }
    });

    if (!delivery) {
        throw new Error("Delivery record not found.");
    }

    if (!reason || !String(reason).trim()) {
        throw new Error(
            "Delivery attempt reason is required."
        );
    }

    return prisma.$transaction(async (tx) => {
        const attempt = await tx.deliveryAttempt.create({
            data: {
                warehouseItemId:
                    delivery.warehouseItemId,
                warehouseDeliveryId: delivery.id,
                driverId: Number(driverId),
                reason: String(reason).trim(),
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
                notes:
                    typeof notes === "string"
                        ? notes.trim()
                        : null,
                attemptedAt: new Date()
            }
        });

        await tx.warehouseDelivery.update({
            where: {
                id: delivery.id
            },

            data: {
                status: "DELIVERY_ATTEMPTED",
                lastAttemptAt: new Date(),
                attemptCount: {
                    increment: 1
                }
            }
        });

        await tx.warehouseTimeline.create({
            data: {
                warehouseItemId:
                    delivery.warehouseItemId,
                employeeId: Number(driverId),
                event:
                    WAREHOUSE_EVENT.DELIVERY_ATTEMPTED,
                description: String(reason).trim()
            }
        });

        return attempt;
    });
}

async function confirmDelivery({
    warehouseItemId,
    driverId,
    otp,
    latitude,
    longitude,
    signatureUrl,
    receiverName,
    receiverDocument
}) {
    const item = await prisma.warehouseItem.findUnique({
        where: {
            id: Number(warehouseItemId)
        },

        include: {
            delivery: true
        }
    });

    if (!item) {
        throw new Error("Warehouse item not found.");
    }

    if (!item.delivery) {
        throw new Error("Delivery record not found.");
    }

    if (
        item.status !== WAREHOUSE_STATUS.DISPATCHED
    ) {
        throw new Error(
            "Item is not currently dispatched."
        );
    }

    if (
        item.delivery.deliveryOtp &&
        String(item.delivery.deliveryOtp) !==
            String(otp)
    ) {
        throw new Error("Delivery OTP is invalid.");
    }

    if (
        !receiverName ||
        !String(receiverName).trim()
    ) {
        throw new Error(
            "Receiver name is required."
        );
    }

    return prisma.$transaction(async (tx) => {
        const delivery = await tx.warehouseDelivery.update({
            where: {
                id: item.delivery.id
            },

            data: {
                status: "DELIVERED",
                deliveredAt: new Date(),
                deliveredBy: Number(driverId),
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
                signatureUrl:
                    typeof signatureUrl === "string"
                        ? signatureUrl.trim()
                        : null,
                receiverName:
                    String(receiverName).trim(),
                receiverDocument:
                    typeof receiverDocument === "string"
                        ? receiverDocument.trim()
                        : null
            }
        });

        await tx.warehouseItem.update({
            where: {
                id: item.id
            },

            data: {
                status: WAREHOUSE_STATUS.DELIVERED,
                deliveredAt: new Date()
            }
        });

        await tx.warehouseTimeline.create({
            data: {
                warehouseItemId: item.id,
                employeeId: Number(driverId),
                event: WAREHOUSE_EVENT.DELIVERED,
                description: `Delivered to ${String(
                    receiverName
                ).trim()}.`
            }
        });

        return delivery;
    });
}

async function cancelDispatch({
    warehouseItemId,
    employeeId,
    reason
}) {
    const item = await prisma.warehouseItem.findUnique({
        where: {
            id: Number(warehouseItemId)
        },

        include: {
            delivery: true
        }
    });

    if (!item) {
        throw new Error("Warehouse item not found.");
    }

    if (!item.delivery) {
        throw new Error("Delivery record not found.");
    }

    if (
        item.status !== WAREHOUSE_STATUS.DISPATCHED &&
        item.status !==
            WAREHOUSE_STATUS.READY_FOR_DELIVERY
    ) {
        throw new Error(
            "Dispatch cannot be cancelled in the current status."
        );
    }

    if (!reason || !String(reason).trim()) {
        throw new Error(
            "Cancellation reason is required."
        );
    }

    return prisma.$transaction(async (tx) => {
        const delivery = await tx.warehouseDelivery.update({
            where: {
                id: item.delivery.id
            },

            data: {
                status: "CANCELLED",
                cancelledAt: new Date(),
                cancelledBy: employeeId,
                cancellationReason:
                    String(reason).trim()
            }
        });

        await tx.warehouseItem.update({
            where: {
                id: item.id
            },

            data: {
                status: WAREHOUSE_STATUS.STORED
            }
        });

        await tx.warehouseTimeline.create({
            data: {
                warehouseItemId: item.id,
                employeeId,
                event:
                    WAREHOUSE_EVENT.DISPATCH_CANCELLED,
                description: String(reason).trim()
            }
        });

        return delivery;
    });
}

async function getDeliveryStatus(
    warehouseItemId
) {
    return prisma.warehouseDelivery.findUnique({
        where: {
            warehouseItemId:
                Number(warehouseItemId)
        },

        include: {
            driver: true,
            vehicle: true,
            attempts: {
                orderBy: {
                    attemptedAt: "desc"
                }
            },
            warehouseItem: {
                include: {
                    product: true,
                    buyer: true,
                    seller: true
                }
            }
        }
    });
}
/*
|--------------------------------------------------------------------------
| Incidencias
|--------------------------------------------------------------------------
*/

async function createWarehouseIncident({

    warehouseItemId,

    employeeId,

    type,

    severity,

    description,

    retainProduct,

    notifySecurity,

    evidenceIds = [],

    notes

}) {

    const item = await prisma.warehouseItem.findUnique({

        where: {

            id: Number(warehouseItemId)

        }

    });

    if (!item)
        throw new Error("Warehouse item not found.");

    return prisma.$transaction(async (tx) => {

        const incident = await tx.warehouseIncident.create({

            data: {

                warehouseItemId: item.id,

                createdBy: employeeId,

                type,

                severity,

                description,

                retainProduct,

                notifySecurity,

                notes

            }

        });

        if (evidenceIds.length) {

            await tx.warehouseEvidence.updateMany({

                where: {

                    id: {

                        in: evidenceIds.map(Number)

                    }

                },

                data: {

                    incidentId: incident.id

                }

            });

        }

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: item.id,

                employeeId,

                event: WAREHOUSE_EVENT.INCIDENT_CREATED,

                description

            }

        });

        return incident;

    });

}

async function listWarehouseIncidents(

    warehouseItemId

) {

    return prisma.warehouseIncident.findMany({

        where: {

            warehouseItemId: Number(warehouseItemId)

        },

        include: {

            createdEmployee: true,

            evidences: true

        },

        orderBy: {

            createdAt: "desc"

        }

    });

}

async function resolveWarehouseIncident({

    incidentId,

    employeeId,

    resolution,

    resolutionCode,

    notes

}) {

    const incident =
        await prisma.warehouseIncident.findUnique({

            where: {

                id: Number(incidentId)

            }

        });

    if (!incident)
        throw new Error("Incident not found.");

    return prisma.$transaction(async (tx) => {

        const updated =
            await tx.warehouseIncident.update({

                where: {

                    id: incident.id

                },

                data: {

                    resolved: true,

                    resolvedBy: employeeId,

                    resolvedAt: new Date(),

                    resolution,

                    resolutionCode,

                    notes

                }

            });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId:
                    incident.warehouseItemId,

                employeeId,

                event:
                    WAREHOUSE_EVENT.INCIDENT_RESOLVED,

                description: resolution

            }

        });

        return updated;

    });

}

/*
|--------------------------------------------------------------------------
| Devoluciones
|--------------------------------------------------------------------------
*/

async function requestReturnToSeller({

    warehouseItemId,

    employeeId,

    reason,

    pickupDeadline,

    notes

}) {

    const item =
        await prisma.warehouseItem.findUnique({

            where: {

                id: Number(warehouseItemId)

            }

        });

    if (!item)
        throw new Error("Warehouse item not found.");

    return prisma.$transaction(async (tx) => {

        const request =
            await tx.returnRequest.create({

                data: {

                    warehouseItemId: item.id,

                    createdBy: employeeId,

                    reason,

                    pickupDeadline,

                    notes,

                    status: "PENDING"

                }

            });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId: item.id,

                employeeId,

                event:
                    WAREHOUSE_EVENT.RETURN_REQUESTED,

                description: reason

            }

        });

        return request;

    });

}

async function confirmReturnToSeller({

    warehouseItemId,

    employeeId,

    receiverName,

    receiverDocument,

    signatureUrl,

    notes

}) {

    const request =
        await prisma.returnRequest.findFirst({

            where: {

                warehouseItemId:
                    Number(warehouseItemId),

                status: "PENDING"

            }

        });

    if (!request)
        throw new Error("Return request not found.");

    return prisma.$transaction(async (tx) => {

        const updated =
            await tx.returnRequest.update({

                where: {

                    id: request.id

                },

                data: {

                    status: "RETURNED",

                    returnedAt: new Date(),

                    confirmedBy: employeeId,

                    receiverName,

                    receiverDocument,

                    signatureUrl,

                    notes

                }

            });

        await tx.warehouseItem.update({

            where: {

                id: request.warehouseItemId

            },

            data: {

                status:
                    WAREHOUSE_STATUS.REFUNDED

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId:
                    request.warehouseItemId,

                employeeId,

                event:
                    WAREHOUSE_EVENT.RETURN_CONFIRMED,

                description:
                    "Returned to seller."

            }

        });

        return updated;

    });

}

/*
|--------------------------------------------------------------------------
| Reembolsos
|--------------------------------------------------------------------------
*/

async function requestRefund({

    warehouseItemId,

    employeeId,

    reason,

    amount,

    currency,

    incidentId,

    notes

}) {

    const refund =
        await prisma.refundRequest.create({

            data: {

                warehouseItemId,

                employeeId,

                incidentId,

                reason,

                amount,

                currency,

                notes,

                status: "PENDING"

            }

        });

    return refund;

}

async function approveRefund({

    warehouseItemId,

    employeeId,

    refundReference,

    amount,

    notes

}) {

    return prisma.refundRequest.updateMany({

        where: {

            warehouseItemId:
                Number(warehouseItemId),

            status: "PENDING"

        },

        data: {

            status: "APPROVED",

            approvedBy: employeeId,

            approvedAt: new Date(),

            refundReference,

            amount,

            notes

        }

    });

}

async function rejectRefund({

    warehouseItemId,

    employeeId,

    reason,

    notes

}) {

    return prisma.refundRequest.updateMany({

        where: {

            warehouseItemId:
                Number(warehouseItemId),

            status: "PENDING"

        },

        data: {

            status: "REJECTED",

            rejectedBy: employeeId,

            rejectedAt: new Date(),

            rejectionReason: reason,

            notes

        }

    });

}

async function completeRefund({

    warehouseItemId,

    employeeId,

    refundReference,

    completedAt,

    notes

}) {

    return prisma.$transaction(async (tx) => {

        const refund =
            await tx.refundRequest.updateMany({

                where: {

                    warehouseItemId:
                        Number(warehouseItemId),

                    status: "APPROVED"

                },

                data: {

                    status: "COMPLETED",

                    completedBy: employeeId,

                    completedAt,

                    refundReference,

                    notes

                }

            });

        await tx.warehouseItem.update({

            where: {

                id: Number(warehouseItemId)

            },

            data: {

                status:
                    WAREHOUSE_STATUS.REFUNDED

            }

        });

        await tx.warehouseTimeline.create({

            data: {

                warehouseItemId:
                    Number(warehouseItemId),

                employeeId,

                event:
                    WAREHOUSE_EVENT.REFUND_COMPLETED,

                description:
                    "Refund completed."

            }

        });

        return refund;

    });

}
/*
|--------------------------------------------------------------------------
| Notas internas
|--------------------------------------------------------------------------
*/

async function addInternalNote({
    warehouseItemId,
    employeeId,
    note,
    visibility = "WAREHOUSE"
}) {
    const item = await prisma.warehouseItem.findUnique({
        where: {
            id: Number(warehouseItemId)
        }
    });

    if (!item) {
        throw new Error("Warehouse item not found.");
    }

    return prisma.$transaction(async (tx) => {
        const internalNote = await tx.warehouseNote.create({
            data: {
                warehouseItemId: item.id,
                employeeId: Number(employeeId),
                note,
                visibility
            }
        });

        await tx.warehouseTimeline.create({
            data: {
                warehouseItemId: item.id,
                employeeId: Number(employeeId),
                event: WAREHOUSE_EVENT.INTERNAL_NOTE_ADDED,
                description: "Internal note added."
            }
        });

        return internalNote;
    });
}

async function getInternalNotes(warehouseItemId) {
    return prisma.warehouseNote.findMany({
        where: {
            warehouseItemId: Number(warehouseItemId)
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
    const internalNote = await prisma.warehouseNote.findUnique({
        where: {
            id: Number(noteId)
        }
    });

    if (!internalNote) {
        throw new Error("Internal note not found.");
    }

    if (!note || !String(note).trim()) {
        throw new Error("Note content is required.");
    }

    return prisma.$transaction(async (tx) => {
        const updated = await tx.warehouseNote.update({
            where: {
                id: internalNote.id
            },

            data: {
                note: String(note).trim(),
                updatedBy: Number(employeeId),
                updatedAt: new Date()
            }
        });

        await tx.warehouseTimeline.create({
            data: {
                warehouseItemId:
                    internalNote.warehouseItemId,
                employeeId: Number(employeeId),
                event: WAREHOUSE_EVENT.INTERNAL_NOTE_UPDATED,
                description: "Internal note updated."
            }
        });

        return updated;
    });
}

async function deleteInternalNote({
    noteId,
    employeeId
}) {
    const internalNote = await prisma.warehouseNote.findUnique({
        where: {
            id: Number(noteId)
        }
    });

    if (!internalNote) {
        throw new Error("Internal note not found.");
    }

    return prisma.$transaction(async (tx) => {
        await tx.warehouseNote.delete({
            where: {
                id: internalNote.id
            }
        });

        await tx.warehouseTimeline.create({
            data: {
                warehouseItemId:
                    internalNote.warehouseItemId,
                employeeId: Number(employeeId),
                event: WAREHOUSE_EVENT.INTERNAL_NOTE_DELETED,
                description: "Internal note deleted."
            }
        });

        return {
            success: true
        };
    });
}

/*
|--------------------------------------------------------------------------
| Auditoría
|--------------------------------------------------------------------------
*/

async function getAuditHistory(warehouseItemId) {
    return prisma.warehouseTimeline.findMany({
        where: {
            warehouseItemId: Number(warehouseItemId)
        },

        include: {
            employee: true,
            warehouseItem: {
                include: {
                    product: true,
                    seller: true,
                    buyer: true
                }
            }
        },

        orderBy: {
            createdAt: "desc"
        }
    });
}

async function getEmployeeActivity(employeeId) {
    return prisma.warehouseTimeline.findMany({
        where: {
            employeeId: Number(employeeId)
        },

        include: {
            warehouseItem: {
                include: {
                    product: true
                }
            }
        },

        orderBy: {
            createdAt: "desc"
        }
    });
}

async function exportAuditHistory({
    warehouseItemId,
    format = "pdf"
}) {
    const history = await getAuditHistory(
        warehouseItemId
    );

    return {
        warehouseItemId: Number(warehouseItemId),
        format: String(format).toLowerCase(),
        generatedAt: new Date(),
        total: history.length,
        records: history
    };
}

async function getRecentActivity(limit = 20) {
    const normalizedLimit = Math.min(
        Math.max(Number(limit) || 20, 1),
        100
    );

    return prisma.warehouseTimeline.findMany({
        take: normalizedLimit,

        include: {
            employee: true,
            warehouseItem: {
                include: {
                    product: true
                }
            }
        },

        orderBy: {
            createdAt: "desc"
        }
    });
}
/*
|--------------------------------------------------------------------------
| Herramientas Operativas
|--------------------------------------------------------------------------
*/

async function scanWarehouseCode({
    code,
    employeeId
}) {
    const warehouseItem =
        await prisma.warehouseItem.findFirst({

            where: {

                OR: [

                    {
                        warehouseCode: code
                    },

                    {
                        trackingNumber: code
                    },

                    {
                        qrCode: code
                    },

                    {
                        barcode: code
                    }

                ]

            },

            include: {

                product: true,

                seller: true,

                buyer: true,

                location: true,

                inspection: true

            }

        });

    if (!warehouseItem)
        throw new Error("Item not found.");

    await prisma.warehouseTimeline.create({

        data: {

            warehouseItemId: warehouseItem.id,

            employeeId,

            event: WAREHOUSE_EVENT.ITEM_SCANNED,

            description: "Warehouse code scanned."

        }

    });

    return warehouseItem;

}

async function generateWarehouseQr({

    warehouseItemId,

    employeeId

}) {

    const item =
        await prisma.warehouseItem.findUnique({

            where: {

                id: Number(warehouseItemId)

            }

        });

    if (!item)
        throw new Error("Warehouse item not found.");

    const qrCode =
        `QSM-${item.id}-${Date.now()}`;

    const updated =
        await prisma.warehouseItem.update({

            where: {

                id: item.id

            },

            data: {

                qrCode

            }

        });

    await prisma.warehouseTimeline.create({

        data: {

            warehouseItemId: item.id,

            employeeId,

            event:
                WAREHOUSE_EVENT.QR_GENERATED,

            description:
                "QR generated."

        }

    });

    return updated;

}

async function generateWarehouseLabel({

    warehouseItemId,

    employeeId,

    format,

    includeQr,

    includeLocation

}) {

    const item =
        await prisma.warehouseItem.findUnique({

            where: {

                id: Number(warehouseItemId)

            },

            include: {

                product: true,

                location: true

            }

        });

    if (!item)
        throw new Error("Warehouse item not found.");

    await prisma.warehouseTimeline.create({

        data: {

            warehouseItemId: item.id,

            employeeId,

            event:
                WAREHOUSE_EVENT.LABEL_GENERATED,

            description:
                "Warehouse label generated."

        }

    });

    return {

        format,

        includeQr,

        includeLocation,

        warehouseItem: item

    };

}

async function generateQsmCertificate({

    warehouseItemId,

    employeeId,

    certificateType,

    notes

}) {

    const item =
        await prisma.warehouseItem.findUnique({

            where: {

                id: Number(warehouseItemId)

            },

            include: {

                inspection: true,

                product: true,

                seller: true

            }

        });

    if (!item)
        throw new Error("Warehouse item not found.");

    const certificate =
        await prisma.qsmCertificate.create({

            data: {

                warehouseItemId: item.id,

                generatedBy: employeeId,

                type: certificateType,

                notes,

                certificateNumber:
                    `QSM-${Date.now()}-${item.id}`

            }

        });

    await prisma.warehouseTimeline.create({

        data: {

            warehouseItemId: item.id,

            employeeId,

            event:
                WAREHOUSE_EVENT.CERTIFICATE_GENERATED,

            description:
                "QSM certificate generated."

        }

    });

    return certificate;

}

async function getQsmCertificate(

    warehouseItemId

) {

    return prisma.qsmCertificate.findFirst({

        where: {

            warehouseItemId:
                Number(warehouseItemId)

        },

        orderBy: {

            createdAt: "desc"

        }

    });

}

async function getWarehouseKpis(filters = {}) {

    const [

        total,

        awaiting,

        inspecting,

        approved,

        rejected,

        delivered,

        refunds,

        incidents

    ] = await prisma.$transaction([

        prisma.warehouseItem.count(),

        prisma.warehouseItem.count({
            where: {
                status:
                    WAREHOUSE_STATUS.AWAITING_WAREHOUSE
            }
        }),

        prisma.warehouseItem.count({
            where: {
                status:
                    WAREHOUSE_STATUS.INSPECTING
            }
        }),

        prisma.warehouseItem.count({
            where: {
                status:
                    WAREHOUSE_STATUS.APPROVED
            }
        }),

        prisma.warehouseItem.count({
            where: {
                status:
                    WAREHOUSE_STATUS.REJECTED
            }
        }),

        prisma.warehouseItem.count({
            where: {
                status:
                    WAREHOUSE_STATUS.DELIVERED
            }
        }),

        prisma.refundRequest.count(),

        prisma.warehouseIncident.count()

    ]);

    return {

        total,

        awaiting,

        inspecting,

        approved,

        rejected,

        delivered,

        refunds,

        incidents

    };

}

async function generateWarehouseReport({

    employeeId,

    reportType,

    format,

    startDate,

    endDate,

    warehouseCode,

    status

}) {

    const where = {};

    if (warehouseCode)
        where.warehouseCode =
            warehouseCode;

    if (status)
        where.status = status;

    if (startDate || endDate) {

        where.createdAt = {};

        if (startDate)
            where.createdAt.gte =
                startDate;

        if (endDate)
            where.createdAt.lte =
                endDate;

    }

    const items =
        await prisma.warehouseItem.findMany({

            where,

            include: {

                product: true,

                seller: true,

                buyer: true,

                location: true,

                inspection: true

            }

        });

    await prisma.warehouseTimeline.create({

        data: {

            warehouseItemId: null,

            employeeId,

            event:
                WAREHOUSE_EVENT.REPORT_GENERATED,

            description:
                `${reportType} report generated.`

        }

    });

    return {

        generatedAt: new Date(),

        reportType,

        format,

        total: items.length,

        items

    };

}
const express = require("express");

const warehouseController = require(
    "../controllers/warehouse.controller"
);

const {
    authenticate
} = require("../../auth/middlewares/auth.middleware");

const {
    authorizeRoles
} = require("../../auth/middlewares/role.middleware");

const upload = require(
    "../../../middlewares/upload.middleware"
);

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Seguridad general
|--------------------------------------------------------------------------
*/

router.use(authenticate);

router.use(
    authorizeRoles(
        "SENIOR_ADMIN",
        "ADMIN",
        "WAREHOUSE_MANAGER",
        "WAREHOUSE_EMPLOYEE",
        "AUDITOR",
        "DELIVERY_MANAGER"
    )
);

/*
|--------------------------------------------------------------------------
| Dashboard
|--------------------------------------------------------------------------
*/

router.get(
    "/",
    warehouseController.listWarehouseItems
);

router.get(
    "/statistics",
    warehouseController.getWarehouseStatistics
);

router.get(
    "/recent-activity",
    warehouseController.getRecentActivity
);

router.get(
    "/kpis",
    warehouseController.getWarehouseKpis
);

router.get(
    "/employee/:employeeId/activity",
    warehouseController.getEmployeeActivity
);

/*
|--------------------------------------------------------------------------
| Escáner
|--------------------------------------------------------------------------
*/

router.post(
    "/scan",
    warehouseController.scanWarehouseCode
);

router.post(
    "/scan/tracking",
    warehouseController.scanTracking
);

router.post(
    "/scan/warehouse-id",
    warehouseController.scanWarehouseId
);

/*
|--------------------------------------------------------------------------
| Reportes
|--------------------------------------------------------------------------
*/

router.post(
    "/reports",
    authorizeRoles(
        "SENIOR_ADMIN",
        "ADMIN",
        "WAREHOUSE_MANAGER",
        "AUDITOR"
    ),
    warehouseController.generateWarehouseReport
);

/*
|--------------------------------------------------------------------------
| Recepción
|--------------------------------------------------------------------------
*/

router.post(
    "/receive",
    warehouseController.receiveWarehouseItem
);

router.patch(
    "/:warehouseItemId/reception/confirm",
    warehouseController.confirmReception
);

router.patch(
    "/:warehouseItemId/reception/cancel",
    warehouseController.cancelWarehouseReception
);

router.patch(
    "/:warehouseItemId/reception/reopen",
    authorizeRoles(
        "SENIOR_ADMIN",
        "ADMIN",
        "WAREHOUSE_MANAGER"
    ),
    warehouseController.reopenReception
);

/*
|--------------------------------------------------------------------------
| Inspección
|--------------------------------------------------------------------------
*/

router.post(
    "/:warehouseItemId/inspection/start",
    warehouseController.startInspection
);

router.put(
    "/:warehouseItemId/inspection",
    warehouseController.saveInspection
);

router.patch(
    "/:warehouseItemId/inspection/approve",
    warehouseController.approveInspection
);

router.patch(
    "/:warehouseItemId/inspection/reject",
    warehouseController.rejectInspection
);

router.patch(
    "/:warehouseItemId/inspection/manual-review",
    warehouseController.requestManualReview
);

router.get(
    "/:warehouseItemId/inspection",
    warehouseController.getInspection
);

/*
|--------------------------------------------------------------------------
| Evidencias
|--------------------------------------------------------------------------
*/

router.post(
    "/:warehouseItemId/evidence",
    upload.array("files", 10),
    warehouseController.uploadEvidence
);

router.get(
    "/:warehouseItemId/evidence",
    warehouseController.listEvidence
);

router.get(
    "/evidence/:evidenceId",
    warehouseController.getEvidence
);

router.patch(
    "/evidence/:evidenceId",
    warehouseController.updateEvidence
);

router.delete(
    "/evidence/:evidenceId",
    warehouseController.deleteEvidence
);

router.patch(
    "/evidence/:evidenceId/primary",
    warehouseController.setPrimaryEvidence
);

/*
|--------------------------------------------------------------------------
| Inventario
|--------------------------------------------------------------------------
*/

router.post(
    "/:warehouseItemId/location",
    warehouseController.assignLocation
);

router.put(
    "/:warehouseItemId/location",
    warehouseController.updateLocation
);

router.delete(
    "/:warehouseItemId/location",
    warehouseController.removeLocation
);

router.get(
    "/:warehouseItemId/location",
    warehouseController.getCurrentLocation
);

router.get(
    "/:warehouseItemId/location/history",
    warehouseController.getLocationHistory
);

router.post(
    "/:warehouseItemId/transfer",
    warehouseController.transferWarehouseItem
);

router.post(
    "/:warehouseItemId/physical-count",
    warehouseController.registerPhysicalCount
);

/*
|--------------------------------------------------------------------------
| Delivery
|--------------------------------------------------------------------------
*/

router.patch(
    "/:warehouseItemId/delivery/ready",
    warehouseController.markReadyForDelivery
);

router.patch(
    "/:warehouseItemId/delivery/driver",
    warehouseController.assignDriver
);

router.patch(
    "/:warehouseItemId/delivery/dispatch",
    warehouseController.dispatchItem
);

router.post(
    "/:warehouseItemId/delivery/attempt",
    warehouseController.registerDeliveryAttempt
);

router.patch(
    "/:warehouseItemId/delivery/confirm",
    warehouseController.confirmDelivery
);

router.patch(
    "/:warehouseItemId/delivery/cancel",
    warehouseController.cancelDispatch
);

router.get(
    "/:warehouseItemId/delivery",
    warehouseController.getDeliveryStatus
);

/*
|--------------------------------------------------------------------------
| Incidencias
|--------------------------------------------------------------------------
*/

router.post(
    "/:warehouseItemId/incidents",
    warehouseController.createWarehouseIncident
);

router.get(
    "/:warehouseItemId/incidents",
    warehouseController.listWarehouseIncidents
);

router.patch(
    "/incidents/:incidentId/resolve",
    authorizeRoles(
        "SENIOR_ADMIN",
        "ADMIN",
        "WAREHOUSE_MANAGER"
    ),
    warehouseController.resolveWarehouseIncident
);

/*
|--------------------------------------------------------------------------
| Devoluciones
|--------------------------------------------------------------------------
*/

router.post(
    "/:warehouseItemId/return",
    warehouseController.requestReturnToSeller
);

router.patch(
    "/:warehouseItemId/return/confirm",
    warehouseController.confirmReturnToSeller
);

/*
|--------------------------------------------------------------------------
| Reembolsos
|--------------------------------------------------------------------------
*/

router.post(
    "/:warehouseItemId/refund",
    warehouseController.requestRefund
);

router.patch(
    "/:warehouseItemId/refund/approve",
    authorizeRoles(
        "SENIOR_ADMIN",
        "ADMIN",
        "FINANCE_MANAGER"
    ),
    warehouseController.approveRefund
);

router.patch(
    "/:warehouseItemId/refund/reject",
    authorizeRoles(
        "SENIOR_ADMIN",
        "ADMIN",
        "FINANCE_MANAGER"
    ),
    warehouseController.rejectRefund
);

router.patch(
    "/:warehouseItemId/refund/complete",
    authorizeRoles(
        "SENIOR_ADMIN",
        "ADMIN",
        "FINANCE_MANAGER"
    ),
    warehouseController.completeRefund
);

/*
|--------------------------------------------------------------------------
| Notas internas
|--------------------------------------------------------------------------
*/

router.post(
    "/:warehouseItemId/notes",
    warehouseController.addInternalNote
);

router.get(
    "/:warehouseItemId/notes",
    warehouseController.getInternalNotes
);

router.patch(
    "/notes/:noteId",
    warehouseController.updateInternalNote
);

router.delete(
    "/notes/:noteId",
    warehouseController.deleteInternalNote
);

/*
|--------------------------------------------------------------------------
| Auditoría
|--------------------------------------------------------------------------
*/

router.get(
    "/:warehouseItemId/audit",
    warehouseController.getAuditHistory
);

router.get(
    "/:warehouseItemId/audit/export",
    warehouseController.exportAuditHistory
);

/*
|--------------------------------------------------------------------------
| QR, etiquetas y certificados
|--------------------------------------------------------------------------
*/

router.post(
    "/:warehouseItemId/qr",
    warehouseController.generateWarehouseQr
);

router.post(
    "/:warehouseItemId/label",
    warehouseController.generateWarehouseLabel
);

router.post(
    "/:warehouseItemId/certificate",
    warehouseController.generateQsmCertificate
);

router.get(
    "/:warehouseItemId/certificate",
    warehouseController.getQsmCertificate
);

/*
|--------------------------------------------------------------------------
| Timeline y detalle
|--------------------------------------------------------------------------
*/

router.get(
    "/:warehouseItemId/timeline",
    warehouseController.getWarehouseTimeline
);

router.get(
    "/:warehouseItemId",
    warehouseController.getWarehouseItem
);

module.exports = router;