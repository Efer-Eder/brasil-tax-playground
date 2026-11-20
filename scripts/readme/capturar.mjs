// Captura telas reais do app em produção para montar os GIFs do README.
//
// Uso: node scripts/readme/capturar.mjs [saida] [base]
//   saida: pasta para os PNGs e o JSON de posições (padrão: .readme-captura)
//   base:  URL da página do projeto (padrão: instância pública)
//
// Nada é inventado: as telas mostram o app e o motor oficial respondendo.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const saida = process.argv[2] ?? ".readme-captura";
const base = (process.argv[3] ?? "https://efer.online/projeto/brasil-tax-playground").replace(/\/+$/, "");
mkdirSync(saida, { recursive: true });

const VIEW = { width: 1280, height: 800 };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 1, colorScheme: "dark" });
const posicoes = {};

async function caixa(locator) {
  const b = await locator.boundingBox();
  return b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
}

// 1) Página do projeto inteira, depois que status do motor e card do GitHub carregam.
await page.goto(base, { waitUntil: "networkidle" });
await page.getByText("Disponível").first().waitFor();
await page.getByText("Commits recentes").waitFor({ timeout: 15000 }).catch(() => {});
await page.waitForTimeout(800);
await page.screenshot({ path: join(saida, "pagina-inteira.png"), fullPage: true });
posicoes.pagina = {
  github: await page.locator("#github").evaluate((e) => Math.round(e.getBoundingClientRect().top + scrollY)),
  api: await page.locator("#api").evaluate((e) => Math.round(e.getBoundingClientRect().top + scrollY)),
  como: await page.locator("#como").evaluate((e) => Math.round(e.getBoundingClientRect().top + scrollY)),
};

// 2) Simulador: estado inicial, exemplo com erro em um item, resultado.
await page.goto(`${base}/simular`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: join(saida, "sim-01-inicial.png") });
posicoes.select = await caixa(page.getByLabel("Exemplo fictício"));
posicoes.botao = await caixa(page.getByRole("button", { name: "Simular" }));

await page.getByLabel("Exemplo fictício").selectOption("erro-por-item-2026");
await page.waitForTimeout(300);
await page.screenshot({ path: join(saida, "sim-02-exemplo.png") });

await page.getByRole("button", { name: "Simular" }).click();
await page.getByText("INCONSISTENCIA_ENTRADA", { exact: true }).waitFor({ timeout: 15000 });
await page.waitForTimeout(500);
await page.screenshot({ path: join(saida, "sim-03-resultado.png") });
await page.screenshot({ path: join(saida, "sim-04-resultado-inteiro.png"), fullPage: true });
posicoes.item2 = await page
  .getByRole("listitem")
  .filter({ hasText: "Item 2" })
  .evaluate((e) => Math.round(e.getBoundingClientRect().top + scrollY));

// 3) Entrada inválida: barrada antes do motor.
await page.evaluate(() => scrollTo(0, 0));
await page.getByLabel("Exemplo fictício").selectOption("invalido-estrutural");
await page.getByRole("button", { name: "Simular" }).click();
await page.getByRole("alert").filter({ hasText: "HTTP 422" }).waitFor();
await page.waitForTimeout(400);
await page.screenshot({ path: join(saida, "sim-05-invalido.png") });

// 4) Respostas reais da API pública para a animação de terminal.
const api = base.replace("/projeto/brasil-tax-playground", "/api/brasil-tax-playground");
const status = await (await fetch(`${api}/engine/status`)).json();
const operacao = {
  id: "readme",
  versao: "1.0.0",
  dhFatoGerador: "2026-06-01T10:00:00-03:00",
  municipio: 4314902,
  uf: "RS",
  itens: [{ numero: 1, ncm: "22030000", cst: "000", cClassTrib: "000001", baseCalculo: 100 }],
};
const sim = await (
  await fetch(`${api}/simular/regime-regular`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(operacao),
  })
).json();
writeFileSync(join(saida, "api.json"), JSON.stringify({ base: api, status, operacao, sim }, null, 2));

writeFileSync(join(saida, "posicoes.json"), JSON.stringify(posicoes, null, 2));
await browser.close();
console.log("capturas em", saida);
