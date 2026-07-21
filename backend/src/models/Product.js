const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Subesquema de video
|--------------------------------------------------------------------------
*/

const videoSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      trim: true,
      default: ""
    },

    thumbnail: {
      type: String,
      trim: true,
      default: ""
    },

    duration: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  {
    _id: false
  }
);

/*
|--------------------------------------------------------------------------
| Datos de vehículos
|--------------------------------------------------------------------------
*/

const vehicleDetailsSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      min: 1950,
      max: new Date().getFullYear() + 1,
      default: null
    },

    vin: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 17,
      default: ""
    },

    mileage: {
      type: String,
      trim: true,
      maxlength: 50,
      default: ""
    },

    transmission: {
      type: String,
      enum: [
        "",
        "AUTOMATIC",
        "MANUAL",
        "CVT"
      ],
      default: ""
    },

    fuelType: {
      type: String,
      enum: [
        "",
        "GASOLINE",
        "DIESEL",
        "HYBRID",
        "ELECTRIC",
        "LPG"
      ],
      default: ""
    }
  },
  {
    _id: false
  }
);

/*
|--------------------------------------------------------------------------
| Datos de moda
|--------------------------------------------------------------------------
*/

const clothingDetailsSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      trim: true,
      maxlength: 30,
      default: ""
    },

    material: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ""
    },

    authenticityStatus: {
      type: String,
      enum: [
        "NOT_SPECIFIED",
        "ORIGINAL_NO_INVOICE",
        "ORIGINAL_WITH_INVOICE",
        "VERIFIED",
        "REPLICA"
      ],
      default: "NOT_SPECIFIED"
    }
  },
  {
    _id: false
  }
);

/*
|--------------------------------------------------------------------------
| Evidencias declaradas por el vendedor
|--------------------------------------------------------------------------
*/

const evidenceSchema = new mongoose.Schema(
  {
    hasInvoice: {
      type: Boolean,
      default: false
    },

    hasOriginalBox: {
      type: Boolean,
      default: false
    },

    acceptsPhysicalInspection: {
      type: Boolean,
      default: false
    },

    evidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  {
    _id: false
  }
);

/*
|--------------------------------------------------------------------------
| Análisis inteligente del backend
|--------------------------------------------------------------------------
*/

const aiAnalysisSchema = new mongoose.Schema(
  {
    imageScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    videoScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    priceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    descriptionScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    sellerScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    technicalScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    evidenceScore: {
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

    fraudRiskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  {
    _id: false
  }
);

/*
|--------------------------------------------------------------------------
| Esquema principal
|--------------------------------------------------------------------------
*/

const productSchema = new mongoose.Schema(
  {
    /*
    |--------------------------------------------------------------------------
    | Información principal
    |--------------------------------------------------------------------------
    */

    title: {
      type: String,
      required: [
        true,
        "El título es obligatorio"
      ],
      trim: true,
      minlength: 5,
      maxlength: 120
    },

    description: {
      type: String,
      required: [
        true,
        "La descripción es obligatoria"
      ],
      trim: true,
      minlength: 40,
      maxlength: 2000
    },

    price: {
      type: Number,
      required: [
        true,
        "El precio es obligatorio"
      ],
      min: [
        1,
        "El precio debe ser mayor que cero"
      ]
    },

    category: {
      type: String,
      required: [
        true,
        "La categoría es obligatoria"
      ],
      trim: true,
      enum: [
        "Gaming",
        "Tecnología",
        "Celulares",
        "Laptops",
        "Vehículos",
        "Hogar",
        "Moda",
        "Otros"
      ]
    },

    condition: {
      type: String,
      enum: [
        "NEW",
        "LIKE_NEW",
        "USED_GOOD",
        "USED_DETAILS",
        "FOR_PARTS"
      ],
      default: "USED_GOOD"
    },

    quality: {
      type: String,
      enum: [
        "EXCELLENT",
        "GOOD",
        "FAIR",
        "DAMAGED",
        "UNKNOWN"
      ],
      default: "UNKNOWN"
    },

    /*
    |--------------------------------------------------------------------------
    | Identidad técnica del producto
    |--------------------------------------------------------------------------
    */

    brand: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ""
    },

    model: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ""
    },

    serialNumber: {
      type: String,
      trim: true,
      maxlength: 120,
      default: ""
    },

    imei: {
      type: String,
      trim: true,
      maxlength: 17,
      default: ""
    },

    storageCapacity: {
      type: String,
      trim: true,
      maxlength: 80,
      default: ""
    },

    ramMemory: {
      type: String,
      trim: true,
      maxlength: 60,
      default: ""
    },

    batteryHealth: {
      type: String,
      trim: true,
      maxlength: 60,
      default: ""
    },

    dimensions: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ""
    },

    accessoriesIncluded: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ""
    },

    vehicleDetails: {
      type: vehicleDetailsSchema,
      default: () => ({})
    },

    clothingDetails: {
      type: clothingDetailsSchema,
      default: () => ({})
    },

    /*
    |--------------------------------------------------------------------------
    | Evidencias del vendedor
    |--------------------------------------------------------------------------
    */

    evidence: {
      type: evidenceSchema,
      default: () => ({})
    },

    evidenceRequired: {
      type: [String],
      default: []
    },

    /*
    |--------------------------------------------------------------------------
    | Ubicación, garantía y entrega
    |--------------------------------------------------------------------------
    */

    location: {
      type: String,
      trim: true,
      maxlength: 160,
      default: ""
    },

    warranty: {
      type: String,
      trim: true,
      maxlength: 160,
      default: ""
    },

    deliveryMethod: {
      type: String,
      enum: [
        "",
        "QSM_WAREHOUSE",
        "QSM_VERIFIED_DELIVERY",
        "DIRECT_DELIVERY"
      ],
      default: ""
    },

    /*
    |--------------------------------------------------------------------------
    | Precio especial
    |--------------------------------------------------------------------------
    */

    specialPriceReason: {
      type: String,
      enum: [
        "NONE",
        "URGENT_MONEY",
        "MOVING",
        "BOUGHT_ANOTHER",
        "NO_LONGER_USED",
        "MEDICAL_EXPENSE",
        "BUSINESS_LIQUIDATION",
        "OTHER"
      ],
      default: "NONE"
    },

    specialPriceExplanation: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ""
    },

    /*
    |--------------------------------------------------------------------------
    | Multimedia
    |--------------------------------------------------------------------------
    */

images: {
  type: [
    {
      type: String,
      trim: true
    }
  ],
  validate: {
    validator(images) {
      return (
        Array.isArray(images) &&
        images.length <= 8
      );
    },
    message:
      "El producto no puede tener más de 8 imágenes"
  },
  default: []
},

    video: {
      type: videoSchema,
      default: () => ({})
    },

    /*
    |--------------------------------------------------------------------------
    | Vendedor
    |--------------------------------------------------------------------------
    */

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    /*
    |--------------------------------------------------------------------------
    | Estado operativo
    |--------------------------------------------------------------------------
    */

    status: {
      type: String,
      enum: [
        "ACTIVE",
        "PENDING",
        "UNDER_REVIEW",
        "SOLD",
        "DISABLED"
      ],
      default: "ACTIVE",
      index: true
    },

    isQsmVerified: {
      type: Boolean,
      default: false
    },

    /*
    |--------------------------------------------------------------------------
    | Clasificación de riesgo
    |--------------------------------------------------------------------------
    */

    riskLevel: {
      type: String,
      enum: [
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
        "UNCLASSIFIED"
      ],
      default: "UNCLASSIFIED",
      index: true
    },

    riskLabel: {
      type: String,
      trim: true,
      default: "Riesgo por determinar"
    },

    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    verificationMode: {
      type: String,
      enum: [
        "PENDING",
        "BASIC",
        "RECOMMENDED",
        "ENHANCED",
        "PHYSICAL",
        "REVIEW"
      ],
      default: "PENDING"
    },

    /*
    |--------------------------------------------------------------------------
    | Calidad y confianza de la publicación
    |--------------------------------------------------------------------------
    */

    publicationScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    publicationLevel: {
      type: String,
      enum: [
        "Sin clasificar",
        "QSM Bronze",
        "QSM Silver",
        "QSM Gold",
        "QSM Platinum"
      ],
      default: "Sin clasificar"
    },

    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    saleProbability: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },

    estimatedSaleTime: {
      type: String,
      trim: true,
      default: "No estimado"
    },

    aiAnalysis: {
      type: aiAnalysisSchema,
      default: () => ({})
    },

    /*
    |--------------------------------------------------------------------------
    | Eliminación lógica y auditoría
    |--------------------------------------------------------------------------
    */

    lastEditedAt: {
      type: Date,
      default: null
    },

    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    deletedAt: {
      type: Date,
      default: null
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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

productSchema.index({
  status: 1,
  createdAt: -1
});

productSchema.index({
  category: 1,
  riskLevel: 1,
  status: 1
});

productSchema.index({
  seller: 1,
  status: 1,
  createdAt: -1
});

productSchema.index(
  {
    serialNumber: 1
  },
  {
    sparse: true
  }
);

productSchema.index(
  {
    imei: 1
  },
  {
    sparse: true
  }
);

productSchema.index(
  {
    "vehicleDetails.vin": 1
  },
  {
    sparse: true
  }
);

/*
|--------------------------------------------------------------------------
| Normalización previa al guardado
|--------------------------------------------------------------------------
*/

productSchema.pre(
  "save",
  function normalizeProduct() {
    if (this.imei) {
      this.imei = String(this.imei)
        .replace(/\s+/g, "")
        .trim();
    }

    if (this.serialNumber) {
      this.serialNumber = String(
        this.serialNumber
      ).trim();
    }

    if (this.vehicleDetails?.vin) {
      this.vehicleDetails.vin =
        String(
          this.vehicleDetails.vin
        )
          .trim()
          .toUpperCase();
    }
  }
);

module.exports =
  mongoose.model(
    "Product",
    productSchema
  );