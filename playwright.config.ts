import { defineConfig, devices } from "@playwright/test";

const APP_PORT = 3100;
const ENGINE_PORT = 18080;

/**
 * E2E contra o build de produção (rode `npm run build` antes) e o servidor de
 * replay de fixtures gravadas do motor oficial (tests/e2e/fixture-engine.mjs).
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "node tests/e2e/fixture-engine.mjs",
      url: `http://127.0.0.1:${ENGINE_PORT}/api/calculadora/dados-abertos/versao`,
      env: { FIXTURE_ENGINE_PORT: String(ENGINE_PORT) },
      reuseExistingServer: false,
    },
    {
      command: "node scripts/preparar-standalone.mjs && node .next/standalone/server.js",
      url: `http://127.0.0.1:${APP_PORT}`,
      env: {
        PORT: String(APP_PORT),
        HOSTNAME: "127.0.0.1",
        REGIME_REGULAR_ENGINE_URL: `http://127.0.0.1:${ENGINE_PORT}/api`,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      reuseExistingServer: false,
    },
  ],
});
