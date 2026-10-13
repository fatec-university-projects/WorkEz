# ADR 0001: Fluxo de Envio de E-mails com Factory Pattern e Hospedagem Híbrida Vercel

- **Status:** Aceito
- **Data:** 2026-10-13
- **Decisores:** Arquiteto de Software, Tech Lead, Engenheiro de Infraestrutura

## Contexto
O ecossistema WorkEz necessita de um canal transacional de comunicação por e-mail para notificar clientes e prestadores sobre:
1. Atualizações de status do pedido/negociação;
2. Aceite de solicitações pelo prestador/fornecedor;
3. Finalização e confirmação de pagamento;
4. Cadastro de novos usuários na plataforma;
5. Fluxos de orçamentos e propostas de preços.

Além disso, o fluxo completo da aplicação precisa ser integrável e publicável via Vercel.

## Alternativas Consideradas

### Para Geração e Envio de E-mails
1. **Templates inline codificados no Controller/Application Service:**
   - *Contra:* Violação de SRP, alto acoplamento com a camada web, difícil manutenção visual.
2. **Factory de Templates no Domínio (`EmailTemplateFactory`) + Inversão de Controle com `IEmailService`:**
   - *Pró:* Desacoplamento total; cada tipo de e-mail possui seu próprio método e layout responsivo; o domínio comanda a intenção de envio sem se prender ao protocolo SMTP; suporta simulador de desenvolvimento sem dependências externas.
   - *Decisão:* Adotada a **Alternativa 2**.

### Para Hospedagem na Vercel
1. **Compilação da API .NET 10 em Serverless Vercel (Community Runtimes):**
   - *Contra:* Instabilidade, ausência de suporte nativo a .NET 10 pela Vercel, alto risco de cold starts longos e timeout em transações de banco de dados PostgreSQL.
2. **Arquitetura Híbrida (Vercel Frontend + Reverse Proxy + API em Container Docker):**
   - *Pró:* Estabilidade industrial; backend ASP.NET Core roda em container gerenciado (`Dockerfile` + `render.yaml`); a Vercel atua como host do front e proxy unificado (`vercel.json`), expondo `/api/*` e o app sob o mesmo domínio sem conflitos de CORS.
   - *Decisão:* Adotada a **Alternativa 2**.

## Consequências
- A camada de domínio orquestra os 4 novos gatilhos mantendo as invariantes do negócio.
- O time possui 100% dos testes unitários passando em ambiente local e em pipelines de CI.
- O deploy na Vercel está habilitado com um único comando ou integração com o GitHub.
