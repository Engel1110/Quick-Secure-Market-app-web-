const {
    body,
    param,
    query,
    validationResult
} = require("express-validator");

const {
    DELIVERY_STATUS,
    DELIVERY_PRIORITY,
    DELIVERY_ATTEMPT_RESULT,
    DELIVERY_EVIDENCE_TYPE,
    DELIVERY_INCIDENT_TYPE,
    DELIVERY_INCIDENT_SEVERITY
} = require("../constants/delivery.constants");

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const validateRequest = (
    req,
    res,
    next
) => {
    const errors =
        validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(422).json({
            success: false,
            message:
                "Validation failed.",
            errors: errors
                .array()
                .map((error) => ({
                    field:
                        error.path,
                    message:
                        error.msg,
                    value:
                        error.value
                }))
        });
    }

    next();
};

const optionalPositiveId = (
    field,
    message
) =>
    body(field)
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .isInt({
            min: 1
        })
        .withMessage(message)
        .toInt();

const requiredPositiveId = (
    field,
    message
) =>
    body(field)
        .notEmpty()
        .withMessage(message)
        .bail()
        .isInt({
            min: 1
        })
        .withMessage(message)
        .toInt();

const deliveryIdParam = param(
    "deliveryId"
)
    .isInt({
        min: 1
    })
    .withMessage(
        "Delivery ID is invalid."
    )
    .toInt();

const driverIdParam = param(
    "driverId"
)
    .isInt({
        min: 1
    })
    .withMessage(
        "Driver ID is invalid."
    )
    .toInt();

const vehicleIdParam = param(
    "vehicleId"
)
    .isInt({
        min: 1
    })
    .withMessage(
        "Vehicle ID is invalid."
    )
    .toInt();

const evidenceIdParam = param(
    "evidenceId"
)
    .isInt({
        min: 1
    })
    .withMessage(
        "Evidence ID is invalid."
    )
    .toInt();

const incidentIdParam = param(
    "incidentId"
)
    .isInt({
        min: 1
    })
    .withMessage(
        "Incident ID is invalid."
    )
    .toInt();

const noteIdParam = param(
    "noteId"
)
    .isInt({
        min: 1
    })
    .withMessage(
        "Note ID is invalid."
    )
    .toInt();

const latitudeValidator = body(
    "latitude"
)
    .optional({
        nullable: true
    })
    .isFloat({
        min: -90,
        max: 90
    })
    .withMessage(
        "Latitude must be between -90 and 90."
    )
    .toFloat();

const longitudeValidator = body(
    "longitude"
)
    .optional({
        nullable: true
    })
    .isFloat({
        min: -180,
        max: 180
    })
    .withMessage(
        "Longitude must be between -180 and 180."
    )
    .toFloat();

/*
|--------------------------------------------------------------------------
| Dashboard y filtros
|--------------------------------------------------------------------------
*/

const listDeliveriesValidator = [
    query("page")
        .optional()
        .isInt({
            min: 1
        })
        .withMessage(
            "Page must be greater than zero."
        )
        .toInt(),

    query("limit")
        .optional()
        .isInt({
            min: 1,
            max: 100
        })
        .withMessage(
            "Limit must be between 1 and 100."
        )
        .toInt(),

    query("status")
        .optional()
        .isIn(
            Object.values(
                DELIVERY_STATUS
            )
        )
        .withMessage(
            "Delivery status is invalid."
        ),

    query("priority")
        .optional()
        .isIn(
            Object.values(
                DELIVERY_PRIORITY
            )
        )
        .withMessage(
            "Delivery priority is invalid."
        ),

    query("driverId")
        .optional()
        .isInt({
            min: 1
        })
        .withMessage(
            "Driver ID is invalid."
        )
        .toInt(),

    query("vehicleId")
        .optional()
        .isInt({
            min: 1
        })
        .withMessage(
            "Vehicle ID is invalid."
        )
        .toInt(),

    query("routeId")
        .optional()
        .isInt({
            min: 1
        })
        .withMessage(
            "Route ID is invalid."
        )
        .toInt(),

    query("warehouseItemId")
        .optional()
        .isInt({
            min: 1
        })
        .withMessage(
            "Warehouse item ID is invalid."
        )
        .toInt(),

    query("orderId")
        .optional()
        .isInt({
            min: 1
        })
        .withMessage(
            "Order ID is invalid."
        )
        .toInt(),

    query("startDate")
        .optional()
        .isISO8601()
        .withMessage(
            "Start date is invalid."
        ),

    query("endDate")
        .optional()
        .isISO8601()
        .withMessage(
            "End date is invalid."
        ),

    query("search")
        .optional()
        .trim()
        .isLength({
            min: 1,
            max: 150
        })
        .withMessage(
            "Search must contain between 1 and 150 characters."
        ),

    validateRequest
];

const getDeliveryValidator = [
    deliveryIdParam,
    validateRequest
];

const getDeliveryTimelineValidator = [
    deliveryIdParam,
    validateRequest
];

/*
|--------------------------------------------------------------------------
| Crear delivery
|--------------------------------------------------------------------------
*/

const createDeliveryValidator = [
    optionalPositiveId(
        "warehouseItemId",
        "Warehouse item ID is invalid."
    ),

    optionalPositiveId(
        "orderId",
        "Order ID is invalid."
    ),

    body()
        .custom((value) => {
            if (
                !value.warehouseItemId &&
                !value.orderId
            ) {
                throw new Error(
                    "Warehouse item ID or order ID is required."
                );
            }

            return true;
        }),

    body("deliveryCompany")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 120
        })
        .withMessage(
            "Delivery company cannot exceed 120 characters."
        ),

    body("recipientName")
        .trim()
        .notEmpty()
        .withMessage(
            "Recipient name is required."
        )
        .bail()
        .isLength({
            min: 2,
            max: 150
        })
        .withMessage(
            "Recipient name must contain between 2 and 150 characters."
        ),

    body("recipientPhone")
        .trim()
        .notEmpty()
        .withMessage(
            "Recipient phone is required."
        )
        .bail()
        .isLength({
            min: 7,
            max: 30
        })
        .withMessage(
            "Recipient phone must contain between 7 and 30 characters."
        ),

    body("recipientDocument")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 50
        })
        .withMessage(
            "Recipient document cannot exceed 50 characters."
        ),

    body("deliveryAddress")
        .trim()
        .notEmpty()
        .withMessage(
            "Delivery address is required."
        )
        .bail()
        .isLength({
            min: 5,
            max: 500
        })
        .withMessage(
            "Delivery address must contain between 5 and 500 characters."
        ),

    body("reference")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 300
        })
        .withMessage(
            "Address reference cannot exceed 300 characters."
        ),

    body("province")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 100
        })
        .withMessage(
            "Province cannot exceed 100 characters."
        ),

    body("municipality")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 100
        })
        .withMessage(
            "Municipality cannot exceed 100 characters."
        ),

    body("sector")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 100
        })
        .withMessage(
            "Sector cannot exceed 100 characters."
        ),

    latitudeValidator,
    longitudeValidator,

    body("scheduledDate")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .isISO8601()
        .withMessage(
            "Scheduled date is invalid."
        )
        .custom((value) => {
            if (
                new Date(value) <=
                new Date()
            ) {
                throw new Error(
                    "Scheduled date must be in the future."
                );
            }

            return true;
        }),

    body("priority")
        .optional()
        .isIn(
            Object.values(
                DELIVERY_PRIORITY
            )
        )
        .withMessage(
            "Delivery priority is invalid."
        ),

    body("notes")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 2000
        })
        .withMessage(
            "Notes cannot exceed 2000 characters."
        ),

    validateRequest
];

/*
|--------------------------------------------------------------------------
| Actualizar delivery
|--------------------------------------------------------------------------
*/

const updateDeliveryValidator = [
    deliveryIdParam,

    body("deliveryCompany")
        .optional({
            nullable: true
        })
        .trim()
        .isLength({
            max: 120
        })
        .withMessage(
            "Delivery company cannot exceed 120 characters."
        ),

    body("recipientName")
        .optional()
        .trim()
        .notEmpty()
        .withMessage(
            "Recipient name cannot be empty."
        )
        .bail()
        .isLength({
            min: 2,
            max: 150
        })
        .withMessage(
            "Recipient name must contain between 2 and 150 characters."
        ),

    body("recipientPhone")
        .optional()
        .trim()
        .notEmpty()
        .withMessage(
            "Recipient phone cannot be empty."
        )
        .bail()
        .isLength({
            min: 7,
            max: 30
        })
        .withMessage(
            "Recipient phone must contain between 7 and 30 characters."
        ),

    body("recipientDocument")
        .optional({
            nullable: true
        })
        .trim()
        .isLength({
            max: 50
        })
        .withMessage(
            "Recipient document cannot exceed 50 characters."
        ),

    body("deliveryAddress")
        .optional()
        .trim()
        .notEmpty()
        .withMessage(
            "Delivery address cannot be empty."
        )
        .bail()
        .isLength({
            min: 5,
            max: 500
        })
        .withMessage(
            "Delivery address must contain between 5 and 500 characters."
        ),

    body("reference")
        .optional({
            nullable: true
        })
        .trim()
        .isLength({
            max: 300
        })
        .withMessage(
            "Address reference cannot exceed 300 characters."
        ),

    body("province")
        .optional({
            nullable: true
        })
        .trim()
        .isLength({
            max: 100
        })
        .withMessage(
            "Province cannot exceed 100 characters."
        ),

    body("municipality")
        .optional({
            nullable: true
        })
        .trim()
        .isLength({
            max: 100
        })
        .withMessage(
            "Municipality cannot exceed 100 characters."
        ),

    body("sector")
        .optional({
            nullable: true
        })
        .trim()
        .isLength({
            max: 100
        })
        .withMessage(
            "Sector cannot exceed 100 characters."
        ),

    latitudeValidator,
    longitudeValidator,

    body("scheduledDate")
        .optional({
            nullable: true
        })
        .custom((value) => {
            if (
                value === null ||
                value === ""
            ) {
                return true;
            }

            const date =
                new Date(value);

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                throw new Error(
                    "Scheduled date is invalid."
                );
            }

            return true;
        }),

    body("priority")
        .optional()
        .isIn(
            Object.values(
                DELIVERY_PRIORITY
            )
        )
        .withMessage(
            "Delivery priority is invalid."
        ),

    body("notes")
        .optional({
            nullable: true
        })
        .trim()
        .isLength({
            max: 2000
        })
        .withMessage(
            "Notes cannot exceed 2000 characters."
        ),

    body()
        .custom((value) => {
            const allowedFields = [
                "deliveryCompany",
                "recipientName",
                "recipientPhone",
                "recipientDocument",
                "deliveryAddress",
                "reference",
                "province",
                "municipality",
                "sector",
                "latitude",
                "longitude",
                "scheduledDate",
                "priority",
                "notes"
            ];

            const hasUpdate =
                allowedFields.some(
                    (field) =>
                        value[field] !==
                        undefined
                );

            if (!hasUpdate) {
                throw new Error(
                    "At least one field must be provided."
                );
            }

            return true;
        }),

    validateRequest
];

/*
|--------------------------------------------------------------------------
| Cancelar y eliminar
|--------------------------------------------------------------------------
*/

const cancelDeliveryValidator = [
    deliveryIdParam,

    body("reason")
        .trim()
        .notEmpty()
        .withMessage(
            "Cancellation reason is required."
        )
        .bail()
        .isLength({
            min: 3,
            max: 500
        })
        .withMessage(
            "Cancellation reason must contain between 3 and 500 characters."
        ),

    body("notes")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 2000
        })
        .withMessage(
            "Notes cannot exceed 2000 characters."
        ),

    validateRequest
];

const deleteDeliveryValidator = [
    deliveryIdParam,
    validateRequest
];

/*
|--------------------------------------------------------------------------
| Conductores
|--------------------------------------------------------------------------
*/

const assignDriverValidator = [
    deliveryIdParam,

    requiredPositiveId(
        "driverId",
        "Driver ID is required and must be valid."
    ),

    validateRequest
];

const changeDriverValidator = [
    deliveryIdParam,

    requiredPositiveId(
        "driverId",
        "Driver ID is required and must be valid."
    ),

    validateRequest
];

const removeDriverValidator = [
    deliveryIdParam,
    validateRequest
];

const getDriverActivityValidator = [
    driverIdParam,

    query("startDate")
        .optional()
        .isISO8601()
        .withMessage(
            "Start date is invalid."
        ),

    query("endDate")
        .optional()
        .isISO8601()
        .withMessage(
            "End date is invalid."
        ),

    query("status")
        .optional()
        .isIn(
            Object.values(
                DELIVERY_STATUS
            )
        )
        .withMessage(
            "Delivery status is invalid."
        ),

    validateRequest
];

/*
|--------------------------------------------------------------------------
| Vehículos
|--------------------------------------------------------------------------
*/

const assignVehicleValidator = [
    deliveryIdParam,

    requiredPositiveId(
        "vehicleId",
        "Vehicle ID is required and must be valid."
    ),

    validateRequest
];

const changeVehicleValidator = [
    deliveryIdParam,

    requiredPositiveId(
        "vehicleId",
        "Vehicle ID is required and must be valid."
    ),

    validateRequest
];

const removeVehicleValidator = [
    deliveryIdParam,
    validateRequest
];

const getVehicleActivityValidator = [
    vehicleIdParam,

    query("startDate")
        .optional()
        .isISO8601()
        .withMessage(
            "Start date is invalid."
        ),

    query("endDate")
        .optional()
        .isISO8601()
        .withMessage(
            "End date is invalid."
        ),

    query("status")
        .optional()
        .isIn(
            Object.values(
                DELIVERY_STATUS
            )
        )
        .withMessage(
            "Delivery status is invalid."
        ),

    validateRequest
];

/*
|--------------------------------------------------------------------------
| Rutas
|--------------------------------------------------------------------------
*/

const assignRouteValidator = [
    deliveryIdParam,

    requiredPositiveId(
        "routeId",
        "Route ID is required and must be valid."
    ),

    validateRequest
];

const changeRouteValidator = [
    deliveryIdParam,

    requiredPositiveId(
        "routeId",
        "Route ID is required and must be valid."
    ),

    validateRequest
];

const removeRouteValidator = [
    deliveryIdParam,
    validateRequest
];

/*
|--------------------------------------------------------------------------
| Tracking
|--------------------------------------------------------------------------
*/

const startDeliveryValidator = [
    deliveryIdParam,
    validateRequest
];

const updateLocationValidator = [
    deliveryIdParam,

    body("latitude")
        .notEmpty()
        .withMessage(
            "Latitude is required."
        )
        .bail()
        .isFloat({
            min: -90,
            max: 90
        })
        .withMessage(
            "Latitude must be between -90 and 90."
        )
        .toFloat(),

    body("longitude")
        .notEmpty()
        .withMessage(
            "Longitude is required."
        )
        .bail()
        .isFloat({
            min: -180,
            max: 180
        })
        .withMessage(
            "Longitude must be between -180 and 180."
        )
        .toFloat(),

    body("accuracy")
        .optional({
            nullable: true
        })
        .isFloat({
            min: 0
        })
        .withMessage(
            "Accuracy cannot be negative."
        )
        .toFloat(),

    body("speed")
        .optional({
            nullable: true
        })
        .isFloat({
            min: 0
        })
        .withMessage(
            "Speed cannot be negative."
        )
        .toFloat(),

    body("heading")
        .optional({
            nullable: true
        })
        .isFloat({
            min: 0,
            max: 360
        })
        .withMessage(
            "Heading must be between 0 and 360."
        )
        .toFloat(),

    validateRequest
];

const finishDeliveryValidator = [
    deliveryIdParam,
    validateRequest
];

const getTrackingHistoryValidator = [
    deliveryIdParam,
    validateRequest
];

const publicTrackingValidator = [
    param("trackingNumber")
        .trim()
        .notEmpty()
        .withMessage(
            "Tracking number is required."
        )
        .bail()
        .isLength({
            min: 5,
            max: 100
        })
        .withMessage(
            "Tracking number is invalid."
        ),

    validateRequest
];

/*
|--------------------------------------------------------------------------
| OTP
|--------------------------------------------------------------------------
*/

const generateOtpValidator = [
    deliveryIdParam,
    validateRequest
];

const verifyOtpValidator = [
    deliveryIdParam,

    body("code")
        .trim()
        .notEmpty()
        .withMessage(
            "OTP code is required."
        )
        .bail()
        .isLength({
            min: 4,
            max: 10
        })
        .withMessage(
            "OTP code is invalid."
        )
        .matches(/^\d+$/)
        .withMessage(
            "OTP code must contain only numbers."
        ),

    validateRequest
];

const resendOtpValidator = [
    deliveryIdParam,
    validateRequest
];

/*
|--------------------------------------------------------------------------
| Intentos de entrega
|--------------------------------------------------------------------------
*/

const createDeliveryAttemptValidator = [
    deliveryIdParam,

    body("result")
        .notEmpty()
        .withMessage(
            "Attempt result is required."
        )
        .bail()
        .isIn(
            Object.values(
                DELIVERY_ATTEMPT_RESULT
            )
        )
        .withMessage(
            "Attempt result is invalid."
        ),

    body("reason")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 500
        })
        .withMessage(
            "Attempt reason cannot exceed 500 characters."
        ),

    body("notes")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 2000
        })
        .withMessage(
            "Attempt notes cannot exceed 2000 characters."
        ),

    latitudeValidator,
    longitudeValidator,

    validateRequest
];

const listDeliveryAttemptsValidator = [
    deliveryIdParam,
    validateRequest
];

const rescheduleDeliveryValidator = [
    deliveryIdParam,

    body("scheduledDate")
        .notEmpty()
        .withMessage(
            "Scheduled date is required."
        )
        .bail()
        .isISO8601()
        .withMessage(
            "Scheduled date is invalid."
        )
        .custom((value) => {
            if (
                new Date(value) <=
                new Date()
            ) {
                throw new Error(
                    "Scheduled date must be in the future."
                );
            }

            return true;
        }),

    body("reason")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 500
        })
        .withMessage(
            "Reschedule reason cannot exceed 500 characters."
        ),

    body("notes")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 2000
        })
        .withMessage(
            "Notes cannot exceed 2000 characters."
        ),

    validateRequest
];

/*
|--------------------------------------------------------------------------
| Confirmación y fallo
|--------------------------------------------------------------------------
*/

const confirmDeliveryValidator = [
    deliveryIdParam,

    body("otpCode")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            min: 4,
            max: 10
        })
        .withMessage(
            "OTP code is invalid."
        )
        .matches(/^\d+$/)
        .withMessage(
            "OTP code must contain only numbers."
        ),

    body("signature")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .isString()
        .withMessage(
            "Signature is invalid."
        ),

    body("receiverName")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 150
        })
        .withMessage(
            "Receiver name cannot exceed 150 characters."
        ),

    body("receiverDocument")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 50
        })
        .withMessage(
            "Receiver document cannot exceed 50 characters."
        ),

    body("notes")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 2000
        })
        .withMessage(
            "Delivery notes cannot exceed 2000 characters."
        ),

    validateRequest
];

const failDeliveryValidator = [
    deliveryIdParam,

    body("reason")
        .trim()
        .notEmpty()
        .withMessage(
            "Failure reason is required."
        )
        .bail()
        .isLength({
            min: 3,
            max: 500
        })
        .withMessage(
            "Failure reason must contain between 3 and 500 characters."
        ),

    body("notes")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 2000
        })
        .withMessage(
            "Notes cannot exceed 2000 characters."
        ),

    validateRequest
];

/*
|--------------------------------------------------------------------------
| Retornos
|--------------------------------------------------------------------------
*/

const startReturnValidator = [
    deliveryIdParam,

    body("reason")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 500
        })
        .withMessage(
            "Return reason cannot exceed 500 characters."
        ),

    validateRequest
];

const confirmWarehouseReturnValidator = [
    deliveryIdParam,

    optionalPositiveId(
        "warehouseLocationId",
        "Warehouse location ID is invalid."
    ),

    body("notes")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 2000
        })
        .withMessage(
            "Notes cannot exceed 2000 characters."
        ),

    validateRequest
];

/*
|--------------------------------------------------------------------------
| Evidencias
|--------------------------------------------------------------------------
*/

const uploadEvidenceValidator = [
    deliveryIdParam,

    body("type")
        .notEmpty()
        .withMessage(
            "Evidence type is required."
        )
        .bail()
        .isIn(
            Object.values(
                DELIVERY_EVIDENCE_TYPE
            )
        )
        .withMessage(
            "Evidence type is invalid."
        ),

    body("fileName")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 255
        })
        .withMessage(
            "File name cannot exceed 255 characters."
        ),

    body("fileUrl")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 2000
        })
        .withMessage(
            "File URL cannot exceed 2000 characters."
        ),

    body("mimeType")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 150
        })
        .withMessage(
            "MIME type cannot exceed 150 characters."
        ),

    body("size")
        .optional({
            nullable: true
        })
        .isInt({
            min: 0
        })
        .withMessage(
            "File size cannot be negative."
        )
        .toInt(),

    body("description")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 1000
        })
        .withMessage(
            "Evidence description cannot exceed 1000 characters."
        ),

    latitudeValidator,
    longitudeValidator,

    body("isPrimary")
        .optional()
        .isBoolean()
        .withMessage(
            "isPrimary must be true or false."
        )
        .toBoolean(),

    validateRequest
];

const listEvidenceValidator = [
    deliveryIdParam,
    validateRequest
];

const getEvidenceValidator = [
    evidenceIdParam,
    validateRequest
];

const updateEvidenceValidator = [
    evidenceIdParam,

    body("type")
        .optional()
        .isIn(
            Object.values(
                DELIVERY_EVIDENCE_TYPE
            )
        )
        .withMessage(
            "Evidence type is invalid."
        ),

    body("fileName")
        .optional({
            nullable: true
        })
        .trim()
        .isLength({
            max: 255
        })
        .withMessage(
            "File name cannot exceed 255 characters."
        ),

    body("fileUrl")
        .optional({
            nullable: true
        })
        .trim()
        .isLength({
            max: 2000
        })
        .withMessage(
            "File URL cannot exceed 2000 characters."
        ),

    body("mimeType")
        .optional({
            nullable: true
        })
        .trim()
        .isLength({
            max: 150
        })
        .withMessage(
            "MIME type cannot exceed 150 characters."
        ),

    body("size")
        .optional({
            nullable: true
        })
        .isInt({
            min: 0
        })
        .withMessage(
            "File size cannot be negative."
        )
        .toInt(),

    body("description")
        .optional({
            nullable: true
        })
        .trim()
        .isLength({
            max: 1000
        })
        .withMessage(
            "Evidence description cannot exceed 1000 characters."
        ),

    latitudeValidator,
    longitudeValidator,

    body("isPrimary")
        .optional()
        .isBoolean()
        .withMessage(
            "isPrimary must be true or false."
        )
        .toBoolean(),

    body()
        .custom((value) => {
            const allowedFields = [
                "type",
                "fileName",
                "fileUrl",
                "mimeType",
                "size",
                "description",
                "latitude",
                "longitude",
                "isPrimary"
            ];

            const hasUpdate =
                allowedFields.some(
                    (field) =>
                        value[field] !==
                        undefined
                );

            if (!hasUpdate) {
                throw new Error(
                    "At least one evidence field must be provided."
                );
            }

            return true;
        }),

    validateRequest
];

const deleteEvidenceValidator = [
    evidenceIdParam,
    validateRequest
];

const setPrimaryEvidenceValidator = [
    evidenceIdParam,
    validateRequest
];

/*
|--------------------------------------------------------------------------
| Incidentes
|--------------------------------------------------------------------------
*/

const createIncidentValidator = [
    deliveryIdParam,

    body("type")
        .notEmpty()
        .withMessage(
            "Incident type is required."
        )
        .bail()
        .isIn(
            Object.values(
                DELIVERY_INCIDENT_TYPE
            )
        )
        .withMessage(
            "Incident type is invalid."
        ),

    body("severity")
        .notEmpty()
        .withMessage(
            "Incident severity is required."
        )
        .bail()
        .isIn(
            Object.values(
                DELIVERY_INCIDENT_SEVERITY
            )
        )
        .withMessage(
            "Incident severity is invalid."
        ),

    body("title")
        .trim()
        .notEmpty()
        .withMessage(
            "Incident title is required."
        )
        .bail()
        .isLength({
            min: 3,
            max: 200
        })
        .withMessage(
            "Incident title must contain between 3 and 200 characters."
        ),

    body("description")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 3000
        })
        .withMessage(
            "Incident description cannot exceed 3000 characters."
        ),

    latitudeValidator,
    longitudeValidator,

    validateRequest
];

const listIncidentsValidator = [
    deliveryIdParam,
    validateRequest
];

const resolveIncidentValidator = [
    incidentIdParam,

    body("resolution")
        .optional({
            nullable: true,
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 3000
        })
        .withMessage(
            "Incident resolution cannot exceed 3000 characters."
        ),

    validateRequest
];

/*
|--------------------------------------------------------------------------
| Notas internas
|--------------------------------------------------------------------------
*/

const addInternalNoteValidator = [
    deliveryIdParam,

    body("note")
        .trim()
        .notEmpty()
        .withMessage(
            "Note is required."
        )
        .bail()
        .isLength({
            min: 1,
            max: 3000
        })
        .withMessage(
            "Note cannot exceed 3000 characters."
        ),

    validateRequest
];

const getInternalNotesValidator = [
    deliveryIdParam,
    validateRequest
];

const updateInternalNoteValidator = [
    noteIdParam,

    body("note")
        .trim()
        .notEmpty()
        .withMessage(
            "Note is required."
        )
        .bail()
        .isLength({
            min: 1,
            max: 3000
        })
        .withMessage(
            "Note cannot exceed 3000 characters."
        ),

    validateRequest
];

const deleteInternalNoteValidator = [
    noteIdParam,
    validateRequest
];

/*
|--------------------------------------------------------------------------
| Auditoría y actividad
|--------------------------------------------------------------------------
*/

const getAuditHistoryValidator = [
    deliveryIdParam,
    validateRequest
];

const getRecentActivityValidator = [
    query("limit")
        .optional()
        .isInt({
            min: 1,
            max: 100
        })
        .withMessage(
            "Limit must be between 1 and 100."
        )
        .toInt(),

    validateRequest
];

/*
|--------------------------------------------------------------------------
| KPIs y reportes
|--------------------------------------------------------------------------
*/

const deliveryReportFilters = [
    body("page")
        .optional()
        .isInt({
            min: 1
        })
        .withMessage(
            "Page must be greater than zero."
        )
        .toInt(),

    body("limit")
        .optional()
        .isInt({
            min: 1,
            max: 100
        })
        .withMessage(
            "Limit must be between 1 and 100."
        )
        .toInt(),

    body("status")
        .optional()
        .isIn(
            Object.values(
                DELIVERY_STATUS
            )
        )
        .withMessage(
            "Delivery status is invalid."
        ),

    body("priority")
        .optional()
        .isIn(
            Object.values(
                DELIVERY_PRIORITY
            )
        )
        .withMessage(
            "Delivery priority is invalid."
        ),

    body("driverId")
        .optional()
        .isInt({
            min: 1
        })
        .withMessage(
            "Driver ID is invalid."
        )
        .toInt(),

    body("vehicleId")
        .optional()
        .isInt({
            min: 1
        })
        .withMessage(
            "Vehicle ID is invalid."
        )
        .toInt(),

    body("routeId")
        .optional()
        .isInt({
            min: 1
        })
        .withMessage(
            "Route ID is invalid."
        )
        .toInt(),

    body("startDate")
        .optional()
        .isISO8601()
        .withMessage(
            "Start date is invalid."
        ),

    body("endDate")
        .optional()
        .isISO8601()
        .withMessage(
            "End date is invalid."
        ),

    body("search")
        .optional()
        .trim()
        .isLength({
            max: 150
        })
        .withMessage(
            "Search cannot exceed 150 characters."
        )
];

const generateDeliveryReportValidator = [
    ...deliveryReportFilters,
    validateRequest
];

const exportDeliveryReportValidator = [
    ...deliveryReportFilters,

    body("format")
        .optional()
        .isIn([
            "JSON",
            "CSV",
            "XLSX",
            "PDF"
        ])
        .withMessage(
            "Export format is invalid."
        ),

    validateRequest
];

/*
|--------------------------------------------------------------------------
| Herramientas operativas
|--------------------------------------------------------------------------
*/

const scanDeliveryQrValidator = [
    body("qrCode")
        .trim()
        .notEmpty()
        .withMessage(
            "QR code is required."
        )
        .bail()
        .isLength({
            min: 5,
            max: 200
        })
        .withMessage(
            "QR code is invalid."
        ),

    validateRequest
];

const generateDeliveryLabelValidator = [
    deliveryIdParam,

    body("format")
        .optional()
        .isIn([
            "JSON",
            "PDF",
            "PNG",
            "ZPL"
        ])
        .withMessage(
            "Label format is invalid."
        ),

    body("includeQr")
        .optional()
        .isBoolean()
        .withMessage(
            "includeQr must be true or false."
        )
        .toBoolean(),

    validateRequest
];

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
    validateRequest,

    // Dashboard
    listDeliveriesValidator,
    getDeliveryValidator,
    getDeliveryTimelineValidator,

    // Delivery
    createDeliveryValidator,
    updateDeliveryValidator,
    cancelDeliveryValidator,
    deleteDeliveryValidator,

    // Conductores
    assignDriverValidator,
    changeDriverValidator,
    removeDriverValidator,
    getDriverActivityValidator,

    // Vehículos
    assignVehicleValidator,
    changeVehicleValidator,
    removeVehicleValidator,
    getVehicleActivityValidator,

    // Rutas
    assignRouteValidator,
    changeRouteValidator,
    removeRouteValidator,

    // Tracking
    startDeliveryValidator,
    updateLocationValidator,
    finishDeliveryValidator,
    getTrackingHistoryValidator,
    publicTrackingValidator,

    // OTP
    generateOtpValidator,
    verifyOtpValidator,
    resendOtpValidator,

    // Intentos
    createDeliveryAttemptValidator,
    listDeliveryAttemptsValidator,
    rescheduleDeliveryValidator,

    // Confirmación
    confirmDeliveryValidator,
    failDeliveryValidator,

    // Retornos
    startReturnValidator,
    confirmWarehouseReturnValidator,

    // Evidencias
    uploadEvidenceValidator,
    listEvidenceValidator,
    getEvidenceValidator,
    updateEvidenceValidator,
    deleteEvidenceValidator,
    setPrimaryEvidenceValidator,

    // Incidentes
    createIncidentValidator,
    listIncidentsValidator,
    resolveIncidentValidator,

    // Notas
    addInternalNoteValidator,
    getInternalNotesValidator,
    updateInternalNoteValidator,
    deleteInternalNoteValidator,

    // Auditoría
    getAuditHistoryValidator,
    getRecentActivityValidator,

    // Reportes
    generateDeliveryReportValidator,
    exportDeliveryReportValidator,

    // Herramientas
    scanDeliveryQrValidator,
    generateDeliveryLabelValidator
};