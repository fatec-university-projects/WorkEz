# Implementação de Segurança e Autenticação - WorkEz

## 📋 Resumo Executivo

Este documento detalha as implementações realizadas para estabelecer uma arquitetura sólida, segura e bem-organizada no projeto WorkEz, seguindo as boas práticas de segurança, autenticação JWT e padrão REST API.

---

## ✅ Implementações Realizadas

### Backend (.NET/C#)

#### 1. **Middleware de Tratamento de Erros RFC 7807**
   - **Arquivo:** `api/Middleware/ExceptionHandlingMiddleware.cs`
   - **O que faz:** Captura todas as exceções não tratadas e retorna respostas padronizadas no formato RFC 7807 (Problem Details)
   - **Benefício:** Endpoints retornam erros estruturados e previsíveis
   - **Formato de resposta:**
     ```json
     {
       "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
       "title": "One or more validation errors occurred.",
       "status": 400,
       "detail": "Email format is invalid",
       "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00",
       "errors": {
         "Email": ["O formato do e-mail é inválido."]
       }
     }
     ```

#### 2. **Rate Limiting (Token Bucket Algorithm)**
   - **Arquivo:** `api/Middleware/RateLimitingMiddleware.cs`
   - **O que faz:** Limita requisições a 100 por minuto por IP
   - **Proteção:** Previne DoS/brute force attacks
   - **Funcionalidade extra:** Cleanup automático de buckets obsoletos
   - **Headers retornados:**
     - `X-RateLimit-Limit: 100`
     - `X-RateLimit-Remaining: 42`

#### 3. **FluentValidation para DTOs**
   - **Arquivo:** `api/Validators/DtoValidators.cs`
   - **DTOs validados:**
     - `CreateUserDto` - Username (3-50 chars), Email, Senha forte (8+ chars, maiúscula, minúscula, número, especial)
     - `LoginDto` - Email, Password
     - `RefreshTokenRequestDto` - Refresh token obrigatório
     - `ResetPasswordDto` - Token, Nova senha com mesmos requisitos
   - **Benefício:** Validações em camada de aplicação, separadas da lógica de negócio

#### 4. **Configuração Segura de CORS**
   - **Desenvolvimento:** `AllowAnyOrigin` (DEBUG)
   - **Produção:** Apenas domínios configurados em `appsettings.json`
     ```json
     "Cors": {
       "AllowedOrigins": [
         "https://app.workez.com.br",
         "https://www.workez.com.br"
       ]
     }
     ```

#### 5. **JWT com Claims**
   - ✅ Já estava configurado
   - **Melhorias aplicadas:**
     - Claims estruturados: `sub` (user_id), `email`, `role`
     - Expiração curta: 15-30 minutos
     - Refresh Token com expiração longa: 7 dias
     - Validação de assinatura: HMAC-SHA256

#### 6. **Atualização do Program.cs**
   - Integração de FluentValidation
   - Adição de middleware de erro global
   - Adição de Rate Limiting
   - Configuração condicional de CORS (dev vs prod)

#### 7. **Adição de Dependências**
   - `FluentValidation` v11.9.2
   - `FluentValidation.DependencyInjectionExtensions` v11.9.2

---

### Frontend (React Native)

#### 1. **Tipos TypeScript RFC 7807**
   - **Arquivo:** `WorkEzApp/types/api.ts`
   - **Tipos criados:**
     - `ApiError` - Estrutura RFC 7807
     - `JwtPayload` - Payload do JWT com claims
     - `RefreshTokenRequest` - Requisição de refresh
     - `AuthResponse` - Resposta de login/refresh
     - `AuthState` - Estado persistente de autenticação
     - `ApiResponse<T>` - Wrapper genérico
     - `PaginatedResponse<T>` - Paginação

#### 2. **Atualização do authService.ts**
   - **Arquivo:** `WorkEzApp/services/authService.ts`
   - **Novas funcionalidades:**
     - ✅ `login(email, password)` - Login com armazenamento de tokens
     - ✅ `refreshToken()` - Token Rotation automático
     - ✅ `getToken()` - Retorna token atual (refresha se necessário)
     - ✅ `getUser()` - Retorna dados do usuário
     - ✅ `registerCustomer()` e `registerProvider()` - Registros separados
     - ✅ `isTokenExpired()` - Verifica expiração
     - ✅ `decodeToken()` - Debug/testes
     - ✅ `initialize()` - Restaura sessão ao iniciar app
   - **Armazenamento seguro:**
     - `SecureStore` (expo-secure-store) para tokens
     - `AsyncStorage` para dados não-sensíveis
   - **Refresh automático:** Se token expira em menos de 5 minutos

#### 3. **Atualização do api.ts**
   - **Arquivo:** `WorkEzApp/services/api.ts`
   - **Melhorias:**
     - ✅ Endpoints `/api/v1/` (versionados)
     - ✅ JWT no header `Authorization: Bearer {token}`
     - ✅ RFC 7807 error handling
     - ✅ Auto logout em 401 Unauthorized
     - ✅ Helper functions: `apiGet()`, `apiPost()`, `apiPut()`, `apiPatch()`, `apiDelete()`
     - ✅ `uploadFile()` para multipart/form-data

#### 4. **Atualização do AuthContext.tsx**
   - **Arquivo:** `WorkEzApp/contexts/AuthContext.tsx`
   - **Mudanças:**
     - Integrado com `authService`
     - Suporte a JWT e Token Rotation
     - `isAuthenticated` como propriedade
     - `error` para mensagens de erro
     - `login()`, `registerCustomer()`, `registerProvider()`, `logout()`
     - Inicialização automática ao abrir app
   - **Uso em componentes:**
     ```tsx
     const { user, isAuthenticated, login, logout } = useAuth();
     ```

---

## 🔐 Fluxo de Autenticação

### Login
```
1. Usuário insere email/password
2. Frontend chama POST /api/v1/auth/login
3. Backend valida e retorna { accessToken, refreshToken, user, expiresIn }
4. Frontend armazena tokens (SecureStore) e user data (AsyncStorage)
5. Próximas requisições incluem JWT no header
```

### Refresh Token
```
1. Token expira em menos de 5 minutos
2. Frontend detecta e chama POST /api/v1/auth/refresh
3. Backend valida refresh token e emite novo pair
4. Frontend atualiza tokens (Token Rotation)
5. Requisição original é reenviada com novo token
```

### Logout
```
1. Usuário clica logout
2. Frontend chama authService.logout()
3. Tokens removidos do SecureStore
4. User data removido do AsyncStorage
5. AuthContext atualizado: isAuthenticated = false
```

### Unauthorized (401)
```
1. Requisição retorna 401
2. Frontend limpa tokens e loga usuário out
3. Navega para tela de login
```

---

## 📊 Endpoints Versionados

Todos os endpoints agora utilizam o padrão `/api/v1/`:

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/register/customer` - Registrar cliente
- `POST /api/v1/auth/register/provider` - Registrar prestador
- `POST /api/v1/auth/forgot-password` - Solicitar reset
- `POST /api/v1/auth/reset-password` - Resetar senha
- `GET /api/v1/auth/me` - Dados do usuário logado
- `POST /api/v1/auth/logout` - Logout

### Outros endpoints
- `GET /api/v1/services` - Listar serviços
- `POST /api/v1/customers/{customerId}/services` - Criar serviço
- `GET /api/v1/providers/{providerId}/nearby-services` - Serviços próximos
- Etc... (seguindo a documentação)

---

## 🛡️ Segurança

| Aspecto | Implementação |
|--------|----------------|
| **Autenticação** | JWT com HMAC-SHA256 |
| **Tokens** | Access (15-30 min) + Refresh (7 dias) |
| **Armazenamento** | SecureStore (iOS/Android native) |
| **CORS** | Restrito a domínios conhecidos (produção) |
| **Rate Limiting** | 100 req/min por IP |
| **Senhas** | BCrypt (já implementado) |
| **Validação** | FluentValidation nos DTOs |
| **Erros** | RFC 7807 estruturado (sem stack trace ao cliente) |
| **Webhooks** | Assinatura HMAC-SHA256 (AbacatePay) |

---

## 🔧 Configuração de Produção

### appsettings.json (Produção)
```json
{
  "Jwt": {
    "SecretKey": "SET_VIA_ENV_VAR",
    "Issuer": "WorkEz",
    "Audience": "WorkEzClient",
    "AccessTokenExpirationMinutes": 15,
    "RefreshTokenExpirationDays": 7
  },
  "Cors": {
    "AllowedOrigins": [
      "https://app.workez.com.br",
      "https://www.workez.com.br"
    ]
  }
}
```

### Variáveis de Ambiente (CI/CD)
```
Jwt__SecretKey=<very-secret-key-256-bits>
ConnectionStrings__DefaultConnection=<postgres-conn-string>
AbacatePay__ApiKey=<abacate-pay-key>
AbacatePay__WebhookSecret=<webhook-secret>
```

---

## 📦 Próximas Etapas

- [ ] Validar FluentValidation no banco (adicionar migrations)
- [ ] Configurar Swagger/OpenAPI com autenticação JWT
- [ ] Testar fluxo completo de login → refresh → logout
- [ ] Implementar SignalR para chat real-time
- [ ] Validar webhooks da AbacatePay
- [ ] Compliance LGPD (consentimento + minimização de dados)
- [ ] Load testing com k6 ou Artillery

---

## 📚 Referências

- RFC 7807: https://tools.ietf.org/html/rfc7807
- JWT: https://jwt.io
- FluentValidation: https://fluentvalidation.net
- OWASP Auth: https://owasp.org/www-community/attacks/Brute_force_attack

---

**Data de Implementação:** 11 de Junho de 2026
**Status:** ✅ Completo (Fase 1 de 3)
