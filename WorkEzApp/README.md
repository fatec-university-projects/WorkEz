# 📱 WorkEzApp — Aplicativo Mobile Cross-Platform

Frontend móvel da plataforma **WorkEz**, construído com **React Native** e **Expo 54**, projetado para conectar clientes e prestadores de serviços com uma experiência fluida, moderna e reativa.

---

## 🚀 Tecnologias e Bibliotecas

- **Framework**: [React Native](https://reactnative.dev/) (v0.81)
- **Meta-Framework & Bundler**: [Expo](https://expo.dev/) (v54.0) & Metro Bundler
- **Roteamento**: [Expo Router](https://docs.expo.dev/router/introduction/) (v6 - Roteamento baseado em arquivos)
- **Linguagem**: [TypeScript](https://www.typescriptlang.org/) (v5.9)
- **Estilização**: [NativeWind](https://www.nativewind.dev/) (v4.2) com TailwindCSS (v3.4)
- **Ícones**: [Lucide React Native](https://lucide.dev/) & `@expo/vector-icons`
- **Armazenamento Local**: `@react-native-async-storage/async-storage` (persistência segura de tokens e sessão)
- **Seleção de Fotos**: `expo-image-picker` e `expo-image`
- **Navegador Embutido**: `expo-web-browser` (para visualização do checkout PIX)

---

## 📂 Estrutura de Pastas

```text
WorkEzApp/
├── app/                          # Rotas e Telas (Expo Router)
│   ├── _layout.tsx               # Root Layout com AuthProvider e Stack global
│   ├── index.tsx                 # Splash Screen de inicialização
│   ├── onboarding.tsx            # Apresentação interativa da plataforma
│   ├── profile-choice.tsx        # Escolha do perfil (Cliente ou Prestador)
│   ├── login.tsx                 # Tela de Login unificada
│   ├── signup.tsx                # Cadastro de Cliente
│   ├── client/                   # Área restrita do Cliente (Route Guard: Customer)
│   │   ├── _layout.tsx           # Layout com Tabs e barra inferior
│   │   ├── index.tsx             # Home de categorias e busca rápida
│   │   ├── describe.tsx          # Abertura de chamado (fotos, descrição e CEP)
│   │   ├── searching.tsx         # Publicação do chamado na API
│   │   ├── tracking/[id].tsx     # Rastreamento ao vivo com WebSocket
│   │   ├── chat/[id].tsx         # Chat em tempo real com o profissional
│   │   ├── payment/[id].tsx      # Pagamento PIX com QR Code
│   │   ├── completed/[id].tsx    # Confirmação de conclusão
│   │   ├── rating/[id].tsx       # Avaliação pós-serviço
│   │   └── services.tsx          # Histórico de chamados
│   └── provider/                 # Área restrita do Prestador (Route Guard: ServiceProvider)
│       ├── _layout.tsx           # Layout com Tabs para prestadores
│       ├── calls.tsx             # Mural de oportunidades e chamados ativos
│       ├── new-call/[id].tsx     # Visualização e aceite do chamado
│       ├── accepted/[id].tsx     # Início de deslocamento
│       ├── in-progress/[id].tsx  # Execução do serviço
│       ├── inform-value/[id].tsx # Definição do valor final cobrado
│       ├── waiting-payment/[id].tsx # Aguardo de confirmação do PIX
│       ├── wallet.tsx            # Carteira e extrato de repasses (85%)
│       ├── portfolio.tsx         # Gestão de portfólio de serviços
│       └── work-area.tsx         # Seleção de especialidades, raio de atuação (km) e mapa
├── components/                   # Componentes de interface reutilizáveis
│   ├── BottomNav.tsx             # Barra de navegação inferior
│   ├── Button.tsx                # Botão com variantes de estilo
│   ├── Input.tsx                 # Campo de entrada de texto com validações
│   ├── ProfessionalCard.tsx      # Card de informações e avaliação do profissional
│   ├── ServiceCard.tsx           # Card de exibição de serviço no histórico
│   ├── RatingCard.tsx            # Exibição de avaliações recebidas (estrelas e comentários)
│   ├── RadiusMapPreview.tsx      # Preview interativo do raio de atendimento no mapa
│   └── ScreenHeader.tsx          # Cabeçalho padronizado com safe-area e botão voltar
├── contexts/                     # Contextos Globais
│   └── AuthContext.tsx           # Gerenciamento de autenticação, login, logout e sessão
├── e2e/                          # Testes automatizados End-to-End com Playwright (7 suítes)
├── services/                     # Integrações e APIs
│   ├── api.ts                    # Cliente HTTP Fetch com interceptador, auto-refresh de JWT e DelFinance BaaS
│   ├── authService.ts            # Métodos de autenticação, registro e logout
│   ├── imageService.ts           # Upload de fotos diretamente para o ImgBB
│   └── storage.ts                # Wrapper seguro em volta do AsyncStorage
├── constants/                    # Constantes e tokens de tema
├── global.css                    # Estilos globais e diretivas do Tailwind
├── app.json                      # Configuração do Expo (nome, ícone, splash, permissões)
└── package.json                  # Dependências e scripts
```

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` dentro da pasta `WorkEzApp/` configurando o endereço da API:

```env
# Emulador iOS ou Web:
EXPO_PUBLIC_API_URL=http://localhost:5065

# Emulador Android (o endereço 10.0.2.2 mapeia para o localhost do computador):
# EXPO_PUBLIC_API_URL=http://10.0.2.2:5065

# Celular físico conectado no mesmo Wi-Fi (substitua pelo seu IP local):
# EXPO_PUBLIC_API_URL=http://192.168.0.15:5065

# Produção na nuvem:
# EXPO_PUBLIC_API_URL=https://workez-api.onrender.com
```

---

## 🏃 Como Executar

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Iniciar o servidor de desenvolvimento**:
   ```bash
   npx expo start
   ```

3. **Opções de execução**:
   - Pressione **`a`** para abrir no emulador Android conectado.
   - Pressione **`i`** para abrir no simulador iOS (macOS).
   - Pressione **`w`** para rodar no navegador Web.
   - Escaneie o **QR Code** no terminal utilizando o aplicativo **Expo Go** em seu smartphone físico.
