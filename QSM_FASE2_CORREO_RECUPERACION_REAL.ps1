param(
  [string]$ProjectRoot = "E:\QSM-App-Web - Copy migracion\Quick-Secure-Market-app-web"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Controller = Join-Path $ProjectRoot "backend\src\controllers\auth-prisma.controller.js"
$Routes     = Join-Path $ProjectRoot "backend\src\routes\auth.routes.js"
$EmailSvc   = Join-Path $ProjectRoot "backend\src\services\email.service.js"
$Settings   = Join-Path $ProjectRoot "frontend\src\pages\Settings.jsx"
$App        = Join-Path $ProjectRoot "frontend\src\App.jsx"

$RecoveryComponent = Join-Path $ProjectRoot "frontend\src\components\settings\RecoveryEmailSection.jsx"
$VerifyPage        = Join-Path $ProjectRoot "frontend\src\pages\VerifyRecoveryEmail.jsx"

$Required = @(
  $Controller,
  $Routes,
  $EmailSvc,
  $Settings,
  $App
)

foreach ($File in $Required) {
  if (-not (Test-Path -LiteralPath $File -PathType Leaf)) {
    throw "DETENIDO: falta $File"
  }
}

$Stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$Backup = Join-Path $env:TEMP "QSM_FASE2_RECOVERY_EMAIL_BACKUP_$Stamp"

New-Item -ItemType Directory -Force -Path $Backup | Out-Null

foreach ($File in $Required) {
  Copy-Item -LiteralPath $File -Destination (Join-Path $Backup ([IO.Path]::GetFileName($File))) -Force
}

if (Test-Path -LiteralPath $RecoveryComponent) {
  Copy-Item -LiteralPath $RecoveryComponent -Destination (Join-Path $Backup "RecoveryEmailSection.jsx") -Force
}

if (Test-Path -LiteralPath $VerifyPage) {
  Copy-Item -LiteralPath $VerifyPage -Destination (Join-Path $Backup "VerifyRecoveryEmail.jsx") -Force
}

$RecoveryComponentContent = @'
import {
  useEffect,
  useState
} from "react";

import api from "../../api/axios";

function RecoveryEmailSection() {
  const [
    status,
    setStatus
  ] = useState({
    primaryEmail: "",
    recoveryEmailMasked: "",
    pendingRecoveryEmailMasked: "",
    verified: false,
    pending: false
  });

  const [
    recoveryEmail,
    setRecoveryEmail
  ] = useState("");

  const [
    loading,
    setLoading
  ] = useState(true);

  const [
    saving,
    setSaving
  ] = useState(false);

  const [
    message,
    setMessage
  ] = useState("");

  const [
    error,
    setError
  ] = useState("");

  const loadStatus =
    async () => {
      try {
        setLoading(true);

        const response =
          await api.get(
            "/auth/recovery-email"
          );

        setStatus(
          response.data
            ?.recoveryEmail || {}
        );
      } catch (
        requestError
      ) {
        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
            "No se pudo consultar el correo de recuperación."
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(
    () => {
      loadStatus();
    },
    []
  );

  const requestVerification =
    async (
      event
    ) => {
      event.preventDefault();

      setMessage("");
      setError("");

      const cleanEmail =
        recoveryEmail
          .trim()
          .toLowerCase();

      if (!cleanEmail) {
        setError(
          "Escribe el correo de recuperación."
        );
        return;
      }

      try {
        setSaving(true);

        const response =
          await api.post(
            "/auth/recovery-email/request-verification",
            {
              recoveryEmail:
                cleanEmail
            }
          );

        setMessage(
          response.data
            ?.message ||
            "Enviamos un enlace de verificación."
        );

        setRecoveryEmail("");

        await loadStatus();
      } catch (
        requestError
      ) {
        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
            "No se pudo enviar la verificación."
        );
      } finally {
        setSaving(false);
      }
    };

  const removeRecoveryEmail =
    async () => {
      const confirmed =
        window.confirm(
          "¿Deseas eliminar el correo de recuperación verificado?"
        );

      if (!confirmed) {
        return;
      }

      setMessage("");
      setError("");

      try {
        setSaving(true);

        const response =
          await api.delete(
            "/auth/recovery-email"
          );

        setMessage(
          response.data
            ?.message ||
            "Correo de recuperación eliminado."
        );

        await loadStatus();
      } catch (
        requestError
      ) {
        setError(
          requestError
            ?.response
            ?.data
            ?.message ||
            "No se pudo eliminar el correo de recuperación."
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <section
      style={container}
    >
      <div style={header}>
        <div>
          <p style={eyebrow}>
            RECUPERACIÓN DE CUENTA
          </p>

          <h3 style={title}>
            Correo de recuperación
          </h3>

          <p style={text}>
            Este correo recibirá el enlace
            seguro cuando olvides tu contraseña.
          </p>
        </div>

        <span
          style={
            status.verified
              ? verifiedBadge
              : pendingBadge
          }
        >
          {status.verified
            ? "VERIFICADO"
            : status.pending
              ? "PENDIENTE"
              : "NO CONFIGURADO"}
        </span>
      </div>

      {message && (
        <div
          role="status"
          style={successBox}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={errorBox}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={infoCard}>
          Consultando correo de recuperación...
        </div>
      ) : (
        <>
          <div style={infoGrid}>
            <div style={infoCard}>
              <span style={infoLabel}>
                Correo principal
              </span>

              <strong>
                {status.primaryEmail ||
                  "No disponible"}
              </strong>
            </div>

            <div style={infoCard}>
              <span style={infoLabel}>
                Correo de recuperación
              </span>

              <strong>
                {status.recoveryEmailMasked ||
                  "No configurado"}
              </strong>
            </div>
          </div>

          {status.pending && (
            <div style={pendingNotice}>
              <strong>
                Verificación pendiente:
              </strong>{" "}
              {
                status.pendingRecoveryEmailMasked
              }
              <br />
              Revisa ese correo y abre el enlace
              de confirmación.
            </div>
          )}

          <form
            onSubmit={
              requestVerification
            }
            style={form}
          >
            <label style={field}>
              <span>
                {status.verified
                  ? "Cambiar correo de recuperación"
                  : "Agregar correo de recuperación"}
              </span>

              <input
                type="email"
                value={
                  recoveryEmail
                }
                onChange={(
                  event
                ) =>
                  setRecoveryEmail(
                    event.target.value
                  )
                }
                placeholder="enyelfeliz2000@gmail.com"
                autoComplete="email"
                disabled={saving}
                style={input}
              />
            </label>

            <div style={actions}>
              <button
                type="submit"
                disabled={saving}
                style={primaryButton}
              >
                {saving
                  ? "Enviando..."
                  : "Enviar enlace de verificación"}
              </button>

              {status.verified && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={
                    removeRecoveryEmail
                  }
                  style={dangerButton}
                >
                  Eliminar
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </section>
  );
}

const container = {
  marginTop: "20px",
  padding: "20px",
  borderRadius:
    "var(--qsm-radius-medium)",
  border:
    "1px solid var(--qsm-border)",
  background:
    "var(--qsm-surface-soft)",
  display: "grid",
  gap: "16px"
};

const header = {
  display: "flex",
  justifyContent:
    "space-between",
  alignItems:
    "flex-start",
  gap: "16px",
  flexWrap: "wrap"
};

const eyebrow = {
  margin: 0,
  color:
    "var(--qsm-accent)",
  fontSize: "11px",
  fontWeight: 950,
  letterSpacing: "2px"
};

const title = {
  margin: "8px 0"
};

const text = {
  margin: 0,
  color:
    "var(--qsm-text-secondary)",
  lineHeight: "24px"
};

const verifiedBadge = {
  padding: "8px 12px",
  borderRadius: "999px",
  color: "#86efac",
  background:
    "rgba(34, 197, 94, .14)",
  border:
    "1px solid rgba(34, 197, 94, .30)",
  fontSize: "11px",
  fontWeight: 950
};

const pendingBadge = {
  ...verifiedBadge,
  color: "#fde68a",
  background:
    "rgba(245, 158, 11, .14)",
  border:
    "1px solid rgba(245, 158, 11, .30)"
};

const infoGrid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2, minmax(0, 1fr))",
  gap: "12px"
};

const infoCard = {
  minWidth: 0,
  padding: "15px",
  borderRadius: "15px",
  border:
    "1px solid var(--qsm-border)",
  background:
    "var(--qsm-surface)",
  display: "grid",
  gap: "6px",
  wordBreak: "break-word"
};

const infoLabel = {
  color:
    "var(--qsm-muted)",
  fontSize: "12px"
};

const pendingNotice = {
  padding: "14px",
  borderRadius: "14px",
  background:
    "rgba(245, 158, 11, .12)",
  border:
    "1px solid rgba(245, 158, 11, .28)",
  color: "#fde68a",
  lineHeight: "24px"
};

const form = {
  display: "grid",
  gap: "13px"
};

const field = {
  display: "grid",
  gap: "8px",
  color:
    "var(--qsm-text)",
  fontWeight: 850
};

const input = {
  minHeight: "54px",
  width: "100%",
  borderRadius: "15px",
  padding: "0 14px",
  outline: "none",
  color:
    "var(--qsm-text)",
  background:
    "var(--qsm-surface)",
  border:
    "1px solid var(--qsm-border)"
};

const actions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap"
};

const primaryButton = {
  minHeight: "48px",
  padding: "0 18px",
  border: "none",
  borderRadius: "14px",
  color: "#ffffff",
  fontWeight: 950,
  cursor: "pointer",
  background:
    "linear-gradient(135deg, var(--qsm-accent), #38bdf8, #8b5cf6)"
};

const dangerButton = {
  ...primaryButton,
  background:
    "rgba(127, 29, 29, .25)",
  border:
    "1px solid rgba(248, 113, 113, .30)",
  color: "#fecaca"
};

const successBox = {
  padding: "13px 15px",
  borderRadius: "14px",
  background:
    "rgba(34, 197, 94, .14)",
  border:
    "1px solid rgba(34, 197, 94, .30)",
  color: "#bbf7d0",
  fontWeight: 800
};

const errorBox = {
  ...successBox,
  background:
    "rgba(127, 29, 29, .24)",
  border:
    "1px solid rgba(248, 113, 113, .30)",
  color: "#fecaca"
};

export default RecoveryEmailSection;
'@

$VerifyPageContent = @'
import {
  useEffect,
  useState
} from "react";

import {
  Link,
  useSearchParams
} from "react-router-dom";

import api from "../api/axios";

function VerifyRecoveryEmail() {
  const [
    searchParams
  ] = useSearchParams();

  const token =
    String(
      searchParams.get("token") || ""
    ).trim();

  const [
    state,
    setState
  ] = useState({
    loading: true,
    success: false,
    message: ""
  });

  useEffect(
    () => {
      const verify =
        async () => {
          if (!token) {
            setState({
              loading: false,
              success: false,
              message:
                "El enlace no contiene un token válido."
            });

            return;
          }

          try {
            const response =
              await api.post(
                "/auth/recovery-email/verify",
                {
                  token
                }
              );

            setState({
              loading: false,
              success: true,
              message:
                response.data
                  ?.message ||
                "Correo de recuperación verificado correctamente."
            });
          } catch (
            requestError
          ) {
            setState({
              loading: false,
              success: false,
              message:
                requestError
                  ?.response
                  ?.data
                  ?.message ||
                "El enlace es inválido o expiró."
            });
          }
        };

      verify();
    },
    [
      token
    ]
  );

  return (
    <main style={page}>
      <section style={card}>
        <div style={icon}>
          {state.loading
            ? "⏳"
            : state.success
              ? "✅"
              : "⚠️"}
        </div>

        <p style={label}>
          SEGURIDAD QSM
        </p>

        <h1 style={title}>
          Verificar correo de recuperación
        </h1>

        <div
          style={
            state.loading
              ? infoBox
              : state.success
                ? successBox
                : errorBox
          }
        >
          {state.loading
            ? "Verificando enlace..."
            : state.message}
        </div>

        <Link
          to={
            state.success
              ? "/settings"
              : "/login"
          }
          style={button}
        >
          {state.success
            ? "Volver a Configuración"
            : "Ir al inicio de sesión"}
        </Link>
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  color: "#ffffff",
  background:
    "radial-gradient(circle at top right, rgba(139,92,246,.22), transparent 32%), radial-gradient(circle at 20% 20%, rgba(53,208,195,.16), transparent 28%), #020617",
  fontFamily:
    'Inter, "Plus Jakarta Sans", system-ui, sans-serif'
};

const card = {
  width: "100%",
  maxWidth: "560px",
  padding: "36px",
  borderRadius: "30px",
  textAlign: "center",
  background:
    "rgba(15,23,42,.80)",
  border:
    "1px solid rgba(53,208,195,.22)",
  boxShadow:
    "0 30px 100px rgba(0,0,0,.35)",
  backdropFilter:
    "blur(18px)"
};

const icon = {
  width: "76px",
  height: "76px",
  margin: "0 auto 18px",
  display: "grid",
  placeItems: "center",
  borderRadius: "24px",
  fontSize: "34px",
  background:
    "linear-gradient(135deg, #35d0c3, #8b5cf6)"
};

const label = {
  margin: 0,
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: 950
};

const title = {
  margin: "12px 0 22px",
  fontSize:
    "clamp(30px, 5vw, 42px)"
};

const infoBox = {
  padding: "15px",
  borderRadius: "15px",
  background:
    "rgba(56,189,248,.12)",
  border:
    "1px solid rgba(56,189,248,.25)",
  color: "#bae6fd",
  lineHeight: "25px"
};

const successBox = {
  ...infoBox,
  background:
    "rgba(34,197,94,.14)",
  border:
    "1px solid rgba(34,197,94,.30)",
  color: "#bbf7d0"
};

const errorBox = {
  ...infoBox,
  background:
    "rgba(127,29,29,.24)",
  border:
    "1px solid rgba(248,113,113,.30)",
  color: "#fecaca"
};

const button = {
  display: "inline-flex",
  marginTop: "22px",
  minHeight: "50px",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 20px",
  borderRadius: "14px",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 950,
  background:
    "linear-gradient(135deg, #35d0c3, #38bdf8, #8b5cf6)"
};

export default VerifyRecoveryEmail;
'@

$Patcher = Join-Path $env:TEMP "qsm_fase2_recovery_$Stamp.cjs"

$PatcherContent = @'
const fs = require("node:fs");

const [
  controllerPath,
  routesPath,
  emailPath,
  settingsPath,
  appPath
] = process.argv.slice(2);

function read(file) {
  return fs.readFileSync(file, "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");
}

function write(file, value) {
  fs.writeFileSync(file, value, "utf8");
}

function requireContains(source, text, label) {
  if (!source.includes(text)) {
    throw new Error(`No se encontro ${label}.`);
  }
}

let controller = read(controllerPath);
let routes = read(routesPath);
let email = read(emailPath);
let settings = read(settingsPath);
let app = read(appPath);

/* ---------------------------------------------------------
   EMAIL SERVICE
--------------------------------------------------------- */

if (!email.includes("sendRecoveryEmailVerificationEmail")) {
  const exportMarker = "module.exports = {";

  requireContains(
    email,
    exportMarker,
    "module.exports en email.service.js"
  );

  const functionCode = `
const sendRecoveryEmailVerificationEmail = async ({
  to,
  verificationLink,
  expiresMinutes = 15
}) =>
  safeSendMail({
    to,
    subject:
      "Verifica tu correo de recuperación de QSM",
    text: [
      "Quick Secure Market",
      "",
      "Confirma este correo como método de recuperación de tu cuenta.",
      verificationLink,
      "",
      "El enlace vence en " + expiresMinutes + " minutos.",
      "",
      "Si no solicitaste este cambio, ignora este correo."
    ].join("\\n"),
    html: \`
      <div style="font-family:Arial,sans-serif;padding:32px;background:#f8fafc;color:#0f172a">
        <div style="max-width:620px;margin:auto;background:#ffffff;padding:34px;border-radius:18px">
          <h1 style="color:#2563eb">Quick Secure Market</h1>
          <h2>Verifica tu correo de recuperación</h2>
          <p>
            Confirma que este correo será utilizado para recuperar tu cuenta QSM.
          </p>
          <p style="margin:30px 0">
            <a
              href="\${escapeHtml(verificationLink)}"
              style="display:inline-block;padding:14px 22px;background:#2563eb;color:white;text-decoration:none;border-radius:10px;font-weight:bold"
            >
              Verificar correo
            </a>
          </p>
          <p>
            El enlace vence en <strong>\${expiresMinutes} minutos</strong>.
          </p>
          <p style="color:#64748b">
            Si no solicitaste este cambio, ignora este correo.
          </p>
        </div>
      </div>
    \`
  });

`;

  email = email.replace(
    exportMarker,
    functionCode + exportMarker
  );

  email = email.replace(
    "sendPasswordChangedEmail\n};",
    "sendPasswordChangedEmail,\n  sendRecoveryEmailVerificationEmail\n};"
  );
}

/* ---------------------------------------------------------
   AUTH CONTROLLER
--------------------------------------------------------- */

if (!controller.includes("sendRecoveryEmailVerificationEmail")) {
  controller = controller.replace(
    "sendPasswordChangedEmail\n} = require(\"../services/email.service\");",
    "sendPasswordChangedEmail,\n  sendRecoveryEmailVerificationEmail\n} = require(\"../services/email.service\");"
  );
}

if (!controller.includes("const maskEmail =")) {
  const marker =
    "const hashResetToken = (token) =>";

  requireContains(
    controller,
    marker,
    "hashResetToken en auth controller"
  );

  const helpers = `
const maskEmail = (email) => {
  const clean =
    String(email || "")
      .trim()
      .toLowerCase();

  const atIndex =
    clean.indexOf("@");

  if (atIndex <= 0) {
    return "";
  }

  const local =
    clean.slice(0, atIndex);

  const domain =
    clean.slice(atIndex);

  if (local.length === 1) {
    return local + "***" + domain;
  }

  return (
    local.charAt(0) +
    "*".repeat(
      Math.max(
        local.length - 2,
        3
      )
    ) +
    local.charAt(
      local.length - 1
    ) +
    domain
  );
};

const RECOVERY_EMAIL_TOKEN_MINUTES = 15;

`;

  controller =
    controller.replace(
      marker,
      helpers + marker
    );
}

if (!controller.includes("const getRecoveryEmailStatus = async")) {
  const marker =
    "const forgotPassword = async";

  requireContains(
    controller,
    marker,
    "forgotPassword en auth controller"
  );

  const functions = `
const getRecoveryEmailStatus = async (
  req,
  res
) => {
  try {
    const user =
      req.prismaUser;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No autorizado."
      });
    }

    const freshUser =
      await prisma.user.findUnique({
        where: {
          id: user.id
        },
        select: {
          email: true,
          recoveryEmail: true,
          pendingRecoveryEmail: true,
          recoveryEmailVerifiedAt: true,
          recoveryEmailVerificationExpires: true
        }
      });

    return res.status(200).json({
      success: true,
      recoveryEmail: {
        primaryEmail:
          freshUser?.email || "",
        recoveryEmailMasked:
          maskEmail(
            freshUser?.recoveryEmail
          ),
        pendingRecoveryEmailMasked:
          maskEmail(
            freshUser?.pendingRecoveryEmail
          ),
        verified:
          Boolean(
            freshUser?.recoveryEmail &&
            freshUser?.recoveryEmailVerifiedAt
          ),
        pending:
          Boolean(
            freshUser?.pendingRecoveryEmail &&
            freshUser?.recoveryEmailVerificationExpires &&
            new Date(
              freshUser.recoveryEmailVerificationExpires
            ) > new Date()
          )
      }
    });
  } catch (error) {
    console.error(
      "Error getRecoveryEmailStatus:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo consultar el correo de recuperación."
    });
  }
};

const requestRecoveryEmailVerification = async (
  req,
  res
) => {
  try {
    const user =
      req.prismaUser;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No autorizado."
      });
    }

    const cleanRecoveryEmail =
      normalizeEmail(
        req.body?.recoveryEmail
      );

    if (
      !cleanRecoveryEmail ||
      !validator.isEmail(
        cleanRecoveryEmail
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El correo de recuperación no es válido."
      });
    }

    if (
      cleanRecoveryEmail ===
      normalizeEmail(
        user.email
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "El correo de recuperación debe ser diferente al correo principal."
      });
    }

    const usedByAnotherUser =
      await prisma.user.findFirst({
        where: {
          id: {
            not: user.id
          },
          OR: [
            {
              email:
                cleanRecoveryEmail
            },
            {
              recoveryEmail:
                cleanRecoveryEmail
            }
          ]
        },
        select: {
          id: true
        }
      });

    if (usedByAnotherUser) {
      return res.status(409).json({
        success: false,
        message:
          "Este correo ya está asociado a otra cuenta QSM."
      });
    }

    const rawToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    const tokenHash =
      hashResetToken(
        rawToken
      );

    const expiresAt =
      new Date(
        Date.now() +
        RECOVERY_EMAIL_TOKEN_MINUTES *
        60 *
        1000
      );

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        pendingRecoveryEmail:
          cleanRecoveryEmail,
        recoveryEmailVerificationToken:
          tokenHash,
        recoveryEmailVerificationExpires:
          expiresAt
      }
    });

    const frontendUrl =
      String(
        process.env.FRONTEND_URL ||
        getFrontendUrl() ||
        ""
      )
        .trim()
        .replace(/\\/+$/, "");

    if (!frontendUrl) {
      throw new Error(
        "FRONTEND_URL no está configurado."
      );
    }

    const verificationLink =
      frontendUrl +
      "/verify-recovery-email?token=" +
      encodeURIComponent(
        rawToken
      );

    try {
      await sendRecoveryEmailVerificationEmail({
        to:
          cleanRecoveryEmail,
        verificationLink,
        expiresMinutes:
          RECOVERY_EMAIL_TOKEN_MINUTES
      });
    } catch (emailError) {
      await prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          pendingRecoveryEmail:
            null,
          recoveryEmailVerificationToken:
            null,
          recoveryEmailVerificationExpires:
            null
        }
      });

      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message:
        "Enviamos un enlace de verificación al correo indicado.",
      pendingRecoveryEmailMasked:
        maskEmail(
          cleanRecoveryEmail
        )
    });
  } catch (error) {
    console.error(
      "Error requestRecoveryEmailVerification:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo enviar la verificación del correo de recuperación."
    });
  }
};

const verifyRecoveryEmail = async (
  req,
  res
) => {
  try {
    const token =
      String(
        req.body?.token || ""
      ).trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message:
          "El token de verificación es obligatorio."
      });
    }

    const user =
      await prisma.user.findFirst({
        where: {
          recoveryEmailVerificationToken:
            hashResetToken(
              token
            ),
          recoveryEmailVerificationExpires: {
            gt: new Date()
          },
          pendingRecoveryEmail: {
            not: null
          }
        }
      });

    if (!user) {
      return res.status(400).json({
        success: false,
        message:
          "El enlace es inválido, ya fue utilizado o expiró."
      });
    }

    const verifiedEmail =
      user.pendingRecoveryEmail;

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        recoveryEmail:
          verifiedEmail,
        recoveryEmailVerifiedAt:
          new Date(),
        recoveryEmailUpdatedAt:
          new Date(),
        pendingRecoveryEmail:
          null,
        recoveryEmailVerificationToken:
          null,
        recoveryEmailVerificationExpires:
          null
      }
    });

    return res.status(200).json({
      success: true,
      message:
        "Correo de recuperación verificado correctamente.",
      recoveryEmailMasked:
        maskEmail(
          verifiedEmail
        )
    });
  } catch (error) {
    console.error(
      "Error verifyRecoveryEmail:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo verificar el correo de recuperación."
    });
  }
};

const deleteRecoveryEmail = async (
  req,
  res
) => {
  try {
    const user =
      req.prismaUser;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "No autorizado."
      });
    }

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        recoveryEmail:
          null,
        recoveryEmailVerifiedAt:
          null,
        recoveryEmailUpdatedAt:
          new Date(),
        pendingRecoveryEmail:
          null,
        recoveryEmailVerificationToken:
          null,
        recoveryEmailVerificationExpires:
          null
      }
    });

    return res.status(200).json({
      success: true,
      message:
        "Correo de recuperación eliminado correctamente."
    });
  } catch (error) {
    console.error(
      "Error deleteRecoveryEmail:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "No se pudo eliminar el correo de recuperación."
    });
  }
};

`;

  controller =
    controller.replace(
      marker,
      functions + marker
    );
}

if (!controller.includes("getRecoveryEmailStatus,")) {
  controller = controller.replace(
    "getMe,\n  forgotPassword,",
    "getMe,\n  getRecoveryEmailStatus,\n  requestRecoveryEmailVerification,\n  verifyRecoveryEmail,\n  deleteRecoveryEmail,\n  forgotPassword,"
  );
}

/* ---------------------------------------------------------
   ROUTES
--------------------------------------------------------- */

if (!routes.includes("getRecoveryEmailStatus")) {
  routes = routes.replace(
    "getMe,\n  forgotPassword,",
    "getMe,\n  getRecoveryEmailStatus,\n  requestRecoveryEmailVerification,\n  verifyRecoveryEmail,\n  deleteRecoveryEmail,\n  forgotPassword,"
  );
}

if (!routes.includes('"/recovery-email"')) {
  const marker =
    'router.post(\n  "/forgot-password",';

  requireContains(
    routes,
    marker,
    "ruta forgot-password"
  );

  const routeCode = `
router.get(
  "/recovery-email",
  authMiddleware,
  getRecoveryEmailStatus
);

router.post(
  "/recovery-email/request-verification",
  authMiddleware,
  forgotPasswordLimiter,
  requestRecoveryEmailVerification
);

router.post(
  "/recovery-email/verify",
  forgotPasswordLimiter,
  verifyRecoveryEmail
);

router.delete(
  "/recovery-email",
  authMiddleware,
  deleteRecoveryEmail
);

`;

  routes =
    routes.replace(
      marker,
      routeCode + marker
    );
}

/* ---------------------------------------------------------
   SETTINGS
--------------------------------------------------------- */

if (!settings.includes("RecoveryEmailSection")) {
  settings = settings.replace(
    'import AiAssistant from "../components/AiAssistant";',
    'import AiAssistant from "../components/AiAssistant";\nimport RecoveryEmailSection from "../components/settings/RecoveryEmailSection";'
  );
}

if (!settings.includes("<RecoveryEmailSection />")) {
  const marker =
    '<form\n                      onSubmit={\n                        changePassword';

  requireContains(
    settings,
    marker,
    "formulario de cambio de contraseña en Settings.jsx"
  );

  settings =
    settings.replace(
      marker,
      '<RecoveryEmailSection />\n\n                    ' + marker
    );
}

/* ---------------------------------------------------------
   APP ROUTE
--------------------------------------------------------- */

if (!app.includes("VerifyRecoveryEmail")) {
  app = app.replace(
    'const ResetPassword = lazy(() => import("./pages/ResetPassword"));',
    'const ResetPassword = lazy(() => import("./pages/ResetPassword"));\nconst VerifyRecoveryEmail = lazy(() => import("./pages/VerifyRecoveryEmail"));'
  );
}

if (!app.includes('path="/verify-recovery-email"')) {
  const marker =
    `        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />`;

  requireContains(
    app,
    marker,
    "ruta reset-password en App.jsx"
  );

  app = app.replace(
    marker,
    marker +
    `

        <Route
          path="/verify-recovery-email"
          element={<VerifyRecoveryEmail />}
        />`
  );
}

write(controllerPath, controller);
write(routesPath, routes);
write(emailPath, email);
write(settingsPath, settings);
write(appPath, app);

console.log(JSON.stringify({
  status: "PATCH_OK",
  implemented: [
    "consulta del correo de recuperación",
    "registro de correo pendiente",
    "verificación por enlace Brevo",
    "correo enmascarado",
    "cambio y eliminación del correo",
    "pantalla en Configuración > Seguridad",
    "ruta pública de verificación"
  ]
}, null, 2));
'@

$PatcherContent |
  Set-Content `
    -LiteralPath $Patcher `
    -Encoding UTF8

function Restore-QsmFiles {
  Copy-Item (Join-Path $Backup "auth-prisma.controller.js") $Controller -Force
  Copy-Item (Join-Path $Backup "auth.routes.js") $Routes -Force
  Copy-Item (Join-Path $Backup "email.service.js") $EmailSvc -Force
  Copy-Item (Join-Path $Backup "Settings.jsx") $Settings -Force
  Copy-Item (Join-Path $Backup "App.jsx") $App -Force

  if (Test-Path (Join-Path $Backup "RecoveryEmailSection.jsx")) {
    New-Item -ItemType Directory -Force -Path (Split-Path $RecoveryComponent -Parent) | Out-Null
    Copy-Item (Join-Path $Backup "RecoveryEmailSection.jsx") $RecoveryComponent -Force
  }
  elseif (Test-Path $RecoveryComponent) {
    Remove-Item $RecoveryComponent -Force
  }

  if (Test-Path (Join-Path $Backup "VerifyRecoveryEmail.jsx")) {
    Copy-Item (Join-Path $Backup "VerifyRecoveryEmail.jsx") $VerifyPage -Force
  }
  elseif (Test-Path $VerifyPage) {
    Remove-Item $VerifyPage -Force
  }
}

try {
  Write-Host ""
  Write-Host "=== APLICANDO FASE 2 - CORREO DE RECUPERACION ===" -ForegroundColor Cyan

  New-Item -ItemType Directory -Force -Path (Split-Path $RecoveryComponent -Parent) | Out-Null

  $RecoveryComponentContent |
    Set-Content `
      -LiteralPath $RecoveryComponent `
      -Encoding UTF8

  $VerifyPageContent |
    Set-Content `
      -LiteralPath $VerifyPage `
      -Encoding UTF8

  & node `
    $Patcher `
    $Controller `
    $Routes `
    $EmailSvc `
    $Settings `
    $App

  if ($LASTEXITCODE -ne 0) {
    throw "El parche termino con errores."
  }

  Write-Host ""
  Write-Host "=== VALIDANDO BACKEND ===" -ForegroundColor Cyan

  foreach ($File in @(
    $Controller,
    $Routes,
    $EmailSvc
  )) {
    & node --check $File

    if ($LASTEXITCODE -ne 0) {
      throw "Error de sintaxis en $File"
    }

    Write-Host "OK: $File" -ForegroundColor Green
  }

  Write-Host ""
  Write-Host "=== VALIDANDO PRISMA ===" -ForegroundColor Cyan

  Push-Location (Join-Path $ProjectRoot "backend")

  try {
    & npx prisma validate

    if ($LASTEXITCODE -ne 0) {
      throw "Prisma validate fallo."
    }

    & npx prisma generate

    if ($LASTEXITCODE -ne 0) {
      throw "Prisma generate fallo."
    }
  }
  finally {
    Pop-Location
  }

  Write-Host ""
  Write-Host "=== VALIDANDO FRONTEND ===" -ForegroundColor Cyan

  Push-Location (Join-Path $ProjectRoot "frontend")

  try {
    & npm run build

    if ($LASTEXITCODE -ne 0) {
      throw "El build del frontend fallo."
    }
  }
  finally {
    Pop-Location
  }

  Write-Host ""
  Write-Host "=== VALIDANDO GIT ===" -ForegroundColor Cyan

  Push-Location $ProjectRoot

  try {
    & git diff --check

    if ($LASTEXITCODE -ne 0) {
      throw "Git detecto errores de formato."
    }
  }
  finally {
    Pop-Location
  }

  Write-Host ""
  Write-Host "==========================================" -ForegroundColor Green
  Write-Host "FASE 2 COMPLETADA" -ForegroundColor Green
  Write-Host "==========================================" -ForegroundColor Green
  Write-Host "Pantalla en Configuracion > Seguridad: SI" -ForegroundColor Green
  Write-Host "Registro de correo de recuperacion: SI" -ForegroundColor Green
  Write-Host "Verificacion por enlace Brevo: SI" -ForegroundColor Green
  Write-Host "Correo enmascarado: SI" -ForegroundColor Green
  Write-Host "Cambio y eliminacion: SI" -ForegroundColor Green
  Write-Host "Prisma modificado: NO" -ForegroundColor Green
  Write-Host ""
  Write-Host "Correo exclusivo para pruebas:" -ForegroundColor Cyan
  Write-Host "enyelfeliz2000@gmail.com" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Backup:" -ForegroundColor Cyan
  Write-Host $Backup -ForegroundColor Yellow
}
catch {
  Write-Host ""
  Write-Host "ERROR: restaurando archivos originales..." -ForegroundColor Red

  Restore-QsmFiles

  throw
}
finally {
  Remove-Item -LiteralPath $Patcher -Force -ErrorAction SilentlyContinue
}
