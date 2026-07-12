import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom";

import api from "../api/axios";

function VoucherCompra() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [order, setOrder] = useState(
    location.state?.voucher ||
      location.state?.order ||
      null
  );

  const [loading, setLoading] = useState(
    !location.state?.voucher &&
      !location.state?.order
  );

  const [error, setError] = useState("");
  const [copiedPin, setCopiedPin] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    loadVoucher();
  }, [id]);

  const loadVoucher = async () => {
    try {
      setLoading(true);
      setError("");

      if (
        location.state?.order ||
        location.state?.voucher
      ) {
        const stateOrder =
          location.state.voucher ||
          location.state.order;

        setOrder(stateOrder);
        saveVoucherLocally(stateOrder);
        return;
      }

      if (id) {
        try {
          const response = await api.get(
            `/orders/${id}`
          );

          const backendOrder =
            response?.data?.voucher ||
            response?.data?.order ||
            response?.data?.data ||
            null;

          if (backendOrder) {
            setOrder(backendOrder);
            saveVoucherLocally(backendOrder);
            return;
          }
        } catch (backendError) {
          console.error(
            "No se pudo consultar el voucher en el backend:",
            backendError?.response?.data ||
              backendError.message
          );
        }
      }

      const localVoucher =
        safeJson(
          localStorage.getItem(
            "qsm_last_voucher"
          )
        ) ||
        safeJson(
          localStorage.getItem(
            "qsm_last_order"
          )
        );

      if (!localVoucher) {
        throw new Error(
          "No se encontró la información de esta compra."
        );
      }

      setOrder(localVoucher);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo cargar el voucher de compra."
      );
    } finally {
      setLoading(false);
    }
  };

  const saveVoucherLocally = (
    voucherData
  ) => {
    try {
      localStorage.setItem(
        "qsm_last_voucher",
        JSON.stringify(voucherData)
      );
    } catch (storageError) {
      console.error(
        "No se pudo guardar el voucher localmente:",
        storageError
      );
    }
  };

  const normalizedOrder = useMemo(() => {
    if (!order) return null;

    const product =
      order.product || {};

    const orderId =
      order.orderId ||
      order._id ||
      order.id ||
      id ||
      "";

    const orderCode =
      order.orderCode ||
      order.code ||
      `QSM-${String(
        orderId || Date.now()
      )
        .slice(-8)
        .toUpperCase()}`;

    const deliveryPin =
      order.deliveryPin ||
      order.pin ||
      order.deliveryCode ||
      "Pendiente";

    const price = Number(
      order.price ||
        order.subtotal ||
        product.price ||
        0
    );

    const protectionFee = Number(
      order.protectionFee || 0
    );

    const shippingFee = Number(
      order.shippingFee ||
        order.deliveryFee ||
        0
    );

    const totalAmount = Number(
      order.totalAmount ||
        price +
          protectionFee +
          shippingFee
    );

    return {
      ...order,

      orderId,
      orderCode,
      deliveryPin,

      product: {
        ...product,

        title:
          product.title ||
          order.productTitle ||
          "Producto QSM",

        price,

        image:
          getProductImage(product) ||
          getProductImage(order)
      },

      paymentMethod:
        order.paymentMethod ||
        "PENDING",

      deliveryMethod:
        order.deliveryMethod ||
        "PENDING",

      paymentStatus:
        order.paymentStatus ||
        "PENDING",

      deliveryStatus:
        order.deliveryStatus ||
        order.warehouseStatus ||
        "PENDING",

      status:
        order.status ||
        "PENDING",

      price,
      protectionFee,
      shippingFee,
      totalAmount,

      createdAt:
        order.createdAt ||
        new Date().toISOString()
    };
  }, [order, id]);

  const copyText = async (
    value,
    type
  ) => {
    try {
      await navigator.clipboard.writeText(
        String(value)
      );

      if (type === "pin") {
        setCopiedPin(true);

        setTimeout(() => {
          setCopiedPin(false);
        }, 1600);
      }

      if (type === "code") {
        setCopiedCode(true);

        setTimeout(() => {
          setCopiedCode(false);
        }, 1600);
      }
    } catch (err) {
      console.error(
        "No se pudo copiar:",
        err
      );
    }
  };

  const goToTracking = () => {
    if (!normalizedOrder?.orderId) {
      setError(
        "La orden no tiene un identificador válido para abrir el seguimiento."
      );
      return;
    }

    navigate(
      `/orders/${normalizedOrder.orderId}`,
      {
        state: {
          order: normalizedOrder
        }
      }
    );
  };

  if (loading) {
    return (
      <div style={page}>
        <div style={centerCard}>
          <div style={loadingIcon}>
            🛡
          </div>

          <h1>
            Generando tu voucher...
          </h1>

          <p style={muted}>
            QSM está preparando el
            comprobante y el PIN de
            entrega.
          </p>
        </div>
      </div>
    );
  }

  if (
    error &&
    !normalizedOrder
  ) {
    return (
      <div style={page}>
        <div style={centerCard}>
          <div style={errorIcon}>
            !
          </div>

          <h1>
            No pudimos abrir el voucher
          </h1>

          <p style={errorText}>
            {error}
          </p>

          <Link
            to="/orders?type=buy"
            style={primaryButton}
          >
            Ir a Mis compras
          </Link>
        </div>
      </div>
    );
  }

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
        }

        button,
        a {
          font-family: inherit;
          transition: all .25s ease;
        }

        button:hover,
        a:hover {
          transform: translateY(-2px);
        }

        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes successPulse {
          0%,
          100% {
            transform: scale(1);
            box-shadow:
              0 0 0 0
              rgba(53,208,195,.25);
          }

          50% {
            transform: scale(1.04);
            box-shadow:
              0 0 0 18px
              rgba(53,208,195,0);
          }
        }

        @media (
          max-width: 900px
        ) {
          .voucher-grid {
            grid-template-columns:
              1fr !important;
          }

          .voucher-actions {
            grid-template-columns:
              1fr !important;
          }

          .voucher-product {
            grid-template-columns:
              1fr !important;
          }
        }

        @media (
          max-width: 620px
        ) {
          .voucher-container {
            padding:
              20px 14px 50px
              !important;
          }

          .voucher-info-grid {
            grid-template-columns:
              1fr !important;
          }

          .voucher-pin-row {
            flex-direction:
              column !important;
            align-items:
              stretch !important;
          }
        }
      `}</style>

      <main
        className="voucher-container"
        style={container}
      >
        <div style={topBar}>
          <Link
            to="/marketplace"
            style={backButton}
          >
            ← Marketplace
          </Link>

          <Link
            to="/orders?type=buy"
            style={backButton}
          >
            Mis compras
          </Link>
        </div>

        <section style={header}>
          <div style={successIcon}>
            ✓
          </div>

          <p style={label}>
            COMPRA PROTEGIDA QSM
          </p>

          <h1 style={title}>
            ¡Compra creada correctamente!
          </h1>

          <p style={subtitle}>
            Tu orden fue registrada y
            QSM generó un PIN único para
            validar la entrega.
          </p>
        </section>

        {error && (
          <div style={errorBox}>
            {error}
          </div>
        )}

        <section
          className="voucher-grid"
          style={voucherGrid}
        >
          <article style={voucherCard}>
            <div style={voucherTop}>
              <div>
                <p style={smallLabel}>
                  VOUCHER DIGITAL
                </p>

                <h2 style={voucherTitle}>
                  Compra Protegida
                </h2>
              </div>

              <div style={shieldLogo}>
                🛡
              </div>
            </div>

            <div style={codeBox}>
              <span>
                Código de orden
              </span>

              <div style={codeRow}>
                <strong>
                  {
                    normalizedOrder.orderCode
                  }
                </strong>

                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      normalizedOrder.orderCode,
                      "code"
                    )
                  }
                  style={copyButton}
                >
                  {copiedCode
                    ? "Copiado"
                    : "Copiar"}
                </button>
              </div>
            </div>

            <div
              className="voucher-pin-row"
              style={pinBox}
            >
              <div>
                <span style={pinLabel}>
                  PIN DE ENTREGA
                </span>

                <strong style={pinValue}>
                  {
                    normalizedOrder.deliveryPin
                  }
                </strong>
              </div>

              <button
                type="button"
                onClick={() =>
                  copyText(
                    normalizedOrder.deliveryPin,
                    "pin"
                  )
                }
                style={pinButton}
              >
                {copiedPin
                  ? "✓ PIN copiado"
                  : "Copiar PIN"}
              </button>
            </div>

            <div style={pinWarning}>
              <strong>
                🔐 Mantén este PIN privado
              </strong>

              <p>
                Entrégalo únicamente al
                agente autorizado de QSM
                cuando recibas el producto.
              </p>
            </div>
                        <div
              className="voucher-product"
              style={productSection}
            >
              <div style={productImageBox}>
                {normalizedOrder.product.image ? (
                  <img
                    src={
                      normalizedOrder.product.image
                    }
                    alt={
                      normalizedOrder.product.title
                    }
                    style={productImage}
                  />
                ) : (
                  <div style={productPlaceholder}>
                    📦
                  </div>
                )}
              </div>

              <div style={productInformation}>
                <p style={productLabel}>
                  PRODUCTO COMPRADO
                </p>

                <h3 style={productTitle}>
                  {
                    normalizedOrder.product
                      .title
                  }
                </h3>

                <p style={productDescription}>
                  Esta compra se encuentra
                  protegida por el flujo de
                  verificación, entrega y
                  seguimiento de QSM.
                </p>

                <div style={productPills}>
                  <span style={productPill}>
                    🛡 Compra protegida
                  </span>

                  <span style={productPill}>
                    🔐 Entrega con PIN
                  </span>

                  <span style={productPill}>
                    📍 Seguimiento activo
                  </span>
                </div>
              </div>
            </div>

            <div
              className="voucher-info-grid"
              style={informationGrid}
            >
              <VoucherInfo
                icon="💳"
                title="Método de pago"
                value={formatPaymentMethod(
                  normalizedOrder.paymentMethod
                )}
              />

              <VoucherInfo
                icon="🚚"
                title="Método de entrega"
                value={formatDeliveryMethod(
                  normalizedOrder.deliveryMethod
                )}
              />

              <VoucherInfo
                icon="📅"
                title="Fecha de compra"
                value={formatDate(
                  normalizedOrder.createdAt
                )}
              />

              <VoucherInfo
                icon="📦"
                title="Estado actual"
                value={formatOrderStatus(
                  normalizedOrder.status
                )}
              />

              <VoucherInfo
                icon="💰"
                title="Estado del pago"
                value={formatPaymentStatus(
                  normalizedOrder.paymentStatus
                )}
              />

              <VoucherInfo
                icon="📍"
                title="Estado de entrega"
                value={formatDeliveryStatus(
                  normalizedOrder.deliveryStatus
                )}
              />
            </div>

            <div style={amountSection}>
              <div style={amountLine}>
                <span>Subtotal</span>

                <strong>
                  {formatMoney(
                    normalizedOrder.price
                  )}
                </strong>
              </div>

              <div style={amountLine}>
                <span>
                  Protección QSM
                </span>

                <strong>
                  {normalizedOrder
                    .protectionFee > 0
                    ? formatMoney(
                        normalizedOrder
                          .protectionFee
                      )
                    : "Incluida"}
                </strong>
              </div>

              <div style={amountLine}>
                <span>
                  Cargo de entrega
                </span>

                <strong>
                  {normalizedOrder
                    .shippingFee > 0
                    ? formatMoney(
                        normalizedOrder
                          .shippingFee
                      )
                    : "Sin cargo"}
                </strong>
              </div>

              <div style={totalAmountLine}>
                <span>
                  Total de la operación
                </span>

                <strong>
                  {formatMoney(
                    normalizedOrder.totalAmount
                  )}
                </strong>
              </div>
            </div>

            <div style={demoNotice}>
              <div style={demoIcon}>
                🧪
              </div>

              <div>
                <strong>
                  Operación en modo demostración
                </strong>

                <p>
                  Esta versión simula el
                  procesamiento del pago,
                  la logística y la entrega.
                  En la versión final se
                  integrarán servicios reales.
                </p>
              </div>
            </div>

            <div
              className="voucher-actions"
              style={voucherActions}
            >
              <Link
                to="/orders?type=buy"
                style={secondaryAction}
              >
                🛒 Ir a Mis compras
              </Link>

              <button
                type="button"
                onClick={goToTracking}
                style={primaryAction}
              >
                📍 Ver seguimiento
              </button>
            </div>

            <p style={voucherFooterText}>
              Guarda este comprobante y
              conserva tu PIN hasta que el
              producto haya sido entregado
              correctamente.
            </p>
          </article>

          <aside style={sidePanel}>
            <div style={sidePanelHeader}>
              <div style={sidePanelIcon}>
                📍
              </div>

              <div>
                <p style={sidePanelLabel}>
                  SIGUIENTE PASO
                </p>

                <h2 style={sidePanelTitle}>
                  Seguimiento de tu compra
                </h2>
              </div>
            </div>

            <p style={sidePanelText}>
              El vendedor ya recibió una
              notificación y deberá preparar
              el producto para entregarlo al
              almacén QSM o al agente de
              delivery verificado.
            </p>

            <div style={trackingPreview}>
              <TrackingStep
                active
                current
                icon="✓"
                title="Compra creada"
                text="La orden fue registrada correctamente."
              />

              <TrackingStep
                active
                icon="✓"
                title="PIN generado"
                text="El código de entrega ya está disponible."
              />

              <TrackingStep
                active
                icon="✓"
                title="Vendedor notificado"
                text="El vendedor recibió los pasos de entrega."
              />

              <TrackingStep
                icon="📦"
                title={
                  normalizedOrder.deliveryMethod ===
                  "QSM_WAREHOUSE"
                    ? "Esperando entrega al almacén"
                    : "Esperando recogida del delivery"
                }
                text={
                  normalizedOrder.deliveryMethod ===
                  "QSM_WAREHOUSE"
                    ? "El vendedor debe llevar el producto al almacén QSM."
                    : "Un agente QSM deberá recoger el producto."
                }
              />

              <TrackingStep
                icon="🔍"
                title="Verificación del producto"
                text="QSM revisará el estado y registrará evidencias."
              />

              <TrackingStep
                icon="🔐"
                title="Entrega mediante PIN"
                text="Presenta tu PIN para recibir el producto."
              />
            </div>

            <div style={sideSecurityBox}>
              <strong>
                🛡 Protección activa
              </strong>

              <p>
                No compartas tu PIN con el
                vendedor. Solo debe utilizarse
                durante la entrega final con
                el agente autorizado de QSM.
              </p>
            </div>

            <button
              type="button"
              onClick={goToTracking}
              style={trackingButton}
            >
              Abrir seguimiento completo →
            </button>
          </aside>
        </section>
      </main>
    </div>
  );
}

function VoucherInfo({
  icon,
  title,
  value
}) {
  return (
    <div style={informationCard}>
      <div style={informationIcon}>
        {icon}
      </div>

      <div>
        <span style={informationTitle}>
          {title}
        </span>

        <strong style={informationValue}>
          {value}
        </strong>
      </div>
    </div>
  );
}

function TrackingStep({
  active,
  current,
  icon,
  title,
  text
}) {
  return (
    <div style={trackingStep}>
      <div style={trackingLineColumn}>
        <div
          style={
            active
              ? trackingDotActive
              : current
              ? trackingDotCurrent
              : trackingDotInactive
          }
        >
          {icon}
        </div>

        <div style={trackingLine}></div>
      </div>

      <div style={trackingContent}>
        <strong
          style={
            active
              ? trackingTitleActive
              : trackingTitleInactive
          }
        >
          {title}
        </strong>

        <p style={trackingText}>
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

function getProductImage(product) {
  if (!product) return "";

  if (product.thumbnail) {
    return getImageUrl(product.thumbnail);
  }

  if (
    Array.isArray(product.images) &&
    product.images.length > 0
  ) {
    return getImageUrl(product.images[0]);
  }

  if (product.image) {
    return getImageUrl(product.image);
  }

  if (product.imageUrl) {
    return getImageUrl(product.imageUrl);
  }

  return "";
}

function getImageUrl(image) {
  if (!image) {
    return "";
  }

  const rawImage =
    typeof image === "string"
      ? image
      : image.url ||
        image.path ||
        image.secure_url ||
        image.imageUrl ||
        "";

  if (!rawImage) {
    return "";
  }

  const cleanImage = String(rawImage)
    .trim()
    .replaceAll("&#x2F;", "/")
    .replaceAll("&amp;", "&");

  if (
    cleanImage.startsWith("http")
  ) {
    return cleanImage;
  }

  if (
    cleanImage.startsWith(
      "/uploads"
    )
  ) {
    return `http://localhost:5000${cleanImage}`;
  }

  if (
    cleanImage.startsWith(
      "uploads"
    )
  ) {
    return `http://localhost:5000/${cleanImage}`;
  }

  return `http://localhost:5000/uploads/products/images/${cleanImage}`;
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

  return new Intl.DateTimeFormat(
    "es-DO",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(
    new Date(value)
  );
}

function formatPaymentMethod(value) {
  const map = {
    BANK_TRANSFER:
      "Transferencia contra entrega",

    CASH_ON_DELIVERY:
      "Efectivo contra entrega",

    CARD:
      "Tarjeta — pago inmediato"
  };

  return (
    map[value] ||
    "Pago pendiente"
  );
}

function formatDeliveryMethod(value) {
  const map = {
    QSM_WAREHOUSE:
      "Almacén QSM",

    QSM_VERIFIED_DELIVERY:
      "Delivery QSM verificado"
  };

  return (
    map[value] ||
    "Entrega pendiente"
  );
}

function formatOrderStatus(value) {
  const map = {
    PENDING:
      "Compra pendiente",

    WAITING_PAYMENT:
      "Esperando pago",

    PAYMENT_CONFIRMED:
      "Pago confirmado",

    WAITING_SELLER:
      "Esperando vendedor",

    WAITING_WAREHOUSE:
      "Esperando almacén",

    IN_WAREHOUSE:
      "En almacén",

    UNDER_INSPECTION:
      "En revisión",

    READY_FOR_PICKUP:
      "Listo para entregar",

    OUT_FOR_DELIVERY:
      "En camino",

    WAITING_PIN:
      "Esperando PIN",

    DELIVERED:
      "Producto entregado",

    COMPLETED:
      "Compra completada"
  };

  return (
    map[value] ||
    value ||
    "Compra creada"
  );
}

function formatPaymentStatus(value) {
  const map = {
    PENDING:
      "Pendiente",

    PENDING_PROOF:
      "Esperando confirmación",

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

function formatDeliveryStatus(value) {
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

    RECEIVED_AT_WAREHOUSE:
      "Recibido en almacén",

    UNDER_REVIEW:
      "En revisión",

    APPROVED:
      "Producto aprobado",

    READY_FOR_PICKUP:
      "Listo para retirar",

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
    "Seguimiento iniciado"
  );
}
const page = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at 82% 8%, rgba(139,92,246,.16), transparent 28%), radial-gradient(circle at 10% 20%, rgba(56,189,248,.10), transparent 26%), #020617",
  color: "white"
};

const container = {
  width: "100%",
  maxWidth: "1480px",
  margin: "0 auto",
  padding: "28px 30px 60px"
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  marginBottom: "24px"
};

const backButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "44px",
  color: "#cbd5e1",
  textDecoration: "none",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(148,163,184,.14)",
  padding: "10px 16px",
  borderRadius: "13px",
  fontWeight: "800",
  fontSize: "14px"
};

const header = {
  maxWidth: "820px",
  margin: "0 auto 28px",
  textAlign: "center",
  animation: "fadeUp .5s ease"
};

const successIcon = {
  width: "76px",
  height: "76px",
  margin: "0 auto 18px",
  borderRadius: "24px",
  background:
    "linear-gradient(135deg, #35d0c3, #2563eb)",
  color: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "36px",
  fontWeight: "950",
  animation:
    "successPulse 2.5s ease-in-out infinite"
};

const label = {
  margin: 0,
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "11px",
  fontWeight: "950"
};

const title = {
  margin: "10px 0",
  fontSize: "clamp(36px, 4vw, 58px)",
  lineHeight: "1.04",
  letterSpacing: "-1.5px"
};

const subtitle = {
  margin: 0,
  color: "#cbd5e1",
  fontSize: "17px",
  lineHeight: "28px"
};

const voucherGrid = {
  display: "grid",
  gridTemplateColumns:
    "minmax(0, 1.4fr) minmax(330px, .75fr)",
  gap: "22px",
  alignItems: "start"
};

const voucherCard = {
  background: "rgba(15,23,42,.78)",
  border: "1px solid rgba(53,208,195,.16)",
  borderRadius: "26px",
  padding: "26px",
  boxShadow: "0 24px 80px rgba(0,0,0,.34)",
  backdropFilter: "blur(16px)",
  animation: "fadeUp .48s ease"
};

const voucherTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  marginBottom: "20px"
};

const smallLabel = {
  margin: 0,
  color: "#38bdf8",
  letterSpacing: "3px",
  fontSize: "11px",
  fontWeight: "950"
};

const voucherTitle = {
  margin: "7px 0 0",
  fontSize: "30px",
  letterSpacing: "-.5px"
};

const shieldLogo = {
  width: "58px",
  height: "58px",
  borderRadius: "18px",
  background:
    "linear-gradient(135deg, #35d0c3, #2563eb, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "26px",
  boxShadow: "0 0 32px rgba(53,208,195,.22)",
  flexShrink: 0
};

const codeBox = {
  background: "rgba(2,6,23,.42)",
  border: "1px solid rgba(148,163,184,.12)",
  borderRadius: "18px",
  padding: "16px 18px",
  marginBottom: "16px"
};

const codeRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  marginTop: "8px"
};

const copyButton = {
  minWidth: "86px",
  border: "1px solid rgba(53,208,195,.24)",
  background: "rgba(53,208,195,.10)",
  color: "#67fff1",
  padding: "9px 12px",
  borderRadius: "11px",
  fontWeight: "900",
  cursor: "pointer"
};

const pinBox = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  background:
    "linear-gradient(135deg, rgba(53,208,195,.15), rgba(37,99,235,.12))",
  border: "1px solid rgba(53,208,195,.30)",
  borderRadius: "20px",
  padding: "20px",
  marginBottom: "14px"
};

const pinLabel = {
  display: "block",
  color: "#cbd5e1",
  letterSpacing: "3px",
  fontSize: "11px",
  fontWeight: "900",
  marginBottom: "7px"
};

const pinValue = {
  display: "block",
  color: "#67fff1",
  fontSize: "clamp(36px, 4vw, 56px)",
  lineHeight: 1,
  letterSpacing: "8px"
};

const pinButton = {
  minWidth: "128px",
  border: "none",
  background:
    "linear-gradient(135deg, #35d0c3, #2563eb)",
  color: "#020617",
  padding: "13px 16px",
  borderRadius: "13px",
  fontWeight: "950",
  cursor: "pointer"
};

const pinWarning = {
  background: "rgba(245,158,11,.10)",
  border: "1px solid rgba(245,158,11,.24)",
  borderRadius: "16px",
  padding: "14px 16px",
  color: "#fde68a",
  marginBottom: "18px"
};

const productSection = {
  display: "grid",
  gridTemplateColumns: "190px minmax(0, 1fr)",
  gap: "20px",
  alignItems: "center",
  background: "rgba(2,6,23,.38)",
  border: "1px solid rgba(148,163,184,.10)",
  borderRadius: "20px",
  padding: "18px",
  marginBottom: "18px"
};

const productImageBox = {
  width: "190px",
  height: "160px",
  borderRadius: "17px",
  overflow: "hidden",
  background:
    "linear-gradient(135deg, rgba(56,189,248,.12), rgba(139,92,246,.12))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const productImage = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  background: "#020617"
};

const productPlaceholder = {
  fontSize: "62px"
};

const productInformation = {
  minWidth: 0
};

const productLabel = {
  margin: 0,
  color: "#38bdf8",
  fontSize: "11px",
  letterSpacing: "3px",
  fontWeight: "950"
};

const productTitle = {
  margin: "8px 0",
  fontSize: "27px",
  lineHeight: "1.15"
};

const productDescription = {
  margin: 0,
  color: "#94a3b8",
  lineHeight: "24px"
};

const productPills = {
  display: "flex",
  flexWrap: "wrap",
  gap: "9px",
  marginTop: "14px"
};

const productPill = {
  background: "rgba(53,208,195,.10)",
  border: "1px solid rgba(53,208,195,.22)",
  color: "#67fff1",
  borderRadius: "999px",
  padding: "7px 10px",
  fontSize: "11px",
  fontWeight: "900"
};

const informationGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "12px",
  marginBottom: "18px"
};

const informationCard = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minHeight: "84px",
  background: "rgba(2,6,23,.34)",
  border: "1px solid rgba(148,163,184,.10)",
  borderRadius: "16px",
  padding: "14px"
};

const informationIcon = {
  width: "40px",
  height: "40px",
  borderRadius: "12px",
  background: "rgba(56,189,248,.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "19px",
  flexShrink: 0
};

const informationTitle = {
  display: "block",
  color: "#94a3b8",
  fontSize: "11px",
  marginBottom: "4px"
};

const informationValue = {
  display: "block",
  color: "white",
  fontSize: "13px",
  lineHeight: "18px"
};

const amountSection = {
  background: "rgba(2,6,23,.38)",
  border: "1px solid rgba(148,163,184,.10)",
  borderRadius: "18px",
  padding: "16px 18px",
  marginBottom: "16px"
};

const amountLine = {
  display: "flex",
  justifyContent: "space-between",
  gap: "18px",
  padding: "9px 0",
  color: "#cbd5e1",
  fontSize: "14px"
};

const totalAmountLine = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  borderTop: "1px solid rgba(148,163,184,.12)",
  marginTop: "8px",
  paddingTop: "14px",
  color: "#35d0c3",
  fontSize: "21px"
};

const demoNotice = {
  display: "flex",
  alignItems: "flex-start",
  gap: "12px",
  background: "rgba(37,99,235,.10)",
  border: "1px solid rgba(96,165,250,.22)",
  borderRadius: "17px",
  padding: "15px",
  color: "#cbd5e1",
  marginBottom: "18px"
};

const demoIcon = {
  width: "38px",
  height: "38px",
  borderRadius: "12px",
  background: "rgba(96,165,250,.14)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0
};

const voucherActions = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px"
};

const primaryAction = {
  border: "none",
  background:
    "linear-gradient(135deg, #35d0c3, #2563eb)",
  color: "#020617",
  padding: "15px 18px",
  borderRadius: "14px",
  fontWeight: "950",
  cursor: "pointer",
  textAlign: "center"
};

const secondaryAction = {
  ...primaryAction,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(15,23,42,.68)",
  border: "1px solid rgba(148,163,184,.16)",
  color: "white",
  textDecoration: "none"
};

const voucherFooterText = {
  margin: "14px 0 0",
  textAlign: "center",
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "20px"
};

const sidePanel = {
  position: "sticky",
  top: "22px",
  background: "rgba(15,23,42,.74)",
  border: "1px solid rgba(139,92,246,.18)",
  borderRadius: "24px",
  padding: "22px",
  boxShadow: "0 24px 70px rgba(0,0,0,.26)",
  backdropFilter: "blur(14px)",
  animation: "fadeUp .58s ease"
};

const sidePanelHeader = {
  display: "flex",
  alignItems: "center",
  gap: "13px",
  marginBottom: "14px"
};

const sidePanelIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "15px",
  background:
    "linear-gradient(135deg, rgba(56,189,248,.22), rgba(139,92,246,.24))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px"
};

const sidePanelLabel = {
  margin: 0,
  color: "#a78bfa",
  letterSpacing: "3px",
  fontSize: "10px",
  fontWeight: "950"
};

const sidePanelTitle = {
  margin: "5px 0 0",
  fontSize: "22px"
};

const sidePanelText = {
  color: "#94a3b8",
  lineHeight: "23px",
  fontSize: "13px",
  marginBottom: "18px"
};

const trackingPreview = {
  display: "grid",
  gap: "0",
  marginBottom: "16px"
};

const trackingStep = {
  display: "grid",
  gridTemplateColumns: "34px minmax(0, 1fr)",
  gap: "12px",
  minHeight: "72px"
};

const trackingLineColumn = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center"
};

const trackingDotActive = {
  width: "30px",
  height: "30px",
  borderRadius: "50%",
  background: "#35d0c3",
  color: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "950",
  zIndex: 2
};

const trackingDotCurrent = {
  ...trackingDotActive,
  background: "#8b5cf6",
  color: "white"
};

const trackingDotInactive = {
  ...trackingDotActive,
  background: "rgba(148,163,184,.14)",
  color: "#64748b"
};

const trackingLine = {
  width: "2px",
  flex: 1,
  background: "rgba(148,163,184,.14)"
};

const trackingContent = {
  paddingBottom: "12px"
};

const trackingTitleActive = {
  color: "white",
  fontSize: "13px"
};

const trackingTitleInactive = {
  color: "#64748b",
  fontSize: "13px"
};

const trackingText = {
  margin: "5px 0 0",
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "19px"
};

const sideSecurityBox = {
  background: "rgba(53,208,195,.08)",
  border: "1px solid rgba(53,208,195,.20)",
  borderRadius: "15px",
  padding: "14px",
  color: "#cbd5e1",
  fontSize: "12px",
  lineHeight: "19px",
  marginBottom: "14px"
};

const trackingButton = {
  width: "100%",
  border: "none",
  background:
    "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  color: "white",
  padding: "14px",
  borderRadius: "13px",
  fontWeight: "950",
  cursor: "pointer"
};

const centerCard = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  padding: "30px"
};

const loadingIcon = {
  width: "78px",
  height: "78px",
  borderRadius: "23px",
  background:
    "linear-gradient(135deg, #35d0c3, #2563eb)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "34px",
  marginBottom: "18px"
};

const errorIcon = {
  width: "70px",
  height: "70px",
  borderRadius: "50%",
  background: "rgba(239,68,68,.16)",
  border: "1px solid rgba(239,68,68,.30)",
  color: "#fecaca",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px",
  fontWeight: "950",
  marginBottom: "16px"
};

const muted = {
  color: "#94a3b8",
  lineHeight: "24px"
};

const errorText = {
  color: "#fecaca",
  lineHeight: "24px"
};

const errorBox = {
  background: "rgba(127,29,29,.22)",
  border: "1px solid rgba(248,113,113,.28)",
  color: "#fecaca",
  borderRadius: "15px",
  padding: "13px 16px",
  marginBottom: "16px",
  textAlign: "center",
  fontWeight: "800"
};

const primaryButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "linear-gradient(135deg, #35d0c3, #2563eb)",
  color: "#020617",
  textDecoration: "none",
  padding: "14px 18px",
  borderRadius: "13px",
  fontWeight: "950"
};

export default VoucherCompra;