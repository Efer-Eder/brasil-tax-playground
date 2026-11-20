# ADR 0001 — Motor oficial como única fonte de números

- Data: 2026-11-20
- Status: Aceito

## Contexto

O projeto quer ajudar a estudar a Reforma Tributária do Consumo. Reproduzir fórmulas ou alíquotas na interface criaria risco de divergência com a norma e com o motor publicado pela Receita Federal, e daria aparência de autoridade a números não validados.

## Decisão

- Todo valor fiscal exibido vem da resposta do motor oficial (`calculadora-rtc-regime-regular` no MVP), executado pelo próprio usuário.
- A aplicação acessa o motor por um adapter (`RegimeRegularAdapter`) com cliente HTTP configurado por variável de ambiente.
- Sem motor configurado ou disponível, a UI informa o estado e não calcula nada.

## Consequências

- Para usar o playground é preciso subir o motor localmente (Java 25).
- Os testes da aplicação cobrem validação, tratamento de erro e fidelidade de exibição, não a correção tributária — essa é responsabilidade do upstream.
