import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import AiAssistant from "../components/AiAssistant";

const heroSlides = [
  {
    title: "Compra y vende con confianza.",
    highlight: "confianza.",
    text: "QSM protege tus compras con identidad verificada, Pago Protegido y análisis antifraude para reducir estafas en transacciones digitales.",
    image:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2400&q=90",
    meta: "Santo Domingo Futurista"
  },
  {
    title: "Tecnología segura para todos.",
    highlight: "segura",
    text: "Compra celulares, laptops y equipos tecnológicos con vendedores verificados, historial del producto y protección QSM.",
    image:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=2400&q=90",
    meta: "Tecnología protegida"
  },
  {
    title: "Gaming con pago protegido.",
    highlight: "protegido.",
    text: "Compra consolas, accesorios y equipos gaming con validación, evidencia y retención segura del pago.",
    image:
      "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=2400&q=90",
    meta: "Gaming seguro"
  },
  {
    title: "Vehículos con más confianza.",
    highlight: "confianza.",
    text: "Publica y compra vehículos con información clara, identidad del vendedor y herramientas de protección.",
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2400&q=90",
    meta: "Vehículos verificados"
  },
  {
    title: "Compras digitales más seguras.",
    highlight: "seguras.",
    text: "QSM ayuda a compradores y vendedores a realizar transacciones digitales con menor riesgo.",
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=2400&q=90",
    meta: "Compras inteligentes"
  }
];

const securityCards = [
  {
    icon: "🧾",
    title: "Verificación de identidad",
    text: "Validamos compradores y vendedores para aumentar la confianza dentro de la plataforma."
  },
  {
    icon: "🖼️",
    title: "Validación inteligente de imágenes",
    text: "QSM revisa señales visuales para detectar productos sospechosos o publicaciones incompletas."
  },
  {
    icon: "📉",
    title: "Análisis de precio",
    text: "Detectamos precios demasiado bajos o incoherentes que puedan indicar riesgo."
  },
  {
    icon: "⭐",
    title: "Puntuación de confianza",
    text: "Cada usuario obtiene una puntuación basada en su perfil, historial y comportamiento."
  },
  {
    icon: "📦",
    title: "Identificador QSM",
    text: "Cada producto tiene un código único para trazabilidad durante la compra."
  },
  {
    icon: "⚖️",
    title: "Centro de reclamaciones",
    text: "Si ocurre un problema, QSM permite documentar el caso y revisar evidencias."
  }
];

const categories = [
  {
    title: "Tecnología",
    image:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Gaming",
    image:
      "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Vehículos",
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80"
  },
  {
    title: "Hogar y compras",
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80"
  }
];

function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem("qsm_theme") || "dark");

  const isDark = theme === "dark";
  const slide = heroSlides[currentSlide];

  useEffect(() => {
    localStorage.setItem("qsm_theme", theme);
    document.documentElement.setAttribute("data-qsm-theme", theme);
  }, [theme]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 7500);

    return () => clearInterval(timer);
  }, []);

  const goToSection = (id) => {
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={page(isDark)}>
      <style>{`

      .admin-access-button:hover {
  border-color: rgba(250, 204, 21, 0.8) !important;
  box-shadow:
    0 16px 44px rgba(250, 204, 21, 0.14),
    0 0 26px rgba(250, 204, 21, 0.08) !important;
}

@media (max-width: 1380px) {
  .admin-access-label {
    display: none;
  }

  .admin-access-button {
    width: 48px !important;
    min-width: 48px !important;
    padding: 10px !important;
  }
}

@media (max-width: 950px) {
  .topbar {
    gap: 12px !important;
  }

  .admin-access-button {
    display: inline-flex !important;
  }
}

@media (max-width: 760px) {
  .admin-access-button {
    display: none !important;
  }
}
        * { box-sizing: border-box; }

        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          overflow-x: hidden;
          scroll-behavior: smooth;
          font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
        }

        body {
          background: ${isDark ? "#020617" : "#f8fafc"};
        }

        a, button {
          font-family: inherit;
          transition: all .25s ease;
        }

        a:hover, button:hover {
          transform: translateY(-2px);
        }

        @keyframes slowZoom {
          0% { transform: scale(1); }
          100% { transform: scale(1.08); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(26px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes glowLine {
          0%,100% { width: 26px; opacity: .6; }
          50% { width: 52px; opacity: 1; }
        }

        .hero-bg {
          animation: slowZoom 16s ease-in-out alternate infinite;
        }

        .nav-active::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -14px;
          transform: translateX(-50%);
          height: 3px;
          width: 42px;
          border-radius: 999px;
          background: linear-gradient(90deg, #38bdf8, #8b5cf6, #ec4899);
          box-shadow: 0 0 24px rgba(139,92,246,.75);
          animation: glowLine 2.5s ease-in-out infinite;
        }

        @media (max-width: 1100px) {
          .desktop-nav { display: none !important; }
          .hero-dashboard { display: none !important; }
          .hero-content { max-width: 100% !important; }
          .escrow-section { grid-template-columns: 1fr !important; }
          .demo-section { grid-template-columns: 1fr !important; }
        }

        @media (max-width: 760px) {
          .topbar { padding: 14px 18px !important; height: auto !important; }
          .hero { padding: 130px 22px 70px !important; }
          .hero-title { font-size: 48px !important; }
          .hero-buttons { flex-direction: column !important; }
          .features-grid, .category-grid, .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <header className="topbar" style={topbar(isDark)}>
        <Link to="/" style={brand}>
          <div style={logoIcon(isDark)}>🛡</div>
          <div>
            <strong style={logoText(isDark)}>QSM</strong>
            <span style={logoSub(isDark)}>Quick Secure Market</span>
          </div>
        </Link>

        <nav className="desktop-nav" style={navLinks}>
          <button className="nav-active" onClick={() => goToSection("#inicio")} style={navButton(isDark)}>
            Inicio
          </button>
          <button onClick={() => goToSection("#nosotros")} style={navButton(isDark)}>
            Nosotros
          </button>
          <button onClick={() => goToSection("#seguridad")} style={navButton(isDark)}>
            Seguridad
          </button>
          <button onClick={() => goToSection("#pago-protegido")} style={navButton(isDark)}>
            Pago Protegido
          </button>
          <button onClick={() => goToSection("#demo")} style={navButton(isDark)}>
            Demo
          </button>
          <button onClick={() => goToSection("#contacto")} style={navButton(isDark)}>
            Contacto
          </button>
        </nav>

         <div style={navActions}>
           <button
             type="button"
           onClick={() => setTheme(isDark ? "light" : "dark")}
           style={themeToggle(isDark)}
           title="Cambiar tema"
  >
           {isDark ? "☀️" : "🌙"}
         </button>

          <Link
            to="/admin/login"
          className="admin-access-button"
         style={adminAccessButton(isDark)}
         title="Acceso exclusivo para personal autorizado"
      >
    <span style={adminAccessIcon}>🛡</span>

    <span className="admin-access-label">
      Acceso administrativo
    </span>
  </Link>

  <Link to="/login" style={loginButton(isDark)}>
    Iniciar sesión
  </Link>

  <Link to="/register" style={registerButton}>
    Crear cuenta
        </Link>
      </div>
      </header>

      <main>
        <section id="inicio" className="hero" style={hero}>
          <div
            key={currentSlide}
            className="hero-bg"
            style={{
              ...heroBg,
              backgroundImage: `
                linear-gradient(90deg, ${
                  isDark
                    ? "rgba(2,6,23,.96), rgba(2,6,23,.74), rgba(2,6,23,.26)"
                    : "rgba(248,250,252,.96), rgba(248,250,252,.74), rgba(248,250,252,.20)"
                }),
                url(${slide.image})
              `
            }}
          />

          <div style={heroGlow(isDark)} />

          <div className="hero-content" style={heroContent}>
            <p style={eyebrow}>MARKETPLACE SEGURO EN REPÚBLICA DOMINICANA</p>

            <h1 className="hero-title" style={heroTitle(isDark)}>
              {renderTitle(slide.title, slide.highlight)}
            </h1>

            <p style={heroText(isDark)}>{slide.text}</p>

            <div className="hero-buttons" style={heroButtons}>
              <Link to="/register" style={primaryLarge}>
                Crear cuenta segura →
              </Link>

              <button onClick={() => goToSection("#demo")} style={outlineLarge(isDark)}>
                Ver demostración ▷
              </button>
            </div>

            <div style={trustRow(isDark)}>
              <span>🛡 Identidad validada</span>
              <span>💰 Pago retenido</span>
              <span>🤖 IA antifraude</span>
              <span>📦 Código QSM</span>
            </div>
          </div>

          <div className="hero-dashboard" style={heroDashboard(isDark)}>
            <div style={dashboardTop}>
              <strong>QSM Risk Engine</strong>
              <span style={liveBadge}>Activo</span>
            </div>

            <div style={riskCircle}>
              <strong>96</strong>
              <small>/100</small>
            </div>

            <p style={riskText(isDark)}>Nivel de confianza estimado</p>

            <div style={progressTrack}>
              <div style={progressFill}></div>
            </div>

            <div style={miniRows(isDark)}>
              <span>✅ Identidad verificada</span>
              <span>✅ Pago Protegido habilitado</span>
              <span>✅ Historial disponible</span>
              <span>✅ IA antifraude activa</span>
              <span>✅ Producto rastreable</span>
            </div>
          </div>

          <div style={sliderDots}>
            {heroSlides.map((item, index) => (
              <button
                key={item.meta}
                onClick={() => setCurrentSlide(index)}
                style={index === currentSlide ? activeDot : dot(isDark)}
                aria-label={`Ver slide ${index + 1}`}
              />
            ))}
          </div>
        </section>

        <section id="seguridad" style={section(isDark)}>
          <p style={eyebrowCenter}>TECNOLOGÍA + SEGURIDAD + CONFIANZA</p>
          <h2 style={centerTitle(isDark)}>
            Un ecosistema diseñado para <span style={accent}>protegerte</span>
          </h2>

          <div className="features-grid" style={featuresGrid}>
            {securityCards.map((card) => (
              <article key={card.title} style={featureCard(isDark)}>
                <div style={featureIcon(isDark)}>{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="nosotros" style={aboutSection(isDark)}>
          <div style={aboutCard(isDark)}>
            <p style={eyebrow}>SOBRE QSM</p>
            <h2 style={sectionTitle(isDark)}>¿Por qué nació Quick Secure Market?</h2>
            <p style={sectionText(isDark)}>
              Quick Secure Market nace como una respuesta a un problema real: muchas personas en República Dominicana compran y venden productos por internet sin una protección clara.
            </p>
            <p style={sectionText(isDark)}>
              QSM busca reducir fraudes digitales mediante verificación de identidad, historial del producto, Pago Protegido, análisis de riesgo y un centro de reclamaciones documentado.
            </p>
            <button onClick={() => goToSection("#demo")} style={primaryLarge}>
              Conocer el proyecto →
            </button>
          </div>

          <div style={aboutImageCard(isDark)}>
            <div style={aboutImageOverlay}></div>
            <h3>Confianza digital para una nueva forma de comprar y vender.</h3>
          </div>
        </section>

        <section id="pago-protegido" className="escrow-section" style={escrowSection(isDark)}>
          <div>
            <p style={eyebrow}>PAGO PROTEGIDO</p>
            <h2 style={sectionTitle(isDark)}>
              El dinero no va directo al vendedor. Primero lo protege QSM.
            </h2>
            <p style={sectionText(isDark)}>
              El comprador paga, QSM retiene el dinero, el vendedor entrega el producto y solo después de la confirmación se libera el pago.
            </p>

            <div style={flowGrid}>
              {[
                ["1", "Comprador paga"],
                ["2", "QSM retiene"],
                ["3", "Producto entregado"],
                ["4", "Pago liberado"]
              ].map((step) => (
                <div key={step[0]} style={flowCard(isDark)}>
                  <strong>{step[0]}</strong>
                  <span>{step[1]}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={transactionCard(isDark)}>
            <h3>Estado de transacción</h3>
            <Transaction label="Pago" value="Retenido en garantía" />
            <Transaction label="Producto" value="En verificación" />
            <Transaction label="Riesgo" value="Bajo" green />
            <Transaction label="PIN entrega" value="******" />
          </div>
        </section>

        <section id="como-funciona" style={section(isDark)}>
          <p style={eyebrowCenter}>PROCESO QSM</p>
          <h2 style={centerTitle(isDark)}>Cómo funciona la plataforma</h2>

          <div style={stepsGrid}>
            {[
              ["1", "Registro", "El usuario crea su cuenta."],
              ["2", "Verificación", "QSM valida identidad y documentos."],
              ["3", "Publicación", "El vendedor publica el producto."],
              ["4", "Compra protegida", "El pago queda retenido por QSM."],
              ["5", "Entrega", "El comprador confirma recepción."],
              ["6", "Liberación", "QSM libera el dinero al vendedor."]
            ].map((step) => (
              <article key={step[0]} style={stepCard(isDark)}>
                <div style={stepCircle}>{step[0]}</div>
                <h3>{step[1]}</h3>
                <p>{step[2]}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="demo" className="demo-section" style={demoSection(isDark)}>
          <div>
            <p style={eyebrow}>MODO DEMOSTRACIÓN</p>
            <h2 style={sectionTitle(isDark)}>
              Explora cómo funcionará Quick Secure Market.
            </h2>
            <p style={sectionText(isDark)}>
              Accede a una simulación funcional con marketplace, publicación de productos, checkout seguro, órdenes, disputas, certificación QSM y panel administrativo.
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

          <div style={demoPreview(isDark)}>
            <div style={demoTop}>
              <strong>QSM Platform Preview</strong>
              <span>Demo</span>
            </div>
            <div style={demoMockHero}></div>
            <div style={demoMockGrid}>
              <div></div>
              <div></div>
              <div></div>
            </div>
          </div>
        </section>

        <section style={statsBar(isDark)}>
          <Stat value="12K+" label="Usuarios proyectados" />
          <Stat value="8K+" label="Productos protegidos" />
          <Stat value="2K+" label="Fraudes prevenidos" />
          <Stat value="98%" label="Confianza estimada" />
        </section>

        <section style={section(isDark)}>
          <p style={eyebrowCenter}>CATÁLOGO SEGURO</p>
          <h2 style={centerTitle(isDark)}>
            Encuentra lo que necesitas con <span style={accent}>total seguridad</span>
          </h2>

          <div className="category-grid" style={categoryGrid}>
            {categories.map((category) => (
              <article
                key={category.title}
                style={{
                  ...categoryCard,
                  backgroundImage: `linear-gradient(180deg, rgba(2,6,23,.10), rgba(2,6,23,.86)), url(${category.image})`
                }}
              >
                <h3>{category.title}</h3>
              </article>
            ))}
          </div>
        </section>

        <section id="contacto" style={contactSection(isDark)}>
          <div>
            <p style={eyebrow}>CONTACTO</p>
            <h2 style={sectionTitle(isDark)}>Hablemos de seguridad digital.</h2>
            <p style={sectionText(isDark)}>
              ¿Tienes preguntas sobre Quick Secure Market o quieres conocer más sobre el proyecto?
            </p>

            <input placeholder="Nombre completo" style={input(isDark)} />
            <input placeholder="Correo electrónico" style={input(isDark)} />
            <textarea placeholder="Mensaje" style={{ ...input(isDark), height: "130px" }} />
            <button style={primaryLarge}>Enviar mensaje</button>
          </div>

          <div style={contactCard(isDark)}>
            <h3>Soporte QSM</h3>
            <p>📧 soporte@qsm.com</p>
            <p>📍 Santo Domingo, República Dominicana</p>
            <p>🕘 Lunes a viernes: 9:00 AM - 6:00 PM</p>
            <p>Proyecto académico orientado a comercio electrónico seguro y prevención de fraudes digitales.</p>
          </div>
        </section>
      </main>

      <footer style={footer(isDark)}>
        <div className="footer-grid" style={footerGrid}>
          <div>
            <h2>🛡 QSM</h2>
            <p>Marketplace seguro en República Dominicana.</p>
          </div>

          <div>
            <h3>Enlaces rápidos</h3>
            <p>Inicio</p>
            <p>Nosotros</p>
            <p>Seguridad</p>
            <p>Pago Protegido</p>
          </div>

          <div>
            <h3>Soporte</h3>
            <p>Centro de ayuda</p>
            <p>Guías de seguridad</p>
            <p>Políticas</p>
            <p>Términos y condiciones</p>
          </div>

          <div>
            <h3>Contacto</h3>
            <p>📧 soporte@qsm.com</p>
            <p>📍 Santo Domingo, RD</p>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: "34px" }}>
          © 2026 Quick Secure Market. Todos los derechos reservados.
        </p>
      </footer>

      <AiAssistant pageContext="landing" />
    </div>
  );
}

function renderTitle(title, highlight) {
  const parts = title.split(highlight);

  if (parts.length === 1) return title;

  return (
    <>
      {parts[0]}
      <span style={accent}>{highlight}</span>
      {parts[1]}
    </>
  );
}

function Transaction({ label, value, green }) {
  return (
    <div style={transactionRow}>
      <span>{label}</span>
      <strong style={{ color: green ? "#86efac" : "inherit" }}>{value}</strong>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <h2>{value}</h2>
      <p>{label}</p>
    </div>
  );
}

const page = (dark) => ({
  width: "100%",
  minHeight: "100vh",
  background: dark ? "#020617" : "#f8fafc",
  color: dark ? "white" : "#0f172a"
});

const topbar = (dark) => ({
  width: "100%",
  height: "78px",
  padding: "0 7vw",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "24px",
  background: dark ? "rgba(2,6,23,.72)" : "rgba(255,255,255,.82)",
  borderBottom: dark ? "1px solid rgba(148,163,184,.14)" : "1px solid rgba(15,23,42,.08)",
  backdropFilter: "blur(22px)",
  position: "fixed",
  top: 0,
  left: 0,
  zIndex: 50
});

const brand = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  textDecoration: "none"
};

const logoIcon = (dark) => ({
  width: "42px",
  height: "42px",
  borderRadius: "14px",
  border: dark ? "1px solid rgba(139,92,246,.55)" : "1px solid rgba(124,58,237,.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: dark ? "rgba(139,92,246,.12)" : "rgba(124,58,237,.08)"
});

const logoText = (dark) => ({
  color: dark ? "white" : "#0f172a",
  fontSize: "29px",
  fontWeight: "900",
  display: "block",
  lineHeight: "28px"
});

const logoSub = (dark) => ({
  color: dark ? "#94a3b8" : "#64748b",
  fontSize: "11px",
  fontWeight: "700"
});

const navLinks = {
  display: "flex",
  gap: "26px",
  alignItems: "center"
};

const navButton = (dark) => ({
  position: "relative",
  border: "none",
  background: "transparent",
  color: dark ? "#e5e7eb" : "#334155",
  fontSize: "15px",
  fontWeight: "800",
  cursor: "pointer"
});

const navActions = {
  display: "flex",
  gap: "12px",
  alignItems: "center"
};

const themeToggle = (dark) => ({
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  border: dark ? "1px solid rgba(148,163,184,.18)" : "1px solid rgba(15,23,42,.12)",
  background: dark ? "rgba(15,23,42,.72)" : "white",
  color: dark ? "white" : "#0f172a",
  cursor: "pointer"
});

const adminAccessButton = (dark) => ({
  minHeight: "48px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "9px",
  padding: "12px 18px",
  borderRadius: "14px",
  textDecoration: "none",
  whiteSpace: "nowrap",
  fontSize: "14px",
  fontWeight: "900",

  color: dark ? "#fde68a" : "#92400e",

  background: dark
    ? "linear-gradient(135deg, rgba(250,204,21,.10), rgba(245,158,11,.06))"
    : "linear-gradient(135deg, rgba(250,204,21,.18), rgba(245,158,11,.10))",

  border: dark
    ? "1px solid rgba(250,204,21,.40)"
    : "1px solid rgba(202,138,4,.30)",

  boxShadow: dark
    ? "0 12px 34px rgba(250,204,21,.08)"
    : "0 12px 34px rgba(146,64,14,.08)",

  backdropFilter: "blur(14px)"
});

const adminAccessIcon = {
  width: "26px",
  height: "26px",
  borderRadius: "9px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(250,204,21,.12)",
  fontSize: "15px"
};

const loginButton = (dark) => ({
  color: dark ? "white" : "#0f172a",
  textDecoration: "none",
  padding: "14px 20px",
  borderRadius: "14px",
  border: dark ? "1px solid rgba(139,92,246,.45)" : "1px solid rgba(15,23,42,.14)",
  fontWeight: "900"
});

const registerButton = {
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",
  color: "white",
  textDecoration: "none",
  padding: "15px 22px",
  borderRadius: "14px",
  fontWeight: "900",
  boxShadow: "0 16px 46px rgba(139,92,246,.34)"
};

const hero = {
  minHeight: "100vh",
  position: "relative",
  display: "flex",
  alignItems: "center",
  overflow: "hidden",
  padding: "120px 7vw 70px"
};

const heroBg = {
  position: "absolute",
  inset: 0,
  backgroundSize: "cover",
  backgroundPosition: "center"
};

const heroGlow = (dark) => ({
  position: "absolute",
  inset: 0,
  background: dark
    ? "radial-gradient(circle at 78% 40%, rgba(139,92,246,.35), transparent 34%), radial-gradient(circle at 22% 70%, rgba(56,189,248,.16), transparent 28%)"
    : "radial-gradient(circle at 78% 40%, rgba(139,92,246,.20), transparent 34%), radial-gradient(circle at 22% 70%, rgba(56,189,248,.12), transparent 28%)"
});

const heroContent = {
  position: "relative",
  zIndex: 2,
  maxWidth: "680px",
  animation: "fadeUp .8s ease"
};

const eyebrow = {
  color: "#38bdf8",
  letterSpacing: "4px",
  fontSize: "13px",
  fontWeight: "900",
  textTransform: "uppercase"
};

const eyebrowCenter = {
  ...eyebrow,
  textAlign: "center"
};

const heroTitle = (dark) => ({
  color: dark ? "white" : "#0f172a",
  fontSize: "clamp(52px, 5vw, 84px)",
  lineHeight: "1.02",
  letterSpacing: "-3px",
  margin: "16px 0 20px",
  fontWeight: "950"
});

const accent = {
  background: "linear-gradient(90deg, #38bdf8, #8b5cf6, #ec4899)",
  WebkitBackgroundClip: "text",
  color: "transparent"
};

const heroText = (dark) => ({
  color: dark ? "#cbd5e1" : "#475569",
  fontSize: "19px",
  lineHeight: "32px",
  maxWidth: "620px"
});

const heroButtons = {
  display: "flex",
  gap: "14px",
  marginTop: "30px",
  flexWrap: "wrap"
};

const primaryLarge = {
  display: "inline-block",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",
  color: "white",
  textDecoration: "none",
  padding: "16px 28px",
  borderRadius: "14px",
  fontWeight: "900",
  border: "none",
  cursor: "pointer",
  boxShadow: "0 18px 54px rgba(139,92,246,.30)"
};

const outlineLarge = (dark) => ({
  display: "inline-block",
  color: dark ? "white" : "#0f172a",
  background: dark ? "rgba(15,23,42,.58)" : "rgba(255,255,255,.75)",
  textDecoration: "none",
  padding: "16px 28px",
  borderRadius: "14px",
  border: dark ? "1px solid rgba(148,163,184,.24)" : "1px solid rgba(15,23,42,.12)",
  fontWeight: "900",
  cursor: "pointer",
  backdropFilter: "blur(14px)"
});

const trustRow = (dark) => ({
  display: "flex",
  gap: "14px",
  flexWrap: "wrap",
  marginTop: "30px",
  padding: "14px",
  borderRadius: "18px",
  background: dark ? "rgba(15,23,42,.56)" : "rgba(255,255,255,.76)",
  border: dark ? "1px solid rgba(148,163,184,.14)" : "1px solid rgba(15,23,42,.08)",
  color: dark ? "#e5e7eb" : "#334155",
  backdropFilter: "blur(14px)"
});

const heroDashboard = (dark) => ({
  position: "absolute",
  right: "7vw",
  bottom: "88px",
  width: "360px",
  background: dark ? "rgba(15,23,42,.64)" : "rgba(255,255,255,.76)",
  color: dark ? "white" : "#0f172a",
  border: dark ? "1px solid rgba(139,92,246,.30)" : "1px solid rgba(15,23,42,.10)",
  borderRadius: "30px",
  padding: "28px",
  backdropFilter: "blur(22px)",
  zIndex: 3,
  boxShadow: "0 30px 90px rgba(0,0,0,.32)"
});

const dashboardTop = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "22px"
};

const liveBadge = {
  color: "#35d0c3",
  background: "rgba(53,208,195,.14)",
  padding: "5px 10px",
  borderRadius: "999px"
};

const riskCircle = {
  width: "132px",
  height: "132px",
  margin: "0 auto 12px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #38bdf8, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  fontSize: "42px"
};

const riskText = (dark) => ({
  color: dark ? "#cbd5e1" : "#475569",
  textAlign: "center"
});

const progressTrack = {
  height: "10px",
  background: "rgba(148,163,184,.22)",
  borderRadius: "999px",
  overflow: "hidden",
  marginBottom: "20px"
};

const progressFill = {
  width: "96%",
  height: "100%",
  background: "linear-gradient(90deg, #38bdf8, #8b5cf6, #ec4899)"
};

const miniRows = (dark) => ({
  display: "grid",
  gap: "10px",
  color: dark ? "#cbd5e1" : "#475569"
});

const sliderDots = {
  position: "absolute",
  bottom: "34px",
  left: "50%",
  transform: "translateX(-50%)",
  display: "flex",
  gap: "10px",
  zIndex: 4
};

const dot = (dark) => ({
  width: "11px",
  height: "11px",
  borderRadius: "50%",
  border: "none",
  background: dark ? "rgba(255,255,255,.35)" : "rgba(15,23,42,.25)",
  cursor: "pointer"
});

const activeDot = {
  width: "44px",
  height: "11px",
  borderRadius: "999px",
  border: "none",
  background: "linear-gradient(90deg, #38bdf8, #8b5cf6, #ec4899)",
  cursor: "pointer"
};

const section = (dark) => ({
  padding: "90px 7vw",
  background: dark ? "#020617" : "#f8fafc"
});

const centerTitle = (dark) => ({
  textAlign: "center",
  color: dark ? "white" : "#0f172a",
  fontSize: "clamp(34px, 3.4vw, 58px)",
  lineHeight: "1.08",
  letterSpacing: "-2px",
  marginBottom: "42px"
});

const featuresGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
  gap: "22px"
};

const featureCard = (dark) => ({
  background: dark ? "rgba(15,23,42,.72)" : "white",
  border: dark ? "1px solid rgba(139,92,246,.18)" : "1px solid rgba(15,23,42,.08)",
  borderRadius: "26px",
  padding: "28px",
  color: dark ? "#cbd5e1" : "#475569",
  boxShadow: dark ? "none" : "0 20px 70px rgba(15,23,42,.08)"
});

const featureIcon = (dark) => ({
  fontSize: "34px",
  width: "58px",
  height: "58px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "20px",
  background: dark ? "rgba(139,92,246,.16)" : "rgba(139,92,246,.10)",
  marginBottom: "14px"
});

const aboutSection = (dark) => ({
  padding: "90px 7vw",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "28px",
  background: dark ? "#050b1f" : "#eef2ff"
});

const aboutCard = (dark) => ({
  background: dark ? "rgba(15,23,42,.74)" : "rgba(255,255,255,.86)",
  color: dark ? "white" : "#0f172a",
  border: dark ? "1px solid rgba(56,189,248,.22)" : "1px solid rgba(15,23,42,.08)",
  borderRadius: "30px",
  padding: "44px"
});

const aboutImageCard = (dark) => ({
  position: "relative",
  minHeight: "420px",
  borderRadius: "30px",
  padding: "44px",
  overflow: "hidden",
  display: "flex",
  alignItems: "flex-end",
  color: "white",
  backgroundImage:
    "linear-gradient(180deg, rgba(2,6,23,.05), rgba(2,6,23,.82)), url(https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1600&q=90)",
  backgroundSize: "cover",
  backgroundPosition: "center"
});

const aboutImageOverlay = {
  position: "absolute",
  inset: 0,
  background: "radial-gradient(circle at center, rgba(139,92,246,.24), transparent 55%)"
};

const sectionTitle = (dark) => ({
  color: dark ? "white" : "#0f172a",
  fontSize: "clamp(34px, 3vw, 56px)",
  lineHeight: "1.08",
  letterSpacing: "-2px",
  margin: "10px 0 20px"
});

const sectionText = (dark) => ({
  color: dark ? "#cbd5e1" : "#475569",
  fontSize: "18px",
  lineHeight: "31px"
});

const escrowSection = (dark) => ({
  padding: "90px 7vw",
  display: "grid",
  gridTemplateColumns: "1.2fr .8fr",
  gap: "34px",
  alignItems: "center",
  background: dark
    ? "linear-gradient(135deg, #020617, #08111f)"
    : "linear-gradient(135deg, #f8fafc, #e0f2fe)"
});

const flowGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "16px",
  marginTop: "28px"
};

const flowCard = (dark) => ({
  background: dark ? "rgba(15,23,42,.74)" : "rgba(255,255,255,.86)",
  border: dark ? "1px solid rgba(56,189,248,.22)" : "1px solid rgba(15,23,42,.08)",
  borderRadius: "22px",
  padding: "24px",
  textAlign: "center",
  color: dark ? "white" : "#0f172a",
  display: "grid",
  gap: "10px"
});

const transactionCard = (dark) => ({
  background: dark ? "rgba(15,23,42,.74)" : "rgba(255,255,255,.88)",
  border: dark ? "1px solid rgba(56,189,248,.26)" : "1px solid rgba(15,23,42,.08)",
  borderRadius: "30px",
  padding: "34px",
  color: dark ? "white" : "#0f172a"
});

const transactionRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  padding: "16px 0",
  borderBottom: "1px solid rgba(148,163,184,.18)"
};

const stepsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "20px"
};

const stepCard = (dark) => ({
  background: dark ? "rgba(15,23,42,.72)" : "white",
  border: dark ? "1px solid rgba(139,92,246,.18)" : "1px solid rgba(15,23,42,.08)",
  borderRadius: "24px",
  padding: "28px",
  textAlign: "center",
  color: dark ? "#cbd5e1" : "#475569"
});

const stepCircle = {
  width: "52px",
  height: "52px",
  borderRadius: "50%",
  margin: "0 auto 14px",
  background: "#35d0c3",
  color: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "900"
};

const demoSection = (dark) => ({
  padding: "90px 7vw",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "34px",
  alignItems: "center",
  background: dark ? "#050b1f" : "#eef2ff"
});

const demoPreview = (dark) => ({
  background: dark ? "rgba(15,23,42,.74)" : "rgba(255,255,255,.86)",
  border: dark ? "1px solid rgba(139,92,246,.24)" : "1px solid rgba(15,23,42,.08)",
  borderRadius: "28px",
  padding: "24px",
  minHeight: "310px"
});

const demoTop = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "18px"
};

const demoMockHero = {
  height: "100px",
  borderRadius: "18px",
  background: "linear-gradient(135deg, rgba(56,189,248,.30), rgba(139,92,246,.28), rgba(236,72,153,.22))",
  marginBottom: "18px"
};

const demoMockGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "14px"
};

const statsBar = (dark) => ({
  margin: "40px 7vw",
  padding: "36px",
  borderRadius: "28px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "20px",
  textAlign: "center",
  background: dark ? "rgba(15,23,42,.72)" : "white",
  border: dark ? "1px solid rgba(139,92,246,.18)" : "1px solid rgba(15,23,42,.08)",
  color: dark ? "white" : "#0f172a"
});

const categoryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "20px"
};

const categoryCard = {
  minHeight: "250px",
  borderRadius: "24px",
  padding: "24px",
  backgroundSize: "cover",
  backgroundPosition: "center",
  display: "flex",
  alignItems: "flex-end",
  color: "white",
  fontSize: "22px",
  fontWeight: "900",
  overflow: "hidden"
};

const contactSection = (dark) => ({
  padding: "90px 7vw",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "34px",
  background: dark ? "#08111f" : "#f8fafc"
});

const input = (dark) => ({
  width: "100%",
  padding: "16px",
  marginBottom: "14px",
  borderRadius: "14px",
  border: dark ? "1px solid rgba(148,163,184,.24)" : "1px solid rgba(15,23,42,.12)",
  background: dark ? "#020617" : "white",
  color: dark ? "white" : "#0f172a"
});

const contactCard = (dark) => ({
  background: dark ? "rgba(15,23,42,.74)" : "white",
  border: dark ? "1px solid rgba(56,189,248,.26)" : "1px solid rgba(15,23,42,.08)",
  borderRadius: "28px",
  padding: "40px",
  color: dark ? "#cbd5e1" : "#475569"
});

const footer = (dark) => ({
  padding: "60px 7vw 34px",
  background: dark ? "#020617" : "#f1f5f9",
  color: dark ? "#94a3b8" : "#475569"
});

const footerGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "30px"
};

export default LandingPage;