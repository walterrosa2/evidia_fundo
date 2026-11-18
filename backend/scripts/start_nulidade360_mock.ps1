<#
.SYNOPSIS
  Sobe o Nulidade360 em MODO SIMULADO, isolado, para exercitar o adaptador da Evidia sem custo.

.DESCRIPTION
  - MOCK_AI=true: o motor responde com dados de teste e nao chama o provedor de IA para
    arquivos de texto (.txt/.md).
  - A chave de IA do processo e propositalmente invalida: mesmo que algo tente chamar o
    provedor, nao ha cobranca.
  - O motor grava banco, uploads e logs relativos a pasta de trabalho. Aqui a pasta de
    trabalho e backend\data\nulidade360_sandbox (ignorada pelo Git), entao o banco e os dados
    do projeto do Nulidade360 NAO sao tocados. O codigo dele e apenas lido.

.PARAMETER Nulidade360Home
  Pasta do projeto do Nulidade360 (a que contem src\main.py e venv\).
.PARAMETER Port
  Porta do servico (padrao do Nulidade360: 8530).
#>
param(
    [Parameter(Mandatory = $true)][string]$Nulidade360Home,
    [int]$Port = 8530
)

$ErrorActionPreference = "Stop"
$python = Join-Path $Nulidade360Home "venv\Scripts\python.exe"
if (-not (Test-Path (Join-Path $Nulidade360Home "src\main.py"))) {
    throw "Nao encontrei src\main.py em '$Nulidade360Home'."
}
if (-not (Test-Path $python)) {
    throw "Nao encontrei o ambiente virtual do Nulidade360 em '$python'."
}
if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
    throw "A porta $Port ja esta em uso. Encerre o processo que a ocupa e tente novamente."
}

$sandbox = Join-Path (Split-Path $PSScriptRoot -Parent) "data\nulidade360_sandbox"
New-Item -ItemType Directory -Force $sandbox | Out-Null
Set-Location $sandbox

$env:PYTHONPATH = $Nulidade360Home
$env:MOCK_AI = "true"
$env:GEMINI_API_KEY = "chave-invalida-modo-simulado"
$env:GEMINI_MODEL = "mock-sem-provedor"

Write-Host "Nulidade360 em MODO SIMULADO em http://127.0.0.1:$Port (dados em $sandbox)"
Write-Host "Na Evidia: EVIDIA_NULIDADE360_MODE=mock e EVIDIA_NULIDADE360_BASE_URL=http://127.0.0.1:$Port"
& $python -m uvicorn src.main:app --host 127.0.0.1 --port $Port
