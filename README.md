# 🚀 WorkEz — Plataforma Multifuncional de Serviços

<p align="center">
  <img src="https://img.shields.io/badge/.NET-10.0-512BD4?style=for-the-badge&logo=dotnet&logoColor=white" alt=".NET 10" />
  <img src="https://img.shields.io/badge/C%23-12.0-239120?style=for-the-badge&logo=csharp&logoColor=white" alt="C#" />
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-54.0-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Playwright-E2E_Tests-45ba4b?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright" />
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
  - [Frontend Mobile & Web (React Native + Expo)](#frontend-mobile--web-react-native--expo)
- [Ciclo de Vida do Chamado (State Machine)](#-ciclo-de-vida-do-chamado-state-machine)
- [Comunicação em Tempo Real (WebSockets)](#-comunicação-em-tempo-real-websockets)
- [Integração de Pagamentos e Modelo de Taxa Justa](#-integração-de-pagamentos-e-modelo-de-taxa-justa)
- [Estrutura do Repositório](#-estrutura-do-repositório)
- [Catálogo de Endpoints (API REST)](#-catálogo-de-endpoints-api-rest)
- [Mapeamento de Rotas do App](#-mapeamento-de-rotas-do-app)
- [Pré-requisitos](#-pré-requisitos)
- [Como Rodar o Projeto](#-como-rodar-o-projeto)
  - [Opção 1: Scripts da Raiz (npm / Node)](#opção-1-scripts-da-raiz-npm--node)
  - [Opção 2: VS Code (F5 — Depuração Unificada)](#opção-2-vs-code-f5--depuração-unificada)
  - [Opção 3: Scripts Rápidos PowerShell](#opção-3-scripts-rápidos-powershell)
  - [Opção 4: Manualmente pelo Terminal](#opção-4-manualmente-pelo-terminal)
- [🧪 Testes Automatizados (Unitários e E2E)](#-testes-automatizados-unitários-e-e2e)
  - [Testes Unitários (.NET)](#1-testes-unitários-backend-net-10)
  - [Testes End-to-End (Playwright)](#2-testes-end-to-end-playwright-workezapp)
- [Configuração de Variáveis de Ambiente](#-configuração-de-variáveis-de-ambiente)
- [Deploy e Infraestrutura](#-deploy-e-infraestrutura)
- [Licença e Autoria](#-licença-e-autoria)

---

## 🎯 Visão Geral do Projeto

O **WorkEz** é uma plataforma completa para intermediação e contratação de serviços residenciais e profissionais (encanadores, eletricistas, diaristas, técnicos, montadores, entre outros). A aplicação une **Clientes** que necessitam de auxílio prático a **Prestadores de Serviço** qualificados e avaliados, garantindo segurança, transparência e controle de ponta a ponta:

1. **Agilidade no Atendimento**: Mecanismo de abertura de chamado em poucos passos ("Chamar Agora"), com fotos locais ou na nuvem e geolocalização.
2. **Leilão Transparente de Propostas**: O prestador discrimina custos entre **Mão de Obra** e **Materiais**, permitindo ao cliente comparar ofertas detalhadas.
3. **Rastreabilidade em Tempo Real**: WebSocket nativo para acompanhamento do deslocamento do prestador no mapa.
4. **Chat Integrado**: Canal de comunicação bidirecional direto entre cliente e prestador por chamado/proposta.
5. **Pagamento Seguro com PIX e Taxa Justa**: Cobrança via gateway AbacatePay com retenção de comissão de 15% **exclusivamente sobre o serviço/mão de obra** (materiais 100% repassados ao prestador).
6. **Sistema Completo de Avaliações**: Notas (1 a 5 estrelas), tags de qualidade e comentários auditáveis após a conclusão do serviço.

---

## ✨ Principais Funcionalidades

### 👤 Para o Cliente (Customer)
- **Autenticação Segura**: Criação de conta, login unificado com JWT, persistência com auto-refresh token.
- **Catálogo de Categorias**: Busca de serviços por segmento profissional.
- **Abertura de Chamados ("Chamar Agora")**: Descrição detalhada do problema, upload de múltiplas fotos (servidor local ou ImgBB) e busca de endereço por CEP (ViaCEP).
- **Comparação e Aceite de Propostas**: Análise de propostas de múltiplos prestadores discriminando valores de serviço e peças, além da foto e avaliação de cada profissional.
- **Acompanhamento ao Vivo (Tracking)**: Notificação e mapa em tempo real via WebSocket (`Pendente` → `Aceito` → `A Caminho` → `Em Execução` → `Aguardando Pagamento` → `Concluído`).
- **Chat em Tempo Real**: Troca instantânea de mensagens com o profissional, com fechamento e bloqueio automático quando uma proposta é recusada.
- **Checkout com PIX**: Geração de QR Code e código Copia-e-Cola direto no app, com confirmação via webhook e polling.
- **Avaliações Reais e Flexíveis**: Envio de notas de 1 a 5 estrelas com comentários opcionais e tags de recomendação (exibição limpa apenas com estrelas caso não haja texto).

### 🛠️ Para o Prestador de Serviços (ServiceProvider)
- **Onboarding e Perfil Profissional**: Cadastro com foto de perfil, anos de experiência, biografia, especialidades e galeria de portfólio.
- **Mural de Oportunidades com Filtro Geográfico**: Visualização inteligente de chamados abertos, ocultando automaticamente oportunidades fora do raio de atendimento do prestador.
- **Configuração de Raio de Atuação**: Definição do raio em km (5km a 100km) com preview interativo em mapa e geocodificação de endereço.
- **Galeria de Fotos do Chamado**: Visualização das imagens anexadas pelo cliente antes e depois do aceite.
- **Envio de Propostas e Leilão**: Formulação de propostas discriminando Mão de Obra e Materiais, com cálculo em tempo real do ganho líquido e da taxa da plataforma.
- **Controle Unificado de Atendimento**: Gestão direta do ciclo de atendimento (*Iniciar Deslocamento* ➔ *Iniciar Serviço* ➔ *Concluir Serviço*).
- **Carteira Digital (Wallet)**: Extrato transparente de recebimentos, histórico de chamados e saldo acumulado.
- **Gestão de Reputação**: Painel de avaliações recebidas com notas médias e depoimentos de clientes.

---

## 🏛️ Arquitetura do Sistema

```mermaid
graph TB
    subgraph Frontend["Frontend (WorkEzApp)"]
        UI["React Native (Expo 54)<br/>Expo Router + NativeWind + Web"]
        AuthCtx["AuthContext (AsyncStorage + Profile Sync)"]
        WSClient["WebSocket Client<br/>(Tracking & Chat)"]
        E2E["Playwright E2E Suite<br/>(7 fluxos ponta a ponta)"]
    end

    subgraph StorageUploads["Armazenamento & Uploads"]
        LocalUploads["API Local /wwwroot/uploads<br/>(Multipart & Base64)"]
        ImgBB["ImgBB API<br/>(Fallback Remoto)"]
    end

    subgraph ExternalServices["Serviços Externos"]
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

    UI -->|"REST HTTPS + JWT Bearer"| WebUID
    WSClient <--> WebUID
    UI -->|"Upload de Imagens"| LocalUploads
    UI -.->|"Fallback Imagens"| ImgBB
    UI -->|"Busca de CEP"| ViaCEP

    WebUID --> App
    WebUID --> Ioc
    App --> Domain
    App --> Data
    Data --> Postgres
    WebUID -->|"PIX Billing"| Abacate
    Abacate -->|"Webhook de Confirmação"| WebUID
```

### Backend (.NET 10 — Clean Architecture + DDD)

A API do backend foi estruturada seguindo rigorosamente os princípios de **Clean Architecture** e **Domain-Driven Design (DDD)**, dividida em projetos desacoplados dentro da solução [`WorkEz.slnx`](file:///d:/Projetos/WorkEz/WorkEzApi/WorkEz.slnx):

- **[`WorkEz.Domain`](file:///d:/Projetos/WorkEz/WorkEzApi/WorkEz.Domain)**: Núcleo do negócio. Entidades centrais (`User`, `Customer`, `ServiceProvider`, `Service`, `Proposal`, `Appointment`, `Review`, `ChatMessage`, `Category`, `Address`), enums e contratos de repositórios.
- **[`WorkEz.Application`](file:///d:/Projetos/WorkEz/WorkEzApi/WorkEz.Application)**: Camada de orquestração e casos de uso (`ServiceOpportunityApplicationService`, `ProposalApplicationService`, `ChatApplicationService`, `PortfolioApplicationService`), cálculo da taxa justa da plataforma e DTOs.
- **[`WorkEz.Infra.Data`](file:///d:/Projetos/WorkEz/WorkEzApi/WorkEz.Infra.Data)**: `AppDbContext` em Entity Framework Core 10 com suporte nativo a **PostgreSQL (Npgsql)** e fallback transparente para banco **In-Memory**, repositórios e queries otimizadas.
- **[`WorkEz.Infra.Ioc`](file:///d:/Projetos/WorkEz/WorkEzApi/WorkEz.Infra.Ioc)**: Contêiner de Inversão de Controle (IoC), centralizando o registro de dependências.
- **[`WorkEz.WebUID`](file:///d:/Projetos/WorkEz/WorkEzApi/WorkEz.WebUID)**: Ponto de entrada ASP.NET Core Web API, controllers REST (`Auth`, `Services`, `Proposals`, `Reviews`, `Users`, `Uploads`...), managers de WebSockets, middlewares de CORS, uploads locais e Swagger UI.

### Frontend Mobile & Web (React Native + Expo)

O aplicativo foi construído em **React Native 0.81** com **Expo 54** e compilação híbrida para **Mobile e Web**:
- **Expo Router (v6)**: Roteamento baseado no sistema de arquivos com layouts aninhados e Route Guards por perfil (`/client` e `/provider`).
- **Componentes Modulares**: [`ScreenHeader.tsx`](file:///d:/Projetos/WorkEz/WorkEzApp/components/ScreenHeader.tsx) com safe-area automática, botões padronizados, cards de avaliação e sistema de design tokens (`WorkEzTheme`).
- **Context API & Hooks**: `AuthContext` com gerenciamento de sessão, token JWT, persistência com AsyncStorage e sincronização com `/api/Users/{id}`.
- **Qualidade & Confiabilidade**: Suíte automatizada com Playwright cobrindo os cenários críticos ponta a ponta.

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
     │ [ Prestadores ] Enviam propostas discriminando Mão de Obra e Materiais
     │ [ Cliente ] Analisa e aceita a melhor proposta
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
     │ [ Prestador ] Finaliza serviço e confirma valores acordados
     ▼
┌────────────────┐
│ WaitingPayment │ ──> Cobrança PIX gerada via AbacatePay
└────────────────┘
     │
     │ [ Cliente ] Realiza pagamento PIX confirmado via Webhook/Polling
     ▼
┌──────────────┐
│  Completed   │ ──> Concluído com sucesso! Libera avaliação e repasse financeiro
└──────────────┘
```

> **Cancelamento**: Qualquer chamado pode transitar para `Cancelled` antes da etapa de execução caso necessário.

---

## ⚡ Comunicação em Tempo Real (WebSockets)

O backend implementa dois canais nativos de WebSockets no ASP.NET Core:

### 1. Rastreamento de Deslocamento (`/ws/tracking`)
- **Endpoint**: `ws://localhost:5065/ws/tracking?serviceId={serviceId}`
- **Função**: Quando o prestador passa para o status `OnTheWay`, o app transmite atualizações periódicas de geolocalização. O cliente conectado na tela de rastreamento recebe essas coordenadas instantaneamente para atualizar a posição no mapa.

### 2. Chat em Tempo Real (`/ws/chat`)
- **Endpoint**: `ws://localhost:5065/ws/chat?proposalId={proposalId}` ou `?serviceId={serviceId}`
- **Função**: Troca instantânea de mensagens de texto entre o cliente e o prestador antes e durante o atendimento, sem necessidade de polling HTTP.

---

## 💳 Integração de Pagamentos e Modelo de Taxa Justa

A monetização e a cobrança ocorrem via **AbacatePay**:
1. Ao enviar a proposta ou concluir o atendimento, os custos são discriminados em:
   - **Mão de Obra (`LaborPrice`)**: Custo do serviço executado pelo profissional.
   - **Materiais (`MaterialsPrice`)**: Custos de peças e suprimentos necessários.
2. **Modelo de Taxa Justa**: A comissão da plataforma (**15%**) incide **exclusivamente sobre o valor de mão de obra**. Os materiais são repassados integralmente (100%) ao prestador.
   $$\text{Taxa da Plataforma} = \text{Mão de Obra} \times 0.15$$
   $$\text{Ganho Líquido do Prestador} = (\text{Mão de Obra} \times 0.85) + \text{Materiais}$$
3. O cliente gera a fatura PIX (`POST /api/payments/{appointmentId}`) com QR Code dinâmico e código Copia-e-Cola.
4. A confirmação do pagamento é processada tanto por **Webhook** (`POST /api/payments/webhook`) quanto por verificação sob demanda (*polling* em `GET /api/payments/{id}/status`).
5. Com o pagamento confirmado, o chamado avança para `Completed` e os valores líquidos são creditados na carteira do prestador.

---

## 📂 Estrutura do Repositório

```text
WorkEz/
├── .vscode/                               # Configurações de execução e depuração no VS Code
│   └── launch.json                        # Perfis de execução unificados (API + App + Web)
│
├── package.json                           # Scripts centrais de execução (npm run web, test:e2e...)
├── scripts/                               # Scripts utilitários de suporte
│   └── run-api.js                         # Runner multiplataforma Node para a API .NET
│
├── WorkEzApi/                             # Backend ASP.NET Core 10 (Clean Architecture + DDD)
│   ├── WorkEz.slnx                        # Solução XML do .NET
│   ├── Dockerfile                         # Contêiner pronto para produção
│   ├── scripts/                           # Scripts SQL de migrations e sementes
│   │   ├── 003_add_proposal_labor_and_materials.sql # Migração de custos separados
│   │   └── 004_create_reviews_table.sql             # Migração da tabela de avaliações
│   ├── WorkEz.Domain/                     # Entidades, Enums, Interfaces e Domain Services
│   ├── WorkEz.Application/                # Casos de uso, DTOs e Application Services
│   ├── WorkEz.Infra.Data/                 # AppDbContext, Repositories e EF Core
│   ├── WorkEz.Infra.Ioc/                  # Registro de Injeção de Dependências
│   └── WorkEz.WebUID/                     # Controllers REST, WebSockets e Startup
│       ├── Controllers/                   # Controllers REST (Auth, Services, Reviews, Users, Uploads...)
│       ├── WebSockets/                    # Managers de WebSocket (Tracking e Chat)
│       └── Tests/                         # Bateria de testes unitários xUnit (62 testes)
│
├── WorkEzApp/                             # Frontend React Native (Expo 54 Mobile & Web)
│   ├── app/                               # Telas e rotas (Expo Router - File-based)
│   │   ├── client/                        # Fluxo completo do Cliente (detalhes, tracking, chat, avaliação)
│   │   └── provider/                      # Fluxo do Prestador (propostas, execução unificada, carteira, raio)
│   ├── components/                        # Componentes UI (ScreenHeader, Button, RatingCard, RadiusMapPreview)
│   ├── contexts/                          # AuthContext (sessão, tokens e sincronização com backend)
│   ├── services/                          # Clientes de API (api.ts com auto-resolução de IP, imageService)
│   ├── playwright.config.ts               # Configuração do Playwright para testes E2E
│   └── e2e/                               # Suíte completa de testes automatizados E2E
│       ├── 01-auth-flow.spec.ts           # Teste E2E de cadastro e autenticação
│       ├── 02-auction-proposals.spec.ts   # Teste E2E de abertura de chamado e leilão de propostas
│       ├── 03-chat-and-websocket.spec.ts  # Teste E2E de mensageria em tempo real
│       ├── 04-service-execution-and-review.spec.ts # Teste E2E do ciclo de atendimento e avaliação
│       ├── 05-found-screen.spec.ts        # Teste E2E de visualização do profissional encontrado
│       ├── 06-provider-profile-navigation.spec.ts # Teste E2E do perfil do prestador
│       └── 07-geolocation-and-tracking.spec.ts    # Teste E2E de geolocalização, raio de atendimento e tracking
│
├── run-all.ps1                            # Script PowerShell: sobe API e App simultaneamente
├── run-api.ps1                            # Script PowerShell: sobe apenas a API .NET
├── run-app.ps1                            # Script PowerShell: sobe apenas o Expo Mobile
└── README.md                              # Guia mestre do repositório
```

---

## 📡 Catálogo de Endpoints (API REST)

A API disponibiliza documentação Swagger interativa em `http://localhost:5065/swagger`. Abaixo estão os principais endpoints organizados por módulo:

| Módulo | Método | Rota | Descrição |
|:---|:---:|:---|:---|
| **Health** | `GET` | `/health` | Verificação de disponibilidade da API |
| **Auth** | `POST` | `/api/Auth/register/customer` | Registro de novo cliente |
| **Auth** | `POST` | `/api/Auth/register/provider` | Registro de novo prestador de serviços |
| **Auth** | `POST` | `/api/Auth/login` | Login unificado (retorna JWT e Refresh Token) |
| **Auth** | `POST` | `/api/Auth/refresh-token` | Renovação silenciosa de token de acesso |
| **Auth** | `POST` | `/api/Auth/revoke-token` | Logout seguro com invalidação de refresh token |
| **Users** | `GET` | `/api/Users/profile` ou `/me` | Consulta os dados do perfil do usuário autenticado |
| **Users** | `PUT` | `/api/Users/profile` | Atualiza nome, e-mail, telefone e foto de perfil |
| **Users** | `GET` | `/api/Users/{id}` | Consulta os dados de um usuário pelo ID |
| **Uploads** | `POST` | `/api/Uploads` | Upload multipart de imagem com persistência local em `/wwwroot/uploads/` |
| **Uploads** | `POST` | `/api/Uploads/base64` | Upload de imagem codificada em Base64 via payload JSON |
| **Reviews** | `POST` | `/api/Reviews` | Cria ou atualiza avaliação (nota 1 a 5, comentário e tags) |
| **Reviews** | `GET` | `/api/Reviews/by-user/{userId}` | Lista todas as avaliações recebidas por um prestador |
| **Reviews** | `GET` | `/api/Reviews/by-service/{serviceId}` | Obtém a avaliação associada a um chamado |
| **Reviews** | `GET` | `/api/Reviews/by-appointment/{appointmentId}` | Obtém a avaliação associada a um agendamento |
| **Categories** | `GET` | `/api/Categories` | Lista todas as categorias de serviços |
| **Customers** | `GET` | `/api/Customers/by-user/{userId}` | Obtém perfil do cliente pelo ID do usuário |
| **Customers** | `GET` | `/api/Customers/{userId}/favorites` | Retorna lista de profissionais favoritados pelo cliente |
| **Providers** | `GET` | `/api/ServiceProviders/by-user/{userId}` | Obtém perfil do prestador pelo ID do usuário |
| **Providers** | `GET` | `/api/ServiceProviders/{id}/portfolio` | Lista itens do portfólio do prestador |
| **Providers** | `POST` | `/api/ServiceProviders/{id}/portfolio` | Adiciona fotos ao portfólio |
| **Services** | `POST` | `/api/Services/by-customer/{customerId}` | Criação de novo chamado ("Chamar Agora") |
| **Services** | `GET` | `/api/Services/{id}` | Detalhes completos do chamado |
| **Services** | `GET` | `/api/Services/by-customer/{customerId}` | Histórico de chamados do cliente |
| **Services** | `GET` | `/api/Services/opportunities-by-user/{userId}` | Mural de chamados abertos para o prestador |
| **Services** | `GET` | `/api/Services/by-provider-user/{userId}` | Chamados aceitos e em andamento do prestador |
| **Services** | `POST` | `/api/Services/{id}/accept` | Aceite direto da oportunidade pelo prestador |
| **Services** | `PATCH` | `/api/Services/{id}/start-displacement` | Atualiza status para `OnTheWay` |
| **Services** | `PATCH` | `/api/Services/{id}/start` | Atualiza status para `InProgress` |
| **Services** | `PATCH` | `/api/Services/{id}/complete?price={val}` | Conclui serviço e avança para `WaitingPayment` |
| **Services** | `PATCH` | `/api/Services/{id}/cancel` | Cancela o chamado |
| **Proposals** | `POST` | `/api/Proposals` | Cria proposta discriminando `LaborPrice` e `MaterialsPrice` |
| **Proposals** | `POST` | `/api/Proposals/{id}/counter` | Cliente realiza contra-proposta de valor |
| **Proposals** | `POST` | `/api/Proposals/{id}/accept` | Aceita a proposta/contra-proposta selecionada |
| **Chat** | `GET` | `/api/Chat/by-service/{serviceId}` | Histórico de mensagens do chamado |
| **Chat** | `POST` | `/api/Chat/send` | Envio de mensagem HTTP fallback |
| **WebSockets** | `GET` | `/ws/tracking?serviceId={id}` | Canal de rastreamento do prestador em tempo real |
| **WebSockets** | `GET` | `/ws/chat?serviceId={id}` | Canal bidirecional de mensagens em tempo real |

---

## 📱 Mapeamento de Rotas do App

O aplicativo possui navegação modular com proteção de rotas (Route Guards):

### 1. Rotas Públicas e Comuns
- `/` ➔ Splash Screen de carregamento.
- `/onboarding` ➔ Slides explicativos sobre a plataforma.
- `/profile-choice` ➔ Seleção de modalidade de conta (Cliente ou Prestador).
- `/login` ➔ Formulário de login com preenchimento rápido de teste.
- `/signup` ➔ Cadastro de novo cliente.
- `/help` ➔ Central de ajuda e dúvidas frequentes (FAQ).

### 2. Área do Cliente (`/client/*`)
- `/client` ➔ Home com catálogo de especialidades e botão "Chamar Agora".
- `/client/describe` ➔ Formulário de chamado com fotos, descrição e busca de CEP.
- `/client/searching` ➔ Mural de busca e confirmação de publicação do chamado.
- `/client/found` ➔ Visualização do profissional aceito com atalhos de ação.
- `/client/tracking/[id]` ➔ Rastreamento ao vivo do prestador e gestão do chamado.
- `/client/chat/[id]` ➔ Chat em tempo real via WebSocket.
- `/client/payment/[id]` ➔ Checkout PIX com QR Code dinâmico.
- `/client/rating/[id]` ➔ Avaliação pós-serviço (estrelas, comentários e tags).
- `/client/professional/[id]` ➔ Perfil público do prestador com avaliações reais.
- `/client/edit-profile` ➔ Edição de dados cadastrais e foto de perfil.

### 3. Área do Prestador (`/provider/*`)
- `/provider` ➔ Painel inicial do prestador com métricas e chamados ativos.
- `/provider/calls` ➔ Mural de oportunidades abertas e histórico de atendimentos.
- `/provider/new-call/[id]` ➔ Detalhes do chamado e envio de proposta (mão de obra + peças).
- `/provider/accepted/[id]` ➔ Central de execução do serviço (*Deslocamento* ➔ *Execução* ➔ *Conclusão*).
- `/provider/ratings` ➔ Painel de avaliações recebidas de clientes.
- `/provider/wallet` ➔ Carteira com extrato de ganhos e histórico financeiro.
- `/provider/portfolio` ➔ Galeria de fotos de serviços anteriores.
- `/provider/edit-profile` ➔ Edição de dados, foto, anos de experiência e especialidades.

---

## 💻 Pré-requisitos

Antes de iniciar, certifique-se de possuir instalado em seu ambiente:

1. **[.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)** (ou superior)
2. **[Node.js](https://nodejs.org/)** (v18.x ou v20.x LTS recomendado)
3. **npm** (incluso com o Node.js)
4. **Git**
5. *(Opcional)* App **Expo Go** no celular físico ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)).

---

## 🚀 Como Rodar o Projeto

### Opção 1: Scripts da Raiz (npm / Node)

Na raiz do projeto `WorkEz`:

```bash
# Iniciar a versão Web do aplicativo (Expo Web)
npm run web

# Executar a suíte completa de testes automatizados E2E
npm run test:e2e

# Executar os testes E2E com interface visual interativa (UI Mode)
npm run test:e2e:ui

# Iniciar o Expo para desenvolvimento Mobile
npm run app
```

---

### Opção 2: VS Code (F5 — Depuração Unificada)

Abra a pasta `WorkEz` no Visual Studio Code e acesse a aba **Run and Debug** (`Ctrl + Shift + D`):

1. Selecione **`🚀 Executar API + Web (Juntos)`** e pressione **F5** para subir a API backend e o frontend Web de uma só vez.
2. Ou escolha perfis individuais:
   - `🌐 Executar API Backend (WorkEzApi)`
   - `💻 Executar App Web (WorkEzApp Web)`
   - `📱 Executar App Mobile (WorkEzApp Expo)`

---

### Opção 3: Scripts Rápidos PowerShell

Para desenvolvedores no Windows, utilize os scripts prontos na raiz:

```powershell
# Sobe API (.NET 10) e App Mobile (Expo) juntos em janelas dedicadas
.\run-all.ps1

# Sobe apenas a API Backend
.\run-api.ps1

# Sobe apenas o App Mobile
.\run-app.ps1
```

---

### Opção 4: Manualmente pelo Terminal

#### 1. Backend (.NET 10)
```powershell
cd WorkEzApi
dotnet run --project WorkEz.WebUID/WorkEz.WebUID.csproj
```
- API REST: `http://localhost:5065`
- Documentação Swagger: `http://localhost:5065/swagger`
- Health check: `http://localhost:5065/health`

#### 2. Frontend (React Native / Expo)
Em outro terminal:
```powershell
cd WorkEzApp
npm install          # Apenas na primeira vez
npx expo start
```
- Pressione **`w`** para abrir diretamente no navegador web.
- Pressione **`a`** para emulador Android ou **`i`** para simulador iOS.
- Escaneie o **QR Code** no terminal com o app **Expo Go** no celular.

> 💡 **Auto-Detecção de IP:** O aplicativo resolve automaticamente o IP local do Metro Bundler para conexões móveis, eliminando a necessidade de configurar IPs manuais ao testar no smartphone.

---

## 🧪 Testes Automatizados (Unitários e E2E)

O projeto conta com ampla cobertura de testes automatizados tanto no backend quanto no frontend:

### 1. Testes Unitários Backend (.NET 10)
Cobre as regras de negócio de propostas com mão de obra/materiais, agendamentos, serviços de oportunidade e portfólio com xUnit:

```powershell
dotnet test WorkEzApi/WorkEz.WebUID/WorkEz.WebUID.csproj
```

> **Resultado**: 62 testes unitários automatizados passando com 100% de sucesso.

### 2. Testes End-to-End (Playwright — WorkEzApp)
A suíte E2E em [`WorkEzApp/e2e/`](file:///d:/Projetos/WorkEz/WorkEzApp/e2e) valida os fluxos completos do usuário de ponta a ponta:

| Arquivo de Teste | Escopo Validado |
|---|---|
| `01-auth-flow.spec.ts` | Cadastro de cliente e prestador, login, logout e guards de rota |
| `02-auction-proposals.spec.ts` | Abertura de chamado pelo cliente, envio de proposta discriminada pelo prestador e aceite |
| `03-chat-and-websocket.spec.ts` | Troca de mensagens em tempo real entre cliente e profissional |
| `04-service-execution-and-review.spec.ts` | Ciclo completo: Deslocamento ➔ Execução ➔ Pagamento ➔ Avaliação com estrelas |
| `05-found-screen.spec.ts` | Tela de profissional encontrado, verificação de dados e links rápidos |
| `06-provider-profile-navigation.spec.ts` | Edição de perfil do prestador, foto, anos de experiência e visualização pública |
| `07-geolocation-and-tracking.spec.ts` | Filtro por raio de atendimento geográfico, cálculo de distância e acompanhamento ao vivo |

Para executar:
```bash
# Execução headless completa
npm run test:e2e

# Execução com visualização e depurador gráfico
npm run test:e2e:ui
```

---

## ⚙️ Configuração de Variáveis de Ambiente

### Backend (`WorkEzApi`)

Em desenvolvimento local, a API opera de fábrica utilizando banco **In-Memory** e autenticação JWT padrão configurada em [`appsettings.Development.json`](file:///d:/Projetos/WorkEz/WorkEzApi/WorkEz.WebUID/appsettings.Development.json). Para conectar ao PostgreSQL ou AbacatePay:

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

Configurado no arquivo `WorkEzApp/.env` (baseie-se no [`WorkEzApp/.env.example`](file:///d:/Projetos/WorkEz/WorkEzApp/.env.example)):

```env
# Desenvolvimento local (Web, Emuladores ou Mobile com auto-resolução de host):
EXPO_PUBLIC_API_URL=http://localhost:5065

# Produção na nuvem (Render):
# EXPO_PUBLIC_API_URL=https://workez-api.onrender.com
```

---

## 🌐 Deploy e Infraestrutura

### Backend no Render.com
O projeto inclui suporte a contêineres Docker e IaC via [`render.yaml`](file:///d:/Projetos/WorkEz/render.yaml):
- **Runtime**: Docker multi-stage build ([`Dockerfile`](file:///d:/Projetos/WorkEz/WorkEzApi/Dockerfile)).
- **Health Check**: Monitoramento contínuo em `/health`.
- **Banco de Dados**: Compatível com PostgreSQL Neon DB em nuvem.

### Frontend Mobile & Web
- **Web**: Exportável como aplicação web estática ou servida pelo Metro/Node.
- **Mobile**: Geração de binários APK/AAB (Android) e IPA (iOS) via **EAS Build** (Expo Application Services).

---

## 👥 Licença e Autoria

Projeto acadêmico e profissional desenvolvido para o ecossistema **WorkEz**.  
Distribuído sob a licença **MIT**. Sinta-se livre para utilizar, contribuir e sugerir melhorias! 🤝
