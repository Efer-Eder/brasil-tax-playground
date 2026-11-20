# Como contribuir

Obrigado pelo interesse! O projeto está no começo, então issues com dúvidas, correções de documentação e relatos de divergência com o upstream são muito bem-vindos.

## Regras do projeto

1. **Não adicione alíquotas, fórmulas ou regras fiscais ao código.** Todo número precisa vir do motor oficial. PRs que calculem tributos na aplicação serão recusados. Veja [docs/compliance-notes.md](docs/compliance-notes.md).
2. Contratos com o upstream precisam de fonte: link para o arquivo no repositório oficial, com tag ou commit.
3. Exemplos e testes usam dados fictícios, identificados como tal.
4. Nada de segredos, dados pessoais ou dados fiscais reais em commits, issues ou fixtures.

## Ambiente

```powershell
npm ci
npm run dev
```

Antes de abrir um PR:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Commits e PRs

- A branch `main` é protegida: não aceita force push nem exclusão, e um PR só entra com os checks do CI passando (lint, typecheck, testes e build no Ubuntu e no Windows, E2E e gitleaks).
- Mensagens no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (`feat:`, `fix:`, `docs:`, `test:`, `chore:`...).
- PRs pequenos e focados, com descrição do que mudou e como foi testado.
- Atualize `CHANGELOG.md` (seção *Não lançado*) quando a mudança for visível para quem usa.

Ao participar, você concorda com o [Código de Conduta](CODE_OF_CONDUCT.md).
