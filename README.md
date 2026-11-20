# Brasil Tax Playground

[English](README.en.md)

> **Em desenvolvimento.** Já dá para enviar uma operação do regime regular ao motor oficial pelo editor JSON e ver a resposta. O formulário guiado ainda não existe.

> Ferramenta independente, não oficial e não substitui orientação contábil ou tributária. Sem vínculo com a Receita Federal.

**Página do projeto e instância pública:** <https://efer.online/projeto/brasil-tax-playground> (motor oficial 1.7.2, simulador, documentação da API e um card ao vivo do repositório com commits, issues, PRs e o último CI). Detalhes e limites em [docs/deploy-efer-online.md](docs/deploy-efer-online.md).

Interface web educacional para estudar os **motores de código aberto da Reforma Tributária do Consumo** (CBS, IBS e Imposto Seletivo) publicados pela Receita Federal no GitHub. A ideia é preencher uma operação, enviar ao motor que **você** roda localmente e ver o resultado, a memória de cálculo e o JSON técnico.

Princípio central: **nenhuma alíquota, regra ou cálculo fiscal é inventado aqui**. Todo número exibido virá da resposta do motor oficial, com a versão dele. Sem motor disponível, o app diz isso e não mostra valores.

## O que existe hoje

- Página inicial com o escopo (CBS, IBS, IS) e o aviso legal fixo em todas as páginas.
- Página `/simular`: editor JSON com três exemplos fictícios, envio ao motor pelo BFF (`POST /api/simular/regime-regular`), estado de cada item, erros, memória de cálculo (texto do próprio motor), versão do motor, inspetor de requisição/resposta e exportação em JSON.
- Página do projeto no visual do efer.online, escrita para devs: como funciona, API, como rodar local e motores oficiais.
- Card do repositório com dados ao vivo da API do GitHub (estrelas, forks, commits, issues e PRs abertos, contribuidores e último run de CI), com cache de 15 minutos no servidor. Atualiza sozinho; não precisa de deploy.
- Painel de status do motor de regime regular: *não configurado*, *indisponível* ou *disponível* (com a versão informada pelo motor).
- `lib/tax-engine/`: tipos, configuração por variável de ambiente, schemas zod que espelham a entrada do upstream e cliente HTTP do regime regular com timeout e erros tipados.
- Testes Vitest da configuração, dos schemas e do tratamento de indisponibilidade.

| Integração | Estado neste projeto |
|---|---|
| [Regime regular](https://github.com/ReceitaFederal/calculadora-rtc-regime-regular) | Em integração (simulação via editor JSON; formulário guiado pendente) |
| [Simples Nacional](https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional) | Planejado |
| [Gerador DANFSe](https://github.com/ReceitaFederal/calculadora-rtc-gerador-danfse) | Planejado (gera PDF a partir de XML; não calcula tributos) |

## API pública

Sem cadastro e sem chave, com CORS aberto:

```powershell
curl.exe https://efer.online/api/brasil-tax-playground/engine/status
curl.exe -X POST https://efer.online/api/brasil-tax-playground/simular/regime-regular -H "Content-Type: application/json" --data-binary "@operacao.json"
```

O corpo é a operação no formato `OperacaoInput` do motor oficial (veja os exemplos na página `/simular`). A resposta traz a requisição, a resposta crua do motor, a versão dele e o aviso `x-warning-dados-simulados`, quando o motor envia.

Limites da instância: 2 req/s por cliente (rajada de 20), até 50 itens por operação e corpo de até 512 KB. Acima disso a API responde 429, 413 ou 503 com `Retry-After`. Para volume maior, rode o motor localmente.

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
| `npm run test:e2e` | Playwright (rode `npm run build` antes); usa um servidor de replay das respostas gravadas do motor |
| `npm run fixtures:gravar` | Regrava as fixtures a partir de um motor real (`CONTRACT_ENGINE_URL` + `RECORD_FIXTURES=1`) |
| `npm run test:contract` | Testes de contrato contra um motor real (`CONTRACT_ENGINE_URL`) |

## Documentação

- [Integração com os motores oficiais](docs/upstream-integration.md)
- [Notas de conformidade](docs/compliance-notes.md)
- [Instância pública: arquitetura, medições e limites](docs/deploy-efer-online.md)
- [Decisões de arquitetura (ADRs)](docs/adr/)
- [Progresso](PROGRESS.md) · [Roadmap](ROADMAP.md) · [Changelog](CHANGELOG.md)

## Limitações

- A entrada é um editor JSON; o formulário guiado ainda não existe.
- A conexão foi verificada contra o motor oficial 1.7.2 rodando localmente (status e contrato); a CI usa `fetch` simulado.
- O Docker Compose em `deploy/` é o da instância pública ([ADR 0005](docs/adr/0005-instancia-publica-em-efer-online.md)); para desenvolvimento local, o motor continua rodando direto com Java.

## Contribuir

Veja [CONTRIBUTING.md](CONTRIBUTING.md) e o [Código de Conduta](CODE_OF_CONDUCT.md). Problemas de segurança: [SECURITY.md](SECURITY.md).

## Licença

[MIT](LICENSE) © Efer Eder. Os motores oficiais têm licença (MIT) e titular próprios e não são distribuídos aqui.
