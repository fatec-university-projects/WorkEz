# 🚀 Script de Inicialização Completa da Plataforma WorkEz (API + Mobile App)
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Iniciando Plataforma WorkEz (API + Mobile App)...   " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

$rootDir = $PSScriptRoot

Write-Host "1. Iniciando API Backend (.NET 10 Clean Architecture)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\WorkEzApi'; dotnet run --project WorkEz.WebUID/WorkEz.WebUID.csproj"

Write-Host "2. Iniciando App Mobile (React Native / Expo)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\WorkEzApp'; npx expo start"

Write-Host "=======================================================" -ForegroundColor Green
Write-Host "  ✔ API Backend rodando em: http://localhost:5065/swagger" -ForegroundColor Green
Write-Host "  ✔ App Mobile (Expo) inicializado com sucesso!" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
