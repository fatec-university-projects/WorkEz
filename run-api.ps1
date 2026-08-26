# 🌐 Script para Iniciar Apenas a API Backend WorkEz
Write-Host "Iniciando API Backend em http://localhost:5065/swagger ..." -ForegroundColor Cyan
Set-Location "$PSScriptRoot\WorkEzApi"
dotnet run --project WorkEz.WebUID/WorkEz.WebUID.csproj
