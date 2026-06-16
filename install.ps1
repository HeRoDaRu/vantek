<#
.SYNOPSIS
    Instalador de primera vez de Vantek CRM para Windows.

.DESCRIPTION
    Pensado para que el tecnico lo ejecute UNA sola vez en el PC del cliente,
    como Administrador. Realiza el arranque completo sin instalar nada de forma
    global en el sistema:

      1. Descarga el ultimo release (Vantek-release.zip) desde GitHub y lo
         extrae en el directorio de instalacion.
      2. Descarga Node.js 22 portable (win-x64) en <instalacion>\node.
      3. Descarga NSSM en <instalacion>\tools\nssm.exe.
      4. Ejecuta launcher\install-service.bat, que registra el servicio de
         Windows "VANTEK" apuntando al launcher con el Node portable.

    A partir de aqui el launcher se encarga de las actualizaciones descargando
    el mismo Vantek-release.zip de cada nueva release. node\ y tools\ NO viajan
    en las actualizaciones: se aportan aqui una unica vez y sobreviven a los
    updates (Expand-Archive solo sobreescribe lo que trae el ZIP).

.PARAMETER InstallDir
    Carpeta de instalacion. Por defecto C:\Vantek.

.PARAMETER Repo
    Repositorio GitHub owner/name. Por defecto HeRoDaRu/vantek.

.PARAMETER NodeVersion
    Version de Node.js portable (rama 22.x). Por defecto 22.11.0.
    Cualquier 22.x es compatible con el binario nativo de better-sqlite3.

.PARAMETER Token
    Token de GitHub opcional (para evitar limites de la API en redes con mucho
    trafico). No es necesario para un repositorio publico.

.PARAMETER Force
    Vuelve a descargar Node y NSSM aunque ya existan.

.EXAMPLE
    # Desde PowerShell como Administrador:
    Set-ExecutionPolicy -Scope Process Bypass -Force
    .\install.ps1

.EXAMPLE
    .\install.ps1 -InstallDir 'D:\Vantek' -NodeVersion '22.11.0'
#>

[CmdletBinding()]
param(
    [string] $InstallDir  = 'C:\Vantek',
    [string] $Repo        = 'HeRoDaRu/vantek',
    [string] $NodeVersion = '22.11.0',
    [string] $Token       = '',
    [switch] $Force
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$NssmVersion = '2.24'

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Info($msg) { Write-Host "    $msg" -ForegroundColor Gray }

# ─── 1. Comprobar privilegios de Administrador ─────────────────────────────────
$identity  = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Este instalador debe ejecutarse como Administrador. Abre PowerShell con "Ejecutar como administrador" y vuelve a lanzarlo.'
}

Write-Host '=================================================='
Write-Host '        Vantek CRM - Instalacion (Windows)'
Write-Host '=================================================='
Write-Info "Directorio de instalacion: $InstallDir"
Write-Info "Repositorio:               $Repo"
Write-Info "Node.js portable:          v$NodeVersion (win-x64)"

# Cabeceras para la API de GitHub (User-Agent es obligatorio)
$ghHeaders = @{ 'User-Agent' = 'Vantek-Installer' }
if ($Token -ne '') { $ghHeaders['Authorization'] = "Bearer $Token" }

# Carpeta temporal de trabajo
$tmp = Join-Path $env:TEMP ("vantek-install-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

try {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

    # ─── 2. Detener el servicio si ya existe (reinstalacion) ───────────────────
    $svc = Get-Service -Name 'VANTEK' -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -eq 'Running') {
        Write-Step 'Deteniendo el servicio VANTEK existente...'
        Stop-Service -Name 'VANTEK' -Force
        Start-Sleep -Seconds 2
    }

    # ─── 3. Descargar y extraer el ultimo release ──────────────────────────────
    Write-Step 'Obteniendo el ultimo release desde GitHub...'
    $releaseApi = "https://api.github.com/repos/$Repo/releases/latest"
    $release    = Invoke-RestMethod -Uri $releaseApi -Headers $ghHeaders
    $asset      = $release.assets | Where-Object { $_.name -eq 'Vantek-release.zip' } | Select-Object -First 1
    if (-not $asset) {
        throw "El release '$($release.tag_name)' no contiene el asset Vantek-release.zip."
    }
    Write-Info "Release: $($release.tag_name)"

    $zipPath = Join-Path $tmp 'Vantek-release.zip'
    Write-Info 'Descargando Vantek-release.zip...'
    Invoke-WebRequest -Uri $asset.browser_download_url -Headers $ghHeaders -OutFile $zipPath

    Write-Info "Extrayendo en $InstallDir ..."
    Expand-Archive -LiteralPath $zipPath -DestinationPath $InstallDir -Force

    # ─── 4. Node.js portable ───────────────────────────────────────────────────
    $nodeDir = Join-Path $InstallDir 'node'
    $nodeExe = Join-Path $nodeDir 'node.exe'
    if ((Test-Path $nodeExe) -and -not $Force) {
        Write-Step "Node.js portable ya presente en $nodeDir (omitido)."
    } else {
        Write-Step "Descargando Node.js v$NodeVersion portable..."
        $nodeName = "node-v$NodeVersion-win-x64"
        $nodeUrl  = "https://nodejs.org/dist/v$NodeVersion/$nodeName.zip"
        $nodeZip  = Join-Path $tmp "$nodeName.zip"
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeZip

        Write-Info 'Extrayendo Node.js...'
        Expand-Archive -LiteralPath $nodeZip -DestinationPath $tmp -Force

        New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
        # El zip contiene una carpeta node-vX.Y.Z-win-x64 con node.exe en su raiz.
        robocopy (Join-Path $tmp $nodeName) $nodeDir /E /NFL /NDL /NJH /NJS /NP | Out-Null
        if ($LASTEXITCODE -ge 8) { throw "No se pudo copiar Node.js (robocopy $LASTEXITCODE)." }
        $global:LASTEXITCODE = 0

        if (-not (Test-Path $nodeExe)) { throw "Node.js no quedo instalado correctamente en $nodeExe." }
        Write-Info "Node.js instalado en $nodeDir"
    }

    # ─── 5. NSSM ────────────────────────────────────────────────────────────────
    $toolsDir = Join-Path $InstallDir 'tools'
    $nssmExe  = Join-Path $toolsDir 'nssm.exe'
    if ((Test-Path $nssmExe) -and -not $Force) {
        Write-Step "NSSM ya presente en $nssmExe (omitido)."
    } else {
        Write-Step "Descargando NSSM v$NssmVersion..."
        $nssmUrl = "https://nssm.cc/release/nssm-$NssmVersion.zip"
        $nssmZip = Join-Path $tmp "nssm-$NssmVersion.zip"
        Invoke-WebRequest -Uri $nssmUrl -OutFile $nssmZip

        Write-Info 'Extrayendo NSSM...'
        Expand-Archive -LiteralPath $nssmZip -DestinationPath $tmp -Force

        New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
        $nssmSrc = Join-Path $tmp "nssm-$NssmVersion\win64\nssm.exe"
        if (-not (Test-Path $nssmSrc)) { throw "No se encontro nssm.exe (win64) en el paquete descargado." }
        Copy-Item $nssmSrc $nssmExe -Force
        Write-Info "NSSM instalado en $nssmExe"
    }

    # ─── 6. Registrar el servicio de Windows ───────────────────────────────────
    Write-Step 'Registrando el servicio de Windows VANTEK...'
    $installBat = Join-Path $InstallDir 'launcher\install-service.bat'
    if (-not (Test-Path $installBat)) {
        throw "No se encontro $installBat. El release puede estar incompleto."
    }

    if ($svc) {
        Write-Info 'El servicio VANTEK ya existe; se omite install-service.bat.'
        Write-Info 'Para reinstalarlo de cero, ejecuta primero launcher\uninstall-service.bat.'
        Start-Service -Name 'VANTEK'
    } else {
        & cmd.exe /c "`"$installBat`""
    }

    Write-Host "`n=================================================="  -ForegroundColor Green
    Write-Host '   Instalacion completada.'                            -ForegroundColor Green
    Write-Host '=================================================='    -ForegroundColor Green
    Write-Info 'El servicio VANTEK queda arrancado y se iniciara automaticamente con Windows.'
    Write-Info 'Abre la aplicacion en: http://localhost'
    Write-Info 'La primera vez, la propia aplicacion mostrara el asistente de configuracion.'
}
finally {
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}
