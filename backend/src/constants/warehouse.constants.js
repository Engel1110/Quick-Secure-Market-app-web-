/**
 * ==========================================================
 * QSM Warehouse Module
 * Warehouse Status & Events
 * ==========================================================
 */

const WAREHOUSE_STATUS = Object.freeze({
  // =====================================
  // Esperando al vendedor
  // =====================================
  AWAITING_WAREHOUSE: "AWAITING_WAREHOUSE",
  SELLER_DELIVERY_EXPIRED: "SELLER_DELIVERY_EXPIRED",

  // =====================================
  // Recepción
  // =====================================
  RECEIVED: "RECEIVED",

  // =====================================
  // Inspección
  // =====================================
  INSPECTION_PENDING: "INSPECTION_PENDING",
  INSPECTING: "INSPECTING",
  APPROVED: "APPROVED",
  REQUIRES_REVIEW: "REQUIRES_REVIEW",

  // Problemas encontrados
  DAMAGED: "DAMAGED",
  COUNTERFEIT: "COUNTERFEIT",
  IMEI_BLOCKED: "IMEI_BLOCKED",
  NOT_AS_DESCRIBED: "NOT_AS_DESCRIBED",
  MISSING_ACCESSORIES: "MISSING_ACCESSORIES",
  EMPTY_BOX: "EMPTY_BOX",

  REJECTED: "REJECTED",

  // =====================================
  // Inventario
  // =====================================
  STORED: "STORED",

  // =====================================
  // Preparación Delivery
  // =====================================
  PICKING: "PICKING",
  PACKING: "PACKING",
  READY_FOR_DELIVERY: "READY_FOR_DELIVERY",

  // =====================================
  // Delivery
  // =====================================
  DISPATCHED: "DISPATCHED",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERY_ATTEMPTED: "DELIVERY_ATTEMPTED",
  DELIVERED: "DELIVERED",

  // =====================================
  // Devoluciones
  // =====================================
  RETURN_PENDING: "RETURN_PENDING",
  RETURNED_TO_WAREHOUSE: "RETURNED_TO_WAREHOUSE",
  RETURNED_TO_SELLER: "RETURNED_TO_SELLER",

  // =====================================
  // Reembolsos
  // =====================================
  REFUND_PENDING: "REFUND_PENDING",
  REFUNDED: "REFUNDED"
});

const WAREHOUSE_EVENT = Object.freeze({
  // Creación
  CREATED: "CREATED",
  DEADLINE_ASSIGNED: "DEADLINE_ASSIGNED",

  // Recepción
  RECEIVED: "RECEIVED",
  TRACKING_GENERATED: "TRACKING_GENERATED",
  WAREHOUSE_ID_GENERATED: "WAREHOUSE_ID_GENERATED",

  // Evidencias
  PHOTO_CAPTURED: "PHOTO_CAPTURED",
  VIDEO_CAPTURED: "VIDEO_CAPTURED",
  EVIDENCE_ADDED: "EVIDENCE_ADDED",

  // Inspección
  INSPECTION_STARTED: "INSPECTION_STARTED",
  INSPECTION_APPROVED: "INSPECTION_APPROVED",
  INSPECTION_REJECTED: "INSPECTION_REJECTED",

  // Inventario
  LOCATION_ASSIGNED: "LOCATION_ASSIGNED",
  LOCATION_UPDATED: "LOCATION_UPDATED",

  // Delivery
  READY_FOR_DELIVERY: "READY_FOR_DELIVERY",
  DRIVER_ASSIGNED: "DRIVER_ASSIGNED",
  DISPATCHED: "DISPATCHED",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERY_COMPLETED: "DELIVERY_COMPLETED",

  // Devoluciones
  RETURN_REQUESTED: "RETURN_REQUESTED",
  RETURN_RECEIVED: "RETURN_RECEIVED",

  // Reembolso
  REFUND_REQUESTED: "REFUND_REQUESTED",
  REFUND_COMPLETED: "REFUND_COMPLETED",

  // Sistema
  DEADLINE_EXPIRED: "DEADLINE_EXPIRED",
  NOTE_ADDED: "NOTE_ADDED",
  STATUS_CHANGED: "STATUS_CHANGED"
});

module.exports = {
  WAREHOUSE_STATUS,
  WAREHOUSE_EVENT
};