import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

function AiAssistant({ pageContext }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [activeGuide, setActiveGuide] = useState(null);

  const currentPath = pageContext || location.pathname;

  const contextInfo = getContextInfo(currentPath);

  const guides = {
    dashboard: {
      title: "Ayuda en el Dashboard",
      message: "Aquí puedes ver tu progreso, Trust Score, estado de verificación y próximos pasos.",
      steps: [
        "Revisa tu nivel actual QSM.",
        "Completa tu verificación para desbloquear funciones.",
        "Usa acciones rápidas para ir al marketplace, perfil o disputas.",
        "Aumenta tu Trust Score con actividad segura."
      ],
      actionText: "Completar verificación",
      actionLink: "/complete-profile"
    },
    profile: {
      title: "Ayuda en Mi Perfil",
      message: "Aquí puedes administrar tu foto 2x2, portada, datos personales y seguridad.",
      steps: [
        "Sube una foto 2x2 real.",
        "Agrega una portada opcional.",
        "Actualiza tus datos personales.",
        "Solicita cambio de contraseña si lo necesitas."
      ],
      actionText: "Ir a perfil",
      actionLink: "/profile"
    },
    marketplace: {
      title: "Ayuda en Marketplace",
      message: "Aquí puedes explorar productos, revisar riesgos y comprar con protección QSM.",
      steps: [
        "Revisa el Trust Score del vendedor.",
        "Verifica si el producto tiene alertas.",
        "Abre el detalle del producto.",
        "Compra con Protección QSM."
      ],
      actionText: "Ver marketplace",
      actionLink: "/marketplace"
    },
    disputes: {
      title: "Ayuda en Disputas",
      message: "Aquí puedes abrir disputas cuando un producto llega dañado, diferente o no recibido.",
      steps: [
        "Selecciona la orden afectada.",
        "Describe el problema.",
        "Adjunta evidencia.",
        "QSM revisará el caso."
      ],
      actionText: "Abrir disputas",
      actionLink: "/disputes"
    },
    checkout: {
      title: "Ayuda en Checkout",
      message: "Aquí se confirma la compra protegida mediante escrow.",
      steps: [
        "Confirma el producto.",
        "QSM retiene el pago.",
        "El vendedor entrega.",
        "Confirmas recepción."
      ],
      actionText: "Ver órdenes",
      actionLink: "/orders"
    },
    register: {
      title: "Ayuda en Registro",
      message: "Crea tu cuenta con correo o Google y luego completa tu identidad QSM.",
      steps: [
        "Completa tus datos.",
        "Acepta los términos.",
        "Crea tu cuenta.",
        "Completa la verificación."
      ],
      actionText: "Registrarme",
      actionLink: "/register"
    }
  };

  const defaultGuide = guides.dashboard;

  const selectGuide = (key) => {
    setActiveGuide(guides[key] || defaultGuide);
  };

  return (
    <>
      <button onClick={() => setOpen(!open)} style={floatingButton}>
        <span style={pulseDot}></span>
        QSM AI
      </button>

      {open && (
        <div style={assistantBox}>
          <div style={topBar}>
            <div style={avatar}>🤖</div>

            <div>
              <h3 style={{ margin: 0 }}>QSM AI</h3>
              <p style={subtitle}>{contextInfo}</p>
            </div>

            <button onClick={() => setOpen(false)} style={closeButton}>
              ×
            </button>
          </div>

          <div style={body}>
            {!activeGuide ? (
              <>
                <div style={aiBubble}>
                  Estoy aquí para ayudarte en esta área de QSM. Elige una opción:
                </div>

                <div style={quickGrid}>
                  <button style={quickButton} onClick={() => selectGuide("dashboard")}>
                    🏠 Ayuda del Dashboard
                  </button>

                  <button style={quickButton} onClick={() => selectGuide("profile")}>
                    👤 Ayuda del Perfil
                  </button>

                  <button style={quickButton} onClick={() => selectGuide("marketplace")}>
                    🛒 Ayuda Marketplace
                  </button>

                  <button style={quickButton} onClick={() => selectGuide("disputes")}>
                    ⚖ Ayuda Disputas
                  </button>

                  <button style={quickButton} onClick={() => selectGuide("checkout")}>
                    💰 Ayuda Checkout
                  </button>
                </div>
              </>
            ) : (
              <div>
                <button onClick={() => setActiveGuide(null)} style={backButton}>
                  ← Volver
                </button>

                <h2 style={guideTitle}>{activeGuide.title}</h2>

                <p style={guideMessage}>{activeGuide.message}</p>

                <div style={stepsBox}>
                  {activeGuide.steps.map((step, index) => (
                    <div key={index} style={stepItem}>
                      <div style={stepNumber}>{index + 1}</div>
                      <p>{step}</p>
                    </div>
                  ))}
                </div>

                <Link to={activeGuide.actionLink} style={actionButton}>
                  {activeGuide.actionText}
                </Link>
              </div>
            )}
          </div>

          <div style={footer}>
            <span>Modo demo QSM</span>
            <span>IA simulada</span>
          </div>
        </div>
      )}
    </>
  );
}

function getContextInfo(path) {
  if (path.includes("dashboard")) return "Ayuda para tu progreso QSM";
  if (path.includes("profile")) return "Ayuda para tu perfil";
  if (path.includes("marketplace")) return "Ayuda para comprar seguro";
  if (path.includes("disputes")) return "Ayuda con disputas";
  if (path.includes("checkout")) return "Ayuda con escrow";
  if (path.includes("register")) return "Ayuda de registro";
  return "Asistente de Quick Secure Market";
}

const floatingButton = {
  position: "fixed",
  right: "24px",
  bottom: "24px",
  zIndex: 100,
  display: "flex",
  alignItems: "center",
  gap: "9px",
  background: "linear-gradient(135deg, #35d0c3, #7c3aed)",
  color: "white",
  border: "none",
  borderRadius: "999px",
  padding: "13px 20px",
  fontWeight: "900",
  cursor: "pointer",
  boxShadow: "0 0 28px rgba(53,208,195,0.45)"
};

const pulseDot = {
  width: "9px",
  height: "9px",
  borderRadius: "50%",
  background: "#86efac",
  boxShadow: "0 0 16px #86efac"
};

const assistantBox = {
  position: "fixed",
  right: "24px",
  bottom: "82px",
  width: "350px",
  maxHeight: "520px",
  background: "rgba(8,17,35,0.94)",
  border: "1px solid rgba(53,208,195,0.42)",
  borderRadius: "22px",
  zIndex: 101,
  overflow: "hidden",
  backdropFilter: "blur(22px)",
  boxShadow: "0 25px 80px rgba(0,0,0,0.65)"
};

const topBar = {
  padding: "15px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background: "rgba(15,23,42,0.94)",
  borderBottom: "1px solid rgba(53,208,195,0.22)",
  color: "white"
};

const avatar = {
  width: "40px",
  height: "40px",
  borderRadius: "14px",
  background: "linear-gradient(135deg, #0f766e, #312e81)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const subtitle = {
  margin: "3px 0 0",
  color: "#94a3b8",
  fontSize: "12px"
};

const closeButton = {
  marginLeft: "auto",
  background: "transparent",
  color: "white",
  border: "none",
  fontSize: "24px",
  cursor: "pointer"
};

const body = {
  padding: "15px",
  color: "white",
  maxHeight: "385px",
  overflowY: "auto"
};

const aiBubble = {
  background: "rgba(15,23,42,0.92)",
  border: "1px solid rgba(53,208,195,0.22)",
  borderRadius: "16px",
  padding: "13px",
  lineHeight: "23px",
  color: "#e5e7eb",
  marginBottom: "14px"
};

const quickGrid = {
  display: "grid",
  gap: "9px"
};

const quickButton = {
  background: "rgba(2,6,23,0.82)",
  color: "#e5e7eb",
  border: "1px solid rgba(53,208,195,0.32)",
  borderRadius: "13px",
  padding: "11px",
  cursor: "pointer",
  textAlign: "left",
  fontWeight: "800"
};

const backButton = {
  background: "transparent",
  color: "#35d0c3",
  border: "none",
  cursor: "pointer",
  fontWeight: "900",
  marginBottom: "8px"
};

const guideTitle = {
  margin: "0 0 8px",
  fontSize: "21px"
};

const guideMessage = {
  color: "#cbd5e1",
  lineHeight: "23px"
};

const stepsBox = {
  marginTop: "14px",
  display: "grid",
  gap: "9px"
};

const stepItem = {
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
  background: "rgba(15,23,42,0.82)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "13px",
  padding: "9px"
};

const stepNumber = {
  width: "26px",
  height: "26px",
  borderRadius: "50%",
  background: "#35d0c3",
  color: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900",
  flexShrink: 0
};

const actionButton = {
  display: "block",
  marginTop: "16px",
  textAlign: "center",
  background: "#35d0c3",
  color: "#020617",
  textDecoration: "none",
  padding: "13px",
  borderRadius: "13px",
  fontWeight: "900"
};

const footer = {
  padding: "10px 15px",
  display: "flex",
  justifyContent: "space-between",
  color: "#64748b",
  fontSize: "11px",
  borderTop: "1px solid rgba(53,208,195,0.16)"
};

export default AiAssistant;