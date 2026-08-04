const validator = require("validator");
const prisma = require("../utils/prisma");

/*
|--------------------------------------------------------------------------
| Configuración y valores permitidos
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

const ALLOWED_RISK_LEVELS = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
  "UNCLASSIFIED"
];

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

const SELLER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  trustScore: true,
  isVerified: true,
  role: true,
  sellerEnabled: true,
  status: true
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

const parsePositiveInt = (value) => {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
};

const sanitizeText = (
  value,
  maxLength = 2000
) => {
  return validator.escape(
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

const isUserAdmin = (req) => {
  return [
    "ADMIN",
    "SENIOR_ADMIN",
    "SUPER_ADMIN"
  ].includes(req.user?.role) ||
    req.user?.isAdmin === true;
};

/*
|--------------------------------------------------------------------------
| Puente temporal de identidad
|--------------------------------------------------------------------------
|
| Auth todavía obtiene el usuario desde MongoDB.
| Product ya trabaja con PostgreSQL/Supabase.
|
| Primero intenta un ID entero y, si req.user contiene un ObjectId de Mongo,
| busca el usuario equivalente de Supabase mediante el correo.
|--------------------------------------------------------------------------
*/

const resolvePrismaUser = async (req) => {
  const possibleIds = [
    req.user?.id,
    req.user?.userId,
    req.user?._id
  ];

  for (const possibleId of possibleIds) {
    const numericId = parsePositiveInt(possibleId);

    if (numericId) {
      const userById = await prisma.user.findUnique({
        where: {
          id: numericId
        }
      });

      if (userById) {
        return userById;
      }
    }
  }

  const email = String(
    req.user?.email || ""
  )
    .trim()
    .toLowerCase();

  if (!email) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      email
    }
  });
};

const serializeSeller = (seller) => {
  if (!seller) {
    return null;
  }

  return {
    ...seller,
    _id: String(seller.id),
    profilePhoto: null,
    avatar: null,
    verificationStatus:
      seller.isVerified
        ? "APPROVED"
        : "PENDING"
  };
};

const serializeProduct = (product) => {
  if (!product) {
    return null;
  }

  return {
    ...product,
    _id: String(product.id),
    seller: serializeSeller(
      product.seller
    )
  };
};

const createProductInclude = {
  seller: {
    select: SELLER_SELECT
  }
};

/*
|--------------------------------------------------------------------------
| Normalización
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

const normalizeVideo = (video) => {
  if (
    !video ||
    typeof video !== "object" ||
    Array.isArray(video)
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

const normalizeVehicleDetails = (
  vehicleDetails
) => {
  const source =
    vehicleDetails &&
    typeof vehicleDetails === "object" &&
    !Array.isArray(vehicleDetails)
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

const normalizeClothingDetails = (
  clothingDetails
) => {
  const source =
    clothingDetails &&
    typeof clothingDetails === "object" &&
    !Array.isArray(clothingDetails)
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

const normalizeEvidence = (evidence) => {
  const source =
    evidence &&
    typeof evidence === "object" &&
    !Array.isArray(evidence)
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
      ),

    evidenceScore:
      clampNumber(
        source.evidenceScore,
        0,
        100,
        0
      )
  };
};

/*
|--------------------------------------------------------------------------
| Validaciones y análisis
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
| Identificadores y código QSM
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
      vehicleDetails: {
        path: ["vin"],
        equals: vin
      }
    });
  }

  if (clauses.length === 0) {
    return [];
  }

  const where = {
    status: {
      not: "DISABLED"
    },
    OR: clauses
  };

  const excludedId =
    parsePositiveInt(
      excludeProductId
    );

  if (excludedId) {
    where.id = {
      not: excludedId
    };
  }

  return prisma.product.findMany({
    where,
    select: {
      id: true,
      title: true,
      imei: true,
      serialNumber: true,
      vehicleDetails: true,
      sellerId: true,
      status: true
    }
  });
};

const createQsmCodePrefix = (
  category
) => {
  const normalized = String(
    category || "QSM"
  )
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9]/g,
      ""
    )
    .toUpperCase();

  return (
    normalized.slice(0, 4) ||
    "QSM"
  );
};

const generateUniqueQsmCode = async (
  category
) => {
  const prefix =
    createQsmCodePrefix(category);

  for (
    let attempt = 0;
    attempt < 10;
    attempt += 1
  ) {
    const code = [
      "QSM",
      prefix,
      Date.now()
        .toString(36)
        .toUpperCase(),
      Math.random()
        .toString(36)
        .slice(2, 7)
        .toUpperCase()
    ].join("-");

    const exists =
      await prisma.product.findUnique({
        where: {
          qsmCode: code
        },
        select: {
          id: true
        }
      });

    if (!exists) {
      return code;
    }
  }

  throw new Error(
    "No se pudo generar un código QSM único."
  );
};

/*
|--------------------------------------------------------------------------
| Respuestas de error Prisma
|--------------------------------------------------------------------------
*/

const sendControllerError = (
  res,
  error,
  defaultMessage
) => {
  console.error(
    defaultMessage,
    error
  );

  if (error?.code === "P2002") {
    return res.status(409).json({
      success: false,
      message:
        "Ya existe un producto con uno de los identificadores proporcionados.",
      fields:
        error?.meta?.target || []
    });
  }

  if (error?.code === "P2025") {
    return res.status(404).json({
      success: false,
      message:
        "Producto no encontrado."
    });
  }

  if (error?.code === "P2003") {
    return res.status(409).json({
      success: false,
      message:
        "La operación viola una relación existente del producto."
    });
  }

  return res.status(500).json({
    success: false,
    message:
      defaultMessage,
    error:
      process.env.NODE_ENV ===
      "production"
        ? undefined
        : error.message
  });
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
    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "El usuario autenticado todavía no existe en Supabase."
      });
    }

    if (
      prismaUser.sellerEnabled === false
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Tu cuenta no tiene habilitada la función de vendedor."
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
      video,
      photoHash
    } = req.body || {};

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

    const safeCondition =
      condition || "USED_GOOD";

    const safeQuality =
      quality || "UNKNOWN";

    const safeDeliveryMethod =
      deliveryMethod || "";

    const safeSpecialPriceReason =
      specialPriceReason || "NONE";

    if (
      !ALLOWED_CONDITIONS.includes(
        safeCondition
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Condición del producto no válida."
      });
    }

    if (
      !ALLOWED_QUALITIES.includes(
        safeQuality
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Calidad del producto no válida."
      });
    }

    if (
      !ALLOWED_DELIVERY_METHODS.includes(
        safeDeliveryMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Método de entrega no válido."
      });
    }

    if (
      !ALLOWED_SPECIAL_PRICE_REASONS.includes(
        safeSpecialPriceReason
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

    const safeStorageCapacity =
      sanitizeText(
        storageCapacity,
        80
      );

    const safeRamMemory =
      sanitizeText(
        ramMemory,
        60
      );

    const safeBatteryHealth =
      sanitizeText(
        batteryHealth,
        60
      );

    const safeDimensions =
      sanitizeText(
        dimensions,
        100
      );

    const safeAccessoriesIncluded =
      sanitizeText(
        accessoriesIncluded,
        300
      );

    const safeLocation =
      sanitizeText(
        location,
        160
      );

    const safeWarranty =
      sanitizeText(
        warranty,
        160
      );

    const safeSpecialPriceExplanation =
      sanitizeText(
        specialPriceExplanation,
        500
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
        storageCapacity:
          safeStorageCapacity,
        ramMemory:
          safeRamMemory,
        batteryHealth:
          safeBatteryHealth,
        dimensions:
          safeDimensions,
        accessoriesIncluded:
          safeAccessoriesIncluded,
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
          safeQuality,
        warranty:
          safeWarranty,
        specialPriceReason:
          safeSpecialPriceReason,
        specialPriceExplanation:
          safeSpecialPriceExplanation,
        sellerTrustScore:
          prismaUser.trustScore ||
          50,
        sellerVerified:
          Boolean(
            prismaUser.isVerified
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

    const status =
      conflicts.length > 0 ||
      risk.riskLevel ===
        "CRITICAL"
        ? "UNDER_REVIEW"
        : "ACTIVE";

    const qsmCode =
      await generateUniqueQsmCode(
        safeCategory
      );

    const product =
      await prisma.product.create({
        data: {
          title:
            safeTitle,

          description:
            safeDescription,

          price:
            numericPrice,

          category:
            safeCategory,

          condition:
            safeCondition,

          quality:
            safeQuality,

          brand:
            safeBrand,

          model:
            safeModel,

          serialNumber:
            safeSerialNumber,

          imei:
            safeImei,

          storageCapacity:
            safeStorageCapacity,

          ramMemory:
            safeRamMemory,

          batteryHealth:
            safeBatteryHealth,

          dimensions:
            safeDimensions,

          accessoriesIncluded:
            safeAccessoriesIncluded,

          vehicleDetails:
            safeVehicleDetails,

          clothingDetails:
            safeClothingDetails,

          evidence:
            safeEvidence,

          evidenceRequired: [
            ...new Set(
              analysis.evidenceRequired
            )
          ],

          location:
            safeLocation,

          warranty:
            safeWarranty,

          deliveryMethod:
            safeDeliveryMethod,

          specialPriceReason:
            safeSpecialPriceReason,

          specialPriceExplanation:
            safeSpecialPriceExplanation,

          imageUrl:
            safeImages[0] || null,

          images:
            safeImages,

          video:
            safeVideo,

          photoHash:
            photoHash
              ? sanitizePlainIdentifier(
                  photoHash,
                  255
                )
              : null,

          qsmCode,

          verificationStatus:
            "PENDING",

          verificationMode:
            risk.verificationMode,

          cameraRequired:
            true,

          certified:
            false,

          isQsmVerified:
            analysis.confidenceScore >=
              85 &&
            conflicts.length === 0 &&
            risk.riskLevel !==
              "CRITICAL",

          status,

          riskLevel:
            risk.riskLevel,

          riskLabel:
            risk.riskLabel,

          riskScore:
            Math.round(
              risk.riskScore
            ),

          publicationScore:
            Math.round(
              analysis.publicationScore
            ),

          publicationLevel:
            analysis.publicationLevel,

          confidenceScore:
            Math.round(
              analysis.confidenceScore
            ),

          saleProbability:
            Math.round(
              analysis.saleProbability
            ),

          estimatedSaleTime:
            analysis.estimatedSaleTime,

          aiAnalysis:
            analysis.aiAnalysis,

          sellerId:
            prismaUser.id
        },
        include:
          createProductInclude
      });

    return res.status(201).json({
      success: true,

      message:
        status === "UNDER_REVIEW"
          ? "Producto creado y enviado a revisión QSM."
          : "Producto creado correctamente.",

      product:
        serializeProduct(product),

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
    return sendControllerError(
      res,
      error,
      "Error creando producto."
    );
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
    const where = {
      status: {
        in: [
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
      where.category =
        req.query.category;
    }

    if (
      req.query.riskLevel &&
      ALLOWED_RISK_LEVELS.includes(
        req.query.riskLevel
      )
    ) {
      where.riskLevel =
        req.query.riskLevel;
    }

    const products =
      await prisma.product.findMany({
        where,
        orderBy: {
          createdAt: "desc"
        },
        include:
          createProductInclude
      });

    const serializedProducts =
      products.map(
        serializeProduct
      );

    return res.json({
      success: true,
      count:
        serializedProducts.length,
      products:
        serializedProducts
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Error obteniendo productos."
    );
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
    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "El usuario autenticado todavía no existe en Supabase."
      });
    }

    const products =
      await prisma.product.findMany({
        where: {
          sellerId:
            prismaUser.id,
          status: {
            not:
              "DISABLED"
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        include:
          createProductInclude
      });

    const serializedProducts =
      products.map(
        serializeProduct
      );

    return res.json({
      success: true,
      count:
        serializedProducts.length,
      products:
        serializedProducts,
      myProducts:
        serializedProducts
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Error obteniendo tus productos."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Obtener producto por ID
|--------------------------------------------------------------------------
*/


const getProductHistory = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "ID de producto no valido."
      });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: SELLER_SELECT
        },
        orders: {
          orderBy: { createdAt: "asc" },
          include: {
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                isVerified: true,
                trustScore: true
              }
            },
            payments: {
              orderBy: { createdAt: "asc" }
            },
            shipping: true,
            dispute: true
          }
        }
      }
    });

    if (!product || product.status === "DISABLED") {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado."
      });
    }

    const vehicleDetails =
      product.vehicleDetails &&
      typeof product.vehicleDetails === "object" &&
      !Array.isArray(product.vehicleDetails)
        ? product.vehicleDetails
        : {};

    const duplicateClauses = [];

    if (product.imei) {
      duplicateClauses.push({ imei: product.imei });
    }

    if (product.serialNumber) {
      duplicateClauses.push({
        serialNumber: product.serialNumber
      });
    }

    if (product.photoHash) {
      duplicateClauses.push({
        photoHash: product.photoHash
      });
    }

    if (vehicleDetails.vin) {
      duplicateClauses.push({
        vehicleDetails: {
          path: ["vin"],
          equals: vehicleDetails.vin
        }
      });
    }

    const duplicates = duplicateClauses.length
      ? await prisma.product.findMany({
          where: {
            id: { not: product.id },
            status: { not: "DISABLED" },
            OR: duplicateClauses
          },
          select: {
            id: true,
            title: true,
            qsmCode: true,
            status: true,
            imei: true,
            serialNumber: true,
            photoHash: true,
            vehicleDetails: true,
            createdAt: true
          },
          orderBy: { createdAt: "desc" },
          take: 10
        })
      : [];

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: {
          in: ["PRODUCT", "Product", "product"]
        },
        entityId: String(product.id)
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        actorName: true,
        actorRole: true,
        module: true,
        action: true,
        description: true,
        severity: true,
        status: true,
        createdAt: true
      }
    });

    const timeline = [];

    const addEvent = ({
      type,
      title,
      description,
      date,
      status = "INFO",
      source = "QSM",
      metadata = {}
    }) => {
      if (!date) return;

      timeline.push({
        type,
        title,
        description,
        date,
        status,
        source,
        metadata
      });
    };

    addEvent({
      type: "PRODUCT_CREATED",
      title: "Producto publicado",
      description: "La publicacion fue creada en Quick Secure Market.",
      date: product.createdAt,
      status: product.status,
      metadata: { qsmCode: product.qsmCode }
    });

    if (product.lastEditedAt) {
      addEvent({
        type: "PRODUCT_EDITED",
        title: "Producto actualizado",
        description: "La informacion o las evidencias fueron modificadas.",
        date: product.lastEditedAt,
        status: "UPDATED",
        metadata: { editedBy: product.lastEditedBy }
      });
    }

    if (product.isQsmVerified) {
      addEvent({
        type: "PRODUCT_VERIFIED",
        title: "Verificacion QSM registrada",
        description: "El producto alcanzo los criterios actuales de verificacion.",
        date: product.updatedAt,
        status: "VERIFIED"
      });
    }

    for (const order of product.orders) {
      addEvent({
        type: "ORDER_CREATED",
        title: "Compra iniciada",
        description: "Se creo la orden " + (order.orderCode || "#" + order.id) + ".",
        date: order.createdAt,
        status: order.status,
        source: "ORDER",
        metadata: {
          orderId: order.id,
          buyer: order.buyer
            ? [order.buyer.firstName, order.buyer.lastName].filter(Boolean).join(" ")
            : "",
          amount: order.totalAmount
        }
      });

      if (order.paymentConfirmedAt) {
        addEvent({
          type: "PAYMENT_CONFIRMED",
          title: "Pago validado",
          description: "El pago de la orden fue confirmado.",
          date: order.paymentConfirmedAt,
          status: order.paymentStatus,
          source: "PAYMENT",
          metadata: {
            orderId: order.id,
            method: order.paymentMethod,
            amount: order.totalAmount
          }
        });
      }

      if (order.warehouseReceivedAt) {
        addEvent({
          type: "WAREHOUSE_RECEIVED",
          title: "Recibido en almacen",
          description: "QSM registro la recepcion fisica del producto.",
          date: order.warehouseReceivedAt,
          status: order.warehouseStatus,
          source: "WAREHOUSE"
        });
      }

      if (order.outForDeliveryAt) {
        addEvent({
          type: "OUT_FOR_DELIVERY",
          title: "Producto en ruta",
          description: "La entrega fue despachada.",
          date: order.outForDeliveryAt,
          status: order.deliveryStatus,
          source: "SHIPPING"
        });
      }

      if (order.deliveredAt) {
        addEvent({
          type: "DELIVERED",
          title: "Producto entregado",
          description: "La entrega fue confirmada.",
          date: order.deliveredAt,
          status: order.deliveryStatus,
          source: "SHIPPING"
        });
      }

      if (order.completedAt) {
        addEvent({
          type: "ORDER_COMPLETED",
          title: "Compra completada",
          description: "La operacion fue cerrada correctamente.",
          date: order.completedAt,
          status: order.status,
          source: "ORDER"
        });
      }

      if (order.cancelledAt) {
        addEvent({
          type: "ORDER_CANCELLED",
          title: "Compra cancelada",
          description: order.cancellationReason || "La operacion fue cancelada.",
          date: order.cancelledAt,
          status: "CANCELLED",
          source: "ORDER"
        });
      }

      if (order.dispute) {
        addEvent({
          type: "DISPUTE_OPENED",
          title: "Disputa abierta",
          description: order.dispute.reason || "Se abrio una disputa.",
          date: order.dispute.createdAt,
          status: order.dispute.status,
          source: "DISPUTE",
          metadata: {
            disputeId: order.dispute.id,
            disputeCode: order.dispute.disputeCode
          }
        });

        if (order.dispute.resolvedAt || order.dispute.closedAt) {
          addEvent({
            type: "DISPUTE_RESOLVED",
            title: "Disputa resuelta",
            description: order.dispute.resolution || "La disputa fue cerrada.",
            date: order.dispute.closedAt || order.dispute.resolvedAt,
            status: order.dispute.status,
            source: "DISPUTE"
          });
        }
      }
    }

    for (const log of auditLogs) {
      addEvent({
        type: "AUDIT_" + String(log.action || "EVENT").toUpperCase(),
        title: log.action || "Actividad auditada",
        description: log.description || "QSM registro una accion.",
        date: log.createdAt,
        status: log.status,
        source: log.module || "AUDIT",
        metadata: {
          actorName: log.actorName,
          actorRole: log.actorRole,
          severity: log.severity
        }
      });
    }

    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));

    const duplicateMatches = duplicates.map((item) => {
      const itemVehicle =
        item.vehicleDetails &&
        typeof item.vehicleDetails === "object" &&
        !Array.isArray(item.vehicleDetails)
          ? item.vehicleDetails
          : {};

      const reasons = [];

      if (product.imei && item.imei === product.imei) reasons.push("IMEI");
      if (product.serialNumber && item.serialNumber === product.serialNumber) {
        reasons.push("NUMERO_DE_SERIE");
      }
      if (product.photoHash && item.photoHash === product.photoHash) {
        reasons.push("PHOTO_HASH");
      }
      if (vehicleDetails.vin && itemVehicle.vin === vehicleDetails.vin) {
        reasons.push("VIN");
      }

      return { ...item, reasons };
    });

    const images = [
      ...(Array.isArray(product.images) ? product.images : []),
      product.imageUrl
    ].filter(Boolean);

    return res.json({
      success: true,
      history: {
        product: {
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.price,
          category: product.category,
          condition: product.condition,
          quality: product.quality,
          brand: product.brand,
          model: product.model,
          qsmCode: product.qsmCode,
          previousQsmCode: product.previousQsmCode,
          serialNumber: product.serialNumber,
          imei: product.imei,
          vehicleDetails,
          status: product.status,
          verificationStatus: product.verificationStatus,
          verificationMode: product.verificationMode,
          isQsmVerified: product.isQsmVerified,
          certified: product.certified,
          riskLevel: product.riskLevel,
          riskLabel: product.riskLabel,
          riskScore: product.riskScore,
          confidenceScore: product.confidenceScore,
          publicationScore: product.publicationScore,
          publicationLevel: product.publicationLevel,
          aiAnalysis: product.aiAnalysis,
          evidence: product.evidence,
          evidenceRequired: product.evidenceRequired,
          images: [...new Set(images)],
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          lastEditedAt: product.lastEditedAt,
          seller: serializeSeller(product.seller)
        },
        timeline,
        duplicates: {
          status: duplicateMatches.length ? "POSSIBLE_DUPLICATE" : "NO_MATCHES",
          count: duplicateMatches.length,
          matches: duplicateMatches
        },
        summary: {
          totalEvents: timeline.length,
          totalOrders: product.orders.length,
          completedOrders: product.orders.filter((item) => item.status === "COMPLETED").length,
          disputes: product.orders.filter((item) => Boolean(item.dispute)).length,
          images: [...new Set(images)].length
        }
      }
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Error obteniendo el historial del producto."
    );
  }
};

const getProductById = async (
  req,
  res
) => {
  try {
    const id =
      parsePositiveInt(
        req.params.id
      );

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "ID de producto no válido."
      });
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id
        },
        include:
          createProductInclude
      });

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
      product:
        serializeProduct(product)
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Error obteniendo producto."
    );
  }
};

/*
|--------------------------------------------------------------------------
| Actualizar producto completo
|--------------------------------------------------------------------------
*/

const updateProduct = async (
  req,
  res
) => {
  try {
    const id =
      parsePositiveInt(
        req.params.id
      );

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "ID de producto no válido."
      });
    }

    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "El usuario autenticado todavía no existe en Supabase."
      });
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id
        },
        include:
          createProductInclude
      });

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

    if (
      product.sellerId !==
        prismaUser.id &&
      !isUserAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permiso para editar esta publicación."
      });
    }

    const body =
      req.body &&
      typeof req.body === "object"
        ? req.body
        : {};

    const safeTitle =
      sanitizeText(
        body.title !== undefined
          ? body.title
          : product.title,
        120
      );

    const safeDescription =
      sanitizeText(
        body.description !== undefined
          ? body.description
          : product.description,
        2000
      );

    const numericPrice =
      Number(
        body.price !== undefined
          ? body.price
          : product.price
      );

    const safeCategory =
      sanitizePlainIdentifier(
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
        message:
          "El título debe tener al menos 5 caracteres."
      });
    }

    if (
      safeDescription.length < 40
    ) {
      return res.status(400).json({
        success: false,
        message:
          "La descripción debe tener al menos 40 caracteres."
      });
    }

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El precio debe ser mayor que cero."
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
      !ALLOWED_CONDITIONS.includes(
        safeCondition
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Condición del producto no válida."
      });
    }

    if (
      !ALLOWED_QUALITIES.includes(
        safeQuality
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Calidad del producto no válida."
      });
    }

    if (
      !ALLOWED_DELIVERY_METHODS.includes(
        safeDeliveryMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Método de entrega no válido."
      });
    }

    if (
      !ALLOWED_SPECIAL_PRICE_REASONS.includes(
        safeSpecialPriceReason
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Motivo de precio especial no válido."
      });
    }

    const safeImages =
      body.images !== undefined
        ? normalizeImages(
            body.images
          )
        : normalizeImages(
            product.images
          );

    if (safeImages.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "El producto debe conservar al menos una imagen."
      });
    }

    const safeVideo =
      body.video !== undefined
        ? normalizeVideo(
            body.video
          )
        : normalizeVideo(
            product.video
          );

    const safeBrand =
      sanitizeText(
        body.brand !== undefined
          ? body.brand
          : product.brand,
        80
      );

    const safeModel =
      sanitizeText(
        body.model !== undefined
          ? body.model
          : product.model,
        100
      );

    const safeSerialNumber =
      sanitizePlainIdentifier(
        body.serialNumber !== undefined
          ? body.serialNumber
          : product.serialNumber,
        120
      );

    const safeImei =
      String(
        body.imei !== undefined
          ? body.imei
          : product.imei || ""
      )
        .replace(/\s+/g, "")
        .trim()
        .slice(0, 17);

    const safeVehicleDetails =
      normalizeVehicleDetails(
        body.vehicleDetails !== undefined
          ? body.vehicleDetails
          : product.vehicleDetails
      );

    const safeClothingDetails =
      normalizeClothingDetails(
        body.clothingDetails !== undefined
          ? body.clothingDetails
          : product.clothingDetails
      );

    const safeEvidence =
      normalizeEvidence(
        body.evidence !== undefined
          ? body.evidence
          : product.evidence
      );

    const safeLocation =
      sanitizeText(
        body.location !== undefined
          ? body.location
          : product.location,
        160
      );

    const safeWarranty =
      sanitizeText(
        body.warranty !== undefined
          ? body.warranty
          : product.warranty,
        160
      );

    const safeSpecialPriceExplanation =
      sanitizeText(
        body.specialPriceExplanation !==
          undefined
          ? body.specialPriceExplanation
          : product.specialPriceExplanation,
        500
      );

    const safeStorageCapacity =
      sanitizeText(
        body.storageCapacity !== undefined
          ? body.storageCapacity
          : product.storageCapacity,
        80
      );

    const safeRamMemory =
      sanitizeText(
        body.ramMemory !== undefined
          ? body.ramMemory
          : product.ramMemory,
        60
      );

    const safeBatteryHealth =
      sanitizeText(
        body.batteryHealth !== undefined
          ? body.batteryHealth
          : product.batteryHealth,
        60
      );

    const safeDimensions =
      sanitizeText(
        body.dimensions !== undefined
          ? body.dimensions
          : product.dimensions,
        100
      );

    const safeAccessoriesIncluded =
      sanitizeText(
        body.accessoriesIncluded !==
          undefined
          ? body.accessoriesIncluded
          : product.accessoriesIncluded,
        300
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
          safeVehicleDetails.vin,
        excludeProductId:
          product.id
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
        storageCapacity:
          safeStorageCapacity,
        ramMemory:
          safeRamMemory,
        batteryHealth:
          safeBatteryHealth,
        dimensions:
          safeDimensions,
        accessoriesIncluded:
          safeAccessoriesIncluded,
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
          safeQuality,
        warranty:
          safeWarranty,
        specialPriceReason:
          safeSpecialPriceReason,
        specialPriceExplanation:
          safeSpecialPriceExplanation,
        sellerTrustScore:
          product.seller?.trustScore ??
          prismaUser.trustScore ??
          50,
        sellerVerified:
          Boolean(
            product.seller?.isVerified ??
            prismaUser.isVerified
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

    let nextStatus =
      product.status;

    if (
      [
        "ACTIVE",
        "PENDING",
        "UNDER_REVIEW"
      ].includes(product.status)
    ) {
      nextStatus =
        conflicts.length > 0 ||
        risk.riskLevel ===
          "CRITICAL"
          ? "UNDER_REVIEW"
          : "ACTIVE";
    }

    const updatedProduct =
      await prisma.product.update({
        where: {
          id
        },
        data: {
          title:
            safeTitle,

          description:
            safeDescription,

          price:
            numericPrice,

          category:
            safeCategory,

          condition:
            safeCondition,

          quality:
            safeQuality,

          brand:
            safeBrand,

          model:
            safeModel,

          serialNumber:
            safeSerialNumber,

          imei:
            safeImei,

          storageCapacity:
            safeStorageCapacity,

          ramMemory:
            safeRamMemory,

          batteryHealth:
            safeBatteryHealth,

          dimensions:
            safeDimensions,

          accessoriesIncluded:
            safeAccessoriesIncluded,

          vehicleDetails:
            safeVehicleDetails,

          clothingDetails:
            safeClothingDetails,

          evidence:
            safeEvidence,

          evidenceRequired: [
            ...new Set(
              analysis.evidenceRequired
            )
          ],

          location:
            safeLocation,

          warranty:
            safeWarranty,

          deliveryMethod:
            safeDeliveryMethod,

          specialPriceReason:
            safeSpecialPriceReason,

          specialPriceExplanation:
            safeSpecialPriceExplanation,

          imageUrl:
            safeImages[0] || null,

          images:
            safeImages,

          video:
            safeVideo,

          riskLevel:
            risk.riskLevel,

          riskLabel:
            risk.riskLabel,

          riskScore:
            Math.round(
              risk.riskScore
            ),

          verificationMode:
            risk.verificationMode,

          publicationScore:
            Math.round(
              analysis.publicationScore
            ),

          publicationLevel:
            analysis.publicationLevel,

          confidenceScore:
            Math.round(
              analysis.confidenceScore
            ),

          saleProbability:
            Math.round(
              analysis.saleProbability
            ),

          estimatedSaleTime:
            analysis.estimatedSaleTime,

          aiAnalysis:
            analysis.aiAnalysis,

          isQsmVerified:
            analysis.confidenceScore >=
              85 &&
            conflicts.length === 0 &&
            risk.riskLevel !==
              "CRITICAL",

          status:
            nextStatus,

          lastEditedAt:
            new Date(),

          lastEditedBy:
            prismaUser.id
        },
        include:
          createProductInclude
      });

    return res.json({
      success: true,

      message:
        updatedProduct.status ===
        "UNDER_REVIEW"
          ? "Producto actualizado y enviado a revisión QSM."
          : "Producto actualizado correctamente.",

      product:
        serializeProduct(
          updatedProduct
        ),

      analysis: {
        identifierConflict:
          conflicts.length > 0,

        conflictCount:
          conflicts.length,

        riskLevel:
          updatedProduct.riskLevel,

        confidenceScore:
          updatedProduct.confidenceScore,

        publicationScore:
          updatedProduct.publicationScore
      }
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Error actualizando el producto."
    );
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
    const productId =
      parsePositiveInt(
        req.params.productId
      );

    if (!productId) {
      return res.status(400).json({
        success: false,
        message:
          "productId no es válido."
      });
    }

    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "El usuario autenticado todavía no existe en Supabase."
      });
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id:
            productId
        },
        include:
          createProductInclude
      });

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

    if (
      product.sellerId !==
        prismaUser.id &&
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
    } = req.body || {};

    const nextImages =
      images !== undefined
        ? normalizeImages(images)
        : normalizeImages(
            product.images
          );

    if (nextImages.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "El producto debe conservar al menos una imagen."
      });
    }

    const nextVideo =
      video !== undefined
        ? normalizeVideo(video)
        : normalizeVideo(
            product.video
          );

    const nextQuality =
      quality !== undefined
        ? quality
        : product.quality;

    if (
      !ALLOWED_QUALITIES.includes(
        nextQuality
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Calidad del producto no válida."
      });
    }

    const nextWarranty =
      warranty !== undefined
        ? sanitizeText(
            warranty,
            160
          )
        : product.warranty;

    const nextSerialNumber =
      serialNumber !== undefined
        ? sanitizePlainIdentifier(
            serialNumber,
            120
          )
        : product.serialNumber;

    const nextImei =
      String(
        imei !== undefined
          ? imei
          : product.imei || ""
      )
        .replace(/\s+/g, "")
        .trim()
        .slice(0, 17);

    if (
      nextImei &&
      !/^[0-9]{14,17}$/.test(
        nextImei
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El IMEI debe contener entre 14 y 17 dígitos."
      });
    }

    const nextVehicleDetails =
      vehicleDetails !== undefined
        ? normalizeVehicleDetails(
            vehicleDetails
          )
        : normalizeVehicleDetails(
            product.vehicleDetails
          );

    const currentEvidence =
      normalizeEvidence(
        product.evidence
      );

    const submittedEvidence =
      evidence !== undefined
        ? normalizeEvidence(evidence)
        : currentEvidence;

    const nextEvidence = {
      ...currentEvidence,
      hasInvoice:
        submittedEvidence.hasInvoice,
      hasOriginalBox:
        submittedEvidence.hasOriginalBox,
      acceptsPhysicalInspection:
        submittedEvidence
          .acceptsPhysicalInspection
    };

    const conflicts =
      await findIdentifierConflicts({
        imei:
          nextImei,
        serialNumber:
          nextSerialNumber,
        vin:
          nextVehicleDetails.vin,
        excludeProductId:
          product.id
      });

    const technicalScore =
      calculateTechnicalScore({
        brand:
          product.brand,
        model:
          product.model,
        serialNumber:
          nextSerialNumber,
        imei:
          nextImei,
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
          nextVehicleDetails,
        clothingDetails:
          product.clothingDetails
      });

    const evidenceScore =
      calculateEvidenceScore({
        evidence:
          nextEvidence,
        serialNumber:
          nextSerialNumber,
        imei:
          nextImei,
        vin:
          nextVehicleDetails.vin
      });

    nextEvidence.evidenceScore =
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
          nextImages,
        video:
          nextVideo,
        price:
          product.price,
        quality:
          nextQuality,
        warranty:
          nextWarranty,
        specialPriceReason:
          product.specialPriceReason,
        specialPriceExplanation:
          product.specialPriceExplanation,
        sellerTrustScore:
          product.seller?.trustScore ||
          50,
        sellerVerified:
          Boolean(
            product.seller?.isVerified
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

    let nextStatus =
      product.status;

    if (
      [
        "ACTIVE",
        "PENDING",
        "UNDER_REVIEW"
      ].includes(product.status)
    ) {
      nextStatus =
        conflicts.length > 0 ||
        risk.riskLevel ===
          "CRITICAL"
          ? "UNDER_REVIEW"
          : "ACTIVE";
    }

    const updatedProduct =
      await prisma.product.update({
        where: {
          id:
            productId
        },
        data: {
          images:
            nextImages,

          imageUrl:
            nextImages[0] || null,

          video:
            nextVideo,

          quality:
            nextQuality,

          warranty:
            nextWarranty,

          serialNumber:
            nextSerialNumber,

          imei:
            nextImei,

          vehicleDetails:
            nextVehicleDetails,

          evidence:
            nextEvidence,

          riskLevel:
            risk.riskLevel,

          riskLabel:
            risk.riskLabel,

          riskScore:
            Math.round(
              risk.riskScore
            ),

          verificationMode:
            risk.verificationMode,

          publicationScore:
            Math.round(
              analysis.publicationScore
            ),

          publicationLevel:
            analysis.publicationLevel,

          confidenceScore:
            Math.round(
              analysis.confidenceScore
            ),

          saleProbability:
            Math.round(
              analysis.saleProbability
            ),

          estimatedSaleTime:
            analysis.estimatedSaleTime,

          aiAnalysis:
            analysis.aiAnalysis,

          evidenceRequired: [
            ...new Set(
              analysis.evidenceRequired
            )
          ],

          isQsmVerified:
            analysis.confidenceScore >=
              85 &&
            conflicts.length === 0 &&
            risk.riskLevel !==
              "CRITICAL",

          status:
            nextStatus,

          lastEditedAt:
            new Date(),

          lastEditedBy:
            prismaUser.id
        },
        include:
          createProductInclude
      });

    return res.json({
      success: true,
      message:
        "Evidencias actualizadas correctamente.",
      product:
        serializeProduct(
          updatedProduct
        ),
      analysis: {
        identifierConflict:
          conflicts.length > 0,
        conflictCount:
          conflicts.length
      }
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Error actualizando evidencias."
    );
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
    const id =
      parsePositiveInt(
        req.params.id
      );

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "ID de producto no válido."
      });
    }

    const prismaUser =
      await resolvePrismaUser(req);

    if (!prismaUser) {
      return res.status(401).json({
        success: false,
        message:
          "El usuario autenticado todavía no existe en Supabase."
      });
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id
        }
      });

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

    if (
      product.sellerId !==
        prismaUser.id &&
      !isUserAdmin(req)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "No tienes permiso para eliminar esta publicación."
      });
    }

    await prisma.product.update({
      where: {
        id
      },
      data: {
        status:
          "DISABLED",
        deletedAt:
          new Date(),
        deletedBy:
          prismaUser.id
      }
    });

    return res.json({
      success: true,
      message:
        "Publicación eliminada correctamente.",
      productId:
        id
    });
  } catch (error) {
    return sendControllerError(
      res,
      error,
      "Error eliminando la publicación."
    );
  }
};

module.exports = {
  createProduct,
  getProducts,
  getMyProducts,
  getProductHistory,
  getProductById,
  updateProduct,
  improveProductEvidence,
  deleteProduct
};
