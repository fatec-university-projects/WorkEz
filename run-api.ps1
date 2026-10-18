# 🌐 Script para Iniciar Apenas a API Backend WorkEz
Write-Host "Iniciando API Backend em http://localhost:5065/swagger ..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\WorkEzApi"
$env:ASPNETCORE_URLS = "http://0.0.0.0:5065"
dotnet run --project WorkEz.WebUID/WorkEz.WebUID.csproj --urls "http://0.0.0.0:5065"
