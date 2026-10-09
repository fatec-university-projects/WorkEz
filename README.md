# 🚀 WorkEz — Plataforma Multifuncional de Serviços

<p align="center">
  <img src="https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt=".NET 10" />
  <img src="https://img.shields.io/badge/C%23-12.0-239120?style=for-the-badge&logo=csharp&logoColor=white" alt="C#" />
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-54.0-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon_DB-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/TailwindCSS-NativeWind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="NativeWind" />
  <img src="https://img.shields.io/badge/Docker-Supported-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Render-Deploy-46E3B7?style=for-the-badge&logo=render&logoColor=black" alt="Render" />
</p>

---

## 📖 Sumário

- [Visão Geral do Projeto](#-visão-geral-do-projeto)
- [Principais Funcionalidades](#-principais-funcionalidades)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
  - [Backend (.NET 10 — Clean Architecture + DDD)](#backend-net-10--clean-architecture--ddd)
  - [Frontend Mobile (React Native + Expo)](#frontend-mobile-react-native--expo)
- [Ciclo de Vida do Chamado (State Machine)](#-ciclo-de-vida-do-chamado-state-machine)
- [Comunicação em Tempo Real (WebSockets)](#-comunicação-em-tempo-real-websockets)
- [Integração de Pagamentos (AbacatePay PIX)](#-integração-de-pagamentos-abacatepay-pix)
- [Estrutura do Repositório](#-estrutura-do-repositório)
- [Catálogo de Endpoints (API REST)](#-catálogo-de-endpoints-api-rest)
- [Mapeamento de Rotas do App Mobile](#-mapeamento-de-rotas-do-app-mobile)
- [Pré-requisitos](#-pré-requisitos)
- [Como Rodar o Projeto](#-como-rodar-o-projeto)
  - [Opção 1: VS Code (F5 — Depuração Unificada)](#opção-1-vs-code-f5--depuração-unificada)
  - [Opção 2: Scripts Rápidos PowerShell](#opção-2-scripts-rápidos-powershell)
  - [Opção 3: Manualmente pelo Terminal](#opção-3-manualmente-pelo-terminal)
- [Configuração de Variáveis de Ambiente](#-configuração-de-variáveis-de-ambiente)
- [Deploy e Infraestrutura](#-deploy-e-infraestrutura)
- [Licença e Autoria](#-licença-e-autoria)

---

## 🎯 Visão Geral do Projeto

O **WorkEz** é uma plataforma completa para intermediação e contratação de serviços residenciais e profissionais (encanadores, eletricistas, diaristas, técnicos, montadores, entre outros). A aplicação une **Clientes** que necessitam de auxílio prático a **Prestadores de Serviço** qualificados e avaliados, garantindo segurança, transparência e controle de ponta a ponta:

1. **Agilidade no Atendimento**: Mecanismo de abertura de chamado em poucos passos ("Chamar Agora"), com fotos e geolocalização.
2. **Rastreabilidade em Tempo Real**: WebSocket nativo para acompanhamento do deslocamento do prestador no mapa.
3. **Chat Integrado**: Canal de comunicação bidirecional direto entre cliente e prestador por chamado/proposta.
4. **Pagamento Seguro com PIX**: Integração com gateway AbacatePay, cálculo automatizado de comissão da plataforma (15%) e carteira financeira para o prestador.
5. **Avaliações e Confiabilidade**: Sistema de reputação pós-atendimento com estrelas e comentários.

---

## ✨ Principais Funcionalidades

### 👤 Para o Cliente (Customer)
- **Autenticação Segura**: Criação de conta, login com JWT, persistência com auto-refresh token.
- **Catálogo de Categorias**: Busca de serviços por segmento profissional.
- **Abertura de Chamados ("Chamar Agora")**: Descrição detalhada do problema, upload de imagens via ImgBB e preenchimento de endereço com busca automática por CEP (ViaCEP).
- **Acompanhamento ao Vivo (Tracking)**: Notificação de status (Pendente → Aceito → A Caminho → Em Execução → Concluído) e mapa em tempo real.
- **Chat em Tempo Real**: Troca de mensagens instantâneas com o profissional.
- **Checkout com PIX**: Geração de QR Code e código Copia-e-Cola direto no app, com sincronização automática do status.
- **Histórico e Avaliações**: Histórico completo de chamados e avaliação detalhada do prestador.

### 🛠️ Para o Prestador de Serviços (ServiceProvider)
- **Onboarding Profissional**: Cadastro, seleção de categorias de atuação, biografia e portfólio de serviços realizados.
- **Mural de Oportunidades**: Visualização de chamados abertos compatíveis com suas categorias e região.
- **Aceite de Chamados**: Aceite instantâneo ou negociação via contra-proposta.
- **Controle de Execução**: Atualização das etapas de atendimento (*Iniciar Deslocamento* ➔ *Iniciar Serviço* ➔ *Concluir com Valor Final*).
- **Carteira Digital (Wallet)**: Extrato de ganhos líquidos, retenção automática da taxa de serviço (15%) e saldo disponível.
- **Gestão de Perfil**: Edição de dados, fotos de portfólio e histórico de notas recebidas.

---

## 🏛️ Arquitetura do Sistema

```mermaid
graph TB
    subgraph Frontend["Frontend Mobile (WorkEzApp)"]
        UI["React Native (Expo 54)<br/>Expo Router + NativeWind"]
        AuthCtx["AuthContext (AsyncStorage)"]
        WSClient["WebSocket Client<br/>(Tracking & Chat)"]
    end

    subgraph ExternalServices["Serviços Externos"]
        ImgBB["ImgBB API<br/>(Hospedagem de Imagens)"]
        ViaCEP["ViaCEP API<br/>(Lookup de Endereços)"]
        Abacate["AbacatePay Gateway<br/>(Cobrança PIX / Webhooks)"]
    end

    subgraph Backend["Backend API (.NET 10 - WorkEzApi)"]
        WebUID["WorkEz.WebUID<br/>(REST Controllers & WebSockets)"]
        Ioc["WorkEz.Infra.Ioc<br/>(Dependency Injection)"]
        App["WorkEz.Application<br/>(Services & DTOs)"]
        Domain["WorkEz.Domain<br/>(Entities, Enums & Interfaces)"]
        Data["WorkEz.Infra.Data<br/>(AppDbContext, Repositories)"]
    end

    subgraph Database["Camada de Dados"]
        Postgres[("PostgreSQL (Neon DB) / In-Memory Db")]
    end

    UI -->|REST HTTPS + JWT Bearer| WebUID
    WSClient <-->|WebSockets (ws/tracking & ws/chat)| WebUID
    UI -->|Upload Direto| ImgBB
    UI -->|Busca de CEP| ViaCEP

    WebUID --> App
    WebUID --> Ioc
    App --> Domain
    App --> Data
    Data --> Postgres
    WebUID -->|PIX Billing| Abacate
    Abacate -->|Webhook de Confirmação| WebUID
```

### Backend (.NET 10 — Clean Architecture + DDD)

A API do backend foi estruturada seguindo rigorosamente os princípios de **Clean Architecture** e **Domain-Driven Design (DDD)**, dividida em projetos desacoplados dentro da solução [`WorkEz.slnx`](file:///d:/Projetos/WorkEz/WorkEzApi/WorkEz.slnx):

- **[`WorkEz.Domain`](file:///d:/Projetos/WorkEz/WorkEzApi/WorkEz.Domain)**: Núcleo do negócio. Contém as entidades centrais (`User`, `Customer`, `ServiceProvider`, `Service`, `Proposal`, `Appointment`, `ChatMessage`, `Category`, `Address`), enums de status e contratos de interfaces de repositórios e serviços de domínio. Livre de dependências externas de infraestrutura.
- **[`WorkEz.Application`](file:///d:/Projetos/WorkEz/WorkEzApi/WorkEz.Application)**: Camada de orquestração e casos de uso. Contém DTOs, regras de negócio aplicadas, serviços de aplicação (`ServiceOpportunityApplicationService`, `ProposalApplicationService`, `ChatApplicationService`, `PortfolioApplicationService`).
- **[`WorkEz.Infra.Data`](file:///d:/Projetos/WorkEz/WorkEzApi/WorkEz.Infra.Data)**: Implementação de acesso a dados. `AppDbContext` baseado em Entity Framework Core 10 com suporte nativo a **PostgreSQL (Npgsql)** e fallback transparente para banco de dados **In-Memory** para desenvolvimento/testes rápidos, além da camada de repositórios e message brokers.
- **[`WorkEz.Infra.Ioc`](file:///d:/Projetos/WorkEz/WorkEzApi/WorkEz.Infra.Ioc)**: Contêiner de inversão de controle (IoC). Centraliza o registro de dependências, resolução de repositórios e configuração condicional do banco de dados.
- **[`WorkEz.WebUID`](file:///d:/Projetos/WorkEz/WorkEzApi/WorkEz.WebUID)**: Ponto de entrada web. ASP.NET Core Web API, controllers REST, autenticação JWT Bearer com refresh tokens, gerenciadores de WebSockets (`TrackingWebSocketManager`, `ChatWebSocketManager`), middlewares de CORS e Swagger UI.

### Frontend Mobile (React Native + Expo)

O aplicativo móvel foi construído em **React Native 0.81** com **Expo 54** utilizando:
- **Expo Router (v6)**: Roteamento baseado no sistema de arquivos com layouts aninhados e Route Guards por perfil (`/client` e `/provider`).
- **NativeWind (v4) / TailwindCSS**: Estilização declarativa com sistema de tokens coerente e responsivo.
- **Context API & Hooks Personalizados**: `AuthContext` com gerenciamento de sessão, token JWT e refresh token silencioso em chamadas com erro `401`.
- **Lucide Icons**: Conjunto consistente e moderno de ícones de interface.

---

## 🔄 Ciclo de Vida do Chamado (State Machine)

O atendimento de um serviço transita por uma máquina de estados bem definida:

```
[ Cliente ] Cria Chamado
     │
     ▼
┌──────────────┐
│     Open     │ ──> Disponível no mural de oportunidades dos prestadores
└──────────────┘
     │
     │ [ Prestador ] Aceita o chamado
     ▼
┌──────────────┐
│   Accepted   │ ──> Proposta e Agendamento (Appointment) confirmados
└──────────────┘
     │
     │ [ Prestador ] Inicia trajeto
     ▼
┌──────────────┐
│   OnTheWay   │ ──> Rastreamento ao vivo ativado via WebSocket (/ws/tracking)
└──────────────┘
     │
     │ [ Prestador ] Chega ao local e começa o trabalho
     ▼
┌──────────────┐
│  InProgress  │ ──> Execução da manutenção/serviço no local
└──────────────┘
     │
     │ [ Prestador ] Finaliza serviço e informa o valor final (R$)
     ▼
┌────────────────┐
│ WaitingPayment │ ──> Cobrança PIX gerada via AbacatePay
└────────────────┘
     │
     │ [ Cliente ] Realiza pagamento PIX confirmado via Webhook/Polling
     ▼
┌──────────────┐
│  Completed   │ ──> Concluído com sucesso! Libera avaliação e crédito na carteira (85%)
└──────────────┘
```

> **Cancelamento**: Qualquer chamado pode transitar para `Cancelled` antes da etapa de execução caso necessário.

---

## ⚡ Comunicação em Tempo Real (WebSockets)

O backend implementa dois canais nativos de WebSockets no ASP.NET Core:

### 1. Rastreamento de Deslocamento (`/ws/tracking`)
- **Endpoint**: `ws://localhost:5065/ws/tracking?serviceId={serviceId}`
- **Função**: Quando o prestador passa para o status `OnTheWay`, o aplicativo do prestador transmite atualizações periódicas de latitude e longitude. O cliente conectado na tela de rastreamento recebe essas coordenadas instantaneamente para atualizar a posição no mapa.

### 2. Chat em Tempo Real (`/ws/chat`)
- **Endpoint**: `ws://localhost:5065/ws/chat?proposalId={proposalId}` ou `?serviceId={serviceId}`
- **Função**: Permite troca de mensagens instantâneas entre o cliente e o prestador antes e durante o atendimento, sem necessidade de polling HTTP contínuo.

---

## 💳 Integração de Pagamentos (AbacatePay PIX)

A monetização e a cobrança ocorrem via **AbacatePay**:
1. Ao concluir o serviço, o prestador informa o valor acordado.
2. O aplicativo do cliente solicita a criação da fatura via `POST /api/payments/{appointmentId}`.
3. A API gera uma transação PIX com QR Code dinâmico e código Copia-e-Cola.
4. O cliente escaneia ou cola no banco de sua preferência.
5. A confirmação do pagamento é processada tanto por **Webhook** (`POST /api/payments/webhook`) quanto por verificação sob demanda (*polling* seguro em `GET /api/payments/{id}/status`).
6. Após a confirmação:
   - O agendamento é marcado como `Paid`.
   - O serviço é marcado como `Completed`.
   - A comissão de **15%** é retida pela plataforma e o valor líquido (**85%**) é disponibilizado na carteira (`Wallet`) do prestador.

---

## 📂 Estrutura do Repositório

```text
WorkEz/
├── .vscode/                               # Configurações de execução e depuração no VS Code
│   ├── launch.json                        # Perfis de F5 unificados (API + App + Juntos)
│   └── tasks.json                         # Tasks de compilação da API
│
├── WorkEzApi/                             # Backend ASP.NET Core 10 (Clean Architecture + DDD)
│   ├── WorkEz.slnx                        # Arquivo de solução XML do .NET
│   ├── Dockerfile                         # Contêiner pronto para produção
│   ├── scripts/                           # Scripts SQL de migrations e sementes
│   ├── WorkEz.Domain/                     # Entidades, Enums, Interfaces e Domain Services
│   │   ├── Common/                        # BaseEntity (Id Guid, CreatedAt, IsActive)
│   │   ├── Entities/                      # User, Service, Proposal, Appointment, etc.
│   │   ├── Enums/                         # ServiceStatus, ProposalStatus, UserRole
│   │   └── Interfaces/                    # Contratos de repositórios e serviços
│   ├── WorkEz.Application/                # Casos de uso, DTOs e Application Services
│   │   ├── DTOs/                          # Payloads de entrada e saída
│   │   └── Services/                      # Regras de negócio e fluxos de aplicação
│   ├── WorkEz.Infra.Data/                 # Acesso a dados e persistência
│   │   ├── Context/                       # AppDbContext (PostgreSQL / In-Memory)
│   │   ├── Repositories/                  # Implementações com EF Core
│   │   └── MessageBroker/                 # Eventos e publicações internas
│   ├── WorkEz.Infra.Ioc/                  # Injeção de dependências (Dependency Injection)
│   └── WorkEz.WebUID/                     # Camada Web, Controllers e WebSockets
│       ├── Controllers/                   # Controllers REST (Auth, Services, Proposals...)
│       ├── WebSockets/                    # Managers de WebSocket (Tracking e Chat)
│       ├── Auth/                          # TokenService JWT e configurações de token
│       ├── Program.cs                     # Startup, middlewares e configuração de rotas
│       ├── appsettings.json               # Configurações gerais
│       └── appsettings.Development.json   # Configurações de desenvolvimento local
│
├── WorkEzApp/                             # Frontend Mobile (React Native + Expo 54)
│   ├── app/                               # Telas e rotas (Expo Router - File-based)
│   │   ├── _layout.tsx                    # Root Layout com AuthProvider
│   │   ├── index.tsx                      # Splash screen inicial
│   │   ├── onboarding.tsx                 # Introdução do aplicativo
│   │   ├── profile-choice.tsx             # Escolha entre Cliente e Prestador
│   │   ├── login.tsx                      # Autenticação unificada
│   │   ├── signup.tsx                     # Cadastro de cliente
│   │   ├── client/                        # Fluxo completo do Cliente (22 telas)
│   │   │   ├── _layout.tsx                # Guard de autenticação para clientes
│   │   │   ├── index.tsx                  # Home com categorias e botão "Chamar Agora"
│   │   │   ├── describe.tsx               # Formulário com fotos, descrição e CEP
│   │   │   ├── tracking/[id].tsx          # Mapa e rastreamento em tempo real
│   │   │   ├── payment/[id].tsx           # Pagamento PIX e QR Code
│   │   │   └── rating/[id].tsx            # Avaliação de qualidade
│   │   └── provider/                      # Fluxo completo do Prestador (24 telas)
│   │       ├── _layout.tsx                # Guard de autenticação para prestadores
│   │       ├── calls.tsx                  # Mural de oportunidades e chamados em curso
│   │       ├── new-call/[id].tsx          # Detalhes e aceite da oportunidade
│   │       ├── in-progress/[id].tsx       # Execução do serviço
│   │       ├── inform-value/[id].tsx      # Inserção do valor final do serviço
│   │       └── wallet.tsx                 # Extrato financeiro e saldo da carteira
│   ├── components/                        # Componentes reutilizáveis (Button, Input, Cards...)
│   ├── contexts/                          # AuthContext (Estado global da sessão)
│   ├── services/                          # Clientes de API (api.ts, authService, paymentService...)
│   ├── tailwind.config.js                 # Configurações do TailwindCSS
│   └── package.json                       # Dependências do frontend
│
├── DOCUMENTACAO_TECNICA.md                # Documentação técnica exaustiva do ecossistema
├── render.yaml                            # Arquivo de infraestrutura como código (IaC) para o Render
├── run-all.ps1                            # Script PowerShell: sobe API e App simultaneamente
├── run-api.ps1                            # Script PowerShell: sobe apenas a API .NET
├── run-app.ps1                            # Script PowerShell: sobe apenas o Expo Mobile
└── README.md                              # Guia mestre do repositório
```

---

## 📡 Catálogo de Endpoints (API REST)

A API disponibiliza documentação Swagger interativa em `http://localhost:5065/swagger`. Abaixo estão os principais endpoints:

| Módulo | Método | Rota | Descrição |
|:---|:---:|:---|:---|
| **Health** | `GET` | `/health` | Verificação de disponibilidade da API |
| **Auth** | `POST` | `/api/Auth/register/customer` | Registro de novo cliente |
| **Auth** | `POST` | `/api/Auth/register/provider` | Registro de novo prestador de serviços |
| **Auth** | `POST` | `/api/Auth/login` | Login unificado (retorna JWT e Refresh Token) |
| **Auth** | `POST` | `/api/Auth/refresh-token` | Renovação silenciosa de token de acesso |
| **Auth** | `POST` | `/api/Auth/revoke-token` | Logout seguro com invalidação de refresh token |
| **Categories** | `GET` | `/api/Categories` | Lista todas as categorias de serviços |
| **Categories** | `POST` | `/api/Categories` | Cadastro de nova categoria *(Admin)* |
| **Customers** | `GET` | `/api/Customers/by-user/{userId}` | Obtém perfil do cliente pelo Id do usuário |
| **Providers** | `GET` | `/api/ServiceProviders/by-user/{userId}` | Obtém perfil do prestador pelo Id do usuário |
| **Providers** | `GET` | `/api/ServiceProviders/{id}/portfolio` | Lista itens do portfólio do prestador |
| **Providers** | `POST` | `/api/ServiceProviders/{id}/portfolio` | Adiciona fotos ao portfólio |
| **Services** | `POST` | `/api/Services/by-customer/{customerId}` | Criação de novo chamado ("Chamar Agora") |
| **Services** | `GET` | `/api/Services/{id}` | Detalhes completos do chamado |
| **Services** | `GET` | `/api/Services/by-customer/{customerId}` | Histórico de chamados do cliente |
| **Services** | `GET` | `/api/Services/opportunities-by-user/{userId}` | Chamados abertos para o prestador |
| **Services** | `GET` | `/api/Services/by-provider-user/{userId}` | Chamados aceitos/em andamento do prestador |
| **Services** | `POST` | `/api/Services/{id}/accept` | Aceite direto da oportunidade pelo prestador |
| **Services** | `PATCH` | `/api/Services/{id}/start-displacement` | Atualiza status para `OnTheWay` |
| **Services** | `PATCH` | `/api/Services/{id}/start` | Atualiza status para `InProgress` |
| **Services** | `PATCH` | `/api/Services/{id}/complete?price={val}` | Conclui serviço e define status `WaitingPayment` |
| **Services** | `PATCH` | `/api/Services/{id}/cancel` | Cancela o chamado |
| **Proposals** | `POST` | `/api/Proposals` | Cria proposta com valor personalizado |
| **Proposals** | `POST` | `/api/Proposals/{id}/counter` | Cliente realiza contra-proposta de valor |
| **Proposals** | `POST` | `/api/Proposals/{id}/accept` | Aceita a proposta/contra-proposta |
| **Chat** | `GET` | `/api/Chat/by-service/{serviceId}` | Histórico de mensagens do chamado |
| **Chat** | `POST` | `/api/Chat/send` | Envio de mensagem HTTP fallback |
| **WebSockets** | `GET` | `/ws/tracking?serviceId={id}` | Canal de rastreamento do prestador em tempo real |
| **WebSockets** | `GET` | `/ws/chat?serviceId={id}` | Canal bidirecional de chat em tempo real |

---

## 📱 Mapeamento de Rotas do App Mobile

O aplicativo é dividido em três áreas principais com proteção de rotas (Route Guards):

### 1. Rotas Públicas
- `/` ➔ Splash Screen de carregamento.
- `/onboarding` ➔ Apresentação em slides dos recursos da plataforma.
- `/profile-choice` ➔ Seleção do perfil de entrada (Cliente ou Prestador).
- `/login` ➔ Formulário de login unificado.
- `/signup` ➔ Cadastro de cliente.
- `/provider/signup` ➔ Cadastro de prestador.

### 2. Área do Cliente (`/client/*`)
- `/client` ➔ Home principal com categorias e atalhos rápidos.
- `/client/describe` ➔ Formulário de solicitação de serviço (fotos, descrição, CEP).
- `/client/searching` ➔ Confirmação e publicação do chamado.
- `/client/tracking/[id]` ➔ Rastreamento do prestador no mapa com WebSocket.
- `/client/chat/[id]` ➔ Conversa em tempo real com o prestador.
- `/client/payment/[id]` ➔ Tela de pagamento PIX com QR Code.
- `/client/completed/[id]` ➔ Confirmação de serviço finalizado.
- `/client/rating/[id]` ➔ Avaliação com nota e comentários.
- `/client/services` ➔ Histórico de chamados.
- `/client/profile` ➔ Gerenciamento de perfil e logout.

### 3. Área do Prestador (`/provider/*`)
- `/provider/calls` ➔ Painel com abas de "Oportunidades Disponíveis" e "Meus Serviços".
- `/provider/new-call/[id]` ➔ Detalhes do chamado aberto com opção de aceitar.
- `/provider/accepted/[id]` ➔ Chamado aceito; botão para iniciar deslocamento.
- `/provider/in-progress/[id]` ➔ Prestador no local executando o serviço.
- `/provider/inform-value/[id]` ➔ Tela para informar o valor final do serviço.
- `/provider/waiting-payment/[id]` ➔ Aguardando confirmação do PIX pago pelo cliente.
- `/provider/wallet` ➔ Carteira com extrato de ganhos e descontos da taxa de 15%.
- `/provider/portfolio` ➔ Galeria de fotos de trabalhos anteriores.
- `/provider/work-area` ➔ Gerenciamento de categorias de atuação do profissional.

---

## 💻 Pré-requisitos

Antes de iniciar, certifique-se de possuir instalado em sua máquina:

1. **[.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)** (ou superior)
2. **[Node.js](https://nodejs.org/)** (v18.x ou v20.x LTS recomendado)
3. **npm** (geralmente instalado junto ao Node.js)
4. **Git**
5. *(Opcional)* Aplicativo **Expo Go** instalado no seu smartphone físico ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) ou [iOS](https://apps.apple.com/app/expo-go/id982107779)) para testar sem emuladores pesados.

---

## 🚀 Como Rodar o Projeto

Você pode iniciar todo o ecossistema WorkEz através de três maneiras simples:

### Opção 1: VS Code (F5 — Depuração Unificada)

Abra a pasta raiz `WorkEz` no Visual Studio Code e acesse a aba **Run and Debug** (`Ctrl + Shift + D`):

1. Selecione o perfil **`🚀 Executar API + App Mobile (Juntos)`** e aperte **F5**.
2. O VS Code iniciará automaticamente a API .NET na porta `5065` e abrirá a janela do Expo Mobile simultaneamente.
3. Se desejar rodar separadamente, escolha:
   - `🌐 Executar API Backend (WorkEzApi)`
   - `📱 Executar App Mobile (WorkEzApp Expo)`

---

### Opção 2: Scripts Rápidos PowerShell

Na raiz do repositório, utilize os scripts automatizados prontos para Windows:

```powershell
# 1. Inicia API (.NET 10) e App Mobile (Expo) juntos em janelas dedicadas
.\run-all.ps1

# 2. Inicia apenas a API Backend
.\run-api.ps1

# 3. Inicia apenas o App Mobile
.\run-app.ps1
```

---

### Opção 3: Manualmente pelo Terminal

#### 1. Iniciando o Backend (.NET 10)
```powershell
cd WorkEzApi
dotnet run --project WorkEz.WebUID/WorkEz.WebUID.csproj
```
- A API estará disponível em: `http://localhost:5065`
- Documentação interativa Swagger: `http://localhost:5065/swagger`
- Health check: `http://localhost:5065/health`

#### 2. Iniciando o Frontend Mobile (React Native / Expo)
Em outro terminal:
```powershell
cd WorkEzApp
npm install          # Apenas na primeira vez
npx expo start
```
- Pressione **`a`** para abrir no emulador Android conectado.
- Pressione **`i`** para abrir no simulador iOS (macOS).
- Pressione **`w`** para abrir no navegador web.
- Escaneie o **QR Code** no terminal com a câmera do seu celular usando o **Expo Go**.

> 💡 **Dica para Celular Físico:** Se for testar no smartphone via Expo Go, configure o IP local do seu computador no arquivo `WorkEzApp/.env` para que o celular consiga acessar a API local:
> ```env
> EXPO_PUBLIC_API_URL=http://192.168.0.X:5065
> ```

---

## ⚙️ Configuração de Variáveis de Ambiente

### Backend (`WorkEzApi`)

Por padrão, em ambiente de desenvolvimento local, a API funciona de imediato utilizando o banco **In-Memory** e chave JWT padrão definida em [`appsettings.Development.json`](file:///d:/Projetos/WorkEz/WorkEzApi/WorkEz.WebUID/appsettings.Development.json). 

Caso deseje conectar a um banco PostgreSQL real (como o Neon DB) ou configurar gateways de pagamento, defina as variáveis de ambiente ou edite as configurações:

| Variável / Chave | Descrição | Padrão Local |
|---|---|---|
| `ConnectionStrings__DefaultConnection` | String de conexão PostgreSQL (Npgsql) | *Vazio (usa In-Memory)* |
| `Jwt__SecretKey` | Chave secreta JWT (mínimo de 32 caracteres) | `dev-only-workez-secret-key...` |
| `Jwt__Issuer` | Emissor do token JWT | `WorkEz` |
| `Jwt__Audience` | Audiência do token JWT | `WorkEzClient` |
| `Jwt__AccessTokenExpirationMinutes` | Validade do Access Token | `15` |
| `Jwt__RefreshTokenExpirationDays` | Validade do Refresh Token | `7` |
| `AbacatePay__ApiKey` | Chave de API do gateway AbacatePay | *Opcional em dev* |
| `AbacatePay__WebhookSecret` | Chave de validação do Webhook | *Opcional em dev* |
| `AbacatePay__BaseUrl` | URL base da API AbacatePay | `https://api.abacatepay.com/v1` |

### Frontend (`WorkEzApp`)

Crie ou edite o arquivo `WorkEzApp/.env` (baseie-se no [`WorkEzApp/.env.example`](file:///d:/Projetos/WorkEz/WorkEzApp/.env.example)):

```env
# Desenvolvimento local (Emulador iOS ou Web):
EXPO_PUBLIC_API_URL=http://localhost:5065

# Emulador Android (Localhost da máquina host mapeado):
# EXPO_PUBLIC_API_URL=http://10.0.2.2:5065

# Smartphone físico na mesma rede Wi-Fi:
# EXPO_PUBLIC_API_URL=http://192.168.1.100:5065

# Produção na nuvem (Render):
# EXPO_PUBLIC_API_URL=https://workez-api.onrender.com
```

---

## 🌐 Deploy e Infraestrutura

### Backend no Render.com
O projeto inclui suporte nativo a contêineres Docker e infraestrutura como código (IaC) via [`render.yaml`](file:///d:/Projetos/WorkEz/render.yaml):
- **Runtime**: Docker multi-stage build ([`Dockerfile`](file:///d:/Projetos/WorkEz/WorkEzApi/Dockerfile)).
- **Health Check**: Monitoramento contínuo em `/health`.
- **Banco de Dados**: Compatível com PostgreSQL Neon DB gerenciado na nuvem.

### Frontend Mobile
- O aplicativo pode ser gerado e distribuído facilmente através do **EAS Build** (Expo Application Services) para gerar APK/AAB (Android) e IPA (iOS).

---

## 👥 Licença e Autoria

Projeto acadêmico e profissional desenvolvido para o ecossistema **WorkEz**.  
Distribuído sob a licença **MIT**. Sinta-se livre para utilizar, contribuir e sugerir melhorias! 🤝
