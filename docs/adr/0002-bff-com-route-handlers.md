# ADR 0002 — Backend-for-frontend com route handlers do Next.js

- Data: 2026-11-20
- Status: Aceito

## Contexto

O navegador poderia chamar o motor diretamente, mas isso exigiria CORS configurado no motor, exporia a URL interna e espalharia o tratamento de erros pelo cliente.

## Decisão

- O navegador fala apenas com rotas do próprio app (`app/api/...`). As rotas chamam o motor no servidor, com timeout e mapeamento de erros (`EngineNotConfiguredError`, `EngineUnavailableError`, `EngineHttpError`, `EngineContractError`).
- Respostas do motor são validadas com zod só no envelope e repassadas integralmente para o inspetor técnico.
- Não há banco de dados; nada é persistido no servidor.

## Consequências

- Um único processo Node atende UI e BFF; não há serviço extra para manter.
- O motor pode ficar sem exposição externa (só `localhost`).
