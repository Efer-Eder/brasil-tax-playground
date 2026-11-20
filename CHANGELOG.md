# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado

- App Next.js + TypeScript + Tailwind com página inicial de escopo (CBS, IBS, IS).
- Aviso persistente "Ferramenta independente, não oficial e não substitui orientação contábil ou tributária".
- `lib/tax-engine/`: tipos, configuração via `REGIME_REGULAR_ENGINE_URL`, schemas zod espelhando `OperacaoInput` do upstream (1.7.2) e cliente HTTP do regime regular com timeout e erros tipados.
- Rota `GET /api/engine/status` e painel de status do motor (não configurado / indisponível / disponível).
- Simples Nacional e DANFSe registrados como planejados.
- Testes Vitest, documentação do upstream, notas de conformidade, ADRs e CI (lint, typecheck, testes, build e gitleaks).
