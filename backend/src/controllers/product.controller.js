const mongoose = require("mongoose");
const validator = require("validator");

const Product = require("../models/Product");

/*
|--------------------------------------------------------------------------
| Valores permitidos
|--------------------------------------------------------------------------
*/

const ALLOWED_CATEGORIES = [
  "Gaming",
  "Tecnología",
  "Celulares",
  "Laptops",
  "Vehículos",
  "Hogar",
  "Moda",
  "Otros"
];

const ALLOWED_CONDITIONS = [
  "NEW",
  "LIKE_NEW",
  "USED_GOOD",
  "USED_DETAILS",
  "FOR_PARTS"
];

const ALLOWED_QUALITIES = [
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "DAMAGED",
  "UNKNOWN"
];

const ALLOWED_DELIVERY_METHODS = [
  "",
  "QSM_WAREHOUSE",
  "QSM_VERIFIED_DELIVERY",
  "DIRECT_DELIVERY"
];

const ALLOWED_SPECIAL_PRICE_REASONS = [
  "NONE",
  "URGENT_MONEY",
  "MOVING",
  "BOUGHT_ANOTHER",
  "NO_LONGER_USED",
  "MEDICAL_EXPENSE",
  "BUSINESS_LIQUIDATION",
  "OTHER"
];

const ALLOWED_TRANSMISSIONS = [
  "",
  "AUTOMATIC",
  "MANUAL",
  "CVT"
];

const ALLOWED_FUEL_TYPES = [
  "",
  "GASOLINE",
  "DIESEL",
  "HYBRID",
  "ELECTRIC",
  "LPG"
];

const ALLOWED_AUTHENTICITY_STATUS = [
  "NOT_SPECIFIED",
  "ORIGINAL_NO_INVOICE",
  "ORIGINAL_WITH_INVOICE",
  "VERIFIED",
  "REPLICA"
];

/*
|--------------------------------------------------------------------------
| Configuración de riesgo por categoría
|--------------------------------------------------------------------------
*/

const CATEGORY_RISK_CONFIG = {
  Moda: {
    level: "LOW",
    label: "Riesgo bajo",
    baseScore: 15,
    verificationMode: "BASIC"
  },

  Hogar: {
    level: "LOW",
    label: "Riesgo bajo",
    baseScore: 20,
    verificationMode: "BASIC"
  },

  Gaming: {
    level: "MEDIUM",
    label: "Riesgo medio",
    baseScore: 45,
    verificationMode: "RECOMMENDED"
  },

  Tecnología: {
    level: "MEDIUM",
    label: "Riesgo medio",
    baseScore: 50,
    verificationMode: "RECOMMENDED"
  },

  Laptops: {
    level: "HIGH",
    label: "Riesgo alto",
    baseScore: 68,
    verificationMode: "ENHANCED"
  },

  Celulares: {
    level: "HIGH",
    label: "Riesgo alto",
    baseScore: 75,
    verificationMode: "ENHANCED"
  },

  Vehículos: {
    level: "CRITICAL",
    label: "Riesgo crítico",
    baseScore: 92,
    verificationMode: "PHYSICAL"
  },

  Otros: {
    level: "UNCLASSIFIED",
    label: "Riesgo por determinar",
    baseScore: 40,
    verificationMode: "REVIEW"
  }
};

/*
|--------------------------------------------------------------------------
| Utilidades generales
|--------------------------------------------------------------------------
*/

const clampNumber = (
  value,
  min,
  max,
  fallback = 0
) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(
    max,
    Math.max(min, numericValue)
  );
};

const sanitizeText = (
  value,
  maxLength = 2000
) => {
  return validator
    .escape(
      String(value || "")
        .trim()
        .slice(0, maxLength)
    );
};

const sanitizePlainIdentifier = (
  value,
  maxLength = 120
) => {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
};

const cleanFilePath = (value) => {
  if (!value) {
    return "";
  }

  return String(value)
    .trim()
    .replaceAll("&#x2F;", "/")
    .replaceAll("&amp;", "&");
};

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const getUserId = (req) => {
  return (
    req.user?._id ||
    req.user?.id ||
    req.user?.userId ||
    ""
  );
};

const isUserAdmin = (req) => {
  return [
    "ADMIN",
    "SENIOR_ADMIN"
  ].includes(req.user?.role) ||
    req.user?.isAdmin === true;
};

/*
|--------------------------------------------------------------------------
| Normalizar imágenes
|--------------------------------------------------------------------------
*/

const normalizeImages = (images) => {
  if (!Array.isArray(images)) {
    return [];
  }

  return [
    ...new Set(
      images
        .filter(
          (item) =>
            typeof item === "string" &&
            item.trim()
        )
        .map(cleanFilePath)
    )
  ].slice(0, 8);
};

/*
|--------------------------------------------------------------------------
| Normalizar video
|--------------------------------------------------------------------------
*/

const normalizeVideo = (video) => {
  if (
    !video ||
    typeof video !== "object"
  ) {
    return {
      url: "",
      thumbnail: "",
      duration: 0
    };
  }

  return {
    url: cleanFilePath(video.url),
    thumbnail: cleanFilePath(
      video.thumbnail
    ),
    duration: clampNumber(
      video.duration,
      0,
      10800,
      0
    )
  };
};

/*
|--------------------------------------------------------------------------
| Normalizar datos de vehículo
|--------------------------------------------------------------------------
*/

const normalizeVehicleDetails = (
  vehicleDetails
) => {
  const source =
    vehicleDetails &&
    typeof vehicleDetails === "object"
      ? vehicleDetails
      : {};

  return {
    year: source.year
      ? Number(source.year)
      : null,

    vin: sanitizePlainIdentifier(
      source.vin,
      17
    ).toUpperCase(),

    mileage: sanitizeText(
      source.mileage,
      50
    ),

    transmission:
      ALLOWED_TRANSMISSIONS.includes(
        source.transmission
      )
        ? source.transmission
        : "",

    fuelType:
      ALLOWED_FUEL_TYPES.includes(
        source.fuelType
      )
        ? source.fuelType
        : ""
  };
};

/*
|--------------------------------------------------------------------------
| Normalizar datos de moda
|--------------------------------------------------------------------------
*/

const normalizeClothingDetails = (
  clothingDetails
) => {
  const source =
    clothingDetails &&
    typeof clothingDetails === "object"
      ? clothingDetails
      : {};

  return {
    size: sanitizeText(
      source.size,
      30
    ),

    material: sanitizeText(
      source.material,
      80
    ),

    authenticityStatus:
      ALLOWED_AUTHENTICITY_STATUS.includes(
        source.authenticityStatus
      )
        ? source.authenticityStatus
        : "NOT_SPECIFIED"
  };
};

/*
|--------------------------------------------------------------------------
| Normalizar evidencias
|--------------------------------------------------------------------------
*/

const normalizeEvidence = (evidence) => {
  const source =
    evidence &&
    typeof evidence === "object"
      ? evidence
      : {};

  return {
    hasInvoice:
      Boolean(source.hasInvoice),

    hasOriginalBox:
      Boolean(source.hasOriginalBox),

    acceptsPhysicalInspection:
      Boolean(
        source.acceptsPhysicalInspection
      )
  };
};

/*
|--------------------------------------------------------------------------
| Validación técnica según categoría
|--------------------------------------------------------------------------
*/

const validateTechnicalFields = ({
  category,
  brand,
  model,
  imei,
  vehicleDetails,
  clothingDetails
}) => {
  const errors = [];

  if (
    [
      "Celulares",
      "Laptops",
      "Gaming",
      "Tecnología",
      "Vehículos"
    ].includes(category)
  ) {
    if (!brand) {
      errors.push(
        "La marca es obligatoria para esta categoría."
      );
    }

    if (!model) {
      errors.push(
        "El modelo es obligatorio para esta categoría."
      );
    }
  }

  if (
    imei &&
    !/^[0-9]{14,17}$/.test(imei)
  ) {
    errors.push(
      "El IMEI debe contener entre 14 y 17 dígitos."
    );
  }

  if (category === "Vehículos") {
    const currentYear =
      new Date().getFullYear();

    if (
      !vehicleDetails.year ||
      vehicleDetails.year < 1950 ||
      vehicleDetails.year >
        currentYear + 1
    ) {
      errors.push(
        "El año del vehículo no es válido."
      );
    }

    if (!vehicleDetails.mileage) {
      errors.push(
        "El kilometraje es obligatorio para vehículos."
      );
    }

    if (
      vehicleDetails.vin &&
      !/^[A-HJ-NPR-Z0-9]{17}$/i.test(
        vehicleDetails.vin
      )
    ) {
      errors.push(
        "El VIN debe contener 17 caracteres válidos."
      );
    }
  }

  if (
    category === "Moda" &&
    !clothingDetails.size
  ) {
    errors.push(
      "La talla es obligatoria para productos de moda."
    );
  }

  return errors;
};

/*
|--------------------------------------------------------------------------
| Calcular riesgo real del tipo de producto
|--------------------------------------------------------------------------
*/

const calculateCategoryRisk = ({
  category,
  price
}) => {
  const config =
    CATEGORY_RISK_CONFIG[category] ||
    CATEGORY_RISK_CONFIG.Otros;

  let score =
    Number(config.baseScore);

  const numericPrice =
    Number(price) || 0;

  if (numericPrice >= 250000) {
    score += 12;
  } else if (
    numericPrice >= 100000
  ) {
    score += 8;
  } else if (
    numericPrice >= 50000
  ) {
    score += 4;
  }

  let level =
    config.level;

  let label =
    config.label;

  let verificationMode =
    config.verificationMode;

  if (
    config.level === "LOW" &&
    numericPrice >= 100000
  ) {
    level = "MEDIUM";
    label = "Riesgo medio";
    verificationMode =
      "RECOMMENDED";
  }

  if (
    config.level === "MEDIUM" &&
    numericPrice >= 250000
  ) {
    level = "HIGH";
    label = "Riesgo alto";
    verificationMode =
      "ENHANCED";
  }

  return {
    riskLevel: level,
    riskLabel: label,
    riskScore: clampNumber(
      score,
      0,
      100,
      config.baseScore
    ),
    verificationMode
  };
};

/*
|--------------------------------------------------------------------------
| Calcular puntuación técnica
|--------------------------------------------------------------------------
*/

const calculateTechnicalScore = ({
  brand,
  model,
  serialNumber,
  imei,
  storageCapacity,
  ramMemory,
  batteryHealth,
  dimensions,
  accessoriesIncluded,
  vehicleDetails,
  clothingDetails
}) => {
  const values = [
    brand,
    model,
    serialNumber,
    imei,
    storageCapacity,
    ramMemory,
    batteryHealth,
    dimensions,
    accessoriesIncluded,
    vehicleDetails?.year,
    vehicleDetails?.vin,
    vehicleDetails?.mileage,
    vehicleDetails?.transmission,
    vehicleDetails?.fuelType,
    clothingDetails?.size,
    clothingDetails?.material
  ];

  const completed =
    values.filter(
      (value) =>
        String(value || "")
          .trim()
          .length > 0
    ).length;

  return clampNumber(
    completed * 6,
    0,
    100,
    0
  );
};

/*
|--------------------------------------------------------------------------
| Calcular puntuación de evidencia
|--------------------------------------------------------------------------
*/

const calculateEvidenceScore = ({
  evidence,
  serialNumber,
  imei,
  vin
}) => {
  let score = 0;

  if (evidence.hasInvoice) {
    score += 25;
  }

  if (evidence.hasOriginalBox) {
    score += 15;
  }

  if (
    evidence.acceptsPhysicalInspection
  ) {
    score += 25;
  }

  if (serialNumber) {
    score += 10;
  }

  if (imei) {
    score += 15;
  }

  if (vin) {
    score += 20;
  }

  return clampNumber(
    score,
    0,
    100,
    0
  );
};

/*
|--------------------------------------------------------------------------
| Calcular calidad y confianza de la publicación
|--------------------------------------------------------------------------
*/

const calculatePublicationAnalysis = ({
  title,
  description,
  images,
  video,
  price,
  quality,
  warranty,
  specialPriceReason,
  specialPriceExplanation,
  sellerTrustScore,
  sellerVerified,
  technicalScore,
  evidenceScore
}) => {
  const evidenceRequired = [];

  let imageScore = 0;

  if (images.length >= 6) {
    imageScore = 100;
  } else if (images.length >= 3) {
    imageScore = 82;
  } else if (images.length >= 1) {
    imageScore = 55;
  } else {
    evidenceRequired.push(
      "Agregar fotografías reales del producto"
    );
  }

  const videoScore =
    video?.url
      ? 90
      : 0;

  if (!video?.url) {
    evidenceRequired.push(
      "Agregar un video corto del producto funcionando"
    );
  }

  const priceScore =
    Number(price) > 0
      ? 80
      : 0;

  let descriptionScore = 20;

  if (description.length >= 250) {
    descriptionScore = 100;
  } else if (
    description.length >= 120
  ) {
    descriptionScore = 82;
  } else if (
    description.length >= 40
  ) {
    descriptionScore = 60;
  } else {
    evidenceRequired.push(
      "Mejorar la descripción del producto"
    );
  }

  let sellerScore =
    clampNumber(
      sellerTrustScore,
      0,
      100,
      50
    );

  if (sellerVerified) {
    sellerScore = clampNumber(
      sellerScore + 10,
      0,
      100,
      sellerScore
    );
  }

  if (quality === "UNKNOWN") {
    evidenceRequired.push(
      "Indicar la calidad real del producto"
    );
  }

  if (!warranty) {
    evidenceRequired.push(
      "Indicar si el producto posee garantía"
    );
  }

  if (
    specialPriceReason !== "NONE" &&
    specialPriceExplanation.length < 20
  ) {
    evidenceRequired.push(
      "Explicar mejor el motivo del precio especial"
    );
  }

  let publicationScore = 0;

  if (title.length >= 5) {
    publicationScore += 7;
  }

  if (title.length >= 18) {
    publicationScore += 3;
  }

  if (description.length >= 40) {
    publicationScore += 10;
  }

  if (description.length >= 120) {
    publicationScore += 8;
  }

  if (images.length >= 1) {
    publicationScore += 12;
  }

  if (images.length >= 3) {
    publicationScore += 8;
  }

  if (images.length >= 5) {
    publicationScore += 5;
  }

  if (video?.url) {
    publicationScore += 10;
  }

  if (price > 0) {
    publicationScore += 5;
  }

  if (quality !== "UNKNOWN") {
    publicationScore += 5;
  }

  publicationScore +=
    Math.round(
      technicalScore * 0.1
    );

  publicationScore +=
    Math.round(
      evidenceScore * 0.1
    );

  publicationScore +=
    Math.round(
      sellerScore * 0.07
    );

  publicationScore =
    clampNumber(
      publicationScore,
      0,
      100,
      0
    );

  let publicationLevel =
    "Sin clasificar";

  if (publicationScore >= 90) {
    publicationLevel =
      "QSM Platinum";
  } else if (
    publicationScore >= 75
  ) {
    publicationLevel =
      "QSM Gold";
  } else if (
    publicationScore >= 60
  ) {
    publicationLevel =
      "QSM Silver";
  } else if (
    publicationScore >= 40
  ) {
    publicationLevel =
      "QSM Bronze";
  }

  const confidenceScore =
    Math.round(
      imageScore * 0.17 +
        videoScore * 0.1 +
        priceScore * 0.08 +
        descriptionScore * 0.17 +
        sellerScore * 0.18 +
        technicalScore * 0.15 +
        evidenceScore * 0.15
    );

  const fraudRiskScore =
    clampNumber(
      100 - confidenceScore,
      0,
      100,
      100
    );

  let saleProbability =
    publicationScore * 0.72;

  if (images.length >= 3) {
    saleProbability += 5;
  }

  if (video?.url) {
    saleProbability += 4;
  }

  if (sellerVerified) {
    saleProbability += 5;
  }

  saleProbability =
    Math.round(
      clampNumber(
        saleProbability,
        5,
        96,
        5
      )
    );

  let estimatedSaleTime =
    "No estimado";

  if (publicationScore >= 90) {
    estimatedSaleTime =
      "1–3 días";
  } else if (
    publicationScore >= 75
  ) {
    estimatedSaleTime =
      "3–7 días";
  } else if (
    publicationScore >= 60
  ) {
    estimatedSaleTime =
      "1–2 semanas";
  } else if (
    publicationScore >= 40
  ) {
    estimatedSaleTime =
      "2–4 semanas";
  }

  return {
    publicationScore,
    publicationLevel,
    confidenceScore,
    fraudRiskScore,
    saleProbability,
    estimatedSaleTime,
    evidenceRequired: [
      ...new Set(
        evidenceRequired
      )
    ],
    aiAnalysis: {
      imageScore,
      videoScore,
      priceScore,
      descriptionScore,
      sellerScore,
      technicalScore,
      evidenceScore,
      confidenceScore,
      fraudRiskScore
    }
  };
};

/*
|--------------------------------------------------------------------------
| Buscar identificadores duplicados
|--------------------------------------------------------------------------
*/

const findIdentifierConflicts = async ({
  imei,
  serialNumber,
  vin,
  excludeProductId = null
}) => {
  const clauses = [];

  if (imei) {
    clauses.push({
      imei
    });
  }

  if (serialNumber) {
    clauses.push({
      serialNumber
    });
  }

  if (vin) {
    clauses.push({
      "vehicleDetails.vin":
        vin
    });
  }

  if (clauses.length === 0) {
    return [];
  }

  const query = {
    status: {
      $ne: "DISABLED"
    },

    $or: clauses
  };

  if (excludeProductId) {
    query._id = {
      $ne: excludeProductId
    };
  }

  return Product.find(query)
    .select(
      "_id title imei serialNumber vehicleDetails.vin seller status"
    )
    .lean();
};

/*
|--------------------------------------------------------------------------
| Crear producto
|--------------------------------------------------------------------------
*/

const createProduct = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (
      !userId ||
      !isValidObjectId(userId)
    ) {
      return res.status(401).json({
        success: false,
        message:
          "No se pudo identificar al vendedor."
      });
    }

    const {
      title,
      description,
      price,
      category,
      condition,
      quality,

      brand,
      model,
      serialNumber,
      imei,
      storageCapacity,
      ramMemory,
      batteryHealth,
      dimensions,
      accessoriesIncluded,

      vehicleDetails,
      clothingDetails,
      evidence,

      location,
      warranty,
      deliveryMethod,

      specialPriceReason,
      specialPriceExplanation,

      images,
      video
    } = req.body;

    const safeTitle =
      sanitizeText(
        title,
        120
      );

    const safeDescription =
      sanitizeText(
        description,
        2000
      );

    const numericPrice =
      Number(price);

    const safeCategory =
      sanitizePlainIdentifier(
        category,
        50
      );

    if (
      safeTitle.length < 5 ||
      safeDescription.length < 40 ||
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0 ||
      !safeCategory
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Título, descripción, precio y categoría son obligatorios."
      });
    }

    if (
      !ALLOWED_CATEGORIES.includes(
        safeCategory
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Categoría del producto no válida."
      });
    }

    if (
      condition &&
      !ALLOWED_CONDITIONS.includes(
        condition
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Condición del producto no válida."
      });
    }

    if (
      quality &&
      !ALLOWED_QUALITIES.includes(
        quality
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Calidad del producto no válida."
      });
    }

    if (
      deliveryMethod &&
      !ALLOWED_DELIVERY_METHODS.includes(
        deliveryMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Método de entrega no válido."
      });
    }

    if (
      specialPriceReason &&
      !ALLOWED_SPECIAL_PRICE_REASONS.includes(
        specialPriceReason
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Motivo de precio especial no válido."
      });
    }

    const safeImages =
      normalizeImages(images);

    if (safeImages.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Debes agregar al menos una imagen."
      });
    }

    const safeVideo =
      normalizeVideo(video);

    const safeBrand =
      sanitizeText(
        brand,
        80
      );

    const safeModel =
      sanitizeText(
        model,
        100
      );

    const safeSerialNumber =
      sanitizePlainIdentifier(
        serialNumber,
        120
      );

    const safeImei =
      String(imei || "")
        .replace(/\s+/g, "")
        .trim()
        .slice(0, 17);

    const safeVehicleDetails =
      normalizeVehicleDetails(
        vehicleDetails
      );

    const safeClothingDetails =
      normalizeClothingDetails(
        clothingDetails
      );

    const safeEvidence =
      normalizeEvidence(
        evidence
      );

    const technicalErrors =
      validateTechnicalFields({
        category:
          safeCategory,
        brand:
          safeBrand,
        model:
          safeModel,
        imei:
          safeImei,
        vehicleDetails:
          safeVehicleDetails,
        clothingDetails:
          safeClothingDetails
      });

    if (
      technicalErrors.length > 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          technicalErrors[0],
        errors:
          technicalErrors
      });
    }

    const conflicts =
      await findIdentifierConflicts({
        imei:
          safeImei,
        serialNumber:
          safeSerialNumber,
        vin:
          safeVehicleDetails.vin
      });

    const technicalScore =
      calculateTechnicalScore({
        brand:
          safeBrand,
        model:
          safeModel,
        serialNumber:
          safeSerialNumber,
        imei:
          safeImei,
        storageCapacity,
        ramMemory,
        batteryHealth,
        dimensions,
        accessoriesIncluded,
        vehicleDetails:
          safeVehicleDetails,
        clothingDetails:
          safeClothingDetails
      });

    const evidenceScore =
      calculateEvidenceScore({
        evidence:
          safeEvidence,
        serialNumber:
          safeSerialNumber,
        imei:
          safeImei,
        vin:
          safeVehicleDetails.vin
      });

    safeEvidence.evidenceScore =
      evidenceScore;

    const risk =
      calculateCategoryRisk({
        category:
          safeCategory,
        price:
          numericPrice
      });

    const analysis =
      calculatePublicationAnalysis({
        title:
          safeTitle,
        description:
          safeDescription,
        images:
          safeImages,
        video:
          safeVideo,
        price:
          numericPrice,
        quality:
          quality || "UNKNOWN",
        warranty:
          sanitizeText(
            warranty,
            160
          ),
        specialPriceReason:
          specialPriceReason ||
          "NONE",
        specialPriceExplanation:
          sanitizeText(
            specialPriceExplanation,
            500
          ),
        sellerTrustScore:
          req.user?.trustScore ||
          50,
        sellerVerified:
          Boolean(
            req.user?.isVerified
          ),
        technicalScore,
        evidenceScore
      });

    if (
      conflicts.length > 0
    ) {
      analysis.evidenceRequired.push(
        "Revisión manual: existe otro producto con un identificador coincidente."
      );

      analysis.confidenceScore =
        clampNumber(
          analysis.confidenceScore -
            20,
          0,
          100,
          0
        );

      analysis.aiAnalysis.confidenceScore =
        analysis.confidenceScore;

      analysis.aiAnalysis.fraudRiskScore =
        100 -
        analysis.confidenceScore;
    }

    let status =
      "ACTIVE";

    if (
      conflicts.length > 0 ||
      risk.riskLevel ===
        "CRITICAL"
    ) {
      status =
        "UNDER_REVIEW";
    }

    const product =
      await Product.create({
        title:
          safeTitle,

        description:
          safeDescription,

        price:
          numericPrice,

        category:
          safeCategory,

        condition:
          condition ||
          "USED_GOOD",

        quality:
          quality ||
          "UNKNOWN",

        brand:
          safeBrand,

        model:
          safeModel,

        serialNumber:
          safeSerialNumber,

        imei:
          safeImei,

        storageCapacity:
          sanitizeText(
            storageCapacity,
            80
          ),

        ramMemory:
          sanitizeText(
            ramMemory,
            60
          ),

        batteryHealth:
          sanitizeText(
            batteryHealth,
            60
          ),

        dimensions:
          sanitizeText(
            dimensions,
            100
          ),

        accessoriesIncluded:
          sanitizeText(
            accessoriesIncluded,
            300
          ),

        vehicleDetails:
          safeVehicleDetails,

        clothingDetails:
          safeClothingDetails,

        evidence:
          safeEvidence,

        location:
          sanitizeText(
            location,
            160
          ),

        warranty:
          sanitizeText(
            warranty,
            160
          ),

        deliveryMethod:
          deliveryMethod ||
          "",

        specialPriceReason:
          specialPriceReason ||
          "NONE",

        specialPriceExplanation:
          sanitizeText(
            specialPriceExplanation,
            500
          ),

        images:
          safeImages,

        video:
          safeVideo,

        seller:
          userId,

        status,

        riskLevel:
          risk.riskLevel,

        riskLabel:
          risk.riskLabel,

        riskScore:
          risk.riskScore,

        verificationMode:
          risk.verificationMode,

        publicationScore:
          analysis.publicationScore,

        publicationLevel:
          analysis.publicationLevel,

        confidenceScore:
          analysis.confidenceScore,

        saleProbability:
          analysis.saleProbability,

        estimatedSaleTime:
          analysis.estimatedSaleTime,

        aiAnalysis:
          analysis.aiAnalysis,

        evidenceRequired:
          analysis.evidenceRequired,

        isQsmVerified:
          analysis.confidenceScore >=
            85 &&
          conflicts.length === 0 &&
          risk.riskLevel !==
            "CRITICAL"
      });

    return res.status(201).json({
      success: true,

      message:
        status === "UNDER_REVIEW"
          ? "Producto creado y enviado a revisión QSM."
          : "Producto creado correctamente.",

      product,

      analysis: {
        identifierConflict:
          conflicts.length > 0,

        conflictCount:
          conflicts.length,

        riskLevel:
          product.riskLevel,

        confidenceScore:
          product.confidenceScore,

        publicationScore:
          product.publicationScore
      }
    });
  } catch (error) {
    console.error(
      "Error creando producto:",
      error
    );

    if (
      error?.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          Object.values(
            error.errors
          )[0]?.message ||
          "Los datos del producto no son válidos."
      });
    }

    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Ya existe un producto con uno de los identificadores proporcionados."
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Error creando producto.",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Obtener productos
|--------------------------------------------------------------------------
*/

const getProducts = async (
  req,
  res
) => {
  try {
    const filter = {
      status: {
        $in: [
          "ACTIVE",
          "SOLD"
        ]
      }
    };

    if (
      req.query.category &&
      ALLOWED_CATEGORIES.includes(
        req.query.category
      )
    ) {
      filter.category =
        req.query.category;
    }

    if (
      req.query.riskLevel &&
      [
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
        "UNCLASSIFIED"
      ].includes(
        req.query.riskLevel
      )
    ) {
      filter.riskLevel =
        req.query.riskLevel;
    }

    const products =
      await Product.find(filter)
        .populate(
          "seller",
          "firstName lastName email trustScore isVerified profilePhoto avatar verificationStatus"
        )
        .sort({
          createdAt: -1
        })
        .lean();

    return res.json({
      success: true,
      count:
        products.length,
      products
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "Error obteniendo productos.",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Obtener productos del usuario
|--------------------------------------------------------------------------
*/

const getMyProducts = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (
      !userId ||
      !isValidObjectId(userId)
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Usuario no autenticado."
      });
    }

    const products =
      await Product.find({
        seller:
          userId,

        status: {
          $ne:
            "DISABLED"
        }
      })
        .populate(
          "seller",
          "firstName lastName email trustScore isVerified profilePhoto avatar verificationStatus"
        )
        .sort({
          createdAt: -1
        })
        .lean();

    return res.json({
      success: true,
      count:
        products.length,
      products,
      myProducts:
        products
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "Error obteniendo tus productos.",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Obtener producto por ID
|--------------------------------------------------------------------------
*/

const getProductById = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "ID de producto no válido."
      });
    }

    const product =
      await Product.findById(id)
        .populate(
          "seller",
          "firstName lastName email trustScore isVerified profilePhoto avatar verificationStatus"
        )
        .lean();

    if (
      !product ||
      product.status ===
        "DISABLED"
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Producto no encontrado."
      });
    }

    return res.json({
      success: true,
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "Error obteniendo producto.",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Actualizar producto completo
|--------------------------------------------------------------------------
|
| Seguridad:
| - Solo propietario o administrador.
| - No permite cambiar seller, campos QSM, auditoría ni análisis desde cliente.
| - Recalcula riesgo, score, confianza, evidencias y estado de revisión.
|--------------------------------------------------------------------------
*/

const updateProduct = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID de producto no válido."
      });
    }

    const userId = getUserId(req);

    if (!userId || !isValidObjectId(userId)) {
      return res.status(401).json({
        success: false,
        message: "Usuario no autenticado."
      });
    }

    const product = await Product.findById(id).populate(
      "seller",
      "_id trustScore isVerified role"
    );

    if (!product || product.status === "DISABLED") {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado."
      });
    }

    const sellerId = product.seller?._id || product.seller;

    if (
      String(sellerId) !== String(userId) &&
      !isUserAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message: "No tienes permiso para editar esta publicación."
      });
    }

    const body = req.body && typeof req.body === "object"
      ? req.body
      : {};

    const safeTitle = sanitizeText(
      body.title !== undefined ? body.title : product.title,
      120
    );

    const safeDescription = sanitizeText(
      body.description !== undefined
        ? body.description
        : product.description,
      2000
    );

    const numericPrice = Number(
      body.price !== undefined ? body.price : product.price
    );

    const safeCategory = sanitizePlainIdentifier(
      body.category !== undefined
        ? body.category
        : product.category,
      50
    );

    const safeCondition =
      body.condition !== undefined
        ? body.condition
        : product.condition;

    const safeQuality =
      body.quality !== undefined
        ? body.quality
        : product.quality;

    const safeDeliveryMethod =
      body.deliveryMethod !== undefined
        ? body.deliveryMethod
        : product.deliveryMethod;

    const safeSpecialPriceReason =
      body.specialPriceReason !== undefined
        ? body.specialPriceReason
        : product.specialPriceReason;

    if (safeTitle.length < 5) {
      return res.status(400).json({
        success: false,
        message: "El título debe tener al menos 5 caracteres."
      });
    }

    if (safeDescription.length < 40) {
      return res.status(400).json({
        success: false,
        message: "La descripción debe tener al menos 40 caracteres."
      });
    }

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "El precio debe ser mayor que cero."
      });
    }

    if (!ALLOWED_CATEGORIES.includes(safeCategory)) {
      return res.status(400).json({
        success: false,
        message: "Categoría del producto no válida."
      });
    }

    if (!ALLOWED_CONDITIONS.includes(safeCondition)) {
      return res.status(400).json({
        success: false,
        message: "Condición del producto no válida."
      });
    }

    if (!ALLOWED_QUALITIES.includes(safeQuality)) {
      return res.status(400).json({
        success: false,
        message: "Calidad del producto no válida."
      });
    }

    if (!ALLOWED_DELIVERY_METHODS.includes(safeDeliveryMethod)) {
      return res.status(400).json({
        success: false,
        message: "Método de entrega no válido."
      });
    }

    if (
      !ALLOWED_SPECIAL_PRICE_REASONS.includes(
        safeSpecialPriceReason
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Motivo de precio especial no válido."
      });
    }

    const safeImages =
      body.images !== undefined
        ? normalizeImages(body.images)
        : normalizeImages(product.images);

    if (safeImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "El producto debe conservar al menos una imagen."
      });
    }

    const safeVideo =
      body.video !== undefined
        ? normalizeVideo(body.video)
        : normalizeVideo(product.video);

    const safeBrand = sanitizeText(
      body.brand !== undefined ? body.brand : product.brand,
      80
    );

    const safeModel = sanitizeText(
      body.model !== undefined ? body.model : product.model,
      100
    );

    const safeSerialNumber = sanitizePlainIdentifier(
      body.serialNumber !== undefined
        ? body.serialNumber
        : product.serialNumber,
      120
    );

    const safeImei = String(
      body.imei !== undefined ? body.imei : product.imei || ""
    )
      .replace(/\s+/g, "")
      .trim()
      .slice(0, 17);

    const safeVehicleDetails = normalizeVehicleDetails(
      body.vehicleDetails !== undefined
        ? body.vehicleDetails
        : product.vehicleDetails
    );

    const safeClothingDetails = normalizeClothingDetails(
      body.clothingDetails !== undefined
        ? body.clothingDetails
        : product.clothingDetails
    );

    const currentEvidence = product.evidence?.toObject
      ? product.evidence.toObject()
      : product.evidence || {};

    const safeEvidence = normalizeEvidence(
      body.evidence !== undefined
        ? body.evidence
        : currentEvidence
    );

    const technicalErrors = validateTechnicalFields({
      category: safeCategory,
      brand: safeBrand,
      model: safeModel,
      imei: safeImei,
      vehicleDetails: safeVehicleDetails,
      clothingDetails: safeClothingDetails
    });

    if (technicalErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: technicalErrors[0],
        errors: technicalErrors
      });
    }

    const conflicts = await findIdentifierConflicts({
      imei: safeImei,
      serialNumber: safeSerialNumber,
      vin: safeVehicleDetails.vin,
      excludeProductId: product._id
    });

    const safeLocation = sanitizeText(
      body.location !== undefined ? body.location : product.location,
      160
    );

    const safeWarranty = sanitizeText(
      body.warranty !== undefined ? body.warranty : product.warranty,
      160
    );

    const safeSpecialPriceExplanation = sanitizeText(
      body.specialPriceExplanation !== undefined
        ? body.specialPriceExplanation
        : product.specialPriceExplanation,
      500
    );

    const safeStorageCapacity = sanitizeText(
      body.storageCapacity !== undefined
        ? body.storageCapacity
        : product.storageCapacity,
      80
    );

    const safeRamMemory = sanitizeText(
      body.ramMemory !== undefined
        ? body.ramMemory
        : product.ramMemory,
      60
    );

    const safeBatteryHealth = sanitizeText(
      body.batteryHealth !== undefined
        ? body.batteryHealth
        : product.batteryHealth,
      60
    );

    const safeDimensions = sanitizeText(
      body.dimensions !== undefined
        ? body.dimensions
        : product.dimensions,
      100
    );

    const safeAccessoriesIncluded = sanitizeText(
      body.accessoriesIncluded !== undefined
        ? body.accessoriesIncluded
        : product.accessoriesIncluded,
      300
    );

    const technicalScore = calculateTechnicalScore({
      brand: safeBrand,
      model: safeModel,
      serialNumber: safeSerialNumber,
      imei: safeImei,
      storageCapacity: safeStorageCapacity,
      ramMemory: safeRamMemory,
      batteryHealth: safeBatteryHealth,
      dimensions: safeDimensions,
      accessoriesIncluded: safeAccessoriesIncluded,
      vehicleDetails: safeVehicleDetails,
      clothingDetails: safeClothingDetails
    });

    const evidenceScore = calculateEvidenceScore({
      evidence: safeEvidence,
      serialNumber: safeSerialNumber,
      imei: safeImei,
      vin: safeVehicleDetails.vin
    });

    safeEvidence.evidenceScore = evidenceScore;

    const risk = calculateCategoryRisk({
      category: safeCategory,
      price: numericPrice
    });

    const sellerTrustScore =
      product.seller?.trustScore ?? req.user?.trustScore ?? 50;

    const sellerVerified = Boolean(
      product.seller?.isVerified ?? req.user?.isVerified
    );

    const analysis = calculatePublicationAnalysis({
      title: safeTitle,
      description: safeDescription,
      images: safeImages,
      video: safeVideo,
      price: numericPrice,
      quality: safeQuality,
      warranty: safeWarranty,
      specialPriceReason: safeSpecialPriceReason,
      specialPriceExplanation: safeSpecialPriceExplanation,
      sellerTrustScore,
      sellerVerified,
      technicalScore,
      evidenceScore
    });

    if (conflicts.length > 0) {
      analysis.evidenceRequired.push(
        "Revisión manual: existe otro producto con un identificador coincidente."
      );

      analysis.confidenceScore = clampNumber(
        analysis.confidenceScore - 20,
        0,
        100,
        0
      );

      analysis.aiAnalysis.confidenceScore =
        analysis.confidenceScore;

      analysis.aiAnalysis.fraudRiskScore =
        100 - analysis.confidenceScore;
    }

    product.title = safeTitle;
    product.description = safeDescription;
    product.price = numericPrice;
    product.category = safeCategory;
    product.condition = safeCondition;
    product.quality = safeQuality;

    product.brand = safeBrand;
    product.model = safeModel;
    product.serialNumber = safeSerialNumber;
    product.imei = safeImei;
    product.storageCapacity = safeStorageCapacity;
    product.ramMemory = safeRamMemory;
    product.batteryHealth = safeBatteryHealth;
    product.dimensions = safeDimensions;
    product.accessoriesIncluded = safeAccessoriesIncluded;

    product.vehicleDetails = safeVehicleDetails;
    product.clothingDetails = safeClothingDetails;
    product.evidence = safeEvidence;

    product.location = safeLocation;
    product.warranty = safeWarranty;
    product.deliveryMethod = safeDeliveryMethod;

    product.specialPriceReason = safeSpecialPriceReason;
    product.specialPriceExplanation = safeSpecialPriceExplanation;

    product.images = safeImages;
    product.video = safeVideo;

    product.riskLevel = risk.riskLevel;
    product.riskLabel = risk.riskLabel;
    product.riskScore = risk.riskScore;
    product.verificationMode = risk.verificationMode;

    product.publicationScore = analysis.publicationScore;
    product.publicationLevel = analysis.publicationLevel;
    product.confidenceScore = analysis.confidenceScore;
    product.saleProbability = analysis.saleProbability;
    product.estimatedSaleTime = analysis.estimatedSaleTime;
    product.aiAnalysis = analysis.aiAnalysis;
    product.evidenceRequired = [...new Set(analysis.evidenceRequired)];

    product.isQsmVerified =
      analysis.confidenceScore >= 85 &&
      conflicts.length === 0 &&
      risk.riskLevel !== "CRITICAL";

    /*
    |--------------------------------------------------------------------------
    | No reactivar automáticamente productos vendidos o desactivados.
    | Solo ACTIVE/PENDING/UNDER_REVIEW se recalculan.
    |--------------------------------------------------------------------------
    */

    if (["ACTIVE", "PENDING", "UNDER_REVIEW"].includes(product.status)) {
      product.status =
        conflicts.length > 0 || risk.riskLevel === "CRITICAL"
          ? "UNDER_REVIEW"
          : "ACTIVE";
    }

    product.lastEditedAt = new Date();
    product.lastEditedBy = userId;

    await product.save();

    const populatedProduct = await Product.findById(product._id)
      .populate(
        "seller",
        "firstName lastName email trustScore isVerified profilePhoto avatar verificationStatus"
      )
      .lean();

    return res.json({
      success: true,
      message:
        product.status === "UNDER_REVIEW"
          ? "Producto actualizado y enviado a revisión QSM."
          : "Producto actualizado correctamente.",
      product: populatedProduct,
      analysis: {
        identifierConflict: conflicts.length > 0,
        conflictCount: conflicts.length,
        riskLevel: product.riskLevel,
        confidenceScore: product.confidenceScore,
        publicationScore: product.publicationScore
      }
    });
  } catch (error) {
    console.error("Error actualizando producto:", error);

    if (error?.name === "ValidationError") {
      const errors = Object.values(error.errors || {})
        .map((item) => item?.message)
        .filter(Boolean);

      return res.status(400).json({
        success: false,
        message: errors[0] || "Los datos del producto no son válidos.",
        errors
      });
    }

    if (error?.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: `El campo ${error.path || "indicado"} contiene un valor inválido.`
      });
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Ya existe un producto con uno de los identificadores proporcionados.",
        field: Object.keys(error.keyPattern || {})[0] || ""
      });
    }

    return res.status(500).json({
      success: false,
      message: "Error actualizando el producto.",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Mejorar evidencias
|--------------------------------------------------------------------------
*/

const improveProductEvidence = async (
  req,
  res
) => {
  try {
    const {
      productId
    } = req.params;

    if (
      !isValidObjectId(
        productId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "productId no es válido."
      });
    }

    const product =
      await Product.findById(
        productId
      ).populate(
        "seller",
        "trustScore isVerified"
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Producto no encontrado."
      });
    }

    const userId =
      getUserId(req);

    const sellerId =
      product.seller?._id ||
      product.seller;

    if (
      String(sellerId) !==
        String(userId) &&
      !isUserAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permiso para modificar este producto."
      });
    }

    const {
      images,
      video,
      quality,
      warranty,
      evidence,
      serialNumber,
      imei,
      vehicleDetails
    } = req.body;

    if (images !== undefined) {
      const safeImages =
        normalizeImages(images);

      if (
        safeImages.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "El producto debe conservar al menos una imagen."
        });
      }

      product.images =
        safeImages;
    }

    if (video !== undefined) {
      product.video =
        normalizeVideo(video);
    }

    if (quality !== undefined) {
      if (
        !ALLOWED_QUALITIES.includes(
          quality
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Calidad del producto no válida."
        });
      }

      product.quality =
        quality;
    }

    if (warranty !== undefined) {
      product.warranty =
        sanitizeText(
          warranty,
          160
        );
    }

    if (
      serialNumber !== undefined
    ) {
      product.serialNumber =
        sanitizePlainIdentifier(
          serialNumber,
          120
        );
    }

    if (imei !== undefined) {
      const safeImei =
        String(imei || "")
          .replace(/\s+/g, "")
          .trim()
          .slice(0, 17);

      if (
        safeImei &&
        !/^[0-9]{14,17}$/.test(
          safeImei
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "El IMEI debe contener entre 14 y 17 dígitos."
        });
      }

      product.imei =
        safeImei;
    }

    if (
      vehicleDetails !== undefined
    ) {
      product.vehicleDetails =
        normalizeVehicleDetails(
          vehicleDetails
        );
    }

    if (evidence !== undefined) {
      const safeEvidence =
        normalizeEvidence(evidence);

      product.evidence.hasInvoice =
        safeEvidence.hasInvoice;

      product.evidence.hasOriginalBox =
        safeEvidence.hasOriginalBox;

      product.evidence.acceptsPhysicalInspection =
        safeEvidence.acceptsPhysicalInspection;
    }

    const technicalScore =
      calculateTechnicalScore({
        brand:
          product.brand,
        model:
          product.model,
        serialNumber:
          product.serialNumber,
        imei:
          product.imei,
        storageCapacity:
          product.storageCapacity,
        ramMemory:
          product.ramMemory,
        batteryHealth:
          product.batteryHealth,
        dimensions:
          product.dimensions,
        accessoriesIncluded:
          product.accessoriesIncluded,
        vehicleDetails:
          product.vehicleDetails,
        clothingDetails:
          product.clothingDetails
      });

    const evidenceScore =
      calculateEvidenceScore({
        evidence:
          product.evidence,
        serialNumber:
          product.serialNumber,
        imei:
          product.imei,
        vin:
          product.vehicleDetails
            ?.vin
      });

    product.evidence.evidenceScore =
      evidenceScore;

    const risk =
      calculateCategoryRisk({
        category:
          product.category,
        price:
          product.price
      });

    const analysis =
      calculatePublicationAnalysis({
        title:
          product.title,
        description:
          product.description,
        images:
          product.images,
        video:
          product.video,
        price:
          product.price,
        quality:
          product.quality,
        warranty:
          product.warranty,
        specialPriceReason:
          product.specialPriceReason,
        specialPriceExplanation:
          product.specialPriceExplanation,
        sellerTrustScore:
          product.seller
            ?.trustScore ||
          50,
        sellerVerified:
          Boolean(
            product.seller
              ?.isVerified
          ),
        technicalScore,
        evidenceScore
      });

    product.riskLevel =
      risk.riskLevel;

    product.riskLabel =
      risk.riskLabel;

    product.riskScore =
      risk.riskScore;

    product.verificationMode =
      risk.verificationMode;

    product.publicationScore =
      analysis.publicationScore;

    product.publicationLevel =
      analysis.publicationLevel;

    product.confidenceScore =
      analysis.confidenceScore;

    product.saleProbability =
      analysis.saleProbability;

    product.estimatedSaleTime =
      analysis.estimatedSaleTime;

    product.aiAnalysis =
      analysis.aiAnalysis;

    product.evidenceRequired =
      analysis.evidenceRequired;

    product.isQsmVerified =
      analysis.confidenceScore >= 85 &&
      risk.riskLevel !==
        "CRITICAL";

    await product.save();

    return res.json({
      success: true,
      message:
        "Evidencias actualizadas correctamente.",
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "Error actualizando evidencias.",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
};

/*
|--------------------------------------------------------------------------
| Eliminación lógica
|--------------------------------------------------------------------------
*/

const deleteProduct = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "ID de producto no válido."
      });
    }

    const product =
      await Product.findById(id);

    if (
      !product ||
      product.status ===
        "DISABLED"
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Producto no encontrado."
      });
    }

    const userId =
      getUserId(req);

    const sellerId =
      product.seller?._id ||
      product.seller;

    if (
      String(sellerId) !==
        String(userId) &&
      !isUserAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permiso para eliminar esta publicación."
      });
    }

    product.status =
      "DISABLED";

    product.deletedAt =
      new Date();

    product.deletedBy =
      userId;

    await product.save();

    return res.json({
      success: true,
      message:
        "Publicación eliminada correctamente.",
      productId:
        id
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "Error eliminando la publicación.",
      error:
        process.env.NODE_ENV ===
        "production"
          ? undefined
          : error.message
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getMyProducts,
  getProductById,
  updateProduct,
  improveProductEvidence,
  deleteProduct
};