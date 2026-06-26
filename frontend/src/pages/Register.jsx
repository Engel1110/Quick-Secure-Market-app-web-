import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false
  });

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (
      !form.firstName ||
      !form.lastName ||
      !form.email ||
      !form.phone ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Debes completar todos los campos.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!form.acceptTerms) {
      setError("Debes aceptar los términos y condiciones de QSM.");
      return;
    }

    try {
      setLoading(true);

      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password
      });

      setMessage("Cuenta creada correctamente.");

      setTimeout(() => {
        navigate("/dashboard");
      }, 700);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudo crear la cuenta. Verifica los datos e intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleDemo = () => {
    setError("Google todavía no está conectado. Usa registro con correo por ahora.");
  };

  return (
    <div style={page}>
      <style>
        {`
          * { box-sizing: border-box; }

          html, body, #root {
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100%;
            background: #020617;
            font-family: 'Inter', system-ui, sans-serif;
          }

          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(24px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes slowZoom {
            from { transform: scale(1); }
            to { transform: scale(1.08); }
          }
        `}
      </style>

      <div style={background}></div>
      <div style={overlay}></div>

      <div style={container}>
        <div style={leftPanel}>
          <Link to="/" style={brand}>
            <span style={brandIcon}>🛡</span>
            <div>
              <strong>QSM</strong>
              <small>Quick Secure Market</small>
            </div>
          </Link>

          <div style={heroTextBox}>
            <p style={eyebrow}>REGISTRO SEGURO</p>

            <h1 style={title}>
              Crea tu cuenta y empieza a comprar o vender con protección QSM.
            </h1>

            <p style={description}>
              Cada cuenta pasa por un proceso de validación para reducir perfiles falsos,
              proteger transacciones y mantener un marketplace confiable.
            </p>

            <div style={benefitsGrid}>
              <div style={benefitCard}>✅ Identidad protegida</div>
              <div style={benefitCard}>💰 Pago Protegido</div>
              <div style={benefitCard}>🤖 IA antifraude</div>
              <div style={benefitCard}>📦 Historial de productos</div>
            </div>
          </div>
        </div>

        <div style={registerCard}>
          <div style={cardHeader}>
            <p style={eyebrow}>CREAR CUENTA</p>
            <h2>Registro QSM</h2>
            <p>
              Usa tu correo. Luego podrás completar tu verificación de identidad.
            </p>
          </div>

          <button type="button" onClick={handleGoogleDemo} style={googleButton}>
            <span>G</span>
            Continuar con Google
          </button>

          <div style={divider}>
            <span></span>
            <p>o registrarse con correo</p>
            <span></span>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={twoColumns}>
              <input
                name="firstName"
                placeholder="Nombre"
                value={form.firstName}
                onChange={handleChange}
                required
                style={input}
              />

              <input
                name="lastName"
                placeholder="Apellido"
                value={form.lastName}
                onChange={handleChange}
                required
                style={input}
              />
            </div>

            <input
              name="email"
              type="email"
              placeholder="Correo electrónico"
              value={form.email}
              onChange={handleChange}
              required
              style={input}
            />

            <input
              name="phone"
              placeholder="Teléfono"
              value={form.phone}
              onChange={handleChange}
              required
              style={input}
            />

            <div style={twoColumns}>
              <input
                name="password"
                type="password"
                placeholder="Contraseña"
                value={form.password}
                onChange={handleChange}
                required
                style={input}
              />

              <input
                name="confirmPassword"
                type="password"
                placeholder="Confirmar contraseña"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                style={input}
              />
            </div>

            <label style={checkRow}>
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

            {error && <p style={errorText}>{error}</p>}
            {message && <p style={successText}>{message}</p>}

            <button type="submit" style={submitButton} disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear cuenta segura →"}
            </button>
          </form>

          <p style={loginText}>
            ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
          </p>

          <div style={securityNote}>
            🔒 Después del registro podrás completar tu identidad real:
            documento, dirección y selfie de verificación.
          </div>
        </div>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  width: "100%",
  position: "relative",
  background: "#020617",
  color: "white",
  overflow: "hidden"
};

const background = {
  position: "absolute",
  inset: 0,
  backgroundImage:
    "url('https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1920&q=90')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  animation: "slowZoom 18s ease-in-out forwards"
};

const overlay = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(90deg, rgba(2,6,23,0.98), rgba(2,6,23,0.78), rgba(2,6,23,0.50)), radial-gradient(circle at 80% 30%, rgba(53,208,195,0.20), transparent 30%)"
};

const container = {
  position: "relative",
  zIndex: 2,
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "1.1fr 0.9fr",
  gap: "50px",
  alignItems: "center",
  padding: "60px 7vw",
  animation: "fadeUp 0.8s ease"
};

const leftPanel = {
  maxWidth: "760px"
};

const brand = {
  display: "inline-flex",
  alignItems: "center",
  gap: "12px",
  color: "white",
  textDecoration: "none",
  marginBottom: "80px"
};

const brandIcon = {
  width: "48px",
  height: "48px",
  borderRadius: "16px",
  border: "1px solid rgba(53,208,195,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#35d0c3"
};

const heroTextBox = {
  maxWidth: "720px"
};

const eyebrow = {
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "13px",
  fontWeight: "900",
  textTransform: "uppercase"
};

const title = {
  fontSize: "clamp(44px, 5vw, 76px)",
  lineHeight: "1.04",
  letterSpacing: "-2.8px",
  margin: "16px 0 24px",
  fontWeight: "900"
};

const description = {
  color: "#cbd5e1",
  fontSize: "20px",
  lineHeight: "34px"
};

const benefitsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(180px, 1fr))",
  gap: "14px",
  marginTop: "34px",
  maxWidth: "560px"
};

const benefitCard = {
  background: "rgba(15,23,42,0.52)",
  border: "1px solid rgba(53,208,195,0.22)",
  borderRadius: "18px",
  padding: "16px",
  backdropFilter: "blur(16px)",
  fontWeight: "800"
};

const registerCard = {
  width: "100%",
  maxWidth: "520px",
  justifySelf: "end",
  background: "rgba(15,23,42,0.64)",
  border: "1px solid rgba(53,208,195,0.28)",
  borderRadius: "30px",
  padding: "34px",
  backdropFilter: "blur(24px)",
  boxShadow: "0 40px 100px rgba(0,0,0,0.55)"
};

const cardHeader = {
  textAlign: "left",
  marginBottom: "20px"
};

const googleButton = {
  width: "100%",
  padding: "15px",
  borderRadius: "16px",
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(2,6,23,0.72)",
  color: "white",
  fontWeight: "900",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  fontSize: "15px"
};

const divider = {
  display: "grid",
  gridTemplateColumns: "1fr auto 1fr",
  gap: "12px",
  alignItems: "center",
  color: "#94a3b8",
  fontSize: "13px",
  margin: "22px 0"
};

const twoColumns = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px"
};

const input = {
  width: "100%",
  padding: "15px",
  marginBottom: "13px",
  borderRadius: "15px",
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(2,6,23,0.78)",
  color: "white",
  outline: "none",
  fontFamily: "'Inter', system-ui, sans-serif"
};

const checkRow = {
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  color: "#cbd5e1",
  fontSize: "14px",
  margin: "8px 0 16px"
};

const submitButton = {
  width: "100%",
  padding: "16px",
  borderRadius: "16px",
  border: "none",
  background: "#35d0c3",
  color: "#020617",
  fontWeight: "900",
  cursor: "pointer",
  fontSize: "16px",
  boxShadow: "0 20px 50px rgba(53,208,195,0.24)"
};

const errorText = {
  color: "#fca5a5",
  background: "rgba(127,29,29,0.22)",
  border: "1px solid rgba(248,113,113,0.28)",
  padding: "12px",
  borderRadius: "14px"
};

const successText = {
  color: "#86efac",
  background: "rgba(6,78,59,0.28)",
  border: "1px solid rgba(134,239,172,0.28)",
  padding: "12px",
  borderRadius: "14px"
};

const loginText = {
  textAlign: "center",
  marginTop: "20px",
  color: "#cbd5e1"
};

const securityNote = {
  marginTop: "18px",
  background: "rgba(53,208,195,0.10)",
  border: "1px solid rgba(53,208,195,0.25)",
  color: "#cbd5e1",
  padding: "14px",
  borderRadius: "16px",
  fontSize: "14px",
  lineHeight: "22px"
};

export default Register;