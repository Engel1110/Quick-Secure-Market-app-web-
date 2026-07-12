import { useEffect, useMemo, useState } from "react";
import {
  useParams,
  useNavigate,
  Link
} from "react-router-dom";

import api from "../api/axios";

function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);

  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState("");

  const [bankName, setBankName] = useState("");
  const [transferReference, setTransferReference] = useState("");

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);

  const [activeImage, setActiveImage] = useState("");
  const [imageModalOpen, setImageModalOpen] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await api.get(`/products/${id}`);

      const loadedProduct =
        response?.data?.product ||
        response?.data?.data ||
        response?.data;

      if (!loadedProduct?._id && !loadedProduct?.id) {
        throw new Error(
          "El producto recibido no tiene un identificador válido."
        );
      }

      setProduct(loadedProduct);

      const firstImage = getProductImage(loadedProduct);
      setActiveImage(firstImage);
    } catch (err) {
      console.error("Error cargando producto:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "No se pudo cargar la información del producto."
      );
    } finally {
      setLoading(false);
    }
  };

  const productImages = useMemo(() => {
    if (!product) return [];

    const images = Array.isArray(product.images)
      ? product.images
          .map((image) => getImageUrl(image))
          .filter(Boolean)
      : [];

    const mainProductImage = getProductImage(product);

    return [...images, mainProductImage]
      .filter(Boolean)
      .filter(
        (image, index, array) =>
          array.indexOf(image) === index
      );
  }, [product]);

  const selectPaymentMethod = (method) => {
    setPaymentMethod(method);
    setError("");
    setCurrentStep(1);

    if (method !== "BANK_TRANSFER") {
      setBankName("");
      setTransferReference("");
    }
  };

  const continueToDelivery = () => {
    if (!paymentMethod) {
      setError(
        "Selecciona un método de pago para continuar."
      );
      return;
    }

    if (
      paymentMethod === "BANK_TRANSFER" &&
      !bankName.trim()
    ) {
      setError(
        "Indica el banco que utilizarás para realizar la transferencia."
      );
      return;
    }

    setError("");
    setCurrentStep(2);

    setTimeout(() => {
      document
        .getElementById("delivery-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    }, 100);
  };

  const selectDeliveryMethod = (method) => {
    setDeliveryMethod(method);
    setError("");
  };

  const validatePurchase = () => {
    if (!paymentMethod) {
      return "Selecciona cómo deseas realizar el pago.";
    }

    if (currentStep < 2) {
      return "Confirma primero el método de pago.";
    }

    if (!deliveryMethod) {
      return "Selecciona cómo deseas recibir el producto.";
    }

    if (
      paymentMethod === "BANK_TRANSFER" &&
      !bankName.trim()
    ) {
      return "Indica el banco desde el cual realizarás la transferencia.";
    }

    if (!acceptedTerms) {
      return "Debes aceptar las condiciones de la Compra Protegida QSM.";
    }

    return "";
  };

  const handleConfirmPurchase = async () => {
    const validationError = validatePurchase();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setCreatingOrder(true);
      setError("");
      setMessage("");

      const response = await api.post("/orders", {
        productId: id,
        paymentMethod,
        deliveryMethod,

        bankName:
          paymentMethod === "BANK_TRANSFER"
            ? bankName.trim()
            : "",

        transferReference:
          paymentMethod === "BANK_TRANSFER"
            ? transferReference.trim()
            : ""
      });

      const createdOrder =
        response?.data?.order || null;

      const createdVoucher =
        response?.data?.voucher || null;

      const orderId =
        createdVoucher?.orderId ||
        createdOrder?._id ||
        createdOrder?.id;

      if (!orderId) {
        throw new Error(
          "La compra fue creada, pero el servidor no devolvió el identificador de la orden."
        );
      }

      localStorage.setItem(
        "qsm_last_order",
        JSON.stringify(createdOrder)
      );

      localStorage.setItem(
        "qsm_last_voucher",
        JSON.stringify(
          createdVoucher || createdOrder
        )
      );

      setMessage(
        `Compra protegida creada. PIN de entrega: ${
          createdVoucher?.deliveryPin ||
          createdOrder?.deliveryPin ||
          "generado"
        }`
      );

      navigate(`/voucher/${orderId}`, {
        replace: true,
        state: {
          voucher: createdVoucher,
          order: createdOrder
        }
      });
    } catch (err) {
      console.error(
        "Error creando compra:",
        err?.response?.data || err
      );

      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "No se pudo crear la compra protegida."
      );
    } finally {
      setCreatingOrder(false);
    }
  };

  if (loading) {
    return (
      <div style={page}>
        <div style={centerCard}>
          <div style={loadingIcon}>🛡</div>

          <h1>Cargando compra protegida...</h1>

          <p style={muted}>
            QSM está preparando la información del producto.
          </p>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div style={page}>
        <div style={centerCard}>
          <div style={errorIcon}>!</div>

          <h1>No pudimos cargar la compra</h1>

          <p style={errorText}>
            {error}
          </p>

          <Link
            to="/marketplace"
            style={buttonSecondary}
          >
            Volver al Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const seller = product?.seller || {};
  const price = Number(product?.price || 0);
  const protectionFee = 0;

  const deliveryFee =
    deliveryMethod === "QSM_VERIFIED_DELIVERY"
      ? 500
      : 0;

  const total =
    price +
    protectionFee +
    deliveryFee;

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
          font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
        }

        button,
        input,
        select {
          font-family: inherit;
        }

        button,
        a {
          transition: all .25s ease;
        }

        button:hover,
        a:hover {
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

        @media (max-width: 1100px) {
          .purchase-grid {
            grid-template-columns: 1fr !important;
          }

          .purchase-summary {
            position: static !important;
          }
        }

        @media (max-width: 900px) {
          .payment-options {
            grid-template-columns: 1fr !important;
          }

          .delivery-options {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 760px) {
          .purchase-container {
            padding: 18px 14px 50px !important;
          }

          .product-box {
            grid-template-columns: 1fr !important;
          }

          .product-image-box {
            min-height: 280px !important;
          }

          .top-links {
            flex-direction: column !important;
          }
        }
      `}</style>

      <main
        className="purchase-container"
        style={container}
      >
        <div
          className="top-links"
          style={topBar}
        >
          <Link
            to={`/product/${id}`}
            style={backButton}
          >
            ← Volver al producto
          </Link>

          <Link
            to="/marketplace"
            style={backButton}
          >
            Marketplace
          </Link>
        </div>

        <section style={header}>
          <p style={label}>
            COMPRA SEGURA QSM
          </p>

          <h1 style={title}>
            Compra con Pago Protegido
          </h1>

          <p style={subtitle}>
            Selecciona cómo pagarás y después elige
            cómo deseas recibir el producto.
          </p>
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

        <section
          className="purchase-grid"
          style={grid}
        >
          <div style={leftColumn}>
            <div style={card}>
              <div style={sectionHeader}>
                <span style={sectionNumber}>
                  1
                </span>

                <div>
                  <h2 style={sectionTitle}>
                    Producto
                  </h2>

                  <p style={sectionSubtitle}>
                    Revisa la información antes de continuar.
                  </p>
                </div>
              </div>

              <div
                className="product-box"
                style={productBox}
              >
                <div
                  className="product-image-box"
                  style={productImageBox}
                >
                  {activeImage ? (
                    <img
                      src={activeImage}
                      alt={product.title || "Producto"}
                      style={productImage}
                      onClick={() =>
                        setImageModalOpen(true)
                      }
                    />
                  ) : (
                    <div style={imagePlaceholder}>
                      📦
                    </div>
                  )}

                  <span style={zoomHint}>
                    🔍 Ver imagen grande
                  </span>
                </div>

                <div>
                  <h3 style={productTitle}>
                    {product.title}
                  </h3>

                  <p style={muted}>
                    {product.description ||
                      "Este producto no tiene una descripción detallada."}
                  </p>

                  <div style={pillRow}>
                    <span style={pill}>
                      {formatCondition(
                        product.condition
                      )}
                    </span>

                    <span style={pill}>
                      {product.category ||
                        "Producto"}
                    </span>

                    <span style={pill}>
                      🛡 Compra protegida
                    </span>
                  </div>

                  {productImages.length > 1 && (
                    <div style={thumbnailRow}>
                      {productImages.map(
                        (image) => (
                          <button
                            type="button"
                            key={image}
                            onClick={() =>
                              setActiveImage(image)
                            }
                            style={
                              activeImage === image
                                ? activeThumbnail
                                : thumbnail
                            }
                          >
                            <img
                              src={image}
                              alt="Vista del producto"
                              style={thumbnailImage}
                            />
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={card}>
              <div style={sectionHeader}>
                <span style={sectionNumber}>
                  2
                </span>

                <div>
                  <h2 style={sectionTitle}>
                    Método de pago
                  </h2>

                  <p style={sectionSubtitle}>
                    Selecciona una opción para continuar.
                  </p>
                </div>
              </div>

              <div
                className="payment-options"
                style={paymentOptionGrid}
              >
                <OptionCard
                  active={
                    paymentMethod ===
                    "BANK_TRANSFER"
                  }
                  icon="🏦"
                  title="Transferencia bancaria contra entrega"
                  text="Realiza la transferencia al momento de recibir el producto. La entrega se completa después de validar el pago."
                  demoText="Actualmente funciona como simulación. En la versión final se procesarán transferencias reales."
                  onClick={() =>
                    selectPaymentMethod(
                      "BANK_TRANSFER"
                    )
                  }
                />

                <OptionCard
                  active={
                    paymentMethod ===
                    "CASH_ON_DELIVERY"
                  }
                  icon="💵"
                  title="Efectivo contra entrega"
                  text="Entrega el dinero cuando recibas el producto. El pago se confirma antes de finalizar la operación."
                  demoText="Actualmente funciona como simulación. En la versión final QSM validará el pago."
                  onClick={() =>
                    selectPaymentMethod(
                      "CASH_ON_DELIVERY"
                    )
                  }
                />

                <OptionCard
                  active={
                    paymentMethod === "CARD"
                  }
                  icon="💳"
                  title="Tarjeta de crédito o débito"
                  text="Pago inmediato mediante tarjeta bancaria antes de comenzar el proceso de entrega."
                  demoText="Actualmente funciona como simulación. En la versión final se utilizará una pasarela de pago certificada."
                  onClick={() =>
                    selectPaymentMethod("CARD")
                  }
                />
              </div>

              {paymentMethod ===
                "BANK_TRANSFER" && (
                <div style={conditionalBox}>
                  <label style={fieldLabel}>
                    Banco desde el cual transferirás
                  </label>

                  <input
                    value={bankName}
                    onChange={(event) =>
                      setBankName(
                        event.target.value
                      )
                    }
                    placeholder="Ejemplo: Banco Popular"
                    style={input}
                  />

                  <label style={fieldLabel}>
                    Referencia de transferencia
                  </label>

                  <input
                    value={transferReference}
                    onChange={(event) =>
                      setTransferReference(
                        event.target.value
                      )
                    }
                    placeholder="Opcional en esta simulación"
                    style={input}
                  />

                  <div style={noticeBox}>
                    <strong>
                      Transferencia contra entrega
                    </strong>

                    <p>
                      El producto se entrega cuando
                      la transferencia haya sido
                      confirmada correctamente.
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod ===
                "CASH_ON_DELIVERY" && (
                <div style={conditionalBox}>
                  <div style={noticeBox}>
                    <strong>
                      Pago en efectivo al recibir
                    </strong>

                    <p>
                      El efectivo se entrega durante
                      la recepción del producto.
                    </p>
                  </div>
                </div>
              )}

              {paymentMethod === "CARD" && (
                <div style={conditionalBox}>
                  <div style={noticeBox}>
                    <strong>
                      Pago inmediato con tarjeta
                    </strong>

                    <p>
                      Esta versión simula la autorización.
                      QSM no solicita ni almacena datos
                      reales de tarjeta.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={continueToDelivery}
                style={continueButton}
              >
                Confirmar método de pago y continuar
              </button>
            </div>

            {currentStep >= 2 && (
              <div
                id="delivery-section"
                style={card}
              >
                <div style={sectionHeader}>
                  <span style={sectionNumber}>
                    3
                  </span>

                  <div>
                    <h2 style={sectionTitle}>
                      Método de entrega
                    </h2>

                    <p style={sectionSubtitle}>
                      Selecciona cómo deseas recibir el producto.
                    </p>
                  </div>
                </div>

                <div
                  className="delivery-options"
                  style={optionGrid}
                >
                  <OptionCard
                    active={
                      deliveryMethod ===
                      "QSM_WAREHOUSE"
                    }
                    icon="🏬"
                    title="Almacén QSM"
                    text="El vendedor lleva el producto al almacén. QSM lo recibe, revisa y entrega mediante PIN."
                    demoText="Actualmente funciona como simulación del proceso de almacén."
                    recommended
                    onClick={() =>
                      selectDeliveryMethod(
                        "QSM_WAREHOUSE"
                      )
                    }
                  />

                  <OptionCard
                    active={
                      deliveryMethod ===
                      "QSM_VERIFIED_DELIVERY"
                    }
                    icon="🚚"
                    title="Delivery QSM verificado"
                    text="Un agente recoge el producto, registra evidencias, lo verifica y lo entrega mediante PIN."
                    demoText="Actualmente funciona como simulación e incluye un cargo demo de RD$500."
                    onClick={() =>
                      selectDeliveryMethod(
                        "QSM_VERIFIED_DELIVERY"
                      )
                    }
                  />
                </div>
              </div>
            )} 
                        {currentStep >= 2 && (
              <>
                <div style={card}>
                  <div style={sectionHeader}>
                    <span style={sectionNumber}>
                      4
                    </span>

                    <div>
                      <h2 style={sectionTitle}>
                        Vendedor
                      </h2>

                      <p style={sectionSubtitle}>
                        Revisa quién está vendiendo el producto.
                      </p>
                    </div>
                  </div>

                  <div style={sellerBox}>
                    <div style={avatar}>
                      {seller.firstName
                        ?.charAt(0)
                        ?.toUpperCase() || "V"}
                    </div>

                    <div>
                      <h3 style={sellerName}>
                        {seller.firstName || "Vendedor"}{" "}
                        {seller.lastName || ""}
                      </h3>

                      <p style={muted}>
                        {seller.email ||
                          "Correo no disponible"}
                      </p>

                      <strong style={trustText}>
                        Nivel de confianza:{" "}
                        {seller.trustScore || 50}/100
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={card}>
                  <div style={sectionHeader}>
                    <span style={sectionNumber}>
                      5
                    </span>

                    <div>
                      <h2 style={sectionTitle}>
                        ¿Cómo funciona la Compra Protegida?
                      </h2>

                      <p style={sectionSubtitle}>
                        QSM registra cada paso de la operación.
                      </p>
                    </div>
                  </div>

                  <div style={steps}>
                    <Step
                      number="1"
                      title="Confirmas el método de pago"
                      text="La transferencia, el efectivo o la tarjeta funcionan como una simulación en esta versión."
                    />

                    <Step
                      number="2"
                      title="Seleccionas la entrega"
                      text="Puedes elegir entre Almacén QSM o Delivery QSM verificado."
                    />

                    <Step
                      number="3"
                      title="Se crea la compra"
                      text="QSM registra la orden y genera un PIN de entrega."
                    />

                    <Step
                      number="4"
                      title="Se verifica el producto"
                      text="El almacén o el agente de delivery revisa y registra evidencias."
                    />

                    <Step
                      number="5"
                      title="Se entrega mediante PIN"
                      text="El comprador presenta el PIN y QSM completa la operación."
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <aside
            className="purchase-summary"
            style={rightColumn}
          >
            <div style={summaryCard}>
              <div style={summaryHeader}>
                <div>
                  <p style={summaryLabel}>
                    RESUMEN
                  </p>

                  <h2 style={summaryTitle}>
                    Resumen de la operación
                  </h2>
                </div>

                <div style={summaryShield}>
                  🛡
                </div>
              </div>

              <Line
                title="Producto"
                value={product.title}
              />

              <Line
                title="Subtotal"
                value={formatMoney(price)}
              />

              <Line
                title="Protección QSM"
                value="Incluida"
              />

              <Line
                title="Método de pago"
                value={formatPaymentMethod(
                  paymentMethod
                )}
              />

              <Line
                title="Método de entrega"
                value={formatDeliveryMethod(
                  deliveryMethod
                )}
              />

              <Line
                title="Cargo de entrega"
                value={
                  deliveryFee > 0
                    ? formatMoney(deliveryFee)
                    : "Sin cargo demo"
                }
              />

              <div style={totalLine}>
                <span>Total</span>

                <strong>
                  {formatMoney(total)}
                </strong>
              </div>

              <div style={secureBox}>
                <strong>
                  🛡 Compra Protegida activa
                </strong>

                <p>
                  La orden continuará hacia almacén o delivery
                  después de confirmar el método de pago y la entrega.
                </p>
              </div>

              <div style={demoGlobalBox}>
                <strong>
                  Modo demostración
                </strong>

                <p>
                  Los métodos de pago y entrega funcionan actualmente
                  como una simulación. En la versión final se aplicarán
                  procesos reales y validaciones externas.
                </p>
              </div>

              <label style={termsRow}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) =>
                    setAcceptedTerms(
                      event.target.checked
                    )
                  }
                />

                <span>
                  Acepto las condiciones de la
                  Compra Protegida QSM.
                </span>
              </label>

              <button
                type="button"
                onClick={handleConfirmPurchase}
                disabled={
                  creatingOrder ||
                  currentStep < 2 ||
                  !deliveryMethod
                }
                style={{
                  ...buttonPrimary,
                  opacity:
                    creatingOrder ||
                    currentStep < 2 ||
                    !deliveryMethod
                      ? 0.6
                      : 1,
                  cursor:
                    creatingOrder ||
                    currentStep < 2 ||
                    !deliveryMethod
                      ? "not-allowed"
                      : "pointer"
                }}
              >
                {creatingOrder
                  ? "Creando compra..."
                  : "Confirmar compra protegida"}
              </button>

              <p style={smallNote}>
                Al confirmar, QSM generará una orden y un PIN
                para el seguimiento de la entrega.
              </p>
            </div>
          </aside>
        </section>
      </main>

      {imageModalOpen && activeImage && (
        <div
          style={modalOverlay}
          onClick={() =>
            setImageModalOpen(false)
          }
        >
          <button
            type="button"
            style={modalClose}
            onClick={() =>
              setImageModalOpen(false)
            }
          >
            ×
          </button>

          <img
            src={activeImage}
            alt={
              product.title ||
              "Imagen del producto"
            }
            style={modalImage}
            onClick={(event) =>
              event.stopPropagation()
            }
          />
        </div>
      )}
    </div>
  );
}

function OptionCard({
  active,
  icon,
  title,
  text,
  demoText,
  recommended,
  onClick
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={optionCard(active)}
    >
      {recommended && (
        <span style={recommendedBadge}>
          Recomendado
        </span>
      )}

      <span style={optionIcon}>
        {icon}
      </span>

      <strong style={optionTitle}>
        {title}
      </strong>

      <span style={optionText}>
        {text}
      </span>

      {demoText && (
        <span style={demoNotice}>
          {demoText}
        </span>
      )}

      <span style={selectionIndicator(active)}>
        {active
          ? "✓ Seleccionado"
          : "Seleccionar"}
      </span>
    </button>
  );
}

function Step({
  number,
  title,
  text
}) {
  return (
    <div style={step}>
      <div style={stepNumber}>
        {number}
      </div>

      <div>
        <strong style={stepTitle}>
          {title}
        </strong>

        <p style={stepText}>
          {text}
        </p>
      </div>
    </div>
  );
}

function Line({
  title,
  value
}) {
  return (
    <div style={line}>
      <span>
        {title}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function getImageUrl(image) {
  if (!image || typeof image !== "string") {
    return "";
  }

  const cleanImage = image
    .trim()
    .replaceAll("&#x2F;", "/")
    .replaceAll("&amp;", "&");

  if (cleanImage.startsWith("http")) {
    return cleanImage;
  }

  if (cleanImage.startsWith("/uploads")) {
    return `http://localhost:5000${cleanImage}`;
  }

  if (cleanImage.startsWith("uploads")) {
    return `http://localhost:5000/${cleanImage}`;
  }

  return `http://localhost:5000/uploads/products/images/${cleanImage}`;
}

function getProductImage(product) {
  if (!product) {
    return "";
  }

  if (
    Array.isArray(product.images) &&
    product.images.length > 0
  ) {
    return getImageUrl(
      product.images[0]
    );
  }

  if (product.image) {
    return getImageUrl(product.image);
  }

  if (product.imageUrl) {
    return getImageUrl(
      product.imageUrl
    );
  }

  return "";
}

function formatCondition(condition) {
  const map = {
    NEW: "Nuevo",
    LIKE_NEW: "Como nuevo",
    USED_GOOD: "Buen estado",
    USED_DETAILS: "Usado con detalles",
    FOR_PARTS: "Para piezas"
  };

  return (
    map[
      String(condition || "")
        .toUpperCase()
    ] || "No especificado"
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

function formatPaymentMethod(value) {
  const map = {
    BANK_TRANSFER:
      "Transferencia contra entrega",
    CASH_ON_DELIVERY:
      "Efectivo contra entrega",
    CARD:
      "Tarjeta — pago inmediato"
  };

  return map[value] || "Sin seleccionar";
}

function formatDeliveryMethod(value) {
  const map = {
    QSM_WAREHOUSE:
      "Almacén QSM",
    QSM_VERIFIED_DELIVERY:
      "Delivery QSM verificado"
  };

  return map[value] || "Sin seleccionar";
}

const page = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at top right, rgba(53,208,195,.12), transparent 35%), radial-gradient(circle at 15% 20%, rgba(37,99,235,.10), transparent 30%), #020617",
  color: "white"
};

const container = {
  width: "100%",
  maxWidth: "1450px",
  margin: "0 auto",
  padding: "34px 28px 70px"
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "28px"
};

const backButton = {
  color: "#cbd5e1",
  textDecoration: "none",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(53,208,195,.18)",
  padding: "12px 16px",
  borderRadius: "14px",
  fontWeight: "800"
};

const header = {
  textAlign: "center",
  marginBottom: "34px",
  animation: "fadeUp .5s ease"
};

const label = {
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "900",
  margin: 0
};

const title = {
  fontSize: "clamp(38px, 5vw, 64px)",
  margin: "10px 0",
  lineHeight: 1.05,
  letterSpacing: "-1.5px"
};

const subtitle = {
  color: "#cbd5e1",
  fontSize: "18px",
  maxWidth: "780px",
  margin: "0 auto",
  lineHeight: "30px"
};

const grid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 420px",
  gap: "24px",
  alignItems: "start"
};

const leftColumn = {
  display: "grid",
  gap: "20px"
};

const rightColumn = {
  position: "sticky",
  top: "24px"
};

const card = {
  background: "rgba(15,23,42,.76)",
  border: "1px solid rgba(53,208,195,.16)",
  borderRadius: "24px",
  padding: "24px",
  boxShadow: "0 24px 80px rgba(0,0,0,.35)",
  backdropFilter: "blur(14px)",
  animation: "fadeUp .45s ease"
};

const centerCard = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "30px"
};

const loadingIcon = {
  width: "82px",
  height: "82px",
  borderRadius: "24px",
  background:
    "linear-gradient(135deg, #35d0c3, #2563eb, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "36px",
  boxShadow: "0 0 50px rgba(53,208,195,.28)",
  marginBottom: "18px"
};

const errorIcon = {
  width: "72px",
  height: "72px",
  borderRadius: "50%",
  background: "rgba(239,68,68,.18)",
  border: "1px solid rgba(239,68,68,.34)",
  color: "#fecaca",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "34px",
  fontWeight: "900",
  marginBottom: "18px"
};

const successBox = {
  background: "rgba(34,197,94,.14)",
  border: "1px solid rgba(34,197,94,.32)",
  color: "#bbf7d0",
  padding: "15px 18px",
  borderRadius: "16px",
  marginBottom: "18px",
  textAlign: "center",
  fontWeight: "800"
};

const errorBox = {
  background: "rgba(127,29,29,.24)",
  border: "1px solid rgba(248,113,113,.32)",
  color: "#fecaca",
  padding: "15px 18px",
  borderRadius: "16px",
  marginBottom: "18px",
  textAlign: "center",
  fontWeight: "800"
};

const errorText = {
  color: "#fecaca",
  lineHeight: "26px"
};

const sectionHeader = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  marginBottom: "20px"
};

const sectionNumber = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  background:
    "linear-gradient(135deg, #35d0c3, #2563eb)",
  color: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "950",
  fontSize: "18px",
  flexShrink: 0
};

const sectionTitle = {
  margin: 0,
  fontSize: "24px",
  color: "white"
};

const sectionSubtitle = {
  margin: "5px 0 0",
  color: "#94a3b8",
  lineHeight: "22px"
};

const productBox = {
  display: "grid",
  gridTemplateColumns: "280px minmax(0, 1fr)",
  gap: "24px",
  alignItems: "center"
};

const productImageBox = {
  position: "relative",
  width: "100%",
  height: "250px",
  borderRadius: "20px",
  overflow: "hidden",
  background:
    "radial-gradient(circle at center, rgba(53,208,195,.14), rgba(2,6,23,.72))",
  border: "1px solid rgba(53,208,195,.18)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const productImage = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  background: "#020617",
  cursor: "zoom-in"
};

const imagePlaceholder = {
  fontSize: "70px"
};

const zoomHint = {
  position: "absolute",
  left: "12px",
  bottom: "12px",
  background: "rgba(2,6,23,.78)",
  border: "1px solid rgba(255,255,255,.14)",
  color: "#e2e8f0",
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "800",
  backdropFilter: "blur(10px)"
};

const productTitle = {
  fontSize: "30px",
  margin: "0 0 10px",
  lineHeight: "1.15"
};

const muted = {
  color: "#94a3b8",
  lineHeight: "26px"
};

const pillRow = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "14px"
};

const pill = {
  background: "rgba(53,208,195,.12)",
  color: "#67fff1",
  border: "1px solid rgba(53,208,195,.24)",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900",
  fontSize: "12px"
};

const thumbnailRow = {
  display: "flex",
  gap: "10px",
  marginTop: "16px",
  overflowX: "auto",
  paddingBottom: "4px"
};

const thumbnail = {
  width: "72px",
  height: "58px",
  borderRadius: "12px",
  overflow: "hidden",
  border: "1px solid rgba(148,163,184,.18)",
  background: "rgba(2,6,23,.55)",
  padding: 0,
  cursor: "pointer",
  flexShrink: 0
};

const activeThumbnail = {
  ...thumbnail,
  border: "2px solid #35d0c3",
  boxShadow: "0 0 18px rgba(53,208,195,.30)"
};

const thumbnailImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const paymentOptionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "14px",
  marginTop: "18px"
};

const optionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
  marginTop: "18px"
};

const optionCard = (active) => ({
  position: "relative",
  minHeight: "235px",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: "10px",
  textAlign: "left",
  background: active
    ? "linear-gradient(135deg, rgba(53,208,195,.18), rgba(37,99,235,.12))"
    : "rgba(2,6,23,.48)",
  border: active
    ? "1px solid rgba(53,208,195,.62)"
    : "1px solid rgba(148,163,184,.14)",
  color: "white",
  borderRadius: "18px",
  padding: "20px",
  cursor: "pointer",
  boxShadow: active
    ? "0 16px 38px rgba(53,208,195,.12)"
    : "none"
});

const recommendedBadge = {
  position: "absolute",
  top: "12px",
  right: "12px",
  background: "rgba(139,92,246,.20)",
  border: "1px solid rgba(139,92,246,.40)",
  color: "#ddd6fe",
  borderRadius: "999px",
  padding: "6px 9px",
  fontSize: "11px",
  fontWeight: "900"
};

const optionIcon = {
  fontSize: "32px"
};

const optionTitle = {
  fontSize: "17px",
  lineHeight: "22px"
};

const optionText = {
  color: "#94a3b8",
  lineHeight: "21px",
  fontSize: "13px"
};

const demoNotice = {
  display: "block",
  width: "100%",
  marginTop: "5px",
  paddingTop: "10px",
  borderTop: "1px solid rgba(148,163,184,.12)",
  color: "#67e8f9",
  fontSize: "11px",
  lineHeight: "18px",
  fontWeight: "700"
};

const selectionIndicator = (active) => ({
  marginTop: "auto",
  color: active ? "#67fff1" : "#64748b",
  fontSize: "12px",
  fontWeight: "900"
});

const conditionalBox = {
  marginTop: "18px",
  background: "rgba(2,6,23,.38)",
  border: "1px solid rgba(148,163,184,.10)",
  borderRadius: "18px",
  padding: "18px"
};

const fieldLabel = {
  display: "block",
  color: "#cbd5e1",
  fontWeight: "800",
  marginBottom: "8px"
};

const input = {
  width: "100%",
  minHeight: "52px",
  marginBottom: "16px",
  background: "rgba(15,23,42,.84)",
  border: "1px solid rgba(148,163,184,.18)",
  borderRadius: "14px",
  color: "white",
  padding: "0 14px",
  outline: "none",
  fontSize: "15px"
};

const noticeBox = {
  background: "rgba(53,208,195,.09)",
  border: "1px solid rgba(53,208,195,.22)",
  borderRadius: "14px",
  padding: "14px",
  color: "#cbd5e1"
};

const continueButton = {
  width: "100%",
  marginTop: "18px",
  background:
    "linear-gradient(135deg, #35d0c3, #2563eb)",
  color: "#020617",
  border: "none",
  padding: "16px",
  borderRadius: "15px",
  fontSize: "15px",
  fontWeight: "900",
  cursor: "pointer"
};

const sellerBox = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  background: "rgba(2,6,23,.38)",
  border: "1px solid rgba(148,163,184,.10)",
  borderRadius: "18px",
  padding: "18px"
};

const avatar = {
  width: "72px",
  height: "72px",
  borderRadius: "50%",
  background:
    "linear-gradient(135deg, #35d0c3, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "30px",
  fontWeight: "900",
  flexShrink: 0
};

const sellerName = {
  margin: 0,
  fontSize: "24px"
};

const trustText = {
  color: "#35d0c3"
};

const steps = {
  display: "grid",
  gap: "14px"
};

const step = {
  display: "flex",
  gap: "14px",
  alignItems: "flex-start",
  background: "rgba(2,6,23,.45)",
  border: "1px solid rgba(148,163,184,.10)",
  padding: "14px",
  borderRadius: "16px"
};

const stepNumber = {
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  background: "#35d0c3",
  color: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  flexShrink: 0
};

const stepTitle = {
  color: "white"
};

const stepText = {
  color: "#94a3b8",
  margin: "5px 0 0",
  lineHeight: "22px"
};

const summaryCard = {
  ...card,
  padding: "26px"
};

const summaryHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "10px"
};

const summaryLabel = {
  margin: 0,
  color: "#35d0c3",
  letterSpacing: "3px",
  fontSize: "11px",
  fontWeight: "900"
};

const summaryTitle = {
  margin: "7px 0 0",
  fontSize: "25px"
};

const summaryShield = {
  width: "52px",
  height: "52px",
  borderRadius: "17px",
  background:
    "linear-gradient(135deg, #35d0c3, #2563eb, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
  boxShadow: "0 0 30px rgba(53,208,195,.24)"
};

const line = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  padding: "15px 0",
  borderBottom: "1px solid rgba(148,163,184,.12)",
  color: "#cbd5e1"
};

const totalLine = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "22px 0",
  fontSize: "24px",
  color: "#35d0c3"
};

const secureBox = {
  background: "rgba(53,208,195,.10)",
  border: "1px solid rgba(53,208,195,.28)",
  borderRadius: "18px",
  padding: "18px",
  color: "#cbd5e1",
  marginBottom: "14px"
};

const demoGlobalBox = {
  background: "rgba(37,99,235,.10)",
  border: "1px solid rgba(96,165,250,.24)",
  borderRadius: "18px",
  padding: "16px",
  color: "#cbd5e1",
  marginBottom: "18px"
};

const termsRow = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  color: "#cbd5e1",
  lineHeight: "22px",
  marginBottom: "18px"
};

const buttonPrimary = {
  width: "100%",
  background:
    "linear-gradient(135deg, #35d0c3, #2563eb)",
  color: "#020617",
  border: "none",
  padding: "17px",
  borderRadius: "16px",
  fontWeight: "900",
  fontSize: "16px"
};

const buttonSecondary = {
  display: "inline-block",
  background: "#35d0c3",
  color: "#020617",
  textDecoration: "none",
  padding: "14px 18px",
  borderRadius: "14px",
  fontWeight: "900"
};

const smallNote = {
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: "22px",
  textAlign: "center"
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(2,6,23,.95)",
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "28px",
  cursor: "zoom-out"
};

const modalImage = {
  maxWidth: "96vw",
  maxHeight: "92vh",
  objectFit: "contain",
  borderRadius: "18px",
  boxShadow: "0 30px 100px rgba(0,0,0,.72)"
};

const modalClose = {
  position: "fixed",
  top: "22px",
  right: "28px",
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  border: "1px solid rgba(255,255,255,.22)",
  background: "rgba(15,23,42,.88)",
  color: "white",
  fontSize: "32px",
  cursor: "pointer",
  zIndex: 10000,
  lineHeight: "42px"
};

export default Checkout;