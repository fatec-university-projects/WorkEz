# WorkEz — Diretrizes Mandatórias de Desenvolvimento (Always-On)

Este arquivo define os padrões e verificações obrigatórias que devem ser lembrados e aplicados em **toda ação, implementação, refatoração ou correção de bugs** realizada no repositório **WorkEz**.

---

## 1. 🧪 Testes do Backend (WorkEzApi — .NET 10)

Toda alteração em regras de negócio, serviços, controladores, modelos de domínio, infraestrutura ou integrações da API deve respeitar as diretrizes de testes:

- **Lembrar e Manter a Cobertura**:
  - Se um novo endpoint, regra de negócio, cálculo de custódia/taxa ou serviço for criado/alterado, crie ou atualize os testes unitários correspondentes em `WorkEzApi`.
  - Garanta que testes existentes não quebrem.
- **Comando de Testes do Backend**:
  ```powershell
  dotnet test WorkEzApi/WorkEz.WebUID/WorkEz.WebUID.csproj
  ```
- **Foco de Validação**:
  - Regras do leilão de propostas (mão de obra vs. materiais).
  - Máquina de estados do chamado (Solicitado ➔ Aceito ➔ Em Deslocamento ➔ Em Execução ➔ Concluído).
  - Cálculos financeiros de custódia (escrow), carteira do prestador e taxa da plataforma.
  - Segurança, autenticação JWT e validação de DTOs.

---

## 2. 🎭 Testes do Frontend (WorkEzApp — React Native / Expo & Web)

Toda alteração de interface, fluxo de navegação, componentes visuais, gerenciamento de estado ou consumo de rotas deve validar o impacto na experiência do usuário e na suíte de testes:

- **Lembrar e Manter os Testes E2E (Playwright)**:
  - Ao alterar rotas (`app/`), telas de cliente/prestador ou formulários, verifique se os cenários em `WorkEzApp/e2e/*.spec.ts` continuam íntegros ou precisam de ajustes.
  - Se uma nova funcionalidade de ponta a ponta for introduzida, proponha ou adicione o teste E2E correspondente.
- **Comandos de Testes do Frontend**:
  ```powershell
  # A partir da raiz:
  npm run test:e2e

  # Ou dentro de WorkEzApp:
  cd WorkEzApp
  npx playwright test
  ```
- **Uso do MCP Playwright**:
  - Sempre que for conveniente inspecionar visualmente uma página web, verificar formulários, capturar screenshots para validação de layout ou debugar comportamentos antes e depois de alterações, utilize as ferramentas disponíveis no MCP do Playwright (`browser_navigate`, `browser_snapshot`, `browser_click`, `browser_take_screenshot`, etc.).

---

## 3. 🏛️ Padrões de Código & Arquitetura

### Backend (.NET 10 — Clean Architecture)
- **Isolamento Estrito de Camadas**:
  - `WorkEz.Domain`: Contém entidades puras, enums e regras de domínio essenciais. Não depende de nenhuma outra camada ou pacote externo.
  - `WorkEz.Application`: Orquestra casos de uso, serviços de aplicação, DTOs e contratos/interfaces de repositório.
  - `WorkEz.Infra.Data`: Implementa o Entity Framework Core, mapeamentos, migrations e persistência no PostgreSQL (Neon DB).
  - `WorkEz.Infra.Ioc`: Ponto único de injeção de dependência e registro de serviços (`AddScoped`, `AddSingleton`). Novos serviços devem ser registrados aqui.
  - `WorkEz.WebUID`: Controllers enxutos e endpoints. Sempre utilizar validação via DTOs de entrada; nunca expor entidades de banco diretamente na API.
- **Princípios SOLID (com Pragmatismo)**:
  - **SRP (Responsabilidade Única)**: Cada serviço, handler ou controller deve ter propósito específico (evitar "God Services" inflados).
  - **DIP (Inversão de Dependência)**: Casos de uso dependem de abstrações/interfaces em `Application`, nunca de implementações diretas de infraestrutura.
  - **ISP (Segregação de Interfaces)**: Criar interfaces coesas e enxutas para facilitar mocks e testes unitários com xUnit.
  - **Sem Overengineering**: Priorize legibilidade e manutenibilidade; evite criar camadas ou abstrações prematuras para operações triviais.

### Frontend (React Native / Expo + Web)
- **Estilização com NativeWind / TailwindCSS**:
  - Priorizar classes utilitárias do Tailwind (`className="..."`).
  - Evitar estilos inline massivos ou dispersão de `StyleSheet` fora do padrão do projeto.
- **Rotas e Telas Enxutas (`app/`)**:
  - Manter os arquivos de tela focados em renderização de layout e interação do usuário.
  - Extrair lógicas de negócio, cálculos e chamadas HTTP para `services/` ou `hooks/` customizados.
- **Compatibilidade Multiplataforma**:
  - Lembrar que a aplicação é executada no Mobile (iOS / Android) e na Web (Expo Web / Vercel).
  - Respeitar componentes seguros para ambas as plataformas (`SafeAreaView`, layout responsivo e APIs compatíveis).

---

## 4. 📚 Documentação & READMEs Atualizados

Nenhuma alteração arquitetural, de funcionalidade ou de infraestrutura deve ser considerada finalizada sem a devida atualização da documentação:

- **README Principal (`README.md`)**:
  - Mantenha sempre atualizados:
    - O sumário e descrição das funcionalidades.
    - O catálogo de rotas da API e telas do App.
    - Contadores e badges de testes (ex: quantidade de testes unitários xUnit e suítes Playwright).
    - Variáveis de ambiente necessárias (`.env`).
    - Guias de execução e deploy.
- **Documentações Específicas**:
  - Frontend: `WorkEzApp/README.md`.
  - Arquitetura & Decisões: `docs/ARCHITECTURE.md`, `docs/adr/`, `DOCUMENTACAO_TECNICA.md`, `design.md`.
- **Regra de Ouro**: Sempre questione: *"Essa mudança altera como o usuário/desenvolvedor roda o projeto, as variáveis de ambiente ou o comportamento descrito no README?"* Se sim, atualize o documento imediatamente.

---

## 5. ✅ Checklist para Toda Ação

Antes de entregar uma resposta ou concluir uma tarefa:
1. [ ] **Arquitetura**: O código respeita a separação de camadas (.NET) e componentes/hooks enxutos com NativeWind (Expo)?
2. [ ] **Backend**: O código do backend compila sem erros e os testes passam (`dotnet test`)?
3. [ ] **Frontend**: Os componentes/telas afetados foram validados e os fluxos Playwright foram considerados?
4. [ ] **Documentação**: O `README.md` (ou docs específicos) reflete as novas mudanças, endpoints ou flags?
