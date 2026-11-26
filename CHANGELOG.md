# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado

- Comparação de duas simulações do histórico, campo a campo, com os valores como o motor devolveu.
- Content-Security-Policy com nonce por requisição em todas as páginas (as páginas passam a ser renderizadas por requisição).
- Job semanal de CI que compila os três motores oficiais nos commits fixados e roda contrato, regressão e paridade; regressão do Simples Nacional e do DANFSe (PDF idêntico byte a byte).
- Rascunhos de issues para o upstream em `docs/upstream/rascunhos-de-issues.md` (não enviados).

## [0.1.0] - 2026-11-21

Primeira versão marcada. Tudo o que está abaixo está no ar em https://efer.online/projeto/brasil-tax-playground, com os três motores oficiais: regime regular 1.7.2 (base V0073), Simples Nacional 1.0.2 e gerador de DANFSe 1.0.0.

### Adicionado (Simples Nacional e DANFSe)

- Motor oficial do Simples Nacional 1.0.2 (endpoint não assistido): formulário guiado em 5 etapas, modo desenvolvedor com exemplos, atividades (cAtivSN) e erros VSN pelos dados abertos, resolução das alíquotas no resultado.
- Gerador oficial de DANFSe 1.0.0: XML da NFS-e vira PDF, com exemplo fictício, importação, situação da nota e canhoto.
- Seletor de motor no simulador; status de cada serviço em `/api/engine/{motor}/status` e na página inicial.
- Compose com os três serviços, imagens endurecidas e `-XX:-UseBASE64Intrinsics` nas JVMs, como pedem os CHANGELOGs do upstream.

### Corrigido

- O BFF reescrevia a entrada e a saída (o zod reordenava chaves e o corpo era reenviado reconstruído). Agora o texto original vai ao motor e a resposta volta como o motor mandou.
- A validação do BFF era mais restritiva que o motor e recusava 46 payloads oficiais do upstream. Agora só o envelope é exigido, e os erros de campo vêm do motor, por item.
- Leitura do corpo com limite, sem carregar corpos grandes inteiros na memória; o endereço interno do motor saiu das respostas públicas.

### Adicionado

- Formulário guiado em 5 etapas, montado a partir do OpenAPI e dos dados abertos do motor, e modo desenvolvedor com importar, validar, formatar e copiar, os dois pelo mesmo caminho de cálculo.
- Tabelas de resultado com os rótulos publicados pelo motor, grupo `oper`, exportação CSV e histórico local.
- `GET /api/dados-abertos/*` com lista branca, contrato OpenAPI versionado, teste de paridade com os payloads do upstream e cabeçalhos de segurança.
- Templates de issue e de pull request; `DEVELOPMENT_REPORT.md`.

- READMEs em pt-BR e en-US reescritos, com banner e GIFs animados gerados a partir de telas reais da instância pública (`scripts/readme/`).

- Página do projeto no visual do efer.online (Studio Graphite), escrita para devs, e card ao vivo do GitHub (estrelas, commits, issues, PRs, contribuidores e último CI) via `GET /api/github` com cache de 15 min.
- Card do projeto no hub de efer.online.

- Instância pública em https://efer.online/projeto/brasil-tax-playground/ com API em `/api/brasil-tax-playground/`: Docker Compose (motor oficial + app), Nginx com rate limit, fila com limite de concorrência, teto de 50 itens, timeouts em camadas e CORS aberto. Medições e contas em `docs/deploy-efer-online.md`.
- Build standalone com `NEXT_BASE_PATH` e script `deploy/deploy.ps1`.

- Fixtures gravadas do motor oficial 1.7.2 (3 cenários), teste de paridade resposta × tela, regressão contra o motor real e E2E com Playwright usando replay das fixtures.

- Página `/simular` com editor JSON, exemplos fictícios, resultado por item, memória de cálculo do motor, inspetor e exportação JSON.
- Rota `POST /api/simular/regime-regular` com validação estrutural e mapeamento explícito de erros (400/422/503/504/502).

- App Next.js + TypeScript + Tailwind com página inicial de escopo (CBS, IBS, IS).
- Aviso persistente "Ferramenta independente, não oficial e não substitui orientação contábil ou tributária".
- `lib/tax-engine/`: tipos, configuração via `REGIME_REGULAR_ENGINE_URL`, schemas zod espelhando `OperacaoInput` do upstream (1.7.2) e cliente HTTP do regime regular com timeout e erros tipados.
- Rota `GET /api/engine/status` e painel de status do motor (não configurado / indisponível / disponível).
- Simples Nacional e DANFSe registrados como planejados.
- Testes de contrato opt-in contra o motor real (`npm run test:contract`).
- Testes Vitest, documentação do upstream, notas de conformidade, ADRs e CI (lint, typecheck, testes, build e gitleaks).
