<div align="center">

<a href="https://efer.online/projeto/brasil-tax-playground"><img src="docs/assets/banner-pt.gif" alt="Brasil Tax Playground: um playground para os motores open source da Reforma Tributária" width="100%"></a>

<p>
<a href="https://github.com/Efer-Eder/brasil-tax-playground/actions/workflows/ci.yml"><img src="https://github.com/Efer-Eder/brasil-tax-playground/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
<a href="https://efer.online/projeto/brasil-tax-playground"><img src="https://img.shields.io/website?url=https%3A%2F%2Fefer.online%2Fapi%2Fbrasil-tax-playground%2Fengine%2Fstatus&label=inst%C3%A2ncia&up_message=no%20ar&down_message=fora%20do%20ar&style=flat-square&up_color=4CB782" alt="Instância pública"></a>
<a href="https://github.com/ReceitaFederal/calculadora-rtc-regime-regular"><img src="https://img.shields.io/badge/motor%20oficial-1.7.2-7377F0?style=flat-square" alt="Motor oficial 1.7.2"></a>
<a href="LICENSE"><img src="https://img.shields.io/github/license/Efer-Eder/brasil-tax-playground?style=flat-square&color=6C707A" alt="Licença MIT"></a>
<a href="https://github.com/Efer-Eder/brasil-tax-playground/commits/main"><img src="https://img.shields.io/github/last-commit/Efer-Eder/brasil-tax-playground?style=flat-square&color=6C707A&label=%C3%BAltimo%20commit" alt="Último commit"></a>
</p>

<p>
<a href="https://efer.online/projeto/brasil-tax-playground"><b>Página do projeto</b></a>
&nbsp;·&nbsp;
<a href="https://efer.online/projeto/brasil-tax-playground/simular"><b>Simulador</b></a>
&nbsp;·&nbsp;
<a href="#api-pública"><b>API</b></a>
&nbsp;·&nbsp;
<a href="README.en.md"><b>English</b></a>
</p>

</div>

> [!IMPORTANT]
> Ferramenta independente, não oficial e não substitui orientação contábil ou tributária. Sem vínculo com a Receita Federal. Projeto **em desenvolvimento**. Regime regular, Simples Nacional e gerador de DANFSe estão no ar na instância pública.

## Por que isso existe

Em 2026 a Receita Federal publicou no GitHub os motores de cálculo da Reforma Tributária do Consumo (CBS, IBS e Imposto Seletivo). São APIs Java para rodar na sua máquina, sem tela nenhuma. Este projeto coloca uma interface e uma API pública na frente do motor oficial, para quem quer **estudar e testar como ele se comporta** sem montar o ambiente do zero.

A regra que guia tudo: **nenhuma alíquota, regra ou cálculo fiscal é escrito aqui**. O app valida o formato, chama o motor e mostra a resposta crua, com a memória de cálculo e a versão do motor que gerou cada número. Se o motor cair, a tela diz que caiu; não existe simulador alternativo.

<div align="center">
<img src="docs/assets/tour-pt.gif" alt="Tour pela página do projeto: card do GitHub, como funciona e API" width="100%">
</div>

## O que dá para fazer

| | |
|---|---|
| **Escolher o serviço oficial** | Regime regular (1.7.2), Simples Nacional (1.0.2) ou gerador de DANFSe (1.0.0), os três repositórios da Receita rodando lado a lado. |
| **Simular no modo guiado** | Formulários montados a partir do contrato publicado por cada motor. Regime regular: UF e município, CST e cClassTrib da tabela vigente e NCM ou NBS consultados no motor. Simples Nacional: documento e regime no vocabulário do motor, atividades (cAtivSN) vindas dele e as alíquotas efetivas do contribuinte informadas por quem simula. Nenhum valor fiscal é pré-preenchido. |
| **Simular no modo desenvolvedor** | Editor JSON no formato de entrada de cada motor, exemplos fictícios, importar arquivo, validar, formatar e copiar. Os dois modos usam o mesmo caminho até o motor. |
| **Gerar o DANFSe** | O XML de uma NFS-e (exemplo fictício ou importado) vira o PDF desenhado pelo gerador oficial, com situação da nota e canhoto opcionais. |
| **Ver a resposta do motor** | Estado de cada item, erros com o caminho do campo, memória de cálculo em texto e valores do item. |
| **Inspecionar e exportar** | Tabelas com os rótulos que o motor publica, requisição e resposta cruas lado a lado, exportação em JSON e CSV e histórico local (só no navegador). |
| **Comparar duas simulações** | Escolha duas do histórico e veja, campo a campo, o que o motor devolveu em cada uma: igual, diferente ou só de um lado. Sem conta e sem interpretação. |
| **Usar a API pública** | Sem cadastro, sem chave, CORS aberto, limites medidos. |
| **Acompanhar o projeto** | Card ao vivo do GitHub na página: commits, issues, PRs, contribuidores e último CI. |

<div align="center">
<img src="docs/assets/simulador-pt.gif" alt="Simulador: escolha do motor, Simples Nacional no modo guiado, erro por item no regime regular e DANFSe em PDF" width="100%">
</div>

## API pública

Base: `https://efer.online/api/brasil-tax-playground`

<div align="center">
<img src="docs/assets/api-pt.gif" alt="Chamadas à API pública num terminal" width="100%">
</div>

```bash
# Estado do motor e versão
curl https://efer.online/api/brasil-tax-playground/engine/status

# Uma operação fictícia de 2026 (antes de 2027 o motor não aceita aliquotasNominais)
curl -X POST https://efer.online/api/brasil-tax-playground/simular/regime-regular \
  -H 'Content-Type: application/json' \
  -d '{"id":"teste","versao":"1.0.0","dhFatoGerador":"2026-06-01T10:00:00-03:00",
       "municipio":4314902,"uf":"RS",
       "itens":[{"numero":1,"ncm":"22030000","cst":"000","cClassTrib":"000001","baseCalculo":100}]}'
```

| Método | Rota | O que devolve |
|---|---|---|
| `GET` | `/engine/status` | Estado do motor de regime regular e versão (app, base de dados e data da base). |
| `GET` | `/engine/{motor}/status` | O mesmo para `regime-regular`, `simples-nacional` ou `danfse`. |
| `POST` | `/simular/regime-regular` | Requisição, resposta crua do motor, versão e `x-warning-dados-simulados`. |
| `POST` | `/simular/simples-nacional` | O mesmo para o Simples Nacional (endpoint não assistido do motor; alíquotas efetivas no corpo). |
| `POST` | `/danfse` | Corpo: XML da NFS-e. Devolve o PDF do gerador oficial (`?stc=0\|1\|2`, `?canhoto=false`). |
| `GET` | `/dados-abertos/{recurso}` | Listas do motor usadas pelos formulários (UF, município, CST, NCM, NBS, atividades do Simples), por lista fechada. |
| `GET` | `/github` | Resumo do repositório usado pelo card da página. |

<details>
<summary><b>Limites e códigos de resposta</b></summary>

<br>

Os limites saíram de teste de carga no servidor (cerca de 30 req/s com 1 item e 6 req/s com 50 itens). Contas completas em [docs/deploy-efer-online.md](docs/deploy-efer-online.md).

| Limite | Valor |
|---|---|
| Por cliente | 2 req/s, rajada de 20 |
| Total da instância | 30 req/s |
| Itens por operação | 50 |
| Corpo | 512 KB |
| Chamadas simultâneas ao motor | 3, com fila de 32 (espera máxima de 3 s) |
| Timeout do motor | 8 s |
| DANFSe | XML de até 500 KB; 2 PDFs ao mesmo tempo, fila de 8; timeout de 10 s |

| Código | Quando |
|---|---|
| `200` | Cálculo feito. Erro por item vem em `objetos[].estadoItem`, como no motor. |
| `400` | JSON inválido. |
| `413` | Mais de 50 itens ou corpo acima de 512 KB. |
| `422` | Falhou na validação estrutural; a resposta traz o caminho de cada problema. |
| `429` | Rate limit. Respeite o `Retry-After`. |
| `502` | O motor recusou (ProblemDetail repassado como veio) ou respondeu fora do contrato. |
| `503` | Fila cheia ou motor fora do ar. |
| `504` | O motor não respondeu em 8 s. |

</details>

## Como funciona

```mermaid
flowchart LR
  A[Navegador ou cliente da API] -->|HTTPS| B[Cloudflare + Nginx<br/>rate limit e timeouts]
  B --> C[App Next.js<br/>BFF: zod, fila, teto de itens]
  C -->|rede Docker interna| D[(Motor oficial<br/>calculadora-rtc-regime-regular 1.7.2<br/>Java 25, sem porta publicada)]
  C -.->|cache de 15 min| E[API do GitHub<br/>card do repositório]
```

- **Número só do motor.** Nenhuma alíquota, redução ou regra no código.
- **Contrato espelhado.** Os schemas copiam a Bean Validation das classes de entrada do upstream, com link para o commit. Regra de negócio fica com o motor.
- **Testado contra o real.** Paridade com os 102 payloads de teste do próprio upstream (69 respostas idênticas, 10 erros idênticos, 23 recusados pelos dois), fixtures gravadas do motor, paridade entre resposta e tela e regressão que falha se o upstream mudar a saída. Relatório em [DEVELOPMENT_REPORT.md](DEVELOPMENT_REPORT.md).

## Rodar na sua máquina

Requisitos: Node.js 20.9+ (testado com Node 24). Para o motor: Java 25.

```bash
git clone https://github.com/Efer-Eder/brasil-tax-playground.git
cd brasil-tax-playground
npm ci
npm run dev
```

Abra http://localhost:3000. Sem motor configurado, o painel mostra **Não configurado** e nenhuma simulação roda. É o comportamento esperado.

<details>
<summary><b>Subir o motor oficial localmente (Windows)</b></summary>

<br>

```powershell
# fora da pasta do app
git -c core.longpaths=true clone --branch 1.7.2 https://github.com/ReceitaFederal/calculadora-rtc-regime-regular.git
cd calculadora-rtc-regime-regular
$env:JAVA_HOME = "C:\caminho\para\jdk-25"
mkdir calculadora\db
.\mvnw.cmd flyway:migrate "-Dflyway.configFiles=flyway\flyway-pro.conf" --batch-mode --errors
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=offline"
```

No `.env.local` do app:

```env
REGIME_REGULAR_ENGINE_URL=http://localhost:8080/api
# opcionais: Simples Nacional (porta padrão 8082) e gerador de DANFSe (rode com SERVER_PORT=8083)
SIMPLES_NACIONAL_ENGINE_URL=http://localhost:8082/api
DANFSE_ENGINE_URL=http://localhost:8083
```

Passo a passo, contratos e armadilhas: [docs/upstream-integration.md](docs/upstream-integration.md).

</details>

<details>
<summary><b>Scripts</b></summary>

<br>

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build standalone e execução |
| `npm run lint` | ESLint |
| `npm run typecheck` | Tipos de rotas do Next + `tsc --noEmit` |
| `npm test` | Testes unitários (Vitest) |
| `npm run test:e2e` | Playwright, com um servidor que só reproduz respostas gravadas do motor (rode `npm run build` antes) |
| `npm run test:contract` | Contrato (OpenAPI) e regressão contra um motor real (`CONTRACT_ENGINE_URL`) |
| `npm run test:paridade` | Compara o app com o motor nos payloads de teste do upstream (`CONTRACT_ENGINE_URL` + `UPSTREAM_TESTS_DIR`) |
| `npm run fixtures:gravar` | Regrava as fixtures a partir de um motor real (`CONTRACT_ENGINE_URL` + `RECORD_FIXTURES=1`) |

</details>

## Testes e CI

- **Unitários (Vitest):** validação, erros do motor, fila, cache e o card do GitHub.
- **Paridade:** a tela é renderizada a partir de respostas gravadas do motor real e comparada valor a valor.
- **Regressão e contrato:** contra os três serviços oficiais rodando; falham se o upstream mudar a saída (o PDF do DANFSe tem de ser idêntico byte a byte) ou o contrato OpenAPI.
- **Ponta a ponta (Playwright):** contra um servidor de replay, sem chamar o GitHub nem o motor de verdade.
- **CI:** Ubuntu e Windows, E2E e varredura de segredos com gitleaks. Toda semana (e em PR que mexe em `lib/tax-engine`), um job compila os três motores oficiais nos commits fixados e roda contrato, regressão e paridade com os payloads de teste do upstream.
- **Segurança:** Content-Security-Policy com nonce por requisição em todas as páginas, sem `unsafe-inline`; um teste E2E confere o cabeçalho e que nenhum fluxo é bloqueado.

## Motores oficiais

| Repositório | Estado aqui |
|---|---|
| [calculadora-rtc-regime-regular](https://github.com/ReceitaFederal/calculadora-rtc-regime-regular) | Integrado (1.7.2) |
| [calculadora-rtc-simples-nacional](https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional) | Integrado (1.0.2) |
| [calculadora-rtc-gerador-danfse](https://github.com/ReceitaFederal/calculadora-rtc-gerador-danfse) | Integrado (1.0.0; gera PDF a partir do XML, não calcula tributos) |

## Documentação

- [Integração com os motores oficiais](docs/upstream-integration.md)
- [Instância pública: arquitetura, medições e limites](docs/deploy-efer-online.md)
- [Notas de conformidade](docs/compliance-notes.md)
- [Decisões de arquitetura (ADRs)](docs/adr/)
- [Progresso](PROGRESS.md) · [Roadmap](ROADMAP.md) · [Changelog](CHANGELOG.md)

## Contribuir

Issue, PR e estrela ajudam. Antes, leia o [CONTRIBUTING.md](CONTRIBUTING.md); a única regra inegociável é que **nenhum número fiscal entra no código**, ele vem do motor. Código de conduta em [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md); problemas de segurança em [SECURITY.md](SECURITY.md).

## Licença

[MIT](LICENSE) © Efer Eder. Os motores oficiais têm licença (MIT) e titular próprios (Receita Federal do Brasil) e não são distribuídos aqui.

<div align="center">
<sub>Os GIFs deste README são gerados por <code>scripts/readme/</code> a partir de telas reais do app ligado aos motores oficiais e de respostas reais da API pública.</sub>
</div>
