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

const VERIFICATION_STATUS = {
  PENDING_REVIEW: "Pendiente",
  UNDER_REVIEW: "En revisión",
  CHANGES_REQUIRED: "Correcciones requeridas",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  EXPIRED: "Documento vencido"
};

const MOCK_DATA = {
  generatedAt: new Date().toISOString(),

  kpis: {
    pending: 28,
    underReview: 12,
    changesRequired: 9,
    approvedToday: 34,
    rejectedToday: 4,
    expiredDocuments: 7,
    sellerRequests: 15,
    approvalRate: 86
  },

  verifications: [
    {
      id: "KYC-4028",
      userId: "USR-1001",
      fullName: "Carlos Martínez",
      email: "carlos@example.com",
      phone: "809-555-0112",
      documentNumber: "001-1234567-8",
      documentType: "CEDULA",
      documentExpirationDate: "2029-08-12",
      profilePhoto: null,
      documentFront: null,
      documentBack: null,
      status: "PENDING_REVIEW",
      sellerRequest: true,
      trustScore: 50,
      priority: "HIGH",
      assignedAgent: null,
      submittedAt: new Date().toISOString(),
      lastUpdate: "Hace 12 minutos",
      issues: [],
      faceVerification: {
        status: "NOT_STARTED",
        matchScore: null
      }
    },
    {
      id: "KYC-4027",
      userId: "USR-1002",
      fullName: "Ana Rodríguez",
      email: "ana@example.com",
      phone: "829-555-0194",
      documentNumber: "001-5544332-1",
      documentType: "CEDULA",
      documentExpirationDate: "2028-04-19",
      profilePhoto: null,
      documentFront: null,
      documentBack: null,
      status: "UNDER_REVIEW",
      sellerRequest: false,
      trustScore: 62,
      priority: "MEDIUM",
      assignedAgent: {
        id: "AGT-001",
        name: "Laura Méndez"
      },
      submittedAt: new Date().toISOString(),
      lastUpdate: "Hace 35 minutos",
      issues: [],
      faceVerification: {
        status: "PENDING",
        matchScore: null
      }
    },
    {
      id: "KYC-4026",
      userId: "USR-1003",
      fullName: "Pedro Jiménez",
      email: "pedro@example.com",
      phone: "849-555-0180",
      documentNumber: "001-9080706-5",
      documentType: "CEDULA",
      documentExpirationDate: "2027-02-03",
      profilePhoto: null,
      documentFront: null,
      documentBack: null,
      status: "CHANGES_REQUIRED",
      sellerRequest: true,
      trustScore: 45,
      priority: "HIGH",
      assignedAgent: {
        id: "AGT-002",
        name: "José Ramírez"
      },
      submittedAt: new Date().toISOString(),
      lastUpdate: "Hace 1 hora",
      issues: [
        {
          field: "FULL_NAME",
          message:
            "El segundo apellido no coincide con la cédula."
        },
        {
          field: "DOCUMENT_FRONT",
          message:
            "La fotografía frontal está borrosa."
        }
      ],
      faceVerification: {
        status: "NOT_STARTED",
        matchScore: null
      }
    },
    {
      id: "KYC-4025",
      userId: "USR-1004",
      fullName: "María Pérez",
      email: "maria@example.com",
      phone: "809-555-0132",
      documentNumber: "001-1122334-5",
      documentType: "CEDULA",
      documentExpirationDate: "2030-11-21",
      profilePhoto: null,
      documentFront: null,
      documentBack: null,
      status: "APPROVED",
      sellerRequest: true,
      trustScore: 78,
      priority: "NORMAL",
      assignedAgent: {
        id: "AGT-003",
        name: "Claudia Reyes"
      },
      submittedAt: new Date().toISOString(),
      lastUpdate: "Hace 2 horas",
      issues: [],
      faceVerification: {
        status: "MATCHED",
        matchScore: 96
      }
    },
    {
      id: "KYC-4024",
      userId: "USR-1005",
      fullName: "Miguel Santos",
      email: "miguel@example.com",
      phone: "829-555-0157",
      documentNumber: "001-3322110-9",
      documentType: "CEDULA",
      documentExpirationDate: "2026-06-10",
      profilePhoto: null,
      documentFront: null,
      documentBack: null,
      status: "EXPIRED",
      sellerRequest: false,
      trustScore: 41,
      priority: "CRITICAL",
      assignedAgent: {
        id: "AGT-004",
        name: "Ana Gómez"
      },
      submittedAt: new Date().toISOString(),
      lastUpdate: "Hace 3 horas",
      issues: [
        {
          field: "DOCUMENT_EXPIRATION",
          message:
            "La cédula se encuentra vencida."
        }
      ],
      faceVerification: {
        status: "NOT_STARTED",
        matchScore: null
      }
    }
  ],

  agents: [
    {
      id: "AGT-001",
      name: "Laura Méndez",
      activeCases: 8,
      approvedToday: 12,
      accuracyRate: 97
    },
    {
      id: "AGT-002",
      name: "José Ramírez",
      activeCases: 10,
      approvedToday: 9,
      accuracyRate: 94
    },
    {
      id: "AGT-003",
      name: "Claudia Reyes",
      activeCases: 6,
      approvedToday: 15,
      accuracyRate: 98
    },
    {
      id: "AGT-004",
      name: "Ana Gómez",
      activeCases: 7,
      approvedToday: 11,
      accuracyRate: 96
    }
  ],

  alerts: [
    {
      id: "ALT-001",
      title: "7 documentos vencidos",
      description:
        "Los usuarios deben actualizar su identificación.",
      severity: "CRITICAL"
    },
    {
      id: "ALT-002",
      title: "9 correcciones pendientes",
      description:
        "Esperando nueva información de los usuarios.",
      severity: "HIGH"
    },
    {
      id: "ALT-003",
      title: "15 solicitudes de vendedor",
      description:
        "Requieren revisión antes de activar ventas.",
      severity: "MEDIUM"
    }
  ],

  recentActivity: [
    {
      id: "ACT-001",
      title: "Identidad aprobada",
      description:
        "KYC-4025 fue aprobada correctamente.",
      time: "Hace 2 horas",
      icon: "✅"
    },
    {
      id: "ACT-002",
      title: "Corrección solicitada",
      description:
        "Se solicitó una nueva cédula frontal.",
      time: "Hace 1 hora",
      icon: "📝"
    },
    {
      id: "ACT-003",
      title: "Documento vencido",
      description:
        "KYC-4024 perdió su estado verificado.",
      time: "Hace 3 horas",
      icon: "⚠️"
    }
  ]
};

function VerificationDashboard() {
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

  const [selectedVerification, setSelectedVerification] =
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
        `${API_BASE_URL}/admin/verification/dashboard`,
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
          `No fue posible cargar Verificación (${response.status}).`
        );
      }

      const result = await response.json();

      setDashboardData(
        normalizeResponse(result)
      );
    } catch (requestError) {
      console.error(
        "Error cargando Verificación:",
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

  const filteredVerifications =
    useMemo(() => {
      const items =
        dashboardData?.verifications || [];

      const normalizedSearch =
        search.trim().toLowerCase();

      return items.filter((verification) => {
        const matchesSearch =
          !normalizedSearch ||
          verification.id
            ?.toLowerCase()
            .includes(normalizedSearch) ||
          verification.fullName
            ?.toLowerCase()
            .includes(normalizedSearch) ||
          verification.email
            ?.toLowerCase()
            .includes(normalizedSearch) ||
          verification.documentNumber
            ?.toLowerCase()
            .includes(normalizedSearch);

        const matchesStatus =
          statusFilter === "ALL" ||
          verification.status === statusFilter;

        return matchesSearch && matchesStatus;
      });
    }, [
      dashboardData,
      search,
      statusFilter
    ]);

  async function updateStatus(
    verificationId,
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
          `${API_BASE_URL}/admin/verification/${verificationId}/status`,
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
            "No fue posible actualizar la verificación."
          );
        }
      }

      setDashboardData((current) => ({
        ...current,
        verifications:
          current.verifications.map((item) =>
            item.id === verificationId
              ? {
                  ...item,
                  status,
                  ...extraData,
                  lastUpdate: "Actualizado ahora",
                  trustScore:
                    status === "APPROVED"
                      ? Math.max(
                          item.trustScore,
                          70
                        )
                      : item.trustScore
                }
              : item
          )
      }));

      setSelectedVerification((current) =>
        current?.id === verificationId
          ? {
              ...current,
              status,
              ...extraData,
              lastUpdate: "Actualizado ahora",
              trustScore:
                status === "APPROVED"
                  ? Math.max(
                      current.trustScore,
                      70
                    )
                  : current.trustScore
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
    verificationId,
    agent
  ) {
    await updateStatus(
      verificationId,
      "UNDER_REVIEW",
      {
        assignedAgent: agent
      }
    );
  }

  if (loading) {
    return (
      <div className="verification-loading">
        <style>{styles}</style>

        <div className="verification-loader" />

        <h2>
          Cargando Centro de Verificación...
        </h2>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="verification-loading">
        <style>{styles}</style>

        <h2>
          No se pudo cargar Verificación
        </h2>

        <p>{error}</p>

        <button
          className="verification-button verification-button-primary"
          onClick={loadDashboard}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="verification-page">
      <style>{styles}</style>

      <div className="verification-container">
        <header className="verification-header">
          <div>
            <p className="verification-eyebrow">
              Identity Center · KYC
            </p>

            <h1 className="verification-title">
              Dashboard de Verificación
            </h1>

            <p className="verification-subtitle">
              Revisa identidades, cédulas,
              fotografías, correcciones,
              documentos vencidos y
              solicitudes para habilitar vendedores.
            </p>
          </div>

          <div className="verification-header-actions">
            <button
              className="verification-button"
              onClick={() =>
                navigate("/admin/select-area")
              }
            >
              ← Todas las áreas
            </button>

            <button
              className="verification-button"
              onClick={loadDashboard}
            >
              ↻ Actualizar
            </button>
          </div>
        </header>

        {error && (
          <div className="verification-demo-banner">
            <strong>Información:</strong>{" "}
            {error}
          </div>
        )}

        <section className="verification-kpis">
          {buildKpis(
            dashboardData.kpis
          ).map((kpi) => (
            <article
              key={kpi.title}
              className="verification-card verification-kpi"
            >
              <div className="verification-kpi-icon">
                {kpi.icon}
              </div>

              <p className="verification-kpi-title">
                {kpi.title}
              </p>

              <p className="verification-kpi-value">
                {kpi.value}
              </p>

              <p className="verification-kpi-detail">
                {kpi.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="verification-main-grid">
          <article className="verification-card verification-section">
            <div className="verification-section-header">
              <div>
                <h2 className="verification-section-title">
                  Cola de verificaciones
                </h2>

                <p className="verification-section-description">
                  Solicitudes de identidad que
                  requieren revisión.
                </p>
              </div>

              <button
                className="verification-button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                }}
              >
                Limpiar filtros
              </button>
            </div>

            <div className="verification-toolbar">
              <input
                className="verification-input"
                placeholder="Buscar usuario, cédula, correo o solicitud..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              <select
                className="verification-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="ALL">
                  Todos los estados
                </option>

                {Object.entries(
                  VERIFICATION_STATUS
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

            <div className="verification-table-wrapper">
              <table className="verification-table">
                <thead>
                  <tr>
                    <th>Solicitud</th>
                    <th>Usuario</th>
                    <th>Cédula</th>
                    <th>Trust Score</th>
                    <th>Vendedor</th>
                    <th>Agente</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredVerifications.map(
                    (verification) => (
                      <tr
                        key={verification.id}
                        onClick={() =>
                          setSelectedVerification(
                            verification
                          )
                        }
                      >
                        <td>
                          <strong className="verification-primary-text">
                            {verification.id}
                          </strong>

                          <span className="verification-muted">
                            {verification.lastUpdate}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {verification.fullName}
                          </strong>

                          <span className="verification-muted">
                            {verification.email}
                          </span>
                        </td>

                        <td>
                          {verification.documentNumber}

                          <span className="verification-muted">
                            Vence:{" "}
                            {verification.documentExpirationDate}
                          </span>
                        </td>

                        <td>
                          <TrustScore
                            score={
                              verification.trustScore
                            }
                          />
                        </td>

                        <td>
                          {verification.sellerRequest
                            ? "Solicitado"
                            : "No"}
                        </td>

                        <td>
                          {verification.assignedAgent
                            ?.name ||
                            "Sin asignar"}
                        </td>

                        <td>
                          <PriorityBadge
                            priority={
                              verification.priority
                            }
                          />
                        </td>

                        <td>
                          <StatusBadge
                            status={
                              verification.status
                            }
                          />
                        </td>

                        <td>
                          <button
                            className="verification-button verification-button-small"
                            onClick={(event) => {
                              event.stopPropagation();

                              setSelectedVerification(
                                verification
                              );
                            }}
                          >
                            Revisar
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="verification-progress">
              <div className="verification-progress-row">
                <span>
                  Tasa de aprobación
                </span>

                <strong>
                  {dashboardData.kpis.approvalRate}%
                </strong>
              </div>

              <div className="verification-progress-track">
                <div
                  className="verification-progress-value"
                  style={{
                    width: `${dashboardData.kpis.approvalRate}%`
                  }}
                />
              </div>
            </div>
          </article>

          <aside className="verification-side-column">
            <article className="verification-card verification-section">
              <h2 className="verification-section-title">
                Alertas
              </h2>

              {dashboardData.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="verification-alert"
                >
                  <div className="verification-alert-icon">
                    ⚠️
                  </div>

                  <div>
                    <strong>
                      {alert.title}
                    </strong>

                    <p>
                      {alert.description}
                    </p>

                    <SeverityBadge
                      severity={alert.severity}
                    />
                  </div>
                </div>
              ))}
            </article>

            <article className="verification-card verification-section">
              <h2 className="verification-section-title">
                Agentes
              </h2>

              {dashboardData.agents.map((agent) => (
                <div
                  key={agent.id}
                  className="verification-agent"
                >
                  <div className="verification-avatar">
                    {getInitials(agent.name)}
                  </div>

                  <div className="verification-agent-info">
                    <strong>{agent.name}</strong>

                    <span>
                      {agent.activeCases} casos activos
                    </span>
                  </div>

                  <div className="verification-agent-rate">
                    <strong>
                      {agent.accuracyRate}%
                    </strong>

                    <span>
                      precisión
                    </span>
                  </div>
                </div>
              ))}
            </article>

            <article className="verification-card verification-section">
              <h2 className="verification-section-title">
                Actividad reciente
              </h2>

              {dashboardData.recentActivity.map(
                (activity) => (
                  <div
                    key={activity.id}
                    className="verification-activity"
                  >
                    <div className="verification-alert-icon">
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

      {selectedVerification && (
        <VerificationModal
          verification={
            selectedVerification
          }
          agents={
            dashboardData.agents
          }
          isSaving={isSaving}
          onClose={() =>
            setSelectedVerification(null)
          }
          onAssignAgent={assignAgent}
          onUpdateStatus={updateStatus}
        />
      )}
    </div>
  );
}

function VerificationModal({
  verification,
  agents,
  isSaving,
  onClose,
  onAssignAgent,
  onUpdateStatus
}) {
  const [selectedAgentId, setSelectedAgentId] =
    useState(
      verification.assignedAgent?.id || ""
    );

  const [correctionMessage, setCorrectionMessage] =
    useState("");

  const selectedAgent =
    agents.find(
      (agent) =>
        agent.id === selectedAgentId
    );

  return (
    <div
      className="verification-modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="verification-modal">
        <div className="verification-modal-header">
          <div>
            <p className="verification-eyebrow">
              Revisión de identidad
            </p>

            <h2>
              {verification.fullName}
            </h2>

            <p>
              {verification.id} ·{" "}
              {verification.documentNumber}
            </p>
          </div>

          <button
            className="verification-button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="verification-modal-content">
          <div className="verification-detail-grid">
            <Detail
              label="Correo"
              value={verification.email}
            />

            <Detail
              label="Teléfono"
              value={verification.phone}
            />

            <Detail
              label="Documento"
              value={verification.documentNumber}
            />

            <Detail
              label="Fecha de vencimiento"
              value={
                verification.documentExpirationDate
              }
            />

            <Detail
              label="Trust Score"
              value={`${verification.trustScore}/100`}
            />

            <Detail
              label="Solicitud de vendedor"
              value={
                verification.sellerRequest
                  ? "Sí"
                  : "No"
              }
            />
          </div>

          <div className="verification-documents-grid">
            <DocumentCard
              title="Foto de perfil"
              icon="👤"
            />

            <DocumentCard
              title="Cédula frontal"
              icon="🪪"
            />

            <DocumentCard
              title="Cédula trasera"
              icon="🪪"
            />
          </div>

          <div className="verification-comparison">
            <h3>
              Comparación de identidad
            </h3>

            <div className="verification-comparison-grid">
              <CheckItem
                label="Nombre coincide"
              />

              <CheckItem
                label="Número de cédula legible"
              />

              <CheckItem
                label="Documento vigente"
              />

              <CheckItem
                label="Fotografías claras"
              />

              <CheckItem
                label="Rostro coincide"
              />

              <CheckItem
                label="Sin alteraciones visibles"
              />
            </div>
          </div>

          <div className="verification-face-panel">
            <h3>
              Preparación para Face ID
            </h3>

            <p>
              Estado:{" "}
              <strong>
                {verification.faceVerification?.status}
              </strong>
            </p>

            <p>
              Coincidencia:{" "}
              <strong>
                {verification.faceVerification?.matchScore
                  ? `${verification.faceVerification.matchScore}%`
                  : "Pendiente"}
              </strong>
            </p>
          </div>

          {verification.issues?.length > 0 && (
            <div className="verification-issues">
              <h3>
                Correcciones actuales
              </h3>

              {verification.issues.map(
                (issue, index) => (
                  <div
                    key={`${issue.field}-${index}`}
                    className="verification-issue"
                  >
                    <strong>
                      {issue.field}
                    </strong>

                    <p>
                      {issue.message}
                    </p>
                  </div>
                )
              )}
            </div>
          )}

          <div className="verification-assignment">
            <h3>
              Agente responsable
            </h3>

            <div className="verification-assignment-row">
              <select
                className="verification-select"
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
                    {agent.name}
                  </option>
                ))}
              </select>

              <button
                className="verification-button verification-button-primary"
                disabled={
                  !selectedAgent ||
                  isSaving
                }
                onClick={() =>
                  onAssignAgent(
                    verification.id,
                    selectedAgent
                  )
                }
              >
                Asignar
              </button>
            </div>
          </div>

          <div className="verification-correction">
            <h3>
              Solicitar corrección
            </h3>

            <textarea
              placeholder="Ejemplo: La foto frontal está borrosa o el nombre no coincide..."
              value={correctionMessage}
              onChange={(event) =>
                setCorrectionMessage(
                  event.target.value
                )
              }
            />

            <button
              className="verification-button verification-button-warning"
              disabled={
                !correctionMessage.trim() ||
                isSaving
              }
              onClick={() =>
                onUpdateStatus(
                  verification.id,
                  "CHANGES_REQUIRED",
                  {
                    issues: [
                      ...(
                        verification.issues || []
                      ),
                      {
                        field: "GENERAL",
                        message:
                          correctionMessage.trim()
                      }
                    ]
                  }
                )
              }
            >
              Enviar corrección
            </button>
          </div>
        </div>

        <div className="verification-modal-actions">
          <button
            className="verification-button verification-button-primary"
            disabled={isSaving}
            onClick={() =>
              onUpdateStatus(
                verification.id,
                "UNDER_REVIEW"
              )
            }
          >
            Iniciar revisión
          </button>

          <button
            className="verification-button verification-button-success"
            disabled={isSaving}
            onClick={() =>
              onUpdateStatus(
                verification.id,
                "APPROVED",
                {
                  isVerified: true,
                  sellerEnabled:
                    verification.sellerRequest
                }
              )
            }
          >
            Aprobar identidad
          </button>

          <button
            className="verification-button verification-button-danger"
            disabled={isSaving}
            onClick={() =>
              onUpdateStatus(
                verification.id,
                "REJECTED"
              )
            }
          >
            Rechazar
          </button>

          <button
            className="verification-button"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentCard({
  title,
  icon
}) {
  return (
    <article className="verification-document-card">
      <div className="verification-document-preview">
        {icon}
      </div>

      <strong>{title}</strong>

      <button
        className="verification-button verification-button-small"
        onClick={() =>
          window.alert(
            `Abriendo ${title}`
          )
        }
      >
        Ampliar
      </button>
    </article>
  );
}

function CheckItem({
  label
}) {
  return (
    <label className="verification-check">
      <input type="checkbox" />
      {label}
    </label>
  );
}

function TrustScore({
  score
}) {
  return (
    <span
      className={`verification-trust ${
        score >= 70
          ? "trust-high"
          : score >= 50
          ? "trust-medium"
          : "trust-low"
      }`}
    >
      {score}/100
    </span>
  );
}

function StatusBadge({
  status
}) {
  return (
    <span
      className={`verification-badge status-${status}`}
    >
      {VERIFICATION_STATUS[status] || status}
    </span>
  );
}

function PriorityBadge({
  priority
}) {
  return (
    <span
      className={`verification-badge priority-${priority}`}
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
      className={`verification-badge severity-${severity}`}
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
    <div className="verification-detail">
      <span>{label}</span>
      <strong>
        {value || "No disponible"}
      </strong>
    </div>
  );
}

function buildKpis(kpis = {}) {
  return [
    {
      title: "Pendientes",
      value: kpis.pending || 0,
      detail: "Esperando revisión",
      icon: "⏳"
    },
    {
      title: "En revisión",
      value: kpis.underReview || 0,
      detail: "Con agente asignado",
      icon: "🔍"
    },
    {
      title: "Correcciones",
      value:
        kpis.changesRequired || 0,
      detail: "Esperando al usuario",
      icon: "📝"
    },
    {
      title: "Aprobadas hoy",
      value:
        kpis.approvedToday || 0,
      detail: "Identidades verificadas",
      icon: "✅"
    },
    {
      title: "Documentos vencidos",
      value:
        kpis.expiredDocuments || 0,
      detail: "Requieren actualización",
      icon: "⚠️"
    },
    {
      title: "Solicitudes vendedor",
      value:
        kpis.sellerRequests || 0,
      detail: "Pendientes de habilitar",
      icon: "🏪"
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
      pending:
        Number(source.kpis?.pending) || 0,

      underReview:
        Number(source.kpis?.underReview) || 0,

      changesRequired:
        Number(source.kpis?.changesRequired) || 0,

      approvedToday:
        Number(source.kpis?.approvedToday) || 0,

      rejectedToday:
        Number(source.kpis?.rejectedToday) || 0,

      expiredDocuments:
        Number(source.kpis?.expiredDocuments) || 0,

      sellerRequests:
        Number(source.kpis?.sellerRequests) || 0,

      approvalRate:
        Number(source.kpis?.approvalRate) || 0
    },

    verifications:
      Array.isArray(source.verifications)
        ? source.verifications
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
  * {
    box-sizing: border-box;
  }

  .verification-page,
  .verification-loading {
    min-height: 100vh;
    color: #f7f8ff;
    background:
      radial-gradient(
        circle at top right,
        rgba(117,77,255,.16),
        transparent 30%
      ),
      radial-gradient(
        circle at bottom left,
        rgba(40,214,255,.08),
        transparent 28%
      ),
      #050818;
    font-family:
      Inter,
      system-ui,
      sans-serif;
  }

  .verification-page {
    padding: 28px;
  }

  .verification-loading {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 16px;
    text-align: center;
  }

  .verification-loader {
    width: 48px;
    height: 48px;
    border: 4px solid #222b4d;
    border-top-color: #5ed9ff;
    border-radius: 50%;
    animation: verification-spin .8s linear infinite;
  }

  @keyframes verification-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .verification-container {
    width: min(1650px, 100%);
    margin: 0 auto;
  }

  .verification-header {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .verification-eyebrow {
    margin: 0 0 8px;
    color: #5ed9ff;
    font-size: 12px;
    font-weight: 850;
    letter-spacing: .16em;
    text-transform: uppercase;
  }

  .verification-title {
    margin: 0;
    font-size: clamp(30px, 4vw, 44px);
  }

  .verification-subtitle {
    max-width: 780px;
    margin: 12px 0 0;
    color: #929bbd;
    line-height: 1.6;
  }

  .verification-header-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .verification-button {
    min-height: 41px;
    border: 1px solid #252d4d;
    border-radius: 12px;
    padding: 10px 15px;
    color: #eef0ff;
    background: #0d1228;
    font-weight: 750;
    cursor: pointer;
  }

  .verification-button:disabled {
    cursor: not-allowed;
    opacity: .5;
  }

  .verification-button-primary {
    border-color: transparent;
    background:
      linear-gradient(
        135deg,
        #665cff,
        #d44edb
      );
  }

  .verification-button-success {
    color: #74eeb9;
    border-color: rgba(48,211,146,.35);
    background: rgba(48,211,146,.1);
  }

  .verification-button-warning {
    color: #ffd16c;
    border-color: rgba(255,177,64,.35);
    background: rgba(255,177,64,.1);
  }

  .verification-button-danger {
    color: #ff8298;
    border-color: rgba(255,77,109,.35);
    background: rgba(255,77,109,.1);
  }

  .verification-button-small {
    min-height: 35px;
    padding: 8px 12px;
    font-size: 11px;
  }

  .verification-demo-banner {
    margin-bottom: 18px;
    border: 1px solid rgba(255,196,76,.25);
    border-radius: 13px;
    padding: 13px 15px;
    color: #d8c58e;
    background: rgba(255,196,76,.07);
    font-size: 12px;
  }

  .verification-kpis {
    display: grid;
    grid-template-columns:
      repeat(6, minmax(0, 1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .verification-card {
    border: 1px solid #1d2545;
    border-radius: 18px;
    background:
      linear-gradient(
        145deg,
        rgba(16,21,45,.96),
        rgba(8,12,29,.96)
      );
  }

  .verification-kpi {
    padding: 18px;
  }

  .verification-kpi-icon {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border-radius: 13px;
    background: #171d3b;
    font-size: 20px;
  }

  .verification-kpi-title {
    margin: 15px 0 8px;
    color: #8f98ba;
    font-size: 12px;
  }

  .verification-kpi-value {
    margin: 0;
    font-size: 28px;
    font-weight: 850;
  }

  .verification-kpi-detail {
    margin: 7px 0 0;
    color: #687293;
    font-size: 11px;
  }

  .verification-main-grid {
    display: grid;
    grid-template-columns:
      minmax(0, 2fr)
      minmax(320px, .72fr);
    gap: 18px;
  }

  .verification-section {
    padding: 20px;
  }

  .verification-section-header {
    display: flex;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 16px;
  }

  .verification-section-title {
    margin: 0;
    font-size: 19px;
  }

  .verification-section-description {
    margin: 5px 0 0;
    color: #7781a4;
    font-size: 12px;
  }

  .verification-toolbar {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    margin-bottom: 16px;
  }

  .verification-input,
  .verification-select,
  .verification-correction textarea {
    border: 1px solid #222b4d;
    border-radius: 11px;
    color: #f1f3ff;
    background: #080d21;
    outline: none;
  }

  .verification-input,
  .verification-select {
    min-height: 42px;
    padding: 0 14px;
  }

  .verification-table-wrapper {
    overflow-x: auto;
    border: 1px solid #171f3d;
    border-radius: 14px;
  }

  .verification-table {
    width: 100%;
    min-width: 1200px;
    border-collapse: collapse;
  }

  .verification-table th {
    padding: 14px;
    color: #697395;
    background: #080d20;
    font-size: 10px;
    text-align: left;
  }

  .verification-table td {
    padding: 15px 14px;
    border-top: 1px solid #171e39;
    font-size: 12px;
  }

  .verification-table tbody tr {
    cursor: pointer;
  }

  .verification-table tbody tr:hover {
    background: rgba(109,93,252,.07);
  }

  .verification-primary-text,
  .verification-muted {
    display: block;
  }

  .verification-muted {
    margin-top: 5px;
    color: #717b9d;
    font-size: 10px;
  }

  .verification-badge,
  .verification-trust {
    display: inline-flex;
    border-radius: 999px;
    padding: 6px 9px;
    font-size: 9px;
    font-weight: 850;
  }

  .status-PENDING_REVIEW {
    color: #ffd66d;
    background: rgba(255,191,71,.12);
  }

  .status-UNDER_REVIEW {
    color: #a99cff;
    background: rgba(124,97,255,.14);
  }

  .status-CHANGES_REQUIRED {
    color: #ffc36a;
    background: rgba(255,166,61,.13);
  }

  .status-APPROVED {
    color: #6debb6;
    background: rgba(48,211,146,.12);
  }

  .status-REJECTED,
  .status-EXPIRED {
    color: #ff8198;
    background: rgba(255,77,109,.12);
  }

  .priority-CRITICAL,
  .severity-CRITICAL {
    color: #ff8198;
    background: rgba(255,77,109,.12);
  }

  .priority-HIGH,
  .severity-HIGH {
    color: #ffc36a;
    background: rgba(255,166,61,.13);
  }

  .priority-MEDIUM,
  .severity-MEDIUM {
    color: #a99cff;
    background: rgba(124,97,255,.14);
  }

  .priority-NORMAL {
    color: #6debb6;
    background: rgba(48,211,146,.12);
  }

  .trust-high {
    color: #6debb6;
    background: rgba(48,211,146,.12);
  }

  .trust-medium {
    color: #ffc36a;
    background: rgba(255,166,61,.13);
  }

  .trust-low {
    color: #ff8198;
    background: rgba(255,77,109,.12);
  }

  .verification-side-column {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .verification-alert,
  .verification-agent,
  .verification-activity {
    display: flex;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid #18203b;
  }

  .verification-alert-icon,
  .verification-avatar {
    display: grid;
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    place-items: center;
    border-radius: 12px;
    background: #171d38;
  }

  .verification-alert p,
  .verification-activity p {
    margin: 5px 0 8px;
    color: #727c9d;
    font-size: 11px;
  }

  .verification-activity span {
    color: #536080;
    font-size: 10px;
  }

  .verification-agent {
    align-items: center;
  }

  .verification-agent-info {
    flex: 1;
  }

  .verification-agent-info strong,
  .verification-agent-info span,
  .verification-agent-rate strong,
  .verification-agent-rate span {
    display: block;
  }

  .verification-agent-info span,
  .verification-agent-rate span {
    margin-top: 5px;
    color: #717b9d;
    font-size: 10px;
  }

  .verification-agent-rate {
    text-align: right;
  }

  .verification-progress {
    margin-top: 18px;
  }

  .verification-progress-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    color: #919abd;
    font-size: 11px;
  }

  .verification-progress-track {
    height: 8px;
    border-radius: 999px;
    background: #151b33;
    overflow: hidden;
  }

  .verification-progress-value {
    height: 100%;
    background:
      linear-gradient(
        90deg,
        #5ed9ff,
        #705bff,
        #ec54bd
      );
  }

  .verification-modal-backdrop {
    position: fixed;
    z-index: 1000;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(0,0,0,.76);
    backdrop-filter: blur(8px);
  }

  .verification-modal {
    width: min(1100px, 100%);
    max-height: 94vh;
    overflow-y: auto;
    border: 1px solid #283158;
    border-radius: 20px;
    background: #090e22;
  }

  .verification-modal-header {
    display: flex;
    justify-content: space-between;
    padding: 22px;
    border-bottom: 1px solid #1c2443;
  }

  .verification-modal-header h2,
  .verification-modal-header p {
    margin: 0;
  }

  .verification-modal-header p {
    margin-top: 7px;
    color: #7781a4;
  }

  .verification-modal-content {
    padding: 22px;
  }

  .verification-detail-grid {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .verification-detail,
  .verification-comparison,
  .verification-face-panel,
  .verification-issues,
  .verification-assignment,
  .verification-correction {
    border: 1px solid #1c2545;
    border-radius: 13px;
    padding: 14px;
    background: #0c1229;
  }

  .verification-detail span,
  .verification-detail strong {
    display: block;
  }

  .verification-detail span {
    margin-bottom: 7px;
    color: #6f799b;
    font-size: 10px;
    text-transform: uppercase;
  }

  .verification-documents-grid {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-top: 18px;
  }

  .verification-document-card {
    border: 1px solid #1c2545;
    border-radius: 14px;
    padding: 14px;
    background: #0b1126;
  }

  .verification-document-preview {
    display: grid;
    height: 150px;
    place-items: center;
    margin-bottom: 12px;
    border-radius: 12px;
    background: #171d38;
    font-size: 42px;
  }

  .verification-document-card strong {
    display: block;
    margin-bottom: 12px;
  }

  .verification-comparison,
  .verification-face-panel,
  .verification-issues,
  .verification-assignment,
  .verification-correction {
    margin-top: 18px;
  }

  .verification-comparison h3,
  .verification-face-panel h3,
  .verification-issues h3,
  .verification-assignment h3,
  .verification-correction h3 {
    margin-top: 0;
  }

  .verification-comparison-grid {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .verification-check {
    display: flex;
    align-items: center;
    gap: 9px;
    border: 1px solid #1c2545;
    border-radius: 11px;
    padding: 11px;
    background: #080e21;
    font-size: 12px;
  }

  .verification-issue {
    border-left: 3px solid #ffc36a;
    padding: 10px 12px;
    background: rgba(255,166,61,.08);
  }

  .verification-issue + .verification-issue {
    margin-top: 10px;
  }

  .verification-issue p {
    margin: 6px 0 0;
    color: #b5bcd3;
  }

  .verification-assignment-row {
    display: flex;
    gap: 10px;
  }

  .verification-assignment-row
  .verification-select {
    flex: 1;
  }

  .verification-correction textarea {
    width: 100%;
    min-height: 95px;
    resize: vertical;
    padding: 12px;
    font-family: inherit;
  }

  .verification-correction button {
    margin-top: 10px;
  }

  .verification-modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 20px 22px;
    border-top: 1px solid #1c2443;
  }

  @media (max-width: 1350px) {
    .verification-kpis {
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
    }

    .verification-main-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 850px) {
    .verification-page {
      padding: 18px 12px;
    }

    .verification-header {
      flex-direction: column;
    }

    .verification-toolbar,
    .verification-detail-grid,
    .verification-documents-grid,
    .verification-comparison-grid {
      grid-template-columns: 1fr;
    }

    .verification-assignment-row {
      flex-direction: column;
    }
  }

  @media (max-width: 520px) {
    .verification-kpis {
      grid-template-columns: 1fr;
    }
  }
`;

export default VerificationDashboard;
