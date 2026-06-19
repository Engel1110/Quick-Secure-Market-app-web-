import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function CompleteProfile() {
  const navigate = useNavigate();

  const savedUser = JSON.parse(localStorage.getItem("qsm_user")) || {};

  const [form, setForm] = useState({
    firstName: savedUser.firstName || "",
    lastName: savedUser.lastName || "",
    phone: savedUser.phone || "",
    address: savedUser.address || "",
    city: savedUser.city || "",
    documentId: savedUser.documentId || ""
  });

  const [files, setFiles] = useState({
    documentFront: null,
    documentBack: null,
    selfie: null
  });

  const [previews, setPreviews] = useState({
    documentFront: "",
    documentBack: "",
    selfie: ""
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const progress = calculateProgress(form, files);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    const file = selectedFiles[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Solo se permiten imágenes JPG, PNG o WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar los 5 MB.");
      return;
    }

    setError("");

    setFiles({
      ...files,
      [name]: file
    });

    setPreviews({
      ...previews,
      [name]: URL.createObjectURL(file)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (progress < 100) {
      setError("Completa todos los campos y carga las tres imágenes requeridas.");
      return;
    }

    const updatedUser = {
      ...savedUser,
      ...form,
      documentFront: files.documentFront?.name || "",
      documentBack: files.documentBack?.name || "",
      selfie: files.selfie?.name || "",
      kycStatus: "PENDING_REVIEW",
      status: "PENDING",
      sellerEnabled: false,
      buyerEnabled: true,
      verificationSubmittedAt: new Date().toISOString()
    };

    localStorage.setItem("qsm_user", JSON.stringify(updatedUser));

    setMessage("Perfil enviado a revisión QSM correctamente.");

    setTimeout(() => {
      navigate("/dashboard");
    }, 1600);
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

          <p style={eyebrow}>VERIFICACIÓN QSM</p>

          <h1 style={title}>
            Confirma tu identidad para activar la protección completa.
          </h1>

          <p style={description}>
            Este proceso ayuda a prevenir perfiles falsos, cuentas duplicadas y
            publicaciones sospechosas dentro de Quick Secure Market.
          </p>

          <div style={progressCard}>
            <div style={progressTop}>
              <strong>Progreso de verificación</strong>
              <span>{progress}%</span>
            </div>

            <div style={progressTrack}>
              <div style={{ ...progressFill, width: `${progress}%` }}></div>
            </div>

            <div style={checkList}>
              <span>{form.firstName && form.lastName ? "✅" : "⬜"} Nombre real</span>
              <span>{form.phone ? "✅" : "⬜"} Teléfono</span>
              <span>{form.address ? "✅" : "⬜"} Dirección</span>
              <span>{form.documentId ? "✅" : "⬜"} Documento</span>
              <span>{files.documentFront ? "✅" : "⬜"} Frente documento</span>
              <span>{files.documentBack ? "✅" : "⬜"} Reverso documento</span>
              <span>{files.selfie ? "✅" : "⬜"} Selfie</span>
            </div>
          </div>

          <div style={noticeBox}>
            🔒 Un documento solo puede estar vinculado a una cuenta QSM.
            Esta regla ayuda a evitar duplicidad de identidades.
          </div>
        </div>

        <div style={formCard}>
          <div style={cardHeader}>
            <p style={eyebrow}>KYC / IDENTIDAD</p>
            <h2>Completar perfil</h2>
            <p>
              Carga tus datos reales y las imágenes requeridas para enviar tu cuenta a revisión.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={twoColumns}>
              <input
                name="firstName"
                placeholder="Nombre real"
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

            <div style={twoColumns}>
              <input
                name="phone"
                placeholder="Teléfono"
                value={form.phone}
                onChange={handleChange}
                required
                style={input}
              />

              <input
                name="city"
                placeholder="Ciudad"
                value={form.city}
                onChange={handleChange}
                required
                style={input}
              />
            </div>

            <input
              name="address"
              placeholder="Dirección completa"
              value={form.address}
              onChange={handleChange}
              required
              style={input}
            />

            <input
              name="documentId"
              placeholder="Cédula o documento"
              value={form.documentId}
              onChange={handleChange}
              required
              style={input}
            />

            <div style={uploadGrid}>
              <FileUpload
                label="Frente del documento"
                name="documentFront"
                preview={previews.documentFront}
                onChange={handleFileChange}
              />

              <FileUpload
                label="Reverso del documento"
                name="documentBack"
                preview={previews.documentBack}
                onChange={handleFileChange}
              />

              <FileUpload
                label="Selfie de verificación"
                name="selfie"
                preview={previews.selfie}
                onChange={handleFileChange}
              />
            </div>

            {error && <p style={errorText}>{error}</p>}
            {message && <p style={successText}>{message}</p>}

            <button type="submit" style={submitButton}>
              Enviar perfil a revisión QSM →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function FileUpload({ label, name, preview, onChange }) {
  return (
    <div style={uploadBox}>
      <div style={uploadHeader}>
        <strong>{label}</strong>
        <span>{preview ? "✅ Cargado" : "Pendiente"}</span>
      </div>

      <label style={dropZone}>
        {preview ? (
          <img src={preview} alt={label} style={previewImage} />
        ) : (
          <div style={emptyUpload}>
            <div style={{ fontSize: "28px" }}>📷</div>
            <p>Seleccionar imagen</p>
            <small>JPG, PNG o WEBP · Máx. 5 MB</small>
          </div>
        )}

        <input
          type="file"
          name={name}
          accept="image/png,image/jpeg,image/webp"
          onChange={onChange}
          required
          style={{ display: "none" }}
        />
      </label>
    </div>
  );
}

function calculateProgress(form, files) {
  const checks = [
    form.firstName,
    form.lastName,
    form.phone,
    form.address,
    form.city,
    form.documentId,
    files.documentFront,
    files.documentBack,
    files.selfie
  ];

  const completed = checks.filter(Boolean).length;

  return Math.round((completed / checks.length) * 100);
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
    "linear-gradient(90deg, rgba(2,6,23,0.98), rgba(2,6,23,0.84), rgba(2,6,23,0.58)), radial-gradient(circle at 85% 25%, rgba(53,208,195,0.20), transparent 30%)"
};

const container = {
  position: "relative",
  zIndex: 2,
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "0.9fr 1.1fr",
  gap: "50px",
  alignItems: "center",
  padding: "60px 7vw",
  animation: "fadeUp 0.8s ease"
};

const leftPanel = {
  maxWidth: "680px"
};

const brand = {
  display: "inline-flex",
  alignItems: "center",
  gap: "12px",
  color: "white",
  textDecoration: "none",
  marginBottom: "70px"
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

const eyebrow = {
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "13px",
  fontWeight: "900",
  textTransform: "uppercase"
};

const title = {
  fontSize: "clamp(42px, 4.8vw, 72px)",
  lineHeight: "1.04",
  letterSpacing: "-2.6px",
  margin: "16px 0 24px",
  fontWeight: "900"
};

const description = {
  color: "#cbd5e1",
  fontSize: "19px",
  lineHeight: "33px"
};

const progressCard = {
  marginTop: "34px",
  background: "rgba(15,23,42,0.58)",
  border: "1px solid rgba(53,208,195,0.24)",
  borderRadius: "24px",
  padding: "24px",
  backdropFilter: "blur(18px)"
};

const progressTop = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "14px"
};

const progressTrack = {
  width: "100%",
  height: "10px",
  background: "rgba(148,163,184,0.18)",
  borderRadius: "999px",
  overflow: "hidden",
  marginBottom: "18px"
};

const progressFill = {
  height: "100%",
  background: "linear-gradient(90deg, #35d0c3, #7c3aed)"
};

const checkList = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
  color: "#cbd5e1",
  fontSize: "14px"
};

const noticeBox = {
  marginTop: "18px",
  background: "rgba(53,208,195,0.10)",
  border: "1px solid rgba(53,208,195,0.25)",
  color: "#cbd5e1",
  padding: "16px",
  borderRadius: "18px",
  lineHeight: "24px"
};

const formCard = {
  width: "100%",
  background: "rgba(15,23,42,0.66)",
  border: "1px solid rgba(53,208,195,0.28)",
  borderRadius: "30px",
  padding: "34px",
  backdropFilter: "blur(24px)",
  boxShadow: "0 40px 100px rgba(0,0,0,0.55)"
};

const cardHeader = {
  marginBottom: "24px"
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

const uploadGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "14px",
  marginTop: "8px"
};

const uploadBox = {
  background: "rgba(2,6,23,0.58)",
  border: "1px solid rgba(148,163,184,0.18)",
  borderRadius: "20px",
  padding: "12px"
};

const uploadHeader = {
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  fontSize: "13px",
  marginBottom: "10px",
  color: "#cbd5e1"
};

const dropZone = {
  height: "170px",
  borderRadius: "16px",
  border: "1px dashed rgba(53,208,195,0.42)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  overflow: "hidden",
  background: "rgba(15,23,42,0.42)"
};

const emptyUpload = {
  textAlign: "center",
  color: "#94a3b8"
};

const previewImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const submitButton = {
  width: "100%",
  marginTop: "18px",
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

export default CompleteProfile;