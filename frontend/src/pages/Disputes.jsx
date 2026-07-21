import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

function Disputes() {
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const orderIdFromUrl = params.get("orderId") || "";
  const productIdFromUrl = params.get("productId") || "";

  const savedUser =
    safeJson(localStorage.getItem("qsm_user")) ||
    safeJson(localStorage.getItem("user")) ||
    {};

  const currentUserId = savedUser._id || savedUser.id || savedUser.userId || "";

  const [disputes, setDisputes] = useState([]);
  const [activeDispute, setActiveDispute] = useState(null);
  const [orders, setOrders] = useState([]);

  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState(orderIdFromUrl);
  const [selectedProductId, setSelectedProductId] = useState(productIdFromUrl);
  const [evidenceText, setEvidenceText] = useState("");
  const [messageText, setMessageText] = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(orderIdFromUrl ? "new" : "list");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (orderIdFromUrl) {
      setSelectedOrderId(orderIdFromUrl);
      setSelectedProductId(productIdFromUrl);
      setActiveTab("new");
    }
  }, [orderIdFromUrl, productIdFromUrl]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      setNotice("");

      const [disputesResponse, ordersResponse] = await Promise.allSettled([
        api.get("/disputes"),
        api.get("/orders/my-orders")
      ]);

      if (disputesResponse.status === "fulfilled") {
        const backendDisputes =
          disputesResponse.value.data.disputes ||
          disputesResponse.value.data.data ||
          disputesResponse.value.data ||
          [];

        const safeDisputes = Array.isArray(backendDisputes) ? backendDisputes : [];
        setDisputes(safeDisputes);

        if (!activeDispute && safeDisputes.length > 0) {
          setActiveDispute(safeDisputes[0]);
        }
      } else {
        setError(
          disputesResponse.reason?.response?.data?.message ||
            "No se pudieron cargar los reclamos. Verifica GET /disputes en el backend."
        );
      }

      if (ordersResponse.status === "fulfilled") {
        const backendOrders =
          ordersResponse.value.data.orders ||
          ordersResponse.value.data.data ||
          ordersResponse.value.data.myOrders ||
          [];

        setOrders(Array.isArray(backendOrders) ? backendOrders : []);
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo cargar el Centro de Reclamos."
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredDisputes = useMemo(() => {
    let result = [...disputes];

    if (statusFilter !== "ALL") {
      result = result.filter(
        (dispute) => normalizeStatus(dispute.status) === statusFilter
      );
    }

    if (search.trim()) {
      const term = search.toLowerCase();

      result = result.filter((dispute) => {
        const product = dispute.product || {};
        const order = dispute.order || {};
        const buyer = dispute.buyer || {};
        const seller = dispute.seller || {};

        return `${dispute.disputeCode || ""} ${dispute.reason || ""} ${dispute.details || ""} ${product.title || ""} ${order.orderCode || ""} ${buyer.firstName || ""} ${seller.firstName || ""}`
          .toLowerCase()
          .includes(term);
      });
    }

    return result;
  }, [disputes, statusFilter, search]);

  const stats = useMemo(() => {
    return {
      total: disputes.length,
      open: disputes.filter((item) =>
        ["OPEN", "IN_REVIEW", "WAITING_EVIDENCE"].includes(normalizeStatus(item.status))
      ).length,
      resolved: disputes.filter((item) =>
        ["RESOLVED_BUYER", "RESOLVED_SELLER", "CLOSED"].includes(normalizeStatus(item.status))
      ).length,
      escrow: disputes.reduce(
        (total, item) => total + Number(item.escrowAmount || item.order?.total || 0),
        0
      )
    };
  }, [disputes]);

  const selectedOrder = useMemo(() => {
    return orders.find((order) => String(order._id || order.id) === String(selectedOrderId));
  }, [orders, selectedOrderId]);

  const createDispute = async (event) => {
    event.preventDefault();

    if (!reason || !details.trim()) {
      setError("Selecciona un motivo y escribe los detalles del reclamo.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setNotice("");

      const payload = {
        orderId: selectedOrderId || undefined,
        productId:
          selectedProductId ||
          selectedOrder?.product?._id ||
          selectedOrder?.product ||
          undefined,
        reason,
        details: details.trim(),
        evidenceText: evidenceText.trim() || undefined
      };

      const response = await api.post("/disputes", payload);

      const dispute =
        response.data.dispute ||
        response.data.data ||
        response.data;

      setNotice("Reclamo creado correctamente. QSM inició el proceso de revisión.");
      setDisputes((prev) => [dispute, ...prev]);
      setActiveDispute(dispute);
      setActiveTab("detail");

      setReason("");
      setDetails("");
      setEvidenceText("");
      setSelectedOrderId("");
      setSelectedProductId("");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo crear el reclamo. Verifica POST /disputes en el backend."
      );
    } finally {
      setCreating(false);
    }
  };

  const sendDisputeMessage = async (event) => {
    event.preventDefault();

    if (!messageText.trim() || !activeDispute?._id) return;

    try {
      setSending(true);
      setError("");
      setNotice("");

      const response = await api.post(`/disputes/${activeDispute._id}/messages`, {
        text: messageText.trim()
      });

      const updated =
        response.data.dispute ||
        response.data.data ||
        response.data;

      setActiveDispute(updated);
      setDisputes((prev) =>
        prev.map((item) => String(item._id) === String(updated._id) ? updated : item)
      );
      setMessageText("");
      setNotice("Mensaje agregado al reclamo.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo enviar el mensaje. Verifica POST /disputes/:id/messages."
      );
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (disputeId, nextStatus) => {
    if (!disputeId) return;

    try {
      setUpdatingId(disputeId);
      setError("");
      setNotice("");

      const response = await api.patch(`/disputes/${disputeId}/status`, {
        status: nextStatus
      });

      const updated =
        response.data.dispute ||
        response.data.data ||
        response.data;

      setDisputes((prev) =>
        prev.map((item) => String(item._id) === String(updated._id) ? updated : item)
      );
      setActiveDispute(updated);
      setNotice("Estado del reclamo actualizado.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo actualizar el estado. Verifica PATCH /disputes/:id/status."
      );
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div style={page}>
      <style>{`
        * { box-sizing: border-box; }

        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          background: #020617;
          font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
          overflow-x: hidden;
        }

        a, button, input, select, textarea {
          font-family: inherit;
        }

        a, button {
          transition: all .25s ease;
        }

        a:hover, button:hover {
          transform: translateY(-2px);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1240px) {
          .stats-grid,
          .disputes-layout,
          .filters-row,
          .two-columns {
            grid-template-columns: 1fr !important;
          }

          .hero-row {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }

        @media (max-width: 1100px) {
          .disputes-page {
            grid-template-columns: 1fr !important;
          }

          .sidebar-wrapper {
            display: none !important;
          }
        }

        @media (max-width: 760px) {
          .main-content {
            padding: 18px !important;
          }

          .tab-row,
          .action-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div className="disputes-page" style={layout}>
        <div
          className="sidebar-wrapper"
          style={sidebarWrapper}
        >
          <Sidebar />
        </div>

        <main className="main-content" style={main}>
          <Topbar />

          <section className="hero-row" style={hero}>
            <div>
              <p style={label}>CENTRO DE RECLAMOS QSM</p>
              <h1 style={title}>Mis reclamos y disputas</h1>
              <p style={subtitle}>
                Abre reclamos, sube evidencia, conversa con QSM y protege el dinero retenido por Pago Protegido.
              </p>
            </div>

            <div style={heroBadge}>
              <span>⚖️</span>
              <div>
                <strong>Resolución protegida</strong>
                <p>QSM analiza evidencias y estado del pago.</p>
              </div>
            </div>
          </section>

          <section className="stats-grid" style={statsGrid}>
            <StatCard icon="⚖️" title="Reclamos totales" value={stats.total} />
            <StatCard icon="🟡" title="En revisión" value={stats.open} />
            <StatCard icon="✅" title="Resueltos" value={stats.resolved} />
            <StatCard icon="🛡" title="Monto protegido" value={formatMoney(stats.escrow)} />
          </section>

          <section style={controlPanel}>
            <div className="tab-row" style={tabRow}>
              <button
                onClick={() => setActiveTab("list")}
                style={activeTab === "list" ? activeTabButton : tabButton}
              >
                📋 Reclamos
              </button>

              <button
                onClick={() => setActiveTab("new")}
                style={activeTab === "new" ? activeTabButton : tabButton}
              >
                ➕ Abrir reclamo
              </button>

              <button
                onClick={() => setActiveTab("detail")}
                style={activeTab === "detail" ? activeTabButton : tabButton}
              >
                🔍 Detalle
              </button>
            </div>

            <div className="filters-row" style={filtersRow}>
              <div style={searchBox}>
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar reclamos por producto, orden, código o motivo..."
                  style={searchInput}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                style={selectInput}
              >
                <option value="ALL">Todos los estados</option>
                <option value="OPEN">Abierto</option>
                <option value="IN_REVIEW">En revisión</option>
                <option value="WAITING_EVIDENCE">Esperando evidencia</option>
                <option value="RESOLVED_BUYER">Resuelto a comprador</option>
                <option value="RESOLVED_SELLER">Resuelto a vendedor</option>
                <option value="CLOSED">Cerrado</option>
              </select>

              <button onClick={loadData} style={ghostButton}>Actualizar</button>
            </div>
          </section>

          {notice && <div style={successBox}>{notice}</div>}
          {error && <div style={errorBox}>{error}</div>}

          {loading && (
            <div style={centerCard}>
              <h2>Cargando reclamos...</h2>
              <p>QSM está consultando el módulo de disputas.</p>
            </div>
          )}

          {!loading && activeTab === "list" && (
            <section className="disputes-layout" style={disputesLayout}>
              <div style={listPanel}>
                <h2>Reclamos registrados</h2>

                {filteredDisputes.length === 0 && (
                  <div style={emptyBox}>
                    <h3>No hay reclamos</h3>
                    <p>No existen reclamos para los filtros seleccionados.</p>
                    <button onClick={() => setActiveTab("new")} style={primaryButton}>
                      Abrir reclamo
                    </button>
                  </div>
                )}

                {filteredDisputes.map((dispute) => (
                  <DisputeListCard
                    key={dispute._id}
                    dispute={dispute}
                    active={activeDispute?._id === dispute._id}
                    onOpen={() => {
                      setActiveDispute(dispute);
                      setActiveTab("detail");
                    }}
                  />
                ))}
              </div>

              <div style={rightPanel}>
                <h2>Proceso QSM</h2>
                <ProcessCard />
              </div>
            </section>
          )}

          {!loading && activeTab === "new" && (
            <section style={formPanel}>
              <div>
                <p style={label}>NUEVO RECLAMO</p>
                <h2>Abrir reclamo protegido</h2>
                <p style={muted}>
                  Explica claramente lo sucedido. QSM utilizará esta información para revisar la orden, el pago y la evidencia.
                </p>
              </div>

              <form onSubmit={createDispute} style={form}>
                <div className="two-columns" style={twoColumns}>
                  <div>
                    <label style={fieldLabel}>Orden relacionada</label>
                    <select
                      value={selectedOrderId}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSelectedOrderId(value);
                        const order = orders.find((item) => String(item._id || item.id) === String(value));
                        setSelectedProductId(order?.product?._id || order?.product || "");
                      }}
                      style={input}
                    >
                      <option value="">Sin orden / seleccionar luego</option>
                      {orders.map((order) => (
                        <option key={order._id || order.id} value={order._id || order.id}>
                          {order.orderCode || `Orden ${String(order._id || order.id).slice(-6)}`} · {order.product?.title || order.productTitle || "Producto QSM"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={fieldLabel}>Producto ID</label>
                    <input
                      value={selectedProductId}
                      onChange={(event) => setSelectedProductId(event.target.value)}
                      placeholder="ID del producto"
                      style={input}
                    />
                  </div>
                </div>

                <label style={fieldLabel}>Motivo del reclamo</label>
                <select value={reason} onChange={(event) => setReason(event.target.value)} style={input}>
                  <option value="">Seleccionar motivo</option>
                  <option value="PRODUCT_NOT_AS_DESCRIBED">Producto diferente al descrito</option>
                  <option value="DAMAGED_PRODUCT">Producto dañado</option>
                  <option value="NOT_DELIVERED">Producto no entregado</option>
                  <option value="FAKE_PRODUCT">Producto falso o sospechoso</option>
                  <option value="PAYMENT_PROBLEM">Problema con el pago</option>
                  <option value="SELLER_PROBLEM">Problema con el vendedor</option>
                  <option value="BUYER_PROBLEM">Problema con el comprador</option>
                  <option value="OTHER">Otro</option>
                </select>

                <label style={fieldLabel}>Detalles del caso</label>
                <textarea
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  placeholder="Describe qué ocurrió, cuándo pasó, qué esperabas recibir y qué evidencia tienes."
                  style={textarea}
                />

                <label style={fieldLabel}>Evidencia o notas adicionales</label>
                <textarea
                  value={evidenceText}
                  onChange={(event) => setEvidenceText(event.target.value)}
                  placeholder="Ej: el equipo no enciende, llegó sin cargador, el serial no coincide, etc."
                  style={textareaSmall}
                />

                <div style={securityNotice}>
                  <strong>🛡 Pago Protegido QSM</strong>
                  <p>
                    Si la orden tiene escrow activo, QSM puede mantener el dinero retenido mientras se revisa el reclamo.
                  </p>
                </div>

                <div className="action-row" style={actionRow}>
                  <button type="button" onClick={() => setActiveTab("list")} style={outlineButton}>
                    Cancelar
                  </button>

                  <button type="submit" disabled={creating} style={primaryButton}>
                    {creating ? "Creando reclamo..." : "Abrir reclamo →"}
                  </button>
                </div>
              </form>
            </section>
          )}

          {!loading && activeTab === "detail" && (
            <section>
              {!activeDispute ? (
                <div style={centerCard}>
                  <h2>Selecciona un reclamo</h2>
                  <p>No hay reclamo seleccionado para revisar.</p>
                  <button onClick={() => setActiveTab("list")} style={primaryButton}>
                    Ver reclamos
                  </button>
                </div>
              ) : (
                <DisputeDetail
                  dispute={activeDispute}
                  currentUserId={currentUserId}
                  messageText={messageText}
                  setMessageText={setMessageText}
                  sending={sending}
                  sendDisputeMessage={sendDisputeMessage}
                  updateStatus={updateStatus}
                  updatingId={updatingId}
                />
              )}
            </section>
          )}
        </main>
      </div>

      <AiAssistant pageContext="disputes" />
    </div>
  );
}

function DisputeListCard({ dispute, active, onOpen }) {
  const product = dispute.product || {};
  const order = dispute.order || {};

  return (
    <button onClick={onOpen} style={active ? activeDisputeCard : disputeCard}>
      <div style={cardHeader}>
        <div>
          <p style={smallLabel}>Reclamo</p>
          <h3>{dispute.disputeCode || `DSP-${String(dispute._id).slice(-6)}`}</h3>
        </div>
        <span style={statusBadge(dispute.status)}>{formatStatus(dispute.status)}</span>
      </div>

      <p style={muted}>
        {product.title || dispute.productTitle || "Producto QSM"} · {order.orderCode || "Orden pendiente"}
      </p>

      <strong>{formatReason(dispute.reason)}</strong>
      <span style={dateText}>{formatDate(dispute.createdAt)}</span>
    </button>
  );
}

function DisputeDetail({
  dispute,
  currentUserId,
  messageText,
  setMessageText,
  sending,
  sendDisputeMessage,
  updateStatus,
  updatingId
}) {
  const product = dispute.product || {};
  const order = dispute.order || {};
  const buyer = dispute.buyer || {};
  const seller = dispute.seller || {};
  const messages = dispute.messages || [];

  return (
    <div className="disputes-layout" style={disputesLayout}>
      <section style={detailPanel}>
        <div style={cardHeader}>
          <div>
            <p style={label}>DETALLE DEL RECLAMO</p>
            <h2>{dispute.disputeCode || `DSP-${String(dispute._id).slice(-6)}`}</h2>
          </div>
          <span style={statusBadge(dispute.status)}>{formatStatus(dispute.status)}</span>
        </div>

        <div style={productBox}>
          <div style={productIcon}>⚖️</div>
          <div>
            <h3>{product.title || dispute.productTitle || "Producto QSM"}</h3>
            <p style={muted}>Orden: {order.orderCode || dispute.orderCode || "Pendiente"}</p>
            <strong style={priceText}>
              Monto protegido: {formatMoney(dispute.escrowAmount || order.total || order.price || 0)}
            </strong>
          </div>
        </div>

        <div style={infoGrid}>
          <Info title="Comprador" value={formatUser(buyer, "Comprador QSM")} />
          <Info title="Vendedor" value={formatUser(seller, "Vendedor QSM")} />
          <Info title="Motivo" value={formatReason(dispute.reason)} />
          <Info title="Fecha" value={formatDate(dispute.createdAt)} />
        </div>

        <div style={sectionBox}>
          <h3>Descripción del caso</h3>
          <p>{dispute.details || "Sin detalles registrados."}</p>
        </div>

        <div style={sectionBox}>
          <h3>Evidencia registrada</h3>
          <p>{dispute.evidenceText || "No se registró evidencia adicional."}</p>
        </div>

        <div style={timelineBox}>
          <h3>Seguimiento QSM</h3>
          <ProgressItem active text="Reclamo creado" />
          <ProgressItem active={isStatusReached(dispute.status, ["IN_REVIEW", "WAITING_EVIDENCE", "RESOLVED_BUYER", "RESOLVED_SELLER", "CLOSED"])} text="QSM revisa el caso" />
          <ProgressItem active={isStatusReached(dispute.status, ["WAITING_EVIDENCE"])} text="Esperando evidencia adicional" />
          <ProgressItem active={isStatusReached(dispute.status, ["RESOLVED_BUYER", "RESOLVED_SELLER", "CLOSED"])} text="Resolución tomada" />
        </div>

        <div className="action-row" style={actionRow}>
          <button
            onClick={() => updateStatus(dispute._id, "IN_REVIEW")}
            disabled={updatingId === dispute._id}
            style={warningButton}
          >
            En revisión
          </button>

          <button
            onClick={() => updateStatus(dispute._id, "WAITING_EVIDENCE")}
            disabled={updatingId === dispute._id}
            style={outlineButton}
          >
            Pedir evidencia
          </button>

          <button
            onClick={() => updateStatus(dispute._id, "RESOLVED_BUYER")}
            disabled={updatingId === dispute._id}
            style={successButton}
          >
            Resolver comprador
          </button>

          <button
            onClick={() => updateStatus(dispute._id, "RESOLVED_SELLER")}
            disabled={updatingId === dispute._id}
            style={successButton}
          >
            Resolver vendedor
          </button>
        </div>
      </section>

      <aside style={chatPanel}>
        <h2>Mensajes del reclamo</h2>
        <p style={muted}>Comunicación interna del caso y notas para la resolución.</p>

        <div style={messagesBox}>
          {messages.length === 0 && (
            <div style={emptyBox}>
              <h3>Sin mensajes</h3>
              <p>Aún no hay mensajes en este reclamo.</p>
            </div>
          )}

          {messages.map((message, index) => {
            const senderId =
              message.sender?._id ||
              message.sender?.id ||
              message.sender ||
              message.senderId;

            const mine = String(senderId || "") === String(currentUserId);

            return (
              <div key={message._id || index} style={mine ? myMessageRow : otherMessageRow}>
                <div style={mine ? myBubble : otherBubble}>
                  <strong>{formatUser(message.sender, mine ? "Tú" : "Usuario QSM")}</strong>
                  <p>{message.text}</p>
                  <span>{formatDate(message.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={sendDisputeMessage} style={messageForm}>
          <textarea
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            placeholder="Agregar mensaje o nota al reclamo..."
            style={messageInput}
          />

          <button type="submit" disabled={sending || !messageText.trim()} style={primaryButton}>
            {sending ? "Enviando..." : "Enviar mensaje"}
          </button>
        </form>
      </aside>
    </div>
  );
}

function ProcessCard() {
  return (
    <div style={processCard}>
      <ProcessStep number="1" title="Comprador abre reclamo" text="Se registra el motivo y la evidencia." />
      <ProcessStep number="2" title="QSM retiene el pago" text="El escrow se mantiene protegido mientras se revisa." />
      <ProcessStep number="3" title="Revisión de evidencia" text="QSM analiza mensajes, producto, vendedor y comprador." />
      <ProcessStep number="4" title="Resolución" text="QSM libera, reembolsa o escala el caso." />
    </div>
  );
}

function ProcessStep({ number, title, text }) {
  return (
    <div style={processStep}>
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <div style={statCard}>
      <div style={statIcon}>{icon}</div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Info({ title, value }) {
  return (
    <div style={infoItem}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProgressItem({ active, text }) {
  return (
    <div style={progressItem}>
      <span style={active ? dotActive : dotInactive}>{active ? "✓" : "•"}</span>
      <p>{text}</p>
    </div>
  );
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function normalizeStatus(status) {
  return String(status || "OPEN").toUpperCase();
}

function isStatusReached(status, validStatuses) {
  return validStatuses.includes(normalizeStatus(status));
}

function formatStatus(status) {
  const map = {
    OPEN: "Abierto",
    IN_REVIEW: "En revisión",
    WAITING_EVIDENCE: "Esperando evidencia",
    RESOLVED_BUYER: "Resuelto a comprador",
    RESOLVED_SELLER: "Resuelto a vendedor",
    CLOSED: "Cerrado"
  };

  return map[normalizeStatus(status)] || "Abierto";
}

function formatReason(reason) {
  const map = {
    PRODUCT_NOT_AS_DESCRIBED: "Producto diferente al descrito",
    DAMAGED_PRODUCT: "Producto dañado",
    NOT_DELIVERED: "Producto no entregado",
    FAKE_PRODUCT: "Producto falso o sospechoso",
    PAYMENT_PROBLEM: "Problema con el pago",
    SELLER_PROBLEM: "Problema con el vendedor",
    BUYER_PROBLEM: "Problema con el comprador",
    OTHER: "Otro"
  };

  return map[reason] || reason || "Sin motivo";
}

function formatUser(user, fallback) {
  if (!user || typeof user !== "object") return fallback;

  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

  return name || user.name || user.email || fallback;
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "Pendiente";

  return new Date(value).toLocaleString("es-DO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const page = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at top right, rgba(245,158,11,.12), transparent 34%), radial-gradient(circle at 18% 15%, rgba(56,189,248,.09), transparent 28%), #020617",
  color: "white"
};

const layout = {
  width: "100%",
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns:
    "var(--qsm-sidebar-width, 96px) minmax(0, 1fr)",
  overflowX: "hidden",
  transition:
    "grid-template-columns var(--qsm-transition, .28s ease)",
  alignItems: "stretch"
};

const sidebarWrapper = {
  width:
    "var(--qsm-sidebar-width, 96px)",
  minWidth:
    "var(--qsm-sidebar-width, 96px)",
  transition:
    "width var(--qsm-transition, .28s ease), min-width var(--qsm-transition, .28s ease)"
};

const main = {
  width: "100%",
  minWidth: 0,
  padding: "26px 34px 56px",
  overflowX: "hidden"
};

const hero = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "24px",
  margin: "22px 0"
};

const label = {
  color: "#38bdf8",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "950",
  textTransform: "uppercase",
  margin: 0
};

const title = {
  fontSize: "clamp(40px, 3.6vw, 62px)",
  lineHeight: "1",
  margin: "10px 0",
  letterSpacing: "-2px"
};

const subtitle = {
  color: "#cbd5e1",
  lineHeight: "29px",
  maxWidth: "840px",
  margin: 0
};

const heroBadge = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  minWidth: "300px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(245,158,11,.24)",
  borderRadius: "22px",
  padding: "18px"
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px"
};

const statCard = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.15)",
  borderRadius: "22px",
  padding: "20px"
};

const statIcon = {
  width: "52px",
  height: "52px",
  borderRadius: "17px",
  background: "rgba(245,158,11,.14)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px"
};

const controlPanel = {
  background: "rgba(15,23,42,.62)",
  border: "1px solid rgba(56,189,248,.14)",
  borderRadius: "24px",
  padding: "18px",
  marginBottom: "18px"
};

const tabRow = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "10px",
  marginBottom: "14px"
};

const tabButton = {
  background: "rgba(2,6,23,.45)",
  border: "1px solid rgba(148,163,184,.14)",
  color: "#cbd5e1",
  padding: "13px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "900"
};

const activeTabButton = {
  ...tabButton,
  background: "linear-gradient(135deg, rgba(245,158,11,.18), rgba(139,92,246,.20))",
  border: "1px solid rgba(245,158,11,.38)",
  color: "white"
};

const filtersRow = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 240px 130px",
  gap: "12px"
};

const searchBox = {
  height: "56px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background: "rgba(2,6,23,.45)",
  border: "1px solid rgba(148,163,184,.14)",
  borderRadius: "15px",
  padding: "0 14px"
};

const searchInput = {
  flex: 1,
  height: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: "white"
};

const selectInput = {
  background: "rgba(2,6,23,.45)",
  border: "1px solid rgba(148,163,184,.14)",
  borderRadius: "15px",
  padding: "0 14px",
  color: "white",
  outline: "none"
};

const ghostButton = {
  background: "rgba(15,23,42,.70)",
  border: "1px solid rgba(148,163,184,.16)",
  color: "white",
  borderRadius: "15px",
  fontWeight: "900",
  cursor: "pointer"
};

const successBox = {
  background: "rgba(34,197,94,.14)",
  border: "1px solid rgba(34,197,94,.32)",
  color: "#bbf7d0",
  padding: "14px 18px",
  borderRadius: "16px",
  marginBottom: "16px",
  fontWeight: "800"
};

const errorBox = {
  background: "rgba(127,29,29,.24)",
  border: "1px solid rgba(248,113,113,.30)",
  color: "#fecaca",
  padding: "14px 18px",
  borderRadius: "16px",
  marginBottom: "16px",
  fontWeight: "800"
};

const centerCard = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.14)",
  borderRadius: "24px",
  padding: "44px",
  textAlign: "center",
  color: "#cbd5e1"
};

const disputesLayout = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.2fr) minmax(360px, .8fr)",
  gap: "20px"
};

const listPanel = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.16)",
  borderRadius: "26px",
  padding: "22px",
  display: "grid",
  gap: "12px"
};

const rightPanel = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.16)",
  borderRadius: "26px",
  padding: "22px"
};

const disputeCard = {
  width: "100%",
  textAlign: "left",
  background: "rgba(2,6,23,.45)",
  border: "1px solid rgba(148,163,184,.12)",
  color: "white",
  borderRadius: "20px",
  padding: "16px",
  cursor: "pointer",
  display: "grid",
  gap: "8px"
};

const activeDisputeCard = {
  ...disputeCard,
  background: "linear-gradient(135deg, rgba(245,158,11,.14), rgba(139,92,246,.16))",
  border: "1px solid rgba(245,158,11,.38)"
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px"
};

const smallLabel = {
  color: "#38bdf8",
  fontSize: "12px",
  letterSpacing: "3px",
  fontWeight: "950",
  margin: 0
};

const statusBadge = (status) => {
  const normalized = normalizeStatus(status);
  const colors = {
    OPEN: ["rgba(245,158,11,.16)", "#fde68a", "rgba(245,158,11,.34)"],
    IN_REVIEW: ["rgba(56,189,248,.16)", "#7dd3fc", "rgba(56,189,248,.34)"],
    WAITING_EVIDENCE: ["rgba(168,85,247,.16)", "#d8b4fe", "rgba(168,85,247,.34)"],
    RESOLVED_BUYER: ["rgba(34,197,94,.16)", "#86efac", "rgba(34,197,94,.34)"],
    RESOLVED_SELLER: ["rgba(34,197,94,.16)", "#86efac", "rgba(34,197,94,.34)"],
    CLOSED: ["rgba(148,163,184,.14)", "#cbd5e1", "rgba(148,163,184,.24)"]
  };
  const selected = colors[normalized] || colors.OPEN;

  return {
    background: selected[0],
    color: selected[1],
    border: `1px solid ${selected[2]}`,
    borderRadius: "999px",
    padding: "8px 12px",
    fontWeight: "950",
    whiteSpace: "nowrap",
    fontSize: "12px"
  };
};

const muted = {
  color: "#cbd5e1",
  lineHeight: "25px"
};

const dateText = {
  color: "#94a3b8",
  fontSize: "13px"
};

const emptyBox = {
  background: "rgba(2,6,23,.35)",
  border: "1px solid rgba(148,163,184,.12)",
  borderRadius: "18px",
  padding: "22px",
  color: "#cbd5e1",
  textAlign: "center"
};

const primaryButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "14px 20px",
  borderRadius: "14px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 18px 54px rgba(139,92,246,.22)"
};

const formPanel = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.16)",
  borderRadius: "26px",
  padding: "26px"
};

const form = {
  display: "grid",
  gap: "14px",
  marginTop: "18px"
};

const twoColumns = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px"
};

const fieldLabel = {
  display: "block",
  marginBottom: "8px",
  fontWeight: "900"
};

const input = {
  width: "100%",
  minHeight: "54px",
  background: "rgba(2,6,23,.55)",
  border: "1px solid rgba(148,163,184,.16)",
  color: "white",
  borderRadius: "15px",
  padding: "0 14px",
  outline: "none"
};

const textarea = {
  ...input,
  minHeight: "150px",
  padding: "14px",
  resize: "vertical"
};

const textareaSmall = {
  ...textarea,
  minHeight: "100px"
};

const securityNotice = {
  background: "rgba(53,208,195,.10)",
  border: "1px solid rgba(53,208,195,.26)",
  color: "#cbd5e1",
  borderRadius: "16px",
  padding: "14px"
};

const actionRow = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "10px",
  marginTop: "10px"
};

const outlineButton = {
  textAlign: "center",
  background: "rgba(15,23,42,.64)",
  border: "1px solid rgba(148,163,184,.16)",
  color: "white",
  borderRadius: "13px",
  padding: "12px",
  fontWeight: "950",
  cursor: "pointer"
};

const warningButton = {
  ...outlineButton,
  background: "rgba(245,158,11,.16)",
  color: "#fde68a",
  border: "1px solid rgba(245,158,11,.32)"
};

const successButton = {
  ...outlineButton,
  background: "rgba(34,197,94,.16)",
  color: "#bbf7d0",
  border: "1px solid rgba(34,197,94,.32)"
};

const detailPanel = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.16)",
  borderRadius: "26px",
  padding: "24px"
};

const productBox = {
  display: "grid",
  gridTemplateColumns: "86px 1fr",
  gap: "16px",
  alignItems: "center",
  background: "rgba(2,6,23,.40)",
  border: "1px solid rgba(148,163,184,.10)",
  borderRadius: "18px",
  padding: "14px",
  margin: "18px 0"
};

const productIcon = {
  width: "86px",
  height: "86px",
  borderRadius: "18px",
  background: "linear-gradient(135deg, rgba(245,158,11,.18), rgba(139,92,246,.18))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "38px"
};

const priceText = {
  display: "block",
  color: "#35d0c3",
  marginTop: "6px"
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "12px",
  marginBottom: "16px"
};

const infoItem = {
  background: "rgba(2,6,23,.35)",
  border: "1px solid rgba(148,163,184,.10)",
  borderRadius: "14px",
  padding: "12px"
};

const sectionBox = {
  background: "rgba(2,6,23,.35)",
  border: "1px solid rgba(148,163,184,.10)",
  borderRadius: "18px",
  padding: "16px",
  marginBottom: "16px"
};

const timelineBox = {
  ...sectionBox
};

const progressItem = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  color: "#cbd5e1",
  marginBottom: "8px"
};

const dotActive = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  background: "#35d0c3",
  color: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "950"
};

const dotInactive = {
  ...dotActive,
  background: "rgba(148,163,184,.18)",
  color: "#94a3b8"
};

const chatPanel = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.16)",
  borderRadius: "26px",
  padding: "22px",
  display: "flex",
  flexDirection: "column",
  minHeight: "680px"
};

const messagesBox = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  overflowY: "auto",
  margin: "12px 0",
  paddingRight: "4px"
};

const myMessageRow = {
  display: "flex",
  justifyContent: "flex-end"
};

const otherMessageRow = {
  display: "flex",
  justifyContent: "flex-start"
};

const myBubble = {
  maxWidth: "80%",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  color: "white",
  padding: "13px 15px",
  borderRadius: "18px 18px 4px 18px"
};

const otherBubble = {
  maxWidth: "80%",
  background: "rgba(2,6,23,.55)",
  border: "1px solid rgba(148,163,184,.12)",
  color: "white",
  padding: "13px 15px",
  borderRadius: "18px 18px 18px 4px"
};

const messageForm = {
  display: "grid",
  gap: "10px"
};

const messageInput = {
  width: "100%",
  minHeight: "96px",
  resize: "vertical",
  outline: "none",
  background: "rgba(2,6,23,.55)",
  border: "1px solid rgba(148,163,184,.14)",
  color: "white",
  borderRadius: "16px",
  padding: "14px",
  lineHeight: "22px"
};

const processCard = {
  display: "grid",
  gap: "14px"
};

const processStep = {
  display: "grid",
  gridTemplateColumns: "42px 1fr",
  gap: "12px",
  alignItems: "start",
  background: "rgba(2,6,23,.35)",
  border: "1px solid rgba(148,163,184,.10)",
  borderRadius: "16px",
  padding: "14px"
};

export default Disputes;
