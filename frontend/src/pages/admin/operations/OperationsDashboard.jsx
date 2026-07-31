import { API_BASE_URL as QSM_RUNTIME_API_URL } from "../../../config/runtime";
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import { useNavigate } from "react-router-dom";
import "./OperationsDashboard.css";

const API_BASE_URL =
  QSM_RUNTIME_API_URL;

const CONFIG = {
  warehouse: {
    eyebrow: "OPERACIÓN DE ALMACÉN",
    title: "Dashboard de Almacén",
    description:
      "Recepción, inspección, custodia y despacho de productos procesados por QSM.",
    empty:
      "Todavía no existen órdenes dentro del flujo real de Almacén."
  },

  delivery: {
    eyebrow: "OPERACIÓN DE ENTREGAS",
    title: "Dashboard de Delivery",
    description:
      "Asignación, recogida, seguimiento, entrega y validación mediante PIN QSM.",
    empty:
      "Todavía no existen órdenes dentro del flujo real de Delivery."
  }
};

const STATUS_LABELS = {
  PENDING: "Pendiente de recepción",
  RECEIVED: "Recibido",
  INSPECTION: "En inspección",
  APPROVED: "Aprobado",
  READY_FOR_PICKUP: "Listo para despacho",
  HELD: "Detenido",
  REJECTED: "Rechazado",

  PENDING_ASSIGNMENT: "Sin asignar",
  ASSIGNED: "Asignado",
  PICKED_UP: "Producto recogido",
  IN_TRANSIT: "En ruta",
  WAITING_PIN: "Esperando PIN",
  DELIVERED: "Entregado",
  FAILED: "Entrega fallida",
  DELAYED: "Retrasado"
};

const ACTION_LABELS = {
  RECEIVE: "Registrar recepción",
  START_INSPECTION: "Iniciar inspección",
  APPROVE: "Aprobar inspección",
  HOLD: "Detener producto",
  READY_FOR_DELIVERY: "Enviar a Delivery",

  ASSIGN_SELF: "Asignarme entrega",
  PICKUP: "Confirmar recogida",
  OUT_FOR_DELIVERY: "Iniciar recorrido",
  VERIFY_PIN: "Validar PIN y entregar",
  FAIL: "Registrar entrega fallida"
};

function getToken() {
  return (
    localStorage.getItem("qsm_admin_token") ||
    sessionStorage.getItem("qsm_admin_token") ||
    ""
  );
}

function getActions(area, status) {
  if (area === "warehouse") {
    const actions = {
      PENDING: ["RECEIVE"],
      RECEIVED: ["START_INSPECTION"],
      INSPECTION: ["APPROVE", "HOLD"],
      APPROVED: ["READY_FOR_DELIVERY", "HOLD"]
    };

    return actions[status] || [];
  }

  const actions = {
    PENDING_ASSIGNMENT: ["ASSIGN_SELF"],
    ASSIGNED: ["PICKUP", "FAIL"],
    PICKED_UP: ["OUT_FOR_DELIVERY", "FAIL"],
    IN_TRANSIT: ["VERIFY_PIN", "FAIL"],
    WAITING_PIN: ["VERIFY_PIN", "FAIL"],
    FAILED: ["ASSIGN_SELF"]
  };

  return actions[status] || [];
}

function OperationsDashboard({ area }) {
  const navigate = useNavigate();
  const config = CONFIG[area];

  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selected, setSelected] = useState(null);
  const [selectedAction, setSelectedAction] =
    useState("");

  const [notes, setNotes] = useState("");
  const [pickupAddress, setPickupAddress] =
    useState("");

  const [deliveryAddress, setDeliveryAddress] =
    useState("");

  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] =
    useState(false);

  const loadDashboard =
    useCallback(async (mainLoad = true) => {
      try {
        mainLoad
          ? setLoading(true)
          : setRefreshing(true);

        setError("");

        const response = await fetch(
          `${API_BASE_URL}/admin/${area}/dashboard`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${getToken()}`
            }
          }
        );

        const result =
          await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            result?.message ||
              `No se pudo cargar ${config.title} (${response.status}).`
          );
        }

        setData(result?.data || result);
      } catch (requestError) {
        console.error(requestError);
        setError(requestError.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [area, config.title]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const rows =
    area === "warehouse"
      ? data?.orders || []
      : data?.deliveries || [];

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const text = [
        row.orderCode,
        row.product,
        row.productCode,
        row.seller?.name || row.seller,
        row.buyer?.name || row.buyer,
        row.deliveryAddress,
        row.pickupAddress,
        row.trackingNumber,
        row.status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!term || text.includes(term)) &&
        (statusFilter === "ALL" ||
          row.status === statusFilter)
      );
    });
  }, [rows, search, statusFilter]);

  const statuses = useMemo(
    () => [
      ...new Set(
        rows
          .map((row) => row.status)
          .filter(Boolean)
      )
    ],
    [rows]
  );

  function openOperation(row) {
    setSelected(row);
    setSelectedAction("");
    setNotes(row.warehouseNotes || row.deliveryNotes || "");
    setPickupAddress(row.pickupAddress || "");
    setDeliveryAddress(row.deliveryAddress || "");
    setPin("");
    setError("");
  }

  function closeOperation() {
    if (submitting) {
      return;
    }

    setSelected(null);
    setSelectedAction("");
  }

  async function submitAction() {
    if (!selectedAction || !selected) {
      setError("Selecciona primero una acción.");
      return;
    }

    if (
      ["HOLD", "FAIL"].includes(selectedAction) &&
      !notes.trim()
    ) {
      setError(
        "Debes escribir una nota explicando esta acción."
      );
      return;
    }

    if (
      selectedAction === "VERIFY_PIN" &&
      !/^\d{6}$/.test(pin)
    ) {
      setError(
        "El PIN debe contener exactamente 6 números."
      );
      return;
    }

    if (
      selectedAction === "OUT_FOR_DELIVERY" &&
      !deliveryAddress.trim()
    ) {
      setError(
        "Debes indicar la dirección de entrega."
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_BASE_URL}/admin/${area}/orders/${selected.id}/action`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify({
            action: selectedAction,
            notes: notes.trim(),
            pickupAddress: pickupAddress.trim(),
            deliveryAddress:
              deliveryAddress.trim(),
            pin: pin.trim()
          })
        }
      );

      const result =
        await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.message ||
            `No se pudo procesar la acción (${response.status}).`
        );
      }

      setSuccess(
        result?.message ||
          "La operación fue actualizada."
      );

      setSelected(null);
      await loadDashboard(false);
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  const kpiCards =
    area === "warehouse"
      ? [
          ["Operaciones", data?.kpis?.total, "📦"],
          ["Pendientes", data?.kpis?.pending, "⏳"],
          ["Recibidos", data?.kpis?.received, "📥"],
          ["En inspección", data?.kpis?.inInspection, "🔎"],
          ["Aprobados", data?.kpis?.approved, "✅"],
          ["Listos", data?.kpis?.readyForPickup, "🚚"]
        ]
      : [
          ["Operaciones", data?.kpis?.total, "📋"],
          ["Sin asignar", data?.kpis?.pendingAssignment, "👤"],
          ["Asignadas", data?.kpis?.assigned, "🛵"],
          ["En ruta", data?.kpis?.inTransit, "🚚"],
          ["Esperando PIN", data?.kpis?.waitingPin, "🔐"],
          ["Entregadas", data?.kpis?.delivered, "✅"]
        ];

  if (loading) {
    return (
      <main className="operations-loading">
        <div className="operations-spinner" />
        <h2>Cargando operación...</h2>
      </main>
    );
  }

  return (
    <main className="operations-page">
      <div className="operations-container">
        <header className="operations-header">
          <div>
            <span className="operations-eyebrow">
              {config.eyebrow}
            </span>

            <h1>{config.title}</h1>
            <p>{config.description}</p>
          </div>

          <div className="operations-header-actions">
            <button
              onClick={() =>
                navigate("/admin/select-area")
              }
            >
              ← Todas las áreas
            </button>

            <button
              onClick={() => loadDashboard(false)}
              disabled={refreshing}
            >
              {refreshing
                ? "Actualizando..."
                : "↻ Actualizar"}
            </button>
          </div>
        </header>

        {error && (
          <div className="operations-message is-error">
            {error}
          </div>
        )}

        {success && (
          <div className="operations-message is-success">
            {success}
          </div>
        )}

        <section className="operations-kpis">
          {kpiCards.map(([label, value, icon]) => (
            <article
              key={label}
              className="operations-card operations-kpi"
            >
              <span>{icon}</span>
              <small>{label}</small>
              <strong>{Number(value || 0)}</strong>
            </article>
          ))}
        </section>

        <section className="operations-layout">
          <article className="operations-card operations-workspace">
            <div className="operations-section-header">
              <div>
                <h2>Cola operativa</h2>
                <p>
                  Información real registrada en QSM.
                </p>
              </div>

              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                }}
              >
                Limpiar filtros
              </button>
            </div>

            <div className="operations-filters">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar orden, producto, usuario o tracking..."
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="ALL">
                  Todos los estados
                </option>

                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status] || status}
                  </option>
                ))}
              </select>
            </div>

            <div className="operations-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Orden / Producto</th>
                    <th>
                      {area === "warehouse"
                        ? "Vendedor"
                        : "Comprador"}
                    </th>
                    <th>
                      {area === "warehouse"
                        ? "Comprador"
                        : "Dirección"}
                    </th>
                    <th>Estado</th>
                    <th>Tracking</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>
                          {row.product || "Producto QSM"}
                        </strong>
                        <small>{row.orderCode}</small>
                      </td>

                      <td>
                        {area === "warehouse"
                          ? row.seller
                          : row.buyer?.name}
                      </td>

                      <td>
                        {area === "warehouse"
                          ? row.buyer
                          : row.deliveryAddress ||
                            "Sin dirección"}
                      </td>

                      <td>
                        <span
                          className={`operations-status status-${String(
                            row.status
                          ).toLowerCase()}`}
                        >
                          {STATUS_LABELS[row.status] ||
                            row.status}
                        </span>
                      </td>

                      <td>
                        {row.trackingNumber ||
                          "Sin tracking"}
                      </td>

                      <td>
                        <button
                          onClick={() =>
                            openOperation(row)
                          }
                        >
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredRows.length === 0 && (
                    <tr>
                      <td
                        colSpan="6"
                        className="operations-empty"
                      >
                        {config.empty}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <aside className="operations-side">
            <article className="operations-card operations-panel">
              <h2>Alertas operativas</h2>

              {(data?.alerts || []).length === 0 ? (
                <p>No existen alertas pendientes.</p>
              ) : (
                data.alerts.map((alert) => (
                  <div
                    className="operations-alert"
                    key={alert.id}
                  >
                    <span>⚠️</span>
                    <div>
                      <strong>{alert.title}</strong>
                      <p>
                        {alert.message ||
                          alert.description}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </article>

            <article className="operations-card operations-panel">
              <h2>Resumen del flujo</h2>

              <p>
                {rows.length} operación
                {rows.length === 1 ? "" : "es"} registrada
                {rows.length === 1 ? "" : "s"}.
              </p>

              <p>
                Los cambios se guardan en la orden,
                generan trazabilidad y notifican al
                comprador y al vendedor.
              </p>
            </article>
          </aside>
        </section>
      </div>

      {selected && (
        <div
          className="operations-modal-backdrop"
          onMouseDown={closeOperation}
        >
          <section
            className="operations-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <header>
              <div>
                <span>{selected.orderCode}</span>
                <h2>{selected.product}</h2>
              </div>

              <button onClick={closeOperation}>
                ✕
              </button>
            </header>

            <div className="operations-modal-body">
              <div className="operations-detail-grid">
                <div>
                  <small>Estado actual</small>
                  <strong>
                    {STATUS_LABELS[selected.status] ||
                      selected.status}
                  </strong>
                </div>

                <div>
                  <small>Tracking</small>
                  <strong>
                    {selected.trackingNumber ||
                      "Pendiente"}
                  </strong>
                </div>
              </div>

              <h3>Selecciona la siguiente acción</h3>

              <div className="operations-action-list">
                {getActions(area, selected.status).map(
                  (action) => (
                    <button
                      key={action}
                      className={
                        selectedAction === action
                          ? "is-selected"
                          : ""
                      }
                      onClick={() =>
                        setSelectedAction(action)
                      }
                    >
                      {ACTION_LABELS[action]}
                    </button>
                  )
                )}

                {getActions(area, selected.status)
                  .length === 0 && (
                  <p>
                    Esta operación no tiene acciones
                    pendientes en esta área.
                  </p>
                )}
              </div>

              {area === "delivery" && (
                <div className="operations-form-grid">
                  <label>
                    Dirección de recogida
                    <input
                      value={pickupAddress}
                      onChange={(event) =>
                        setPickupAddress(
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label>
                    Dirección de entrega
                    <input
                      value={deliveryAddress}
                      onChange={(event) =>
                        setDeliveryAddress(
                          event.target.value
                        )
                      }
                    />
                  </label>
                </div>
              )}

              {selectedAction === "VERIFY_PIN" && (
                <label>
                  PIN de entrega
                  <input
                    value={pin}
                    inputMode="numeric"
                    maxLength="6"
                    placeholder="000000"
                    onChange={(event) =>
                      setPin(
                        event.target.value.replace(
                          /\D/g,
                          ""
                        )
                      )
                    }
                  />
                </label>
              )}

              <label>
                Notas de la operación
                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="Observaciones internas..."
                />
              </label>
            </div>

            <footer>
              <button
                onClick={closeOperation}
                disabled={submitting}
              >
                Cancelar
              </button>

              <button
                className="operations-primary"
                onClick={submitAction}
                disabled={
                  submitting || !selectedAction
                }
              >
                {submitting
                  ? "Procesando..."
                  : "Confirmar acción"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}

export default OperationsDashboard;
