# ADR 0004 — npm como gerenciador de pacotes

- Data: 2026-11-20
- Status: Aceito

## Contexto

A especificação sugere `pnpm`, mas ele não está instalado na máquina principal (Windows 11, Node 24, npm 11). Instalar globalmente exigiria autorização e acrescentaria um passo para quem clona o projeto.

## Decisão

Usar **npm**, que já vem com o Node. O lockfile versionado é `package-lock.json` e a CI usa `npm ci`.

## Consequências

- Instalação com zero ferramentas extras: `npm ci`.
- Migrar para pnpm no futuro é simples (gerar `pnpm-lock.yaml` e trocar os comandos da CI), se houver motivo concreto.
