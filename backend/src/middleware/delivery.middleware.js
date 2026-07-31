const prisma = require("../../config/prisma");

const {
    DELIVERY_STATUS,
    DRIVER_STATUS,
    VEHICLE_STATUS
} = require("../constants/delivery.constants");

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

async function getDelivery(req) {

    const deliveryId =
        Number(
            req.params.deliveryId ||
            req.body.deliveryId
        );

    if (!deliveryId) {
        throw new Error(
            "Delivery ID is required."
        );
    }

    const delivery =
        await prisma.delivery.findUnique({

            where: {
                id: deliveryId
            }

        });

    if (!delivery) {
        throw new Error(
            "Delivery not found."
        );
    }

    return delivery;

}

async function getDriver(driverId) {

    if (!driverId)
        return null;

    return prisma.deliveryDriver.findUnique({

        where: {
            id: Number(driverId)
        }

    });

}

async function getVehicle(vehicleId) {

    if (!vehicleId)
        return null;

    return prisma.deliveryVehicle.findUnique({

        where: {
            id: Number(vehicleId)
        }

    });

}

function forbidden(res, message) {

    return res.status(403).json({

        success: false,

        message

    });

}

/*
|--------------------------------------------------------------------------
| Delivery Exists
|--------------------------------------------------------------------------
*/

async function validateDeliveryExists(
    req,
    res,
    next
) {

    try {

        req.delivery =
            await getDelivery(req);

        next();

    } catch (error) {

        return res.status(404).json({

            success: false,

            message: error.message

        });

    }

}

/*
|--------------------------------------------------------------------------
| Driver Assigned
|--------------------------------------------------------------------------
*/

async function validateDriverAssigned(
    req,
    res,
    next
) {

    try {

        const delivery =
            req.delivery ||
            await getDelivery(req);

        if (!delivery.driverId) {

            return forbidden(

                res,

                "This delivery does not have an assigned driver."

            );

        }

        req.driver =
            await getDriver(
                delivery.driverId
            );

        next();

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

}

/*
|--------------------------------------------------------------------------
| Vehicle Assigned
|--------------------------------------------------------------------------
*/

async function validateVehicleAssigned(
    req,
    res,
    next
) {

    try {

        const delivery =
            req.delivery ||
            await getDelivery(req);

        if (!delivery.vehicleId) {

            return forbidden(

                res,

                "This delivery does not have an assigned vehicle."

            );

        }

        req.vehicle =
            await getVehicle(
                delivery.vehicleId
            );

        next();

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

}

/*
|--------------------------------------------------------------------------
| Driver Available
|--------------------------------------------------------------------------
*/

async function validateDriverAvailable(
    req,
    res,
    next
) {

    try {

        const driver =
            await getDriver(
                req.body.driverId
            );

        if (!driver) {

            return forbidden(

                res,

                "Driver not found."

            );

        }

        if (
            driver.status !==
            DRIVER_STATUS.AVAILABLE
        ) {

            return forbidden(

                res,

                "Driver is not available."

            );

        }

        req.driver = driver;

        next();

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

}

/*
|--------------------------------------------------------------------------
| Vehicle Available
|--------------------------------------------------------------------------
*/

async function validateVehicleAvailable(
    req,
    res,
    next
) {

    try {

        const vehicle =
            await getVehicle(
                req.body.vehicleId
            );

        if (!vehicle) {

            return forbidden(

                res,

                "Vehicle not found."

            );

        }

        if (
            vehicle.status !==
            VEHICLE_STATUS.AVAILABLE
        ) {

            return forbidden(

                res,

                "Vehicle is not available."

            );

        }

        req.vehicle =
            vehicle;

        next();

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

}

/*
|--------------------------------------------------------------------------
| Delivery Editable
|--------------------------------------------------------------------------
*/

async function validateEditableDelivery(
    req,
    res,
    next
) {

    try {

        const delivery =
            req.delivery ||
            await getDelivery(req);

        if (

            delivery.status ===
            DELIVERY_STATUS.DELIVERED ||

            delivery.status ===
            DELIVERY_STATUS.CANCELLED ||

            delivery.status ===
            DELIVERY_STATUS.RETURNED_TO_WAREHOUSE

        ) {

            return forbidden(

                res,

                "This delivery can no longer be modified."

            );

        }

        next();

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

}
/*
|--------------------------------------------------------------------------
| Delivery In Transit
|--------------------------------------------------------------------------
*/

async function validateDeliveryInTransit(
    req,
    res,
    next
) {

    try {

        const delivery =
            req.delivery ||
            await getDelivery(req);

        if (
            delivery.status !==
            DELIVERY_STATUS.IN_TRANSIT
        ) {

            return forbidden(

                res,

                "Delivery is not currently in transit."

            );

        }

        next();

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

}

/*
|--------------------------------------------------------------------------
| Delivery Pending
|--------------------------------------------------------------------------
*/

async function validateDeliveryPending(
    req,
    res,
    next
) {

    try {

        const delivery =
            req.delivery ||
            await getDelivery(req);

        const allowedStatuses = [

            DELIVERY_STATUS.PENDING,

            DELIVERY_STATUS.READY_FOR_ASSIGNMENT,

            DELIVERY_STATUS.DRIVER_ASSIGNED

        ];

        if (
            !allowedStatuses.includes(
                delivery.status
            )
        ) {

            return forbidden(

                res,

                "Delivery cannot perform this action."

            );

        }

        next();

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

}

/*
|--------------------------------------------------------------------------
| OTP Required
|--------------------------------------------------------------------------
*/

async function validateOtpRequired(
    req,
    res,
    next
) {

    try {

        const delivery =
            req.delivery ||
            await getDelivery(req);

        if (
            delivery.requireOtp === false
        ) {

            return next();

        }

        const otp =
            await prisma.deliveryOtp.findFirst({

                where: {

                    deliveryId: delivery.id,

                    status: "VERIFIED"

                },

                orderBy: {

                    createdAt: "desc"

                }

            });

        if (!otp) {

            return forbidden(

                res,

                "A verified OTP is required."

            );

        }

        req.otp = otp;

        next();

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

}

/*
|--------------------------------------------------------------------------
| Evidence Upload
|--------------------------------------------------------------------------
*/

async function validateEvidenceUpload(
    req,
    res,
    next
) {

    try {

        if (
            !req.files &&
            !req.file &&
            !req.body.fileUrl
        ) {

            return forbidden(

                res,

                "Evidence file is required."

            );

        }

        next();

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

}

/*
|--------------------------------------------------------------------------
| Incident Creation
|--------------------------------------------------------------------------
*/

async function validateIncidentCreation(
    req,
    res,
    next
) {

    try {

        const {

            type,

            severity,

            title

        } = req.body;

        if (!type) {

            return forbidden(

                res,

                "Incident type is required."

            );

        }

        if (!severity) {

            return forbidden(

                res,

                "Incident severity is required."

            );

        }

        if (!title) {

            return forbidden(

                res,

                "Incident title is required."

            );

        }

        next();

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

}

/*
|--------------------------------------------------------------------------
| Reschedule Validation
|--------------------------------------------------------------------------
*/

async function validateReschedule(
    req,
    res,
    next
) {

    try {

        const {

            scheduledDate

        } = req.body;

        if (!scheduledDate) {

            return forbidden(

                res,

                "Scheduled date is required."

            );

        }

        const date =
            new Date(
                scheduledDate
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return forbidden(

                res,

                "Scheduled date is invalid."

            );

        }

        if (
            date <= new Date()
        ) {

            return forbidden(

                res,

                "Scheduled date must be in the future."

            );

        }

        next();

    } catch (error) {

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {

    validateDeliveryExists,

    validateDriverAssigned,

    validateVehicleAssigned,

    validateDriverAvailable,

    validateVehicleAvailable,

    validateEditableDelivery,

    validateDeliveryInTransit,

    validateDeliveryPending,

    validateOtpRequired,

    validateEvidenceUpload,

    validateIncidentCreation,

    validateReschedule

};