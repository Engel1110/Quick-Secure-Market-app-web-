import { API_BASE_URL as QSM_RUNTIME_API_URL } from "../config/runtime";
import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Link
} from "react-router-dom";

import api from "../api/axios";

import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import AiAssistant from "../components/AiAssistant";

import {
  useAuth
} from "../context/AuthContext";

function Profile() {
  const {
    user: authUser
  } = useAuth();

  const [user, setUser] =
    useState(authUser || {});

  const [verification, setVerification] =
    useState({});

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setError("");

        setUser(
          authUser || {}
        );

        const response =
          await api.get(
            "/verifications/me"
          );

        if (!active) {
          return;
        }

        const backendVerification =
          response?.data?.verification ||
          response?.data?.data
            ?.verification ||
          {};

        setVerification(
          backendVerification
        );
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(
          requestError?.response?.data
            ?.message ||
          requestError?.message ||
          "No se pudo actualizar la informacion KYC."
        );
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const fullName =
    [
      user?.firstName,
      user?.lastName
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Usuario QSM";

  const verificationStatus =
    String(
      verification?.status ||
      user?.verificationStatus ||
      "NOT_STARTED"
    ).toUpperCase();

  const isVerified =
    Boolean(user?.isVerified) ||
    [
      "APPROVED",
      "VERIFIED"
    ].includes(
      verificationStatus
    );

  const trustScore =
    clampScore(
      user?.trustScore ??
      verification?.trustScore ??
      50
    );

  const profilePhoto =
    resolveMediaUrl(
      verification?.profilePhoto ||
      user?.profilePhoto ||
      user?.avatar ||
      ""
    );

  const profileCompletion =
    useMemo(() => {
      const checks = [
        user?.firstName,
        user?.lastName,
        user?.email,
        user?.phone ||
          verification?.phone,
        verification?.documentNumber ||
          user?.documentId,
        verification?.province ||
          user?.province,
        verification?.city ||
          user?.city,
        verification?.address ||
          user?.address,
        profilePhoto,
        isVerified
      ];

      return Math.round(
        (
          checks.filter(Boolean).length /
          checks.length
        ) * 100
      );
    }, [
      user,
      verification,
      profilePhoto,
      isVerified
    ]);

  return (
    <div className="profile-page">
      <style>{profileStyles}</style>

      <aside className="profile-sidebar">
        <Sidebar />
      </aside>

      <main className="profile-main">
        <Topbar />

        <div className="profile-shell">
          {error && (
            <div className="profile-error">
              {error}
            </div>
          )}

          <section className="profile-hero">
            <div className="profile-cover" />

            <div className="profile-identity">
              <div className="profile-avatar">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={"Foto de " + fullName} loading="lazy" decoding="async" />
                ) : (
                  fullName
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>

              <div className="profile-name">
                <span>
                  MI PERFIL QSM
                </span>

                <h1>{fullName}</h1>

                <p>
                  {user?.email ||
                    "Correo no registrado"}
                </p>

                <div className="profile-badges">
                  <strong
                    className={
                      isVerified
                        ? "verified"
                        : "pending"
                    }
                  >
                    {isVerified
                      ? "Usuario verificado"
                      : formatVerificationStatus(
                          verificationStatus
                        )}
                  </strong>

                  <strong>
                    Confianza {trustScore}/100
                  </strong>

                  <strong>
                    {user?.sellerEnabled
                      ? "Vendedor habilitado"
                      : "Comprador QSM"}
                  </strong>
                </div>
              </div>

              <div className="profile-actions">
                <Link to="/dashboard">
                  Volver al Dashboard
                </Link>

                <Link
                  to="/complete-profile"
                  className="primary"
                >
                  Actualizar datos
                </Link>
              </div>
            </div>
          </section>

          <section className="profile-grid">
            <article className="profile-card">
              <header>
                <div>
                  <span>DATOS PERSONALES</span>
                  <h2>
                    Informacion del usuario
                  </h2>
                </div>

                <Link to="/complete-profile">
                  Editar
                </Link>
              </header>

              <div className="profile-fields">
                <Field
                  label="Nombre completo"
                  value={fullName}
                />

                <Field
                  label="Correo"
                  value={user?.email}
                />

                <Field
                  label="Telefono"
                  value={
                    user?.phone ||
                    verification?.phone
                  }
                />

                <Field
                  label="Documento"
                  value={
                    verification
                      ?.documentNumber ||
                    user?.documentId
                  }
                />

                <Field
                  label="Fecha de nacimiento"
                  value={formatDate(
                    verification?.birthDate ||
                    user?.birthDate
                  )}
                />

                <Field
                  label="Genero"
                  value={
                    verification?.gender ||
                    user?.gender
                  }
                />

                <Field
                  label="Provincia"
                  value={
                    verification?.province ||
                    user?.province
                  }
                />

                <Field
                  label="Ciudad"
                  value={
                    verification?.city ||
                    user?.city
                  }
                />

                <Field
                  label="Direccion"
                  value={
                    verification?.address ||
                    user?.address
                  }
                  wide
                />
              </div>
            </article>

            <aside className="profile-card">
              <header>
                <div>
                  <span>ESTADO QSM</span>
                  <h2>
                    Cuenta y seguridad
                  </h2>
                </div>
              </header>

              <Progress
                label="Perfil completado"
                value={profileCompletion}
              />

              <Progress
                label="Confianza QSM"
                value={trustScore}
              />

              <Status
                label="Verificacion"
                value={
                  isVerified
                    ? "Aprobada"
                    : formatVerificationStatus(
                        verificationStatus
                      )
                }
              />

              <Status
                label="Compras"
                value={
                  user?.buyerEnabled === false
                    ? "Deshabilitadas"
                    : "Habilitadas"
                }
              />

              <Status
                label="Ventas"
                value={
                  user?.sellerEnabled
                    ? "Habilitadas"
                    : "Deshabilitadas"
                }
              />

              <Status
                label="Tipo de cuenta"
                value={
                  user?.accountType ||
                  "CUSTOMER"
                }
              />

              <div className="profile-links">
                <Link to="/settings">
                  Configuracion y seguridad
                </Link>

                <Link to="/complete-profile">
                  Verificacion QSM
                </Link>
              </div>
            </aside>
          </section>
        </div>
      </main>

      <AiAssistant
        pageContext="profile"
      />
    </div>
  );
}

function Field({
  label,
  value,
  wide = false
}) {
  return (
    <div
      className={
        wide
          ? "profile-field wide"
          : "profile-field"
      }
    >
      <span>{label}</span>

      <strong>
        {value || "No registrado"}
      </strong>
    </div>
  );
}

function Progress({
  label,
  value
}) {
  return (
    <div className="profile-progress">
      <div>
        <span>{label}</span>
        <strong>{value}/100</strong>
      </div>

      <div className="profile-track">
        <i
          style={{
            width: value + "%"
          }}
        />
      </div>
    </div>
  );
}

function Status({
  label,
  value
}) {
  return (
    <div className="profile-status">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function clampScore(value) {
  const parsed =
    Number(value);

  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.min(
    100,
    Math.max(0, parsed)
  );
}

function formatVerificationStatus(
  value
) {
  const map = {
    NOT_STARTED:
      "No iniciada",

    PENDING_REVIEW:
      "Pendiente de revision",

    UNDER_REVIEW:
      "En revision",

    RESUBMISSION_REQUIRED:
      "Correccion requerida",

    APPROVED:
      "Aprobada",

    VERIFIED:
      "Verificada",

    REJECTED:
      "Rechazada"
  };

  return (
    map[value] ||
    "Pendiente"
  );
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    "es-DO"
  ).format(date);
}

function resolveMediaUrl(value) {
  if (!value) {
    return "";
  }

  const normalized =
    String(value)
      .trim()
      .replace(/\\/g, "/");

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }

  const origin =
    String(
      QSM_RUNTIME_API_URL
    )
      .replace(/\/api\/?$/, "")
      .replace(/\/$/, "");

  return normalized.startsWith("/")
    ? origin + normalized
    : origin + "/" + normalized;
}

const profileStyles = `
  .profile-page {
    min-height: 100vh;
    color: #f8fafc;
    background:
      radial-gradient(
        circle at 90% 0%,
        rgba(139,92,246,.14),
        transparent 28%
      ),
      #020617;
  }

  .profile-page * {
    box-sizing: border-box;
  }

  .profile-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width:
      var(--qsm-sidebar-width, 300px);
    height: 100vh;
    z-index: 700;
  }

  .profile-main {
    width:
      calc(
        100% -
        var(--qsm-sidebar-width, 300px)
      );
    min-height: 100vh;
    margin-left:
      var(--qsm-sidebar-width, 300px);
    padding:
      18px
      clamp(18px, 2.2vw, 34px)
      50px;
  }

  .profile-shell {
    width: min(1500px, 100%);
    margin: 18px auto 0;
  }

  .profile-error {
    margin-bottom: 15px;
    padding: 14px;
    border:
      1px solid rgba(248,113,113,.3);
    border-radius: 14px;
    background:
      rgba(127,29,29,.2);
    color: #fecaca;
  }

  .profile-hero,
  .profile-card {
    border:
      1px solid rgba(148,163,184,.14);
    background:
      rgba(15,23,42,.78);
  }

  .profile-hero {
    overflow: hidden;
    border-radius: 24px;
  }

  .profile-cover {
    height: 125px;
    background:
      linear-gradient(
        120deg,
        #22d3c5,
        #38bdf8,
        #8b5cf6
      );
  }

  .profile-identity {
    display: grid;
    grid-template-columns:
      112px minmax(0,1fr) auto;
    align-items: center;
    gap: 22px;
    padding: 0 28px 28px;
  }

  .profile-avatar {
    width: 112px;
    height: 112px;
    display: grid;
    place-items: center;
    overflow: hidden;
    margin-top: -45px;
    border:
      5px solid #0f172a;
    border-radius: 28px;
    background:
      linear-gradient(
        135deg,
        #22d3c5,
        #8b5cf6
      );
    font-size: 40px;
    font-weight: 900;
  }

  .profile-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .profile-name > span,
  .profile-card header span {
    color: #35d0c3;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 2px;
  }

  .profile-name h1 {
    margin: 7px 0 4px;
    font-size: 30px;
  }

  .profile-name p {
    margin: 0;
    color: #94a3b8;
  }

  .profile-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 13px;
  }

  .profile-badges strong {
    padding: 7px 10px;
    border-radius: 999px;
    background:
      rgba(53,208,195,.1);
    color: #67e8f9;
    font-size: 10px;
  }

  .profile-badges .verified {
    color: #86efac;
    background:
      rgba(34,197,94,.12);
  }

  .profile-badges .pending {
    color: #fde68a;
    background:
      rgba(245,158,11,.12);
  }

  .profile-actions,
  .profile-links {
    display: grid;
    gap: 8px;
  }

  .profile-actions {
    min-width: 180px;
  }

  .profile-actions a,
  .profile-links a {
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 14px;
    border:
      1px solid rgba(53,208,195,.3);
    border-radius: 12px;
    color: #67e8f9;
    text-decoration: none;
    font-size: 11px;
    font-weight: 850;
  }

  .profile-actions a.primary {
    border: none;
    color: white;
    background:
      linear-gradient(
        135deg,
        #22d3c5,
        #38bdf8,
        #8b5cf6
      );
  }

  .profile-grid {
    display: grid;
    grid-template-columns:
      minmax(0,1.6fr)
      minmax(300px,.8fr);
    gap: 16px;
    margin-top: 16px;
  }

  .profile-card {
    padding: 22px;
    border-radius: 22px;
  }

  .profile-card header {
    display: flex;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 17px;
  }

  .profile-card h2 {
    margin: 5px 0 0;
    font-size: 19px;
  }

  .profile-card header a {
    color: #35d0c3;
    text-decoration: none;
    font-size: 11px;
  }

  .profile-fields {
    display: grid;
    grid-template-columns:
      repeat(2,minmax(0,1fr));
    gap: 11px;
  }

  .profile-field {
    padding: 14px;
    border-radius: 14px;
    background:
      rgba(2,6,23,.38);
  }

  .profile-field.wide {
    grid-column: 1 / -1;
  }

  .profile-field span,
  .profile-field strong {
    display: block;
  }

  .profile-field span {
    margin-bottom: 6px;
    color: #64748b;
    font-size: 9px;
  }

  .profile-field strong {
    font-size: 12px;
    word-break: break-word;
  }

  .profile-progress {
    margin-bottom: 17px;
  }

  .profile-progress > div:first-child,
  .profile-status {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }

  .profile-progress span,
  .profile-status span {
    color: #94a3b8;
    font-size: 10px;
  }

  .profile-progress strong,
  .profile-status strong {
    font-size: 11px;
  }

  .profile-track {
    height: 7px;
    overflow: hidden;
    margin-top: 7px;
    border-radius: 999px;
    background:
      rgba(148,163,184,.14);
  }

  .profile-track i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background:
      linear-gradient(
        90deg,
        #22d3c5,
        #8b5cf6
      );
  }

  .profile-status {
    padding: 13px 0;
    border-bottom:
      1px solid rgba(148,163,184,.1);
  }

  .profile-links {
    margin-top: 18px;
  }


  @media (max-width: 1100px) {
    .profile-sidebar {
      display: none;
    }

    .profile-main {
      width: 100%;
      margin-left: 0;
    }
  }

  @media (max-width: 760px) {
    .profile-identity {
      grid-template-columns: 1fr;
    }

    .profile-actions {
      width: 100%;
    }

    .profile-grid,
    .profile-fields {
      grid-template-columns: 1fr;
    }

    .profile-field.wide {
      grid-column: auto;
    }
  }
`;

export default Profile;
