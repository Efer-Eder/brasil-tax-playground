import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

/**
 * Fluxo ponta a ponta com o servidor de replay (respostas gravadas do motor
 * oficial 1.7.2). Os valores conferidos vêm das próprias fixtures.
 */
const fixture = (id: string) =>
  JSON.parse(readFileSync(join(process.cwd(), "tests", "fixtures", "regime-regular", `${id}.json`), "utf8"));

test("o aviso legal aparece em todas as páginas", async ({ page }) => {
  for (const path of ["/", "/simular"]) {
    await page.goto(path);
    await expect(
      page.getByRole("note", { name: "Aviso legal" }),
    ).toHaveText("Ferramenta independente, não oficial e não substitui orientação contábil ou tributária");
  }
});

test("a home mostra o motor disponível com a versão informada por ele", async ({ page }) => {
  const { versao } = fixture("item-unico-2026").motor;
  await page.goto("/");
  await expect(page.getByText("Disponível")).toBeVisible();
  await expect(page.getByText(versao.versaoApp, { exact: true })).toBeVisible();
  await expect(page.getByText(versao.versaoDb, { exact: true })).toBeVisible();
});

test("simula o item único e mostra a memória de cálculo do motor", async ({ page }) => {
  const f = fixture("item-unico-2026");
  const memoria = f.resposta.objetos[0].tribCalc.IBSCBS.memoriaCalculo.cbs as string;

  await page.goto("/simular");
  await page.getByRole("button", { name: "Simular" }).click();

  const item = page.getByRole("listitem").filter({ hasText: "Item 1" });
  await expect(item.getByText("CALCULADO", { exact: true })).toBeVisible();
  await expect(item.getByRole("listitem").filter({ hasText: memoria })).toBeVisible();
});

test("mostra o erro do motor no item com cClassTrib inexistente", async ({ page }) => {
  const erro = fixture("erro-por-item-2026").resposta.objetos[1].erros[0];

  await page.goto("/simular");
  await page.getByLabel("Exemplo fictício").selectOption("erro-por-item-2026");
  await page.getByRole("button", { name: "Simular" }).click();

  const item = page.getByRole("listitem").filter({ hasText: "Item 2" });
  await expect(item.getByText("INCONSISTENCIA_ENTRADA", { exact: true })).toBeVisible();
  await expect(item.getByText(erro.detail, { exact: true })).toBeVisible();
});

test("barra entrada inválida antes do motor e explica os problemas", async ({ page }) => {
  await page.goto("/simular");
  await page.getByLabel("Exemplo fictício").selectOption("invalido-estrutural");
  await page.getByRole("button", { name: "Simular" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "HTTP 422" })).toContainText("Operação inválida (HTTP 422)");
  await expect(page.getByText("itens.0.cst")).toBeVisible();
});

test("exporta a simulação em JSON com a resposta do motor", async ({ page }) => {
  const f = fixture("servico-reducao-2026");

  await page.goto("/simular");
  await page.getByLabel("Exemplo fictício").selectOption("servico-reducao-2026");
  await page.getByRole("button", { name: "Simular" }).click();
  await expect(page.getByText("Item 1")).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar JSON" }).click(),
  ]);
  const exportado = JSON.parse(readFileSync(await download.path(), "utf8"));
  expect(exportado.resposta).toEqual(f.resposta);
  expect(exportado.requisicao).toEqual(f.requisicao);
  expect(exportado.motor.versao).toEqual(f.motor.versao);
});
