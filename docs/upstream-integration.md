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

## 2. Simples Nacional (`calculadora-rtc-simples-nacional`) — integrado (1.0.2)

- Mesma stack (Java 25, Spring Boot 4.1.2, SQLite, Flyway). Porta **8082**, base `http://localhost:8082/api`; métricas em `http://localhost:9103/metrics`.
- O banco é gerado com os scripts Flyway **do repositório do regime regular**: o README manda copiar a pasta `flyway/` de lá para a raiz do clone do Simples.
- Endpoints (README): `POST /calculadora/observabilidade/simples-nacional`, `GET /calculadora/observabilidade/simples-nacional/erros?codigo=VSN-001`, `GET /calculadora/simples-nacional/atividades?data=AAAA-MM-DD`, `GET /calculadora/simples-nacional/atividades/{codigo}?data=...`, `GET /versao`, `GET /versao/status` (offline).
- JAR: `target\api-simples-nacional.jar`.
- Tag `1.0.2` = commit `f90b652`; `main` em `a926d5a` (merge do release, mesma árvore).

### Verificado nesta máquina (21/11/2026, Temurin JDK 25.0.3)

- `mvnw.cmd flyway:migrate` com a pasta `flyway/` copiada do clone 1.7.2 do regime regular: banco `V0073` (2026-11-09), o mesmo do regime regular.
- `mvnw.cmd clean package`: **376 testes, 0 falhas**, `target\api-simples-nacional.jar` (85 MB).
- Imagem de execução nossa em `deploy/engine-simples/Dockerfile` (mesmo padrão do regime regular, heap 256 MB). `GET /api/versao` → `versaoApp 1.0.2`, `versaoDb V0073`.

### Endpoint usado: "não assistido"

O OpenAPI 1.0.2 marca `POST /calculadora/observabilidade/simples-nacional` como **OBSOLETO** e indica `POST /calculadora/observabilidade/simples-nacional/nao-assistido`, que atende NF-e, NFC-e, CT-e, CT-e OS, BP-e, BP-e TM, NFCom (com CRT) e NFS-e (91) com o mesmo contrato (`OperacaoSimplesNaoAssistidaInput`). O app usa esse.

- O regime chega no vocabulário do documento: `CRT`/`tpRegimeIBSCBS` nos documentos com CRT; `opSimpNac`/`regApIBSCBSSN`/`regApTribSN` na NFS-e.
- As **alíquotas efetivas do contribuinte** (`aliquotasEfetivas`: `fatorR`, `impedimentoSublimite` e um par CBS/IBS por anexo, mais o par sem redistribuição do ISS nos anexos III a V) vêm **no corpo**, informadas por quem chama. O próprio motor diz que a relação anexo → alíquota "é configurada externamente". Este app não fornece nem calcula alíquota: o formulário guiado pede os valores e os exemplos usam os do OpenAPI do motor.
- A resposta tem o mesmo envelope do regime regular (`objetos[].nObj/estadoItem`, `tribCalc` com `memoriaCalculo`, `total`) e acrescenta `oper.regimeApuracao` e `resolucaoAliquotas` (anexo aplicado, par com ou sem redistribuição, regra e motivo por item). Estado novo: `NAO_CALCULADO` (atividade ausente ou não admitida no documento).
- Dados abertos usados pelo formulário: `GET /calculadora/simples-nacional/atividades?data=&tpDoc=&cClassTrib=` e `GET /calculadora/observabilidade/simples-nacional/erros?codigo=VSN-000`. O motor do Simples não publica a tabela de cClassTrib; o formulário usa a do regime regular (mesma base).

### Achados

- **O exemplo de NFS-e publicado no OpenAPI 1.0.2 não passa no próprio motor**: a NBS `114051000` não existe na base `V0073`, e o item volta com `VSN-050`. O app traz esse exemplo exatamente como publicado (para mostrar o erro por item) e um exemplo de NFS-e que calcula, com NBS existente.
- **A mitigação de segurança `-XX:-UseBASE64Intrinsics`** citada nos CHANGELOGs do Simples (1.0.1) e do regime regular (1.7.1) não aparece no código publicado (pom, `.mvn`, scripts). Ela foi aplicada nas duas imagens de execução deste projeto (`JAVA_OPTS`).

## 3. Gerador DANFSe (`calculadora-rtc-gerador-danfse`) — integrado (1.0.0)

- Serviço HTTP em Go (README pede Go 1.27+; esta máquina tem Go 1.27.3). Tem `Dockerfile` (`docker build -t danfse-go .` / `docker run -p 8080:8080 danfse-go:latest`).
- Porta padrão `8080` (`SERVER_PORT`) — **conflita** com o regime regular; ao rodar os dois, use outra porta (ex.: `SERVER_PORT=8081`).
- `POST /api/danfse` (corpo `application/xml`, parâmetros `stc` e `canhoto`) → PDF. Health: `GET /health/live`, `GET /health/ready`. Swagger em `/api/swagger-ui/index.html`.
- Limite de XML: 5 MiB por padrão (`XML_MAX_SIZE_BYTES`). Telemetria OTel desligada por padrão.

### Verificado nesta máquina (21/11/2026)

- Imagem construída com o **Dockerfile do próprio upstream** (tag `1.0.0`, Go 1.27.1, `alpine:latest`), 26 MB salva com `docker save`. Na instância roda como `nobody`, com sistema de arquivos somente leitura e `/tmp` em memória: funciona sem ajuste.
- Não há XML de exemplo no repositório (os testes montam XML em Go). O exemplo deste projeto (`lib/danfse/exemplo.ts`) foi escrito a partir do modelo que o gerador lê (`internal/domain/models/models.go`): CNPJ e CPF zerados, homologação (`tpAmb 2`) e nenhum valor de tributo. O gerador carimba "NFS-e SEM VALIDADE JURÍDICA" nesse caso.
- Erros vêm como `400` com `{"sucesso": false, "mensagem": "..."}` (ex.: `infNFSe Id is empty`). O README do upstream avisa que falhas internas também saem como `400` por enquanto. O BFF repassa como `422`, com a mensagem do gerador.
- Medição local: ~230 ms por PDF (8,6 PDFs/s com 2 em paralelo), ~20 a 40 MB de RAM.
- Sem endpoint de versão: o status usa `GET /health/ready` e mostra a tag empacotada (`DANFSE_ENGINE_VERSAO`).

---

## Tag 1.7.2 movida (2026-11-25)

A tag `1.7.2` do regime regular aponta agora para `39363aa` (release refeito em 2026-11-25). Em relação a `32df719`, o commit só apaga `core/util/ArredondamentoUtils.java` (duplicata; a classe usada fica em `shared/util`) e `domain/service/exception/CaptchaException.java`. Este projeto, a instância pública e o job de paridade seguem fixados em `32df719` por SHA, não pela tag. Antes de trocar, rodar `paridade-motores.yml` com o commit novo.

## Paridade no CI

`.github/workflows/paridade-motores.yml` compila os três serviços nos commits fixados no próprio arquivo e roda `npm run test:contract` (contrato OpenAPI, regressão contra as fixtures e paridade com os payloads do upstream). Trocar de versão = mudar o SHA no workflow, regravar as fixtures de propósito e revisar as diferenças no mesmo PR.

## Paridade com os testes do upstream (2026-11-21)

`npm run test:paridade` envia cada JSON de `src/test/resources` do clone 1.7.2 (pastas `entradas/calculoscorretos`, `arredondamento`, `tpdoc`, `validacoes` e `roc`) direto ao motor e pelo caminho do app, e compara. Resultado com o motor no Docker local: 102 casos, 69 respostas idênticas, 10 erros idênticos e 23 recusados pelos dois (não são operações de regime geral). Antes da correção desta data, o app recusava 46 entradas aceitas pelo motor e alterava a resposta em 9.

Comportamentos do motor observados nessa comparação:

- O endpoint de observabilidade devolve erros de campo **por item**, com HTTP 200 (`estadoItem: INCONSISTENCIA_ENTRADA` e códigos `VAL-xxx`), em vez de recusar a operação inteira.
- A lista de erros de validação vem **em ordem não determinística**: duas chamadas iguais podem trazer os erros em ordens diferentes.
- O ProblemDetail dos erros HTTP traz `timestamp`.
- `dhFatoGerador` é opcional no contrato; o motor aceita o campo obsoleto `dataHoraEmissao` no lugar. Campos opcionais aceitam `null`.

## Contrato versionado

`lib/tax-engine/contrato/regime-regular.openapi.json` guarda os schemas de entrada e os rótulos dos campos de saída tirados do OpenAPI do motor (`node scripts/contrato/extrair-openapi.mjs <url>`). O teste `tests/contract/contrato-openapi.test.ts` compara esse retrato com o motor rodando; se o upstream mudar o contrato, o teste falha.

## Como este projeto acompanha mudanças do upstream

1. Cada adapter declara a tag/commit consultado (`upstreamReferencia`).
2. Ao atualizar a referência: reler o README, `docs/exemplos.md` e as classes de entrada/saída, atualizar este documento e os schemas, e regravar as fixtures a partir do motor real.
3. Testes de contrato (planejados) devem falhar se a forma da resposta mudar.
