import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Link,
  useLocation,
  useNavigate
} from "react-router-dom";

import api from "../api/axios";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

const ACTIVE_STATUSES = [
  "PENDING",
  "WAITING_PAYMENT",
  "PAYMENT_UNDER_REVIEW",
  "PAYMENT_CONFIRMED",
  "WAITING_SELLER",
  "WAITING_WAREHOUSE",
  "IN_WAREHOUSE",
  "UNDER_INSPECTION",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "WAITING_PIN",
  "DELIVERED",
  "DISPUTED"
];

const CANCELLABLE_STATUSES = [
  "PENDING",
  "WAITING_PAYMENT",
  "PAYMENT_UNDER_REVIEW",
  "PAYMENT_CONFIRMED",
  "WAITING_SELLER",
  "WAITING_WAREHOUSE"
];

const RECEIPT_STATUSES = [
  "WAITING_PIN",
  "DELIVERED"
];

const DISPUTABLE_STATUSES = [
  "PAYMENT_CONFIRMED",
  "WAITING_SELLER",
  "WAITING_WAREHOUSE",
  "IN_WAREHOUSE",
  "UNDER_INSPECTION",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "WAITING_PIN",
  "DELIVERED"
];

function Orders() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentUser = useMemo(() => {
    return (
      safeJson(
        localStorage.getItem("qsm_user")
      ) ||
      safeJson(
        localStorage.getItem("user")
      ) ||
      {}
    );
  }, []);

  const currentUserId =
    currentUser?._id ||
    currentUser?.id ||
    currentUser?.userId ||
    "";

  const initialStatus =
    new URLSearchParams(
      location.search
    ).get("status") || "ALL";

  const [orders, setOrders] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter
  ] = useState(initialStatus);

  const [loading, setLoading] =
    useState(true);

  const [
    actionLoading,
    setActionLoading
  ] = useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [
    cancelModal,
    setCancelModal
  ] = useState({
    open: false,
    order: null
  });

  const [
    cancelReason,
    setCancelReason
  ] = useState("");

  const [
    disputeModal,
    setDisputeModal
  ] = useState({
    open: false,
    order: null
  });

  const [
    disputeReason,
    setDisputeReason
  ] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    const params =
      new URLSearchParams(
        location.search
      );

    const status =
      params.get("status");

    if (status) {
      setStatusFilter(status);
    }
  }, [location.search]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          "/orders/my-orders"
        );

      const backendOrders =
        response?.data?.orders ||
        response?.data?.data ||
        response?.data?.myOrders ||
        [];

      const normalizedOrders =
        Array.isArray(
          backendOrders
        )
          ? backendOrders
          : [];

      const buyerOrders =
        normalizedOrders.filter(
          (order) =>
            isBuyerOrder(
              order,
              currentUserId
            )
        );

      setOrders(buyerOrders);
    } catch (err) {
      console.error(
        "Error cargando compras:",
        err?.response?.data ||
          err
      );

      setOrders([]);

      setError(
        err?.response?.data?.message ||
          "No se pudieron cargar tus compras. Verifica la sesión y la conexión con el backend."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateStatusFilter = (
    value
  ) => {
    setStatusFilter(value);

    const params =
      new URLSearchParams(
        location.search
      );

    if (value === "ALL") {
      params.delete("status");
    } else {
      params.set(
        "status",
        value
      );
    }

    const query =
      params.toString();

    navigate(
      query
        ? `/orders?${query}`
        : "/orders",
      {
        replace: true
      }
    );
  };

  const filteredOrders =
    useMemo(() => {
      let result = [...orders];

      if (
        statusFilter !== "ALL"
      ) {
        result =
          result.filter(
            (order) =>
              normalizeStatus(
                order.status
              ) === statusFilter
          );
      }

      if (search.trim()) {
        const term =
          search
            .trim()
            .toLowerCase();

        result =
          result.filter(
            (order) => {
              const product =
                order.product || {};

              const seller =
                order.seller || {};

              const searchableText = [
                order._id,
                order.id,
                order.orderCode,
                product.title,
                product.category,
                seller.firstName,
                seller.lastName,
                seller.email,
                order.paymentMethod,
                order.deliveryMethod,
                order.status
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

              return searchableText.includes(
                term
              );
            }
          );
      }

      return result;
    }, [
      orders,
      statusFilter,
      search
    ]);

  const stats = useMemo(() => {
    const total =
      orders.length;

    const active =
      orders.filter(
        (order) =>
          ACTIVE_STATUSES.includes(
            normalizeStatus(
              order.status
            )
          )
      ).length;

    const completed =
      orders.filter(
        (order) =>
          normalizeStatus(
            order.status
          ) === "COMPLETED"
      ).length;

    const cancelled =
      orders.filter(
        (order) =>
          [
            "CANCELLED",
            "REFUNDED",
            "REJECTED"
          ].includes(
            normalizeStatus(
              order.status
            )
          )
      ).length;

    return {
      total,
      active,
      completed,
      cancelled
    };
  }, [orders]);

  const openCancelModal = (
    order
  ) => {
    setError("");
    setMessage("");
    setCancelReason("");

    setCancelModal({
      open: true,
      order
    });
  };

  const closeCancelModal = () => {
    if (actionLoading) {
      return;
    }

    setCancelModal({
      open: false,
      order: null
    });

    setCancelReason("");
  };

  const cancelOrder = async () => {
    const order =
      cancelModal.order;

    const orderId =
      getOrderId(order);

    if (!orderId) {
      setError(
        "La orden no tiene un identificador válido."
      );
      return;
    }

    if (
      cancelReason.trim().length <
      5
    ) {
      setError(
        "Escribe un motivo de cancelación de al menos 5 caracteres."
      );
      return;
    }

    try {
      setActionLoading(
        `cancel-${orderId}`
      );

      setError("");
      setMessage("");

      await api.patch(
        `/orders/${orderId}/cancel`,
        {
          reason:
            cancelReason.trim()
        }
      );

      setMessage(
        "La compra fue cancelada correctamente."
      );

      closeCancelModal();
      await loadOrders();
    } catch (err) {
      console.error(
        "Error cancelando compra:",
        err?.response?.data ||
          err
      );

      setError(
        err?.response?.data?.message ||
          "No se pudo cancelar la compra."
      );
    } finally {
      setActionLoading("");
    }
  };

  const confirmReceipt = async (
    order
  ) => {
    const orderId =
      getOrderId(order);

    if (!orderId) {
      setError(
        "La orden no tiene un identificador válido."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "¿Confirmas que recibiste el producto correctamente? Esta acción marcará la compra como completada."
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(
        `receipt-${orderId}`
      );

      setError("");
      setMessage("");

      await api.patch(
        `/orders/${orderId}/confirm-receipt`
      );

      setMessage(
        "Recepción confirmada. La compra fue completada correctamente."
      );

      await loadOrders();
    } catch (err) {
      console.error(
        "Error confirmando recepción:",
        err?.response?.data ||
          err
      );

      setError(
        err?.response?.data?.message ||
          "No se pudo confirmar la recepción del producto."
      );
    } finally {
      setActionLoading("");
    }
  };

  const openDisputeModal = (
    order
  ) => {
    setError("");
    setMessage("");
    setDisputeReason("");

    setDisputeModal({
      open: true,
      order
    });
  };

  const closeDisputeModal = () => {
    if (actionLoading) {
      return;
    }

    setDisputeModal({
      open: false,
      order: null
    });

    setDisputeReason("");
  };

  const openDispute = async () => {
    const order =
      disputeModal.order;

    const orderId =
      getOrderId(order);

    if (!orderId) {
      setError(
        "La orden no tiene un identificador válido."
      );
      return;
    }

    if (
      disputeReason.trim().length <
      10
    ) {
      setError(
        "Describe el reclamo con al menos 10 caracteres."
      );
      return;
    }

    try {
      setActionLoading(
        `dispute-${orderId}`
      );

      setError("");
      setMessage("");

      await api.post(
        `/orders/${orderId}/dispute`,
        {
          reason:
            disputeReason.trim()
        }
      );

      setMessage(
        "El reclamo fue abierto correctamente. QSM revisará la operación."
      );

      closeDisputeModal();
      await loadOrders();
    } catch (err) {
      console.error(
        "Error abriendo reclamo:",
        err?.response?.data ||
          err
      );

      setError(
        err?.response?.data?.message ||
          "No se pudo abrir el reclamo."
      );
    } finally {
      setActionLoading("");
    }
  };

  const goToVoucher = (
    order
  ) => {
    const orderId =
      getOrderId(order);

    if (!orderId) {
      setError(
        "La orden no tiene un identificador válido para abrir el voucher."
      );
      return;
    }

    navigate(
      `/voucher/${orderId}`,
      {
        state: {
          order
        }
      }
    );
  };

  const goToTracking = (
    order
  ) => {
    const orderId =
      getOrderId(order);

    if (!orderId) {
      setError(
        "La orden no tiene un identificador válido para abrir el seguimiento."
      );
      return;
    }

    navigate(
      `/orders/${orderId}`,
      {
        state: {
          order
        }
      }
    );
  };

  return (
        <div style={page}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          background: #020617;
          font-family:
            Inter,
            "Plus Jakarta Sans",
            system-ui,
            sans-serif;
          overflow-x: hidden;
        }

        a,
        button,
        input,
        select,
        textarea {
          font-family: inherit;
        }

        a,
        button {
          transition: all .25s ease;
        }

        a:hover,
        button:hover {
          transform: translateY(-2px);
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (
          max-width: 1280px
        ) {
          .orders-layout {
            grid-template-columns:
              240px minmax(0, 1fr)
              !important;
          }

          .stats-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr))
              !important;
          }

          .orders-grid {
            grid-template-columns:
              repeat(
                auto-fit,
                minmax(340px, 1fr)
              )
              !important;
          }
        }

        @media (
          max-width: 1024px
        ) {
          .orders-layout {
            grid-template-columns:
              1fr !important;
          }

          .sidebar-wrapper {
            display: none !important;
          }

          .hero-row {
            flex-direction:
              column !important;
            align-items:
              flex-start !important;
          }

          .filter-row {
            grid-template-columns:
              1fr !important;
          }
        }

        @media (
          max-width: 760px
        ) {
          .orders-main {
            padding:
              18px 14px 54px
              !important;
          }

          .stats-grid {
            grid-template-columns:
              1fr !important;
          }

          .orders-grid {
            grid-template-columns:
              1fr !important;
          }

          .order-info-grid {
            grid-template-columns:
              1fr !important;
          }

          .order-actions {
            grid-template-columns:
              1fr !important;
          }

          .product-row {
            grid-template-columns:
              88px minmax(0, 1fr)
              !important;
          }

          .modal-card {
            width:
              calc(100% - 28px)
              !important;
            padding:
              20px !important;
          }
        }
      `}</style>

      <div
        className="orders-layout"
        style={layout}
      >
        <div
          className="sidebar-wrapper"
        >
          <Sidebar />
        </div>

        <main
          className="orders-main"
          style={main}
        >
          <Topbar />

          <section
            className="hero-row"
            style={hero}
          >
            <div>
              <p style={label}>
                COMPRAS QSM
              </p>

              <h1 style={title}>
                Mis compras
              </h1>

              <p style={subtitle}>
                Consulta tus compras protegidas,
                abre el voucher, revisa el
                seguimiento, confirma la recepción
                y gestiona reclamos desde un solo
                lugar.
              </p>
            </div>

            <div style={heroActions}>
              <button
                type="button"
                onClick={loadOrders}
                disabled={loading}
                style={{
                  ...ghostButton,
                  opacity:
                    loading
                      ? 0.65
                      : 1,
                  cursor:
                    loading
                      ? "not-allowed"
                      : "pointer"
                }}
              >
                {loading
                  ? "Actualizando..."
                  : "Actualizar"}
              </button>

              <Link
                to="/marketplace"
                style={primaryButton}
              >
                Ir al Marketplace →
              </Link>
            </div>
          </section>

          <section
            className="stats-grid"
            style={statsGrid}
          >
            <StatCard
              icon="🛒"
              title="Total de compras"
              value={stats.total}
              text="Todas tus órdenes como comprador."
            />

            <StatCard
              icon="🛡"
              title="En proceso"
              value={stats.active}
              text="Compras que todavía están activas."
            />

            <StatCard
              icon="✅"
              title="Completadas"
              value={stats.completed}
              text="Operaciones entregadas y cerradas."
            />

            <StatCard
              icon="↩"
              title="Canceladas"
              value={stats.cancelled}
              text="Compras canceladas, rechazadas o reembolsadas."
            />
          </section>

          <section style={controlPanel}>
            <div
              className="filter-row"
              style={filterRow}
            >
              <div style={searchBox}>
                <span style={searchIcon}>
                  ⌕
                </span>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Buscar por producto, orden, vendedor, pago o entrega..."
                  style={searchInput}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  updateStatusFilter(
                    event.target.value
                  )
                }
                style={selectInput}
              >
                <option value="ALL">
                  Todos los estados
                </option>

                <option value="PENDING">
                  Pendiente
                </option>

                <option value="WAITING_PAYMENT">
                  Esperando pago
                </option>

                <option value="PAYMENT_UNDER_REVIEW">
                  Pago en revisión
                </option>

                <option value="PAYMENT_CONFIRMED">
                  Pago confirmado
                </option>

                <option value="WAITING_SELLER">
                  Esperando vendedor
                </option>

                <option value="WAITING_WAREHOUSE">
                  Esperando almacén
                </option>

                <option value="IN_WAREHOUSE">
                  En almacén
                </option>

                <option value="UNDER_INSPECTION">
                  En inspección
                </option>

                <option value="READY_FOR_PICKUP">
                  Listo para entrega
                </option>

                <option value="OUT_FOR_DELIVERY">
                  En camino
                </option>

                <option value="WAITING_PIN">
                  Esperando PIN
                </option>

                <option value="DELIVERED">
                  Entregado
                </option>

                <option value="COMPLETED">
                  Completado
                </option>

                <option value="DISPUTED">
                  En reclamo
                </option>

                <option value="CANCELLED">
                  Cancelado
                </option>

                <option value="REFUNDED">
                  Reembolsado
                </option>

                <option value="REJECTED">
                  Rechazado
                </option>
              </select>
            </div>
          </section>

          {message && (
            <div style={successBox}>
              {message}
            </div>
          )}

          {error && (
            <div style={errorBox}>
              {error}
            </div>
          )}

          {loading && (
            <div style={centerCard}>
              <div style={centerIcon}>
                🛡
              </div>

              <h2>
                Cargando tus compras...
              </h2>

              <p>
                QSM está consultando tus
                órdenes protegidas.
              </p>
            </div>
          )}

          {!loading &&
            filteredOrders.length === 0 && (
              <div style={centerCard}>
                <div style={centerIcon}>
                  🛒
                </div>

                <h2>
                  No hay compras para mostrar
                </h2>

                <p>
                  Todavía no tienes compras en
                  esta sección o los filtros no
                  encontraron resultados.
                </p>

                <Link
                  to="/marketplace"
                  style={primaryButton}
                >
                  Explorar Marketplace
                </Link>
              </div>
            )}

          {!loading &&
            filteredOrders.length > 0 && (
              <section
                className="orders-grid"
                style={ordersGrid}
              >
                {filteredOrders.map(
                  (order, index) => (
                    <PurchaseCard
                      key={
                        getOrderId(order) ||
                        index
                      }
                      order={order}
                      actionLoading={
                        actionLoading
                      }
                      onVoucher={
                        goToVoucher
                      }
                      onTracking={
                        goToTracking
                      }
                      onCancel={
                        openCancelModal
                      }
                      onConfirmReceipt={
                        confirmReceipt
                      }
                      onDispute={
                        openDisputeModal
                      }
                    />
                  )
                )}
              </section>
            )}
        </main>
      </div>

      <AiAssistant
        pageContext="orders"
      />

      {cancelModal.open && (
        <div
          style={modalOverlay}
          onClick={closeCancelModal}
        >
          <div
            className="modal-card"
            style={modalCard}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div style={modalHeader}>
              <div>
                <p style={modalLabel}>
                  CANCELAR COMPRA
                </p>

                <h2 style={modalTitle}>
                  Confirma la cancelación
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeCancelModal
                }
                style={modalCloseButton}
              >
                ×
              </button>
            </div>

            <p style={modalText}>
              Indica por qué deseas cancelar
              esta compra. QSM guardará el
              motivo en el historial de la
              orden.
            </p>

            <textarea
              value={cancelReason}
              onChange={(event) =>
                setCancelReason(
                  event.target.value
                )
              }
              placeholder="Escribe el motivo de cancelación..."
              rows={5}
              style={textarea}
            />

            <div style={modalActions}>
              <button
                type="button"
                onClick={
                  closeCancelModal
                }
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
                style={modalSecondaryButton}
              >
                Volver
              </button>

              <button
                type="button"
                onClick={cancelOrder}
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
                style={{
                  ...modalDangerButton,
                  opacity:
                    actionLoading
                      ? 0.65
                      : 1,
                  cursor:
                    actionLoading
                      ? "not-allowed"
                      : "pointer"
                }}
              >
                {actionLoading
                  ? "Cancelando..."
                  : "Cancelar compra"}
              </button>
            </div>
          </div>
        </div>
      )}

      {disputeModal.open && (
        <div
          style={modalOverlay}
          onClick={closeDisputeModal}
        >
          <div
            className="modal-card"
            style={modalCard}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div style={modalHeader}>
              <div>
                <p style={modalLabel}>
                  RECLAMO QSM
                </p>

                <h2 style={modalTitle}>
                  Abrir un reclamo
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  closeDisputeModal
                }
                style={modalCloseButton}
              >
                ×
              </button>
            </div>

            <p style={modalText}>
              Describe claramente el problema.
              QSM conservará la operación en
              revisión hasta resolver el caso.
            </p>

            <textarea
              value={disputeReason}
              onChange={(event) =>
                setDisputeReason(
                  event.target.value
                )
              }
              placeholder="Describe el problema con el producto, el vendedor, el pago o la entrega..."
              rows={6}
              style={textarea}
            />

            <div style={modalActions}>
              <button
                type="button"
                onClick={
                  closeDisputeModal
                }
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
                style={modalSecondaryButton}
              >
                Volver
              </button>

              <button
                type="button"
                onClick={openDispute}
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
                style={{
                  ...modalWarningButton,
                  opacity:
                    actionLoading
                      ? 0.65
                      : 1,
                  cursor:
                    actionLoading
                      ? "not-allowed"
                      : "pointer"
                }}
              >
                {actionLoading
                  ? "Enviando..."
                  : "Abrir reclamo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function PurchaseCard({
  order,
  actionLoading,
  onVoucher,
  onTracking,
  onCancel,
  onConfirmReceipt,
  onDispute
}) {
  const product =
    order?.product || {};

  const seller =
    order?.seller || {};

  const orderId =
    getOrderId(order);

  const status =
    normalizeStatus(
      order?.status
    );

  const paymentStatus =
    String(
      order?.paymentStatus ||
      "PENDING"
    ).toUpperCase();

  const deliveryStatus =
    String(
      order?.deliveryStatus ||
      order?.warehouseStatus ||
      "PENDING"
    ).toUpperCase();

  const paymentMethod =
    String(
      order?.paymentMethod ||
      ""
    ).toUpperCase();

  const deliveryMethod =
    String(
      order?.deliveryMethod ||
      ""
    ).toUpperCase();

  const orderCode =
    order?.orderCode ||
    order?.code ||
    `QSM-${String(
      orderId || "PENDIENTE"
    )
      .slice(-8)
      .toUpperCase()}`;

  const image =
    getOrderImage(product);

  const subtotal =
    Number(
      order?.price ||
      product?.price ||
      0
    );

  const protectionFee =
    Number(
      order?.protectionFee ||
      0
    );

  const shippingFee =
    Number(
      order?.shippingFee ||
      0
    );

  const totalAmount =
    Number(
      order?.totalAmount ||
      subtotal +
        protectionFee +
        shippingFee
    );

  const deliveryPin =
    order?.deliveryPin ||
    order?.deliveryCode ||
    "Pendiente";

  const createdAt =
    order?.createdAt ||
    order?.updatedAt ||
    null;

  const canCancel =
    CANCELLABLE_STATUSES.includes(
      status
    );

  const canConfirmReceipt =
    RECEIPT_STATUSES.includes(
      status
    );

  const canDispute =
    DISPUTABLE_STATUSES.includes(
      status
    );

  const cancelLoading =
    actionLoading ===
    `cancel-${orderId}`;

  const receiptLoading =
    actionLoading ===
    `receipt-${orderId}`;

  const disputeLoading =
    actionLoading ===
    `dispute-${orderId}`;

  const isActionBusy =
    cancelLoading ||
    receiptLoading ||
    disputeLoading;

  const trackingSteps =
    getTrackingSteps(
      status,
      deliveryMethod
    );

  return (
    <article style={purchaseCard}>
      <div style={purchaseHeader}>
        <div>
          <p style={smallLabel}>
            COMPRA PROTEGIDA
          </p>

          <h2 style={orderTitle}>
            {orderCode}
          </h2>

          <p style={orderDate}>
            {formatDate(createdAt)}
          </p>
        </div>

        <span
          style={statusBadge(
            status
          )}
        >
          {formatStatus(status)}
        </span>
      </div>

      <div
        className="product-row"
        style={productRow}
      >
        <div style={productImageBox}>
          {image ? (
            <img
              src={image}
              alt={
                product?.title ||
                "Producto comprado"
              }
              style={productImage}
            />
          ) : (
            <span style={productPlaceholder}>
              📦
            </span>
          )}
        </div>

        <div style={productInformation}>
          <p style={productCategory}>
            {product?.category ||
              "Producto QSM"}
          </p>

          <h3 style={productTitle}>
            {product?.title ||
              order?.productTitle ||
              "Producto comprado"}
          </h3>

          <p style={productCondition}>
            {formatCondition(
              product?.condition
            )}
          </p>

          <strong style={priceText}>
            {formatMoney(
              totalAmount
            )}
          </strong>
        </div>
      </div>

      <div
        className="order-info-grid"
        style={informationGrid}
      >
        <InfoItem
          icon="👤"
          title="Vendedor"
          value={formatUser(
            seller,
            "Vendedor QSM"
          )}
        />

        <InfoItem
          icon="💳"
          title="Método de pago"
          value={formatPaymentMethod(
            paymentMethod
          )}
        />

        <InfoItem
          icon="🚚"
          title="Método de entrega"
          value={formatDeliveryMethod(
            deliveryMethod
          )}
        />

        <InfoItem
          icon="💰"
          title="Estado del pago"
          value={formatPaymentStatus(
            paymentStatus
          )}
        />

        <InfoItem
          icon="📍"
          title="Estado de entrega"
          value={formatDeliveryStatus(
            deliveryStatus
          )}
        />

        <InfoItem
          icon="🔐"
          title="PIN de entrega"
          value={deliveryPin}
          highlight
        />
      </div>

      <div style={amountBox}>
        <div style={amountRow}>
          <span>
            Subtotal
          </span>

          <strong>
            {formatMoney(
              subtotal
            )}
          </strong>
        </div>

        <div style={amountRow}>
          <span>
            Protección QSM
          </span>

          <strong>
            {protectionFee > 0
              ? formatMoney(
                  protectionFee
                )
              : "Incluida"}
          </strong>
        </div>

        <div style={amountRow}>
          <span>
            Cargo de entrega
          </span>

          <strong>
            {shippingFee > 0
              ? formatMoney(
                  shippingFee
                )
              : "Sin cargo"}
          </strong>
        </div>

        <div style={amountTotalRow}>
          <span>
            Total
          </span>

          <strong>
            {formatMoney(
              totalAmount
            )}
          </strong>
        </div>
      </div>

      <div style={trackingBox}>
        <div style={trackingHeader}>
          <div>
            <p style={trackingLabel}>
              SEGUIMIENTO
            </p>

            <h3 style={trackingTitle}>
              Estado de la compra
            </h3>
          </div>

          <button
            type="button"
            onClick={() =>
              onTracking(order)
            }
            style={trackingLinkButton}
          >
            Ver completo →
          </button>
        </div>

        <div style={trackingStepsBox}>
          {trackingSteps.map(
            (step, index) => (
              <ProgressStep
                key={`${step.code}-${index}`}
                icon={step.icon}
                title={step.title}
                text={step.text}
                active={step.active}
                current={step.current}
                last={
                  index ===
                  trackingSteps.length -
                    1
                }
              />
            )
          )}
        </div>
      </div>

      <div style={securityBox}>
        <div style={securityIcon}>
          🛡
        </div>

        <div>
          <strong>
            Compra Protegida QSM
          </strong>

          <p>
            El PIN debe mantenerse privado
            hasta la entrega. No lo compartas
            directamente con el vendedor.
          </p>
        </div>
      </div>

      <div
        className="order-actions"
        style={actionGrid}
      >
        <button
          type="button"
          onClick={() =>
            onVoucher(order)
          }
          style={voucherAction}
        >
          📄 Ver voucher
        </button>

        <button
          type="button"
          onClick={() =>
            onTracking(order)
          }
          style={trackingAction}
        >
          📍 Ver seguimiento
        </button>

        <Link
          to={`/messages?sellerId=${
            seller?._id ||
            seller?.id ||
            ""
          }&orderId=${
            orderId || ""
          }`}
          style={contactAction}
        >
          💬 Contactar
        </Link>

        <button
          type="button"
          onClick={() =>
            onConfirmReceipt(order)
          }
          disabled={
            !canConfirmReceipt ||
            isActionBusy
          }
          style={
            canConfirmReceipt
              ? confirmAction
              : disabledAction
          }
        >
          {receiptLoading
            ? "Confirmando..."
            : "✅ Confirmar recepción"}
        </button>

        <button
          type="button"
          onClick={() =>
            onDispute(order)
          }
          disabled={
            !canDispute ||
            isActionBusy
          }
          style={
            canDispute
              ? disputeAction
              : disabledAction
          }
        >
          {disputeLoading
            ? "Abriendo..."
            : "⚠ Abrir reclamo"}
        </button>

        <button
          type="button"
          onClick={() =>
            onCancel(order)
          }
          disabled={
            !canCancel ||
            isActionBusy
          }
          style={
            canCancel
              ? cancelAction
              : disabledAction
          }
        >
          {cancelLoading
            ? "Cancelando..."
            : "✕ Cancelar compra"}
        </button>
      </div>
    </article>
  );
}

function StatCard({
  icon,
  title,
  value,
  text
}) {
  return (
    <div style={statCard}>
      <div style={statIcon}>
        {icon}
      </div>

      <div style={statContent}>
        <span style={statTitle}>
          {title}
        </span>

        <strong style={statValue}>
          {value}
        </strong>

        <p style={statText}>
          {text}
        </p>
      </div>
    </div>
  );
}

function InfoItem({
  icon,
  title,
  value,
  highlight = false
}) {
  return (
    <div
      style={
        highlight
          ? informationItemHighlight
          : informationItem
      }
    >
      <div style={informationIcon}>
        {icon}
      </div>

      <div style={informationContent}>
        <span style={informationTitle}>
          {title}
        </span>

        <strong
          style={
            highlight
              ? informationValueHighlight
              : informationValue
          }
        >
          {value}
        </strong>
      </div>
    </div>
  );
}

function ProgressStep({
  icon,
  title,
  text,
  active,
  current,
  last
}) {
  return (
    <div style={progressStep}>
      <div style={progressColumn}>
        <div
          style={
            current
              ? progressDotCurrent
              : active
              ? progressDotActive
              : progressDotInactive
          }
        >
          {active || current
            ? icon
            : "•"}
        </div>

        {!last && (
          <div
            style={
              active
                ? progressLineActive
                : progressLineInactive
            }
          />
        )}
      </div>

      <div style={progressContent}>
        <strong
          style={
            active || current
              ? progressTitleActive
              : progressTitleInactive
          }
        >
          {title}
        </strong>

        <p style={progressText}>
          {text}
        </p>
      </div>
    </div>
  );
}

function safeJson(value) {
  try {
    return value
      ? JSON.parse(value)
      : null;
  } catch {
    return null;
  }
}

function getOrderId(order) {
  return (
    order?._id ||
    order?.id ||
    order?.orderId ||
    ""
  );
}

function getEntityId(entity) {
  if (!entity) {
    return "";
  }

  if (
    typeof entity === "string"
  ) {
    return entity;
  }

  return (
    entity?._id ||
    entity?.id ||
    entity?.userId ||
    ""
  );
}

function isBuyerOrder(
  order,
  currentUserId
) {
  if (!currentUserId) {
    return false;
  }

  const buyerId =
    getEntityId(
      order?.buyer
    ) ||
    order?.buyerId ||
    "";

  return (
    String(buyerId) ===
    String(currentUserId)
  );
}

function normalizeStatus(status) {
  const value =
    String(
      status || "PENDING"
    ).toUpperCase();

  const aliases = {
    PAID:
      "PAYMENT_CONFIRMED",

    HELD:
      "PAYMENT_CONFIRMED",

    IN_STORAGE:
      "IN_WAREHOUSE",

    SHIPPED:
      "OUT_FOR_DELIVERY",

    RELEASED:
      "COMPLETED"
  };

  return (
    aliases[value] ||
    value
  );
}

function formatUser(
  user,
  fallback
) {
  if (!user) {
    return fallback;
  }

  if (
    typeof user === "string"
  ) {
    return fallback;
  }

  const fullName = [
    user?.firstName,
    user?.lastName
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    user?.email ||
    fallback
  );
}

function formatStatus(status) {
  const value =
    normalizeStatus(status);

  const map = {
    PENDING:
      "Compra pendiente",

    WAITING_PAYMENT:
      "Esperando pago",

    PAYMENT_UNDER_REVIEW:
      "Pago en revisión",

    PAYMENT_CONFIRMED:
      "Pago confirmado",

    WAITING_SELLER:
      "Esperando vendedor",

    WAITING_WAREHOUSE:
      "Esperando almacén",

    IN_WAREHOUSE:
      "En almacén",

    UNDER_INSPECTION:
      "En inspección",

    READY_FOR_PICKUP:
      "Listo para entregar",

    OUT_FOR_DELIVERY:
      "En camino",

    WAITING_PIN:
      "Esperando PIN",

    DELIVERED:
      "Producto entregado",

    COMPLETED:
      "Compra completada",

    DISPUTED:
      "En reclamo",

    CANCELLED:
      "Compra cancelada",

    REJECTED:
      "Producto rechazado",

    REFUNDED:
      "Compra reembolsada"
  };

  return (
    map[value] ||
    value ||
    "Pendiente"
  );
}

function formatPaymentMethod(
  value
) {
  const map = {
    BANK_TRANSFER:
      "Transferencia contra entrega",

    CASH_ON_DELIVERY:
      "Efectivo contra entrega",

    CARD:
      "Tarjeta — simulación"
  };

  return (
    map[value] ||
    "No especificado"
  );
}

function formatDeliveryMethod(
  value
) {
  const map = {
    QSM_WAREHOUSE:
      "Almacén QSM",

    QSM_VERIFIED_DELIVERY:
      "Delivery QSM verificado",

    DIRECT_DELIVERY:
      "Entrega coordinada"
  };

  return (
    map[value] ||
    "No especificado"
  );
}

function formatPaymentStatus(
  value
) {
  const map = {
    PENDING:
      "Pendiente",

    PENDING_PROOF:
      "Esperando comprobante",

    PROOF_UPLOADED:
      "Comprobante enviado",

    UNDER_REVIEW:
      "En revisión",

    PENDING_DELIVERY:
      "Pago contra entrega",

    DEMO_AUTHORIZED:
      "Autorizado — Demo",

    CONFIRMED:
      "Pago confirmado",

    REJECTED:
      "Pago rechazado",

    REFUNDED:
      "Pago reembolsado"
  };

  return (
    map[value] ||
    value ||
    "Pendiente"
  );
}

function formatDeliveryStatus(
  value
) {
  const map = {
    PENDING:
      "Pendiente",

    SELLER_NOTIFIED:
      "Vendedor notificado",

    WAITING_FOR_SELLER:
      "Esperando vendedor",

    PICKUP_REQUESTED:
      "Recogida solicitada",

    PICKUP_SCHEDULED:
      "Recogida programada",

    AGENT_ASSIGNED:
      "Agente asignado",

    AGENT_ON_THE_WAY:
      "Agente en camino",

    PRODUCT_COLLECTED:
      "Producto recogido",

    IN_TRANSIT_TO_WAREHOUSE:
      "En camino al almacén",

    RECEIVED_AT_WAREHOUSE:
      "Recibido en almacén",

    RECEIVED:
      "Recibido en almacén",

    UNDER_REVIEW:
      "En revisión",

    APPROVED:
      "Producto aprobado",

    REJECTED:
      "Producto rechazado",

    READY_FOR_PICKUP:
      "Listo para entregar",

    OUT_FOR_DELIVERY:
      "En camino al comprador",

    WAITING_PIN:
      "Esperando PIN",

    DELIVERED:
      "Producto entregado"
  };

  return (
    map[value] ||
    value ||
    "Seguimiento pendiente"
  );
}

function formatCondition(
  value
) {
  const map = {
    NEW:
      "Nuevo",

    LIKE_NEW:
      "Como nuevo",

    USED_GOOD:
      "Buen estado",

    USED_DETAILS:
      "Usado con detalles",

    FOR_PARTS:
      "Para piezas"
  };

  return (
    map[
      String(value || "")
        .toUpperCase()
    ] ||
    "Condición no especificada"
  );
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
    return "Fecha no disponible";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat(
    "es-DO",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
}

function getOrderImage(product) {
  if (!product) {
    return "";
  }

  const possibleImage =
    product?.thumbnail ||
    product?.image ||
    product?.imageUrl ||
    (
      Array.isArray(
        product?.images
      )
        ? product.images[0]
        : ""
    );

  return getImageUrl(
    possibleImage
  );
}

function getImageUrl(image) {
  if (!image) {
    return "";
  }

  const rawValue =
    typeof image === "string"
      ? image
      : image?.url ||
        image?.path ||
        image?.secure_url ||
        image?.imageUrl ||
        image?.publicUrl ||
        "";

  if (!rawValue) {
    return "";
  }

  const cleanImage =
    String(rawValue)
      .trim()
      .replaceAll(
        "&#x2F;",
        "/"
      )
      .replaceAll(
        "&amp;",
        "&"
      );

  if (
    cleanImage.startsWith(
      "http://"
    ) ||
    cleanImage.startsWith(
      "https://"
    )
  ) {
    return cleanImage;
  }

  const apiOrigin =
    getApiOrigin();

  if (
    cleanImage.startsWith(
      "/uploads"
    )
  ) {
    return `${apiOrigin}${cleanImage}`;
  }

  if (
    cleanImage.startsWith(
      "uploads"
    )
  ) {
    return `${apiOrigin}/${cleanImage}`;
  }

  return `${apiOrigin}/uploads/products/images/${cleanImage}`;
}

function getApiOrigin() {
  const configuredUrl =
    import.meta.env
      .VITE_API_URL ||
    "http://localhost:5000/api";

  return configuredUrl
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
}

function getTrackingSteps(
  status,
  deliveryMethod
) {
  const normalized =
    normalizeStatus(status);

  const orderedStatuses = [
    "PENDING",
    "WAITING_PAYMENT",
    "PAYMENT_UNDER_REVIEW",
    "PAYMENT_CONFIRMED",
    "WAITING_SELLER",
    "WAITING_WAREHOUSE",
    "IN_WAREHOUSE",
    "UNDER_INSPECTION",
    "READY_FOR_PICKUP",
    "OUT_FOR_DELIVERY",
    "WAITING_PIN",
    "DELIVERED",
    "COMPLETED"
  ];

  const currentIndex =
    orderedStatuses.indexOf(
      normalized
    );

  const hasReached = (
    targetStatus
  ) => {
    const targetIndex =
      orderedStatuses.indexOf(
        targetStatus
      );

    if (
      normalized ===
        "CANCELLED" ||
      normalized ===
        "REJECTED" ||
      normalized ===
        "REFUNDED" ||
      normalized ===
        "DISPUTED"
    ) {
      return false;
    }

    return (
      currentIndex >= targetIndex &&
      targetIndex >= 0
    );
  };

  const warehouseDelivery =
    deliveryMethod ===
    "QSM_WAREHOUSE";

  const steps = [
    {
      code: "ORDER_CREATED",
      icon: "✓",
      title: "Compra creada",
      text:
        "La orden fue registrada correctamente.",
      active: true,
      current:
        normalized ===
        "PENDING"
    },
    {
      code: "PAYMENT",
      icon: "✓",
      title: "Pago registrado",
      text:
        "QSM registró el método de pago seleccionado.",
      active:
        hasReached(
          "WAITING_PAYMENT"
        ) ||
        hasReached(
          "PAYMENT_CONFIRMED"
        ),
      current:
        [
          "WAITING_PAYMENT",
          "PAYMENT_UNDER_REVIEW",
          "PAYMENT_CONFIRMED"
        ].includes(
          normalized
        )
    },
    {
      code: "SELLER",
      icon: "✓",
      title: "Vendedor notificado",
      text:
        "El vendedor recibió las instrucciones de la compra.",
      active:
        hasReached(
          "WAITING_SELLER"
        ) ||
        hasReached(
          "WAITING_WAREHOUSE"
        ),
      current:
        normalized ===
        "WAITING_SELLER"
    },
    {
      code: "LOGISTICS",
      icon: warehouseDelivery
        ? "🏬"
        : "🚚",
      title: warehouseDelivery
        ? "Proceso de almacén"
        : "Recogida por delivery",
      text: warehouseDelivery
        ? "El producto será recibido y revisado por QSM."
        : "Un agente QSM recogerá y verificará el producto.",
      active:
        hasReached(
          "IN_WAREHOUSE"
        ) ||
        hasReached(
          "OUT_FOR_DELIVERY"
        ),
      current:
        [
          "WAITING_WAREHOUSE",
          "IN_WAREHOUSE",
          "UNDER_INSPECTION"
        ].includes(
          normalized
        )
    },
    {
      code: "READY",
      icon: "📦",
      title: "Listo para entrega",
      text:
        "El producto fue aprobado para continuar.",
      active:
        hasReached(
          "READY_FOR_PICKUP"
        ),
      current:
        normalized ===
        "READY_FOR_PICKUP"
    },
    {
      code: "PIN",
      icon: "🔐",
      title: "Entrega mediante PIN",
      text:
        "El PIN valida la entrega final al comprador.",
      active:
        hasReached(
          "WAITING_PIN"
        ) ||
        hasReached(
          "DELIVERED"
        ),
      current:
        normalized ===
        "WAITING_PIN"
    },
    {
      code: "COMPLETED",
      icon: "✓",
      title: "Compra completada",
      text:
        "La operación fue cerrada correctamente.",
      active:
        normalized ===
          "DELIVERED" ||
        normalized ===
          "COMPLETED",
      current:
        normalized ===
        "DELIVERED"
    }
  ];

  if (
    normalized === "DISPUTED"
  ) {
    steps.push({
      code: "DISPUTED",
      icon: "⚠",
      title: "Compra en reclamo",
      text:
        "QSM está revisando el caso antes de continuar.",
      active: true,
      current: true
    });
  }

  if (
    normalized === "CANCELLED"
  ) {
    steps.push({
      code: "CANCELLED",
      icon: "✕",
      title: "Compra cancelada",
      text:
        "La operación fue cancelada y no continuará.",
      active: true,
      current: true
    });
  }

  if (
    normalized === "REFUNDED"
  ) {
    steps.push({
      code: "REFUNDED",
      icon: "↩",
      title: "Compra reembolsada",
      text:
        "El reembolso de la operación fue registrado.",
      active: true,
      current: true
    });
  }

  if (
    normalized === "REJECTED"
  ) {
    steps.push({
      code: "REJECTED",
      icon: "!",
      title: "Producto rechazado",
      text:
        "El producto no superó el proceso de verificación.",
      active: true,
      current: true
    });
  }

  return steps;
}
const page = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at 88% 8%, rgba(139,92,246,.16), transparent 30%), radial-gradient(circle at 12% 18%, rgba(56,189,248,.10), transparent 28%), #020617",
  color: "white"
};

const layout = {
  width: "100%",
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns:
    "280px minmax(0, 1fr)",
  overflowX: "hidden"
};

const main = {
  width: "100%",
  minWidth: 0,
  maxWidth: "1720px",
  margin: "0 auto",
  padding: "26px 34px 70px",
  overflowX: "hidden"
};

const hero = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "28px",
  margin: "24px 0 26px"
};

const label = {
  margin: 0,
  color: "#38bdf8",
  letterSpacing: "4px",
  fontSize: "11px",
  fontWeight: "950",
  textTransform: "uppercase"
};

const title = {
  margin: "10px 0",
  fontSize:
    "clamp(40px, 3.8vw, 64px)",
  lineHeight: "1",
  letterSpacing: "-2px"
};

const subtitle = {
  margin: 0,
  maxWidth: "830px",
  color: "#cbd5e1",
  fontSize: "16px",
  lineHeight: "28px"
};

const heroActions = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap"
};

const primaryButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "48px",
  padding: "13px 20px",
  border: "none",
  borderRadius: "14px",
  background:
    "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",
  color: "white",
  textDecoration: "none",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow:
    "0 18px 52px rgba(139,92,246,.22)"
};

const ghostButton = {
  ...primaryButton,
  background:
    "rgba(15,23,42,.72)",
  border:
    "1px solid rgba(148,163,184,.16)",
  boxShadow: "none"
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px"
};

const statCard = {
  minHeight: "126px",
  display: "flex",
  alignItems: "center",
  gap: "15px",
  background:
    "rgba(15,23,42,.74)",
  border:
    "1px solid rgba(56,189,248,.15)",
  borderRadius: "22px",
  padding: "20px",
  boxShadow:
    "0 18px 55px rgba(0,0,0,.18)",
  backdropFilter: "blur(14px)"
};

const statIcon = {
  width: "54px",
  height: "54px",
  borderRadius: "17px",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "linear-gradient(135deg, rgba(56,189,248,.18), rgba(139,92,246,.20))",
  border:
    "1px solid rgba(56,189,248,.18)",
  fontSize: "25px"
};

const statContent = {
  minWidth: 0
};

const statTitle = {
  display: "block",
  color: "#cbd5e1",
  fontSize: "13px",
  fontWeight: "800",
  marginBottom: "4px"
};

const statValue = {
  display: "block",
  color: "white",
  fontSize: "30px",
  lineHeight: 1,
  marginBottom: "7px"
};

const statText = {
  margin: 0,
  color: "#64748b",
  fontSize: "11px",
  lineHeight: "17px"
};

const controlPanel = {
  background:
    "rgba(15,23,42,.68)",
  border:
    "1px solid rgba(56,189,248,.14)",
  borderRadius: "22px",
  padding: "17px",
  marginBottom: "18px",
  backdropFilter: "blur(12px)"
};

const filterRow = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) 290px",
  gap: "12px"
};

const searchBox = {
  minHeight: "56px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background:
    "rgba(2,6,23,.48)",
  border:
    "1px solid rgba(148,163,184,.14)",
  borderRadius: "15px",
  padding: "0 15px"
};

const searchIcon = {
  color: "#38bdf8",
  fontSize: "22px",
  lineHeight: 1
};

const searchInput = {
  flex: 1,
  minWidth: 0,
  height: "54px",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "white",
  fontSize: "14px"
};

const selectInput = {
  minHeight: "56px",
  width: "100%",
  background:
    "rgba(2,6,23,.55)",
  border:
    "1px solid rgba(148,163,184,.14)",
  borderRadius: "15px",
  padding: "0 15px",
  color: "white",
  outline: "none",
  fontSize: "14px"
};

const successBox = {
  marginBottom: "17px",
  padding: "14px 17px",
  background:
    "rgba(34,197,94,.14)",
  border:
    "1px solid rgba(34,197,94,.32)",
  borderRadius: "15px",
  color: "#bbf7d0",
  fontWeight: "800",
  lineHeight: "22px"
};

const errorBox = {
  marginBottom: "17px",
  padding: "14px 17px",
  background:
    "rgba(127,29,29,.24)",
  border:
    "1px solid rgba(248,113,113,.30)",
  borderRadius: "15px",
  color: "#fecaca",
  fontWeight: "800",
  lineHeight: "22px"
};

const centerCard = {
  minHeight: "330px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  background:
    "rgba(15,23,42,.72)",
  border:
    "1px solid rgba(56,189,248,.14)",
  borderRadius: "25px",
  padding: "36px",
  color: "#cbd5e1"
};

const centerIcon = {
  width: "72px",
  height: "72px",
  marginBottom: "14px",
  borderRadius: "22px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "linear-gradient(135deg, rgba(56,189,248,.22), rgba(139,92,246,.24))",
  fontSize: "31px"
};

const ordersGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(430px, 1fr))",
  gap: "20px",
  alignItems: "start"
};

const purchaseCard = {
  width: "100%",
  minWidth: 0,
  background:
    "rgba(15,23,42,.76)",
  border:
    "1px solid rgba(56,189,248,.16)",
  borderRadius: "26px",
  padding: "22px",
  boxShadow:
    "0 25px 80px rgba(0,0,0,.22)",
  backdropFilter: "blur(15px)",
  animation: "fadeUp .45s ease"
};

const purchaseHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "18px"
};

const smallLabel = {
  margin: 0,
  color: "#38bdf8",
  fontSize: "10px",
  letterSpacing: "3px",
  fontWeight: "950"
};

const orderTitle = {
  margin: "6px 0 4px",
  color: "white",
  fontSize: "23px",
  lineHeight: "1.1",
  wordBreak: "break-word"
};

const orderDate = {
  margin: 0,
  color: "#64748b",
  fontSize: "11px"
};

const statusBadge = (status) => {
  const normalized =
    normalizeStatus(status);

  const colors = {
    PENDING: [
      "rgba(245,158,11,.14)",
      "#fde68a",
      "rgba(245,158,11,.30)"
    ],

    WAITING_PAYMENT: [
      "rgba(245,158,11,.14)",
      "#fde68a",
      "rgba(245,158,11,.30)"
    ],

    PAYMENT_UNDER_REVIEW: [
      "rgba(96,165,250,.14)",
      "#bfdbfe",
      "rgba(96,165,250,.30)"
    ],

    PAYMENT_CONFIRMED: [
      "rgba(34,197,94,.14)",
      "#bbf7d0",
      "rgba(34,197,94,.30)"
    ],

    WAITING_SELLER: [
      "rgba(245,158,11,.14)",
      "#fde68a",
      "rgba(245,158,11,.30)"
    ],

    WAITING_WAREHOUSE: [
      "rgba(139,92,246,.14)",
      "#ddd6fe",
      "rgba(139,92,246,.30)"
    ],

    IN_WAREHOUSE: [
      "rgba(139,92,246,.14)",
      "#ddd6fe",
      "rgba(139,92,246,.30)"
    ],

    UNDER_INSPECTION: [
      "rgba(56,189,248,.14)",
      "#bae6fd",
      "rgba(56,189,248,.30)"
    ],

    READY_FOR_PICKUP: [
      "rgba(34,197,94,.14)",
      "#bbf7d0",
      "rgba(34,197,94,.30)"
    ],

    OUT_FOR_DELIVERY: [
      "rgba(56,189,248,.14)",
      "#bae6fd",
      "rgba(56,189,248,.30)"
    ],

    WAITING_PIN: [
      "rgba(236,72,153,.14)",
      "#fbcfe8",
      "rgba(236,72,153,.30)"
    ],

    DELIVERED: [
      "rgba(34,197,94,.14)",
      "#bbf7d0",
      "rgba(34,197,94,.30)"
    ],

    COMPLETED: [
      "rgba(34,197,94,.16)",
      "#86efac",
      "rgba(34,197,94,.34)"
    ],

    DISPUTED: [
      "rgba(245,158,11,.16)",
      "#fde68a",
      "rgba(245,158,11,.34)"
    ],

    CANCELLED: [
      "rgba(239,68,68,.16)",
      "#fca5a5",
      "rgba(239,68,68,.34)"
    ],

    REJECTED: [
      "rgba(239,68,68,.16)",
      "#fca5a5",
      "rgba(239,68,68,.34)"
    ],

    REFUNDED: [
      "rgba(168,85,247,.16)",
      "#d8b4fe",
      "rgba(168,85,247,.34)"
    ]
  };

  const selected =
    colors[normalized] ||
    colors.PENDING;

  return {
    maxWidth: "190px",
    background: selected[0],
    color: selected[1],
    border: `1px solid ${selected[2]}`,
    borderRadius: "999px",
    padding: "8px 12px",
    fontWeight: "950",
    fontSize: "11px",
    lineHeight: "16px",
    textAlign: "center",
    whiteSpace: "normal"
  };
};

const productRow = {
  display: "grid",
  gridTemplateColumns:
    "110px minmax(0, 1fr)",
  gap: "16px",
  alignItems: "center",
  background:
    "rgba(2,6,23,.42)",
  border:
    "1px solid rgba(148,163,184,.10)",
  borderRadius: "19px",
  padding: "14px",
  marginBottom: "15px"
};

const productImageBox = {
  width: "110px",
  height: "110px",
  borderRadius: "18px",
  overflow: "hidden",
  background:
    "linear-gradient(135deg, rgba(56,189,248,.16), rgba(139,92,246,.16))",
  border:
    "1px solid rgba(148,163,184,.10)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const productImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  background: "#020617"
};

const productPlaceholder = {
  fontSize: "42px"
};

const productInformation = {
  minWidth: 0
};

const productCategory = {
  margin: 0,
  color: "#38bdf8",
  fontSize: "10px",
  letterSpacing: "2px",
  fontWeight: "900",
  textTransform: "uppercase"
};

const productTitle = {
  margin: "6px 0",
  color: "white",
  fontSize: "21px",
  lineHeight: "1.18",
  wordBreak: "break-word"
};

const productCondition = {
  margin: 0,
  color: "#94a3b8",
  fontSize: "12px"
};

const priceText = {
  display: "block",
  marginTop: "9px",
  color: "#35d0c3",
  fontSize: "21px"
};

const informationGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "11px",
  marginBottom: "15px"
};

const informationItem = {
  minHeight: "78px",
  display: "flex",
  alignItems: "center",
  gap: "11px",
  background:
    "rgba(2,6,23,.36)",
  border:
    "1px solid rgba(148,163,184,.10)",
  borderRadius: "15px",
  padding: "12px"
};

const informationItemHighlight = {
  ...informationItem,
  background:
    "linear-gradient(135deg, rgba(53,208,195,.13), rgba(37,99,235,.10))",
  border:
    "1px solid rgba(53,208,195,.28)"
};

const informationIcon = {
  width: "38px",
  height: "38px",
  flexShrink: 0,
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(56,189,248,.11)",
  fontSize: "18px"
};

const informationContent = {
  minWidth: 0
};

const informationTitle = {
  display: "block",
  marginBottom: "4px",
  color: "#64748b",
  fontSize: "10px"
};

const informationValue = {
  display: "block",
  color: "#e2e8f0",
  fontSize: "12px",
  lineHeight: "17px",
  wordBreak: "break-word"
};

const informationValueHighlight = {
  ...informationValue,
  color: "#67fff1",
  fontSize: "17px",
  letterSpacing: "2px"
};

const amountBox = {
  background:
    "rgba(2,6,23,.38)",
  border:
    "1px solid rgba(148,163,184,.10)",
  borderRadius: "17px",
  padding: "15px 17px",
  marginBottom: "15px"
};

const amountRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  padding: "7px 0",
  color: "#cbd5e1",
  fontSize: "12px"
};

const amountTotalRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  marginTop: "7px",
  paddingTop: "13px",
  borderTop:
    "1px solid rgba(148,163,184,.12)",
  color: "#35d0c3",
  fontSize: "18px"
};

const trackingBox = {
  background:
    "rgba(2,6,23,.36)",
  border:
    "1px solid rgba(148,163,184,.10)",
  borderRadius: "18px",
  padding: "16px",
  marginBottom: "15px"
};

const trackingHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "12px",
  marginBottom: "15px"
};

const trackingLabel = {
  margin: 0,
  color: "#a78bfa",
  fontSize: "9px",
  letterSpacing: "2px",
  fontWeight: "950"
};

const trackingTitle = {
  margin: "5px 0 0",
  color: "white",
  fontSize: "17px"
};

const trackingLinkButton = {
  border: "none",
  background: "transparent",
  color: "#38bdf8",
  padding: "4px 0",
  fontWeight: "900",
  fontSize: "11px",
  cursor: "pointer"
};

const trackingStepsBox = {
  display: "grid",
  gap: "0"
};

const progressStep = {
  display: "grid",
  gridTemplateColumns:
    "32px minmax(0, 1fr)",
  gap: "10px",
  minHeight: "64px"
};

const progressColumn = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center"
};

const progressDotActive = {
  width: "28px",
  height: "28px",
  flexShrink: 0,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#35d0c3",
  color: "#020617",
  fontWeight: "950",
  fontSize: "12px",
  zIndex: 2
};

const progressDotCurrent = {
  ...progressDotActive,
  background:
    "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  color: "white",
  boxShadow:
    "0 0 18px rgba(139,92,246,.32)"
};

const progressDotInactive = {
  ...progressDotActive,
  background:
    "rgba(148,163,184,.14)",
  color: "#64748b"
};

const progressLineActive = {
  width: "2px",
  minHeight: "34px",
  flex: 1,
  background:
    "linear-gradient(#35d0c3, rgba(53,208,195,.25))"
};

const progressLineInactive = {
  width: "2px",
  minHeight: "34px",
  flex: 1,
  background:
    "rgba(148,163,184,.13)"
};

const progressContent = {
  paddingBottom: "12px"
};

const progressTitleActive = {
  display: "block",
  color: "white",
  fontSize: "12px"
};

const progressTitleInactive = {
  display: "block",
  color: "#64748b",
  fontSize: "12px"
};

const progressText = {
  margin: "4px 0 0",
  color: "#94a3b8",
  fontSize: "11px",
  lineHeight: "17px"
};

const securityBox = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  background:
    "rgba(53,208,195,.09)",
  border:
    "1px solid rgba(53,208,195,.22)",
  borderRadius: "16px",
  padding: "14px",
  color: "#cbd5e1",
  marginBottom: "15px",
  fontSize: "11px",
  lineHeight: "18px"
};

const securityIcon = {
  width: "36px",
  height: "36px",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "11px",
  background:
    "rgba(53,208,195,.12)",
  fontSize: "18px"
};

const actionGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "9px"
};

const baseAction = {
  minHeight: "45px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "12px",
  padding: "10px",
  textAlign: "center",
  textDecoration: "none",
  fontSize: "11px",
  lineHeight: "15px",
  fontWeight: "950",
  cursor: "pointer"
};

const voucherAction = {
  ...baseAction,
  border: "none",
  background:
    "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  color: "white"
};

const trackingAction = {
  ...baseAction,
  border:
    "1px solid rgba(53,208,195,.25)",
  background:
    "rgba(53,208,195,.11)",
  color: "#67fff1"
};

const contactAction = {
  ...baseAction,
  border:
    "1px solid rgba(148,163,184,.16)",
  background:
    "rgba(15,23,42,.72)",
  color: "#e2e8f0"
};

const confirmAction = {
  ...baseAction,
  border:
    "1px solid rgba(34,197,94,.30)",
  background:
    "rgba(34,197,94,.14)",
  color: "#bbf7d0"
};

const disputeAction = {
  ...baseAction,
  border:
    "1px solid rgba(245,158,11,.30)",
  background:
    "rgba(245,158,11,.14)",
  color: "#fde68a"
};

const cancelAction = {
  ...baseAction,
  border:
    "1px solid rgba(239,68,68,.30)",
  background:
    "rgba(239,68,68,.14)",
  color: "#fecaca"
};

const disabledAction = {
  ...baseAction,
  border:
    "1px solid rgba(148,163,184,.10)",
  background:
    "rgba(148,163,184,.08)",
  color: "#475569",
  cursor: "not-allowed",
  opacity: 0.72
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "22px",
  background:
    "rgba(2,6,23,.88)",
  backdropFilter: "blur(12px)"
};

const modalCard = {
  width: "100%",
  maxWidth: "560px",
  background:
    "linear-gradient(180deg, rgba(15,23,42,.98), rgba(2,6,23,.98))",
  border:
    "1px solid rgba(56,189,248,.20)",
  borderRadius: "24px",
  padding: "24px",
  boxShadow:
    "0 35px 110px rgba(0,0,0,.55)"
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "14px"
};

const modalLabel = {
  margin: 0,
  color: "#38bdf8",
  fontSize: "10px",
  letterSpacing: "3px",
  fontWeight: "950"
};

const modalTitle = {
  margin: "6px 0 0",
  color: "white",
  fontSize: "25px"
};

const modalCloseButton = {
  width: "40px",
  height: "40px",
  flexShrink: 0,
  borderRadius: "50%",
  border:
    "1px solid rgba(148,163,184,.18)",
  background:
    "rgba(15,23,42,.74)",
  color: "white",
  fontSize: "24px",
  cursor: "pointer"
};

const modalText = {
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: "22px"
};

const textarea = {
  width: "100%",
  resize: "vertical",
  minHeight: "130px",
  marginTop: "12px",
  background:
    "rgba(2,6,23,.72)",
  border:
    "1px solid rgba(148,163,184,.18)",
  borderRadius: "15px",
  padding: "14px",
  color: "white",
  outline: "none",
  fontSize: "14px",
  lineHeight: "22px"
};

const modalActions = {
  display: "grid",
  gridTemplateColumns:
    "1fr 1fr",
  gap: "11px",
  marginTop: "18px"
};

const modalSecondaryButton = {
  minHeight: "46px",
  border:
    "1px solid rgba(148,163,184,.18)",
  borderRadius: "13px",
  background:
    "rgba(15,23,42,.72)",
  color: "#e2e8f0",
  fontWeight: "900",
  cursor: "pointer"
};

const modalDangerButton = {
  minHeight: "46px",
  border:
    "1px solid rgba(239,68,68,.32)",
  borderRadius: "13px",
  background:
    "rgba(239,68,68,.16)",
  color: "#fecaca",
  fontWeight: "950",
  cursor: "pointer"
};

const modalWarningButton = {
  minHeight: "46px",
  border:
    "1px solid rgba(245,158,11,.32)",
  borderRadius: "13px",
  background:
    "rgba(245,158,11,.16)",
  color: "#fde68a",
  fontWeight: "950",
  cursor: "pointer"
};

export default Orders;