import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AiAssistant from "../components/AiAssistant";

function Profile() {
  const navigate = useNavigate();

  const savedUser = JSON.parse(localStorage.getItem("qsm_user")) || {
    firstName: "Usuario",
    lastName: "QSM",
    email: "usuario@qsm.com",
    trustScore: 60,
    kycStatus: "PENDING",
    role: "USER"
  };

  const [user, setUser] = useState(savedUser);
  const [profilePreview, setProfilePreview] = useState(savedUser.profilePhoto || "");
  const [coverPreview, setCoverPreview] = useState(savedUser.coverPhoto || "");
  const [showPasswordRequest, setShowPasswordRequest] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    firstName: savedUser.firstName || "",
    lastName: savedUser.lastName || "",
    username: savedUser.username || "",
    phone: savedUser.phone || "",
    city: savedUser.city || "",
    address: savedUser.address || "",
    birthDate: savedUser.birthDate || "",
    gender: savedUser.gender || ""
  });

  const trustScore = user.trustScore || 60;
  const isVerified = user.kycStatus === "VERIFIED";

  const stats = {
    products: user.productsCount || 0,
    sales: user.salesCount || 0,
    purchases: user.purchasesCount || 0,
    disputes: user.disputesCount || 0
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);

    if (type === "profile") setProfilePreview(imageUrl);
    if (type === "cover") setCoverPreview(imageUrl);
  };

  const saveProfile = () => {
    const updatedUser = {
      ...user,
      ...form,
      profilePhoto: profilePreview,
      coverPhoto: coverPreview
    };

    localStorage.setItem("qsm_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
    setMessage("Perfil actualizado correctamente.");
  };

  const requestPasswordChange = () => {
    setShowPasswordRequest(true);
    setMessage(
      "Solicitud de cambio de contraseña creada. En la versión real se enviará un enlace seguro al correo del usuario."
    );
  };

  const logout = () => {
    localStorage.removeItem("qsm_user");
    localStorage.removeItem("qsm_token");
    navigate("/login");
  };

  return (
    <div style={page}>
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          html, body, #root {
            width: 100%;
            min-height: 100%;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            background: #020617;
            font-family: 'Inter', system-ui, sans-serif;
          }

          input::placeholder {
            color: #64748b;
          }
        `}
      </style>

      <aside style={sidebar}>
        <Link to="/" style={brand}>
          <div style={brandIcon}>🛡</div>
          <div>
            <strong style={brandTitle}>QSM</strong>
            <span style={brandSub}>Quick Secure Market</span>
          </div>
        </Link>

        <nav style={menu}>
          <Link style={menuItem} to="/dashboard">🏠 Inicio</Link>
          <Link style={activeMenuItem} to="/profile">👤 Mi perfil</Link>
          <Link style={menuItem} to="/marketplace">🛒 Marketplace</Link>
          <Link style={menuItem} to="/new-product">➕ Publicar producto</Link>
          <Link style={menuItem} to="/orders">📦 Mis órdenes</Link>
          <Link style={menuItem} to="/disputes">⚖ Mis disputas</Link>
          <Link style={menuItem} to="/complete-profile">🧾 Verificación QSM</Link>
          <button onClick={logout} style={logoutButton}>🚪 Cerrar sesión</button>
        </nav>

        <div style={sideCard}>
          <h3>Protegemos cada transacción</h3>
          <p>Compra y vende con confianza usando identidad QSM, escrow y reputación segura.</p>
        </div>
      </aside>

      <main style={main}>
        <section style={profileShell}>
          <div style={cover}>
            {coverPreview ? (
              <img src={coverPreview} alt="Portada" style={coverImage} />
            ) : (
              <div style={coverDefault}>
                <div style={coverGlass}>
                  <span>🛡 Identidad verificada</span>
                  <span>💰 Pagos protegidos</span>
                  <span>🤖 IA antifraude</span>
                  <span>📦 Historial QSM</span>
                </div>
              </div>
            )}

            <label style={coverButton}>
              📷 Cambiar portada
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e, "cover")}
                style={{ display: "none" }}
              />
            </label>
          </div>

          <div style={profileHeader}>
            <div style={photoArea}>
              <div style={photoFrame}>
                {profilePreview ? (
                  <img src={profilePreview} alt="Perfil" style={profilePhoto} />
                ) : (
                  <div style={profileRequired}>
                    Foto 2x2
                    <br />
                    requerida
                  </div>
                )}

                <label style={cameraButton}>
                  📷
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, "profile")}
                    style={{ display: "none" }}
                  />
                </label>
              </div>
            </div>

            <div style={userInfo}>
              <h1 style={title}>
                {user.firstName || "Usuario"} {user.lastName || "QSM"}
              </h1>

              <p style={username}>
                @{form.username || generateUsername(user.firstName, user.lastName)}
              </p>

              <div style={profileMeta}>
                <span style={statusBadge(formatKyc(user.kycStatus))}>
                  {formatKyc(user.kycStatus)}
                </span>

                <span>🛡 Trust Score {trustScore}/100</span>
                <span>📍 {form.city || "Ciudad pendiente"}</span>
                <span>📅 Miembro desde 2026</span>
              </div>
            </div>

            <div style={profileActions}>
              <button style={editButton}>✏️ Editar perfil</button>
            </div>
          </div>
        </section>

        {!profilePreview && (
          <div style={warningBox}>
            ⚠ La foto 2x2 será obligatoria para validar identidad y vender dentro de QSM.
          </div>
        )}

        {message && <div style={successBox}>{message}</div>}

        <section style={statsGrid}>
          <StatCard icon="📦" title="Productos publicados" value={stats.products} text="Sin datos falsos" />
          <StatCard icon="🛍️" title="Ventas realizadas" value={stats.sales} text="Actividad real del usuario" />
          <StatCard icon="🛒" title="Compras realizadas" value={stats.purchases} text="Compras protegidas QSM" />
          <StatCard icon="⭐" title="Trust Score" value={`${trustScore}/100`} text={getTrustLevel(trustScore)} />
          <StatCard icon="⚖️" title="Disputas" value={stats.disputes} text="Casos abiertos o cerrados" />
        </section>

        <section style={contentGrid}>
          <div style={panel}>
            <div style={panelHeader}>
              <p style={label}>INFORMACIÓN PERSONAL</p>
              <span>✏️</span>
            </div>

            <h2>Datos del usuario</h2>

            <div style={twoColumns}>
              <input
                name="firstName"
                placeholder="Nombre"
                value={form.firstName}
                onChange={handleChange}
                style={input}
              />

              <input
                name="lastName"
                placeholder="Apellido"
                value={form.lastName}
                onChange={handleChange}
                style={input}
              />
            </div>

            <input
              name="username"
              placeholder="Nombre de usuario ejemplo: engelfeliz"
              value={form.username}
              onChange={handleChange}
              style={input}
            />

            <input
              name="phone"
              placeholder="Teléfono"
              value={form.phone}
              onChange={handleChange}
              style={input}
            />

            <div style={twoColumns}>
              <input
                name="city"
                placeholder="Ciudad"
                value={form.city}
                onChange={handleChange}
                style={input}
              />

              <input
                name="birthDate"
                type="date"
                placeholder="Fecha de nacimiento"
                value={form.birthDate}
                onChange={handleChange}
                style={input}
              />
            </div>

            <input
              name="gender"
              placeholder="Género"
              value={form.gender}
              onChange={handleChange}
              style={input}
            />

            <input
              name="address"
              placeholder="Dirección"
              value={form.address}
              onChange={handleChange}
              style={input}
            />

            <button onClick={saveProfile} style={primaryButton}>
              Guardar cambios
            </button>
          </div>

          <div style={panel}>
            <p style={label}>INFORMACIÓN QSM</p>
            <h2>Estado de confianza</h2>

            <InfoRow title="Estado de verificación" value={formatKyc(user.kycStatus)} />
            <InfoRow title="Nivel de vendedor" value={isVerified ? "Habilitable" : "Bloqueado"} />
            <InfoRow title="Método de pago" value="Pendiente" />
            <InfoRow title="Escrow habilitado" value={isVerified ? "Disponible" : "Pendiente"} />
            <InfoRow title="KYC avanzado" value={isVerified ? "Completado" : "Pendiente"} />

            <div style={securityBox}>
              <h3>🔒 Cambio de contraseña</h3>
              <p>Por seguridad, los cambios de contraseña requieren una solicitud segura.</p>

              <button onClick={requestPasswordChange} style={secondaryButton}>
                Solicitar cambio de contraseña
              </button>
            </div>

            {showPasswordRequest && (
              <div style={requestBox}>
                ✅ Solicitud creada. En backend real se enviará un enlace seguro al correo del usuario.
              </div>
            )}
          </div>
        </section>

        <section style={bottomGrid}>
          <div style={panel}>
            <div style={panelHeader}>
              <p style={label}>ACTIVIDAD RECIENTE</p>
              <span style={smallLink}>Ver toda</span>
            </div>

            <EmptyState
              icon="📭"
              title="Aún no tienes actividad"
              text="Cuando publiques productos, compres, vendas o abras una disputa, aparecerá aquí."
            />
          </div>

          <div style={panel}>
            <div style={panelHeader}>
              <p style={label}>LOGROS QSM</p>
              <span style={smallLink}>Ver todos</span>
            </div>

            <div style={badgesGrid}>
              <Badge icon="🛡" title="Usuario verificado" active={isVerified} />
              <Badge icon="📦" title="Primer producto" active={stats.products > 0} />
              <Badge icon="🛍️" title="Primera venta" active={stats.sales > 0} />
              <Badge icon="⭐" title="Trust 90+" active={trustScore >= 90} />
            </div>
          </div>

          <div style={panel}>
            <p style={label}>QSM AI</p>
            <h2>Recomendaciones</h2>

            <div style={aiPanel}>
              <p>
                Hola {user.firstName || "usuario"}. Tu perfil aún puede mejorar.
              </p>

              <ul>
                {!profilePreview && <li>Sube tu foto 2x2 para completar tu identidad.</li>}
                {!form.phone && <li>Agrega tu teléfono para mejorar la verificación.</li>}
                {!form.city && <li>Agrega tu ciudad para generar más confianza.</li>}
                {!isVerified && <li>Completa tu verificación QSM para activar funciones de venta.</li>}
              </ul>

              <Link to="/complete-profile" style={aiButton}>
                Completar verificación QSM
              </Link>
            </div>
          </div>
        </section>
      </main>

      <AiAssistant pageContext="profile" />
    </div>
  );
}

function StatCard({ icon, title, value, text }) {
  return (
    <div style={statCard}>
      <div style={statIcon}>{icon}</div>
      <div>
        <p>{title}</p>
        <h2>{value}</h2>
        <span>{text}</span>
      </div>
    </div>
  );
}

function InfoRow({ title, value }) {
  return (
    <div style={infoRow}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div style={emptyState}>
      <div style={{ fontSize: "38px" }}>{icon}</div>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Badge({ icon, title, active }) {
  return (
    <div style={active ? badgeActive : badgeLocked}>
      <div style={{ fontSize: "34px" }}>{icon}</div>
      <p>{title}</p>
      <span>{active ? "Activo" : "Pendiente"}</span>
    </div>
  );
}

function formatKyc(status) {
  const map = {
    PENDING: "Pendiente",
    PENDING_REVIEW: "En revisión",
    VERIFIED: "Verificado",
    REJECTED: "Rechazado"
  };

  return map[status] || "Pendiente";
}

function generateUsername(firstName, lastName) {
  const cleanFirst = firstName ? firstName.toLowerCase().replaceAll(" ", "") : "usuario";
  const cleanLast = lastName ? lastName.toLowerCase().replaceAll(" ", "") : "qsm";
  return `${cleanFirst}${cleanLast}`;
}

function getTrustLevel(score) {
  if (score >= 90) return "Nivel alto";
  if (score >= 70) return "Nivel medio";
  return "Nivel inicial";
}

const statusBadge = (status) => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 13px",
  borderRadius: "999px",
  fontWeight: "900",
  background:
    status === "Verificado"
      ? "rgba(34,197,94,0.18)"
      : status === "Rechazado"
        ? "rgba(239,68,68,0.18)"
        : "rgba(245,158,11,0.18)",
  color:
    status === "Verificado"
      ? "#86efac"
      : status === "Rechazado"
        ? "#fca5a5"
        : "#fde68a"
});

const page = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at top right, rgba(53,208,195,0.12), transparent 35%), #020617",
  color: "white",
  display: "grid",
  gridTemplateColumns: "260px minmax(0, 1fr)",
  fontFamily: "'Inter', system-ui, sans-serif",
  overflowX: "hidden"
};

const sidebar = {
  minHeight: "100vh",
  background: "rgba(8,17,35,0.92)",
  borderRight: "1px solid rgba(53,208,195,0.18)",
  padding: "28px 16px",
  position: "sticky",
  top: 0,
  overflowX: "hidden"
};

const brand = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  color: "white",
  textDecoration: "none",
  marginBottom: "40px"
};

const brandIcon = {
  width: "46px",
  height: "46px",
  borderRadius: "16px",
  border: "1px solid rgba(53,208,195,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#35d0c3"
};

const brandTitle = {
  display: "block",
  fontSize: "28px",
  lineHeight: "28px"
};

const brandSub = {
  color: "#94a3b8",
  fontSize: "12px"
};

const menu = {
  display: "grid",
  gap: "11px"
};

const menuItem = {
  color: "#cbd5e1",
  textDecoration: "none",
  padding: "13px 14px",
  borderRadius: "15px",
  background: "rgba(15,23,42,0.38)",
  border: "1px solid rgba(148,163,184,0.10)",
  fontWeight: "700",
  fontSize: "15px"
};

const activeMenuItem = {
  ...menuItem,
  background: "rgba(53,208,195,0.14)",
  border: "1px solid rgba(53,208,195,0.35)",
  color: "#35d0c3"
};

const logoutButton = {
  ...menuItem,
  textAlign: "left",
  cursor: "pointer",
  border: "1px solid rgba(248,113,113,0.24)",
  color: "#fca5a5"
};

const sideCard = {
  marginTop: "36px",
  background: "rgba(53,208,195,0.08)",
  border: "1px solid rgba(53,208,195,0.18)",
  borderRadius: "22px",
  padding: "20px",
  color: "#cbd5e1"
};

const main = {
  width: "100%",
  minWidth: 0,
  maxWidth: "1600px",
  margin: "0 auto",
  padding: "30px",
  overflowX: "hidden"
};

const profileShell = {
  background: "rgba(15,23,42,0.42)",
  border: "1px solid rgba(53,208,195,0.18)",
  borderRadius: "28px",
  overflow: "hidden",
  marginBottom: "24px"
};

const cover = {
  height: "260px",
  position: "relative",
  overflow: "hidden",
  background:
    "linear-gradient(135deg, rgba(2,6,23,0.92), rgba(30,58,138,0.85)), url('https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1920&q=90')",
  backgroundSize: "cover",
  backgroundPosition: "center"
};

const coverImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const coverDefault = {
  width: "100%",
  height: "100%",
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.15), rgba(2,6,23,0.78))",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: "26px"
};

const coverGlass = {
  display: "flex",
  gap: "14px",
  flexWrap: "wrap",
  background: "rgba(2,6,23,0.55)",
  border: "1px solid rgba(53,208,195,0.20)",
  borderRadius: "18px",
  padding: "14px 20px",
  backdropFilter: "blur(18px)",
  color: "#cbd5e1",
  fontWeight: "800",
  fontSize: "13px"
};

const coverButton = {
  position: "absolute",
  right: "20px",
  bottom: "20px",
  background: "rgba(2,6,23,0.86)",
  border: "1px solid rgba(53,208,195,0.38)",
  color: "white",
  padding: "11px 15px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "800",
  fontSize: "14px"
};

const profileHeader = {
  display: "grid",
  gridTemplateColumns: "170px minmax(0, 1fr) auto",
  alignItems: "end",
  gap: "24px",
  padding: "0 34px 34px",
  marginTop: "-90px"
};

const photoArea = {
  width: "170px",
  position: "relative"
};

const photoFrame = {
  width: "160px",
  height: "160px",
  borderRadius: "50%",
  border: "5px solid #020617",
  background: "#020617",
  overflow: "hidden",
  position: "relative",
  boxShadow: "0 20px 60px rgba(0,0,0,0.55)"
};

const profilePhoto = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const profileRequired = {
  width: "100%",
  height: "100%",
  background: "rgba(15,23,42,0.95)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  color: "#fca5a5",
  fontWeight: "900"
};

const cameraButton = {
  position: "absolute",
  right: "8px",
  bottom: "8px",
  width: "42px",
  height: "42px",
  borderRadius: "50%",
  background: "#0f172a",
  border: "1px solid rgba(53,208,195,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontSize: "18px"
};

const userInfo = {
  minWidth: 0
};

const title = {
  fontSize: "38px",
  fontWeight: "900",
  lineHeight: "42px",
  margin: "0 0 4px",
  letterSpacing: "-1.2px"
};

const username = {
  color: "#cbd5e1",
  fontSize: "18px",
  margin: "0 0 12px"
};

const profileMeta = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  color: "#cbd5e1",
  alignItems: "center"
};

const profileActions = {
  display: "flex",
  justifyContent: "flex-end"
};

const editButton = {
  background: "rgba(53,208,195,0.12)",
  border: "1px solid rgba(53,208,195,0.45)",
  color: "#35d0c3",
  padding: "13px 18px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "900"
};

const warningBox = {
  background: "rgba(127,29,29,0.22)",
  border: "1px solid rgba(248,113,113,0.28)",
  color: "#fca5a5",
  borderRadius: "18px",
  padding: "15px",
  marginBottom: "22px",
  fontWeight: "800"
};

const successBox = {
  background: "rgba(6,78,59,0.25)",
  border: "1px solid rgba(134,239,172,0.28)",
  color: "#86efac",
  borderRadius: "18px",
  padding: "15px",
  marginBottom: "22px",
  fontWeight: "800"
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  marginBottom: "24px"
};

const statCard = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "22px",
  padding: "20px"
};

const statIcon = {
  width: "54px",
  height: "54px",
  borderRadius: "18px",
  background: "rgba(53,208,195,0.12)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px"
};

const contentGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
  gap: "24px",
  marginBottom: "24px"
};

const bottomGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) minmax(320px, 0.9fr)",
  gap: "24px"
};

const panel = {
  background: "rgba(15,23,42,0.62)",
  border: "1px solid rgba(53,208,195,0.18)",
  borderRadius: "26px",
  padding: "26px",
  backdropFilter: "blur(18px)",
  minWidth: 0
};

const panelHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const label = {
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "900"
};

const smallLink = {
  color: "#35d0c3",
  fontWeight: "800",
  fontSize: "13px"
};

const twoColumns = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "12px"
};

const input = {
  width: "100%",
  padding: "14px",
  marginBottom: "12px",
  borderRadius: "14px",
  border: "1px solid rgba(148,163,184,0.22)",
  background: "rgba(2,6,23,0.78)",
  color: "white",
  outline: "none",
  fontFamily: "'Inter', system-ui, sans-serif"
};

const primaryButton = {
  width: "100%",
  background: "#35d0c3",
  color: "#020617",
  border: "none",
  padding: "14px",
  borderRadius: "14px",
  fontWeight: "900",
  cursor: "pointer"
};

const secondaryButton = {
  ...primaryButton,
  background: "rgba(53,208,195,0.14)",
  color: "#35d0c3",
  border: "1px solid rgba(53,208,195,0.35)"
};

const infoRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "14px",
  padding: "14px 0",
  borderBottom: "1px solid rgba(148,163,184,0.12)",
  color: "#cbd5e1"
};

const securityBox = {
  marginTop: "20px",
  background: "rgba(2,6,23,0.48)",
  border: "1px solid rgba(53,208,195,0.14)",
  borderRadius: "20px",
  padding: "20px",
  color: "#cbd5e1"
};

const requestBox = {
  marginTop: "16px",
  background: "rgba(6,78,59,0.25)",
  border: "1px solid rgba(134,239,172,0.28)",
  color: "#86efac",
  padding: "14px",
  borderRadius: "16px"
};

const emptyState = {
  textAlign: "center",
  color: "#94a3b8",
  padding: "28px 10px"
};

const badgesGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "14px"
};

const badgeActive = {
  textAlign: "center",
  background: "rgba(34,197,94,0.10)",
  border: "1px solid rgba(34,197,94,0.22)",
  borderRadius: "18px",
  padding: "16px"
};

const badgeLocked = {
  textAlign: "center",
  background: "rgba(15,23,42,0.42)",
  border: "1px solid rgba(148,163,184,0.12)",
  borderRadius: "18px",
  padding: "16px",
  opacity: 0.65
};

const aiPanel = {
  background: "rgba(2,6,23,0.48)",
  border: "1px solid rgba(53,208,195,0.16)",
  borderRadius: "20px",
  padding: "20px",
  color: "#cbd5e1"
};

const aiButton = {
  display: "block",
  marginTop: "18px",
  textAlign: "center",
  color: "#020617",
  background: "#35d0c3",
  padding: "13px",
  borderRadius: "14px",
  textDecoration: "none",
  fontWeight: "900"
};

export default Profile;