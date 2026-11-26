# Development report

Fase de auditoria do motor fiscal e evolução da interface. Data: 2026-11-21. Tudo abaixo foi verificado com comandos executados; o que não foi verificado está marcado como tal.

Legenda: **Implementado** (código existe), **Testado** (validado por testes executados), **Preparado** (configurado, depende de etapa externa), **Pendente** (não implementado).

## 1. Diagnóstico inicial

### Motor e upstream

| Item | Evidência |
|---|---|
| Motor em uso | `ReceitaFederal/calculadora-rtc-regime-regular` tag `1.7.2` = commit `32df719`; `main` em `f1eebd7` (merge do release, mesma árvore). Conferido com `gh api` em 2026-11-21: sem release nova. |
| Base de dados | `V0073`, 2026-11-09 (`GET /calculadora/dados-abertos/versao`). |
| Licença | MIT, Receita Federal do Brasil (arquivo `LICENSE` do upstream). Nenhum código do upstream copiado para este repositório. |
| Contrato de entrada | OpenAPI 3.1 do motor (`GET /api/api-docs`), schemas `OperacaoInput`, `ItemOperacaoInput`, `ImpostoSeletivoInput`, `TributacaoRegularInput`, `ComponentesBaseCalculoInput`, `CompraGovernamentalInput`, `AliquotasNominaisInput`, `AliquotasNominaisImpostoSeletivo`. |
| Contrato de saída | Observabilidade: `objetos[]` com `estadoItem`, `tribCalc`, `erros`; `oper`; `total`. Erros HTTP em ProblemDetail (RFC 7807). |
| Ambiente de teste | Motor no Docker local (imagem de produção `deploy/engine/Dockerfile`, Docker 29.9.3) e via Java 25 (Temurin 25.0.3). |
| Dependências do app | `npm audit`: 0 vulnerabilidades. |

### Testes existentes, rodados antes de mudar

- Unitários: 88/88. Contrato e regressão contra o motor real: 5/5. E2E: 7/7.
- **Paridade com os payloads de teste do próprio upstream** (novo teste, 102 arquivos de `src/test/resources`): só 16 idênticos. O app recusava 46 entradas que o motor aceita e devolvia resposta diferente em 9.

### Problemas encontrados

| Prioridade | Problema | Evidência |
|---|---|---|
| **P1** | O app **reescrevia a entrada e a saída**. O zod reordenava as chaves da resposta (o grupo `oper` ia para o fim) e o BFF reenviava o JSON reconstruído, e não o texto original (`12.0` virava `12`, chaves em outra ordem). A "resposta crua" não era crua. | Diff byte a byte entre o motor direto e o caminho do app em `entradas/arredondamento/T5.json`. As fixtures antigas tinham as chaves fora da ordem do motor. |
| **P1** | A validação do BFF era **mais restritiva que o motor**: `dhFatoGerador` obrigatório (no contrato é opcional, porque `dataHoraEmissao` ainda é aceito), `null` recusado em campos opcionais, e erro de campo barrando a operação inteira. Na observabilidade, o motor devolve esses erros por item, com HTTP 200. | 46 payloads oficiais recusados (`app-recusa-entrada-aceita`). |
| P2 | A interface não mostrava o grupo `oper` (compra governamental). | Resposta de `compras-governamentais/*` com `oper.gCompraGov.pRedutor`. |
| P2 | A entrada era só JSON, sem modo guiado. Faltavam histórico e CSV. | Especificação 4.3, 4.4 e 4.6. |
| P2 | Em ambientes sem Nginx, o BFF lia o corpo inteiro antes de checar o limite de 512 KB. | `request.text()` antes da checagem. |
| P3 | O endereço interno do motor (`http://rtc-engine:8080/api`) aparecia no status, no resultado e no JSON exportado. | `GET /api/engine/status`. |
| P3 | Faltavam cabeçalhos de segurança HTTP e templates de issue e PR. | `curl -I`. |
| P3 (upstream) | O motor devolve a lista de erros de validação **em ordem não determinística** (duas chamadas iguais vêm em ordens diferentes), e o ProblemDetail tem `timestamp`. Não é bug do app; os testes normalizam só para comparar. | Duas chamadas diretas a `observabilidade/entrada.json`. |

Riscos de regressão considerados: a mudança de validação muda o que a API pública aceita (agora repassa erros de campo ao motor). Isso é coberto pela paridade (102 casos), pelos testes de unidade do envelope e pelo E2E.

## 2. Alterações implementadas

| Área | O quê | Estado |
|---|---|---|
| Fidelidade | O BFF confere só o envelope (objeto com `itens` não vazio) e encaminha **o texto original**; o adapter devolve o corpo do motor sem reprocessar. | Implementado, Testado |
| Contrato | Espelho do contrato completo (incluindo `tributacaoRegular`, `gComponentesBC` e `gCompraGov`), aceita `null` e `dataHoraEmissao`; usado como conferência de apoio na interface. | Implementado, Testado |
| Contrato versionado | `lib/tax-engine/contrato/regime-regular.openapi.json`: schemas de entrada e 107 rótulos de saída extraídos do OpenAPI do motor (`scripts/contrato/extrair-openapi.mjs`), com teste que compara com o motor rodando. | Implementado, Testado |
| Paridade | `npm run test:paridade` compara app e motor em 102 payloads oficiais do upstream e grava relatório em `test-results/paridade-upstream.json`. | Implementado, Testado |
| Dados abertos | `GET /api/dados-abertos/{ufs,municipios,situacoes-cbs-ibs,situacoes-is,ncm,nbs}`, com lista branca, parâmetros validados por regex, cache em memória e timeout de 5 s. | Implementado, Testado |
| Formulário guiado | 5 etapas: cenário (só o que está integrado fica ativo), operação (UF e município do motor), itens (NCM ou NBS consultados no motor; CST e cClassTrib da tabela vigente na data; grupos opcionais do contrato), revisão (JSON exato e conferência), resultado. A ajuda de cada campo vem do OpenAPI. Nenhum valor fiscal é pré-preenchido, nem a data. | Implementado, Testado (unitário e E2E) |
| Modo desenvolvedor | Editor JSON, exemplos, importar arquivo (até 500 KB), formatar, validar, copiar e "enviar mesmo assim". Usa a **mesma** função de envio e a mesma rota do modo guiado. | Implementado, Testado (E2E) |
| Resultado | Tabelas de `tribCalc`, `oper` e `total` com os rótulos que o motor publica; valores exatamente como vieram; nome do código `x-warning-dados-simulados`; copiar; exportar CSV e JSON. | Implementado, Testado |
| Histórico | Até 20 simulações no `localStorage` (reabrir, duplicar, remover, limpar), com aviso de que fica só no navegador. Robusto a armazenamento cheio ou corrompido. | Implementado, Testado |
| Segurança | Leitura do corpo com teto (Content-Length e fluxo), URL interna removida das respostas públicas, cabeçalhos `nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY` e `Permissions-Policy`, CSV com proteção contra fórmulas. | Implementado, Testado |
| Open source | Templates de issue ("bug" e "divergência entre o app e o motor") e de PR. | Implementado |

Arquivos principais: `lib/tax-engine/schemas/regime-regular.ts`, `lib/tax-engine/adapters/regime-regular.ts`, `lib/simulation/regime-regular.ts`, `lib/tax-engine/contrato/*`, `lib/tax-engine/dados-abertos.ts`, `lib/simulation/{guiado,csv,historico}.ts`, `lib/http/*`, `components/simulador/*`, `components/resultado-simulacao.tsx`, `app/api/dados-abertos/[recurso]/route.ts`, `tests/contract/*`, `tests/e2e/*`.

## 3. Testes executados (2026-11-21)

| Suíte | Comando | Resultado |
|---|---|---|
| Lint | `npm run lint` | ok |
| Tipos | `npm run typecheck` | ok |
| Unitários | `npm test` | **144/144** |
| Contrato e regressão (motor no Docker) | `CONTRACT_ENGINE_URL=http://localhost:18081/api npm run test:contract` | **7/7** (11 pulados: gravação e paridade, que são opt-in) |
| Paridade com o upstream | `npm run test:paridade` (motor no Docker + clone 1.7.2) | **104/104**: 69 idênticos, 10 com erro idêntico, 23 recusados pelos dois (não são operações de regime geral: saídas esperadas, base unificada, pedágio) |
| E2E | `npm run build && npm run test:e2e` | **9/9** (servidor de replay com respostas e dados abertos gravados do motor) |
| Build | `npm run build` | ok, ~10 s |
| Dependências | `npm audit` | 0 vulnerabilidades |
| Manual | Fluxo guiado e modo desenvolvedor no navegador contra o motor no Docker | ok (CALCULADO com memória e tabela; entrada inválida devolve VAL-009, VAL-013 e VAL-004 do motor) |

Medições (ambiente: Windows 11, Node 24, motor no Docker local; método: 20 requisições sequenciais com keep-alive):
- `GET /api/dados-abertos/*` com cache: p50 2,3 ms.
- JS carregado em `/simular`: ~225 KB (11 chunks, sem compressão do servidor local).

## 4. Decisões

- **Quem valida é o motor.** O BFF só barra o que não dá para encaminhar (corpo que não é JSON objeto, `itens` vazio, limites da instância). A conferência local existe para ajudar quem preenche, não para decidir.
- **Texto original, sem reprocessar**, nos dois sentidos. Comparação de paridade com normalização mínima e documentada (só `timestamp` e ordem de listas de erros do motor).
- **Formulário guiado a partir do contrato publicado pelo motor** (OpenAPI e dados abertos), e não de textos escritos à mão. Quando o upstream mudar, o teste de contrato avisa.
- **Histórico só no navegador**, sem servidor, com aviso para não usar dados reais.

## 5. Pendente e próximos passos

| Item | Estado | Observação |
|---|---|---|
Atualizado em 2026-11-26 (detalhes na seção 8).

| Item | Estado | Observação |
|---|---|---|
| Publicação da fase 3 em efer.online | Testado | Publicada em 2026-11-21. |
| Paridade e contrato na CI | Testado | `.github/workflows/paridade-motores.yml`, PR #9. |
| GIFs do README | Testado | Regravados em 2026-11-21. |
| Comparação lado a lado de duas simulações | Testado | PR #11. |
| Simples Nacional e DANFSe | Testado | Seção 7. |
| CSP (Content-Security-Policy) | Testado | PR #10. |
| Publicar CSP e comparação em efer.online | **Preparado** | Depende de aprovação. |
| Issues no upstream | **Preparado** | Textos em `docs/upstream/rascunhos-de-issues.md`; dependem de aprovação. |
| Relatório PDF | Pendente | Fora do escopo. |

## 6. Riscos conhecidos

- O motor 1.7.2 devolve erros em ordem não determinística; quem integrar não deve depender da ordem.
- Os dados abertos (CST e cClassTrib) vêm da base do motor em uso; a lista muda quando a base muda (por exemplo, V0073 → V0074).
- A instância pública é única e compartilhada; limites e capacidade em `docs/deploy-efer-online.md`.

## 7. Simples Nacional e DANFSe (2026-11-21)

| Item | Estado | Evidência |
|---|---|---|
| Simples Nacional 1.0.2 (`f90b652`) | Testado | Build oficial com 376 testes verdes; contrato OpenAPI versionado (`lib/tax-engine/contrato/simples-nacional.openapi.json`) e comparado com o motor rodando; fixtures gravadas do motor; E2E guiado e desenvolvedor. |
| Gerador DANFSe 1.0.0 (`8d79e6b`) | Testado | Imagem do Dockerfile do upstream; PDF e recusa gravados do serviço real; E2E. |
| Compose com os três serviços | Testado localmente | `docker compose up` no Docker local: os três respondem pela API do app; DANFSe como `nobody` e só leitura. |
| Publicação em efer.online | Testado | Release `20261121T042634Z`: 16 rotas do servidor iguais antes e depois; os três status `disponivel`; simulação do Simples `CALCULADO`; PDF do DANFSe 200; medição na VPS em `docs/deploy-efer-online.md`. |

Achados (detalhes em `docs/upstream-integration.md`):

- **P2**: o exemplo de NFS-e do OpenAPI do Simples 1.0.2 usa a NBS `114051000`, que não existe na base `V0073` (o motor devolve `VSN-050`).
- **P2**: a mitigação `-XX:-UseBASE64Intrinsics` citada nos CHANGELOGs dos dois motores Java não está no código publicado; aplicada aqui nas imagens de execução.
- **P3**: o endpoint clássico do Simples está marcado como obsoleto; o app usa o não assistido.
- **P3**: o gerador de DANFSe responde `400` também para falhas internas (documentado pelo upstream).

## 8. CI com os motores reais, CSP e comparação (2026-11-26)

| Item | Estado | Evidência |
|---|---|---|
| Job de paridade e contrato com os três motores | Testado | `paridade-motores.yml`: semanal (segunda, 06:17 em Brasília), `workflow_dispatch` e PR que muda `lib/tax-engine/**`, `tests/contract/**` ou o próprio workflow. Clona os motores pelos commits fixados (`32df719`, `f90b652`, `8d79e6b`), compila com Java 25 + Maven e Go, com cache de Maven, dos JARs/bancos e do Go. Primeira execução (PR #9): 117 testes, 0 falhas (13 de contrato e regressão, 104 de paridade). |
| Regressão do Simples Nacional e do DANFSe | Testado | `tests/contract/regressao-simples-danfse.test.ts`: as 3 fixtures do Simples e o PDF do DANFSe, comparado por sha256 (o gerador é determinístico: duas gerações e a fixture têm o mesmo hash). Falha se o upstream mudar; a correção é revisar e regravar, nunca ajustar o teste. |
| CSP com nonce | Testado | `proxy.ts` gera o nonce por requisição; `instant = false` no layout raiz torna as páginas dinâmicas (shell estático não leva nonce). Build com e sem `basePath`: todos os scripts de `/`, `/simular` e da 404 com o nonce da resposta. E2E confere cabeçalho, nonce em cada `<script>` e nenhuma violação nos fluxos de cálculo, DANFSe (`blob:`) e navegação. |
| Comparação de duas simulações | Testado | `lib/simulation/comparar.ts` (unitários) e E2E com duas simulações gravadas do regime regular. Só emparelha valores; nenhuma conta. |
| Textos para o upstream | Preparado | `docs/upstream/rascunhos-de-issues.md`, não enviados. |

Testes nesta rodada: 168 unitários, 14 E2E, lint, tipos e build; contrato e regressão locais contra os três motores no Docker (13/13).

Achado novo:

- **P3 (acompanhar)**: a tag `1.7.2` do regime regular foi movida em 2026-11-25 para `39363aa` (antes `32df719`). A diferença apaga dois arquivos: uma cópia duplicada de `ArredondamentoUtils.java` (a classe continua em `shared/util`) e `CaptchaException.java`. A instância pública e o CI seguem fixados em `32df719`. Próximo passo: rodar o job de paridade com `39363aa` antes de trocar o pino.

Custo da CSP: as páginas deixam de ser estáticas e passam a ser renderizadas a cada requisição. A API não muda.

