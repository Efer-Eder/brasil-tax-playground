# Política de segurança

## Versões suportadas

O projeto ainda não tem release. Correções são feitas na branch `main`.

## Como relatar uma vulnerabilidade

**Não abra issue pública.** Use o relato privado do GitHub: aba **Security → Report a vulnerability** neste repositório.

Inclua, se possível: descrição, passos para reproduzir, impacto e versão/commit afetado. A ideia é responder em até 7 dias.

## Escopo

- Este repositório: a aplicação web e o BFF.
- Vulnerabilidades nos motores oficiais (`ReceitaFederal/calculadora-rtc-*`) devem ser relatadas aos mantenedores deles, conforme o `SECURITY.md` de cada repositório.

## Boas práticas adotadas

- Sem segredos no repositório; varredura com gitleaks na CI.
- Variáveis de ambiente só no servidor; o navegador nunca recebe a URL interna para chamar o motor diretamente.
- Sem armazenamento de dados fiscais no servidor e sem telemetria.
