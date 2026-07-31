import { API_BASE_URL as QSM_RUNTIME_API_URL } from "../../../config/runtime";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  QSM_RUNTIME_API_URL;

const USE_MOCK_DATA = false;

const REPORT_STATUS = {
  OPEN: "Abierto",
  IN_REVIEW: "En revisión",
  ESCALATED: "Escalado",
  ACTION_TAKEN: "Acción aplicada",
  RESOLVED: "Resuelto",
  DISMISSED: "Descartado"
};

const REPORT_TYPE = {
  PRODUCT: "Producto",
  USER: "Usuario",
  MESSAGE: "Mensaje",
  IMAGE: "Imagen",
  REVIEW: "Reseña",
  PROFILE: "Perfil"
};

const REPORT_REASON = {
  FRAUD: "Posible fraude",
  COUNTERFEIT: "Producto falsificado",
  PROHIBITED: "Producto prohibido",
  HARASSMENT: "Acoso",
  SPAM: "Spam",
  OFFENSIVE: "Contenido ofensivo",
  SCAM: "Estafa",
  FAKE_PROFILE: "Perfil falso",
  STOLEN_IMAGE: "Imagen robada",
  INAPPROPRIATE: "Contenido inapropiado"
};

const PRIORITY_LABELS = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica"
};

const MOCK_DATA = {
  generatedAt: new Date().toISOString(),
  kpis: {
    openReports: 38,
    inReview: 17,
    aiDetected: 24,
    reportedProducts: 19,
    reportedUsers: 13,
    suspendedUsers: 6,
    bannedUsers: 3,
    resolvedToday: 28,
    averageTrustScore: 74,
    resolutionRate: 91
  },
  reports: [
    {
      id: "MOD-9008",
      type: "PRODUCT",
      targetId: "PRD-2041",
      title: "iPhone 15 Pro posiblemente falsificado",
      description:
        "El precio está muy por debajo del mercado y las imágenes aparecen en otras publicaciones.",
      reason: "COUNTERFEIT",
      status: "OPEN",
      priority: "CRITICAL",
      source: "USER_REPORT",
      aiScore: 94,
      createdAt: new Date().toISOString(),
      lastUpdate: "Hace 6 minutos",
      target: {
        id: "PRD-2041",
        name: "iPhone 15 Pro 256 GB",
        price: 18000,
        status: "ACTIVE",
        image:
          "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=400&q=80"
      },
      reportedUser: {
        id: "USR-1001",
        name: "Carlos Martínez",
        email: "carlos@example.com",
        trustScore: 38,
        accountStatus: "ACTIVE",
        warnings: 2,
        reportsReceived: 5
      },
      reportedBy: {
        id: "USR-3001",
        name: "Ana Rodríguez"
      },
      assignedModerator: null,
      evidence: [
        "Precio 58% menor al promedio",
        "Imagen detectada en 4 publicaciones",
        "Cuenta creada hace 3 días"
      ],
      relatedEntities: {
        productId: "PRD-2041",
        userId: "USR-1001",
        verificationId: "KYC-5102"
      }
    },
    {
      id: "MOD-9007",
      type: "MESSAGE",
      targetId: "MSG-8301",
      title: "Mensaje con intento de sacar la compra de QSM",
      description:
        "El vendedor envió un número de WhatsApp y solicitó pago fuera de la plataforma.",
      reason: "SCAM",
      status: "IN_REVIEW",
      priority: "HIGH",
      source: "AI_DETECTION",
      aiScore: 91,
      createdAt: new Date(
        Date.now() - 1000 * 60 * 28
      ).toISOString(),
      lastUpdate: "Hace 28 minutos",
      target: {
        id: "MSG-8301",
        name: "Mensaje privado",
        status: "VISIBLE",
        content:
          "Escríbeme al WhatsApp para darte mejor precio y pagar por transferencia."
      },
      reportedUser: {
        id: "USR-1002",
        name: "Pedro Jiménez",
        email: "pedro@example.com",
        trustScore: 51,
        accountStatus: "ACTIVE",
        warnings: 1,
        reportsReceived: 3
      },
      reportedBy: {
        id: "SYSTEM",
        name: "IA de Moderación"
      },
      assignedModerator: {
        id: "MODERATOR-101",
        name: "Laura Méndez"
      },
      evidence: [
        "Número telefónico detectado",
        "Solicitud de pago externo",
        "Palabras asociadas a transferencia"
      ],
      relatedEntities: {
        conversationId: "CONV-4402",
        userId: "USR-1002",
        orderId: null
      }
    },
    {
      id: "MOD-9006",
      type: "USER",
      targetId: "USR-1003",
      title: "Usuario reportado por múltiples compradores",
      description:
        "Tres compradores reportaron publicaciones engañosas y productos no entregados.",
      reason: "FRAUD",
      status: "ESCALATED",
      priority: "CRITICAL",
      source: "MULTIPLE_REPORTS",
      aiScore: 88,
      createdAt: new Date(
        Date.now() - 1000 * 60 * 65
      ).toISOString(),
      lastUpdate: "Hace 1 hora",
      target: {
        id: "USR-1003",
        name: "Perfil de vendedor",
        status: "ACTIVE"
      },
      reportedUser: {
        id: "USR-1003",
        name: "Miguel Santos",
        email: "miguel@example.com",
        trustScore: 26,
        accountStatus: "ACTIVE",
        warnings: 4,
        reportsReceived: 9
      },
      reportedBy: {
        id: "COMMUNITY",
        name: "Comunidad QSM"
      },
      assignedModerator: {
        id: "MODERATOR-102",
        name: "José Ramírez"
      },
      evidence: [
        "9 reportes recibidos",
        "3 disputas abiertas",
        "Trust Score crítico",
        "Dos productos retirados anteriormente"
      ],
      relatedEntities: {
        userId: "USR-1003",
        disputeId: "DSP-3104",
        verificationId: "KYC-5107"
      }
    },
    {
      id: "MOD-9005",
      type: "IMAGE",
      targetId: "IMG-7204",
      title: "Imagen posiblemente robada",
      description:
        "La imagen fue detectada en un marketplace externo y en otra cuenta de QSM.",
      reason: "STOLEN_IMAGE",
      status: "OPEN",
      priority: "MEDIUM",
      source: "AI_DETECTION",
      aiScore: 84,
      createdAt: new Date(
        Date.now() - 1000 * 60 * 90
      ).toISOString(),
      lastUpdate: "Hace 1 hora",
      target: {
        id: "IMG-7204",
        name: "Imagen de laptop",
        status: "VISIBLE",
        image:
          "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=400&q=80"
      },
      reportedUser: {
        id: "USR-1004",
        name: "María Pérez",
        email: "maria@example.com",
        trustScore: 69,
        accountStatus: "ACTIVE",
        warnings: 0,
        reportsReceived: 1
      },
      reportedBy: {
        id: "SYSTEM",
        name: "IA de imágenes"
      },
      assignedModerator: null,
      evidence: [
        "Coincidencia visual del 92%",
        "Imagen publicada anteriormente",
        "Metadatos inconsistentes"
      ],
      relatedEntities: {
        productId: "PRD-2055",
        userId: "USR-1004"
      }
    },
    {
      id: "MOD-9004",
      type: "PROFILE",
      targetId: "USR-1005",
      title: "Perfil con información ofensiva",
      description:
        "La biografía del usuario contiene lenguaje ofensivo y amenazas.",
      reason: "OFFENSIVE",
      status: "ACTION_TAKEN",
      priority: "HIGH",
      source: "USER_REPORT",
      aiScore: 79,
      createdAt: new Date(
        Date.now() - 1000 * 60 * 145
      ).toISOString(),
      lastUpdate: "Hace 2 horas",
      target: {
        id: "USR-1005",
        name: "Perfil de usuario",
        status: "HIDDEN"
      },
      reportedUser: {
        id: "USR-1005",
        name: "Luis Gómez",
        email: "luis@example.com",
        trustScore: 47,
        accountStatus: "SUSPENDED",
        warnings: 3,
        reportsReceived: 6
      },
      reportedBy: {
        id: "USR-3008",
        name: "Claudia Reyes"
      },
      assignedModerator: {
        id: "MODERATOR-103",
        name: "Ana Gómez"
      },
      evidence: [
        "Lenguaje ofensivo detectado",
        "Amenazas identificadas",
        "Historial de advertencias"
      ],
      relatedEntities: {
        userId: "USR-1005"
      }
    }
  ],
  moderators: [
    {
      id: "MODERATOR-101",
      name: "Laura Méndez",
      activeCases: 7,
      resolvedToday: 10,
      averageTime: "7 min",
      accuracy: 97,
      online: true
    },
    {
      id: "MODERATOR-102",
      name: "José Ramírez",
      activeCases: 9,
      resolvedToday: 8,
      averageTime: "9 min",
      accuracy: 94,
      online: true
    },
    {
      id: "MODERATOR-103",
      name: "Ana Gómez",
      activeCases: 5,
      resolvedToday: 12,
      averageTime: "6 min",
      accuracy: 98,
      online: true
    },
    {
      id: "MODERATOR-104",
      name: "Claudia Reyes",
      activeCases: 4,
      resolvedToday: 7,
      averageTime: "8 min",
      accuracy: 95,
      online: false
    }
  ],
  aiAlerts: [
    {
      id: "AI-001",
      title: "Posible producto falsificado",
      description:
        "La IA detectó imágenes reutilizadas y precio anormal.",
      severity: "CRITICAL",
      score: 94,
      reportId: "MOD-9008"
    },
    {
      id: "AI-002",
      title: "Pago fuera de QSM",
      description:
        "Se detectó WhatsApp y solicitud de transferencia.",
      severity: "HIGH",
      score: 91,
      reportId: "MOD-9007"
    },
    {
      id: "AI-003",
      title: "Imagen duplicada",
      description:
        "Una imagen aparece en diferentes vendedores.",
      severity: "MEDIUM",
      score: 84,
      reportId: "MOD-9005"
    }
  ],
  recentActivity: [
    {
      id: "ACT-001",
      icon: "🚨",
      title: "Reporte crítico creado",
      description:
        "MOD-9008 fue enviado a revisión prioritaria.",
      time: "Hace 6 minutos"
    },
    {
      id: "ACT-002",
      icon: "🤖",
      title: "IA bloqueó un mensaje",
      description:
        "Se detectó intento de pago fuera de QSM.",
      time: "Hace 28 minutos"
    },
    {
      id: "ACT-003",
      icon: "⛔",
      title: "Usuario suspendido",
      description:
        "USR-1005 fue suspendido por lenguaje ofensivo.",
      time: "Hace 2 horas"
    },
    {
      id: "ACT-004",
      icon: "✅",
      title: "Reporte resuelto",
      description:
        "Un producto reportado fue restaurado.",
      time: "Hace 3 horas"
    }
  ]
};

function ModerationDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [selectedReport, setSelectedReport] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token =
        localStorage.getItem("qsm_admin_token") ||
        sessionStorage.getItem("qsm_admin_token") ||
        localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/admin/moderation/dashboard`,
        {
          headers: {
            Accept: "application/json",
            Authorization: token ? `Bearer ${token}` : ""
          }
        }
      );

      if (!response.ok) {
        throw new Error(
          `No fue posible cargar Moderación (${response.status}).`
        );
      }

      const result = await response.json();
      setDashboardData(normalizeModerationResponse(result));
    } catch (requestError) {
      console.error("Error cargando Moderación:", requestError);

      if (USE_MOCK_DATA) {
        setDashboardData(MOCK_DATA);
        setError(
          "Modo demostración activo. El dashboard está preparado para conectar el backend."
        );
      } else {
        setDashboardData(null);
        setError(requestError.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const filteredReports = useMemo(() => {
    const reports = dashboardData?.reports || [];
    const normalizedSearch = search.trim().toLowerCase();

    return reports.filter((report) => {
      const searchableText = [
        report.id,
        report.title,
        report.description,
        report.targetId,
        report.reportedUser?.name,
        report.reportedUser?.email,
        report.reportedBy?.name,
        report.assignedModerator?.name,
        REPORT_REASON[report.reason],
        REPORT_TYPE[report.type]
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        report.status === statusFilter;

      const matchesType =
        typeFilter === "ALL" ||
        report.type === typeFilter;

      const matchesPriority =
        priorityFilter === "ALL" ||
        report.priority === priorityFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesPriority
      );
    });
  }, [
    dashboardData,
    search,
    statusFilter,
    typeFilter,
    priorityFilter
  ]);

  async function updateReport(reportId, payload) {
    setIsSaving(true);

    try {
      if (!USE_MOCK_DATA) {
        const token =
          localStorage.getItem("qsm_admin_token") ||
          sessionStorage.getItem("qsm_admin_token") ||
          localStorage.getItem("token");

        const response = await fetch(
          `${API_BASE_URL}/admin/moderation/reports/${reportId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : ""
            },
            body: JSON.stringify(payload)
          }
        );

        if (!response.ok) {
          const responseData =
            await response.json().catch(() => null);

          throw new Error(
            responseData?.message ||
            "No fue posible actualizar el reporte."
          );
        }
      }

      setDashboardData((current) => ({
        ...current,
        reports: current.reports.map((report) =>
          report.id === reportId
            ? {
                ...report,
                ...payload,
                lastUpdate: "Actualizado ahora"
              }
            : report
        )
      }));

      setSelectedReport((current) =>
        current?.id === reportId
          ? {
              ...current,
              ...payload,
              lastUpdate: "Actualizado ahora"
            }
          : current
      );
    } catch (updateError) {
      window.alert(updateError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function applyModerationAction(
    report,
    action,
    additionalData = {}
  ) {
    setIsSaving(true);

    try {
      const token =
        localStorage.getItem("qsm_admin_token") ||
        sessionStorage.getItem("qsm_admin_token") ||
        localStorage.getItem("token");

      if (!USE_MOCK_DATA) {
        const response = await fetch(
          `${API_BASE_URL}/admin/moderation/actions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: token ? `Bearer ${token}` : ""
            },
            body: JSON.stringify({
              reportId: report.id,
              targetId: report.targetId,
              userId: report.reportedUser?.id,
              action,
              ...additionalData
            })
          }
        );

        if (!response.ok) {
          const responseData =
            await response.json().catch(() => null);

          throw new Error(
            responseData?.message ||
            "No fue posible aplicar la acción."
          );
        }
      }

      const reportChanges = {
        status:
          action === "DISMISS_REPORT"
            ? "DISMISSED"
            : action === "RESOLVE_REPORT"
              ? "RESOLVED"
              : "ACTION_TAKEN",
        moderationAction: action,
        actionReason: additionalData.reason || null
      };

      if (action === "SUSPEND_USER") {
        reportChanges.reportedUser = {
          ...report.reportedUser,
          accountStatus: "SUSPENDED"
        };
      }

      if (action === "BAN_USER") {
        reportChanges.reportedUser = {
          ...report.reportedUser,
          accountStatus: "BANNED"
        };
      }

      if (action === "RESTORE_USER") {
        reportChanges.reportedUser = {
          ...report.reportedUser,
          accountStatus: "ACTIVE"
        };
      }

      if (action === "HIDE_CONTENT") {
        reportChanges.target = {
          ...report.target,
          status: "HIDDEN"
        };
      }

      if (action === "RESTORE_CONTENT") {
        reportChanges.target = {
          ...report.target,
          status: "ACTIVE"
        };
      }

      if (action === "WARN_USER") {
        reportChanges.reportedUser = {
          ...report.reportedUser,
          warnings:
            Number(report.reportedUser?.warnings || 0) + 1
        };
      }

      await updateReport(report.id, reportChanges);
    } catch (actionError) {
      window.alert(actionError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function assignModerator(reportId, moderator) {
    await updateReport(reportId, {
      status: "IN_REVIEW",
      assignedModerator: moderator
    });
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
    setPriorityFilter("ALL");
  }

  function openRelatedArea(type, id) {
    if (!id) return;

    const routes = {
      PRODUCT: `/admin/moderation/products/${id}`,
      USER: `/admin/users/${id}`,
      MESSAGE: `/admin/messages/${id}`,
      DISPUTE: `/admin/disputes/${id}`,
      VERIFICATION: `/admin/verification/${id}`
    };

    const route = routes[type];

    if (route) {
      navigate(route);
    }
  }

  if (loading) {
    return (
      <div className="moderation-loading">
        <style>{moderationStyles}</style>
        <div className="moderation-loader" />
        <h2>Cargando Dashboard de Moderación...</h2>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="moderation-loading">
        <style>{moderationStyles}</style>
        <h2>No se pudo cargar Moderación</h2>
        <p>{error}</p>

        <button
          className="moderation-button moderation-button-primary"
          onClick={loadDashboard}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="moderation-page">
      <style>{moderationStyles}</style>

      <div className="moderation-container">
        <header className="moderation-header">
          <div>
            <p className="moderation-eyebrow">QSM ADMIN</p>
            <h1 className="moderation-title">
              Centro de Moderación
            </h1>
            <p className="moderation-subtitle">
              Control de productos, usuarios, mensajes,
              contenido reportado e inteligencia artificial.
            </p>
          </div>

          <div className="moderation-header-actions">
            <button
              className="moderation-button"
              onClick={() => navigate("/admin/select-area")}
            >
              ← Todas las áreas
            </button>

            <button
              className="moderation-button"
              onClick={loadDashboard}
            >
              Actualizar
            </button>
          </div>
        </header>

        {error && (
          <div className="moderation-banner">
            {error}
          </div>
        )}

        <section className="moderation-kpis">
          {[
            {
              title: "Reportes abiertos",
              value: dashboardData.kpis.openReports,
              icon: "🚨"
            },
            {
              title: "En revisión",
              value: dashboardData.kpis.inReview,
              icon: "🕵️"
            },
            {
              title: "IA detectó",
              value: dashboardData.kpis.aiDetected,
              icon: "🤖"
            },
            {
              title: "Productos",
              value: dashboardData.kpis.reportedProducts,
              icon: "📦"
            },
            {
              title: "Usuarios",
              value: dashboardData.kpis.reportedUsers,
              icon: "👤"
            },
            {
              title: "Suspendidos",
              value: dashboardData.kpis.suspendedUsers,
              icon: "⛔"
            },
            {
              title: "Baneados",
              value: dashboardData.kpis.bannedUsers,
              icon: "🚫"
            },
            {
              title: "Resueltos hoy",
              value: dashboardData.kpis.resolvedToday,
              icon: "✅"
            }
          ].map((card) => (
            <div
              key={card.title}
              className="moderation-card moderation-kpi"
            >
              <div className="moderation-kpi-icon">
                {card.icon}
              </div>

              <h4>{card.title}</h4>
              <h2>{card.value}</h2>
            </div>
          ))}
        </section>

        <div className="moderation-main-grid">
          <div className="moderation-card">
            <div className="moderation-toolbar">
              <input
                className="moderation-input"
                placeholder="Buscar..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              <select
                className="moderation-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="ALL">
                  Todos los estados
                </option>

                {Object.entries(REPORT_STATUS).map(
                  ([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  )
                )}
              </select>

              <select
                className="moderation-select"
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value)
                }
              >
                <option value="ALL">
                  Todos los tipos
                </option>

                {Object.entries(REPORT_TYPE).map(
                  ([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  )
                )}
              </select>

              <select
                className="moderation-select"
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value)
                }
              >
                <option value="ALL">
                  Todas las prioridades
                </option>
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>

              <button
                className="moderation-button"
                onClick={clearFilters}
              >
                Limpiar
              </button>
            </div>

            <div className="moderation-table-wrapper">
              <table className="moderation-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Título</th>
                    <th>Usuario</th>
                    <th>Motivo</th>
                    <th>IA</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <strong>{report.id}</strong>
                      </td>

                      <td>
                        {REPORT_TYPE[report.type] ||
                          report.type}
                      </td>

                      <td>
                        <strong>{report.title}</strong>
                        <div className="moderation-muted">
                          {report.lastUpdate}
                        </div>
                      </td>

                      <td>
                        {report.reportedUser?.name ||
                          "Sin usuario"}
                      </td>

                      <td>
                        {REPORT_REASON[report.reason] ||
                          report.reason}
                      </td>

                      <td>{report.aiScore ?? 0}%</td>

                      <td>
                        <span
                          className={`priority-${report.priority}`}
                        >
                          {PRIORITY_LABELS[
                            report.priority
                          ] || report.priority}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-${report.status}`}
                        >
                          {REPORT_STATUS[report.status] ||
                            report.status}
                        </span>
                      </td>

                      <td>
                        <button
                          className="moderation-button"
                          onClick={() =>
                            setSelectedReport(report)
                          }
                        >
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredReports.length === 0 && (
                    <tr>
                      <td
                        colSpan="9"
                        className="moderation-empty"
                      >
                        No hay reportes que coincidan con
                        los filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="moderation-side">
            <div className="moderation-card">
              <h3>🤖 Alertas IA</h3>

              {dashboardData.aiAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="moderation-alert"
                >
                  <strong>{alert.title}</strong>
                  <p>{alert.description}</p>
                  <div>
                    Score: <b>{alert.score}%</b>
                  </div>
                </div>
              ))}
            </div>

            <div className="moderation-card">
              <h3>👮 Moderadores</h3>

              {dashboardData.moderators.map((user) => (
                <div
                  key={user.id}
                  className="moderation-user"
                >
                  <div>
                    <strong>{user.name}</strong>
                    <div className="moderation-muted">
                      {user.activeCases} casos activos
                    </div>
                  </div>

                  <div>{user.online ? "🟢" : "⚪"}</div>
                </div>
              ))}
            </div>

            <div className="moderation-card">
              <h3>Actividad reciente</h3>

              {dashboardData.recentActivity.map(
                (item) => (
                  <div
                    key={item.id}
                    className="moderation-activity"
                  >
                    <div>{item.icon}</div>

                    <div>
                      <strong>{item.title}</strong>
                      <div className="moderation-muted">
                        {item.description}
                      </div>
                      <div className="moderation-muted">
                        {item.time}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </aside>
        </div>
      </div>

      {selectedReport && (
        <ModerationModal
          report={selectedReport}
          moderators={dashboardData.moderators}
          onClose={() => setSelectedReport(null)}
          onAssignModerator={assignModerator}
          onAction={applyModerationAction}
          openRelatedArea={openRelatedArea}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}

function ModerationModal({
  report,
  moderators,
  onClose,
  onAssignModerator,
  onAction,
  openRelatedArea,
  isSaving
}) {
  const [selectedModerator, setSelectedModerator] =
    useState(report.assignedModerator?.id || "");

  const moderator = moderators.find(
    (item) => item.id === selectedModerator
  );

  const relatedEntities = report.relatedEntities || {};
  const evidence = Array.isArray(report.evidence)
    ? report.evidence
    : [];

  return (
    <div
      className="moderation-modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="moderation-modal">
        <div className="moderation-modal-header">
          <div>
            <p className="moderation-eyebrow">
              Moderación
            </p>
            <h2>{report.id}</h2>
            <p>{report.title}</p>
          </div>

          <button
            className="moderation-button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="moderation-modal-body">
          <div className="moderation-grid">
            <div>
              <label>Tipo</label>
              <strong>
                {REPORT_TYPE[report.type] ||
                  report.type}
              </strong>
            </div>

            <div>
              <label>Estado</label>
              <strong>
                {REPORT_STATUS[report.status] ||
                  report.status}
              </strong>
            </div>

            <div>
              <label>Prioridad</label>
              <strong>
                {PRIORITY_LABELS[report.priority] ||
                  report.priority}
              </strong>
            </div>

            <div>
              <label>IA</label>
              <strong>{report.aiScore ?? 0}%</strong>
            </div>

            <div>
              <label>Usuario</label>
              <strong>
                {report.reportedUser?.name ||
                  "Sin usuario"}
              </strong>
            </div>

            <div>
              <label>Trust Score</label>
              <strong>
                {report.reportedUser?.trustScore ?? 0}
              </strong>
            </div>
          </div>

          <hr />

          <h3>Descripción</h3>
          <p>{report.description}</p>

          <h3>Evidencias</h3>

          {evidence.length > 0 ? (
            <ul>
              {evidence.map((item, index) => (
                <li key={`${item}-${index}`}>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p>No hay evidencias registradas.</p>
          )}

          <hr />

          <h3>Asignar moderador</h3>

          <div className="moderation-row">
            <select
              className="moderation-select"
              value={selectedModerator}
              onChange={(event) =>
                setSelectedModerator(
                  event.target.value
                )
              }
            >
              <option value="">
                Seleccionar...
              </option>

              {moderators.map((user) => (
                <option
                  key={user.id}
                  value={user.id}
                >
                  {user.name}
                </option>
              ))}
            </select>

            <button
              className="moderation-button moderation-button-primary"
              disabled={!moderator || isSaving}
              onClick={() =>
                onAssignModerator(
                  report.id,
                  moderator
                )
              }
            >
              Asignar
            </button>
          </div>

          <hr />

          <h3>Acciones rápidas</h3>

          <div className="moderation-actions">
            <button
              className="moderation-button"
              disabled={!relatedEntities.productId}
              onClick={() =>
                openRelatedArea(
                  "PRODUCT",
                  relatedEntities.productId
                )
              }
            >
              Ver Producto
            </button>

            <button
              className="moderation-button"
              disabled={!relatedEntities.userId}
              onClick={() =>
                openRelatedArea(
                  "USER",
                  relatedEntities.userId
                )
              }
            >
              Ver Usuario
            </button>

            <button
              className="moderation-button"
              disabled={
                !relatedEntities.verificationId
              }
              onClick={() =>
                openRelatedArea(
                  "VERIFICATION",
                  relatedEntities.verificationId
                )
              }
            >
              Ver KYC
            </button>

            <button
              className="moderation-button"
              disabled={!relatedEntities.disputeId}
              onClick={() =>
                openRelatedArea(
                  "DISPUTE",
                  relatedEntities.disputeId
                )
              }
            >
              Ver Disputa
            </button>
          </div>

          <hr />

          <h3>Aplicar moderación</h3>

          <div className="moderation-actions">
            <button
              className="moderation-button moderation-button-warning"
              disabled={isSaving}
              onClick={() =>
                onAction(report, "WARN_USER")
              }
            >
              ⚠ Advertir
            </button>

            <button
              className="moderation-button moderation-button-info"
              disabled={isSaving}
              onClick={() =>
                onAction(report, "HIDE_CONTENT")
              }
            >
              🙈 Ocultar publicación
            </button>

            <button
              className="moderation-button moderation-button-success"
              disabled={isSaving}
              onClick={() =>
                onAction(report, "RESTORE_CONTENT")
              }
            >
              👁 Restaurar publicación
            </button>

            <button
              className="moderation-button moderation-button-warning"
              disabled={isSaving}
              onClick={() =>
                onAction(report, "SUSPEND_USER")
              }
            >
              ⛔ Suspender
            </button>

            <button
              className="moderation-button moderation-button-danger"
              disabled={isSaving}
              onClick={() =>
                onAction(report, "BAN_USER")
              }
            >
              🚫 Banear
            </button>

            <button
              className="moderation-button moderation-button-success"
              disabled={isSaving}
              onClick={() =>
                onAction(report, "RESTORE_USER")
              }
            >
              ♻ Restaurar usuario
            </button>

            <button
              className="moderation-button moderation-button-primary"
              disabled={isSaving}
              onClick={() =>
                onAction(report, "RESOLVE_REPORT")
              }
            >
              ✅ Resolver reporte
            </button>

            <button
              className="moderation-button"
              disabled={isSaving}
              onClick={() =>
                onAction(report, "DISMISS_REPORT")
              }
            >
              ❌ Descartar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeModerationResponse(response) {
  const source = response?.data || response || {};

  return {
    generatedAt:
      source.generatedAt ||
      new Date().toISOString(),
    kpis: {
      openReports:
        Number(source.kpis?.openReports) || 0,
      inReview:
        Number(source.kpis?.inReview) || 0,
      aiDetected:
        Number(source.kpis?.aiDetected) || 0,
      reportedProducts:
        Number(source.kpis?.reportedProducts) || 0,
      reportedUsers:
        Number(source.kpis?.reportedUsers) || 0,
      suspendedUsers:
        Number(source.kpis?.suspendedUsers) || 0,
      bannedUsers:
        Number(source.kpis?.bannedUsers) || 0,
      resolvedToday:
        Number(source.kpis?.resolvedToday) || 0,
      averageTrustScore:
        Number(source.kpis?.averageTrustScore) || 0,
      resolutionRate:
        Number(source.kpis?.resolutionRate) || 0
    },
    reports: Array.isArray(source.reports)
      ? source.reports
      : [],
    moderators: Array.isArray(source.moderators)
      ? source.moderators
      : [],
    aiAlerts: Array.isArray(source.aiAlerts)
      ? source.aiAlerts
      : [],
    recentActivity: Array.isArray(
      source.recentActivity
    )
      ? source.recentActivity
      : []
  };
}

const moderationStyles = `
  * {
    box-sizing: border-box;
  }

  .moderation-page,
  .moderation-loading {
    min-height: 100vh;
    color: #f7f8ff;
    background:
      radial-gradient(
        circle at top right,
        rgba(255, 72, 122, 0.14),
        transparent 30%
      ),
      radial-gradient(
        circle at bottom left,
        rgba(99, 91, 255, 0.12),
        transparent 30%
      ),
      #050818;
    font-family: Inter, system-ui, sans-serif;
  }

  .moderation-page {
    padding: 28px;
  }

  .moderation-loading {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 16px;
    padding: 30px;
    text-align: center;
  }

  .moderation-loader {
    width: 48px;
    height: 48px;
    border: 4px solid #222b4d;
    border-top-color: #ff5277;
    border-radius: 50%;
    animation: moderation-spin 0.8s linear infinite;
  }

  @keyframes moderation-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .moderation-container {
    width: min(1650px, 100%);
    margin: 0 auto;
  }

  .moderation-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .moderation-header-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .moderation-eyebrow {
    margin: 0 0 8px;
    color: #ff6f91;
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .moderation-title {
    margin: 0;
    font-size: clamp(30px, 4vw, 44px);
    line-height: 1.1;
  }

  .moderation-subtitle {
    max-width: 780px;
    margin: 12px 0 0;
    color: #929bbd;
    line-height: 1.6;
  }

  .moderation-banner {
    margin-bottom: 18px;
    border: 1px solid rgba(255, 196, 76, 0.28);
    border-radius: 13px;
    padding: 13px 15px;
    color: #e5cf91;
    background: rgba(255, 196, 76, 0.07);
    font-size: 12px;
  }

  .moderation-kpis {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .moderation-card {
    border: 1px solid #1d2545;
    border-radius: 18px;
    padding: 18px;
    background:
      linear-gradient(
        145deg,
        rgba(16, 21, 45, 0.97),
        rgba(8, 12, 29, 0.97)
      );
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.16);
  }

  .moderation-kpi {
    min-height: 150px;
  }

  .moderation-kpi-icon {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border-radius: 13px;
    background:
      linear-gradient(
        135deg,
        rgba(103, 92, 255, 0.18),
        rgba(219, 78, 158, 0.18)
      );
    font-size: 20px;
  }

  .moderation-kpi h4 {
    margin: 16px 0 8px;
    color: #8f98ba;
    font-size: 12px;
    font-weight: 650;
  }

  .moderation-kpi h2 {
    margin: 0;
    color: #ffffff;
    font-size: 29px;
  }

  .moderation-main-grid {
    display: grid;
    grid-template-columns:
      minmax(0, 2fr)
      minmax(310px, 0.68fr);
    gap: 18px;
  }

  .moderation-toolbar {
    display: grid;
    grid-template-columns:
      minmax(250px, 1fr)
      auto
      auto
      auto
      auto;
    gap: 10px;
    margin-bottom: 16px;
  }

  .moderation-input,
  .moderation-select {
    min-height: 42px;
    border: 1px solid #222b4d;
    border-radius: 11px;
    padding: 0 14px;
    color: #f1f3ff;
    background: #080d21;
    outline: none;
    font-family: inherit;
  }

  .moderation-input::placeholder {
    color: #5f698a;
  }

  .moderation-input:focus,
  .moderation-select:focus {
    border-color: #675cff;
    box-shadow:
      0 0 0 3px rgba(103, 92, 255, 0.13);
  }

  .moderation-button {
    min-height: 41px;
    border: 1px solid #252d4d;
    border-radius: 12px;
    padding: 10px 15px;
    color: #eef0ff;
    background: #0d1228;
    font-weight: 750;
    cursor: pointer;
    transition:
      transform 0.2s ease,
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .moderation-button:hover:not(:disabled) {
    border-color: #555f89;
    transform: translateY(-1px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  }

  .moderation-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .moderation-button-primary {
    border-color: transparent;
    background:
      linear-gradient(
        135deg,
        #675cff,
        #db4e9e
      );
  }

  .moderation-button-danger {
    color: #ff8ca0;
    border-color: rgba(255, 77, 109, 0.35);
    background: rgba(255, 77, 109, 0.1);
  }

  .moderation-button-warning {
    color: #ffd16c;
    border-color: rgba(255, 177, 64, 0.35);
    background: rgba(255, 177, 64, 0.1);
  }

  .moderation-button-success {
    color: #74eeb9;
    border-color: rgba(48, 211, 146, 0.35);
    background: rgba(48, 211, 146, 0.1);
  }

  .moderation-button-info {
    color: #79dfff;
    border-color: rgba(66, 190, 255, 0.35);
    background: rgba(66, 190, 255, 0.1);
  }

  .moderation-table-wrapper {
    overflow-x: auto;
    border: 1px solid #171f3d;
    border-radius: 14px;
  }

  .moderation-table {
    width: 100%;
    min-width: 1180px;
    border-collapse: collapse;
  }

  .moderation-table thead {
    background: #080d20;
  }

  .moderation-table th {
    padding: 14px;
    color: #697395;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.05em;
    text-align: left;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .moderation-table td {
    padding: 15px 14px;
    border-top: 1px solid #171e39;
    color: #dce1f5;
    font-size: 12px;
    vertical-align: middle;
  }

  .moderation-table tbody tr {
    transition: background 0.2s ease;
  }

  .moderation-table tbody tr:hover {
    background: rgba(109, 93, 252, 0.07);
  }

  .moderation-empty {
    padding: 32px !important;
    color: #8f98ba !important;
    text-align: center;
  }

  .moderation-muted {
    margin-top: 5px;
    color: #717b9d;
    font-size: 10px;
    line-height: 1.4;
  }

  .priority-LOW,
  .priority-MEDIUM,
  .priority-HIGH,
  .priority-CRITICAL,
  .status-OPEN,
  .status-IN_REVIEW,
  .status-ESCALATED,
  .status-ACTION_TAKEN,
  .status-RESOLVED,
  .status-DISMISSED {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    padding: 6px 10px;
    font-size: 9px;
    font-weight: 850;
    white-space: nowrap;
  }

  .priority-LOW {
    color: #72e6c2;
    background: rgba(68, 211, 163, 0.12);
  }

  .priority-MEDIUM {
    color: #ffd26f;
    background: rgba(255, 186, 73, 0.13);
  }

  .priority-HIGH {
    color: #b7a8ff;
    background: rgba(123, 97, 255, 0.15);
  }

  .priority-CRITICAL {
    color: #ff8098;
    background: rgba(255, 77, 109, 0.13);
  }

  .status-OPEN {
    color: #ffbe68;
    background: rgba(255, 166, 61, 0.13);
  }

  .status-IN_REVIEW {
    color: #a99cff;
    background: rgba(124, 97, 255, 0.14);
  }

  .status-ESCALATED {
    color: #ff8198;
    background: rgba(255, 77, 109, 0.12);
  }

  .status-ACTION_TAKEN {
    color: #66d7ff;
    background: rgba(61, 183, 255, 0.12);
  }

  .status-RESOLVED {
    color: #6debb6;
    background: rgba(48, 211, 146, 0.12);
  }

  .status-DISMISSED {
    color: #aab2cc;
    background: rgba(160, 170, 196, 0.11);
  }

  .moderation-side {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .moderation-side h3 {
    margin: 0 0 14px;
    font-size: 18px;
  }

  .moderation-alert {
    padding: 14px 0;
    border-bottom: 1px solid #18203b;
  }

  .moderation-alert:last-child {
    border-bottom: none;
  }

  .moderation-alert strong {
    display: block;
    color: #f5f6ff;
    font-size: 12px;
  }

  .moderation-alert p {
    margin: 6px 0 10px;
    color: #727c9d;
    font-size: 11px;
    line-height: 1.5;
  }

  .moderation-alert div {
    color: #8c96b8;
    font-size: 10px;
  }

  .moderation-user {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 13px 0;
    border-bottom: 1px solid #18203b;
  }

  .moderation-user:last-child {
    border-bottom: none;
  }

  .moderation-user strong {
    font-size: 12px;
  }

  .moderation-activity {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 13px 0;
    border-bottom: 1px solid #18203b;
  }

  .moderation-activity:last-child {
    border-bottom: none;
  }

  .moderation-activity > div:first-child {
    display: grid;
    flex: 0 0 auto;
    width: 38px;
    height: 38px;
    place-items: center;
    border-radius: 11px;
    background: #171d3b;
  }

  .moderation-activity strong {
    font-size: 12px;
  }

  .moderation-modal-backdrop {
    position: fixed;
    z-index: 2000;
    inset: 0;
    display: grid;
    place-items: center;
    overflow-y: auto;
    padding: 22px;
    background: rgba(0, 0, 0, 0.78);
    backdrop-filter: blur(9px);
  }

  .moderation-modal {
    width: min(980px, 100%);
    max-height: 94vh;
    overflow-y: auto;
    border: 1px solid #283158;
    border-radius: 21px;
    background:
      linear-gradient(
        145deg,
        #0c1228,
        #080c1d
      );
    box-shadow:
      0 35px 100px rgba(0, 0, 0, 0.55);
  }

  .moderation-modal-header {
    position: sticky;
    z-index: 5;
    top: 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    padding: 22px;
    border-bottom: 1px solid #1c2443;
    background: rgba(9, 14, 34, 0.96);
    backdrop-filter: blur(12px);
  }

  .moderation-modal-header h2 {
    margin: 0 0 7px;
    font-size: 27px;
  }

  .moderation-modal-header p {
    margin: 0;
    color: #8e98b8;
  }

  .moderation-modal-body {
    padding: 22px;
  }

  .moderation-modal-body h3 {
    margin: 22px 0 12px;
    color: #ffffff;
    font-size: 16px;
  }

  .moderation-modal-body > p {
    margin: 0;
    color: #bbc2db;
    font-size: 13px;
    line-height: 1.7;
  }

  .moderation-modal-body hr {
    height: 1px;
    margin: 22px 0;
    border: none;
    background: #1c2545;
  }

  .moderation-modal-body ul {
    display: grid;
    gap: 9px;
    margin: 0;
    padding-left: 20px;
    color: #bbc2db;
    font-size: 12px;
    line-height: 1.5;
  }

  .moderation-grid {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .moderation-grid > div {
    border: 1px solid #1c2545;
    border-radius: 13px;
    padding: 14px;
    background: #0c1229;
  }

  .moderation-grid label,
  .moderation-grid strong {
    display: block;
  }

  .moderation-grid label {
    margin-bottom: 7px;
    color: #6f799b;
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .moderation-grid strong {
    color: #f5f7ff;
    font-size: 13px;
  }

  .moderation-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .moderation-row .moderation-select {
    flex: 1;
  }

  .moderation-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .moderation-actions .moderation-button {
    flex: 0 1 auto;
  }

  .moderation-modal::-webkit-scrollbar,
  .moderation-table-wrapper::-webkit-scrollbar {
    width: 9px;
    height: 9px;
  }

  .moderation-modal::-webkit-scrollbar-track,
  .moderation-table-wrapper::-webkit-scrollbar-track {
    background: #090d20;
  }

  .moderation-modal::-webkit-scrollbar-thumb,
  .moderation-table-wrapper::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: #30395e;
  }

  @media (max-width: 1500px) {
    .moderation-kpis {
      grid-template-columns:
        repeat(4, minmax(0, 1fr));
    }
  }

  @media (max-width: 1250px) {
    .moderation-main-grid {
      grid-template-columns: 1fr;
    }

    .moderation-side {
      display: grid;
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 1000px) {
    .moderation-toolbar {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .moderation-input {
      grid-column: 1 / -1;
    }

    .moderation-grid {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .moderation-side {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .moderation-page {
      padding: 18px 12px;
    }

    .moderation-header {
      flex-direction: column;
    }

    .moderation-header-actions {
      width: 100%;
    }

    .moderation-header-actions .moderation-button {
      flex: 1;
    }

    .moderation-kpis {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .moderation-toolbar {
      grid-template-columns: 1fr;
    }

    .moderation-input {
      grid-column: auto;
    }

    .moderation-grid {
      grid-template-columns: 1fr;
    }

    .moderation-row {
      flex-direction: column;
      align-items: stretch;
    }

    .moderation-modal-backdrop {
      padding: 10px;
    }

    .moderation-modal-header,
    .moderation-modal-body {
      padding: 17px;
    }

    .moderation-actions {
      display: grid;
      grid-template-columns: 1fr;
    }

    .moderation-actions .moderation-button {
      width: 100%;
    }
  }

  @media (max-width: 460px) {
    .moderation-kpis {
      grid-template-columns: 1fr;
    }

    .moderation-title {
      font-size: 30px;
    }

    .moderation-button {
      width: 100%;
    }
  }
`;

export default ModerationDashboard;
