<#
.SYNOPSIS
  Sobe o Nulidade360 em MODO REAL, isolado. CADA ANALISE CONSOME API PAGA.

.DESCRIPTION
  Use somente com autorizacao de custo do responsavel.
  - A chave do provedor vem da variavel de ambiente NULIDADE360_GEMINI_API_KEY do terminal:
    nao e parametro, nao e gravada em arquivo e nao e exibida.
  - O motor grava banco, uploads e logs relativos a pasta de trabalho. Aqui a pasta de
    trabalho e backend\data\nulidade360_live (ignorada pelo Git), separada da pasta do modo
    simulado e da pasta do projeto do Nulidade360, cujo codigo e apenas lido.

.PARAMETER Nulidade360Home
  Pasta do projeto do Nulidade360 (a que contem src\main.py e venv\).
.PARAMETER Port
  Porta do servico (padrao do Nulidade360: 8530).
.PARAMETER Model
  Modelo do provedor. Padrao: o do proprio motor.
#>
param(
    [Parameter(Mandatory = $true)][string]$Nulidade360Home,
    [int]$Port = 8530,
    [string]$Model = ""
)

$ErrorActionPreference = "Stop"
$python = Join-Path $Nulidade360Home "venv\Scripts\python.exe"
if (-not (Test-Path (Join-Path $Nulidade360Home "src\main.py"))) {
    throw "Nao encontrei src\main.py em '$Nulidade360Home'."
}
if (-not (Test-Path $python)) {
    throw "Nao encontrei o ambiente virtual do Nulidade360 em '$python'."
}
if (-not $env:NULIDADE360_GEMINI_API_KEY) {
    throw "Defina NULIDADE360_GEMINI_API_KEY no terminal antes de subir o modo real."
}
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    throw "A porta $Port ja esta em uso. Encerre o processo que a ocupa e tente novamente."
}

$sandbox = Join-Path (Split-Path $PSScriptRoot -Parent) "data\nulidade360_live"
New-Item -ItemType Directory -Force $sandbox | Out-Null
Set-Location $sandbox

$env:PYTHONPATH = $Nulidade360Home
$env:MOCK_AI = "false"
$env:GEMINI_API_KEY = $env:NULIDADE360_GEMINI_API_KEY
if ($Model) { $env:GEMINI_MODEL = $Model }

Write-Host "Nulidade360 em MODO REAL em http://127.0.0.1:$Port (dados em $sandbox)"
Write-Host "ATENCAO: cada analise consome API paga."
Write-Host "Na Evidia: EVIDIA_NULIDADE360_MODE=live e EVIDIA_NULIDADE360_BASE_URL=http://127.0.0.1:$Port"
& $python -m uvicorn src.main:app --host 127.0.0.1 --port $Port
