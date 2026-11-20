# Brasil Tax Playground

[Português](README.md)

> **Work in progress.** You can already send a regular-regime transaction to the official engine through a JSON editor and inspect the response. The guided form does not exist yet.

> Independent, unofficial tool. It does not replace accounting or tax advice and has no affiliation with Brazil's Federal Revenue Service (Receita Federal).

An educational web interface for exploring the **open-source engines of Brazil's consumption tax reform** (CBS, IBS and the Selective Tax, IS) that Receita Federal published on GitHub. The goal: fill in a transaction, send it to an engine **you** run locally, and inspect the result, the calculation trail and the raw JSON.

Core rule: **no tax rate, rule or calculation is invented here**. Every number shown will come from the official engine's response, together with its version. If the engine is unavailable, the app says so and shows no values.

## What exists today

- Home page describing the scope (CBS, IBS, IS) and a persistent legal notice on every page.
- `/simular` page: JSON editor with three fictitious examples, sent to the engine through the BFF (`POST /api/simular/regime-regular`), per-item state, errors, calculation trail (text produced by the engine), engine version, request/response inspector and JSON export.
- Status panel for the regular-regime engine: *not configured*, *unavailable* or *available* (with the version reported by the engine).
- `lib/tax-engine/`: types, env-based configuration, zod schemas mirroring the upstream input, and an HTTP client for the regular regime with timeout and typed errors.
- Vitest tests for configuration, schemas and unavailability handling.

| Integration | Status in this project |
|---|---|
| [Regular regime](https://github.com/ReceitaFederal/calculadora-rtc-regime-regular) | In progress (simulation via JSON editor; guided form pending) |
| [Simples Nacional](https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional) | Planned |
| [DANFSe generator](https://github.com/ReceitaFederal/calculadora-rtc-gerador-danfse) | Planned (renders a PDF from XML; does not calculate taxes) |

## Run locally (Windows)

Requirements: Node.js 20.9+ (tested with Node 24) and npm.

```powershell
git clone https://github.com/Efer-Eder/brasil-tax-playground.git
cd brasil-tax-playground
npm ci
copy .env.example .env.local
npm run dev
```

Open http://localhost:3000. Without an engine, the panel shows **Não configurado** (not configured) — that is expected.

### Connect the official engine

The regular-regime engine is a Java 25 / Spring Boot API you run yourself. The steps (build the SQLite database with Flyway, start with the `offline` profile) are in [docs/upstream-integration.md](docs/upstream-integration.md) (Portuguese), with links and the commit reviewed. Once it is running, set in `.env.local`:

```env
REGIME_REGULAR_ENGINE_URL=http://localhost:8080/api
```

## Scripts

`npm run dev`, `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` (after a build; replays recorded engine responses), `npm run test:contract`, `npm run fixtures:gravar`.

## Limitations

- Input is a JSON editor; the guided form does not exist yet.
- The connection was verified against the official engine 1.7.2 running locally (status and contract tests); CI uses a mocked `fetch`.
- No Docker Compose: the regular-regime upstream ships no Dockerfile (see [ADR 0003](docs/adr/0003-sem-docker-compose-por-enquanto.md)).

## License

[MIT](LICENSE) © Efer Eder. The official engines have their own license (MIT) and copyright holder and are not redistributed here.
