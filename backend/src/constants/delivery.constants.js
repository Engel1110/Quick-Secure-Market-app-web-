/*
|--------------------------------------------------------------------------
| Delivery Status
|--------------------------------------------------------------------------
*/

const DELIVERY_STATUS = Object.freeze({
    PENDING: "PENDING",
    READY_FOR_ASSIGNMENT: "READY_FOR_ASSIGNMENT",
    DRIVER_ASSIGNED: "DRIVER_ASSIGNED",
    ROUTE_ASSIGNED: "ROUTE_ASSIGNED",
    PICKED_UP: "PICKED_UP",
    IN_TRANSIT: "IN_TRANSIT",
    DELIVERY_ATTEMPTED: "DELIVERY_ATTEMPTED",
    RESCHEDULED: "RESCHEDULED",
    DELIVERED: "DELIVERED",
    FAILED: "FAILED",
    CANCELLED: "CANCELLED",
    RETURNING_TO_WAREHOUSE: "RETURNING_TO_WAREHOUSE",
    RETURNED_TO_WAREHOUSE: "RETURNED_TO_WAREHOUSE"
});

/*
|--------------------------------------------------------------------------
| Delivery Events
|--------------------------------------------------------------------------
*/

const DELIVERY_EVENT = Object.freeze({
    DELIVERY_CREATED: "DELIVERY_CREATED",
    DELIVERY_UPDATED: "DELIVERY_UPDATED",

    DRIVER_ASSIGNED: "DRIVER_ASSIGNED",
    DRIVER_CHANGED: "DRIVER_CHANGED",
    DRIVER_REMOVED: "DRIVER_REMOVED",

    VEHICLE_ASSIGNED: "VEHICLE_ASSIGNED",
    VEHICLE_CHANGED: "VEHICLE_CHANGED",
    VEHICLE_REMOVED: "VEHICLE_REMOVED",

    ROUTE_ASSIGNED: "ROUTE_ASSIGNED",
    ROUTE_CHANGED: "ROUTE_CHANGED",
    ROUTE_REMOVED: "ROUTE_REMOVED",

    PACKAGE_PICKED_UP: "PACKAGE_PICKED_UP",
    DELIVERY_DISPATCHED: "DELIVERY_DISPATCHED",
    DELIVERY_IN_TRANSIT: "DELIVERY_IN_TRANSIT",

    LOCATION_UPDATED: "LOCATION_UPDATED",

    DELIVERY_ATTEMPTED: "DELIVERY_ATTEMPTED",
    DELIVERY_RESCHEDULED: "DELIVERY_RESCHEDULED",

    OTP_GENERATED: "OTP_GENERATED",
    OTP_SENT: "OTP_SENT",
    OTP_VERIFIED: "OTP_VERIFIED",
    OTP_FAILED: "OTP_FAILED",

    DELIVERY_CONFIRMED: "DELIVERY_CONFIRMED",
    DELIVERY_FAILED: "DELIVERY_FAILED",
    DELIVERY_CANCELLED: "DELIVERY_CANCELLED",

    RETURN_STARTED: "RETURN_STARTED",
    RETURNED_TO_WAREHOUSE: "RETURNED_TO_WAREHOUSE",

    EVIDENCE_UPLOADED: "EVIDENCE_UPLOADED",
    EVIDENCE_DELETED: "EVIDENCE_DELETED",

    INCIDENT_CREATED: "INCIDENT_CREATED",
    INCIDENT_RESOLVED: "INCIDENT_RESOLVED",

    INTERNAL_NOTE_ADDED: "INTERNAL_NOTE_ADDED",
    INTERNAL_NOTE_UPDATED: "INTERNAL_NOTE_UPDATED",
    INTERNAL_NOTE_DELETED: "INTERNAL_NOTE_DELETED"
});

/*
|--------------------------------------------------------------------------
| Delivery Attempt Result
|--------------------------------------------------------------------------
*/

const DELIVERY_ATTEMPT_RESULT = Object.freeze({
    CUSTOMER_NOT_AVAILABLE: "CUSTOMER_NOT_AVAILABLE",
    INVALID_ADDRESS: "INVALID_ADDRESS",
    CUSTOMER_REJECTED: "CUSTOMER_REJECTED",
    NO_ANSWER: "NO_ANSWER",
    SECURITY_RESTRICTION: "SECURITY_RESTRICTION",
    VEHICLE_ISSUE: "VEHICLE_ISSUE",
    WEATHER_ISSUE: "WEATHER_ISSUE",
    PACKAGE_DAMAGED: "PACKAGE_DAMAGED",
    OTHER: "OTHER"
});

/*
|--------------------------------------------------------------------------
| Delivery Priority
|--------------------------------------------------------------------------
*/

const DELIVERY_PRIORITY = Object.freeze({
    LOW: "LOW",
    NORMAL: "NORMAL",
    HIGH: "HIGH",
    URGENT: "URGENT"
});

/*
|--------------------------------------------------------------------------
| Driver Status
|--------------------------------------------------------------------------
*/

const DRIVER_STATUS = Object.freeze({
    OFFLINE: "OFFLINE",
    AVAILABLE: "AVAILABLE",
    ASSIGNED: "ASSIGNED",
    DELIVERING: "DELIVERING",
    ON_BREAK: "ON_BREAK",
    SUSPENDED: "SUSPENDED"
});

/*
|--------------------------------------------------------------------------
| Vehicle Status
|--------------------------------------------------------------------------
*/

const VEHICLE_STATUS = Object.freeze({
    AVAILABLE: "AVAILABLE",
    ASSIGNED: "ASSIGNED",
    IN_TRANSIT: "IN_TRANSIT",
    MAINTENANCE: "MAINTENANCE",
    OUT_OF_SERVICE: "OUT_OF_SERVICE"
});

/*
|--------------------------------------------------------------------------
| Vehicle Type
|--------------------------------------------------------------------------
*/

const VEHICLE_TYPE = Object.freeze({
    MOTORCYCLE: "MOTORCYCLE",
    CAR: "CAR",
    VAN: "VAN",
    TRUCK: "TRUCK",
    BICYCLE: "BICYCLE",
    OTHER: "OTHER"
});

/*
|--------------------------------------------------------------------------
| Delivery Evidence Type
|--------------------------------------------------------------------------
*/

const DELIVERY_EVIDENCE_TYPE = Object.freeze({
    PACKAGE: "PACKAGE",
    CUSTOMER: "CUSTOMER",
    SIGNATURE: "SIGNATURE",
    DOCUMENT: "DOCUMENT",
    LOCATION: "LOCATION",
    DAMAGE: "DAMAGE",
    INCIDENT: "INCIDENT",
    OTHER: "OTHER"
});

/*
|--------------------------------------------------------------------------
| Delivery Incident Type
|--------------------------------------------------------------------------
*/

const DELIVERY_INCIDENT_TYPE = Object.freeze({
    PACKAGE_DAMAGED: "PACKAGE_DAMAGED",
    PACKAGE_LOST: "PACKAGE_LOST",
    PACKAGE_OPENED: "PACKAGE_OPENED",
    WRONG_ADDRESS: "WRONG_ADDRESS",
    CUSTOMER_CONFLICT: "CUSTOMER_CONFLICT",
    VEHICLE_ACCIDENT: "VEHICLE_ACCIDENT",
    DRIVER_ISSUE: "DRIVER_ISSUE",
    SECURITY_ISSUE: "SECURITY_ISSUE",
    OTHER: "OTHER"
});

/*
|--------------------------------------------------------------------------
| Delivery Incident Severity
|--------------------------------------------------------------------------
*/

const DELIVERY_INCIDENT_SEVERITY = Object.freeze({
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL"
});

/*
|--------------------------------------------------------------------------
| OTP
|--------------------------------------------------------------------------
*/

const DELIVERY_OTP_STATUS = Object.freeze({
    PENDING: "PENDING",
    VERIFIED: "VERIFIED",
    EXPIRED: "EXPIRED",
    BLOCKED: "BLOCKED"
});

const DELIVERY_OTP_CONFIG = Object.freeze({
    LENGTH: 6,
    EXPIRATION_MINUTES: 10,
    MAX_ATTEMPTS: 5
});

/*
|--------------------------------------------------------------------------
| Route Status
|--------------------------------------------------------------------------
*/

const DELIVERY_ROUTE_STATUS = Object.freeze({
    PLANNED: "PLANNED",
    ACTIVE: "ACTIVE",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED"
});

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
    DELIVERY_STATUS,
    DELIVERY_EVENT,
    DELIVERY_ATTEMPT_RESULT,
    DELIVERY_PRIORITY,
    DRIVER_STATUS,
    VEHICLE_STATUS,
    VEHICLE_TYPE,
    DELIVERY_EVIDENCE_TYPE,
    DELIVERY_INCIDENT_TYPE,
    DELIVERY_INCIDENT_SEVERITY,
    DELIVERY_OTP_STATUS,
    DELIVERY_OTP_CONFIG,
    DELIVERY_ROUTE_STATUS
};