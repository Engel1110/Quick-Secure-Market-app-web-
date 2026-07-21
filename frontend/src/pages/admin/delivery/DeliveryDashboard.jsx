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

const DELIVERY_STATUS = {
  PENDING_ASSIGNMENT: "Pendiente de asignación",
  ASSIGNED: "Asignado",
  PICKED_UP: "Recogido",
  IN_TRANSIT: "En ruta",
  DELIVERED: "Entregado",
  FAILED: "Entrega fallida",
  DELAYED: "Retrasado",
  CANCELLED: "Cancelado"
};

const MOCK_DASHBOARD_DATA = {
  generatedAt: new Date().toISOString(),

  kpis: {
    pendingAssignment: 18,
    assigned: 45,
    inTransit: 15,
    deliveredToday: 23,
    failedToday: 3,
    delayed: 7,
    activeDrivers: 12,
    completionRate: 76
  },

  deliveries: [
    {
      id: "DEL-2048",
      orderId: "QSM-1048",
      customer: {
        id: "USR-101",
        name: "Carlos Martínez",
        phone: "809-555-0188"
      },
      driver: null,
      origin: "Almacén principal QSM",
      destination: "Santo Domingo Este",
      address: "Av. Venezuela, Santo Domingo Este",
      scheduledTime: "10:30 AM",
      createdAt: new Date().toISOString(),
      status: "PENDING_ASSIGNMENT",
      priority: "HIGH",
      packageType: "Electrónica",
      requiresPin: true,
      trackingCode: "QSM-DLV-2048",
      lastUpdate: "Hace 8 minutos"
    },
    {
      id: "DEL-2047",
      orderId: "QSM-1047",
      customer: {
        id: "USR-102",
        name: "Ana Rodríguez",
        phone: "829-555-0124"
      },
      driver: {
        id: "DRV-021",
        name: "Luis Gómez",
        phone: "849-555-0110",
        vehicle: "Motor",
        plate: "K189274"
      },
      origin: "Almacén principal QSM",
      destination: "Distrito Nacional",
      address: "Av. Abraham Lincoln, Distrito Nacional",
      scheduledTime: "11:15 AM",
      createdAt: new Date().toISOString(),
      status: "IN_TRANSIT",
      priority: "MEDIUM",
      packageType: "Laptop",
      requiresPin: true,
      trackingCode: "QSM-DLV-2047",
      lastUpdate: "Hace 4 minutos"
    },
    {
      id: "DEL-2046",
      orderId: "QSM-1046",
      customer: {
        id: "USR-103",
        name: "Pedro Jiménez",
        phone: "809-555-0166"
      },
      driver: {
        id: "DRV-018",
        name: "María Pérez",
        phone: "829-555-0155",
        vehicle: "Carro",
        plate: "A721693"
      },
      origin: "Almacén principal QSM",
      destination: "Santo Domingo Norte",
      address: "Villa Mella, Santo Domingo Norte",
      scheduledTime: "12:00 PM",
      createdAt: new Date().toISOString(),
      status: "ASSIGNED",
      priority: "HIGH",
      packageType: "Consola",
      requiresPin: true,
      trackingCode: "QSM-DLV-2046",
      lastUpdate: "Hace 18 minutos"
    },
    {
      id: "DEL-2045",
      orderId: "QSM-1045",
      customer: {
        id: "USR-104",
        name: "Laura Méndez",
        phone: "849-555-0199"
      },
      driver: {
        id: "DRV-014",
        name: "José Ramírez",
        phone: "809-555-0132",
        vehicle: "Motor",
        plate: "K209581"
      },
      origin: "Almacén principal QSM",
      destination: "Los Alcarrizos",
      address: "Autopista Duarte, Los Alcarrizos",
      scheduledTime: "9:45 AM",
      createdAt: new Date().toISOString(),
      status: "DELIVERED",
      priority: "NORMAL",
      packageType: "Teléfono",
      requiresPin: true,
      trackingCode: "QSM-DLV-2045",
      lastUpdate: "Hace 35 minutos"
    },
    {
      id: "DEL-2044",
      orderId: "QSM-1044",
      customer: {
        id: "USR-105",
        name: "Miguel Santos",
        phone: "829-555-0147"
      },
      driver: {
        id: "DRV-009",
        name: "Claudia Reyes",
        phone: "849-555-0171",
        vehicle: "Furgoneta",
        plate: "L489201"
      },
      origin: "Almacén principal QSM",
      destination: "San Cristóbal",
      address: "Centro de San Cristóbal",
      scheduledTime: "8:30 AM",
      createdAt: new Date().toISOString(),
      status: "DELAYED",
      priority: "CRITICAL",
      packageType: "Laptop",
      requiresPin: true,
      trackingCode: "QSM-DLV-2044",
      lastUpdate: "Hace 1 hora"
    }
  ],

  drivers: [
    {
      id: "DRV-021",
      name: "Luis Gómez",
      status: "ON_ROUTE",
      deliveriesToday: 7,
      completionRate: 94,
      zone: "Distrito Nacional"
    },
    {
      id: "DRV-018",
      name: "María Pérez",
      status: "AVAILABLE",
      deliveriesToday: 5,
      completionRate: 98,
      zone: "Santo Domingo Norte"
    },
    {
      id: "DRV-014",
      name: "José Ramírez",
      status: "ON_ROUTE",
      deliveriesToday: 8,
      completionRate: 91,
      zone: "Santo Domingo Oeste"
    },
    {
      id: "DRV-009",
      name: "Claudia Reyes",
      status: "DELAYED",
      deliveriesToday: 4,
      completionRate: 89,
      zone: "San Cristóbal"
    }
  ],

  alerts: [
    {
      id: "ALT-001",
      title: "7 entregas retrasadas",
      description:
        "Superaron el tiempo estimado de entrega.",
      severity: "HIGH"
    },
    {
      id: "ALT-002",
      title: "3 entregas fallidas",
      description:
        "Requieren contacto con el cliente o reasignación.",
      severity: "CRITICAL"
    },
    {
      id: "ALT-003",
      title: "18 entregas sin asignar",
      description:
        "Esperan disponibilidad de repartidores.",
      severity: "MEDIUM"
    }
  ],

  recentActivity: [
    {
      id: "ACT-001",
      title: "Pedido entregado",
      description:
        "DEL-2045 fue confirmado mediante PIN.",
      time: "Hace 35 minutos",
      icon: "✅"
    },
    {
      id: "ACT-002",
      title: "Repartidor asignado",
      description:
        "María Pérez fue asignada a DEL-2046.",
      time: "Hace 42 minutos",
      icon: "🛵"
    },
    {
      id: "ACT-003",
      title: "Retraso detectado",
      description:
        "DEL-2044 superó el tiempo estimado.",
      time: "Hace 1 hora",
      icon: "⚠️"
    },
    {
      id: "ACT-004",
      title: "Pedido recogido",
      description:
        "DEL-2047 salió del almacén principal.",
      time: "Hace 1 hora",
      icon: "📦"
    }
  ]
};

function DeliveryDashboard() {
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

  const [selectedDelivery, setSelectedDelivery] =
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
          `${API_BASE_URL}/admin/delivery/dashboard`,
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
            `No fue posible cargar Delivery (${response.status}).`
          );
        }

        const result =
          await response.json();

        const normalizedData =
          normalizeDashboardResponse(
            result
          );

        setDashboardData(
          normalizedData
        );
      } catch (requestError) {
        console.error(
          "Error cargando Delivery:",
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
              "No fue posible cargar los datos de Delivery."
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

  const deliveries =
    dashboardData?.deliveries || [];

  const filteredDeliveries =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return deliveries.filter(
        (delivery) => {
          const customerName =
            delivery.customer?.name ||
            "";

          const driverName =
            delivery.driver?.name ||
            "Sin asignar";

          const matchesSearch =
            !normalizedSearch ||
            delivery.id
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            delivery.orderId
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            customerName
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            driverName
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            delivery.destination
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            delivery.trackingCode
              ?.toLowerCase()
              .includes(
                normalizedSearch
              );

          const matchesStatus =
            statusFilter === "ALL" ||
            delivery.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      deliveries,
      search,
      statusFilter
    ]);

  async function updateDeliveryStatus(
    deliveryId,
    newStatus
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
          `${API_BASE_URL}/admin/delivery/${deliveryId}/status`,
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
              status: newStatus
            })
          }
        );

        if (!response.ok) {
          throw new Error(
            "No fue posible actualizar la entrega."
          );
        }
      }

      setDashboardData(
        (currentData) => ({
          ...currentData,
          deliveries:
            currentData.deliveries.map(
              (delivery) =>
                delivery.id ===
                deliveryId
                  ? {
                      ...delivery,
                      status:
                        newStatus,
                      lastUpdate:
                        "Actualizado ahora"
                    }
                  : delivery
            )
        })
      );

      setSelectedDelivery(
        (currentDelivery) =>
          currentDelivery?.id ===
          deliveryId
            ? {
                ...currentDelivery,
                status: newStatus,
                lastUpdate:
                  "Actualizado ahora"
              }
            : currentDelivery
      );
    } catch (updateError) {
      window.alert(
        updateError.message
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function assignDriver(
    deliveryId,
    driver
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
          `${API_BASE_URL}/admin/delivery/${deliveryId}/assign`,
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
              driverId: driver.id
            })
          }
        );

        if (!response.ok) {
          throw new Error(
            "No fue posible asignar el repartidor."
          );
        }
      }

      setDashboardData(
        (currentData) => ({
          ...currentData,
          deliveries:
            currentData.deliveries.map(
              (delivery) =>
                delivery.id ===
                deliveryId
                  ? {
                      ...delivery,
                      driver,
                      status:
                        "ASSIGNED",
                      lastUpdate:
                        "Actualizado ahora"
                    }
                  : delivery
            )
        })
      );

      setSelectedDelivery(
        (currentDelivery) =>
          currentDelivery?.id ===
          deliveryId
            ? {
                ...currentDelivery,
                driver,
                status:
                  "ASSIGNED",
                lastUpdate:
                  "Actualizado ahora"
              }
            : currentDelivery
      );
    } catch (assignError) {
      window.alert(
        assignError.message
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
      <div className="delivery-loading">
        <style>{baseStyles}</style>

        <div className="delivery-loader" />

        <h2>
          Cargando Dashboard de Delivery...
        </h2>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="delivery-loading">
        <style>{baseStyles}</style>

        <h2>
          No se pudo cargar Delivery
        </h2>

        <p>{error}</p>

        <button
          type="button"
          className="delivery-button delivery-button-primary"
          onClick={loadDashboard}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="delivery-page">
      <style>{baseStyles}</style>

      <div className="delivery-container">
        <header className="delivery-header">
          <div>
            <p className="delivery-eyebrow">
              Operación de entregas
            </p>

            <h1 className="delivery-title">
              Dashboard de Delivery
            </h1>

            <p className="delivery-subtitle">
              Gestiona asignaciones,
              repartidores, rutas, entregas,
              validación por PIN e
              incidencias de distribución.
            </p>
          </div>

          <div className="delivery-header-actions">
            <button
              type="button"
              className="delivery-button"
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
              className="delivery-button"
              onClick={loadDashboard}
            >
              ↻ Actualizar
            </button>

            <button
              type="button"
              className="delivery-button delivery-button-primary"
              onClick={() =>
                window.alert(
                  "La creación manual quedará conectada al endpoint POST /api/admin/delivery."
                )
              }
            >
              + Nueva entrega
            </button>
          </div>
        </header>

        {error && (
          <div className="delivery-demo-banner">
            <strong>
              Información:
            </strong>{" "}
            {error}
          </div>
        )}

        <section className="delivery-kpis">
          {kpis.map((kpi) => (
            <article
              key={kpi.title}
              className="delivery-card delivery-kpi"
            >
              <div className="delivery-kpi-icon">
                {kpi.icon}
              </div>

              <p className="delivery-kpi-title">
                {kpi.title}
              </p>

              <p className="delivery-kpi-value">
                {kpi.value}
              </p>

              <p className="delivery-kpi-detail">
                {kpi.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="delivery-main-grid">
          <article className="delivery-card delivery-section">
            <div className="delivery-section-header">
              <div>
                <h2 className="delivery-section-title">
                  Operaciones de entrega
                </h2>

                <p className="delivery-section-description">
                  Asigna repartidores y
                  supervisa cada pedido.
                </p>
              </div>

              <button
                type="button"
                className="delivery-button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter(
                    "ALL"
                  );
                }}
              >
                Limpiar filtros
              </button>
            </div>

            <div className="delivery-toolbar">
              <input
                className="delivery-input"
                type="search"
                placeholder="Buscar entrega, orden, cliente, repartidor o zona..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />

              <select
                className="delivery-select"
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
                  DELIVERY_STATUS
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
            </div>

            <div className="delivery-table-wrapper">
              <table className="delivery-table">
                <thead>
                  <tr>
                    <th>Entrega / orden</th>
                    <th>Cliente</th>
                    <th>Destino</th>
                    <th>Repartidor</th>
                    <th>Horario</th>
                    <th>Prioridad</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredDeliveries.map(
                    (delivery) => (
                      <tr
                        key={
                          delivery.id
                        }
                        onClick={() =>
                          setSelectedDelivery(
                            delivery
                          )
                        }
                      >
                        <td>
                          <strong className="delivery-primary-text">
                            {
                              delivery.id
                            }
                          </strong>

                          <span className="delivery-muted">
                            Orden{" "}
                            {
                              delivery.orderId
                            }
                          </span>
                        </td>

                        <td>
                          {
                            delivery
                              .customer
                              ?.name
                          }
                        </td>

                        <td>
                          <strong>
                            {
                              delivery.destination
                            }
                          </strong>

                          <span className="delivery-muted">
                            {
                              delivery.address
                            }
                          </span>
                        </td>

                        <td>
                          {delivery.driver
                            ?.name ||
                            "Sin asignar"}
                        </td>

                        <td>
                          {
                            delivery.scheduledTime
                          }
                        </td>

                        <td>
                          <PriorityBadge
                            priority={
                              delivery.priority
                            }
                          />
                        </td>

                        <td>
                          <StatusBadge
                            status={
                              delivery.status
                            }
                          />
                        </td>

                        <td>
                          <button
                            type="button"
                            className="delivery-button delivery-button-small"
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              setSelectedDelivery(
                                delivery
                              );
                            }}
                          >
                            Gestionar
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>

              {filteredDeliveries.length ===
                0 && (
                <div className="delivery-empty">
                  No se encontraron
                  entregas con esos
                  filtros.
                </div>
              )}
            </div>

            <div className="delivery-progress">
              <div className="delivery-progress-row">
                <span>
                  Entregas completadas
                </span>

                <strong>
                  {
                    dashboardData.kpis
                      .completionRate
                  }
                  %
                </strong>
              </div>

              <div className="delivery-progress-track">
                <div
                  className="delivery-progress-value"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        dashboardData
                          .kpis
                          .completionRate
                      )
                    )}%`
                  }}
                />
              </div>
            </div>
          </article>

          <aside className="delivery-side-column">
            <article className="delivery-card delivery-section">
              <div className="delivery-section-header">
                <div>
                  <h2 className="delivery-section-title">
                    Alertas operativas
                  </h2>

                  <p className="delivery-section-description">
                    Incidencias que requieren
                    atención.
                  </p>
                </div>
              </div>

              {dashboardData.alerts.map(
                (alert) => (
                  <div
                    key={alert.id}
                    className="delivery-alert"
                  >
                    <div className="delivery-alert-icon">
                      ⚠️
                    </div>

                    <div>
                      <p className="delivery-alert-title">
                        {
                          alert.title
                        }
                      </p>

                      <p className="delivery-alert-description">
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

            <article className="delivery-card delivery-section">
              <div className="delivery-section-header">
                <div>
                  <h2 className="delivery-section-title">
                    Repartidores
                  </h2>

                  <p className="delivery-section-description">
                    Disponibilidad y
                    rendimiento del equipo.
                  </p>
                </div>
              </div>

              {dashboardData.drivers.map(
                (driver) => (
                  <div
                    key={driver.id}
                    className="delivery-driver"
                  >
                    <div className="delivery-driver-avatar">
                      {getInitials(
                        driver.name
                      )}
                    </div>

                    <div className="delivery-driver-info">
                      <strong>
                        {driver.name}
                      </strong>

                      <span>
                        {driver.zone}
                      </span>
                    </div>

                    <div className="delivery-driver-performance">
                      <strong>
                        {
                          driver.completionRate
                        }
                        %
                      </strong>

                      <span>
                        {
                          driver.deliveriesToday
                        }{" "}
                        hoy
                      </span>
                    </div>
                  </div>
                )
              )}
            </article>

            <article className="delivery-card delivery-section">
              <div className="delivery-section-header">
                <div>
                  <h2 className="delivery-section-title">
                    Actividad reciente
                  </h2>
                </div>
              </div>

              {dashboardData.recentActivity.map(
                (item) => (
                  <div
                    key={item.id}
                    className="delivery-activity"
                  >
                    <div className="delivery-activity-icon">
                      {item.icon}
                    </div>

                    <div>
                      <p className="delivery-alert-title">
                        {
                          item.title
                        }
                      </p>

                      <p className="delivery-alert-description">
                        {
                          item.description
                        }
                      </p>

                      <span className="delivery-activity-time">
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

      {selectedDelivery && (
        <DeliveryModal
          delivery={
            selectedDelivery
          }
          drivers={
            dashboardData.drivers
          }
          isSaving={
            isSaving
          }
          onClose={() =>
            setSelectedDelivery(null)
          }
          onUpdateStatus={
            updateDeliveryStatus
          }
          onAssignDriver={
            assignDriver
          }
        />
      )}
    </div>
  );
}

function DeliveryModal({
  delivery,
  drivers,
  isSaving,
  onClose,
  onUpdateStatus,
  onAssignDriver
}) {
  const [
    selectedDriverId,
    setSelectedDriverId
  ] = useState(
    delivery.driver?.id || ""
  );

  const selectedDriver =
    drivers.find(
      (driver) =>
        driver.id ===
        selectedDriverId
    );

  return (
    <div
      className="delivery-modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="delivery-modal">
        <div className="delivery-modal-header">
          <div>
            <p className="delivery-eyebrow">
              Gestión de entrega
            </p>

            <h2 className="delivery-modal-title">
              {delivery.id}
            </h2>

            <p className="delivery-section-description">
              Orden {delivery.orderId}
            </p>
          </div>

          <button
            type="button"
            className="delivery-button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="delivery-modal-content">
          <div className="delivery-detail-grid">
            <Detail
              label="Cliente"
              value={
                delivery.customer?.name
              }
            />

            <Detail
              label="Teléfono"
              value={
                delivery.customer?.phone
              }
            />

            <Detail
              label="Destino"
              value={
                delivery.destination
              }
            />

            <Detail
              label="Horario"
              value={
                delivery.scheduledTime
              }
            />

            <Detail
              label="Código de rastreo"
              value={
                delivery.trackingCode
              }
            />

            <Detail
              label="Validación"
              value={
                delivery.requiresPin
                  ? "Requiere PIN"
                  : "Sin PIN"
              }
            />
          </div>

          <div className="delivery-address-box">
            <span>
              Dirección completa
            </span>

            <strong>
              {delivery.address}
            </strong>
          </div>

          <div className="delivery-assignment-box">
            <h3>
              Asignar repartidor
            </h3>

            <div className="delivery-assignment-row">
              <select
                className="delivery-select"
                value={
                  selectedDriverId
                }
                onChange={(event) =>
                  setSelectedDriverId(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Selecciona un repartidor
                </option>

                {drivers.map(
                  (driver) => (
                    <option
                      key={driver.id}
                      value={driver.id}
                    >
                      {driver.name} —{" "}
                      {driver.zone}
                    </option>
                  )
                )}
              </select>

              <button
                type="button"
                className="delivery-button delivery-button-primary"
                disabled={
                  !selectedDriver ||
                  isSaving
                }
                onClick={() =>
                  onAssignDriver(
                    delivery.id,
                    selectedDriver
                  )
                }
              >
                Asignar
              </button>
            </div>
          </div>

          {delivery.driver && (
            <div className="delivery-current-driver">
              <div className="delivery-driver-avatar">
                {getInitials(
                  delivery.driver.name
                )}
              </div>

              <div>
                <strong>
                  {
                    delivery.driver
                      .name
                  }
                </strong>

                <p>
                  {
                    delivery.driver
                      .vehicle
                  }{" "}
                  ·{" "}
                  {
                    delivery.driver
                      .plate
                  }
                </p>
              </div>
            </div>
          )}

          <div className="delivery-timeline">
            <h3>
              Seguimiento
            </h3>

            <TimelineItem
              active
              title="Orden preparada"
              description="El almacén confirmó que el paquete está listo."
            />

            <TimelineItem
              active={
                delivery.status !==
                "PENDING_ASSIGNMENT"
              }
              title="Repartidor asignado"
              description={
                delivery.driver
                  ? delivery.driver.name
                  : "Pendiente de asignación."
              }
            />

            <TimelineItem
              active={[
                "PICKED_UP",
                "IN_TRANSIT",
                "DELIVERED"
              ].includes(
                delivery.status
              )}
              title="Pedido recogido"
              description="El producto salió del almacén."
            />

            <TimelineItem
              active={[
                "IN_TRANSIT",
                "DELIVERED"
              ].includes(
                delivery.status
              )}
              title="En ruta"
              description="El repartidor se dirige al destino."
            />

            <TimelineItem
              active={
                delivery.status ===
                "DELIVERED"
              }
              title="Entregado"
              description="Entrega confirmada mediante PIN."
            />
          </div>
        </div>

        <div className="delivery-modal-actions">
          <button
            type="button"
            className="delivery-button delivery-button-primary"
            disabled={isSaving}
            onClick={() =>
              onUpdateStatus(
                delivery.id,
                "IN_TRANSIT"
              )
            }
          >
            Marcar en ruta
          </button>

          <button
            type="button"
            className="delivery-button delivery-button-success"
            disabled={isSaving}
            onClick={() =>
              onUpdateStatus(
                delivery.id,
                "DELIVERED"
              )
            }
          >
            Confirmar entrega
          </button>

          <button
            type="button"
            className="delivery-button delivery-button-warning"
            disabled={isSaving}
            onClick={() =>
              onUpdateStatus(
                delivery.id,
                "DELAYED"
              )
            }
          >
            Marcar retraso
          </button>

          <button
            type="button"
            className="delivery-button delivery-button-danger"
            disabled={isSaving}
            onClick={() =>
              onUpdateStatus(
                delivery.id,
                "FAILED"
              )
            }
          >
            Entrega fallida
          </button>

          <button
            type="button"
            className="delivery-button"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
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
      pendingAssignment:
        Number(
          source.kpis
            ?.pendingAssignment
        ) || 0,

      assigned:
        Number(
          source.kpis?.assigned
        ) || 0,

      inTransit:
        Number(
          source.kpis?.inTransit
        ) || 0,

      deliveredToday:
        Number(
          source.kpis
            ?.deliveredToday
        ) || 0,

      failedToday:
        Number(
          source.kpis
            ?.failedToday
        ) || 0,

      delayed:
        Number(
          source.kpis?.delayed
        ) || 0,

      activeDrivers:
        Number(
          source.kpis
            ?.activeDrivers
        ) || 0,

      completionRate:
        Number(
          source.kpis
            ?.completionRate
        ) || 0
    },

    deliveries: Array.isArray(
      source.deliveries
    )
      ? source.deliveries
      : [],

    drivers: Array.isArray(
      source.drivers
    )
      ? source.drivers
      : [],

    alerts: Array.isArray(
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

function buildKpis(kpis = {}) {
  return [
    {
      title: "Sin asignar",
      value:
        kpis.pendingAssignment || 0,
      detail:
        "Esperando repartidor",
      icon: "📋"
    },
    {
      title: "Asignadas",
      value:
        kpis.assigned || 0,
      detail:
        "Con repartidor asignado",
      icon: "👤"
    },
    {
      title: "En ruta",
      value:
        kpis.inTransit || 0,
      detail:
        "Entregándose ahora",
      icon: "🚚"
    },
    {
      title: "Entregadas hoy",
      value:
        kpis.deliveredToday || 0,
      detail:
        "Confirmadas por PIN",
      icon: "✅"
    },
    {
      title: "Retrasadas",
      value:
        kpis.delayed || 0,
      detail:
        "Requieren seguimiento",
      icon: "⏰"
    },
    {
      title: "Repartidores activos",
      value:
        kpis.activeDrivers || 0,
      detail:
        "Disponibles o en ruta",
      icon: "🛵"
    }
  ];
}

function StatusBadge({ status }) {
  const classNames = {
    PENDING_ASSIGNMENT:
      "badge-pending",
    ASSIGNED:
      "badge-assigned",
    PICKED_UP:
      "badge-assigned",
    IN_TRANSIT:
      "badge-transit",
    DELIVERED:
      "badge-delivered",
    FAILED:
      "badge-failed",
    DELAYED:
      "badge-delayed",
    CANCELLED:
      "badge-failed"
  };

  return (
    <span
      className={`delivery-badge ${
        classNames[status] ||
        "badge-pending"
      }`}
    >
      {DELIVERY_STATUS[status] ||
        status}
    </span>
  );
}

function PriorityBadge({
  priority
}) {
  return (
    <span
      className={`delivery-priority priority-${priority}`}
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
      className={`delivery-badge severity-${severity}`}
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
    <div className="delivery-detail">
      <span>
        {label}
      </span>

      <strong>
        {value || "No disponible"}
      </strong>
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
      className={`delivery-timeline-item ${
        active
          ? "timeline-active"
          : ""
      }`}
    >
      <div className="delivery-timeline-dot" />

      <div>
        <strong>
          {title}
        </strong>

        <p>
          {description}
        </p>
      </div>
    </div>
  );
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

const baseStyles = `
  * {
    box-sizing: border-box;
  }

  .delivery-page,
  .delivery-loading {
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
        rgba(40, 214, 255, 0.08),
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

  .delivery-page {
    padding: 28px;
  }

  .delivery-loading {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 16px;
    padding: 30px;
    text-align: center;
  }

  .delivery-loader {
    width: 48px;
    height: 48px;
    border: 4px solid #222b4d;
    border-top-color: #8a67ff;
    border-radius: 50%;
    animation: delivery-spin 0.8s linear infinite;
  }

  @keyframes delivery-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .delivery-container {
    width: min(1600px, 100%);
    margin: 0 auto;
  }

  .delivery-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .delivery-eyebrow {
    margin: 0 0 8px;
    color: #5ed9ff;
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .delivery-title {
    margin: 0;
    font-size: clamp(
      30px,
      4vw,
      44px
    );
    line-height: 1.05;
  }

  .delivery-subtitle {
    max-width: 760px;
    margin: 12px 0 0;
    color: #929bbd;
    font-size: 15px;
    line-height: 1.6;
  }

  .delivery-header-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
  }

  .delivery-button {
    min-height: 41px;
    border: 1px solid #252d4d;
    border-radius: 12px;
    padding: 10px 15px;
    color: #eef0ff;
    background: #0d1228;
    font-weight: 750;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .delivery-button:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: #6f5cff;
    background: #151b38;
  }

  .delivery-button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .delivery-button-small {
    min-height: 36px;
    padding: 8px 12px;
    font-size: 11px;
  }

  .delivery-button-primary {
    border-color: transparent;
    background: linear-gradient(
      135deg,
      #665cff,
      #d44edb
    );
  }

  .delivery-button-success {
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

  .delivery-button-warning {
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

  .delivery-button-danger {
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

  .delivery-demo-banner {
    margin-bottom: 18px;
    border: 1px solid rgba(
      255,
      196,
      76,
      0.25
    );
    border-radius: 13px;
    padding: 13px 15px;
    color: #d8c58e;
    background: rgba(
      255,
      196,
      76,
      0.07
    );
    font-size: 12px;
  }

  .delivery-kpis {
    display: grid;
    grid-template-columns:
      repeat(
        6,
        minmax(0, 1fr)
      );
    gap: 14px;
    margin-bottom: 18px;
  }

  .delivery-card {
    border: 1px solid #1d2545;
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

  .delivery-kpi {
    min-height: 145px;
    padding: 18px;
  }

  .delivery-kpi-icon {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border-radius: 13px;
    background: #171d3b;
    font-size: 20px;
  }

  .delivery-kpi-title {
    margin: 15px 0 8px;
    color: #8f98ba;
    font-size: 12px;
    font-weight: 700;
  }

  .delivery-kpi-value {
    margin: 0;
    font-size: 28px;
    font-weight: 850;
  }

  .delivery-kpi-detail {
    margin: 7px 0 0;
    color: #687293;
    font-size: 11px;
  }

  .delivery-main-grid {
    display: grid;
    grid-template-columns:
      minmax(0, 2fr)
      minmax(320px, 0.75fr);
    gap: 18px;
  }

  .delivery-section {
    padding: 20px;
  }

  .delivery-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 16px;
  }

  .delivery-section-title {
    margin: 0;
    font-size: 19px;
  }

  .delivery-section-description {
    margin: 5px 0 0;
    color: #7781a4;
    font-size: 12px;
  }

  .delivery-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 16px;
  }

  .delivery-input,
  .delivery-select {
    min-height: 42px;
    border: 1px solid #222b4d;
    border-radius: 11px;
    outline: none;
    color: #f1f3ff;
    background: #080d21;
  }

  .delivery-input {
    flex: 1;
    min-width: 240px;
    padding: 0 14px;
  }

  .delivery-select {
    padding: 0 12px;
  }

  .delivery-input:focus,
  .delivery-select:focus {
    border-color: #7768ff;
  }

  .delivery-table-wrapper {
    overflow-x: auto;
    border: 1px solid #171f3d;
    border-radius: 14px;
  }

  .delivery-table {
    width: 100%;
    min-width: 1120px;
    border-collapse: collapse;
  }

  .delivery-table th {
    padding: 14px;
    color: #697395;
    background: #080d20;
    font-size: 10px;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .delivery-table td {
    padding: 15px 14px;
    border-top: 1px solid #171e39;
    color: #dfe3f8;
    font-size: 12px;
  }

  .delivery-table tbody tr {
    cursor: pointer;
    transition: 0.18s ease;
  }

  .delivery-table tbody tr:hover {
    background:
      rgba(
        109,
        93,
        252,
        0.07
      );
  }

  .delivery-primary-text {
    display: block;
    margin-bottom: 5px;
    color: #ffffff;
    font-weight: 850;
  }

  .delivery-muted {
    display: block;
    margin-top: 5px;
    color: #717b9d;
    font-size: 10px;
  }

  .delivery-badge,
  .delivery-priority {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 6px 9px;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .badge-pending {
    color: #ffd66d;
    background:
      rgba(
        255,
        191,
        71,
        0.12
      );
  }

  .badge-assigned {
    color: #a99cff;
    background:
      rgba(
        124,
        97,
        255,
        0.14
      );
  }

  .badge-transit {
    color: #74dcff;
    background:
      rgba(
        63,
        194,
        255,
        0.13
      );
  }

  .badge-delivered {
    color: #6debb6;
    background:
      rgba(
        48,
        211,
        146,
        0.12
      );
  }

  .badge-failed {
    color: #ff8098;
    background:
      rgba(
        255,
        77,
        109,
        0.12
      );
  }

  .badge-delayed {
    color: #ffc36a;
    background:
      rgba(
        255,
        166,
        61,
        0.13
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

  .delivery-side-column {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .delivery-alert,
  .delivery-activity,
  .delivery-driver {
    display: flex;
    gap: 12px;
    padding: 14px 0;
    border-bottom: 1px solid #18203b;
  }

  .delivery-alert:last-child,
  .delivery-activity:last-child,
  .delivery-driver:last-child {
    border-bottom: 0;
  }

  .delivery-alert-icon,
  .delivery-activity-icon,
  .delivery-driver-avatar {
    display: grid;
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    place-items: center;
    border-radius: 12px;
    background: #171d38;
  }

  .delivery-driver-avatar {
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

  .delivery-alert-title {
    margin: 0 0 5px;
    font-size: 12px;
    font-weight: 800;
  }

  .delivery-alert-description {
    margin: 0;
    color: #727c9d;
    font-size: 11px;
    line-height: 1.5;
  }

  .delivery-activity-time {
    display: block;
    margin-top: 5px;
    color: #536080;
    font-size: 10px;
  }

  .delivery-driver {
    align-items: center;
  }

  .delivery-driver-info {
    flex: 1;
    min-width: 0;
  }

  .delivery-driver-info strong,
  .delivery-driver-info span,
  .delivery-driver-performance strong,
  .delivery-driver-performance span {
    display: block;
  }

  .delivery-driver-info strong {
    font-size: 12px;
  }

  .delivery-driver-info span,
  .delivery-driver-performance span {
    margin-top: 5px;
    color: #717b9d;
    font-size: 10px;
  }

  .delivery-driver-performance {
    text-align: right;
  }

  .delivery-driver-performance strong {
    color: #79e4bc;
    font-size: 12px;
  }

  .delivery-progress {
    margin-top: 18px;
  }

  .delivery-progress-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    color: #919abd;
    font-size: 11px;
  }

  .delivery-progress-track {
    height: 8px;
    overflow: hidden;
    border-radius: 999px;
    background: #151b33;
  }

  .delivery-progress-value {
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

  .delivery-empty {
    padding: 40px 20px;
    color: #717b9c;
    text-align: center;
  }

  .delivery-modal-backdrop {
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
        0.74
      );
    backdrop-filter: blur(8px);
  }

  .delivery-modal {
    width: min(
      860px,
      100%
    );
    max-height: 92vh;
    overflow-y: auto;
    border: 1px solid #283158;
    border-radius: 20px;
    background: #090e22;
    box-shadow:
      0 30px 90px
      rgba(
        0,
        0,
        0,
        0.58
      );
  }

  .delivery-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    padding: 22px;
    border-bottom: 1px solid #1c2443;
  }

  .delivery-modal-title {
    margin: 0;
    font-size: 25px;
  }

  .delivery-modal-content {
    padding: 22px;
  }

  .delivery-detail-grid {
    display: grid;
    grid-template-columns:
      repeat(
        3,
        minmax(0, 1fr)
      );
    gap: 12px;
  }

  .delivery-detail {
    padding: 14px;
    border: 1px solid #1c2545;
    border-radius: 13px;
    background: #0c1229;
  }

  .delivery-detail span,
  .delivery-detail strong {
    display: block;
  }

  .delivery-detail span {
    margin-bottom: 7px;
    color: #6f799b;
    font-size: 10px;
    text-transform: uppercase;
  }

  .delivery-detail strong {
    color: #eef1ff;
    font-size: 12px;
  }

  .delivery-address-box,
  .delivery-assignment-box,
  .delivery-current-driver,
  .delivery-timeline {
    margin-top: 18px;
    border: 1px solid #1c2545;
    border-radius: 14px;
    padding: 16px;
    background: #0b1126;
  }

  .delivery-address-box span,
  .delivery-address-box strong {
    display: block;
  }

  .delivery-address-box span {
    margin-bottom: 7px;
    color: #6f799b;
    font-size: 10px;
    text-transform: uppercase;
  }

  .delivery-assignment-box h3,
  .delivery-timeline h3 {
    margin: 0 0 13px;
    font-size: 15px;
  }

  .delivery-assignment-row {
    display: flex;
    gap: 10px;
  }

  .delivery-assignment-row .delivery-select {
    flex: 1;
  }

  .delivery-current-driver {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .delivery-current-driver p {
    margin: 5px 0 0;
    color: #747e9f;
    font-size: 11px;
  }

  .delivery-timeline-item {
    position: relative;
    display: flex;
    gap: 13px;
    padding: 9px 0 13px;
    opacity: 0.42;
  }

  .delivery-timeline-item.timeline-active {
    opacity: 1;
  }

  .delivery-timeline-dot {
    flex: 0 0 12px;
    width: 12px;
    height: 12px;
    margin-top: 3px;
    border: 2px solid #5f698d;
    border-radius: 50%;
  }

  .timeline-active
  .delivery-timeline-dot {
    border-color: #62e0b0;
    background: #62e0b0;
    box-shadow:
      0 0 14px
      rgba(
        98,
        224,
        176,
        0.45
      );
  }

  .delivery-timeline-item strong {
    font-size: 12px;
  }

  .delivery-timeline-item p {
    margin: 5px 0 0;
    color: #747e9f;
    font-size: 11px;
  }

  .delivery-modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 20px 22px;
    border-top: 1px solid #1c2443;
  }

  @media (
    max-width: 1300px
  ) {
    .delivery-kpis {
      grid-template-columns:
        repeat(
          3,
          minmax(0, 1fr)
        );
    }

    .delivery-main-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (
    max-width: 800px
  ) {
    .delivery-page {
      padding: 18px 12px;
    }

    .delivery-header {
      flex-direction: column;
    }

    .delivery-header-actions {
      justify-content:
        flex-start;
    }

    .delivery-kpis {
      grid-template-columns:
        repeat(
          2,
          minmax(0, 1fr)
        );
    }

    .delivery-detail-grid {
      grid-template-columns: 1fr;
    }

    .delivery-assignment-row {
      flex-direction: column;
    }
  }

  @media (
    max-width: 480px
  ) {
    .delivery-kpis {
      grid-template-columns: 1fr;
    }
  }
`;

export default DeliveryDashboard;
