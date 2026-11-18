<#
.SYNOPSIS
  Encerra os servicos locais da Evidia (API, frontend) e, se pedido, o Nulidade360 simulado.

.DESCRIPTION
  O `uvicorn --reload` cria um processo filho que herda a porta. Encerrar so o pai deixa o
  filho vivo segurando a porta 8007, e o proximo `_start.ps1` recusa subir. Este script
  encerra a arvore inteira dos processos deste projeto e confirma, por conexao real, que
  as portas ficaram livres (inclusive em IPv6, onde o Vite escuta).

  So toca processos cuja linha de comando contem a pasta deste projeto e, para o
  Nulidade360, o servico iniciado na porta 8530.
#>
param(
    [int[]]$Ports = @(8007, 5180),
    [switch]$IncludeNulidade360
)

# backend\scripts -> backend -> raiz do projeto
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$pattern = [regex]::Escape((Split-Path $projectRoot -Leaf))
if ($IncludeNulidade360) { $Ports += 8530 }

function Test-PortOpen([int]$port) {
    foreach ($address in "127.0.0.1", "::1") {
        $client = New-Object System.Net.Sockets.TcpClient([System.Net.IPAddress]::Parse($address).AddressFamily)
        try {
            $task = $client.ConnectAsync($address, $port)
            if ($task.Wait(600) -and $client.Connected) { return $true }
        } catch { } finally { $client.Dispose() }
    }
    return $false
}

function Stop-Tree([int]$id) {
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.ParentProcessId -eq $id } |
        ForEach-Object { Stop-Tree $_.ProcessId }
    Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
}

function Get-ProjectProcesses {
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        ($_.Name -match '^python' -and $_.CommandLine -match $pattern -and $_.CommandLine -match 'uvicorn\s+evidia') -or
        ($_.Name -match '^node' -and $_.CommandLine -match $pattern -and $_.CommandLine -match 'vite') -or
        ($IncludeNulidade360 -and $_.Name -match '^python' -and $_.CommandLine -match 'src\.main:app' -and $_.CommandLine -match '--port 8530')
    }
}

# O sistema pode levar alguns segundos para liberar a porta depois que o processo morre.
$deadline = (Get-Date).AddSeconds(30)
do {
    foreach ($process in @(Get-ProjectProcesses)) { Stop-Tree $process.ProcessId }
    # Filho do recarregador que ficou orfao: o pai (parent_pid) ja nao existe.
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match 'multiprocessing-fork' -and $_.CommandLine -match 'parent_pid=(\d+)' } |
        ForEach-Object {
            $parent = [int]([regex]::Match($_.CommandLine, 'parent_pid=(\d+)').Groups[1].Value)
            $owned = @(Get-NetTCPConnection -OwningProcess $_.ProcessId -State Listen -ErrorAction SilentlyContinue |
                Where-Object { $Ports -contains $_.LocalPort })
            if ($owned.Count -gt 0 -and -not (Get-Process -Id $parent -ErrorAction SilentlyContinue)) {
                Stop-Tree $_.ProcessId
            }
        }
    Start-Sleep -Seconds 2
    $busy = @($Ports | Where-Object { Test-PortOpen $_ })
} while ($busy.Count -gt 0 -and (Get-Date) -lt $deadline)

foreach ($port in $Ports) {
    Write-Host ("porta {0} respondendo: {1}" -f $port, ($busy -contains $port))
}
if ($busy.Count -gt 0) { exit 1 }
