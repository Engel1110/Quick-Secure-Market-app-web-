import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const initialOrders = [
  {
    id: "QSM-1048",
    product: "iPhone 15 Pro 256 GB",
    seller: "Carlos Martínez",
    received: "Hace 12 minutos",
    inspector: "Sin asignar",
    priority: "ALTA",
    status: "PENDIENTE"
  },
  {
    id: "QSM-1047",
    product: "Dell Latitude 5420",
    seller: "Ana Rodríguez",
    received: "Hace 35 minutos",
    inspector: "Luis Gómez",
    priority: "MEDIA",
    status: "EN_INSPECCION"
  },
  {
    id: "QSM-1046",
    product: "PlayStation 5 Slim",
    seller: "Pedro Jiménez",
    received: "Hace 1 hora",
    inspector: "María Pérez",
    priority: "ALTA",
    status: "EN_INSPECCION"
  },
  {
    id: "QSM-1045",
    product: "Samsung Galaxy S24 Ultra",
    seller: "Laura Méndez",
    received: "Hace 2 horas",
    inspector: "José Ramírez",
    priority: "NORMAL",
    status: "APROBADO"
  },
  {
    id: "QSM-1044",
    product: "MacBook Pro M3",
    seller: "Miguel Santos",
    received: "Hace 3 horas",
    inspector: "Claudia Reyes",
    priority: "CRITICA",
    status: "DETENIDO"
  }
];

const activity = [
  {
    title: "Producto recibido",
    description: "Orden QSM-1048 registrada en recepción.",
    time: "Hace 12 minutos",
    icon: "📦"
  },
  {
    title: "Inspección completada",
    description: "Samsung Galaxy S24 Ultra aprobado.",
    time: "Hace 28 minutos",
    icon: "✅"
  },
  {
    title: "Incidencia registrada",
    description: "IMEI inconsistente en MacBook Pro M3.",
    time: "Hace 43 minutos",
    icon: "⚠️"
  },
  {
    title: "Orden despachada",
    description: "Orden QSM-1038 entregada al área de Delivery.",
    time: "Hace 1 hora",
    icon: "🚚"
  }
];

const alerts = [
  {
    title: "2 órdenes detenidas",
    description: "Tienen más de 48 horas sin avanzar.",
    level: "ALTA"
  },
  {
    title: "3 identificadores inconsistentes",
    description: "IMEI o serial no coincide con el registro.",
    level: "CRITICA"
  },
  {
    title: "7 órdenes listas para despacho",
    description: "Esperando entrega al área de Delivery.",
    level: "MEDIA"
  }
];

const statusLabels = {
  PENDIENTE: "Pendiente",
  EN_INSPECCION: "En inspección",
  APROBADO: "Aprobado",
  DETENIDO: "Detenido"
};

function WarehouseDashboard() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("TODOS");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !normalizedSearch ||
        order.id.toLowerCase().includes(normalizedSearch) ||
        order.product.toLowerCase().includes(normalizedSearch) ||
        order.seller.toLowerCase().includes(normalizedSearch) ||
        order.inspector.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "TODOS" ||
        order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: newStatus,
              inspector:
                order.inspector === "Sin asignar"
                  ? "Engel Feliz"
                  : order.inspector
            }
          : order
      )
    );

    setSelectedOrder((currentOrder) =>
      currentOrder?.id === orderId
        ? {
            ...currentOrder,
            status: newStatus,
            inspector:
              currentOrder.inspector === "Sin asignar"
                ? "Engel Feliz"
                : currentOrder.inspector
          }
        : currentOrder
    );
  };

  const kpis = [
    {
      title: "Recibidos hoy",
      value: "48",
      detail: "+12 % desde ayer",
      icon: "📦",
      tone: "blue"
    },
    {
      title: "Pendientes",
      value: orders.filter((order) => order.status === "PENDIENTE").length,
      detail: "Esperando asignación",
      icon: "⏳",
      tone: "orange"
    },
    {
      title: "En inspección",
      value: orders.filter((order) => order.status === "EN_INSPECCION").length,
      detail: "Procesándose ahora",
      icon: "🔍",
      tone: "purple"
    },
    {
      title: "Aprobados",
      value: "32",
      detail: "Listos para continuar",
      icon: "✅",
      tone: "green"
    },
    {
      title: "Dañados",
      value: "7",
      detail: "Requieren revisión",
      icon: "🛠️",
      tone: "red"
    },
    {
      title: "Listos para despacho",
      value: "18",
      detail: "Pendientes de Delivery",
      icon: "🚚",
      tone: "cyan"
    }
  ];

  return (
    <div className="warehouse-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .warehouse-page {
          min-height: 100vh;
          padding: 28px;
          color: #f6f7ff;
          background:
            radial-gradient(circle at top right, rgba(112, 71, 255, 0.14), transparent 28%),
            radial-gradient(circle at bottom left, rgba(0, 210, 255, 0.08), transparent 30%),
            #050818;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .warehouse-container {
          width: min(1600px, 100%);
          margin: 0 auto;
        }

        .warehouse-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 24px;
        }

        .warehouse-eyebrow {
          margin: 0 0 8px;
          color: #5ed9ff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .warehouse-title {
          margin: 0;
          font-size: clamp(28px, 4vw, 44px);
          line-height: 1.05;
        }

        .warehouse-subtitle {
          max-width: 760px;
          margin: 12px 0 0;
          color: #929bbd;
          font-size: 15px;
          line-height: 1.6;
        }

        .warehouse-header-actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
        }

        .warehouse-button {
          border: 1px solid #252d4d;
          border-radius: 12px;
          padding: 11px 15px;
          color: #eef0ff;
          background: #0d1228;
          font-weight: 750;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .warehouse-button:hover {
          transform: translateY(-1px);
          border-color: #6f5cff;
          background: #151b38;
        }

        .warehouse-button-primary {
          border-color: transparent;
          background: linear-gradient(135deg, #6d5dfc, #d453d8);
        }

        .warehouse-button-danger {
          border-color: rgba(255, 94, 120, 0.4);
          color: #ff8da2;
          background: rgba(255, 77, 109, 0.08);
        }

        .warehouse-button-success {
          border-color: rgba(51, 214, 151, 0.35);
          color: #7df0bd;
          background: rgba(51, 214, 151, 0.08);
        }

        .warehouse-kpis {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .warehouse-card {
          border: 1px solid #1d2545;
          border-radius: 18px;
          background: linear-gradient(145deg, rgba(16, 21, 45, 0.96), rgba(8, 12, 29, 0.96));
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
        }

        .warehouse-kpi {
          min-height: 145px;
          padding: 18px;
        }

        .warehouse-kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .warehouse-kpi-icon {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border-radius: 13px;
          background: #171d3b;
          font-size: 20px;
        }

        .warehouse-kpi-title {
          margin: 15px 0 8px;
          color: #8f98ba;
          font-size: 12px;
          font-weight: 700;
        }

        .warehouse-kpi-value {
          margin: 0;
          font-size: 28px;
          font-weight: 850;
        }

        .warehouse-kpi-detail {
          margin: 7px 0 0;
          color: #687293;
          font-size: 11px;
        }

        .warehouse-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(320px, 0.75fr);
          gap: 18px;
        }

        .warehouse-section {
          padding: 20px;
        }

        .warehouse-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 16px;
        }

        .warehouse-section-title {
          margin: 0;
          font-size: 19px;
        }

        .warehouse-section-description {
          margin: 5px 0 0;
          color: #7781a4;
          font-size: 12px;
        }

        .warehouse-toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
        }

        .warehouse-input,
        .warehouse-select {
          min-height: 42px;
          border: 1px solid #222b4d;
          border-radius: 11px;
          outline: none;
          color: #f1f3ff;
          background: #080d21;
        }

        .warehouse-input {
          flex: 1;
          min-width: 230px;
          padding: 0 14px;
        }

        .warehouse-select {
          padding: 0 12px;
        }

        .warehouse-input:focus,
        .warehouse-select:focus {
          border-color: #7768ff;
        }

        .warehouse-table-wrapper {
          overflow-x: auto;
          border: 1px solid #171f3d;
          border-radius: 14px;
        }

        .warehouse-table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
        }

        .warehouse-table th {
          padding: 14px;
          color: #697395;
          background: #080d20;
          font-size: 11px;
          text-align: left;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .warehouse-table td {
          padding: 15px 14px;
          border-top: 1px solid #171e39;
          color: #dfe3f8;
          font-size: 12px;
        }

        .warehouse-table tbody tr {
          cursor: pointer;
          transition: 0.18s ease;
        }

        .warehouse-table tbody tr:hover {
          background: rgba(109, 93, 252, 0.07);
        }

        .warehouse-product-name {
          display: block;
          margin-bottom: 4px;
          color: #ffffff;
          font-weight: 800;
        }

        .warehouse-muted {
          color: #727c9d;
        }

        .warehouse-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 6px 9px;
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.04em;
        }

        .badge-pending {
          color: #ffd66d;
          background: rgba(255, 191, 71, 0.11);
        }

        .badge-inspection {
          color: #a99cff;
          background: rgba(124, 97, 255, 0.13);
        }

        .badge-approved {
          color: #6debb6;
          background: rgba(48, 211, 146, 0.12);
        }

        .badge-stopped {
          color: #ff8098;
          background: rgba(255, 77, 109, 0.12);
        }

        .priority-CRITICA,
        .priority-ALTA {
          color: #ff7891;
        }

        .priority-MEDIA {
          color: #ffd369;
        }

        .priority-NORMAL {
          color: #75dfb1;
        }

        .warehouse-side-column {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .warehouse-alert,
        .warehouse-activity {
          display: flex;
          gap: 12px;
          padding: 14px 0;
          border-bottom: 1px solid #18203b;
        }

        .warehouse-alert:last-child,
        .warehouse-activity:last-child {
          border-bottom: 0;
        }

        .warehouse-alert-mark,
        .warehouse-activity-icon {
          display: grid;
          flex: 0 0 38px;
          width: 38px;
          height: 38px;
          place-items: center;
          border-radius: 11px;
          background: #171d38;
        }

        .warehouse-alert-title,
        .warehouse-activity-title {
          margin: 0 0 5px;
          font-size: 12px;
          font-weight: 800;
        }

        .warehouse-alert-description,
        .warehouse-activity-description {
          margin: 0;
          color: #727c9d;
          font-size: 11px;
          line-height: 1.5;
        }

        .warehouse-activity-time {
          display: block;
          margin-top: 5px;
          color: #536080;
          font-size: 10px;
        }

        .warehouse-progress {
          margin-top: 18px;
        }

        .warehouse-progress-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          color: #919abd;
          font-size: 11px;
        }

        .warehouse-progress-track {
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: #151b33;
        }

        .warehouse-progress-value {
          width: 82%;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #5ed9ff, #705bff, #ec54bd);
        }

        .warehouse-empty {
          padding: 40px 20px;
          color: #717b9c;
          text-align: center;
        }

        .warehouse-modal-backdrop {
          position: fixed;
          z-index: 1000;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(8px);
        }

        .warehouse-modal {
          width: min(780px, 100%);
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid #283158;
          border-radius: 20px;
          background: #090e22;
          box-shadow: 0 30px 90px rgba(0, 0, 0, 0.55);
        }

        .warehouse-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 22px;
          border-bottom: 1px solid #1c2443;
        }

        .warehouse-modal-content {
          padding: 22px;
        }

        .warehouse-modal-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .warehouse-detail {
          padding: 14px;
          border: 1px solid #1c2545;
          border-radius: 13px;
          background: #0c1229;
        }

        .warehouse-detail-label {
          display: block;
          margin-bottom: 6px;
          color: #6f799b;
          font-size: 10px;
          text-transform: uppercase;
        }

        .warehouse-detail-value {
          color: #eef1ff;
          font-size: 13px;
          font-weight: 750;
        }

        .warehouse-checklist {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 20px;
        }

        .warehouse-check {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 12px;
          border: 1px solid #1d2647;
          border-radius: 12px;
          color: #c4cae1;
          background: #0b1126;
          font-size: 12px;
        }

        .warehouse-modal-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 20px 22px;
          border-top: 1px solid #1c2443;
        }

        @media (max-width: 1250px) {
          .warehouse-kpis {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .warehouse-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .warehouse-page {
            padding: 18px 12px;
          }

          .warehouse-header {
            flex-direction: column;
          }

          .warehouse-header-actions {
            justify-content: flex-start;
          }

          .warehouse-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .warehouse-modal-grid,
          .warehouse-checklist {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .warehouse-kpis {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="warehouse-container">
        <header className="warehouse-header">
          <div>
            <p className="warehouse-eyebrow">
              Operación de almacén
            </p>

            <h1 className="warehouse-title">
              Dashboard de Almacén
            </h1>

            <p className="warehouse-subtitle">
              Administra la recepción, inspección, inventario,
              incidencias, cadena de custodia y despacho de los
              productos procesados por QSM.
            </p>
          </div>

          <div className="warehouse-header-actions">
            <button
              type="button"
              className="warehouse-button"
              onClick={() => navigate("/admin/select-area")}
            >
              ← Todas las áreas
            </button>

            <button
              type="button"
              className="warehouse-button"
              onClick={() =>
                window.alert(
                  "El escáner QR e IMEI se conectará en la próxima fase."
                )
              }
            >
              Escanear QR / IMEI
            </button>

            <button
              type="button"
              className="warehouse-button warehouse-button-primary"
              onClick={() =>
                window.alert(
                  "Formulario de recepción listo para conectarse al backend."
                )
              }
            >
              + Registrar ingreso
            </button>
          </div>
        </header>

        <section className="warehouse-kpis">
          {kpis.map((kpi) => (
            <article
              key={kpi.title}
              className="warehouse-card warehouse-kpi"
            >
              <div className="warehouse-kpi-top">
                <div className="warehouse-kpi-icon">
                  {kpi.icon}
                </div>
              </div>

              <p className="warehouse-kpi-title">
                {kpi.title}
              </p>

              <p className="warehouse-kpi-value">
                {kpi.value}
              </p>

              <p className="warehouse-kpi-detail">
                {kpi.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="warehouse-grid">
          <article className="warehouse-card warehouse-section">
            <div className="warehouse-section-header">
              <div>
                <h2 className="warehouse-section-title">
                  Cola de trabajo
                </h2>

                <p className="warehouse-section-description">
                  Órdenes que requieren recepción, inspección o
                  resolución.
                </p>
              </div>

              <button
                type="button"
                className="warehouse-button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("TODOS");
                }}
              >
                Limpiar filtros
              </button>
            </div>

            <div className="warehouse-toolbar">
              <input
                className="warehouse-input"
                type="search"
                placeholder="Buscar orden, producto, vendedor o inspector..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              <select
                className="warehouse-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="TODOS">
                  Todos los estados
                </option>

                <option value="PENDIENTE">
                  Pendientes
                </option>

                <option value="EN_INSPECCION">
                  En inspección
                </option>

                <option value="APROBADO">
                  Aprobados
                </option>

                <option value="DETENIDO">
                  Detenidos
                </option>
              </select>
            </div>

            <div className="warehouse-table-wrapper">
              <table className="warehouse-table">
                <thead>
                  <tr>
                    <th>Orden / producto</th>
                    <th>Vendedor</th>
                    <th>Recibido</th>
                    <th>Inspector</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() =>
                        setSelectedOrder(order)
                      }
                    >
                      <td>
                        <strong className="warehouse-product-name">
                          {order.product}
                        </strong>

                        <span className="warehouse-muted">
                          {order.id}
                        </span>
                      </td>

                      <td>{order.seller}</td>

                      <td>{order.received}</td>

                      <td>{order.inspector}</td>

                      <td
                        className={`priority-${order.priority}`}
                      >
                        <strong>{order.priority}</strong>
                      </td>

                      <td>
                        <StatusBadge
                          status={order.status}
                        />
                      </td>

                      <td>
                        <button
                          type="button"
                          className="warehouse-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedOrder(order);
                          }}
                        >
                          Revisar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredOrders.length === 0 && (
                <div className="warehouse-empty">
                  No se encontraron órdenes con esos filtros.
                </div>
              )}
            </div>

            <div className="warehouse-progress">
              <div className="warehouse-progress-row">
                <span>Rendimiento diario</span>
                <strong>82 %</strong>
              </div>

              <div className="warehouse-progress-track">
                <div className="warehouse-progress-value" />
              </div>
            </div>
          </article>

          <aside className="warehouse-side-column">
            <article className="warehouse-card warehouse-section">
              <div className="warehouse-section-header">
                <div>
                  <h2 className="warehouse-section-title">
                    Alertas operativas
                  </h2>

                  <p className="warehouse-section-description">
                    Situaciones que requieren atención.
                  </p>
                </div>
              </div>

              {alerts.map((alert) => (
                <div
                  key={alert.title}
                  className="warehouse-alert"
                >
                  <div className="warehouse-alert-mark">
                    ⚠️
                  </div>

                  <div>
                    <p className="warehouse-alert-title">
                      {alert.title}
                    </p>

                    <p className="warehouse-alert-description">
                      {alert.description}
                    </p>

                    <span
                      className={`warehouse-badge ${
                        alert.level === "CRITICA"
                          ? "badge-stopped"
                          : alert.level === "ALTA"
                          ? "badge-pending"
                          : "badge-inspection"
                      }`}
                      style={{ marginTop: 8 }}
                    >
                      {alert.level}
                    </span>
                  </div>
                </div>
              ))}
            </article>

            <article className="warehouse-card warehouse-section">
              <div className="warehouse-section-header">
                <div>
                  <h2 className="warehouse-section-title">
                    Actividad reciente
                  </h2>

                  <p className="warehouse-section-description">
                    Movimientos realizados por el personal.
                  </p>
                </div>
              </div>

              {activity.map((item) => (
                <div
                  key={`${item.title}-${item.time}`}
                  className="warehouse-activity"
                >
                  <div className="warehouse-activity-icon">
                    {item.icon}
                  </div>

                  <div>
                    <p className="warehouse-activity-title">
                      {item.title}
                    </p>

                    <p className="warehouse-activity-description">
                      {item.description}
                    </p>

                    <span className="warehouse-activity-time">
                      {item.time}
                    </span>
                  </div>
                </div>
              ))}
            </article>
          </aside>
        </section>
      </div>

      {selectedOrder && (
        <div
          className="warehouse-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedOrder(null);
            }
          }}
        >
          <div className="warehouse-modal">
            <div className="warehouse-modal-header">
              <div>
                <p className="warehouse-eyebrow">
                  Inspección de producto
                </p>

                <h2
                  className="warehouse-section-title"
                  style={{ fontSize: 23 }}
                >
                  {selectedOrder.product}
                </h2>

                <p className="warehouse-section-description">
                  Orden {selectedOrder.id}
                </p>
              </div>

              <button
                type="button"
                className="warehouse-button"
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                ✕
              </button>
            </div>

            <div className="warehouse-modal-content">
              <div className="warehouse-modal-grid">
                <Detail
                  label="Vendedor"
                  value={selectedOrder.seller}
                />

                <Detail
                  label="Inspector"
                  value={selectedOrder.inspector}
                />

                <Detail
                  label="Fecha de recepción"
                  value={selectedOrder.received}
                />

                <Detail
                  label="Prioridad"
                  value={selectedOrder.priority}
                />

                <Detail
                  label="Estado"
                  value={
                    statusLabels[selectedOrder.status] ||
                    selectedOrder.status
                  }
                />

                <Detail
                  label="Cadena de custodia"
                  value="Recepción principal"
                />
              </div>

              <h3 style={{ margin: "24px 0 12px" }}>
                Lista de inspección
              </h3>

              <div className="warehouse-checklist">
                {[
                  "Caja y empaque",
                  "Número de serie",
                  "IMEI",
                  "Estado físico",
                  "Accesorios",
                  "Encendido",
                  "Pantalla",
                  "Audio y micrófono"
                ].map((label) => (
                  <label
                    key={label}
                    className="warehouse-check"
                  >
                    <input type="checkbox" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="warehouse-modal-actions">
              <button
                type="button"
                className="warehouse-button warehouse-button-primary"
                onClick={() =>
                  updateOrderStatus(
                    selectedOrder.id,
                    "EN_INSPECCION"
                  )
                }
              >
                Iniciar inspección
              </button>

              <button
                type="button"
                className="warehouse-button warehouse-button-success"
                onClick={() =>
                  updateOrderStatus(
                    selectedOrder.id,
                    "APROBADO"
                  )
                }
              >
                Aprobar producto
              </button>

              <button
                type="button"
                className="warehouse-button warehouse-button-danger"
                onClick={() =>
                  updateOrderStatus(
                    selectedOrder.id,
                    "DETENIDO"
                  )
                }
              >
                Detener orden
              </button>

              <button
                type="button"
                className="warehouse-button"
                onClick={() =>
                  setSelectedOrder(null)
                }
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const classes = {
    PENDIENTE: "badge-pending",
    EN_INSPECCION: "badge-inspection",
    APROBADO: "badge-approved",
    DETENIDO: "badge-stopped"
  };

  return (
    <span
      className={`warehouse-badge ${
        classes[status] || "badge-pending"
      }`}
    >
      {statusLabels[status] || status}
    </span>
  );
}

function Detail({ label, value }) {
  return (
    <div className="warehouse-detail">
      <span className="warehouse-detail-label">
        {label}
      </span>

      <span className="warehouse-detail-value">
        {value}
      </span>
    </div>
  );
}

export default WarehouseDashboard;
