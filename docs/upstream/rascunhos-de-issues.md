# Rascunhos de issues para os repositórios oficiais

Achados da integração (ver `DEVELOPMENT_REPORT.md`). **Nada aqui foi enviado.** Cada texto só vira issue no repositório da Receita Federal com aprovação explícita; depois de aberto, o link entra na tabela abaixo.

| # | Repositório | Assunto | Situação |
|---|---|---|---|
| 1 | `ReceitaFederal/calculadora-rtc-simples-nacional` | Exemplo de NFS-e do OpenAPI usa NBS inexistente na base V0073 | Rascunho, não enviado |
| 2 | `ReceitaFederal/calculadora-rtc-simples-nacional` e `ReceitaFederal/calculadora-rtc-regime-regular` | Mitigação `-XX:-UseBASE64Intrinsics` citada no CHANGELOG não aparece nas instruções de execução | Rascunho, não enviado |

Conferido em 2026-11-26: nenhuma issue aberta ou fechada nos dois repositórios menciona `114051000`, `VSN-050` ou `BASE64`.

---

## 1. Exemplo de NFS-e do endpoint não assistido retorna VSN-050 (NBS 114051000 não existe na base V0073)

**Repositório:** `ReceitaFederal/calculadora-rtc-simples-nacional`

**Título:** Exemplo "NFS-e — construção civil com isenção municipal" do OpenAPI retorna VSN-050 na base V0073

**Corpo:**

> Versão: 1.0.2 (tag `1.0.2`, commit `f90b652`), perfil `offline`, banco gerado com os scripts Flyway do `calculadora-rtc-regime-regular` 1.7.2 (`versaoDb` V0073, `dataVersaoDb` 2026-11-09).
>
> O exemplo publicado no OpenAPI para `POST /calculadora/observabilidade/simples-nacional/nao-assistido`, chamado "NFS-e — construção civil com isenção municipal", usa `"nbs": "114051000"`. Enviado sem alteração, o item volta com `estadoItem: INCONSISTENCIA_ENTRADA` e o erro:
>
> ```json
> {"code": "VSN-050", "title": "NBS desconhecido", "pointer": "#/itens/0/nbs",
>  "detail": "NBS de código 114051000 não encontrada para a data 2027-03-15"}
> ```
>
> A consulta à NBS no motor do regime regular com a mesma base confirma: `GET /api/calculadora/dados-abertos/nbs?nbs=114051000&data=2027-03-15` responde 404 "NBS não encontrada".
>
> Como reproduzir:
> 1. Subir o motor conforme o README (perfil offline).
> 2. Abrir `/api/swagger-ui.html`, escolher o exemplo "NFS-e — construção civil com isenção municipal" e executar.
>
> Esperado: o exemplo calcular (ou mostrar outro erro intencional, com isso indicado na descrição).
> Sugestão: trocar a NBS do exemplo por uma vigente na base distribuída, ou documentar que o exemplo demonstra o VSN-050.

---

## 2. A mitigação `-XX:-UseBASE64Intrinsics` não aparece nas instruções de execução

**Repositórios:** `ReceitaFederal/calculadora-rtc-simples-nacional` (CHANGELOG 1.0.1) e `ReceitaFederal/calculadora-rtc-regime-regular` (CHANGELOG 1.7.1). Uma issue em cada, com o mesmo texto ajustado.

**Título:** Mitigação `-XX:-UseBASE64Intrinsics` do CHANGELOG não está no README nem na configuração de execução

**Corpo:**

> O CHANGELOG registra, em Segurança: "Mitigada vulnerabilidade do OpenJDK com `-XX:-UseBASE64Intrinsics`, conforme aviso de segurança de 17/11/2026" (1.0.1 no Simples Nacional; 1.7.1 no regime regular).
>
> Na árvore publicada (tag `1.0.2` / `f90b652` do Simples; `1.7.2` / `32df719` do regime regular) a flag não aparece no `pom.xml`, em `.mvn/`, nos scripts, nem nos comandos do README:
>
> ```bash
> java -Dspring.profiles.active=offline -jar target/api-simples-nacional.jar
> ```
>
> Quem segue o README roda a aplicação sem a mitigação. Busca no repositório: a string só aparece no `CHANGELOG.md`.
>
> Sugestão: incluir a flag nos comandos `java -jar` e `spring-boot:run` do README (por exemplo `java -XX:-UseBASE64Intrinsics -Dspring.profiles.active=offline -jar ...`) e/ou em `jvmArguments` do `spring-boot-maven-plugin`, ou explicar no CHANGELOG onde a mitigação é aplicada.
