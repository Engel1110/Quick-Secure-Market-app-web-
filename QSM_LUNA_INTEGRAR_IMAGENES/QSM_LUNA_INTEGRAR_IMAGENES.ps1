param(
  [string]$ProjectRoot = "E:\QSM-App-Web - Copy migracion\Quick-Secure-Market-app-web"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Step([string]$Text) {
  Write-Host ""
  Write-Host "=== $Text ===" -ForegroundColor Cyan
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$SourceFullBody = Join-Path $ScriptDir "luna-fullbody.png"
$SourceProfile = Join-Path $ScriptDir "luna-profile.png"
$SourceOfficerCard = Join-Path $ScriptDir "luna-officer-card.png"

$Frontend = Join-Path $ProjectRoot "frontend"
$Component = Join-Path $Frontend "src\components\AiAssistant.jsx"
$Css = Join-Path $Frontend "src\components\AiAssistant.css"
$PublicDir = Join-Path $Frontend "public\qsm-ai"

$TargetFullBody = Join-Path $PublicDir "luna-fullbody.png"
$TargetProfile = Join-Path $PublicDir "luna-profile.png"
$TargetOfficerCard = Join-Path $PublicDir "luna-officer-card.png"

foreach ($File in @(
  $SourceFullBody,
  $SourceProfile,
  $SourceOfficerCard,
  $Component,
  $Css
)) {
  if (-not (Test-Path -LiteralPath $File -PathType Leaf)) {
    throw "DETENIDO: no se encontro $File"
  }
}

$Stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$Backup = Join-Path $env:TEMP "QSM_LUNA_IMAGES_BACKUP_$Stamp"

New-Item -ItemType Directory -Force -Path $Backup | Out-Null
Copy-Item $Component (Join-Path $Backup "AiAssistant.jsx") -Force
Copy-Item $Css (Join-Path $Backup "AiAssistant.css") -Force

foreach ($Pair in @(
  @{ Source = $TargetFullBody; Name = "luna-fullbody.png" },
  @{ Source = $TargetProfile; Name = "luna-profile.png" },
  @{ Source = $TargetOfficerCard; Name = "luna-officer-card.png" }
)) {
  if (Test-Path -LiteralPath $Pair.Source) {
    Copy-Item $Pair.Source (Join-Path $Backup $Pair.Name) -Force
  }
}

$Patcher = Join-Path $env:TEMP "qsm_luna_images_$Stamp.cjs"

@'
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(process.argv[2]);

const jsxFile = path.join(
  root,
  "frontend/src/components/AiAssistant.jsx"
);

const cssFile = path.join(
  root,
  "frontend/src/components/AiAssistant.css"
);

function read(file) {
  return fs
    .readFileSync(file, "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");
}

function write(file, content) {
  const clean = content
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n*$/, "\n");

  fs.writeFileSync(file, clean, "utf8");
}

let jsx = read(jsxFile);
let css = read(cssFile);

const showcaseMarkup = `<aside
            className="qsm-ai-luna-showcase"
            aria-label="LUNA, asistente oficial de QSM"
          >
            <div className="qsm-ai-luna-showcase__glow" />

            <img
              className="qsm-ai-luna-showcase__fullbody"
              src="/qsm-ai/luna-fullbody.png"
              alt="LUNA, androide oficial de QSM Marketplace"
            />

            <img
              className="qsm-ai-luna-showcase__officer-card"
              src="/qsm-ai/luna-officer-card.png"
              alt="LUNA protegiendo tu experiencia en QSM Marketplace"
            />
          </aside>`;

if (jsx.includes('className="qsm-ai-luna-showcase"')) {
  jsx = jsx.replace(
    /<aside\s+className="qsm-ai-luna-showcase"[\s\S]*?<\/aside>/,
    showcaseMarkup
  );
} else {
  const anchor =
    '<div className="qsm-ai-panel__aurora" />';

  if (!jsx.includes(anchor)) {
    throw new Error(
      "No se encontro el ancla visual del panel."
    );
  }

  jsx = jsx.replace(
    anchor,
    `${anchor}

          ${showcaseMarkup}`
  );
}

jsx = jsx.replace(
  /src="\/qsm-ai\/luna-officer\.png"/g,
  'src="/qsm-ai/luna-profile.png"'
);

jsx = jsx.replace(
  /className="qsm-ai-officer-header__image"[\s\S]*?src="\/qsm-ai\/[^"]+"/,
  `className="qsm-ai-officer-header__image"
                src="/qsm-ai/luna-profile.png"`
);

const visualCss = `

/* QSM LUNA - IMAGENES OFICIALES */
.qsm-ai-luna-showcase {
  left: -330px;
  width: 320px;
  height: 720px;
}

.qsm-ai-luna-showcase__fullbody {
  position: absolute !important;
  left: 0 !important;
  bottom: 0 !important;
  width: 320px !important;
  height: 720px !important;
  object-fit: contain !important;
  object-position: center bottom !important;
  border-radius: 0 !important;
  filter:
    saturate(1.08)
    contrast(1.05)
    drop-shadow(0 28px 48px rgba(0, 0, 0, .62)) !important;
  -webkit-mask-image: none !important;
  mask-image: none !important;
}

.qsm-ai-luna-showcase__officer-card {
  position: absolute !important;
  left: 26px !important;
  bottom: 24px !important;
  width: 175px !important;
  height: 255px !important;
  object-fit: contain !important;
  object-position: center !important;
  border-radius: 18px !important;
  filter:
    drop-shadow(0 18px 38px rgba(0, 0, 0, .55))
    drop-shadow(0 0 20px rgba(56, 189, 248, .18)) !important;
  -webkit-mask-image: none !important;
  mask-image: none !important;
}

.qsm-ai-luna-showcase__card {
  display: none !important;
}

.qsm-ai-officer-header__avatar {
  overflow: hidden;
  background:
    radial-gradient(
      circle at 50% 38%,
      rgba(56, 189, 248, .22),
      rgba(2, 6, 23, .92) 70%
    );
}

.qsm-ai-officer-header__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 24%;
  display: block;
  transform: scale(1.08);
}

@media (min-width: 981px) and (max-width: 1280px) {
  .qsm-ai-luna-showcase {
    left: -280px;
    width: 270px;
  }

  .qsm-ai-luna-showcase__fullbody {
    width: 270px !important;
  }

  .qsm-ai-luna-showcase__officer-card {
    left: 16px !important;
    width: 150px !important;
  }
}

@media (max-width: 980px) {
  .qsm-ai-luna-showcase {
    display: none !important;
  }
}
`;

if (!css.includes("QSM LUNA - IMAGENES OFICIALES")) {
  css += visualCss;
} else {
  css = css.replace(
    /\/\* QSM LUNA - IMAGENES OFICIALES \*\/[\s\S]*$/,
    visualCss.trimStart()
  );
}

write(jsxFile, jsx);
write(cssFile, css);

console.log(
  JSON.stringify(
    {
      status: "QSM_LUNA_IMAGES_OK",
      implemented: [
        "LUNA cuerpo completo al lado del portal",
        "foto 2x2 de LUNA en el encabezado",
        "tarjeta visual de LUNA en la parte inferior",
        "esfera futurista conservada",
        "fase 2.3 conservada",
        "vista responsive"
      ]
    },
    null,
    2
  )
);
'@ | Set-Content -LiteralPath $Patcher -Encoding UTF8

try {
  Step "COPIANDO IMAGENES OFICIALES DE LUNA"

  New-Item -ItemType Directory -Force -Path $PublicDir | Out-Null

  Copy-Item $SourceFullBody $TargetFullBody -Force
  Copy-Item $SourceProfile $TargetProfile -Force
  Copy-Item $SourceOfficerCard $TargetOfficerCard -Force

  Step "INTEGRANDO IMAGENES EN QSM AI"

  & node $Patcher $ProjectRoot

  if ($LASTEXITCODE -ne 0) {
    throw "El parche termino con errores."
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

  Step "VALIDANDO GIT"

  Push-Location $ProjectRoot
  try {
    & git diff --check

    if ($LASTEXITCODE -ne 0) {
      throw "Git detecto errores de formato."
    }

    & git diff --stat
  }
  finally {
    Pop-Location
  }

  Write-Host ""
  Write-Host "==========================================" -ForegroundColor Green
  Write-Host "IMAGENES OFICIALES DE LUNA INTEGRADAS" -ForegroundColor Green
  Write-Host "==========================================" -ForegroundColor Green
  Write-Host "Cuerpo completo: SI" -ForegroundColor Green
  Write-Host "Foto 2x2: SI" -ForegroundColor Green
  Write-Host "Tarjeta inferior: SI" -ForegroundColor Green
  Write-Host "Esfera futurista: CONSERVADA" -ForegroundColor Green
  Write-Host "Fase 2.3: CONSERVADA" -ForegroundColor Green
  Write-Host "Backend modificado: NO" -ForegroundColor Green
  Write-Host ""
  Write-Host "Backup:" -ForegroundColor Cyan
  Write-Host $Backup -ForegroundColor Yellow
}
catch {
  Write-Host ""
  Write-Host "ERROR: restaurando archivos..." -ForegroundColor Red

  Copy-Item `
    (Join-Path $Backup "AiAssistant.jsx") `
    $Component `
    -Force

  Copy-Item `
    (Join-Path $Backup "AiAssistant.css") `
    $Css `
    -Force

  foreach ($Pair in @(
    @{ Target = $TargetFullBody; Name = "luna-fullbody.png" },
    @{ Target = $TargetProfile; Name = "luna-profile.png" },
    @{ Target = $TargetOfficerCard; Name = "luna-officer-card.png" }
  )) {
    $Saved = Join-Path $Backup $Pair.Name

    if (Test-Path -LiteralPath $Saved) {
      Copy-Item $Saved $Pair.Target -Force
    }
    elseif (Test-Path -LiteralPath $Pair.Target) {
      Remove-Item $Pair.Target -Force
    }
  }

  throw
}
finally {
  Remove-Item $Patcher -Force -ErrorAction SilentlyContinue
}
