# Brasil Tax Playground

[English](README.en.md)

> **Em desenvolvimento.** Ainda não há formulário de simulação. Hoje o app mostra o escopo do projeto e verifica se o motor oficial está configurado e respondendo.

> Ferramenta independente, não oficial e não substitui orientação contábil ou tributária. Sem vínculo com a Receita Federal.

Interface web educacional para estudar os **motores de código aberto da Reforma Tributária do Consumo** (CBS, IBS e Imposto Seletivo) publicados pela Receita Federal no GitHub. A ideia é preencher uma operação, enviar ao motor que **você** roda localmente e ver o resultado, a memória de cálculo e o JSON técnico.

Princípio central: **nenhuma alíquota, regra ou cálculo fiscal é inventado aqui**. Todo número exibido virá da resposta do motor oficial, com a versão dele. Sem motor disponível, o app diz isso e não mostra valores.

## O que existe hoje

- Página inicial com o escopo (CBS, IBS, IS) e o aviso legal fixo em todas as páginas.
- Painel de status do motor de regime regular: *não configurado*, *indisponível* ou *disponível* (com a versão informada pelo motor).
- `lib/tax-engine/`: tipos, configuração por variável de ambiente, schemas zod que espelham a entrada do upstream e cliente HTTP do regime regular com timeout e erros tipados.
- Testes Vitest da configuração, dos schemas e do tratamento de indisponibilidade.

| Integração | Estado neste projeto |
|---|---|
| [Regime regular](https://github.com/ReceitaFederal/calculadora-rtc-regime-regular) | Em integração (adapter e status prontos; formulário pendente) |
| [Simples Nacional](https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional) | Planejado |
| [Gerador DANFSe](https://github.com/ReceitaFederal/calculadora-rtc-gerador-danfse) | Planejado (gera PDF a partir de XML; não calcula tributos) |

## Rodar localmente (Windows)

Pré-requisitos: Node.js 20.9+ (testado com Node 24) e npm.

```powershell
git clone https://github.com/Efer-Eder/brasil-tax-playground.git
cd brasil-tax-playground
npm ci
copy .env.example .env.local
npm run dev
```

Abra http://localhost:3000. Sem motor configurado, o painel mostra **Não configurado** — esse é o comportamento esperado.

### Conectar o motor oficial

O motor de regime regular é uma API Java 25 / Spring Boot que roda na sua máquina. Os passos (gerar o banco SQLite com Flyway e subir com o perfil `offline`) estão em [docs/upstream-integration.md](docs/upstream-integration.md), com links e o commit consultado. Com ele rodando, defina em `.env.local`:

```env
REGIME_REGULAR_ENGINE_URL=http://localhost:8080/api
```

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e execução de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Tipos de rotas do Next + `tsc --noEmit` |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:contract` | Testes de contrato contra um motor real (`CONTRACT_ENGINE_URL`) |

## Documentação

- [Integração com os motores oficiais](docs/upstream-integration.md)
- [Notas de conformidade](docs/compliance-notes.md)
- [Decisões de arquitetura (ADRs)](docs/adr/)
- [Progresso](PROGRESS.md) · [Roadmap](ROADMAP.md) · [Changelog](CHANGELOG.md)

## Limitações

- Ainda não há simulação: o formulário do regime regular é o próximo passo.
- A conexão foi verificada contra o motor oficial 1.7.2 rodando localmente (status e contrato); a CI usa `fetch` simulado.
- Sem Docker Compose: o upstream do regime regular não publica Dockerfile (ver [ADR 0003](docs/adr/0003-sem-docker-compose-por-enquanto.md)).

## Contribuir

Veja [CONTRIBUTING.md](CONTRIBUTING.md) e o [Código de Conduta](CODE_OF_CONDUCT.md). Problemas de segurança: [SECURITY.md](SECURITY.md).

## Licença

[MIT](LICENSE) © Efer Eder. Os motores oficiais têm licença (MIT) e titular próprios e não são distribuídos aqui.
