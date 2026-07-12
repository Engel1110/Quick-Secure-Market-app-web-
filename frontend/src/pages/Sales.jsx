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

const ACTIVE_SALE_STATUSES = [
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

const SELLER_CANCELLABLE_STATUSES = [
  "PENDING",
  "WAITING_PAYMENT",
  "PAYMENT_UNDER_REVIEW",
  "PAYMENT_CONFIRMED",
  "WAITING_SELLER",
  "WAITING_WAREHOUSE"
];

const WAREHOUSE_ACTION_STATUSES = [
  "PAYMENT_CONFIRMED",
  "WAITING_SELLER",
  "WAITING_WAREHOUSE"
];

const DELIVERY_ACTION_STATUSES = [
  "PAYMENT_CONFIRMED",
  "WAITING_SELLER"
];

function Sales() {
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

  const initialView =
    new URLSearchParams(
      location.search
    ).get("view") || "orders";

  const initialStatus =
    new URLSearchParams(
      location.search
    ).get("status") || "ALL";

  const [orders, setOrders] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [
    activeView,
    setActiveView
  ] = useState(
    initialView === "products"
      ? "products"
      : "orders"
  );

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

  const [message, setMessage] =
    useState("");

  const [error, setError] =
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

  useEffect(() => {
    loadSalesData();
  }, []);

  useEffect(() => {
    const params =
      new URLSearchParams(
        location.search
      );

    const view =
      params.get("view");

    const status =
      params.get("status");

    if (
      view === "orders" ||
      view === "products"
    ) {
      setActiveView(view);
    }

    if (status) {
      setStatusFilter(status);
    }
  }, [location.search]);

  const loadSalesData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        ordersResponse,
        productsResponse
      ] = await Promise.allSettled([
        api.get(
          "/orders/my-orders"
        ),

        api.get(
          "/products/my-products"
        )
      ]);

      let loadedOrders = [];
      let loadedProducts = [];

      if (
        ordersResponse.status ===
        "fulfilled"
      ) {
        const responseData =
          ordersResponse.value?.data ||
          {};

        loadedOrders =
          responseData.orders ||
          responseData.data ||
          responseData.myOrders ||
          [];
      }

      if (
        productsResponse.status ===
        "fulfilled"
      ) {
        const responseData =
          productsResponse.value?.data ||
          {};

        loadedProducts =
          responseData.products ||
          responseData.data ||
          responseData.myProducts ||
          [];
      }

      const sellerOrders =
        Array.isArray(loadedOrders)
          ? loadedOrders.filter(
              (order) =>
                isSellerOrder(
                  order,
                  currentUserId
                )
            )
          : [];

      const sellerProducts =
        Array.isArray(loadedProducts)
          ? loadedProducts.filter(
              (product) =>
                isSellerProduct(
                  product,
                  currentUserId
                )
            )
          : [];

      setOrders(sellerOrders);
      setProducts(sellerProducts);

      if (
        ordersResponse.status ===
          "rejected" &&
        productsResponse.status ===
          "rejected"
      ) {
        setError(
          "No se pudieron cargar las ventas ni los productos publicados. Verifica tu sesión y la conexión con el backend."
        );
      } else if (
        ordersResponse.status ===
        "rejected"
      ) {
        setError(
          ordersResponse.reason
            ?.response?.data
            ?.message ||
            "Los productos se cargaron, pero no fue posible consultar las ventas."
        );
      } else if (
        productsResponse.status ===
        "rejected"
      ) {
        setError(
          productsResponse.reason
            ?.response?.data
            ?.message ||
            "Las ventas se cargaron, pero no fue posible consultar tus publicaciones."
        );
      }
    } catch (err) {
      console.error(
        "Error cargando ventas:",
        err?.response?.data ||
          err
      );

      setError(
        err?.response?.data?.message ||
          "No se pudo cargar el área de ventas."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateView = (view) => {
    setActiveView(view);

    const params =
      new URLSearchParams(
        location.search
      );

    params.set("view", view);

    if (view === "products") {
      params.delete("status");
    }

    navigate(
      `/sales?${params.toString()}`,
      {
        replace: true
      }
    );
  };

  const updateStatusFilter = (
    value
  ) => {
    setStatusFilter(value);

    const params =
      new URLSearchParams(
        location.search
      );

    params.set("view", "orders");

    if (value === "ALL") {
      params.delete("status");
    } else {
      params.set(
        "status",
        value
      );
    }

    navigate(
      `/sales?${params.toString()}`,
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
                order?.status
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
                order?.product || {};

              const buyer =
                order?.buyer || {};

              const searchableText = [
                order?._id,
                order?.id,
                order?.orderCode,
                product?.title,
                product?.category,
                buyer?.firstName,
                buyer?.lastName,
                buyer?.email,
                order?.paymentMethod,
                order?.deliveryMethod,
                order?.status
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
      search,
      statusFilter
    ]);

  const filteredProducts =
    useMemo(() => {
      let result = [...products];

      if (search.trim()) {
        const term =
          search
            .trim()
            .toLowerCase();

        result =
          result.filter(
            (product) => {
              const searchableText = [
                product?._id,
                product?.title,
                product?.category,
                product?.description,
                product?.condition,
                product?.location,
                product?.status
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
    }, [products, search]);

  const stats = useMemo(() => {
    const active =
      orders.filter(
        (order) =>
          ACTIVE_SALE_STATUSES.includes(
            normalizeStatus(
              order?.status
            )
          )
      ).length;

    const completed =
      orders.filter(
        (order) =>
          normalizeStatus(
            order?.status
          ) === "COMPLETED"
      );

    const disputed =
      orders.filter(
        (order) =>
          normalizeStatus(
            order?.status
          ) === "DISPUTED"
      ).length;

    const protectedAmount =
      orders
        .filter(
          (order) =>
            ![
              "CANCELLED",
              "REJECTED",
              "REFUNDED"
            ].includes(
              normalizeStatus(
                order?.status
              )
            )
        )
        .reduce(
          (total, order) =>
            total +
            Number(
              order?.totalAmount ||
              order?.price ||
              order?.product?.price ||
              0
            ),
          0
        );

    const completedAmount =
      completed.reduce(
        (total, order) =>
          total +
          Number(
            order?.totalAmount ||
            order?.price ||
            order?.product?.price ||
            0
          ),
        0
      );

    return {
      sales: orders.length,
      active,
      completed:
        completed.length,
      disputed,
      products:
        products.length,
      protectedAmount,
      completedAmount
    };
  }, [orders, products]);

  const goToTracking = (
    order
  ) => {
    const orderId =
      getOrderId(order);

    if (!orderId) {
      setError(
        "La venta no tiene un identificador válido para abrir el seguimiento."
      );
      return;
    }

    navigate(
      `/orders/${orderId}`,
      {
        state: {
          order,
          role: "seller"
        }
      }
    );
  };

  const sendToWarehouse = async (
    order
  ) => {
    const orderId =
      getOrderId(order);

    if (!orderId) {
      setError(
        "La venta no tiene un identificador válido."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "¿Confirmas que el producto fue enviado o entregado al almacén QSM?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(
        `warehouse-${orderId}`
      );

      setError("");
      setMessage("");

      await api.patch(
        `/orders/${orderId}/send-to-warehouse`
      );

      setMessage(
        "El producto fue marcado como enviado al almacén QSM."
      );

      await loadSalesData();
    } catch (err) {
      console.error(
        "Error enviando al almacén:",
        err?.response?.data ||
          err
      );

      setError(
        err?.response?.data?.message ||
          "No se pudo registrar el envío al almacén."
      );
    } finally {
      setActionLoading("");
    }
  };

  const requestDelivery = async (
    order
  ) => {
    const orderId =
      getOrderId(order);

    if (!orderId) {
      setError(
        "La venta no tiene un identificador válido."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "¿Deseas solicitar un Delivery QSM verificado para recoger el producto?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(
        `delivery-${orderId}`
      );

      setError("");
      setMessage("");

      await api.patch(
        `/orders/${orderId}/request-delivery`
      );

      setMessage(
        "La recogida por Delivery QSM fue solicitada correctamente."
      );

      await loadSalesData();
    } catch (err) {
      console.error(
        "Error solicitando delivery:",
        err?.response?.data ||
          err
      );

      setError(
        err?.response?.data?.message ||
          "No se pudo solicitar el Delivery QSM."
      );
    } finally {
      setActionLoading("");
    }
  };

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

  const cancelSale = async () => {
    const order =
      cancelModal.order;

    const orderId =
      getOrderId(order);

    if (!orderId) {
      setError(
        "La venta no tiene un identificador válido."
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
            cancelReason.trim(),
          requestedBy:
            "SELLER"
        }
      );

      setMessage(
        "La venta fue cancelada correctamente. QSM registró la responsabilidad del vendedor."
      );

      closeCancelModal();
      await loadSalesData();
    } catch (err) {
      console.error(
        "Error cancelando venta:",
        err?.response?.data ||
          err
      );

      setError(
        err?.response?.data?.message ||
          "No se pudo cancelar la venta."
      );
    } finally {
      setActionLoading("");
    }
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

        button:disabled {
          transform: none !important;
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

        @media (max-width: 1280px) {
          .sales-layout {
            grid-template-columns:
              240px minmax(0, 1fr)
              !important;
          }

          .sales-stats {
            grid-template-columns:
              repeat(3, minmax(0, 1fr))
              !important;
          }

          .sales-list {
            grid-template-columns:
              repeat(
                auto-fit,
                minmax(360px, 1fr)
              )
              !important;
          }
        }

        @media (max-width: 1024px) {
          .sales-layout {
            grid-template-columns:
              1fr !important;
          }

          .sales-sidebar {
            display: none !important;
          }

          .sales-hero {
            flex-direction:
              column !important;
            align-items:
              flex-start !important;
          }

          .sales-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr))
              !important;
          }

          .sales-filters {
            grid-template-columns:
              1fr !important;
          }
        }

        @media (max-width: 760px) {
          .sales-main {
            padding:
              18px 14px 58px
              !important;
          }

          .sales-stats,
          .sales-list,
          .sales-tabs,
          .sale-actions,
          .sale-info-grid,
          .product-actions {
            grid-template-columns:
              1fr !important;
          }

          .sale-product-row {
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
        className="sales-layout"
        style={layout}
      >
        <div className="sales-sidebar">
          <Sidebar />
        </div>

        <main
          className="sales-main"
          style={main}
        >
          <Topbar />

          <section
            className="sales-hero"
            style={hero}
          >
            <div>
              <p style={label}>
                VENTAS QSM
              </p>

              <h1 style={title}>
                Mis ventas
              </h1>

              <p style={subtitle}>
                Gestiona tus productos vendidos,
                revisa compradores, prepara las
                entregas y consulta el estado de
                cada operación protegida.
              </p>
            </div>

            <div style={heroActions}>
              <button
                type="button"
                onClick={loadSalesData}
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
                to="/new-product"
                style={primaryButton}
              >
                + Publicar producto
              </Link>
            </div>
          </section>

          <section
            className="sales-stats"
            style={statsGrid}
          >
            <StatCard
              icon="💰"
              title="Ventas registradas"
              value={stats.sales}
              text="Todas las órdenes donde eres vendedor."
            />

            <StatCard
              icon="🛡"
              title="Ventas activas"
              value={stats.active}
              text="Operaciones que siguen en proceso."
            />

            <StatCard
              icon="✅"
              title="Completadas"
              value={stats.completed}
              text="Ventas entregadas y finalizadas."
            />

            <StatCard
              icon="⚠"
              title="En reclamo"
              value={stats.disputed}
              text="Operaciones actualmente en revisión."
            />

            <StatCard
              icon="📦"
              title="Productos publicados"
              value={stats.products}
              text="Publicaciones creadas por tu cuenta."
            />

            <StatCard
              icon="💵"
              title="Monto protegido"
              value={formatMoney(
                stats.protectedAmount
              )}
              text="Valor acumulado de ventas no canceladas."
            />
          </section>

          <section style={controlPanel}>
            <div
              className="sales-tabs"
              style={viewTabs}
            >
              <button
                type="button"
                onClick={() =>
                  updateView("orders")
                }
                style={
                  activeView === "orders"
                    ? activeTabButton
                    : tabButton
                }
              >
                🧾 Órdenes de venta
              </button>

              <button
                type="button"
                onClick={() =>
                  updateView("products")
                }
                style={
                  activeView === "products"
                    ? activeTabButton
                    : tabButton
                }
              >
                📦 Productos publicados
              </button>
            </div>

            <div
              className="sales-filters"
              style={filtersRow}
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
                  placeholder={
                    activeView === "orders"
                      ? "Buscar por producto, comprador, orden, pago o entrega..."
                      : "Buscar producto por título, categoría, descripción o estado..."
                  }
                  style={searchInput}
                />
              </div>

              {activeView === "orders" && (
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
                    Acción del vendedor
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
                    Listo para entregar
                  </option>

                  <option value="OUT_FOR_DELIVERY">
                    En delivery
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
              )}
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
                💰
              </div>

              <h2>
                Cargando tus ventas...
              </h2>

              <p>
                QSM está consultando tus
                órdenes y productos publicados.
              </p>
            </div>
          )}

          {!loading &&
            activeView === "orders" &&
            filteredOrders.length === 0 && (
              <div style={centerCard}>
                <div style={centerIcon}>
                  🧾
                </div>

                <h2>
                  No hay ventas para mostrar
                </h2>

                <p>
                  Todavía no tienes ventas o
                  los filtros no encontraron
                  resultados.
                </p>

                <Link
                  to="/new-product"
                  style={primaryButton}
                >
                  Publicar producto
                </Link>
              </div>
            )}

          {!loading &&
            activeView === "products" &&
            filteredProducts.length === 0 && (
              <div style={centerCard}>
                <div style={centerIcon}>
                  📦
                </div>

                <h2>
                  No hay productos publicados
                </h2>

                <p>
                  Publica tu primer producto
                  para iniciar tu historial de
                  ventas en QSM.
                </p>

                <Link
                  to="/new-product"
                  style={primaryButton}
                >
                  Crear publicación
                </Link>
              </div>
            )}

          {!loading &&
            activeView === "orders" &&
            filteredOrders.length > 0 && (
              <section
                className="sales-list"
                style={salesGrid}
              >
                {filteredOrders.map(
                  (order, index) => (
                    <SaleOrderCard
                      key={
                        getOrderId(order) ||
                        index
                      }
                      order={order}
                      actionLoading={
                        actionLoading
                      }
                      onTracking={
                        goToTracking
                      }
                      onWarehouse={
                        sendToWarehouse
                      }
                      onDelivery={
                        requestDelivery
                      }
                      onCancel={
                        openCancelModal
                      }
                    />
                  )
                )}
              </section>
            )}

          {!loading &&
            activeView === "products" &&
            filteredProducts.length > 0 && (
              <section
                className="sales-list"
                style={salesGrid}
              >
                {filteredProducts.map(
                  (product, index) => (
                    <SellerProductCard
                      key={
                        product?._id ||
                        product?.id ||
                        index
                      }
                      product={product}
                    />
                  )
                )}
              </section>
            )}
        </main>
      </div>

      <AiAssistant
        pageContext="sales"
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
                  CANCELAR VENTA
                </p>

                <h2 style={modalTitle}>
                  Confirma la cancelación
                </h2>
              </div>

              <button
                type="button"
                onClick={closeCancelModal}
                style={modalCloseButton}
              >
                ×
              </button>
            </div>

            <div style={sellerWarning}>
              <strong>
                ⚠ Responsabilidad del vendedor
              </strong>

              <p>
                Si cancelas después de que el
                comprador reservó el producto,
                QSM puede registrar una
                compensación o penalización en
                el historial de la venta.
              </p>
            </div>

            <p style={modalText}>
              Explica claramente por qué no
              puedes continuar con esta venta.
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
                onClick={closeCancelModal}
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
                onClick={cancelSale}
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
                  : "Cancelar venta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}   
function SaleOrderCard({
  order,
  actionLoading,
  onTracking,
  onWarehouse,
  onDelivery,
  onCancel
}) {
  const product =
    order?.product || {};

  const buyer =
    order?.buyer || {};

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

  const escrowStatus =
    String(
      order?.escrowStatus ||
      "NOT_FUNDED"
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
    getProductImage(product);

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

  const canSendToWarehouse =
    deliveryMethod ===
      "QSM_WAREHOUSE" &&
    WAREHOUSE_ACTION_STATUSES.includes(
      status
    );

  const canRequestDelivery =
    deliveryMethod ===
      "QSM_VERIFIED_DELIVERY" &&
    DELIVERY_ACTION_STATUSES.includes(
      status
    );

  const canCancel =
    SELLER_CANCELLABLE_STATUSES.includes(
      status
    );

  const warehouseLoading =
    actionLoading ===
    `warehouse-${orderId}`;

  const deliveryLoading =
    actionLoading ===
    `delivery-${orderId}`;

  const cancelLoading =
    actionLoading ===
    `cancel-${orderId}`;

  const isActionBusy =
    warehouseLoading ||
    deliveryLoading ||
    cancelLoading;

  const requiredAction =
    getSellerRequiredAction(
      status,
      deliveryMethod,
      deliveryStatus
    );

  return (
    <article style={saleCard}>
      <div style={saleHeader}>
        <div>
          <p style={smallLabel}>
            VENTA PROTEGIDA
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
        className="sale-product-row"
        style={productRow}
      >
        <div style={productImageBox}>
          {image ? (
            <img
              src={image}
              alt={
                product?.title ||
                "Producto vendido"
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
              "Producto vendido"}
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
        className="sale-info-grid"
        style={informationGrid}
      >
        <InfoItem
          icon="👤"
          title="Comprador"
          value={formatUser(
            buyer,
            "Comprador QSM"
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
          icon="🛡"
          title="Fondos protegidos"
          value={formatEscrowStatus(
            escrowStatus
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

        <InfoItem
          icon="📦"
          title="Estado de la venta"
          value={formatStatus(
            status
          )}
        />
      </div>

      <div style={amountBox}>
        <div style={amountRow}>
          <span>
            Precio del producto
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
            Total de la venta
          </span>

          <strong>
            {formatMoney(
              totalAmount
            )}
          </strong>
        </div>
      </div>

      <div
        style={
          requiredAction.type ===
          "success"
            ? actionNoticeSuccess
            : requiredAction.type ===
              "warning"
            ? actionNoticeWarning
            : requiredAction.type ===
              "danger"
            ? actionNoticeDanger
            : actionNoticeInfo
        }
      >
        <div style={actionNoticeIcon}>
          {requiredAction.icon}
        </div>

        <div>
          <strong>
            {requiredAction.title}
          </strong>

          <p>
            {requiredAction.text}
          </p>
        </div>
      </div>

      <div style={sellerProtectionBox}>
        <div style={sellerProtectionIcon}>
          🛡
        </div>

        <div>
          <strong>
            Venta protegida por QSM
          </strong>

          <p>
            El dinero permanece protegido
            hasta que el comprador reciba el
            producto y la operación sea
            completada correctamente.
          </p>
        </div>
      </div>

      <div
        className="sale-actions"
        style={saleActions}
      >
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
          to={`/messages?buyerId=${
            buyer?._id ||
            buyer?.id ||
            ""
          }&orderId=${
            orderId || ""
          }`}
          style={contactAction}
        >
          💬 Contactar comprador
        </Link>

        <button
          type="button"
          onClick={() =>
            onWarehouse(order)
          }
          disabled={
            !canSendToWarehouse ||
            isActionBusy
          }
          style={
            canSendToWarehouse
              ? warehouseAction
              : disabledAction
          }
        >
          {warehouseLoading
            ? "Procesando..."
            : "🏬 Enviar al almacén"}
        </button>

        <button
          type="button"
          onClick={() =>
            onDelivery(order)
          }
          disabled={
            !canRequestDelivery ||
            isActionBusy
          }
          style={
            canRequestDelivery
              ? deliveryAction
              : disabledAction
          }
        >
          {deliveryLoading
            ? "Solicitando..."
            : "🚚 Solicitar delivery"}
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
            : "✕ Cancelar venta"}
        </button>
      </div>
    </article>
  );
}

function SellerProductCard({
  product
}) {
  const productId =
    product?._id ||
    product?.id ||
    "";

  const image =
    getProductImage(product);

  const status =
    String(
      product?.status ||
      "ACTIVE"
    ).toUpperCase();

  const price =
    Number(
      product?.price ||
      0
    );

  const confidenceScore =
    Number(
      product?.confidenceScore ||
      70
    );

  const riskLevel =
    String(
      product?.riskLevel ||
      "LOW"
    ).toUpperCase();

  return (
    <article style={productCard}>
      <div style={productImageLarge}>
        {image ? (
          <img
            src={image}
            alt={
              product?.title ||
              "Producto publicado"
            }
            style={largeProductImage}
          />
        ) : (
          <span style={largePlaceholder}>
            📦
          </span>
        )}

        <span
          style={productStatusBadge(
            status
          )}
        >
          {formatProductStatus(
            status
          )}
        </span>
      </div>

      <div style={productCardContent}>
        <p style={productCategory}>
          {product?.category ||
            "Producto QSM"}
        </p>

        <h2 style={publishedProductTitle}>
          {product?.title ||
            "Producto publicado"}
        </h2>

        <p style={publishedDescription}>
          {product?.description ||
            "Publicación sin descripción."}
        </p>

        <strong style={publishedPrice}>
          {formatMoney(price)}
        </strong>

        <div style={productMetadata}>
          <span>
            📍{" "}
            {product?.location ||
              "República Dominicana"}
          </span>

          <span>
            📦{" "}
            {formatCondition(
              product?.condition
            )}
          </span>
        </div>

        <div
          className="sale-info-grid"
          style={informationGrid}
        >
          <InfoItem
            icon="🛡"
            title="Riesgo QSM"
            value={formatRiskLevel(
              riskLevel
            )}
          />

          <InfoItem
            icon="⭐"
            title="Confianza"
            value={`${confidenceScore}/100`}
          />

          <InfoItem
            icon="👁"
            title="Visitas"
            value={String(
              product?.views || 0
            )}
          />

          <InfoItem
            icon="❤️"
            title="Favoritos"
            value={String(
              product?.favoritesCount ||
              product?.favorites?.length ||
              0
            )}
          />
        </div>

        <div
          className="product-actions"
          style={productActions}
        >
          <Link
            to={`/product/${productId}`}
            style={primaryProductAction}
          >
            Ver publicación
          </Link>

          <Link
            to={`/product/${productId}/history`}
            style={historyProductAction}
          >
            Ver historial
          </Link>

          <Link
            to={`/products/${productId}/edit`}
            style={editProductAction}
          >
            Editar publicación
          </Link>
        </div>
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

function isSellerOrder(
  order,
  currentUserId
) {
  if (!currentUserId) {
    return false;
  }

  const sellerId =
    getEntityId(
      order?.seller
    ) ||
    order?.sellerId ||
    "";

  return (
    String(sellerId) ===
    String(currentUserId)
  );
}

function isSellerProduct(
  product,
  currentUserId
) {
  if (!currentUserId) {
    return false;
  }

  const sellerId =
    getEntityId(
      product?.seller
    ) ||
    product?.sellerId ||
    "";

  return (
    String(sellerId) ===
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

function formatStatus(status) {
  const value =
    normalizeStatus(status);

  const map = {
    PENDING:
      "Venta pendiente",

    WAITING_PAYMENT:
      "Esperando pago",

    PAYMENT_UNDER_REVIEW:
      "Pago en revisión",

    PAYMENT_CONFIRMED:
      "Pago confirmado",

    WAITING_SELLER:
      "Acción requerida",

    WAITING_WAREHOUSE:
      "Esperando almacén",

    IN_WAREHOUSE:
      "En almacén",

    UNDER_INSPECTION:
      "En inspección",

    READY_FOR_PICKUP:
      "Listo para entregar",

    OUT_FOR_DELIVERY:
      "En delivery",

    WAITING_PIN:
      "Esperando PIN",

    DELIVERED:
      "Producto entregado",

    COMPLETED:
      "Venta completada",

    DISPUTED:
      "En reclamo",

    CANCELLED:
      "Venta cancelada",

    REJECTED:
      "Producto rechazado",

    REFUNDED:
      "Venta reembolsada"
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

function formatEscrowStatus(
  value
) {
  const map = {
    NOT_FUNDED:
      "Sin fondos retenidos",

    PENDING:
      "Retención pendiente",

    HELD:
      "Fondos retenidos",

    UNDER_REVIEW:
      "Fondos en revisión",

    READY_TO_RELEASE:
      "Listos para liberar",

    RELEASED:
      "Pago liberado",

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

function formatProductStatus(
  value
) {
  const map = {
    ACTIVE:
      "Disponible",

    SOLD:
      "Vendido",

    RESERVED:
      "Reservado",

    PAUSED:
      "Pausado",

    REJECTED:
      "Rechazado",

    DRAFT:
      "Borrador",

    INACTIVE:
      "Inactivo"
  };

  return (
    map[value] ||
    value ||
    "Disponible"
  );
}

function formatRiskLevel(
  value
) {
  const map = {
    LOW:
      "Riesgo bajo",

    MEDIUM:
      "Riesgo medio",

    HIGH:
      "Riesgo alto",

    CRITICAL:
      "Riesgo crítico"
  };

  return (
    map[value] ||
    value ||
    "Riesgo bajo"
  );
}
function formatUser(
  user,
  fallback = "Usuario QSM"
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
    user?.name ||
    user?.email ||
    fallback
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

function getProductImage(product) {
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

function getSellerRequiredAction(
  status,
  deliveryMethod,
  deliveryStatus
) {
  const normalized =
    normalizeStatus(status);

  if (
    normalized === "CANCELLED"
  ) {
    return {
      type: "danger",
      icon: "✕",
      title:
        "Venta cancelada",
      text:
        "Esta operación fue cancelada y no requiere más acciones."
    };
  }

  if (
    normalized === "DISPUTED"
  ) {
    return {
      type: "warning",
      icon: "⚠",
      title:
        "Venta en reclamo",
      text:
        "QSM está revisando la operación. No realices nuevas acciones hasta recibir instrucciones."
    };
  }

  if (
    normalized === "REJECTED"
  ) {
    return {
      type: "danger",
      icon: "!",
      title:
        "Producto rechazado",
      text:
        "El producto no superó la verificación y la operación deberá ser revisada."
    };
  }

  if (
    normalized === "COMPLETED"
  ) {
    return {
      type: "success",
      icon: "✓",
      title:
        "Venta completada",
      text:
        "El comprador recibió el producto y la operación fue finalizada correctamente."
    };
  }

  if (
    normalized === "DELIVERED"
  ) {
    return {
      type: "success",
      icon: "✓",
      title:
        "Producto entregado",
      text:
        "El producto fue entregado. La operación está pendiente de cierre final."
    };
  }

  if (
    normalized ===
    "WAITING_PAYMENT"
  ) {
    return {
      type: "info",
      icon: "💳",
      title:
        "Esperando confirmación del pago",
      text:
        "No entregues el producto hasta que QSM registre el pago o la condición de pago contra entrega."
    };
  }

  if (
    normalized ===
      "PAYMENT_CONFIRMED" ||
    normalized ===
      "WAITING_SELLER"
  ) {
    if (
      deliveryMethod ===
      "QSM_WAREHOUSE"
    ) {
      return {
        type: "warning",
        icon: "🏬",
        title:
          "Debes entregar el producto al almacén",
        text:
          "Prepara el producto y entrégalo en el almacén QSM para continuar con la inspección."
      };
    }

    return {
      type: "warning",
      icon: "🚚",
      title:
        "Debes coordinar la recogida",
      text:
        "Solicita un Delivery QSM verificado para recoger, revisar y transportar el producto."
    };
  }

  if (
    normalized ===
    "WAITING_WAREHOUSE"
  ) {
    return {
      type: "info",
      icon: "📦",
      title:
        "Esperando recepción en almacén",
      text:
        "El producto fue marcado como enviado. QSM confirmará cuando sea recibido."
    };
  }

  if (
    normalized ===
      "IN_WAREHOUSE" ||
    deliveryStatus ===
      "RECEIVED_AT_WAREHOUSE"
  ) {
    return {
      type: "info",
      icon: "🔍",
      title:
        "Producto en almacén",
      text:
        "El equipo de QSM está preparando la revisión del producto."
    };
  }

  if (
    normalized ===
    "UNDER_INSPECTION"
  ) {
    return {
      type: "info",
      icon: "🔍",
      title:
        "Producto en inspección",
      text:
        "QSM está verificando que el producto coincida con la publicación."
    };
  }

  if (
    normalized ===
    "READY_FOR_PICKUP"
  ) {
    return {
      type: "success",
      icon: "📦",
      title:
        "Producto aprobado",
      text:
        "El producto fue aprobado y está listo para ser entregado al comprador."
    };
  }

  if (
    normalized ===
    "OUT_FOR_DELIVERY"
  ) {
    return {
      type: "info",
      icon: "🚚",
      title:
        "Producto en delivery",
      text:
        "El producto está en camino hacia el comprador."
    };
  }

  if (
    normalized ===
    "WAITING_PIN"
  ) {
    return {
      type: "warning",
      icon: "🔐",
      title:
        "Esperando validación del PIN",
      text:
        "El comprador debe presentar su PIN para completar la entrega."
    };
  }

  return {
    type: "info",
    icon: "🛡",
    title:
      "Venta protegida activa",
    text:
      "QSM está registrando y protegiendo cada etapa de la operación."
  };
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
    "repeat(6, minmax(0, 1fr))",
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
  fontSize: "27px",
  lineHeight: 1.05,
  marginBottom: "7px",
  wordBreak: "break-word"
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

const viewTabs = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "10px",
  marginBottom: "14px"
};

const tabButton = {
  minHeight: "48px",
  background:
    "rgba(2,6,23,.45)",
  border:
    "1px solid rgba(148,163,184,.14)",
  color: "#cbd5e1",
  padding: "13px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "900"
};

const activeTabButton = {
  ...tabButton,
  background:
    "linear-gradient(135deg, rgba(56,189,248,.18), rgba(139,92,246,.20))",
  border:
    "1px solid rgba(56,189,248,.35)",
  color: "white"
};

const filtersRow = {
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

const salesGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(430px, 1fr))",
  gap: "20px",
  alignItems: "start"
};

const saleCard = {
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

const saleHeader = {
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

const baseActionNotice = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  borderRadius: "16px",
  padding: "14px",
  marginBottom: "15px",
  fontSize: "11px",
  lineHeight: "18px"
};

const actionNoticeInfo = {
  ...baseActionNotice,
  background:
    "rgba(56,189,248,.09)",
  border:
    "1px solid rgba(56,189,248,.22)",
  color: "#cbd5e1"
};

const actionNoticeWarning = {
  ...baseActionNotice,
  background:
    "rgba(245,158,11,.10)",
  border:
    "1px solid rgba(245,158,11,.25)",
  color: "#fde68a"
};

const actionNoticeSuccess = {
  ...baseActionNotice,
  background:
    "rgba(34,197,94,.10)",
  border:
    "1px solid rgba(34,197,94,.25)",
  color: "#bbf7d0"
};

const actionNoticeDanger = {
  ...baseActionNotice,
  background:
    "rgba(239,68,68,.10)",
  border:
    "1px solid rgba(239,68,68,.25)",
  color: "#fecaca"
};

const actionNoticeIcon = {
  width: "36px",
  height: "36px",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "11px",
  background:
    "rgba(255,255,255,.06)",
  fontSize: "18px"
};

const sellerProtectionBox = {
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

const sellerProtectionIcon = {
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

const saleActions = {
  display: "grid",
  gridTemplateColumns:
    "repeat(5, minmax(0, 1fr))",
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

const trackingAction = {
  ...baseAction,
  border: "none",
  background:
    "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  color: "white"
};

const contactAction = {
  ...baseAction,
  border:
    "1px solid rgba(148,163,184,.16)",
  background:
    "rgba(15,23,42,.72)",
  color: "#e2e8f0"
};

const warehouseAction = {
  ...baseAction,
  border:
    "1px solid rgba(139,92,246,.30)",
  background:
    "rgba(139,92,246,.14)",
  color: "#ddd6fe"
};

const deliveryAction = {
  ...baseAction,
  border:
    "1px solid rgba(56,189,248,.30)",
  background:
    "rgba(56,189,248,.14)",
  color: "#bae6fd"
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

const productCard = {
  width: "100%",
  minWidth: 0,
  overflow: "hidden",
  background:
    "rgba(15,23,42,.76)",
  border:
    "1px solid rgba(56,189,248,.16)",
  borderRadius: "26px",
  boxShadow:
    "0 25px 80px rgba(0,0,0,.22)",
  backdropFilter: "blur(15px)",
  animation: "fadeUp .45s ease"
};

const productImageLarge = {
  position: "relative",
  width: "100%",
  height: "260px",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "linear-gradient(135deg, rgba(56,189,248,.16), rgba(139,92,246,.16))"
};

const largeProductImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  background: "#020617"
};

const largePlaceholder = {
  fontSize: "62px"
};

const productStatusBadge = (status) => {
  const colors = {
    ACTIVE: [
      "rgba(34,197,94,.16)",
      "#bbf7d0",
      "rgba(34,197,94,.32)"
    ],

    SOLD: [
      "rgba(56,189,248,.16)",
      "#bae6fd",
      "rgba(56,189,248,.32)"
    ],

    RESERVED: [
      "rgba(245,158,11,.16)",
      "#fde68a",
      "rgba(245,158,11,.32)"
    ],

    PAUSED: [
      "rgba(148,163,184,.16)",
      "#cbd5e1",
      "rgba(148,163,184,.32)"
    ],

    REJECTED: [
      "rgba(239,68,68,.16)",
      "#fecaca",
      "rgba(239,68,68,.32)"
    ],

    DRAFT: [
      "rgba(139,92,246,.16)",
      "#ddd6fe",
      "rgba(139,92,246,.32)"
    ],

    INACTIVE: [
      "rgba(148,163,184,.16)",
      "#94a3b8",
      "rgba(148,163,184,.32)"
    ]
  };

  const selected =
    colors[status] ||
    colors.ACTIVE;

  return {
    position: "absolute",
    top: "14px",
    right: "14px",
    background: selected[0],
    color: selected[1],
    border: `1px solid ${selected[2]}`,
    borderRadius: "999px",
    padding: "7px 11px",
    fontSize: "11px",
    fontWeight: "950"
  };
};

const productCardContent = {
  padding: "21px"
};

const publishedProductTitle = {
  margin: "7px 0 8px",
  color: "white",
  fontSize: "24px",
  lineHeight: "1.15",
  wordBreak: "break-word"
};

const publishedDescription = {
  minHeight: "44px",
  margin: "0 0 10px",
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "20px"
};

const publishedPrice = {
  display: "block",
  marginBottom: "13px",
  color: "#35d0c3",
  fontSize: "23px"
};

const productMetadata = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginBottom: "15px",
  color: "#cbd5e1",
  fontSize: "11px"
};

const productActions = {
  display: "grid",
  gridTemplateColumns:
    "repeat(3, minmax(0, 1fr))",
  gap: "9px",
  marginTop: "15px"
};

const primaryProductAction = {
  ...baseAction,
  border: "none",
  background:
    "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  color: "white"
};

const historyProductAction = {
  ...baseAction,
  border:
    "1px solid rgba(53,208,195,.25)",
  background:
    "rgba(53,208,195,.11)",
  color: "#67fff1"
};

const editProductAction = {
  ...baseAction,
  border:
    "1px solid rgba(148,163,184,.16)",
  background:
    "rgba(15,23,42,.72)",
  color: "#e2e8f0"
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

const sellerWarning = {
  marginBottom: "14px",
  padding: "14px",
  borderRadius: "15px",
  background:
    "rgba(245,158,11,.10)",
  border:
    "1px solid rgba(245,158,11,.25)",
  color: "#fde68a",
  fontSize: "12px",
  lineHeight: "19px"
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

export default Sales;