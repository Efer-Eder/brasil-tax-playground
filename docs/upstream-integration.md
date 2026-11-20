# Integração com os motores oficiais (upstream)

> Pesquisa feita em **20/11/2026** via `gh repo view`, `gh api` e leitura dos READMEs, `docs/exemplos.md`, arquivos de configuração e classes de entrada/saída dos repositórios oficiais. Nada foi clonado nem copiado para este repositório. Quando algo não foi verificado, isso está escrito explicitamente.

## Resumo

| Repositório | Linguagem | Licença | Última tag | Commit consultado (`main`) | Data do commit | Papel |
|---|---|---|---|---|---|---|
| [ReceitaFederal/calculadora-rtc-regime-regular](https://github.com/ReceitaFederal/calculadora-rtc-regime-regular) | Java 25 / Spring Boot 4.1.2 | MIT | [`1.7.2`](https://github.com/ReceitaFederal/calculadora-rtc-regime-regular/releases/tag/1.7.2) (19/11/2026) | [`f1eebd7`](https://github.com/ReceitaFederal/calculadora-rtc-regime-regular/commit/f1eebd7ce3157423b1a6aaca7dc1d6c3395452c4) | 2026-11-19 | Cálculo de CBS, IBS e IS — regime regular |
| [ReceitaFederal/calculadora-rtc-simples-nacional](https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional) | Java 25 / Spring Boot 4.1.2 | MIT | [`1.0.2`](https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional/releases/tag/1.0.2) (20/11/2026) | [`a926d5a`](https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional/commit/a926d5a76095ac0295a6612a9a54db7ffead2396) | 2026-11-20 | Cálculo de CBS e IBS — Simples Nacional |
| [ReceitaFederal/calculadora-rtc-gerador-danfse](https://github.com/ReceitaFederal/calculadora-rtc-gerador-danfse) | Go | MIT | `1.0.0` (sem GitHub Release) | [`8d79e6b`](https://github.com/ReceitaFederal/calculadora-rtc-gerador-danfse/commit/8d79e6b2f7fad6375340afcb51c85ed370c64a14) | 2026-10-22 | Gera PDF do DANFSe a partir do XML da NFS-e (**não calcula tributos**) |

Licença: os três usam MIT com titular "Receita Federal do Brasil" (conferido no arquivo `LICENSE` de cada repositório). Este projeto **não** inclui código deles; se algum dia incluir, o aviso de copyright MIT deve ser preservado.

Divergências em relação à especificação do projeto:

- Não há API pública hospedada prevista para uso por este app: os repositórios são software para rodar localmente (confirmado pelos READMEs, que só documentam perfil `offline` em `localhost`).
- O **regime regular e o Simples Nacional não têm `Dockerfile`** na árvore do commit consultado. Por isso este repositório **não** traz `docker-compose.yml` (ver [ADR 0003](adr/0003-sem-docker-compose-por-enquanto.md)).
- O gerador DANFSe tem `Dockerfile`, mas não é motor de cálculo.
- A página de notícia da Receita sobre a publicação dos repositórios **ainda não foi consultada**; as informações acima vêm só dos repositórios.

---

## 1. Regime regular (`calculadora-rtc-regime-regular`)

### Como subir localmente (conforme README oficial, Windows)

Pré-requisitos: **Java 25** e Git. O Maven Wrapper (`mvnw.cmd`) baixa o Maven na primeira execução (precisa de internet).

```bat
git clone https://github.com/ReceitaFederal/calculadora-rtc-regime-regular.git
cd calculadora-rtc-regime-regular
git checkout 1.7.2

:: 1) Gerar o banco SQLite (obrigatório — sem ele o perfil offline não inicia)
mkdir calculadora\db
mvnw.cmd flyway:migrate -Dflyway.configFiles=flyway\flyway-pro.conf --batch-mode --errors
dir calculadora\db\calculadora-pro.db

:: 2) Executar com o perfil offline
mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=offline"

:: (alternativa) gerar o JAR e executar a partir da raiz do projeto
mvnw.cmd clean package
java "-Dspring.profiles.active=offline" -jar target\api-regime-geral.jar
```

> Clone o motor **fora** desta pasta (por exemplo, ao lado dela). Ele não deve ser commitado aqui.

Depois, neste projeto, configure `.env.local`:

```env
REGIME_REGULAR_ENGINE_URL=http://localhost:8080/api
```

### Verificado nesta máquina (20/11/2026, Windows 11, Temurin JDK 25.0.3)

Os passos acima funcionaram, com três ajustes práticos no Windows:

1. **Caminhos longos**: o checkout falha com `Filename too long` em arquivos de teste. Clone com `git -c core.longpaths=true clone ...` (ou rode `git config --global core.longpaths true` uma vez).
2. **`JAVA_HOME`** precisa estar definido; o `mvnw.cmd` não usa só o `java` do PATH. Exemplo em PowerShell: `$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-25.0.3.9-hotspot'`.
3. No PowerShell, chame `.\mvnw.cmd ...` e coloque entre aspas os argumentos `-D...`.

Resultado:

- A tag `1.7.2` aponta para o commit `32df719`; o `f1eebd7` da `main` é o merge do release, com árvore idêntica (comparação no GitHub: 0 arquivos diferentes).
- `flyway:migrate`: 73 migrações aplicadas (versão `v0073`), `calculadora-pro.db` com ~5,6 MB, em ~24 s.
- `spring-boot:run` com perfil `offline`: subiu em ~9 s.
- `GET /api/calculadora/dados-abertos/versao` → `versaoApp: "1.7.2"`, `versaoDb: "V0073"`, `dataVersaoDb: "2026-11-09"`, `ambiente: "offline"`.
- `GET http://localhost:9101/health` → `{"status":"UP"}`.
- O exemplo de observabilidade de `docs/exemplos.md` do upstream, enviado sem alterações, devolveu os mesmos estados e totais documentados (itens 1–3 `CALCULO_SIMULADO`, item 4 `INCONSISTENCIA_ENTRADA`/`REG-011`), com o header `x-warning-dados-simulados: 6`.
- O painel deste app mostrou **Disponível** com essa versão, e `npm run test:contract` passou contra o motor (ver `tests/contract/`).

Sobre o header `x-warning-dados-simulados`: o valor é um **código numérico** do enum `TipoWarningDadosSimulados` (1 `CASO_GERAL`, 2 `CASO_COMPRAS_GOVERNAMENTAIS`, 3 `CASO_IMPOSTO_SELETIVO`, 4 `CASO_COMPRAS_GOVERNAMENTAIS_IS`, 5 `CASO_ALIQUOTAS_FICTICIAS`, 6 `CASO_CALCULOS_SIMULADOS`), não uma mensagem. O adapter repassa o valor cru.

### Portas e caminhos (de `src/main/resources/application-offline.yml`)

- API: porta `8080`, context-path `/api` → base `http://localhost:8080/api`.
- Swagger UI: `http://localhost:8080/api/swagger-ui.html`; OpenAPI 3.1 em `/api/api-docs`.
- Actuator (porta separada `9101`): `health` e `prometheus` (mapeado para `/metrics`), base-path `/`.
- Banco: `jdbc:sqlite:file:./calculadora/db/calculadora-pro.db?mode=ro` (somente leitura, relativo à raiz do clone).
- Segurança (`WebSecurityConfig`): sem autenticação, `permitAll`, CORS com padrões do Spring. Este app chama o motor **pelo servidor** (route handlers), então CORS do navegador não é um problema.

### Endpoints relevantes (README + controllers)

Todos sob `http://localhost:8080/api`:

| Uso neste projeto | Método e caminho | Fonte |
|---|---|---|
| Verificar disponibilidade e versão | `GET /calculadora/dados-abertos/versao` | `DadosAbertosController`, `VersaoOutput` |
| Cálculo com erros por item (usado no MVP) | `POST /calculadora/observabilidade/regime-geral` | README, `ObservabilidadeController` |
| Cálculo "tudo ou nada" (HTTP 422 no primeiro erro) | `POST /calculadora/regime-geral` | README, `CalculadoraTributoController` |
| Descrição de código de erro | `GET /calculadora/observabilidade/erros?codigo=REG-011` | README |
| Base de cálculo unificada NF-e/NFC-e / NFS-e | `POST /calculadora/base-calculo/base-calculo-unificada[-nfse]` | README |
| Gerar / validar XML | `POST /calculadora/xml/generate?tipo=nfe`, `POST /calculadora/xml/validate?tipo=nfe&subtipo=grupo` | README |
| Dados abertos (CST, cClassTrib, NCM, NBS, alíquotas de referência) | `GET /calculadora/dados-abertos/...` | README |

Observação de privacidade: o endpoint `GET /versao/status` (só no perfil offline) consulta, por padrão, uma instalação online do governo (`VERSAO_OFFLINE_URL`, padrão `https://piloto-cbs.tributos.gov.br/...`) para comparar versões. **Este app não chama esse endpoint**; usa apenas `/calculadora/dados-abertos/versao`, que é resolvido localmente.

### Contrato de entrada (`OperacaoInput`)

Campos e restrições de Bean Validation, transcritos das classes em `src/main/java/br/gov/serpro/rtc/api/model/input/` (commit `f1eebd7`). O espelho em zod está em [`lib/tax-engine/schemas/regime-regular.ts`](../lib/tax-engine/schemas/regime-regular.ts).

- Operação: `id` (obrigatório), `versao` (obrigatório), `dhFatoGerador` (ISO 8601 com offset; `dataHoraEmissao` está obsoleto), `municipio` (obrigatório, código IBGE, 0–9999999), `uf` (2 caracteres), `tpDoc` (opcional, 1–999), `gCompraGov` (opcional), `itens` (obrigatório, não vazio).
- Item: `numero` (1–9999999), `ncm`, `nbs`, `cst` (3 dígitos, obrigatório), `cClassTrib` (6 dígitos, obrigatório), `baseCalculo` (≥ 0, 13 inteiros/2 decimais; obrigatoriedade condicional validada no motor), `quantidade`, `unidade`, `impostoSeletivo`, `tributacaoRegular`, `gComponentesBC`, `aliquotasNominais`.
- `aliquotasNominais`: `cbs`, `ibsEstadual`, `ibsMunicipal` (percentuais 0–100, até 4 decimais) e `impostoSeletivo.{adValorem, adRem}`. Segundo o próprio schema e `docs/exemplos.md` do upstream: **obrigatório a partir de 01/01/2027 e proibido antes**; cálculos com alíquotas informadas saem como `CALCULO_SIMULADO`, com o header `x-warning-dados-simulados`. As alíquotas de referência do motor estão cadastradas apenas para 2026.

Consequência para este projeto: a partir de 2027 **o usuário precisa informar as alíquotas nominais**; o app não sugere nem pré-preenche valores de alíquota.

### Contrato de saída

- Observabilidade: HTTP 200 mesmo com itens em erro; corpo com `objetos[]` (`nObj`, `estadoItem`, `tribCalc` ou `erros[]`) e `total.tribCalc`. Estados: `CALCULADO`, `CALCULO_SIMULADO`, `INCONSISTENCIA_ENTRADA`, `NAO_IMPLEMENTADO`, `FALHA_TECNICA`. Cada grupo traz `memoriaCalculo` em texto (README/exemplos; `application.memoriacalculo.enabled: true` no perfil offline).
- Erros: `ProblemDetail` (RFC 7807) via `@RestControllerAdvice` — 422 validação, 404 não encontrado, 400 JSON malformado, 500 interno (ADR007 do upstream).
- Versão: `VersaoOutput` = `versaoApp`, `descricaoVersaoApp`, `versaoDb`, `descricaoVersaoDb`, `dataVersaoDb`, `ambiente`.

O exemplo completo de requisição/resposta está em [`docs/exemplos.md` do upstream](https://github.com/ReceitaFederal/calculadora-rtc-regime-regular/blob/f1eebd7ce3157423b1a6aaca7dc1d6c3395452c4/docs/exemplos.md). Ele **não** foi copiado para cá; as fixtures deste projeto serão geradas a partir de respostas reais do motor rodando localmente, com a versão registrada.

---

## 2. Simples Nacional (`calculadora-rtc-simples-nacional`) — planejado

- Mesma stack (Java 25, Spring Boot 4.1.2, SQLite, Flyway). Porta **8082**, base `http://localhost:8082/api`; métricas em `http://localhost:9103/metrics`.
- O banco é gerado com os scripts Flyway **do repositório do regime regular**: o README manda copiar a pasta `flyway/` de lá para a raiz do clone do Simples.
- Endpoints (README): `POST /calculadora/observabilidade/simples-nacional`, `GET /calculadora/observabilidade/simples-nacional/erros?codigo=VSN-001`, `GET /calculadora/simples-nacional/atividades?data=AAAA-MM-DD`, `GET /calculadora/simples-nacional/atividades/{codigo}?data=...`, `GET /versao`, `GET /versao/status` (offline).
- JAR: `target\api-simples-nacional.jar`.
- **Não integrado** neste projeto. Contrato de entrada ainda não lido.

## 3. Gerador DANFSe (`calculadora-rtc-gerador-danfse`) — planejado

- Serviço HTTP em Go (README pede Go 1.27+; esta máquina tem Go 1.27.3). Tem `Dockerfile` (`docker build -t danfse-go .` / `docker run -p 8080:8080 danfse-go:latest`).
- Porta padrão `8080` (`SERVER_PORT`) — **conflita** com o regime regular; ao rodar os dois, use outra porta (ex.: `SERVER_PORT=8081`).
- `POST /api/danfse` (corpo `application/xml`, parâmetros `stc` e `canhoto`) → PDF. Health: `GET /health/live`, `GET /health/ready`. Swagger em `/api/swagger-ui/index.html`.
- Limite de XML: 5 MiB por padrão (`XML_MAX_SIZE_BYTES`). Telemetria OTel desligada por padrão.
- **Não integrado** neste projeto.

---

## Como este projeto acompanha mudanças do upstream

1. Cada adapter declara a tag/commit consultado (`upstreamReferencia`).
2. Ao atualizar a referência: reler o README, `docs/exemplos.md` e as classes de entrada/saída, atualizar este documento e os schemas, e regravar as fixtures a partir do motor real.
3. Testes de contrato (planejados) devem falhar se a forma da resposta mudar.
