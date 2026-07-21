import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const USE_MOCK_DATA =
  String(
    import.meta.env.VITE_USE_MOCK_ADMIN ?? "true"
  ).toLowerCase() === "true";

const TICKET_STATUS = {
  OPEN: "Abierto",
  IN_PROGRESS: "En proceso",
  WAITING_USER: "Esperando usuario",
  ESCALATED: "Escalado",
  RESOLVED: "Resuelto",
  CLOSED: "Cerrado"
};

const TICKET_CATEGORY = {
  ACCOUNT: "Cuenta",
  VERIFICATION: "Verificación",
  ORDER: "Pedido",
  DELIVERY: "Delivery",
  PAYMENT: "Pago",
  DISPUTE: "Disputa",
  PRODUCT: "Producto",
  TECHNICAL: "Problema técnico"
};

const MOCK_DATA = {
  generatedAt: new Date().toISOString(),

  kpis: {
    open: 32,
    inProgress: 18,
    waitingUser: 9,
    escalated: 5,
    resolvedToday: 21,
    critical: 4,
    activeAgents: 8,
    resolutionRate: 89
  },

  tickets: [
    {
      id: "SUP-7008",
      subject: "No puedo completar mi verificación",
      description:
        "El usuario indica que la fotografía frontal de la cédula no carga.",
      category: "VERIFICATION",
      status: "OPEN",
      priority: "HIGH",
      user: {
        id: "USR-1001",
        name: "Carlos Martínez",
        email: "carlos@example.com",
        trustScore: 52
      },
      assignedAgent: null,
      createdAt: new Date().toISOString(),
      lastUpdate: "Hace 8 minutos",
      unreadMessages: 3,
      channel: "CHAT",
      relatedEntity: {
        type: "VERIFICATION",
        id: "KYC-4028"
      }
    },
    {
      id: "SUP-7007",
      subject: "Pedido entregado pero no aparece completado",
      description:
        "El cliente confirmó por PIN, pero la orden sigue en ruta.",
      category: "DELIVERY",
      status: "IN_PROGRESS",
      priority: "HIGH",
      user: {
        id: "USR-1002",
        name: "Ana Rodríguez",
        email: "ana@example.com",
        trustScore: 88
      },
      assignedAgent: {
        id: "AGT-101",
        name: "Laura Méndez"
      },
      createdAt: new Date(
        Date.now() - 1000 * 60 * 35
      ).toISOString(),
      lastUpdate: "Hace 35 minutos",
      unreadMessages: 1,
      channel: "EMAIL",
      relatedEntity: {
        type: "DELIVERY",
        id: "DEL-2047"
      }
    },
    {
      id: "SUP-7006",
      subject: "Reembolso pendiente",
      description:
        "El comprador espera un reembolso aprobado por Disputas.",
      category: "PAYMENT",
      status: "ESCALATED",
      priority: "CRITICAL",
      user: {
        id: "USR-1003",
        name: "Pedro Jiménez",
        email: "pedro@example.com",
        trustScore: 74
      },
      assignedAgent: {
        id: "AGT-102",
        name: "José Ramírez"
      },
      createdAt: new Date(
        Date.now() - 1000 * 60 * 62
      ).toISOString(),
      lastUpdate: "Hace 1 hora",
      unreadMessages: 5,
      channel: "CHAT",
      relatedEntity: {
        type: "DISPUTE",
        id: "DSP-3050"
      }
    },
    {
      id: "SUP-7005",
      subject: "No puedo publicar un producto",
      description:
        "La cuenta está verificada, pero el botón de publicar no aparece.",
      category: "PRODUCT",
      status: "WAITING_USER",
      priority: "MEDIUM",
      user: {
        id: "USR-1004",
        name: "María Pérez",
        email: "maria@example.com",
        trustScore: 82
      },
      assignedAgent: {
        id: "AGT-103",
        name: "Claudia Reyes"
      },
      createdAt: new Date(
        Date.now() - 1000 * 60 * 95
      ).toISOString(),
      lastUpdate: "Hace 1 hora",
      unreadMessages: 0,
      channel: "WEB",
      relatedEntity: {
        type: "USER",
        id: "USR-1004"
      }
    },
    {
      id: "SUP-7004",
      subject: "Error al iniciar sesión",
      description:
        "El usuario reporta bloqueo después de varios intentos.",
      category: "ACCOUNT",
      status: "RESOLVED",
      priority: "NORMAL",
      user: {
        id: "USR-1005",
        name: "Miguel Santos",
        email: "miguel@example.com",
        trustScore: 79
      },
      assignedAgent: {
        id: "AGT-104",
        name: "Ana Gómez"
      },
      createdAt: new Date(
        Date.now() - 1000 * 60 * 180
      ).toISOString(),
      lastUpdate: "Hace 3 horas",
      unreadMessages: 0,
      channel: "EMAIL",
      relatedEntity: {
        type: "SECURITY",
        id: "SEC-8112"
      }
    }
  ],

  agents: [
    {
      id: "AGT-101",
      name: "Laura Méndez",
      activeTickets: 7,
      resolvedToday: 9,
      responseTime: "4 min",
      satisfaction: 96
    },
    {
      id: "AGT-102",
      name: "José Ramírez",
      activeTickets: 10,
      resolvedToday: 7,
      responseTime: "6 min",
      satisfaction: 91
    },
    {
      id: "AGT-103",
      name: "Claudia Reyes",
      activeTickets: 5,
      resolvedToday: 12,
      responseTime: "3 min",
      satisfaction: 98
    },
    {
      id: "AGT-104",
      name: "Ana Gómez",
      activeTickets: 6,
      resolvedToday: 8,
      responseTime: "5 min",
      satisfaction: 95
    }
  ],

  alerts: [
    {
      id: "ALT-001",
      title: "4 tickets críticos",
      description:
        "Requieren atención inmediata.",
      severity: "CRITICAL"
    },
    {
      id: "ALT-002",
      title: "5 casos escalados",
      description:
        "Esperando respuesta de otro departamento.",
      severity: "HIGH"
    },
    {
      id: "ALT-003",
      title: "9 usuarios sin responder",
      description:
        "Tickets detenidos esperando información.",
      severity: "MEDIUM"
    }
  ],

  recentActivity: [
    {
      id: "ACT-001",
      title: "Ticket abierto",
      description:
        "SUP-7008 fue creado desde el chat.",
      time: "Hace 8 minutos",
      icon: "🎫"
    },
    {
      id: "ACT-002",
      title: "Caso escalado",
      description:
        "SUP-7006 fue enviado a Finanzas.",
      time: "Hace 1 hora",
      icon: "🚨"
    },
    {
      id: "ACT-003",
      title: "Ticket resuelto",
      description:
        "SUP-7004 fue cerrado correctamente.",
      time: "Hace 3 horas",
      icon: "✅"
    }
  ]
};

function SupportDashboard() {
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

  const [categoryFilter, setCategoryFilter] =
    useState("ALL");

  const [selectedTicket, setSelectedTicket] =
    useState(null);

  const [isSaving, setIsSaving] =
    useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token =
        localStorage.getItem("qsm_admin_token") ||
        sessionStorage.getItem("qsm_admin_token");

      const response = await fetch(
        `${API_BASE_URL}/admin/support/dashboard`,
        {
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
          `No fue posible cargar Soporte (${response.status}).`
        );
      }

      const result = await response.json();

      setDashboardData(
        normalizeResponse(result)
      );
    } catch (requestError) {
      console.error(
        "Error cargando Soporte:",
        requestError
      );

      if (USE_MOCK_DATA) {
        setDashboardData(MOCK_DATA);

        setError(
          "Modo demostración activo. Preparado para recibir el backend real."
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

  const filteredTickets = useMemo(() => {
    const tickets =
      dashboardData?.tickets || [];

    const normalizedSearch =
      search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesSearch =
        !normalizedSearch ||
        ticket.id
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        ticket.subject
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        ticket.user?.name
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        ticket.user?.email
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        ticket.assignedAgent?.name
          ?.toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        ticket.status === statusFilter;

      const matchesCategory =
        categoryFilter === "ALL" ||
        ticket.category === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [
    dashboardData,
    search,
    statusFilter,
    categoryFilter
  ]);

  async function updateTicket(
    ticketId,
    status,
    extraData = {}
  ) {
    setIsSaving(true);

    try {
      if (!USE_MOCK_DATA) {
        const token =
          localStorage.getItem("qsm_admin_token") ||
          sessionStorage.getItem("qsm_admin_token");

        const response = await fetch(
          `${API_BASE_URL}/admin/support/tickets/${ticketId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: token
                ? `Bearer ${token}`
                : ""
            },
            body: JSON.stringify({
              status,
              ...extraData
            })
          }
        );

        if (!response.ok) {
          throw new Error(
            "No fue posible actualizar el ticket."
          );
        }
      }

      setDashboardData((current) => ({
        ...current,
        tickets: current.tickets.map((ticket) =>
          ticket.id === ticketId
            ? {
                ...ticket,
                status,
                ...extraData,
                lastUpdate: "Actualizado ahora"
              }
            : ticket
        )
      }));

      setSelectedTicket((current) =>
        current?.id === ticketId
          ? {
              ...current,
              status,
              ...extraData,
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

  async function assignAgent(
    ticketId,
    agent
  ) {
    await updateTicket(
      ticketId,
      "IN_PROGRESS",
      {
        assignedAgent: agent
      }
    );
  }

  if (loading) {
    return (
      <div className="support-loading">
        <style>{styles}</style>

        <div className="support-loader" />

        <h2>
          Cargando Dashboard de Soporte...
        </h2>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="support-loading">
        <style>{styles}</style>

        <h2>
          No se pudo cargar Soporte
        </h2>

        <p>{error}</p>

        <button
          className="support-button support-button-primary"
          onClick={loadDashboard}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="support-page">
      <style>{styles}</style>

      <div className="support-container">
        <header className="support-header">
          <div>
            <p className="support-eyebrow">
              Atención al usuario
            </p>

            <h1 className="support-title">
              Dashboard de Soporte
            </h1>

            <p className="support-subtitle">
              Gestiona tickets, conversaciones,
              escalaciones, seguimiento de casos
              y atención a compradores y vendedores.
            </p>
          </div>

          <div className="support-header-actions">
            <button
              className="support-button"
              onClick={() =>
                navigate("/admin/select-area")
              }
            >
              ← Todas las áreas
            </button>

            <button
              className="support-button"
              onClick={loadDashboard}
            >
              ↻ Actualizar
            </button>

            <button
              className="support-button support-button-primary"
              onClick={() =>
                window.alert(
                  "La creación se conectará a POST /api/admin/support/tickets."
                )
              }
            >
              + Nuevo ticket
            </button>
          </div>
        </header>

        {error && (
          <div className="support-demo-banner">
            <strong>Información:</strong>{" "}
            {error}
          </div>
        )}

        <section className="support-kpis">
          {buildKpis(
            dashboardData.kpis
          ).map((kpi) => (
            <article
              key={kpi.title}
              className="support-card support-kpi"
            >
              <div className="support-kpi-icon">
                {kpi.icon}
              </div>

              <p className="support-kpi-title">
                {kpi.title}
              </p>

              <p className="support-kpi-value">
                {kpi.value}
              </p>

              <p className="support-kpi-detail">
                {kpi.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="support-main-grid">
          <article className="support-card support-section">
            <div className="support-section-header">
              <div>
                <h2 className="support-section-title">
                  Cola de tickets
                </h2>

                <p className="support-section-description">
                  Casos pendientes, activos y escalados.
                </p>
              </div>

              <button
                className="support-button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setCategoryFilter("ALL");
                }}
              >
                Limpiar filtros
              </button>
            </div>

            <div className="support-toolbar">
              <input
                className="support-input"
                placeholder="Buscar ticket, usuario, correo, asunto o agente..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              <select
                className="support-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="ALL">
                  Todos los estados
                </option>

                {Object.entries(
                  TICKET_STATUS
                ).map(([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ))}
              </select>

              <select
                className="support-select"
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  Todas las categorías
                </option>

                {Object.entries(
                  TICKET_CATEGORY
                ).map(([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="support-table-wrapper">
              <table className="support-table">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Usuario</th>
                    <th>Asunto</th>
                    <th>Categoría</th>
                    <th>Canal</th>
                    <th>Agente</th>
                    <th>Mensajes</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() =>
                        setSelectedTicket(ticket)
                      }
                    >
                      <td>
                        <strong className="support-primary-text">
                          {ticket.id}
                        </strong>

                        <span className="support-muted">
                          {ticket.lastUpdate}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {ticket.user?.name}
                        </strong>

                        <span className="support-muted">
                          {ticket.user?.email}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {ticket.subject}
                        </strong>

                        <span className="support-muted">
                          {ticket.description}
                        </span>
                      </td>

                      <td>
                        {TICKET_CATEGORY[
                          ticket.category
                        ] || ticket.category}
                      </td>

                      <td>{ticket.channel}</td>

                      <td>
                        {ticket.assignedAgent
                          ?.name ||
                          "Sin asignar"}
                      </td>

                      <td>
                        {ticket.unreadMessages}
                      </td>

                      <td>
                        <PriorityBadge
                          priority={ticket.priority}
                        />
                      </td>

                      <td>
                        <StatusBadge
                          status={ticket.status}
                        />
                      </td>

                      <td>
                        <button
                          className="support-button support-button-small"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedTicket(ticket);
                          }}
                        >
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="support-progress">
              <div className="support-progress-row">
                <span>
                  Tasa de resolución
                </span>

                <strong>
                  {dashboardData.kpis.resolutionRate}%
                </strong>
              </div>

              <div className="support-progress-track">
                <div
                  className="support-progress-value"
                  style={{
                    width: `${dashboardData.kpis.resolutionRate}%`
                  }}
                />
              </div>
            </div>
          </article>

          <aside className="support-side-column">
            <article className="support-card support-section">
              <h2 className="support-section-title">
                Alertas
              </h2>

              {dashboardData.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="support-alert"
                >
                  <div className="support-alert-icon">
                    ⚠️
                  </div>

                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.description}</p>

                    <SeverityBadge
                      severity={alert.severity}
                    />
                  </div>
                </div>
              ))}
            </article>

            <article className="support-card support-section">
              <h2 className="support-section-title">
                Agentes
              </h2>

              {dashboardData.agents.map((agent) => (
                <div
                  key={agent.id}
                  className="support-agent"
                >
                  <div className="support-avatar">
                    {getInitials(agent.name)}
                  </div>

                  <div className="support-agent-info">
                    <strong>{agent.name}</strong>

                    <span>
                      {agent.activeTickets} activos
                    </span>
                  </div>

                  <div className="support-agent-rate">
                    <strong>
                      {agent.satisfaction}%
                    </strong>

                    <span>
                      satisfacción
                    </span>
                  </div>
                </div>
              ))}
            </article>

            <article className="support-card support-section">
              <h2 className="support-section-title">
                Actividad reciente
              </h2>

              {dashboardData.recentActivity.map(
                (activity) => (
                  <div
                    key={activity.id}
                    className="support-activity"
                  >
                    <div className="support-alert-icon">
                      {activity.icon}
                    </div>

                    <div>
                      <strong>
                        {activity.title}
                      </strong>

                      <p>
                        {activity.description}
                      </p>

                      <span>
                        {activity.time}
                      </span>
                    </div>
                  </div>
                )
              )}
            </article>
          </aside>
        </section>
      </div>

      {selectedTicket && (
        <SupportModal
          ticket={selectedTicket}
          agents={dashboardData.agents}
          isSaving={isSaving}
          onClose={() =>
            setSelectedTicket(null)
          }
          onAssignAgent={assignAgent}
          onUpdateTicket={updateTicket}
        />
      )}
    </div>
  );
}

function SupportModal({
  ticket,
  agents,
  isSaving,
  onClose,
  onAssignAgent,
  onUpdateTicket
}) {
  const [selectedAgentId, setSelectedAgentId] =
    useState(
      ticket.assignedAgent?.id || ""
    );

  const [message, setMessage] =
    useState("");

  const selectedAgent =
    agents.find(
      (agent) =>
        agent.id === selectedAgentId
    );

  const messages = [
    {
      id: "MSG-001",
      author: ticket.user?.name,
      role: "Usuario",
      message: ticket.description,
      time: ticket.lastUpdate
    },
    {
      id: "MSG-002",
      author: "Sistema QSM",
      role: "Sistema",
      message:
        "El ticket fue registrado y enviado al área correspondiente.",
      time: "Automático"
    }
  ];

  return (
    <div
      className="support-modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="support-modal">
        <div className="support-modal-header">
          <div>
            <p className="support-eyebrow">
              Gestión de soporte
            </p>

            <h2>{ticket.id}</h2>

            <p>{ticket.subject}</p>
          </div>

          <button
            className="support-button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="support-modal-content">
          <div className="support-detail-grid">
            <Detail
              label="Usuario"
              value={ticket.user?.name}
            />

            <Detail
              label="Correo"
              value={ticket.user?.email}
            />

            <Detail
              label="Trust Score"
              value={`${ticket.user?.trustScore}/100`}
            />

            <Detail
              label="Categoría"
              value={
                TICKET_CATEGORY[
                  ticket.category
                ]
              }
            />

            <Detail
              label="Canal"
              value={ticket.channel}
            />

            <Detail
              label="Relacionado con"
              value={`${ticket.relatedEntity?.type} · ${ticket.relatedEntity?.id}`}
            />
          </div>

          <div className="support-assignment">
            <h3>
              Asignar agente
            </h3>

            <div className="support-assignment-row">
              <select
                className="support-select"
                value={selectedAgentId}
                onChange={(event) =>
                  setSelectedAgentId(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Selecciona un agente
                </option>

                {agents.map((agent) => (
                  <option
                    key={agent.id}
                    value={agent.id}
                  >
                    {agent.name} —{" "}
                    {agent.activeTickets} activos
                  </option>
                ))}
              </select>

              <button
                className="support-button support-button-primary"
                disabled={
                  !selectedAgent ||
                  isSaving
                }
                onClick={() =>
                  onAssignAgent(
                    ticket.id,
                    selectedAgent
                  )
                }
              >
                Asignar
              </button>
            </div>
          </div>

          <div className="support-conversation">
            <h3>
              Conversación
            </h3>

            {messages.map((item) => (
              <div
                key={item.id}
                className="support-message"
              >
                <div className="support-avatar">
                  {getInitials(item.author)}
                </div>

                <div>
                  <div className="support-message-header">
                    <strong>{item.author}</strong>
                    <span>
                      {item.role} · {item.time}
                    </span>
                  </div>

                  <p>{item.message}</p>
                </div>
              </div>
            ))}

            <div className="support-composer">
              <textarea
                placeholder="Escribe una respuesta para el usuario..."
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
              />

              <button
                className="support-button support-button-primary"
                disabled={!message.trim()}
                onClick={() => {
                  window.alert(
                    "El mensaje se conectará con Messenger y POST /api/admin/support/tickets/:id/messages."
                  );

                  setMessage("");
                }}
              >
                Enviar mensaje
              </button>
            </div>
          </div>
        </div>

        <div className="support-modal-actions">
          <button
            className="support-button support-button-primary"
            disabled={isSaving}
            onClick={() =>
              onUpdateTicket(
                ticket.id,
                "IN_PROGRESS"
              )
            }
          >
            Iniciar atención
          </button>

          <button
            className="support-button support-button-warning"
            disabled={isSaving}
            onClick={() =>
              onUpdateTicket(
                ticket.id,
                "WAITING_USER"
              )
            }
          >
            Esperar usuario
          </button>

          <button
            className="support-button support-button-escalate"
            disabled={isSaving}
            onClick={() =>
              onUpdateTicket(
                ticket.id,
                "ESCALATED"
              )
            }
          >
            Escalar
          </button>

          <button
            className="support-button support-button-success"
            disabled={isSaving}
            onClick={() =>
              onUpdateTicket(
                ticket.id,
                "RESOLVED"
              )
            }
          >
            Resolver
          </button>

          <button
            className="support-button"
            disabled={isSaving}
            onClick={() =>
              onUpdateTicket(
                ticket.id,
                "CLOSED"
              )
            }
          >
            Cerrar ticket
          </button>

          <button
            className="support-button"
            onClick={onClose}
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value
}) {
  return (
    <div className="support-detail">
      <span>{label}</span>
      <strong>
        {value || "No disponible"}
      </strong>
    </div>
  );
}

function StatusBadge({
  status
}) {
  return (
    <span
      className={`support-badge status-${status}`}
    >
      {TICKET_STATUS[status] || status}
    </span>
  );
}

function PriorityBadge({
  priority
}) {
  return (
    <span
      className={`support-badge priority-${priority}`}
    >
      {priority}
    </span>
  );
}

function SeverityBadge({
  severity
}) {
  return (
    <span
      className={`support-badge severity-${severity}`}
    >
      {severity}
    </span>
  );
}

function buildKpis(kpis = {}) {
  return [
    {
      title: "Tickets abiertos",
      value: kpis.open || 0,
      detail: "Esperando atención",
      icon: "🎫"
    },
    {
      title: "En proceso",
      value: kpis.inProgress || 0,
      detail: "Con agente asignado",
      icon: "🎧"
    },
    {
      title: "Esperando usuario",
      value: kpis.waitingUser || 0,
      detail: "Pendientes de respuesta",
      icon: "💬"
    },
    {
      title: "Escalados",
      value: kpis.escalated || 0,
      detail: "Otro departamento",
      icon: "🚨"
    },
    {
      title: "Resueltos hoy",
      value: kpis.resolvedToday || 0,
      detail: "Casos completados",
      icon: "✅"
    },
    {
      title: "Casos críticos",
      value: kpis.critical || 0,
      detail: "Requieren prioridad",
      icon: "⚠️"
    }
  ];
}

function normalizeResponse(response) {
  const source =
    response?.data || response;

  return {
    generatedAt:
      source.generatedAt ||
      new Date().toISOString(),

    kpis: {
      open:
        Number(source.kpis?.open) || 0,

      inProgress:
        Number(source.kpis?.inProgress) || 0,

      waitingUser:
        Number(source.kpis?.waitingUser) || 0,

      escalated:
        Number(source.kpis?.escalated) || 0,

      resolvedToday:
        Number(source.kpis?.resolvedToday) || 0,

      critical:
        Number(source.kpis?.critical) || 0,

      activeAgents:
        Number(source.kpis?.activeAgents) || 0,

      resolutionRate:
        Number(source.kpis?.resolutionRate) || 0
    },

    tickets:
      Array.isArray(source.tickets)
        ? source.tickets
        : [],

    agents:
      Array.isArray(source.agents)
        ? source.agents
        : [],

    alerts:
      Array.isArray(source.alerts)
        ? source.alerts
        : [],

    recentActivity:
      Array.isArray(source.recentActivity)
        ? source.recentActivity
        : []
  };
}

function getInitials(name) {
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

const styles = `
  * { box-sizing: border-box; }

  .support-page,
  .support-loading {
    min-height: 100vh;
    color: #f7f8ff;
    background:
      radial-gradient(circle at top right, rgba(117,77,255,.16), transparent 30%),
      radial-gradient(circle at bottom left, rgba(40,214,255,.08), transparent 28%),
      #050818;
    font-family: Inter, system-ui, sans-serif;
  }

  .support-page { padding: 28px; }

  .support-loading {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 16px;
    text-align: center;
  }

  .support-loader {
    width: 48px;
    height: 48px;
    border: 4px solid #222b4d;
    border-top-color: #5ed9ff;
    border-radius: 50%;
    animation: support-spin .8s linear infinite;
  }

  @keyframes support-spin {
    to { transform: rotate(360deg); }
  }

  .support-container {
    width: min(1650px,100%);
    margin: 0 auto;
  }

  .support-header {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .support-eyebrow {
    margin: 0 0 8px;
    color: #5ed9ff;
    font-size: 12px;
    font-weight: 850;
    letter-spacing: .16em;
    text-transform: uppercase;
  }

  .support-title {
    margin: 0;
    font-size: clamp(30px,4vw,44px);
  }

  .support-subtitle {
    max-width: 780px;
    margin: 12px 0 0;
    color: #929bbd;
    line-height: 1.6;
  }

  .support-header-actions,
  .support-modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .support-button {
    min-height: 41px;
    border: 1px solid #252d4d;
    border-radius: 12px;
    padding: 10px 15px;
    color: #eef0ff;
    background: #0d1228;
    font-weight: 750;
    cursor: pointer;
  }

  .support-button:disabled {
    opacity: .5;
    cursor: not-allowed;
  }

  .support-button-primary {
    border-color: transparent;
    background: linear-gradient(135deg,#665cff,#d44edb);
  }

  .support-button-success {
    color: #74eeb9;
    border-color: rgba(48,211,146,.35);
    background: rgba(48,211,146,.1);
  }

  .support-button-warning {
    color: #ffd16c;
    border-color: rgba(255,177,64,.35);
    background: rgba(255,177,64,.1);
  }

  .support-button-escalate {
    color: #dba0ff;
    border-color: rgba(183,75,255,.35);
    background: rgba(183,75,255,.1);
  }

  .support-button-small {
    min-height: 35px;
    padding: 8px 12px;
    font-size: 11px;
  }

  .support-demo-banner {
    margin-bottom: 18px;
    border: 1px solid rgba(255,196,76,.25);
    border-radius: 13px;
    padding: 13px 15px;
    color: #d8c58e;
    background: rgba(255,196,76,.07);
    font-size: 12px;
  }

  .support-kpis {
    display: grid;
    grid-template-columns: repeat(6,minmax(0,1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .support-card {
    border: 1px solid #1d2545;
    border-radius: 18px;
    background: linear-gradient(145deg,rgba(16,21,45,.96),rgba(8,12,29,.96));
  }

  .support-kpi,
  .support-section {
    padding: 18px;
  }

  .support-kpi-icon,
  .support-alert-icon,
  .support-avatar {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border-radius: 13px;
    background: #171d3b;
  }

  .support-kpi-title {
    margin: 15px 0 8px;
    color: #8f98ba;
    font-size: 12px;
  }

  .support-kpi-value {
    margin: 0;
    font-size: 28px;
    font-weight: 850;
  }

  .support-kpi-detail {
    margin: 7px 0 0;
    color: #687293;
    font-size: 11px;
  }

  .support-main-grid {
    display: grid;
    grid-template-columns: minmax(0,2fr) minmax(320px,.72fr);
    gap: 18px;
  }

  .support-section-header {
    display: flex;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 16px;
  }

  .support-section-title {
    margin: 0;
    font-size: 19px;
  }

  .support-section-description {
    margin: 5px 0 0;
    color: #7781a4;
    font-size: 12px;
  }

  .support-toolbar {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 10px;
    margin-bottom: 16px;
  }

  .support-input,
  .support-select,
  .support-composer textarea {
    min-height: 42px;
    border: 1px solid #222b4d;
    border-radius: 11px;
    padding: 0 14px;
    color: #f1f3ff;
    background: #080d21;
    outline: none;
  }

  .support-table-wrapper {
    overflow-x: auto;
    border: 1px solid #171f3d;
    border-radius: 14px;
  }

  .support-table {
    width: 100%;
    min-width: 1350px;
    border-collapse: collapse;
  }

  .support-table th {
    padding: 14px;
    color: #697395;
    background: #080d20;
    font-size: 10px;
    text-align: left;
  }

  .support-table td {
    padding: 15px 14px;
    border-top: 1px solid #171e39;
    font-size: 12px;
  }

  .support-table tbody tr {
    cursor: pointer;
  }

  .support-table tbody tr:hover {
    background: rgba(109,93,252,.07);
  }

  .support-primary-text,
  .support-muted {
    display: block;
  }

  .support-muted {
    margin-top: 5px;
    color: #717b9d;
    font-size: 10px;
  }

  .support-badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 6px 9px;
    font-size: 9px;
    font-weight: 850;
  }

  .status-OPEN,
  .status-WAITING_USER,
  .priority-MEDIUM,
  .severity-MEDIUM {
    color: #ffc36a;
    background: rgba(255,166,61,.13);
  }

  .status-IN_PROGRESS,
  .priority-HIGH,
  .severity-HIGH {
    color: #a99cff;
    background: rgba(124,97,255,.14);
  }

  .status-ESCALATED,
  .priority-CRITICAL,
  .severity-CRITICAL {
    color: #ff8198;
    background: rgba(255,77,109,.12);
  }

  .status-RESOLVED,
  .status-CLOSED,
  .priority-NORMAL {
    color: #6debb6;
    background: rgba(48,211,146,.12);
  }

  .support-side-column {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .support-alert,
  .support-agent,
  .support-activity {
    display: flex;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid #18203b;
  }

  .support-alert p,
  .support-activity p {
    margin: 5px 0 8px;
    color: #727c9d;
    font-size: 11px;
  }

  .support-activity span {
    color: #536080;
    font-size: 10px;
  }

  .support-agent {
    align-items: center;
  }

  .support-avatar {
    color: #fff;
    background: linear-gradient(135deg,#665cff,#d44edb);
    font-size: 12px;
    font-weight: 850;
  }

  .support-agent-info {
    flex: 1;
  }

  .support-agent-info strong,
  .support-agent-info span,
  .support-agent-rate strong,
  .support-agent-rate span {
    display: block;
  }

  .support-agent-info span,
  .support-agent-rate span {
    margin-top: 5px;
    color: #717b9d;
    font-size: 10px;
  }

  .support-agent-rate {
    text-align: right;
  }

  .support-progress {
    margin-top: 18px;
  }

  .support-progress-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    color: #919abd;
    font-size: 11px;
  }

  .support-progress-track {
    height: 8px;
    overflow: hidden;
    border-radius: 999px;
    background: #151b33;
  }

  .support-progress-value {
    height: 100%;
    background: linear-gradient(90deg,#5ed9ff,#705bff,#ec54bd);
  }

  .support-modal-backdrop {
    position: fixed;
    z-index: 1000;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(0,0,0,.76);
    backdrop-filter: blur(8px);
  }

  .support-modal {
    width: min(1000px,100%);
    max-height: 94vh;
    overflow-y: auto;
    border: 1px solid #283158;
    border-radius: 20px;
    background: #090e22;
  }

  .support-modal-header {
    display: flex;
    justify-content: space-between;
    padding: 22px;
    border-bottom: 1px solid #1c2443;
  }

  .support-modal-header h2,
  .support-modal-header p {
    margin: 0;
  }

  .support-modal-content {
    padding: 22px;
  }

  .support-detail-grid {
    display: grid;
    grid-template-columns: repeat(3,minmax(0,1fr));
    gap: 12px;
  }

  .support-detail,
  .support-assignment,
  .support-conversation {
    border: 1px solid #1c2545;
    border-radius: 13px;
    padding: 14px;
    background: #0c1229;
  }

  .support-detail span,
  .support-detail strong {
    display: block;
  }

  .support-detail span {
    margin-bottom: 7px;
    color: #6f799b;
    font-size: 10px;
    text-transform: uppercase;
  }

  .support-assignment,
  .support-conversation {
    margin-top: 18px;
  }

  .support-assignment-row {
    display: flex;
    gap: 10px;
  }

  .support-assignment-row .support-select {
    flex: 1;
  }

  .support-message {
    display: flex;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid #18203b;
  }

  .support-message-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .support-message-header span {
    color: #687293;
    font-size: 10px;
  }

  .support-message p {
    margin: 8px 0 0;
    color: #c3c9dd;
    font-size: 12px;
  }

  .support-composer {
    display: flex;
    gap: 10px;
    margin-top: 16px;
  }

  .support-composer textarea {
    flex: 1;
    min-height: 90px;
    resize: vertical;
    padding: 12px;
    font-family: inherit;
  }

  .support-modal-actions {
    padding: 20px 22px;
    border-top: 1px solid #1c2443;
  }

  @media (max-width: 1350px) {
    .support-kpis {
      grid-template-columns: repeat(3,minmax(0,1fr));
    }

    .support-main-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 850px) {
    .support-page {
      padding: 18px 12px;
    }

    .support-header {
      flex-direction: column;
    }

    .support-toolbar,
    .support-detail-grid {
      grid-template-columns: 1fr;
    }

    .support-assignment-row,
    .support-composer {
      flex-direction: column;
    }
  }

  @media (max-width: 520px) {
    .support-kpis {
      grid-template-columns: 1fr;
    }
  }
`;

export default SupportDashboard;
