import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [theme, setTheme] = useState(() => localStorage.getItem("qsm_theme") || "dark");
  const isDark = theme === "dark";

  /* QSM_REGISTRO_FINAL_2026 */

  const EMAIL_DOMAINS = [
    "@gmail.com",
    "@hotmail.com",
    "@outlook.com",
    "@yahoo.com",
    "@icloud.com",
    "custom"
  ];

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",

    emailLocal: "",
    emailDomain: "@gmail.com",
    customEmailDomain: "",

    phone: "",
    dateOfBirth: "",

    recoveryEmailLocal: "",
    recoveryEmailDomain: "@gmail.com",
    customRecoveryEmailDomain: "",

    confirmRecoveryEmailLocal: "",
    confirmRecoveryEmailDomain: "@gmail.com",
    customConfirmRecoveryEmailDomain: "",

    password: "",
    confirmPassword: "",
    acceptTerms: false
  });

  const buildEmailAddress = (
    local,
    domain,
    customDomain
  ) => {
    const cleanLocal =
      String(local || "")
        .trim()
        .replace(/\s+/g, "");

    let cleanDomain =
      domain === "custom"
        ? String(customDomain || "").trim()
        : String(domain || "").trim();

    if (
      cleanDomain &&
      !cleanDomain.startsWith("@")
    ) {
      cleanDomain =
        "@" + cleanDomain;
    }

    return (
      cleanLocal +
      cleanDomain
    ).toLowerCase();
  };

  const primaryEmail =
    buildEmailAddress(
      form.emailLocal,
      form.emailDomain,
      form.customEmailDomain
    );

  const recoveryEmail =
    buildEmailAddress(
      form.recoveryEmailLocal,
      form.recoveryEmailDomain,
      form.customRecoveryEmailDomain
    );

  const confirmRecoveryEmail =
    buildEmailAddress(
      form.confirmRecoveryEmailLocal,
      form.confirmRecoveryEmailDomain,
      form.customConfirmRecoveryEmailDomain
    );

  const passwordRules = {
    length:
      form.password.length >= 8 &&
      form.password.length <= 12,

    uppercase:
      /[A-Z]/.test(form.password),

    lowercase:
      /[a-z]/.test(form.password),

    number:
      /\d/.test(form.password),

    symbol:
      /[^A-Za-z0-9\s]/.test(form.password),

    noSpaces:
      !/\s/.test(form.password)
  };

  const strongPassword =
    Object.values(
      passwordRules
    ).every(Boolean);

  const passwordsMatch =
    Boolean(
      form.confirmPassword
    ) &&
    form.password ===
      form.confirmPassword;

  const recoveryEmailsMatch =
    Boolean(
      recoveryEmail
    ) &&
    recoveryEmail ===
      confirmRecoveryEmail;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submitDisabled =
    loading ||
    !strongPassword ||
    !passwordsMatch ||
    !recoveryEmailsMatch ||
    !form.acceptTerms;

  useEffect(() => {
    localStorage.setItem("qsm_theme", theme);
    document.documentElement.setAttribute("data-qsm-theme", theme);
  }, [theme]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (
      !form.firstName ||
      !form.lastName ||
      !form.emailLocal ||
      !form.phone ||
      !form.dateOfBirth ||
      !form.recoveryEmailLocal ||
      !form.confirmRecoveryEmailLocal ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError(
        "Debes completar todos los campos obligatorios."
      );
      return;
    }

    if (
      primaryEmail ===
      recoveryEmail
    ) {
      setError(
        "El correo de recuperación debe ser diferente al correo principal."
      );
      return;
    }

    if (
      !recoveryEmailsMatch
    ) {
      setError(
        "Los correos de recuperación no coinciden."
      );
      return;
    }

    if (
      !strongPassword
    ) {
      setError(
        "La contraseña debe tener entre 8 y 12 caracteres, una mayúscula, una minúscula, un número, un símbolo y no contener espacios."
      );
      return;
    }

    if (
      !passwordsMatch
    ) {
      setError(
        "Las contraseñas no coinciden."
      );
      return;
    }

    if (!form.acceptTerms) {
      setError("Debes aceptar los términos y el proceso de verificación QSM.");
      return;
    }

    try {
      setLoading(true);

      await register({
        firstName:
          form.firstName.trim(),

        lastName:
          form.lastName.trim(),

        email:
          primaryEmail,

        phone:
          form.phone.trim(),

        dateOfBirth:
          form.dateOfBirth,

        recoveryEmail,

        confirmRecoveryEmail,

        password:
          form.password,

        confirmPassword:
          form.confirmPassword
      });

      setMessage("Cuenta creada correctamente. Redirigiendo...");

      setTimeout(() => {
        navigate("/dashboard");
      }, 700);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "No se pudo crear la cuenta. Verifica los datos e intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page(isDark)}>
      <style>{`
        * { box-sizing: border-box; }

        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
          overflow-x: hidden;
        }

        body {
          background: ${isDark ? "#020617" : "#f8fafc"};
        }

        a, button, input, textarea {
          font-family: inherit;
        }

        a, button {
          transition: all .25s ease;
        }

        a:hover, button:hover {
          transform: translateY(-2px);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(26px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slowZoom {
          from { transform: scale(1); }
          to { transform: scale(1.08); }
        }

        .register-grid {
          animation: fadeUp .75s ease;
        }

        .background-image {
          animation: slowZoom 18s ease-in-out alternate infinite;
        }

        @media (max-width: 1100px) {
          .register-grid {
            grid-template-columns: 1fr !important;
          }

          .left-panel {
            min-height: 560px !important;
          }
        }

        @media (max-width: 760px) {
          .shell {
            padding: 18px !important;
          }

          .topbar {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .nav-links {
            flex-wrap: wrap !important;
          }

          .title {
            font-size: 44px !important;
            line-height: 50px !important;
          }

          .register-card {
            padding: 26px !important;
          }

          .two-columns {
            grid-template-columns: 1fr !important;
          }

          .stats-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>

      <div className="shell" style={shell}>
        <header className="topbar" style={topbar(isDark)}>
          <Link to="/" style={brand}>
            <div style={brandIcon(isDark)}>{"\u{1F6E1}\uFE0F"}</div>
            <div>
              <strong style={brandTitle(isDark)}>QSM</strong>
              <span style={brandSub(isDark)}>Quick Secure Market</span>
            </div>
          </Link>

          <nav className="nav-links" style={nav}>
            <Link to="/" style={navLink(isDark)}>Inicio</Link>
            <Link to="/#nosotros" style={navLink(isDark)}>Nosotros</Link>
            <Link to="/#seguridad" style={navLink(isDark)}>Seguridad</Link>
            <Link to="/#pago-protegido" style={navLink(isDark)}>Pago Protegido</Link>
            <Link to="/#demo" style={navLink(isDark)}>Demo</Link>
          </nav>

          <div style={topActions}>
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              style={themeButton(isDark)}
            >
              {isDark ? "☀ Light" : "🌙 Dark"}
            </button>

            <Link to="/login" style={loginTop(isDark)}>
              Iniciar sesión
            </Link>
          </div>
        </header>

        <main className="register-grid" style={grid}>
          <section className="left-panel" style={leftPanel(isDark)}>
            <div className="background-image" style={backgroundImage}></div>
            <div style={visualOverlay(isDark)}></div>

            <div style={leftContent}>
              <p style={eyebrow}>REGISTRO SEGURO QSM</p>

              <h1 className="title" style={title(isDark)}>
                Crea tu cuenta y empieza con <span style={gradientText}>protección digital.</span>
              </h1>

              <p style={description(isDark)}>
                QSM valida usuarios, protege pagos y reduce riesgos para que puedas comprar y vender con mayor confianza.
              </p>

              <div className="stats-grid" style={statsGrid}>
                <MiniCard icon={"\u{1F6E1}\uFE0F"} title="Identidad" text="Validación segura" dark={isDark} />
                <MiniCard icon={"\u{1F512}"} title="Pago Protegido" text="Dinero retenido" dark={isDark} />
                <MiniCard icon={"\u{1F9E0}"} title="IA Antifraude" text="Riesgo menor" dark={isDark} />
                <MiniCard icon={"\u{1F4E6}"} title="Código QSM" text="Trazabilidad" dark={isDark} />
              </div>

              <div style={trustBanner(isDark)}>
                <strong>Después del registro podrás completar tu perfil:</strong>
                <span>documento, dirección, selfie de verificación y reputación QSM.</span>
              </div>
            </div>
          </section>

          <section className="register-card" style={registerCard(isDark)}>
            <div style={cardIcon(isDark)}>{"\u{1F464}"}</div>

            <h2 style={cardTitle(isDark)}>Crear cuenta segura</h2>
            <p style={cardDescription(isDark)}>
              Regístrate con tu correo. Luego podrás completar la verificación de identidad.
            </p>

            

            <form onSubmit={handleSubmit} style={formStyle}>
              <div className="two-columns" style={twoColumns}>
                <Field
                  name="firstName"
                  placeholder="Nombre"
                  value={form.firstName}
                  onChange={handleChange}
                  dark={isDark}
                  icon="👤"
                />

                <Field
                  name="lastName"
                  placeholder="Apellido"
                  value={form.lastName}
                  onChange={handleChange}
                  dark={isDark}
                  icon="👤"
                />
              </div>

              <EmailComposer
                label="Correo electrónico"
                localValue={form.emailLocal}
                domainValue={form.emailDomain}
                customDomainValue={form.customEmailDomain}
                domains={EMAIL_DOMAINS}
                onLocalChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    emailLocal: value
                  }))
                }
                onDomainChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    emailDomain: value
                  }))
                }
                onCustomDomainChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    customEmailDomain: value
                  }))
                }
                dark={isDark}
              />

              <div
                className="two-columns"
                style={twoColumns}
              >
                <Field
                  name="phone"
                  type="tel"
                  placeholder="Teléfono"
                  value={form.phone}
                  onChange={handleChange}
                  dark={isDark}
                  icon="☎"
                />

                <Field
                  name="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                  dark={isDark}
                  icon="◷"
                  aria-label="Fecha de nacimiento"
                  title="Fecha de nacimiento"
                />
              </div>

              <EmailComposer
                label="Correo de recuperación"
                localValue={form.recoveryEmailLocal}
                domainValue={form.recoveryEmailDomain}
                customDomainValue={form.customRecoveryEmailDomain}
                domains={EMAIL_DOMAINS}
                onLocalChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    recoveryEmailLocal: value
                  }))
                }
                onDomainChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    recoveryEmailDomain: value
                  }))
                }
                onCustomDomainChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    customRecoveryEmailDomain: value
                  }))
                }
                dark={isDark}
              />

              <EmailComposer
                label="Confirmar correo de recuperación"
                localValue={form.confirmRecoveryEmailLocal}
                domainValue={form.confirmRecoveryEmailDomain}
                customDomainValue={form.customConfirmRecoveryEmailDomain}
                domains={EMAIL_DOMAINS}
                onLocalChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    confirmRecoveryEmailLocal: value
                  }))
                }
                onDomainChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    confirmRecoveryEmailDomain: value
                  }))
                }
                onCustomDomainChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    customConfirmRecoveryEmailDomain: value
                  }))
                }
                dark={isDark}
              />

              <div className="two-columns" style={twoColumns}>
                <PasswordField
                  name="password"
                  placeholder="Contraseña"
                  value={form.password}
                  onChange={handleChange}
                  dark={isDark}
                  visible={showPassword}
                  toggle={() => setShowPassword(!showPassword)}
                />

                <PasswordField
                  name="confirmPassword"
                  placeholder="Confirmar contraseña"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  dark={isDark}
                  visible={showConfirmPassword}
                  toggle={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              </div>

              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "14px",
                  border: isDark
                    ? "1px solid rgba(148,163,184,.14)"
                    : "1px solid rgba(15,23,42,.10)",
                  background: isDark
                    ? "rgba(15,23,42,.55)"
                    : "#f8fafc"
                }}
              >
                <strong
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "12px"
                  }}
                >
                  Seguridad de la contraseña
                </strong>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(2, minmax(0,1fr))",
                    gap: "6px 14px",
                    fontSize: "11px"
                  }}
                >
                  {[
                    [passwordRules.length, "8 a 12 caracteres"],
                    [passwordRules.uppercase, "Una mayúscula"],
                    [passwordRules.lowercase, "Una minúscula"],
                    [passwordRules.number, "Un número"],
                    [passwordRules.symbol, "Un símbolo"],
                    [passwordRules.noSpaces, "Sin espacios"]
                  ].map(([valid, text]) => (
                    <span
                      key={text}
                      style={{
                        color: valid
                          ? "#22c55e"
                          : isDark
                            ? "#94a3b8"
                            : "#64748b",
                        fontWeight: 800
                      }}
                    >
                      {valid ? "✓" : "○"} {text}
                    </span>
                  ))}
                </div>
              </div>

              <label style={checkRow(isDark)}>
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={form.acceptTerms}
                  onChange={handleChange}
                />
                <span>
                  Acepto los términos, condiciones y el proceso de verificación QSM.
                </span>
              </label>

              {error && <div style={errorBox}>{error}</div>}
              {message && <div style={successBox}>{message}</div>}

              <button type="submit" disabled={submitDisabled} style={submitButton(submitDisabled)}>
                {loading ? "Creando cuenta..." : "Crear cuenta segura →"}
              </button>
            </form>

            <p style={loginText(isDark)}>
              ¿Ya tienes cuenta? <Link to="/login" style={loginLink}>Iniciar sesión</Link>
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

function Field({ icon, dark, ...props }) {
  return (
    <div style={inputWrap(dark)}>
      <span>{icon}</span>
      <input {...props} style={input(dark)} required />
    </div>
  );
}

function EmailComposer({
  label,
  localValue,
  domainValue,
  customDomainValue,
  domains,
  onLocalChange,
  onDomainChange,
  onCustomDomainChange,
  dark
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          marginBottom: "6px",
          color: dark
            ? "#cbd5e1"
            : "#475569",
          fontSize: "11px",
          fontWeight: 800
        }}
      >
        {label}
      </label>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            domainValue === "custom"
              ? "1fr 165px 150px"
              : "1fr 165px",
          gap: "8px"
        }}
      >
        <div style={inputWrap(dark)}>
          <span>@</span>

          <input
            type="text"
            value={localValue}
            placeholder="usuario"
            onChange={(event) =>
              onLocalChange(
                event.target.value.replace(
                  /[@\s]/g,
                  ""
                )
              )
            }
            style={input(dark)}
            required
          />
        </div>

        <select
          value={domainValue}
          onChange={(event) =>
            onDomainChange(
              event.target.value
            )
          }
          style={{
            ...input(dark),
            minHeight: "52px",
            padding: "0 12px",
            borderRadius: "14px",
            background: dark
              ? "#0f172a"
              : "white"
          }}
        >
          {domains.map((domain) => (
            <option
              key={domain}
              value={domain}
            >
              {domain === "custom"
                ? "Otro dominio..."
                : domain}
            </option>
          ))}
        </select>

        {domainValue === "custom" && (
          <input
            type="text"
            value={customDomainValue}
            placeholder="@empresa.com"
            onChange={(event) =>
              onCustomDomainChange(
                event.target.value
              )
            }
            style={{
              ...input(dark),
              minHeight: "52px",
              padding: "0 12px",
              borderRadius: "14px"
            }}
            required
          />
        )}
      </div>
    </div>
  );
}


function PasswordField({ dark, visible, toggle, ...props }) {
  return (
    <div style={inputWrap(dark)}>
      <span>{"🔒"}</span>
      <input
        {...props}
        type={visible ? "text" : "password"}
        style={input(dark)}
        required
      />
      <button type="button" onClick={toggle} style={eyeButton(dark)}>
        {visible ? "🙈" : "👁️"}
      </button>
    </div>
  );
}

function MiniCard({ icon, title, text, dark }) {
  return (
    <div style={miniCard(dark)}>
      <span>{icon}</span>
      <strong>{title}</strong>
      <small>{text}</small>
    </div>
  );
}

const page = (dark) => ({
  minHeight: "100vh",
  background: dark
    ? "radial-gradient(circle at top right, #111827 0%, #020617 45%, #000 100%)"
    : "linear-gradient(135deg, #ffffff 0%, #f8fafc 55%, #eef2ff 100%)",
  color: dark ? "white" : "#0f172a"
});

const shell = {
  minHeight: "100vh",
  padding: "26px 34px",
  display: "flex",
  flexDirection: "column",
  gap: "26px"
};

const topbar = (dark) => ({
  height: "74px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "24px",
  padding: "0 10px"
});

const brand = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  textDecoration: "none"
};

const brandIcon = (dark) => ({
  width: "54px",
  height: "54px",
  borderRadius: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: dark ? "rgba(56,189,248,.12)" : "rgba(124,58,237,.10)",
  border: dark ? "1px solid rgba(56,189,248,.25)" : "1px solid rgba(124,58,237,.18)"
});

const brandTitle = (dark) => ({
  display: "block",
  color: dark ? "white" : "#0f172a",
  fontSize: "30px",
  fontWeight: "950",
  lineHeight: "30px"
});

const brandSub = (dark) => ({
  color: dark ? "#cbd5e1" : "#64748b",
  fontSize: "12px",
  fontWeight: "700"
});

const nav = {
  display: "flex",
  gap: "24px"
};

const navLink = (dark) => ({
  color: dark ? "#e5e7eb" : "#334155",
  textDecoration: "none",
  fontWeight: "800"
});

const topActions = {
  display: "flex",
  gap: "12px",
  alignItems: "center"
};

const themeButton = (dark) => ({
  border: dark ? "1px solid rgba(148,163,184,.18)" : "1px solid rgba(15,23,42,.12)",
  background: dark ? "rgba(15,23,42,.72)" : "white",
  color: dark ? "white" : "#0f172a",
  borderRadius: "999px",
  padding: "14px 18px",
  cursor: "pointer",
  fontWeight: "900"
});

const loginTop = (dark) => ({
  color: dark ? "white" : "#0f172a",
  textDecoration: "none",
  padding: "14px 20px",
  borderRadius: "16px",
  border: dark ? "1px solid rgba(139,92,246,.45)" : "1px solid rgba(15,23,42,.14)",
  fontWeight: "900"
});

const grid = {
  flex: 1,
  display: "grid",
  gridTemplateColumns: "1.25fr .95fr",
  gap: "34px",
  alignItems: "stretch"
};

const leftPanel = (dark) => ({
  position: "relative",
  overflow: "hidden",
  borderRadius: "34px",
  minHeight: "720px",
  border: dark ? "1px solid rgba(148,163,184,.12)" : "1px solid rgba(15,23,42,.08)",
  boxShadow: "0 40px 120px rgba(0,0,0,.35)"
});

const backgroundImage = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "url(https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=2200&q=90)",
  backgroundSize: "cover",
  backgroundPosition: "center"
};

const visualOverlay = (dark) => ({
  position: "absolute",
  inset: 0,
  background: dark
    ? "linear-gradient(90deg, rgba(2,6,23,.96), rgba(2,6,23,.70), rgba(2,6,23,.30)), radial-gradient(circle at 75% 36%, rgba(139,92,246,.36), transparent 32%)"
    : "linear-gradient(90deg, rgba(248,250,252,.96), rgba(248,250,252,.76), rgba(248,250,252,.30)), radial-gradient(circle at 75% 36%, rgba(139,92,246,.18), transparent 32%)"
});

const leftContent = {
  position: "relative",
  zIndex: 2,
  height: "100%",
  padding: "58px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center"
};

const eyebrow = {
  color: "#35d0c3",
  letterSpacing: "3px",
  fontWeight: "900",
  fontSize: "15px"
};

const title = (dark) => ({
  color: dark ? "white" : "#0f172a",
  fontSize: "clamp(52px, 5vw, 86px)",
  lineHeight: "1",
  letterSpacing: "-4px",
  margin: "22px 0",
  maxWidth: "700px"
});

const gradientText = {
  display: "block",
  background: "linear-gradient(90deg, #38bdf8, #8b5cf6, #ec4899)",
  WebkitBackgroundClip: "text",
  color: "transparent"
};

const description = (dark) => ({
  color: dark ? "#dbeafe" : "#334155",
  fontSize: "19px",
  lineHeight: "32px",
  maxWidth: "620px"
});

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(120px, 1fr))",
  gap: "16px",
  maxWidth: "850px",
  marginTop: "38px"
};

const miniCard = (dark) => ({
  background: dark ? "rgba(15,23,42,.62)" : "rgba(255,255,255,.72)",
  border: dark ? "1px solid rgba(148,163,184,.16)" : "1px solid rgba(15,23,42,.08)",
  borderRadius: "22px",
  padding: "18px",
  color: dark ? "white" : "#0f172a",
  backdropFilter: "blur(16px)",
  display: "grid",
  gap: "7px"
});

const trustBanner = (dark) => ({
  marginTop: "30px",
  display: "grid",
  gap: "6px",
  width: "fit-content",
  maxWidth: "720px",
  padding: "18px",
  borderRadius: "18px",
  background: dark ? "rgba(15,23,42,.68)" : "rgba(255,255,255,.76)",
  border: dark ? "1px solid rgba(148,163,184,.16)" : "1px solid rgba(15,23,42,.08)",
  color: dark ? "#e5e7eb" : "#334155",
  backdropFilter: "blur(14px)"
});

const registerCard = (dark) => ({
  alignSelf: "center",
  background: dark ? "rgba(15,23,42,.68)" : "rgba(255,255,255,.88)",
  border: dark ? "1px solid rgba(56,189,248,.22)" : "1px solid rgba(15,23,42,.08)",
  borderRadius: "34px",
  padding: "42px",
  color: dark ? "white" : "#0f172a",
  boxShadow: dark ? "0 38px 120px rgba(0,0,0,.32)" : "0 38px 120px rgba(15,23,42,.10)",
  backdropFilter: "blur(26px)"
});

const cardIcon = (dark) => ({
  width: "68px",
  height: "68px",
  borderRadius: "24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 22px",
  background: dark ? "rgba(139,92,246,.16)" : "rgba(124,58,237,.10)",
  border: dark ? "1px solid rgba(139,92,246,.28)" : "1px solid rgba(124,58,237,.18)",
  fontSize: "28px"
});

const cardTitle = (dark) => ({
  color: dark ? "white" : "#0f172a",
  fontSize: "30px",
  textAlign: "center",
  marginBottom: "8px"
});

const cardDescription = (dark) => ({
  color: dark ? "#cbd5e1" : "#64748b",
  textAlign: "center",
  marginBottom: "26px"
});

const googleButton = (dark) => ({
  width: "100%",
  padding: "15px",
  borderRadius: "16px",
  border: dark ? "1px solid rgba(148,163,184,.16)" : "1px solid rgba(15,23,42,.10)",
  background: dark ? "rgba(2,6,23,.50)" : "#f8fafc",
  color: dark ? "white" : "#0f172a",
  fontWeight: "900",
  cursor: "pointer"
});

const divider = (dark) => ({
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  gap: "14px",
  alignItems: "center",
  margin: "22px 0",
  color: dark ? "#94a3b8" : "#64748b",
  fontSize: "13px"
});

const formStyle = {
  display: "grid",
  gap: "13px"
};

const twoColumns = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px"
};

const inputWrap = (dark) => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  background: dark ? "rgba(2,6,23,.60)" : "#f8fafc",
  border: dark ? "1px solid rgba(148,163,184,.16)" : "1px solid rgba(15,23,42,.10)",
  borderRadius: "16px",
  padding: "0 16px"
});

const input = (dark) => ({
  flex: 1,
  width: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  color: dark ? "white" : "#0f172a",
  padding: "17px 0",
  fontSize: "15px"
});

const eyeButton = (dark) => ({
  border: "none",
  background: "transparent",
  cursor: "pointer",
  color: dark ? "white" : "#0f172a"
});

const checkRow = (dark) => ({
  display: "flex",
  gap: "10px",
  color: dark ? "#cbd5e1" : "#475569",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "4px 0"
});

const errorBox = {
  background: "rgba(239,68,68,.14)",
  border: "1px solid rgba(239,68,68,.35)",
  color: "#fecaca",
  padding: "12px 14px",
  borderRadius: "14px",
  fontWeight: "800"
};

const successBox = {
  background: "rgba(34,197,94,.14)",
  border: "1px solid rgba(34,197,94,.35)",
  color: "#bbf7d0",
  padding: "12px 14px",
  borderRadius: "14px",
  fontWeight: "800"
};

const submitButton = (loading) => ({
  marginTop: "8px",
  width: "100%",
  border: "none",
  borderRadius: "16px",
  padding: "18px",
  cursor: loading ? "not-allowed" : "pointer",
  background: loading
    ? "linear-gradient(135deg, #64748b, #475569)"
    : "linear-gradient(135deg, #38bdf8, #8b5cf6, #ec4899)",
  color: "white",
  fontWeight: "950",
  fontSize: "16px",
  opacity: loading ? 0.75 : 1
});

const loginText = (dark) => ({
  textAlign: "center",
  marginTop: "22px",
  color: dark ? "#cbd5e1" : "#64748b"
});

const loginLink = {
  color: "#a855f7",
  fontWeight: "900",
  textDecoration: "none"
};

export default Register;




