import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const USE_MOCK_DATA =
  String(
    import.meta.env.VITE_USE_MOCK_ADMIN ??
      "true"
  ).toLowerCase() === "true";

const DISPUTE_STATUS = {
  OPEN: "Abierta",
  UNDER_REVIEW: "En investigación",
  WAITING_BUYER: "Esperando comprador",
  WAITING_SELLER: "Esperando vendedor",
  ESCALATED: "Escalada",
  RESOLVED_BUYER: "Resuelta a favor del comprador",
  RESOLVED_SELLER: "Resuelta a favor del vendedor",
  REFUNDED: "Reembolsada",
  CLOSED: "Cerrada"
};

const MOCK_DASHBOARD_DATA = {
  generatedAt: new Date().toISOString(),

  kpis: {
    open: 24,
    underReview: 15,
    waitingResponse: 8,
    escalated: 2,
    resolvedToday: 8,
    refundedToday: 3,
    critical: 5,
    resolutionRate: 68
  },

  disputes: [
    {
      id: "DSP-3052",
      orderId: "QSM-1048",
      product: {
        id: "PRD-981",
        name: "iPhone 15 Pro 256 GB",
        serial: "SN-IPH-889233",
        image: null
      },
      buyer: {
        id: "USR-101",
        name: "Carlos Martínez",
        trustScore: 84,
        disputes: 1
      },
      seller: {
        id: "USR-203",
        name: "Juan Pérez",
        trustScore: 61,
        disputes: 4
      },
      assignedAgent: null,
      category: "PRODUCT_NOT_AS_DESCRIBED",
      reason: "El equipo presenta rayones y la batería no coincide con la publicación.",
      amount: 68500,
      currency: "RD$",
      priority: "CRITICAL",
      status: "OPEN",
      createdAt: new Date().toISOString(),
      lastUpdate: "Hace 12 minutos",
      deadline: "1 h 48 min",
      unreadMessages: 4,
      evidenceCount: 6,
      escrowStatus: "HELD"
    },
    {
      id: "DSP-3051",
      orderId: "QSM-1047",
      product: {
        id: "PRD-982",
        name: "Dell Latitude 5420",
        serial: "DL-5420-0932",
        image: null
      },
      buyer: {
        id: "USR-102",
        name: "Ana Rodríguez",
        trustScore: 92,
        disputes: 0
      },
      seller: {
        id: "USR-204",
        name: "Miguel Santos",
        trustScore: 78,
        disputes: 2
      },
      assignedAgent: {
        id: "AGT-012",
        name: "Laura Méndez"
      },
      category: "MISSING_ACCESSORIES",
      reason: "El producto fue entregado sin cargador original.",
      amount: 28500,
      currency: "RD$",
      priority: "HIGH",
      status: "UNDER_REVIEW",
      createdAt: new Date().toISOString(),
      lastUpdate: "Hace 35 minutos",
      deadline: "5 h 20 min",
      unreadMessages: 1,
      evidenceCount: 4,
      escrowStatus: "HELD"
    },
    {
      id: "DSP-3050",
      orderId: "QSM-1046",
      product: {
        id: "PRD-983",
        name: "PlayStation 5 Slim",
        serial: "PS5-112983",
        image: null
      },
      buyer: {
        id: "USR-103",
        name: "Pedro Jiménez",
        trustScore: 75,
        disputes: 2
      },
      seller: {
        id: "USR-205",
        name: "María Pérez",
        trustScore: 88,
        disputes: 1
      },
      assignedAgent: {
        id: "AGT-017",
        name: "José Ramírez"
      },
      category: "DELIVERY_DAMAGE",
      reason: "La caja llegó golpeada y el equipo presenta daños externos.",
      amount: 32000,
      currency: "RD$",
      priority: "HIGH",
      status: "WAITING_SELLER",
      createdAt: new Date().toISOString(),
      lastUpdate: "Hace 1 hora",
      deadline: "9 h 15 min",
      unreadMessages: 0,
      evidenceCount: 8,
      escrowStatus: "HELD"
    },
    {
      id: "DSP-3049",
      orderId: "QSM-1045",
      product: {
        id: "PRD-984",
        name: "Samsung Galaxy S24 Ultra",
        serial: "SGS24-003829",
        image: null
      },
      buyer: {
        id: "USR-104",
        name: "Laura Méndez",
        trustScore: 89,
        disputes: 1
      },
      seller: {
        id: "USR-206",
        name: "Claudia Reyes",
        trustScore: 91,
        disputes: 0
      },
      assignedAgent: {
        id: "AGT-011",
        name: "Ana Gómez"
      },
      category: "DEVICE_LOCKED",
      reason: "El dispositivo está bloqueado por cuenta de Google.",
      amount: 52000,
      currency: "RD$",
      priority: "CRITICAL",
      status: "ESCALATED",
      createdAt: new Date().toISOString(),
      lastUpdate: "Hace 2 horas",
      deadline: "45 min",
      unreadMessages: 7,
      evidenceCount: 11,
      escrowStatus: "HELD"
    },
    {
      id: "DSP-3048",
      orderId: "QSM-1044",
      product: {
        id: "PRD-985",
        name: "MacBook Pro M3",
        serial: "MBP-M3-109823",
        image: null
      },
      buyer: {
        id: "USR-105",
        name: "Miguel Santos",
        trustScore: 80,
        disputes: 2
      },
      seller: {
        id: "USR-207",
        name: "Carlos Reyes",
        trustScore: 86,
        disputes: 1
      },
      assignedAgent: {
        id: "AGT-009",
        name: "Claudia Méndez"
      },
      category: "NO_LONGER_NEEDED",
      reason: "El comprador solicita cancelar después de recibir el producto.",
      amount: 125000,
      currency: "RD$",
      priority: "MEDIUM",
      status: "RESOLVED_SELLER",
      createdAt: new Date().toISOString(),
      lastUpdate: "Hace 4 horas",
      deadline: "Completado",
      unreadMessages: 0,
      evidenceCount: 3,
      escrowStatus: "RELEASED"
    }
  ],

  agents: [
    {
      id: "AGT-012",
      name: "Laura Méndez",
      activeCases: 7,
      resolvedToday: 4,
      resolutionRate: 93,
      status: "AVAILABLE"
    },
    {
      id: "AGT-017",
      name: "José Ramírez",
      activeCases: 9,
      resolvedToday: 3,
      resolutionRate: 88,
      status: "BUSY"
    },
    {
      id: "AGT-011",
      name: "Ana Gómez",
      activeCases: 5,
      resolvedToday: 6,
      resolutionRate: 96,
      status: "AVAILABLE"
    },
    {
      id: "AGT-009",
      name: "Claudia Méndez",
      activeCases: 8,
      resolvedToday: 2,
      resolutionRate: 90,
      status: "BUSY"
    }
  ],

  alerts: [
    {
      id: "ALT-001",
      title: "5 casos críticos",
      description: "Requieren revisión antes de que venza el SLA.",
      severity: "CRITICAL"
    },
    {
      id: "ALT-002",
      title: "2 disputas escaladas",
      description: "Esperan decisión de un gerente de disputas.",
      severity: "HIGH"
    },
    {
      id: "ALT-003",
      title: "8 usuarios sin responder",
      description: "Hay casos detenidos esperando comprador o vendedor.",
      severity: "MEDIUM"
    }
  ],

  recentActivity: [
    {
      id: "ACT-001",
      title: "Caso escalado",
      description: "DSP-3049 fue escalado por posible dispositivo bloqueado.",
      time: "Hace 2 horas",
      icon: "🚨"
    },
    {
      id: "ACT-002",
      title: "Respuesta recibida",
      description: "El vendedor respondió en DSP-3050.",
      time: "Hace 1 hora",
      icon: "💬"
    },
    {
      id: "ACT-003",
      title: "Evidencia agregada",
      description: "El comprador agregó 3 fotografías en DSP-3052.",
      time: "Hace 35 minutos",
      icon: "📎"
    },
    {
      id: "ACT-004",
      title: "Disputa resuelta",
      description: "DSP-3048 fue resuelta a favor del vendedor.",
      time: "Hace 4 horas",
      icon: "✅"
    }
  ]
};

function DisputesDashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [priorityFilter, setPriorityFilter] =
    useState("ALL");

  const [selectedDispute, setSelectedDispute] =
    useState(null);

  const [isSaving, setIsSaving] =
    useState(false);

  const loadDashboard = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const token =
          localStorage.getItem(
            "qsm_admin_token"
          ) ||
          sessionStorage.getItem(
            "qsm_admin_token"
          );

        const response = await fetch(
          `${API_BASE_URL}/admin/disputes/dashboard`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: token
                ? `Bearer ${token}`
                : ""
            }
          }
        );

        if (!response.ok) {
          throw new Error(
            `No fue posible cargar Disputas (${response.status}).`
          );
        }

        const result =
          await response.json();

        setDashboardData(
          normalizeDashboardResponse(
            result
          )
        );
      } catch (requestError) {
        console.error(
          "Error cargando Disputas:",
          requestError
        );

        if (USE_MOCK_DATA) {
          setDashboardData(
            MOCK_DASHBOARD_DATA
          );

          setError(
            "Modo demostración activo. El dashboard está preparado para recibir el backend real."
          );
        } else {
          setDashboardData(null);

          setError(
            requestError.message ||
              "No fue posible cargar los datos de Disputas."
          );
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const disputes =
    dashboardData?.disputes || [];

  const filteredDisputes =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return disputes.filter(
        (dispute) => {
          const matchesSearch =
            !normalizedSearch ||
            dispute.id
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            dispute.orderId
              ?.toLower
                .includes(
                normalizedSearch
              ) ||
            dispute.product?.name
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            dispute.buyer?.name
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            dispute.seller?.name
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            dispute.assignedAgent?.name
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            dispute.category
              ?.toLowerCase()
              .includes(
                normalizedSearch
              );

          const matchesStatus =
            statusFilter === "ALL" ||
            dispute.status === statusFilter;

          const matchesPriority =
            priorityFilter === "ALL" ||
            dispute.priority ===
              priorityFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesPriority
          );
        }
      );
    }, [
      disputes,
      search,
      statusFilter,
      priorityFilter
    ]);

  async function updateDisputeStatus(
    disputeId,
    newStatus,
    resolution = null
  ) {
    setIsSaving(true);

    try {
      if (!USE_MOCK_DATA) {
        const token =
          localStorage.getItem(
            "qsm_admin_token"
          ) ||
          sessionStorage.getItem(
            "qsm_admin_token"
          );

        const response = await fetch(
          `${API_BASE_URL}/admin/disputes/${disputeId}/status`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: token
                ? `Bearer ${token}`
                : ""
            },
            body: JSON.stringify({
              status: newStatus,
              resolution
            })
          }
        );

        if (!response.ok) {
          const result =
            await response
              .json()
              .catch(() => null);

          throw new Error(
            result?.message ||
              "No fue posible actualizar la disputa."
          );
        }
      }

      setDashboardData(
        (currentData) => ({
          ...currentData,
          disputes:
            currentData.disputes.map(
              (dispute) =>
                dispute.id ===
                disputeId
                  ? {
                      ...dispute,
                      status: newStatus,
                      resolution,
                      lastUpdate:
                        "Actualizado ahora",
                      escrowStatus:
                        getEscrowStatusForResolution(
                          newStatus
                        )
                    }
                  : dispute
            )
        })
      );

      setSelectedDispute(
        (currentDispute) =>
          currentDispute?.id ===
          disputeId
            ? {
                ...currentDispute,
                status: newStatus,
                resolution,
                lastUpdate:
                  "Actualizado ahora",
                escrowStatus:
                  getEscrowStatusForResolution(
                    newStatus
                  )
              }
            : currentDispute
      );
    } catch (updateError) {
      window.alert(
        updateError.message
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function assignAgent(
    disputeId,
    agent
  ) {
    setIsSaving(true);

    try {
      if (!USE_MOCK_DATA) {
        const token =
          localStorage.getItem(
            "qsm_admin_token"
          ) ||
          sessionStorage.getItem(
            "qsm_admin_token"
          );

        const response = await fetch(
          `${API_BASE_URL}/admin/disputes/${disputeId}/assign`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: token
                ? `Bearer ${token}`
                : ""
            },
            body: JSON.stringify({
              agentId: agent.id
            })
          }
        );

        if (!response.ok) {
          const result =
            await response
              .json()
              .catch(() => null);

          throw new Error(
            result?.message ||
              "No fue posible asignar el agente."
          );
        }
      }

      setDashboardData(
        (currentData) => ({
          ...currentData,
          disputes:
            currentData.disputes.map(
              (dispute) =>
                dispute.id ===
                disputeId
                  ? {
                      ...dispute,
                      assignedAgent:
                        agent,
                      status:
                        dispute.status ===
                        "OPEN"
                          ? "UNDER_REVIEW"
                          : dispute.status,
                      lastUpdate:
                        "Actualizado ahora"
                    }
                  : dispute
            )
        })
      );

      setSelectedDispute(
        (currentDispute) =>
          currentDispute?.id ===
          disputeId
            ? {
                ...currentDispute,
                assignedAgent:
                  agent,
                status:
                  currentDispute.status ===
                  "OPEN"
                    ? "UNDER_REVIEW"
                    : currentDispute.status,
                lastUpdate:
                  "Actualizado ahora"
              }
            : currentDispute
      );
    } catch (assignError) {
      window.alert(
        assignError.message
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function addInternalNote(
    disputeId,
    note
  ) {
    const normalizedNote =
      note.trim();

    if (!normalizedNote) {
      return;
    }

    setIsSaving(true);

    try {
      if (!USE_MOCK_DATA) {
        const token =
          localStorage.getItem(
            "qsm_admin_token"
          ) ||
          sessionStorage.getItem(
            "qsm_admin_token"
          );

        const response = await fetch(
          `${API_BASE_URL}/admin/disputes/${disputeId}/notes`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: token
                ? `Bearer ${token}`
                : ""
            },
            body: JSON.stringify({
              note: normalizedNote
            })
          }
        );

        if (!response.ok) {
          const result =
            await response
              .json()
              .catch(() => null);

          throw new Error(
            result?.message ||
              "No fue posible guardar la nota."
          );
        }
      }

      const newNote = {
        id: `NOTE-${Date.now()}`,
        author:
          "Usuario administrativo",
        message:
          normalizedNote,
        createdAt:
          new Date().toISOString()
      };

      setDashboardData(
        (currentData) => ({
          ...currentData,
          disputes:
            currentData.disputes.map(
              (dispute) =>
                dispute.id ===
                disputeId
                  ? {
                      ...dispute,
                      internalNotes: [
                        ...(
                          dispute.internalNotes ||
                          []
                        ),
                        newNote
                      ],
                      lastUpdate:
                        "Actualizado ahora"
                    }
                  : dispute
            )
        })
      );

      setSelectedDispute(
        (currentDispute) =>
          currentDispute?.id ===
          disputeId
            ? {
                ...currentDispute,
                internalNotes: [
                  ...(
                    currentDispute.internalNotes ||
                    []
                  ),
                  newNote
                ],
                lastUpdate:
                  "Actualizado ahora"
              }
            : currentDispute
      );
    } catch (noteError) {
      window.alert(
        noteError.message
      );
    } finally {
      setIsSaving(false);
    }
  }

  const kpis = buildKpis(
    dashboardData?.kpis
  );

  if (loading) {
    return (
      <div className="disputes-loading">
        <style>
          {baseStyles}
        </style>

        <div className="disputes-loader" />

        <h2>
          Cargando Dashboard de
          Disputas...
        </h2>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="disputes-loading">
        <style>
          {baseStyles}
        </style>

        <h2>
          No se pudo cargar Disputas
        </h2>

        <p>{error}</p>

        <button
          type="button"
          className="disputes-button disputes-button-primary"
          onClick={loadDashboard}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="disputes-page">
      <style>
        {baseStyles}
      </style>

      <div className="disputes-container">
        <header className="disputes-header">
          <div>
            <p className="disputes-eyebrow">
              Investigación y resolución
            </p>

            <h1 className="disputes-title">
              Dashboard de Disputas
            </h1>

            <p className="disputes-subtitle">
              Investiga reclamaciones,
              revisa evidencias, protege
              fondos en escrow y resuelve
              casos entre compradores y
              vendedores.
            </p>
          </div>

          <div className="disputes-header-actions">
            <button
              type="button"
              className="disputes-button"
              onClick={() =>
                navigate(
                  "/admin/select-area"
                )
              }
            >
              ← Todas las áreas
            </button>

            <button
              type="button"
              className="disputes-button"
              onClick={
                loadDashboard
              }
            >
              ↻ Actualizar
            </button>

            <button
              type="button"
              className="disputes-button disputes-button-primary"
              onClick={() =>
                window.alert(
                  "La apertura administrativa quedará conectada al endpoint POST /api/admin/disputes."
                )
              }
            >
              + Abrir caso
            </button>
          </div>
        </header>

        {error && (
          <div className="disputes-demo-banner">
            <strong>
              Información:
            </strong>{" "}
            {error}
          </div>
        )}

        <section className="disputes-kpis">
          {kpis.map((kpi) => (
            <article
              key={kpi.title}
              className="disputes-card disputes-kpi"
            >
              <div className="disputes-kpi-icon">
                {kpi.icon}
              </div>

              <p className="disputes-kpi-title">
                {kpi.title}
              </p>

              <p className="disputes-kpi-value">
                {kpi.value}
              </p>

              <p className="disputes-kpi-detail">
                {kpi.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="disputes-main-grid">
          <article className="disputes-card disputes-section">
            <div className="disputes-section-header">
              <div>
                <h2 className="disputes-section-title">
                  Cola de investigación
                </h2>

                <p className="disputes-section-description">
                  Casos que requieren
                  revisión, respuesta o
                  decisión administrativa.
                </p>
              </div>

              <button
                type="button"
                className="disputes-button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter(
                    "ALL"
                  );
                  setPriorityFilter(
                    "ALL"
                  );
                }}
              >
                Limpiar filtros
              </button>
            </div>

            <div className="disputes-toolbar">
              <input
                className="disputes-input"
                type="search"
                placeholder="Buscar caso, orden, producto, comprador, vendedor o agente..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />

              <select
                className="disputes-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  Todos los estados
                </option>

                {Object.entries(
                  DISPUTE_STATUS
                ).map(
                  ([
                    value,
                    label
                  ]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>

              <select
                className="disputes-select"
                value={
                  priorityFilter
                }
                onChange={(event) =>
                  setPriorityFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  Todas las prioridades
                </option>

                <option value="CRITICAL">
                  Crítica
                </option>

                <option value="HIGH">
                  Alta
                </option>

                <option value="MEDIUM">
                  Media
                </option>

                <option value="NORMAL">
                  Normal
                </option>
              </select>
            </div>

            <div className="disputes-table-wrapper">
              <table className="disputes-table">
                <thead>
                  <tr>
                    <th>
                      Caso / orden
                    </th>

                    <th>
                      Producto
                    </th>

                    <th>
                      Comprador
                    </th>

                    <th>
                      Vendedor
                    </th>

                    <th>
                      Agente
                    </th>

                    <th>
                      Monto
                    </th>

                    <th>
                      SLA
                    </th>

                    <th>
                      Prioridad
                    </th>

                    <th>
                      Estado
                    </th>

                    <th>
                      Acción
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDisputes.map(
                    (dispute) => (
                      <tr
                        key={
                          dispute.id
                        }
                        onClick={() =>
                          setSelectedDispute(
                            dispute
                          )
                        }
                      >
                        <td>
                          <strong className="disputes-primary-text">
                            {
                              dispute.id
                            }
                          </strong>

                          <span className="disputes-muted">
                            Orden{" "}
                            {
                              dispute.orderId
                            }
                          </span>
                        </td>

                        <td>
                          <strong>
                            {
                              dispute.product
                                ?.name
                            }
                          </strong>

                          <span className="disputes-muted">
                            {
                              dispute.product
                                ?.serial
                            }
                          </span>
                        </td>

                        <td>
                          {
                            dispute.buyer
                              ?.name
                          }

                          <span className="disputes-muted">
                            Trust Score:{" "}
                            {
                              dispute.buyer
                                ?.trustScore
                            }
                          </span>
                        </td>

                        <td>
                          {
                            dispute.seller
                              ?.name
                          }

                          <span className="disputes-muted">
                            Trust Score:{" "}
                            {
                              dispute.seller
                                ?.trustScore
                            }
                          </span>
                        </td>

                        <td>
                          {dispute
                            .assignedAgent
                            ?.name ||
                            "Sin asignar"}
                        </td>

                        <td>
                          {formatCurrency(
                            dispute.amount,
                            dispute.currency
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              getDeadlineClass(
                                dispute.deadline
                              )
                            }
                          >
                            {
                              dispute.deadline
                            }
                          </span>
                        </td>

                        <td>
                          <PriorityBadge
                            priority={
                              dispute.priority
                            }
                          />
                        </td>

                        <td>
                          <StatusBadge
                            status={
                              dispute.status
                            }
                          />
                        </td>

                        <td>
                          <button
                            type="button"
                            className="disputes-button disputes-button-small"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              setSelectedDispute(
                                dispute
                              );
                            }}
                          >
                            Investigar
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>

              {filteredDisputes.length ===
                0 && (
                <div className="disputes-empty">
                  No se encontraron
                  disputas con esos
                  filtros.
                </div>
              )}
            </div>

            <div className="disputes-progress">
              <div className="disputes-progress-row">
                <span>
                  Casos resueltos
                </span>

                <strong>
                  {
                    dashboardData.kpis
                      .resolutionRate
                  }
                  %
                </strong>
              </div>

              <div className="disputes-progress-track">
                <div
                  className="disputes-progress-value"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        dashboardData
                          .kpis
                          .resolutionRate
                      )
                    )}%`
                  }}
                />
              </div>
            </div>
          </article>

          <aside className="disputes-side-column">
            <article className="disputes-card disputes-section">
              <div className="disputes-section-header">
                <div>
                  <h2 className="disputes-section-title">
                    Alertas críticas
                  </h2>

                  <p className="disputes-section-description">
                    Casos que necesitan
                    intervención inmediata.
                  </p>
                </div>
              </div>

              {dashboardData.alerts.map(
                (alert) => (
                  <div
                    key={alert.id}
                    className="disputes-alert"
                  >
                    <div className="disputes-alert-icon">
                      ⚠️
                    </div>

                    <div>
                      <p className="disputes-alert-title">
                        {
                          alert.title
                        }
                      </p>

                      <p className="disputes-alert-description">
                        {
                          alert.description
                        }
                      </p>

                      <SeverityBadge
                        severity={
                          alert.severity
                        }
                      />
                    </div>
                  </div>
                )
              )}
            </article>

            <article className="disputes-card disputes-section">
              <div className="disputes-section-header">
                <div>
                  <h2 className="disputes-section-title">
                    Agentes
                  </h2>

                  <p className="disputes-section-description">
                    Carga de trabajo y
                    rendimiento.
                  </p>
                </div>
              </div>

              {dashboardData.agents.map(
                (agent) => (
                  <div
                    key={agent.id}
                    className="disputes-agent"
                  >
                    <div className="disputes-agent-avatar">
                      {getInitials(
                        agent.name
                      )}
                    </div>

                    <div className="disputes-agent-info">
                      <strong>
                        {agent.name}
                      </strong>

                      <span>
                        {
                          agent.activeCases
                        }{" "}
                        casos activos
                      </span>
                    </div>

                    <div className="disputes-agent-performance">
                      <strong>
                        {
                          agent.resolutionRate
                        }
                        %
                      </strong>

                      <span>
                        {
                          agent.resolvedToday
                        }{" "}
                        resueltos hoy
                      </span>
                    </div>
                  </div>
                )
              )}
            </article>

            <article className="disputes-card disputes-section">
              <div className="disputes-section-header">
                <div>
                  <h2 className="disputes-section-title">
                    Actividad reciente
                  </h2>
                </div>
              </div>

              {dashboardData.recentActivity.map(
                (item) => (
                  <div
                    key={item.id}
                    className="disputes-activity"
                  >
                    <div className="disputes-activity-icon">
                      {item.icon}
                    </div>

                    <div>
                      <p className="disputes-alert-title">
                        {
                          item.title
                        }
                      </p>

                      <p className="disputes-alert-description">
                        {
                          item.description
                        }
                      </p>

                      <span className="disputes-activity-time">
                        {item.time}
                      </span>
                    </div>
                  </div>
                )
              )}
            </article>
          </aside>
        </section>
      </div>

      {selectedDispute && (
        <DisputeModal
          dispute={
            selectedDispute
          }
          agents={
            dashboardData.agents
          }
          isSaving={
            isSaving
          }
          onClose={() =>
            setSelectedDispute(null)
          }
          onAssignAgent={
            assignAgent
          }
          onUpdateStatus={
            updateDisputeStatus
          }
          onAddInternalNote={
            addInternalNote
          }
        />
      )}
    </div>
  );
}

function DisputeModal({
  dispute,
  agents,
  isSaving,
  onClose,
  onAssignAgent,
  onUpdateStatus,
  onAddInternalNote
}) {
  const [
    activeTab,
    setActiveTab
  ] = useState(
    "SUMMARY"
  );

  const [
    selectedAgentId,
    setSelectedAgentId
  ] = useState(
    dispute.assignedAgent?.id ||
      ""
  );

  const [
    internalNote,
    setInternalNote
  ] = useState("");

  const selectedAgent =
    agents.find(
      (agent) =>
        agent.id ===
        selectedAgentId
    );

  const submitInternalNote =
    async () => {
      const note =
        internalNote.trim();

      if (!note) {
        return;
      }

      await onAddInternalNote(
        dispute.id,
        note
      );

      setInternalNote("");
    };

  return (
    <div
      className="disputes-modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="disputes-modal">
        <div className="disputes-modal-header">
          <div>
            <p className="disputes-eyebrow">
              Centro de investigación
            </p>

            <h2 className="disputes-modal-title">
              {dispute.id}
            </h2>

            <p className="disputes-section-description">
              Orden {dispute.orderId} ·{" "}
              {dispute.product?.name}
            </p>
          </div>

          <div className="disputes-modal-header-status">
            <PriorityBadge
              priority={
                dispute.priority
              }
            />

            <StatusBadge
              status={
                dispute.status
              }
            />

            <button
              type="button"
              className="disputes-button"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="disputes-tabs">
          {[
            {
              id: "SUMMARY",
              label: "Resumen"
            },
            {
              id: "EVIDENCE",
              label: `Evidencias (${dispute.evidenceCount || 0})`
            },
            {
              id: "MESSAGES",
              label: `Mensajes (${dispute.unreadMessages || 0})`
            },
            {
              id: "TIMELINE",
              label: "Cronología"
            },
            {
              id: "NOTES",
              label: "Notas internas"
            }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`disputes-tab ${
                activeTab === tab.id
                  ? "disputes-tab-active"
                  : ""
              }`}
              onClick={() =>
                setActiveTab(
                  tab.id
                )
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="disputes-modal-content">
          {activeTab ===
            "SUMMARY" && (
            <>
              <div className="disputes-detail-grid">
                <Detail
                  label="Producto"
                  value={
                    dispute.product
                      ?.name
                  }
                />

                <Detail
                  label="Serial / IMEI"
                  value={
                    dispute.product
                      ?.serial
                  }
                />

                <Detail
                  label="Monto retenido"
                  value={formatCurrency(
                    dispute.amount,
                    dispute.currency
                  )}
                />

                <Detail
                  label="Estado del escrow"
                  value={
                    dispute.escrowStatus
                  }
                />

                <Detail
                  label="Categoría"
                  value={formatCategory(
                    dispute.category
                  )}
                />

                <Detail
                  label="Tiempo restante"
                  value={
                    dispute.deadline
                  }
                />
              </div>

              <div className="disputes-reason-box">
                <span>
                  Motivo de la disputa
                </span>

                <p>
                  {dispute.reason}
                </p>
              </div>

              <div className="disputes-parties-grid">
                <PartyCard
                  title="Comprador"
                  user={
                    dispute.buyer
                  }
                  type="BUYER"
                />

                <PartyCard
                  title="Vendedor"
                  user={
                    dispute.seller
                  }
                  type="SELLER"
                />
              </div>

              <div className="disputes-ai-panel">
                <div className="disputes-ai-header">
                  <div className="disputes-ai-icon">
                    ✦
                  </div>

                  <div>
                    <h3>
                      Asistencia de IA
                    </h3>

                    <p>
                      Recomendación preliminar
                      basada en los datos
                      disponibles.
                    </p>
                  </div>
                </div>

                <div className="disputes-ai-result">
                  <strong>
                    Requiere revisión
                    humana
                  </strong>

                  <p>
                    La IA detectó diferencias
                    entre el Trust Score de
                    ambas partes y múltiples
                    disputas anteriores del
                    vendedor. Deben revisarse
                    las evidencias del almacén,
                    el chat y el historial del
                    producto antes de tomar una
                    decisión.
                  </p>

                  <div className="disputes-ai-confidence">
                    <span>
                      Confianza preliminar
                    </span>

                    <strong>
                      78 %
                    </strong>
                  </div>
                </div>
              </div>

              <div className="disputes-assignment-box">
                <h3>
                  Agente responsable
                </h3>

                <div className="disputes-assignment-row">
                  <select
                    className="disputes-select"
                    value={
                      selectedAgentId
                    }
                    onChange={(event) =>
                      setSelectedAgentId(
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      Selecciona un agente
                    </option>

                    {agents.map(
                      (agent) => (
                        <option
                          key={agent.id}
                          value={agent.id}
                        >
                          {agent.name} —{" "}
                          {
                            agent.activeCases
                          }{" "}
                          casos
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="button"
                    className="disputes-button disputes-button-primary"
                    disabled={
                      !selectedAgent ||
                      isSaving
                    }
                    onClick={() =>
                      onAssignAgent(
                        dispute.id,
                        selectedAgent
                      )
                    }
                  >
                    Asignar
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab ===
            "EVIDENCE" && (
            <EvidencePanel
              dispute={dispute}
            />
          )}

          {activeTab ===
            "MESSAGES" && (
            <MessagesPanel
              dispute={dispute}
            />
          )}

          {activeTab ===
            "TIMELINE" && (
            <TimelinePanel
              dispute={dispute}
            />
          )}

          {activeTab ===
            "NOTES" && (
            <NotesPanel
              dispute={dispute}
              note={
                internalNote
              }
              setNote={
                setInternalNote
              }
              isSaving={
                isSaving
              }
              onSubmit={
                submitInternalNote
              }
            />
          )}
        </div>

        <div className="disputes-modal-actions">
          <button
            type="button"
            className="disputes-button disputes-button-primary"
            disabled={isSaving}
            onClick={() =>
              onUpdateStatus(
                dispute.id,
                "UNDER_REVIEW"
              )
            }
          >
            Iniciar investigación
          </button>

          <button
            type="button"
            className="disputes-button disputes-button-warning"
            disabled={isSaving}
            onClick={() =>
              onUpdateStatus(
                dispute.id,
                "WAITING_BUYER"
              )
            }
          >
            Solicitar al comprador
          </button>

          <button
            type="button"
            className="disputes-button disputes-button-warning"
            disabled={isSaving}
            onClick={() =>
              onUpdateStatus(
                dispute.id,
                "WAITING_SELLER"
              )
            }
          >
            Solicitar al vendedor
          </button>

          <button
            type="button"
            className="disputes-button disputes-button-escalate"
            disabled={isSaving}
            onClick={() =>
              onUpdateStatus(
                dispute.id,
                "ESCALATED"
              )
            }
          >
            Escalar caso
          </button>

          <button
            type="button"
            className="disputes-button disputes-button-success"
            disabled={isSaving}
            onClick={() =>
              onUpdateStatus(
                dispute.id,
                "RESOLVED_SELLER",
                "RELEASE_TO_SELLER"
              )
            }
          >
            Liberar al vendedor
          </button>

          <button
            type="button"
            className="disputes-button disputes-button-danger"
            disabled={isSaving}
            onClick={() =>
              onUpdateStatus(
                dispute.id,
                "REFUNDED",
                "REFUND_BUYER"
              )
            }
          >
            Reembolsar comprador
          </button>

          <button
            type="button"
            className="disputes-button"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function EvidencePanel({
  dispute
}) {
  const evidence = [
    {
      id: "EVD-001",
      title:
        "Fotografías del comprador",
      description:
        "Tres imágenes del estado del producto recibido.",
      type: "IMAGE",
      author:
        dispute.buyer?.name,
      date: "Hace 35 minutos"
    },
    {
      id: "EVD-002",
      title:
        "Inspección de almacén",
      description:
        "Reporte técnico y fotografías tomadas antes del despacho.",
      type: "REPORT",
      author:
        "Almacén QSM",
      date: "Hace 1 día"
    },
    {
      id: "EVD-003",
      title:
        "Publicación original",
      description:
        "Descripción, precio y condición declarada por el vendedor.",
      type: "PRODUCT",
      author:
        dispute.seller?.name,
      date: "Hace 4 días"
    },
    {
      id: "EVD-004",
      title:
        "Confirmación de Delivery",
      description:
        "Entrega confirmada mediante PIN y registro de cadena de custodia.",
      type: "DELIVERY",
      author:
        "Delivery QSM",
      date: "Hace 8 horas"
    }
  ];

  return (
    <div>
      <div className="disputes-panel-heading">
        <div>
          <h3>
            Evidencias del caso
          </h3>

          <p>
            Documentos, fotografías y
            registros asociados a la
            disputa.
          </p>
        </div>

        <button
          type="button"
          className="disputes-button disputes-button-primary"
          onClick={() =>
            window.alert(
              "La carga de evidencias se conectará al endpoint POST /api/admin/disputes/:id/evidence."
            )
          }
        >
          + Agregar evidencia
        </button>
      </div>

      <div className="disputes-evidence-grid">
        {evidence.map(
          (item) => (
            <article
              key={item.id}
              className="disputes-evidence-card"
            >
              <div className="disputes-evidence-icon">
                {getEvidenceIcon(
                  item.type
                )}
              </div>

              <div>
                <strong>
                  {item.title}
                </strong>

                <p>
                  {
                    item.description
                  }
                </p>

                <span>
                  {item.author} ·{" "}
                  {item.date}
                </span>
              </div>

              <button
                type="button"
                className="disputes-button disputes-button-small"
                onClick={() =>
                  window.alert(
                    `Abriendo evidencia ${item.id}`
                  )
                }
              >
                Revisar
              </button>
            </article>
          )
        )}
      </div>
    </div>
  );
}

function MessagesPanel({
  dispute
}) {
  const messages = [
    {
      id: "MSG-001",
      author:
        dispute.buyer?.name,
      role: "Comprador",
      message:
        "El producto llegó con rayones que no aparecían en la publicación.",
      time: "Hace 50 minutos"
    },
    {
      id: "MSG-002",
      author:
        dispute.seller?.name,
      role: "Vendedor",
      message:
        "El producto fue entregado al almacén sin esos daños.",
      time: "Hace 42 minutos"
    },
    {
      id: "MSG-003",
      author:
        "Sistema QSM",
      role: "Sistema",
      message:
        "Los fondos de la orden fueron retenidos automáticamente.",
      time: "Hace 40 minutos"
    }
  ];

  return (
    <div>
      <div className="disputes-panel-heading">
        <div>
          <h3>
            Conversación del caso
          </h3>

          <p>
            Mensajes relacionados con
            la disputa y comunicaciones
            del sistema.
          </p>
        </div>
      </div>

      <div className="disputes-messages">
        {messages.map(
          (message) => (
            <article
              key={message.id}
              className="disputes-message"
            >
              <div className="disputes-message-avatar">
                {getInitials(
                  message.author
                )}
              </div>

              <div>
                <div className="disputes-message-header">
                  <strong>
                    {
                      message.author
                    }
                  </strong>

                  <span>
                    {message.role} ·{" "}
                    {message.time}
                  </span>
                </div>

                <p>
                  {message.message}
                </p>
              </div>
            </article>
          )
        )}
      </div>

      <div className="disputes-message-composer">
        <textarea
          placeholder="Escribir mensaje para las partes..."
        />

        <button
          type="button"
          className="disputes-button disputes-button-primary"
          onClick={() =>
            window.alert(
              "El envío de mensajes se conectará con Messenger y el endpoint de disputas."
            )
          }
        >
          Enviar mensaje
        </button>
      </div>
    </div>
  );
}

function TimelinePanel({
  dispute
}) {
  const timeline = [
    {
      title:
        "Disputa abierta",
      description:
        `${dispute.buyer?.name} abrió la reclamación.`,
      time:
        dispute.lastUpdate,
      active: true
    },
    {
      title:
        "Fondos retenidos",
      description:
        "El escrow fue colocado en estado HELD.",
      time:
        "Automático",
      active: true
    },
    {
      title:
        "Evidencias recibidas",
      description:
        `${dispute.evidenceCount || 0} evidencias asociadas al caso.`,
      time:
        "Actualizado",
      active:
        dispute.evidenceCount > 0
    },
    {
      title:
        "Agente asignado",
      description:
        dispute.assignedAgent
          ?.name ||
        "Todavía no existe un agente asignado.",
      time:
        dispute.assignedAgent
          ? "Completado"
          : "Pendiente",
      active:
        Boolean(
          dispute.assignedAgent
        )
    },
    {
      title:
        "Resolución",
      description:
        getResolutionDescription(
          dispute.status
        ),
      time:
        isResolvedStatus(
          dispute.status
        )
          ? "Completado"
          : "Pendiente",
      active:
        isResolvedStatus(
          dispute.status
        )
    }
  ];

  return (
    <div>
      <div className="disputes-panel-heading">
        <div>
          <h3>
            Cronología del caso
          </h3>

          <p>
            Registro de las acciones
            realizadas durante la
            investigación.
          </p>
        </div>
      </div>

      <div className="disputes-timeline">
        {timeline.map(
          (
            item,
            index
          ) => (
            <div
              key={`${item.title}-${index}`}
              className={`disputes-timeline-item ${
                item.active
                  ? "timeline-active"
                  : ""
              }`}
            >
              <div className="disputes-timeline-dot" />

              <div>
                <strong>
                  {item.title}
                </strong>

                <p>
                  {
                    item.description
                  }
                </p>

                <span>
                  {item.time}
                </span>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function NotesPanel({
  dispute,
  note,
  setNote,
  isSaving,
  onSubmit
}) {
  const notes =
    dispute.internalNotes || [];

  return (
    <div>
      <div className="disputes-panel-heading">
        <div>
          <h3>
            Notas internas
          </h3>

          <p>
            Estas observaciones solo
            son visibles para el
            personal administrativo.
          </p>
        </div>
      </div>

      <div className="disputes-notes-list">
        {notes.length === 0 ? (
          <div className="disputes-empty-panel">
            Todavía no hay notas
            internas.
          </div>
        ) : (
          notes.map(
            (item) => (
              <article
                key={item.id}
                className="disputes-note"
              >
                <strong>
                  {item.author}
                </strong>

                <p>
                  {item.message}
                </p>

                <span>
                  {formatDateTime(
                    item.createdAt
                  )}
                </span>
              </article>
            )
          )
        )}
      </div>

      <div className="disputes-note-composer">
        <textarea
          value={note}
          onChange={(event) =>
            setNote(
              event.target.value
            )
          }
          placeholder="Escribe una nota interna sobre la investigación..."
        />

        <button
          type="button"
          className="disputes-button disputes-button-primary"
          disabled={
            !note.trim() ||
            isSaving
          }
          onClick={onSubmit}
        >
          Guardar nota
        </button>
      </div>
    </div>
  );
}

function PartyCard({
  title,
  user,
  type
}) {
  const score =
    Number(
      user?.trustScore
    ) || 0;

  return (
    <article className="disputes-party-card">
      <div className="disputes-party-header">
        <div className="disputes-party-avatar">
          {getInitials(
            user?.name
          )}
        </div>

        <div>
          <span>
            {title}
          </span>

          <strong>
            {user?.name}
          </strong>
        </div>
      </div>

      <div className="disputes-party-metrics">
        <div>
          <span>
            Trust Score
          </span>

          <strong
            className={
              getTrustScoreClass(
                score
              )
            }
          >
            {score}/100
          </strong>
        </div>

        <div>
          <span>
            Disputas
          </span>

          <strong>
            {
              user?.disputes ||
              0
            }
          </strong>
        </div>
      </div>

      <div className="disputes-trust-track">
        <div
          className={`disputes-trust-value ${getTrustScoreClass(
            score
          )}`}
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                score
              )
            )}%`
          }}
        />
      </div>

      <button
        type="button"
        className="disputes-button disputes-button-full"
        onClick={() =>
          window.alert(
            `Abriendo perfil de ${type === "BUYER" ? "comprador" : "vendedor"}: ${user?.id}`
          )
        }
      >
        Ver perfil completo
      </button>
    </article>
  );
}

function normalizeDashboardResponse(
  response
) {
  const source =
    response?.data || response;

  return {
    generatedAt:
      source.generatedAt ||
      new Date().toISOString(),

    kpis: {
      open:
        Number(
          source.kpis?.open
        ) || 0,

      underReview:
        Number(
          source.kpis
            ?.underReview
        ) || 0,

      waitingResponse:
        Number(
          source.kpis
            ?.waitingResponse
        ) || 0,

      escalated:
        Number(
          source.kpis
            ?.escalated
        ) || 0,

      resolvedToday:
        Number(
          source.kpis
            ?.resolvedToday
        ) || 0,

      refundedToday:
        Number(
          source.kpis
            ?.refundedToday
        ) || 0,

      critical:
        Number(
          source.kpis
            ?.critical
        ) || 0,

      resolutionRate:
        Number(
          source.kpis
            ?.resolutionRate
        ) || 0
    },

    disputes:
      Array.isArray(
        source.disputes
      )
        ? source.disputes
        : [],

    agents:
      Array.isArray(
        source.agents
      )
        ? source.agents
        : [],

    alerts:
      Array.isArray(
        source.alerts
      )
        ? source.alerts
        : [],

    recentActivity:
      Array.isArray(
        source.recentActivity
      )
        ? source.recentActivity
        : []
  };
}

function buildKpis(
  kpis = {}
) {
  return [
    {
      title:
        "Disputas abiertas",
      value:
        kpis.open || 0,
      detail:
        "Esperando revisión",
      icon: "⚖️"
    },
    {
      title:
        "En investigación",
      value:
        kpis.underReview || 0,
      detail:
        "Con agente asignado",
      icon: "🔍"
    },
    {
      title:
        "Esperando respuesta",
      value:
        kpis.waitingResponse || 0,
      detail:
        "Comprador o vendedor",
      icon: "💬"
    },
    {
      title:
        "Casos escalados",
      value:
        kpis.escalated || 0,
      detail:
        "Requieren gerente",
      icon: "🚨"
    },
    {
      title:
        "Resueltas hoy",
      value:
        kpis.resolvedToday || 0,
      detail:
        "Casos completados",
      icon: "✅"
    },
    {
      title:
        "Casos críticos",
      value:
        kpis.critical || 0,
      detail:
        "SLA próximo a vencer",
      icon: "⏱️"
    }
  ];
}

function StatusBadge({
  status
}) {
  const classNames = {
    OPEN:
      "badge-open",
    UNDER_REVIEW:
      "badge-review",
    WAITING_BUYER:
      "badge-waiting",
    WAITING_SELLER:
      "badge-waiting",
    ESCALATED:
      "badge-escalated",
    RESOLVED_BUYER:
      "badge-resolved",
    RESOLVED_SELLER:
      "badge-resolved",
    REFUNDED:
      "badge-refunded",
    CLOSED:
      "badge-closed"
  };

  return (
    <span
      className={`disputes-badge ${
        classNames[status] ||
        "badge-open"
      }`}
    >
      {DISPUTE_STATUS[status] ||
        status}
    </span>
  );
}

function PriorityBadge({
  priority
}) {
  const labels = {
    CRITICAL: "CRÍTICA",
    HIGH: "ALTA",
    MEDIUM: "MEDIA",
    NORMAL: "NORMAL"
  };

  return (
    <span
      className={`disputes-priority priority-${priority}`}
    >
      {labels[priority] ||
        priority}
    </span>
  );
}

function SeverityBadge({
  severity
}) {
  return (
    <span
      className={`disputes-badge severity-${severity}`}
    >
      {severity}
    </span>
  );
}

function Detail({
  label,
  value
}) {
  return (
    <div className="disputes-detail">
      <span>
        {label}
      </span>

      <strong>
        {value || "No disponible"}
      </strong>
    </div>
  );
}

function formatCurrency(
  amount,
  currency = "RD$"
) {
  const numericAmount =
    Number(amount) || 0;

  return `${currency} ${numericAmount.toLocaleString(
    "es-DO"
  )}`;
}

function formatCategory(
  category
) {
  const labels = {
    PRODUCT_NOT_AS_DESCRIBED:
      "Producto diferente a la descripción",

    MISSING_ACCESSORIES:
      "Accesorios faltantes",

    DELIVERY_DAMAGE:
      "Daño durante la entrega",

    DEVICE_LOCKED:
      "Dispositivo bloqueado",

    NO_LONGER_NEEDED:
      "Comprador ya no lo necesita",

    COUNTERFEIT:
      "Producto falsificado",

    SERIAL_MISMATCH:
      "Serial o IMEI no coincide",

    NOT_RECEIVED:
      "Producto no recibido"
  };

  return (
    labels[category] ||
    String(category || "")
      .replaceAll("_", " ")
  );
}

function getEscrowStatusForResolution(
  status
) {
  if (
    status === "REFUNDED" ||
    status ===
      "RESOLVED_BUYER"
  ) {
    return "REFUNDED";
  }

  if (
    status ===
      "RESOLVED_SELLER" ||
    status === "CLOSED"
  ) {
    return "RELEASED";
  }

  return "HELD";
}

function getDeadlineClass(
  deadline
) {
  const value =
    String(deadline || "")
      .toLowerCase();

  if (
    value.includes(
      "completado"
    )
  ) {
    return "disputes-deadline-completed";
  }

  const firstNumber =
    Number.parseInt(
      value,
      10
    );

  if (
    Number.isFinite(
      firstNumber
    ) &&
    firstNumber <= 1
  ) {
    return "disputes-deadline-critical";
  }

  return "disputes-deadline";
}

function getResolutionDescription(
  status
) {
  const descriptions = {
    RESOLVED_BUYER:
      "El caso fue resuelto a favor del comprador.",

    RESOLVED_SELLER:
      "El caso fue resuelto a favor del vendedor.",

    REFUNDED:
      "Los fondos fueron reembolsados al comprador.",

    CLOSED:
      "La disputa fue cerrada."
  };

  return (
    descriptions[status] ||
    "La disputa todavía no tiene una resolución final."
  );
}

function isResolvedStatus(
  status
) {
  return [
    "RESOLVED_BUYER",
    "RESOLVED_SELLER",
    "REFUNDED",
    "CLOSED"
  ].includes(status);
}

function getEvidenceIcon(
  type
) {
  const icons = {
    IMAGE: "🖼️",
    REPORT: "📋",
    PRODUCT: "📱",
    DELIVERY: "🚚",
    MESSAGE: "💬",
    VIDEO: "🎥",
    FILE: "📎"
  };

  return (
    icons[type] ||
    "📎"
  );
}

function getInitials(
  name
) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) =>
      word.charAt(0)
    )
    .join("")
    .toUpperCase();
}

function getTrustScoreClass(
  score
) {
  if (score >= 85) {
    return "trust-high";
  }

  if (score >= 65) {
    return "trust-medium";
  }

  return "trust-low";
}

function formatDateTime(
  value
) {
  if (!value) {
    return "Sin fecha";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "es-DO",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  );
}

const baseStyles = `
  * {
    box-sizing: border-box;
  }

  .disputes-page,
  .disputes-loading {
    min-height: 100vh;
    color: #f7f8ff;
    background:
      radial-gradient(
        circle at top right,
        rgba(117, 77, 255, 0.16),
        transparent 30%
      ),
      radial-gradient(
        circle at bottom left,
        rgba(255, 132, 52, 0.07),
        transparent 28%
      ),
      #050818;
    font-family:
      Inter,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  }

  .disputes-page {
    padding: 28px;
  }

  .disputes-loading {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 16px;
    padding: 30px;
    text-align: center;
  }

  .disputes-loader {
    width: 48px;
    height: 48px;
    border: 4px solid #222b4d;
    border-top-color: #ff9e55;
    border-radius: 50%;
    animation:
      disputes-spin
      0.8s
      linear
      infinite;
  }

  @keyframes disputes-spin {
    to {
      transform:
        rotate(360deg);
    }
  }

  .disputes-container {
    width:
      min(
        1650px,
        100%
      );
    margin: 0 auto;
  }

  .disputes-header {
    display: flex;
    align-items: flex-start;
    justify-content:
      space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .disputes-eyebrow {
    margin: 0 0 8px;
    color: #5ed9ff;
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .disputes-title {
    margin: 0;
    font-size:
      clamp(
        30px,
        4vw,
        44px
      );
    line-height: 1.05;
  }

  .disputes-subtitle {
    max-width: 780px;
    margin: 12px 0 0;
    color: #929bbd;
    font-size: 15px;
    line-height: 1.6;
  }

  .disputes-header-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content:
      flex-end;
    gap: 10px;
  }

  .disputes-button {
    min-height: 41px;
    border:
      1px solid
      #252d4d;
    border-radius: 12px;
    padding: 10px 15px;
    color: #eef0ff;
    background: #0d1228;
    font-weight: 750;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .disputes-button:hover:not(:disabled) {
    transform:
      translateY(-1px);
    border-color: #6f5cff;
    background: #151b38;
  }

  .disputes-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .disputes-button-small {
    min-height: 36px;
    padding: 8px 12px;
    font-size: 11px;
  }

  .disputes-button-full {
    width: 100%;
    margin-top: 14px;
  }

  .disputes-button-primary {
    border-color:
      transparent;
    background:
      linear-gradient(
        135deg,
        #665cff,
        #d44edb
      );
  }

  .disputes-button-success {
    border-color:
      rgba(
        51,
        214,
        151,
        0.4
      );
    color: #7df0bd;
    background:
      rgba(
        51,
        214,
        151,
        0.09
      );
  }

  .disputes-button-warning {
    border-color:
      rgba(
        255,
        190,
        68,
        0.42
      );
    color: #ffd56f;
    background:
      rgba(
        255,
        190,
        68,
        0.09
      );
  }

  .disputes-button-danger {
    border-color:
      rgba(
        255,
        88,
        118,
        0.42
      );
    color: #ff8ca0;
    background:
      rgba(
        255,
        88,
        118,
        0.09
      );
  }

  .disputes-button-escalate {
    border-color:
      rgba(
        205,
        111,
        255,
        0.42
      );
    color: #dba0ff;
    background:
      rgba(
        183,
        75,
        255,
        0.1
      );
  }

  .disputes-demo-banner {
    margin-bottom: 18px;
    border:
      1px solid
      rgba(
        255,
        196,
        76,
        0.25
      );
    border-radius: 13px;
    padding: 13px 15px;
    color: #d8c58e;
    background:
      rgba(
        255,
        196,
        76,
        0.07
      );
    font-size: 12px;
  }

  .disputes-kpis {
    display: grid;
    grid-template-columns:
      repeat(
        6,
        minmax(0, 1fr)
      );
    gap: 14px;
    margin-bottom: 18px;
  }

  .disputes-card {
    border:
      1px solid
      #1d2545;
    border-radius: 18px;
    background:
      linear-gradient(
        145deg,
        rgba(
          16,
          21,
          45,
          0.96
        ),
        rgba(
          8,
          12,
          29,
          0.96
        )
      );
    box-shadow:
      0 18px 50px
      rgba(
        0,
        0,
        0,
        0.18
      );
  }

  .disputes-kpi {
    min-height: 145px;
    padding: 18px;
  }

  .disputes-kpi-icon {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border-radius: 13px;
    background: #171d3b;
    font-size: 20px;
  }

  .disputes-kpi-title {
    margin: 15px 0 8px;
    color: #8f98ba;
    font-size: 12px;
    font-weight: 700;
  }

  .disputes-kpi-value {
    margin: 0;
    font-size: 28px;
    font-weight: 850;
  }

  .disputes-kpi-detail {
    margin: 7px 0 0;
    color: #687293;
    font-size: 11px;
  }

  .disputes-main-grid {
    display: grid;
    grid-template-columns:
      minmax(0, 2fr)
      minmax(
        320px,
        0.72fr
      );
    gap: 18px;
  }

  .disputes-section {
    padding: 20px;
  }

  .disputes-section-header,
  .disputes-panel-heading {
    display: flex;
    align-items: center;
    justify-content:
      space-between;
    gap: 15px;
    margin-bottom: 16px;
  }

  .disputes-section-title,
  .disputes-panel-heading h3 {
    margin: 0;
    font-size: 19px;
  }

  .disputes-section-description,
  .disputes-panel-heading p {
    margin: 5px 0 0;
    color: #7781a4;
    font-size: 12px;
  }

  .disputes-toolbar {
    display: grid;
    grid-template-columns:
      minmax(
        280px,
        1fr
      )
      auto
      auto;
    gap: 10px;
    margin-bottom: 16px;
  }

  .disputes-input,
  .disputes-select,
  .disputes-message-composer textarea,
  .disputes-note-composer textarea {
    min-height: 42px;
    border:
      1px solid
      #222b4d;
    border-radius: 11px;
    outline: none;
    color: #f1f3ff;
    background: #080d21;
  }

  .disputes-input {
    width: 100%;
    padding: 0 14px;
  }

  .disputes-select {
    padding: 0 12px;
  }

  .disputes-input:focus,
  .disputes-select:focus,
  .disputes-message-composer textarea:focus,
  .disputes-note-composer textarea:focus {
    border-color: #7768ff;
  }

  .disputes-table-wrapper {
    overflow-x: auto;
    border:
      1px solid
      #171f3d;
    border-radius: 14px;
  }

  .disputes-table {
    width: 100%;
    min-width: 1350px;
    border-collapse:
      collapse;
  }

  .disputes-table th {
    padding: 14px;
    color: #697395;
    background: #080d20;
    font-size: 10px;
    text-align: left;
    text-transform:
      uppercase;
    letter-spacing: 0.06em;
  }

  .disputes-table td {
    padding: 15px 14px;
    border-top:
      1px solid
      #171e39;
    color: #dfe3f8;
    font-size: 12px;
    vertical-align: middle;
  }

  .disputes-table tbody tr {
    cursor: pointer;
    transition: 0.18s ease;
  }

  .disputes-table tbody tr:hover {
    background:
      rgba(
        109,
        93,
        252,
        0.07
      );
  }

  .disputes-primary-text {
    display: block;
    margin-bottom: 5px;
    color: #ffffff;
    font-weight: 850;
  }

  .disputes-muted {
    display: block;
    margin-top: 5px;
    color: #717b9d;
    font-size: 10px;
  }

  .disputes-badge,
  .disputes-priority {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 6px 9px;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .badge-open {
    color: #ffd66d;
    background:
      rgba(
        255,
        191,
        71,
        0.12
      );
  }

  .badge-review {
    color: #a99cff;
    background:
      rgba(
        124,
        97,
        255,
        0.14
      );
  }

  .badge-waiting {
    color: #74dcff;
    background:
      rgba(
        63,
        194,
        255,
        0.13
      );
  }

  .badge-escalated {
    color: #ff8caf;
    background:
      rgba(
        255,
        77,
        130,
        0.13
      );
  }

  .badge-resolved {
    color: #6debb6;
    background:
      rgba(
        48,
        211,
        146,
        0.12
      );
  }

  .badge-refunded {
    color: #70d8ff;
    background:
      rgba(
        65,
        182,
        255,
        0.12
      );
  }

  .badge-closed {
    color: #aab2d0;
    background:
      rgba(
        140,
        148,
        180,
        0.12
      );
  }

  .priority-CRITICAL {
    color: #ff8198;
    background:
      rgba(
        255,
        77,
        109,
        0.12
      );
  }

  .priority-HIGH {
    color: #ffc26b;
    background:
      rgba(
        255,
        177,
        64,
        0.12
      );
  }

  .priority-MEDIUM {
    color: #a99cff;
    background:
      rgba(
        124,
        97,
        255,
        0.14
      );
  }

  .priority-NORMAL {
    color: #6debb6;
    background:
      rgba(
        48,
        211,
        146,
        0.12
      );
  }

  .severity-CRITICAL {
    margin-top: 8px;
    color: #ff8198;
    background:
      rgba(
        255,
        77,
        109,
        0.12
      );
  }

  .severity-HIGH {
    margin-top: 8px;
    color: #ffc36a;
    background:
      rgba(
        255,
        166,
        61,
        0.13
      );
  }

  .severity-MEDIUM {
    margin-top: 8px;
    color: #a99cff;
    background:
      rgba(
        124,
        97,
        255,
        0.14
      );
  }

  .disputes-deadline {
    color: #ffd174;
    font-weight: 800;
  }

  .disputes-deadline-critical {
    color: #ff7d94;
    font-weight: 900;
  }

  .disputes-deadline-completed {
    color: #68eab5;
    font-weight: 800;
  }

  .disputes-side-column {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .disputes-alert,
  .disputes-activity,
  .disputes-agent {
    display: flex;
    gap: 12px;
    padding: 14px 0;
    border-bottom:
      1px solid
      #18203b;
  }

  .disputes-alert:last-child,
  .disputes-activity:last-child,
  .disputes-agent:last-child {
    border-bottom: 0;
  }

  .disputes-alert-icon,
  .disputes-activity-icon,
  .disputes-agent-avatar {
    display: grid;
    flex:
      0 0 40px;
    width: 40px;
    height: 40px;
    place-items: center;
    border-radius: 12px;
    background: #171d38;
  }

  .disputes-agent-avatar,
  .disputes-party-avatar,
  .disputes-message-avatar {
    color: #ffffff;
    background:
      linear-gradient(
        135deg,
        #665cff,
        #d44edb
      );
    font-size: 12px;
    font-weight: 850;
  }

  .disputes-alert-title {
    margin: 0 0 5px;
    font-size: 12px;
    font-weight: 800;
  }

  .disputes-alert-description {
    margin: 0;
    color: #727c9d;
    font-size: 11px;
    line-height: 1.5;
  }

  .disputes-activity-time {
    display: block;
    margin-top: 5px;
    color: #536080;
    font-size: 10px;
  }

  .disputes-agent {
    align-items: center;
  }

  .disputes-agent-info {
    flex: 1;
    min-width: 0;
  }

  .disputes-agent-info strong,
  .disputes-agent-info span,
  .disputes-agent-performance strong,
  .disputes-agent-performance span {
    display: block;
  }

  .disputes-agent-info strong {
    font-size: 12px;
  }

  .disputes-agent-info span,
  .disputes-agent-performance span {
    margin-top: 5px;
    color: #717b9d;
    font-size: 10px;
  }

  .disputes-agent-performance {
    text-align: right;
  }

  .disputes-agent-performance strong {
    color: #79e4bc;
    font-size: 12px;
  }

  .disputes-progress {
    margin-top: 18px;
  }

  .disputes-progress-row {
    display: flex;
    justify-content:
      space-between;
    margin-bottom: 8px;
    color: #919abd;
    font-size: 11px;
  }

  .disputes-progress-track,
  .disputes-trust-track {
    height: 8px;
    overflow: hidden;
    border-radius: 999px;
    background: #151b33;
  }

  .disputes-progress-value {
    height: 100%;
    border-radius: inherit;
    background:
      linear-gradient(
        90deg,
        #5ed9ff,
        #705bff,
        #ec54bd
      );
  }

  .disputes-empty {
    padding: 40px 20px;
    color: #717b9c;
    text-align: center;
  }

  .disputes-modal-backdrop {
    position: fixed;
    z-index: 1000;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 20px;
    background:
      rgba(
        0,
        0,
        0,
        0.76
      );
    backdrop-filter: blur(8px);
  }

  .disputes-modal {
    width:
      min(
        1120px,
        100%
      );
    max-height: 94vh;
    overflow-y: auto;
    border:
      1px solid
      #283158;
    border-radius: 20px;
    background: #090e22;
    box-shadow:
      0 30px 90px
      rgba(
        0,
        0,
        0,
        0.6
      );
  }

  .disputes-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content:
      space-between;
    gap: 20px;
    padding: 22px;
    border-bottom:
      1px solid
      #1c2443;
  }

  .disputes-modal-header-status {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 9px;
  }

  .disputes-modal-title {
    margin: 0;
    font-size: 25px;
  }

  .disputes-tabs {
    display: flex;
    gap: 5px;
    overflow-x: auto;
    padding: 12px 20px;
    border-bottom:
      1px solid
      #1c2443;
    background: #080d20;
  }

  .disputes-tab {
    flex: 0 0 auto;
    border: 0;
    border-radius: 10px;
    padding: 10px 13px;
    color: #7d86a7;
    background: transparent;
    font-weight: 750;
    cursor: pointer;
  }

  .disputes-tab-active {
    color: #ffffff;
    background:
      rgba(
        112,
        91,
        255,
        0.16
      );
  }

  .disputes-modal-content {
    padding: 22px;
  }

  .disputes-detail-grid {
    display: grid;
    grid-template-columns:
      repeat(
        3,
        minmax(0, 1fr)
      );
    gap: 12px;
  }

  .disputes-detail {
    padding: 14px;
    border:
      1px solid
      #1c2545;
    border-radius: 13px;
    background: #0c1229;
  }

  .disputes-detail span,
  .disputes-detail strong {
    display: block;
  }

  .disputes-detail span {
    margin-bottom: 7px;
    color: #6f799b;
    font-size: 10px;
    text-transform:
      uppercase;
  }

  .disputes-detail strong {
    color: #eef1ff;
    font-size: 12px;
  }

  .disputes-reason-box,
  .disputes-ai-panel,
  .disputes-assignment-box,
  .disputes-message-composer,
  .disputes-note-composer {
    margin-top: 18px;
    border:
      1px solid
      #1c2545;
    border-radius: 14px;
    padding: 16px;
    background: #0b1126;
  }

  .disputes-reason-box span {
    display: block;
    margin-bottom: 8px;
    color: #6f799b;
    font-size: 10px;
    text-transform:
      uppercase;
  }

  .disputes-reason-box p {
    margin: 0;
    color: #d6daf0;
    font-size: 13px;
    line-height: 1.65;
  }

  .disputes-parties-grid {
    display: grid;
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
    gap: 14px;
    margin-top: 18px;
  }

  .disputes-party-card {
    border:
      1px solid
      #1c2545;
    border-radius: 14px;
    padding: 16px;
    background: #0b1126;
  }

  .disputes-party-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .disputes-party-avatar,
  .disputes-message-avatar {
    display: grid;
    flex:
      0 0 42px;
    width: 42px;
    height: 42px;
    place-items: center;
    border-radius: 13px;
  }

  .disputes-party-header span,
  .disputes-party-header strong {
    display: block;
  }

  .disputes-party-header span {
    margin-bottom: 4px;
    color: #747e9e;
    font-size: 10px;
    text-transform:
      uppercase;
  }

  .disputes-party-header strong {
    font-size: 14px;
  }

  .disputes-party-metrics {
    display: grid;
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
    gap: 10px;
    margin: 15px 0 11px;
  }

  .disputes-party-metrics div {
    border:
      1px solid
      #1c2545;
    border-radius: 11px;
    padding: 11px;
    background: #080e21;
  }

  .disputes-party-metrics span,
  .disputes-party-metrics strong {
    display: block;
  }

  .disputes-party-metrics span {
    margin-bottom: 6px;
    color: #747e9e;
    font-size: 10px;
  }

  .disputes-party-metrics strong {
    font-size: 14px;
  }

  .disputes-trust-value {
    height: 100%;
    border-radius: inherit;
  }

  .trust-high {
    color: #65e4ae;
    background: #65e4ae;
  }

  .trust-medium {
    color: #ffc76a;
    background: #ffc76a;
  }

  .trust-low {
    color: #ff7790;
    background: #ff7790;
  }

  .disputes-ai-panel {
    border-color:
      rgba(
        114,
        91,
        255,
        0.35
      );
    background:
      linear-gradient(
        145deg,
        rgba(
          108,
          83,
          255,
          0.11
        ),
        rgba(
          12,
          18,
          41,
          0.96
        )
      );
  }

  .disputes-ai-header {
    display: flex;
    align-items: center;
    gap: 13px;
  }

  .disputes-ai-icon {
    display: grid;
    flex:
      0 0 44px;
    width: 44px;
    height: 44px;
    place-items: center;
    border-radius: 14px;
    color: #ffffff;
    background:
      linear-gradient(
        135deg,
        #665cff,
        #d44edb
      );
    font-size: 21px;
  }

  .disputes-ai-header h3,
  .disputes-ai-header p {
    margin: 0;
  }

  .disputes-ai-header h3 {
    font-size: 15px;
  }

  .disputes-ai-header p {
    margin-top: 5px;
    color: #858eae;
    font-size: 11px;
  }

  .disputes-ai-result {
    margin-top: 14px;
    border:
      1px solid
      rgba(
        113,
        91,
        255,
        0.23
      );
    border-radius: 12px;
    padding: 14px;
    background:
      rgba(
        8,
        13,
        32,
        0.58
      );
  }

  .disputes-ai-result > strong {
    color: #d6ceff;
    font-size: 13px;
  }

  .disputes-ai-result p {
    margin: 8px 0 0;
    color: #a5adc7;
    font-size: 12px;
    line-height: 1.6;
  }

  .disputes-ai-confidence {
    display: flex;
    justify-content:
      space-between;
    margin-top: 13px;
    color: #818aa9;
    font-size: 11px;
  }

  .disputes-ai-confidence strong {
    color: #b6a9ff;
  }

  .disputes-assignment-box h3 {
    margin: 0 0 13px;
    font-size: 15px;
  }

  .disputes-assignment-row {
    display: flex;
    gap: 10px;
  }

  .disputes-assignment-row
  .disputes-select {
    flex: 1;
  }

  .disputes-evidence-grid {
    display: grid;
    grid-template-columns:
      repeat(
        2,
        minmax(0, 1fr)
      );
    gap: 12px;
  }

  .disputes-evidence-card {
    display: grid;
    grid-template-columns:
      auto
      minmax(0, 1fr)
      auto;
    align-items: center;
    gap: 13px;
    border:
      1px solid
      #1c2545;
    border-radius: 14px;
    padding: 14px;
    background: #0b1126;
  }

  .disputes-evidence-icon {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border-radius: 12px;
    background: #171d38;
    font-size: 18px;
  }

  .disputes-evidence-card strong,
  .disputes-evidence-card span {
    display: block;
  }

  .disputes-evidence-card strong {
    font-size: 12px;
  }

  .disputes-evidence-card p {
    margin: 6px 0;
    color: #858eac;
    font-size: 11px;
    line-height: 1.5;
  }

  .disputes-evidence-card span {
    color: #5f6989;
    font-size: 10px;
  }

  .disputes-messages {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .disputes-message {
    display: flex;
    gap: 12px;
    border:
      1px solid
      #1c2545;
    border-radius: 14px;
    padding: 14px;
    background: #0b1126;
  }

  .disputes-message > div:last-child {
    flex: 1;
  }

  .disputes-message-header {
    display: flex;
    align-items: center;
    justify-content:
      space-between;
    gap: 12px;
  }

  .disputes-message-header strong {
    font-size: 12px;
  }

  .disputes-message-header span {
    color: #677191;
    font-size: 10px;
  }

  .disputes-message p {
    margin: 8px 0 0;
    color: #c4cae0;
    font-size: 12px;
    line-height: 1.6;
  }

  .disputes-message-composer,
  .disputes-note-composer {
    display: flex;
    gap: 10px;
  }

  .disputes-message-composer textarea,
  .disputes-note-composer textarea {
    flex: 1;
    min-height: 86px;
    resize: vertical;
    padding: 12px;
    font-family: inherit;
  }

  .disputes-timeline {
    border-left:
      1px solid
      #273152;
    margin-left: 8px;
    padding-left: 20px;
  }

  .disputes-timeline-item {
    position: relative;
    padding:
      0 0 22px;
    opacity: 0.45;
  }

  .disputes-timeline-item:last-child {
    padding-bottom: 0;
  }

  .disputes-timeline-item.timeline-active {
    opacity: 1;
  }

  .disputes-timeline-dot {
    position: absolute;
    top: 2px;
    left: -27px;
    width: 12px;
    height: 12px;
    border:
      2px solid
      #596486;
    border-radius: 50%;
    background: #090e22;
  }

  .timeline-active
  .disputes-timeline-dot {
    border-color: #67e3b0;
    background: #67e3b0;
    box-shadow:
      0 0 13px
      rgba(
        103,
        227,
        176,
        0.38
      );
  }

  .disputes-timeline-item strong {
    font-size: 12px;
  }

  .disputes-timeline-item p {
    margin: 6px 0;
    color: #8b94b2;
    font-size: 11px;
  }

  .disputes-timeline-item span {
    color: #616b8b;
    font-size: 10px;
  }

  .disputes-notes-list {
    display: flex;
    flex-direction: column;
    gap: 11px;
  }

  .disputes-note {
    border:
      1px solid
      #1c2545;
    border-radius: 13px;
    padding: 14px;
    background: #0b1126;
  }

  .disputes-note strong {
    font-size: 12px;
  }

  .disputes-note p {
    margin: 8px 0;
    color: #bfc5da;
    font-size: 12px;
    line-height: 1.6;
  }

  .disputes-note span {
    color: #626c8c;
    font-size: 10px;
  }

  .disputes-empty-panel {
    border:
      1px dashed
      #293252;
    border-radius: 13px;
    padding: 30px;
    color: #707a9b;
    text-align: center;
    font-size: 12px;
  }

  .disputes-modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 20px 22px;
    border-top:
      1px solid
      #1c2443;
  }

  @media (
    max-width: 1350px
  ) {
    .disputes-kpis {
      grid-template-columns:
        repeat(
          3,
          minmax(0, 1fr)
        );
    }

    .disputes-main-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (
    max-width: 900px
  ) {
    .disputes-page {
      padding: 18px 12px;
    }

    .disputes-header {
      flex-direction: column;
    }

    .disputes-header-actions {
      justify-content:
        flex-start;
    }

    .disputes-toolbar {
      grid-template-columns: 1fr;
    }

    .disputes-detail-grid,
    .disputes-evidence-grid {
      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );
    }

    .disputes-message-composer,
    .disputes-note-composer,
    .disputes-assignment-row {
      flex-direction: column;
    }
  }

  @media (
    max-width: 620px
  ) {
    .disputes-kpis,
    .disputes-detail-grid,
    .disputes-parties-grid,
    .disputes-evidence-grid {
      grid-template-columns: 1fr;
    }

    .disputes-modal-backdrop {
      padding: 8px;
    }

    .disputes-modal-header {
      flex-direction: column;
    }

    .disputes-modal-header-status {
      justify-content:
        flex-start;
    }

    .disputes-panel-heading {
      align-items:
        flex-start;
      flex-direction: column;
    }

    .disputes-evidence-card {
      grid-template-columns:
        auto
        minmax(0, 1fr);
    }

    .disputes-evidence-card
    .disputes-button {
      grid-column:
        1 / -1;
    }
  }
`;

export default DisputesDashboard;
