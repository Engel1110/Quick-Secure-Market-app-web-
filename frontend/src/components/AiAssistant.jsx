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
  provider: "INTERNAL",
  capabilities: [],
  modules: [],
  decisions: []};

function AiAssistant({ pageContext }) {
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [activeGuide, setActiveGuide] = useState(null);
  const [core, setCore] = useState(DEFAULT_CORE);

  const currentPath =
    pageContext || location.pathname;

  const assistantName = "LUNA";

  const guides = useMemo(
    () => getGuides(),
    []
  );

  useEffect(() => {
    let mounted = true;

    const loadStatus = async () => {
      try {
        const response =
          await api.get("/ai/status");

        if (!mounted) {
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
            "INTERNAL",
          capabilities:
            Array.isArray(
              response.data?.capabilities
            )
              ? response.data.capabilities
              : [],
          modules:
            Array.isArray(
              response.data?.modules
            )
              ? response.data.modules
              : [],
          decisions:
            Array.isArray(
              response.data?.decisions
            )
              ? response.data.decisions
              : []
        });
      } catch {
        if (!mounted) {
          return;
        }

        setCore({
          ...DEFAULT_CORE,
          status: "OFFLINE"
        });
      }
    };

    loadStatus();

    const timer =
      window.setInterval(
        loadStatus,
        60000
      );

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const statusClass =
    core.status === "ACTIVE"
      ? "online"
      : core.status === "OFFLINE"
        ? "offline"
        : "connecting";

  const activeCapabilities =
    core.capabilities.filter(
      (item) =>
        item?.status === "ACTIVE" ||
        item?.status === "ADAPTER_READY"
    ).length;

  const openGuide = (key) => {
    setActiveGuide(
      guides[key] ||
      guides.dashboard
    );
  };

  return (
    <>
      <button
        type="button"
        className={`qsm-ai-launcher qsm-ai-launcher--luna ${statusClass}`}
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
          <small>{assistantName} · {core.status}</small>
        </span>
      </button>

      {open && (
        <section
          className="qsm-ai-panel qsm-ai-panel--officer"
          aria-label="Asistente oficial de QSM Marketplace"
        >
          <div className="qsm-ai-panel__aurora" />

          <aside
            className="qsm-ai-luna-showcase"
            aria-label="LUNA, asistente oficial de QSM"
          >
            <div className="qsm-ai-luna-showcase__glow" />

            <img
              src="/qsm-ai/luna-officer.png"
              alt="LUNA, asistente oficial de QSM Marketplace"
            />

            <div className="qsm-ai-luna-showcase__card">
              <span>QSM AI OFFICER</span>
              <strong>LUNA</strong>
              <p>Protegiendo tu experiencia en QSM Marketplace.</p>
            </div>
          </aside>

          <header className="qsm-ai-officer-header">
            <div className="qsm-ai-officer-header__avatar">
              <img
                className="qsm-ai-officer-header__image"
                src="/qsm-ai/luna-officer.png"
                alt="LUNA"
              />
            </div>

            <div className="qsm-ai-officer-header__identity">
              <span className="qsm-ai-officer-header__eyebrow">
                ASISTENTE OFICIAL
              </span>

              <h3>QSM AI · {assistantName}</h3>

              <p>
                Tu oficial inteligente de Marketplace
              </p>
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

          <div className="qsm-ai-core-strip">
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
                <section className="qsm-ai-officer-intro">
                  <div className="qsm-ai-officer-intro__copy">
                    <span className="qsm-ai-guide__label">
                      PROTECCIÓN QSM
                    </span>

                    <h2>
                      Hola, soy {assistantName}.
                    </h2>

                    <p>
                      Estoy aquí para ayudarte a comprar, vender y navegar con mayor seguridad dentro de QSM.
                    </p>
                  </div>

                  <div className="qsm-ai-officer-intro__seal">
                    <span>Q</span>
                  </div>
                </section>

                <section className="qsm-ai-officer-card">
                  <div>
                    <span className="qsm-ai-guide__label">
                      ESTADO DEL OFICIAL
                    </span>

                    <strong>
                      Protección inteligente activa
                    </strong>

                    <p>
                      Supervisión humana disponible cuando el Core recomienda revisión.
                    </p>
                  </div>

                  <span className="qsm-ai-officer-card__shield">
                    ⬡
                  </span>
                </section>

                <div className="qsm-ai-officer-actions">
                  {[
                    [
                      "publication",
                      "▤",
                      "Analizar publicación",
                      "Revisar anuncio antes de publicar"
                    ],
                    [
                      "fraud",
                      "⚠",
                      "Detectar fraude",
                      "Consultar señales de riesgo"
                    ],
                    [
                      "marketplace",
                      "⌕",
                      "Buscar productos",
                      "Explorar Marketplace"
                    ],
                    [
                      "seller",
                      "◎",
                      "Analizar vendedor",
                      "Revisar reputación y confianza"
                    ],
                    [
                      "messages",
                      "✉",
                      "Revisar mensajes",
                      "Mantener conversaciones seguras"
                    ],
                    [
                      "history",
                      "▥",
                      "Historial y reportes",
                      "Consultar trazabilidad"
                    ]
                  ].map(
                    ([key, icon, title, subtitle]) => (
                      <button
                        type="button"
                        key={key}
                        onClick={() => openGuide(key)}
                      >
                        <span>{icon}</span>

                        <div>
                          <strong>{title}</strong>
                          <small>{subtitle}</small>
                        </div>
                      </button>
                    )
                  )}
                </div>

                <section className="qsm-ai-officer-insights">
                  <div>
                    <span className="qsm-ai-guide__label">
                      ESTADO REAL
                    </span>

                    <strong>
                      {core.status === "ACTIVE"
                        ? "QSM AI conectado"
                        : "Conexión pendiente"}
                    </strong>
                  </div>

                  <div>
                    <span className="qsm-ai-guide__label">
                      CAPACIDADES
                    </span>

                    <strong>
                      {activeCapabilities}
                    </strong>
                  </div>

                  <div>
                    <span className="qsm-ai-guide__label">
                      CONTEXTO
                    </span>

                    <strong>
                      {getContextInfo(currentPath)}
                    </strong>
                  </div>
                </section>

                <section className="qsm-ai-phase23">
                  <div className="qsm-ai-phase23__header">
                    <div>
                      <span className="qsm-ai-guide__label">
                        CORE EN TIEMPO REAL
                      </span>

                      <h3>
                        Módulos disponibles
                      </h3>
                    </div>

                    <span className={statusClass}>
                      {core.status}
                    </span>
                  </div>

                  <div className="qsm-ai-phase23__modules">
                    {core.modules.length > 0 ? (
                      core.modules.map((module) => (
                        <span key={module}>
                          {module}
                        </span>
                      ))
                    ) : (
                      <span>
                        Cargando módulos...
                      </span>
                    )}
                  </div>

                  <div className="qsm-ai-phase23__capabilities">
                    {core.capabilities.map((capability) => (
                      <div
                        key={capability.code}
                        className={
                          capability.status === "ACTIVE"
                            ? "active"
                            : capability.status === "ADAPTER_READY"
                              ? "ready"
                              : "inactive"
                        }
                      >
                        <span />

                        <div>
                          <strong>
                            {capability.code}
                          </strong>

                          <small>
                            {capability.description}
                          </small>
                        </div>

                        <b>
                          {capability.status}
                        </b>
                      </div>
                    ))}
                  </div>

                  <div className="qsm-ai-phase23__footer">
                    <span>
                      Decisiones del Core
                    </span>

                    <strong>
                      {core.decisions.length}
                    </strong>
                  </div>
                </section>
              </>
            ) : (
              <GuideView
                guide={activeGuide}
                onBack={() =>
                  setActiveGuide(null)
                }
                onNavigate={() =>
                  setOpen(false)
                }
              />
            )}
          </div>

          <footer className="qsm-ai-panel__footer">
            <span>
              QSM AI Officer · {assistantName}
            </span>

            <span>
              Seguridad primero
            </span>
          </footer>
        </section>
      )}
    </>
  );
}

function GuideView({
  guide,
  onBack,
  onNavigate
}) {
  return (
    <div className="qsm-ai-guide">
      <button
        type="button"
        className="qsm-ai-guide__back"
        onClick={onBack}
      >
        ← Volver
      </button>

      <span className="qsm-ai-guide__label">
        GUÍA DE {guide.badge}
      </span>

      <h2>{guide.title}</h2>

      <p className="qsm-ai-guide__message">
        {guide.message}
      </p>

      <div className="qsm-ai-guide__steps">
        {guide.steps.map(
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
        to={guide.actionLink}
        className="qsm-ai-guide__action"
        onClick={onNavigate}
      >
        {guide.actionText}
        <span>→</span>
      </Link>
    </div>
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

function LunaPortrait() {
  return (
    <svg
      className="qsm-luna-portrait"
      viewBox="0 0 160 180"
      role="img"
      aria-label="LUNA, asistente oficial de QSM"
    >
      <defs>
        <linearGradient
          id="lunaSuit"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0" stopColor="#0f172a" />
          <stop offset=".5" stopColor="#1e3a8a" />
          <stop offset="1" stopColor="#312e81" />
        </linearGradient>

        <linearGradient
          id="lunaSkin"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>

        <filter id="lunaGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse
        cx="80"
        cy="166"
        rx="58"
        ry="10"
        fill="rgba(34,211,238,.18)"
      />

      <path
        d="M25 169c2-34 19-51 55-51s53 17 55 51z"
        fill="url(#lunaSuit)"
        stroke="#38bdf8"
        strokeWidth="2"
      />

      <path
        d="M49 123l12 20h38l12-20"
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="3"
        filter="url(#lunaGlow)"
      />

      <path
        d="M58 122c-8-10-12-24-10-42 3-30 17-47 32-47s29 17 32 47c2 18-2 32-10 42-8 8-14 13-22 13s-14-5-22-13z"
        fill="url(#lunaSkin)"
        stroke="#67e8f9"
        strokeWidth="2"
      />

      <path
        d="M45 84c0-35 15-62 35-62 21 0 36 27 35 62-8-18-18-29-35-31-17 2-27 13-35 31z"
        fill="#070b1f"
        stroke="#6366f1"
        strokeWidth="2"
      />

      <path
        d="M40 72c-6 4-8 13-5 21 2 7 8 12 15 12"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="5"
        strokeLinecap="round"
      />

      <circle
        cx="38"
        cy="84"
        r="8"
        fill="#0f172a"
        stroke="#67e8f9"
        strokeWidth="2"
      />

      <circle
        cx="38"
        cy="84"
        r="3"
        fill="#67e8f9"
        filter="url(#lunaGlow)"
      />

      <path
        d="M58 81c5-4 10-4 15 0"
        fill="none"
        stroke="#0f172a"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <path
        d="M87 81c5-4 10-4 15 0"
        fill="none"
        stroke="#0f172a"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <circle
        cx="66"
        cy="85"
        r="4"
        fill="#22d3ee"
        filter="url(#lunaGlow)"
      />

      <circle
        cx="94"
        cy="85"
        r="4"
        fill="#22d3ee"
        filter="url(#lunaGlow)"
      />

      <path
        d="M69 105c7 5 15 5 22 0"
        fill="none"
        stroke="#334155"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M71 145l9 8 9-8"
        fill="none"
        stroke="#67e8f9"
        strokeWidth="3"
        filter="url(#lunaGlow)"
      />

      <circle
        cx="80"
        cy="153"
        r="6"
        fill="#22d3ee"
        filter="url(#lunaGlow)"
      />
    </svg>
  );
}

function getGuides() {
  return {
    publication: {
      badge: "PUBLICACIÓN",
      title: "Analiza antes de publicar",
      message:
        "QSM puede ayudarte a revisar evidencia, descripción, precio, imágenes e identificadores.",
      steps: [
        "Agrega fotografías reales y claras.",
        "Describe el estado y funcionamiento.",
        "Incluye serial, IMEI o VIN cuando corresponda.",
        "Revisa las recomendaciones antes de publicar."
      ],
      actionText: "Crear publicación",
      actionLink: "/new-product"
    },
    fraud: {
      badge: "FRAUDE",
      title: "Detecta señales de riesgo",
      message:
        "Consulta alertas, coincidencias y señales que requieren revisión humana.",
      steps: [
        "Evita pagos fuera de QSM.",
        "Revisa precios demasiado bajos.",
        "Consulta historial e identificadores.",
        "Reporta mensajes o comportamientos sospechosos."
      ],
      actionText: "Abrir Seguridad",
      actionLink: "/settings"
    },
    marketplace: {
      badge: "MARKETPLACE",
      title: "Busca con protección",
      message:
        "Explora productos y revisa confianza, evidencia e historial antes de comprar.",
      steps: [
        "Compara publicaciones.",
        "Revisa el vendedor.",
        "Consulta el historial del producto.",
        "Compra dentro del flujo protegido."
      ],
      actionText: "Abrir Marketplace",
      actionLink: "/marketplace"
    },
    seller: {
      badge: "VENDEDOR",
      title: "Revisa reputación y confianza",
      message:
        "Antes de comprar, consulta señales visibles de verificación y actividad segura.",
      steps: [
        "Revisa Trust Score.",
        "Confirma identidad verificada.",
        "Consulta publicaciones activas.",
        "Mantén la conversación dentro de QSM."
      ],
      actionText: "Abrir Marketplace",
      actionLink: "/marketplace"
    },
    messages: {
      badge: "MENSAJES",
      title: "Mantén conversaciones seguras",
      message:
        "QSM analiza señales de riesgo y ayuda a mantener la operación dentro de la plataforma.",
      steps: [
        "No compartas contraseñas.",
        "No aceptes pagos externos.",
        "Evita enlaces sospechosos.",
        "Reporta cualquier presión o amenaza."
      ],
      actionText: "Abrir Mensajes",
      actionLink: "/messages"
    },
    history: {
      badge: "HISTORIAL",
      title: "Consulta trazabilidad",
      message:
        "Revisa datos reales del producto, órdenes, entregas, disputas y alertas disponibles.",
      steps: [
        "Abre el detalle del producto.",
        "Consulta su historial.",
        "Revisa coincidencias de identificadores.",
        "Valida evidencia antes de comprar."
      ],
      actionText: "Abrir Marketplace",
      actionLink: "/marketplace"
    },
    dashboard: {
      badge: "DASHBOARD",
      title: "Resumen de actividad",
      message:
        "Consulta tu progreso, confianza y acciones importantes dentro de QSM.",
      steps: [
        "Revisa Trust Score.",
        "Completa verificaciones.",
        "Consulta compras y ventas.",
        "Atiende alertas pendientes."
      ],
      actionText: "Ir al Dashboard",
      actionLink: "/dashboard"
    }
  };
}

function getContextInfo(path) {
  const value =
    String(path || "").toLowerCase();

  if (value.includes("dashboard")) {
    return "Dashboard";
  }

  if (
    value.includes("profile") ||
    value.includes("verification")
  ) {
    return "Perfil";
  }

  if (
    value.includes("marketplace") ||
    value.includes("product")
  ) {
    return "Marketplace";
  }

  if (value.includes("dispute")) {
    return "Disputas";
  }

  if (
    value.includes("checkout") ||
    value.includes("order")
  ) {
    return "Órdenes";
  }

  if (value.includes("message")) {
    return "Mensajes";
  }

  return "QSM";
}

export default AiAssistant;
