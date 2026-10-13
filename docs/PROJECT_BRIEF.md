# Project Brief — <Nome do Projeto>

> Fonte de verdade sobre **o que** o produto é, lida por todos os agentes (Arquiteto, Infra,
> Scrum Master, Tech Lead, Developer) antes de qualquer decisão técnica. Decisões de **como**
> construir vivem em `ARCHITECTURE.md`, `CODING_STANDARDS.md` e nos ADRs em `docs/adr/`.
>
> Pode ser preenchido por você ou pelo agente `software-architect` numa entrevista inicial.
> Apague os textos de exemplo entre `<>` ao preencher.

## 1. Visão

<Em 1-3 parágrafos: que problema o produto resolve, para quem, e o que o diferencia.>

## 2. Propriedades não-negociáveis

Os critérios que **todos** os agentes usam para aceitar ou rejeitar uma decisão, uma história ou
um PR. Mantenha a lista curta (2-4 itens) e verificável.

1. **<Propriedade>** — <o que significa na prática e como se verifica>.
   _Ex.: "Genericidade — o core não conhece nenhum domínio específico; novos tipos são
   configuração, não código."_
2. **<Propriedade>** — <…>.
   _Ex.: "Escalabilidade — suportar crescimento de tenants e volume sem redesenho estrutural."_

## 3. Usuários e papéis

- **<Papel>** — <o que faz no sistema>.

## 4. Conceitos de domínio (rascunho)

Formalizados depois pelo Arquiteto em `DOMAIN_MODEL.md`.

- **<Conceito>** — <definição curta>.

## 5. Requisitos não-funcionais

Marque o que se aplica e remova o resto.

- **Escala esperada:** <usuários, volume de dados, picos>.
- **Multi-tenancy / isolamento de dados:** <sim/não, nível de isolamento>.
- **Segurança e permissionamento:** <requisitos>.
- **Disponibilidade / SLA:** <…>.
- **Auditabilidade / compliance (LGPD etc.):** <…>.
- **Observabilidade:** logs, métricas e alertas desde o primeiro ambiente.
- **Restrições:** <stack que o time domina, orçamento, prazo, hospedagem obrigatória…>.

## 6. Fora de escopo

- Escolha de stack, banco, nuvem e estilo arquitetural — decidido **com o usuário** pelo
  Arquiteto e registrado em ADRs.
- Backlog detalhado — responsabilidade do Scrum Master a partir dos documentos técnicos.
- <Funcionalidades explicitamente fora desta versão.>
