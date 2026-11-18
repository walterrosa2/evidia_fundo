<#
.SYNOPSIS
  Inicia a Evidia local: API operacional (FastAPI) e frontend (TanStack Start/Vite).

.PARAMETER NoBrowser
  Nao abre o navegador ao final (execucao silenciosa).
.PARAMETER FrontendOnly
  Sobe apenas o frontend (suficiente para a demonstracao; as telas de Operacao
  mostrarao erro de API indisponivel, sem cair para dados demonstrativos).
.PARAMETER BackendOnly
  Sobe apenas a API operacional.
#>
param(
    [switch]$NoBrowser,
    [switch]$FrontendOnly,
    [switch]$BackendOnly
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$FrontendPort = 5180   # alocada pelo Painel de Solucoes

function Read-DotEnv([string]$path) {
    $values = @{}
    if (Test-Path $path) {
        foreach ($line in Get-Content $path) {
            if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
                $values[$Matches[1]] = $Matches[2].Trim().Trim('"')
            }
        }
    }
    return $values
}

function Test-PortInUse([int]$port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $client.Connect("127.0.0.1", $port)
        return $true
    } catch { return $false } finally { $client.Dispose() }
}

function Assert-PortFree([int]$port, [string]$what) {
    # Sem esta checagem, o healthcheck de um processo antigo passaria por este.
    if (Test-PortInUse $port) {
        throw "A porta $port ($what) ja esta em uso. Encerre o processo que a ocupa e tente novamente."
    }
}

function Wait-Http([string]$url, [int]$seconds = 90) {
    $deadline = (Get-Date).AddSeconds($seconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
            if ($resp.StatusCode -eq 200) { return $true }
        } catch { Start-Sleep -Milliseconds 700 }
    }
    return $false
}

# ---------------------------------------------------------------- API operacional
$apiPort = 8007
if (-not $FrontendOnly) {
    $envFile = Join-Path $backend ".env"
    if (-not (Test-Path $envFile)) {
        Copy-Item (Join-Path $backend ".env.example") $envFile
        Write-Warning "backend\.env criado a partir do exemplo. Defina EVIDIA_ADMIN_PASSWORD para criar o usuario inicial."
    }
    $cfg = Read-DotEnv $envFile
    if ($cfg["EVIDIA_API_PORT"]) { $apiPort = [int]$cfg["EVIDIA_API_PORT"] }
    $apiHost = if ($cfg["EVIDIA_API_HOST"]) { $cfg["EVIDIA_API_HOST"] } else { "127.0.0.1" }
    Assert-PortFree $apiPort "API operacional"

    $python = Join-Path $backend ".venv\Scripts\python.exe"
    if (-not (Test-Path $python)) {
        Write-Host "Criando ambiente virtual do backend..."
        & py -3 -m venv (Join-Path $backend ".venv")
    }
    $stamp = Join-Path $backend ".venv\.deps-installed"
    $requirements = Join-Path $backend "requirements-dev.txt"
    if (-not (Test-Path $stamp) -or (Get-Item $requirements).LastWriteTime -gt (Get-Item $stamp).LastWriteTime) {
        Write-Host "Instalando dependencias do backend..."
        & $python -m pip install --quiet --upgrade pip
        & $python -m pip install --quiet -r $requirements
        Set-Content -Path $stamp -Value (Get-Date -Format o)
    }

    Push-Location $backend
    try {
        $env:PYTHONPATH = "."
        Write-Host "Aplicando migracoes do banco..."
        & $python -m alembic upgrade head
        if ($LASTEXITCODE -ne 0) { throw "Falha ao aplicar migracoes." }
    } finally { Pop-Location }

    $apiArgs = @("-m", "uvicorn", "evidia.main:app_factory", "--factory",
                 "--host", $apiHost, "--port", "$apiPort", "--reload", "--reload-dir", "evidia")
    if ($BackendOnly) {
        if (-not $NoBrowser) {
            Start-Job -ArgumentList $apiPort -ScriptBlock {
                param($port)
                for ($i = 0; $i -lt 120; $i++) {
                    try {
                        if ((Invoke-WebRequest "http://localhost:$port/health" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200) {
                            Start-Process "http://localhost:$port/docs"; break
                        }
                    } catch { Start-Sleep -Milliseconds 700 }
                }
            } | Out-Null
        }
        Push-Location $backend
        try { $env:PYTHONPATH = "."; & $python @apiArgs } finally { Pop-Location }
        exit $LASTEXITCODE
    }

    Write-Host "Iniciando API operacional em http://localhost:$apiPort ..."
    $env:PYTHONPATH = "."
    $apiProcess = Start-Process -FilePath $python -ArgumentList $apiArgs -WorkingDirectory $backend -PassThru -WindowStyle Minimized
    if (-not (Wait-Http "http://localhost:$apiPort/health")) {
        Write-Warning "A API nao respondeu ao healthcheck. Verifique backend\logs\app.log."
    } else {
        Write-Host "API pronta (healthcheck 200)."
    }
}

# ----------------------------------------------------------------------- frontend
Set-Location $root
Assert-PortFree $FrontendPort "frontend"
if (-not (Test-Path (Join-Path $root "node_modules"))) {
    Write-Host "Instalando dependencias do frontend..."
    npm install
}
if (-not (Test-Path (Join-Path $root ".env"))) {
    Set-Content -Path (Join-Path $root ".env") -Value "VITE_EVIDIA_API_URL=http://localhost:$apiPort" -Encoding utf8
    Write-Host ".env do frontend criado apontando para a API local."
}

if (-not $NoBrowser) {
    # Abre o navegador somente depois de o frontend responder 200.
    $target = if ($FrontendOnly) { "/pipeline" } else { "/operacao" }
    Start-Job -ArgumentList $FrontendPort, $target -ScriptBlock {
        param($port, $path)
        for ($i = 0; $i -lt 170; $i++) {
            try {
                if ((Invoke-WebRequest "http://localhost:$port$path" -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200) {
                    Start-Process "http://localhost:$port$path"; break
                }
            } catch { Start-Sleep -Milliseconds 700 }
        }
    } | Out-Null
}

Write-Host "Iniciando frontend em http://localhost:$FrontendPort ..."
try {
    npm run dev -- --port $FrontendPort --strictPort
} finally {
    if ($apiProcess -and -not $apiProcess.HasExited) {
        Write-Host "Encerrando API operacional..."
        # O --reload cria um processo filho; encerra a arvore inteira.
        & taskkill /PID $apiProcess.Id /T /F | Out-Null
    }
}
