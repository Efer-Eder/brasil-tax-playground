# Notas de conformidade

Regras que valem para todo código, documentação e exemplo deste repositório.

## Números fiscais

- **Nenhuma alíquota, regra de transição, hipótese de incidência, vigência ou classificação tributária é codificada aqui.** Todo valor numérico exibido vem da resposta do motor oficial auto-hospedado, junto com a versão do motor que o produziu.
- Os schemas em `lib/tax-engine/schemas/` reproduzem só restrições **estruturais** declaradas no upstream (obrigatoriedade, número de dígitos, faixas de formato). Regras de negócio ficam com o motor.
- O app não pré-preenche alíquotas. Quando o motor exige `aliquotasNominais` (operações a partir de 2027, segundo o upstream), o usuário informa os valores e a UI deixa claro que o resultado é `CALCULO_SIMULADO`, conforme o próprio motor indica.
- Se o motor não estiver configurado ou não responder, a UI informa isso. **Não existe simulador alternativo** nem fallback silencioso.
- Exemplos e testes usam dados fictícios, identificados como tal. Fixtures de resposta só entram no repositório se forem geradas pelo motor real, com tag/commit registrados.

## Identidade e marcas

- Rótulo persistente em todas as páginas: "Ferramenta independente, não oficial e não substitui orientação contábil ou tributária".
- Não usar brasões, logotipos ou identidade visual da Receita Federal ou do governo. Citar os repositórios oficiais apenas como fonte, com link.
- Nunca usar os termos "oficial", "homologado" ou "certificado" para descrever esta aplicação.

## Licenças

- Código deste repositório: MIT (titular Efer Eder).
- Motores oficiais: MIT, titular Receita Federal do Brasil (conferido em 20/11/2026). Eles são executados separadamente e **não** são redistribuídos aqui. Se algum trecho for incorporado no futuro, o aviso de copyright e a licença devem ser preservados.
- Documentação do upstream é citada por link, não copiada.

## Privacidade

- Sem banco de dados e sem armazenamento de dados fiscais no servidor por padrão.
- O BFF repassa a operação ao motor configurado em `REGIME_REGULAR_ENGINE_URL` e a nenhum outro destino.
- Sem analytics ou telemetria.
- O app não chama `GET /versao/status` do motor, que por padrão consulta um servidor do governo (ver `docs/upstream-integration.md`).

## Mudanças de norma ou do upstream

- Cada adapter registra a referência (tag/commit) consultada.
- Mudanças no upstream devem ser refletidas em `docs/upstream-integration.md` e detectadas por testes de contrato (planejados).
