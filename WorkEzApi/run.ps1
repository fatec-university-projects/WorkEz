# 🚀 Script de Execução Direta do WorkEzApi (.NET 10 Clean Architecture)
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  Iniciando Compilação e Execução do WorkEzApi...     " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot

Write-Host "1. Compilando a solução WorkEz.slnx..." -ForegroundColor Yellow
dotnet build WorkEz.slnx

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Falha na compilação da solução!" -ForegroundColor Red
    exit 1
}

Write-Host "2. Executando os testes de unidade..." -ForegroundColor Yellow
dotnet test WorkEz.slnx --no-build

Write-Host "3. Subindo a API WebUID em http://localhost:5065/swagger ..." -ForegroundColor Green
dotnet run --project WorkEz.WebUID/WorkEz.WebUID.csproj
