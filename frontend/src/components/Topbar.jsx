import { useState } from "react";
import { Link } from "react-router-dom";

function Topbar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [activeChat, setActiveChat] = useState(null);

  const conversations = [
    {
      id: 1,
      name: "Carlos Pérez",
      product: "iPhone 13 Pro",
      lastMessage: "¿Todavía está disponible?"
    },
    {
      id: 2,
      name: "María Rodríguez",
      product: "PS5 Digital",
      lastMessage: "¿Aceptas transferencia?"
    }
  ];

  return (
    <>
      <div style={topbar}>
        <div style={searchContainer}>
          <input
            placeholder="Buscar órdenes, disputas o productos..."
            style={searchInput}
          />
        </div>

        <div style={actions}>
          {/* NOTIFICACIONES */}
          <div style={iconContainer}>
            <button
              style={iconButton}
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowMessages(false);
                setShowCart(false);
              }}
            >
              🔔
              <span style={badge}>3</span>
            </button>

            {showNotifications && (
              <div style={dropdown}>
                <h4>Notificaciones</h4>

                <div style={notificationItem}>
                  Producto aprobado por QSM
                </div>

                <div style={notificationItem}>
                  Nuevo mensaje recibido
                </div>

                <div style={notificationItem}>
                  Compra completada
                </div>
              </div>
            )}
          </div>

          {/* MENSAJES */}
          <div style={iconContainer}>
            <button
              style={iconButton}
              onClick={() => {
                setShowMessages(!showMessages);
                setShowNotifications(false);
                setShowCart(false);
              }}
            >
              💬
              <span style={badge}>2</span>
            </button>

            {showMessages && (
              <div style={dropdown}>
                <h4>Mensajes</h4>

                {conversations.map((chat) => (
                  <div
                    key={chat.id}
                    style={conversationItem}
                    onClick={() => setActiveChat(chat)}
                  >
                    <strong>{chat.name}</strong>

                    <p>{chat.product}</p>

                    <small>{chat.lastMessage}</small>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CARRITO */}
          <div style={iconContainer}>
            <button
              style={iconButton}
              onClick={() => {
                setShowCart(!showCart);
                setShowMessages(false);
                setShowNotifications(false);
              }}
            >
              🛒
              <span style={badge}>1</span>
            </button>

            {showCart && (
              <div style={dropdown}>
                <h4>Carrito</h4>

                <div style={notificationItem}>
                  iPhone 13 Pro
                </div>

                <Link style={cartButton} to="/checkout">
                  Ir al checkout
                </Link>
              </div>
            )}
          </div>

          {/* PERFIL */}
          <div style={profileContainer}>
            <button
              style={profileButton}
              onClick={() => setShowProfile(!showProfile)}
            >
              <div style={avatar}>E</div>

              <div>
                <strong>Engel Feliz</strong>
                <br />
                <span style={{ color: "#35d0c3" }}>
                  Verificado
                </span>
              </div>
            </button>

            {showProfile && (
              <div style={profileMenu}>
                <Link style={menuItem} to="/profile">
                  👤 Mi perfil
                </Link>

                <Link style={menuItem} to="/orders">
                  📦 Mis órdenes
                </Link>

                <Link style={menuItem} to="/disputes">
                  ⚖ Mis disputas
                </Link>

                <Link style={menuItem} to="/settings">
                  ⚙ Configuración
                </Link>

                <button style={logoutButton}>
                  🚪 Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CHAT FLOTANTE TIPO MESSENGER */}

      {activeChat && (
        <div style={chatWindow}>
          <div style={chatHeader}>
            <strong>{activeChat.name}</strong>

            <button
              style={closeButton}
              onClick={() => setActiveChat(null)}
            >
              ✖
            </button>
          </div>

          <div style={chatMessages}>
            <div style={messageOther}>
              Hola 👋
            </div>

            <div style={messageMine}>
              Hola, ¿el producto sigue disponible?
            </div>

            <div style={messageOther}>
              Sí, todavía está disponible.
            </div>
          </div>

          <div style={chatInputArea}>
            <input
              placeholder="Escribe un mensaje..."
              style={chatInput}
            />

            <button style={sendButton}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ==========================
   ESTILOS
========================== */

const topbar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "25px"
};

const searchContainer = {
  flex: 1
};

const searchInput = {
  width: "100%",
  maxWidth: "800px",
  padding: "16px",
  borderRadius: "16px",
  background: "#081325",
  border: "1px solid rgba(53,208,195,.2)",
  color: "white"
};

const actions = {
  display: "flex",
  gap: "15px",
  alignItems: "center"
};

const iconContainer = {
  position: "relative"
};

const iconButton = {
  width: "60px",
  height: "60px",
  borderRadius: "16px",
  border: "1px solid rgba(53,208,195,.15)",
  background: "#081325",
  color: "white",
  cursor: "pointer",
  position: "relative",
  fontSize: "22px"
};

const badge = {
  position: "absolute",
  top: "5px",
  right: "5px",
  background: "#ef4444",
  color: "white",
  borderRadius: "999px",
  width: "20px",
  height: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px"
};

const dropdown = {
  position: "absolute",
  top: "70px",
  right: 0,
  width: "320px",
  background: "#081325",
  border: "1px solid rgba(53,208,195,.2)",
  borderRadius: "18px",
  padding: "20px",
  zIndex: 100
};

const notificationItem = {
  padding: "12px",
  borderBottom: "1px solid rgba(255,255,255,.08)"
};

const conversationItem = {
  padding: "14px",
  cursor: "pointer",
  borderBottom: "1px solid rgba(255,255,255,.08)"
};

const profileContainer = {
  position: "relative"
};

const profileButton = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  background: "#081325",
  border: "1px solid rgba(53,208,195,.15)",
  borderRadius: "18px",
  padding: "12px 18px",
  color: "white",
  cursor: "pointer"
};

const avatar = {
  width: "45px",
  height: "45px",
  borderRadius: "50%",
  background: "linear-gradient(135deg,#35d0c3,#8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold"
};

const profileMenu = {
  position: "absolute",
  right: 0,
  top: "75px",
  width: "260px",
  background: "#081325",
  border: "1px solid rgba(53,208,195,.2)",
  borderRadius: "18px",
  padding: "15px",
  display: "flex",
  flexDirection: "column",
  gap: "10px"
};

const menuItem = {
  color: "white",
  textDecoration: "none"
};

const logoutButton = {
  background: "transparent",
  color: "#ef4444",
  border: "none",
  textAlign: "left",
  cursor: "pointer"
};

const chatWindow = {
  position: "fixed",
  bottom: "20px",
  right: "20px",
  width: "350px",
  height: "500px",
  background: "#081325",
  borderRadius: "20px",
  border: "1px solid rgba(53,208,195,.2)",
  display: "flex",
  flexDirection: "column",
  zIndex: 9999
};

const chatHeader = {
  padding: "15px",
  borderBottom: "1px solid rgba(255,255,255,.1)",
  display: "flex",
  justifyContent: "space-between"
};

const closeButton = {
  background: "transparent",
  border: "none",
  color: "white",
  cursor: "pointer"
};

const chatMessages = {
  flex: 1,
  padding: "15px",
  overflowY: "auto"
};

const messageMine = {
  background: "#35d0c3",
  color: "#000",
  padding: "10px",
  borderRadius: "15px",
  marginBottom: "10px",
  marginLeft: "40px"
};

const messageOther = {
  background: "#1e293b",
  padding: "10px",
  borderRadius: "15px",
  marginBottom: "10px",
  marginRight: "40px"
};

const chatInputArea = {
  display: "flex",
  padding: "12px"
};

const chatInput = {
  flex: 1,
  padding: "12px",
  borderRadius: "12px",
  border: "none"
};

const sendButton = {
  marginLeft: "10px",
  width: "50px",
  borderRadius: "12px",
  border: "none",
  background: "#35d0c3",
  cursor: "pointer"
};

const cartButton = {
  display: "block",
  marginTop: "15px",
  textAlign: "center",
  background: "#35d0c3",
  color: "#000",
  padding: "10px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: "bold"
};

export default Topbar;