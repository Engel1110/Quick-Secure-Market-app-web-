param(
  [string]$ProjectRoot = "E:\QSM-App-Web - Copy migracion\Quick-Secure-Market-app-web"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Step([string]$Text) {
  Write-Host ""
  Write-Host "=== $Text ===" -ForegroundColor Cyan
}

$Backend = Join-Path $ProjectRoot "backend"
$Frontend = Join-Path $ProjectRoot "frontend"

$Controller = Join-Path $Backend "src\controllers\auth-prisma.controller.js"
$ForgotPage = Join-Path $Frontend "src\pages\ForgotPassword.jsx"

foreach ($File in @($Controller, $ForgotPage)) {
  if (-not (Test-Path -LiteralPath $File -PathType Leaf)) {
    throw "DETENIDO: falta $File"
  }
}

$Stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$Backup = Join-Path $env:TEMP "QSM_FASE4_BACKUP_$Stamp"
$Patcher = Join-Path $env:TEMP "qsm_fase4_$Stamp.cjs"

New-Item -ItemType Directory -Force -Path $Backup | Out-Null
Copy-Item $Controller (Join-Path $Backup "auth-prisma.controller.js") -Force
Copy-Item $ForgotPage (Join-Path $Backup "ForgotPassword.jsx") -Force

@'
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(process.argv[2]);

const controllerFile = path.join(
  root,
  "backend/src/controllers/auth-prisma.controller.js"
);

const forgotFile = path.join(
  root,
  "frontend/src/pages/ForgotPassword.jsx"
);

function read(file) {
  return fs
    .readFileSync(file, "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function findFunctionBlock(source, signature) {
  const start = source.indexOf(signature);

  if (start < 0) {
    throw new Error(
      "No se encontro la funcion: " + signature
    );
  }

  const braceStart = source.indexOf("{", start);

  if (braceStart < 0) {
    throw new Error(
      "No se encontro el inicio de la funcion."
    );
  }

  let depth = 0;
  let quote = null;
  let escaped = false;

  for (
    let index = braceStart;
    index < source.length;
    index += 1
  ) {
    const char = source[index];
    const next = source[index + 1];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (
      char === "'" ||
      char === '"' ||
      char === "`"
    ) {
      quote = char;
      continue;
    }

    if (char === "/" && next === "/") {
      index = source.indexOf("\n", index);

      if (index < 0) {
        return {
          start,
          end: source.length,
          block: source.slice(start)
        };
      }

      continue;
    }

    if (char === "/" && next === "*") {
      const commentEnd =
        source.indexOf("*/", index + 2);

      if (commentEnd < 0) {
        throw new Error(
          "Comentario sin cerrar dentro de forgotPassword."
        );
      }

      index = commentEnd + 1;
      continue;
    }

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        let end = index + 1;

        while (
          source[end] === ";" ||
          source[end] === "\n" ||
          source[end] === "\r"
        ) {
          end += 1;
        }

        return {
          start,
          end,
          block: source.slice(start, end)
        };
      }
    }
  }

  throw new Error(
    "No se pudo determinar el final de forgotPassword."
  );
}

let controller = read(controllerFile);

const forgotBlockInfo =
  findFunctionBlock(
    controller,
    "const forgotPassword = async"
  );

let forgotBlock =
  forgotBlockInfo.block;

if (
  !forgotBlock.includes(
    "QSM_PHASE4_RECOVERY_DESTINATION"
  )
) {
  const sendMarker =
    "await sendPasswordResetEmail({";

  const sendIndex =
    forgotBlock.indexOf(sendMarker);

  if (sendIndex < 0) {
    throw new Error(
      "No se encontro sendPasswordResetEmail dentro de forgotPassword."
    );
  }

  const recoveryCode = `
    // QSM_PHASE4_RECOVERY_DESTINATION
    const recoveryDestination =
      await prisma.user.findUnique({
        where: {
          id: user.id
        },
        select: {
          recoveryEmail: true,
          recoveryEmailVerifiedAt: true
        }
      });

    if (
      !recoveryDestination?.recoveryEmail ||
      !recoveryDestination?.recoveryEmailVerifiedAt
    ) {
      return res.status(200).json({
        success: true,
        message:
          "Si la cuenta posee un correo de recuperación verificado, recibirá las instrucciones."
      });
    }

`;

  forgotBlock =
    forgotBlock.slice(0, sendIndex) +
    recoveryCode +
    forgotBlock.slice(sendIndex);

  const insertedSendIndex =
    forgotBlock.indexOf(
      sendMarker,
      sendIndex + recoveryCode.length
    );

  const sendObjectEnd =
    forgotBlock.indexOf(
      "});",
      insertedSendIndex
    );

  if (sendObjectEnd < 0) {
    throw new Error(
      "No se pudo localizar el cierre de sendPasswordResetEmail."
    );
  }

  const beforeSend =
    forgotBlock.slice(
      0,
      insertedSendIndex
    );

  let sendSection =
    forgotBlock.slice(
      insertedSendIndex,
      sendObjectEnd + 3
    );

  const recipientPatterns = [
    /to\s*:\s*user\.email/,
    /to\s*:\s*cleanEmail/,
    /to\s*:\s*email/
  ];

  let replaced = false;

  for (
    const pattern of recipientPatterns
  ) {
    if (pattern.test(sendSection)) {
      sendSection =
        sendSection.replace(
          pattern,
          "to: recoveryDestination.recoveryEmail"
        );

      replaced = true;
      break;
    }
  }

  if (!replaced) {
    throw new Error(
      "No se reconocio el destinatario actual del correo de reset."
    );
  }

  forgotBlock =
    beforeSend +
    sendSection +
    forgotBlock.slice(
      sendObjectEnd + 3
    );

  controller =
    controller.slice(
      0,
      forgotBlockInfo.start
    ) +
    forgotBlock +
    controller.slice(
      forgotBlockInfo.end
    );
}

/*
|--------------------------------------------------------------------------
| FRONTEND ASCII-ONLY
| Evita caracteres dañados por problemas de codificacion.
|--------------------------------------------------------------------------
*/

const forgotPage = `import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

const TEXT = {
  eyebrow: "RECUPERACI\\u00D3N QSM",
  title: "\\u00BFOlvidaste tu contrase\\u00F1a?",
  intro:
    "Escribe el correo principal asociado a tu cuenta. Te mostraremos el correo de recuperaci\\u00F3n registrado de forma segura.",
  mainEmail: "Correo principal de QSM",
  continue: "Continuar",
  checking: "Consultando...",
  found:
    "Encontramos un correo de recuperaci\\u00F3n verificado para esta cuenta.",
  destination:
    "Enviaremos la recuperaci\\u00F3n a:",
  privacy:
    "Por seguridad, solo mostramos una parte del correo.",
  useEmail: "Enviar enlace de recuperaci\\u00F3n",
  sending: "Enviando...",
  another: "Usar otra cuenta",
  back: "Volver a iniciar sesi\\u00F3n",
  sentTitle:
    "Enlace de recuperaci\\u00F3n enviado",
  sentText:
    "Revisa el correo de recuperaci\\u00F3n indicado. El enlace es temporal y solo puede utilizarse para restablecer la contrase\\u00F1a.",
  lookupError:
    "No se pudo consultar el m\\u00E9todo de recuperaci\\u00F3n.",
  sendError:
    "No se pudo enviar el enlace de recuperaci\\u00F3n.",
  required:
    "Escribe el correo principal de tu cuenta QSM."
};

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState("EMAIL");
  const [recoveryEmailMasked, setRecoveryEmailMasked] =
    useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const cleanEmail = email.trim().toLowerCase();

  const resetScreen = () => {
    setStep("EMAIL");
    setRecoveryEmailMasked("");
    setMessage("");
    setError("");
  };

  const handleLookup = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!cleanEmail) {
      setError(TEXT.required);
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        "/auth/forgot-password/destination",
        {
          email: cleanEmail
        }
      );

      if (
        response.data?.recoveryAvailable &&
        response.data?.recoveryEmailMasked
      ) {
        setRecoveryEmailMasked(
          response.data.recoveryEmailMasked
        );
        setStep("DESTINATION");
        return;
      }

      setError(
        response.data?.message ||
          "No encontramos un correo de recuperaci\\u00F3n verificado para esa cuenta."
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          TEXT.lookupError
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendRecovery = async () => {
    setMessage("");
    setError("");

    try {
      setLoading(true);

      const response = await api.post(
        "/auth/forgot-password",
        {
          email: cleanEmail
        }
      );

      setMessage(
        response.data?.message ||
          "Si la cuenta es v\\u00E1lida, recibir\\u00E1 las instrucciones de recuperaci\\u00F3n."
      );

      setStep("SENT");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          TEXT.sendError
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <div style={icon}>
          {step === "SENT" ? "\\u2705" : "\\uD83D\\uDD10"}
        </div>

        <p style={label}>{TEXT.eyebrow}</p>

        <h1 style={title}>
          {step === "SENT"
            ? TEXT.sentTitle
            : TEXT.title}
        </h1>

        {step === "EMAIL" && (
          <>
            <p style={subtitle}>
              {TEXT.intro}
            </p>

            {error && (
              <div style={errorBox}>
                {error}
              </div>
            )}

            <form
              onSubmit={handleLookup}
              style={form}
              noValidate
            >
              <label style={field}>
                <span>{TEXT.mainEmail}</span>

                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  autoComplete="email"
                  disabled={loading}
                  style={input}
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                style={button}
              >
                {loading
                  ? TEXT.checking
                  : TEXT.continue + " \\u2192"}
              </button>
            </form>
          </>
        )}

        {step === "DESTINATION" && (
          <>
            <p style={subtitle}>
              {TEXT.found}
            </p>

            <div style={destinationCard}>
              <span style={destinationLabel}>
                {TEXT.destination}
              </span>

              <strong style={destinationEmail}>
                {recoveryEmailMasked}
              </strong>

              <span style={destinationHint}>
                {TEXT.privacy}
              </span>
            </div>

            {error && (
              <div style={errorBox}>
                {error}
              </div>
            )}

            <div style={actions}>
              <button
                type="button"
                style={button}
                disabled={loading}
                onClick={handleSendRecovery}
              >
                {loading
                  ? TEXT.sending
                  : TEXT.useEmail + " \\u2192"}
              </button>

              <button
                type="button"
                style={secondaryButton}
                disabled={loading}
                onClick={resetScreen}
              >
                {TEXT.another}
              </button>
            </div>
          </>
        )}

        {step === "SENT" && (
          <>
            <p style={subtitle}>
              {TEXT.sentText}
            </p>

            <div style={successBox}>
              <strong>
                {recoveryEmailMasked}
              </strong>
              <br />
              {message}
            </div>

            <button
              type="button"
              style={secondaryButton}
              onClick={resetScreen}
            >
              {TEXT.another}
            </button>
          </>
        )}

        <Link to="/login" style={backLink}>
          {"\\u2190 " + TEXT.back}
        </Link>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top right, rgba(139,92,246,.22), transparent 32%), radial-gradient(circle at 20% 20%, rgba(53,208,195,.16), transparent 28%), #020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  color: "white",
  fontFamily:
    'Inter, "Plus Jakarta Sans", system-ui, sans-serif'
};

const card = {
  width: "100%",
  maxWidth: "560px",
  background: "rgba(15,23,42,.82)",
  border: "1px solid rgba(56,189,248,.25)",
  borderRadius: "30px",
  padding: "36px",
  boxShadow: "0 30px 100px rgba(0,0,0,.38)",
  backdropFilter: "blur(18px)",
  textAlign: "center"
};

const icon = {
  width: "74px",
  height: "74px",
  borderRadius: "24px",
  margin: "0 auto 18px",
  background:
    "linear-gradient(135deg, #35d0c3, #38bdf8, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "32px"
};

const label = {
  margin: 0,
  color: "#35d0c3",
  letterSpacing: "4px",
  fontSize: "12px",
  fontWeight: "950"
};

const title = {
  fontSize: "38px",
  lineHeight: "1.05",
  margin: "12px 0"
};

const subtitle = {
  color: "#cbd5e1",
  lineHeight: "27px",
  marginBottom: "22px"
};

const form = {
  display: "grid",
  gap: "16px",
  textAlign: "left"
};

const field = {
  display: "grid",
  gap: "9px",
  color: "#e2e8f0",
  fontWeight: "800"
};

const input = {
  height: "56px",
  background: "rgba(2,6,23,.58)",
  border: "1px solid rgba(56,189,248,.24)",
  borderRadius: "16px",
  color: "white",
  padding: "0 15px",
  outline: "none"
};

const button = {
  minHeight: "56px",
  border: "none",
  borderRadius: "16px",
  padding: "0 20px",
  background:
    "linear-gradient(135deg, #35d0c3, #38bdf8, #8b5cf6)",
  color: "white",
  fontWeight: "950",
  cursor: "pointer"
};

const secondaryButton = {
  ...button,
  width: "100%",
  background: "rgba(15,23,42,.78)",
  border: "1px solid rgba(148,163,184,.22)",
  color: "#cbd5e1",
  marginTop: "12px"
};

const actions = {
  display: "grid",
  gap: "12px",
  marginTop: "16px"
};

const destinationCard = {
  display: "grid",
  gap: "10px",
  padding: "22px",
  marginBottom: "16px",
  borderRadius: "20px",
  background:
    "linear-gradient(135deg, rgba(14,165,233,.12), rgba(139,92,246,.14))",
  border: "1px solid rgba(56,189,248,.26)",
  textAlign: "left"
};

const destinationLabel = {
  color: "#94a3b8",
  fontSize: "13px",
  fontWeight: "800"
};

const destinationEmail = {
  color: "#e0f2fe",
  fontSize: "24px",
  wordBreak: "break-word"
};

const destinationHint = {
  color: "#94a3b8",
  fontSize: "13px",
  lineHeight: "21px"
};

const backLink = {
  display: "inline-flex",
  marginTop: "22px",
  color: "#35d0c3",
  textDecoration: "none",
  fontWeight: "900"
};

const successBox = {
  background: "rgba(34,197,94,.14)",
  border: "1px solid rgba(34,197,94,.32)",
  color: "#bbf7d0",
  padding: "17px",
  borderRadius: "16px",
  marginBottom: "16px",
  fontWeight: "800",
  textAlign: "left",
  lineHeight: "25px"
};

const errorBox = {
  background: "rgba(127,29,29,.24)",
  border: "1px solid rgba(248,113,113,.30)",
  color: "#fecaca",
  padding: "13px 15px",
  borderRadius: "14px",
  marginBottom: "14px",
  fontWeight: "800",
  textAlign: "left"
};

export default ForgotPassword;
`;

write(controllerFile, controller);
write(forgotFile, forgotPage);

console.log(
  JSON.stringify(
    {
      status: "PHASE4_PATCH_OK",
      implemented: [
        "tipografia reparada con Unicode escapes",
        "envio real desde olvidaste tu contrasena",
        "destinatario cambiado a recoveryEmail verificado",
        "pantalla de confirmacion de envio",
        "correo principal no recibe el token"
      ]
    },
    null,
    2
  )
);
'@ | Set-Content -LiteralPath $Patcher -Encoding UTF8

function Restore-QsmFiles {
  Copy-Item (Join-Path $Backup "auth-prisma.controller.js") $Controller -Force
  Copy-Item (Join-Path $Backup "ForgotPassword.jsx") $ForgotPage -Force
}

try {
  Step "REPARANDO TIPOGRAFIA Y APLICANDO FASE 4"

  & node $Patcher $ProjectRoot

  if ($LASTEXITCODE -ne 0) {
    throw "El parche termino con errores."
  }

  Step "VALIDANDO BACKEND"

  & node --check $Controller

  if ($LASTEXITCODE -ne 0) {
    throw "Error de sintaxis en auth-prisma.controller.js"
  }

  Write-Host "OK: $Controller" -ForegroundColor Green

  Step "VALIDANDO PRISMA"

  Push-Location $Backend
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

  Step "VALIDANDO FRONTEND"

  Push-Location $Frontend
  try {
    & npm run build

    if ($LASTEXITCODE -ne 0) {
      throw "El build del frontend fallo."
    }
  }
  finally {
    Pop-Location
  }

  Step "LIMPIANDO ESPACIOS SOBRANTES"

  foreach ($File in @(
    $Controller,
    $ForgotPage
  )) {
    $Content = Get-Content -LiteralPath $File -Raw

    $CleanContent = (
      $Content -split "`r?`n" |
      ForEach-Object {
        $_ -replace "[ `t]+$", ""
      }
    ) -join "`n"

    if (-not $CleanContent.EndsWith("`n")) {
      $CleanContent += "`n"
    }

    [System.IO.File]::WriteAllText(
      $File,
      $CleanContent,
      [System.Text.UTF8Encoding]::new($false)
    )

    Write-Host "LIMPIO: $File" -ForegroundColor Green
  }

  Step "REVALIDANDO BACKEND"

  & node --check $Controller

  if ($LASTEXITCODE -ne 0) {
    throw "Error de sintaxis despues de limpiar espacios."
  }

  Step "REVALIDANDO FRONTEND"

  Push-Location $Frontend
  try {
    & npm run build

    if ($LASTEXITCODE -ne 0) {
      throw "El build del frontend fallo despues de limpiar espacios."
    }
  }
  finally {
    Pop-Location
  }

  Step "VALIDANDO GIT"

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
  Write-Host "TIPOGRAFIA CORREGIDA Y FASE 4 COMPLETADA" -ForegroundColor Green
  Write-Host "==========================================" -ForegroundColor Green
  Write-Host "Texto espanol reparado: SI" -ForegroundColor Green
  Write-Host "Token enviado al recoveryEmail: SI" -ForegroundColor Green
  Write-Host "Correo principal recibe token: NO" -ForegroundColor Green
  Write-Host "Pantalla de confirmacion: SI" -ForegroundColor Green
  Write-Host "ResetPassword modificado: NO" -ForegroundColor Green
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
  Remove-Item $Patcher -Force -ErrorAction SilentlyContinue
}
