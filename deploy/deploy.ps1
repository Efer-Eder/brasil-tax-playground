<#
.SYNOPSIS
  Publica o Brasil Tax Playground (app + motor oficial) em efer.online.

.DESCRIPTION
  1. Gera o build standalone do Next.js com basePath /projeto/brasil-tax-playground.
  2. Junta app, JAR e banco do motor (gerados pelos passos do README oficial),
     Compose e Nginx num pacote.
  3. Envia por scp, executa deploy/remoto.sh na VPS e confere o resultado.

  Ver docs/deploy-efer-online.md.

.PARAMETER EngineDir
  Clone do calculadora-rtc-regime-regular onde já rodaram
  `mvnw.cmd flyway:migrate ...` e `mvnw.cmd clean package`.

.PARAMETER Nginx
  Também instala/atualiza a configuração do Nginx (com backup e nginx -t).

.EXAMPLE
  .\deploy\deploy.ps1 -Vps root@<ip-da-vps> -Key $env:USERPROFILE\.ssh\<chave> -EngineDir C:\src\calculadora-rtc-regime-regular -Nginx
#>
param(
  [Parameter(Mandatory = $true)] [string] $EngineDir,
  # Destino SSH, ex.: root@<ip-da-vps>. Sem valor padrão de propósito.
  [Parameter(Mandatory = $true)] [string] $Vps,
  [Parameter(Mandatory = $true)] [string] $Key,
  [string] $KnownHosts = "$env:USERPROFILE\.ssh\known_hosts",
  [switch] $Nginx
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$jar = Join-Path $EngineDir "target\api-regime-geral.jar"
$db = Join-Path $EngineDir "calculadora\db\calculadora-pro.db"
foreach ($f in @($jar, $db)) { if (-not (Test-Path $f)) { throw "Arquivo do motor não encontrado: $f" } }

$ssh = @("-i", $Key, "-o", "IdentitiesOnly=yes", "-o", "UserKnownHostsFile=$KnownHosts", "-o", "StrictHostKeyChecking=yes")

# No PowerShell 5.1, stderr de comando nativo vira erro fatal com "Stop".
# Para comandos nativos, vale o exit code.
function Invoke-Native([scriptblock] $Bloco, [string] $Erro) {
  $anterior = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try { & $Bloco 2>&1 | ForEach-Object { "$_" } } finally { $ErrorActionPreference = $anterior }
  if ($LASTEXITCODE -ne 0) { throw "$Erro (exit $LASTEXITCODE)" }
}

Write-Host "== build standalone"
Push-Location $root
try {
  $env:NEXT_BASE_PATH = "/projeto/brasil-tax-playground"
  Invoke-Native { npm run build } "build falhou"
} finally {
  Remove-Item Env:\NEXT_BASE_PATH -ErrorAction SilentlyContinue
  Pop-Location
}

Write-Host "== montando pacote"
$stage = Join-Path ([IO.Path]::GetTempPath()) ("btp-deploy-" + [guid]::NewGuid())
New-Item -ItemType Directory -Force "$stage\app", "$stage\engine", "$stage\nginx" | Out-Null
Copy-Item "$root\deploy\docker-compose.yml" $stage
Copy-Item "$root\deploy\app\Dockerfile" "$stage\app\"
Copy-Item "$root\deploy\engine\Dockerfile" "$stage\engine\"
Copy-Item "$root\deploy\nginx\*.conf" "$stage\nginx\"
Copy-Item "$root\.next\standalone" "$stage\app\standalone" -Recurse
Copy-Item "$root\.next\static" "$stage\app\standalone\.next\static" -Recurse
if (Test-Path "$root\public") { Copy-Item "$root\public" "$stage\app\standalone\public" -Recurse }
# Binário nativo do Windows não serve no Linux e não é usado (images.unoptimized).
Remove-Item "$stage\app\standalone\node_modules\@img\sharp-win32-x64" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item $jar "$stage\engine\api-regime-geral.jar"
Copy-Item $db "$stage\engine\calculadora-pro.db"

$pacote = Join-Path ([IO.Path]::GetTempPath()) "brasil-tax-playground.tgz"
Invoke-Native { tar -czf $pacote -C $stage . } "tar falhou"

Write-Host "== enviando"
Invoke-Native { scp @ssh $pacote "$root\deploy\remoto.sh" "${Vps}:/tmp/" } "scp falhou"

Write-Host "== executando na VPS"
$flag = if ($Nginx) { "1" } else { "0" }
Invoke-Native { ssh @ssh $Vps "bash /tmp/remoto.sh /tmp/brasil-tax-playground.tgz $flag; s=`$?; rm -f /tmp/remoto.sh; exit `$s" } "deploy remoto falhou"

Remove-Item $stage -Recurse -Force
Remove-Item $pacote -Force
Write-Host "== publicado: https://efer.online/projeto/brasil-tax-playground/"
