# ADR 0005 — Instância pública em efer.online

- Data: 2026-11-20
- Status: Aceito (substitui em parte o ADR 0003)

## Contexto

Rodar o motor localmente exige Java 25 e alguns passos de build, o que afasta quem só quer experimentar. Eu queria uma instância aberta, sem cadastro, com uma API própria que outras pessoas pudessem chamar.

## Decisão

- Publicar app e motor oficial (sem modificações) na minha VPS, em `https://efer.online/projeto/brasil-tax-playground/`, com API em `https://efer.online/api/brasil-tax-playground/`.
- A API pública é o BFF do app, e não o motor: validação estrutural, teto de itens, fila com limite de concorrência e timeouts. O motor fica sem porta publicada, numa rede Docker interna.
- Docker Compose com um Dockerfile **de execução** próprio para o motor: ele só roda o JAR e o banco gerados pelos passos do README oficial. Nada é compilado de forma diferente do upstream.
- Limites (CPU, memória, rate limit, fila e timeouts) definidos a partir de medições, documentadas em [deploy-efer-online.md](../deploy-efer-online.md).

## Consequências

- Qualquer pessoa usa sem instalar nada; quem precisar de mais volume roda o motor localmente.
- Passo a manter uma instância: atualizar o motor quando sair versão nova e regravar as fixtures.
- A instância continua independente e não oficial; o aviso legal segue em todas as páginas e na documentação da API.
