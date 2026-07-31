import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

function Notifications() {
  const navigate = useNavigate();

  const [
    notifications,
    setNotifications
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    refreshing,
    setRefreshing
  ] = useState(false);

  const [
    markingAll,
    setMarkingAll
  ] = useState(false);

  const [
    filter,
    setFilter
  ] = useState("ALL");

  const [
    search,
    setSearch
  ] = useState("");

  const [
    error,
    setError
  ] = useState("");

  const [
    notice,
    setNotice
  ] = useState("");

  const loadNotifications =
    useCallback(
      async (
        showRefreshing = false
      ) => {
        try {
          if (showRefreshing) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const response =
            await api.get(
              "/notifications"
            );

          const source =
            response?.data
              ?.notifications ||
            response?.data
              ?.data ||
            response?.data ||
            [];

          const items =
            Array.isArray(source)
              ? source
              : [];

          setNotifications(
            items
              .map(
                normalizeNotification
              )
              .sort(
                (
                  first,
                  second
                ) =>
                  new Date(
                    second.createdAt ||
                    0
                  ) -
                  new Date(
                    first.createdAt ||
                    0
                  )
              )
          );
        } catch (requestError) {
          console.error(
            "Error cargando notificaciones:",
            requestError
          );

          setError(
            requestError
              ?.response
              ?.data
              ?.message ||
            "No se pudieron cargar las notificaciones."
          );

          setNotifications([]);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    loadNotifications();
  }, [
    loadNotifications
  ]);

  const stats =
    useMemo(() => {
      const unread =
        notifications.filter(
          (item) =>
            !item.read
        ).length;

      const read =
        notifications.length -
        unread;

      const today =
        notifications.filter(
          (item) =>
            isToday(
              item.createdAt
            )
        ).length;

      return {
        total:
          notifications.length,
        unread,
        read,
        today
      };
    }, [
      notifications
    ]);

  const filteredNotifications =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return notifications.filter(
        (item) => {
          const matchesFilter =
            filter === "ALL" ||
            (
              filter ===
                "UNREAD" &&
              !item.read
            ) ||
            (
              filter ===
                "READ" &&
              item.read
            );

          const matchesSearch =
            !normalizedSearch ||
            [
              item.title,
              item.message,
              item.type
            ]
              .join(" ")
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          return (
            matchesFilter &&
            matchesSearch
          );
        }
      );
    }, [
      notifications,
      filter,
      search
    ]);

  const openNotification =
    async (
      notification
    ) => {
      const notificationId =
        notification._id ||
        notification.id;

      if (!notificationId) {
        return;
      }

      setError("");
      setNotice("");

      try {
        if (!notification.read) {
          await api.patch(
            `/notifications/${notificationId}/read`
          );

          setNotifications(
            (currentItems) =>
              currentItems.map(
                (item) =>
                  String(
                    item.id
                  ) ===
                  String(
                    notificationId
                  )
                    ? {
                        ...item,
                        read:
                          true,
                        isRead:
                          true
                      }
                    : item
              )
          );
        }

        const target =
          getNotificationTarget(
            notification
          );

        if (target) {
          navigate(target);
        } else {
          setNotice(
            "Notificación marcada como leída."
          );
        }
      } catch (requestError) {
        console.error(
          "Error abriendo notificación:",
          requestError
        );

        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          "No fue posible actualizar la notificación."
        );
      }
    };

  const markAllAsRead =
    async () => {
      if (stats.unread === 0) {
        setNotice(
          "No tienes notificaciones pendientes."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Se marcarán ${stats.unread} notificaciones como leídas. ¿Deseas continuar?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setMarkingAll(true);
        setError("");
        setNotice("");

        const response =
          await api.patch(
            "/notifications/read-all"
          );

        setNotifications(
          (currentItems) =>
            currentItems.map(
              (item) => ({
                ...item,
                read:
                  true,
                isRead:
                  true
              })
            )
        );

        setNotice(
          response?.data
            ?.message ||
          "Todas las notificaciones fueron marcadas como leídas."
        );
      } catch (requestError) {
        console.error(
          "Error marcando todas:",
          requestError
        );

        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
          "No fue posible marcar todas como leídas."
        );
      } finally {
        setMarkingAll(false);
      }
    };

  return (
    <div className="notifications-root">
      <style>{`
        * {
          box-sizing: border-box;
        }

        html,
        body,
        #root {
          margin: 0;
          min-height: 100%;
          background: #020617;
          color: #f8fafc;
          font-family:
            Inter,
            "Plus Jakarta Sans",
            system-ui,
            sans-serif;
        }

        button,
        input,
        select {
          font: inherit;
        }

        .notifications-root {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top right,
              rgba(124, 58, 237, 0.12),
              transparent 30%
            ),
            #020617;
        }

        .notifications-layout {
          display: grid;
          grid-template-columns:
            240px minmax(0, 1fr);
          min-height: 100vh;
        }

        .notifications-sidebar {
          min-width: 0;
        }

        .notifications-main {
          min-width: 0;
          padding: 0 28px 50px;
        }

        .notifications-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          margin: 26px 0;
        }

        .notifications-eyebrow {
          margin: 0 0 8px;
          color: #22d3ee;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.18em;
        }

        .notifications-title {
          margin: 0;
          font-size: clamp(
            32px,
            4vw,
            52px
          );
          line-height: 1;
        }

        .notifications-subtitle {
          max-width: 720px;
          margin: 12px 0 0;
          color: #a5b4d4;
          line-height: 1.6;
        }

        .notifications-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .notifications-button {
          min-height: 44px;
          padding: 0 18px;
          border: 1px solid #263657;
          border-radius: 13px;
          color: #ffffff;
          background: #0b1328;
          cursor: pointer;
          font-weight: 800;
        }

        .notifications-button:hover {
          border-color: #22d3ee;
          transform: translateY(-1px);
        }

        .notifications-button-primary {
          border: 0;
          background:
            linear-gradient(
              135deg,
              #22d3ee,
              #8b5cf6,
              #ec4899
            );
        }

        .notifications-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .notifications-stats {
          display: grid;
          grid-template-columns:
            repeat(
              4,
              minmax(0, 1fr)
            );
          gap: 14px;
          margin-bottom: 18px;
        }

        .notifications-stat {
          padding: 20px;
          border: 1px solid #1d2a49;
          border-radius: 18px;
          background: #0a1124;
        }

        .notifications-stat-label {
          color: #91a2c6;
          font-size: 13px;
          font-weight: 800;
        }

        .notifications-stat-value {
          display: block;
          margin-top: 8px;
          font-size: 30px;
          font-weight: 900;
        }

        .notifications-toolbar {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr) 220px;
          gap: 12px;
          padding: 14px;
          border: 1px solid #1d2a49;
          border-radius: 18px;
          background: #080f20;
          margin-bottom: 16px;
        }

        .notifications-input,
        .notifications-select {
          width: 100%;
          min-height: 46px;
          border: 1px solid #233152;
          border-radius: 13px;
          outline: none;
          color: #ffffff;
          background: #050b19;
          padding: 0 15px;
        }

        .notifications-input:focus,
        .notifications-select:focus {
          border-color: #22d3ee;
        }

        .notifications-message {
          padding: 14px 16px;
          margin-bottom: 15px;
          border-radius: 13px;
          font-weight: 700;
        }

        .notifications-error {
          border: 1px solid #7f1d1d;
          color: #fecaca;
          background: rgba(
            127,
            29,
            29,
            0.25
          );
        }

        .notifications-success {
          border: 1px solid #065f46;
          color: #a7f3d0;
          background: rgba(
            6,
            95,
            70,
            0.25
          );
        }

        .notifications-list {
          display: grid;
          gap: 12px;
        }

        .notification-card {
          width: 100%;
          display: grid;
          grid-template-columns:
            52px minmax(0, 1fr) auto;
          align-items: center;
          gap: 15px;
          padding: 17px;
          border: 1px solid #1e2b49;
          border-radius: 17px;
          text-align: left;
          color: #ffffff;
          background: #091126;
          cursor: pointer;
        }

        .notification-card:hover {
          border-color: #22d3ee;
          transform: translateY(-1px);
        }

        .notification-card-unread {
          border-color:
            rgba(
              34,
              211,
              238,
              0.48
            );
          background:
            linear-gradient(
              135deg,
              rgba(
                34,
                211,
                238,
                0.10
              ),
              rgba(
                139,
                92,
                246,
                0.08
              )
            ),
            #091126;
        }

        .notification-icon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: #141d39;
          font-size: 24px;
        }

        .notification-card h3 {
          margin: 0 0 6px;
          font-size: 16px;
        }

        .notification-card p {
          margin: 0;
          color: #aebbd8;
          line-height: 1.45;
        }

        .notification-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
          color: #7182a8;
          font-size: 12px;
        }

        .notification-type {
          padding: 4px 8px;
          border-radius: 999px;
          color: #a5f3fc;
          background:
            rgba(
              8,
              145,
              178,
              0.18
            );
          font-weight: 800;
        }

        .notification-status {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #8fa0c3;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        .notification-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: #2dd4bf;
          box-shadow:
            0 0 12px #2dd4bf;
        }

        .notifications-empty,
        .notifications-loading {
          padding: 60px 24px;
          border: 1px solid #1d2a49;
          border-radius: 18px;
          text-align: center;
          color: #9cabca;
          background: #080f20;
        }

        .notifications-empty strong,
        .notifications-loading strong {
          display: block;
          margin-bottom: 8px;
          color: #ffffff;
          font-size: 20px;
        }

        @media (
          max-width: 1100px
        ) {
          .notifications-layout {
            grid-template-columns: 1fr;
          }

          .notifications-sidebar {
            display: none;
          }

          .notifications-main {
            padding:
              0 18px 40px;
          }
        }

        @media (
          max-width: 820px
        ) {
          .notifications-hero {
            align-items: flex-start;
            flex-direction: column;
          }

          .notifications-stats {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }

          .notifications-toolbar {
            grid-template-columns: 1fr;
          }

          .notification-card {
            grid-template-columns:
              48px minmax(0, 1fr);
          }

          .notification-status {
            grid-column: 2;
          }
        }
      `}</style>

      <div className="notifications-layout">
        <aside className="notifications-sidebar">
          <Sidebar />
        </aside>

        <main className="notifications-main">
          <Topbar />

          <section className="notifications-hero">
            <div>
              <p className="notifications-eyebrow">
                CENTRO DE NOTIFICACIONES QSM
              </p>

              <h1 className="notifications-title">
                Tus notificaciones
              </h1>

              <p className="notifications-subtitle">
                Consulta las novedades de tus compras, ventas, mensajes,
                reclamos, pagos y seguridad desde un solo lugar.
              </p>
            </div>

            <div className="notifications-actions">
              <button
                type="button"
                className="notifications-button"
                disabled={refreshing}
                onClick={() =>
                  loadNotifications(
                    true
                  )
                }
              >
                {refreshing
                  ? "Actualizando..."
                  : "Actualizar"}
              </button>

              <button
                type="button"
                className="notifications-button notifications-button-primary"
                disabled={
                  markingAll ||
                  stats.unread === 0
                }
                onClick={
                  markAllAsRead
                }
              >
                {markingAll
                  ? "Marcando..."
                  : "Marcar todas como leídas"}
              </button>
            </div>
          </section>

          <section className="notifications-stats">
            <Stat
              label="Notificaciones"
              value={stats.total}
            />

            <Stat
              label="Sin leer"
              value={stats.unread}
            />

            <Stat
              label="Leídas"
              value={stats.read}
            />

            <Stat
              label="Recibidas hoy"
              value={stats.today}
            />
          </section>

          <section className="notifications-toolbar">
            <input
              className="notifications-input"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar por título, mensaje o categoría..."
            />

            <select
              className="notifications-select"
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value
                )
              }
            >
              <option value="ALL">
                Todas
              </option>

              <option value="UNREAD">
                Sin leer
              </option>

              <option value="READ">
                Leídas
              </option>
            </select>
          </section>

          {notice && (
            <div className="notifications-message notifications-success">
              {notice}
            </div>
          )}

          {error && (
            <div className="notifications-message notifications-error">
              {error}
            </div>
          )}

          {loading ? (
            <div className="notifications-loading">
              <strong>
                Cargando notificaciones...
              </strong>

              QSM está consultando tus novedades.
            </div>
          ) : filteredNotifications.length ===
            0 ? (
            <div className="notifications-empty">
              <strong>
                No hay notificaciones
              </strong>

              No encontramos resultados para los filtros seleccionados.
            </div>
          ) : (
            <section className="notifications-list">
              {filteredNotifications.map(
                (notification) => (
                  <button
                    type="button"
                    key={
                      notification.id
                    }
                    className={
                      notification.read
                        ? "notification-card"
                        : "notification-card notification-card-unread"
                    }
                    onClick={() =>
                      openNotification(
                        notification
                      )
                    }
                  >
                    <div className="notification-icon">
                      {getNotificationIcon(
                        notification.type
                      )}
                    </div>

                    <div>
                      <h3>
                        {notification.title}
                      </h3>

                      <p>
                        {notification.message}
                      </p>

                      <div className="notification-meta">
                        <span className="notification-type">
                          {formatNotificationType(
                            notification.type
                          )}
                        </span>

                        <span>
                          {formatDate(
                            notification.createdAt
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="notification-status">
                      {!notification.read && (
                        <span className="notification-dot" />
                      )}

                      {notification.read
                        ? "Leída"
                        : "Sin leer"}
                    </div>
                  </button>
                )
              )}
            </section>
          )}
        </main>
      </div>

      <AiAssistant />
    </div>
  );
}

function Stat({
  label,
  value
}) {
  return (
    <article className="notifications-stat">
      <span className="notifications-stat-label">
        {label}
      </span>

      <strong className="notifications-stat-value">
        {value}
      </strong>
    </article>
  );
}

function normalizeNotification(
  notification
) {
  const rawMessage =
    String(
      notification?.message ||
      ""
    );

  const typeMatch =
    rawMessage.match(
      /^\[([A-Z0-9_]+)\]\s*/
    );

  const type =
    String(
      notification?.type ||
      typeMatch?.[1] ||
      "GENERAL"
    ).toUpperCase();

  return {
    ...notification,

    id:
      String(
        notification?._id ||
        notification?.id ||
        ""
      ),

    _id:
      String(
        notification?._id ||
        notification?.id ||
        ""
      ),

    type,

    message:
      typeMatch
        ? rawMessage.replace(
            typeMatch[0],
            ""
          )
        : rawMessage,

    read:
      Boolean(
        notification?.read ||
        notification?.isRead ||
        notification?.readAt
      )
  };
}

function getNotificationTarget(
  notification
) {
  const type =
    String(
      notification?.type ||
      ""
    ).toUpperCase();

  if (
    type.includes(
      "DISPUTE"
    )
  ) {
    return "/disputes";
  }

  if (
    type.includes(
      "MESSAGE"
    )
  ) {
    return "/messages";
  }

  if (
    type.includes(
      "KYC"
    ) ||
    type.includes(
      "FACE"
    )
  ) {
    return "/complete-profile";
  }

  if (
    type.includes(
      "SECURITY"
    ) ||
    type.includes(
      "DEVICE"
    )
  ) {
    return "/settings";
  }

  if (
    type ===
      "PRODUCT_SOLD"
  ) {
    return "/sales";
  }

  if (
    type.includes(
      "ORDER"
    ) ||
    type.includes(
      "PAYMENT"
    ) ||
    type.includes(
      "DELIVERY"
    ) ||
    type.includes(
      "WAREHOUSE"
    )
  ) {
    return "/orders";
  }

  return null;
}

function getNotificationIcon(
  type
) {
  const value =
    String(
      type || ""
    ).toUpperCase();

  if (
    value.includes(
      "DISPUTE"
    )
  ) {
    return "⚖️";
  }

  if (
    value.includes(
      "MESSAGE"
    )
  ) {
    return "💬";
  }

  if (
    value.includes(
      "PAYMENT"
    )
  ) {
    return "💳";
  }

  if (
    value.includes(
      "ORDER"
    )
  ) {
    return "🛒";
  }

  if (
    value.includes(
      "SECURITY"
    ) ||
    value.includes(
      "DEVICE"
    )
  ) {
    return "🛡️";
  }

  if (
    value.includes(
      "KYC"
    ) ||
    value.includes(
      "FACE"
    )
  ) {
    return "🪪";
  }

  if (
    value.includes(
      "PRODUCT"
    )
  ) {
    return "📦";
  }

  return "🔔";
}

function formatNotificationType(
  type
) {
  const labels = {
    GENERAL:
      "General",

    DISPUTE_OPENED:
      "Disputa",

    DISPUTE_MESSAGE:
      "Mensaje de disputa",

    DISPUTE_STATUS_UPDATED:
      "Estado de disputa",

    DISPUTE_RESOLVED:
      "Resolución",

    NEW_MESSAGE:
      "Mensaje",

    PRODUCT_SOLD:
      "Venta",

    ORDER_CREATED:
      "Compra",

    ORDER_CANCELLED:
      "Orden cancelada",

    ORDER_COMPLETED:
      "Orden completada",

    PAYMENT_RELEASED:
      "Pago",

    SECURITY_ALERT:
      "Seguridad",

    NEW_DEVICE:
      "Seguridad",

    KYC_APPROVED:
      "Verificación",

    KYC_REJECTED:
      "Verificación",

    FACE_CHECK_REQUIRED:
      "Verificación"
  };

  return (
    labels[type] ||
    String(
      type || "General"
    )
      .replace(
        /_/g,
        " "
      )
      .toLowerCase()
  );
}

function formatDate(
  value
) {
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
      dateStyle:
        "medium",

      timeStyle:
        "short"
    }
  ).format(date);
}

function isToday(
  value
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return false;
  }

  const today =
    new Date();

  return (
    date.getFullYear() ===
      today.getFullYear() &&
    date.getMonth() ===
      today.getMonth() &&
    date.getDate() ===
      today.getDate()
  );
}

export default Notifications;
