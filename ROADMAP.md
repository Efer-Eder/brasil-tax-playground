# Roadmap

Nada aqui está pronto, a não ser o que estiver marcado. Ordem sujeita a mudanças.

## Fundação — feito

- [x] App Next.js, aviso legal persistente, página de escopo.
- [x] Adapter HTTP do regime regular (versão + cálculo com observabilidade) com erros tipados.
- [x] Status do motor na UI, sem números falsos quando indisponível.
- [x] Documentação do upstream e CI.

## v0.1.0 — regime regular de ponta a ponta

- [ ] Subir o motor oficial (tag 1.7.2) localmente no Windows seguindo o README e registrar a versão retornada.
- [ ] Rota `POST /api/simular/regime-regular` usando `calcularComObservabilidade`.
- [ ] Formulário de operação com os campos suportados pelo upstream (incluindo alíquotas nominais informadas pelo usuário a partir de 2027).
- [ ] Tela de resultado: valores por item, `estadoItem`, erros, `memoriaCalculo`, avisos (`x-warning-dados-simulados`), versão do motor e data.
- [ ] Inspetor de JSON (request/response) e exportação da simulação em JSON.
- [ ] Três cenários com fixtures geradas pelo motor real e teste de paridade resposta × tela.
- [ ] Erro de validação (ex.: HTTP 422/`INCONSISTENCIA_ENTRADA`) explicado ao usuário.
- [ ] Testes ponta a ponta com Playwright.

## Depois

- Simples Nacional (porta 8082).
- DANFSe: upload de XML e geração de PDF pelo serviço oficial.
- Docker Compose, se o upstream publicar Dockerfile/imagem ou se for possível testar um Compose fiel ao README.
- Testes de contrato/regressão contra novas versões do upstream.
- Biblioteca de cenários, comparação entre anos-calendário, exportação PDF.
