# Progresso

## 2026-11-20 — Primeira simulação de ponta a ponta

**Status:** regime regular simulável pelo editor JSON, verificado contra o motor oficial 1.7.2 local.

### Feito

- `lib/simulation/regime-regular.ts`: valida o JSON (zod), chama `calcularComObservabilidade`, consulta a versão e devolve requisição + resposta crua. Erros: JSON inválido 400, validação 422 (com caminhos), não configurado 503, indisponível 503/504, erro do motor 502 (corpo ProblemDetail preservado), contrato 502.
- `POST /api/simular/regime-regular` (limite de 500 KB).
- `/simular`: editor JSON, 3 exemplos fictícios, estado por item, erros (`code`, `title`, `detail`, `pointer`), memória de cálculo como texto do motor, valores do item em JSON, totais, aviso `x-warning-dados-simulados`, versão do motor, inspetor e exportação JSON.
- Verificado no navegador contra o motor: item único → `CALCULADO`; erro em um item → item 2 `INCONSISTENCIA_ENTRADA` `REG-005`; entrada inválida → 422 local com 3 problemas.
- 49 testes unitários.

### Próximo passo objetivo

Gravar as respostas reais dos três exemplos como fixtures (com versão 1.7.2/V0073) e criar o teste de paridade "resposta do motor × o que a tela mostra"; depois, Playwright para o fluxo `/simular`.

## 2026-11-20 — Motor oficial rodando localmente

**Status:** integração de status verificada contra o motor real; simulação na UI ainda não existe.

### Feito

- Motor `calculadora-rtc-regime-regular` 1.7.2 (`32df719`) clonado **fora** do repositório, banco gerado com Flyway (73 migrações, `V0073`) e subido com o perfil `offline` usando Java 25 (Temurin 25.0.3) — sem Docker.
- Painel do app mostrou **Disponível** com `versaoApp 1.7.2` / `versaoDb V0073`.
- Exemplo oficial de observabilidade reproduziu os totais documentados no upstream.
- Novo `npm run test:contract` (opt-in via `CONTRACT_ENGINE_URL`): 2/2 passando contra o motor; pulado na CI.
- Adapter: `x-warning-dados-simulados` agora é exposto como código cru (`warningDadosSimulados`), porque o upstream envia um número de enum, não texto.
- Pegadinhas do Windows documentadas em `docs/upstream-integration.md` (`core.longpaths`, `JAVA_HOME`).

### Próximo passo objetivo

Criar `POST /api/simular/regime-regular` (BFF chamando `calcularComObservabilidade`) e uma primeira tela que envie uma operação de 2026 sem alíquotas e mostre a resposta crua no inspetor JSON, com a versão do motor.

## 2026-11-20 — Fundação e pesquisa do upstream

**Status:** fundação pronta; MVP de simulação ainda não iniciado.

### Feito

- Pesquisa dos três repositórios oficiais (`gh repo view`/`gh api` + README, exemplos, configs e classes de entrada/saída). Registro em [docs/upstream-integration.md](docs/upstream-integration.md):
  - regime regular: Java 25/Spring Boot 4.1.2, MIT, tag 1.7.2, commit `f1eebd7`; API em `http://localhost:8080/api`;
  - Simples Nacional: Java 25, MIT, tag 1.0.2, commit `a926d5a`; porta 8082;
  - DANFSe: Go, MIT, tag 1.0.0, commit `8d79e6b`; gera PDF, não calcula.
- App Next.js 16 + TypeScript + Tailwind 4, com aviso legal persistente e página de escopo.
- `lib/tax-engine/`: tipos, config por env, schemas zod, cliente HTTP do regime regular, verificação de status; Simples/DANFSe como planejados.
- `GET /api/engine/status` + painel na home. Conferido com `next start`: sem env → `nao-configurado`; URL inacessível → `indisponivel`.
- 36 testes Vitest (config, schemas, erros de rede/timeout/HTTP/contrato, status).
- Documentos padrão, ADRs 0001–0004, CI (Windows + Ubuntu) e gitleaks.

### Decisões

- npm em vez de pnpm (ADR 0004).
- Sem Docker Compose: upstream sem Dockerfile, Docker ausente (ADR 0003).
- O app usa `POST /calculadora/observabilidade/regime-geral` (erros por item) e `GET /calculadora/dados-abertos/versao` (status), e não chama `/versao/status` (contata servidor do governo).

### Pendências / riscos

- O motor oficial ainda **não foi executado** nesta máquina; o cliente foi testado só com `fetch` simulado.
- Contrato de saída validado apenas no envelope (`objetos[].nObj/estadoItem`).

### Próximo passo objetivo

Clonar `calculadora-rtc-regime-regular` na tag `1.7.2` **fora** deste repositório, gerar o banco com `mvnw.cmd flyway:migrate ...`, subir com o perfil `offline`, apontar `REGIME_REGULAR_ENGINE_URL=http://localhost:8080/api` e confirmar que o painel mostra **Disponível** com a versão. Em seguida, gravar a primeira fixture real da observabilidade.
