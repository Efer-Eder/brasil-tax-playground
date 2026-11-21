import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Fluxo ponta a ponta com o servidor de replay (respostas e dados abertos
 * gravados do motor oficial 1.7.2). Os valores conferidos vêm das fixtures.
 */
const fixture = (id: string) =>
  JSON.parse(readFileSync(join(process.cwd(), "tests", "fixtures", "regime-regular", `${id}.json`), "utf8"));

async function modoDesenvolvedor(page: Page) {
  await page.goto("/simular");
  await page.getByRole("tab", { name: "Desenvolvedor (JSON)" }).click();
}

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

test("o card do GitHub falha de forma explícita quando a API não responde", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Não deu para falar com a API do GitHub agora")).toBeVisible();
  await expect(page.getByRole("link", { name: "Abrir no GitHub" })).toBeVisible();
});

test("modo guiado: monta a operação com listas do motor e mostra o resultado dele", async ({ page }) => {
  const f = fixture("item-unico-2026");
  const memoria = f.resposta.objetos[0].tribCalc.IBSCBS.memoriaCalculo.cbs as string;

  await page.goto("/simular");
  await expect(page.getByRole("tab", { name: "Guiado" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Próximo" }).click();

  // Etapa 2: sem data, não avança e explica.
  await page.getByRole("button", { name: "Próximo" }).click();
  await expect(page.getByText("Informe a data do fato gerador")).toBeVisible();

  await page.getByLabel("Data do fato gerador").fill("2026-06-01");
  await page.getByLabel("UF", { exact: true }).selectOption("RS");
  await page.getByLabel("Município").selectOption("4314902");
  await page.getByText("Identificação do documento (id e versão)").click();
  await page.getByRole("textbox", { name: "id obrigatório", exact: true }).fill(f.requisicao.id);
  await page.getByRole("button", { name: "Próximo" }).click();

  // Etapa 3: NCM consultado no motor, CST e cClassTrib vindos da tabela dele.
  await page.getByLabel("Código NCM").fill("22030000");
  await expect(page.getByText("Cervejas de malte.")).toBeVisible();
  await page.getByRole("combobox", { name: "CST obrigatório", exact: true }).selectOption("000");
  await page.getByRole("combobox", { name: "cClassTrib obrigatório", exact: true }).selectOption("000001");
  await page.getByLabel("Base de cálculo (R$)").fill("100");
  await page.getByRole("button", { name: "Próximo" }).click();

  // Etapa 4: revisão mostra o JSON exato e confere o contrato.
  await expect(page.getByText("Estrutura conforme o contrato do motor.")).toBeVisible();
  await expect(page.getByLabel("JSON que será enviado")).toContainText('"cClassTrib": "000001"');
  await page.getByRole("button", { name: "Simular" }).click();

  const item = page.getByRole("listitem").filter({ hasText: "Item 1" });
  await expect(item.getByText("CALCULADO", { exact: true })).toBeVisible();
  await expect(item.getByRole("listitem").filter({ hasText: memoria })).toBeVisible();
  await expect(page.getByText("histórico neste navegador (1)")).toBeVisible();
});

test("modo desenvolvedor: simula o item único e mostra a memória de cálculo do motor", async ({ page }) => {
  const f = fixture("item-unico-2026");
  const memoria = f.resposta.objetos[0].tribCalc.IBSCBS.memoriaCalculo.cbs as string;

  await modoDesenvolvedor(page);
  await page.getByRole("button", { name: "Simular" }).click();

  const item = page.getByRole("listitem").filter({ hasText: "Item 1" });
  await expect(item.getByText("CALCULADO", { exact: true })).toBeVisible();
  await expect(item.getByRole("listitem").filter({ hasText: memoria })).toBeVisible();
  // Tabela com o rótulo publicado pelo motor e o valor como ele devolveu.
  await expect(item.getByRole("row").filter({ hasText: "Base de cálculo do IBS e CBS" })).toContainText("100.00");
});

test("mostra o erro do motor no item com cClassTrib inexistente", async ({ page }) => {
  const erro = fixture("erro-por-item-2026").resposta.objetos[1].erros[0];

  await modoDesenvolvedor(page);
  await page.getByLabel("Exemplo fictício").selectOption("erro-por-item-2026");
  await page.getByRole("button", { name: "Simular" }).click();

  const item = page.getByRole("listitem").filter({ hasText: "Item 2" });
  await expect(item.getByText("INCONSISTENCIA_ENTRADA", { exact: true })).toBeVisible();
  await expect(item.getByText(erro.detail, { exact: true })).toBeVisible();
});

test("campos inválidos: conferência local e, se enviar mesmo assim, os códigos do motor", async ({ page }) => {
  const erros = fixture("invalido-estrutural").resposta.objetos[0].erros as { code: string }[];

  await modoDesenvolvedor(page);
  await page.getByLabel("Exemplo fictício").selectOption("invalido-estrutural");
  await page.getByRole("button", { name: "Simular" }).click();

  const alerta = page.getByRole("alert").filter({ hasText: "conferência local" });
  await expect(alerta).toContainText("itens.0.cst");
  await alerta.getByRole("button", { name: "Enviar ao motor mesmo assim" }).click();

  const item = page.getByRole("listitem").filter({ hasText: "Item 1" });
  await expect(item.getByText("INCONSISTENCIA_ENTRADA", { exact: true })).toBeVisible();
  for (const e of erros) await expect(item.getByText(e.code, { exact: false }).first()).toBeVisible();
});

test("exporta a simulação em JSON e CSV com a resposta do motor", async ({ page }) => {
  const f = fixture("servico-reducao-2026");

  await modoDesenvolvedor(page);
  await page.getByLabel("Exemplo fictício").selectOption("servico-reducao-2026");
  await page.getByRole("button", { name: "Simular" }).click();
  await expect(page.getByText("Item 1")).toBeVisible();

  const [json] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exportar JSON" }).click()]);
  const exportado = JSON.parse(readFileSync(await json.path(), "utf8"));
  expect(exportado.resposta).toEqual(f.resposta);
  expect(exportado.requisicao).toEqual(f.requisicao);
  expect(exportado.motor.versao).toEqual(f.motor.versao);

  const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Exportar CSV" }).click()]);
  const texto = readFileSync(await csv.path(), "utf8");
  expect(texto).toContain(`"1";"CALCULADO";"tribCalc.IBSCBS.gIBSCBS.vBC";"1200.00"`);
});

test("histórico: reabre e duplica uma simulação guardada no navegador", async ({ page }) => {
  await modoDesenvolvedor(page);
  await page.getByRole("button", { name: "Simular" }).click();
  await expect(page.getByText("histórico neste navegador (1)")).toBeVisible();

  await page.reload();
  await expect(page.getByText("histórico neste navegador (1)")).toBeVisible();
  await page.getByRole("button", { name: /^Reabrir resultado de/ }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Item 1" }).getByText("CALCULADO", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /^Remover / }).click();
  await expect(page.getByText("histórico neste navegador (0)")).toBeVisible();
});
