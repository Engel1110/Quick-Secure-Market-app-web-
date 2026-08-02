import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import api from "../../../api/axios";

import "./adminDashboard.css";

const EMPTY_DATA = {
  generatedAt: "",
  metrics: [],
  orderStatusData: [],
  recentOrders: [],
  recentActivity: [],
  alerts: [],
  departments: []
};

const STATUS_LABELS = {
  PENDING: "Pendiente",
  PROCESSING: "En proceso",
  PAID: "Pagada",
  HELD: "En custodia",
  WAITING_FOR_SELLER:
    "Esperando vendedor",
  WAITING_WAREHOUSE:
    "Esperando almacen",
  RECEIVED_AT_WAREHOUSE:
    "Recibida en almacen",
  INSPECTION: "En inspeccion",
  UNDER_INSPECTION:
    "En inspeccion",
  APPROVED: "Aprobada",
  READY_FOR_PICKUP:
    "Lista para recoger",
  READY_FOR_DELIVERY:
    "Lista para Delivery",
  ASSIGNED: "Asignada",
  PICKED_UP: "Recogida",
  OUT_FOR_DELIVERY:
    "En camino",
  IN_TRANSIT: "En ruta",
  WAITING_PIN: "Esperando PIN",
  DELIVERED: "Entregada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  REJECTED: "Rechazada",
  REFUNDED: "Reembolsada"
};

function formatNumber(value) {
  return Number(value || 0)
    .toLocaleString("es-DO");
}

function formatMoney(value) {
  return new Intl.NumberFormat(
    "es-DO",
    {
      style: "currency",
      currency: "DOP",
      maximumFractionDigits: 0
    }
  ).format(
    Number(value || 0)
  );
}

function formatDate(value) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat(
    "es-DO",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  ).format(
    new Date(value)
  );
}

function getCurrentAdminUser() {
  const candidates = [
    localStorage.getItem(
      "qsm_admin_user"
    ),
    sessionStorage.getItem(
      "qsm_admin_user"
    ),
    localStorage.getItem(
      "adminUser"
    )
  ];

  for (const candidate of candidates) {
    try {
      const parsed =
        JSON.parse(
          candidate || "null"
        );

      if (parsed) {
        return parsed;
      }
    } catch {
      // Ignorar almacenamiento invalido.
    }
  }

  return {
    firstName: "Administrador",
    lastName: "QSM"
  };
}

export default function AdminDashboard() {
  const navigate =
    useNavigate();

  const currentUser =
    useMemo(
      getCurrentAdminUser,
      []
    );

  const [
    data,
    setData
  ] = useState(
    EMPTY_DATA
  );

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    error,
    setError
  ] = useState("");

  const loadDashboard =
    useCallback(
      async (
        mainLoad = true
      ) => {
        try {
          mainLoad
            ? setLoading(true)
            : setRefreshing(true);

          setError("");

          const response =
            await api.get(
              "/admin/dashboard",
              {
                adminMode: true
              }
            );

          const payload =
            response?.data?.data ||
            response?.data ||
            {};

          setData({
            ...EMPTY_DATA,
            ...payload,
            metrics:
              Array.isArray(
                payload.metrics
              )
                ? payload.metrics
                : [],
            orderStatusData:
              Array.isArray(
                payload.orderStatusData
              )
                ? payload.orderStatusData
                : [],
            recentOrders:
              Array.isArray(
                payload.recentOrders
              )
                ? payload.recentOrders
                : [],
            recentActivity:
              Array.isArray(
                payload.recentActivity
              )
                ? payload.recentActivity
                : [],
            alerts:
              Array.isArray(
                payload.alerts
              )
                ? payload.alerts
                : [],
            departments:
              Array.isArray(
                payload.departments
              )
                ? payload.departments
                : []
          });
        } catch (requestError) {
          console.error(
            "Error cargando Dashboard real:",
            requestError
          );

          setData(
            EMPTY_DATA
          );

          setError(
            requestError?.response
              ?.data?.message ||
            requestError?.message ||
            "No se pudo cargar el Dashboard."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadDashboard(true);
  }, [
    loadDashboard
  ]);

  if (loading) {
    return (
      <main className="qsm-real-dashboard-loading">
        <div className="qsm-real-dashboard-spinner" />

        <h2>
          Cargando datos reales...
        </h2>
      </main>
    );
  }

  return (
    <main className="qsm-real-dashboard">
      <style>{realDashboardStyles}</style>

      <header className="qsm-real-dashboard-header">
        <div>
          <span>
            CENTRO DE OPERACIONES
          </span>

          <h1>
            Bienvenido,{" "}
            {currentUser?.firstName ||
              "Administrador"}
          </h1>

          <p>
            Informacion real registrada en QSM.
            Las secciones sin registros muestran
            cero o un estado vacio.
          </p>
        </div>

        <div className="qsm-real-dashboard-actions">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/select-area"
              )
            }
          >
            Cambiar de area
          </button>

          <button
            type="button"
            className="is-primary"
            disabled={refreshing}
            onClick={() =>
              loadDashboard(false)
            }
          >
            {refreshing
              ? "Actualizando..."
              : "Actualizar datos"}
          </button>
        </div>
      </header>

      {error && (
        <section className="qsm-real-error">
          <strong>
            No se pudieron cargar los datos.
          </strong>

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              loadDashboard(false)
            }
          >
            Reintentar
          </button>
        </section>
      )}

      <section className="qsm-real-metrics">
        {data.metrics.map(
          (metric) => (
            <article
              key={metric.id}
              className={
                "qsm-real-card qsm-real-metric tone-" +
                metric.color
              }
            >
              <span className="qsm-real-metric-icon">
                {metric.icon}
              </span>

              <small>
                {metric.label}
              </small>

              <strong>
                {metric.money
                  ? formatMoney(
                      metric.value
                    )
                  : formatNumber(
                      metric.value
                    )}
              </strong>

              <p>
                {metric.description}
              </p>
            </article>
          )
        )}

        {data.metrics.length ===
          0 && (
          <EmptyBlock
            text="Sin metricas disponibles."
          />
        )}
      </section>

      <section className="qsm-real-grid qsm-real-grid-two">
        <article className="qsm-real-card qsm-real-section">
          <SectionHeader
            eyebrow="DATOS REALES"
            title="Ordenes por estado"
            description="Distribucion calculada desde las ordenes registradas."
          />

          {data.orderStatusData.length >
          0 ? (
            <div className="qsm-real-status-list">
              {data.orderStatusData.map(
                (item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() =>
                      navigate(
                        "/admin/orders?status=" +
                          encodeURIComponent(
                            item.status
                          )
                      )
                    }
                  >
                    <span>
                      {STATUS_LABELS[
                        item.status
                      ] ||
                        item.label}
                    </span>

                    <strong>
                      {formatNumber(
                        item.value
                      )}
                    </strong>
                  </button>
                )
              )}
            </div>
          ) : (
            <EmptyBlock
              text="Todavia no existen ordenes."
            />
          )}
        </article>

        <article className="qsm-real-card qsm-real-section">
          <SectionHeader
            eyebrow="ATENCION"
            title="Alertas reales"
            description="Solo aparecen alertas calculadas desde registros existentes."
          />

          {data.alerts.length >
          0 ? (
            <div className="qsm-real-alert-list">
              {data.alerts.map(
                (alert) => (
                  <button
                    type="button"
                    key={alert.id}
                    className={
                      "level-" +
                      alert.level
                    }
                    onClick={() =>
                      navigate(
                        alert.route
                      )
                    }
                  >
                    <span>
                      {alert.icon}
                    </span>

                    <div>
                      <strong>
                        {alert.title}
                      </strong>

                      <small>
                        {alert.description}
                      </small>
                    </div>
                  </button>
                )
              )}
            </div>
          ) : (
            <EmptyBlock
              text="No existen alertas pendientes."
            />
          )}
        </article>
      </section>

      <section className="qsm-real-card qsm-real-section">
        <SectionHeader
          eyebrow="OPERACION GENERAL"
          title="Estado de departamentos"
          description="Metricas reales de cada area disponible."
        />

        <div className="qsm-real-departments">
          {data.departments.map(
            (department) => (
              <button
                type="button"
                key={department.id}
                className={
                  "qsm-real-department status-" +
                  department.status
                }
                onClick={() =>
                  navigate(
                    department.route
                  )
                }
              >
                <div>
                  <strong>
                    {department.name}
                  </strong>

                  <span>
                    Abrir area
                  </span>
                </div>

                <div className="qsm-real-department-metrics">
                  {department.metrics.map(
                    (metric) => (
                      <span
                        key={
                          metric.label
                        }
                      >
                        <small>
                          {metric.label}
                        </small>

                        <b>
                          {department.money
                            ? formatMoney(
                                metric.value
                              )
                            : formatNumber(
                                metric.value
                              )}
                        </b>
                      </span>
                    )
                  )}
                </div>
              </button>
            )
          )}
        </div>
      </section>

      <section className="qsm-real-grid qsm-real-grid-two">
        <article className="qsm-real-card qsm-real-section">
          <SectionHeader
            eyebrow="OPERACIONES"
            title="Ordenes recientes"
            description="Ultimas ordenes registradas en la base de datos."
          />

          {data.recentOrders.length >
          0 ? (
            <div className="qsm-real-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Producto</th>
                    <th>Comprador</th>
                    <th>Vendedor</th>
                    <th>Monto</th>
                    <th>Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {data.recentOrders.map(
                    (order) => (
                      <tr
                        key={order.id}
                      >
                        <td>
                          <strong>
                            {order.orderCode}
                          </strong>

                          <small>
                            {formatDate(
                              order.createdAt
                            )}
                          </small>
                        </td>

                        <td>
                          {order.product}
                        </td>

                        <td>
                          {order.buyer ||
                            "Sin datos"}
                        </td>

                        <td>
                          {order.seller ||
                            "Sin datos"}
                        </td>

                        <td>
                          {formatMoney(
                            order.amount
                          )}
                        </td>

                        <td>
                          <span className="qsm-real-status">
                            {STATUS_LABELS[
                              order.status
                            ] ||
                              order.status}
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyBlock
              text="Todavia no existen ordenes registradas."
            />
          )}
        </article>

        <article className="qsm-real-card qsm-real-section">
          <SectionHeader
            eyebrow="AUDITORIA"
            title="Actividad reciente"
            description="Eventos reales guardados en el registro de auditoria."
          />

          {data.recentActivity.length >
          0 ? (
            <div className="qsm-real-activity">
              {data.recentActivity.map(
                (event) => (
                  <div
                    key={event.id}
                  >
                    <span>
                      {event.module
                        ?.slice(0, 1) ||
                        "Q"}
                    </span>

                    <div>
                      <strong>
                        {event.title}
                      </strong>

                      <p>
                        {event.description}
                      </p>

                      <small>
                        {event.actor}
                        {" - "}
                        {formatDate(
                          event.createdAt
                        )}
                      </small>
                    </div>
                  </div>
                )
              )}
            </div>
          ) : (
            <EmptyBlock
              text="Sin actividad de auditoria disponible."
            />
          )}
        </article>
      </section>

      <footer className="qsm-real-footer">
        <span>
          Fuente: PostgreSQL / Supabase
        </span>

        <span>
          Actualizado:{" "}
          {formatDate(
            data.generatedAt
          )}
        </span>
      </footer>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description
}) {
  return (
    <div className="qsm-real-section-header">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function EmptyBlock({
  text
}) {
  return (
    <div className="qsm-real-empty">
      <strong>
        Sin datos disponibles
      </strong>

      <span>{text}</span>
    </div>
  );
}

const realDashboardStyles = `
.qsm-real-dashboard,
.qsm-real-dashboard-loading {
  min-height: 100%;
  color: #f8fafc;
}

.qsm-real-dashboard {
  width: min(1700px, 100%);
  margin: 0 auto;
  padding: 28px;
}

.qsm-real-dashboard-loading {
  display: grid;
  place-content: center;
  gap: 12px;
  text-align: center;
}

.qsm-real-dashboard-spinner {
  width: 42px;
  height: 42px;
  margin: auto;
  border: 3px solid rgba(148,163,184,.18);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: qsm-real-spin .8s linear infinite;
}

@keyframes qsm-real-spin {
  to { transform: rotate(360deg); }
}

.qsm-real-dashboard-header {
  display: flex;
  justify-content: space-between;
  gap: 22px;
  margin-bottom: 18px;
}

.qsm-real-dashboard-header > div:first-child > span,
.qsm-real-section-header > span {
  color: #38bdf8;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .15em;
}

.qsm-real-dashboard-header h1 {
  margin: 6px 0;
  font-size: clamp(28px, 4vw, 42px);
}

.qsm-real-dashboard-header p,
.qsm-real-section-header p,
.qsm-real-metric p,
.qsm-real-empty span {
  color: #94a3b8;
}

.qsm-real-dashboard-actions {
  display: flex;
  gap: 9px;
  align-items: flex-start;
}

.qsm-real-dashboard button {
  min-height: 40px;
  padding: 0 13px;
  border: 1px solid rgba(148,163,184,.18);
  border-radius: 11px;
  background: rgba(15,23,42,.8);
  color: #f8fafc;
  cursor: pointer;
}

.qsm-real-dashboard button.is-primary {
  border-color: transparent;
  background: linear-gradient(135deg,#2563eb,#7c3aed);
}

.qsm-real-error {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 13px;
  border: 1px solid rgba(239,68,68,.32);
  border-radius: 13px;
  background: rgba(239,68,68,.08);
  color: #fecaca;
}

.qsm-real-error span {
  flex: 1;
}

.qsm-real-card {
  border: 1px solid rgba(148,163,184,.14);
  border-radius: 18px;
  background: rgba(15,23,42,.72);
  box-shadow: 0 16px 45px rgba(0,0,0,.15);
}

.qsm-real-metrics {
  display: grid;
  grid-template-columns: repeat(4,minmax(0,1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.qsm-real-metric {
  position: relative;
  min-height: 170px;
  padding: 18px;
  overflow: hidden;
}

.qsm-real-metric::after {
  content: "";
  position: absolute;
  right: -30px;
  bottom: -45px;
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: currentColor;
  opacity: .08;
}

.qsm-real-metric-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  border-radius: 11px;
  background: rgba(255,255,255,.08);
  font-weight: 950;
}

.qsm-real-metric small {
  color: #94a3b8;
  font-weight: 800;
}

.qsm-real-metric strong {
  display: block;
  margin: 6px 0;
  font-size: clamp(24px,3vw,35px);
}

.tone-purple { color: #c4b5fd; }
.tone-blue { color: #7dd3fc; }
.tone-green { color: #86efac; }
.tone-red { color: #fca5a5; }

.qsm-real-grid {
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
}

.qsm-real-grid-two {
  grid-template-columns: repeat(2,minmax(0,1fr));
}

.qsm-real-section {
  padding: 18px;
  margin-bottom: 14px;
}

.qsm-real-section-header {
  margin-bottom: 15px;
}

.qsm-real-section-header h2 {
  margin: 5px 0 3px;
  font-size: 19px;
}

.qsm-real-section-header p {
  margin: 0;
}

.qsm-real-status-list,
.qsm-real-alert-list,
.qsm-real-activity {
  display: grid;
  gap: 8px;
}

.qsm-real-status-list button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.qsm-real-status-list strong {
  font-size: 18px;
}

.qsm-real-alert-list button {
  display: grid;
  grid-template-columns: 35px 1fr;
  gap: 10px;
  width: 100%;
  padding: 12px;
  text-align: left;
}

.qsm-real-alert-list button > span {
  width: 35px;
  height: 35px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(239,68,68,.12);
  font-weight: 950;
}

.qsm-real-alert-list button div {
  display: grid;
  gap: 3px;
}

.qsm-real-alert-list small {
  color: #94a3b8;
}

.qsm-real-departments {
  display: grid;
  grid-template-columns: repeat(3,minmax(0,1fr));
  gap: 10px;
}

.qsm-real-department {
  display: grid;
  gap: 14px;
  padding: 15px !important;
  text-align: left;
}

.qsm-real-department > div:first-child {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.qsm-real-department > div:first-child span {
  color: #7dd3fc;
  font-size: 10px;
}

.qsm-real-department.status-danger {
  border-color: rgba(239,68,68,.35);
}

.qsm-real-department.status-warning {
  border-color: rgba(245,158,11,.35);
}

.qsm-real-department-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.qsm-real-department-metrics > span {
  min-width: 90px;
  padding: 8px;
  border-radius: 9px;
  background: rgba(2,6,23,.32);
}

.qsm-real-department-metrics small,
.qsm-real-department-metrics b {
  display: block;
}

.qsm-real-department-metrics small {
  color: #94a3b8;
  font-size: 9px;
}

.qsm-real-table-wrap {
  overflow: auto;
}

.qsm-real-table-wrap table {
  width: 100%;
  min-width: 780px;
  border-collapse: collapse;
}

.qsm-real-table-wrap th,
.qsm-real-table-wrap td {
  padding: 11px;
  border-bottom: 1px solid rgba(148,163,184,.1);
  text-align: left;
  font-size: 11px;
}

.qsm-real-table-wrap th {
  color: #94a3b8;
  font-size: 9px;
  letter-spacing: .08em;
}

.qsm-real-table-wrap td small {
  display: block;
  margin-top: 4px;
  color: #64748b;
}

.qsm-real-status {
  display: inline-flex;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(56,189,248,.12);
  color: #bae6fd;
  font-size: 9px;
  font-weight: 850;
}

.qsm-real-activity > div {
  display: grid;
  grid-template-columns: 35px 1fr;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148,163,184,.1);
}

.qsm-real-activity > div > span {
  width: 35px;
  height: 35px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(124,58,237,.14);
  color: #ddd6fe;
  font-weight: 950;
}

.qsm-real-activity p {
  margin: 3px 0;
  color: #cbd5e1;
  font-size: 11px;
}

.qsm-real-activity small {
  color: #64748b;
}

.qsm-real-empty {
  min-height: 120px;
  display: grid;
  place-content: center;
  gap: 5px;
  padding: 20px;
  text-align: center;
}

.qsm-real-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 2px 30px;
  color: #64748b;
  font-size: 10px;
}

@media (max-width: 1100px) {
  .qsm-real-metrics,
  .qsm-real-departments {
    grid-template-columns: repeat(2,minmax(0,1fr));
  }

  .qsm-real-grid-two {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .qsm-real-dashboard {
    padding: 15px;
  }

  .qsm-real-dashboard-header {
    flex-direction: column;
  }

  .qsm-real-dashboard-actions {
    width: 100%;
  }

  .qsm-real-dashboard-actions button {
    flex: 1;
  }

  .qsm-real-metrics,
  .qsm-real-departments {
    grid-template-columns: 1fr;
  }

  .qsm-real-error {
    align-items: flex-start;
    flex-direction: column;
  }

  .qsm-real-footer {
    flex-direction: column;
  }
}
`;
