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

/* QSM_FASE10_BLOCK1_VISUAL_CORE */

const DEFAULT_CORE = {
  status: "CONNECTING",
  version: "1.0.0",
  mode: "RULE_BASED",
  provider: "INTERNAL",
  authenticated: false,
  audience: "VISITOR",
  accessLevel: "PUBLIC",
  allowedTopics: [],
  capabilities: [],
  modules: [],
  decisions: [],
  loading: true,
  error: ""
};

/* QSM_FASE10_BLOCK2_LUNA_HERO */

/* QSM_FASE10_BLOCK3_PROFESSIONAL_FINISH */

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

    const loadCore = async () => {
      if (mounted) {
        setCore((current) => ({
          ...current,
          loading: true,
          error: ""
        }));
      }

      try {
        const publicResponse =
          await api.get("/ai/status");

        let accessData = null;

        try {
          const accessResponse =
            await api.get(
              "/ai/access/context"
            );

          accessData =
            accessResponse.data || null;
        } catch {
          accessData = null;
        }

        if (!mounted) {
          return;
        }

        const publicData =
          publicResponse.data || {};

        const authenticated =
          accessData?.authenticated === true;

        const allowedTopics =
          Array.isArray(
            accessData?.allowedTopics
          )
            ? accessData.allowedTopics
            : Array.isArray(
                publicData.allowedTopics
              )
              ? publicData.allowedTopics
              : [];

        const modules =
          buildLunaModules({
            authenticated,
            accessLevel:
              accessData?.accessLevel ||
              publicData.accessLevel ||
              "PUBLIC",
            allowedTopics
          });

        const capabilities =
          buildLunaCapabilities({
            authenticated,
            allowedTopics,
            modules
          });

        setCore({
          status:
            publicData.status ||
            "ACTIVE",

          version:
            publicData.engine?.version ||
            "10.1.0",

          mode:
            publicData.engine?.mode ||
            "RULE_BASED",

          provider:
            publicData.engine?.provider ||
            "INTERNAL",

          authenticated,

          audience:
            accessData?.audience ||
            publicData.audience ||
            "VISITOR",

          accessLevel:
            accessData?.accessLevel ||
            publicData.accessLevel ||
            "PUBLIC",

          user:
            accessData?.user || null,

          allowedTopics,

          modules,

          capabilities,

          decisions:
            Array.isArray(
              publicData.decisions
            )
              ? publicData.decisions
              : [],

          loading: false,
          error: ""
        });
      } catch (error) {
        if (!mounted) {
          return;
        }

        setCore({
          ...DEFAULT_CORE,
          status: "OFFLINE",
          loading: false,
          error:
            error?.response?.data?.message ||
            error?.message ||
            "No fue posible conectar con LUNA."
        });
      }
    };

    loadCore();

    const timer =
      window.setInterval(
        loadCore,
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
        item?.status === "READY"
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
              className="qsm-ai-luna-showcase__fullbody"
              src="/qsm-ai/luna-fullbody.png"
              alt="LUNA, androide oficial de QSM Marketplace"
            />
</aside>

          <header className="qsm-ai-officer-header">
            <div className="qsm-ai-officer-header__avatar">
              <img
                className="qsm-ai-officer-header__image"
                src="/qsm-ai/luna-profile.png"
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
                <section className="qsm-ai-officer-intro qsm-ai-luna-hero">
                  <div className="qsm-ai-luna-hero__city" />

                  <div className="qsm-ai-officer-intro__copy">
                    <span className="qsm-ai-guide__label">
                      ASISTENTE INTELIGENTE QSM
                    </span>

                    <h2>
                      ¡Hola{core.user?.firstName
                        ? `, ${core.user.firstName}`
                        : ""}! 👋
                    </h2>

                    <p>
                      Estoy aquí para ayudarte a administrar tu plataforma
                      de manera inteligente, segura y personalizada.
                    </p>

                    <div className="qsm-ai-luna-hero__status">
                      <span
                        className={`qsm-ai-panel__status-dot ${statusClass}`}
                      />

                      <strong>
                        {core.authenticated
                          ? "Contexto privado conectado"
                          : "Modo público activo"}
                      </strong>
                    </div>
                  </div>
                </section>

                <section className="qsm-ai-officer-card">
                  <div>
                    <span className="qsm-ai-guide__label">
                      ESTADO DEL OFICIAL
                    </span>

                    <strong>
                      LUNA está supervisando tu experiencia
                    </strong>

                    <p>
                      Análisis inteligente, prevención de riesgos y asistencia contextual en tiempo real.
                    </p>
                  </div>

                  <span className="qsm-ai-officer-card__shield">
                    ⬡
                  </span>
                </section>

                <section className="qsm-ai-live-summary">
                  <div className="qsm-ai-live-summary__identity">
                    <span className="qsm-ai-guide__label">
                      SESIÓN ACTUAL
                    </span>

                    <strong>
                      {core.authenticated
                        ? (
                            core.user?.firstName
                              ? `Hola, ${core.user.firstName}`
                              : "Usuario autenticado"
                          )
                        : "Modo visitante"}
                    </strong>

                    <small>
                      {core.authenticated
                        ? "LUNA puede utilizar tu contexto privado."
                        : "Inicia sesión para habilitar funciones personalizadas."}
                    </small>
                  </div>

                  <div className="qsm-ai-live-summary__metrics">
                    <article>
                      <span>Acceso</span>
                      <strong>
                        {formatAccessLevel(
                          core.accessLevel
                        )}
                      </strong>
                    </article>

                    <article>
                      <span>Módulos</span>
                      <strong>
                        {core.modules.length}
                      </strong>
                    </article>

                    <article>
                      <span>Temas</span>
                      <strong>
                        {core.allowedTopics.length}
                      </strong>
                    </article>
                  </div>

                  {core.error && (
                    <div className="qsm-ai-live-summary__error">
                      {core.error}
                    </div>
                  )}
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
                      {core.loading
                        ? "Sincronizando..."
                        : core.status === "ACTIVE"
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
                      {core.authenticated
                        ? getContextInfo(currentPath)
                        : "Público"}
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
                    {core.loading ? (
                      <span className="qsm-ai-module-loading">
                        Sincronizando módulos...
                      </span>
                    ) : core.modules.length > 0 ? (
                      core.modules.map((module) => (
                        <span
                          key={module.code}
                          className={
                            module.status === "ACTIVE"
                              ? "active"
                              : "limited"
                          }
                        >
                          <i />
                          {module.label}
                        </span>
                      ))
                    ) : (
                      <span className="qsm-ai-module-loading">
                        No hay módulos disponibles.
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
                      Actividad inteligente
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

function buildLunaModules({
  authenticated,
  accessLevel,
  allowedTopics
}) {
  const topics =
    new Set(
      Array.isArray(allowedTopics)
        ? allowedTopics
        : []
    );

  const modules = [
    {
      code: "CORE_ENGINE",
      label: "Núcleo inteligente",
      public: true
    },
    {
      code: "PUBLIC_GUIDANCE",
      label: "Orientación pública",
      public: true
    },
    {
      code: "BUYER_PROFILE",
      label: "Perfil del comprador",
      topics: [
        "MY_PROFILE",
        "MY_ORDERS",
        "PRODUCT_RECOMMENDATIONS"
      ]
    },
    {
      code: "SELLER_PROFILE",
      label: "Perfil del vendedor",
      topics: [
        "MY_PRODUCTS",
        "MY_SALES"
      ]
    },
    {
      code: "MARKETPLACE_INTELLIGENCE",
      label: "Inteligencia del Marketplace",
      topics: [
        "HOW_TO_BUY",
        "HOW_TO_SELL",
        "PRODUCT_RECOMMENDATIONS"
      ]
    },
    {
      code: "TRANSACTION_SECURITY",
      label: "Seguridad transaccional",
      topics: [
        "PUBLIC_SECURITY",
        "SECURITY_ANALYSIS",
        "FRAUD_ALERTS"
      ]
    },
    {
      code: "CONVERSATION_MEMORY",
      label: "Memoria conversacional",
      topics: [
        "MY_MESSAGES"
      ]
    },
    {
      code: "OPERATIONAL_INTELLIGENCE",
      label: "Inteligencia operacional",
      privateOnly: true
    },
    {
      code: "PREDICTIVE_INTELLIGENCE",
      label: "Inteligencia predictiva",
      privateOnly: true
    },
    {
      code: "LUNA_PREMIUM",
      label: "LUNA Premium",
      privateOnly: true
    },
    {
      code: "BACKOFFICE_INTELLIGENCE",
      label: "Inteligencia del BackOffice",
      backofficeOnly: true
    },
    {
      code: "AUDIT_TRACEABILITY",
      label: "Auditoría y trazabilidad",
      topics: [
        "AUDIT",
        "READ_ONLY_REPORTS",
        "DISPUTES"
      ]
    }
  ];

  return modules
    .filter((module) => {
      if (module.public) {
        return true;
      }

      if (
        module.backofficeOnly
      ) {
        return (
          accessLevel === "BACKOFFICE"
        );
      }

      if (
        module.privateOnly
      ) {
        return authenticated;
      }

      return (
        authenticated ||
        module.topics?.some(
          (topic) =>
            topics.has(topic)
        )
      );
    })
    .map((module) => ({
      ...module,
      status:
        authenticated ||
        module.public
          ? "ACTIVE"
          : "LIMITED"
    }));
}

function buildLunaCapabilities({
  authenticated,
  allowedTopics,
  modules
}) {
  const topics =
    new Set(
      Array.isArray(allowedTopics)
        ? allowedTopics
        : []
    );

  return [
    {
      code: "ORIENTACIÓN SEGURA",
      description:
        "Orientación segura dentro de QSM.",
      status: "ACTIVE"
    },
    {
      code: "CONTEXTO INTELIGENTE",
      description:
        "Comprende la sección actual de la plataforma.",
      status:
        authenticated
          ? "ACTIVE"
          : "READY"
    },
    {
      code: "PERFIL DEL USUARIO",
      description:
        "Utiliza el perfil privado del usuario.",
      status:
        authenticated
          ? "ACTIVE"
          : "LIMITED"
    },
    {
      code: "ANÁLISIS DEL MARKETPLACE",
      description:
        "Analiza productos, vendedores y precios.",
      status:
        topics.has(
          "PRODUCT_RECOMMENDATIONS"
        ) ||
        authenticated
          ? "ACTIVE"
          : "READY"
    },
    {
      code: "PREVENCIÓN DE FRAUDE",
      description:
        "Detecta señales y patrones de riesgo.",
      status: "ACTIVE"
    },
    {
      code: "MOTOR PREDICTIVO",
      description:
        "Genera indicadores y escenarios predictivos.",
      status:
        authenticated
          ? "ACTIVE"
          : "LIMITED"
    },
    {
      code: "MEMORIA",
      description:
        "Mantiene contexto entre conversaciones.",
      status:
        authenticated
          ? "ACTIVE"
          : "LIMITED"
    },
    {
      code: "ORQUESTACIÓN DE MÓDULOS",
      description:
        `${modules.length} módulos coordinados por LUNA.`,
      status: "ACTIVE"
    }
  ];
}

function formatAccessLevel(value) {
  const levels = {
    PUBLIC: "Público",
    REGISTERED_USER: "Usuario",
    BACKOFFICE: "BackOffice",
    ADMIN: "Administrador"
  };

  return (
    levels[
      String(value || "")
        .toUpperCase()
    ] ||
    value ||
    "Público"
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
