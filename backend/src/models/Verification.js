const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Utilidades
|--------------------------------------------------------------------------
*/

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const normalizePersonName = (value) => {
  if (!value) {
    return "";
  }

  return String(value)
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-DO")
    .replace(
      /(^|[\s'-])\p{L}/gu,
      (letter) =>
        letter.toLocaleUpperCase("es-DO")
    );
};

const normalizePhone = (value) =>
  String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");

const normalizeDocumentNumber = (value) =>
  String(value || "")
    .trim()
    .replace(/[\s-]/g, "")
    .toUpperCase();

/*
|--------------------------------------------------------------------------
| Estados permitidos para cada elemento
|--------------------------------------------------------------------------
*/

const fieldStatusValues = [
  "NOT_STARTED",
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "RESUBMISSION_REQUIRED"
];

/*
|--------------------------------------------------------------------------
| Esquema de estado individual
|--------------------------------------------------------------------------
*/

const verificationFieldSchema =
  new mongoose.Schema(
    {
      status: {
        type: String,
        enum: fieldStatusValues,
        default: "NOT_STARTED"
      },

      rejectionReason: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1000
      },

      reviewedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      reviewedAt: {
        type: Date,
        default: null
      },

      submittedAt: {
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
| Verificación diaria
|--------------------------------------------------------------------------
*/

const dailyCheckSchema =
  new mongoose.Schema(
    {
      checkedAt: {
        type: Date,
        default: Date.now
      },

      status: {
        type: String,
        enum: [
          "PASSED",
          "FAILED",
          "NEEDS_REVIEW"
        ],
        default: "PASSED"
      },

      faceMatchScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },

      notes: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1000
      },

      reviewedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      }
    },
    {
      _id: true
    }
  );

/*
|--------------------------------------------------------------------------
| Esquema principal
|--------------------------------------------------------------------------
*/

const verificationSchema =
  new mongoose.Schema(
    {
      /*
      |--------------------------------------------------------------------------
      | Usuario
      |--------------------------------------------------------------------------
      */

      user: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true
      },

      /*
      |--------------------------------------------------------------------------
      | Información personal
      |--------------------------------------------------------------------------
      */

      firstName: {
        type: String,
        trim: true,
        default: "",
        minlength: 2,
        maxlength: 50,
        set: normalizePersonName
      },

      lastName: {
        type: String,
        trim: true,
        default: "",
        minlength: 2,
        maxlength: 50,
        set: normalizePersonName
      },

      phone: {
        type: String,
        trim: true,
        default: "",
        maxlength: 30,
        set: normalizePhone
      },

      address: {
        type: String,
        trim: true,
        default: "",
        maxlength: 300,
        set: normalizeText
      },

      city: {
        type: String,
        trim: true,
        default: "",
        maxlength: 100,
        set: normalizeText
      },

      province: {
        type: String,
        trim: true,
        default: "",
        maxlength: 100,
        set: normalizeText
      },

      country: {
        type: String,
        trim: true,
        default:
          "República Dominicana",
        maxlength: 100,
        set: normalizeText
      },

      gender: {
        type: String,
        enum: [
          "MALE",
          "FEMALE",
          "OTHER",
          "PREFER_NOT_TO_SAY"
        ],
        default:
          "PREFER_NOT_TO_SAY"
      },

      birthDate: {
        type: Date,
        default: null
      },

      /*
      |--------------------------------------------------------------------------
      | Documento
      |--------------------------------------------------------------------------
      */

      documentType: {
        type: String,
        enum: [
          "CEDULA_RD",
          "PASSPORT",
          "OTHER"
        ],
        default:
          "CEDULA_RD"
      },

      documentNumber: {
        type: String,
        trim: true,
        default: "",
        maxlength: 30,
        select: false,
        set:
          normalizeDocumentNumber,

        validate: {
          validator(value) {
            if (!value) {
              return true;
            }

            if (
              this.documentType ===
              "CEDULA_RD"
            ) {
              return /^\d{11}$/.test(
                value
              );
            }

            return value.length >= 5;
          },

          message:
            "El número de documento no es válido."
        }
      },

      /*
      |--------------------------------------------------------------------------
      | Fotografía de perfil pendiente
      |--------------------------------------------------------------------------
      */

      profilePhotoUrl: {
        type: String,
        trim: true,
        default: "",
        select: false
      },

      profilePhotoPublicId: {
        type: String,
        trim: true,
        default: "",
        select: false
      },

      /*
      |--------------------------------------------------------------------------
      | Documentos de identidad
      |--------------------------------------------------------------------------
      */

      documentFrontUrl: {
        type: String,
        trim: true,
        default: "",
        select: false
      },

      documentFrontPublicId: {
        type: String,
        trim: true,
        default: "",
        select: false
      },

      documentBackUrl: {
        type: String,
        trim: true,
        default: "",
        select: false
      },

      documentBackPublicId: {
        type: String,
        trim: true,
        default: "",
        select: false
      },

      selfieUrl: {
        type: String,
        trim: true,
        default: "",
        select: false
      },

      selfiePublicId: {
        type: String,
        trim: true,
        default: "",
        select: false
      },

      /*
      |--------------------------------------------------------------------------
      | Estado general
      |--------------------------------------------------------------------------
      */

      status: {
        type: String,
        enum: [
          "NOT_STARTED",
          "PENDING",
          "PENDING_REVIEW",
          "UNDER_REVIEW",
          "APPROVED",
          "REJECTED",
          "RESUBMISSION_REQUIRED"
        ],
        default:
          "NOT_STARTED",
        index: true
      },

      /*
      |--------------------------------------------------------------------------
      | Estado individual de cada dato
      |--------------------------------------------------------------------------
      */

      firstNameReview: {
        type:
          verificationFieldSchema,
        default: () => ({})
      },

      lastNameReview: {
        type:
          verificationFieldSchema,
        default: () => ({})
      },

      phoneReview: {
        type:
          verificationFieldSchema,
        default: () => ({})
      },

      addressReview: {
        type:
          verificationFieldSchema,
        default: () => ({})
      },

      profilePhotoReview: {
        type:
          verificationFieldSchema,
        default: () => ({})
      },

      documentFrontReview: {
        type:
          verificationFieldSchema,
        default: () => ({})
      },

      documentBackReview: {
        type:
          verificationFieldSchema,
        default: () => ({})
      },

      selfieReview: {
        type:
          verificationFieldSchema,
        default: () => ({})
      },

      /*
      |--------------------------------------------------------------------------
      | Resultado de la revisión
      |--------------------------------------------------------------------------
      */

      trustScore: {
        type: Number,
        default: 50,
        min: 0,
        max: 100,
        index: true
      },

      faceMatchScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },

      rejectionReason: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1500
      },

      verificationNotes: {
        type: String,
        trim: true,
        default: "",
        maxlength: 1500
      },

      /*
      |--------------------------------------------------------------------------
      | Flujo de revisión
      |--------------------------------------------------------------------------
      */

      submittedAt: {
        type: Date,
        default: null,
        index: true
      },

      reviewStartedAt: {
        type: Date,
        default: null
      },

      reviewedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      reviewedAt: {
        type: Date,
        default: null
      },

      approvedAt: {
        type: Date,
        default: null
      },

      resubmissionCount: {
        type: Number,
        default: 0,
        min: 0
      },

      /*
      |--------------------------------------------------------------------------
      | Validaciones periódicas
      |--------------------------------------------------------------------------
      */

      lastDailyCheck: {
        type: Date,
        default: null
      },

      nextFaceCheckAt: {
        type: Date,
        default: null
      },

      dailyChecks: {
        type: [dailyCheckSchema],
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
| Virtuales
|--------------------------------------------------------------------------
*/

verificationSchema
  .virtual("fullName")
  .get(function () {
    return [
      this.firstName,
      this.lastName
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
  });

verificationSchema
  .virtual("isApproved")
  .get(function () {
    return (
      this.status ===
      "APPROVED"
    );
  });

verificationSchema
  .virtual("isPending")
  .get(function () {
    return [
      "PENDING",
      "PENDING_REVIEW",
      "UNDER_REVIEW"
    ].includes(this.status);
  });

verificationSchema
  .virtual("requiresResubmission")
  .get(function () {
    return (
      this.status ===
      "RESUBMISSION_REQUIRED"
    );
  });

/*
|--------------------------------------------------------------------------
| Transformación JSON
|--------------------------------------------------------------------------
*/

verificationSchema.set(
  "toJSON",
  {
    virtuals: true,

    transform(
      document,
      returnedObject
    ) {
      delete returnedObject
        .documentNumber;

      delete returnedObject
        .profilePhotoPublicId;

      delete returnedObject
        .documentFrontPublicId;

      delete returnedObject
        .documentBackPublicId;

      delete returnedObject
        .selfiePublicId;

      return returnedObject;
    }
  }
);

verificationSchema.set(
  "toObject",
  {
    virtuals: true
  }
);

/*
|--------------------------------------------------------------------------
| Índices
|--------------------------------------------------------------------------
*/

verificationSchema.index({
  status: 1,
  submittedAt: 1
});

verificationSchema.index({
  reviewedBy: 1,
  status: 1
});

verificationSchema.index({
  trustScore: -1,
  status: 1
});

verificationSchema.index({
  createdAt: -1
});

/*
|--------------------------------------------------------------------------
| Métodos de instancia
|--------------------------------------------------------------------------
*/

verificationSchema.methods.submit =
  function () {
    const submissionDate =
      new Date();

    this.status =
      "PENDING_REVIEW";

    this.submittedAt =
      submissionDate;

    this.reviewStartedAt =
      null;

    this.reviewedBy =
      null;

    this.reviewedAt =
      null;

    this.approvedAt =
      null;

    this.rejectionReason =
      "";

    this.verificationNotes =
      "";

    const reviewFields = [
      "firstNameReview",
      "lastNameReview",
      "phoneReview",
      "addressReview",
      "profilePhotoReview",
      "documentFrontReview",
      "documentBackReview",
      "selfieReview"
    ];

    reviewFields.forEach(
      (fieldName) => {
        if (!this[fieldName]) {
          this[fieldName] = {};
        }

        if (
          this[fieldName].status !==
          "APPROVED"
        ) {
          this[fieldName].status =
            "PENDING";

          this[fieldName].submittedAt =
            submissionDate;

          this[
            fieldName
          ].rejectionReason = "";

          this[fieldName].reviewedBy =
            null;

          this[fieldName].reviewedAt =
            null;
        }
      }
    );

    return this;
  };

verificationSchema.methods.startReview =
  function (
    reviewerId = null
  ) {
    this.status =
      "UNDER_REVIEW";

    this.reviewStartedAt =
      new Date();

    this.reviewedBy =
      reviewerId;

    return this;
  };

verificationSchema.methods.approve =
  function (
    reviewerId = null,
    notes = ""
  ) {
    const approvalDate =
      new Date();

    this.status =
      "APPROVED";

    this.reviewedBy =
      reviewerId;

    this.reviewedAt =
      approvalDate;

    this.approvedAt =
      approvalDate;

    this.rejectionReason =
      "";

    this.verificationNotes =
      String(notes || "").trim();

    const reviewFields = [
      "firstNameReview",
      "lastNameReview",
      "phoneReview",
      "addressReview",
      "profilePhotoReview",
      "documentFrontReview",
      "documentBackReview",
      "selfieReview"
    ];

    reviewFields.forEach(
      (fieldName) => {
        if (!this[fieldName]) {
          this[fieldName] = {};
        }

        this[fieldName].status =
          "APPROVED";

        this[
          fieldName
        ].rejectionReason = "";

        this[fieldName].reviewedBy =
          reviewerId;

        this[fieldName].reviewedAt =
          approvalDate;
      }
    );

    return this;
  };

verificationSchema.methods.reject =
  function (
    reviewerId = null,
    reason = ""
  ) {
    const reviewDate =
      new Date();

    this.status =
      "REJECTED";

    this.reviewedBy =
      reviewerId;

    this.reviewedAt =
      reviewDate;

    this.approvedAt =
      null;

    this.rejectionReason =
      String(reason || "").trim();

    return this;
  };

verificationSchema.methods.requestResubmission =
  function (
    reviewerId = null,
    reason = ""
  ) {
    this.status =
      "RESUBMISSION_REQUIRED";

    this.reviewedBy =
      reviewerId;

    this.reviewedAt =
      new Date();

    this.approvedAt =
      null;

    this.rejectionReason =
      String(reason || "").trim();

    this.resubmissionCount =
      Number(
        this.resubmissionCount ||
          0
      ) + 1;

    return this;
  };

verificationSchema.methods.recordDailyCheck =
  function ({
    status = "PASSED",
    faceMatchScore = 0,
    notes = "",
    reviewedBy = null
  } = {}) {
    const checkDate =
      new Date();

    this.dailyChecks.push({
      checkedAt: checkDate,
      status,
      faceMatchScore,
      notes:
        String(notes || "").trim(),
      reviewedBy
    });

    this.lastDailyCheck =
      checkDate;

    this.faceMatchScore =
      Number(faceMatchScore || 0);

    this.nextFaceCheckAt =
      new Date(
        checkDate.getTime() +
          72 *
            60 *
            60 *
            1000
      );

    return this;
  };

/*
|--------------------------------------------------------------------------
| Métodos estáticos
|--------------------------------------------------------------------------
*/

verificationSchema.statics.findByUser =
  function (userId) {
    return this.findOne({
      user: userId
    });
  };

verificationSchema.statics.findPending =
  function () {
    return this.find({
      status: {
        $in: [
          "PENDING",
          "PENDING_REVIEW",
          "UNDER_REVIEW"
        ]
      }
    }).sort({
      submittedAt: 1,
      createdAt: 1
    });
  };

/*
|--------------------------------------------------------------------------
| Validaciones antes de guardar
|--------------------------------------------------------------------------
*/

verificationSchema.pre(
  "validate",
  function () {
    if (
      this.documentType ===
        "CEDULA_RD" &&
      this.documentNumber
    ) {
      this.documentNumber =
        String(
          this.documentNumber
        ).replace(/\D/g, "");
    }

    if (
      this.status ===
      "APPROVED"
    ) {
      this.rejectionReason =
        "";

      if (!this.approvedAt) {
        this.approvedAt =
          new Date();
      }
    }

    if (
      [
        "REJECTED",
        "RESUBMISSION_REQUIRED"
      ].includes(this.status)
    ) {
      this.approvedAt =
        null;
    }
  }
);

/*
|--------------------------------------------------------------------------
| Exportación
|--------------------------------------------------------------------------
*/

const Verification =
  mongoose.models
    .Verification ||
  mongoose.model(
    "Verification",
    verificationSchema
  );

module.exports =
  Verification;