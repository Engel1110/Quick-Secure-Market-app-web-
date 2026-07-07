import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

function Profile() {
  const navigate = useNavigate();

  const savedUser =
    safeJson(localStorage.getItem("qsm_user")) ||
    safeJson(localStorage.getItem("user")) ||
    {
      firstName: "Usuario",
      lastName: "QSM",
      email: "usuario@qsm.com",
      trustScore: 60,
      verificationStatus: "NOT_SUBMITTED",
      role: "USER"
    };

  const savedSettings =
    safeJson(localStorage.getItem("qsm_settings")) || {
      theme: localStorage.getItem("qsm_theme") || "dark",
      accentColor: localStorage.getItem("qsm_accent") || "cyan",
      language: localStorage.getItem("qsm_language") || "es",
      density: "comfortable",
      animations: true,
      glassEffect: true,
      compactSidebar: false
    };

  const [user, setUser] = useState(savedUser);
  const [settings, setSettings] = useState(savedSettings);
  const [profilePreview, setProfilePreview] = useState(savedUser.profilePhoto || savedUser.avatar || "");
  const [coverPreview, setCoverPreview] = useState(savedUser.coverPhoto || "");
  const [profileFile, setProfileFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [stats, setStats] = useState({
    products: 0,
    sales: 0,
    purchases: 0,
    disputes: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: savedUser.firstName || "",
    lastName: savedUser.lastName || "",
    username: savedUser.username || "",
    phone: savedUser.phone || "",
    city: savedUser.city || "",
    province: savedUser.province || "",
    address: savedUser.address || "",
    birthDate: savedUser.birthDate ? String(savedUser.birthDate).slice(0, 10) : "",
    gender: savedUser.gender || "",
    bio: savedUser.bio || ""
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const theme = settings.theme || "dark";
  const accent = getAccentColor(settings.accentColor || "cyan");
  const isLight = theme === "light";

  const isVerified =
    user.isVerified ||
    user.verificationStatus === "APPROVED" ||
    user.verificationStatus === "VERIFIED" ||
    user.kycStatus === "VERIFIED";

  const trustScore = Number(user.trustScore || 50);

  const completion = useMemo(() => {
    const checks = [
      Boolean(form.firstName.trim()),
      Boolean(form.lastName.trim()),
      Boolean(user.email),
      Boolean(form.phone.trim()),
      Boolean(form.city.trim()),
      Boolean(form.province.trim()),
      Boolean(form.gender),
      Boolean(form.birthDate),
      Boolean(profilePreview),
      isVerified
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [form, user.email, profilePreview, isVerified]);

  useEffect(() => {
    loadProfile();
    loadSettings();
  }, []);

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await api.get("/users/me");
      const backendUser = response.data.user || response.data.data || response.data;

      if (backendUser) {
        setUser(backendUser);
        localStorage.setItem("qsm_user", JSON.stringify(backendUser));

        setForm({
          firstName: backendUser.firstName || "",
          lastName: backendUser.lastName || "",
          username: backendUser.username || "",
          phone: backendUser.phone || "",
          city: backendUser.city || "",
          province: backendUser.province || "",
          address: backendUser.address || "",
          birthDate: backendUser.birthDate ? String(backendUser.birthDate).slice(0, 10) : "",
          gender: backendUser.gender || "",
          bio: backendUser.bio || ""
        });

        setProfilePreview(toAbsoluteFile(backendUser.profilePhoto || backendUser.avatar || ""));
        setCoverPreview(toAbsoluteFile(backendUser.coverPhoto || ""));
      }

      await loadProfileStats();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo cargar el perfil desde el backend. Mostrando datos locales."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadProfileStats = async () => {
    try {
      const response = await api.get("/users/me/stats");
      const backendStats = response.data.stats || response.data.data || response.data;

      setStats({
        products: backendStats.products || backendStats.productsCount || 0,
        sales: backendStats.sales || backendStats.salesCount || 0,
        purchases: backendStats.purchases || backendStats.purchasesCount || 0,
        disputes: backendStats.disputes || backendStats.disputesCount || 0
      });
    } catch {
      setStats({
        products: user.productsCount || 0,
        sales: user.salesCount || 0,
        purchases: user.purchasesCount || 0,
        disputes: user.disputesCount || 0
      });
    }
  };

  const loadSettings = async () => {
    try {
      const response = await api.get("/settings/me");
      const backendSettings = response.data.settings || response.data.data || response.data;

      if (backendSettings) {
        const merged = {
          ...savedSettings,
          ...backendSettings
        };

        setSettings(merged);
        localStorage.setItem("qsm_settings", JSON.stringify(merged));
      }
    } catch {
      setSettings(savedSettings);
    }
  };

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  };

  const handleImageChange = (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);

    if (type === "profile") {
      setProfileFile(file);
      setProfilePreview(preview);
    }

    if (type === "cover") {
      setCoverFile(file);
      setCoverPreview(preview);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      let uploadedProfilePhoto = user.profilePhoto || user.avatar || "";
      let uploadedCoverPhoto = user.coverPhoto || "";

      if (profileFile || coverFile) {
        const formData = new FormData();

        if (profileFile) formData.append("profilePhoto", profileFile);
        if (coverFile) formData.append("coverPhoto", coverFile);

        try {
          const uploadResponse = await api.post("/users/me/photos", formData, {
            headers: { "Content-Type": "multipart/form-data" }
          });

          uploadedProfilePhoto =
            uploadResponse.data.profilePhoto ||
            uploadResponse.data.avatar ||
            uploadedProfilePhoto;

          uploadedCoverPhoto =
            uploadResponse.data.coverPhoto ||
            uploadedCoverPhoto;
        } catch {
          // Si el endpoint de fotos no existe todavía, guardamos solo los datos de texto.
        }
      }

      const payload = {
        ...form,
        profilePhoto: uploadedProfilePhoto,
        coverPhoto: uploadedCoverPhoto
      };

      const response = await api.put("/users/me", payload);
      const updatedUser = response.data.user || response.data.data || response.data;

      const finalUser = {
        ...user,
        ...updatedUser,
        ...payload
      };

      setUser(finalUser);
      localStorage.setItem("qsm_user", JSON.stringify(finalUser));
      setMessage("Perfil actualizado correctamente.");
    } catch (err) {
      const localUser = {
        ...user,
        ...form,
        profilePhoto: profilePreview,
        coverPhoto: coverPreview
      };

      setUser(localUser);
      localStorage.setItem("qsm_user", JSON.stringify(localUser));

      setError(
        err?.response?.data?.message ||
          "No se pudo guardar en backend. Se guardó temporalmente en localStorage."
      );
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("qsm_user");
    localStorage.removeItem("user");
    localStorage.removeItem("qsm_token");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div style={page(isLight)}>
      <style>{`
        * { box-sizing: border-box; }

        html, body, #root {
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background: ${isLight ? "#f8fafc" : "#020617"};
          font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
        }

        input::placeholder, textarea::placeholder {
          color: ${isLight ? "#94a3b8" : "#64748b"};
        }

        input, select, textarea, button, a {
          font-family: inherit;
        }

        button, a {
          transition: ${settings.animations === false ? "none" : "all .25s ease"};
        }

        button:hover, a:hover {
          transform: ${settings.animations === false ? "none" : "translateY(-2px)"};
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1240px) {
          .profile-page {
            grid-template-columns: 1fr !important;
          }

          .sidebar-wrapper {
            display: none !important;
          }

          .profile-layout,
          .stats-grid,
          .two-columns {
            grid-template-columns: 1fr !important;
          }

          .hero-actions {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 760px) {
          .main-content {
            padding: 18px !important;
          }

          .profile-header {
            flex-direction: column !important;
            align-items: flex-start !important;
          }

          .photo-row {
            flex-direction: column !important;
          }
        }
      `}</style>

      <div className="profile-page" style={layout(settings)}>
        <div className="sidebar-wrapper">
          <Sidebar />
        </div>

        <main className="main-content" style={main(settings)}>
          <Topbar />

          {loading ? (
            <div style={centerCard(isLight)}>
              <h2>Cargando perfil...</h2>
              <p>QSM está consultando tu información.</p>
            </div>
          ) : (
            <>
              <section style={profileShell(isLight, settings)}>
                <div style={cover(isLight, accent)}>
                  {coverPreview ? (
                    <img src={coverPreview} alt="Portada" style={coverImage} />
                  ) : (
                    <div style={coverDefault(accent)}>
                      <div style={coverGlass(isLight)}>
                        <span>🛡 Identidad protegida</span>
                        <span>💰 Pago Protegido</span>
                        <span>🤖 QSM AI</span>
                        <span>📦 Historial seguro</span>
                      </div>
                    </div>
                  )}

                  <label style={coverButton(accent)}>
                    📷 Cambiar portada
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleImageChange(event, "cover")}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                <div className="profile-header" style={profileHeader}>
                  <div className="photo-row" style={photoRow}>
                    <div style={photoFrame(accent)}>
                      {profilePreview ? (
                        <img src={profilePreview} alt="Perfil" style={photoImage} />
                      ) : (
                        <span>{(form.firstName || user.email || "U").charAt(0).toUpperCase()}</span>
                      )}

                      <label style={photoButton(accent)}>
                        📷
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => handleImageChange(event, "profile")}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>

                    <div>
                      <p style={label(accent)}>MI PERFIL QSM</p>
                      <h1 style={profileName(isLight)}>
                        {form.firstName || "Usuario"} {form.lastName || "QSM"}
                      </h1>
                      <p style={muted(isLight)}>{user.email || "usuario@qsm.com"}</p>

                      <div style={badges}>
                        <span style={verifiedBadge(isVerified)}>
                          {isVerified ? "✅ Verificado" : "🟡 Pendiente de verificación"}
                        </span>

                        <span style={trustBadge(accent)}>
                          Confianza {trustScore}/100
                        </span>

                        <span style={roleBadge}>
                          {user.role || "USER"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="hero-actions" style={heroActions}>
                    <Link to="/complete-profile" style={outlineButton(isLight)}>
                      Verificación
                    </Link>

                    <Link to="/settings" style={outlineButton(isLight)}>
                      Configuración
                    </Link>

                    <button onClick={logout} style={dangerButton}>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </section>

              {message && <div style={successBox}>{message}</div>}
              {error && <div style={errorBox}>{error}</div>}

              <section className="stats-grid" style={statsGrid}>
                <StatCard icon="📦" title="Productos" value={stats.products} isLight={isLight} accent={accent} />
                <StatCard icon="💰" title="Ventas" value={stats.sales} isLight={isLight} accent={accent} />
                <StatCard icon="🛒" title="Compras" value={stats.purchases} isLight={isLight} accent={accent} />
                <StatCard icon="⚖️" title="Reclamos" value={stats.disputes} isLight={isLight} accent={accent} />
              </section>

              <section className="profile-layout" style={profileLayout}>
                <section style={panel(isLight, settings)}>
                  <div style={sectionHeader}>
                    <p style={label(accent)}>DATOS PERSONALES</p>
                    <h2 style={panelTitle(isLight)}>Editar perfil</h2>
                    <p style={muted(isLight)}>
                      Esta información se conecta al backend y se usa para mejorar tu reputación dentro de QSM.
                    </p>
                  </div>

                  <div className="two-columns" style={twoColumns}>
                    <Field label="Nombre" isLight={isLight}>
                      <input name="firstName" value={form.firstName} onChange={handleChange} style={input(isLight)} />
                    </Field>

                    <Field label="Apellido" isLight={isLight}>
                      <input name="lastName" value={form.lastName} onChange={handleChange} style={input(isLight)} />
                    </Field>

                    <Field label="Usuario" isLight={isLight}>
                      <input name="username" value={form.username} onChange={handleChange} placeholder="@usuario" style={input(isLight)} />
                    </Field>

                    <Field label="Teléfono" isLight={isLight}>
                      <input name="phone" value={form.phone} onChange={handleChange} placeholder="809-000-0000" style={input(isLight)} />
                    </Field>

                    <Field label="Provincia" isLight={isLight}>
                      <input name="province" value={form.province} onChange={handleChange} placeholder="Distrito Nacional" style={input(isLight)} />
                    </Field>

                    <Field label="Ciudad" isLight={isLight}>
                      <input name="city" value={form.city} onChange={handleChange} placeholder="Santo Domingo" style={input(isLight)} />
                    </Field>

                    <Field label="Fecha de nacimiento" isLight={isLight}>
                      <input name="birthDate" type="date" value={form.birthDate} onChange={handleChange} style={input(isLight)} />
                    </Field>

                    <Field label="Género" isLight={isLight}>
                      <select name="gender" value={form.gender} onChange={handleChange} style={input(isLight)}>
                        <option value="">Seleccionar</option>
                        <option value="MASCULINO">Masculino</option>
                        <option value="FEMENINO">Femenino</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    </Field>
                  </div>

                  <Field label="Dirección general" isLight={isLight}>
                    <input
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="No se mostrará públicamente"
                      style={input(isLight)}
                    />
                  </Field>

                  <Field label="Biografía / descripción" isLight={isLight}>
                    <textarea
                      name="bio"
                      value={form.bio}
                      onChange={handleChange}
                      placeholder="Ej: Vendedor verificado, productos tecnológicos, entregas en Santo Domingo..."
                      style={textarea(isLight)}
                    />
                  </Field>

                  <div style={actionRow}>
                    <button onClick={loadProfile} style={outlineButton(isLight)}>
                      Actualizar
                    </button>

                    <button onClick={saveProfile} disabled={saving} style={primaryButton(accent)}>
                      {saving ? "Guardando..." : "Guardar perfil →"}
                    </button>
                  </div>
                </section>

                <aside style={sidePanel}>
                  <section style={panel(isLight, settings)}>
                    <p style={label(accent)}>PROGRESO</p>
                    <h2 style={panelTitle(isLight)}>Perfil QSM</h2>

                    <div style={scoreCircle(accent)}>
                      <span>{completion}%</span>
                    </div>

                    <div style={scoreBar(isLight)}>
                      <div style={{ ...scoreFill(accent), width: `${completion}%` }}></div>
                    </div>

                    <CheckLine done={Boolean(form.firstName && form.lastName)} text="Nombre completo" isLight={isLight} />
                    <CheckLine done={Boolean(form.phone)} text="Teléfono registrado" isLight={isLight} />
                    <CheckLine done={Boolean(profilePreview)} text="Foto de perfil" isLight={isLight} />
                    <CheckLine done={isVerified} text="Verificación QSM" isLight={isLight} />
                  </section>

                  <section style={panel(isLight, settings)}>
                    <p style={label(accent)}>CONFIGURACIÓN APLICADA</p>
                    <h2 style={panelTitle(isLight)}>Preferencias activas</h2>

                    <InfoLine title="Tema" value={settings.theme === "dark" ? "Oscuro" : "Claro"} isLight={isLight} />
                    <InfoLine title="Color" value={formatAccent(settings.accentColor)} isLight={isLight} />
                    <InfoLine title="Idioma" value={settings.language === "es" ? "Español" : "English"} isLight={isLight} />
                    <InfoLine title="Densidad" value={formatDensity(settings.density)} isLight={isLight} />

                    <Link to="/settings" style={primaryButton(accent)}>
                      Cambiar configuración
                    </Link>
                  </section>

                  <section style={securityBox(isLight)}>
                    <h3>🛡 Seguridad del perfil</h3>
                    <p>
                      Mantén tu cuenta verificada, evita compartir datos sensibles por mensajes y conserva tus operaciones dentro de QSM.
                    </p>
                  </section>
                </aside>
              </section>
            </>
          )}
        </main>
      </div>

      <AiAssistant pageContext="profile" />
    </div>
  );
}

function Field({ label, children, isLight }) {
  return (
    <label style={fieldWrap}>
      <span style={fieldLabel(isLight)}>{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon, title, value, isLight, accent }) {
  return (
    <div style={statCard(isLight)}>
      <div style={statIcon(accent)}>{icon}</div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function CheckLine({ done, text, isLight }) {
  return (
    <div style={checkLine(isLight)}>
      <span style={done ? checkDone : checkPending}>{done ? "✓" : "•"}</span>
      <p>{text}</p>
    </div>
  );
}

function InfoLine({ title, value, isLight }) {
  return (
    <div style={infoLine(isLight)}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function toAbsoluteFile(path) {
  if (!path) return "";
  if (String(path).startsWith("blob:")) return path;
  if (String(path).startsWith("http")) return path;
  if (String(path).startsWith("/uploads")) return `http://localhost:5000${path}`;
  if (String(path).startsWith("uploads")) return `http://localhost:5000/${path}`;
  return path;
}

function getAccentColor(color) {
  const map = {
    cyan: "#35d0c3",
    purple: "#8b5cf6",
    pink: "#ec4899",
    blue: "#38bdf8",
    green: "#22c55e",
    orange: "#f59e0b"
  };

  return map[color] || "#35d0c3";
}

function formatAccent(color) {
  const map = {
    cyan: "Cian",
    purple: "Morado",
    pink: "Rosado",
    blue: "Azul",
    green: "Verde",
    orange: "Naranja"
  };

  return map[color] || color || "Cian";
}

function formatDensity(density) {
  const map = {
    comfortable: "Cómodo",
    compact: "Compacto",
    spacious: "Espacioso"
  };

  return map[density] || "Cómodo";
}

function applySettings(settings) {
  const accent = getAccentColor(settings.accentColor || "cyan");

  document.documentElement.style.setProperty("--qsm-accent", accent);
  document.body.dataset.qsmTheme = settings.theme || "dark";

  localStorage.setItem("qsm_theme", settings.theme || "dark");
  localStorage.setItem("qsm_accent", settings.accentColor || "cyan");
  localStorage.setItem("qsm_language", settings.language || "es");
  localStorage.setItem("qsm_settings", JSON.stringify(settings));
}

const page = (isLight) => ({
  minHeight: "100vh",
  width: "100%",
  background: isLight
    ? "radial-gradient(circle at top right, rgba(53,208,195,.16), transparent 34%), #f8fafc"
    : "radial-gradient(circle at top right, rgba(139,92,246,.14), transparent 34%), radial-gradient(circle at 18% 15%, rgba(53,208,195,.10), transparent 28%), #020617",
  color: isLight ? "#0f172a" : "white"
});

const layout = (settings) => ({
  width: "100%",
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: settings.compactSidebar ? "230px minmax(0, 1fr)" : "280px minmax(0, 1fr)",
  overflowX: "hidden"
});

const main = (settings) => ({
  width: "100%",
  minWidth: 0,
  padding:
    settings.density === "compact"
      ? "18px 24px 42px"
      : settings.density === "spacious"
      ? "34px 44px 70px"
      : "26px 34px 56px",
  overflowX: "hidden"
});

const profileShell = (isLight, settings) => ({
  background: isLight ? "rgba(255,255,255,.88)" : "rgba(15,23,42,.72)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(56,189,248,.16)",
  borderRadius: "30px",
  overflow: "hidden",
  boxShadow: isLight ? "0 24px 70px rgba(15,23,42,.08)" : "0 24px 90px rgba(0,0,0,.25)",
  animation: settings.animations === false ? "none" : "fadeUp .35s ease",
  backdropFilter: settings.glassEffect === false ? "none" : "blur(16px)",
  marginTop: "22px",
  marginBottom: "20px"
});

const cover = (isLight, accent) => ({
  height: "260px",
  position: "relative",
  background: `linear-gradient(135deg, ${accent}30, rgba(139,92,246,.22), ${isLight ? "#e2e8f0" : "#020617"})`,
  overflow: "hidden"
});

const coverImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const coverDefault = (accent) => ({
  width: "100%",
  height: "100%",
  background:
    `radial-gradient(circle at 20% 25%, ${accent}55, transparent 28%), radial-gradient(circle at 80% 30%, rgba(139,92,246,.45), transparent 28%), linear-gradient(135deg, rgba(2,6,23,.9), rgba(15,23,42,.72))`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
});

const coverGlass = (isLight) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  padding: "18px",
  borderRadius: "22px",
  background: isLight ? "rgba(255,255,255,.72)" : "rgba(2,6,23,.45)",
  border: "1px solid rgba(255,255,255,.18)",
  backdropFilter: "blur(18px)",
  color: "white",
  fontWeight: "900"
});

const coverButton = (accent) => ({
  position: "absolute",
  right: "22px",
  bottom: "22px",
  background: `${accent}22`,
  border: `1px solid ${accent}66`,
  color: "white",
  padding: "12px 15px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: "900",
  backdropFilter: "blur(14px)"
});

const profileHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "22px",
  padding: "0 26px 26px"
};

const photoRow = {
  display: "flex",
  alignItems: "flex-end",
  gap: "20px",
  marginTop: "-58px"
};

const photoFrame = (accent) => ({
  width: "136px",
  height: "136px",
  borderRadius: "36px",
  background: `linear-gradient(135deg, ${accent}, #8b5cf6)`,
  border: "5px solid rgba(255,255,255,.9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  fontSize: "54px",
  fontWeight: "950",
  position: "relative",
  overflow: "hidden",
  boxShadow: `0 0 50px ${accent}33`
});

const photoImage = {
  width: "100%",
  height: "100%",
  objectFit: "cover"
};

const photoButton = (accent) => ({
  position: "absolute",
  right: "8px",
  bottom: "8px",
  width: "38px",
  height: "38px",
  borderRadius: "50%",
  background: accent,
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  border: "2px solid white"
});

const label = (accent) => ({
  color: accent,
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "950",
  textTransform: "uppercase",
  margin: 0
});

const profileName = (isLight) => ({
  fontSize: "clamp(34px, 3vw, 52px)",
  lineHeight: "1",
  margin: "8px 0",
  color: isLight ? "#0f172a" : "white"
});

const muted = (isLight) => ({
  color: isLight ? "#475569" : "#cbd5e1",
  lineHeight: "25px"
});

const badges = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "14px"
};

const verifiedBadge = (verified) => ({
  background: verified ? "rgba(34,197,94,.14)" : "rgba(245,158,11,.16)",
  color: verified ? "#86efac" : "#fde68a",
  border: verified ? "1px solid rgba(34,197,94,.34)" : "1px solid rgba(245,158,11,.34)",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900"
});

const trustBadge = (accent) => ({
  background: `${accent}22`,
  color: accent,
  border: `1px solid ${accent}66`,
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900"
});

const roleBadge = {
  background: "rgba(139,92,246,.18)",
  color: "#ddd6fe",
  border: "1px solid rgba(139,92,246,.34)",
  padding: "8px 12px",
  borderRadius: "999px",
  fontWeight: "900"
};

const heroActions = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "10px"
};

const outlineButton = (isLight) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: isLight ? "rgba(255,255,255,.82)" : "rgba(15,23,42,.64)",
  border: isLight ? "1px solid rgba(15,23,42,.10)" : "1px solid rgba(148,163,184,.16)",
  color: isLight ? "#0f172a" : "white",
  textDecoration: "none",
  borderRadius: "13px",
  padding: "13px 15px",
  fontWeight: "950",
  cursor: "pointer"
});

const dangerButton = {
  background: "rgba(239,68,68,.16)",
  border: "1px solid rgba(239,68,68,.32)",
  color: "#fecaca",
  borderRadius: "13px",
  padding: "13px 15px",
  fontWeight: "950",
  cursor: "pointer"
};

const successBox = {
  background: "rgba(34,197,94,.14)",
  border: "1px solid rgba(34,197,94,.32)",
  color: "#bbf7d0",
  padding: "14px 18px",
  borderRadius: "16px",
  marginBottom: "16px",
  fontWeight: "800"
};

const errorBox = {
  background: "rgba(127,29,29,.24)",
  border: "1px solid rgba(248,113,113,.30)",
  color: "#fecaca",
  padding: "14px 18px",
  borderRadius: "16px",
  marginBottom: "16px",
  fontWeight: "800"
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px"
};

const statCard = (isLight) => ({
  display: "flex",
  alignItems: "center",
  gap: "14px",
  background: isLight ? "rgba(255,255,255,.86)" : "rgba(15,23,42,.72)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(56,189,248,.15)",
  borderRadius: "22px",
  padding: "20px",
  boxShadow: isLight ? "0 18px 50px rgba(15,23,42,.06)" : "none"
});

const statIcon = (accent) => ({
  width: "52px",
  height: "52px",
  borderRadius: "17px",
  background: `${accent}22`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px"
});

const profileLayout = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.3fr) minmax(340px, .7fr)",
  gap: "20px"
};

const panel = (isLight, settings) => ({
  background: isLight ? "rgba(255,255,255,.86)" : "rgba(15,23,42,.72)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(56,189,248,.16)",
  borderRadius: "26px",
  padding: "24px",
  boxShadow: isLight ? "0 18px 60px rgba(15,23,42,.07)" : "0 24px 80px rgba(0,0,0,.18)",
  backdropFilter: settings.glassEffect === false ? "none" : "blur(16px)"
});

const sectionHeader = {
  marginBottom: "20px"
};

const panelTitle = (isLight) => ({
  color: isLight ? "#0f172a" : "white",
  margin: "8px 0"
});

const twoColumns = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px",
  marginBottom: "14px"
};

const fieldWrap = {
  display: "grid",
  gap: "8px",
  marginBottom: "14px"
};

const fieldLabel = (isLight) => ({
  fontWeight: "900",
  color: isLight ? "#1e293b" : "#e2e8f0"
});

const input = (isLight) => ({
  width: "100%",
  minHeight: "54px",
  background: isLight ? "rgba(248,250,252,.95)" : "rgba(2,6,23,.55)",
  border: isLight ? "1px solid rgba(15,23,42,.12)" : "1px solid rgba(148,163,184,.16)",
  color: isLight ? "#0f172a" : "white",
  borderRadius: "15px",
  padding: "0 14px",
  outline: "none"
});

const textarea = (isLight) => ({
  ...input(isLight),
  minHeight: "120px",
  padding: "14px",
  resize: "vertical",
  lineHeight: "24px"
});

const actionRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1.5fr",
  gap: "10px",
  marginTop: "18px"
};

const primaryButton = (accent) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: `linear-gradient(135deg, ${accent}, #38bdf8, #8b5cf6)`,
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "14px 20px",
  borderRadius: "14px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: `0 18px 54px ${accent}2e`
});

const sidePanel = {
  display: "grid",
  gap: "18px",
  alignSelf: "start"
};

const scoreCircle = (accent) => ({
  width: "128px",
  height: "128px",
  borderRadius: "50%",
  border: `10px solid ${accent}33`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "22px auto",
  color: accent,
  fontSize: "30px",
  fontWeight: "950"
});

const scoreBar = (isLight) => ({
  height: "10px",
  background: isLight ? "rgba(15,23,42,.10)" : "rgba(148,163,184,.16)",
  borderRadius: "999px",
  overflow: "hidden",
  marginBottom: "18px"
});

const scoreFill = (accent) => ({
  height: "100%",
  background: `linear-gradient(90deg, ${accent}, #38bdf8, #8b5cf6)`,
  borderRadius: "999px"
});

const checkLine = (isLight) => ({
  display: "flex",
  gap: "10px",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(148,163,184,.10)",
  color: isLight ? "#0f172a" : "#cbd5e1"
});

const checkDone = {
  width: "26px",
  height: "26px",
  borderRadius: "50%",
  background: "#35d0c3",
  color: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "950"
};

const checkPending = {
  ...checkDone,
  background: "rgba(148,163,184,.16)",
  color: "#94a3b8"
};

const infoLine = (isLight) => ({
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  padding: "12px 0",
  borderBottom: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(148,163,184,.10)",
  color: isLight ? "#0f172a" : "#cbd5e1"
});

const securityBox = (isLight) => ({
  background: isLight ? "rgba(255,255,255,.86)" : "rgba(53,208,195,.10)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(53,208,195,.26)",
  color: isLight ? "#0f172a" : "#cbd5e1",
  borderRadius: "26px",
  padding: "22px"
});

const centerCard = (isLight) => ({
  background: isLight ? "rgba(255,255,255,.86)" : "rgba(15,23,42,.72)",
  border: isLight ? "1px solid rgba(15,23,42,.08)" : "1px solid rgba(56,189,248,.14)",
  borderRadius: "24px",
  padding: "44px",
  textAlign: "center",
  color: isLight ? "#0f172a" : "#cbd5e1"
});

export default Profile;
