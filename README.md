# 🚀 WorkEz — Plataforma Multifuncional de Serviços

Bem-vindo ao **WorkEz**! Este repositório contém a solução completa para o ecossistema WorkEz, composto por uma API de microserviços em .NET (Clean Architecture) e um aplicativo móvel cross-platform construído em React Native com Expo.

---

## 📂 Estrutura do Repositório

O projeto é dividido nos seguintes diretórios principais:

*   **[`WorkEzApi`](file:///d:/Dev/WorkEz/WorkEzApi)**: Backend construído em **.NET 10** com **Clean Architecture + DDD** (Domain, Application, Infra.Data, Infra.Ioc, WebUID).
*   **[`WorkEzApp`](file:///d:/Dev/WorkEz/WorkEzApp)**: Frontend mobile (Android & iOS) desenvolvido com **React Native**, **Expo (v54)**, **TypeScript** e estilizado com **NativeWind (TailwindCSS)**.

---

## 🚀 Como Rodar Diretamente da Pasta Raiz `WorkEz`

### 1. Pelo VS Code (F5)
Basta abrir a pasta `WorkEz` no VS Code e pressionar **F5** (ou acesse a aba *Run and Debug* `Ctrl+Shift+D`):
* 🚀 **Executar API + App Mobile (Juntos)** ➔ Inicia a API .NET no port 5065 e o servidor do Expo simultaneamente!
* 🌐 **Executar API Backend (WorkEzApi)** ➔ Inicia apenas o backend C# com Swagger em `http://localhost:5065/swagger`.
* 📱 **Executar App Mobile (WorkEzApp Expo)** ➔ Inicia apenas o servidor do Expo.

### 2. Por Scripts de Atalho Rápido (PowerShell)
Execute diretamente na raiz da pasta `WorkEz`:

```powershell
.\run-all.ps1   # Inicia a API e o App Mobile simultaneamente em janelas separadas
.\run-api.ps1   # Inicia apenas a API Backend C# (.NET 10)
.\run-app.ps1   # Inicia apenas o App Mobile (Expo)
```

---

## 🛠️ Estrutura da API Clean Architecture (`WorkEzApi`)

```text
WorkEzApi/
├── CleanArquiteture.slnx (Solução .NET 10)
├── CleanArquiteture.Domain (Entidades, Interfaces, Domain Services)
├── CleanArquiteture.Application (DTOs, Use Cases, Application Services)
├── CleanArquiteture.Infra.Data (EF Core AppDbContext, Repositórios, Message Broker)
├── CleanArquiteture.Infra.Ioc (Contêiner IoC de Injeção de Dependências)
└── CleanArquiteture.WebUID (Controllers REST API / MVC, Swagger, Testes de Unidade)
```

### Documentação Swagger
Com a API rodando, acesse a documentação interativa pelo navegador:
👉 **`http://localhost:5065/swagger`**
