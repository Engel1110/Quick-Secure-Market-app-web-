/*
|--------------------------------------------------------------------------
| QSM BACKOFFICE — DATOS DEL DASHBOARD
|--------------------------------------------------------------------------
| Datos temporales para desarrollar y probar el Dashboard Administrativo
| sin depender todavía de la conexión con MongoDB.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Menú principal
|--------------------------------------------------------------------------
*/

export const adminMenuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "⌂",
    route: "/admin/dashboard",
    badge: null,
    badgeType: "info",
    permission: "DASHBOARD_VIEW"
  },
  {
    id: "internal-users",
    label: "Usuarios internos",
    icon: "♙",
    route: "/admin/internal-users",
    badge: "47",
    badgeType: "purple",
    permission: "INTERNAL_USERS_VIEW"
  },
  {
    id: "marketplace",
    label: "Marketplace",
    icon: "◈",
    route: "/admin/marketplace",
    badge: null,
    badgeType: "info",
    permission: "MARKETPLACE_VIEW"
  },
  {
    id: "products",
    label: "Productos",
    icon: "▣",
    route: "/admin/products",
    badge: "7",
    badgeType: "warning",
    permission: "PRODUCTS_VIEW"
  },
  {
    id: "orders",
    label: "Órdenes",
    icon: "▤",
    route: "/admin/orders",
    badge: "12",
    badgeType: "info",
    permission: "ORDERS_VIEW"
  },
  {
    id: "warehouse",
    label: "Almacén",
    icon: "▦",
    route: "/admin/warehouse",
    badge: "18",
    badgeType: "warning",
    permission: "WAREHOUSE_VIEW"
  },
  {
    id: "delivery",
    label: "Delivery",
    icon: "▱",
    route: "/admin/delivery",
    badge: "15",
    badgeType: "info",
    permission: "DELIVERY_VIEW"
  },
  {
    id: "finance",
    label: "Finanzas",
    icon: "$",
    route: "/admin/finance",
    badge: null,
    badgeType: "success",
    permission: "FINANCE_VIEW"
  },
  {
    id: "disputes",
    label: "Disputas",
    icon: "⚖",
    route: "/admin/disputes",
    badge: "24",
    badgeType: "danger",
    permission: "DISPUTE_VIEW"
  },
  {
    id: "audit",
    label: "Auditoría",
    icon: "▧",
    route: "/admin/audit",
    badge: "3",
    badgeType: "info",
    permission: "AUDIT_VIEW"
  },
  {
    id: "security",
    label: "Seguridad",
    icon: "♢",
    route: "/admin/security",
    badge: "7",
    badgeType: "danger",
    permission: "SECURITY_VIEW"
  },
  {
    id: "support",
    label: "Soporte",
    icon: "◉",
    route: "/admin/support",
    badge: "8",
    badgeType: "info",
    permission: "SUPPORT_VIEW"
  },
  {
    id: "moderation",
    label: "Moderación",
    icon: "⚑",
    route: "/admin/moderation",
    badge: "6",
    badgeType: "warning",
    permission: "MODERATION_VIEW"
  },
  {
    id: "ai",
    label: "IA y Monitoreo",
    icon: "⌘",
    route: "/admin/ai-monitoring",
    badge: "5",
    badgeType: "danger",
    permission: "AI_MONITORING_VIEW"
  },
  {
    id: "reports",
    label: "Reportes",
    icon: "▥",
    route: "/admin/reports",
    badge: null,
    badgeType: "info",
    permission: "REPORTS_VIEW"
  },
  {
    id: "settings",
    label: "Configuración",
    icon: "⚙",
    route: "/admin/settings",
    badge: null,
    badgeType: "info",
    permission: "SETTINGS_VIEW"
  }
];

/*
|--------------------------------------------------------------------------
| Métricas principales
|--------------------------------------------------------------------------
*/

export const dashboardMetrics = [
  {
    id: "users",
    label: "Usuarios totales",
    value: "12,458",
    description: "Usuarios registrados en QSM",
    icon: "♙",
    color: "purple",
    change: 12.5,
    details: [
      {
        label: "Nuevos hoy",
        value: "42"
      },
      {
        label: "Activos",
        value: "10,920"
      },
      {
        label: "Suspendidos",
        value: "35"
      }
    ]
  },
  {
    id: "orders",
    label: "Órdenes totales",
    value: "8,632",
    description: "Órdenes generadas en la plataforma",
    icon: "▤",
    color: "blue",
    change: 8.2,
    details: [
      {
        label: "Pendientes",
        value: "128"
      },
      {
        label: "En proceso",
        value: "245"
      },
      {
        label: "Completadas",
        value: "8,019"
      }
    ]
  },
  {
    id: "sales",
    label: "Ventas del período",
    value: "RD$ 4,285,650",
    description: "Valor total procesado por QSM",
    icon: "$",
    color: "green",
    change: 6.8,
    details: [
      {
        label: "Ventas hoy",
        value: "RD$ 285K"
      },
      {
        label: "Comisiones",
        value: "RD$ 28K"
      },
      {
        label: "Promedio",
        value: "RD$ 18K"
      }
    ]
  },
  {
    id: "risks",
    label: "Riesgos activos",
    value: "35",
    description: "Casos que requieren atención",
    icon: "!",
    color: "red",
    change: -4.5,
    details: [
      {
        label: "Críticos",
        value: "7"
      },
      {
        label: "Disputas",
        value: "24"
      },
      {
        label: "Fraudes",
        value: "4"
      }
    ]
  }
];

/*
|--------------------------------------------------------------------------
| Tendencia operativa
|--------------------------------------------------------------------------
*/

export const orderTrendData = [
  {
    date: "05 julio 2026",
    shortDate: "05 Jul",
    orders: 520,
    sales: 245000,
    users: 28,
    disputes: 7
  },
  {
    date: "06 julio 2026",
    shortDate: "06 Jul",
    orders: 610,
    sales: 310000,
    users: 35,
    disputes: 5
  },
  {
    date: "07 julio 2026",
    shortDate: "07 Jul",
    orders: 575,
    sales: 286000,
    users: 31,
    disputes: 8
  },
  {
    date: "08 julio 2026",
    shortDate: "08 Jul",
    orders: 720,
    sales: 385000,
    users: 47,
    disputes: 6
  },
  {
    date: "09 julio 2026",
    shortDate: "09 Jul",
    orders: 665,
    sales: 342000,
    users: 39,
    disputes: 4
  },
  {
    date: "10 julio 2026",
    shortDate: "10 Jul",
    orders: 810,
    sales: 448000,
    users: 54,
    disputes: 9
  },
  {
    date: "11 julio 2026",
    shortDate: "11 Jul",
    orders: 760,
    sales: 405000,
    users: 49,
    disputes: 7
  },
  {
    date: "12 julio 2026",
    shortDate: "12 Jul",
    orders: 920,
    sales: 515000,
    users: 63,
    disputes: 5
  }
];

/*
|--------------------------------------------------------------------------
| Distribución de órdenes
|--------------------------------------------------------------------------
*/

export const orderStatusData = [
  {
    id: "completed",
    label: "Completadas",
    value: 4783,
    percentage: 55.4,
    color: "#22c55e",
    route: "/admin/orders?status=COMPLETED"
  },
  {
    id: "pending",
    label: "Pendientes",
    value: 2140,
    percentage: 24.8,
    color: "#f59e0b",
    route: "/admin/orders?status=PENDING"
  },
  {
    id: "review",
    label: "En revisión",
    value: 1130,
    percentage: 13.1,
    color: "#3b82f6",
    route: "/admin/orders?status=UNDER_REVIEW"
  },
  {
    id: "cancelled",
    label: "Canceladas",
    value: 360,
    percentage: 4.2,
    color: "#ef4444",
    route: "/admin/orders?status=CANCELLED"
  },
  {
    id: "rejected",
    label: "Rechazadas",
    value: 219,
    percentage: 2.5,
    color: "#a855f7",
    route: "/admin/orders?status=REJECTED"
  }
];

/*
|--------------------------------------------------------------------------
| Actividad reciente
|--------------------------------------------------------------------------
*/

export const recentActivities = [
  {
    id: "activity-001",
    type: "order",
    icon: "▤",
    title: "Nueva orden creada",
    description: "Orden QSM-ORD-001245 por RD$ 35,000.",
    user: "Carlos Pérez",
    time: "Hace 2 minutos",
    route: "/admin/orders/QSM-ORD-001245"
  },
  {
    id: "activity-002",
    type: "payment",
    icon: "$",
    title: "Pago confirmado",
    description: "Pago de RD$ 15,000 colocado en custodia.",
    user: "Sistema de pagos",
    time: "Hace 5 minutos",
    route: "/admin/finance/transactions/TRX-001"
  },
  {
    id: "activity-003",
    type: "warehouse",
    icon: "▦",
    title: "Producto aprobado por almacén",
    description: "El producto iPhone 15 Pro superó la inspección.",
    user: "María Rodríguez",
    time: "Hace 12 minutos",
    route: "/admin/warehouse/orders/QSM-ORD-001218"
  },
  {
    id: "activity-004",
    type: "user",
    icon: "♙",
    title: "Nuevo usuario registrado",
    description: "Carlos Méndez creó una cuenta de comprador.",
    user: "Sistema",
    time: "Hace 18 minutos",
    route: "/admin/users/carlos-mendez"
  },
  {
    id: "activity-005",
    type: "dispute",
    icon: "⚖",
    title: "Disputa escalada",
    description: "El caso DSP-002 fue marcado como prioridad alta.",
    user: "Ana Martínez",
    time: "Hace 25 minutos",
    route: "/admin/disputes/DSP-002"
  },
  {
    id: "activity-006",
    type: "delivery",
    icon: "▱",
    title: "Pedido entregado",
    description: "Entrega DEL-003 confirmada mediante PIN.",
    user: "Luis Gómez",
    time: "Hace 34 minutos",
    route: "/admin/delivery/DEL-003"
  }
];

/*
|--------------------------------------------------------------------------
| Alertas importantes
|--------------------------------------------------------------------------
*/

export const importantAlerts = [
  {
    id: "alert-001",
    icon: "⚖",
    title: "35 reclamos pendientes",
    description:
      "Existen reclamaciones que no han recibido una primera revisión.",
    level: "high",
    levelLabel: "ALTA",
    time: "Actualizado hace 3 min",
    route: "/admin/disputes?status=PENDING"
  },
  {
    id: "alert-002",
    icon: "$",
    title: "12 pagos retenidos",
    description:
      "Algunos pagos superaron el tiempo normal de revisión financiera.",
    level: "medium",
    levelLabel: "MEDIA",
    time: "Actualizado hace 8 min",
    route: "/admin/finance?status=HELD"
  },
  {
    id: "alert-003",
    icon: "▣",
    title: "7 productos reportados",
    description:
      "Productos denunciados por información incorrecta o sospechosa.",
    level: "medium",
    levelLabel: "MEDIA",
    time: "Actualizado hace 12 min",
    route: "/admin/moderation/products"
  },
  {
    id: "alert-004",
    icon: "♢",
    title: "3 accesos sospechosos",
    description:
      "Intentos administrativos detectados desde ubicaciones no habituales.",
    level: "critical",
    levelLabel: "CRÍTICA",
    time: "Actualizado hace 1 min",
    route: "/admin/security/alerts"
  },
  {
    id: "alert-005",
    icon: "▦",
    title: "2 órdenes detenidas",
    description:
      "Órdenes con más de 48 horas sin avanzar dentro del almacén.",
    level: "high",
    levelLabel: "ALTA",
    time: "Actualizado hace 5 min",
    route: "/admin/warehouse?filter=DELAYED"
  }
];

/*
|--------------------------------------------------------------------------
| Departamentos operativos
|--------------------------------------------------------------------------
*/

export const departmentData = [
  {
    id: "warehouse",
    name: "Almacén",
    description: "Recepción, revisión e inventario",
    icon: "▦",
    color: "green",
    status: "warning",
    statusLabel: "Requiere atención",
    route: "/admin/warehouse",
    metrics: [
      {
        label: "Pendientes",
        value: "12"
      },
      {
        label: "En revisión",
        value: "25"
      },
      {
        label: "Aprobados",
        value: "32"
      },
      {
        label: "Dañados",
        value: "7"
      }
    ],
    progressLabel: "Rendimiento diario",
    progress: 82
  },
  {
    id: "delivery",
    name: "Delivery",
    description: "Entregas, repartidores y rutas",
    icon: "▱",
    color: "blue",
    status: "active",
    statusLabel: "Operativo",
    route: "/admin/delivery",
    metrics: [
      {
        label: "Asignados",
        value: "45"
      },
      {
        label: "En ruta",
        value: "15"
      },
      {
        label: "Entregados",
        value: "23"
      },
      {
        label: "Incidencias",
        value: "3"
      }
    ],
    progressLabel: "Entregas completadas",
    progress: 76
  },
  {
    id: "finance",
    name: "Finanzas",
    description: "Pagos, custodia y comisiones",
    icon: "$",
    color: "purple",
    status: "active",
    statusLabel: "Operativo",
    route: "/admin/finance",
    metrics: [
      {
        label: "En custodia",
        value: "RD$ 1.2M"
      },
      {
        label: "Liberado",
        value: "RD$ 285K"
      },
      {
        label: "Reembolsos",
        value: "RD$ 45K"
      },
      {
        label: "Comisiones",
        value: "RD$ 28K"
      }
    ],
    progressLabel: "Transacciones procesadas",
    progress: 91
  },
  {
    id: "disputes",
    name: "Disputas",
    description: "Investigación y resolución de casos",
    icon: "⚖",
    color: "orange",
    status: "danger",
    statusLabel: "Casos críticos",
    route: "/admin/disputes",
    metrics: [
      {
        label: "Abiertas",
        value: "24"
      },
      {
        label: "Investigación",
        value: "15"
      },
      {
        label: "Resueltas",
        value: "8"
      },
      {
        label: "Escaladas",
        value: "2"
      }
    ],
    progressLabel: "Casos resueltos",
    progress: 68
  },
  {
    id: "security",
    name: "Seguridad",
    description: "Accesos, sesiones y monitoreo",
    icon: "♢",
    color: "red",
    status: "danger",
    statusLabel: "7 alertas",
    route: "/admin/security",
    metrics: [
      {
        label: "Intentos fallidos",
        value: "1,256"
      },
      {
        label: "IPs bloqueadas",
        value: "45"
      },
      {
        label: "Alertas",
        value: "7"
      },
      {
        label: "Sesiones",
        value: "2,350"
      }
    ],
    progressLabel: "Nivel de protección",
    progress: 94
  },
  {
    id: "audit",
    name: "Auditoría",
    description: "Logs y trazabilidad administrativa",
    icon: "▧",
    color: "cyan",
    status: "active",
    statusLabel: "Monitoreando",
    route: "/admin/audit",
    metrics: [
      {
        label: "Eventos hoy",
        value: "2,350"
      },
      {
        label: "Cambios críticos",
        value: "12"
      },
      {
        label: "Usuarios revisados",
        value: "8"
      },
      {
        label: "Reportes",
        value: "5"
      }
    ],
    progressLabel: "Cobertura de auditoría",
    progress: 98
  }
];

/*
|--------------------------------------------------------------------------
| Órdenes que requieren atención
|--------------------------------------------------------------------------
*/

export const attentionOrders = [
  {
    id: "attention-order-001",
    orderNumber: "QSM-ORD-1204",
    product: "iPhone 15 Pro",
    buyer: "Carlos Pérez",
    seller: "Tech Store",
    amount: "RD$ 35,000",
    status: "warehouse",
    statusLabel: "Esperando almacén",
    waitingTime: "51 horas",
    risk: "high",
    riskLabel: "Alto",
    category: "warehouse",
    route: "/admin/orders/QSM-ORD-1204"
  },
  {
    id: "attention-order-002",
    orderNumber: "QSM-ORD-1208",
    product: "MacBook Air M3",
    buyer: "María Rodríguez",
    seller: "Global Shop",
    amount: "RD$ 68,500",
    status: "payment",
    statusLabel: "Pago retenido",
    waitingTime: "36 horas",
    risk: "medium",
    riskLabel: "Medio",
    category: "payment",
    route: "/admin/orders/QSM-ORD-1208"
  },
  {
    id: "attention-order-003",
    orderNumber: "QSM-ORD-1211",
    product: "PlayStation 5",
    buyer: "Juan Castillo",
    seller: "Gaming World",
    amount: "RD$ 29,900",
    status: "dispute",
    statusLabel: "Con disputa",
    waitingTime: "29 horas",
    risk: "high",
    riskLabel: "Alto",
    category: "dispute",
    route: "/admin/orders/QSM-ORD-1211"
  },
  {
    id: "attention-order-004",
    orderNumber: "QSM-ORD-1214",
    product: "AirPods Pro",
    buyer: "Ana Martínez",
    seller: "Electro RD",
    amount: "RD$ 12,500",
    status: "delivery",
    statusLabel: "Incidencia delivery",
    waitingTime: "24 horas",
    risk: "medium",
    riskLabel: "Medio",
    category: "delivery",
    route: "/admin/orders/QSM-ORD-1214"
  },
  {
    id: "attention-order-005",
    orderNumber: "QSM-ORD-1219",
    product: "Nintendo Switch",
    buyer: "Luis Gómez",
    seller: "Game Center",
    amount: "RD$ 19,800",
    status: "warehouse",
    statusLabel: "Producto dañado",
    waitingTime: "18 horas",
    risk: "critical",
    riskLabel: "Crítico",
    category: "warehouse",
    route: "/admin/orders/QSM-ORD-1219"
  },
  {
    id: "attention-order-006",
    orderNumber: "QSM-ORD-1225",
    product: "Samsung Galaxy S24",
    buyer: "Pedro Sánchez",
    seller: "Mobile Store",
    amount: "RD$ 42,000",
    status: "payment",
    statusLabel: "Reembolso pendiente",
    waitingTime: "15 horas",
    risk: "low",
    riskLabel: "Bajo",
    category: "payment",
    route: "/admin/orders/QSM-ORD-1225"
  }
];

/*
|--------------------------------------------------------------------------
| Acciones rápidas
|--------------------------------------------------------------------------
*/

export const quickActions = [
  {
    id: "create-internal-user",
    label: "Crear usuario interno",
    description: "Registrar un nuevo empleado de QSM.",
    icon: "♙",
    color: "purple",
    route: "/admin/internal-users/new",
    permission: "INTERNAL_USERS_CREATE"
  },
  {
    id: "search-order",
    label: "Buscar una orden",
    description: "Consultar el estado y timeline de un pedido.",
    icon: "⌕",
    color: "blue",
    route: "/admin/orders",
    permission: "ORDERS_VIEW"
  },
  {
    id: "review-dispute",
    label: "Revisar disputa",
    description: "Abrir la cola de casos prioritarios.",
    icon: "⚖",
    color: "orange",
    route: "/admin/disputes?priority=HIGH",
    permission: "DISPUTE_REVIEW"
  },
  {
    id: "warehouse-reception",
    label: "Registrar recepción",
    description: "Registrar un producto recibido en almacén.",
    icon: "▦",
    color: "green",
    route: "/admin/warehouse/receive",
    permission: "WAREHOUSE_RECEIVE"
  },
  {
    id: "assign-delivery",
    label: "Asignar delivery",
    description: "Asignar una orden a un repartidor.",
    icon: "▱",
    color: "cyan",
    route: "/admin/delivery/assignments",
    permission: "DELIVERY_ASSIGN"
  },
  {
    id: "security-alerts",
    label: "Ver alertas",
    description: "Consultar accesos e incidentes críticos.",
    icon: "♢",
    color: "red",
    route: "/admin/security/alerts",
    permission: "SECURITY_VIEW"
  },
  {
    id: "generate-report",
    label: "Generar reporte",
    description: "Crear un reporte operativo del período.",
    icon: "▥",
    color: "purple",
    route: "/admin/reports",
    permission: "REPORTS_EXPORT"
  },
  {
    id: "active-sessions",
    label: "Sesiones activas",
    description: "Consultar usuarios conectados actualmente.",
    icon: "◉",
    color: "blue",
    route: "/admin/security/sessions",
    permission: "SECURITY_VIEW_SESSIONS"
  }
];

/*
|--------------------------------------------------------------------------
| Notificaciones
|--------------------------------------------------------------------------
*/

export const notifications = [
  {
    id: "notification-001",
    type: "danger",
    icon: "♢",
    title: "Acceso administrativo sospechoso",
    message:
      "Se detectó un intento fallido desde una ubicación no reconocida.",
    time: "Hace 1 minuto",
    route: "/admin/security/alerts"
  },
  {
    id: "notification-002",
    type: "warning",
    icon: "▦",
    title: "Producto marcado como dañado",
    message:
      "El almacén reportó daños en la orden QSM-ORD-1219.",
    time: "Hace 8 minutos",
    route: "/admin/warehouse/orders/QSM-ORD-1219"
  },
  {
    id: "notification-003",
    type: "info",
    icon: "⚖",
    title: "Disputa escalada",
    message:
      "La disputa DSP-002 fue elevada a prioridad alta.",
    time: "Hace 15 minutos",
    route: "/admin/disputes/DSP-002"
  },
  {
    id: "notification-004",
    type: "success",
    icon: "$",
    title: "Pago confirmado",
    message:
      "El pago de la orden QSM-ORD-1204 fue colocado en custodia.",
    time: "Hace 23 minutos",
    route: "/admin/finance/transactions/TRX-001"
  },
  {
    id: "notification-005",
    type: "warning",
    icon: "▱",
    title: "Incidencia de entrega",
    message:
      "El cliente no estaba disponible para recibir la orden QSM-ORD-1214.",
    time: "Hace 31 minutos",
    route: "/admin/delivery/DEL-004"
  },
  {
    id: "notification-006",
    type: "info",
    icon: "♙",
    title: "Nuevo empleado creado",
    message:
      "Se creó una cuenta interna para el departamento de Soporte.",
    time: "Hace 45 minutos",
    route: "/admin/internal-users"
  }
];

/*
|--------------------------------------------------------------------------
| Usuarios temporales para el buscador
|--------------------------------------------------------------------------
*/

export const searchableUsers = [
  {
    id: "user-001",
    type: "Usuario",
    title: "Carlos Pérez",
    subtitle: "carlos@gmail.com · Comprador",
    route: "/admin/users/user-001"
  },
  {
    id: "user-002",
    type: "Usuario",
    title: "María Rodríguez",
    subtitle: "maria.almacen.qsm@gmail.com · Almacén",
    route: "/admin/internal-users/user-002"
  },
  {
    id: "user-003",
    type: "Usuario",
    title: "Juan Castillo",
    subtitle: "juan.delivery.qsm@gmail.com · Delivery",
    route: "/admin/internal-users/user-003"
  },
  {
    id: "user-004",
    type: "Usuario",
    title: "Ana Martínez",
    subtitle: "ana.auditoria.qsm@gmail.com · Auditoría",
    route: "/admin/internal-users/user-004"
  },
  {
    id: "user-005",
    type: "Usuario",
    title: "Pedro Sánchez",
    subtitle: "pedro.finanzas.qsm@gmail.com · Finanzas",
    route: "/admin/internal-users/user-005"
  }
];

/*
|--------------------------------------------------------------------------
| Productos temporales para el buscador
|--------------------------------------------------------------------------
*/

export const searchableProducts = [
  {
    id: "product-001",
    type: "Producto",
    title: "iPhone 15 Pro",
    subtitle: "Tech Store · QSM-PRD-001",
    route: "/admin/products/product-001"
  },
  {
    id: "product-002",
    type: "Producto",
    title: "MacBook Air M3",
    subtitle: "Global Shop · QSM-PRD-002",
    route: "/admin/products/product-002"
  },
  {
    id: "product-003",
    type: "Producto",
    title: "PlayStation 5",
    subtitle: "Gaming World · QSM-PRD-003",
    route: "/admin/products/product-003"
  },
  {
    id: "product-004",
    type: "Producto",
    title: "AirPods Pro",
    subtitle: "Electro RD · QSM-PRD-004",
    route: "/admin/products/product-004"
  }
];

/*
|--------------------------------------------------------------------------
| Disputas temporales para el buscador
|--------------------------------------------------------------------------
*/

export const searchableDisputes = [
  {
    id: "dispute-001",
    type: "Disputa",
    title: "DSP-001",
    subtitle: "Producto no recibido · Prioridad alta",
    route: "/admin/disputes/DSP-001"
  },
  {
    id: "dispute-002",
    type: "Disputa",
    title: "DSP-002",
    subtitle: "Producto defectuoso · Prioridad crítica",
    route: "/admin/disputes/DSP-002"
  },
  {
    id: "dispute-003",
    type: "Disputa",
    title: "DSP-003",
    subtitle: "Retraso en entrega · Prioridad media",
    route: "/admin/disputes/DSP-003"
  }
];

/*
|--------------------------------------------------------------------------
| Estado temporal de los servicios
|--------------------------------------------------------------------------
*/

export const systemServices = [
  {
    id: "api",
    name: "API",
    status: "online",
    statusLabel: "Operativo"
  },
  {
    id: "database",
    name: "MongoDB",
    status: "warning",
    statusLabel: "Modo temporal"
  },
  {
    id: "socket",
    name: "Socket.IO",
    status: "online",
    statusLabel: "Operativo"
  },
  {
    id: "payments",
    name: "Pagos",
    status: "online",
    statusLabel: "Operativo"
  },
  {
    id: "storage",
    name: "Storage",
    status: "online",
    statusLabel: "Operativo"
  }
];

/*
|--------------------------------------------------------------------------
| Roles administrativos
|--------------------------------------------------------------------------
*/

export const administrativeRoles = [
  {
    value: "SUPER_ADMIN",
    label: "Super Administrador",
    department: "ADMINISTRATION"
  },
  {
    value: "SENIOR_ADMIN",
    label: "Senior Administrator",
    department: "ADMINISTRATION"
  },
  {
    value: "ADMIN",
    label: "Administrador",
    department: "ADMINISTRATION"
  },
  {
    value: "SUPERVISOR",
    label: "Supervisor",
    department: "ADMINISTRATION"
  },
  {
    value: "WAREHOUSE_MANAGER",
    label: "Gerente de Almacén",
    department: "WAREHOUSE"
  },
  {
    value: "WAREHOUSE_SUPERVISOR",
    label: "Supervisor de Almacén",
    department: "WAREHOUSE"
  },
  {
    value: "WAREHOUSE_STAFF",
    label: "Empleado de Almacén",
    department: "WAREHOUSE"
  },
  {
    value: "DELIVERY_MANAGER",
    label: "Gerente de Delivery",
    department: "DELIVERY"
  },
  {
    value: "DELIVERY_SUPERVISOR",
    label: "Supervisor de Delivery",
    department: "DELIVERY"
  },
  {
    value: "DELIVERY_AGENT",
    label: "Agente de Delivery",
    department: "DELIVERY"
  },
  {
    value: "FINANCE_MANAGER",
    label: "Gerente Financiero",
    department: "FINANCE"
  },
  {
    value: "FINANCE_AGENT",
    label: "Agente Financiero",
    department: "FINANCE"
  },
  {
    value: "AUDITOR",
    label: "Auditor",
    department: "AUDIT"
  },
  {
    value: "DISPUTE_MANAGER",
    label: "Gerente de Disputas",
    department: "DISPUTES"
  },
  {
    value: "DISPUTE_AGENT",
    label: "Agente de Disputas",
    department: "DISPUTES"
  },
  {
    value: "SECURITY_MANAGER",
    label: "Gerente de Seguridad",
    department: "SECURITY"
  },
  {
    value: "SECURITY_ANALYST",
    label: "Analista de Seguridad",
    department: "SECURITY"
  },
  {
    value: "SUPPORT_MANAGER",
    label: "Gerente de Soporte",
    department: "SUPPORT"
  },
  {
    value: "SUPPORT_AGENT",
    label: "Agente de Soporte",
    department: "SUPPORT"
  },
  {
    value: "MODERATION_MANAGER",
    label: "Gerente de Moderación",
    department: "MODERATION"
  },
  {
    value: "MODERATOR",
    label: "Moderador",
    department: "MODERATION"
  }
];

/*
|--------------------------------------------------------------------------
| Departamentos administrativos
|--------------------------------------------------------------------------
*/

export const administrativeDepartments = [
  {
    value: "ADMINISTRATION",
    label: "Administración",
    icon: "♛"
  },
  {
    value: "WAREHOUSE",
    label: "Almacén",
    icon: "▦"
  },
  {
    value: "DELIVERY",
    label: "Delivery",
    icon: "▱"
  },
  {
    value: "FINANCE",
    label: "Finanzas",
    icon: "$"
  },
  {
    value: "AUDIT",
    label: "Auditoría",
    icon: "▧"
  },
  {
    value: "DISPUTES",
    label: "Disputas",
    icon: "⚖"
  },
  {
    value: "SECURITY",
    label: "Seguridad",
    icon: "♢"
  },
  {
    value: "SUPPORT",
    label: "Soporte",
    icon: "◉"
  },
  {
    value: "MODERATION",
    label: "Moderación",
    icon: "⚑"
  },
  {
    value: "VERIFICATION",
    label: "Verificación",
    icon: "✓"
  }
];

/*
|--------------------------------------------------------------------------
| Funciones auxiliares
|--------------------------------------------------------------------------
*/

export const getRoleLabel = (roleValue) => {
  const normalizedRole = String(roleValue || "")
    .trim()
    .toUpperCase();

  const role = administrativeRoles.find(
    (item) => item.value === normalizedRole
  );

  return (
    role?.label ||
    normalizedRole
      .split("_")
      .filter(Boolean)
      .map(
        (word) =>
          word.charAt(0).toUpperCase() +
          word.slice(1).toLowerCase()
      )
      .join(" ") ||
    "Usuario administrativo"
  );
};

export const getDepartmentLabel = (departmentValue) => {
  const normalizedDepartment = String(
    departmentValue || ""
  )
    .trim()
    .toUpperCase();

  const department = administrativeDepartments.find(
    (item) => item.value === normalizedDepartment
  );

  return (
    department?.label ||
    normalizedDepartment ||
    "Sin departamento"
  );
};

export const canUserAccess = (
  user,
  requiredPermission
) => {
  if (!user) {
    return false;
  }

  const role = String(user.role || "")
    .trim()
    .toUpperCase();

  const permissions = Array.isArray(user.permissions)
    ? user.permissions.map((permission) =>
        String(permission)
          .trim()
          .toUpperCase()
      )
    : [];

  if (
    role === "SUPER_ADMIN" ||
    permissions.includes("*")
  ) {
    return true;
  }

  if (!requiredPermission) {
    return true;
  }

  return permissions.includes(
    String(requiredPermission)
      .trim()
      .toUpperCase()
  );
};

export const filterMenuByPermissions = (
  menuItems,
  user
) => {
  if (!Array.isArray(menuItems)) {
    return [];
  }

  return menuItems.filter((item) =>
    canUserAccess(user, item.permission)
  );
};