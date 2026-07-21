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

const TRANSACTION_STATUS = {
  HELD: "En custodia",
  RELEASED: "Liberado",
  REFUNDED: "Reembolsado",
  PENDING: "Pendiente",
  FAILED: "Fallido",
  UNDER_REVIEW: "En revisión"
};

const TRANSACTION_TYPE = {
  ESCROW_HOLD: "Retención escrow",
  RELEASE: "Liberación",
  REFUND: "Reembolso",
  COMMISSION: "Comisión",
  PAYOUT: "Pago a vendedor",
  CHARGEBACK: "Contracargo"
};

const MOCK_DATA = {
  generatedAt: new Date().toISOString(),

  kpis: {
    escrowHeld: 1250000,
    releasedToday: 285000,
    refundsToday: 45000,
    commissionsToday: 28000,
    pendingPayouts: 175000,
    failedTransactions: 4,
    processedToday: 91,
    processedRate: 91
  },

  transactions: [
    {
      id: "FIN-6008",
      orderId: "QSM-1048",
      user: {
        id: "USR-101",
        name: "Carlos Martínez"
      },
      seller: {
        id: "USR-201",
        name: "Juan Pérez"
      },
      type: "ESCROW_HOLD",
      amount: 68500,
      currency: "RD$",
      status: "HELD",
      paymentMethod: "Tarjeta terminada en 4581",
      reference: "PAY-889231",
      createdAt: new Date().toISOString(),
      lastUpdate: "Hace 12 minutos",
      riskLevel: "MEDIUM",
      disputeId: null
    },
    {
      id: "FIN-6007",
      orderId: "QSM-1047",
      user: {
        id: "USR-102",
        name: "Ana Rodríguez"
      },
      seller: {
        id: "USR-202",
        name: "Miguel Santos"
      },
      type: "RELEASE",
      amount: 28500,
      currency: "RD$",
      status: "RELEASED",
      paymentMethod: "Escrow QSM",
      reference: "REL-778210",
      createdAt: new Date(
        Date.now() - 1000 * 60 * 28
      ).toISOString(),
      lastUpdate: "Hace 28 minutos",
      riskLevel: "LOW",
      disputeId: null
    },
    {
      id: "FIN-6006",
      orderId: "QSM-1046",
      user: {
        id: "USR-103",
        name: "Pedro Jiménez"
      },
      seller: {
        id: "USR-203",
        name: "María Pérez"
      },
      type: "REFUND",
      amount: 32000,
      currency: "RD$",
      status: "REFUNDED",
      paymentMethod: "Tarjeta terminada en 9920",
      reference: "REF-553820",
      createdAt: new Date(
        Date.now() - 1000 * 60 * 52
      ).toISOString(),
      lastUpdate: "Hace 52 minutos",
      riskLevel: "HIGH",
      disputeId: "DSP-3050"
    },
    {
      id: "FIN-6005",
      orderId: "QSM-1045",
      user: {
        id: "USR-104",
        name: "Laura Méndez"
      },
      seller: {
        id: "USR-204",
        name: "Claudia Reyes"
      },
      type: "PAYOUT",
      amount: 49000,
      currency: "RD$",
      status: "PENDING",
      paymentMethod: "Transferencia bancaria",
      reference: "OUT-119023",
      createdAt: new Date(
        Date.now() - 1000 * 60 * 90
      ).toISOString(),
      lastUpdate: "Hace 1 hora",
      riskLevel: "MEDIUM",
      disputeId: null
    },
    {
      id: "FIN-6004",
      orderId: "QSM-1044",
      user: {
        id: "USR-105",
        name: "Miguel Santos"
      },
      seller: {
        id: "USR-205",
        name: "Carlos Reyes"
      },
      type: "CHARGEBACK",
      amount: 125000,
      currency: "RD$",
      status: "UNDER_REVIEW",
      paymentMethod: "Tarjeta terminada en 1007",
      reference: "CHB-890144",
      createdAt: new Date(
        Date.now() - 1000 * 60 * 150
      ).toISOString(),
      lastUpdate: "Hace 2 horas",
      riskLevel: "CRITICAL",
      disputeId: "DSP-3048"
    }
  ],

  alerts: [
    {
      id: "ALT-001",
      title: "4 transacciones fallidas",
      description:
        "Requieren revisión del método de pago.",
      severity: "CRITICAL"
    },
    {
      id: "ALT-002",
      title: "RD$ 175,000 pendientes",
      description:
        "Pagos a vendedores esperando aprobación.",
      severity: "HIGH"
    },
    {
      id: "ALT-003",
      title: "2 contracargos abiertos",
      description:
        "Casos enviados a investigación financiera.",
      severity: "MEDIUM"
    }
  ],

  recentActivity: [
    {
      id: "ACT-001",
      title: "Fondos retenidos",
      description:
        "RD$ 68,500 colocados en escrow.",
      time: "Hace 12 minutos",
      icon: "🔒"
    },
    {
      id: "ACT-002",
      title: "Fondos liberados",
      description:
        "Orden QSM-1047 pagada al vendedor.",
      time: "Hace 28 minutos",
      icon: "✅"
    },
    {
      id: "ACT-003",
      title: "Reembolso procesado",
      description:
        "RD$ 32,000 devueltos al comprador.",
      time: "Hace 52 minutos",
      icon: "↩️"
    }
  ]
};

function FinanceDashboard() {
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

  const [typeFilter, setTypeFilter] =
    useState("ALL");

  const [selectedTransaction, setSelectedTransaction] =
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
        `${API_BASE_URL}/admin/finance/dashboard`,
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
          `No fue posible cargar Finanzas (${response.status}).`
        );
      }

      const result = await response.json();

      setDashboardData(
        normalizeResponse(result)
      );
    } catch (requestError) {
      console.error(
        "Error cargando Finanzas:",
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

  const filteredTransactions =
    useMemo(() => {
      const transactions =
        dashboardData?.transactions || [];

      const normalizedSearch =
        search.trim().toLowerCase();

      return transactions.filter((transaction) => {
        const matchesSearch =
          !normalizedSearch ||
          transaction.id
            ?.toLowerCase()
            .includes(normalizedSearch) ||
          transaction.orderId
            ?.toLowerCase()
            .includes(normalizedSearch) ||
          transaction.user?.name
            ?.toLowerCase()
            .includes(normalizedSearch) ||
          transaction.seller?.name
            ?.toLowerCase()
            .includes(normalizedSearch) ||
          transaction.reference
            ?.toLowerCase()
            .includes(normalizedSearch);

        const matchesStatus =
          statusFilter === "ALL" ||
          transaction.status === statusFilter;

        const matchesType =
          typeFilter === "ALL" ||
          transaction.type === typeFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesType
        );
      });
    }, [
      dashboardData,
      search,
      statusFilter,
      typeFilter
    ]);

  async function updateTransaction(
    transactionId,
    status,
    action
  ) {
    setIsSaving(true);

    try {
      if (!USE_MOCK_DATA) {
        const token =
          localStorage.getItem("qsm_admin_token") ||
          sessionStorage.getItem("qsm_admin_token");

        const response = await fetch(
          `${API_BASE_URL}/admin/finance/transactions/${transactionId}/status`,
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
              action
            })
          }
        );

        if (!response.ok) {
          throw new Error(
            "No fue posible actualizar la transacción."
          );
        }
      }

      setDashboardData((current) => ({
        ...current,
        transactions:
          current.transactions.map((transaction) =>
            transaction.id === transactionId
              ? {
                  ...transaction,
                  status,
                  lastUpdate: "Actualizado ahora"
                }
              : transaction
          )
      }));

      setSelectedTransaction((current) =>
        current?.id === transactionId
          ? {
              ...current,
              status,
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

  if (loading) {
    return (
      <div className="finance-loading">
        <style>{styles}</style>

        <div className="finance-loader" />

        <h2>
          Cargando Dashboard de Finanzas...
        </h2>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="finance-loading">
        <style>{styles}</style>

        <h2>
          No se pudo cargar Finanzas
        </h2>

        <p>{error}</p>

        <button
          className="finance-button finance-button-primary"
          onClick={loadDashboard}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="finance-page">
      <style>{styles}</style>

      <div className="finance-container">
        <header className="finance-header">
          <div>
            <p className="finance-eyebrow">
              Operación financiera
            </p>

            <h1 className="finance-title">
              Dashboard de Finanzas
            </h1>

            <p className="finance-subtitle">
              Gestiona pagos, fondos en escrow,
              liberaciones, reembolsos, comisiones,
              contracargos y pagos a vendedores.
            </p>
          </div>

          <div className="finance-header-actions">
            <button
              className="finance-button"
              onClick={() =>
                navigate("/admin/select-area")
              }
            >
              ← Todas las áreas
            </button>

            <button
              className="finance-button"
              onClick={loadDashboard}
            >
              ↻ Actualizar
            </button>

            <button
              className="finance-button finance-button-primary"
              onClick={() =>
                window.alert(
                  "El reporte se conectará a GET /api/admin/finance/export."
                )
              }
            >
              Exportar reporte
            </button>
          </div>
        </header>

        {error && (
          <div className="finance-demo-banner">
            <strong>Información:</strong>{" "}
            {error}
          </div>
        )}

        <section className="finance-kpis">
          {buildKpis(
            dashboardData.kpis
          ).map((kpi) => (
            <article
              key={kpi.title}
              className="finance-card finance-kpi"
            >
              <div className="finance-kpi-icon">
                {kpi.icon}
              </div>

              <p className="finance-kpi-title">
                {kpi.title}
              </p>

              <p className="finance-kpi-value">
                {kpi.value}
              </p>

              <p className="finance-kpi-detail">
                {kpi.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="finance-main-grid">
          <article className="finance-card finance-section">
            <div className="finance-section-header">
              <div>
                <h2 className="finance-section-title">
                  Movimientos financieros
                </h2>

                <p className="finance-section-description">
                  Transacciones, pagos y operaciones
                  procesadas por QSM.
                </p>
              </div>

              <button
                className="finance-button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setTypeFilter("ALL");
                }}
              >
                Limpiar filtros
              </button>
            </div>

            <div className="finance-toolbar">
              <input
                className="finance-input"
                placeholder="Buscar transacción, orden, usuario o referencia..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              <select
                className="finance-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="ALL">
                  Todos los estados
                </option>

                {Object.entries(
                  TRANSACTION_STATUS
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
                className="finance-select"
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value)
                }
              >
                <option value="ALL">
                  Todos los tipos
                </option>

                {Object.entries(
                  TRANSACTION_TYPE
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

            <div className="finance-table-wrapper">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Transacción</th>
                    <th>Orden</th>
                    <th>Comprador</th>
                    <th>Vendedor</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Método</th>
                    <th>Riesgo</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTransactions.map(
                    (transaction) => (
                      <tr
                        key={transaction.id}
                        onClick={() =>
                          setSelectedTransaction(
                            transaction
                          )
                        }
                      >
                        <td>
                          <strong className="finance-primary-text">
                            {transaction.id}
                          </strong>

                          <span className="finance-muted">
                            {transaction.reference}
                          </span>
                        </td>

                        <td>{transaction.orderId}</td>

                        <td>
                          {transaction.user?.name}
                        </td>

                        <td>
                          {transaction.seller?.name}
                        </td>

                        <td>
                          {TRANSACTION_TYPE[
                            transaction.type
                          ] || transaction.type}
                        </td>

                        <td>
                          <strong>
                            {formatCurrency(
                              transaction.amount,
                              transaction.currency
                            )}
                          </strong>
                        </td>

                        <td>
                          {transaction.paymentMethod}
                        </td>

                        <td>
                          <RiskBadge
                            risk={
                              transaction.riskLevel
                            }
                          />
                        </td>

                        <td>
                          <StatusBadge
                            status={
                              transaction.status
                            }
                          />
                        </td>

                        <td>
                          <button
                            className="finance-button finance-button-small"
                            onClick={(event) => {
                              event.stopPropagation();

                              setSelectedTransaction(
                                transaction
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

            <div className="finance-progress">
              <div className="finance-progress-row">
                <span>
                  Transacciones procesadas
                </span>

                <strong>
                  {dashboardData.kpis.processedRate}%
                </strong>
              </div>

              <div className="finance-progress-track">
                <div
                  className="finance-progress-value"
                  style={{
                    width: `${dashboardData.kpis.processedRate}%`
                  }}
                />
              </div>
            </div>
          </article>

          <aside className="finance-side-column">
            <article className="finance-card finance-section">
              <h2 className="finance-section-title">
                Alertas financieras
              </h2>

              {dashboardData.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="finance-alert"
                >
                  <div className="finance-alert-icon">
                    ⚠️
                  </div>

                  <div>
                    <strong>{alert.title}</strong>

                    <p>{alert.description}</p>

                    <RiskBadge
                      risk={alert.severity}
                    />
                  </div>
                </div>
              ))}
            </article>

            <article className="finance-card finance-section">
              <h2 className="finance-section-title">
                Actividad reciente
              </h2>

              {dashboardData.recentActivity.map(
                (activity) => (
                  <div
                    key={activity.id}
                    className="finance-activity"
                  >
                    <div className="finance-alert-icon">
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

      {selectedTransaction && (
        <FinanceModal
          transaction={
            selectedTransaction
          }
          isSaving={isSaving}
          onClose={() =>
            setSelectedTransaction(null)
          }
          onUpdate={updateTransaction}
        />
      )}
    </div>
  );
}

function FinanceModal({
  transaction,
  isSaving,
  onClose,
  onUpdate
}) {
  return (
    <div
      className="finance-modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="finance-modal">
        <div className="finance-modal-header">
          <div>
            <p className="finance-eyebrow">
              Detalle financiero
            </p>

            <h2>{transaction.id}</h2>

            <p>
              Orden {transaction.orderId}
            </p>
          </div>

          <button
            className="finance-button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="finance-modal-content">
          <div className="finance-detail-grid">
            <Detail
              label="Comprador"
              value={transaction.user?.name}
            />

            <Detail
              label="Vendedor"
              value={transaction.seller?.name}
            />

            <Detail
              label="Monto"
              value={formatCurrency(
                transaction.amount,
                transaction.currency
              )}
            />

            <Detail
              label="Tipo"
              value={
                TRANSACTION_TYPE[
                  transaction.type
                ]
              }
            />

            <Detail
              label="Estado"
              value={
                TRANSACTION_STATUS[
                  transaction.status
                ]
              }
            />

            <Detail
              label="Método de pago"
              value={
                transaction.paymentMethod
              }
            />

            <Detail
              label="Referencia"
              value={transaction.reference}
            />

            <Detail
              label="Riesgo"
              value={transaction.riskLevel}
            />

            <Detail
              label="Disputa"
              value={
                transaction.disputeId ||
                "Sin disputa"
              }
            />
          </div>

          <div className="finance-timeline">
            <h3>Movimiento financiero</h3>

            <TimelineItem
              active
              title="Pago recibido"
              description="El pago fue registrado por QSM."
            />

            <TimelineItem
              active={[
                "HELD",
                "RELEASED",
                "REFUNDED"
              ].includes(transaction.status)}
              title="Fondos en escrow"
              description="Los fondos fueron protegidos."
            />

            <TimelineItem
              active={
                transaction.status === "RELEASED"
              }
              title="Fondos liberados"
              description="El vendedor recibió el pago."
            />

            <TimelineItem
              active={
                transaction.status === "REFUNDED"
              }
              title="Reembolso"
              description="Los fondos fueron devueltos."
            />
          </div>
        </div>

        <div className="finance-modal-actions">
          <button
            className="finance-button finance-button-success"
            disabled={isSaving}
            onClick={() =>
              onUpdate(
                transaction.id,
                "RELEASED",
                "RELEASE_TO_SELLER"
              )
            }
          >
            Liberar fondos
          </button>

          <button
            className="finance-button finance-button-danger"
            disabled={isSaving}
            onClick={() =>
              onUpdate(
                transaction.id,
                "REFUNDED",
                "REFUND_BUYER"
              )
            }
          >
            Procesar reembolso
          </button>

          <button
            className="finance-button finance-button-warning"
            disabled={isSaving}
            onClick={() =>
              onUpdate(
                transaction.id,
                "UNDER_REVIEW",
                "SEND_TO_REVIEW"
              )
            }
          >
            Enviar a revisión
          </button>

          <button
            className="finance-button"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  active,
  title,
  description
}) {
  return (
    <div
      className={`finance-timeline-item ${
        active ? "timeline-active" : ""
      }`}
    >
      <div className="finance-timeline-dot" />

      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

function Detail({
  label,
  value
}) {
  return (
    <div className="finance-detail">
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
      className={`finance-badge status-${status}`}
    >
      {TRANSACTION_STATUS[status] || status}
    </span>
  );
}

function RiskBadge({
  risk
}) {
  return (
    <span
      className={`finance-badge risk-${risk}`}
    >
      {risk}
    </span>
  );
}

function buildKpis(kpis = {}) {
  return [
    {
      title: "Fondos en escrow",
      value: formatCurrency(
        kpis.escrowHeld
      ),
      detail: "Dinero en custodia",
      icon: "🔒"
    },
    {
      title: "Liberado hoy",
      value: formatCurrency(
        kpis.releasedToday
      ),
      detail: "Pagado a vendedores",
      icon: "✅"
    },
    {
      title: "Reembolsos",
      value: formatCurrency(
        kpis.refundsToday
      ),
      detail: "Devuelto a compradores",
      icon: "↩️"
    },
    {
      title: "Comisiones",
      value: formatCurrency(
        kpis.commissionsToday
      ),
      detail: "Ingresos de QSM",
      icon: "💰"
    },
    {
      title: "Pagos pendientes",
      value: formatCurrency(
        kpis.pendingPayouts
      ),
      detail: "Esperando aprobación",
      icon: "⏳"
    },
    {
      title: "Transacciones fallidas",
      value:
        kpis.failedTransactions || 0,
      detail: "Requieren revisión",
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
      escrowHeld:
        Number(source.kpis?.escrowHeld) || 0,

      releasedToday:
        Number(source.kpis?.releasedToday) || 0,

      refundsToday:
        Number(source.kpis?.refundsToday) || 0,

      commissionsToday:
        Number(source.kpis?.commissionsToday) || 0,

      pendingPayouts:
        Number(source.kpis?.pendingPayouts) || 0,

      failedTransactions:
        Number(source.kpis?.failedTransactions) || 0,

      processedToday:
        Number(source.kpis?.processedToday) || 0,

      processedRate:
        Number(source.kpis?.processedRate) || 0
    },

    transactions:
      Array.isArray(source.transactions)
        ? source.transactions
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

function formatCurrency(
  amount,
  currency = "RD$"
) {
  return `${currency} ${(
    Number(amount) || 0
  ).toLocaleString("es-DO")}`;
}

const styles = `
  * { box-sizing: border-box; }

  .finance-page,
  .finance-loading {
    min-height: 100vh;
    color: #f7f8ff;
    background:
      radial-gradient(circle at top right, rgba(117,77,255,.16), transparent 30%),
      radial-gradient(circle at bottom left, rgba(61,214,147,.07), transparent 28%),
      #050818;
    font-family: Inter, system-ui, sans-serif;
  }

  .finance-page { padding: 28px; }

  .finance-loading {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 16px;
    text-align: center;
  }

  .finance-loader {
    width: 48px;
    height: 48px;
    border: 4px solid #222b4d;
    border-top-color: #65e4ae;
    border-radius: 50%;
    animation: finance-spin .8s linear infinite;
  }

  @keyframes finance-spin {
    to { transform: rotate(360deg); }
  }

  .finance-container {
    width: min(1650px, 100%);
    margin: 0 auto;
  }

  .finance-header {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .finance-eyebrow {
    margin: 0 0 8px;
    color: #5ed9ff;
    font-size: 12px;
    font-weight: 850;
    letter-spacing: .16em;
    text-transform: uppercase;
  }

  .finance-title {
    margin: 0;
    font-size: clamp(30px, 4vw, 44px);
  }

  .finance-subtitle {
    max-width: 780px;
    margin: 12px 0 0;
    color: #929bbd;
    line-height: 1.6;
  }

  .finance-header-actions,
  .finance-modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .finance-button {
    min-height: 41px;
    border: 1px solid #252d4d;
    border-radius: 12px;
    padding: 10px 15px;
    color: #eef0ff;
    background: #0d1228;
    font-weight: 750;
    cursor: pointer;
  }

  .finance-button:disabled {
    opacity: .5;
    cursor: not-allowed;
  }

  .finance-button-primary {
    border-color: transparent;
    background: linear-gradient(135deg, #665cff, #d44edb);
  }

  .finance-button-success {
    color: #74eeb9;
    border-color: rgba(48,211,146,.35);
    background: rgba(48,211,146,.1);
  }

  .finance-button-warning {
    color: #ffd16c;
    border-color: rgba(255,177,64,.35);
    background: rgba(255,177,64,.1);
  }

  .finance-button-danger {
    color: #ff8298;
    border-color: rgba(255,77,109,.35);
    background: rgba(255,77,109,.1);
  }

  .finance-button-small {
    min-height: 35px;
    padding: 8px 12px;
    font-size: 11px;
  }

  .finance-demo-banner {
    margin-bottom: 18px;
    border: 1px solid rgba(255,196,76,.25);
    border-radius: 13px;
    padding: 13px 15px;
    color: #d8c58e;
    background: rgba(255,196,76,.07);
    font-size: 12px;
  }

  .finance-kpis {
    display: grid;
    grid-template-columns: repeat(6, minmax(0,1fr));
    gap: 14px;
    margin-bottom: 18px;
  }

  .finance-card {
    border: 1px solid #1d2545;
    border-radius: 18px;
    background: linear-gradient(145deg, rgba(16,21,45,.96), rgba(8,12,29,.96));
  }

  .finance-kpi,
  .finance-section {
    padding: 18px;
  }

  .finance-kpi-icon,
  .finance-alert-icon {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border-radius: 13px;
    background: #171d3b;
    font-size: 20px;
  }

  .finance-kpi-title {
    margin: 15px 0 8px;
    color: #8f98ba;
    font-size: 12px;
  }

  .finance-kpi-value {
    margin: 0;
    font-size: 25px;
    font-weight: 850;
  }

  .finance-kpi-detail {
    margin: 7px 0 0;
    color: #687293;
    font-size: 11px;
  }

  .finance-main-grid {
    display: grid;
    grid-template-columns: minmax(0,2fr) minmax(320px,.72fr);
    gap: 18px;
  }

  .finance-section-header {
    display: flex;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 16px;
  }

  .finance-section-title {
    margin: 0;
    font-size: 19px;
  }

  .finance-section-description {
    margin: 5px 0 0;
    color: #7781a4;
    font-size: 12px;
  }

  .finance-toolbar {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 10px;
    margin-bottom: 16px;
  }

  .finance-input,
  .finance-select {
    min-height: 42px;
    border: 1px solid #222b4d;
    border-radius: 11px;
    padding: 0 14px;
    color: #f1f3ff;
    background: #080d21;
    outline: none;
  }

  .finance-table-wrapper {
    overflow-x: auto;
    border: 1px solid #171f3d;
    border-radius: 14px;
  }

  .finance-table {
    width: 100%;
    min-width: 1300px;
    border-collapse: collapse;
  }

  .finance-table th {
    padding: 14px;
    color: #697395;
    background: #080d20;
    font-size: 10px;
    text-align: left;
  }

  .finance-table td {
    padding: 15px 14px;
    border-top: 1px solid #171e39;
    font-size: 12px;
  }

  .finance-table tbody tr {
    cursor: pointer;
  }

  .finance-table tbody tr:hover {
    background: rgba(109,93,252,.07);
  }

  .finance-primary-text,
  .finance-muted {
    display: block;
  }

  .finance-muted {
    margin-top: 5px;
    color: #717b9d;
    font-size: 10px;
  }

  .finance-badge {
    display: inline-flex;
    border-radius: 999px;
    padding: 6px 9px;
    font-size: 9px;
    font-weight: 850;
  }

  .status-HELD,
  .status-PENDING,
  .risk-MEDIUM {
    color: #ffc36a;
    background: rgba(255,166,61,.13);
  }

  .status-RELEASED,
  .risk-LOW {
    color: #6debb6;
    background: rgba(48,211,146,.12);
  }

  .status-REFUNDED {
    color: #74dcff;
    background: rgba(63,194,255,.13);
  }

  .status-FAILED,
  .risk-CRITICAL {
    color: #ff8198;
    background: rgba(255,77,109,.12);
  }

  .status-UNDER_REVIEW,
  .risk-HIGH {
    color: #a99cff;
    background: rgba(124,97,255,.14);
  }

  .finance-side-column {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .finance-alert,
  .finance-activity {
    display: flex;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid #18203b;
  }

  .finance-alert p,
  .finance-activity p {
    margin: 5px 0 8px;
    color: #727c9d;
    font-size: 11px;
  }

  .finance-activity span {
    color: #536080;
    font-size: 10px;
  }

  .finance-progress {
    margin-top: 18px;
  }

  .finance-progress-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    color: #919abd;
    font-size: 11px;
  }

  .finance-progress-track {
    height: 8px;
    border-radius: 999px;
    background: #151b33;
    overflow: hidden;
  }

  .finance-progress-value {
    height: 100%;
    background: linear-gradient(90deg, #5ed9ff, #705bff, #ec54bd);
  }

  .finance-modal-backdrop {
    position: fixed;
    z-index: 1000;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 20px;
    background: rgba(0,0,0,.76);
    backdrop-filter: blur(8px);
  }

  .finance-modal {
    width: min(1000px,100%);
    max-height: 94vh;
    overflow-y: auto;
    border: 1px solid #283158;
    border-radius: 20px;
    background: #090e22;
  }

  .finance-modal-header {
    display: flex;
    justify-content: space-between;
    padding: 22px;
    border-bottom: 1px solid #1c2443;
  }

  .finance-modal-header h2,
  .finance-modal-header p {
    margin: 0;
  }

  .finance-modal-content {
    padding: 22px;
  }

  .finance-detail-grid {
    display: grid;
    grid-template-columns: repeat(3,minmax(0,1fr));
    gap: 12px;
  }

  .finance-detail,
  .finance-timeline {
    border: 1px solid #1c2545;
    border-radius: 13px;
    padding: 14px;
    background: #0c1229;
  }

  .finance-detail span,
  .finance-detail strong {
    display: block;
  }

  .finance-detail span {
    margin-bottom: 7px;
    color: #6f799b;
    font-size: 10px;
    text-transform: uppercase;
  }

  .finance-timeline {
    margin-top: 18px;
  }

  .finance-timeline-item {
    display: flex;
    gap: 12px;
    padding: 10px 0;
    opacity: .4;
  }

  .finance-timeline-item.timeline-active {
    opacity: 1;
  }

  .finance-timeline-dot {
    width: 12px;
    height: 12px;
    margin-top: 3px;
    border-radius: 50%;
    background: #596486;
  }

  .timeline-active .finance-timeline-dot {
    background: #67e3b0;
  }

  .finance-timeline-item p {
    margin: 5px 0 0;
    color: #7781a4;
    font-size: 11px;
  }

  .finance-modal-actions {
    padding: 20px 22px;
    border-top: 1px solid #1c2443;
  }

  @media (max-width: 1350px) {
    .finance-kpis {
      grid-template-columns: repeat(3,minmax(0,1fr));
    }

    .finance-main-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 850px) {
    .finance-page {
      padding: 18px 12px;
    }

    .finance-header {
      flex-direction: column;
    }

    .finance-toolbar,
    .finance-detail-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 520px) {
    .finance-kpis {
      grid-template-columns: 1fr;
    }
  }
`;

export default FinanceDashboard;
