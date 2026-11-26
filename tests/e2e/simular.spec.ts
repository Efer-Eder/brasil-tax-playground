import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * Fluxo ponta a ponta com o servidor de replay (respostas, dados abertos e PDF
 * gravados dos motores oficiais). Os valores conferidos vêm das fixtures.
 */
const fixture = (id: string, motor = "regime-regular") =>
  JSON.parse(readFileSync(join(process.cwd(), "tests", "fixtures", motor, `${id}.json`), "utf8"));

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

test("a home mostra os três serviços disponíveis com a versão informada por eles", async ({ page }) => {
  await page.goto("/");
  const painel = (titulo: string) => page.locator("div.card").filter({ hasText: titulo });
  for (const [titulo, versao] of [
    ["motor oficial · regime regular", fixture("item-unico-2026").motor.versao],
    ["motor oficial · simples nacional", fixture("sn-nfe-crt1", "simples-nacional").motor.versao],
  ] as const) {
    await expect(painel(titulo).getByText("Disponível")).toBeVisible();
    await expect(painel(titulo).getByText(versao.versaoApp, { exact: true })).toBeVisible();
    await expect(painel(titulo).getByText(versao.versaoDb, { exact: true })).toBeVisible();
  }
  await expect(painel("gerador oficial · danfse").getByText("Disponível")).toBeVisible();
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
  await expect(page.getByRole("radio", { name: /Regime Regular/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByRole("tab", { name: "Guiado" })).toHaveAttribute("aria-selected", "true");

  // Etapa 1: sem data, não avança e explica.
  await page.getByRole("button", { name: "Próximo" }).click();
  await expect(page.getByText("Informe a data do fato gerador")).toBeVisible();

  await page.getByLabel("Data do fato gerador").fill("2026-06-01");
  await page.getByLabel("UF", { exact: true }).selectOption("RS");
  await page.getByLabel("Município").selectOption("4314902");
  await page.getByText("Identificação do documento (id e versão)").click();
  await page.getByRole("textbox", { name: "id obrigatório", exact: true }).fill(f.requisicao.id);
  await page.getByRole("button", { name: "Próximo" }).click();

  // Etapa 2: NCM consultado no motor, CST e cClassTrib vindos da tabela dele.
  await page.getByLabel("Código NCM").fill("22030000");
  await expect(page.getByText("Cervejas de malte.")).toBeVisible();
  await page.getByRole("combobox", { name: "CST obrigatório", exact: true }).selectOption("000");
  await page.getByRole("combobox", { name: "cClassTrib obrigatório", exact: true }).selectOption("000001");
  await page.getByLabel("Base de cálculo (R$)").fill("100");
  await page.getByRole("button", { name: "Próximo" }).click();

  // Etapa 3: revisão mostra o JSON exato e confere o contrato.
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

test("Simples Nacional, modo guiado: NFS-e com listas do motor e resolução das alíquotas", async ({ page }) => {
  const f = fixture("sn-nfse-fator-r", "simples-nacional");
  const memoria = f.resposta.objetos[0].tribCalc.memoriaCalculo.cbs as string;
  const r = f.requisicao;
  const anexo = r.aliquotasEfetivas.anexoIII;

  await page.goto("/simular");
  await page.getByRole("radio", { name: /Simples Nacional/ }).click();

  // Etapa 1: documento e regime, com as opções escritas no contrato do motor.
  await page.getByLabel("Data do fato gerador").fill(r.data);
  await page.getByLabel("Tipo de documento (tpDoc)").selectOption(r.tpDoc);
  await page.getByLabel("Opção pelo Simples (opSimpNac)").selectOption(r.opSimpNac);
  await page.getByLabel("Apuração do IBS e da CBS (regApIBSCBSSN)").selectOption(r.regApIBSCBSSN);
  await page.getByLabel("Apuração dos tributos (regApTribSN)").selectOption(r.regApTribSN);
  await page.getByText("Identificação (id e versão)").click();
  await page.getByRole("textbox", { name: "id", exact: true }).fill(r.id);
  await page.getByRole("button", { name: "Próximo" }).click();

  // Etapa 2: alíquotas efetivas informadas por quem simula (nada pré-preenchido).
  await page.getByLabel("Fator r (fatorR)").selectOption("true");
  await page.getByLabel("Impedimento pelo sublimite").selectOption("false");
  await page.getByText("Anexo III (anexoIII)").click();
  const grupo = page.locator("div.rounded-md").filter({ hasText: "Anexo III (anexoIII)" }).first();
  await expect(grupo.getByLabel("pCBSSN (%)").first()).toHaveValue("");
  await grupo.getByLabel("pCBSSN (%)").first().fill(anexo.pCBSSN);
  await grupo.getByLabel("pIBSSN (%)").first().fill(anexo.pIBSSN);
  await page.getByText("Par sem redistribuição do ISS (semRedistribuicaoISS)").click();
  await grupo.getByLabel("pCBSSN (%)").nth(1).fill(anexo.semRedistribuicaoISS.pCBSSN);
  await grupo.getByLabel("pIBSSN (%)").nth(1).fill(anexo.semRedistribuicaoISS.pIBSSN);
  await page.getByRole("button", { name: "Próximo" }).click();

  // Etapa 3: cClassTrib e atividades (cAtivSN) vêm do motor.
  const item = r.itens[0];
  await page.getByRole("combobox", { name: "cClassTrib obrigatório", exact: true }).selectOption(item.cClassTrib);
  await page.getByLabel("Atividade (cAtivSN)").selectOption(item.cAtivSN);
  await page.getByLabel("Identificação").selectOption("nbs");
  await page.getByLabel("Código NBS").fill(item.nbs);
  await page.getByLabel("Base de cálculo (R$)").fill(item.baseCalculo);
  await page.getByLabel("Tributação do ISSQN").selectOption(item.tribISSQN);
  await page.getByLabel("Retenção do ISSQN").selectOption(item.tpRetISSQN);
  await page.getByRole("button", { name: "Próximo" }).click();

  await expect(page.getByText("Estrutura conforme o contrato do motor.")).toBeVisible();
  await page.getByRole("button", { name: "Simular" }).click();

  const resultado = page.getByRole("listitem").filter({ hasText: "Item 1" });
  await expect(resultado.getByText("CALCULADO", { exact: true })).toBeVisible();
  await expect(resultado.getByRole("listitem").filter({ hasText: memoria })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resolução das alíquotas devolvida pelo motor" })).toBeVisible();
  await expect(page.getByRole("row").filter({ hasText: "anexoAplicado" })).toContainText("III");
});

test("Simples Nacional, modo desenvolvedor: erro VSN-050 do exemplo publicado no OpenAPI", async ({ page }) => {
  const erro = fixture("sn-nfse-openapi", "simples-nacional").resposta.objetos[0].erros[0];

  await page.goto("/simular");
  await page.getByRole("radio", { name: /Simples Nacional/ }).click();
  await page.getByRole("tab", { name: "Desenvolvedor (JSON)" }).click();
  await page.getByLabel("Exemplo fictício").selectOption("sn-nfse-openapi");
  await page.getByRole("button", { name: "Simular" }).click();

  const item = page.getByRole("listitem").filter({ hasText: "Item 1" });
  await expect(item.getByText("INCONSISTENCIA_ENTRADA", { exact: true })).toBeVisible();
  await expect(item.getByText(erro.detail, { exact: true })).toBeVisible();
});

test("DANFSe: gera o PDF do XML de exemplo e mostra a recusa do gerador", async ({ page }) => {
  const erro = fixture("erro-sem-id", "danfse");

  await page.goto("/simular");
  await page.getByRole("radio", { name: /Gerador DANFSe/ }).click();
  await expect(page.getByRole("tab", { name: "Guiado" })).toHaveCount(0);

  const [resposta] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/danfse")),
    page.getByRole("button", { name: "Gerar DANFSe" }).click(),
  ]);
  expect(resposta.status()).toBe(200);
  expect(resposta.headers()["content-type"]).toContain("application/pdf");
  expect((await resposta.body()).byteLength).toBe(fixture("exemplo", "danfse").bytes);
  await expect(page.getByText("PDF gerado")).toBeVisible();
  await expect(page.getByTitle("DANFSe gerado pelo serviço oficial")).toBeVisible();

  await page.getByLabel("XML da NFS-e (enviado ao gerador sem alteração)").fill(erro.xml);
  await page.getByRole("button", { name: "Gerar DANFSe" }).click();
  await expect(page.getByRole("region", { name: "DANFSe gerado" }).getByRole("alert")).toContainText(erro.corpo.mensagem);
});

test("CSP com nonce: todo script da página carrega o nonce da resposta e nada é bloqueado", async ({ page }) => {
  const bloqueios: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy/i.test(m.text())) bloqueios.push(m.text());
  });

  for (const caminho of ["/", "/simular"]) {
    const resposta = await page.goto(caminho);
    const csp = resposta!.headers()["content-security-policy"] ?? "";
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
    expect(nonce, `CSP de ${caminho}`).toBeTruthy();
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toContain("'unsafe-inline'");
    const html = await resposta!.text();
    const scripts = html.match(/<script\b[^>]*>/g) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    for (const s of scripts) expect(s, `${caminho}: ${s}`).toContain(`nonce="${nonce}"`);
  }

  // Os fluxos que mais usam o navegador: cálculo, dados abertos e o PDF em blob:.
  await page.getByRole("tab", { name: "Desenvolvedor (JSON)" }).click();
  await page.getByRole("button", { name: "Simular" }).click();
  await expect(page.getByText("CALCULADO", { exact: true }).first()).toBeVisible();
  await page.getByRole("radio", { name: /Gerador DANFSe/ }).click();
  await page.getByRole("button", { name: "Gerar DANFSe" }).click();
  await expect(page.getByText("PDF gerado")).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao projeto" }).click();
  await expect(page.getByText("Disponível").first()).toBeVisible();
  expect(bloqueios).toEqual([]);
});

test("compara duas simulações do histórico campo a campo, com os valores do motor", async ({ page }) => {
  const a = fixture("item-unico-2026").resposta.objetos[0].tribCalc.IBSCBS.gIBSCBS.vBC as string;
  const b = fixture("servico-reducao-2026").resposta.objetos[0].tribCalc.IBSCBS.gIBSCBS.vBC as string;

  await modoDesenvolvedor(page);
  await page.getByRole("button", { name: "Simular" }).click();
  await expect(page.getByText("histórico neste navegador (1)")).toBeVisible();
  await page.getByLabel("Exemplo fictício").selectOption("servico-reducao-2026");
  await page.getByRole("button", { name: "Simular" }).click();
  await expect(page.getByText("histórico neste navegador (2)")).toBeVisible();

  const comparar = page.getByRole("button", { name: /^Comparar selecionadas/ });
  await expect(comparar).toBeDisabled();
  for (const caixa of await page.getByRole("checkbox", { name: /^Selecionar .* para comparar$/ }).all()) await caixa.check();
  await comparar.click();

  const secao = page.getByRole("region", { name: "Comparação de duas simulações" });
  const linha = secao.getByRole("row").filter({ hasText: "objetos[0].tribCalc.IBSCBS.gIBSCBS.vBC" });
  await expect(linha).toContainText(a);
  await expect(linha).toContainText(b);
  await expect(linha).toContainText("diferente");
  // Por padrão só aparecem diferenças; os iguais entram quando pedidos.
  await expect(secao.getByRole("row").filter({ hasText: "objetos[0].nObj" })).toHaveCount(0);
  await secao.getByLabel("Mostrar campos iguais").check();
  await expect(secao.getByRole("row").filter({ hasText: "objetos[0].nObj" }).first()).toContainText("igual");
});
