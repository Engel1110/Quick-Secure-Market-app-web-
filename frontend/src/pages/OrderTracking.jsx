import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom";

import api from "../api/axios";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

const RECEIPT_STATUSES = [
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
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

function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialOrder =
    location.state?.order ||
    null;

  const [order, setOrder] =
    useState(initialOrder);

  const [loading, setLoading] =
    useState(!initialOrder);

  const [actionLoading, setActionLoading] =
    useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [showPin, setShowPin] =
    useState(false);

  const [disputeModal, setDisputeModal] =
    useState(false);

  const [disputeReason, setDisputeReason] =
    useState("");

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

  useEffect(() => {
    if (!id) {
      setError(
        "No se recibió un identificador de orden."
      );
      setLoading(false);
      return;
    }

    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          `/orders/${id}`
        );

      const loadedOrder =
        response?.data?.order ||
        response?.data?.data ||
        null;

      if (!loadedOrder) {
        throw new Error(
          "La respuesta del servidor no contiene la orden."
        );
      }

      setOrder(loadedOrder);
    } catch (err) {
      console.error(
        "Error cargando seguimiento:",
        err?.response?.data ||
          err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo cargar el seguimiento de la orden."
      );
    } finally {
      setLoading(false);
    }
  };

  const orderId =
    order?._id ||
    order?.id ||
    id ||
    "";

  const buyerId =
    getEntityId(
      order?.buyer
    );

  const sellerId =
    getEntityId(
      order?.seller
    );

  const isBuyer =
    String(buyerId) ===
    String(currentUserId);

  const isSeller =
    String(sellerId) ===
    String(currentUserId);

  const status =
    normalizeStatus(
      order?.status
    );

  const canConfirmReceipt =
    isBuyer &&
    RECEIPT_STATUSES.includes(
      status
    );

  const canOpenDispute =
    (isBuyer || isSeller) &&
    DISPUTABLE_STATUSES.includes(
      status
    );

  const goToVoucher = () => {
    if (!orderId) {
      setError(
        "La orden no tiene un identificador válido."
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

  const confirmReceipt = async () => {
    if (!canConfirmReceipt) {
      return;
    }

    const confirmed =
      window.confirm(
        "¿Confirmas que recibiste el producto correctamente?"
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(
        "confirm-receipt"
      );

      setError("");
      setMessage("");

      const response =
        await api.patch(
          `/orders/${orderId}/confirm-receipt`
        );

      setOrder(
        response?.data?.order ||
        order
      );

      setMessage(
        "Recepción confirmada. La compra fue completada correctamente."
      );
    } catch (err) {
      console.error(
        "Error confirmando recepción:",
        err?.response?.data ||
          err
      );

      setError(
        err?.response?.data?.message ||
          "No se pudo confirmar la recepción."
      );
    } finally {
      setActionLoading("");
    }
  };

  const openDispute = async () => {
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
        "open-dispute"
      );

      setError("");
      setMessage("");

      const response =
        await api.post(
          `/orders/${orderId}/dispute`,
          {
            reason:
              disputeReason.trim()
          }
        );

      setOrder(
        response?.data?.order ||
        order
      );

      setMessage(
        "El reclamo fue abierto correctamente."
      );

      setDisputeModal(false);
      setDisputeReason("");
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

  const contactUserId =
    isBuyer
      ? sellerId
      : buyerId;

  const contactLabel =
    isBuyer
      ? "Contactar al vendedor"
      : "Contactar al comprador";

  const trackingSteps =
    useMemo(() => {
      return buildTrackingSteps(
        order
      );
    }, [order]);

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
        textarea {
          font-family: inherit;
        }

        a,
        button {
          transition:
            transform .22s ease,
            opacity .22s ease,
            border-color .22s ease,
            background .22s ease;
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

        @keyframes pulseCurrent {
          0% {
            box-shadow:
              0 0 0 0 rgba(139, 92, 246, .45);
          }

          70% {
            box-shadow:
              0 0 0 14px rgba(139, 92, 246, 0);
          }

          100% {
            box-shadow:
              0 0 0 0 rgba(139, 92, 246, 0);
          }
        }

        @keyframes flowLine {
          from {
            background-position:
              0 0;
          }

          to {
            background-position:
              0 48px;
          }
        }

        @media (max-width: 1280px) {
          .tracking-layout {
            grid-template-columns:
              240px minmax(0, 1fr)
              !important;
          }

          .tracking-content-grid {
            grid-template-columns:
              minmax(0, 1fr) 340px
              !important;
          }
        }

        @media (max-width: 1080px) {
          .tracking-layout {
            grid-template-columns:
              1fr !important;
          }

          .tracking-sidebar {
            display: none !important;
          }

          .tracking-content-grid {
            grid-template-columns:
              1fr !important;
          }

          .tracking-summary-column {
            display: grid !important;
            grid-template-columns:
              repeat(2, minmax(0, 1fr))
              !important;
          }
        }

        @media (max-width: 760px) {
          .tracking-main {
            padding:
              18px 14px 54px
              !important;
          }

          .tracking-header-row {
            flex-direction:
              column !important;
            align-items:
              flex-start !important;
          }

          .tracking-order-banner {
            grid-template-columns:
              1fr !important;
          }

          .tracking-summary-column {
            grid-template-columns:
              1fr !important;
          }

          .tracking-product-row {
            grid-template-columns:
              88px minmax(0, 1fr)
              !important;
          }

          .tracking-action-grid {
            grid-template-columns:
              1fr !important;
          }

          .tracking-step {
            grid-template-columns:
              42px minmax(0, 1fr)
              !important;
          }

          .tracking-step-meta {
            align-items:
              flex-start !important;
            text-align:
              left !important;
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
        className="tracking-layout"
        style={layout}
      >
        <div className="tracking-sidebar">
          <Sidebar />
        </div>

        <main
          className="tracking-main"
          style={main}
        >
          <Topbar />

          <section
            className="tracking-header-row"
            style={headerRow}
          >
            <div>
              <button
                type="button"
                onClick={() =>
                  navigate(
                    isSeller
                      ? "/sales"
                      : "/orders"
                  )
                }
                style={backButton}
              >
                ← Volver a{" "}
                {isSeller
                  ? "Mis ventas"
                  : "Mis compras"}
              </button>

              <p style={eyebrow}>
                SEGUIMIENTO QSM
              </p>

              <h1 style={title}>
                Seguimiento de tu compra protegida
              </h1>

              <p style={subtitle}>
                Consulta cada etapa de la operación,
                desde la creación de la compra hasta
                la entrega y confirmación final.
              </p>
            </div>

            <button
              type="button"
              onClick={loadOrder}
              disabled={loading}
              style={{
                ...refreshButton,
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
                : "↻ Actualizar estado"}
            </button>
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
                📍
              </div>

              <h2>
                Cargando seguimiento...
              </h2>

              <p>
                QSM está consultando el estado
                más reciente de la orden.
              </p>
            </div>
          )}

          {!loading && !order && (
            <div style={centerCard}>
              <div style={centerIcon}>
                ⚠
              </div>

              <h2>
                No se pudo mostrar la orden
              </h2>

              <p>
                Verifica que la orden exista y
                que tu usuario tenga permisos
                para consultarla.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    isSeller
                      ? "/sales"
                      : "/orders"
                  )
                }
                style={primaryButton}
              >
                Volver
              </button>
            </div>
          )}

          {!loading && order && (
            <>
              <section
                className="tracking-order-banner"
                style={orderBanner}
              >
                <div style={orderBannerLeft}>
                  <div style={orderIconBox}>
                    📦
                  </div>

                  <div>
                    <p style={smallLabel}>
                      ORDEN PROTEGIDA
                    </p>

                    <h2 style={orderCodeTitle}>
                      {order?.orderCode ||
                        `QSM-${String(
                          orderId
                        )
                          .slice(-8)
                          .toUpperCase()}`}
                    </h2>

                    <p style={orderCreatedText}>
                      Creada el{" "}
                      {formatDate(
                        order?.createdAt
                      )}
                    </p>
                  </div>
                </div>

                <div style={currentStatusBox}>
                  <span style={currentStatusLabel}>
                    Estado actual
                  </span>

                  <strong style={currentStatusValue}>
                    {formatStatus(status)}
                  </strong>

                  <span style={currentStatusUpdated}>
                    Actualizado:{" "}
                    {formatDate(
                      order?.updatedAt ||
                        order?.createdAt
                    )}
                  </span>
                </div>
              </section>

              <div
                className="tracking-content-grid"
                style={contentGrid}
              >
                <section style={timelineCard}>
                  <div style={sectionHeader}>
                    <div>
                      <p style={sectionEyebrow}>
                        PROGRESO DE LA ORDEN
                      </p>

                      <h2 style={sectionTitle}>
                        Estado de tu operación
                      </h2>
                    </div>

                    <span
                      style={statusBadge(
                        status
                      )}
                    >
                      {formatStatus(status)}
                    </span>
                  </div>

                  <div style={timelineList}>
                    {trackingSteps.map(
                      (step, index) => (
                        <TrackingStep
                          key={`${step.code}-${index}`}
                          step={step}
                          isLast={
                            index ===
                            trackingSteps.length -
                              1
                          }
                        />
                      )
                    )}
                  </div>
                </section>

                <aside
                  className="tracking-summary-column"
                  style={summaryColumn}
                >
                  <section style={summaryCard}>
                    <div style={summaryHeader}>
                      <div>
                        <p style={sectionEyebrow}>
                          RESUMEN
                        </p>

                        <h2 style={summaryTitle}>
                          Resumen de la orden
                        </h2>
                      </div>

                      <span style={summaryShield}>
                        🛡
                      </span>
                    </div>

                    <div
                      className="tracking-product-row"
                      style={productRow}
                    >
                      <div style={productImageBox}>
                        {getOrderImage(
                          order?.product
                        ) ? (
                          <img
                            src={getOrderImage(
                              order?.product
                            )}
                            alt={
                              order?.product?.title ||
                              "Producto"
                            }
                            style={productImage}
                          />
                        ) : (
                          <span
                            style={
                              productPlaceholder
                            }
                          >
                            📦
                          </span>
                        )}
                      </div>

                      <div style={productDetails}>
                        <p style={productCategory}>
                          {order?.product?.category ||
                            "Producto QSM"}
                        </p>

                        <h3 style={productTitle}>
                          {order?.product?.title ||
                            "Producto comprado"}
                        </h3>

                        <p style={productCondition}>
                          {formatCondition(
                            order?.product
                              ?.condition
                          )}
                        </p>

                        <strong style={productPrice}>
                          {formatMoney(
                            order?.totalAmount ||
                              order?.price ||
                              order?.product
                                ?.price ||
                              0
                          )}
                        </strong>
                      </div>
                    </div>

                    <div style={summaryRows}>
                      <SummaryRow
                        label="Método de pago"
                        value={formatPaymentMethod(
                          order?.paymentMethod
                        )}
                      />

                      <SummaryRow
                        label="Estado del pago"
                        value={formatPaymentStatus(
                          order?.paymentStatus
                        )}
                      />

                      <SummaryRow
                        label="Método de entrega"
                        value={formatDeliveryMethod(
                          order?.deliveryMethod
                        )}
                      />

                      <SummaryRow
                        label="Estado de entrega"
                        value={formatDeliveryStatus(
                          order?.deliveryStatus ||
                            order?.warehouseStatus
                        )}
                      />

                      <SummaryRow
                        label="Protección QSM"
                        value={
                          Number(
                            order?.protectionFee ||
                              0
                          ) > 0
                            ? formatMoney(
                                order
                                  ?.protectionFee
                              )
                            : "Incluida"
                        }
                      />

                      <SummaryRow
                        label="Cargo de entrega"
                        value={
                          Number(
                            order?.shippingFee ||
                              0
                          ) > 0
                            ? formatMoney(
                                order?.shippingFee
                              )
                            : "Sin cargo"
                        }
                      />

                      <SummaryRow
                        label="Total"
                        value={formatMoney(
                          order?.totalAmount ||
                            order?.price ||
                            0
                        )}
                        highlight
                      />
                    </div>
                  </section>

                  <section style={pinCard}>
                    <div style={pinHeader}>
                      <div style={pinIconBox}>
                        🔐
                      </div>

                      <div>
                        <p style={pinLabel}>
                          PIN DE ENTREGA
                        </p>

                        <h2 style={pinTitle}>
                          Código de seguridad
                        </h2>
                      </div>
                    </div>

                    <p style={pinDescription}>
                      Este PIN se utiliza para
                      validar la entrega final del
                      producto. No lo compartas
                      antes de tiempo.
                    </p>

                    <div style={pinValueBox}>
                      <strong style={pinValue}>
                        {isBuyer
                          ? showPin
                            ? formatPin(
                                order?.deliveryPin
                              )
                            : maskPin(
                                order?.deliveryPin
                              )
                          : "••••••"}
                      </strong>

                      {isBuyer && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowPin(
                              (value) =>
                                !value
                            )
                          }
                          style={pinToggleButton}
                        >
                          {showPin
                            ? "Ocultar"
                            : "Mostrar"}
                        </button>
                      )}
                    </div>

                    <div style={pinWarning}>
                      🛡 Solo el comprador debe
                      mostrar este PIN al personal
                      autorizado de QSM.
                    </div>
                  </section>

                  <section style={actionsCard}>
                    <p style={sectionEyebrow}>
                      ACCIONES
                    </p>

                    <h2 style={actionsTitle}>
                      Acciones disponibles
                    </h2>

                    <div
                      className="tracking-action-grid"
                      style={actionGrid}
                    >
                      <button
                        type="button"
                        onClick={goToVoucher}
                        style={voucherButton}
                      >
                        📄 Ver voucher
                      </button>

                      <Link
                        to={`/messages?${
                          isBuyer
                            ? "sellerId"
                            : "buyerId"
                        }=${contactUserId}&orderId=${orderId}`}
                        style={contactButton}
                      >
                        💬 {contactLabel}
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          setDisputeModal(true)
                        }
                        disabled={
                          !canOpenDispute ||
                          Boolean(
                            actionLoading
                          )
                        }
                        style={
                          canOpenDispute
                            ? disputeButton
                            : disabledButton
                        }
                      >
                        ⚠ Abrir un reclamo
                      </button>

                      <button
                        type="button"
                        onClick={confirmReceipt}
                        disabled={
                          !canConfirmReceipt ||
                          Boolean(
                            actionLoading
                          )
                        }
                        style={
                          canConfirmReceipt
                            ? confirmButton
                            : disabledButton
                        }
                      >
                        {actionLoading ===
                        "confirm-receipt"
                          ? "Confirmando..."
                          : "✅ Confirmar recepción"}
                      </button>
                    </div>
                  </section>

                  <section style={protectionCard}>
                    <div style={protectionIcon}>
                      🛡
                    </div>

                    <div>
                      <strong>
                        Operación protegida por QSM
                      </strong>

                      <p>
                        Cada cambio queda registrado
                        para proteger al comprador y
                        al vendedor.
                      </p>
                    </div>
                  </section>
                </aside>
              </div>
            </>
          )}
        </main>
      </div>

      <AiAssistant
        pageContext="order-tracking"
      />

      {disputeModal && (
        <div
          style={modalOverlay}
          onClick={() => {
            if (!actionLoading) {
              setDisputeModal(false);
            }
          }}
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
                onClick={() =>
                  setDisputeModal(false)
                }
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
                style={modalCloseButton}
              >
                ×
              </button>
            </div>

            <p style={modalText}>
              Describe claramente el problema
              con el producto, el pago, la
              entrega o la otra parte de la
              operación.
            </p>

            <textarea
              value={disputeReason}
              onChange={(event) =>
                setDisputeReason(
                  event.target.value
                )
              }
              placeholder="Describe el problema con al menos 10 caracteres..."
              rows={6}
              style={textarea}
            />

            <div style={characterCount}>
              {disputeReason.trim().length}
              /1500
            </div>

            <div style={modalActions}>
              <button
                type="button"
                onClick={() =>
                  setDisputeModal(false)
                }
                disabled={
                  Boolean(
                    actionLoading
                  )
                }
                style={modalSecondaryButton}
              >
                Cancelar
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
                {actionLoading ===
                "open-dispute"
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
function TrackingStep({
  step,
  isLast
}) {
  const state =
    step.state ||
    "pending";

  const isCompleted =
    state ===
    "completed";

  const isCurrent =
    state ===
    "current";

  const isDanger =
    state ===
    "danger";

  return (
    <div
      className="tracking-step"
      style={
        isCurrent
          ? trackingStepCurrent
          : isDanger
          ? trackingStepDanger
          : trackingStep
      }
    >
      <div style={stepIndicatorColumn}>
        <div
          style={
            isCompleted
              ? stepCircleCompleted
              : isCurrent
              ? stepCircleCurrent
              : isDanger
              ? stepCircleDanger
              : stepCirclePending
          }
        >
          {isCompleted
            ? "✓"
            : isDanger
            ? "!"
            : step.icon}
        </div>

        {!isLast && (
          <div
            style={
              isCompleted
                ? stepLineCompleted
                : isCurrent
                ? stepLineCurrent
                : stepLinePending
            }
          />
        )}
      </div>

      <div style={stepContent}>
        <div style={stepHeader}>
          <div>
            <h3
              style={
                isCompleted
                  ? stepTitleCompleted
                  : isCurrent
                  ? stepTitleCurrent
                  : isDanger
                  ? stepTitleDanger
                  : stepTitlePending
              }
            >
              {step.number}.{" "}
              {step.title}
            </h3>

            <p style={stepDescription}>
              {step.description}
            </p>
          </div>

          <div
            className="tracking-step-meta"
            style={stepMeta}
          >
            {step.date && (
              <span style={stepDate}>
                {formatDate(
                  step.date
                )}
              </span>
            )}

            <span
              style={
                isCompleted
                  ? stepBadgeCompleted
                  : isCurrent
                  ? stepBadgeCurrent
                  : isDanger
                  ? stepBadgeDanger
                  : stepBadgePending
              }
            >
              {isCompleted
                ? "Completado"
                : isCurrent
                ? "En progreso"
                : isDanger
                ? "Atención"
                : "Pendiente"}
            </span>
          </div>
        </div>

        {step.metadata &&
          Object.keys(
            step.metadata
          ).length > 0 && (
            <div style={stepMetadataBox}>
              {Object.entries(
                step.metadata
              ).map(
                ([key, value]) => (
                  <span
                    key={key}
                    style={
                      stepMetadataItem
                    }
                  >
                    <strong>
                      {formatMetadataKey(
                        key
                      )}
                      :
                    </strong>{" "}
                    {String(value)}
                  </span>
                )
              )}
            </div>
          )}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  highlight = false
}) {
  return (
    <div
      style={
        highlight
          ? summaryRowHighlight
          : summaryRow
      }
    >
      <span style={summaryRowLabel}>
        {label}
      </span>

      <strong
        style={
          highlight
            ? summaryRowValueHighlight
            : summaryRowValue
        }
      >
        {value}
      </strong>
    </div>
  );
}

function buildTrackingSteps(
  order
) {
  if (!order) {
    return [];
  }

  const status =
    normalizeStatus(
      order?.status
    );

  const deliveryMethod =
    String(
      order?.deliveryMethod ||
      ""
    ).toUpperCase();

  const timeline =
    Array.isArray(
      order?.timeline
    )
      ? order.timeline
      : [];

  const eventMap =
    timeline.reduce(
      (accumulator, event) => {
        const key =
          String(
            event?.status || ""
          ).toUpperCase();

        if (
          key &&
          !accumulator[key]
        ) {
          accumulator[key] =
            event;
        }

        return accumulator;
      },
      {}
    );

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
      status
    );

  const hasReached = (
    target
  ) => {
    const targetIndex =
      orderedStatuses.indexOf(
        target
      );

    if (
      currentIndex < 0 ||
      targetIndex < 0
    ) {
      return false;
    }

    return (
      currentIndex >= targetIndex
    );
  };

  const isTerminalDanger = [
    "DISPUTED",
    "CANCELLED",
    "REJECTED",
    "REFUNDED"
  ].includes(status);

  const getStepState = (
    targetStatuses,
    currentStatuses
  ) => {
    if (
      currentStatuses.includes(
        status
      )
    ) {
      return "current";
    }

    if (
      targetStatuses.some(
        (target) =>
          hasReached(target)
      )
    ) {
      return "completed";
    }

    return "pending";
  };

  const paymentEvent =
    eventMap
      .CARD_DEMO_AUTHORIZED ||
    eventMap
      .WAITING_TRANSFER_CONFIRMATION ||
    eventMap
      .WAITING_CASH_PAYMENT ||
    eventMap.PAYMENT_CONFIRMED;

  const sellerEvent =
    eventMap
      .WAITING_FOR_SELLER ||
    eventMap
      .SELLER_NOTIFIED;

  const warehouseSentEvent =
    eventMap
      .PRODUCT_SENT_TO_WAREHOUSE ||
    eventMap
      .IN_TRANSIT_TO_WAREHOUSE;

  const pickupRequestedEvent =
    eventMap
      .VERIFIED_DELIVERY_REQUESTED ||
    eventMap
      .PICKUP_REQUESTED;

  const reviewEvent =
    eventMap
      .UNDER_INSPECTION ||
    eventMap
      .WAREHOUSE_REVIEW_STARTED;

  const approvedEvent =
    eventMap
      .PRODUCT_APPROVED ||
    eventMap
      .WAREHOUSE_APPROVED ||
    eventMap.APPROVED;

  const readyEvent =
    eventMap
      .READY_FOR_PICKUP;

  const pinEvent =
    eventMap
      .PIN_GENERATED ||
    eventMap
      .WAITING_PIN;

  const deliveredEvent =
    eventMap
      .DELIVERED ||
    eventMap
      .BUYER_CONFIRMED_RECEIPT;

  const completedEvent =
    eventMap
      .ORDER_COMPLETED;

  const logisticsTitle =
    deliveryMethod ===
    "QSM_VERIFIED_DELIVERY"
      ? "Delivery QSM solicitado"
      : deliveryMethod ===
        "DIRECT_DELIVERY"
      ? "Entrega coordinada"
      : "Producto enviado al almacén";

  const logisticsDescription =
    deliveryMethod ===
    "QSM_VERIFIED_DELIVERY"
      ? "Un agente QSM recogerá, revisará y transportará el producto."
      : deliveryMethod ===
        "DIRECT_DELIVERY"
      ? "Comprador y vendedor coordinan la entrega bajo seguimiento QSM."
      : "El vendedor debe entregar el producto al almacén para iniciar la revisión.";

  const steps = [
    {
      number: 1,
      code:
        "ORDER_CREATED",
      icon: "✓",
      title:
        "Compra creada",
      description:
        "La compra protegida fue registrada correctamente.",
      date:
        eventMap
          .ORDER_CREATED
          ?.createdAt ||
        order?.createdAt,
      state:
        status ===
        "PENDING"
          ? "current"
          : "completed"
    },

    {
      number: 2,
      code:
        "PAYMENT_REGISTERED",
      icon: "💳",
      title:
        "Pago registrado",
      description:
        formatPaymentStepDescription(
          order
        ),
      date:
        paymentEvent?.createdAt ||
        order?.paymentConfirmedAt ||
        null,
      state:
        getStepState(
          [
            "WAITING_PAYMENT",
            "PAYMENT_UNDER_REVIEW",
            "PAYMENT_CONFIRMED"
          ],
          [
            "WAITING_PAYMENT",
            "PAYMENT_UNDER_REVIEW",
            "PAYMENT_CONFIRMED"
          ]
        )
    },

    {
      number: 3,
      code:
        "SELLER_NOTIFIED",
      icon: "🔔",
      title:
        "Vendedor notificado",
      description:
        "El vendedor recibió la información e instrucciones de la venta.",
      date:
        sellerEvent?.createdAt ||
        order?.createdAt,
      state:
        getStepState(
          [
            "WAITING_SELLER"
          ],
          [
            "WAITING_SELLER"
          ]
        )
    },

    {
      number: 4,
      code:
        "LOGISTICS_STARTED",
      icon:
        deliveryMethod ===
        "QSM_VERIFIED_DELIVERY"
          ? "🚚"
          : "🏬",
      title:
        logisticsTitle,
      description:
        logisticsDescription,
      date:
        deliveryMethod ===
        "QSM_VERIFIED_DELIVERY"
          ? pickupRequestedEvent
              ?.createdAt ||
            order
              ?.pickupScheduledAt
          : warehouseSentEvent
              ?.createdAt ||
            null,
      state:
        getStepState(
          [
            "WAITING_WAREHOUSE",
            "IN_WAREHOUSE",
            "OUT_FOR_DELIVERY"
          ],
          [
            "WAITING_WAREHOUSE"
          ]
        )
    },

    {
      number: 5,
      code:
        "UNDER_INSPECTION",
      icon: "🔍",
      title:
        deliveryMethod ===
        "QSM_VERIFIED_DELIVERY"
          ? "Producto en verificación"
          : "En revisión en almacén",
      description:
        deliveryMethod ===
        "QSM_VERIFIED_DELIVERY"
          ? "El agente especializado está verificando el producto."
          : "El equipo del almacén está revisando que el producto coincida con la publicación.",
      date:
        reviewEvent?.createdAt ||
        order
          ?.warehouseReceivedAt ||
        null,
      state:
        getStepState(
          [
            "UNDER_INSPECTION"
          ],
          [
            "IN_WAREHOUSE",
            "UNDER_INSPECTION"
          ]
        )
    },

    {
      number: 6,
      code:
        "PRODUCT_APPROVED",
      icon: "🛡",
      title:
        "Producto aprobado",
      description:
        "QSM confirmó que el producto cumple con la información publicada.",
      date:
        approvedEvent?.createdAt ||
        order
          ?.warehouseApprovedAt ||
        null,
      state:
        getStepState(
          [
            "READY_FOR_PICKUP"
          ],
          [
            "READY_FOR_PICKUP"
          ]
        )
    },

    {
      number: 7,
      code:
        "READY_FOR_DELIVERY",
      icon: "📦",
      title:
        "Listo para entregar",
      description:
        "El producto está preparado para continuar con la entrega.",
      date:
        readyEvent?.createdAt ||
        order
          ?.readyForPickupAt ||
        null,
      state:
        getStepState(
          [
            "READY_FOR_PICKUP",
            "OUT_FOR_DELIVERY"
          ],
          [
            "READY_FOR_PICKUP",
            "OUT_FOR_DELIVERY"
          ]
        )
    },

    {
      number: 8,
      code:
        "WAITING_PIN",
      icon: "🔐",
      title:
        "Esperando PIN de entrega",
      description:
        "El comprador debe presentar su PIN para validar la entrega.",
      date:
        pinEvent?.createdAt ||
        null,
      state:
        getStepState(
          [
            "WAITING_PIN"
          ],
          [
            "WAITING_PIN"
          ]
        )
    },

    {
      number: 9,
      code:
        "DELIVERED",
      icon: "🤝",
      title:
        "Producto entregado",
      description:
        "El producto fue entregado correctamente al comprador.",
      date:
        deliveredEvent
          ?.createdAt ||
        order?.deliveredAt ||
        null,
      state:
        getStepState(
          [
            "DELIVERED"
          ],
          [
            "DELIVERED"
          ]
        )
    },

    {
      number: 10,
      code:
        "COMPLETED",
      icon: "✓",
      title:
        "Compra completada",
      description:
        "La operación fue cerrada y el pago quedó liberado.",
      date:
        completedEvent
          ?.createdAt ||
        order?.completedAt ||
        null,
      state:
        status ===
        "COMPLETED"
          ? "completed"
          : "pending"
    }
  ];

  if (
    isTerminalDanger
  ) {
    const terminalMap = {
      DISPUTED: {
        title:
          "Operación en reclamo",
        description:
          order?.disputeReason ||
          "QSM está revisando el reclamo abierto en esta orden.",
        date:
          order
            ?.disputeOpenedAt ||
          eventMap
            .DISPUTE_OPENED
            ?.createdAt ||
          order?.updatedAt
      },

      CANCELLED: {
        title:
          "Operación cancelada",
        description:
          order
            ?.cancellationReason ||
          "La operación fue cancelada.",
        date:
          order?.cancelledAt ||
          eventMap
            .ORDER_CANCELLED
            ?.createdAt ||
          order?.updatedAt
      },

      REJECTED: {
        title:
          "Producto rechazado",
        description:
          order
            ?.inspectionNotes ||
          "El producto no superó la verificación de QSM.",
        date:
          order?.updatedAt
      },

      REFUNDED: {
        title:
          "Operación reembolsada",
        description:
          "QSM registró el reembolso correspondiente.",
        date:
          order?.refundedAt ||
          order?.updatedAt
      }
    };

    const terminal =
      terminalMap[status];

    steps.push({
      number:
        steps.length + 1,
      code:
        status,
      icon: "!",
      title:
        terminal.title,
      description:
        terminal.description,
      date:
        terminal.date,
      state:
        "danger"
    });
  }

  return steps;
}

function formatPaymentStepDescription(
  order
) {
  const paymentMethod =
    String(
      order?.paymentMethod ||
      ""
    ).toUpperCase();

  if (
    paymentMethod ===
    "CARD"
  ) {
    return "El pago con tarjeta fue autorizado en modo demostración.";
  }

  if (
    paymentMethod ===
    "BANK_TRANSFER"
  ) {
    return "La transferencia quedó registrada y será validada según el flujo de entrega.";
  }

  if (
    paymentMethod ===
    "CASH_ON_DELIVERY"
  ) {
    return "El pago en efectivo será confirmado durante la entrega.";
  }

  return "QSM registró el método de pago seleccionado.";
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

function getEntityId(entity) {
  if (!entity) {
    return "";
  }

  if (
    typeof entity ===
    "string"
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

function normalizeStatus(
  value
) {
  const status =
    String(
      value || "PENDING"
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
    aliases[status] ||
    status
  );
}

function formatStatus(
  value
) {
  const status =
    normalizeStatus(value);

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
      "En camino al almacén",

    IN_WAREHOUSE:
      "Recibido en almacén",

    UNDER_INSPECTION:
      "En revisión en almacén",

    READY_FOR_PICKUP:
      "Listo para entregar",

    OUT_FOR_DELIVERY:
      "En camino al comprador",

    WAITING_PIN:
      "Esperando PIN",

    DELIVERED:
      "Producto entregado",

    COMPLETED:
      "Compra completada",

    DISPUTED:
      "Operación en reclamo",

    CANCELLED:
      "Operación cancelada",

    REJECTED:
      "Producto rechazado",

    REFUNDED:
      "Operación reembolsada"
  };

  return (
    map[status] ||
    status ||
    "Pendiente"
  );
}

function formatPaymentMethod(
  value
) {
  const method =
    String(
      value || ""
    ).toUpperCase();

  const map = {
    BANK_TRANSFER:
      "Transferencia contra entrega",

    CASH_ON_DELIVERY:
      "Efectivo contra entrega",

    CARD:
      "Tarjeta — simulación"
  };

  return (
    map[method] ||
    "No especificado"
  );
}

function formatPaymentStatus(
  value
) {
  const status =
    String(
      value || ""
    ).toUpperCase();

  const map = {
    PENDING:
      "Pendiente",

    PENDING_PROOF:
      "Esperando validación",

    PROOF_UPLOADED:
      "Comprobante recibido",

    UNDER_REVIEW:
      "En revisión",

    PENDING_DELIVERY:
      "Contra entrega",

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
    map[status] ||
    "Pendiente"
  );
}

function formatDeliveryMethod(
  value
) {
  const method =
    String(
      value || ""
    ).toUpperCase();

  const map = {
    QSM_WAREHOUSE:
      "Almacén QSM",

    QSM_VERIFIED_DELIVERY:
      "Delivery QSM verificado",

    DIRECT_DELIVERY:
      "Entrega coordinada"
  };

  return (
    map[method] ||
    "No especificado"
  );
}

function formatDeliveryStatus(
  value
) {
  const status =
    String(
      value || ""
    ).toUpperCase();

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
    map[status] ||
    "Seguimiento pendiente"
  );
}

function formatCondition(
  value
) {
  const condition =
    String(
      value || ""
    ).toUpperCase();

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
    map[condition] ||
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
    return "Pendiente";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Pendiente";
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

function formatPin(value) {
  const pin =
    String(value || "")
      .replace(/\D/g, "")
      .slice(0, 6);

  if (!pin) {
    return "Pendiente";
  }

  return pin
    .split("")
    .join(" ");
}

function maskPin(value) {
  const pin =
    String(value || "")
      .replace(/\D/g, "")
      .slice(0, 6);

  return pin
    ? "• • • • • •"
    : "Pendiente";
}

function getOrderImage(product) {
  if (!product) {
    return "";
  }

  const image =
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

  return getImageUrl(image);
}

function getImageUrl(image) {
  if (!image) {
    return "";
  }

  const raw =
    typeof image ===
    "string"
      ? image
      : image?.url ||
        image?.path ||
        image?.secure_url ||
        image?.imageUrl ||
        image?.publicUrl ||
        "";

  if (!raw) {
    return "";
  }

  const clean =
    String(raw)
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
    clean.startsWith(
      "http://"
    ) ||
    clean.startsWith(
      "https://"
    )
  ) {
    return clean;
  }

  const apiOrigin =
    getApiOrigin();

  if (
    clean.startsWith(
      "/uploads"
    )
  ) {
    return `${apiOrigin}${clean}`;
  }

  if (
    clean.startsWith(
      "uploads"
    )
  ) {
    return `${apiOrigin}/${clean}`;
  }

  return `${apiOrigin}/uploads/products/images/${clean}`;
}

function getApiOrigin() {
  const apiUrl =
    import.meta.env
      .VITE_API_URL ||
    "http://localhost:5000/api";

  return apiUrl
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");
}

function formatMetadataKey(
  value
) {
  const map = {
    paymentMethod:
      "Método de pago",

    deliveryMethod:
      "Método de entrega",

    trackingNumber:
      "Número de seguimiento",

    trackingCompany:
      "Empresa de transporte",

    bankName:
      "Banco",

    refundAmount:
      "Reembolso",

    depositStatus:
      "Estado del depósito",

    shippingFee:
      "Cargo de entrega",

    pickupAddress:
      "Dirección de recogida",

    deliveryAddress:
      "Dirección de entrega"
  };

  return (
    map[value] ||
    value
      .replace(
        /([A-Z])/g,
        " $1"
      )
      .trim()
  );
}
/*
|--------------------------------------------------------------------------
| Estilos generales
|--------------------------------------------------------------------------
*/

const page = {
  width: "100%",
  minHeight: "100vh",
  color: "#f8fafc",
  background:
    "radial-gradient(circle at 88% 10%, rgba(124,58,237,.14), transparent 30%), radial-gradient(circle at 12% 20%, rgba(6,182,212,.10), transparent 28%), #020617"
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
  maxWidth: "1740px",
  margin: "0 auto",
  padding: "24px 34px 72px",
  overflowX: "hidden"
};

/*
|--------------------------------------------------------------------------
| Encabezado
|--------------------------------------------------------------------------
*/

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "28px",
  margin: "22px 0 26px"
};

const backButton = {
  minHeight: "42px",
  marginBottom: "20px",
  padding: "10px 15px",
  borderRadius: "13px",
  border:
    "1px solid rgba(148,163,184,.18)",
  background:
    "rgba(15,23,42,.65)",
  color: "#e2e8f0",
  fontSize: "13px",
  fontWeight: "850",
  cursor: "pointer"
};

const eyebrow = {
  margin: 0,
  color: "#22d3ee",
  fontSize: "11px",
  letterSpacing: "4px",
  fontWeight: "950"
};

const title = {
  margin: "10px 0",
  maxWidth: "900px",
  fontSize:
    "clamp(36px, 3.5vw, 62px)",
  lineHeight: "1.02",
  letterSpacing: "-2px"
};

const subtitle = {
  maxWidth: "830px",
  margin: 0,
  color: "#94a3b8",
  fontSize: "16px",
  lineHeight: "28px"
};

const refreshButton = {
  minHeight: "48px",
  padding: "12px 18px",
  borderRadius: "14px",
  border:
    "1px solid rgba(56,189,248,.28)",
  background:
    "rgba(14,116,144,.15)",
  color: "#bae6fd",
  fontWeight: "900",
  cursor: "pointer",
  whiteSpace: "nowrap"
};

const primaryButton = {
  minHeight: "48px",
  padding: "13px 20px",
  border: "none",
  borderRadius: "14px",
  background:
    "linear-gradient(135deg, #06b6d4, #2563eb, #7c3aed)",
  color: "white",
  fontWeight: "950",
  cursor: "pointer"
};

/*
|--------------------------------------------------------------------------
| Mensajes
|--------------------------------------------------------------------------
*/

const successBox = {
  marginBottom: "18px",
  padding: "14px 17px",
  borderRadius: "15px",
  border:
    "1px solid rgba(34,197,94,.30)",
  background:
    "rgba(34,197,94,.12)",
  color: "#bbf7d0",
  fontWeight: "850",
  lineHeight: "22px"
};

const errorBox = {
  marginBottom: "18px",
  padding: "14px 17px",
  borderRadius: "15px",
  border:
    "1px solid rgba(248,113,113,.30)",
  background:
    "rgba(127,29,29,.24)",
  color: "#fecaca",
  fontWeight: "850",
  lineHeight: "22px"
};

const centerCard = {
  minHeight: "340px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  borderRadius: "26px",
  border:
    "1px solid rgba(56,189,248,.16)",
  background:
    "rgba(15,23,42,.72)",
  padding: "38px",
  color: "#cbd5e1"
};

const centerIcon = {
  width: "76px",
  height: "76px",
  marginBottom: "16px",
  borderRadius: "23px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "linear-gradient(135deg, rgba(6,182,212,.20), rgba(124,58,237,.24))",
  fontSize: "34px"
};

/*
|--------------------------------------------------------------------------
| Banner principal de la orden
|--------------------------------------------------------------------------
*/

const orderBanner = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) 320px",
  gap: "18px",
  alignItems: "stretch",
  marginBottom: "20px",
  padding: "20px",
  borderRadius: "24px",
  border:
    "1px solid rgba(56,189,248,.16)",
  background:
    "linear-gradient(135deg, rgba(15,23,42,.90), rgba(8,47,73,.52))",
  boxShadow:
    "0 24px 80px rgba(0,0,0,.22)",
  animation: "fadeUp .45s ease"
};

const orderBannerLeft = {
  display: "flex",
  alignItems: "center",
  gap: "16px"
};

const orderIconBox = {
  width: "72px",
  height: "72px",
  flexShrink: 0,
  borderRadius: "21px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border:
    "1px solid rgba(139,92,246,.32)",
  background:
    "linear-gradient(135deg, rgba(99,102,241,.28), rgba(124,58,237,.38))",
  fontSize: "34px",
  boxShadow:
    "0 12px 40px rgba(124,58,237,.18)"
};

const smallLabel = {
  margin: 0,
  color: "#22d3ee",
  fontSize: "10px",
  letterSpacing: "3px",
  fontWeight: "950"
};

const orderCodeTitle = {
  margin: "7px 0 5px",
  fontSize: "25px",
  lineHeight: "1.1",
  wordBreak: "break-word"
};

const orderCreatedText = {
  margin: 0,
  color: "#94a3b8",
  fontSize: "12px"
};

const currentStatusBox = {
  minHeight: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: "18px",
  borderRadius: "18px",
  border:
    "1px solid rgba(56,189,248,.12)",
  background:
    "rgba(2,6,23,.42)"
};

const currentStatusLabel = {
  color: "#64748b",
  fontSize: "11px",
  marginBottom: "6px"
};

const currentStatusValue = {
  color: "#22d3ee",
  fontSize: "19px",
  lineHeight: "24px"
};

const currentStatusUpdated = {
  marginTop: "8px",
  color: "#94a3b8",
  fontSize: "11px"
};

/*
|--------------------------------------------------------------------------
| Contenido principal
|--------------------------------------------------------------------------
*/

const contentGrid = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1fr) 380px",
  gap: "20px",
  alignItems: "start"
};

const timelineCard = {
  minWidth: 0,
  borderRadius: "25px",
  border:
    "1px solid rgba(56,189,248,.15)",
  background:
    "rgba(15,23,42,.76)",
  padding: "20px",
  boxShadow:
    "0 25px 90px rgba(0,0,0,.22)",
  backdropFilter: "blur(14px)",
  animation: "fadeUp .5s ease"
};

const sectionHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "18px"
};

const sectionEyebrow = {
  margin: 0,
  color: "#22d3ee",
  fontSize: "9px",
  letterSpacing: "3px",
  fontWeight: "950"
};

const sectionTitle = {
  margin: "6px 0 0",
  fontSize: "22px"
};

const timelineList = {
  display: "grid",
  gap: "8px"
};

/*
|--------------------------------------------------------------------------
| Badge de estado
|--------------------------------------------------------------------------
*/

const statusBadge = (value) => {
  const status =
    normalizeStatus(value);

  const colors = {
    PENDING: [
      "rgba(245,158,11,.13)",
      "#fde68a",
      "rgba(245,158,11,.32)"
    ],

    WAITING_PAYMENT: [
      "rgba(245,158,11,.13)",
      "#fde68a",
      "rgba(245,158,11,.32)"
    ],

    PAYMENT_UNDER_REVIEW: [
      "rgba(59,130,246,.13)",
      "#bfdbfe",
      "rgba(59,130,246,.32)"
    ],

    PAYMENT_CONFIRMED: [
      "rgba(34,197,94,.13)",
      "#bbf7d0",
      "rgba(34,197,94,.32)"
    ],

    WAITING_SELLER: [
      "rgba(245,158,11,.13)",
      "#fde68a",
      "rgba(245,158,11,.32)"
    ],

    WAITING_WAREHOUSE: [
      "rgba(124,58,237,.14)",
      "#ddd6fe",
      "rgba(124,58,237,.32)"
    ],

    IN_WAREHOUSE: [
      "rgba(124,58,237,.14)",
      "#ddd6fe",
      "rgba(124,58,237,.32)"
    ],

    UNDER_INSPECTION: [
      "rgba(139,92,246,.15)",
      "#ddd6fe",
      "rgba(139,92,246,.34)"
    ],

    READY_FOR_PICKUP: [
      "rgba(34,197,94,.13)",
      "#bbf7d0",
      "rgba(34,197,94,.32)"
    ],

    OUT_FOR_DELIVERY: [
      "rgba(6,182,212,.14)",
      "#a5f3fc",
      "rgba(6,182,212,.32)"
    ],

    WAITING_PIN: [
      "rgba(236,72,153,.14)",
      "#fbcfe8",
      "rgba(236,72,153,.32)"
    ],

    DELIVERED: [
      "rgba(34,197,94,.14)",
      "#bbf7d0",
      "rgba(34,197,94,.32)"
    ],

    COMPLETED: [
      "rgba(34,197,94,.16)",
      "#86efac",
      "rgba(34,197,94,.36)"
    ],

    DISPUTED: [
      "rgba(245,158,11,.16)",
      "#fde68a",
      "rgba(245,158,11,.36)"
    ],

    CANCELLED: [
      "rgba(239,68,68,.15)",
      "#fecaca",
      "rgba(239,68,68,.34)"
    ],

    REJECTED: [
      "rgba(239,68,68,.15)",
      "#fecaca",
      "rgba(239,68,68,.34)"
    ],

    REFUNDED: [
      "rgba(168,85,247,.15)",
      "#e9d5ff",
      "rgba(168,85,247,.34)"
    ]
  };

  const selected =
    colors[status] ||
    colors.PENDING;

  return {
    maxWidth: "190px",
    padding: "8px 12px",
    borderRadius: "999px",
    border: `1px solid ${selected[2]}`,
    background: selected[0],
    color: selected[1],
    fontSize: "11px",
    fontWeight: "950",
    textAlign: "center"
  };
};

/*
|--------------------------------------------------------------------------
| Pasos del timeline
|--------------------------------------------------------------------------
*/

const trackingStep = {
  display: "grid",
  gridTemplateColumns:
    "48px minmax(0, 1fr)",
  gap: "12px",
  padding: "13px 14px",
  borderRadius: "17px",
  border:
    "1px solid rgba(148,163,184,.08)",
  background:
    "rgba(2,6,23,.28)"
};

const trackingStepCurrent = {
  ...trackingStep,
  border:
    "1px solid rgba(139,92,246,.35)",
  background:
    "linear-gradient(135deg, rgba(76,29,149,.26), rgba(49,46,129,.25))",
  boxShadow:
    "0 14px 42px rgba(124,58,237,.12)"
};

const trackingStepDanger = {
  ...trackingStep,
  border:
    "1px solid rgba(239,68,68,.34)",
  background:
    "rgba(127,29,29,.18)"
};

const stepIndicatorColumn = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center"
};

const baseStepCircle = {
  width: "38px",
  height: "38px",
  flexShrink: 0,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "16px",
  fontWeight: "950",
  zIndex: 2
};

const stepCircleCompleted = {
  ...baseStepCircle,
  background:
    "linear-gradient(135deg, #22c55e, #10b981)",
  color: "#052e16",
  boxShadow:
    "0 0 20px rgba(34,197,94,.32)"
};

const stepCircleCurrent = {
  ...baseStepCircle,
  background:
    "linear-gradient(135deg, #8b5cf6, #6366f1)",
  color: "white",
  animation:
    "pulseCurrent 2s infinite"
};

const stepCircleDanger = {
  ...baseStepCircle,
  background:
    "linear-gradient(135deg, #ef4444, #b91c1c)",
  color: "white"
};

const stepCirclePending = {
  ...baseStepCircle,
  background:
    "rgba(51,65,85,.64)",
  color: "#94a3b8",
  border:
    "1px solid rgba(148,163,184,.16)"
};

const baseStepLine = {
  width: "3px",
  flex: 1,
  minHeight: "36px",
  marginTop: "4px",
  borderRadius: "999px"
};

const stepLineCompleted = {
  ...baseStepLine,
  background:
    "linear-gradient(#22c55e, rgba(34,197,94,.20))"
};

const stepLineCurrent = {
  ...baseStepLine,
  background:
    "repeating-linear-gradient(to bottom, #8b5cf6 0, #8b5cf6 10px, rgba(139,92,246,.22) 10px, rgba(139,92,246,.22) 20px)",
  backgroundSize: "100% 40px",
  animation:
    "flowLine 1.8s linear infinite"
};

const stepLinePending = {
  ...baseStepLine,
  background:
    "rgba(71,85,105,.34)"
};

const stepContent = {
  minWidth: 0
};

const stepHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px"
};

const baseStepTitle = {
  margin: "1px 0 5px",
  fontSize: "15px",
  lineHeight: "20px"
};

const stepTitleCompleted = {
  ...baseStepTitle,
  color: "#4ade80"
};

const stepTitleCurrent = {
  ...baseStepTitle,
  color: "#c4b5fd"
};

const stepTitleDanger = {
  ...baseStepTitle,
  color: "#fca5a5"
};

const stepTitlePending = {
  ...baseStepTitle,
  color: "#94a3b8"
};

const stepDescription = {
  margin: 0,
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "19px"
};

const stepMeta = {
  minWidth: "150px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "6px",
  textAlign: "right"
};

const stepDate = {
  color: "#64748b",
  fontSize: "10px",
  lineHeight: "15px"
};

const baseStepBadge = {
  padding: "6px 9px",
  borderRadius: "999px",
  fontSize: "10px",
  fontWeight: "900"
};

const stepBadgeCompleted = {
  ...baseStepBadge,
  color: "#86efac",
  border:
    "1px solid rgba(34,197,94,.28)",
  background:
    "rgba(34,197,94,.10)"
};

const stepBadgeCurrent = {
  ...baseStepBadge,
  color: "#ddd6fe",
  border:
    "1px solid rgba(139,92,246,.30)",
  background:
    "rgba(139,92,246,.13)"
};

const stepBadgeDanger = {
  ...baseStepBadge,
  color: "#fecaca",
  border:
    "1px solid rgba(239,68,68,.30)",
  background:
    "rgba(239,68,68,.12)"
};

const stepBadgePending = {
  ...baseStepBadge,
  color: "#94a3b8",
  border:
    "1px solid rgba(148,163,184,.14)",
  background:
    "rgba(148,163,184,.07)"
};

const stepMetadataBox = {
  display: "flex",
  flexWrap: "wrap",
  gap: "7px",
  marginTop: "10px"
};

const stepMetadataItem = {
  padding: "6px 9px",
  borderRadius: "9px",
  border:
    "1px solid rgba(56,189,248,.12)",
  background:
    "rgba(8,47,73,.28)",
  color: "#cbd5e1",
  fontSize: "10px"
};

/*
|--------------------------------------------------------------------------
| Columna derecha
|--------------------------------------------------------------------------
*/

const summaryColumn = {
  display: "grid",
  gap: "16px"
};

const summaryCard = {
  padding: "20px",
  borderRadius: "23px",
  border:
    "1px solid rgba(56,189,248,.15)",
  background:
    "rgba(15,23,42,.76)",
  boxShadow:
    "0 20px 70px rgba(0,0,0,.18)"
};

const summaryHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  marginBottom: "16px"
};

const summaryTitle = {
  margin: "6px 0 0",
  fontSize: "20px"
};

const summaryShield = {
  width: "46px",
  height: "46px",
  flexShrink: 0,
  borderRadius: "15px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "linear-gradient(135deg, #06b6d4, #7c3aed)",
  fontSize: "22px"
};

const productRow = {
  display: "grid",
  gridTemplateColumns:
    "92px minmax(0, 1fr)",
  gap: "13px",
  alignItems: "center",
  marginBottom: "16px",
  paddingBottom: "16px",
  borderBottom:
    "1px solid rgba(148,163,184,.11)"
};

const productImageBox = {
  width: "92px",
  height: "92px",
  overflow: "hidden",
  borderRadius: "16px",
  border:
    "1px solid rgba(148,163,184,.12)",
  background:
    "linear-gradient(135deg, rgba(6,182,212,.13), rgba(124,58,237,.15))",
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
  fontSize: "38px"
};

const productDetails = {
  minWidth: 0
};

const productCategory = {
  margin: 0,
  color: "#22d3ee",
  fontSize: "9px",
  letterSpacing: "2px",
  fontWeight: "900",
  textTransform: "uppercase"
};

const productTitle = {
  margin: "6px 0",
  fontSize: "17px",
  lineHeight: "21px",
  wordBreak: "break-word"
};

const productCondition = {
  margin: 0,
  color: "#94a3b8",
  fontSize: "11px"
};

const productPrice = {
  display: "block",
  marginTop: "7px",
  color: "#2dd4bf",
  fontSize: "17px"
};

const summaryRows = {
  display: "grid"
};

const summaryRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  padding: "11px 0",
  borderBottom:
    "1px solid rgba(148,163,184,.09)"
};

const summaryRowHighlight = {
  ...summaryRow,
  marginTop: "4px",
  paddingTop: "15px",
  borderBottom: "none"
};

const summaryRowLabel = {
  color: "#94a3b8",
  fontSize: "11px"
};

const summaryRowValue = {
  maxWidth: "58%",
  color: "#e2e8f0",
  fontSize: "11px",
  lineHeight: "17px",
  textAlign: "right",
  wordBreak: "break-word"
};

const summaryRowValueHighlight = {
  ...summaryRowValue,
  color: "#2dd4bf",
  fontSize: "18px"
};

/*
|--------------------------------------------------------------------------
| PIN
|--------------------------------------------------------------------------
*/

const pinCard = {
  padding: "20px",
  borderRadius: "23px",
  border:
    "1px solid rgba(139,92,246,.32)",
  background:
    "linear-gradient(145deg, rgba(30,27,75,.88), rgba(46,16,101,.72))",
  boxShadow:
    "0 20px 60px rgba(76,29,149,.18)"
};

const pinHeader = {
  display: "flex",
  alignItems: "center",
  gap: "12px"
};

const pinIconBox = {
  width: "44px",
  height: "44px",
  flexShrink: 0,
  borderRadius: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(139,92,246,.18)",
  fontSize: "21px"
};

const pinLabel = {
  margin: 0,
  color: "#c4b5fd",
  fontSize: "9px",
  letterSpacing: "2px",
  fontWeight: "950"
};

const pinTitle = {
  margin: "4px 0 0",
  fontSize: "18px"
};

const pinDescription = {
  color: "#cbd5e1",
  fontSize: "11px",
  lineHeight: "18px"
};

const pinValueBox = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  minHeight: "64px",
  marginTop: "14px",
  padding: "12px 14px",
  borderRadius: "15px",
  border:
    "1px solid rgba(167,139,250,.26)",
  background:
    "rgba(15,23,42,.46)"
};

const pinValue = {
  color: "white",
  fontSize: "25px",
  letterSpacing: "5px"
};

const pinToggleButton = {
  minHeight: "38px",
  padding: "8px 11px",
  borderRadius: "11px",
  border:
    "1px solid rgba(167,139,250,.24)",
  background:
    "rgba(124,58,237,.16)",
  color: "#ddd6fe",
  fontWeight: "850",
  cursor: "pointer"
};

const pinWarning = {
  marginTop: "12px",
  color: "#c4b5fd",
  fontSize: "10px",
  lineHeight: "16px"
};

/*
|--------------------------------------------------------------------------
| Acciones
|--------------------------------------------------------------------------
*/

const actionsCard = {
  padding: "20px",
  borderRadius: "23px",
  border:
    "1px solid rgba(56,189,248,.15)",
  background:
    "rgba(15,23,42,.76)"
};

const actionsTitle = {
  margin: "6px 0 14px",
  fontSize: "19px"
};

const actionGrid = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "9px"
};

const baseActionButton = {
  minHeight: "47px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "11px 13px",
  borderRadius: "13px",
  textAlign: "center",
  textDecoration: "none",
  fontSize: "12px",
  fontWeight: "950",
  cursor: "pointer"
};

const voucherButton = {
  ...baseActionButton,
  border:
    "1px solid rgba(6,182,212,.34)",
  background:
    "rgba(6,182,212,.11)",
  color: "#a5f3fc"
};

const contactButton = {
  ...baseActionButton,
  border:
    "1px solid rgba(245,158,11,.30)",
  background:
    "rgba(245,158,11,.10)",
  color: "#fde68a"
};

const disputeButton = {
  ...baseActionButton,
  border:
    "1px solid rgba(239,68,68,.32)",
  background:
    "rgba(239,68,68,.11)",
  color: "#fecaca"
};

const confirmButton = {
  ...baseActionButton,
  border:
    "1px solid rgba(139,92,246,.32)",
  background:
    "linear-gradient(135deg, rgba(99,102,241,.18), rgba(124,58,237,.22))",
  color: "#ddd6fe"
};

const disabledButton = {
  ...baseActionButton,
  border:
    "1px solid rgba(148,163,184,.10)",
  background:
    "rgba(148,163,184,.06)",
  color: "#475569",
  cursor: "not-allowed",
  opacity: 0.72
};

const protectionCard = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  padding: "16px",
  borderRadius: "18px",
  border:
    "1px solid rgba(6,182,212,.20)",
  background:
    "rgba(8,47,73,.26)",
  color: "#cbd5e1",
  fontSize: "11px",
  lineHeight: "18px"
};

const protectionIcon = {
  width: "38px",
  height: "38px",
  flexShrink: 0,
  borderRadius: "12px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "rgba(6,182,212,.13)",
  fontSize: "18px"
};

/*
|--------------------------------------------------------------------------
| Modal de reclamo
|--------------------------------------------------------------------------
*/

const modalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "22px",
  background:
    "rgba(2,6,23,.90)",
  backdropFilter: "blur(12px)"
};

const modalCard = {
  width: "100%",
  maxWidth: "570px",
  padding: "24px",
  borderRadius: "24px",
  border:
    "1px solid rgba(56,189,248,.19)",
  background:
    "linear-gradient(180deg, rgba(15,23,42,.99), rgba(2,6,23,.99))",
  boxShadow:
    "0 35px 120px rgba(0,0,0,.58)"
};

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "15px"
};

const modalLabel = {
  margin: 0,
  color: "#22d3ee",
  fontSize: "9px",
  letterSpacing: "3px",
  fontWeight: "950"
};

const modalTitle = {
  margin: "6px 0 0",
  fontSize: "25px"
};

const modalCloseButton = {
  width: "40px",
  height: "40px",
  flexShrink: 0,
  borderRadius: "50%",
  border:
    "1px solid rgba(148,163,184,.17)",
  background:
    "rgba(15,23,42,.78)",
  color: "white",
  fontSize: "23px",
  cursor: "pointer"
};

const modalText = {
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: "22px"
};

const textarea = {
  width: "100%",
  minHeight: "150px",
  marginTop: "12px",
  padding: "14px",
  resize: "vertical",
  borderRadius: "15px",
  border:
    "1px solid rgba(148,163,184,.18)",
  background:
    "rgba(2,6,23,.74)",
  color: "white",
  outline: "none",
  fontSize: "14px",
  lineHeight: "22px"
};

const characterCount = {
  marginTop: "7px",
  color: "#64748b",
  fontSize: "10px",
  textAlign: "right"
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
  borderRadius: "13px",
  border:
    "1px solid rgba(148,163,184,.18)",
  background:
    "rgba(15,23,42,.72)",
  color: "#e2e8f0",
  fontWeight: "900",
  cursor: "pointer"
};

const modalDangerButton = {
  minHeight: "46px",
  borderRadius: "13px",
  border:
    "1px solid rgba(239,68,68,.32)",
  background:
    "rgba(239,68,68,.15)",
  color: "#fecaca",
  fontWeight: "950",
  cursor: "pointer"
};

export default OrderTracking;