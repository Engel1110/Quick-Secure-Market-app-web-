import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Link,
  useLocation
} from "react-router-dom";

import api from "../api/axios";
import "./AiAssistant.css";

const DEFAULT_CORE = {
  status: "CONNECTING",
  version: "1.0.0",
  mode: "RULE_BASED",
  provider: "INTERNAL"
};

function AiAssistant({ pageContext }) {
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [activeGuide, setActiveGuide] = useState(null);
  const [core, setCore] = useState(DEFAULT_CORE);

  const currentPath =
    pageContext || location.pathname;

  const guides = useMemo(
    () => getGuides(),
    []
  );

  useEffect(() => {
    let active = true;

    const checkCore = async () => {
      try {
        const response =
          await api.get("/ai/status");

        if (!active) {
          return;
        }

        setCore({
          status:
            response.data?.status ||
            "ACTIVE",
          version:
            response.data?.engine?.version ||
            "1.0.0",
          mode:
            response.data?.engine?.mode ||
            "RULE_BASED",
          provider:
            response.data?.engine?.provider ||
            "INTERNAL"
        });
      } catch {
        if (active) {
          setCore({
            ...DEFAULT_CORE,
            status: "OFFLINE"
          });
        }
      }
    };

    checkCore();

    const timer =
      window.setInterval(
        checkCore,
        60000
      );

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const statusClass =
    core.status === "ACTIVE"
      ? "online"
      : core.status === "OFFLINE"
        ? "offline"
        : "connecting";

  return (
    <>
      <button
        type="button"
        className={`qsm-ai-launcher ${statusClass}`}
        onClick={() =>
          setOpen((value) => !value)
        }
        aria-expanded={open}
        aria-label={
          open
            ? "Cerrar QSM AI"
            : "Abrir QSM AI"
        }
      >
        <AiOrb compact />

        <span className="qsm-ai-launcher__text">
          <strong>QSM AI</strong>
          <small>{core.status}</small>
        </span>
      </button>

      {open && (
        <section className="qsm-ai-panel">
          <div className="qsm-ai-panel__aurora" />

          <header className="qsm-ai-panel__header">
            <AiOrb />

            <div className="qsm-ai-panel__identity">
              <span>QSM INTELLIGENCE</span>
              <h3>QSM AI</h3>
              <p>{getContextInfo(currentPath)}</p>
            </div>

            <button
              type="button"
              className="qsm-ai-panel__close"
              onClick={() => setOpen(false)}
              aria-label="Cerrar asistente"
            >
              ×
            </button>
          </header>

          <div className="qsm-ai-panel__core-status">
            <span
              className={`qsm-ai-panel__status-dot ${statusClass}`}
            />

            <div>
              <strong>
                Core {core.version}
              </strong>

              <small>
                {core.mode} · {core.provider}
              </small>
            </div>

            <b className={statusClass}>
              {core.status}
            </b>
          </div>

          <div className="qsm-ai-panel__body">
            {!activeGuide ? (
              <>
                <div className="qsm-ai-welcome">
                  <span>✦</span>

                  <div>
                    <strong>
                      Hola, soy QSM AI.
                    </strong>

                    <p>
                      Estoy conectado al núcleo de inteligencia de QSM. Selecciona un área para recibir orientación.
                    </p>
                  </div>
                </div>

                <div className="qsm-ai-options">
                  {[
                    ["dashboard", "◈", "Dashboard"],
                    ["profile", "◎", "Perfil"],
                    ["marketplace", "◇", "Marketplace"],
                    ["disputes", "⚖", "Disputas"],
                    ["checkout", "▣", "Checkout"],
                    ["security", "⬡", "Seguridad"]
                  ].map(
                    ([key, icon, label]) => (
                      <button
                        type="button"
                        key={key}
                        onClick={() =>
                          setActiveGuide(
                            guides[key]
                          )
                        }
                      >
                        <span>{icon}</span>
                        {label}
                      </button>
                    )
                  )}
                </div>
              </>
            ) : (
              <div className="qsm-ai-guide">
                <button
                  type="button"
                  className="qsm-ai-guide__back"
                  onClick={() =>
                    setActiveGuide(null)
                  }
                >
                  ← Volver
                </button>

                <span className="qsm-ai-guide__label">
                  GUÍA INTELIGENTE
                </span>

                <h2>{activeGuide.title}</h2>

                <p className="qsm-ai-guide__message">
                  {activeGuide.message}
                </p>

                <div className="qsm-ai-guide__steps">
                  {activeGuide.steps.map(
                    (step, index) => (
                      <div
                        className="qsm-ai-guide__step"
                        key={step}
                      >
                        <span>{index + 1}</span>
                        <p>{step}</p>
                      </div>
                    )
                  )}
                </div>

                <Link
                  to={activeGuide.actionLink}
                  className="qsm-ai-guide__action"
                  onClick={() =>
                    setOpen(false)
                  }
                >
                  {activeGuide.actionText}
                  <span>→</span>
                </Link>
              </div>
            )}
          </div>

          <footer className="qsm-ai-panel__footer">
            <span>QSM AI Core</span>
            <span>Supervisión humana activa</span>
          </footer>
        </section>
      )}
    </>
  );
}

function AiOrb({ compact = false }) {
  return (
    <span
      className={
        compact
          ? "qsm-ai-orb qsm-ai-orb--compact"
          : "qsm-ai-orb"
      }
      aria-hidden="true"
    >
      <span className="qsm-ai-orb__halo" />
      <span className="qsm-ai-orb__core" />
      <span className="qsm-ai-orb__ring qsm-ai-orb__ring--one" />
      <span className="qsm-ai-orb__ring qsm-ai-orb__ring--two" />
      <span className="qsm-ai-orb__particle qsm-ai-orb__particle--one" />
      <span className="qsm-ai-orb__particle qsm-ai-orb__particle--two" />
      <span className="qsm-ai-orb__particle qsm-ai-orb__particle--three" />
    </span>
  );
}

function getGuides() {
  return {
    dashboard: {
      title: "Ayuda en el Dashboard",
      message:
        "Revisa tu actividad, progreso, confianza y próximos pasos dentro de QSM.",
      steps: [
        "Consulta tu Trust Score.",
        "Completa las verificaciones pendientes.",
        "Revisa compras, ventas y disputas.",
        "Usa las acciones rápidas para continuar."
      ],
      actionText: "Ir al Dashboard",
      actionLink: "/dashboard"
    },
    profile: {
      title: "Ayuda en Mi Perfil",
      message:
        "Administra tus datos, identidad y seguridad desde un solo lugar.",
      steps: [
        "Revisa tus datos personales.",
        "Actualiza tu fotografía.",
        "Completa la verificación de identidad.",
        "Configura tu correo de recuperación."
      ],
      actionText: "Ir a Mi Perfil",
      actionLink: "/profile"
    },
    marketplace: {
      title: "Compra con mayor seguridad",
      message:
        "Analiza la publicación y las señales de riesgo antes de comprar.",
      steps: [
        "Revisa el Trust Score del vendedor.",
        "Consulta la verificación del producto.",
        "Abre el historial del producto.",
        "Mantén el pago dentro de QSM."
      ],
      actionText: "Abrir Marketplace",
      actionLink: "/marketplace"
    },
    disputes: {
      title: "Ayuda con Disputas",
      message:
        "Documenta correctamente el problema para facilitar la revisión.",
      steps: [
        "Selecciona la orden afectada.",
        "Describe el problema.",
        "Adjunta evidencias.",
        "Consulta las actualizaciones del caso."
      ],
      actionText: "Ver Disputas",
      actionLink: "/disputes"
    },
    checkout: {
      title: "Compra protegida QSM",
      message:
        "Confirma la compra y mantén toda la operación dentro del flujo protegido.",
      steps: [
        "Verifica producto y vendedor.",
        "Confirma el método de entrega.",
        "Realiza el pago protegido.",
        "Confirma la recepción."
      ],
      actionText: "Ver Órdenes",
      actionLink: "/orders"
    },
    security: {
      title: "Seguridad de tu cuenta",
      message:
        "Protege el acceso y revisa recuperación, contraseñas y sesiones.",
      steps: [
        "Configura un correo de recuperación.",
        "Utiliza una contraseña fuerte.",
        "Revisa alertas y sesiones.",
        "Reporta accesos sospechosos."
      ],
      actionText: "Abrir Configuración",
      actionLink: "/settings"
    }
  };
}

function getContextInfo(path) {
  const value =
    String(path || "").toLowerCase();

  if (value.includes("dashboard")) {
    return "Resumen inteligente de tu actividad";
  }

  if (
    value.includes("profile") ||
    value.includes("verification")
  ) {
    return "Identidad, perfil y confianza";
  }

  if (
    value.includes("marketplace") ||
    value.includes("product")
  ) {
    return "Productos, riesgo y seguridad";
  }

  if (value.includes("dispute")) {
    return "Seguimiento de disputas";
  }

  if (
    value.includes("checkout") ||
    value.includes("order")
  ) {
    return "Compra y entrega protegida";
  }

  if (value.includes("message")) {
    return "Mensajería segura QSM";
  }

  return "Inteligencia de Quick Secure Market";
}

export default AiAssistant;
