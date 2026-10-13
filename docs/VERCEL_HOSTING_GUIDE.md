# 🚀 Guia de Hospedagem e Deploy na Vercel (WorkEz)

Este guia orienta como subir todo o ecossistema WorkEz (Frontend Web + API .NET) utilizando a **Vercel** como porta de entrada unificada.

---

## 1. Visão Geral da Topologia

```
[ Usuário / Navegador / Mobile ]
               │
               ▼
   https://workez.vercel.app  (Vercel)
               ├── / (App Web - Expo Web Build)
               └── /api/*  ──(Reverse Proxy vercel.json)──►  https://workez-api.onrender.com
                                                                     │
                                                                     ▼
                                                         [ API .NET 10 (Docker) ]
                                                                     │
                                                                     ▼
                                                         [ PostgreSQL Neon Tech ]
```

---

## 2. Como Fazer o Deploy na Vercel

### Opção A: Conectando o Repositório GitHub à Vercel (Recomendado)
1. Acesse [vercel.com](https://vercel.com) e crie um novo projeto importando o repositório `WorkEz`.
2. A Vercel detectará automaticamente o arquivo [`vercel.json`](file:///D:/Dev/WorkEz/vercel.json) na raiz do projeto.
3. Configure as seguintes variáveis de ambiente no painel da Vercel (Settings -> Environment Variables):
   - `EXPO_PUBLIC_API_URL`: `https://workez-api.onrender.com` (ou a URL do proxy `/api`)
4. Clique em **Deploy**.

### Opção B: Deploy via Vercel CLI
Na raiz do projeto (`D:\Dev\WorkEz`), execute:
```bash
npm i -g vercel
vercel deploy --prod
```

---

## 3. Como Subir a API .NET no Render (Docker)
1. O repositório já inclui o arquivo [`render.yaml`](file:///D:/Dev/WorkEz/render.yaml) e o [`WorkEzApi/Dockerfile`](file:///D:/Dev/WorkEz/WorkEzApi/Dockerfile).
2. No painel do [render.com](https://render.com), crie um novo **Blueprint** apontando para o repositório.
3. As variáveis de conexão com o banco Neon Tech e credenciais de SMTP serão aplicadas automaticamente.

---

## 4. Configuração do Envio de E-mails (SMTP)

Para ativar o envio real de e-mails em produção, configure as variáveis de ambiente no serviço da API:
- `Smtp__Host`: Exemplo: `smtp.sendgrid.net`, `smtp.resend.com` ou `smtp.gmail.com`
- `Smtp__Port`: `587`
- `Smtp__Username`: Seu usuário ou chave de API SMTP
- `Smtp__Password`: Sua senha ou token
- `Smtp__FromEmail`: `contato@seudominio.com.br`
- `Smtp__FromName`: `WorkEz Plataforma`

> **Modo Desenvolvimento:** Se as variáveis `Smtp__Host` e `Smtp__Username` estiverem vazias, o serviço ativa automaticamente o **Dev Email Simulator**, registrando todo o HTML e dados do e-mail nos logs sem falhar requisições.
