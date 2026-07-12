const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Timeline de la orden
|--------------------------------------------------------------------------
| Registra cada cambio importante de la compra:
| creación, pago, almacén, delivery, PIN, entrega, reclamo, etc.
|--------------------------------------------------------------------------
*/

const timelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: true
  }
);

/*
|--------------------------------------------------------------------------
| Esquema principal de órdenes
|--------------------------------------------------------------------------
*/

const orderSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Identificación
    |--------------------------------------------------------------------------
    */

    orderCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
      index: true
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    warehouseAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    deliveryAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | Montos
    |--------------------------------------------------------------------------
    */

    price: {
      type: Number,
      required: true,
      min: 0
    },

    protectionFee: {
      type: Number,
      default: 0,
      min: 0
    },

    shippingFee: {
      type: Number,
      default: 0,
      min: 0
    },

    totalAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    /*
    |--------------------------------------------------------------------------
    | Reserva o depósito
    |--------------------------------------------------------------------------
    | Preparado para la futura reserva del 3%.
    |--------------------------------------------------------------------------
    */

    depositPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    depositAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    remainingAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    depositStatus: {
      type: String,
      enum: [
        "NOT_REQUIRED",
        "PENDING",
        "HELD",
        "APPLIED_TO_TOTAL",
        "PARTIALLY_REFUNDED",
        "REFUNDED",
        "FORFEITED"
      ],
      default: "NOT_REQUIRED",
      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | Estado general de la operación
    |--------------------------------------------------------------------------
    */

    status: {
      type: String,
      enum: [
        "PENDING",
        "WAITING_PAYMENT",
        "PAYMENT_UNDER_REVIEW",
        "PAYMENT_CONFIRMED",
        "WAITING_SELLER",
        "WAITING_WAREHOUSE",
        "IN_WAREHOUSE",
        "UNDER_INSPECTION",
        "READY_FOR_PICKUP",
        "OUT_FOR_DELIVERY",
        "WAITING_PIN",
        "DELIVERED",
        "COMPLETED",
        "DISPUTED",
        "CANCELLED",
        "REJECTED",
        "REFUNDED"
      ],
      default: "PENDING",
      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | Pago
    |--------------------------------------------------------------------------
    */

    paymentMethod: {
      type: String,
      enum: [
        "BANK_TRANSFER",
        "CASH_ON_DELIVERY",
        "CARD"
      ],
      required: true,
      index: true
    },

    paymentStatus: {
      type: String,
      enum: [
        "PENDING",
        "PENDING_PROOF",
        "PROOF_UPLOADED",
        "UNDER_REVIEW",
        "PENDING_DELIVERY",
        "DEMO_AUTHORIZED",
        "CONFIRMED",
        "REJECTED",
        "REFUNDED"
      ],
      default: "PENDING",
      index: true
    },

    escrowStatus: {
      type: String,
      enum: [
        "NOT_FUNDED",
        "PENDING",
        "HELD",
        "UNDER_REVIEW",
        "READY_TO_RELEASE",
        "RELEASED",
        "REFUNDED"
      ],
      default: "NOT_FUNDED",
      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | Método de entrega
    |--------------------------------------------------------------------------
    */

    deliveryMethod: {
      type: String,
      enum: [
        "QSM_WAREHOUSE",
        "QSM_VERIFIED_DELIVERY",
        "DIRECT_DELIVERY"
      ],
      required: true,
      index: true
    },

    deliveryStatus: {
      type: String,
      enum: [
        "PENDING",
        "SELLER_NOTIFIED",
        "WAITING_FOR_SELLER",
        "PICKUP_REQUESTED",
        "PICKUP_SCHEDULED",
        "AGENT_ASSIGNED",
        "AGENT_ON_THE_WAY",
        "PRODUCT_COLLECTED",
        "IN_TRANSIT_TO_WAREHOUSE",
        "RECEIVED_AT_WAREHOUSE",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "READY_FOR_PICKUP",
        "OUT_FOR_DELIVERY",
        "WAITING_PIN",
        "DELIVERED"
      ],
      default: "PENDING",
      index: true
    },

    warehouseStatus: {
      type: String,
      enum: [
        "NOT_REQUIRED",
        "WAITING_FOR_SELLER",
        "IN_TRANSIT_TO_WAREHOUSE",
        "RECEIVED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "READY_FOR_PICKUP",
        "WAITING_PIN",
        "DELIVERED"
      ],
      default: "NOT_REQUIRED",
      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | Transferencia bancaria
    |--------------------------------------------------------------------------
    */

    bankName: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120
    },

    bankAccountLast4: {
      type: String,
      trim: true,
      default: "",
      maxlength: 4
    },

    transferReference: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120
    },

    transferProofUrl: {
      type: String,
      trim: true,
      default: ""
    },

    transferProofUploadedAt: {
      type: Date,
      default: null
    },

    /*
    |--------------------------------------------------------------------------
    | Tarjeta demostrativa
    |--------------------------------------------------------------------------
    */

    cardBrand: {
      type: String,
      trim: true,
      default: "",
      maxlength: 40
    },

    cardLast4: {
      type: String,
      trim: true,
      default: "",
      maxlength: 4
    },

    paymentTransactionId: {
      type: String,
      trim: true,
      default: "",
      maxlength: 160
    },

    /*
    |--------------------------------------------------------------------------
    | Confirmaciones de pago y entrega
    |--------------------------------------------------------------------------
    */

    paymentConfirmedAt: {
      type: Date,
      default: null
    },

    paymentConfirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    sellerConfirmedPayment: {
      type: Boolean,
      default: false
    },

    sellerConfirmedPaymentAt: {
      type: Date,
      default: null
    },

    buyerConfirmedReceipt: {
      type: Boolean,
      default: false
    },

    buyerConfirmedReceiptAt: {
      type: Date,
      default: null
    },

    warehouseConfirmedDelivery: {
      type: Boolean,
      default: false
    },

    warehouseConfirmedDeliveryAt: {
      type: Date,
      default: null
    },

    deliveryConfirmedByAgent: {
      type: Boolean,
      default: false
    },

    deliveryConfirmedByAgentAt: {
      type: Date,
      default: null
    },

    /*
    |--------------------------------------------------------------------------
    | PIN de entrega
    |--------------------------------------------------------------------------
    */

    deliveryPin: {
      type: String,
      required: true,
      match: [/^\d{6}$/, "El PIN debe contener exactamente 6 números"],
      select: true
    },

    deliveryPinVerified: {
      type: Boolean,
      default: false
    },

    deliveryPinVerifiedAt: {
      type: Date,
      default: null
    },

    deliveryPinVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    /*
    |--------------------------------------------------------------------------
    | Seguimiento logístico
    |--------------------------------------------------------------------------
    */

    trackingNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120
    },

    trackingCompany: {
      type: String,
      trim: true,
      default: "",
      maxlength: 120
    },

    pickupAddress: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500
    },

    deliveryAddress: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500
    },

    pickupScheduledAt: {
      type: Date,
      default: null
    },

    productCollectedAt: {
      type: Date,
      default: null
    },

    warehouseReceivedAt: {
      type: Date,
      default: null
    },

    warehouseApprovedAt: {
      type: Date,
      default: null
    },

    readyForPickupAt: {
      type: Date,
      default: null
    },

    outForDeliveryAt: {
      type: Date,
      default: null
    },

    deliveredAt: {
      type: Date,
      default: null
    },

    completedAt: {
      type: Date,
      default: null
    },

    releasedAt: {
      type: Date,
      default: null
    },

    refundedAt: {
      type: Date,
      default: null
    },

    /*
    |--------------------------------------------------------------------------
    | Notas
    |--------------------------------------------------------------------------
    */

    warehouseNotes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1500
    },

    deliveryNotes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1500
    },

    inspectionNotes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000
    },

    buyerNotes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000
    },

    sellerNotes: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000
    },

    /*
    |--------------------------------------------------------------------------
    | Cancelación
    |--------------------------------------------------------------------------
    */

    cancellationReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000
    },

    cancellationRequestedBy: {
      type: String,
      enum: [
        "NONE",
        "BUYER",
        "SELLER",
        "WAREHOUSE",
        "DELIVERY",
        "ADMIN"
      ],
      default: "NONE",
      index: true
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    cancelledAt: {
      type: Date,
      default: null
    },

    refundAmount: {
      type: Number,
      default: 0,
      min: 0
    },

    /*
    |--------------------------------------------------------------------------
    | Reclamos
    |--------------------------------------------------------------------------
    */

    disputeReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1500
    },

    disputeOpenedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    disputeOpenedAt: {
      type: Date,
      default: null
    },

    /*
    |--------------------------------------------------------------------------
    | Línea de tiempo
    |--------------------------------------------------------------------------
    */

    timeline: {
      type: [timelineSchema],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

/*
|--------------------------------------------------------------------------
| Validaciones y cálculos automáticos
|--------------------------------------------------------------------------
*/

orderSchema.pre("validate", function (next) {
  try {
    const price = Number(this.price || 0);
    const protectionFee = Number(this.protectionFee || 0);
    const shippingFee = Number(this.shippingFee || 0);

    const depositPercentage = Number(
      this.depositPercentage || 0
    );

    this.totalAmount =
      price +
      protectionFee +
      shippingFee;

    if (depositPercentage > 0) {
      this.depositAmount =
        price *
        (depositPercentage / 100);

      this.remainingAmount =
        Math.max(
          price -
            this.depositAmount,
          0
        );

      if (
        this.depositStatus ===
        "NOT_REQUIRED"
      ) {
        this.depositStatus =
          "PENDING";
      }
    } else {
      this.depositAmount = 0;
      this.remainingAmount = price;

      if (!this.depositStatus) {
        this.depositStatus =
          "NOT_REQUIRED";
      }
    }

    if (
      this.paymentMethod ===
        "CARD" &&
      (
        !this.paymentStatus ||
        this.paymentStatus ===
          "PENDING"
      )
    ) {
      this.paymentStatus =
        "DEMO_AUTHORIZED";
    }

    if (
      this.paymentMethod ===
        "CARD" &&
      this.escrowStatus ===
        "NOT_FUNDED"
    ) {
      this.escrowStatus =
        "HELD";
    }

    if (
      this.deliveryMethod ===
        "QSM_WAREHOUSE"
    ) {
      if (
        this.warehouseStatus ===
        "NOT_REQUIRED"
      ) {
        this.warehouseStatus =
          "WAITING_FOR_SELLER";
      }

      if (
        this.deliveryStatus ===
        "PENDING"
      ) {
        this.deliveryStatus =
          "WAITING_FOR_SELLER";
      }
    }

    if (
      this.deliveryMethod ===
        "QSM_VERIFIED_DELIVERY" &&
      this.deliveryStatus ===
        "PENDING"
    ) {
      this.deliveryStatus =
        "PICKUP_REQUESTED";
    }

    if (
      this.deliveryMethod ===
        "DIRECT_DELIVERY" &&
      this.deliveryStatus ===
        "PENDING"
    ) {
      this.deliveryStatus =
        "WAITING_FOR_SELLER";
    }

    next();
  } catch (error) {
    next(error);
  }
});

/*
|--------------------------------------------------------------------------
| Índices
|--------------------------------------------------------------------------
*/

orderSchema.index({
  buyer: 1,
  createdAt: -1
});

orderSchema.index({
  seller: 1,
  createdAt: -1
});

orderSchema.index({
  product: 1,
  status: 1
});

orderSchema.index({
  warehouseStatus: 1,
  createdAt: -1
});

orderSchema.index({
  deliveryStatus: 1,
  createdAt: -1
});

orderSchema.index({
  paymentStatus: 1,
  createdAt: -1
});

orderSchema.index({
  cancellationRequestedBy: 1,
  createdAt: -1
});

orderSchema.index({
  disputeOpenedAt: 1,
  status: 1
});

/*
|--------------------------------------------------------------------------
| Exportación
|--------------------------------------------------------------------------
*/

module.exports = mongoose.model(
  "Order",
  orderSchema
);