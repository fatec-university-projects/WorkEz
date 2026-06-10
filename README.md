# 🚀 WorkEz — Plataforma Multifuncional de Serviços

Bem-vindo ao **WorkEz**! Este repositório contém a solução completa para o ecossistema WorkEz, composto por uma API robusta em .NET e um aplicativo móvel cross-platform moderno construído em React Native com Expo.

---

## 📂 Estrutura do Repositório

O projeto é dividido nos seguintes diretórios principais:

*   **[`api`](file:///d:/Projetos/WorkEz/api)**: Backend construído em **.NET 10** e **C# 12**, utilizando **PostgreSQL** como banco de dados principal com Entity Framework Core.
*   **[`WorkEzApp`](file:///d:/Projetos/WorkEz/WorkEzApp)**: Frontend mobile (Android & iOS) desenvolvido com **React Native**, **Expo (v54)**, **TypeScript** e estilizado com **NativeWind (TailwindCSS)**.
*   **[`WorkEz.Api.Tests`](file:///d:/Projetos/WorkEz/WorkEz.Api.Tests)**: Suíte de testes automatizados para a validação das regras de negócio e serviços da API.

---

## 🛠️ Pré-requisitos

Para rodar a aplicação localmente, certifique-se de possuir instalado em sua máquina:

1.  **[.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)**
2.  **[Node.js (v18+) & npm](https://nodejs.org/)**
3.  **[PostgreSQL](https://www.postgresql.org/)** (caso deseje utilizar uma instância de banco local)
4.  **[Expo Go](https://expo.dev/go)** instalado no seu celular física (ou simuladores configurados de Android Studio / iOS Simulator)

---

## 🚀 Como Rodar o Backend (API)

### 1. Configurar Banco de Dados
A API já está pré-configurada para se conectar a um banco PostgreSQL via Neon DB no arquivo de desenvolvimento. Caso precise alterar para a sua base local, edite o arquivo **[`api/appsettings.json`](file:///d:/Projetos/WorkEz/api/appsettings.json)**:

```json
"ConnectionStrings": {
  "DefaultConnection": "Host=SEU_HOST;Database=SEU_BANCO;Username=SEU_USUARIO;Password=SUA_SENHA;SSL Mode=Require;Trust Server Certificate=true"
}
```

### 2. Rodar a API
Navegue até a pasta `api` e execute o comando do dotnet:

```bash
cd api
dotnet run
```

A API iniciará no endereço local padrão (ex: `http://localhost:5065`).
Ao iniciar em modo de desenvolvimento, a API executará automaticamente as migrações necessárias para preparar o banco de dados.

### 3. Documentação Swagger
Com a API rodando, você pode acessar a documentação interativa dos endpoints pelo navegador:
👉 **`http://localhost:5065/swagger`**

---

## 📱 Como Rodar o Frontend (WorkEzApp)

### 1. Instalar as Dependências
Navegue até o diretório do aplicativo e instale as dependências com `npm`:

```bash
cd WorkEzApp
npm install
```

### 2. Iniciar o Servidor Expo
Inicie o Expo CLI:

```bash
npm start
```

### 3. Visualizar o Aplicativo
Após iniciar o servidor Expo, você verá um QR Code no terminal.
*   **No celular físico**: Instale o aplicativo **Expo Go** (disponível na Google Play Store e Apple App Store) e escaneie o QR Code.
*   **No Emulador Android**: Pressione a tecla `a` no terminal (requer Android Studio e emulador configurado).
*   **No Simulator iOS**: Pressione a tecla `i` no terminal (requer macOS e Xcode configurados).

---

## ✨ Tecnologias Utilizadas

### Backend (`api`)
*   **.NET 10** & **C# 12**
*   **Entity Framework Core** com driver **Npgsql** (PostgreSQL)
*   **Autenticação JWT** (JSON Web Tokens)
*   Integração com gateway de pagamentos **Abacate Pay**
*   Injeção de dependência moderna utilizando **Primary Constructors**

### Frontend (`WorkEzApp`)
*   **React Native** & **Expo (v54)** com **Expo Router** (roteamento baseado em arquivos)
*   **TypeScript** para tipagem estática
*   **NativeWind** & **TailwindCSS** para estilização utilitária e responsiva
*   **Reanimated** para micro-animações fluidas e premium
*   **Async Storage** para persistência local de dados (tokens de sessão)
