import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

function CompleteProfile() {
  const savedUser =
    safeJson(localStorage.getItem("qsm_user")) ||
    safeJson(localStorage.getItem("user")) ||
    {};

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    firstName: savedUser.firstName || "",
    lastName: savedUser.lastName || "",
    phone: savedUser.phone || "",
    documentType: "CEDULA",
    documentNumber: "",
    address: "",
    city: "",
    province: "",
    gender: "",
    birthDate: ""
  });

  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);

  const [frontPreview, setFrontPreview] = useState("");
  const [backPreview, setBackPreview] = useState("");
  const [selfiePreview, setSelfiePreview] = useState("");
  const [profilePhotoPreview, setProfilePhotoPreview] = useState("");

  const [editingFields, setEditingFields] = useState({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadVerification();
  }, []);

  const completion = useMemo(() => {
    const checks = [
      Boolean(form.firstName.trim()),
      Boolean(form.lastName.trim()),
      Boolean(form.phone.trim()),
      Boolean(form.documentNumber.trim()),
      Boolean(form.address.trim()),
      Boolean(form.city.trim()),
      Boolean(form.province.trim()),
      Boolean(form.gender),
      Boolean(form.birthDate),
      Boolean(frontFile || profile?.documentFrontUrl),
      Boolean(backFile || profile?.documentBackUrl),
      Boolean(selfieFile || profile?.selfieUrl),
      Boolean(
        profilePhotoFile ||
        profile?.profilePhotoUrl ||
        profile?.profilePhoto
      )
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [
    form,
    frontFile,
    backFile,
    selfieFile,
    profilePhotoFile,
    profile
  ]);

  const status = profile?.status || "NOT_SUBMITTED";

  const loadVerification = async () => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await api.get("/verification/me");
      const data = response.data.verification || response.data.data || null;

      if (data) {
        setProfile(data);
        setForm((prev) => ({
          ...prev,
          firstName: data.firstName || prev.firstName,
          lastName: data.lastName || prev.lastName,
          phone: data.phone || prev.phone,
          documentType: data.documentType || "CEDULA",
          documentNumber: data.documentNumber || "",
          address: data.address || "",
          city: data.city || "",
          province: data.province || "",
          gender: data.gender || "",
          birthDate: data.birthDate ? String(data.birthDate).slice(0, 10) : ""
        }));
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo cargar tu verificación. Verifica GET /verification/me."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  };

  const handleFile = (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);

    if (type === "front") {
      setFrontFile(file);
      setFrontPreview(preview);
    }

    if (type === "back") {
      setBackFile(file);
      setBackPreview(preview);
    }

    if (type === "selfie") {
      setSelfieFile(file);
      setSelfiePreview(preview);
    }

    if (type === "profilePhoto") {
      setProfilePhotoFile(file);
      setProfilePhotoPreview(preview);
    }
  };

  const toggleFieldEditing = (fieldName) => {
    setEditingFields((current) => ({
      ...current,
      [fieldName]: !current[fieldName]
    }));
  };

  const fieldState = (fieldName, hasValue = false) => {
    const direct =
      profile?.fieldStatuses?.[fieldName] ||
      profile?.reviewStatus?.[fieldName] ||
      profile?.review?.[fieldName]?.status ||
      profile?.fields?.[fieldName]?.status ||
      "";

    const normalized = String(direct || "").toUpperCase();

    if (normalized) {
      return normalized;
    }

    if (status === "APPROVED" && hasValue) {
      return "APPROVED";
    }

    if (status === "REJECTED" && hasValue) {
      return "REJECTED";
    }

    if (status === "PENDING" && hasValue) {
      return "PENDING";
    }

    return hasValue ? "COMPLETED" : "MISSING";
  };

  const fieldReason = (fieldName) => {
    return (
      profile?.fieldReasons?.[fieldName] ||
      profile?.rejectionReasons?.[fieldName] ||
      profile?.review?.[fieldName]?.reason ||
      profile?.fields?.[fieldName]?.reason ||
      ""
    );
  };

  const submitVerification = async (event) => {
    event.preventDefault();

    if (completion < 80) {
      setError("Completa la mayor cantidad de campos y sube documento frontal, reverso y selfie.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });

      if (frontFile) formData.append("documentFront", frontFile);
      if (backFile) formData.append("documentBack", backFile);
      if (selfieFile) formData.append("selfie", selfieFile);
      if (profilePhotoFile) {
        formData.append("profilePhoto", profilePhotoFile);
      }

      const response = await api.post("/verification/submit", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const verification = response.data.verification || response.data.data || response.data;

      setProfile(verification);
      setMessage("Verificación enviada correctamente. QSM revisará tu identidad.");
      await loadVerification();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo enviar la verificación. Verifica POST /verification/submit."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const runDailyCheck = async () => {
    try {
      setChecking(true);
      setError("");
      setMessage("");

      const response = await api.post("/verification/daily-check", {});
      const verification = response.data.verification || response.data.data || response.data;

      setProfile(verification);
      setMessage("Validación diaria registrada correctamente.");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "No se pudo completar la validación diaria. Verifica POST /verification/daily-check."
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <div style={page}>
      <style>{`
        * { box-sizing: border-box; }
        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          background: #020617;
          font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
          overflow-x: hidden;
        }
        input, select, textarea, button, a { font-family: inherit; }
        input:disabled, select:disabled, textarea:disabled {
          opacity: .72;
          cursor: not-allowed;
        }
        button, a { transition: all .25s ease; }
        button:hover, a:hover { transform: translateY(-2px); }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 1240px) {
          .verification-layout,
          .stats-grid,
          .two-columns,
          .file-grid { grid-template-columns: 1fr !important; }
          .hero-row { flex-direction: column !important; align-items: flex-start !important; }
        }

        @media (max-width: 1100px) {
          .verification-page { grid-template-columns: 1fr !important; }
          .sidebar-wrapper { display: none !important; }
        }

        @media (max-width: 760px) {
          .main-content { padding: 18px !important; }
          .action-row { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="verification-page" style={layout}>
        <div
          className="sidebar-wrapper"
          style={sidebarWrapper}
        >
          <Sidebar />
        </div>

        <main className="main-content" style={main}>
          <Topbar />

          <section className="hero-row" style={hero}>
            <div>
              <p style={label}>VERIFICACIÓN QSM</p>
              <h1 style={title}>Verifica tu identidad</h1>
              <p style={subtitle}>
                Completa tu documento, dirección y selfie para aumentar tu confianza, publicar productos y comprar con mayor seguridad.
              </p>
            </div>

            <div style={heroBadge}>
              <span>🛡️</span>
              <div>
                <strong>{formatStatus(status)}</strong>
                <p>Nivel de avance {completion}%</p>
              </div>
            </div>
          </section>

          <section className="stats-grid" style={statsGrid}>
            <StatCard icon="🧾" title="Estado" value={formatStatus(status)} />
            <StatCard icon="⭐" title="Avance" value={`${completion}%`} />
            <StatCard icon="🔐" title="Nivel QSM" value={profile?.trustScore || 50} />
            <StatCard icon="📅" title="Última validación" value={formatDate(profile?.lastDailyCheck)} />
          </section>

          {message && <div style={successBox}>{message}</div>}
          {error && <div style={errorBox}>{error}</div>}

          {loading ? (
            <div style={centerCard}>
              <h2>Cargando verificación...</h2>
              <p>QSM está consultando tu estado de identidad.</p>
            </div>
          ) : (
            <section className="verification-layout" style={verificationLayout}>
              <form onSubmit={submitVerification} style={formPanel}>
                <div style={sectionHeader}>
                  <p style={label}>DATOS DEL USUARIO</p>
                  <h2>Información personal</h2>
                  <p style={muted}>
                    Estos datos ayudan a QSM a validar que cada comprador y vendedor sea una persona real.
                  </p>
                </div>

                <div className="two-columns" style={twoColumns}>
                  <VerificationField
                    label="Nombre"
                    status={fieldState("firstName", Boolean(form.firstName.trim()))}
                    reason={fieldReason("firstName")}
                    editing={Boolean(editingFields.firstName)}
                    onEdit={() => toggleFieldEditing("firstName")}
                  >
                    <input
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      disabled={
                        fieldState("firstName", Boolean(form.firstName.trim())) === "APPROVED" &&
                        !editingFields.firstName
                      }
                      style={input}
                    />
                  </VerificationField>

                  <VerificationField
                    label="Apellido"
                    status={fieldState("lastName", Boolean(form.lastName.trim()))}
                    reason={fieldReason("lastName")}
                    editing={Boolean(editingFields.lastName)}
                    onEdit={() => toggleFieldEditing("lastName")}
                  >
                    <input
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      disabled={
                        fieldState("lastName", Boolean(form.lastName.trim())) === "APPROVED" &&
                        !editingFields.lastName
                      }
                      style={input}
                    />
                  </VerificationField>
                </div>

                <div className="two-columns" style={twoColumns}>
                  <VerificationField
                    label="Teléfono"
                    status={fieldState("phone", Boolean(form.phone.trim()))}
                    reason={fieldReason("phone")}
                    editing={Boolean(editingFields.phone)}
                    onEdit={() => toggleFieldEditing("phone")}
                  >
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="809-000-0000"
                      disabled={
                        fieldState("phone", Boolean(form.phone.trim())) === "APPROVED" &&
                        !editingFields.phone
                      }
                      style={input}
                    />
                  </VerificationField>

                  <VerificationField
                    label="Género"
                    status={fieldState("gender", Boolean(form.gender))}
                    reason={fieldReason("gender")}
                    editing={Boolean(editingFields.gender)}
                    onEdit={() => toggleFieldEditing("gender")}
                  >
                    <select
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                      disabled={
                        fieldState("gender", Boolean(form.gender)) === "APPROVED" &&
                        !editingFields.gender
                      }
                      style={input}
                    >
                      <option value="">Seleccionar</option>
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMENINO">Femenino</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </VerificationField>
                </div>

                <div className="two-columns" style={twoColumns}>
                  <VerificationField
                    label="Tipo de documento"
                    status={fieldState("documentType", Boolean(form.documentType))}
                    reason={fieldReason("documentType")}
                    editing={Boolean(editingFields.documentType)}
                    onEdit={() => toggleFieldEditing("documentType")}
                  >
                    <select
                      name="documentType"
                      value={form.documentType}
                      onChange={handleChange}
                      disabled={
                        fieldState("documentType", Boolean(form.documentType)) === "APPROVED" &&
                        !editingFields.documentType
                      }
                      style={input}
                    >
                      <option value="CEDULA">Cédula</option>
                      <option value="PASAPORTE">Pasaporte</option>
                      <option value="LICENCIA">Licencia</option>
                    </select>
                  </VerificationField>

                  <VerificationField
                    label="Número de documento"
                    status={fieldState("documentNumber", Boolean(form.documentNumber.trim()))}
                    reason={fieldReason("documentNumber")}
                    editing={Boolean(editingFields.documentNumber)}
                    onEdit={() => toggleFieldEditing("documentNumber")}
                  >
                    <input
                      name="documentNumber"
                      value={form.documentNumber}
                      onChange={handleChange}
                      placeholder="000-0000000-0"
                      disabled={
                        fieldState("documentNumber", Boolean(form.documentNumber.trim())) === "APPROVED" &&
                        !editingFields.documentNumber
                      }
                      style={input}
                    />
                  </VerificationField>
                </div>

                <div className="two-columns" style={twoColumns}>
                  <VerificationField
                    label="Fecha de nacimiento"
                    status={fieldState("birthDate", Boolean(form.birthDate))}
                    reason={fieldReason("birthDate")}
                    editing={Boolean(editingFields.birthDate)}
                    onEdit={() => toggleFieldEditing("birthDate")}
                  >
                    <input
                      name="birthDate"
                      type="date"
                      value={form.birthDate}
                      onChange={handleChange}
                      disabled={
                        fieldState("birthDate", Boolean(form.birthDate)) === "APPROVED" &&
                        !editingFields.birthDate
                      }
                      style={input}
                    />
                  </VerificationField>

                  <VerificationField
                    label="Provincia"
                    status={fieldState("province", Boolean(form.province.trim()))}
                    reason={fieldReason("province")}
                    editing={Boolean(editingFields.province)}
                    onEdit={() => toggleFieldEditing("province")}
                  >
                    <input
                      name="province"
                      value={form.province}
                      onChange={handleChange}
                      placeholder="Distrito Nacional"
                      disabled={
                        fieldState("province", Boolean(form.province.trim())) === "APPROVED" &&
                        !editingFields.province
                      }
                      style={input}
                    />
                  </VerificationField>
                </div>

                <div className="two-columns" style={twoColumns}>
                  <VerificationField
                    label="Ciudad"
                    status={fieldState("city", Boolean(form.city.trim()))}
                    reason={fieldReason("city")}
                    editing={Boolean(editingFields.city)}
                    onEdit={() => toggleFieldEditing("city")}
                  >
                    <input
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="Santo Domingo"
                      disabled={
                        fieldState("city", Boolean(form.city.trim())) === "APPROVED" &&
                        !editingFields.city
                      }
                      style={input}
                    />
                  </VerificationField>

                  <VerificationField
                    label="Dirección"
                    status={fieldState("address", Boolean(form.address.trim()))}
                    reason={fieldReason("address")}
                    editing={Boolean(editingFields.address)}
                    onEdit={() => toggleFieldEditing("address")}
                  >
                    <input
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Dirección general, no pública"
                      disabled={
                        fieldState("address", Boolean(form.address.trim())) === "APPROVED" &&
                        !editingFields.address
                      }
                      style={input}
                    />
                  </VerificationField>
                </div>

                <div style={sectionHeader}>
                  <p style={label}>DOCUMENTOS</p>
                  <h2>Evidencia de identidad</h2>
                </div>

                <div className="file-grid" style={fileGrid}>
                  <UploadBox
                    title="Foto de perfil 2x2"
                    description="Foto clara, reciente y apropiada para tu perfil"
                    preview={
                      profilePhotoPreview ||
                      toAbsoluteFile(
                        profile?.profilePhotoUrl ||
                        profile?.profilePhoto
                      )
                    }
                    status={fieldState(
                      "profilePhoto",
                      Boolean(
                        profilePhotoFile ||
                        profile?.profilePhotoUrl ||
                        profile?.profilePhoto
                      )
                    )}
                    reason={fieldReason("profilePhoto")}
                    onChange={(event) => handleFile(event, "profilePhoto")}
                  />

                  <UploadBox
                    title="Documento frontal"
                    description="Foto clara del frente"
                    preview={frontPreview || toAbsoluteFile(profile?.documentFrontUrl)}
                    status={fieldState(
                      "documentFront",
                      Boolean(frontFile || profile?.documentFrontUrl)
                    )}
                    reason={fieldReason("documentFront")}
                    onChange={(event) => handleFile(event, "front")}
                  />

                  <UploadBox
                    title="Documento reverso"
                    description="Foto clara del reverso"
                    preview={backPreview || toAbsoluteFile(profile?.documentBackUrl)}
                    status={fieldState(
                      "documentBack",
                      Boolean(backFile || profile?.documentBackUrl)
                    )}
                    reason={fieldReason("documentBack")}
                    onChange={(event) => handleFile(event, "back")}
                  />

                  <UploadBox
                    title="Selfie de validación"
                    description="Rostro visible, fondo limpio y buena iluminación"
                    preview={selfiePreview || toAbsoluteFile(profile?.selfieUrl)}
                    status={fieldState(
                      "selfie",
                      Boolean(selfieFile || profile?.selfieUrl)
                    )}
                    reason={fieldReason("selfie")}
                    onChange={(event) => handleFile(event, "selfie")}
                  />
                </div>

                <div style={securityNotice}>
                  <strong>🔒 Seguridad QSM</strong>
                  <p>
                    Tus documentos no se muestran públicamente. Solo se usan para validación, seguridad y prevención de fraude.
                  </p>
                </div>

                <div className="action-row" style={actionRow}>
                  <button type="button" onClick={loadVerification} style={outlineButton}>
                    Actualizar
                  </button>

                  <button type="submit" disabled={submitting} style={primaryButton}>
                    {submitting ? "Enviando..." : "Enviar verificación →"}
                  </button>
                </div>
              </form>

              <aside style={sidePanel}>
                <section style={aiCard}>
                  <h2>QSM AI recomienda</h2>
                  <p>
                    Completa tu identidad para desbloquear publicaciones, compras protegidas y mayor reputación.
                  </p>

                  <div style={scoreCircle}>
                    <span>{completion}%</span>
                  </div>

                  <div style={scoreBar}>
                    <div style={{ ...scoreFill, width: `${completion}%` }}></div>
                  </div>

                  <CheckLine done={Boolean(form.firstName && form.lastName)} text="Nombre legal registrado" />
                  <CheckLine
                    done={Boolean(
                      profilePhotoFile ||
                      profile?.profilePhotoUrl ||
                      profile?.profilePhoto
                    )}
                    text="Foto de perfil enviada"
                  />
                  <CheckLine done={Boolean(form.documentNumber)} text="Documento registrado" />
                  <CheckLine done={Boolean(frontFile || profile?.documentFrontUrl)} text="Frente del documento" />
                  <CheckLine done={Boolean(backFile || profile?.documentBackUrl)} text="Reverso del documento" />
                  <CheckLine done={Boolean(selfieFile || profile?.selfieUrl)} text="Selfie de validación" />
                  <CheckLine done={status === "APPROVED"} text="Aprobación administrativa" />
                </section>

                <section style={statusPanel}>
                  <h2>Validación diaria</h2>
                  <p style={muted}>
                    Simula la validación diaria estilo Uber: una selfie o check rápido para confirmar actividad segura.
                  </p>

                  <button onClick={runDailyCheck} disabled={checking} style={primaryButtonFull}>
                    {checking ? "Validando..." : "Realizar check diario"}
                  </button>
                </section>

                <section style={statusPanel}>
                  <h2>Beneficios al verificarte</h2>
                  <Benefit text="Publicar productos con mayor confianza." />
                  <Benefit text="Aumentar tu puntuación QSM." />
                  <Benefit text="Reducir riesgo en compras y ventas." />
                  <Benefit text="Resolver reclamos con mejor trazabilidad." />
                </section>
              </aside>
            </section>
          )}
        </main>
      </div>

      <AiAssistant pageContext="verification" />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={fieldWrap}>
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function VerificationField({
  label,
  status,
  reason,
  editing,
  onEdit,
  children
}) {
  return (
    <div style={verifiedFieldCard}>
      <div style={fieldTopRow}>
        <span style={fieldLabel}>{label}</span>

        <div style={fieldActions}>
          <StatusPill status={status} />

          <button
            type="button"
            onClick={onEdit}
            style={editFieldButton}
          >
            {editing ? "Cerrar" : "Editar"}
          </button>
        </div>
      </div>

      {children}

      {reason && (
        <div style={rejectionReason}>
          <strong>Corrección solicitada</strong>
          <p>{reason}</p>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const normalized = String(status || "MISSING").toUpperCase();

  const labels = {
    APPROVED: "✓ Verificado",
    VERIFIED: "✓ Verificado",
    PENDING: "En revisión",
    IN_REVIEW: "En revisión",
    REJECTED: "Rechazado",
    NEEDS_REVIEW: "Corregir",
    REQUIRES_RESUBMISSION: "Reenviar",
    COMPLETED: "Completado",
    MISSING: "Sin completar"
  };

  return (
    <span style={statusPill(normalized)}>
      {labels[normalized] || "Pendiente"}
    </span>
  );
}

function UploadBox({
  title,
  description,
  preview,
  status,
  reason,
  onChange
}) {
  return (
    <div style={uploadCard}>
      <div style={uploadHeader}>
        <div>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>

        <StatusPill status={status} />
      </div>

      <label style={uploadBox}>
        <input
          type="file"
          accept="image/*"
          onChange={onChange}
          style={{ display: "none" }}
        />

        {preview ? (
          <img
            src={preview}
            alt={title}
            style={uploadPreview}
          />
        ) : (
          <div style={uploadPlaceholder}>
            <span>📷</span>
            <strong>Seleccionar imagen</strong>
            <p>JPG, PNG o WEBP con buena calidad.</p>
          </div>
        )}

        <span style={replaceImageButton}>
          {preview ? "Cambiar imagen" : "Subir imagen"}
        </span>
      </label>

      {reason && (
        <div style={rejectionReason}>
          <strong>Imagen rechazada</strong>
          <p>{reason}</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <div style={statCard}>
      <div style={statIcon}>{icon}</div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function CheckLine({ done, text }) {
  return (
    <div style={checkLine}>
      <span style={done ? checkDone : checkPending}>{done ? "✓" : "•"}</span>
      <p>{text}</p>
    </div>
  );
}

function Benefit({ text }) {
  return (
    <div style={benefit}>
      <span>✓</span>
      <p>{text}</p>
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

function formatStatus(status) {
  const map = {
    NOT_SUBMITTED: "Pendiente",
    PENDING: "En revisión",
    APPROVED: "Verificado",
    REJECTED: "Rechazado",
    NEEDS_REVIEW: "Requiere revisión"
  };

  return map[status] || "Pendiente";
}

function formatDate(value) {
  if (!value) return "Pendiente";

  return new Date(value).toLocaleDateString("es-DO", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
}

function toAbsoluteFile(path) {
  if (!path) return "";
  if (String(path).startsWith("http")) return path;
  if (String(path).startsWith("/uploads")) return `http://localhost:5000${path}`;
  if (String(path).startsWith("uploads")) return `http://localhost:5000/${path}`;
  return `http://localhost:5000/uploads/verification/${path}`;
}

const page = {
  minHeight: "100vh",
  width: "100%",
  background:
    "radial-gradient(circle at top right, rgba(53,208,195,.13), transparent 34%), radial-gradient(circle at 18% 15%, rgba(139,92,246,.10), transparent 28%), #020617",
  color: "white"
};

const layout = {
  width: "100%",
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns:
    "var(--qsm-sidebar-width, 96px) minmax(0, 1fr)",
  overflowX: "hidden",
  transition:
    "grid-template-columns var(--qsm-transition, .28s ease)",
  alignItems: "stretch"
};

const sidebarWrapper = {
  width:
    "var(--qsm-sidebar-width, 96px)",
  minWidth:
    "var(--qsm-sidebar-width, 96px)",
  transition:
    "width var(--qsm-transition, .28s ease), min-width var(--qsm-transition, .28s ease)"
};

const main = {
  width: "100%",
  minWidth: 0,
  padding: "26px 34px 56px",
  overflowX: "hidden"
};

const hero = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "24px",
  margin: "22px 0"
};

const label = {
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "950",
  textTransform: "uppercase",
  margin: 0
};

const title = {
  fontSize: "clamp(40px, 3.6vw, 62px)",
  lineHeight: "1",
  margin: "10px 0",
  letterSpacing: "-2px"
};

const subtitle = {
  color: "#cbd5e1",
  lineHeight: "29px",
  maxWidth: "840px",
  margin: 0
};

const heroBadge = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  minWidth: "270px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(53,208,195,.24)",
  borderRadius: "22px",
  padding: "18px"
};

const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: "16px",
  marginBottom: "20px"
};

const statCard = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.15)",
  borderRadius: "22px",
  padding: "20px"
};

const statIcon = {
  width: "52px",
  height: "52px",
  borderRadius: "17px",
  background: "rgba(53,208,195,.14)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px"
};

const verificationLayout = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.25fr) minmax(360px, .75fr)",
  gap: "20px"
};

const formPanel = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.16)",
  borderRadius: "26px",
  padding: "26px"
};

const sectionHeader = {
  margin: "10px 0 18px"
};

const muted = {
  color: "#cbd5e1",
  lineHeight: "25px"
};

const twoColumns = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
  marginBottom: "14px"
};

const fieldWrap = {
  display: "grid",
  gap: "8px"
};

const fieldLabel = {
  fontWeight: "900",
  color: "#e2e8f0"
};

const verifiedFieldCard = {
  display: "grid",
  gap: "9px",
  padding: "13px",
  borderRadius: "16px",
  border: "1px solid rgba(148,163,184,.12)",
  background: "rgba(2,6,23,.26)"
};

const fieldTopRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px"
};

const fieldActions = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  flexWrap: "wrap",
  justifyContent: "flex-end"
};

const editFieldButton = {
  minHeight: "29px",
  padding: "5px 9px",
  borderRadius: "9px",
  border: "1px solid rgba(56,189,248,.20)",
  background: "rgba(56,189,248,.08)",
  color: "#7dd3fc",
  fontSize: "10px",
  fontWeight: "900",
  cursor: "pointer"
};

const statusPill = (status) => {
  const colors = {
    APPROVED: ["rgba(34,197,94,.15)", "#86efac", "rgba(34,197,94,.30)"],
    VERIFIED: ["rgba(34,197,94,.15)", "#86efac", "rgba(34,197,94,.30)"],
    PENDING: ["rgba(245,158,11,.14)", "#fde68a", "rgba(245,158,11,.30)"],
    IN_REVIEW: ["rgba(56,189,248,.14)", "#7dd3fc", "rgba(56,189,248,.30)"],
    REJECTED: ["rgba(239,68,68,.15)", "#fca5a5", "rgba(239,68,68,.30)"],
    NEEDS_REVIEW: ["rgba(239,68,68,.15)", "#fca5a5", "rgba(239,68,68,.30)"],
    REQUIRES_RESUBMISSION: ["rgba(168,85,247,.15)", "#d8b4fe", "rgba(168,85,247,.30)"],
    COMPLETED: ["rgba(53,208,195,.14)", "#7ce7dc", "rgba(53,208,195,.28)"],
    MISSING: ["rgba(148,163,184,.12)", "#94a3b8", "rgba(148,163,184,.20)"]
  };

  const selected = colors[status] || colors.MISSING;

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "27px",
    padding: "5px 9px",
    borderRadius: "999px",
    background: selected[0],
    color: selected[1],
    border: `1px solid ${selected[2]}`,
    fontSize: "9px",
    fontWeight: "950",
    whiteSpace: "nowrap"
  };
};

const rejectionReason = {
  padding: "10px 12px",
  borderRadius: "12px",
  border: "1px solid rgba(239,68,68,.24)",
  background: "rgba(127,29,29,.16)",
  color: "#fecaca",
  fontSize: "11px",
  lineHeight: "17px"
};

const input = {
  width: "100%",
  minHeight: "54px",
  background: "rgba(2,6,23,.55)",
  border: "1px solid rgba(148,163,184,.16)",
  color: "white",
  borderRadius: "15px",
  padding: "0 14px",
  outline: "none"
};

const fileGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "14px"
};

const uploadCard = {
  minWidth: 0,
  display: "grid",
  gap: "10px",
  padding: "14px",
  borderRadius: "20px",
  border: "1px solid rgba(148,163,184,.12)",
  background: "rgba(2,6,23,.30)"
};

const uploadHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "10px"
};

const replaceImageButton = {
  position: "absolute",
  right: "12px",
  bottom: "12px",
  padding: "8px 11px",
  borderRadius: "10px",
  border: "1px solid rgba(255,255,255,.14)",
  background: "rgba(2,6,23,.82)",
  color: "#ffffff",
  fontSize: "11px",
  fontWeight: "900",
  backdropFilter: "blur(10px)"
};

const uploadBox = {
  position: "relative",
  minHeight: "230px",
  borderRadius: "22px",
  border: "1px dashed rgba(53,208,195,.38)",
  background: "linear-gradient(145deg, rgba(53,208,195,.08), rgba(124,58,237,.08))",
  overflow: "hidden",
  cursor: "pointer",
  display: "flex"
};

const uploadPlaceholder = {
  width: "100%",
  minHeight: "230px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  color: "#cbd5e1",
  padding: "18px"
};

const uploadPreview = {
  width: "100%",
  height: "230px",
  objectFit: "cover"
};

const securityNotice = {
  background: "rgba(53,208,195,.10)",
  border: "1px solid rgba(53,208,195,.26)",
  color: "#cbd5e1",
  borderRadius: "16px",
  padding: "14px",
  marginTop: "18px"
};

const actionRow = {
  display: "grid",
  gridTemplateColumns: "1fr 1.5fr",
  gap: "10px",
  marginTop: "18px"
};

const outlineButton = {
  textAlign: "center",
  background: "rgba(15,23,42,.64)",
  border: "1px solid rgba(148,163,184,.16)",
  color: "white",
  borderRadius: "13px",
  padding: "14px",
  fontWeight: "950",
  cursor: "pointer"
};

const primaryButton = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #35d0c3, #38bdf8, #8b5cf6)",
  color: "white",
  textDecoration: "none",
  border: "none",
  padding: "14px 20px",
  borderRadius: "14px",
  fontWeight: "950",
  cursor: "pointer",
  boxShadow: "0 18px 54px rgba(53,208,195,.18)"
};

const primaryButtonFull = {
  ...primaryButton,
  width: "100%"
};

const sidePanel = {
  display: "grid",
  gap: "18px",
  alignSelf: "start"
};

const aiCard = {
  background: "linear-gradient(145deg, rgba(15,23,42,.86), rgba(30,41,59,.58))",
  border: "1px solid rgba(53,208,195,.20)",
  borderRadius: "26px",
  padding: "22px"
};

const scoreCircle = {
  width: "128px",
  height: "128px",
  borderRadius: "50%",
  border: "10px solid rgba(53,208,195,.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "22px auto",
  color: "#35d0c3",
  fontSize: "30px",
  fontWeight: "950"
};

const scoreBar = {
  height: "10px",
  background: "rgba(148,163,184,.16)",
  borderRadius: "999px",
  overflow: "hidden",
  marginBottom: "18px"
};

const scoreFill = {
  height: "100%",
  background: "linear-gradient(90deg, #35d0c3, #38bdf8, #8b5cf6)",
  borderRadius: "999px"
};

const checkLine = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  padding: "10px 0",
  borderBottom: "1px solid rgba(148,163,184,.10)"
};

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

const statusPanel = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.16)",
  borderRadius: "26px",
  padding: "22px"
};

const benefit = {
  display: "flex",
  gap: "10px",
  alignItems: "center",
  background: "rgba(2,6,23,.35)",
  border: "1px solid rgba(148,163,184,.10)",
  borderRadius: "14px",
  padding: "10px 12px",
  marginTop: "10px"
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

const centerCard = {
  background: "rgba(15,23,42,.72)",
  border: "1px solid rgba(56,189,248,.14)",
  borderRadius: "24px",
  padding: "44px",
  textAlign: "center",
  color: "#cbd5e1"
};

export default CompleteProfile;
