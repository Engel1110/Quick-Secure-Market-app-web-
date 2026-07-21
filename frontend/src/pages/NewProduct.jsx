import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Link,
  useNavigate
} from "react-router-dom";

import api from "../api/axios";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

/*
|--------------------------------------------------------------------------
| Configuración
|--------------------------------------------------------------------------
*/

const MAX_IMAGES = 8;

const MAX_IMAGE_SIZE =
  6 * 1024 * 1024;

const MAX_VIDEO_SIZE =
  80 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp"
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime"
];

const DRAFT_STORAGE_KEY =
  "qsm_new_product_draft";

const DEFAULT_USER = {
  firstName: "Usuario",
  lastName: "QSM",
  email: "usuario@qsm.com",
  trustScore: 50,
  isVerified: false,
  verificationStatus: "NOT_STARTED",
  profilePhoto: "",
  avatar: ""
};

const DEFAULT_FORM = {
  title: "",
  description: "",
  price: "",
  category: "",
  condition: "",
  quality: "UNKNOWN",

  brand: "",
  model: "",
  serialNumber: "",
  imei: "",
  storageCapacity: "",
  ramMemory: "",
  batteryHealth: "",

  vehicleYear: "",
  vin: "",
  mileage: "",
  transmission: "",
  fuelType: "",

  clothingSize: "",
  material: "",
  authenticityStatus: "NOT_SPECIFIED",

  dimensions: "",
  accessoriesIncluded: "",

  hasInvoice: false,
  hasOriginalBox: false,
  acceptsPhysicalInspection: false,

  specialPriceReason: "NONE",
  specialPriceExplanation: "",

  location: "",
  warranty: "",
  deliveryMethod: ""
};

/*
|--------------------------------------------------------------------------
| Configuración inteligente por categoría
|--------------------------------------------------------------------------
*/

const CATEGORY_RISK_CONFIG = {
  Moda: {
    level: "LOW",
    label: "Riesgo bajo",
    shortLabel: "Bajo",
    icon: "🟢",
    type: "success",
    baseRiskScore: 15,

    explanation:
      "Producto de uso cotidiano y menor impacto económico. Normalmente requiere verificación básica.",

    buyerAdvice:
      "Revisa las fotografías, medidas, condición y descripción antes de comprar.",

    recommendedEvidence: [
      "Fotografías reales",
      "Medidas o talla",
      "Estado del producto"
    ],

    verificationMode: "BASIC"
  },

  Hogar: {
    level: "LOW",
    label: "Riesgo bajo",
    shortLabel: "Bajo",
    icon: "🟢",
    type: "success",
    baseRiskScore: 20,

    explanation:
      "Artículo doméstico de riesgo generalmente bajo, salvo que tenga un precio elevado.",

    buyerAdvice:
      "Confirma dimensiones, condición, funcionamiento y método de entrega.",

    recommendedEvidence: [
      "Fotografías reales",
      "Dimensiones",
      "Detalles del estado"
    ],

    verificationMode: "BASIC"
  },

  Gaming: {
    level: "MEDIUM",
    label: "Riesgo medio",
    shortLabel: "Medio",
    icon: "🟡",
    type: "warning",
    baseRiskScore: 45,

    explanation:
      "Consolas y equipos gaming tienen valor comercial considerable y pueden requerir evidencia de funcionamiento.",

    buyerAdvice:
      "Solicita video de funcionamiento, fotografías del serial y utiliza Pago Protegido.",

    recommendedEvidence: [
      "Video de funcionamiento",
      "Número de serie",
      "Fotografía de puertos y controles",
      "Factura o caja, si están disponibles"
    ],

    verificationMode: "RECOMMENDED"
  },

  Tecnología: {
    level: "MEDIUM",
    label: "Riesgo medio",
    shortLabel: "Medio",
    icon: "🟡",
    type: "warning",
    baseRiskScore: 50,

    explanation:
      "Los equipos tecnológicos pueden presentar daños internos o información difícil de comprobar únicamente con fotografías.",

    buyerAdvice:
      "Solicita video, especificaciones reales y evidencia del funcionamiento.",

    recommendedEvidence: [
      "Video de funcionamiento",
      "Modelo exacto",
      "Número de serie",
      "Estado físico"
    ],

    verificationMode: "RECOMMENDED"
  },

  Laptops: {
    level: "HIGH",
    label: "Riesgo alto",
    shortLabel: "Alto",
    icon: "🟠",
    type: "high",
    baseRiskScore: 68,

    explanation:
      "Producto electrónico de valor elevado que puede contener daños internos, bloqueo o información técnica incorrecta.",

    buyerAdvice:
      "Solicita serial, video encendido, especificaciones, estado de batería y prueba de propiedad.",

    recommendedEvidence: [
      "Número de serie",
      "Video encendida",
      "Estado de batería",
      "Especificaciones del sistema",
      "Factura, si está disponible"
    ],

    verificationMode: "ENHANCED"
  },

  Celulares: {
    level: "HIGH",
    label: "Riesgo alto",
    shortLabel: "Alto",
    icon: "🟠",
    type: "high",
    baseRiskScore: 75,

    explanation:
      "Los celulares tienen alto riesgo de bloqueo, IMEI reportado, duplicación, financiamiento pendiente o suplantación.",

    buyerAdvice:
      "Comprueba el IMEI, solicita prueba de propiedad y utiliza Pago Protegido o verificación QSM.",

    recommendedEvidence: [
      "IMEI o serial",
      "Video de funcionamiento",
      "Captura de información del dispositivo",
      "Factura o caja",
      "Estado de batería"
    ],

    verificationMode: "ENHANCED"
  },

  Vehículos: {
    level: "CRITICAL",
    label: "Riesgo crítico",
    shortLabel: "Crítico",
    icon: "🔴",
    type: "critical",
    baseRiskScore: 92,

    explanation:
      "Los vehículos implican identidad legal, matrícula, chasis, condición mecánica y una operación económica de alto valor.",

    buyerAdvice:
      "La publicación requiere revisión presencial, validación documental y asistencia profesional antes de completar la operación.",

    recommendedEvidence: [
      "VIN o número de chasis",
      "Matrícula",
      "Fotografías completas",
      "Kilometraje",
      "Video del vehículo encendido",
      "Inspección presencial"
    ],

    verificationMode: "PHYSICAL"
  },

  Otros: {
    level: "UNCLASSIFIED",
    label: "Riesgo por determinar",
    shortLabel: "Pendiente",
    icon: "⚪",
    type: "pending",
    baseRiskScore: 40,

    explanation:
      "QSM todavía no puede determinar el nivel de riesgo hasta analizar mejor la información del producto.",

    buyerAdvice:
      "Revisa cuidadosamente la descripción, fotografías, vendedor y condiciones de entrega.",

    recommendedEvidence: [
      "Fotografías reales",
      "Descripción completa",
      "Prueba de propiedad"
    ],

    verificationMode: "REVIEW"
  }
};

const DEFAULT_RISK_CONFIG = {
  level: "PENDING",
  label: "Análisis pendiente",
  shortLabel: "Pendiente",
  icon: "⚪",
  type: "pending",
  baseRiskScore: 0,

  explanation:
    "Selecciona una categoría para que QSM pueda analizar el nivel de riesgo.",

  buyerAdvice:
    "La recomendación aparecerá después de seleccionar la categoría.",

  recommendedEvidence: [],

  verificationMode: "PENDING"
};

/*
|--------------------------------------------------------------------------
| Campos dinámicos por categoría
|--------------------------------------------------------------------------
*/

const CATEGORY_TECHNICAL_CONFIG = {
  Celulares: {
    title:
      "Identidad del dispositivo",

    description:
      "Estos datos permiten reducir bloqueos, duplicaciones y publicaciones sospechosas.",

    requiredFields: [
      "brand",
      "model"
    ],

    recommendedFields: [
      "imei",
      "serialNumber",
      "batteryHealth"
    ]
  },

  Laptops: {
    title:
      "Especificaciones de la laptop",

    description:
      "Registra las características técnicas reales y el estado del equipo.",

    requiredFields: [
      "brand",
      "model"
    ],

    recommendedFields: [
      "serialNumber",
      "ramMemory",
      "storageCapacity",
      "batteryHealth"
    ]
  },

  Gaming: {
    title:
      "Datos del equipo gaming",

    description:
      "La información ayuda a verificar modelo, funcionamiento y accesorios incluidos.",

    requiredFields: [
      "brand",
      "model"
    ],

    recommendedFields: [
      "serialNumber",
      "storageCapacity",
      "accessoriesIncluded"
    ]
  },

  Tecnología: {
    title:
      "Especificaciones técnicas",

    description:
      "Completa la identidad y las características principales del producto.",

    requiredFields: [
      "brand",
      "model"
    ],

    recommendedFields: [
      "serialNumber",
      "dimensions",
      "accessoriesIncluded"
    ]
  },

  Vehículos: {
    title:
      "Identidad del vehículo",

    description:
      "Los datos del vehículo serán utilizados para revisión documental y física.",

    requiredFields: [
      "brand",
      "model",
      "vehicleYear",
      "mileage"
    ],

    recommendedFields: [
      "vin",
      "transmission",
      "fuelType"
    ]
  },

  Moda: {
    title:
      "Detalles de la prenda",

    description:
      "Agrega talla, marca, material y datos de autenticidad cuando corresponda.",

    requiredFields: [
      "clothingSize"
    ],

    recommendedFields: [
      "brand",
      "material",
      "authenticityStatus"
    ]
  },

  Hogar: {
    title:
      "Características del artículo",

    description:
      "Indica dimensiones, marca y accesorios incluidos para evitar confusiones.",

    requiredFields: [],

    recommendedFields: [
      "brand",
      "model",
      "dimensions"
    ]
  },

  Otros: {
    title:
      "Información adicional",

    description:
      "Agrega detalles que permitan identificar correctamente el producto.",

    requiredFields: [],

    recommendedFields: [
      "brand",
      "model",
      "serialNumber"
    ]
  }
};

const DEFAULT_TECHNICAL_CONFIG = {
  title:
    "Información técnica",

  description:
    "Selecciona una categoría para mostrar las preguntas correspondientes.",

  requiredFields: [],

  recommendedFields: []
};

/*
|--------------------------------------------------------------------------
| Componente
|--------------------------------------------------------------------------
*/

function NewProduct() {
  const navigate =
    useNavigate();

  /*
  |--------------------------------------------------------------------------
  | Usuario
  |--------------------------------------------------------------------------
  */

  const savedUser =
    useMemo(() => {
      return {
        ...DEFAULT_USER,
        ...(
          safeJson(
            localStorage.getItem(
              "qsm_user"
            )
          ) ||
          safeJson(
            localStorage.getItem(
              "user"
            )
          ) ||
          {}
        )
      };
    }, []);

  const [
    user,
    setUser
  ] = useState(
    savedUser
  );

  /*
  |--------------------------------------------------------------------------
  | Formulario y borrador
  |--------------------------------------------------------------------------
  */

  const savedDraft =
    useMemo(() => {
      const draft =
        safeJson(
          localStorage.getItem(
            DRAFT_STORAGE_KEY
          )
        );

      return {
        ...DEFAULT_FORM,
        ...(
          draft?.form ||
          {}
        )
      };
    }, []);

  const [
    form,
    setForm
  ] = useState(
    savedDraft
  );

  const [
    draftSavedAt,
    setDraftSavedAt
  ] = useState(() => {
    const draft =
      safeJson(
        localStorage.getItem(
          DRAFT_STORAGE_KEY
        )
      );

    return (
      draft?.savedAt ||
      ""
    );
  });

  /*
  |--------------------------------------------------------------------------
  | Imágenes
  |--------------------------------------------------------------------------
  */

  const [
    imageFiles,
    setImageFiles
  ] = useState([]);

  const [
    imagePreviews,
    setImagePreviews
  ] = useState([]);

  /*
  |--------------------------------------------------------------------------
  | Video
  |--------------------------------------------------------------------------
  */

  const [
    videoFile,
    setVideoFile
  ] = useState(null);

  const [
    videoPreview,
    setVideoPreview
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Interfaz
  |--------------------------------------------------------------------------
  */

  const [
    sidebarCollapsed,
    setSidebarCollapsed
  ] = useState(() => {
    return (
      localStorage.getItem(
        "qsm_sidebar_collapsed"
      ) === "true"
    );
  });

  const [
    submitting,
    setSubmitting
  ] = useState(false);

  const [
    savingDraft,
    setSavingDraft
  ] = useState(false);

  const [
    uploadingText,
    setUploadingText
  ] = useState("");

  const [
    success,
    setSuccess
  ] = useState("");

  const [
    error,
    setError
  ] = useState("");

  const [
    fieldErrors,
    setFieldErrors
  ] = useState({});

  /*
  |--------------------------------------------------------------------------
  | Usuario normalizado
  |--------------------------------------------------------------------------
  */

  const fullName =
    useMemo(() => {
      const firstName =
        formatPersonName(
          user?.firstName
        );

      const lastName =
        formatPersonName(
          user?.lastName
        );

      return (
        [
          firstName,
          lastName
        ]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        "Usuario QSM"
      );
    }, [
      user?.firstName,
      user?.lastName
    ]);

  const trustScore =
    clampNumber(
      user?.trustScore,
      0,
      100,
      50
    );

  const isVerified =
    Boolean(
      user?.isVerified
    ) ||
    [
      "APPROVED",
      "VERIFIED"
    ].includes(
      String(
        user?.verificationStatus ||
        ""
      ).toUpperCase()
    );

  const profilePhoto =
    getProfilePhotoUrl(
      user?.profilePhoto ||
      user?.avatar ||
      user?.photo ||
      ""
    );

    /*
|--------------------------------------------------------------------------
| Progreso de publicación
|--------------------------------------------------------------------------
*/

const completion =
  useMemo(() => {
    const checks = [
      form.title.trim().length >= 5,
      form.description.trim().length >= 40,
      Number(form.price) > 0,
      Boolean(form.category),
      Boolean(form.condition),
      Boolean(form.location.trim()),
      imageFiles.length >= 1,
      Boolean(form.deliveryMethod)
    ];

    const completedChecks =
      checks.filter(Boolean).length;

    return Math.round(
      (
        completedChecks /
        checks.length
      ) * 100
    );
  }, [
    form.title,
    form.description,
    form.price,
    form.category,
    form.condition,
    form.location,
    form.deliveryMethod,
    imageFiles.length
  ]);

/*
|--------------------------------------------------------------------------
| Nivel de riesgo real según categoría y precio
|--------------------------------------------------------------------------
*/

const riskLevel =
  useMemo(() => {
    const categoryConfig =
      CATEGORY_RISK_CONFIG[
        form.category
      ] ||
      DEFAULT_RISK_CONFIG;

    const price =
      Number(form.price) ||
      0;

    let adjustedRiskScore =
      categoryConfig.baseRiskScore;

    if (
      price >= 250000
    ) {
      adjustedRiskScore += 12;
    } else if (
      price >= 100000
    ) {
      adjustedRiskScore += 8;
    } else if (
      price >= 50000
    ) {
      adjustedRiskScore += 4;
    }

    adjustedRiskScore =
      clampNumber(
        adjustedRiskScore,
        0,
        100,
        categoryConfig.baseRiskScore
      );

    let finalLevel =
      categoryConfig.level;

    let finalLabel =
      categoryConfig.label;

    let finalType =
      categoryConfig.type;

    let finalIcon =
      categoryConfig.icon;

    if (
      categoryConfig.level ===
        "LOW" &&
      price >= 100000
    ) {
      finalLevel =
        "MEDIUM";

      finalLabel =
        "Riesgo medio";

      finalType =
        "warning";

      finalIcon =
        "🟡";
    }

    if (
      categoryConfig.level ===
        "MEDIUM" &&
      price >= 250000
    ) {
      finalLevel =
        "HIGH";

      finalLabel =
        "Riesgo alto";

      finalType =
        "high";

      finalIcon =
        "🟠";
    }

    return {
      ...categoryConfig,

      level:
        finalLevel,

      label:
        finalLabel,

      type:
        finalType,

      icon:
        finalIcon,

      score:
        adjustedRiskScore
    };
  }, [
    form.category,
    form.price
  ]);

/*
|--------------------------------------------------------------------------
| Configuración técnica activa
|--------------------------------------------------------------------------
*/

const technicalConfig =
  useMemo(() => {
    return (
      CATEGORY_TECHNICAL_CONFIG[
        form.category
      ] ||
      DEFAULT_TECHNICAL_CONFIG
    );
  }, [
    form.category
  ]);

/*
|--------------------------------------------------------------------------
| Puntuación de evidencia técnica
|--------------------------------------------------------------------------
*/

const evidenceScore =
  useMemo(() => {
    let score = 0;

    const technicalValues = [
      form.brand,
      form.model,
      form.serialNumber,
      form.imei,
      form.storageCapacity,
      form.ramMemory,
      form.batteryHealth,
      form.vehicleYear,
      form.vin,
      form.mileage,
      form.transmission,
      form.fuelType,
      form.clothingSize,
      form.material,
      form.dimensions,
      form.accessoriesIncluded
    ];

    const completedTechnicalFields =
      technicalValues.filter(
        value =>
          String(
            value || ""
          ).trim().length > 0
      ).length;

    score += Math.min(
      completedTechnicalFields * 5,
      45
    );

    if (
      form.hasInvoice
    ) {
      score += 20;
    }

    if (
      form.hasOriginalBox
    ) {
      score += 10;
    }

    if (
      form.acceptsPhysicalInspection
    ) {
      score += 15;
    }

    if (
      form.authenticityStatus ===
      "VERIFIED"
    ) {
      score += 10;
    }

    return clampNumber(
      score,
      0,
      100,
      0
    );
  }, [
    form.brand,
    form.model,
    form.serialNumber,
    form.imei,
    form.storageCapacity,
    form.ramMemory,
    form.batteryHealth,
    form.vehicleYear,
    form.vin,
    form.mileage,
    form.transmission,
    form.fuelType,
    form.clothingSize,
    form.material,
    form.dimensions,
    form.accessoriesIncluded,
    form.hasInvoice,
    form.hasOriginalBox,
    form.acceptsPhysicalInspection,
    form.authenticityStatus
  ]);

/*
|--------------------------------------------------------------------------
| Puntuación inteligente de calidad
|--------------------------------------------------------------------------
*/

const publicationScore =
  useMemo(() => {
    let score = 0;

    /*
    |--------------------------------------------------------------------------
    | Información básica: máximo 42 puntos
    |--------------------------------------------------------------------------
    */

    if (
      form.title
        .trim()
        .length >= 5
    ) {
      score += 6;
    }

    if (
      form.title
        .trim()
        .length >= 18
    ) {
      score += 3;
    }

    if (
      form.description
        .trim()
        .length >= 40
    ) {
      score += 8;
    }

    if (
      form.description
        .trim()
        .length >= 120
    ) {
      score += 6;
    }

    if (
      Number(form.price) > 0
    ) {
      score += 5;
    }

    if (form.category) {
      score += 4;
    }

    if (form.condition) {
      score += 4;
    }

    if (
      form.location.trim()
    ) {
      score += 3;
    }

    if (
      form.deliveryMethod
    ) {
      score += 3;
    }

    /*
    |--------------------------------------------------------------------------
    | Evidencia visual: máximo 31 puntos
    |--------------------------------------------------------------------------
    */

    if (
      imageFiles.length >= 1
    ) {
      score += 10;
    }

    if (
      imageFiles.length >= 3
    ) {
      score += 7;
    }

    if (
      imageFiles.length >= 5
    ) {
      score += 4;
    }

    if (videoFile) {
      score += 10;
    }

    /*
    |--------------------------------------------------------------------------
    | Confianza del vendedor: máximo 17 puntos
    |--------------------------------------------------------------------------
    */

    if (isVerified) {
      score += 10;
    }

    if (
      trustScore >= 70
    ) {
      score += 4;
    }

    if (
      trustScore >= 90
    ) {
      score += 3;
    }

    /*
    |--------------------------------------------------------------------------
    | Información adicional: máximo 10 puntos
    |--------------------------------------------------------------------------
    */

    if (
      form.warranty.trim()
    ) {
      score += 4;
    }

    if (
      form.specialPriceReason !==
      "NONE"
    ) {
      score += 2;
    }

    if (
      form.specialPriceReason !==
        "NONE" &&
      form.specialPriceExplanation
        .trim()
        .length >= 20
    ) {
      score += 4;
    }

    return clampNumber(
      score,
      0,
      100,
      0
    );
  }, [
    form,
    imageFiles.length,
    videoFile,
    isVerified,
    trustScore
  ]);
  /*
|--------------------------------------------------------------------------
| Clasificación QSM
|--------------------------------------------------------------------------
*/

const publicationLevel =
  useMemo(() => {
    if (
      publicationScore >= 90
    ) {
      return {
        name:
          "QSM Platinum",
        icon:
          "💎",
        label:
          "Confianza excelente",
        color:
          "#22c55e"
      };
    }

    if (
      publicationScore >= 75
    ) {
      return {
        name:
          "QSM Gold",
        icon:
          "🏆",
        label:
          "Confianza muy alta",
        color:
          "#35d0c3"
      };
    }

    if (
      publicationScore >= 60
    ) {
      return {
        name:
          "QSM Silver",
        icon:
          "🥈",
        label:
          "Confianza alta",
        color:
          "#60a5fa"
      };
    }

    if (
      publicationScore >= 40
    ) {
      return {
        name:
          "QSM Bronze",
        icon:
          "🥉",
        label:
          "Confianza media",
        color:
          "#facc15"
      };
    }

    return {
      name:
        "Sin clasificar",
      icon:
        "⚪",
      label:
        "Publicación incompleta",
      color:
        "#f87171"
    };
  }, [
    publicationScore
  ]);
  /*
|--------------------------------------------------------------------------
| Probabilidad estimada de venta
|--------------------------------------------------------------------------
*/

const saleProbability =
  useMemo(() => {
    let probability =
      publicationScore * 0.72;

    if (
      imageFiles.length >= 3
    ) {
      probability += 5;
    }

    if (videoFile) {
      probability += 4;
    }

    if (isVerified) {
      probability += 5;
    }

    if (
      trustScore >= 80
    ) {
      probability += 4;
    }

    /*
    |--------------------------------------------------------------------------
    | Las publicaciones de alto riesgo tienen más fricción
    |--------------------------------------------------------------------------
    */

    if (
      riskLevel.level ===
      "HIGH"
    ) {
      probability -= 5;
    }

    if (
      riskLevel.level ===
      "CRITICAL"
    ) {
      probability -= 12;
    }

    return Math.round(
      clampNumber(
        probability,
        5,
        96,
        5
      )
    );
  }, [
    publicationScore,
    imageFiles.length,
    videoFile,
    isVerified,
    trustScore,
    riskLevel.level
  ]);
  /*
|--------------------------------------------------------------------------
| Tiempo estimado de venta
|--------------------------------------------------------------------------
*/

const estimatedSaleTime =
  useMemo(() => {
    if (
      publicationScore >= 90
    ) {
      return {
        days:
          "1–3 días",
        message:
          "La publicación presenta un nivel de confianza excelente."
      };
    }

    if (
      publicationScore >= 75
    ) {
      return {
        days:
          "3–7 días",
        message:
          "La publicación tiene buena calidad y evidencia suficiente."
      };
    }

    if (
      publicationScore >= 60
    ) {
      return {
        days:
          "1–2 semanas",
        message:
          "Puede mejorar agregando evidencia y más detalles."
      };
    }

    if (
      publicationScore >= 40
    ) {
      return {
        days:
          "2–4 semanas",
        message:
          "La publicación todavía genera confianza limitada."
      };
    }

    return {
      days:
        "No estimado",
      message:
        "Completa la publicación para generar una estimación."
    };
  }, [
    publicationScore
  ]);
  /*
|--------------------------------------------------------------------------
| Recomendaciones inteligentes
|--------------------------------------------------------------------------
*/

const aiSuggestions =
  useMemo(() => {
    const suggestions = [];

    if (
      form.title
        .trim()
        .length < 18
    ) {
      suggestions.push({
        type:
          "INFO",
        icon:
          "📝",
        title:
          "Mejora el título",
        description:
          "Incluye marca, modelo, capacidad o característica principal.",
        points:
          3
      });
    }

    if (
      form.description
        .trim()
        .length < 120
    ) {
      suggestions.push({
        type:
          "INFO",
        icon:
          "📄",
        title:
          "Amplía la descripción",
        description:
          "Explica funcionamiento, detalles, accesorios y motivo de venta.",
        points:
          6
      });
    }

    if (
      imageFiles.length < 3
    ) {
      suggestions.push({
        type:
          "IMPORTANT",
        icon:
          "📷",
        title:
          "Agrega más fotografías",
        description:
          "Tres o más imágenes permiten evaluar mejor el estado real.",
        points:
          7
      });
    }

    if (!videoFile) {
      suggestions.push({
        type:
          "OPTIONAL",
        icon:
          "🎥",
        title:
          "Agrega un video",
        description:
          "Un video de funcionamiento puede aumentar considerablemente la confianza.",
        points:
          10
      });
    }

    if (!isVerified) {
      suggestions.push({
        type:
          "IMPORTANT",
        icon:
          "🛡️",
        title:
          "Verifica tu identidad",
        description:
          "Los vendedores verificados obtienen una insignia de confianza.",
        points:
          10
      });
    }

    if (
      !form.warranty.trim()
    ) {
      suggestions.push({
        type:
          "OPTIONAL",
        icon:
          "📋",
        title:
          "Aclara la garantía",
        description:
          "Indica si tiene garantía, cuánto tiempo o si no aplica.",
        points:
          4
      });
    }

    if (
      [
        "HIGH",
        "CRITICAL"
      ].includes(
        riskLevel.level
      )
    ) {
      suggestions.push({
        type:
          "SECURITY",
        icon:
          "🔐",
        title:
          "Agrega evidencia de propiedad",
        description:
          riskLevel
            .recommendedEvidence
            .join(", "),
        points:
          0
      });
    }

    return suggestions.slice(
      0,
      6
    );
  }, [
    form,
    imageFiles.length,
    videoFile,
    isVerified,
    riskLevel
  ]);
  /*
|--------------------------------------------------------------------------
| Alertas preventivas
|--------------------------------------------------------------------------
*/

const suspiciousAlerts =
  useMemo(() => {
    const alerts = [];

    const normalizedTitle =
      form.title
        .trim()
        .toLowerCase();

    const normalizedDescription =
      form.description
        .trim()
        .toLowerCase();

    const price =
      Number(form.price) || 0;

    if (
      price > 0 &&
      price < 500 &&
      [
        "Celulares",
        "Laptops",
        "Gaming",
        "Vehículos"
      ].includes(
        form.category
      )
    ) {
      alerts.push(
        "El precio parece demasiado bajo para esta categoría."
      );
    }

    if (
      form.category ===
        "Moda" &&
      (
        normalizedTitle.includes(
          "carro"
        ) ||
        normalizedTitle.includes(
          "vehículo"
        ) ||
        normalizedDescription.includes(
          "motor"
        )
      )
    ) {
      alerts.push(
        "La categoría seleccionada podría no coincidir con la descripción."
      );
    }

    if (
      form.category ===
        "Vehículos" &&
      imageFiles.length > 0 &&
      imageFiles.length < 4
    ) {
      alerts.push(
        "Los vehículos deben mostrar varios ángulos para generar confianza."
      );
    }

    if (
      form.specialPriceReason ===
        "NONE" &&
      price > 0 &&
      price < 1000 &&
      riskLevel.level !==
        "LOW"
    ) {
      alerts.push(
        "Explica por qué el precio es inusualmente bajo."
      );
    }

    return alerts;
  }, [
    form,
    imageFiles.length,
    riskLevel.level
  ]);


  /*
  |--------------------------------------------------------------------------
  | Imagen principal de vista previa
  |--------------------------------------------------------------------------
  */

  const previewImage =
    imagePreviews[0] ||
    "";

  /*
  |--------------------------------------------------------------------------
  | Cambios del formulario
  |--------------------------------------------------------------------------
  */

const handleChange = (
  event
) => {
  const {
    name,
    value,
    type,
    checked
  } = event.target;

  const normalizedValue =
    type === "checkbox"
      ? checked
      : value;

  setForm(
    (
      currentForm
    ) => ({
      ...currentForm,
      [name]:
        normalizedValue
    })
  );

  setSuccess("");
  setError("");

  setFieldErrors(
    (
      currentErrors
    ) => ({
      ...currentErrors,
      [name]:
        ""
    })
  );
};

  /*
  |--------------------------------------------------------------------------
  | Validación general
  |--------------------------------------------------------------------------
  */

  const validateForm =
    useCallback(() => {
      const errors = {};

      const title =
        String(
          form?.title ||
          ""
        ).trim();

      const description =
        String(
          form?.description ||
          ""
        ).trim();

      const price =
        Number(
          form?.price
        );

      if (
        title.length < 5
      ) {
        errors.title =
          "El título debe tener al menos 5 caracteres.";
      }

      if (
        description.length < 40
      ) {
        errors.description =
          "La descripción debe tener al menos 40 caracteres.";
      }

      if (
        !Number.isFinite(
          price
        ) ||
        price <= 0
      ) {
        errors.price =
          "Introduce un precio válido mayor que cero.";
      }

      if (
        !form?.category
      ) {
        errors.category =
          "Selecciona una categoría.";
      }

      if (
        !form?.condition
      ) {
        errors.condition =
          "Selecciona la condición real del producto.";
      }

      if (
        !String(
          form?.location ||
          ""
        ).trim()
      ) {
        errors.location =
          "Indica la ubicación del producto.";
      }

      if (
        !form?.deliveryMethod
      ) {
        errors.deliveryMethod =
          "Selecciona un método de entrega.";
      }

      if (
        imageFiles.length ===
        0
      ) {
        errors.images =
          "Debes agregar al menos una imagen real.";
      }

      if (
        form
          ?.specialPriceReason !==
          "NONE" &&
        !String(
          form
            ?.specialPriceExplanation ||
          ""
        ).trim()
      ) {
        errors.specialPriceExplanation =
          "Explica brevemente el motivo del precio especial.";
      }
      /*
|--------------------------------------------------------------------------
| Validaciones por categoría
|--------------------------------------------------------------------------
*/

if (
  [
    "Celulares",
    "Laptops",
    "Gaming",
    "Tecnología",
    "Vehículos"
  ].includes(
    form.category
  )
) {
  if (
    !String(
      form.brand || ""
    ).trim()
  ) {
    errors.brand =
      "Indica la marca del producto.";
  }

  if (
    !String(
      form.model || ""
    ).trim()
  ) {
    errors.model =
      "Indica el modelo del producto.";
  }
}

if (
  form.category ===
  "Vehículos"
) {
  const year =
    Number(
      form.vehicleYear
    );

  const currentYear =
    new Date()
      .getFullYear();

  if (
    !Number.isFinite(year) ||
    year < 1950 ||
    year >
      currentYear + 1
  ) {
    errors.vehicleYear =
      "Introduce un año válido para el vehículo.";
  }

  if (
    !String(
      form.mileage || ""
    ).trim()
  ) {
    errors.mileage =
      "Indica el kilometraje del vehículo.";
  }
}

if (
  form.category ===
    "Moda" &&
  !String(
    form.clothingSize ||
    ""
  ).trim()
) {
  errors.clothingSize =
    "Indica la talla del producto.";
}

if (
  form.imei &&
  !/^[0-9]{14,17}$/.test(
    String(form.imei)
      .replace(
        /\s/g,
        ""
      )
  )
) {
  errors.imei =
    "El IMEI debe contener entre 14 y 17 dígitos.";
}

if (
  form.vin &&
  !/^[A-HJ-NPR-Z0-9]{17}$/i.test(
    String(form.vin)
      .trim()
  )
) {
  errors.vin =
    "El VIN debe contener 17 caracteres válidos.";
}

      setFieldErrors(
        errors
      );

      const valid =
        Object.keys(
          errors
        ).length === 0;

      return {
        valid,
        errors
      };
    }, [
      form,
      imageFiles.length
    ]);

  /*
  |--------------------------------------------------------------------------
  | Guardar borrador
  |--------------------------------------------------------------------------
  */

  const saveDraft =
    () => {
      try {
        setSavingDraft(true);
        setError("");
        setSuccess("");

        const savedAt =
          new Date()
            .toISOString();

        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            form,
            savedAt
          })
        );

        setDraftSavedAt(
          savedAt
        );

        setSuccess(
          "Borrador guardado correctamente en este dispositivo."
        );
      } catch (
        storageError
      ) {
        console.error(
          "Error guardando borrador:",
          storageError
        );

        setError(
          "No se pudo guardar el borrador."
        );
      } finally {
        setSavingDraft(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Eliminar borrador
  |--------------------------------------------------------------------------
  */

  const clearDraft =
    () => {
      localStorage.removeItem(
        DRAFT_STORAGE_KEY
      );

      setForm(
        DEFAULT_FORM
      );

      setDraftSavedAt("");
      setFieldErrors({});
      setSuccess(
        "El borrador fue eliminado."
      );
      setError("");
    };

  /*
  |--------------------------------------------------------------------------
  | Recuperar perfil completo
  |--------------------------------------------------------------------------
  */

  const loadCurrentUser =
    useCallback(
      async () => {
        try {
          const response =
            await api.get(
              "/users/me"
            );

          const backendUser =
            response?.data
              ?.user ||
            response?.data
              ?.data ||
            response?.data;

          if (
            backendUser &&
            typeof backendUser ===
              "object"
          ) {
            const resolvedUser = {
              ...DEFAULT_USER,
              ...backendUser
            };

            setUser(
              resolvedUser
            );

            localStorage.setItem(
              "qsm_user",
              JSON.stringify(
                resolvedUser
              )
            );

            localStorage.setItem(
              "user",
              JSON.stringify(
                resolvedUser
              )
            );
          }
        } catch (
          requestError
        ) {
          console.warn(
            "No se pudo actualizar el usuario:",
            requestError
              ?.response
              ?.data
              ?.message ||
            requestError
              ?.message
          );
        }
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | Escuchar cambios del Sidebar
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleSidebarChange = (
      event
    ) => {
      const collapsed =
        typeof event
          ?.detail
          ?.collapsed ===
        "boolean"
          ? event.detail
              .collapsed
          : localStorage.getItem(
              "qsm_sidebar_collapsed"
            ) === "true";

      setSidebarCollapsed(
        collapsed
      );
    };

    window.addEventListener(
      "qsm-sidebar-changed",
      handleSidebarChange
    );

    window.addEventListener(
      "storage",
      handleSidebarChange
    );

    return () => {
      window.removeEventListener(
        "qsm-sidebar-changed",
        handleSidebarChange
      );

      window.removeEventListener(
        "storage",
        handleSidebarChange
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Cargar usuario actualizado
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadCurrentUser();
  }, [
    loadCurrentUser
  ]);

  /*
  |--------------------------------------------------------------------------
  | Liberar recursos temporales
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      imagePreviews.forEach(
        revokeBlobUrl
      );

      revokeBlobUrl(
        videoPreview
      );
    };
  }, [
    imagePreviews,
    videoPreview
  ]);
    /*
  |--------------------------------------------------------------------------
  | Validar imagen
  |--------------------------------------------------------------------------
  */

  const validateImageFile = (
    file
  ) => {
    if (!file) {
      return {
        valid: false,
        message:
          "No se recibió una imagen válida."
      };
    }

    if (
      !ALLOWED_IMAGE_TYPES.includes(
        file.type
      )
    ) {
      return {
        valid: false,
        message:
          `${file.name}: utiliza imágenes JPG, PNG o WEBP.`
      };
    }

    if (
      file.size >
      MAX_IMAGE_SIZE
    ) {
      return {
        valid: false,
        message:
          `${file.name}: la imagen supera el límite de ${formatFileSize(
            MAX_IMAGE_SIZE
          )}.`
      };
    }

    return {
      valid: true,
      message: ""
    };
  };

  /*
  |--------------------------------------------------------------------------
  | Validar video
  |--------------------------------------------------------------------------
  */

  const validateVideoFile = (
    file
  ) => {
    if (!file) {
      return {
        valid: false,
        message:
          "No se recibió un video válido."
      };
    }

    if (
      !ALLOWED_VIDEO_TYPES.includes(
        file.type
      )
    ) {
      return {
        valid: false,
        message:
          "El video debe ser MP4, WEBM o MOV."
      };
    }

    if (
      file.size >
      MAX_VIDEO_SIZE
    ) {
      return {
        valid: false,
        message:
          `El video supera el límite de ${formatFileSize(
            MAX_VIDEO_SIZE
          )}.`
      };
    }

    return {
      valid: true,
      message: ""
    };
  };

  /*
  |--------------------------------------------------------------------------
  | Identificador de archivo
  |--------------------------------------------------------------------------
  */

  const getFileSignature = (
    file
  ) => {
    if (!file) {
      return "";
    }

    return [
      file.name,
      file.size,
      file.lastModified,
      file.type
    ].join("-");
  };

  /*
  |--------------------------------------------------------------------------
  | Agregar imágenes
  |--------------------------------------------------------------------------
  */

  const handleImages = (
    event
  ) => {
    const selectedFiles =
      Array.from(
        event.target
          .files ||
        []
      );

    event.target.value =
      "";

    if (
      selectedFiles.length ===
      0
    ) {
      return;
    }

    setError("");
    setSuccess("");

    const availableSlots =
      MAX_IMAGES -
      imageFiles.length;

    if (
      availableSlots <= 0
    ) {
      setError(
        `Ya alcanzaste el máximo de ${MAX_IMAGES} imágenes.`
      );

      return;
    }

    const existingSignatures =
      new Set(
        imageFiles.map(
          getFileSignature
        )
      );

    const acceptedFiles = [];
    const rejectedMessages = [];

    selectedFiles.forEach(
      (file) => {
        const signature =
          getFileSignature(
            file
          );

        if (
          existingSignatures.has(
            signature
          )
        ) {
          rejectedMessages.push(
            `${file.name}: esta imagen ya fue agregada.`
          );

          return;
        }

        const validation =
          validateImageFile(
            file
          );

        if (
          !validation.valid
        ) {
          rejectedMessages.push(
            validation.message
          );

          return;
        }

        if (
          acceptedFiles.length >=
          availableSlots
        ) {
          rejectedMessages.push(
            `${file.name}: se superó el máximo de ${MAX_IMAGES} imágenes.`
          );

          return;
        }

        existingSignatures.add(
          signature
        );

        acceptedFiles.push(
          file
        );
      }
    );

    if (
      acceptedFiles.length >
      0
    ) {
      const newPreviews =
        acceptedFiles.map(
          (file) =>
            URL.createObjectURL(
              file
            )
        );

      setImageFiles(
        (
          currentFiles
        ) => [
          ...currentFiles,
          ...acceptedFiles
        ]
      );

      setImagePreviews(
        (
          currentPreviews
        ) => [
          ...currentPreviews,
          ...newPreviews
        ]
      );

      setFieldErrors(
        (
          currentErrors
        ) => ({
          ...currentErrors,
          images: ""
        })
      );

      setSuccess(
        acceptedFiles.length ===
        1
          ? "Imagen agregada correctamente."
          : `${acceptedFiles.length} imágenes agregadas correctamente.`
      );
    }

    if (
      rejectedMessages.length >
      0
    ) {
      setError(
        rejectedMessages.join(
          " "
        )
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Eliminar imagen
  |--------------------------------------------------------------------------
  */

  const removeImage = (
    index
  ) => {
    const previewToRemove =
      imagePreviews[index];

    revokeBlobUrl(
      previewToRemove
    );

    setImageFiles(
      (
        currentFiles
      ) =>
        currentFiles.filter(
          (
            _,
            itemIndex
          ) =>
            itemIndex !==
            index
        )
    );

    setImagePreviews(
      (
        currentPreviews
      ) =>
        currentPreviews.filter(
          (
            _,
            itemIndex
          ) =>
            itemIndex !==
            index
        )
    );

    setSuccess(
      "Imagen eliminada de la publicación."
    );

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Convertir imagen en principal
  |--------------------------------------------------------------------------
  */

  const setMainImage = (
    index
  ) => {
    if (
      index <= 0 ||
      index >=
        imageFiles.length
    ) {
      return;
    }

    setImageFiles(
      (
        currentFiles
      ) => {
        const updatedFiles = [
          ...currentFiles
        ];

        const [
          selectedFile
        ] =
          updatedFiles.splice(
            index,
            1
          );

        updatedFiles.unshift(
          selectedFile
        );

        return updatedFiles;
      }
    );

    setImagePreviews(
      (
        currentPreviews
      ) => {
        const updatedPreviews = [
          ...currentPreviews
        ];

        const [
          selectedPreview
        ] =
          updatedPreviews.splice(
            index,
            1
          );

        updatedPreviews.unshift(
          selectedPreview
        );

        return updatedPreviews;
      }
    );

    setSuccess(
      "Imagen principal actualizada."
    );

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Mover imagen hacia la izquierda
  |--------------------------------------------------------------------------
  */

  const moveImageLeft = (
    index
  ) => {
    if (
      index <= 0
    ) {
      return;
    }

    reorderImages(
      index,
      index - 1
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Mover imagen hacia la derecha
  |--------------------------------------------------------------------------
  */

  const moveImageRight = (
    index
  ) => {
    if (
      index >=
      imageFiles.length - 1
    ) {
      return;
    }

    reorderImages(
      index,
      index + 1
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Reordenar imágenes
  |--------------------------------------------------------------------------
  */

  const reorderImages = (
    sourceIndex,
    destinationIndex
  ) => {
    setImageFiles(
      (
        currentFiles
      ) => {
        const updatedFiles = [
          ...currentFiles
        ];

        [
          updatedFiles[
            sourceIndex
          ],
          updatedFiles[
            destinationIndex
          ]
        ] = [
          updatedFiles[
            destinationIndex
          ],
          updatedFiles[
            sourceIndex
          ]
        ];

        return updatedFiles;
      }
    );

    setImagePreviews(
      (
        currentPreviews
      ) => {
        const updatedPreviews = [
          ...currentPreviews
        ];

        [
          updatedPreviews[
            sourceIndex
          ],
          updatedPreviews[
            destinationIndex
          ]
        ] = [
          updatedPreviews[
            destinationIndex
          ],
          updatedPreviews[
            sourceIndex
          ]
        ];

        return updatedPreviews;
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Seleccionar video
  |--------------------------------------------------------------------------
  */

  const handleVideo = (
    event
  ) => {
    const file =
      event.target
        .files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

    const validation =
      validateVideoFile(
        file
      );

    if (
      !validation.valid
    ) {
      setError(
        validation.message
      );

      return;
    }

    revokeBlobUrl(
      videoPreview
    );

    const previewUrl =
      URL.createObjectURL(
        file
      );

    setVideoFile(
      file
    );

    setVideoPreview(
      previewUrl
    );

    setFieldErrors(
      (
        currentErrors
      ) => ({
        ...currentErrors,
        video: ""
      })
    );

    setSuccess(
      "Video agregado correctamente."
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Eliminar video
  |--------------------------------------------------------------------------
  */

  const removeVideo = () => {
    revokeBlobUrl(
      videoPreview
    );

    setVideoFile(null);
    setVideoPreview("");

    setSuccess(
      "Video eliminado de la publicación."
    );

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Reemplazar video
  |--------------------------------------------------------------------------
  */

  const replaceVideo = (
    event
  ) => {
    handleVideo(
      event
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Limpiar todos los archivos
  |--------------------------------------------------------------------------
  */

  const clearAllMedia = () => {
    imagePreviews.forEach(
      revokeBlobUrl
    );

    revokeBlobUrl(
      videoPreview
    );

    setImageFiles([]);
    setImagePreviews([]);
    setVideoFile(null);
    setVideoPreview("");

    setSuccess(
      "Todos los archivos fueron eliminados."
    );

    setError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Tamaño total de imágenes
  |--------------------------------------------------------------------------
  */

  const totalImagesSize =
    useMemo(() => {
      return imageFiles.reduce(
        (
          total,
          file
        ) =>
          total +
          Number(
            file?.size ||
            0
          ),
        0
      );
    }, [
      imageFiles
    ]);

  /*
  |--------------------------------------------------------------------------
  | Información del video
  |--------------------------------------------------------------------------
  */

  const videoInformation =
    useMemo(() => {
      if (
        !videoFile
      ) {
        return null;
      }

      return {
        name:
          videoFile.name,

        size:
          formatFileSize(
            videoFile.size
          ),

        type:
          videoFile.type,

        lastModified:
          videoFile
            .lastModified
            ? new Date(
                videoFile
                  .lastModified
              )
                .toLocaleDateString(
                  "es-DO"
                )
            : ""
      };
    }, [
      videoFile
    ]);

  /*
  |--------------------------------------------------------------------------
  | Validar duración del video
  |--------------------------------------------------------------------------
  */

  const handleVideoMetadata = (
    event
  ) => {
    const duration =
      Number(
        event
          ?.currentTarget
          ?.duration
      );

    if (
      !Number.isFinite(
        duration
      )
    ) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Máximo sugerido: 3 minutos
    |--------------------------------------------------------------------------
    */

    if (
      duration > 180
    ) {
      setError(
        "El video supera los 3 minutos recomendados. Utiliza un video más corto."
      );

      return;
    }

    setFieldErrors(
      (
        currentErrors
      ) => ({
        ...currentErrors,
        video: ""
      })
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Imagen principal
  |--------------------------------------------------------------------------
  */

  const mainImageFile =
    imageFiles[0] ||
    null;

  const mainImagePreview =
    imagePreviews[0] ||
    "";

  /*
  |--------------------------------------------------------------------------
  | Cantidad de espacios disponibles
  |--------------------------------------------------------------------------
  */

  const remainingImageSlots =
    Math.max(
      0,
      MAX_IMAGES -
        imageFiles.length
    );
      /*
  |--------------------------------------------------------------------------
  | Extraer un objeto de distintas respuestas
  |--------------------------------------------------------------------------
  */

  const extractObject = (
    source,
    preferredKeys = []
  ) => {
    if (
      !source ||
      typeof source !== "object"
    ) {
      return null;
    }

    for (
      const key of preferredKeys
    ) {
      const value =
        source?.[key];

      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        return value;
      }
    }

    if (
      !Array.isArray(source)
    ) {
      return source;
    }

    return null;
  };

  /*
  |--------------------------------------------------------------------------
  | Extraer arreglo de distintas respuestas
  |--------------------------------------------------------------------------
  */

  const extractArray = (
    source,
    preferredKeys = []
  ) => {
    if (
      Array.isArray(source)
    ) {
      return source;
    }

    if (
      !source ||
      typeof source !== "object"
    ) {
      return [];
    }

    for (
      const key of preferredKeys
    ) {
      const value =
        source?.[key];

      if (
        Array.isArray(value)
      ) {
        return value;
      }
    }

    return [];
  };

  /*
  |--------------------------------------------------------------------------
  | Normalizar una imagen subida
  |--------------------------------------------------------------------------
  */

  const normalizeUploadedImage = (
    value
  ) => {
    if (!value) {
      return "";
    }

    if (
      typeof value === "string"
    ) {
      return value;
    }

    return (
      value?.url ||
      value?.path ||
      value?.secure_url ||
      value?.imageUrl ||
      value?.fileUrl ||
      value?.location ||
      ""
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Normalizar video subido
  |--------------------------------------------------------------------------
  */

  const normalizeUploadedVideo = (
    value
  ) => {
    if (!value) {
      return null;
    }

    if (
      typeof value === "string"
    ) {
      return {
        url: value,
        thumbnail: "",
        duration: 0
      };
    }

    const url =
      value?.url ||
      value?.path ||
      value?.secure_url ||
      value?.videoUrl ||
      value?.fileUrl ||
      value?.location ||
      "";

    if (!url) {
      return null;
    }

    return {
      url,
      thumbnail:
        value?.thumbnail ||
        value?.thumbnailUrl ||
        "",
      duration:
        Number(
          value?.duration ||
          0
        ) || 0
    };
  };

  /*
  |--------------------------------------------------------------------------
  | Resolver respuesta de subida
  |--------------------------------------------------------------------------
  */

  const parseUploadResponse = (
    responseData
  ) => {
    const responseObject =
      responseData?.data &&
      typeof responseData.data === "object"
        ? responseData.data
        : responseData;

    const rawImages =
      extractArray(
        responseObject,
        [
          "images",
          "files",
          "uploadedImages",
          "imageFiles"
        ]
      );

    const singleFile =
      responseObject?.file ||
      responseObject?.upload ||
      null;

    let images =
      rawImages
        .map(
          normalizeUploadedImage
        )
        .filter(Boolean);

    if (
      images.length === 0 &&
      singleFile &&
      String(
        singleFile?.mimeType ||
        singleFile?.mimetype ||
        ""
      ).startsWith(
        "image/"
      )
    ) {
      const normalized =
        normalizeUploadedImage(
          singleFile
        );

      if (normalized) {
        images = [
          normalized
        ];
      }
    }

    const rawVideo =
      responseObject?.video ||
      responseObject?.uploadedVideo ||
      responseObject?.videoFile ||
      (
        singleFile &&
        String(
          singleFile?.mimeType ||
          singleFile?.mimetype ||
          ""
        ).startsWith(
          "video/"
        )
          ? singleFile
          : null
      );

    const video =
      normalizeUploadedVideo(
        rawVideo
      );

    return {
      images,
      video
    };
  };

  /*
  |--------------------------------------------------------------------------
  | Subir archivos juntos
  |--------------------------------------------------------------------------
  */

  const uploadMediaTogether =
    async () => {
      const formData =
        new FormData();

      imageFiles.forEach(
        (file) => {
          formData.append(
            "images",
            file
          );
        }
      );

      if (videoFile) {
        formData.append(
          "video",
          videoFile
        );
      }

      /*
      |--------------------------------------------------------------------------
      | No configurar manualmente multipart/form-data
      |--------------------------------------------------------------------------
      | Axios y el navegador agregan automáticamente el boundary.
      |--------------------------------------------------------------------------
      */

      const response =
        await api.post(
          "/upload",
          formData
        );

      return parseUploadResponse(
        response?.data
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Subir imágenes individualmente
  |--------------------------------------------------------------------------
  */

  const uploadImagesIndividually =
    async () => {
      const uploadedImages = [];

      for (
        let index = 0;
        index < imageFiles.length;
        index += 1
      ) {
        const file =
          imageFiles[index];

        setUploadingText(
          `Subiendo imagen ${index + 1} de ${imageFiles.length}...`
        );

        const formData =
          new FormData();

        /*
        |--------------------------------------------------------------------------
        | El controlador uploadFile anterior utiliza req.file
        |--------------------------------------------------------------------------
        | El nombre "file" suele coincidir con upload.single("file").
        |--------------------------------------------------------------------------
        */

        formData.append(
          "file",
          file
        );

        const response =
          await api.post(
            "/upload",
            formData
          );

        const parsed =
          parseUploadResponse(
            response?.data
          );

        if (
          parsed.images.length > 0
        ) {
          uploadedImages.push(
            ...parsed.images
          );

          continue;
        }

        const fallbackFile =
          response?.data?.file ||
          response?.data?.data?.file ||
          response?.data;

        const normalized =
          normalizeUploadedImage(
            fallbackFile
          );

        if (normalized) {
          uploadedImages.push(
            normalized
          );
        }
      }

      return uploadedImages;
    };

  /*
  |--------------------------------------------------------------------------
  | Subir video individualmente
  |--------------------------------------------------------------------------
  */

  const uploadVideoIndividually =
    async () => {
      if (!videoFile) {
        return null;
      }

      setUploadingText(
        "Subiendo video del producto..."
      );

      const formData =
        new FormData();

      formData.append(
        "file",
        videoFile
      );

      const response =
        await api.post(
          "/upload",
          formData
        );

      const parsed =
        parseUploadResponse(
          response?.data
        );

      if (parsed.video) {
        return parsed.video;
      }

      const fallbackFile =
        response?.data?.file ||
        response?.data?.data?.file ||
        response?.data;

      return normalizeUploadedVideo(
        fallbackFile
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Estrategia completa de subida
  |--------------------------------------------------------------------------
  */

  const uploadProductMedia =
    async () => {
      if (
        imageFiles.length === 0 &&
        !videoFile
      ) {
        return {
          images: [],
          video: null
        };
      }

      /*
      |--------------------------------------------------------------------------
      | Primer intento: endpoint preparado para varios archivos
      |--------------------------------------------------------------------------
      */

      try {
        setUploadingText(
          "Subiendo imágenes y video..."
        );

        const combinedResult =
          await uploadMediaTogether();

        const hasAllImages =
          combinedResult.images.length ===
          imageFiles.length;

        const hasExpectedVideo =
          !videoFile ||
          Boolean(
            combinedResult.video
          );

        if (
          hasAllImages &&
          hasExpectedVideo
        ) {
          return combinedResult;
        }
      } catch (
        combinedUploadError
      ) {
        console.warn(
          "La subida conjunta no funcionó. Se intentará archivo por archivo:",
          combinedUploadError
            ?.response
            ?.data
            ?.message ||
          combinedUploadError
            ?.message
        );
      }

      /*
      |--------------------------------------------------------------------------
      | Segundo intento: archivo por archivo
      |--------------------------------------------------------------------------
      */

      const uploadedImages =
        await uploadImagesIndividually();

      const uploadedVideo =
        await uploadVideoIndividually();

      if (
        uploadedImages.length !==
        imageFiles.length
      ) {
        throw new Error(
          `Solo se pudieron subir ${uploadedImages.length} de ${imageFiles.length} imágenes.`
        );
      }

      if (
        videoFile &&
        !uploadedVideo
      ) {
        throw new Error(
          "Las imágenes se subieron, pero el video no pudo procesarse."
        );
      }

      return {
        images:
          uploadedImages,
        video:
          uploadedVideo
      };
    };

  /*
  |--------------------------------------------------------------------------
  | Construir payload del producto
  |--------------------------------------------------------------------------
  */

  const buildProductPayload = ({
    uploadedImages,
    uploadedVideo
  }) => {
    const payload = {
      title:
        String(
          form.title || ""
        ).trim(),

      description:
        String(
          form.description || ""
        ).trim(),

      price:
        Number(
          form.price
        ),

      category:
        form.category,

      condition:
        form.condition,

      quality:
        form.quality ||
        "UNKNOWN",

        brand:
  String(
    form.brand || ""
  ).trim(),

model:
  String(
    form.model || ""
  ).trim(),

serialNumber:
  String(
    form.serialNumber || ""
  ).trim(),

imei:
  String(
    form.imei || ""
  ).trim(),

storageCapacity:
  String(
    form.storageCapacity || ""
  ).trim(),

ramMemory:
  String(
    form.ramMemory || ""
  ).trim(),

batteryHealth:
  String(
    form.batteryHealth || ""
  ).trim(),

vehicleDetails: {
  year:
    form.vehicleYear
      ? Number(form.vehicleYear)
      : null,

  vin:
    String(
      form.vin || ""
    ).trim(),

  mileage:
    String(
      form.mileage || ""
    ).trim(),

  transmission:
    form.transmission || "",

  fuelType:
    form.fuelType || ""
},

clothingDetails: {
  size:
    String(
      form.clothingSize || ""
    ).trim(),

  material:
    String(
      form.material || ""
    ).trim(),

  authenticityStatus:
    form.authenticityStatus ||
    "NOT_SPECIFIED"
},

dimensions:
  String(
    form.dimensions || ""
  ).trim(),

accessoriesIncluded:
  String(
    form.accessoriesIncluded || ""
  ).trim(),

evidence: {
  hasInvoice:
    Boolean(form.hasInvoice),

  hasOriginalBox:
    Boolean(form.hasOriginalBox),

  acceptsPhysicalInspection:
    Boolean(
      form.acceptsPhysicalInspection
    ),

  evidenceScore
},

      location:
        String(
          form.location || ""
        ).trim(),

      warranty:
        String(
          form.warranty || ""
        ).trim(),

      deliveryMethod:
        form.deliveryMethod,

       riskLevel:
  riskLevel.level,

riskLabel:
  riskLevel.label,

riskScore:
  riskLevel.score,

verificationMode:
  riskLevel.verificationMode,

publicationScore,

publicationLevel:
  publicationLevel.name,

saleProbability,

estimatedSaleTime:
  estimatedSaleTime.days, 

      specialPriceReason:
        form.specialPriceReason ||
        "NONE",

      specialPriceExplanation:
        String(
          form.specialPriceExplanation ||
          ""
        ).trim(),

      images:
        uploadedImages,

      video:
        uploadedVideo || {
          url: "",
          thumbnail: "",
          duration: 0
        }
    };

    return payload;
  };

  /*
  |--------------------------------------------------------------------------
  | Obtener producto creado
  |--------------------------------------------------------------------------
  */

  const extractCreatedProduct = (
    responseData
  ) => {
    return (
      responseData?.product ||
      responseData?.data?.product ||
      responseData?.data ||
      (
        responseData?._id
          ? responseData
          : null
      )
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Obtener ID del producto
  |--------------------------------------------------------------------------
  */

  const getProductId = (
    product
  ) => {
    return (
      product?._id ||
      product?.id ||
      product?.productId ||
      ""
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Limpiar formulario después de publicar
  |--------------------------------------------------------------------------
  */

  const resetPublicationState =
    () => {
      imagePreviews.forEach(
        revokeBlobUrl
      );

      revokeBlobUrl(
        videoPreview
      );

      setForm({
        ...DEFAULT_FORM
      });

      setImageFiles([]);
      setImagePreviews([]);

      setVideoFile(null);
      setVideoPreview("");

      setFieldErrors({});
      setDraftSavedAt("");

      localStorage.removeItem(
        DRAFT_STORAGE_KEY
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Guardar borrador automático cuando falla
  |--------------------------------------------------------------------------
  */

  const preserveDraftAfterError =
    () => {
      try {
        const savedAt =
          new Date()
            .toISOString();

        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            form,
            savedAt
          })
        );

        setDraftSavedAt(
          savedAt
        );
      } catch (
        storageError
      ) {
        console.warn(
          "No se pudo preservar el borrador:",
          storageError
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Publicar producto
  |--------------------------------------------------------------------------
  */

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      if (submitting) {
        return;
      }

      setSuccess("");
      setError("");
      setUploadingText("");

      const validation =
        validateForm();

      if (
        !validation.valid
      ) {
        const firstError =
          Object.values(
            validation.errors
          )[0];

        setError(
          firstError ||
          "Revisa los campos obligatorios."
        );

        return;
      }

      try {
        setSubmitting(true);

        /*
        |--------------------------------------------------------------------------
        | 1. Subir imágenes y video
        |--------------------------------------------------------------------------
        */

        const {
          images:
            uploadedImages,
          video:
            uploadedVideo
        } =
          await uploadProductMedia();

        /*
        |--------------------------------------------------------------------------
        | 2. Validar URLs devueltas
        |--------------------------------------------------------------------------
        */

        if (
          uploadedImages.length ===
          0
        ) {
          throw new Error(
            "El backend no devolvió las imágenes subidas."
          );
        }

        /*
        |--------------------------------------------------------------------------
        | 3. Crear producto
        |--------------------------------------------------------------------------
        */

        setUploadingText(
          "Creando publicación segura en QSM..."
        );

        const payload =
          buildProductPayload({
            uploadedImages,
            uploadedVideo
          });

        const response =
          await api.post(
            "/products",
            payload
          );

        const newProduct =
          extractCreatedProduct(
            response?.data
          );

        if (!newProduct) {
          throw new Error(
            "El backend creó la solicitud, pero no devolvió el producto."
          );
        }

        const productId =
          getProductId(
            newProduct
          );

        /*
        |--------------------------------------------------------------------------
        | 4. Limpiar borrador y archivos temporales
        |--------------------------------------------------------------------------
        */

        resetPublicationState();

        setSuccess(
          "Producto publicado correctamente. Redirigiendo..."
        );

        /*
        |--------------------------------------------------------------------------
        | 5. Redirección
        |--------------------------------------------------------------------------
        */

        window.setTimeout(
          () => {
            navigate(
              productId
                ? `/product/${productId}`
                : "/marketplace",
              {
                replace: true
              }
            );
          },
          700
        );
      } catch (
        requestError
      ) {
        console.error(
          "Error publicando producto:",
          requestError
        );

        preserveDraftAfterError();

        const backendMessage =
          requestError
            ?.response
            ?.data
            ?.message ||
          requestError
            ?.response
            ?.data
            ?.error ||
          requestError
            ?.response
            ?.data
            ?.details ||
          requestError
            ?.message ||
          "No se pudo publicar el producto.";

        setError(
          backendMessage
        );

        setSuccess("");

        setUploadingText(
          ""
        );
      } finally {
        setSubmitting(false);
        setUploadingText("");
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Cancelar publicación
  |--------------------------------------------------------------------------
  */

  const handleCancelPublication =
    () => {
      if (
        submitting
      ) {
        return;
      }

      navigate(
        "/marketplace"
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Estado general
  |--------------------------------------------------------------------------
  */

  const isBusy =
    submitting ||
    savingDraft;

  const canPublish =
    !isBusy &&
    completion >= 75 &&
    imageFiles.length > 0;

  /*
  |--------------------------------------------------------------------------
  | Texto del borrador
  |--------------------------------------------------------------------------
  */

  const formattedDraftDate =
    draftSavedAt
      ? new Date(
          draftSavedAt
        ).toLocaleString(
          "es-DO",
          {
            dateStyle:
              "medium",
            timeStyle:
              "short"
          }
        )
      : "";
        return (
    <div style={page}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background: #020617;
          font-family:
            Inter,
            "Plus Jakarta Sans",
            system-ui,
            sans-serif;
        }

        input,
        textarea,
        select,
        button,
        a {
          font-family: inherit;
        }

        input::placeholder,
        textarea::placeholder {
          color: #64748b;
        }

        select {
          color-scheme: dark;
        }

        button,
        a,
        label {
          transition:
            transform .22s ease,
            opacity .22s ease,
            border-color .22s ease,
            background .22s ease;
        }

        button:hover,
        a:hover,
        label:hover {
          transform: translateY(-2px);
        }

        button:disabled,
        input:disabled,
        textarea:disabled,
        select:disabled {
          opacity: .58;
          cursor: not-allowed;
          transform: none !important;
        }

        @keyframes qsmNewProductFade {
          from {
            opacity: 0;
            transform: translateY(16px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes qsmNewProductPulse {
          0% {
            box-shadow:
              0 0 0 0 rgba(53, 208, 195, .34);
          }

          70% {
            box-shadow:
              0 0 0 18px rgba(53, 208, 195, 0);
          }

          100% {
            box-shadow:
              0 0 0 0 rgba(53, 208, 195, 0);
          }
        }

        @keyframes qsmNewProductFloat {
          0% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-8px);
          }

          100% {
            transform: translateY(0);
          }
        }

        .new-product-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .new-product-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .new-product-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(53, 208, 195, .20);
        }

        @media (max-width: 1380px) {
          .new-product-content-grid {
            grid-template-columns:
              minmax(0, 1fr) 410px !important;
          }
        }

        @media (max-width: 1180px) {
          .new-product-page-layout {
            grid-template-columns:
              1fr !important;
          }

          .new-product-sidebar-wrapper {
            display:
              none !important;
          }

          .new-product-content-grid {
            grid-template-columns:
              1fr !important;
          }

          .new-product-right-column {
            position:
              static !important;

            grid-template-columns:
              repeat(2, minmax(0, 1fr))
              !important;
          }

          .new-product-actions {
            left:
              20px !important;
          }
        }

        @media (max-width: 850px) {
          .new-product-main {
            padding:
              80px 18px 118px !important;
          }
              .evidence-options-grid {
  grid-template-columns:
    1fr !important;
}

          .new-product-hero {
            grid-template-columns:
              1fr !important;
          }

          .new-product-form-grid {
            grid-template-columns:
              1fr !important;
          }

          .new-product-right-column {
            grid-template-columns:
              1fr !important;
          }

          .new-product-media-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr))
              !important;
          }

          .new-product-step-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr))
              !important;
          }

          .new-product-actions {
            grid-template-columns:
              1fr 1fr !important;

            left:
              18px !important;
            right:
              18px !important;
          }

          .new-product-actions > :last-child {
            grid-column:
              1 / -1;
          }
        }

        @media (max-width: 560px) {
          .new-product-main {
            padding:
              80px 12px 154px !important;
          }

          .new-product-media-grid {
            grid-template-columns:
              1fr !important;
          }

          .new-product-step-grid {
            grid-template-columns:
              1fr !important;
          }

          .new-product-actions {
            grid-template-columns:
              1fr !important;
          }

          .new-product-actions > :last-child {
            grid-column:
              auto;
          }

          .new-product-hero-title {
            font-size:
              34px !important;

            line-height:
              40px !important;
          }

          .new-product-image-controls {
            grid-template-columns:
              1fr 1fr !important;
          }
        }
      `}</style>
      
      <div
  className="evidence-options-grid"
  style={evidenceOptionsGrid}
></div>

      <div
        className="new-product-page-layout"
        style={layoutPage(
          sidebarCollapsed
        )}
      >
        <div className="new-product-sidebar-wrapper">
          <Sidebar />
        </div>

        <main
          className="new-product-main"
          style={main}
        >
          <Topbar />

          <section
            className="new-product-hero"
            style={hero}
          >
            <div>
              <p style={label}>
                MARKETPLACE / PUBLICACIÓN SEGURA
              </p>

              <h1
                className="new-product-hero-title"
                style={title}
              >
                Publica con{" "}
                <span style={gradientText}>
                  Protección QSM
                </span>
              </h1>

              <p style={subtitle}>
                Crea una publicación profesional con
                información clara, evidencia visual,
                análisis de riesgo y entrega protegida.
              </p>

              <div style={draftInformationRow}>
                {draftSavedAt && (
                  <span style={draftStatusBadge}>
                    Borrador guardado:{" "}
                    {formattedDraftDate}
                  </span>
                )}

                {isVerified ? (
                  <span style={verifiedSellerBadge}>
                    ✓ Vendedor verificado
                  </span>
                ) : (
                  <span style={pendingSellerBadge}>
                    Verificación pendiente
                  </span>
                )}
              </div>
            </div>

            <div style={heroBadge}>
              <div style={heroIcon}>
                🧠
              </div>

              <div style={heroBadgeContent}>
                <strong>
                  QSM Risk Engine activo
                </strong>

                <p>
                  Analizamos evidencia, descripción,
                  precio y reputación antes de publicar.
                </p>
              </div>

              <span
                style={riskStatusBadge(
                  riskLevel.type
                )}
              >
                {riskLevel.label}
              </span>
            </div>
          </section>

          {success && (
            <div style={successBox}>
              <span style={messageIcon}>
                ✓
              </span>

              <div>
                <strong>
                  Operación completada
                </strong>

                <p>
                  {success}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div style={errorBox}>
              <span style={messageIcon}>
                !
              </span>

              <div>
                <strong>
                  Revisa la publicación
                </strong>

                <p>
                  {error}
                </p>
              </div>
            </div>
          )}

          {uploadingText && (
            <div style={uploadingBox}>
              <span style={messageIcon}>
                ◌
              </span>

              <div>
                <strong>
                  Procesando archivos
                </strong>

                <p>
                  {uploadingText}
                </p>
              </div>
            </div>
          )}

          <section
            className="new-product-content-grid"
            style={contentLayout}
          >
            <form
            id="new-product-form"
              onSubmit={handleSubmit}
              style={formCard}
            >
              <div
                className="new-product-step-grid"
                style={stepBar}
              >
                <Step
                  active
                  number="1"
                  text="Información"
                  description="Datos básicos"
                />

                <Step
                  active={
                    completion >= 35
                  }
                  number="2"
                  text="Evidencia"
                  description="Fotos reales"
                />

                <Step
                  active={
                    completion >= 65
                  }
                  number="3"
                  text="Entrega"
                  description="Ubicación y método"
                />

                <Step
                  active={
                    completion >= 85
                  }
                  number="4"
                  text="Publicar"
                  description="Revisión final"
                />
              </div>

              <div style={formSectionHeader}>
                <div>
                  <p style={sectionEyebrow}>
                    INFORMACIÓN PRINCIPAL
                  </p>

                  <h2 style={sectionHeading}>
                    Describe el producto
                  </h2>

                  <p style={sectionDescription}>
                    La información debe coincidir con
                    las fotos y con el estado real del
                    artículo.
                  </p>
                </div>

                <span style={completionBadge}>
                  {completion}% completo
                </span>
              </div>

              <ProductField
                label="Título del producto"
                required
                error={fieldErrors.title}
                hint={`${form.title.length}/120`}
              >
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Ej: iPhone 15 Pro Max 256GB"
                  maxLength={120}
                  disabled={isBusy}
                  style={fieldInput(
                    Boolean(
                      fieldErrors.title
                    )
                  )}
                />
              </ProductField>

              <ProductField
                label="Descripción"
                required
                error={fieldErrors.description}
                hint={`${form.description.length}/2000`}
              >
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe el estado real, detalles, accesorios incluidos, funcionamiento, garantía y motivo de venta."
                  maxLength={2000}
                  disabled={isBusy}
                  style={fieldTextarea(
                    Boolean(
                      fieldErrors.description
                    )
                  )}
                />
              </ProductField>

              <div
                className="new-product-form-grid"
                style={twoColumns}
              >
                <ProductField
                  label="Precio RD$"
                  required
                  error={fieldErrors.price}
                >
                  <div style={moneyInputContainer}>
                    <span style={moneyPrefix}>
                      RD$
                    </span>

                    <input
                      name="price"
                      type="number"
                      min="1"
                      step="0.01"
                      value={form.price}
                      onChange={handleChange}
                      placeholder="65000"
                      disabled={isBusy}
                      style={moneyInput}
                    />
                  </div>
                </ProductField>

                <ProductField
                  label="Categoría"
                  required
                  error={fieldErrors.category}
                >
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    disabled={isBusy}
                    style={fieldInput(
                      Boolean(
                        fieldErrors.category
                      )
                    )}
                  >
                    <option value="">
                      Seleccionar categoría
                    </option>

                    <option value="Gaming">
                      Gaming
                    </option>

                    <option value="Tecnología">
                      Tecnología
                    </option>

                    <option value="Celulares">
                      Celulares
                    </option>

                    <option value="Laptops">
                      Laptops
                    </option>

                    <option value="Vehículos">
                      Vehículos
                    </option>

                    <option value="Hogar">
                      Hogar
                    </option>

                    <option value="Moda">
                      Moda
                    </option>

                    <option value="Otros">
                      Otros
                    </option>
                  </select>
                </ProductField>
              </div>

              <div
                className="new-product-form-grid"
                style={twoColumns}
              >
                <ProductField
                  label="Condición"
                  required
                  error={fieldErrors.condition}
                >
                  <select
                    name="condition"
                    value={form.condition}
                    onChange={handleChange}
                    disabled={isBusy}
                    style={fieldInput(
                      Boolean(
                        fieldErrors.condition
                      )
                    )}
                  >
                    <option value="">
                      Seleccionar condición
                    </option>

                    <option value="NEW">
                      Nuevo
                    </option>

                    <option value="LIKE_NEW">
                      Como nuevo
                    </option>

                    <option value="USED_GOOD">
                      Buen estado
                    </option>

                    <option value="USED_DETAILS">
                      Usado con detalles
                    </option>

                    <option value="FOR_PARTS">
                      Para piezas
                    </option>
                  </select>
                </ProductField>

                <ProductField
                  label="Calidad evaluada"
                >
                  <select
                    name="quality"
                    value={form.quality}
                    onChange={handleChange}
                    disabled={isBusy}
                    style={fieldInput(false)}
                  >
                    <option value="UNKNOWN">
                      No especificada
                    </option>

                    <option value="EXCELLENT">
                      Excelente
                    </option>

                    <option value="GOOD">
                      Buena
                    </option>

                    <option value="FAIR">
                      Aceptable
                    </option>

                    <option value="DAMAGED">
                      Dañado
                    </option>
                  </select>
                </ProductField>
              </div>

              {form.category && (
  <>
    <div style={formSectionDivider} />

    <div style={formSectionHeader}>
      <div>
        <p style={sectionEyebrow}>
          IDENTIDAD DEL PRODUCTO
        </p>

        <h2 style={sectionHeading}>
          {technicalConfig.title}
        </h2>

        <p style={sectionDescription}>
          {technicalConfig.description}
        </p>
      </div>

      <span style={technicalScoreBadge}>
        Evidencia {evidenceScore}/100
      </span>
    </div>

    {[
      "Celulares",
      "Laptops",
      "Gaming",
      "Tecnología",
      "Vehículos",
      "Hogar",
      "Otros"
    ].includes(
      form.category
    ) && (
      <div
        className="new-product-form-grid"
        style={twoColumns}
      >
        <ProductField
          label="Marca"
          required={
            technicalConfig
              .requiredFields
              .includes("brand")
          }
          error={fieldErrors.brand}
        >
          <input
            name="brand"
            value={form.brand}
            onChange={handleChange}
            placeholder="Ej: Apple, Sony, Toyota"
            maxLength={80}
            disabled={isBusy}
            style={fieldInput(
              Boolean(
                fieldErrors.brand
              )
            )}
          />
        </ProductField>

        <ProductField
          label="Modelo"
          required={
            technicalConfig
              .requiredFields
              .includes("model")
          }
          error={fieldErrors.model}
        >
          <input
            name="model"
            value={form.model}
            onChange={handleChange}
            placeholder="Ej: iPhone 15 Pro"
            maxLength={100}
            disabled={isBusy}
            style={fieldInput(
              Boolean(
                fieldErrors.model
              )
            )}
          />
        </ProductField>
      </div>
    )}

    {form.category ===
      "Celulares" && (
      <>
        <div
          className="new-product-form-grid"
          style={twoColumns}
        >
          <ProductField
            label="IMEI"
            error={fieldErrors.imei}
            hint="Recomendado"
          >
            <input
              name="imei"
              value={form.imei}
              onChange={handleChange}
              placeholder="15 dígitos"
              maxLength={17}
              disabled={isBusy}
              style={fieldInput(
                Boolean(
                  fieldErrors.imei
                )
              )}
            />
          </ProductField>

          <ProductField
            label="Número de serie"
            hint="Recomendado"
          >
            <input
              name="serialNumber"
              value={form.serialNumber}
              onChange={handleChange}
              placeholder="Serial del fabricante"
              maxLength={100}
              disabled={isBusy}
              style={fieldInput(false)}
            />
          </ProductField>
        </div>

        <div
          className="new-product-form-grid"
          style={twoColumns}
        >
          <ProductField
            label="Capacidad"
          >
            <input
              name="storageCapacity"
              value={form.storageCapacity}
              onChange={handleChange}
              placeholder="Ej: 256 GB"
              maxLength={60}
              disabled={isBusy}
              style={fieldInput(false)}
            />
          </ProductField>

          <ProductField
            label="Salud de batería"
          >
            <input
              name="batteryHealth"
              value={form.batteryHealth}
              onChange={handleChange}
              placeholder="Ej: 89%"
              maxLength={20}
              disabled={isBusy}
              style={fieldInput(false)}
            />
          </ProductField>
        </div>
      </>
    )}

    {form.category ===
      "Laptops" && (
      <>
        <div
          className="new-product-form-grid"
          style={twoColumns}
        >
          <ProductField
            label="Memoria RAM"
          >
            <input
              name="ramMemory"
              value={form.ramMemory}
              onChange={handleChange}
              placeholder="Ej: 16 GB"
              maxLength={60}
              disabled={isBusy}
              style={fieldInput(false)}
            />
          </ProductField>

          <ProductField
            label="Almacenamiento"
          >
            <input
              name="storageCapacity"
              value={form.storageCapacity}
              onChange={handleChange}
              placeholder="Ej: SSD 512 GB"
              maxLength={80}
              disabled={isBusy}
              style={fieldInput(false)}
            />
          </ProductField>
        </div>

        <div
          className="new-product-form-grid"
          style={twoColumns}
        >
          <ProductField
            label="Número de serie"
          >
            <input
              name="serialNumber"
              value={form.serialNumber}
              onChange={handleChange}
              placeholder="Serial del equipo"
              maxLength={100}
              disabled={isBusy}
              style={fieldInput(false)}
            />
          </ProductField>

          <ProductField
            label="Estado de batería"
          >
            <input
              name="batteryHealth"
              value={form.batteryHealth}
              onChange={handleChange}
              placeholder="Ej: Buena / 82%"
              maxLength={60}
              disabled={isBusy}
              style={fieldInput(false)}
            />
          </ProductField>
        </div>
      </>
    )}

    {form.category ===
      "Vehículos" && (
      <>
        <div
          className="new-product-form-grid"
          style={twoColumns}
        >
          <ProductField
            label="Año"
            required
            error={
              fieldErrors.vehicleYear
            }
          >
            <input
              name="vehicleYear"
              type="number"
              min="1950"
              max={
                new Date()
                  .getFullYear() + 1
              }
              value={form.vehicleYear}
              onChange={handleChange}
              placeholder="2022"
              disabled={isBusy}
              style={fieldInput(
                Boolean(
                  fieldErrors.vehicleYear
                )
              )}
            />
          </ProductField>

          <ProductField
            label="Kilometraje"
            required
            error={fieldErrors.mileage}
          >
            <input
              name="mileage"
              value={form.mileage}
              onChange={handleChange}
              placeholder="Ej: 45,000 km"
              maxLength={40}
              disabled={isBusy}
              style={fieldInput(
                Boolean(
                  fieldErrors.mileage
                )
              )}
            />
          </ProductField>
        </div>

        <ProductField
          label="VIN o chasis"
          error={fieldErrors.vin}
          hint="Recomendado"
        >
          <input
            name="vin"
            value={form.vin}
            onChange={handleChange}
            placeholder="17 caracteres"
            maxLength={17}
            disabled={isBusy}
            style={fieldInput(
              Boolean(
                fieldErrors.vin
              )
            )}
          />
        </ProductField>

        <div
          className="new-product-form-grid"
          style={twoColumns}
        >
          <ProductField
            label="Transmisión"
          >
            <select
              name="transmission"
              value={form.transmission}
              onChange={handleChange}
              disabled={isBusy}
              style={fieldInput(false)}
            >
              <option value="">
                Seleccionar
              </option>

              <option value="AUTOMATIC">
                Automática
              </option>

              <option value="MANUAL">
                Mecánica
              </option>

              <option value="CVT">
                CVT
              </option>
            </select>
          </ProductField>

          <ProductField
            label="Combustible"
          >
            <select
              name="fuelType"
              value={form.fuelType}
              onChange={handleChange}
              disabled={isBusy}
              style={fieldInput(false)}
            >
              <option value="">
                Seleccionar
              </option>

              <option value="GASOLINE">
                Gasolina
              </option>

              <option value="DIESEL">
                Diésel
              </option>

              <option value="HYBRID">
                Híbrido
              </option>

              <option value="ELECTRIC">
                Eléctrico
              </option>

              <option value="LPG">
                GLP
              </option>
            </select>
          </ProductField>
        </div>
      </>
    )}

    {form.category ===
      "Moda" && (
      <>
        <div
          className="new-product-form-grid"
          style={twoColumns}
        >
          <ProductField
            label="Talla"
            required
            error={
              fieldErrors.clothingSize
            }
          >
            <input
              name="clothingSize"
              value={form.clothingSize}
              onChange={handleChange}
              placeholder="Ej: M, L, 38"
              maxLength={30}
              disabled={isBusy}
              style={fieldInput(
                Boolean(
                  fieldErrors.clothingSize
                )
              )}
            />
          </ProductField>

          <ProductField
            label="Material"
          >
            <input
              name="material"
              value={form.material}
              onChange={handleChange}
              placeholder="Ej: Algodón"
              maxLength={80}
              disabled={isBusy}
              style={fieldInput(false)}
            />
          </ProductField>
        </div>

        <ProductField
          label="Autenticidad"
        >
          <select
            name="authenticityStatus"
            value={
              form.authenticityStatus
            }
            onChange={handleChange}
            disabled={isBusy}
            style={fieldInput(false)}
          >
            <option value="NOT_SPECIFIED">
              No especificada
            </option>

            <option value="ORIGINAL_NO_INVOICE">
              Original, sin factura
            </option>

            <option value="ORIGINAL_WITH_INVOICE">
              Original, con factura
            </option>

            <option value="VERIFIED">
              Autenticidad verificada
            </option>

            <option value="REPLICA">
              Réplica
            </option>
          </select>
        </ProductField>
      </>
    )}

    {[
      "Gaming",
      "Tecnología",
      "Hogar",
      "Otros"
    ].includes(
      form.category
    ) && (
      <>
        <div
          className="new-product-form-grid"
          style={twoColumns}
        >
          <ProductField
            label="Número de serie"
          >
            <input
              name="serialNumber"
              value={form.serialNumber}
              onChange={handleChange}
              placeholder="Si está disponible"
              maxLength={100}
              disabled={isBusy}
              style={fieldInput(false)}
            />
          </ProductField>

          <ProductField
            label="Dimensiones"
          >
            <input
              name="dimensions"
              value={form.dimensions}
              onChange={handleChange}
              placeholder="Ej: 120 x 60 x 75 cm"
              maxLength={100}
              disabled={isBusy}
              style={fieldInput(false)}
            />
          </ProductField>
        </div>

        <ProductField
          label="Accesorios incluidos"
        >
          <input
            name="accessoriesIncluded"
            value={
              form.accessoriesIncluded
            }
            onChange={handleChange}
            placeholder="Ej: Cargador, caja, control y cables"
            maxLength={300}
            disabled={isBusy}
            style={fieldInput(false)}
          />
        </ProductField>
      </>
    )}

    <div style={evidenceOptionsGrid}>
      <EvidenceOption
        name="hasInvoice"
        checked={form.hasInvoice}
        onChange={handleChange}
        icon="🧾"
        title="Tengo factura"
        description="Permite justificar compra y procedencia."
        disabled={isBusy}
      />

      <EvidenceOption
        name="hasOriginalBox"
        checked={form.hasOriginalBox}
        onChange={handleChange}
        icon="📦"
        title="Tengo caja original"
        description="Ayuda a relacionar serial y producto."
        disabled={isBusy}
      />

      <EvidenceOption
        name="acceptsPhysicalInspection"
        checked={
          form.acceptsPhysicalInspection
        }
        onChange={handleChange}
        icon="🔍"
        title="Acepto inspección"
        description="QSM podrá revisar físicamente el producto."
        disabled={isBusy}
      />
    </div>
  </>
)}

              <div style={formSectionDivider} />

              <div style={formSectionHeader}>
                <div>
                  <p style={sectionEyebrow}>
                    EVIDENCIA VISUAL
                  </p>

                  <h2 style={sectionHeading}>
                    Fotos del producto
                  </h2>

                  <p style={sectionDescription}>
                    Agrega hasta ocho imágenes. La
                    primera será la imagen principal
                    de la publicación.
                  </p>
                </div>

                <div style={mediaSummary}>
                  <span>
                    {imageFiles.length}/{MAX_IMAGES}
                  </span>

                  <span>
                    {formatFileSize(
                      totalImagesSize
                    )}
                  </span>
                </div>
              </div>

              <label style={uploadBox}>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImages}
                  disabled={
                    isBusy ||
                    remainingImageSlots === 0
                  }
                  style={{
                    display:
                      "none"
                  }}
                />

                <div style={uploadIcon}>
                  📷
                </div>

                <strong>
                  {remainingImageSlots > 0
                    ? `Agregar imágenes (${remainingImageSlots} disponibles)`
                    : "Máximo de imágenes alcanzado"}
                </strong>

                <p>
                  JPG, PNG o WEBP. Máximo 6 MB por
                  imagen.
                </p>
              </label>

              {fieldErrors.images && (
                <p style={fieldErrorText}>
                  {fieldErrors.images}
                </p>
              )}

              {imagePreviews.length > 0 && (
                <>
                  <div
                    className="new-product-media-grid"
                    style={mediaGrid}
                  >
                    {imagePreviews.map(
                      (
                        preview,
                        index
                      ) => (
                        <article
                          key={`${preview}-${index}`}
                          style={mediaCard(
                            index === 0
                          )}
                        >
                          <div style={mediaImageContainer}>
                            <img
                              src={preview}
                              alt={`Vista previa ${index + 1}`}
                              style={mediaImg}
                            />

                            {index === 0 && (
                              <span style={mainImageBadge}>
                                Principal
                              </span>
                            )}

                            <span style={mediaPositionBadge}>
                              {index + 1}
                            </span>
                          </div>

                          <div style={mediaInformation}>
                            <strong>
                              {truncateText(
                                imageFiles[index]
                                  ?.name ||
                                `Imagen ${index + 1}`,
                                26
                              )}
                            </strong>

                            <span>
                              {formatFileSize(
                                imageFiles[index]
                                  ?.size
                              )}
                            </span>
                          </div>

                          <div
                            className="new-product-image-controls"
                            style={mediaControls}
                          >
                            {index !== 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setMainImage(
                                    index
                                  )
                                }
                                disabled={isBusy}
                                style={mediaPrimaryButton}
                              >
                                Principal
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                moveImageLeft(
                                  index
                                )
                              }
                              disabled={
                                isBusy ||
                                index === 0
                              }
                              style={mediaControlButton}
                              title="Mover a la izquierda"
                            >
                              ←
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                moveImageRight(
                                  index
                                )
                              }
                              disabled={
                                isBusy ||
                                index ===
                                  imageFiles.length -
                                    1
                              }
                              style={mediaControlButton}
                              title="Mover a la derecha"
                            >
                              →
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                removeImage(
                                  index
                                )
                              }
                              disabled={isBusy}
                              style={mediaDeleteButton}
                              title="Eliminar imagen"
                            >
                              ×
                            </button>
                          </div>
                        </article>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={clearAllMedia}
                    disabled={isBusy}
                    style={clearMediaButton}
                  >
                    Eliminar todos los archivos
                  </button>
                </>
              )}

              <div style={formSectionDivider} />

              <div style={formSectionHeader}>
                <div>
                  <p style={sectionEyebrow}>
                    VIDEO DEL PRODUCTO
                  </p>

                  <h2 style={sectionHeading}>
                    Evidencia de funcionamiento
                  </h2>

                  <p style={sectionDescription}>
                    El video es opcional, pero mejora
                    la confianza y permite mostrar el
                    funcionamiento real.
                  </p>
                </div>

                <span style={optionalBadge}>
                  Opcional
                </span>
              </div>

              {!videoPreview ? (
                <label style={uploadBoxVideo}>
                  <input
                    type="file"
                    accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime"
                    onChange={handleVideo}
                    disabled={isBusy}
                    style={{
                      display:
                        "none"
                    }}
                  />

                  <div style={uploadIcon}>
                    🎥
                  </div>

                  <strong>
                    Subir video
                  </strong>

                  <p>
                    MP4, WEBM o MOV. Máximo 80 MB y
                    duración recomendada de hasta tres
                    minutos.
                  </p>
                </label>
              ) : (
                <div style={videoBox}>
                  <video
                    src={videoPreview}
                    controls
                    onLoadedMetadata={
                      handleVideoMetadata
                    }
                    style={videoPlayer}
                  />

                  <div style={videoInformationBox}>
                    <div>
                      <strong>
                        {truncateText(
                          videoInformation
                            ?.name ||
                          "Video del producto",
                          44
                        )}
                      </strong>

                      <p>
                        {videoInformation
                          ?.size ||
                          "Tamaño no disponible"}
                      </p>
                    </div>

                    <div style={videoActions}>
                      <label style={replaceVideoButton}>
                        Cambiar video

                        <input
                          type="file"
                          accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime"
                          onChange={replaceVideo}
                          disabled={isBusy}
                          style={{
                            display:
                              "none"
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={removeVideo}
                        disabled={isBusy}
                        style={removeVideoButton}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {fieldErrors.video && (
                <p style={fieldErrorText}>
                  {fieldErrors.video}
                </p>
              )}

              <div style={formSectionDivider} />

              <div style={formSectionHeader}>
                <div>
                  <p style={sectionEyebrow}>
                    UBICACIÓN Y ENTREGA
                  </p>

                  <h2 style={sectionHeading}>
                    Define cómo se entregará
                  </h2>

                  <p style={sectionDescription}>
                    QSM utiliza esta información para
                    preparar el flujo de almacén,
                    delivery o entrega acordada.
                  </p>
                </div>
              </div>

              <div
                className="new-product-form-grid"
                style={twoColumns}
              >
                <ProductField
                  label="Ubicación"
                  required
                  error={fieldErrors.location}
                >
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="Ej: Santo Domingo"
                    maxLength={160}
                    disabled={isBusy}
                    style={fieldInput(
                      Boolean(
                        fieldErrors.location
                      )
                    )}
                  />
                </ProductField>

                <ProductField
                  label="Garantía"
                  hint="Opcional"
                >
                  <input
                    name="warranty"
                    value={form.warranty}
                    onChange={handleChange}
                    placeholder="Ej: 30 días / No aplica"
                    maxLength={160}
                    disabled={isBusy}
                    style={fieldInput(false)}
                  />
                </ProductField>
              </div>

              <ProductField
                label="Método de entrega"
                required
                error={fieldErrors.deliveryMethod}
              >
                <select
                  name="deliveryMethod"
                  value={form.deliveryMethod}
                  onChange={handleChange}
                  disabled={isBusy}
                  style={fieldInput(
                    Boolean(
                      fieldErrors.deliveryMethod
                    )
                  )}
                >
                  <option value="">
                    Seleccionar método de entrega
                  </option>

                  <option value="QSM_WAREHOUSE">
                    Almacén seguro QSM
                  </option>

                  <option value="QSM_VERIFIED_DELIVERY">
                    Delivery verificado QSM
                  </option>

                  <option value="DIRECT_DELIVERY">
                    Entrega directa acordada
                  </option>
                </select>
              </ProductField>

              <div style={formSectionDivider} />

              <div style={formSectionHeader}>
                <div>
                  <p style={sectionEyebrow}>
                    PRECIO ESPECIAL
                  </p>

                  <h2 style={sectionHeading}>
                    Explica precios inusuales
                  </h2>

                  <p style={sectionDescription}>
                    Esta información ayuda al motor
                    antifraude cuando el precio está
                    por debajo del mercado.
                  </p>
                </div>
              </div>

              <ProductField
                label="Motivo del precio"
              >
                <select
                  name="specialPriceReason"
                  value={form.specialPriceReason}
                  onChange={handleChange}
                  disabled={isBusy}
                  style={fieldInput(false)}
                >
                  <option value="NONE">
                    No aplica
                  </option>

                  <option value="URGENT_MONEY">
                    Necesito vender rápido
                  </option>

                  <option value="MOVING">
                    Mudanza
                  </option>

                  <option value="BOUGHT_ANOTHER">
                    Compré otro producto
                  </option>

                  <option value="NO_LONGER_USED">
                    Ya no lo uso
                  </option>

                  <option value="MEDICAL_EXPENSE">
                    Gasto médico
                  </option>

                  <option value="BUSINESS_LIQUIDATION">
                    Liquidación
                  </option>

                  <option value="OTHER">
                    Otro
                  </option>
                </select>
              </ProductField>

              <ProductField
                label="Explicación adicional"
                error={
                  fieldErrors
                    .specialPriceExplanation
                }
                hint={`${form.specialPriceExplanation.length}/500`}
              >
                <textarea
                  name="specialPriceExplanation"
                  value={
                    form.specialPriceExplanation
                  }
                  onChange={handleChange}
                  placeholder="Ej: Lo vendo porque compré otro. Incluye caja, cargador y factura."
                  maxLength={500}
                  disabled={isBusy}
                  style={fieldTextarea(
                    Boolean(
                      fieldErrors
                        .specialPriceExplanation
                    )
                  )}
                />
              </ProductField>
            </form>

            <aside
              className="new-product-right-column"
              style={rightColumn}
            >
<section style={aiCard}>
  <div style={aiHeader}>
    <div style={aiBrain}>
      🧠
    </div>

    <div style={{ minWidth: 0 }}>
      <p style={sectionEyebrow}>
        QSM INTELLIGENCE
      </p>

      <h2 style={aiTitle}>
        Análisis de publicación
      </h2>

      <p style={aiSubtitle}>
        Evaluación dinámica de calidad, riesgo y confianza.
      </p>
    </div>

    <span
      style={{
        ...aiLevelBadge,
        borderColor:
          `${publicationLevel.color}55`,
        background:
          `${publicationLevel.color}18`,
        color:
          publicationLevel.color
      }}
    >
      {publicationLevel.icon}
      {" "}
      {publicationLevel.name}
    </span>
  </div>

  <div style={intelligenceHero}>
    <div
      style={{
        ...scoreCircle,
        color:
          publicationLevel.color,
        borderColor:
          `${publicationLevel.color}35`,
        boxShadow:
          `0 18px 54px ${publicationLevel.color}20`
      }}
    >
      <strong style={scoreNumber}>
        {publicationScore}
      </strong>

      <span style={scoreTotal}>
        /100
      </span>

      <small style={scoreCaption}>
        QSM AI Score
      </small>
    </div>

    <div style={intelligenceSummary}>
      <span
        style={{
          ...trustLevelPill,
          color:
            publicationLevel.color,
          borderColor:
            `${publicationLevel.color}45`,
          background:
            `${publicationLevel.color}14`
        }}
      >
        {publicationLevel.label}
      </span>

      <p>
        Esta puntuación mide la calidad y transparencia
        de la publicación. No reemplaza el nivel de
        riesgo del producto.
      </p>
    </div>
  </div>

  <div style={scoreBar}>
    <div
      style={{
        ...scoreFill,
        width:
          `${publicationScore}%`,
        background:
          `linear-gradient(
            90deg,
            #35d0c3,
            ${publicationLevel.color}
          )`
      }}
    />
  </div>

  <div style={intelligenceStatsGrid}>
    <IntelligenceStat
      icon="🛡️"
      label="Riesgo"
      value={riskLevel.label}
      helper={`${riskLevel.score}/100`}
      color={getRiskColor(
        riskLevel.type
      )}
    />

    <IntelligenceStat
      icon="📈"
      label="Probabilidad"
      value={`${saleProbability}%`}
      helper="Estimación de venta"
      color="#35d0c3"
    />

    <IntelligenceStat
      icon="⏱️"
      label="Tiempo estimado"
      value={estimatedSaleTime.days}
      helper="Según calidad actual"
      color="#60a5fa"
    />

    <IntelligenceStat
      icon="✅"
      label="Formulario"
      value={`${completion}%`}
      helper="Campos completados"
      color="#8b5cf6"
    />
  </div>

  <div style={riskIntelligenceCard}>
    <div style={riskCardHeader}>
      <div
        style={{
          ...riskCardIcon,
          background:
            `${getRiskColor(
              riskLevel.type
            )}18`,
          color:
            getRiskColor(
              riskLevel.type
            )
        }}
      >
        {riskLevel.icon}
      </div>

      <div>
        <span style={riskSmallLabel}>
          NIVEL DEL PRODUCTO
        </span>

        <strong style={riskCardTitle}>
          {riskLevel.label}
        </strong>
      </div>
    </div>

    <p style={riskExplanation}>
      {riskLevel.explanation}
    </p>

    <div style={riskAdviceBox}>
      <strong>
        Recomendación para el comprador
      </strong>

      <p>
        {riskLevel.buyerAdvice}
      </p>
    </div>
  </div>

  <div style={analysisList}>
    <AnalysisLine
      icon="📷"
      title="Fotografías"
      value={`${imageFiles.length}/${MAX_IMAGES}`}
      done={
        imageFiles.length >= 3
      }
    />

    <AnalysisLine
      icon="🎥"
      title="Video"
      value={
        videoFile
          ? "Agregado"
          : "Recomendado"
      }
      done={Boolean(videoFile)}
      optional
    />

    <AnalysisLine
      icon="📝"
      title="Descripción"
      value={
        form.description
          .trim()
          .length >= 120
          ? "Completa"
          : form.description
              .trim()
              .length >= 40
          ? "Aceptable"
          : "Insuficiente"
      }
      done={
        form.description
          .trim()
          .length >= 120
      }
    />

    <AnalysisLine
      icon="👤"
      title="Vendedor"
      value={
        isVerified
          ? `Verificado · ${trustScore}/100`
          : `Pendiente · ${trustScore}/100`
      }
      done={isVerified}
    />
  </div>

  {suspiciousAlerts.length > 0 && (
    <div style={fraudAlertsBox}>
      <div style={fraudAlertHeader}>
        <span>
          ⚠️
        </span>

        <div>
          <strong>
            Alertas preventivas
          </strong>

          <p>
            Revisa estos puntos antes de publicar.
          </p>
        </div>
      </div>

      <div style={fraudAlertList}>
        {suspiciousAlerts.map(
          (
            alert,
            index
          ) => (
            <div
              key={`${alert}-${index}`}
              style={fraudAlertItem}
            >
              <span>
                !
              </span>

              <p>
                {alert}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  )}

  <div style={suggestionsHeader}>
    <div>
      <p style={sectionEyebrow}>
        RECOMENDACIONES
      </p>

      <h3 style={suggestionsTitle}>
        Cómo aumentar tu puntuación
      </h3>
    </div>

    <span style={suggestionCount}>
      {aiSuggestions.length}
    </span>
  </div>

  <div style={suggestionsList}>
    {aiSuggestions.length > 0 ? (
      aiSuggestions.map(
        (
          suggestion,
          index
        ) => (
          <div
            key={`${suggestion.title}-${index}`}
            style={suggestionCard(
              suggestion.type
            )}
          >
            <div style={suggestionIcon}>
              {suggestion.icon}
            </div>

            <div style={suggestionContent}>
              <strong>
                {suggestion.title}
              </strong>

              <p>
                {suggestion.description}
              </p>
            </div>

            {suggestion.points > 0 && (
              <span style={suggestionPoints}>
                +{suggestion.points}
              </span>
            )}
          </div>
        )
      )
    ) : (
      <div style={allCompletedBox}>
        <span>
          ✨
        </span>

        <div>
          <strong>
            Publicación optimizada
          </strong>

          <p>
            Completaste todas las recomendaciones
            principales de QSM.
          </p>
        </div>
      </div>
    )}
  </div>

  <div style={aiRecommendationBox}>
    <strong>
      Diagnóstico QSM
    </strong>

    <p>
      {estimatedSaleTime.message}
    </p>

    <small>
      Las estimaciones son orientativas y no garantizan
      que el producto se venderá dentro de ese periodo.
    </small>
  </div>
</section>

              <section style={previewCard}>
                <div style={previewHeader}>
                  <div>
                    <p style={sectionEyebrow}>
                      VISTA PREVIA
                    </p>

                    <h2>
                      Así verá el comprador
                    </h2>
                  </div>

                  <span style={previewStatusBadge}>
                    Vista en vivo
                  </span>
                </div>

                <div style={previewImageWrap}>
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Vista previa principal"
                      style={previewImageStyle}
                    />
                  ) : (
                    <div style={emptyPreviewImage}>
                      <span>
                        📦
                      </span>

                      <p>
                        Agrega una imagen principal
                      </p>
                    </div>
                  )}

                  <span style={previewBadge}>
                    Pago Protegido
                  </span>

                  {isVerified && (
                    <span style={verifiedPreviewBadge}>
                      Vendedor verificado
                    </span>
                  )}
                </div>

                <p style={previewCategory}>
                  {form.category ||
                    "Categoría"}
                </p>

                <h3 style={previewTitle}>
                  {form.title ||
                    "Tu producto aparecerá aquí"}
                </h3>

                <h2 style={previewPrice}>
                  RD${" "}
                  {Number(form.price) > 0
                    ? Number(
                        form.price
                      ).toLocaleString(
                        "es-DO"
                      )
                    : "0"}
                </h2>

                <p style={previewText}>
                  {form.description ||
                    "Agrega una descripción clara para generar confianza en el comprador."}
                </p>

                <div style={previewMetaGrid}>
                  <PreviewMeta
                    label="Condición"
                    value={formatCondition(
                      form.condition
                    )}
                  />

                  <PreviewMeta
                    label="Ubicación"
                    value={
                      form.location ||
                      "No especificada"
                    }
                  />

                  <PreviewMeta
                    label="Entrega"
                    value={formatDeliveryMethod(
                      form.deliveryMethod
                    )}
                  />

                  <PreviewMeta
                    label="Garantía"
                    value={
                      form.warranty ||
                      "No especificada"
                    }
                  />
                </div>

                <div style={sellerPreview}>
                  <SellerAvatar
                    photo={profilePhoto}
                    name={fullName}
                  />

                  <div style={sellerPreviewContent}>
                    <strong>
                      {fullName}
                    </strong>

                    <p>
                      Confianza {trustScore}/100
                    </p>

                    <span>
                      {isVerified
                        ? "Identidad verificada"
                        : "Verificación pendiente"}
                    </span>
                  </div>
                </div>
              </section>

              <section style={publicationChecklistCard}>
                <p style={sectionEyebrow}>
                  REVISIÓN FINAL
                </p>

                <h2 style={checklistTitle}>
                  Antes de publicar
                </h2>

                <ChecklistItem
                  done={
                    form.title
                      .trim()
                      .length >= 5
                  }
                  text="Título claro"
                />

                <ChecklistItem
                  done={
                    form.description
                      .trim()
                      .length >= 40
                  }
                  text="Descripción suficiente"
                />

                <ChecklistItem
                  done={
                    imageFiles.length > 0
                  }
                  text="Evidencia fotográfica"
                />

                <ChecklistItem
                  done={
                    Number(form.price) > 0
                  }
                  text="Precio válido"
                />

                <ChecklistItem
                  done={
                    Boolean(
                      form.deliveryMethod
                    )
                  }
                  text="Entrega seleccionada"
                />

                <ChecklistItem
                  done={
                    Boolean(
                      form.location.trim()
                    )
                  }
                  text="Ubicación registrada"
                />

                <div style={publicationStatusBox}>
                  <span
                    style={publicationStatusDot(
                      canPublish
                    )}
                  />

                  <div>
                    <strong>
                      {canPublish
                        ? "Lista para publicar"
                        : "Publicación incompleta"}
                    </strong>

                    <p>
                      {canPublish
                        ? "QSM puede procesar esta publicación."
                        : "Completa los campos pendientes antes de continuar."}
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </section>
        </main>
      </div>

      <div
        className="new-product-actions"
        style={buttonRow(
          sidebarCollapsed
        )}
      >
        <button
          type="button"
          onClick={
            handleCancelPublication
          }
          disabled={isBusy}
          style={cancelButton}
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={saveDraft}
          disabled={isBusy}
          style={draftButton}
        >
          {savingDraft
            ? "Guardando..."
            : "Guardar borrador"}
        </button>

        {draftSavedAt && (
          <button
            type="button"
            onClick={clearDraft}
            disabled={isBusy}
            style={deleteDraftButton}
          >
            Eliminar borrador
          </button>
        )}

<button
  type="submit"
  form="new-product-form"
  disabled={!canPublish}
  style={submitButton(
    canPublish
  )}
>
  {submitting
    ? "Publicando..."
    : "Publicar producto seguro →"}
</button>
      </div>

      <AiAssistant
        pageContext="new-product"
      />
    </div>
  );
}
/*
|--------------------------------------------------------------------------
| COMPONENTES AUXILIARES
|--------------------------------------------------------------------------
*/

function ProductField({
  label,
  children,
  required = false,
  error = "",
  hint = ""
}) {
  return (
    <div style={fieldWrapper}>
      <div style={fieldHeader}>
        <label style={fieldLabel}>
          {label}

          {required && (
            <span style={requiredStar}>
              *
            </span>
          )}
        </label>

        {hint && (
          <span style={fieldHint}>
            {hint}
          </span>
        )}
      </div>

      {children}

      {error && (
        <span style={fieldError}>
          {error}
        </span>
      )}
    </div>
  );
}

function EvidenceOption({
  name,
  checked,
  onChange,
  icon,
  title,
  description,
  disabled
}) {
  return (
    <label
      style={evidenceOptionCard(
        checked
      )}
    >
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={{
          display:
            "none"
        }}
      />

      <div style={evidenceOptionIcon}>
        {icon}
      </div>

      <div style={{ minWidth: 0 }}>
        <strong>
          {title}
        </strong>

        <p>
          {description}
        </p>
      </div>

      <span
        style={evidenceCheck(
          checked
        )}
      >
        {checked
          ? "✓"
          : ""}
      </span>
    </label>
  );
}

/*
|--------------------------------------------------------------------------
*/

function Step({
  active,
  number,
  text,
  description
}) {
  return (
    <div
      style={{
        ...stepCard,

        borderColor:
          active
            ? "#35d0c3"
            : "rgba(148,163,184,.15)",

        background:
          active
            ? "rgba(53,208,195,.10)"
            : "rgba(15,23,42,.50)"
      }}
    >
      <div
        style={{
          ...stepNumber,

          background:
            active
              ? "#35d0c3"
              : "#1e293b",

          color:
            active
              ? "#02131f"
              : "#94a3b8"
        }}
      >
        {number}
      </div>

      <strong>
        {text}
      </strong>

      <span>
        {description}
      </span>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
*/

function AnalysisLine({
  icon,
  title,
  value,
  done,
  optional = false
}) {
  return (
    <div style={analysisRow}>
      <div style={analysisIcon}>
        {icon}
      </div>

      <div
        style={{
          flex: 1
        }}
      >
        <strong>
          {title}
        </strong>

        <p>
          {value}
        </p>
      </div>

      <span
        style={{
          ...analysisStatus,

          background:
            done
              ? "rgba(34,197,94,.16)"
              : optional
              ? "rgba(59,130,246,.16)"
              : "rgba(245,158,11,.16)",

          color:
            done
              ? "#4ade80"
              : optional
              ? "#60a5fa"
              : "#facc15"
        }}
      >
        {done
          ? "OK"
          : optional
          ? "OPT"
          : "..."}
      </span>
    </div>
  );
}
/*
|--------------------------------------------------------------------------
*/
function IntelligenceStat({
  icon,
  label,
  value,
  helper,
  color
}) {
  return (
    <article style={intelligenceStatCard}>
      <div
        style={{
          ...intelligenceStatIcon,
          color,
          borderColor:
            `${color}35`,
          background:
            `${color}12`
        }}
      >
        {icon}
      </div>

      <div style={{ minWidth: 0 }}>
        <span style={intelligenceStatLabel}>
          {label}
        </span>

        <strong
          style={{
            ...intelligenceStatValue,
            color
          }}
        >
          {value}
        </strong>

        <small style={intelligenceStatHelper}>
          {helper}
        </small>
      </div>
    </article>
  );
}


/*
|--------------------------------------------------------------------------
*/

function PreviewMeta({
  label,
  value
}) {
  return (
    <div style={previewMetaCard}>
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
*/

function ChecklistItem({
  done,
  text
}) {
  return (
    <div style={checkRow}>
      <div
        style={{
          ...checkCircle,

          background:
            done
              ? "#35d0c3"
              : "#1e293b",

          color:
            done
              ? "#02131f"
              : "#64748b"
        }}
      >
        {done
          ? "✓"
          : ""}
      </div>

      <span>
        {text}
      </span>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
*/

function SellerAvatar({
  photo,
  name
}) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        style={sellerAvatar}
      />
    );
  }

  return (
    <div style={sellerAvatarPlaceholder}>
      {name
        ?.charAt(0)
        ?.toUpperCase()}
    </div>
  );
}
/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| JSON seguro
|--------------------------------------------------------------------------
*/

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/*
|--------------------------------------------------------------------------
| Limitar números
|--------------------------------------------------------------------------
*/

function clampNumber(
  value,
  min,
  max,
  fallback = 0
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(
    max,
    Math.max(
      min,
      number
    )
  );
}

/*
|--------------------------------------------------------------------------
| Nombre bonito
|--------------------------------------------------------------------------
*/

function formatPersonName(name = "") {
  return String(name)
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(
      word =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

/*
|--------------------------------------------------------------------------
| Cortar texto
|--------------------------------------------------------------------------
*/

function truncateText(
  value,
  max = 40
) {
  if (!value) {
    return "";
  }

  if (
    value.length <= max
  ) {
    return value;
  }

  return (
    value.substring(
      0,
      max
    ) + "..."
  );
}

/*
|--------------------------------------------------------------------------
| Formato de dinero
|--------------------------------------------------------------------------
*/

function formatMoney(value) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return "RD$ 0";
  }

  return (
    "RD$ " +
    number.toLocaleString(
      "es-DO",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    )
  );
}

/*
|--------------------------------------------------------------------------
| Formato tamaño archivo
|--------------------------------------------------------------------------
*/

function formatFileSize(bytes) {

  if (!bytes) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB"
  ];

  let size = bytes;
  let unit = 0;

  while (
    size >= 1024 &&
    unit <
      units.length - 1
  ) {
    size /= 1024;
    unit++;
  }

  return `${size.toFixed(
    size >= 10 ? 0 : 1
  )} ${units[unit]}`;
}

/*
|--------------------------------------------------------------------------
| Liberar Blob
|--------------------------------------------------------------------------
*/

function revokeBlobUrl(url) {

  if (
    !url ||
    typeof url !== "string"
  ) {
    return;
  }

  if (
    !url.startsWith("blob:")
  ) {
    return;
  }

  try {
    URL.revokeObjectURL(url);
  } catch {
    //
  }
}

/*
|--------------------------------------------------------------------------
| Imagen perfil
|--------------------------------------------------------------------------
*/

function getProfilePhotoUrl(
  photo
) {

  if (!photo) {
    return "";
  }

  if (
    photo.startsWith("blob:")
  ) {
    return photo;
  }

  if (
    photo.startsWith("http")
  ) {
    return photo;
  }

  if (
    photo.startsWith("/")
  ) {
    return (
      import.meta.env
        .VITE_API_URL?.replace(
          "/api",
          ""
        ) + photo
    );
  }

  return photo;
}

/*
|--------------------------------------------------------------------------
| Condición
|--------------------------------------------------------------------------
*/

function formatCondition(
  condition
) {

  switch (
    condition
  ) {

    case "NEW":
      return "Nuevo";

    case "LIKE_NEW":
      return "Como nuevo";

    case "USED_GOOD":
      return "Buen estado";

    case "USED_DETAILS":
      return "Con detalles";

    case "FOR_PARTS":
      return "Para piezas";

    default:
      return "No indicada";
  }

}

/*
|--------------------------------------------------------------------------
| Delivery
|--------------------------------------------------------------------------
*/

function formatDeliveryMethod(
  method
) {

  switch (
    method
  ) {

    case "QSM_WAREHOUSE":
      return "Almacén QSM";

    case "QSM_VERIFIED_DELIVERY":
      return "Delivery QSM";

    case "DIRECT_DELIVERY":
      return "Entrega directa";

    default:
      return "No indicado";
  }

}

/*
|--------------------------------------------------------------------------
| color de riesgo
|--------------------------------------------------------------------------
*/
function getRiskColor(type) {
  switch (type) {
    case "success":
      return "#22c55e";

    case "warning":
      return "#facc15";

    case "high":
      return "#fb923c";

    case "critical":
      return "#f87171";

    default:
      return "#94a3b8";
  }
}


/*
|--------------------------------------------------------------------------
| Riesgo IA
|--------------------------------------------------------------------------
*/

function calculateRisk(
  completion,
  images,
  description
) {

  let score = 100;

  score -=
    completion * 0.45;

  score -=
    images * 4;

  score -=
    Math.min(
      description / 20,
      25
    );

  return Math.max(
    0,
    Math.round(score)
  );
}
/*
|--------------------------------------------------------------------------
| MOTOR DE IA QSM
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Recomendación principal
|--------------------------------------------------------------------------
*/

function getPublicationRecommendation({
  completion,
  imageCount,
  descriptionLength,
  hasVideo
}) {

  if (completion < 30) {
    return "La publicación está muy incompleta. Agrega información antes de continuar.";
  }

  if (imageCount === 0) {
    return "Agrega fotografías reales del producto para aumentar la confianza del comprador.";
  }

  if (descriptionLength < 80) {
    return "Describe mejor el estado, accesorios, garantía y funcionamiento.";
  }

  if (imageCount < 3) {
    return "Tres o más fotografías aumentan significativamente la probabilidad de venta.";
  }

  if (!hasVideo) {
    return "Agregar un video demostrando el funcionamiento genera mucha más confianza.";
  }

  if (completion >= 95) {
    return "Excelente publicación. Cumple prácticamente todas las recomendaciones de QSM.";
  }

  return "La publicación tiene buena calidad. Revisa nuevamente antes de publicarla.";
}

/*
|--------------------------------------------------------------------------
| Score de calidad
|--------------------------------------------------------------------------
*/

function calculatePublicationScore({
  completion,
  imageCount,
  descriptionLength,
  hasVideo,
  verified
}) {

  let score = 0;

  score += completion;

  score += Math.min(
    imageCount * 5,
    25
  );

  score += Math.min(
    Math.floor(descriptionLength / 40),
    15
  );

  if (hasVideo) {
    score += 10;
  }

  if (verified) {
    score += 10;
  }

  return Math.min(
    100,
    score
  );
}

/*
|--------------------------------------------------------------------------
| Nivel de confianza
|--------------------------------------------------------------------------
*/

function publicationTrustLevel(score) {

  if (score >= 95) {

    return {
      color: "#22c55e",
      label: "Excelente"
    };

  }

  if (score >= 80) {

    return {
      color: "#35d0c3",
      label: "Muy alta"
    };

  }

  if (score >= 65) {

    return {
      color: "#3b82f6",
      label: "Alta"
    };

  }

  if (score >= 45) {

    return {
      color: "#facc15",
      label: "Media"
    };

  }

  return {
    color: "#ef4444",
    label: "Baja"
  };

}

/*
|--------------------------------------------------------------------------
| Posible fraude
|--------------------------------------------------------------------------
*/

function detectSuspiciousPublication({

  price,

  imageCount,

  description,

  reason

}) {

  const alerts = [];

  if (
    Number(price) <= 0
  ) {

    alerts.push(
      "Precio inválido."
    );

  }

  if (
    imageCount === 0
  ) {

    alerts.push(
      "No existen fotografías."
    );

  }

  if (
    description
      .trim()
      .length < 40
  ) {

    alerts.push(
      "Descripción demasiado corta."
    );

  }

  if (

    Number(price) < 500 &&

    reason === "NONE"

  ) {

    alerts.push(
      "Precio muy bajo sin explicación."
    );

  }

  return alerts;

}

/*
|--------------------------------------------------------------------------
| Nivel IA
|--------------------------------------------------------------------------
*/

function getAiLevel(score) {

  if (score >= 90)
    return "QSM Platinum";

  if (score >= 75)
    return "QSM Gold";

  if (score >= 60)
    return "QSM Silver";

  if (score >= 40)
    return "QSM Bronze";

  return "Sin clasificar";

}

/*
|--------------------------------------------------------------------------
| Mensaje IA
|--------------------------------------------------------------------------
*/

function getAiMessage(score) {

  if (score >= 95) {
    return "La IA considera que esta publicación inspira mucha confianza.";
  }

  if (score >= 80) {
    return "La publicación tiene excelente calidad.";
  }

  if (score >= 60) {
    return "Hay algunos aspectos que pueden mejorarse.";
  }

  if (score >= 40) {
    return "Se recomienda completar más información.";
  }

  return "La publicación necesita muchas mejoras antes de publicarse.";

}

/*
|--------------------------------------------------------------------------
| Barra de progreso IA
|--------------------------------------------------------------------------
*/

function aiProgressColor(score) {

  if (score >= 90)
    return "#22c55e";

  if (score >= 75)
    return "#35d0c3";

  if (score >= 60)
    return "#3b82f6";

  if (score >= 40)
    return "#facc15";

  return "#ef4444";

}

/*
|--------------------------------------------------------------------------
| Consejos IA
|--------------------------------------------------------------------------
*/

function buildAiSuggestions({

  completion,

  imageCount,

  hasVideo,

  verified,

  descriptionLength

}) {

  const tips = [];

  if (imageCount < 5) {

    tips.push(
      "Agregar más fotografías."
    );

  }

  if (!hasVideo) {

    tips.push(
      "Subir un video del producto."
    );

  }

  if (
    descriptionLength < 150
  ) {

    tips.push(
      "Ampliar la descripción."
    );

  }

  if (!verified) {

    tips.push(
      "Completar la verificación QSM."
    );

  }

  if (
    completion < 100
  ) {

    tips.push(
      "Completar todos los campos."
    );

  }

  return tips;

}
/*
|--------------------------------------------------------------------------
| Página
|--------------------------------------------------------------------------
*/

const page = {
  width: "100%",
  minHeight: "100vh",

  color: "#f8fafc",

  background: `
    radial-gradient(
      circle at 88% 5%,
      rgba(139, 92, 246, .18),
      transparent 29%
    ),
    radial-gradient(
      circle at 15% 12%,
      rgba(53, 208, 195, .11),
      transparent 27%
    ),
    #020617
  `
};

/*
|--------------------------------------------------------------------------
| Layout con Sidebar completo o minimizado
|--------------------------------------------------------------------------
*/

const layoutPage = (
  sidebarCollapsed
) => ({
  width: "100%",
  minHeight: "100vh",

  display: "grid",

  gridTemplateColumns:
    sidebarCollapsed
      ? "96px minmax(0, 1fr)"
      : "300px minmax(0, 1fr)",

  overflowX: "hidden",

  transition:
    "grid-template-columns .28s ease"
});

const main = {
  width: "100%",
  minWidth: 0,
  minHeight: "100vh",

  padding: "24px 30px 130px",

  overflowX: "hidden"
};

/*
|--------------------------------------------------------------------------
| Hero
|--------------------------------------------------------------------------
*/

const hero = {
  display: "grid",

  gridTemplateColumns:
    "minmax(0, 1fr) minmax(320px, 390px)",

  alignItems: "center",
  gap: "24px",

  width: "100%",

  margin: "20px 0 24px"
};

const label = {
  margin: 0,

  color: "#35d0c3",

  fontSize: "10px",
  fontWeight: "950",

  letterSpacing: "3.5px",
  textTransform: "uppercase"
};

const title = {
  margin: "9px 0 8px",

  color: "#ffffff",

  fontSize:
    "clamp(37px, 3.5vw, 58px)",

  lineHeight: "1.04",
  letterSpacing: "-1.8px"
};

const gradientText = {
  background:
    "linear-gradient(90deg, #35d0c3, #38bdf8, #8b5cf6)",

  WebkitBackgroundClip:
    "text",

  WebkitTextFillColor:
    "transparent",

  color: "transparent"
};

const subtitle = {
  maxWidth: "790px",

  margin: 0,

  color: "#94a3b8",

  fontSize: "13px",
  lineHeight: "21px"
};

const draftInformationRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "9px",

  marginTop: "15px"
};

const draftStatusBadge = {
  minHeight: "30px",

  display: "inline-flex",
  alignItems: "center",

  padding: "6px 10px",

  borderRadius: "999px",

  border:
    "1px solid rgba(56, 189, 248, .28)",

  background:
    "rgba(56, 189, 248, .10)",

  color: "#bae6fd",

  fontSize: "8px",
  fontWeight: "900"
};

const verifiedSellerBadge = {
  ...draftStatusBadge,

  border:
    "1px solid rgba(34, 197, 94, .30)",

  background:
    "rgba(34, 197, 94, .12)",

  color: "#86efac"
};

const pendingSellerBadge = {
  ...draftStatusBadge,

  border:
    "1px solid rgba(245, 158, 11, .30)",

  background:
    "rgba(245, 158, 11, .12)",

  color: "#fde68a"
};

const heroBadge = {
  position: "relative",

  minWidth: 0,

  display: "grid",

  gridTemplateColumns:
    "58px minmax(0, 1fr)",

  alignItems: "center",
  gap: "14px",

  padding: "18px",

  borderRadius: "22px",

  border:
    "1px solid rgba(53, 208, 195, .20)",

  background:
    "linear-gradient(135deg, rgba(15, 23, 42, .86), rgba(30, 27, 75, .45))",

  boxShadow:
    "0 22px 70px rgba(0, 0, 0, .22)",

  backdropFilter: "blur(15px)"
};

const heroIcon = {
  width: "58px",
  height: "58px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "18px",

  background:
    "linear-gradient(135deg, #35d0c3, #38bdf8, #8b5cf6)",

  fontSize: "27px",

  animation:
    "qsmNewProductPulse 2.5s infinite"
};

const heroBadgeContent = {
  minWidth: 0
};

const riskStatusBadge = (
  type
) => {
  const variants = {
    success: {
      border:
        "1px solid rgba(34, 197, 94, .28)",
      background:
        "rgba(34, 197, 94, .13)",
      color:
        "#86efac"
    },

    warning: {
      border:
        "1px solid rgba(245, 158, 11, .28)",
      background:
        "rgba(245, 158, 11, .13)",
      color:
        "#fde68a"
    },

    high: {
  border:
    "1px solid rgba(249, 115, 22, .38)",

  background:
    "rgba(249, 115, 22, .14)",

  color:
    "#fdba74"
},

critical: {
  border:
    "1px solid rgba(239, 68, 68, .40)",

  background:
    "rgba(239, 68, 68, .15)",

  color:
    "#fca5a5"
},

    pending: {
      border:
        "1px solid rgba(148, 163, 184, .20)",
      background:
        "rgba(148, 163, 184, .10)",
      color:
        "#cbd5e1"
    }
  };

  return {
    position: "absolute",

    top: "-9px",
    right: "13px",

    minHeight: "26px",

    display: "inline-flex",
    alignItems: "center",

    padding: "5px 9px",

    borderRadius: "999px",

    fontSize: "7px",
    fontWeight: "950",

    ...(variants[type] ||
      variants.pending)
  };
};

/*
|--------------------------------------------------------------------------
| Mensajes
|--------------------------------------------------------------------------
*/

const successBox = {
  display: "grid",

  gridTemplateColumns:
    "38px minmax(0, 1fr)",

  alignItems: "flex-start",
  gap: "11px",

  marginBottom: "16px",
  padding: "14px 16px",

  borderRadius: "15px",

  border:
    "1px solid rgba(34, 197, 94, .30)",

  background:
    "rgba(20, 83, 45, .18)",

  color: "#bbf7d0",

  fontSize: "10px",
  lineHeight: "17px"
};

const errorBox = {
  ...successBox,

  border:
    "1px solid rgba(248, 113, 113, .30)",

  background:
    "rgba(127, 29, 29, .22)",

  color: "#fecaca"
};

const uploadingBox = {
  ...successBox,

  border:
    "1px solid rgba(56, 189, 248, .28)",

  background:
    "rgba(14, 116, 144, .12)",

  color: "#bae6fd"
};

const messageIcon = {
  width: "38px",
  height: "38px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "12px",

  background:
    "rgba(255, 255, 255, .08)",

  fontSize: "17px",
  fontWeight: "950"
};

/*
|--------------------------------------------------------------------------
| Layout de contenido
|--------------------------------------------------------------------------
*/

const contentLayout = {
  display: "grid",

  gridTemplateColumns:
    "minmax(0, 1fr) minmax(390px, 500px)",

  alignItems: "start",
  gap: "20px",

  width: "100%"
};

const formCard = {
  minWidth: 0,

  padding: "25px",

  borderRadius: "26px",

  border:
    "1px solid rgba(53, 208, 195, .16)",

  background:
    "rgba(15, 23, 42, .75)",

  boxShadow:
    "0 28px 95px rgba(0, 0, 0, .30)",

  backdropFilter: "blur(15px)",

  animation:
    "qsmNewProductFade .35s ease"
};

/*
|--------------------------------------------------------------------------
| Pasos
|--------------------------------------------------------------------------
*/

const stepBar = {
  display: "grid",

  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",

  gap: "10px",

  marginBottom: "24px"
};

const stepCard = {
  minWidth: 0,
  minHeight: "74px",

  display: "grid",

  gridTemplateColumns:
    "36px minmax(0, 1fr)",

  alignItems: "center",
  columnGap: "10px",

  padding: "11px",

  borderRadius: "15px",
  border: "1px solid transparent"
};

const stepNumber = {
  width: "36px",
  height: "36px",

  gridRow: "1 / 3",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "12px",

  fontSize: "11px",
  fontWeight: "950"
};

/*
|--------------------------------------------------------------------------
| Encabezados de sección
|--------------------------------------------------------------------------
*/

const formSectionHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "18px",

  marginBottom: "17px"
};

const sectionEyebrow = {
  margin: 0,

  color: "#35d0c3",

  fontSize: "8px",
  fontWeight: "950",

  letterSpacing: "2.6px",
  textTransform: "uppercase"
};

const sectionHeading = {
  margin: "6px 0 5px",

  color: "#f8fafc",

  fontSize: "20px",
  lineHeight: "25px"
};

const sectionDescription = {
  maxWidth: "650px",

  margin: 0,

  color: "#94a3b8",

  fontSize: "10px",
  lineHeight: "17px"
};

const completionBadge = {
  minHeight: "30px",
  flexShrink: 0,

  display: "inline-flex",
  alignItems: "center",

  padding: "6px 10px",

  borderRadius: "999px",

  border:
    "1px solid rgba(53, 208, 195, .28)",

  background:
    "rgba(53, 208, 195, .11)",

  color: "#5eead4",

  fontSize: "8px",
  fontWeight: "950"
};

const optionalBadge = {
  ...completionBadge,

  border:
    "1px solid rgba(139, 92, 246, .28)",

  background:
    "rgba(139, 92, 246, .12)",

  color: "#ddd6fe"
};

const formSectionDivider = {
  width: "100%",
  height: "1px",

  margin: "25px 0",

  background:
    "linear-gradient(90deg, transparent, rgba(148, 163, 184, .16), transparent)"
};

/*
|--------------------------------------------------------------------------
| Campos
|--------------------------------------------------------------------------
*/

const fieldWrapper = {
  minWidth: 0,

  display: "grid",
  gap: "8px",

  marginBottom: "14px"
};

const fieldHeader = {
  minWidth: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px"
};

const fieldLabel = {
  color: "#e2e8f0",

  fontSize: "10px",
  fontWeight: "900"
};

const requiredStar = {
  marginLeft: "3px",

  color: "#f87171"
};

const fieldHint = {
  color: "#64748b",

  fontSize: "8px",
  textAlign: "right"
};

const fieldError = {
  color: "#fca5a5",

  fontSize: "8px",
  lineHeight: "14px"
};

const fieldErrorText = {
  margin: "8px 0 0",

  color: "#fca5a5",

  fontSize: "9px",
  lineHeight: "15px"
};

const fieldInput = (
  hasError
) => ({
  width: "100%",
  minWidth: 0,
  minHeight: "51px",

  padding: "0 14px",

  borderRadius: "14px",

  border:
    hasError
      ? "1px solid rgba(248, 113, 113, .56)"
      : "1px solid rgba(148, 163, 184, .16)",

  background:
    "rgba(2, 6, 23, .53)",

  color: "#ffffff",

  fontSize: "11px",

  outline: "none",

  boxShadow:
    hasError
      ? "0 0 0 3px rgba(239, 68, 68, .08)"
      : "none"
});

const fieldTextarea = (
  hasError
) => ({
  ...fieldInput(hasError),

  minHeight: "135px",

  padding: "13px 14px",

  resize: "vertical",

  lineHeight: "19px"
});

const twoColumns = {
  display: "grid",

  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",

  gap: "14px"
};

/*
|--------------------------------------------------------------------------
|technicalScoreBadge
|--------------------------------------------------------------------------
*/

const technicalScoreBadge = {
  minHeight: "30px",
  flexShrink: 0,

  display: "inline-flex",
  alignItems: "center",

  padding: "6px 10px",

  borderRadius: "999px",

  border:
    "1px solid rgba(56,189,248,.28)",

  background:
    "rgba(56,189,248,.10)",

  color: "#bae6fd",

  fontSize: "8px",
  fontWeight: "950"
};

const evidenceOptionsGrid = {
  display: "grid",

  gridTemplateColumns:
    "repeat(3, minmax(0,1fr))",

  gap: "10px",

  marginTop: "5px"
};

const evidenceOptionCard = (
  checked
) => ({
  minWidth: 0,

  display: "grid",

  gridTemplateColumns:
    "40px minmax(0,1fr) 25px",

  alignItems: "center",
  gap: "9px",

  minHeight: "92px",

  padding: "11px",

  borderRadius: "15px",

  border:
    checked
      ? "1px solid rgba(53,208,195,.40)"
      : "1px solid rgba(148,163,184,.13)",

  background:
    checked
      ? "rgba(53,208,195,.10)"
      : "rgba(2,6,23,.34)",

  color: "#cbd5e1",

  fontSize: "8px",
  lineHeight: "13px",

  cursor:
    "pointer"
});

const evidenceOptionIcon = {
  width: "40px",
  height: "40px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "12px",

  background:
    "rgba(53,208,195,.08)",

  fontSize: "17px"
};

const evidenceCheck = (
  checked
) => ({
  width: "24px",
  height: "24px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "50%",

  background:
    checked
      ? "#35d0c3"
      : "#1e293b",

  color:
    checked
      ? "#02131f"
      : "#64748b",

  fontSize: "9px",
  fontWeight: "950"
});

/*
|--------------------------------------------------------------------------
| Precio
|--------------------------------------------------------------------------
*/

const moneyInputContainer = {
  minHeight: "51px",

  display: "grid",

  gridTemplateColumns:
    "58px minmax(0, 1fr)",

  alignItems: "center",

  overflow: "hidden",

  borderRadius: "14px",

  border:
    "1px solid rgba(148, 163, 184, .16)",

  background:
    "rgba(2, 6, 23, .53)"
};

const moneyPrefix = {
  height: "100%",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRight:
    "1px solid rgba(148, 163, 184, .12)",

  color: "#35d0c3",

  fontSize: "10px",
  fontWeight: "950"
};

const moneyInput = {
  width: "100%",
  minWidth: 0,
  height: "49px",

  padding: "0 13px",

  border: "none",
  outline: "none",

  background: "transparent",

  color: "#ffffff",

  fontSize: "11px"
};

/*
|--------------------------------------------------------------------------
| Resumen de archivos
|--------------------------------------------------------------------------
*/

const mediaSummary = {
  display: "flex",
  alignItems: "center",
  gap: "8px",

  flexShrink: 0
};

const uploadBox = {
  minHeight: "145px",

  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",

  padding: "20px",

  borderRadius: "20px",

  border:
    "1px dashed rgba(53, 208, 195, .38)",

  background:
    "linear-gradient(135deg, rgba(53, 208, 195, .07), rgba(139, 92, 246, .08))",

  color: "#cbd5e1",

  textAlign: "center",

  cursor: "pointer"
};

const uploadBoxVideo = {
  ...uploadBox,

  border:
    "1px dashed rgba(139, 92, 246, .40)"
};

const uploadIcon = {
  marginBottom: "9px",

  fontSize: "37px"
};

/*
|--------------------------------------------------------------------------
| Galería de imágenes
|--------------------------------------------------------------------------
*/

const mediaGrid = {
  display: "grid",

  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",

  gap: "12px",

  marginTop: "15px"
};

const mediaCard = (
  isMain
) => ({
  minWidth: 0,

  overflow: "hidden",

  borderRadius: "18px",

  border:
    isMain
      ? "1px solid rgba(53, 208, 195, .48)"
      : "1px solid rgba(148, 163, 184, .14)",

  background:
    "rgba(2, 6, 23, .43)",

  boxShadow:
    isMain
      ? "0 16px 45px rgba(53, 208, 195, .12)"
      : "none"
});

const mediaImageContainer = {
  position: "relative",

  width: "100%",
  height: "180px",

  overflow: "hidden",

  background: "#020617"
};

const mediaImg = {
  width: "100%",
  height: "100%",

  display: "block",

  objectFit: "cover",
  objectPosition: "center"
};

const mainImageBadge = {
  position: "absolute",

  left: "10px",
  bottom: "10px",

  minHeight: "25px",

  display: "inline-flex",
  alignItems: "center",

  padding: "5px 8px",

  borderRadius: "999px",

  border:
    "1px solid rgba(53, 208, 195, .38)",

  background:
    "rgba(2, 6, 23, .75)",

  color: "#5eead4",

  fontSize: "7px",
  fontWeight: "950",

  backdropFilter: "blur(9px)"
};

const mediaPositionBadge = {
  position: "absolute",

  top: "9px",
  right: "9px",

  width: "25px",
  height: "25px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "50%",

  background:
    "rgba(2, 6, 23, .75)",

  color: "#ffffff",

  fontSize: "8px",
  fontWeight: "950"
};

const mediaInformation = {
  minWidth: 0,

  display: "grid",
  gap: "4px",

  padding: "11px 12px",

  color: "#cbd5e1",

  fontSize: "8px"
};

const mediaControls = {
  display: "grid",

  gridTemplateColumns:
    "minmax(0, 1fr) 34px 34px 34px",

  gap: "6px",

  padding: "0 11px 11px"
};

const mediaPrimaryButton = {
  minHeight: "34px",

  borderRadius: "10px",

  border:
    "1px solid rgba(53, 208, 195, .28)",

  background:
    "rgba(53, 208, 195, .11)",

  color: "#5eead4",

  fontSize: "8px",
  fontWeight: "900",

  cursor: "pointer"
};

const mediaControlButton = {
  width: "34px",
  height: "34px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "10px",

  border:
    "1px solid rgba(148, 163, 184, .15)",

  background:
    "rgba(15, 23, 42, .70)",

  color: "#cbd5e1",

  fontSize: "12px",

  cursor: "pointer"
};

const mediaDeleteButton = {
  ...mediaControlButton,

  border:
    "1px solid rgba(239, 68, 68, .26)",

  background:
    "rgba(127, 29, 29, .18)",

  color: "#fca5a5"
};

const clearMediaButton = {
  minHeight: "40px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  marginTop: "12px",
  padding: "9px 13px",

  borderRadius: "12px",

  border:
    "1px solid rgba(239, 68, 68, .23)",

  background:
    "rgba(127, 29, 29, .13)",

  color: "#fca5a5",

  fontSize: "9px",
  fontWeight: "900",

  cursor: "pointer"
};

/*
|--------------------------------------------------------------------------
| Video
|--------------------------------------------------------------------------
*/

const videoBox = {
  overflow: "hidden",

  borderRadius: "19px",

  border:
    "1px solid rgba(139, 92, 246, .24)",

  background:
    "rgba(2, 6, 23, .44)"
};

const videoPlayer = {
  width: "100%",
  maxHeight: "360px",

  display: "block",

  background: "#020617"
};

const videoInformationBox = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "15px",

  padding: "13px"
};

const videoActions = {
  display: "flex",
  alignItems: "center",
  gap: "8px",

  flexShrink: 0
};

const replaceVideoButton = {
  minHeight: "37px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "8px 11px",

  borderRadius: "11px",

  border:
    "1px solid rgba(139, 92, 246, .28)",

  background:
    "rgba(139, 92, 246, .12)",

  color: "#ddd6fe",

  fontSize: "8px",
  fontWeight: "900",

  cursor: "pointer"
};

const removeVideoButton = {
  minHeight: "37px",

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "8px 11px",

  borderRadius: "11px",

  border:
    "1px solid rgba(239, 68, 68, .25)",

  background:
    "rgba(127, 29, 29, .16)",

  color: "#fca5a5",

  fontSize: "8px",
  fontWeight: "900",

  cursor: "pointer"
};
/*
|--------------------------------------------------------------------------
| Columna derecha
|--------------------------------------------------------------------------
*/

const rightColumn = {
  minWidth: 0,

  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "18px",

  position: "sticky",
  top: "18px",

  alignSelf: "start"
};

/*
|--------------------------------------------------------------------------
| Tarjeta QSM AI
|--------------------------------------------------------------------------
*/

const aiCard = {
  minWidth: 0,

  padding: "22px",

  borderRadius: "25px",

  border:
    "1px solid rgba(53, 208, 195, .18)",

  background:
    `
      radial-gradient(
        circle at 90% 8%,
        rgba(139, 92, 246, .16),
        transparent 28%
      ),
      linear-gradient(
        145deg,
        rgba(15, 23, 42, .90),
        rgba(30, 41, 59, .65)
      )
    `,

  boxShadow:
    "0 26px 85px rgba(0, 0, 0, .28)",

  backdropFilter: "blur(16px)"
};

const aiHeader = {
  display: "flex",
  alignItems: "center",
  gap: "13px",

  marginBottom: "18px"
};

const aiBrain = {
  width: "58px",
  height: "58px",
  flexShrink: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "18px",

  border:
    "1px solid rgba(53, 208, 195, .26)",

  background:
    "linear-gradient(135deg, #35d0c3, #38bdf8, #8b5cf6)",

  fontSize: "27px",

  boxShadow:
    "0 14px 40px rgba(53, 208, 195, .18)"
};

/*
|--------------------------------------------------------------------------
| Score circular
|--------------------------------------------------------------------------
*/

const scoreCircle = {
  width: "132px",
  height: "132px",

  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",

  margin: "18px auto",

  borderRadius: "50%",

  border:
    "10px solid rgba(53, 208, 195, .20)",

  background:
    "radial-gradient(circle, rgba(53,208,195,.11), rgba(2,6,23,.88))",

  color: "#35d0c3",

  textAlign: "center",

  boxShadow:
    "0 18px 54px rgba(53, 208, 195, .14)",

  animation:
    "qsmNewProductFloat 4s ease-in-out infinite"
};

const scoreBar = {
  width: "100%",
  height: "9px",

  overflow: "hidden",

  marginBottom: "20px",

  borderRadius: "999px",

  background:
    "rgba(148, 163, 184, .14)"
};

const scoreFill = {
  height: "100%",

  borderRadius: "999px",

  background:
    "linear-gradient(90deg, #35d0c3, #38bdf8, #8b5cf6)",

  transition:
    "width .4s ease"
};

/*
|--------------------------------------------------------------------------
| Líneas de análisis
|--------------------------------------------------------------------------
*/

const analysisRow = {
  minWidth: 0,

  display: "grid",

  gridTemplateColumns:
    "42px minmax(0, 1fr) 36px",

  alignItems: "center",
  gap: "11px",

  padding: "12px 0",

  borderBottom:
    "1px solid rgba(148, 163, 184, .09)"
};

const analysisIcon = {
  width: "42px",
  height: "42px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "13px",

  border:
    "1px solid rgba(53, 208, 195, .14)",

  background:
    "rgba(53, 208, 195, .08)",

  fontSize: "18px"
};

const analysisStatus = {
  minWidth: "34px",
  height: "25px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "0 6px",

  borderRadius: "8px",

  fontSize: "7px",
  fontWeight: "950"
};

const aiRecommendationBox = {
  marginTop: "17px",
  padding: "14px",

  borderRadius: "15px",

  border:
    "1px solid rgba(139, 92, 246, .20)",

  background:
    "linear-gradient(135deg, rgba(53,208,195,.08), rgba(139,92,246,.09))",

  color: "#cbd5e1",

  fontSize: "9px",
  lineHeight: "16px"
};

/*
|--------------------------------------------------------------------------
| ai TITLE
|--------------------------------------------------------------------------
*/
const aiTitle = {
  margin: "5px 0 2px",
  color: "#f8fafc",
  fontSize: "19px",
  lineHeight: "24px"
};

const aiSubtitle = {
  margin: 0,
  color: "#94a3b8",
  fontSize: "9px",
  lineHeight: "15px"
};

const aiLevelBadge = {
  minHeight: "30px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  marginLeft: "auto",
  padding: "6px 10px",
  border: "1px solid transparent",
  borderRadius: "999px",
  fontSize: "8px",
  fontWeight: "950",
  whiteSpace: "nowrap"
};

const intelligenceHero = {
  display: "grid",
  gridTemplateColumns:
    "145px minmax(0, 1fr)",
  alignItems: "center",
  gap: "17px",
  marginBottom: "18px"
};

const scoreNumber = {
  fontSize: "38px",
  lineHeight: "38px",
  fontWeight: "950"
};

const scoreTotal = {
  marginTop: "1px",
  color: "#94a3b8",
  fontSize: "11px",
  fontWeight: "800"
};

const scoreCaption = {
  marginTop: "4px",
  color: "#cbd5e1",
  fontSize: "8px",
  fontWeight: "900",
  letterSpacing: ".7px"
};

const intelligenceSummary = {
  minWidth: 0,
  color: "#94a3b8",
  fontSize: "9px",
  lineHeight: "16px"
};

const trustLevelPill = {
  minHeight: "29px",
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  border: "1px solid transparent",
  borderRadius: "999px",
  fontSize: "8px",
  fontWeight: "950"
};

const intelligenceStatsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "9px",
  marginBottom: "16px"
};

const intelligenceStatCard = {
  minWidth: 0,
  display: "grid",
  gridTemplateColumns:
    "42px minmax(0, 1fr)",
  alignItems: "center",
  gap: "10px",
  padding: "11px",
  borderRadius: "15px",
  border:
    "1px solid rgba(148,163,184,.11)",
  background:
    "rgba(2,6,23,.38)"
};

const intelligenceStatIcon = {
  width: "42px",
  height: "42px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid transparent",
  borderRadius: "13px",
  fontSize: "17px"
};

const intelligenceStatLabel = {
  display: "block",
  marginBottom: "3px",
  color: "#94a3b8",
  fontSize: "7px",
  fontWeight: "900",
  textTransform: "uppercase",
  letterSpacing: ".8px"
};

const intelligenceStatValue = {
  display: "block",
  overflow: "hidden",
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: "950",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

const intelligenceStatHelper = {
  display: "block",
  marginTop: "2px",
  color: "#64748b",
  fontSize: "7px"
};

const riskIntelligenceCard = {
  marginBottom: "16px",
  padding: "15px",
  borderRadius: "18px",
  border:
    "1px solid rgba(148,163,184,.12)",
  background:
    "linear-gradient(135deg, rgba(2,6,23,.52), rgba(30,27,75,.25))"
};

const riskCardHeader = {
  display: "flex",
  alignItems: "center",
  gap: "11px"
};

const riskCardIcon = {
  width: "42px",
  height: "42px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "13px",
  fontSize: "17px"
};

const riskSmallLabel = {
  display: "block",
  color: "#64748b",
  fontSize: "7px",
  fontWeight: "950",
  letterSpacing: "1.1px"
};

const riskCardTitle = {
  display: "block",
  marginTop: "3px",
  color: "#f8fafc",
  fontSize: "13px"
};

const riskExplanation = {
  margin: "12px 0",
  color: "#94a3b8",
  fontSize: "9px",
  lineHeight: "16px"
};

const riskAdviceBox = {
  padding: "11px",
  borderRadius: "13px",
  border:
    "1px solid rgba(53,208,195,.13)",
  background:
    "rgba(53,208,195,.06)",
  color: "#cbd5e1",
  fontSize: "8px",
  lineHeight: "14px"
};

const analysisList = {
  marginBottom: "17px"
};

const fraudAlertsBox = {
  marginBottom: "17px",
  padding: "14px",
  borderRadius: "17px",
  border:
    "1px solid rgba(239,68,68,.28)",
  background:
    "rgba(127,29,29,.15)"
};

const fraudAlertHeader = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  color: "#fecaca",
  fontSize: "9px",
  lineHeight: "15px"
};

const fraudAlertList = {
  display: "grid",
  gap: "7px",
  marginTop: "10px"
};

const fraudAlertItem = {
  display: "grid",
  gridTemplateColumns:
    "22px minmax(0,1fr)",
  alignItems: "flex-start",
  gap: "7px",
  padding: "8px",
  borderRadius: "10px",
  background:
    "rgba(2,6,23,.30)",
  color: "#fca5a5",
  fontSize: "8px",
  lineHeight: "13px"
};

const suggestionsHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "10px"
};

const suggestionsTitle = {
  margin: "5px 0 0",
  color: "#f8fafc",
  fontSize: "14px"
};

const suggestionCount = {
  width: "27px",
  height: "27px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background:
    "rgba(139,92,246,.18)",
  color: "#ddd6fe",
  fontSize: "8px",
  fontWeight: "950"
};

const suggestionsList = {
  display: "grid",
  gap: "8px"
};

const suggestionCard = (
  type
) => {
  const variants = {
    IMPORTANT: {
      border:
        "1px solid rgba(245,158,11,.23)",
      background:
        "rgba(245,158,11,.07)"
    },

    SECURITY: {
      border:
        "1px solid rgba(239,68,68,.23)",
      background:
        "rgba(239,68,68,.07)"
    },

    OPTIONAL: {
      border:
        "1px solid rgba(59,130,246,.20)",
      background:
        "rgba(59,130,246,.07)"
    },

    INFO: {
      border:
        "1px solid rgba(53,208,195,.18)",
      background:
        "rgba(53,208,195,.06)"
    }
  };

  return {
    minWidth: 0,
    display: "grid",
    gridTemplateColumns:
      "36px minmax(0,1fr) auto",
    alignItems: "center",
    gap: "9px",
    padding: "10px",
    borderRadius: "13px",
    ...(variants[type] ||
      variants.INFO)
  };
};

const suggestionIcon = {
  width: "36px",
  height: "36px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "11px",
  background:
    "rgba(2,6,23,.38)",
  fontSize: "15px"
};

const suggestionContent = {
  minWidth: 0,
  color: "#cbd5e1",
  fontSize: "8px",
  lineHeight: "13px"
};

const suggestionPoints = {
  minWidth: "35px",
  minHeight: "25px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "4px 7px",
  borderRadius: "999px",
  background:
    "rgba(34,197,94,.13)",
  color: "#86efac",
  fontSize: "7px",
  fontWeight: "950"
};

const allCompletedBox = {
  display: "grid",
  gridTemplateColumns:
    "38px minmax(0,1fr)",
  alignItems: "center",
  gap: "10px",
  padding: "12px",
  borderRadius: "14px",
  border:
    "1px solid rgba(34,197,94,.22)",
  background:
    "rgba(34,197,94,.08)",
  color: "#bbf7d0",
  fontSize: "8px",
  lineHeight: "14px"
};


/*
|--------------------------------------------------------------------------
| Vista previa
|--------------------------------------------------------------------------
*/

const previewCard = {
  minWidth: 0,

  padding: "20px",

  borderRadius: "25px",

  border:
    "1px solid rgba(53, 208, 195, .16)",

  background:
    "rgba(15, 23, 42, .74)",

  boxShadow:
    "0 22px 70px rgba(0, 0, 0, .22)",

  backdropFilter: "blur(15px)"
};

const previewHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",

  marginBottom: "15px"
};

const previewStatusBadge = {
  minHeight: "27px",

  display: "inline-flex",
  alignItems: "center",

  padding: "5px 8px",

  borderRadius: "999px",

  border:
    "1px solid rgba(56, 189, 248, .26)",

  background:
    "rgba(56, 189, 248, .10)",

  color: "#bae6fd",

  fontSize: "7px",
  fontWeight: "950",

  whiteSpace: "nowrap"
};

const previewImageWrap = {
  position: "relative",

  width: "100%",
  height: "260px",

  overflow: "hidden",

  borderRadius: "20px",

  border:
    "1px solid rgba(148, 163, 184, .12)",

  background: "#020617"
};

const previewImageStyle = {
  width: "100%",
  height: "100%",

  display: "block",

  objectFit: "cover",
  objectPosition: "center"
};

const emptyPreviewImage = {
  width: "100%",
  height: "100%",

  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",

  gap: "8px",

  color: "#64748b",

  textAlign: "center",

  background:
    "linear-gradient(135deg, rgba(53,208,195,.07), rgba(139,92,246,.08))"
};

const previewBadge = {
  position: "absolute",

  left: "12px",
  bottom: "12px",

  minHeight: "28px",

  display: "inline-flex",
  alignItems: "center",

  padding: "6px 10px",

  borderRadius: "999px",

  border:
    "1px solid rgba(53, 208, 195, .34)",

  background:
    "rgba(2, 6, 23, .74)",

  color: "#5eead4",

  fontSize: "8px",
  fontWeight: "950",

  backdropFilter: "blur(10px)"
};

const verifiedPreviewBadge = {
  position: "absolute",

  top: "12px",
  right: "12px",

  minHeight: "28px",

  display: "inline-flex",
  alignItems: "center",

  padding: "6px 10px",

  borderRadius: "999px",

  border:
    "1px solid rgba(34, 197, 94, .34)",

  background:
    "rgba(2, 6, 23, .74)",

  color: "#86efac",

  fontSize: "8px",
  fontWeight: "950",

  backdropFilter: "blur(10px)"
};

const previewCategory = {
  margin: "15px 0 5px",

  color: "#35d0c3",

  fontSize: "8px",
  fontWeight: "950",

  letterSpacing: "1.6px",
  textTransform: "uppercase"
};

const previewTitle = {
  margin: "0 0 7px",

  color: "#f8fafc",

  fontSize: "19px",
  lineHeight: "25px",

  wordBreak: "break-word"
};

const previewPrice = {
  margin: "0 0 10px",

  color: "#35d0c3",

  fontSize: "24px",
  lineHeight: "29px"
};

const previewText = {
  display: "-webkit-box",
  WebkitLineClamp: 4,
  WebkitBoxOrient: "vertical",

  overflow: "hidden",

  margin: 0,

  color: "#94a3b8",

  fontSize: "10px",
  lineHeight: "17px"
};

/*
|--------------------------------------------------------------------------
| Metadatos de la vista previa
|--------------------------------------------------------------------------
*/

const previewMetaGrid = {
  display: "grid",

  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",

  gap: "9px",

  marginTop: "15px"
};

const previewMetaCard = {
  minWidth: 0,

  display: "grid",
  gap: "4px",

  padding: "11px",

  borderRadius: "13px",

  border:
    "1px solid rgba(148, 163, 184, .10)",

  background:
    "rgba(2, 6, 23, .35)",

  color: "#cbd5e1",

  fontSize: "8px"
};

/*
|--------------------------------------------------------------------------
| Vendedor
|--------------------------------------------------------------------------
*/

const sellerPreview = {
  display: "grid",

  gridTemplateColumns:
    "52px minmax(0, 1fr)",

  alignItems: "center",
  gap: "11px",

  marginTop: "15px",
  padding: "13px",

  borderRadius: "15px",

  border:
    "1px solid rgba(53, 208, 195, .13)",

  background:
    "rgba(2, 6, 23, .42)"
};

const sellerPreviewContent = {
  minWidth: 0
};

const sellerAvatar = {
  width: "52px",
  height: "52px",

  display: "block",

  borderRadius: "50%",

  border:
    "2px solid rgba(53, 208, 195, .45)",

  objectFit: "cover",
  objectPosition: "center",

  background:
    "linear-gradient(135deg, #35d0c3, #8b5cf6)"
};

const sellerAvatarPlaceholder = {
  width: "52px",
  height: "52px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "50%",

  border:
    "2px solid rgba(53, 208, 195, .45)",

  background:
    "linear-gradient(135deg, #35d0c3, #38bdf8, #8b5cf6)",

  color: "#ffffff",

  fontSize: "17px",
  fontWeight: "950"
};

/*
|--------------------------------------------------------------------------
| Checklist
|--------------------------------------------------------------------------
*/

const publicationChecklistCard = {
  minWidth: 0,

  padding: "20px",

  borderRadius: "23px",

  border:
    "1px solid rgba(139, 92, 246, .17)",

  background:
    "linear-gradient(145deg, rgba(15, 23, 42, .79), rgba(30, 27, 75, .30))",

  boxShadow:
    "0 20px 60px rgba(0, 0, 0, .18)"
};

const checklistTitle = {
  margin: "6px 0 14px",

  color: "#f8fafc",

  fontSize: "18px",
  lineHeight: "23px"
};

const checkRow = {
  display: "flex",
  alignItems: "center",
  gap: "10px",

  padding: "10px 0",

  borderBottom:
    "1px solid rgba(148, 163, 184, .09)",

  color: "#cbd5e1",

  fontSize: "10px"
};

const checkCircle = {
  width: "25px",
  height: "25px",
  flexShrink: 0,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: "50%",

  fontSize: "9px",
  fontWeight: "950"
};

const publicationStatusBox = {
  display: "grid",

  gridTemplateColumns:
    "13px minmax(0, 1fr)",

  alignItems: "flex-start",
  gap: "10px",

  marginTop: "15px",
  padding: "13px",

  borderRadius: "14px",

  border:
    "1px solid rgba(53, 208, 195, .14)",

  background:
    "rgba(53, 208, 195, .06)",

  color: "#cbd5e1",

  fontSize: "9px",
  lineHeight: "15px"
};

const publicationStatusDot = (
  ready
) => ({
  width: "10px",
  height: "10px",

  marginTop: "3px",

  borderRadius: "50%",

  background:
    ready
      ? "#22c55e"
      : "#f59e0b",

  boxShadow:
    ready
      ? "0 0 12px rgba(34, 197, 94, .64)"
      : "0 0 12px rgba(245, 158, 11, .55)"
});

/*
|--------------------------------------------------------------------------
| Barra fija de acciones
|--------------------------------------------------------------------------
*/

const buttonRow = (
  sidebarCollapsed
) => ({
  position: "fixed",

  left:
    sidebarCollapsed
      ? "116px"
      : "320px",

  right: "28px",
  bottom: "18px",

  display: "grid",

  gridTemplateColumns:
    "minmax(115px, .7fr) minmax(160px, 1fr) minmax(150px, .85fr) minmax(240px, 1.5fr)",

  alignItems: "center",
  gap: "10px",

  padding: "10px",

  borderRadius: "18px",

  border:
    "1px solid rgba(53, 208, 195, .17)",

  background:
    "rgba(8, 19, 37, .94)",

  boxShadow:
    "0 24px 75px rgba(0, 0, 0, .46)",

  backdropFilter: "blur(18px)",

  transition:
    "left .28s ease",

  zIndex: 2100
});

const cancelButton = {
  minHeight: "48px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "11px 14px",

  borderRadius: "13px",

  border:
    "1px solid rgba(148, 163, 184, .15)",

  background:
    "rgba(15, 23, 42, .72)",

  color: "#cbd5e1",

  fontSize: "10px",
  fontWeight: "900",

  cursor: "pointer"
};

const draftButton = {
  ...cancelButton,

  border:
    "1px solid rgba(53, 208, 195, .27)",

  background:
    "rgba(53, 208, 195, .09)",

  color: "#5eead4"
};

const deleteDraftButton = {
  ...cancelButton,

  border:
    "1px solid rgba(239, 68, 68, .24)",

  background:
    "rgba(127, 29, 29, .14)",

  color: "#fca5a5"
};

const submitButton = (
  enabled
) => ({
  minHeight: "48px",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  padding: "11px 17px",

  border: "none",
  borderRadius: "13px",

  background:
    enabled
      ? "linear-gradient(135deg, #35d0c3, #38bdf8, #8b5cf6)"
      : "rgba(71, 85, 105, .45)",

  color:
    enabled
      ? "#ffffff"
      : "#94a3b8",

  fontSize: "10px",
  fontWeight: "950",

  cursor:
    enabled
      ? "pointer"
      : "not-allowed",

  boxShadow:
    enabled
      ? "0 16px 44px rgba(53, 208, 195, .20)"
      : "none"
});

/*
|--------------------------------------------------------------------------
| Exportación
|--------------------------------------------------------------------------
*/

export default NewProduct;