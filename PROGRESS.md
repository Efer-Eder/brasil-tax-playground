# Progresso

## 2026-11-21 — Auditoria do motor e interface guiada

**Status:** implementado e testado localmente; não publicado (push e deploy aguardam aprovação).

### Feito

- Auditoria do motor 1.7.2 (`32df719`, base V0073), com o motor no Docker local. Paridade com 102 payloads de teste do upstream revelou que o app reescrevia entrada e saída e recusava 46 entradas válidas; corrigido. Hoje: 69 idênticos, 10 erros idênticos, 23 recusados pelos dois.
- Contrato OpenAPI versionado, BFF de dados abertos com lista branca, formulário guiado em 5 etapas, modo desenvolvedor no mesmo caminho, tabelas com rótulos do motor, CSV e histórico local.
- Segurança: corpo com limite, URL interna fora das respostas, cabeçalhos HTTP. Templates de issue e PR.
- Testes: 144 unitários, 7 de contrato e regressão, 104 de paridade, 9 E2E, lint, tipos, build e `npm audit` (0 vulnerabilidades).
- Detalhes, prioridades (P0 a P3) e pendências em [DEVELOPMENT_REPORT.md](DEVELOPMENT_REPORT.md).

### Próximo passo objetivo

Com aprovação: push dos commits locais e deploy em efer.online; depois, regravar os GIFs do README com a interface nova.

## 2026-11-20 — Página do projeto e card do GitHub

**Status:** página do projeto no ar em https://efer.online/projeto/brasil-tax-playground, com card no hub de efer.online.

### Feito

- Visual do app trocado pelos tokens do efer.online (tema grafite, acento índigo, Geist, bordas de 1px), com cabeçalho e rodapé do site e o aviso legal fixo.
- Página inicial reescrita como página do projeto para devs: como funciona (navegador → BFF → motor), regras, API com exemplos de `curl`, limites, códigos de resposta, como rodar local e motores oficiais.
- Card ao vivo do repositório (`GET /api/github`): estrelas, forks, commits, issues e PRs abertos, contribuidores e último CI, com cache de 15 min e fallback para o último dado bom. 8 testes novos; E2E não chama o GitHub real.
- Card no hub (`/var/www/hub/index.html`) com prévia de requisição e resposta usando os valores da fixture real, entrada 03 no índice, rota no tile de infra e linha no changelog. Troca feita só depois de conferir que o hub não tinha mudado (sha256), com backup.
- Homepage do repositório no GitHub aponta para a página do projeto.

### Próximo passo objetivo

Acompanhar uso e latência reais por uma semana e revisar os limites; depois, formulário guiado para a operação.

## 2026-11-20 — Instância pública em efer.online

**Status:** no ar em https://efer.online/projeto/brasil-tax-playground/, com API em https://efer.online/api/brasil-tax-playground/.

### Feito

- Medi o motor com as flags de produção (heap 320 MB, 2 núcleos), localmente: pico de 441 MB, ~407 req/s com 1 item e ~25 req/s com 50 itens.
- Docker Compose com o motor oficial 1.7.2 (rede interna, sem porta publicada, 640 MB / 1,0 CPU) e o app standalone (256 MB / 0,75 CPU, só em 127.0.0.1).
- App: basePath configurável, fila com limite de concorrência (3, fila 32, espera 3 s → 503), teto de 50 itens (413), cache de 60 s da versão do motor e CORS aberto.
- Nginx: rate limit por cliente via `CF-Connecting-IP` (2 req/s, rajada 20), limite global de 30 req/s, 10 conexões por cliente, 429 em JSON, corpo de até 512 KB e timeouts de 15 s.
- Validado em produção: páginas 200, status `disponivel` com 1.7.2/V0073, simulação 200, 51 itens → 413, 40 requisições simultâneas → 10 × 200 e 30 × 429. As rotas públicas dos outros serviços da VPS ficaram iguais antes e depois.
- Medido na VPS: ~30 req/s com 1 item (p50 ~31 ms) e ~6 req/s com 50 itens (p95 ~600 ms); memória do motor 399–474 MB.

### Próximo passo objetivo

Acompanhar latência e uso reais por uma semana (logs do Nginx e `docker stats`) e revisar os limites com dados de tráfego real.

## 2026-11-20 — Fixtures reais, paridade e E2E

**Status:** critérios de teste da v0.1.0 cobertos para o regime regular via editor JSON.

### Feito

- 3 fixtures gravadas do motor real 1.7.2/V0073 (`tests/fixtures/regime-regular/`) por `npm run fixtures:gravar` — nunca escritas à mão.
- Regressão (`test:contract`): reenvia cada requisição ao motor real e exige resposta idêntica → detecta mudança do upstream. 5/5 contra o motor local.
- Paridade (`tests/unit/paridade-fixtures.test.ts`): renderiza a tela a partir de cada fixture e confere versão, estados, erros e memória literais, e que nenhum número decimal exibido fora do JSON deixa de vir do motor. 71 testes unitários.
- E2E Playwright (6/6) com `tests/e2e/fixture-engine.mjs`, servidor de **replay** que só devolve respostas gravadas (422 para requisição sem gravação). Job novo na CI.

### Próximo passo objetivo

Formulário guiado para a operação (gerando o mesmo JSON do editor), mantendo o editor como modo avançado.

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
