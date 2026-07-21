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
    import.meta.env.VITE_USE_MOCK_ADMIN ??
      "true"
  ).toLowerCase() === "true";

const MOCK_DATA = {
  generatedAt: new Date().toISOString(),

  kpis: {
    eventsToday: 2350,
    criticalEvents: 12,
    administrativeChanges: 48,
    blockedAttempts: 1256,
    openReviews: 8,
    exportsToday: 5,
    integrityRate: 99.8,
    coverageRate: 98
  },

  events: [
    {
      id: "AUD-5008",
      actor: {
        id: "ADM-001",
        name: "Engel Feliz",
        role: "SENIOR_ADMIN"
      },
      module: "ADMINISTRATION",
      action: "PERMISSIONS_UPDATED",
      description:
        "Actualizó los permisos del usuario interno Laura Méndez.",
      entityType: "INTERNAL_USER",
      entityId: "USR-204",
      method: "PATCH",
      endpoint: "/api/admin/internal-users/USR-204/permissions",
      ip: "192.168.1.45",
      device: "Windows 11 · Chrome",
      severity: "HIGH",
      status: "SUCCESS",
      createdAt: new Date().toISOString(),
      before: {
        permissions: ["support.view"]
      },
      after: {
        permissions: [
          "support.view",
          "support.manage"
        ]
      }
    },
    {
      id: "AUD-5007",
      actor: {
        id: "WH-018",
        name: "Luis Gómez",
        role: "WAREHOUSE_STAFF"
      },
      module: "WAREHOUSE",
      action: "PRODUCT_APPROVED",
      description:
        "Aprobó la inspección del producto Dell Latitude 5420.",
      entityType: "WAREHOUSE_ITEM",
      entityId: "QSM-1047",
      method: "PATCH",
      endpoint: "/api/admin/warehouse/QSM-1047/status",
      ip: "172.16.10.21",
      device: "Windows 11 · Edge",
      severity: "MEDIUM",
      status: "SUCCESS",
      createdAt: new Date(
        Date.now() - 1000 * 60 * 18
      ).toISOString(),
      before: {
        status: "IN_INSPECTION"
      },
      after: {
        status: "APPROVED"
      }
    },
    {
      id: "AUD-5006",
      actor: {
        id: "DSP-011",
        name: "Ana Gómez",
        role: "DISPUTE_AGENT"
      },
      module: "DISPUTES",
      action: "BUYER_REFUNDED",
      description:
        "Autorizó el reembolso de RD$ 52,000 al comprador.",
      entityType: "DISPUTE",
      entityId: "DSP-3049",
      method: "PATCH",
      endpoint: "/api/admin/disputes/DSP-3049/status",
      ip: "172.16.10.33",
      device: "Windows 11 · Chrome",
      severity: "CRITICAL",
      status: "SUCCESS",
      createdAt: new Date(
        Date.now() - 1000 * 60 * 34
      ).toISOString(),
      before: {
        status: "ESCALATED",
        escrowStatus: "HELD"
      },
      after: {
        status: "REFUNDED",
        escrowStatus: "REFUNDED"
      }
    },
    {
      id: "AUD-5005",
      actor: {
        id: "SEC-SYSTEM",
        name: "Sistema QSM",
        role: "SYSTEM"
      },
      module: "SECURITY",
      action: "LOGIN_BLOCKED",
      description:
        "Bloqueó un intento de acceso después de múltiples credenciales incorrectas.",
      entityType: "SESSION",
      entityId: "SES-8112",
      method: "POST",
      endpoint: "/api/admin/auth/login",
      ip: "181.36.85.124",
      device: "Linux · Firefox",
      severity: "CRITICAL",
      status: "BLOCKED",
      createdAt: new Date(
        Date.now() - 1000 * 60 * 55
      ).toISOString(),
      before: null,
      after: {
        blocked: true,
        reason: "MULTIPLE_FAILED_ATTEMPTS"
      }
    },
    {
      id: "AUD-5004",
      actor: {
        id: "DLV-021",
        name: "Carlos Reyes",
        role: "DELIVERY_AGENT"
      },
      module: "DELIVERY",
      action: "DELIVERY_CONFIRMED",
      description:
        "Confirmó la entrega mediante PIN.",
      entityType: "DELIVERY",
      entityId: "DEL-2045",
      method: "PATCH",
      endpoint: "/api/admin/delivery/DEL-2045/status",
      ip: "10.0.0.81",
      device: "Android · QSM App",
      severity: "LOW",
      status: "SUCCESS",
      createdAt: new Date(
        Date.now() - 1000 * 60 * 72
      ).toISOString(),
      before: {
        status: "IN_TRANSIT"
      },
      after: {
        status: "DELIVERED"
      }
    }
  ],

  alerts: [
    {
      id: "ALT-001",
      title: "12 eventos críticos",
      description:
        "Incluyen reembolsos, bloqueos y cambios sensibles.",
      severity: "CRITICAL"
    },
    {
      id: "ALT-002",
      title: "5 exportaciones realizadas",
      description:
        "Se exportaron reportes administrativos durante el día.",
      severity: "HIGH"
    },
    {
      id: "ALT-003",
      title: "8 revisiones pendientes",
      description:
        "Eventos marcados para investigación manual.",
      severity: "MEDIUM"
    }
  ],

  recentActivity: [
    {
      id: "ACT-001",
      title: "Permisos actualizados",
      description:
        "Senior Admin modificó permisos internos.",
      time: "Hace 4 minutos",
      icon: "👑"
    },
    {
      id: "ACT-002",
      title: "Producto aprobado",
      description:
        "Almacén completó una inspección.",
      time: "Hace 18 minutos",
      icon: "📦"
    },
    {
      id: "ACT-003",
      title: "Reembolso autorizado",
      description:
        "Disputas reembolsó una orden.",
      time: "Hace 34 minutos",
      icon: "⚖️"
    },
    {
      id: "ACT-004",
      title: "Acceso bloqueado",
      description:
        "Seguridad bloqueó una IP sospechosa.",
      time: "Hace 55 minutos",
      icon: "🔐"
    }
  ]
};

const MODULES = [
  "ALL",
  "ADMINISTRATION",
  "VERIFICATION",
  "WAREHOUSE",
  "DELIVERY",
  "DISPUTES",
  "FINANCE",
  "SUPPORT",
  "MODERATION",
  "SECURITY"
];

function AuditDashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [moduleFilter, setModuleFilter] =
    useState("ALL");

  const [severityFilter, setSeverityFilter] =
    useState("ALL");

  const [selectedEvent, setSelectedEvent] =
    useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token =
        localStorage.getItem("qsm_admin_token") ||
        sessionStorage.getItem("qsm_admin_token");

      const response = await fetch(
        `${API_BASE_URL}/admin/audit/dashboard`,
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
          `No fue posible cargar Auditoría (${response.status}).`
        );
      }

      const result = await response.json();

      setDashboardData(
        normalizeResponse(result)
      );
    } catch (requestError) {
      console.error(
        "Error cargando Auditoría:",
        requestError
      );

      if (USE_MOCK_DATA) {
        setDashboardData(MOCK_DATA);

        setError(
          "Modo demostración activo. El dashboard está preparado para recibir el backend real."
        );
      } else {
        setDashboardData(null);

        setError(
          requestError.message ||
            "No fue posible cargar Auditoría."
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const events =
    dashboardData?.events || [];

  const filteredEvents = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        !normalizedSearch ||
        event.id
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        event.actor?.name
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        event.actor?.role
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        event.action
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        event.description
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        event.entityId
          ?.toLowerCase()
          .includes(normalizedSearch) ||
        event.ip
          ?.toLowerCase()
          .includes(normalizedSearch);

      const matchesModule =
        moduleFilter === "ALL" ||
        event.module === moduleFilter;

      const matchesSeverity =
        severityFilter === "ALL" ||
        event.severity === severityFilter;

      return (
        matchesSearch &&
        matchesModule &&
        matchesSeverity
      );
    });
  }, [
    events,
    search,
    moduleFilter,
    severityFilter
  ]);

  if (loading) {
    return (
      <div className="audit-loading">
        <style>{styles}</style>

        <div className="audit-loader" />

        <h2>
          Cargando Dashboard de Auditoría...
        </h2>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="audit-loading">
        <style>{styles}</style>

        <h2>
          No se pudo cargar Auditoría
        </h2>

        <p>{error}</p>

        <button
          type="button"
          className="audit-button audit-button-primary"
          onClick={loadDashboard}
        >
          Reintentar
        </button>
      </div>
    );
  }

  const kpis = buildKpis(
    dashboardData.kpis
  );

  return (
    <div className="audit-page">
      <style>{styles}</style>

      <div className="audit-container">
        <header className="audit-header">
          <div>
            <p className="audit-eyebrow">
              Trazabilidad empresarial
            </p>

            <h1 className="audit-title">
              Dashboard de Auditoría
            </h1>

            <p className="audit-subtitle">
              Supervisa acciones administrativas,
              cambios sensibles, accesos,
              operaciones y eventos realizados
              dentro de QSM.
            </p>
          </div>

          <div className="audit-header-actions">
            <button
              type="button"
              className="audit-button"
              onClick={() =>
                navigate("/admin/select-area")
              }
            >
              ← Todas las áreas
            </button>

            <button
              type="button"
              className="audit-button"
              onClick={loadDashboard}
            >
              ↻ Actualizar
            </button>

            <button
              type="button"
              className="audit-button audit-button-primary"
              onClick={() =>
                window.alert(
                  "La exportación quedará conectada a GET /api/admin/audit/export."
                )
              }
            >
              Exportar reporte
            </button>
          </div>
        </header>

        {error && (
          <div className="audit-demo-banner">
            <strong>Información:</strong>{" "}
            {error}
          </div>
        )}

        <section className="audit-kpis">
          {kpis.map((kpi) => (
            <article
              key={kpi.title}
              className="audit-card audit-kpi"
            >
              <div className="audit-kpi-icon">
                {kpi.icon}
              </div>

              <p className="audit-kpi-title">
                {kpi.title}
              </p>

              <p className="audit-kpi-value">
                {kpi.value}
              </p>

              <p className="audit-kpi-detail">
                {kpi.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="audit-main-grid">
          <article className="audit-card audit-section">
            <div className="audit-section-header">
              <div>
                <h2 className="audit-section-title">
                  Registro de eventos
                </h2>

                <p className="audit-section-description">
                  Historial de acciones realizadas
                  dentro de todos los módulos.
                </p>
              </div>

              <button
                type="button"
                className="audit-button"
                onClick={() => {
                  setSearch("");
                  setModuleFilter("ALL");
                  setSeverityFilter("ALL");
                }}
              >
                Limpiar filtros
              </button>
            </div>

            <div className="audit-toolbar">
              <input
                className="audit-input"
                type="search"
                placeholder="Buscar evento, usuario, acción, IP o entidad..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              <select
                className="audit-select"
                value={moduleFilter}
                onChange={(event) =>
                  setModuleFilter(
                    event.target.value
                  )
                }
              >
                {MODULES.map((module) => (
                  <option
                    key={module}
                    value={module}
                  >
                    {module === "ALL"
                      ? "Todos los módulos"
                      : formatLabel(module)}
                  </option>
                ))}
              </select>

              <select
                className="audit-select"
                value={severityFilter}
                onChange={(event) =>
                  setSeverityFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  Todos los riesgos
                </option>

                <option value="CRITICAL">
                  Crítico
                </option>

                <option value="HIGH">
                  Alto
                </option>

                <option value="MEDIUM">
                  Medio
                </option>

                <option value="LOW">
                  Bajo
                </option>
              </select>
            </div>

            <div className="audit-table-wrapper">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Usuario</th>
                    <th>Módulo</th>
                    <th>Acción</th>
                    <th>IP</th>
                    <th>Riesgo</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredEvents.map((event) => (
                    <tr
                      key={event.id}
                      onClick={() =>
                        setSelectedEvent(event)
                      }
                    >
                      <td>
                        <strong className="audit-primary-text">
                          {event.id}
                        </strong>

                        <span className="audit-muted">
                          {event.entityType} ·{" "}
                          {event.entityId}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {event.actor?.name}
                        </strong>

                        <span className="audit-muted">
                          {event.actor?.role}
                        </span>
                      </td>

                      <td>
                        {formatLabel(
                          event.module
                        )}
                      </td>

                      <td>
                        <strong>
                          {formatLabel(
                            event.action
                          )}
                        </strong>

                        <span className="audit-muted">
                          {event.description}
                        </span>
                      </td>

                      <td>{event.ip}</td>

                      <td>
                        <SeverityBadge
                          severity={
                            event.severity
                          }
                        />
                      </td>

                      <td>
                        <StatusBadge
                          status={event.status}
                        />
                      </td>

                      <td>
                        {formatDateTime(
                          event.createdAt
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="audit-button audit-button-small"
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation();
                            setSelectedEvent(event);
                          }}
                        >
                          Revisar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredEvents.length === 0 && (
                <div className="audit-empty">
                  No se encontraron eventos.
                </div>
              )}
            </div>

            <div className="audit-progress">
              <div className="audit-progress-row">
                <span>
                  Cobertura de auditoría
                </span>

                <strong>
                  {dashboardData.kpis.coverageRate}%
                </strong>
              </div>

              <div className="audit-progress-track">
                <div
                  className="audit-progress-value"
                  style={{
                    width: `${dashboardData.kpis.coverageRate}%`
                  }}
                />
              </div>
            </div>
          </article>

          <aside className="audit-side-column">
            <article className="audit-card audit-section">
              <div className="audit-section-header">
                <div>
                  <h2 className="audit-section-title">
                    Alertas
                  </h2>

                  <p className="audit-section-description">
                    Eventos que requieren revisión.
                  </p>
                </div>
              </div>

              {dashboardData.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="audit-alert"
                >
                  <div className="audit-alert-icon">
                    ⚠️
                  </div>

                  <div>
                    <p className="audit-alert-title">
                      {alert.title}
                    </p>

                    <p className="audit-alert-description">
                      {alert.description}
                    </p>

                    <SeverityBadge
                      severity={alert.severity}
                    />
                  </div>
                </div>
              ))}
            </article>

            <article className="audit-card audit-section">
              <div className="audit-section-header">
                <div>
                  <h2 className="audit-section-title">
                    Actividad reciente
                  </h2>
                </div>
              </div>

              {dashboardData.recentActivity.map(
                (item) => (
                  <div
                    key={item.id}
                    className="audit-activity"
                  >
                    <div className="audit-activity-icon">
                      {item.icon}
                    </div>

                    <div>
                      <p className="audit-alert-title">
                        {item.title}
                      </p>

                      <p className="audit-alert-description">
                        {item.description}
                      </p>

                      <span className="audit-activity-time">
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

      {selectedEvent && (
        <AuditModal
          event={selectedEvent}
          onClose={() =>
            setSelectedEvent(null)
          }
        />
      )}
    </div>
  );
}

function AuditModal({
  event,
  onClose
}) {
  return (
    <div
      className="audit-modal-backdrop"
      onMouseDown={(mouseEvent) => {
        if (
          mouseEvent.target ===
          mouseEvent.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="audit-modal">
        <div className="audit-modal-header">
          <div>
            <p className="audit-eyebrow">
              Detalle del evento
            </p>

            <h2 className="audit-modal-title">
              {event.id}
            </h2>

            <p className="audit-section-description">
              {event.description}
            </p>
          </div>

          <button
            type="button"
            className="audit-button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="audit-modal-content">
          <div className="audit-detail-grid">
            <Detail
              label="Usuario"
              value={event.actor?.name}
            />

            <Detail
              label="Rol"
              value={event.actor?.role}
            />

            <Detail
              label="Módulo"
              value={formatLabel(
                event.module
              )}
            />

            <Detail
              label="Acción"
              value={formatLabel(
                event.action
              )}
            />

            <Detail
              label="Entidad"
              value={`${event.entityType} · ${event.entityId}`}
            />

            <Detail
              label="Fecha"
              value={formatDateTime(
                event.createdAt
              )}
            />

            <Detail
              label="IP"
              value={event.ip}
            />

            <Detail
              label="Dispositivo"
              value={event.device}
            />

            <Detail
              label="Método HTTP"
              value={event.method}
            />

            <Detail
              label="Endpoint"
              value={event.endpoint}
            />

            <Detail
              label="Riesgo"
              value={event.severity}
            />

            <Detail
              label="Resultado"
              value={event.status}
            />
          </div>

          <div className="audit-changes-grid">
            <JsonPanel
              title="Valor anterior"
              value={event.before}
            />

            <JsonPanel
              title="Valor nuevo"
              value={event.after}
            />
          </div>
        </div>

        <div className="audit-modal-actions">
          <button
            type="button"
            className="audit-button audit-button-primary"
            onClick={() =>
              window.alert(
                `Evento ${event.id} marcado para revisión.`
              )
            }
          >
            Marcar para revisión
          </button>

          <button
            type="button"
            className="audit-button"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function JsonPanel({
  title,
  value
}) {
  return (
    <div className="audit-json-panel">
      <span>{title}</span>

      <pre>
        {value
          ? JSON.stringify(
              value,
              null,
              2
            )
          : "Sin datos"}
      </pre>
    </div>
  );
}

function Detail({
  label,
  value
}) {
  return (
    <div className="audit-detail">
      <span>{label}</span>
      <strong>
        {value || "No disponible"}
      </strong>
    </div>
  );
}

function SeverityBadge({
  severity
}) {
  return (
    <span
      className={`audit-badge severity-${severity}`}
    >
      {severity}
    </span>
  );
}

function StatusBadge({
  status
}) {
  return (
    <span
      className={`audit-badge status-${status}`}
    >
      {status}
    </span>
  );
}

function buildKpis(kpis = {}) {
  return [
    {
      title: "Eventos hoy",
      value: kpis.eventsToday || 0,
      detail: "Acciones registradas",
      icon: "📋"
    },
    {
      title: "Eventos críticos",
      value: kpis.criticalEvents || 0,
      detail: "Requieren revisión",
      icon: "🚨"
    },
    {
      title: "Cambios administrativos",
      value:
        kpis.administrativeChanges || 0,
      detail: "Permisos y configuraciones",
      icon: "👑"
    },
    {
      title: "Intentos bloqueados",
      value:
        kpis.blockedAttempts || 0,
      detail: "Accesos rechazados",
      icon: "🔐"
    },
    {
      title: "Revisiones abiertas",
      value:
        kpis.openReviews || 0,
      detail: "Pendientes de auditor",
      icon: "🔎"
    },
    {
      title: "Integridad",
      value:
        `${kpis.integrityRate || 0}%`,
      detail: "Estado de trazabilidad",
      icon: "✅"
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
      eventsToday:
        Number(
          source.kpis?.eventsToday
        ) || 0,

      criticalEvents:
        Number(
          source.kpis?.criticalEvents
        ) || 0,

      administrativeChanges:
        Number(
          source.kpis
            ?.administrativeChanges
        ) || 0,

      blockedAttempts:
        Number(
          source.kpis
            ?.blockedAttempts
        ) || 0,

      openReviews:
        Number(
          source.kpis?.openReviews
        ) || 0,

      exportsToday:
        Number(
          source.kpis?.exportsToday
        ) || 0,

      integrityRate:
        Number(
          source.kpis?.integrityRate
        ) || 0,

      coverageRate:
        Number(
          source.kpis?.coverageRate
        ) || 0
    },

    events: Array.isArray(
      source.events
    )
      ? source.events
      : [],

    alerts: Array.isArray(
      source.alerts
    )
      ? source.alerts
      : [],

    recentActivity: Array.isArray(
      source.recentActivity
    )
      ? source.recentActivity
      : []
  };
}

function formatLabel(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDateTime(value) {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
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

const styles = `
  * {
    box-sizing: border-box;
  }

  .audit-page,
  .audit-loading {
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
        rgba(52, 210, 255, 0.08),
        transparent 28%
      ),
      #050818;
    font-family:
      Inter,
      system-ui,
      sans-serif;
  }

  .audit-page {
    padding: 28px;
  }

  .audit-loading {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 16px;
    text-align: center;
  }

  .audit-loader {
    width: 48px;
    height: 48px;
    border: 4px solid #222b4d;
    border-top-color: #5ed9ff;
    border-radius: 50%;
    animation: audit-spin 0.8s linear infinite;
  }

  @keyframes audit-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .audit-container {
    width: min(1650px, 100%);
    margin: 0 auto;
  }

  .audit-header {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .audit-eyebrow {
    margin: 0 0 8px;
    color: #5ed9ff;
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .audit-title {
    margin: 0;
    font-size: clamp(30px, 4vw, 44px);
  }

  .audit-subtitle {
    max-width: 780px;
    margin: 12px 0 0;
    color: #929bbd;
    line-height: 1.6;
  }

  .audit-header-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
  }

  .audit-button {
    min-height: 41px;
    border: 1px solid #252d4d;
    border-radius: 12px;
    padding: 10px 15px;
    color: #eef0ff;
    background: #0d1228;
    font-weight: 750;
    cursor: pointer;
  }

  .audit-button-primary {
    border-color: transparent;
    background:
      linear-gradient(
        135deg,
        #665cff,
        #d44edb
      );
  }

  .audit-button-small {
    min-height: 35px;
    padding: 8px 12px;
    font-size: 11px;
  }

  .audit-demo-banner {
    margin-bottom: 18px;
    border: 1px solid rgba(255,196,76,.25);
    border-radius: 13px;
    padding: 13px 15px;
    color: #d8c58e;
    background: rgba(255,196,76,.07);
    font-size: 12px;
  }

  .audit-kpis {
    display: grid;
    grid-template-columns:
      repeat(6, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .audit-card {
    border: 1px solid #1d2545;
    border-radius: 18px;
    background:
      linear-gradient(
        145deg,
        rgba(16,21,45,.96),
        rgba(8,12,29,.96)
      );
  }

  .audit-kpi {
    min-height: 145px;
    padding: 18px;
  }

  .audit-kpi-icon {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border-radius: 13px;
    background: #171d3b;
    font-size: 20px;
  }

  .audit-kpi-title {
    margin: 15px 0 8px;
    color: #8f98ba;
    font-size: 12px;
  }

  .audit-kpi-value {
    margin: 0;
    font-size: 28px;
    font-weight: 850;
  }

  .audit-kpi-detail {
    margin: 7px 0 0;
    color: #687293;
    font-size: 11px;
  }

  .audit-main-grid {
    display: grid;
    grid-template-columns:
      minmax(0, 2fr)
      minmax(320px, .72fr);
    gap: 18px;
  }

  .audit-section {
    padding: 20px;
  }

  .audit-section-header {
    display: flex;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 16px;
  }

  .audit-section-title {
    margin: 0;
    font-size: 19px;
  }

  .audit-section-description {
    margin: 5px 0 0;
    color: #7781a4;
    font-size: 12px;
  }

  .audit-toolbar {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 10px;
    margin-bottom: 16px;
  }

  .audit-input,
  .audit-select {
    min-height: 42px;
    border: 1px solid #222b4d;
    border-radius: 11px;
    color: #f1f3ff;
    background: #080d21;
    outline: none;
  }

  .audit-input {
    padding: 0 14px;
  }

  .audit-select {
    padding: 0 12px;
  }

  .audit-table-wrapper {
    overflow-x: auto;
    border: 1px solid #171f3d;
    border-radius: 14px;
  }

  .audit-table {
    width: 100%;
    min-width: 1300px;
    border-collapse: collapse;
  }

  .audit-table th {
    padding: 14px;
    color: #697395;
    background: #080d20;
    font-size: 10px;
    text-align: left;
  }

  .audit-table td {
    padding: 15px 14px;
    border-top: 1px solid #171e39;
    font-size: 12px;
  }

  .audit-table tbody tr {
    cursor: pointer;
  }

  .audit-table tbody tr:hover {
    background: rgba(109,93,252,.07);
  }

  .audit-primary-text,
  .audit-muted {
    display: block;
  }

  .audit-muted {
    margin-top: 5px;
    color: #717b9d;
    font-size: 10px;
  }

  .audit-badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 6px 9px;
    font-size: 9px;
    font-weight: 850;
  }

  .severity-CRITICAL {
    color: #ff8198;
    background: rgba(255,77,109,.12);
  }

  .severity-HIGH {
    color: #ffc36a;
    background: rgba(255,166,61,.13);
  }

  .severity-MEDIUM {
    color: #a99cff;
    background: rgba(124,97,255,.14);
  }

  .severity-LOW,
  .status-SUCCESS {
    color: #6debb6;
    background: rgba(48,211,146,.12);
  }

  .status-BLOCKED {
    color: #ff8198;
    background: rgba(255,77,109,.12);
  }

  .audit-side-column {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .audit-alert,
  .audit-activity {
    display: flex;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid #18203b;
  }

  .audit-alert-icon,
  .audit-activity-icon {
    display: grid;
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    place-items: center;
    border-radius: 12px;
    background: #171d38;
  }

  .audit-alert-title {
    margin: 0 0 5px;
    font-size: 12px;
  }

  .audit-alert-description {
    margin: 0 0 8px;
    color: #727c9d;
    font-size: 11px;
    line-height: 1.5;
  }

  .audit-activity-time {
    color: #536080;
    font-size: 10px;
  }

  .audit-progress {
    margin-top: 18px;
  }

  .audit-progress-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    color: #919abd;
    font-size: 11px;
  }

  .audit-progress-track {
    height: 8px;
    border-radius: 999px;
    background: #151b33;
    overflow: hidden;
  }

  .audit-progress-value {
    height: 100%;
    background:
      linear-gradient(
        90deg,
        #5ed9ff,
        #705bff,
        #ec54bd
      );
  }

  .audit-empty {
    padding: 40px;
    color: #717b9c;
    text-align: center;
  }

  .audit-modal-backdrop {
    position: fixed;
    z-index: 1000;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(0,0,0,.76);
    backdrop-filter: blur(8px);
  }

  .audit-modal {
    width: min(1050px, 100%);
    max-height: 94vh;
    overflow-y: auto;
    border: 1px solid #283158;
    border-radius: 20px;
    background: #090e22;
  }

  .audit-modal-header {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    padding: 22px;
    border-bottom: 1px solid #1c2443;
  }

  .audit-modal-title {
    margin: 0;
  }

  .audit-modal-content {
    padding: 22px;
  }

  .audit-detail-grid {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .audit-detail,
  .audit-json-panel {
    border: 1px solid #1c2545;
    border-radius: 13px;
    padding: 14px;
    background: #0c1229;
  }

  .audit-detail span,
  .audit-detail strong {
    display: block;
  }

  .audit-detail span,
  .audit-json-panel > span {
    margin-bottom: 7px;
    color: #6f799b;
    font-size: 10px;
    text-transform: uppercase;
  }

  .audit-changes-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: 18px;
  }

  .audit-json-panel pre {
    margin: 10px 0 0;
    color: #b9c1da;
    white-space: pre-wrap;
    font-size: 11px;
  }

  .audit-modal-actions {
    display: flex;
    gap: 10px;
    padding: 20px 22px;
    border-top: 1px solid #1c2443;
  }

  @media (max-width: 1350px) {
    .audit-kpis {
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
    }

    .audit-main-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 850px) {
    .audit-page {
      padding: 18px 12px;
    }

    .audit-header {
      flex-direction: column;
    }

    .audit-toolbar,
    .audit-detail-grid,
    .audit-changes-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 520px) {
    .audit-kpis {
      grid-template-columns: 1fr;
    }
  }
`;

export default AuditDashboard;
