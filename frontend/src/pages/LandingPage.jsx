import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import AiAssistant from "../components/AiAssistant";

const heroImages = [
  "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1920&q=90",
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1920&q=90",
  "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1920&q=90"
];

function LandingPage() {
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 7000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={page}>
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          html, body, #root {
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100%;
            background: #020617;
            overflow-x: hidden;
            scroll-behavior: smooth;
            font-family: 'Inter', system-ui, sans-serif;
          }

          @keyframes slowZoom {
            0% { transform: scale(1); }
            100% { transform: scale(1.09); }
          }

          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes floatSoft {
            0% { transform: translateY(0); }
            50% { transform: translateY(-12px); }
            100% { transform: translateY(0); }
          }

          @keyframes glowPulse {
            0% { box-shadow: 0 0 28px rgba(53,208,195,0.18); }
            50% { box-shadow: 0 0 70px rgba(53,208,195,0.42); }
            100% { box-shadow: 0 0 28px rgba(53,208,195,0.18); }
          }

          a, button {
            transition: all .25s ease;
          }

          a:hover, button:hover {
            transform: translateY(-2px);
          }
        `}
      </style>

      <nav style={nav}>
        <div style={logoWrap}>
          <div style={logoIcon}>🛡</div>
          <div>
            <div style={logo}>QSM</div>
            <small style={logoSub}>Quick Secure Market</small>
          </div>
        </div>

        <div style={navLinks}>
          <a href="#inicio" style={navLink}>Inicio</a>
          <a href="#nosotros" style={navLink}>Nosotros</a>
          <a href="#seguridad" style={navLink}>Seguridad</a>
          <a href="#escrow" style={navLink}>Escrow</a>
          <a href="#demo" style={navLink}>Demo</a>
          <a href="#contacto" style={navLink}>Contacto</a>
        </div>

        <div style={navActions}>
          <Link to="/login" style={outlineButton}>Iniciar sesión</Link>
          <Link to="/register" style={primaryButton}>Registrarse</Link>
        </div>
      </nav>

      <section id="inicio" style={hero}>
        <div
          key={currentImage}
          style={{
            ...heroBackground,
            backgroundImage: `
              linear-gradient(90deg, rgba(2,6,23,0.98), rgba(2,6,23,0.70), rgba(2,6,23,0.22)),
              url(${heroImages[currentImage]})
            `
          }}
        />

        <div style={heroOverlay} />

        <div style={heroContent}>
          <div style={badge}>
            <span style={badgeDot}></span>
            Plataforma segura con enfoque antifraude
          </div>

          <h1 style={heroTitle}>
            Comercio digital seguro para una nueva{" "}
            <span style={accent}>República Dominicana.</span>
          </h1>

          <p style={heroText}>
            Quick Secure Market protege compradores y vendedores con verificación de identidad,
            escrow, historial de productos, Trust Score e inteligencia antifraude.
          </p>

          <div style={heroButtons}>
            <Link to="/register" style={primaryLarge}>
              Crear cuenta segura →
            </Link>

            <a href="#demo" style={outlineLarge}>
              Ver demostración
            </a>
          </div>

          <div style={heroStats}>
            <div>
              <strong>12K+</strong>
              <span>usuarios proyectados</span>
            </div>
            <div>
              <strong>8K+</strong>
              <span>productos protegidos</span>
            </div>
            <div>
              <strong>98%</strong>
              <span>confianza estimada</span>
            </div>
          </div>

          <div style={trustPanel}>
            <span>🛡 Identidad validada</span>
            <span>💰 Pago retenido</span>
            <span>🤖 IA antifraude</span>
            <span>📦 Código QSM</span>
          </div>
        </div>

        <div style={heroDashboard}>
          <div style={dashboardTop}>
            <span>QSM Risk Engine</span>
            <span style={liveBadge}>Live</span>
          </div>

          <div style={riskCircle}>
            <span>96</span>
            <small>/100</small>
          </div>

          <p style={riskText}>Nivel de confianza estimado</p>

          <div style={progressTrack}>
            <div style={progressFill}></div>
          </div>

          <div style={miniRows}>
            <div>✅ Identidad verificada</div>
            <div>✅ Escrow habilitado</div>
            <div>✅ Historial disponible</div>
            <div>✅ IA antifraude activa</div>
            <div>✅ Producto rastreable</div>
          </div>
        </div>
      </section>

      <section id="nosotros" style={sectionGrid}>
        <div style={glassCard}>
          <p style={eyebrow}>SOBRE QSM</p>
          <h2 style={sectionTitleLeft}>
            Una plataforma diseñada para reducir fraudes digitales.
          </h2>

          <p>
            Quick Secure Market nace como una propuesta tecnológica para mejorar
            la confianza en las compras y ventas en línea en República Dominicana.
          </p>

          <p>
            La plataforma combina identidad verificada, historial de productos,
            escrow, alertas antifraude y revisión administrativa para proteger
            cada transacción.
          </p>
        </div>

        <div style={visionCard}>
          <h2>Seguridad primero</h2>
          <p>
            QSM no es solo un marketplace. Es una capa de confianza entre
            compradores, vendedores y productos.
          </p>

          <div style={visionGrid}>
            <span>Verificación</span>
            <span>Escrow</span>
            <span>Historial</span>
            <span>Disputas</span>
          </div>
        </div>
      </section>

      <section id="seguridad" style={section}>
        <p style={eyebrowCenter}>TECNOLOGÍA ANTIFRAUDE</p>
        <h2 style={centerTitle}>Seguridad integrada desde el primer clic.</h2>

        <div style={cardsGrid}>
          {[
            ["🧾", "KYC de usuarios", "Validación de documento, datos personales y selfie."],
            ["🖼", "Control de imágenes", "Detección de imágenes reutilizadas o sospechosas."],
            ["📉", "Análisis de precio", "Alertas por precios demasiado bajos o incoherentes."],
            ["⭐", "Trust Score", "Puntaje de confianza basado en comportamiento."],
            ["📦", "QSM ID", "Código único para trazabilidad del producto."],
            ["⚖", "Disputas", "Proceso documentado para resolver conflictos."]
          ].map((item) => (
            <div key={item[1]} style={featureCard}>
              <div style={featureIcon}>{item[0]}</div>
              <h3>{item[1]}</h3>
              <p>{item[2]}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="escrow" style={escrowSection}>
        <div style={escrowContent}>
          <p style={eyebrow}>ESCROW PROTECTION</p>

          <h2 style={sectionTitleLeft}>
            El dinero no va directo al vendedor. Primero lo protege QSM.
          </h2>

          <p style={escrowText}>
            El comprador paga, QSM retiene el dinero, el vendedor entrega el producto
            y solo después de la confirmación se libera el pago.
          </p>

          <div style={flowGrid}>
            {[
              ["1", "Comprador paga"],
              ["2", "QSM retiene"],
              ["3", "Producto entregado"],
              ["4", "Pago liberado"]
            ].map((step) => (
              <div key={step[0]} style={flowCard}>
                <div style={stepCircle}>{step[0]}</div>
                <h3>{step[1]}</h3>
              </div>
            ))}
          </div>
        </div>

        <div style={escrowPanel}>
          <h3>Estado de transacción</h3>

          <div style={transactionRow}>
            <span>Pago</span>
            <strong>Retenido en garantía</strong>
          </div>

          <div style={transactionRow}>
            <span>Producto</span>
            <strong>En verificación</strong>
          </div>

          <div style={transactionRow}>
            <span>Riesgo</span>
            <strong style={{ color: "#86efac" }}>Bajo</strong>
          </div>

          <div style={transactionRow}>
            <span>PIN entrega</span>
            <strong>******</strong>
          </div>
        </div>
      </section>

      <section style={section}>
        <p style={eyebrowCenter}>PROCESO QSM</p>
        <h2 style={centerTitle}>Cómo funciona la plataforma</h2>

        <div style={stepsGrid}>
          {[
            ["1", "Registro", "El usuario crea su cuenta."],
            ["2", "Verificación", "QSM valida identidad y documentos."],
            ["3", "Publicación", "El vendedor publica el producto."],
            ["4", "Compra protegida", "El pago queda retenido por QSM."],
            ["5", "Entrega", "El comprador confirma recepción."],
            ["6", "Liberación", "QSM libera el dinero al vendedor."]
          ].map((item) => (
            <div key={item[0]} style={stepCard}>
              <div style={stepCircle}>{item[0]}</div>
              <h3>{item[1]}</h3>
              <p>{item[2]}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="demo" style={simulationSection}>
        <div style={simulationCard}>
          <div>
            <p style={eyebrow}>MODO DEMOSTRACIÓN</p>

            <h2 style={sectionTitleLeft}>
              Explora cómo funcionará Quick Secure Market.
            </h2>

            <p style={demoText}>
              Accede a una simulación funcional con marketplace, publicación de
              productos, checkout seguro, órdenes, disputas, certificación QSM y panel admin.
            </p>

            <a
              href="https://engel1110.github.io/Quick-Secure-Market/"
              target="_blank"
              rel="noreferrer"
              style={primaryLarge}
            >
              Entrar al área de simulación →
            </a>
          </div>

          <div style={mockupBox}>
            <div style={mockupTop}>
              <span>QSM Platform Preview</span>
              <span style={{ color: "#35d0c3" }}>Demo</span>
            </div>

            <div style={mockupHero}></div>

            <div style={mockupGrid}>
              <div style={mockupCard}></div>
              <div style={mockupCard}></div>
              <div style={mockupCard}></div>
            </div>
          </div>
        </div>
      </section>

      <section style={stats}>
        <div><h2>12,450+</h2><p>Usuarios proyectados</p></div>
        <div><h2>8,320+</h2><p>Productos publicados</p></div>
        <div><h2>2,150+</h2><p>Fraudes prevenidos</p></div>
        <div><h2>1,280+</h2><p>Disputas resueltas</p></div>
      </section>

      <section id="contacto" style={contactSection}>
        <div>
          <p style={eyebrow}>CONTACTO</p>
          <h2 style={sectionTitleLeft}>Hablemos de seguridad digital.</h2>

          <p style={{ color: "#cbd5e1", lineHeight: "30px" }}>
            ¿Tienes preguntas sobre Quick Secure Market o quieres conocer más sobre el proyecto?
          </p>

          <input placeholder="Nombre completo" style={input} />
          <input placeholder="Correo electrónico" style={input} />
          <textarea placeholder="Mensaje" style={{ ...input, height: "130px" }} />

          <button style={primaryLarge}>Enviar mensaje</button>
        </div>

        <div style={contactCard}>
          <h3>Soporte QSM</h3>
          <p>📧 soporte@qsm.com</p>
          <p>📍 Santo Domingo, República Dominicana</p>
          <p>🕘 Lunes a viernes: 9:00 AM - 6:00 PM</p>
          <p>
            Proyecto académico orientado a comercio electrónico seguro y prevención de fraudes digitales.
          </p>
        </div>
      </section>

      <footer style={footer}>
        <h2>🛡 QSM</h2>
        <p>Quick Secure Market — Marketplace seguro de República Dominicana.</p>
        <p>© 2026 Quick Secure Market. Proyecto académico.</p>
      </footer>

      <AiAssistant />
    </div>
  );
}

const page = {
  width: "100%",
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  fontFamily: "'Inter', system-ui, sans-serif"
};

const nav = {
  width: "100%",
  height: "78px",
  padding: "0 7vw",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "rgba(2, 6, 23, 0.58)",
  borderBottom: "1px solid rgba(53,208,195,0.18)",
  backdropFilter: "blur(22px)",
  position: "fixed",
  top: 0,
  left: 0,
  zIndex: 20
};

const logoWrap = {
  display: "flex",
  alignItems: "center",
  gap: "12px"
};

const logoIcon = {
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  border: "1px solid rgba(53,208,195,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#35d0c3"
};

const logo = {
  fontSize: "30px",
  fontWeight: "900",
  lineHeight: "28px"
};

const logoSub = {
  color: "#94a3b8",
  fontSize: "11px",
  fontWeight: "700"
};

const navLinks = {
  display: "flex",
  gap: "28px"
};

const navLink = {
  color: "#e5e7eb",
  textDecoration: "none",
  fontWeight: "700",
  fontSize: "15px"
};

const navActions = {
  display: "flex",
  gap: "12px"
};

const primaryButton = {
  background: "#35d0c3",
  color: "#020617",
  textDecoration: "none",
  padding: "13px 20px",
  borderRadius: "14px",
  fontWeight: "800"
};

const outlineButton = {
  color: "white",
  textDecoration: "none",
  padding: "13px 20px",
  borderRadius: "14px",
  border: "1px solid rgba(53,208,195,0.7)",
  fontWeight: "800"
};

const hero = {
  width: "100%",
  minHeight: "100vh",
  position: "relative",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  padding: "120px 7vw 70px"
};

const heroBackground = {
  position: "absolute",
  inset: 0,
  backgroundSize: "cover",
  backgroundPosition: "center",
  animation: "slowZoom 17s ease-in-out forwards"
};

const heroOverlay = {
  position: "absolute",
  inset: 0,
  background:
    "radial-gradient(circle at 76% 36%, rgba(53,208,195,0.18), transparent 30%), radial-gradient(circle at 67% 70%, rgba(124,58,237,0.22), transparent 34%)"
};

const heroContent = {
  position: "relative",
  zIndex: 2,
  maxWidth: "780px",
  animation: "fadeUp 1s ease"
};

const badge = {
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 16px",
  borderRadius: "999px",
  color: "#35d0c3",
  background: "rgba(53,208,195,0.10)",
  border: "1px solid rgba(53,208,195,0.30)",
  fontSize: "13px",
  fontWeight: "800",
  letterSpacing: "0.4px",
  marginBottom: "22px"
};

const badgeDot = {
  width: "9px",
  height: "9px",
  borderRadius: "50%",
  background: "#35d0c3",
  boxShadow: "0 0 18px #35d0c3"
};

const heroTitle = {
  fontSize: "clamp(46px, 5.3vw, 84px)",
  lineHeight: "1.04",
  letterSpacing: "-3.2px",
  marginBottom: "24px",
  fontWeight: "900"
};

const accent = {
  color: "#35d0c3"
};

const heroText = {
  color: "#cbd5e1",
  fontSize: "20px",
  lineHeight: "34px",
  maxWidth: "720px",
  fontWeight: "400"
};

const heroButtons = {
  display: "flex",
  gap: "16px",
  marginTop: "32px",
  flexWrap: "wrap"
};

const primaryLarge = {
  display: "inline-block",
  background: "#35d0c3",
  color: "#020617",
  textDecoration: "none",
  padding: "16px 28px",
  borderRadius: "14px",
  fontWeight: "800",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 18px 45px rgba(53,208,195,0.22)"
};

const outlineLarge = {
  display: "inline-block",
  color: "white",
  textDecoration: "none",
  padding: "16px 28px",
  borderRadius: "14px",
  border: "1px solid rgba(53,208,195,0.8)",
  fontWeight: "800"
};

const heroStats = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(120px, 1fr))",
  gap: "16px",
  marginTop: "34px",
  maxWidth: "620px"
};

const trustPanel = {
  display: "flex",
  gap: "20px",
  marginTop: "30px",
  flexWrap: "wrap",
  color: "#e5e7eb",
  background: "rgba(15,23,42,0.42)",
  border: "1px solid rgba(53,208,195,0.22)",
  borderRadius: "20px",
  padding: "18px",
  backdropFilter: "blur(16px)"
};

const heroDashboard = {
  position: "absolute",
  right: "7vw",
  bottom: "95px",
  width: "360px",
  background: "rgba(15,23,42,0.54)",
  border: "1px solid rgba(53,208,195,0.28)",
  borderRadius: "30px",
  padding: "28px",
  backdropFilter: "blur(24px)",
  zIndex: 2,
  animation: "floatSoft 6s ease-in-out infinite, glowPulse 4s infinite"
};

const dashboardTop = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "22px",
  color: "#e5e7eb",
  fontWeight: "800"
};

const liveBadge = {
  color: "#35d0c3",
  background: "rgba(53,208,195,0.12)",
  padding: "5px 10px",
  borderRadius: "999px"
};

const riskCircle = {
  width: "132px",
  height: "132px",
  margin: "0 auto 12px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #35d0c3, #7c3aed)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  fontSize: "44px",
  fontWeight: "900"
};

const riskText = {
  color: "#cbd5e1",
  textAlign: "center",
  marginBottom: "18px"
};

const progressTrack = {
  height: "10px",
  width: "100%",
  background: "rgba(148,163,184,0.18)",
  borderRadius: "999px",
  overflow: "hidden",
  marginBottom: "20px"
};

const progressFill = {
  height: "100%",
  width: "96%",
  background: "linear-gradient(90deg, #35d0c3, #7c3aed)"
};

const miniRows = {
  display: "grid",
  gap: "10px",
  color: "#cbd5e1"
};

const eyebrow = {
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "13px",
  fontWeight: "900",
  textTransform: "uppercase"
};

const eyebrowCenter = {
  ...eyebrow,
  textAlign: "center"
};

const section = {
  padding: "100px 7vw"
};

const sectionGrid = {
  padding: "100px 7vw",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "32px"
};

const glassCard = {
  background: "rgba(17, 24, 39, 0.58)",
  border: "1px solid rgba(53,208,195,0.22)",
  borderRadius: "30px",
  padding: "44px",
  fontSize: "18px",
  lineHeight: "30px",
  backdropFilter: "blur(18px)"
};

const visionCard = {
  background: "linear-gradient(135deg, rgba(15,23,42,0.78), rgba(17,24,39,0.54))",
  border: "1px solid rgba(53,208,195,0.42)",
  borderRadius: "30px",
  padding: "44px",
  fontSize: "20px",
  lineHeight: "32px",
  backdropFilter: "blur(18px)"
};

const visionGrid = {
  marginTop: "22px",
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "12px"
};

const sectionTitleLeft = {
  fontSize: "clamp(34px, 3vw, 56px)",
  lineHeight: "1.08",
  letterSpacing: "-1.8px",
  marginBottom: "22px",
  fontWeight: "900"
};

const centerTitle = {
  textAlign: "center",
  fontSize: "clamp(34px, 3.4vw, 58px)",
  lineHeight: "1.1",
  letterSpacing: "-1.8px",
  marginBottom: "48px",
  fontWeight: "900"
};

const cardsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: "24px"
};

const featureCard = {
  background: "rgba(15,23,42,0.64)",
  border: "1px solid rgba(53,208,195,0.18)",
  borderRadius: "26px",
  padding: "34px",
  textAlign: "center",
  backdropFilter: "blur(18px)"
};

const featureIcon = {
  fontSize: "48px"
};

const escrowSection = {
  padding: "100px 7vw",
  display: "grid",
  gridTemplateColumns: "1.3fr 0.7fr",
  gap: "34px",
  alignItems: "center",
  background:
    "linear-gradient(135deg, rgba(2,6,23,1), rgba(8,17,35,0.94))"
};

const escrowContent = {
  maxWidth: "900px"
};

const escrowText = {
  color: "#cbd5e1",
  fontSize: "19px",
  lineHeight: "32px"
};

const flowGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: "18px",
  marginTop: "28px"
};

const flowCard = {
  background: "rgba(15,23,42,0.64)",
  border: "1px solid rgba(53,208,195,0.22)",
  borderRadius: "22px",
  padding: "24px",
  textAlign: "center"
};

const escrowPanel = {
  background: "rgba(15,23,42,0.64)",
  border: "1px solid rgba(53,208,195,0.34)",
  borderRadius: "30px",
  padding: "34px",
  backdropFilter: "blur(18px)"
};

const transactionRow = {
  display: "flex",
  justifyContent: "space-between",
  padding: "16px 0",
  borderBottom: "1px solid rgba(148,163,184,0.16)"
};

const stepsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "22px"
};

const stepCard = {
  background: "rgba(15,23,42,0.64)",
  border: "1px solid rgba(53,208,195,0.22)",
  borderRadius: "24px",
  padding: "28px",
  textAlign: "center",
  backdropFilter: "blur(18px)"
};

const stepCircle = {
  width: "52px",
  height: "52px",
  margin: "0 auto 14px",
  borderRadius: "50%",
  background: "#35d0c3",
  color: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900"
};

const simulationSection = {
  padding: "100px 7vw"
};

const simulationCard = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "34px",
  alignItems: "center",
  background: "rgba(15,23,42,0.58)",
  border: "1px solid rgba(53,208,195,0.25)",
  borderRadius: "32px",
  padding: "48px",
  backdropFilter: "blur(18px)"
};

const demoText = {
  color: "#cbd5e1",
  fontSize: "18px",
  lineHeight: "30px",
  marginBottom: "28px"
};

const mockupBox = {
  background: "rgba(2,6,23,0.78)",
  border: "1px solid rgba(53,208,195,0.25)",
  borderRadius: "24px",
  padding: "20px",
  minHeight: "280px"
};

const mockupTop = {
  color: "#e5e7eb",
  fontWeight: "800",
  marginBottom: "18px",
  display: "flex",
  justifyContent: "space-between"
};

const mockupHero = {
  height: "90px",
  borderRadius: "18px",
  background: "linear-gradient(135deg, rgba(53,208,195,0.24), rgba(124,58,237,0.24))",
  marginBottom: "16px"
};

const mockupGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "14px"
};

const mockupCard = {
  height: "130px",
  borderRadius: "16px",
  background: "linear-gradient(135deg, rgba(53,208,195,0.16), rgba(124,58,237,0.16))",
  border: "1px solid rgba(53,208,195,0.15)"
};

const stats = {
  margin: "40px 7vw",
  padding: "40px",
  background: "rgba(15,23,42,0.64)",
  border: "1px solid rgba(53,208,195,0.2)",
  borderRadius: "28px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "24px",
  textAlign: "center",
  backdropFilter: "blur(18px)"
};

const contactSection = {
  padding: "100px 7vw",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: "36px",
  background: "#08111f"
};

const input = {
  width: "100%",
  padding: "16px",
  marginBottom: "14px",
  borderRadius: "14px",
  border: "1px solid #334155",
  background: "#020617",
  color: "white",
  fontFamily: "'Inter', system-ui, sans-serif"
};

const contactCard = {
  background: "rgba(15,23,42,0.64)",
  border: "1px solid #35d0c3",
  borderRadius: "26px",
  padding: "40px",
  backdropFilter: "blur(18px)"
};

const footer = {
  padding: "46px 7vw",
  background: "#020617",
  color: "#94a3b8"
};

export default LandingPage;