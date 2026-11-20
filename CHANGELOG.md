# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado

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
