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

## Interface

- O formulário guiado não pré-preenche nenhum valor fiscal, nem a data do fato gerador. As listas (UF, município, CST e cClassTrib) e as descrições de NCM e NBS vêm dos dados abertos do motor em uso.
- A ajuda dos campos e os rótulos dos resultados são os textos que o motor publica no OpenAPI.
- O BFF de dados abertos só aceita uma lista fechada de consultas, com parâmetros validados; não é um proxy genérico para o motor.
- O histórico de simulações fica só no `localStorage` do navegador (até 20 registros), com aviso na tela para não usar dados reais de clientes.
- A comparação de duas simulações só emparelha os valores que os motores devolveram; não calcula diferença, percentual nem interpreta o resultado.
- Simples Nacional: as alíquotas efetivas do contribuinte (`aliquotasEfetivas`) são informadas por quem simula; o formulário não sugere valor. Os exemplos usam só as alíquotas publicadas no OpenAPI do próprio motor 1.0.2, e um teste garante isso.
- DANFSe: o XML vai ao gerador oficial como chegou (bytes, sem recodificar) e o PDF volta como ele gerou. O app não guarda XML nem PDF. O exemplo é uma NFS-e fictícia (CNPJ e CPF zerados, homologação, sem tributos), e a tela pede para não usar notas reais de clientes na instância pública.

## Instância pública (efer.online)

- O app não grava as operações enviadas. Nem o app nem o motor registram o corpo das requisições.
- O Nginx da VPS mantém o log de acesso padrão (IP, data, caminho e status), sem o corpo. Esse log existe para operação e segurança do servidor.
- A API não tem cadastro, cookies nem chave; o CORS é aberto. Os limites de uso protegem a instância e não envolvem identificação de pessoas.
- A instância roda o motor oficial sem modificações. A versão em uso aparece em toda resposta e na página inicial.

## Mudanças de norma ou do upstream

- Cada adapter registra a referência (tag/commit) consultada.
- Mudanças no upstream devem ser refletidas em `docs/upstream-integration.md` e detectadas por testes de contrato (planejados).
