const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Constantes
|--------------------------------------------------------------------------
*/

const DISPUTE_STATUSES = [
  "OPEN",
  "WAITING_SELLER",
  "WAITING_BUYER",
  "WAITING_EVIDENCE",
  "WAITING_WAREHOUSE",
  "WAITING_QSM",
  "UNDER_REVIEW",
  "IN_REVIEW",
  "ESCALATED",
  "READY_TO_RESOLVE",
  "RESOLVED",
  "REFUNDED",
  "REJECTED",
  "CLOSED"
];

const DISPUTE_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT"
];

const DISPUTE_ROLES = [
  "BUYER",
  "SELLER",
  "ADMIN",
  "SENIOR_ADMIN",
  "AUDITOR",
  "WAREHOUSE",
  "SYSTEM",
  "QSM_AI"
];

const EVIDENCE_TYPES = [
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "PDF",
  "DOCUMENT",
  "RECEIPT",
  "SCREENSHOT",
  "TEXT",
  "OTHER"
];

const MESSAGE_TYPES = [
  "TEXT",
  "IMAGE",
  "VIDEO",
  "AUDIO",
  "PDF",
  "FILE",
  "SYSTEM"
];

const TIMELINE_EVENT_TYPES = [
  "DISPUTE_CREATED",
  "STATUS_CHANGED",
  "MESSAGE_SENT",
  "EVIDENCE_ADDED",
  "EVIDENCE_REMOVED",
  "ADMIN_ASSIGNED",
  "PRIORITY_CHANGED",
  "PAYMENT_HELD",
  "PAYMENT_RELEASED",
  "PAYMENT_REFUNDED",
  "BUYER_NOTIFIED",
  "SELLER_NOTIFIED",
  "WAREHOUSE_REVIEW",
  "CASE_ESCALATED",
  "ADMIN_NOTE_ADDED",
  "RESOLUTION_CREATED",
  "DISPUTE_RESOLVED",
  "DISPUTE_CLOSED",
  "AI_ANALYSIS_CREATED",
  "OTHER"
];

/*
|--------------------------------------------------------------------------
| Archivo adjunto
|--------------------------------------------------------------------------
*/

const attachmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 255,
      default: ""
    },

    originalName: {
      type: String,
      trim: true,
      maxlength: 255,
      default: ""
    },

    url: {
      type: String,
      trim: true,
      maxlength: 2000,
      required: true
    },

    path: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ""
    },

    mimeType: {
      type: String,
      trim: true,
      maxlength: 150,
      default: ""
    },

    size: {
      type: Number,
      min: 0,
      default: 0
    },

    type: {
      type: String,
      enum: EVIDENCE_TYPES,
      default: "OTHER"
    },

    thumbnailUrl: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ""
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    uploaderRole: {
      type: String,
      enum: DISPUTE_ROLES,
      default: "BUYER"
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    isVisible: {
      type: Boolean,
      default: true
    },

    metadata: {
      width: {
        type: Number,
        min: 0,
        default: 0
      },

      height: {
        type: Number,
        min: 0,
        default: 0
      },

      duration: {
        type: Number,
        min: 0,
        default: 0
      },

      checksum: {
        type: String,
        trim: true,
        maxlength: 255,
        default: ""
      }
    }
  },
  {
    _id: true,
    timestamps: true
  }
);

/*
|--------------------------------------------------------------------------
| Mensajes
|--------------------------------------------------------------------------
*/

const disputeMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    senderRole: {
      type: String,
      enum: DISPUTE_ROLES,
      default: "BUYER"
    },

    message: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ""
    },

    type: {
      type: String,
      enum: MESSAGE_TYPES,
      default: "TEXT"
    },

    attachments: {
      type: [attachmentSchema],
      default: []
    },

    isInternal: {
      type: Boolean,
      default: false
    },

    isSystemMessage: {
      type: Boolean,
      default: false
    },

    isEdited: {
      type: Boolean,
      default: false
    },

    editedAt: {
      type: Date,
      default: null
    },

    deletedAt: {
      type: Date,
      default: null
    },

    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },

        readAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    _id: true,
    timestamps: true
  }
);

/*
|--------------------------------------------------------------------------
| Timeline e historial
|--------------------------------------------------------------------------
*/

const timelineEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: TIMELINE_EVENT_TYPES,
      default: "OTHER"
    },

    title: {
      type: String,
      trim: true,
      maxlength: 200,
      required: true
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ""
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    performedByRole: {
      type: String,
      enum: DISPUTE_ROLES,
      default: "SYSTEM"
    },

    previousStatus: {
      type: String,
      enum: [...DISPUTE_STATUSES, ""],
      default: ""
    },

    newStatus: {
      type: String,
      enum: [...DISPUTE_STATUSES, ""],
      default: ""
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    isInternal: {
      type: Boolean,
      default: false
    },

    occurredAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    _id: true,
    timestamps: false
  }
);

/*
|--------------------------------------------------------------------------
| Registro de auditoría
|--------------------------------------------------------------------------
*/

const auditEntrySchema = new mongoose.Schema(
  {
    action: {
      type: String,
      trim: true,
      maxlength: 120,
      required: true
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    actorRole: {
      type: String,
      enum: DISPUTE_ROLES,
      default: "SYSTEM"
    },

    ipAddress: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ""
    },

    userAgent: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },

    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },

    after: {
      type: mongoose.Schema.Types.Mixed,
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
    _id: true,
    timestamps: false
  }
);

/*
|--------------------------------------------------------------------------
| Resolución
|--------------------------------------------------------------------------
*/

const resolutionSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        "REFUND_BUYER",
        "RELEASE_TO_SELLER",
        "REJECT_DISPUTE",
        "PARTIAL_REFUND",
        "REPLACEMENT",
        "RETURN_PRODUCT",
        ""
      ],
      default: ""
    },

    decision: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: ""
    },

    amount: {
      type: Number,
      min: 0,
      default: 0
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
      default: "DOP"
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    _id: false
  }
);

/*
|--------------------------------------------------------------------------
| Análisis de IA
|--------------------------------------------------------------------------
*/

const aiAnalysisSchema = new mongoose.Schema(
  {
    summary: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ""
    },

    recommendation: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: ""
    },

    buyerRiskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    sellerRiskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    fraudRiskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    suggestedAction: {
      type: String,
      enum: [
        "REFUND_BUYER",
        "RELEASE_TO_SELLER",
        "REJECT_DISPUTE",
        "REQUEST_MORE_EVIDENCE",
        "ESCALATE",
        ""
      ],
      default: ""
    },

    analyzedAt: {
      type: Date,
      default: null
    },

    model: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    }
  },
  {
    _id: false
  }
);

/*
|--------------------------------------------------------------------------
| Modelo principal
|--------------------------------------------------------------------------
*/

const disputeSchema = new mongoose.Schema(
  {
    disputeCode: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
      default: ""
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
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

    assignedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    assignedWarehouseUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    reason: {
      type: String,
      trim: true,
      maxlength: 300,
      required: true
    },

    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      required: true
    },

    /*
    |--------------------------------------------------------------------------
    | Evidencia heredada
    |--------------------------------------------------------------------------
    | Mantiene compatibilidad con el controlador actual, que guarda evidencia
    | como una lista de textos o URLs.
    |--------------------------------------------------------------------------
    */

    evidence: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: 2000
        }
      ],
      default: []
    },

    /*
    |--------------------------------------------------------------------------
    | Archivos reales estructurados
    |--------------------------------------------------------------------------
    */

    attachments: {
      type: [attachmentSchema],
      default: []
    },

    messages: {
      type: [disputeMessageSchema],
      default: []
    },

    timeline: {
      type: [timelineEventSchema],
      default: []
    },

    auditLog: {
      type: [auditEntrySchema],
      default: []
    },

    status: {
      type: String,
      enum: DISPUTE_STATUSES,
      default: "OPEN",
      index: true
    },

    priority: {
      type: String,
      enum: DISPUTE_PRIORITIES,
      default: "MEDIUM",
      index: true
    },

    adminNotes: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ""
    },

    internalNotes: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: ""
    },

    protectedAmount: {
      type: Number,
      min: 0,
      default: 0
    },

    currency: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
      default: "DOP"
    },

    resolution: {
      type: resolutionSchema,
      default: () => ({})
    },

    aiAnalysis: {
      type: aiAnalysisSchema,
      default: () => ({})
    },

    lastMessageAt: {
      type: Date,
      default: null
    },

    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    responseDeadline: {
      type: Date,
      default: null
    },

    resolutionDeadline: {
      type: Date,
      default: null
    },

    escalatedAt: {
      type: Date,
      default: null
    },

    resolvedAt: {
      type: Date,
      default: null
    },

    closedAt: {
      type: Date,
      default: null
    },

    buyerUnreadCount: {
      type: Number,
      min: 0,
      default: 0
    },

    sellerUnreadCount: {
      type: Number,
      min: 0,
      default: 0
    },

    adminUnreadCount: {
      type: Number,
      min: 0,
      default: 0
    },

    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },

    archivedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

/*
|--------------------------------------------------------------------------
| Índices
|--------------------------------------------------------------------------
*/

disputeSchema.index({
  buyer: 1,
  createdAt: -1
});

disputeSchema.index({
  seller: 1,
  createdAt: -1
});

disputeSchema.index({
  status: 1,
  priority: 1,
  createdAt: -1
});

disputeSchema.index({
  assignedAdmin: 1,
  status: 1
});

disputeSchema.index({
  order: 1,
  status: 1
});

/*
|--------------------------------------------------------------------------
| Generar código de disputa
|--------------------------------------------------------------------------
*/

disputeSchema.pre(
  "save",
  function generateDisputeCode(next) {
    if (!this.disputeCode) {
      const idFragment = this._id
        .toString()
        .slice(-8)
        .toUpperCase();

      this.disputeCode = `QSM-DSP-${idFragment}`;
    }

    this.lastActivityAt = new Date();

    next();
  }
);

/*
|--------------------------------------------------------------------------
| Timeline inicial
|--------------------------------------------------------------------------
*/

disputeSchema.pre(
  "save",
  function createInitialTimeline(next) {
    if (
      this.isNew &&
      (!Array.isArray(this.timeline) ||
        this.timeline.length === 0)
    ) {
      this.timeline = [
        {
          type: "DISPUTE_CREATED",
          title: "Disputa creada",
          description:
            "El comprador abrió una disputa y QSM retuvo el pago para revisión.",
          performedBy: this.buyer,
          performedByRole: "BUYER",
          newStatus: "OPEN",
          occurredAt: new Date()
        },
        {
          type: "PAYMENT_HELD",
          title: "Pago retenido",
          description:
            "Los fondos de la orden quedaron protegidos mientras se revisa el caso.",
          performedBy: null,
          performedByRole: "SYSTEM",
          newStatus: "OPEN",
          occurredAt: new Date()
        }
      ];
    }

    next();
  }
);

/*
|--------------------------------------------------------------------------
| Métodos del documento
|--------------------------------------------------------------------------
*/

disputeSchema.methods.isParticipant = function isParticipant(userId) {
  if (!userId) {
    return false;
  }

  const normalizedUserId = userId.toString();

  return (
    this.buyer?.toString() === normalizedUserId ||
    this.seller?.toString() === normalizedUserId
  );
};

disputeSchema.methods.isFinalStatus = function isFinalStatus() {
  return [
    "RESOLVED",
    "REFUNDED",
    "REJECTED",
    "CLOSED"
  ].includes(this.status);
};

disputeSchema.methods.addTimelineEvent = function addTimelineEvent({
  type = "OTHER",
  title,
  description = "",
  performedBy = null,
  performedByRole = "SYSTEM",
  previousStatus = "",
  newStatus = "",
  metadata = {},
  isInternal = false
}) {
  this.timeline.push({
    type,
    title,
    description,
    performedBy,
    performedByRole,
    previousStatus,
    newStatus,
    metadata,
    isInternal,
    occurredAt: new Date()
  });

  this.lastActivityAt = new Date();
};

disputeSchema.methods.addAuditEntry = function addAuditEntry({
  action,
  actor = null,
  actorRole = "SYSTEM",
  ipAddress = "",
  userAgent = "",
  before = null,
  after = null,
  metadata = {}
}) {
  this.auditLog.push({
    action,
    actor,
    actorRole,
    ipAddress,
    userAgent,
    before,
    after,
    metadata,
    createdAt: new Date()
  });

  this.lastActivityAt = new Date();
};

/*
|--------------------------------------------------------------------------
| Transformación JSON
|--------------------------------------------------------------------------
*/

disputeSchema.set("toJSON", {
  transform: function transformDocument(document, returnedObject) {
    if (
      Array.isArray(returnedObject.auditLog)
    ) {
      delete returnedObject.auditLog;
    }

    if (
      returnedObject.internalNotes !==
      undefined
    ) {
      delete returnedObject.internalNotes;
    }

    return returnedObject;
  }
});

module.exports = mongoose.model(
  "Dispute",
  disputeSchema
);