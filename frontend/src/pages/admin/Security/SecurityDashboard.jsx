/* QSM_BLOQUE9_8_POLISH_CSS */
import "./SecurityFraudPolish.css";
import { API_BASE_URL as QSM_RUNTIME_API_URL } from "../../../config/runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = String(
  QSM_RUNTIME_API_URL
).replace(/\/+$/, "");

const emptyData = {
  overview: {
    score: 100,
    threat: "LOW",
    uptime: "Sin monitor externo",
    lastScan: "Pendiente"
  },

  kpis: {
    incidents: 0,
    blocked: 0,
    attempts: 0,
    failed: 0,
    blockedUsers: 0,
    bots: 0,
    aiScore: 100,
    servers: 0
  },

  events: [],
  logins: [],
  users: [],
  devices: [],
  sessions: [],
  threats: [],
  servers: [],
  owasp: [],
  backups: []
};

const eventsSeed = [
  ["🚨","SQL Injection bloqueado","CRITICAL","/api/products/search","181.36.22.19","Rusia"],
  ["⚠️","Intento de fuerza bruta","HIGH","15 intentos contra una cuenta","172.22.41.17","República Dominicana"],
  ["🤖","Bot automatizado detectado","MEDIUM","Rate limit activado","10.232.20.18","Estados Unidos"],
  ["🌍","Login desde país inusual","HIGH","Nuevo país y dispositivo","190.80.10.21","España"],
  ["🔑","Contraseña actualizada","LOW","MFA completado","172.16.50.11","República Dominicana"],
  ["📱","Nuevo dispositivo registrado","MEDIUM","Android 15 · Chrome","181.36.23.12","Brasil"]
];

const mockData = {
  overview: { score: 92, threat: "MEDIUM", uptime: "99.99%", lastScan: "Hace 4 minutos" },
  kpis: {
    incidents: 42,
    blocked: 312,
    attempts: 5842,
    failed: 214,
    blockedUsers: 18,
    bots: 67,
    aiScore: 89,
    servers: 8
  },
  events: Array.from({ length: 42 }, (_, i) => {
    const e = eventsSeed[i % eventsSeed.length];
    return {
      id: `EVT-${9000 + i}`,
      icon: e[0],
      title: e[1],
      severity: e[2],
      detail: e[3],
      ip: e[4],
      country: e[5],
      time: `Hace ${i + 1} min`
    };
  }),
  logins: Array.from({ length: 28 }, (_, i) => ({
    id: `LOGIN-${7000+i}`,
    userId: `USR-${1000+i}`,
    user: ["Carlos Martínez","María Pérez","José Ramírez","Ana Rodríguez","Miguel Santos"][i%5],
    email: `usuario${i+1}@qsm.do`,
    country: ["República Dominicana","España","Estados Unidos","Rusia","Canadá"][i%5],
    ip: `181.36.${i+10}.${i+50}`,
    device: ["Windows","Android","iPhone","Mac","Linux"][i%5],
    browser: ["Chrome","Edge","Safari","Firefox"][i%4],
    vpn: i%7===0,
    tor: i%11===0,
    result: i%9===0 ? "BLOCKED" : i%4===0 ? "FAILED" : "SUCCESS",
    risk: ["LOW","MEDIUM","HIGH","CRITICAL"][i%4],
    time: `Hace ${i+2} min`
  })),
  users: Array.from({ length: 26 }, (_, i) => ({
    id: `USR-${4000+i}`,
    name: ["Pedro Jiménez","Luis Gómez","Ramón Castillo","Carmen Reyes","Víctor Medina","Sara Núñez"][i%6],
    email: `riesgo${i+1}@qsm.do`,
    trust: 20+((i*7)%48),
    aiRisk: 60+((i*3)%39),
    attempts: 3+(i%17),
    vpn: i%3===0,
    tor: i%8===0,
    status: i%9===0 ? "BLOCKED" : i%5===0 ? "SUSPENDED" : "ACTIVE",
    devices: 1+(i%5),
    sessions: 1+(i%4)
  })),
  devices: Array.from({ length: 24 }, (_, i) => ({
    id: `DEV-${3000+i}`,
    user: ["Carlos Martínez","María Pérez","José Ramírez","Ana Rodríguez"][i%4],
    os: ["Windows","Android","iPhone","Mac","Linux"][i%5],
    browser: ["Chrome","Edge","Safari","Firefox"][i%4],
    ip: `10.232.${i+20}.${i+30}`,
    location: ["Santo Domingo","Santiago","Madrid","Miami","Barcelona"][i%5],
    activity: `Hace ${i+1} min`,
    trusted: i%4!==0,
    blocked: i%10===0
  })),
  sessions: Array.from({ length: 52 }, (_, i) => ({
    id: `SES-${5000+i}`,
    user: ["Carlos Martínez","María Pérez","José Ramírez","Ana Rodríguez","Miguel Santos"][i%5],
    start: `${8+(i%10)}:${String(i%60).padStart(2,"0")}`,
    activity: `Hace ${i%20} min`,
    ip: `172.16.${i+10}.${i+20}`,
    city: ["Santo Domingo","Santiago","Puerto Plata","Madrid","Miami"][i%5],
    duration: `${1+(i%7)}h ${i%60}m`,
    risk: ["LOW","LOW","MEDIUM","HIGH"][i%4]
  })),
  threats: [
    ["Fraude",92],["Spam",71],["Bots",81],["Scam",88],["Phishing",64],
    ["VPN",58],["TOR",32],["Fake Accounts",76],["Carding",44]
  ],
  servers: [
    ["API Gateway","API",42],["Node Backend","Node.js",58],["PostgreSQL","Database",61],
    ["Redis","Cache",34],["Socket.IO","Realtime",49],["Storage","Files",73],
    ["Worker IA","AI",67],["Backup Node","Backup",21]
  ],
  owasp: [
    "SQL Injection","XSS","CSRF","SSRF","Broken Authentication",
    "JWT Security","Security Headers","Secure Cookies"
  ],
  backups: [
    ["BKP-001","PostgreSQL completo","Hoy 02:00 AM","4.8 GB"],
    ["BKP-002","Archivos de usuarios","Ayer 11:00 PM","18.2 GB"],
    ["BKP-003","Configuración de seguridad","Ayer 09:30 PM","280 MB"]
  ]
};

const labels = {
  LOW:"Bajo", MEDIUM:"Medio", HIGH:"Alto", CRITICAL:"Crítico",
  SUCCESS:"Exitoso", FAILED:"Fallido", BLOCKED:"Bloqueado",
  ACTIVE:"Activo", SUSPENDED:"Suspendido"
};

function Badge({ value, children }) {
  return <span className={`sec-badge b-${value}`}>{children || labels[value] || value}</span>;
}

function Table({ children }) {
  return <div className="sec-table-wrap"><table className="sec-table">{children}</table></div>;
}

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState("ALL");
  const [result, setResult] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedLogin, setSelectedLogin] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | QSM_BLOQUE9_4_FRAUDSHIELD_DASHBOARD
  |--------------------------------------------------------------------------
  */

  const [fraudData, setFraudData] =
    useState({
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        escalated: 0,
        messageSecurity: 0
      },
      alerts: []
    });

  const [fraudLoading, setFraudLoading] =
    useState(false);

  const [fraudError, setFraudError] =
    useState("");

  const [fraudSearch, setFraudSearch] =
    useState("");

  const [fraudRisk, setFraudRisk] =
    useState("ALL");

  const [fraudType, setFraudType] =
    useState("ALL");

  const [selectedFraud, setSelectedFraud] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | QSM_BLOQUE9_5_FRAUD_HUMAN_UI
  |--------------------------------------------------------------------------
  */

  const [fraudActionLoading, setFraudActionLoading] =
    useState(false);

  const [fraudHumanNote, setFraudHumanNote] =
    useState("");

  const [fraudResolution, setFraudResolution] =
    useState("TRUE_POSITIVE");

  const [fraudHumanMessage, setFraudHumanMessage] =
    useState("");

  const [fraudHumanError, setFraudHumanError] =
    useState("");


  /*
|--------------------------------------------------------------------------
| QSM_BLOQUE9_8_ACTION_LABELS
|--------------------------------------------------------------------------
*/

  const fraudActionLabel = (action) => {

    const map = {

      DETECTED:
        "Detectada por LUNA Security",

      TAKE_OWNERSHIP:
        "Caso tomado",

      START_REVIEW:
        "Revisión iniciada",

      ADD_NOTE:
        "Nota interna agregada",

      ESCALATE:
        "Escalada a Seguridad",

      RESOLVE:
        "Alerta resuelta",

      DISMISS:
        "Descartada como falso positivo",

      REOPEN:
        "Caso reabierto"
    };


    return (
      map[
        String(
          action || ""
        ).toUpperCase()
      ] ||
      action ||
      "Actualización"
    );
  };


  const fraudRiskLabel = (risk) => {

    const map = {
      LOW:
        "Bajo",

      MEDIUM:
        "Medio",

      HIGH:
        "Alto",

      CRITICAL:
        "Crítico"
    };


    return (
      map[
        String(
          risk || ""
        ).toUpperCase()
      ] ||
      risk ||
      "Sin clasificar"
    );
  };


  const fraudStatusLabel = (status) => {

    const map = {
      NEW: "Nueva",
      IN_REVIEW: "En revisión",
      ESCALATED: "Escalada",
      RESOLVED: "Resuelta",
      DISMISSED: "Descartada"
    };

    return (
      map[
        String(
          status || "NEW"
        ).toUpperCase()
      ] ||
      status ||
      "Nueva"
    );
  };


  const fraudResolutionLabel = (value) => {

    const map = {
      TRUE_POSITIVE:
        "Fraude o riesgo confirmado",

      FALSE_POSITIVE:
        "Falso positivo",

      MITIGATED:
        "Riesgo mitigado",

      USER_WARNED:
        "Usuario advertido",

      NO_ACTION_REQUIRED:
        "Sin acción adicional"
    };

    return (
      map[value] ||
      value ||
      "—"
    );
  };


  const manageFraudAlert = async (
    action
  ) => {

    if (!selectedFraud?.id) {
      return;
    }

    setFraudActionLoading(true);
    setFraudHumanError("");
    setFraudHumanMessage("");

    try {

      const token =
        localStorage.getItem("qsm_admin_token") ||
        sessionStorage.getItem("qsm_admin_token") ||
        localStorage.getItem("qsm_token") ||
        sessionStorage.getItem("qsm_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token") ||
        "";

      const response =
        await fetch(
          `${QSM_RUNTIME_API_URL}/fraud/alerts/` +
            selectedFraud.id +
            "/manage",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",

              ...(token
                ? {
                    Authorization:
                      "Bearer " +
                      token
                  }
                : {})
            },

            body:
              JSON.stringify({
                action,
                note:
                  fraudHumanNote,
                resolution:
                  fraudResolution
              })
          }
        );


      const payload =
        await response.json();


      if (
        !response.ok ||
        !payload?.success
      ) {
        throw new Error(
          payload?.message ||
          "No fue posible actualizar la alerta."
        );
      }


      setFraudHumanMessage(
        payload.message ||
        "Alerta actualizada."
      );

      setFraudHumanNote("");

      await loadFraudShield();


      const updated =
        {
          ...selectedFraud,
          ...payload.alert,

          humanManagementStatus:
            payload.alert?.status ||
            selectedFraud
              .humanManagementStatus
        };


      setSelectedFraud(
        updated
      );

    } catch (error) {

      setFraudHumanError(
        error?.message ||
        "No fue posible gestionar la alerta."
      );

    } finally {

      setFraudActionLoading(false);
    }
  };


  const loadFraudShield = async () => {

    setFraudLoading(true);
    setFraudError("");

    try {

      const token =
        localStorage.getItem("qsm_admin_token") ||
        sessionStorage.getItem("qsm_admin_token") ||
        localStorage.getItem("qsm_token") ||
        sessionStorage.getItem("qsm_token") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token") ||
        "";

      const response =
        await fetch(
          `${QSM_RUNTIME_API_URL}/fraud/history`,
          {
            headers:
              token
                ? {
                    Authorization:
                      "Bearer " + token
                  }
                : {}
          }
        );

      const payload =
        await response.json();

      if (
        !response.ok ||
        !payload?.success
      ) {
        throw new Error(
          payload?.message ||
          "No fue posible cargar FraudShield."
        );
      }

      setFraudData({
        summary:
          payload.summary || {},
        alerts:
          Array.isArray(
            payload.alerts
          )
            ? payload.alerts
            : []
      });

    } catch (error) {

      setFraudError(
        error?.message ||
        "No fue posible cargar las alertas."
      );

    } finally {

      setFraudLoading(false);
    }
  };


  useEffect(() => {

    if (
      tab === "fraudshield"
    ) {
      loadFraudShield();
    }

  }, [tab]);


  const filteredFraudAlerts =
    useMemo(() => {

      const query =
        fraudSearch
          .trim()
          .toLowerCase();

      return fraudData.alerts.filter(
        (alert) => {

          const searchable =
            [
              alert.id,
              alert.type,
              alert.level,
              alert.message,
              alert.product?.name,
              alert.product?.qsmCode,
              alert.seller?.firstName,
              alert.seller?.lastName,
              alert.seller?.email,
              alert.conversationId,
              alert.senderId
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          const searchMatch =
            !query ||
            searchable.includes(
              query
            );

          const riskMatch =
            fraudRisk === "ALL" ||
            alert.level ===
              fraudRisk;

          const typeMatch =
            fraudType === "ALL" ||
            (
              fraudType === "ESCALATED"
                ? alert.escalated
                : fraudType ===
                    "MESSAGE"
                  ? String(
                      alert.type
                    ).startsWith(
                      "MESSAGE_"
                    )
                  : alert.type ===
                    fraudType
            );

          return (
            searchMatch &&
            riskMatch &&
            typeMatch
          );
        }
      );

    }, [
      fraudData.alerts,
      fraudSearch,
      fraudRisk,
      fraudType
    ]);

  const getAdminToken = () => {
    return (
      localStorage.getItem(
        "qsm_admin_token"
      ) ||
      sessionStorage.getItem(
        "qsm_admin_token"
      ) ||
      localStorage.getItem(
        "token"
      ) ||
      ""
    );
  };

  const securityRequest = async (
    endpoint,
    options = {}
  ) => {
    const token =
      getAdminToken();

    const response =
      await fetch(
        API_BASE_URL + endpoint,
        {
          ...options,

          headers: {
            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            ...(options.headers ||
              {}),

            Authorization:
              token
                ? `Bearer ${token}`
                : ""
          }
        }
      );

    const body =
      await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        body?.message ||
          `Error ${response.status}`
      );
    }

    return body;
  };

  const normalizeDashboard = (
    payload
  ) => {
    const source =
      payload?.data ||
      payload ||
      {};

    return {
      ...emptyData,
      ...source,

      overview: {
        ...emptyData.overview,
        ...(source.overview ||
          {})
      },

      kpis: {
        ...emptyData.kpis,
        ...(source.kpis ||
          {})
      },

      events:
        Array.isArray(
          source.events
        )
          ? source.events
          : [],

      logins:
        Array.isArray(
          source.logins
        )
          ? source.logins
          : [],

      users:
        Array.isArray(
          source.users
        )
          ? source.users
          : [],

      devices:
        Array.isArray(
          source.devices
        )
          ? source.devices
          : [],

      sessions:
        Array.isArray(
          source.sessions
        )
          ? source.sessions
          : [],

      threats:
        Array.isArray(
          source.threats
        )
          ? source.threats
          : [],

      servers:
        Array.isArray(
          source.servers
        )
          ? source.servers
          : [],

      owasp:
        Array.isArray(
          source.owasp
        )
          ? source.owasp
          : [],

      backups:
        Array.isArray(
          source.backups
        )
          ? source.backups
          : []
    };
  };

  const loadSecurityDashboard =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await securityRequest(
            "/admin/security/dashboard"
          );

        setData(
          normalizeDashboard(
            response
          )
        );
      } catch (requestError) {
        console.error(
          "Error cargando Seguridad:",
          requestError
        );

        setError(
          requestError.message ||
            "No se pudo cargar Seguridad."
        );
      } finally {
        setLoading(false);
      }
    };

  const applySecurityAction =
    async (
      action,
      payload = {}
    ) => {
      try {
        setError("");

        await securityRequest(
          "/admin/security/actions",
          {
            method: "POST",

            body:
              JSON.stringify({
                action,
                ...payload
              })
          }
        );

        await loadSecurityDashboard();

        return true;
      } catch (requestError) {
        console.error(
          "Error aplicando acci?n:",
          requestError
        );

        setError(
          requestError.message ||
            "No se pudo aplicar la acci?n."
        );

        return false;
      }
    };

  useEffect(() => {
    loadSecurityDashboard();
  }, []);

  const filteredLogins = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.logins.filter(x => {
      const text = [x.user,x.email,x.country,x.ip,x.device,x.browser].join(" ").toLowerCase();
      return (!q || text.includes(q)) &&
        (risk==="ALL" || x.risk===risk) &&
        (result==="ALL" || x.result===result);
    });
  }, [data.logins, search, risk, result]);

  const userAction = async (
    userId,
    status
  ) => {
    const actions = {
      SUSPENDED:
        "SUSPEND_USER",

      BLOCKED:
        "BLOCK_USER",

      ACTIVE:
        "RESTORE_USER"
    };

    const action =
      actions[status];

    if (!action) {
      return;
    }

    const completed =
      await applySecurityAction(
        action,
        {
          userId
        }
      );

    if (completed) {
      setSelectedUser(null);
    }
  };

  const endSession = async (
    sessionId
  ) => {
    await applySecurityAction(
      "CLOSE_SESSION",
      {
        sessionId
      }
    );
  };

  const updateDevice = async (
    deviceId,
    patch
  ) => {
    await applySecurityAction(
      patch?.blocked
        ? "BLOCK_DEVICE"
        : "TRUST_DEVICE",
      {
        deviceId
      }
    );
  };

  const exportReport = () => {
    const blob = new Blob([JSON.stringify(data,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qsm-security-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="sec-page">
      <style>{styles}</style>
      <div className="sec-shell">
        <header className="sec-header">
          <div>
            <p className="sec-eyebrow">QSM SECURITY OPERATIONS CENTER</p>
            <h1>🛡 Centro de Seguridad</h1>
            <p>Centro de seguridad, sesiones, dispositivos, infraestructura e inteligencia de amenazas.</p>
          </div>
          <div className="sec-actions">
            <button className="sec-btn" onClick={()=>navigate("/admin/select-area")}>← Todas las áreas</button>
            <button
              className="sec-btn"
              disabled={loading}
              onClick={
                loadSecurityDashboard
              }
            >
              {loading
                ? "Cargando..."
                : "Actualizar"}
            </button>
            <button className="sec-btn primary" onClick={exportReport}>Exportar</button>
          </div>
        </header>

        {error && (
          <div className="sec-error">
            {error}
          </div>
        )}

        <section className="sec-overview">
          <div className="sec-status">
            <div className="sec-shield">🛡</div>
            <div><span>Estado general</span><strong>PROTEGIDO</strong><small>Todos los sistemas críticos están operativos.</small></div>
          </div>
          <div className="sec-score">
            <div className="sec-ring" style={{"--score":`${data.overview.score*3.6}deg`}}>
              <div><b>{data.overview.score}</b><span>/100</span></div>
            </div>
            <div><span>Puntuación de seguridad</span><strong>Nivel {labels[data.overview.threat]}</strong><small>Último escaneo: {data.overview.lastScan}</small></div>
          </div>
          <div className="sec-health">
            <div><span>Uptime</span><strong>{data.overview.uptime}</strong></div>
            <div><span>Nivel de amenaza</span><strong>{labels[data.overview.threat]}</strong></div>
          </div>
        </section>

        <section className="sec-kpis">
          {[
            ["Incidentes hoy",data.kpis.incidents,"🚨"],
            ["Ataques bloqueados",data.kpis.blocked,"🧱"],
            ["Intentos de acceso",data.kpis.attempts,"🔐"],
            ["Accesos fallidos",data.kpis.failed,"❌"],
            ["Usuarios bloqueados",data.kpis.blockedUsers,"⛔"],
            ["Bots detectados",data.kpis.bots,"🤖"],
            ["Puntuación de seguridad",`${data.kpis.aiScore}%`,"🧠"],
            ["Servidores",data.kpis.servers,"🖥"]
          ].map(([t,v,i])=>(
            <div className="sec-card sec-kpi" key={t}>
              <div className="sec-kpi-icon">{i}</div><span>{t}</span><strong>{v}</strong>
            </div>
          ))}
        </section>

        <nav className="sec-tabs">
          {[
            ["overview","Resumen"],["fraudshield","FraudShield"],["logins","Seguridad de acceso"],["users","Usuarios de riesgo"],
            ["firewall","Firewall"],["devices","Dispositivos"],["sessions","Sesiones"],
            ["threats","Threat Center"],["servers","Servidores"],["owasp","OWASP"],
            ["backups","Backups"],["settings","Configuración"]
          ].map(([id,label])=>(
            <button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{label}</button>
          ))}
        </nav>

        {tab==="overview" && (
          <div className="sec-main">
            <section className="sec-card">
              <div className="sec-section-title"><div><p className="sec-eyebrow">LIVE</p><h2>Actividad de seguridad</h2></div><span className="sec-live"><i/>Tiempo real</span></div>
              <div className="sec-feed">
                {data.events.slice(0,18).map(e=>(
                  <div className={`sec-event sev-${e.severity}`} key={e.id}>
                    <div className="sec-event-icon">{e.icon}</div>
                    <div><strong>{e.title}</strong><p>{e.detail}</p><small>{e.ip} · {e.country}</small></div>
                    <time>{e.time}</time>
                  </div>
                ))}
              </div>
            </section>
            <aside className="sec-side">
              <section className="sec-card">
                <div className="sec-section-title"><div><p className="sec-eyebrow">AI</p><h2>Amenazas</h2></div></div>
                <div className="sec-bars">
                  {data.threats.slice(0,6).map(([name,value])=>(
                    <div key={name}><div><strong>{name}</strong><span>{value}%</span></div><div className="sec-progress"><i style={{width:`${value}%`}}/></div></div>
                  ))}
                </div>
              </section>
              <section className="sec-card">
                <div className="sec-section-title"><div><p className="sec-eyebrow">INFRA</p><h2>Servicios</h2></div></div>
                <div className="sec-services">
                  {data.servers.slice(0,6).map(([name,type,use])=>(
                    <div key={name}><i/><div><strong>{name}</strong><small>{type}</small></div><b>{use}%</b></div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        )}


        {tab==="fraudshield" && (
          <section className="sec-fraudshield">

            <div className="sec-section-title">
              <div>
                <p className="sec-eyebrow">
                  LUNA SECURITY · FRAUDSHIELD
                </p>

                <h2>
                  Historial de alertas antifraude
                </h2>

                <p className="sec-muted">
                  Alertas reales detectadas por los motores de seguridad de QSM.
                </p>
              </div>

              <button
                className="sec-btn"
                onClick={loadFraudShield}
                disabled={fraudLoading}
              >
                {fraudLoading
                  ? "Actualizando..."
                  : "Actualizar alertas"}
              </button>
            </div>


            {fraudError && (
              <div className="sec-fraud-error">
                <strong>
                  No se pudo cargar FraudShield.
                </strong>
                <span>{fraudError}</span>
              </div>
            )}


            <div className="sec-fraud-kpis">

              <article className="sec-card">
                <span>Total de alertas</span>
                <strong>
                  {fraudData.summary.total || 0}
                </strong>
              </article>

              <article className="sec-card">
                <span>Críticas</span>
                <strong>
                  {fraudData.summary.critical || 0}
                </strong>
              </article>

              <article className="sec-card">
                <span>Riesgo alto</span>
                <strong>
                  {fraudData.summary.high || 0}
                </strong>
              </article>

              <article className="sec-card">
                <span>Escaladas</span>
                <strong>
                  {fraudData.summary.escalated || 0}
                </strong>
              </article>

              <article className="sec-card">
                <span>Mensajería</span>
                <strong>
                  {fraudData.summary.messageSecurity || 0}
                </strong>
              </article>

            </div>


            <section className="sec-card">

              <div className="sec-toolbar">

                <input
                  value={fraudSearch}
                  onChange={
                    (event) =>
                      setFraudSearch(
                        event.target.value
                      )
                  }
                  placeholder="Buscar alerta, producto, vendedor o conversación..."
                />

                <select
                  value={fraudRisk}
                  onChange={
                    (event) =>
                      setFraudRisk(
                        event.target.value
                      )
                  }
                >
                  <option value="ALL">
                    Todos los riesgos
                  </option>

                  <option value="LOW">
                    Bajo
                  </option>

                  <option value="MEDIUM">
                    Medio
                  </option>

                  <option value="HIGH">
                    Alto
                  </option>

                  <option value="CRITICAL">
                    Crítico
                  </option>
                </select>

                <select
                  value={fraudType}
                  onChange={
                    (event) =>
                      setFraudType(
                        event.target.value
                      )
                  }
                >
                  <option value="ALL">
                    Todos los tipos
                  </option>

                  <option value="MESSAGE">
                    Seguridad de mensajes
                  </option>

                  <option value="ESCALATED">
                    Escaladas
                  </option>
                </select>

              </div>


              {fraudLoading ? (

                <div className="sec-fraud-empty">
                  Cargando alertas reales de FraudShield...
                </div>

              ) : filteredFraudAlerts.length === 0 ? (

                <div className="sec-fraud-empty">
                  No hay alertas que coincidan con los filtros seleccionados.
                </div>

              ) : (

                <Table>

                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Vendedor</th>
                      <th>Tipo</th>
                      <th>Riesgo</th>
                      <th>Puntuación</th>
                      <th>Estado</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>

                    {filteredFraudAlerts.map(
                      (alert) => (

                        <tr key={alert.id}>

                          <td>
                            <strong>
                              FA-{alert.id}
                            </strong>
                          </td>

                          <td>
                            {new Date(
                              alert.createdAt
                            ).toLocaleString(
                              "es-DO"
                            )}
                          </td>

                          <td>
                            <strong>
                              {alert.product?.name ||
                                "Producto no disponible"}
                            </strong>

                            <small>
                              {alert.product?.qsmCode ||
                                "Sin código QSM"}
                            </small>
                          </td>

                          <td>
                            <strong>
                              {[
                                alert.seller?.firstName,
                                alert.seller?.lastName
                              ]
                                .filter(Boolean)
                                .join(" ") ||
                                "No disponible"}
                            </strong>

                            <small>
                              {alert.seller?.email ||
                                ""}
                            </small>
                          </td>

                          <td>
                            {alert.escalated
                              ? "Escalamiento de seguridad"
                              : String(
                                  alert.type ||
                                  ""
                                ).startsWith(
                                  "MESSAGE_"
                                )
                                ? "Seguridad de mensajes"
                                : alert.type}
                          </td>

                          <td>
                            <Badge
                              value={
                                alert.level
                              }
                            />
                          </td>

                          <td>
                            {alert.score !== null &&
                            alert.score !== undefined
                              ? alert.score + "/100"
                              : "—"}
                          </td>

                          <td>
                            <span
                              className={
                                alert.humanManagementStatus === "RESOLVED"
                                  ? "sec-fraud-detected"
                                  : alert.humanManagementStatus === "DISMISSED"
                                    ? "sec-fraud-detected"
                                    : "sec-fraud-escalated"
                              }
                            >
                              {fraudStatusLabel(
                                alert.humanManagementStatus
                              )}
                            </span>
                          </td>

                          <td>
                            <button
                              className="sec-btn"
                              onClick={
                                () =>
                                  setSelectedFraud(
                                    alert
                                  )
                              }
                            >
                              Ver detalle
                            </button>
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </Table>
              )}

            </section>

          </section>
        )}

        {tab==="logins" && (
          <section className="sec-card">
            <div className="sec-section-title"><div><p className="sec-eyebrow">AUTH</p><h2>Seguridad de acceso</h2></div></div>
            <div className="sec-toolbar">
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar usuario, email o IP..." />
              <select value={risk} onChange={e=>setRisk(e.target.value)}>
                <option value="ALL">Todos los riesgos</option><option value="LOW">Bajo</option><option value="MEDIUM">Medio</option><option value="HIGH">Alto</option><option value="CRITICAL">Crítico</option>
              </select>
              <select value={result} onChange={e=>setResult(e.target.value)}>
                <option value="ALL">Todos los resultados</option><option value="SUCCESS">Exitosos</option><option value="FAILED">Fallidos</option><option value="BLOCKED">Bloqueados</option>
              </select>
            </div>
            <Table>
              <thead><tr><th>Usuario</th><th>País</th><th>IP</th><th>Dispositivo</th><th>Navegador</th><th>VPN</th><th>TOR</th><th>Riesgo</th><th>Resultado</th><th>Hora</th><th/></tr></thead>
              <tbody>{filteredLogins.map(x=>(
                <tr key={x.id}>
                  <td><strong>{x.user}</strong><small>{x.email}</small></td><td>{x.country}</td><td>{x.ip}</td><td>{x.device}</td><td>{x.browser}</td><td>{x.vpn?"Sí":"No"}</td><td>{x.tor?"Sí":"No"}</td>
                  <td><Badge value={x.risk}/></td><td><Badge value={x.result}/></td><td>{x.time}</td>
                  <td><button className="sec-btn" onClick={()=>setSelectedLogin(x)}>Ver</button></td>
                </tr>
              ))}</tbody>
            </Table>
          </section>
        )}

        {tab==="users" && (
          <section className="sec-card">
            <div className="sec-section-title"><div><p className="sec-eyebrow">RISK</p><h2>Usuarios de alto riesgo</h2></div></div>
            <Table>
              <thead><tr><th>Usuario</th><th>Trust Score</th><th>Riesgo autom?tico</th><th>Intentos</th><th>VPN</th><th>TOR</th><th>Dispositivos</th><th>Sesiones</th><th>Estado</th><th/></tr></thead>
              <tbody>{data.users.map(u=>(
                <tr key={u.id}>
                  <td><strong>{u.name}</strong><small>{u.email}</small></td><td>{u.trust}</td><td>{u.aiRisk}%</td><td>{u.attempts}</td><td>{u.vpn?"Sí":"No"}</td><td>{u.tor?"Sí":"No"}</td><td>{u.devices}</td><td>{u.sessions}</td><td><Badge value={u.status}/></td>
                  <td><button className="sec-btn" onClick={()=>setSelectedUser(u)}>Gestionar</button></td>
                </tr>
              ))}</tbody>
            </Table>
          </section>
        )}

        {tab==="firewall" && (
          <section className="sec-feature-grid">
            {[
              ["IPs bloqueadas","1,284","🧱"],["IPs permitidas","402","✅"],["Rate Limit","Activo","⏱"],
              ["Cloudflare","Protegido","☁️"],["WAF","Activo","🛡"],["DDoS","Mitigación activa","🌐"]
            ].map(([t,v,i])=>(
              <article className="sec-card sec-feature" key={t}><div>{i}</div><span>{t}</span><strong>{v}</strong><button className="sec-btn">Gestionar</button></article>
            ))}
          </section>
        )}

        {tab==="devices" && (
          <section className="sec-card">
            <div className="sec-section-title"><div><p className="sec-eyebrow">ENDPOINTS</p><h2>Gestión de dispositivos</h2></div></div>
            <div className="sec-grid">
              {data.devices.map(d=>(
                <article className="sec-device" key={d.id}>
                  <div className="sec-device-icon">{d.os==="Windows"?"🪟":d.os==="Android"?"🤖":d.os==="iPhone"?"📱":d.os==="Mac"?"💻":"🐧"}</div>
                  <h3>{d.os}</h3><p>{d.user}</p>
                  <dl><div><dt>Navegador</dt><dd>{d.browser}</dd></div><div><dt>IP</dt><dd>{d.ip}</dd></div><div><dt>Ubicación</dt><dd>{d.location}</dd></div><div><dt>Actividad</dt><dd>{d.activity}</dd></div></dl>
                  <div className="sec-actions">
                    <button className="sec-btn" onClick={()=>updateDevice(d.id,{trusted:true,blocked:false})}>Confiar</button>
                    <button className="sec-btn danger" onClick={()=>updateDevice(d.id,{trusted:false,blocked:true})}>Bloquear</button>
                  </div>
                  <Badge value={d.blocked?"BLOCKED":d.trusted?"SUCCESS":"MEDIUM"}>{d.blocked?"Bloqueado":d.trusted?"Confiable":"No verificado"}</Badge>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab==="sessions" && (
          <section className="sec-card">
            <div className="sec-section-title"><div><p className="sec-eyebrow">SESSIONS</p><h2>Sesiones activas</h2></div></div>
            <Table>
              <thead><tr><th>Usuario</th><th>Inicio</th><th>Última actividad</th><th>IP</th><th>Ciudad</th><th>Duración</th><th>Riesgo</th><th/></tr></thead>
              <tbody>{data.sessions.map(s=>(
                <tr key={s.id}><td><strong>{s.user}</strong><small>{s.id}</small></td><td>{s.start}</td><td>{s.activity}</td><td>{s.ip}</td><td>{s.city}</td><td>{s.duration}</td><td><Badge value={s.risk}/></td><td><button className="sec-btn danger" onClick={()=>endSession(s.id)}>Finalizar</button></td></tr>
              ))}</tbody>
            </Table>
          </section>
        )}

        {tab==="threats" && (
          <section className="sec-card">
            <div className="sec-section-title"><div><p className="sec-eyebrow">AI ANALYSIS</p><h2>Centro de amenazas con IA</h2></div></div>
            <div className="sec-grid">
              {data.threats.map(([name,value])=>(
                <article className="sec-threat" key={name}><div>{value}%</div><h3>{name}</h3><div className="sec-progress large"><i style={{width:`${value}%`}}/></div><p>Detección y actividad calculada por inteligencia artificial.</p></article>
              ))}
            </div>
          </section>
        )}

        {tab==="servers" && (
          <section className="sec-card">
            <div className="sec-section-title"><div><p className="sec-eyebrow">INFRASTRUCTURE</p><h2>Estado de servidores</h2></div></div>
            <div className="sec-grid">
              {data.servers.map(([name,type,use])=>(
                <article className="sec-server" key={name}><div className="sec-server-top"><div><i/><strong>{name}</strong></div><Badge value="SUCCESS">Online</Badge></div><p>{type}</p><div className="sec-server-meter"><div><span>Uso</span><strong>{use}%</strong></div><div className="sec-progress"><i style={{width:`${use}%`}}/></div></div></article>
              ))}
            </div>
          </section>
        )}

        {tab==="owasp" && (
          <section className="sec-card">
            <div className="sec-section-title"><div><p className="sec-eyebrow">APPLICATION SECURITY</p><h2>Seguridad OWASP</h2></div></div>
            <div className="sec-grid">
              {data.owasp.map((name,i)=>(
                <article className="sec-owasp" key={name}><div>✓</div><h3>{name}</h3><Badge value="SUCCESS">Protegido</Badge><p>Último análisis: {i+2} min</p></article>
              ))}
            </div>
          </section>
        )}

        {tab==="backups" && (
          <section className="sec-card">
            <div className="sec-section-title"><div><p className="sec-eyebrow">RECOVERY</p><h2>Backups</h2></div></div>
            <div className="sec-backups">
              {data.backups.map(([id,name,date,size])=>(
                <article key={id}><div>💾</div><div><strong>{name}</strong><p>{date} · {size}</p></div><Badge value="SUCCESS">Completado</Badge><div className="sec-actions"><button className="sec-btn">Descargar</button><button className="sec-btn">Restaurar</button></div></article>
              ))}
            </div>
          </section>
        )}

        {tab==="settings" && <Settings />}
      </div>


      {selectedFraud && (
        <div
          className="sec-modal-bg"
          onClick={
            (event) =>
              event.target ===
                event.currentTarget &&
              setSelectedFraud(null)
          }
        >

          <div className="sec-modal">

            <header>

              <div>
                <p className="sec-eyebrow">
                  FRAUDSHIELD · ALERTA
                </p>

                <h2>
                  Alerta FA-{selectedFraud.id}
                </h2>

                <p>
                  {new Date(
                    selectedFraud.createdAt
                  ).toLocaleString(
                    "es-DO"
                  )}
                </p>
              </div>

              <button
                className="sec-btn"
                onClick={
                  () =>
                    setSelectedFraud(null)
                }
              >
                ✕
              </button>

            </header>


            <div className="sec-modal-body">

              <div className="sec-summary">

                <div>
                  <span>Nivel de riesgo</span>
                  <strong>
                    {labels[
                      selectedFraud.level
                    ] ||
                      selectedFraud.level}
                  </strong>
                </div>

                <div>
                  <span>Puntuación</span>
                  <strong>
                    {selectedFraud.score !==
                      null &&
                    selectedFraud.score !==
                      undefined
                      ? selectedFraud.score +
                        "/100"
                      : "No disponible"}
                  </strong>
                </div>

                <div>
                  <span>Producto</span>
                  <strong>
                    {selectedFraud.product
                      ?.name ||
                      "No disponible"}
                  </strong>
                </div>

                <div>
                  <span>Código QSM</span>
                  <strong>
                    {selectedFraud.product
                      ?.qsmCode ||
                      "No disponible"}
                  </strong>
                </div>

                <div>
                  <span>Conversación</span>
                  <strong>
                    {selectedFraud
                      .conversationId ||
                      "No disponible"}
                  </strong>
                </div>

                <div>
                  <span>Usuario emisor</span>
                  <strong>
                    {selectedFraud.senderId ||
                      "No disponible"}
                  </strong>
                </div>

              </div>


              <div className="sec-fraud-detail">

                <h3>
                  Motivo detectado
                </h3>

                <p>
                  {selectedFraud.message}
                </p>

              </div>


              <div className="sec-fraud-detail">

                <h3>
                  Vendedor relacionado
                </h3>

                <p>
                  {[
                    selectedFraud.seller
                      ?.firstName,
                    selectedFraud.seller
                      ?.lastName
                  ]
                    .filter(Boolean)
                    .join(" ") ||
                    "No disponible"}
                </p>

                <small>
                  {selectedFraud.seller
                    ?.email || ""}
                </small>

              </div>


              {selectedFraud.escalated && (

                <div className="sec-fraud-critical">

                  <strong>
                    LUNA Security solicita revisión
                  </strong>

                  <p>
                    LUNA Security detectó reincidencia o un nivel de riesgo suficiente para escalar esta conversación a FraudShield.
                  </p>

                </div>
              )}


              <section className="sec-fraud-human">

                <div className="sec-fraud-human__header">

                  <div>
                    <p className="sec-eyebrow">
                      REVISIÓN HUMANA DE SEGURIDAD
                    </p>

                    <h3>
                      Gestión de alerta FraudShield
                    </h3>
                  </div>

                  <strong>
                    {fraudStatusLabel(
                      selectedFraud.humanManagementStatus
                    )}
                  </strong>

                </div>


                <div className="sec-summary">

                  <div>
                    <span>Responsable</span>

                    <strong>
                      {selectedFraud.assignedToName ||
                        "Sin asignar"}
                    </strong>
                  </div>

                  <div>
                    <span>Última revisión</span>

                    <strong>
                      {selectedFraud.reviewedByName ||
                        "Sin revisar"}
                    </strong>
                  </div>

                  <div>
                    <span>Resolución</span>

                    <strong>
                      {fraudResolutionLabel(
                        selectedFraud.resolution
                      )}
                    </strong>
                  </div>

                </div>


                {fraudHumanMessage && (
                  <div className="sec-fraud-human-success">
                    {fraudHumanMessage}
                  </div>
                )}


                {fraudHumanError && (
                  <div className="sec-fraud-human-error">
                    {fraudHumanError}
                  </div>
                )}


                <label className="sec-fraud-human-field">

                  <span>
                    Nota interna
                  </span>

                  <textarea
                    value={fraudHumanNote}
                    onChange={
                      (event) =>
                        setFraudHumanNote(
                          event.target.value
                        )
                    }
                    maxLength={2000}
                    placeholder="Describe la revisión realizada, la evidencia observada o el motivo de la decisión..."
                  />

                </label>


                <label className="sec-fraud-human-field">

                  <span>
                    Resolución
                  </span>

                  <select
                    value={fraudResolution}
                    onChange={
                      (event) =>
                        setFraudResolution(
                          event.target.value
                        )
                    }
                  >

                    <option value="TRUE_POSITIVE">
                      Fraude o riesgo confirmado
                    </option>

                    <option value="FALSE_POSITIVE">
                      Falso positivo
                    </option>

                    <option value="MITIGATED">
                      Riesgo mitigado
                    </option>

                    <option value="USER_WARNED">
                      Usuario advertido
                    </option>

                    <option value="NO_ACTION_REQUIRED">
                      Sin acción adicional
                    </option>

                  </select>

                </label>


                <div className="sec-fraud-human-actions">

                  {selectedFraud.humanManagementStatus ===
                    "NEW" && (

                    <button
                      className="sec-btn"
                      disabled={fraudActionLoading}
                      onClick={() =>
                        manageFraudAlert(
                          "TAKE_OWNERSHIP"
                        )
                      }
                    >
                      Tomar caso
                    </button>
                  )}


                  {selectedFraud.humanManagementStatus !==
                    "RESOLVED" &&
                    selectedFraud.humanManagementStatus !==
                    "DISMISSED" && (

                    <>
                      <button
                        className="sec-btn"
                        disabled={fraudActionLoading}
                        onClick={() =>
                          manageFraudAlert(
                            "ADD_NOTE"
                          )
                        }
                      >
                        Guardar nota
                      </button>

                      <button
                        className="sec-btn warning"
                        disabled={fraudActionLoading}
                        onClick={() =>
                          manageFraudAlert(
                            "ESCALATE"
                          )
                        }
                      >
                        Escalar caso
                      </button>

                      <button
                        className="sec-btn"
                        disabled={fraudActionLoading}
                        onClick={() =>
                          manageFraudAlert(
                            "RESOLVE"
                          )
                        }
                      >
                        Resolver alerta
                      </button>

                      <button
                        className="sec-btn warning"
                        disabled={fraudActionLoading}
                        onClick={() =>
                          manageFraudAlert(
                            "DISMISS"
                          )
                        }
                      >
                        Descartar
                      </button>
                    </>
                  )}


                  {[
                    "RESOLVED",
                    "DISMISSED"
                  ].includes(
                    selectedFraud.humanManagementStatus
                  ) && (

                    <button
                      className="sec-btn"
                      disabled={fraudActionLoading}
                      onClick={() =>
                        manageFraudAlert(
                          "REOPEN"
                        )
                      }
                    >
                      Reabrir caso
                    </button>
                  )}

                </div>


                {Array.isArray(
                  selectedFraud.reviewHistory
                ) &&
                  selectedFraud.reviewHistory.length > 0 && (

                  <div className="sec-fraud-history">

                    <h4>
                      Historial de seguridad
                    </h4>

                    {[...selectedFraud.reviewHistory]
                      .reverse()
                      .map(
                        (
                          event,
                          index
                        ) => (

                          <article
                            key={
                              String(
                                event.timestamp
                              ) +
                              "-" +
                              index
                            }
                          >

                            <strong>
                              {event.actor ||
                                "Personal QSM"}
                            </strong>

                            <span>
                              {fraudActionLabel(event.action)}
                            </span>

                            {event.note && (
                              <p>
                                {event.note}
                              </p>
                            )}

                            <small>
                              {event.timestamp
                                ? new Date(
                                    event.timestamp
                                  ).toLocaleString(
                                    "es-DO"
                                  )
                                : ""}
                            </small>

                          </article>
                        )
                      )}

                  </div>
                )}

              </section>

            </div>

          </div>

        </div>
      )}

      {selectedUser && (
        <div className="sec-modal-bg" onClick={e=>e.target===e.currentTarget&&setSelectedUser(null)}>
          <div className="sec-modal">
            <header><div><p className="sec-eyebrow">HIGH RISK USER</p><h2>{selectedUser.name}</h2><p>{selectedUser.email}</p></div><button className="sec-btn" onClick={()=>setSelectedUser(null)}>✕</button></header>
            <div className="sec-modal-body">
              <div className="sec-summary">
                {[["Trust Score",selectedUser.trust],["Riesgo autom?tico",`${selectedUser.aiRisk}%`],["Intentos",selectedUser.attempts],["Dispositivos",selectedUser.devices],["Sesiones",selectedUser.sessions],["Estado",selectedUser.status]].map(([l,v])=><div key={l}><span>{l}</span><strong>{v}</strong></div>)}
              </div>
              <div className="sec-modal-actions">
                <button
                  className="sec-btn"
                  onClick={() =>
                    applySecurityAction(
                      "REQUIRE_FACE_CHECK",
                      {
                        userId:
                          selectedUser.id
                      }
                    )
                  }
                >
                  Forzar Face Check
                </button>
                <button
                  className="sec-btn"
                  onClick={() =>
                    applySecurityAction(
                      "CLOSE_USER_SESSIONS",
                      {
                        userId:
                          selectedUser.id
                      }
                    )
                  }
                >
                  Cerrar sesiones
                </button>
                <button className="sec-btn warning" onClick={()=>userAction(selectedUser.id,"SUSPENDED")}>Suspender</button>
                <button className="sec-btn danger" onClick={()=>userAction(selectedUser.id,"BLOCKED")}>Bloquear</button>
                <button className="sec-btn success" onClick={()=>userAction(selectedUser.id,"ACTIVE")}>Restaurar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedLogin && (
        <div className="sec-modal-bg" onClick={e=>e.target===e.currentTarget&&setSelectedLogin(null)}>
          <div className="sec-modal small">
            <header><div><p className="sec-eyebrow">LOGIN EVENT</p><h2>{selectedLogin.user}</h2><p>{selectedLogin.email}</p></div><button className="sec-btn" onClick={()=>setSelectedLogin(null)}>✕</button></header>
            <div className="sec-modal-body"><div className="sec-summary">
              {[["País",selectedLogin.country],["IP",selectedLogin.ip],["Dispositivo",selectedLogin.device],["Navegador",selectedLogin.browser],["VPN",selectedLogin.vpn?"Sí":"No"],["TOR",selectedLogin.tor?"Sí":"No"],["Riesgo",labels[selectedLogin.risk]],["Resultado",labels[selectedLogin.result]],["Hora",selectedLogin.time]].map(([l,v])=><div key={l}><span>{l}</span><strong>{v}</strong></div>)}
            </div></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Settings() {
  const [channels,setChannels] = useState([
    ["Email",true],["SMS",true],["Telegram",false],["Discord",false],["Slack",true],["Push",true]
  ]);
  const [settings,setSettings] = useState([
    ["JWT seguro",true],["MFA obligatorio",true],["Google Authenticator",true],["Passkeys",false],["Session Timeout",true],["Password Policy",true],["CAPTCHA",true],["Cloudflare",true],["WAF",true]
  ]);
  const toggle = (setter,list,index) => setter(list.map((x,i)=>i===index?[x[0],!x[1]]:x));
  return <div className="sec-settings">
    <section className="sec-card"><div className="sec-section-title"><div><p className="sec-eyebrow">ALERTS</p><h2>Canales de alertas</h2></div></div><div className="sec-toggle-list">{channels.map((x,i)=><button key={x[0]} onClick={()=>toggle(setChannels,channels,i)}><span>{x[0]}</span><i className={x[1]?"on":""}><b/></i></button>)}</div></section>
    <section className="sec-card"><div className="sec-section-title"><div><p className="sec-eyebrow">POLICIES</p><h2>Configuración de seguridad</h2></div></div><div className="sec-toggle-list">{settings.map((x,i)=><button key={x[0]} onClick={()=>toggle(setSettings,settings,i)}><span>{x[0]}</span><i className={x[1]?"on":""}><b/></i></button>)}</div></section>
  </div>;
}

const styles = `
*{box-sizing:border-box}
.sec-page{min-height:100vh;padding:28px;color:#f7f8ff;background:radial-gradient(circle at 10% 10%,rgba(63,94,251,.14),transparent 30%),radial-gradient(circle at 90% 0%,rgba(255,45,85,.12),transparent 28%),radial-gradient(circle at 50% 100%,rgba(123,65,255,.12),transparent 34%),#050713;font-family:Inter,system-ui,sans-serif}
.sec-shell{width:min(1700px,100%);margin:auto}
.sec-header{display:flex;justify-content:space-between;gap:24px;margin-bottom:22px}
.sec-header h1{margin:0;font-size:clamp(34px,4.5vw,54px)}
.sec-header>div>p:not(.sec-eyebrow){max-width:800px;color:#929bbc;line-height:1.7}
.sec-eyebrow{margin:0 0 8px;color:#ff5f86;font-size:11px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}
.sec-actions{display:flex;flex-wrap:wrap;gap:9px}
.sec-header .sec-actions{align-items:flex-start}
.sec-header .sec-btn{height:42px;min-height:42px;padding:0 15px}
.sec-btn:disabled{opacity:.65;cursor:not-allowed;transform:none}
.sec-error{margin-bottom:16px;border:1px solid rgba(255,77,109,.35);border-radius:12px;padding:12px 15px;color:#ff9aae;background:rgba(255,77,109,.1)}
.sec-btn{min-height:40px;border:1px solid #283255;border-radius:11px;padding:9px 14px;color:#eef1ff;background:#0e142c;font-weight:760;cursor:pointer}
.sec-btn:hover{border-color:#5b668d;transform:translateY(-1px)}
.sec-btn.primary{border-color:transparent;background:linear-gradient(135deg,#5d61ff,#cf4d9a)}
.sec-btn.danger{color:#ff879c;border-color:rgba(255,77,109,.35);background:rgba(255,77,109,.1)}
.sec-btn.warning{color:#ffd172;border-color:rgba(255,177,64,.35);background:rgba(255,177,64,.1)}
.sec-btn.success{color:#71e9b6;border-color:rgba(48,211,146,.35);background:rgba(48,211,146,.1)}
.sec-overview{display:grid;grid-template-columns:1.2fr 1fr .8fr;gap:16px;margin-bottom:16px}
.sec-status,.sec-score,.sec-health{display:flex;align-items:center;gap:18px;min-height:160px;border:1px solid #20294d;border-radius:20px;padding:20px;background:linear-gradient(145deg,rgba(17,23,50,.97),rgba(8,12,29,.97))}
.sec-shield{display:grid;width:82px;height:82px;place-items:center;border-radius:24px;background:linear-gradient(135deg,rgba(55,214,143,.2),rgba(45,119,255,.16));font-size:38px}
.sec-status span,.sec-score span,.sec-health span{display:block;color:#818bad;font-size:11px;text-transform:uppercase}
.sec-status strong,.sec-score strong,.sec-health strong{display:block;margin-top:7px;color:#6cf0b7;font-size:25px}
.sec-status small,.sec-score small{display:block;margin-top:7px;color:#7781a2}
.sec-ring{display:grid;width:100px;height:100px;place-items:center;border-radius:50%;background:conic-gradient(#5b67ff var(--score),#1e2748 0)}
.sec-ring>div{display:grid;width:78px;height:78px;place-content:center;border-radius:50%;background:#0a0f25;text-align:center}
.sec-ring b{font-size:28px}.sec-health{justify-content:space-around}.sec-health>div{text-align:center}
.sec-kpis{display:grid;grid-template-columns:repeat(8,1fr);gap:14px;margin-bottom:18px}
.sec-card{border:1px solid #1f2849;border-radius:19px;padding:18px;background:linear-gradient(145deg,rgba(15,21,46,.98),rgba(7,11,27,.98))}
.sec-kpi{min-height:145px}.sec-kpi-icon{display:grid;width:42px;height:42px;place-items:center;border-radius:13px;background:linear-gradient(135deg,rgba(88,97,255,.16),rgba(255,71,120,.12));font-size:19px}
.sec-kpi span{display:block;margin-top:16px;color:#8590b2;font-size:11px}.sec-kpi strong{display:block;margin-top:8px;font-size:27px}
.sec-tabs{display:flex;gap:8px;overflow-x:auto;margin-bottom:18px;padding:5px;border:1px solid #1d2545;border-radius:15px;background:rgba(8,12,30,.78)}
.sec-tabs button{flex:0 0 auto;min-height:39px;border:1px solid transparent;border-radius:10px;padding:0 14px;color:#7e88aa;background:transparent;font-weight:750;cursor:pointer}
.sec-tabs button.active,.sec-tabs button:hover{color:#fff;border-color:#2b3764;background:linear-gradient(135deg,rgba(92,91,255,.2),rgba(255,63,113,.12))}
.sec-main{display:grid;grid-template-columns:2fr .72fr;gap:18px}.sec-side{display:flex;flex-direction:column;gap:18px}
.sec-section-title{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.sec-section-title h2{margin:0;font-size:21px}
.sec-live{display:flex;align-items:center;gap:8px;color:#6ee9b4;font-size:10px}.sec-live i,.sec-services>div>i,.sec-server-top i{width:9px;height:9px;border-radius:50%;background:#4ce3a5;box-shadow:0 0 15px rgba(76,227,165,.7)}
.sec-feed{display:grid;max-height:770px;overflow-y:auto}.sec-event{display:grid;grid-template-columns:auto 1fr auto;gap:13px;padding:14px 0;border-bottom:1px solid #19213e}
.sec-event-icon{display:grid;width:40px;height:40px;place-items:center;border-radius:12px;background:#171e3a}.sec-event strong{font-size:12px}.sec-event p{margin:5px 0 8px;color:#7781a3;font-size:11px}.sec-event small,.sec-event time{color:#606b8c;font-size:9px}
.sev-CRITICAL{border-left:3px solid #ff4e72;padding-left:12px}.sev-HIGH{border-left:3px solid #ff9b4a;padding-left:12px}.sev-MEDIUM{border-left:3px solid #7b6dff;padding-left:12px}.sev-LOW{border-left:3px solid #48d9a1;padding-left:12px}
.sec-bars{display:grid;gap:16px}.sec-bars>div>div:first-child{display:flex;justify-content:space-between;margin-bottom:8px}.sec-bars strong{font-size:11px}.sec-bars span{font-size:10px;color:#9fa7c6}
.sec-progress{height:7px;overflow:hidden;border-radius:999px;background:#1a2344}.sec-progress.large{height:9px}.sec-progress i{display:block;height:100%;background:linear-gradient(90deg,#5b65ff,#db4fa0,#ff5575)}
.sec-services>div{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid #19213e}.sec-services strong,.sec-services small{display:block}.sec-services small{color:#697395;font-size:9px}.sec-services b{font-size:10px;color:#9ea6c6}
.sec-toolbar{display:grid;grid-template-columns:1fr auto auto;gap:10px;margin-bottom:16px}.sec-toolbar input,.sec-toolbar select{min-height:42px;border:1px solid #222c50;border-radius:11px;padding:0 14px;color:#f3f5ff;background:#080d20}
.sec-table-wrap{overflow-x:auto;border:1px solid #18213f;border-radius:14px}.sec-table{width:100%;min-width:1180px;border-collapse:collapse}.sec-table thead{background:#080d20}.sec-table th{padding:14px;color:#6f799c;font-size:9px;text-align:left;text-transform:uppercase}.sec-table td{padding:14px;border-top:1px solid #18203d;font-size:11px}.sec-table td strong,.sec-table td small{display:block}.sec-table td small{margin-top:5px;color:#697395;font-size:9px}
.sec-badge{display:inline-flex;border-radius:999px;padding:6px 10px;font-size:9px;font-weight:900}.b-LOW,.b-SUCCESS,.b-ACTIVE{color:#6ee9b4;background:rgba(45,211,145,.12)}.b-MEDIUM{color:#ffd06f;background:rgba(255,185,67,.12)}.b-HIGH,.b-FAILED,.b-SUSPENDED{color:#ffab6c;background:rgba(255,142,71,.12)}.b-CRITICAL,.b-BLOCKED{color:#ff8198;background:rgba(255,77,109,.13)}
.sec-feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.sec-feature{min-height:210px}.sec-feature>div{display:grid;width:50px;height:50px;place-items:center;border-radius:15px;background:#171e3c;font-size:23px}.sec-feature span{display:block;margin-top:18px;color:#838daf;font-size:11px}.sec-feature strong{display:block;margin:9px 0 18px;font-size:24px}
.sec-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}.sec-device,.sec-threat,.sec-server,.sec-owasp{position:relative;border:1px solid #20294a;border-radius:16px;padding:17px;background:#0a1026}
.sec-device-icon{display:grid;width:48px;height:48px;place-items:center;border-radius:14px;background:linear-gradient(135deg,rgba(91,97,255,.2),rgba(214,74,154,.16));font-size:23px}.sec-device h3,.sec-threat h3,.sec-owasp h3{margin:12px 0 0}.sec-device p,.sec-threat p,.sec-server p,.sec-owasp p{color:#747e9f;font-size:10px}
.sec-device dl{display:grid;gap:10px;margin:16px 0}.sec-device dl>div{display:flex;justify-content:space-between}.sec-device dt,.sec-device dd{font-size:9px}.sec-device dt{color:#667092}.sec-device dd{margin:0}
.sec-device>.sec-badge{position:absolute;top:15px;right:15px}.sec-threat>div:first-child{font-size:34px;font-weight:900}.sec-threat h3{margin-bottom:13px}.sec-server-top{display:flex;justify-content:space-between}.sec-server-top>div{display:flex;align-items:center;gap:9px}.sec-server-meter>div:first-child{display:flex;justify-content:space-between;margin-bottom:8px;font-size:10px}.sec-owasp>div:first-child{display:grid;width:46px;height:46px;place-items:center;border-radius:14px;color:#66e8ae;background:rgba(48,211,146,.12);font-size:21px}
.sec-backups article{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:14px;padding:16px 0;border-bottom:1px solid #19213d}.sec-backups article>div:first-child{font-size:22px}.sec-backups p{margin:5px 0 0;color:#717b9d;font-size:10px}
.sec-settings{display:grid;grid-template-columns:1fr 1fr;gap:18px}.sec-toggle-list button{display:flex;justify-content:space-between;align-items:center;width:100%;min-height:54px;border:0;border-bottom:1px solid #19213d;color:#e8ebfa;background:transparent;cursor:pointer}.sec-toggle-list i{position:relative;width:48px;height:26px;border-radius:999px;background:#252e50}.sec-toggle-list i b{position:absolute;top:4px;left:4px;width:18px;height:18px;border-radius:50%;background:#8c95b4;transition:.2s}.sec-toggle-list i.on{background:linear-gradient(135deg,#5c63ff,#ce4c99)}.sec-toggle-list i.on b{transform:translateX(22px);background:#fff}
.sec-modal-bg{position:fixed;z-index:5000;inset:0;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.8);backdrop-filter:blur(10px)}.sec-modal{width:min(980px,100%);max-height:94vh;overflow:auto;border:1px solid #29345e;border-radius:21px;background:linear-gradient(145deg,#0c1229,#080c1e)}.sec-modal.small{width:min(720px,100%)}.sec-modal header{display:flex;justify-content:space-between;padding:22px;border-bottom:1px solid #20284a}.sec-modal header h2{margin:0}.sec-modal header p:not(.sec-eyebrow){color:#7d87a7}.sec-modal-body{padding:22px}.sec-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.sec-summary>div{border:1px solid #20294a;border-radius:13px;padding:14px;background:#0b1127}.sec-summary span{display:block;color:#707a9b;font-size:9px;text-transform:uppercase}.sec-summary strong{display:block;margin-top:7px}.sec-modal-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:20px}
@media(max-width:1500px){.sec-kpis{grid-template-columns:repeat(4,1fr)}}@media(max-width:1200px){.sec-overview{grid-template-columns:1fr 1fr}.sec-health{grid-column:1/-1}.sec-main{grid-template-columns:1fr}.sec-side{display:grid;grid-template-columns:1fr 1fr}.sec-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:900px){.sec-feature-grid,.sec-grid{grid-template-columns:repeat(2,1fr)}.sec-settings{grid-template-columns:1fr}.sec-toolbar{grid-template-columns:1fr}.sec-summary{grid-template-columns:1fr 1fr}}@media(max-width:700px){.sec-page{padding:18px 12px}.sec-header{flex-direction:column}.sec-overview{grid-template-columns:1fr}.sec-health{grid-column:auto}.sec-kpis{grid-template-columns:1fr 1fr}.sec-side,.sec-feature-grid,.sec-grid{grid-template-columns:1fr}.sec-summary{grid-template-columns:1fr}.sec-backups article{grid-template-columns:auto 1fr}.sec-backups article>.sec-badge,.sec-backups article>.sec-actions{grid-column:2}}@media(max-width:460px){.sec-kpis{grid-template-columns:1fr}.sec-status,.sec-score{flex-direction:column;align-items:flex-start}}

/* QSM_BLOQUE9_4_FRAUDSHIELD_DASHBOARD */

.sec-muted{
  margin:7px 0 0;
  color:#7f89aa;
  font-size:12px;
}

.sec-fraudshield{
  display:grid;
  gap:18px;
}

.sec-fraud-kpis{
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:14px;
}

.sec-fraud-kpis .sec-card{
  min-height:115px;
}

.sec-fraud-kpis span{
  display:block;
  color:#8993b4;
  font-size:11px;
}

.sec-fraud-kpis strong{
  display:block;
  margin-top:13px;
  font-size:29px;
}

.sec-fraud-error{
  display:flex;
  flex-direction:column;
  gap:5px;
  border:1px solid rgba(255,78,114,.38);
  border-radius:14px;
  padding:14px 16px;
  color:#ff9aac;
  background:rgba(255,78,114,.09);
}

.sec-fraud-empty{
  padding:48px 20px;
  color:#8993b4;
  text-align:center;
}

.sec-fraud-escalated,
.sec-fraud-detected{
  display:inline-flex;
  align-items:center;
  min-height:28px;
  border-radius:999px;
  padding:4px 10px;
  font-size:10px;
  font-weight:800;
}

.sec-fraud-escalated{
  color:#ff9aab;
  border:1px solid rgba(255,78,114,.3);
  background:rgba(255,78,114,.1);
}

.sec-fraud-detected{
  color:#ffd179;
  border:1px solid rgba(255,183,77,.3);
  background:rgba(255,183,77,.09);
}

.sec-fraud-detail{
  margin-top:16px;
  border:1px solid #20294a;
  border-radius:14px;
  padding:16px;
  background:#0b1026;
}

.sec-fraud-detail h3{
  margin:0 0 9px;
  font-size:13px;
}

.sec-fraud-detail p{
  margin:0;
  color:#b3bbd5;
  line-height:1.7;
}

.sec-fraud-detail small{
  display:block;
  margin-top:6px;
  color:#7882a4;
}

.sec-fraud-critical{
  margin-top:16px;
  border:1px solid rgba(255,78,114,.4);
  border-radius:14px;
  padding:16px;
  color:#ffacb9;
  background:rgba(255,78,114,.08);
}

.sec-fraud-critical p{
  margin:7px 0 0;
  line-height:1.6;
}

@media(max-width:1100px){
  .sec-fraud-kpis{
    grid-template-columns:repeat(2,1fr);
  }
}

@media(max-width:650px){
  .sec-fraud-kpis{
    grid-template-columns:1fr;
  }
}



/* QSM_BLOQUE9_5_FRAUD_HUMAN_UI */

.sec-fraud-human{
  margin-top:18px;
  border:1px solid rgba(56,189,248,.22);
  border-radius:18px;
  padding:18px;
  background:rgba(8,15,35,.72);
}

.sec-fraud-human__header{
  display:flex;
  justify-content:space-between;
  gap:16px;
  align-items:flex-start;
  margin-bottom:16px;
}

.sec-fraud-human__header h3{
  margin:4px 0 0;
}

.sec-fraud-human__header > strong{
  border:1px solid rgba(56,189,248,.28);
  border-radius:999px;
  padding:7px 11px;
  color:#7dd3fc;
  font-size:11px;
}

.sec-fraud-human-field{
  display:grid;
  gap:7px;
  margin-top:14px;
}

.sec-fraud-human-field > span{
  color:#94a3b8;
  font-size:11px;
  font-weight:800;
}

.sec-fraud-human-field textarea,
.sec-fraud-human-field select{
  width:100%;
  border:1px solid #293352;
  border-radius:12px;
  padding:12px 13px;
  background:#080d20;
  color:#e5e7eb;
  outline:none;
}

.sec-fraud-human-field textarea{
  min-height:105px;
  resize:vertical;
}

.sec-fraud-human-actions{
  display:flex;
  flex-wrap:wrap;
  gap:9px;
  margin-top:16px;
}

.sec-fraud-human-success,
.sec-fraud-human-error{
  margin:12px 0;
  border-radius:12px;
  padding:11px 13px;
  font-size:12px;
}

.sec-fraud-human-success{
  color:#86efac;
  background:rgba(34,197,94,.09);
  border:1px solid rgba(34,197,94,.25);
}

.sec-fraud-human-error{
  color:#fca5a5;
  background:rgba(239,68,68,.09);
  border:1px solid rgba(239,68,68,.25);
}

.sec-fraud-history{
  display:grid;
  gap:9px;
  margin-top:20px;
}

.sec-fraud-history h4{
  margin:0 0 4px;
}

.sec-fraud-history article{
  border-left:3px solid rgba(56,189,248,.35);
  border-radius:9px;
  padding:10px 12px;
  background:rgba(15,23,42,.55);
}

.sec-fraud-history article strong,
.sec-fraud-history article span{
  display:block;
}

.sec-fraud-history article span{
  margin-top:3px;
  color:#7dd3fc;
  font-size:10px;
}

.sec-fraud-history article p{
  margin:7px 0;
  color:#cbd5e1;
  line-height:1.5;
}

.sec-fraud-history article small{
  color:#64748b;
}

@media(max-width:650px){
  .sec-fraud-human__header{
    flex-direction:column;
  }

  .sec-fraud-human-actions{
    display:grid;
    grid-template-columns:1fr;
  }
}

`;


/* QSM_BLOQUE9_8_FINAL_POLISH */
