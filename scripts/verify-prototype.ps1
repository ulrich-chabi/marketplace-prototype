param(
  [switch]$SkipIntegration,
  [switch]$SkipBrowser
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backend = Join-Path $repoRoot "backend"
$storefront = Join-Path $repoRoot "storefront"

function Invoke-CheckedCommand([string]$WorkingDirectory, [string]$Executable, [string[]]$Arguments) {
  Push-Location $WorkingDirectory
  try {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Échec de '$Executable $($Arguments -join ' ')' (code $LASTEXITCODE)."
    }
  } finally {
    Pop-Location
  }
}

$nodeVersion = (& node --version).Trim()
$nodeMatch = [regex]::Match($nodeVersion, '^v(?<version>\d+\.\d+\.\d+)')
if (-not $nodeMatch.Success) { throw "Version Node.js illisible : $nodeVersion" }
$parsedNodeVersion = [version]$nodeMatch.Groups["version"].Value
$nodeSupported = $parsedNodeVersion -ge [version]"22.22.0"
if (-not $nodeSupported) {
  throw "Node.js 22.22+ est requis par Medusa. Version détectée : $nodeVersion"
}

foreach ($file in @((Join-Path $backend ".env"), (Join-Path $storefront ".env.local"))) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
    throw "Configuration manquante : $file. Consulte README.md."
  }
}

Write-Host "1/6 — Vérification TypeScript du backend"
Invoke-CheckedCommand $backend "npx" @("tsc", "--noEmit")

if (-not $SkipIntegration) {
  $databaseLine = Get-Content -LiteralPath (Join-Path $backend ".env") |
    Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } |
    Select-Object -First 1
  if (-not $databaseLine) { throw "DATABASE_URL absent de backend/.env." }
  $databaseValue = ($databaseLine -replace '^\s*DATABASE_URL\s*=\s*', '').Trim().Trim('"').Trim("'")
  $databaseUri = [Uri]$databaseValue
  if (-not $databaseUri.IsAbsoluteUri -or -not $databaseUri.UserInfo) {
    throw "DATABASE_URL doit inclure utilisateur et mot de passe PostgreSQL."
  }
  $credentials = $databaseUri.UserInfo -split ":", 2
  $env:DB_HOST = $databaseUri.Host
  $env:DB_PORT = $databaseUri.Port.ToString()
  $env:DB_USERNAME = [Uri]::UnescapeDataString($credentials[0])
  $env:DB_PASSWORD = [Uri]::UnescapeDataString($credentials[1])
  Write-Host "2/6 — Migrations et tests d'intégration backend"
  Invoke-CheckedCommand $backend "npx" @("medusa", "db:migrate")
  Invoke-CheckedCommand $backend "npm" @("run", "test:integration:http")
} else {
  Write-Host "2/6 — Tests d'intégration ignorés à la demande"
}

Write-Host "3/6 — Compilation de production Medusa"
Invoke-CheckedCommand $backend "npm" @("run", "build")
Write-Host "4/6 — Vérification TypeScript du storefront"
Invoke-CheckedCommand $storefront "npm" @("run", "typecheck")
Write-Host "5/6 — Compilation de production Webpack"
Invoke-CheckedCommand $storefront "npx" @("next", "build", "--webpack")

if (-not $SkipBrowser) {
  $storefrontUrl = $env:STOREFRONT_URL
  if (-not $storefrontUrl) { $storefrontUrl = "http://localhost:8000" }
  foreach ($url in @("http://localhost:9000/health", $storefrontUrl)) {
    try {
      $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing
      if ($response.StatusCode -ne 200) { throw "Réponse HTTP $($response.StatusCode)." }
    } catch {
      throw "Service requis inaccessible : $url. Démarre le backend et le storefront puis réessaie."
    }
  }
  $env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $storefront ".playwright-browsers"
  Write-Host "6/6 — Tests navigateur Playwright"
  Invoke-CheckedCommand $storefront "npm" @("run", "test:e2e")
} else {
  Write-Host "6/6 — Tests navigateur ignorés à la demande"
}

Write-Host "Toutes les vérifications demandées ont réussi."
