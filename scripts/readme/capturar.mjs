// Captura telas reais do app para montar os GIFs do README.
//
// Uso: node scripts/readme/capturar.mjs [saida] [base]
//   saida: pasta para os PNGs e o JSON de posições (padrão: .readme-captura)
//   base:  URL da página do projeto (padrão: instância pública). Pode ser um
//          build local ligado aos motores oficiais, antes de publicar.
//
// Nada é inventado: as telas mostram o app e o motor oficial respondendo.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const saida = process.argv[2] ?? ".readme-captura";
const base = (process.argv[3] ?? "https://efer.online/projeto/brasil-tax-playground").replace(/\/+$/, "");
mkdirSync(saida, { recursive: true });

const VIEW = { width: 1280, height: 800 };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 1, colorScheme: "dark" });
const posicoes = {};

/** Rola a página até o elemento ficar `margem` px abaixo do topo. */
async function rolarAte(locator, margem) {
  const y = await locator.evaluate((e) => e.getBoundingClientRect().top + scrollY);
  await page.evaluate((yy) => scrollTo(0, yy), Math.max(0, y - margem));
  await page.waitForTimeout(400);
}

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

// 2) Simulador: escolha do motor, Simples no modo guiado, erro por item no
//    regime regular e DANFSe. Os valores digitados são os do exemplo fictício
//    gravado do motor (tests/fixtures/simples-nacional/sn-nfse-fator-r.json).
const sn = JSON.parse(readFileSync("tests/fixtures/simples-nacional/sn-nfse-fator-r.json", "utf8")).requisicao;
await page.goto(`${base}/simular`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: join(saida, "sim-01-motores.png") });
posicoes.simples = await caixa(page.getByRole("radio", { name: /Simples Nacional/ }));

await page.getByRole("radio", { name: /Simples Nacional/ }).click();
await page.getByLabel("Data do fato gerador").fill(sn.data);
await page.getByLabel("Tipo de documento (tpDoc)").selectOption(sn.tpDoc);
await page.getByLabel("Opção pelo Simples (opSimpNac)").selectOption(sn.opSimpNac);
await page.getByLabel("Apuração do IBS e da CBS (regApIBSCBSSN)").selectOption(sn.regApIBSCBSSN);
await page.getByLabel("Apuração dos tributos (regApTribSN)").selectOption(sn.regApTribSN);
await rolarAte(page.getByRole("radio", { name: /Simples Nacional/ }), 120);
await page.screenshot({ path: join(saida, "sim-02-simples-operacao.png") });

await page.getByRole("button", { name: "Próximo" }).click();
const anexo = sn.aliquotasEfetivas.anexoIII;
await page.getByLabel("Fator r (fatorR)").selectOption("true");
await page.getByLabel("Impedimento pelo sublimite").selectOption("false");
await page.getByText("Anexo III (anexoIII)").click();
const grupo = page.locator("div.rounded-md").filter({ hasText: "Anexo III (anexoIII)" }).first();
await grupo.getByLabel("pCBSSN (%)").first().fill(anexo.pCBSSN);
await grupo.getByLabel("pIBSSN (%)").first().fill(anexo.pIBSSN);
await page.getByText("Par sem redistribuição do ISS (semRedistribuicaoISS)").click();
await grupo.getByLabel("pCBSSN (%)").nth(1).fill(anexo.semRedistribuicaoISS.pCBSSN);
await grupo.getByLabel("pIBSSN (%)").nth(1).fill(anexo.semRedistribuicaoISS.pIBSSN);
await page.getByRole("button", { name: "Próximo" }).click();
const item = sn.itens[0];
await page.getByRole("combobox", { name: "cClassTrib obrigatório", exact: true }).selectOption(item.cClassTrib);
await page.getByLabel("Atividade (cAtivSN)").selectOption(item.cAtivSN);
await page.getByLabel("Identificação").selectOption("nbs");
await page.getByLabel("Código NBS").fill(item.nbs);
await page.getByLabel("Base de cálculo (R$)").fill(item.baseCalculo);
await page.getByLabel("Tributação do ISSQN").selectOption(item.tribISSQN);
await page.getByLabel("Retenção do ISSQN").selectOption(item.tpRetISSQN);
await page.getByRole("button", { name: "Próximo" }).click();
await page.getByRole("button", { name: "Simular" }).click();
await page.getByText("CALCULADO", { exact: true }).waitFor({ timeout: 15000 });
await page.waitForTimeout(500);
await page.screenshot({ path: join(saida, "sim-03-simples-resultado.png"), fullPage: true });
const topoDe = (loc) => loc.evaluate((e) => Math.round(e.getBoundingClientRect().top + scrollY));
posicoes.simplesItem = await topoDe(page.getByRole("listitem").filter({ hasText: "Item 1" }).first());
posicoes.simplesResolucao = await topoDe(page.getByRole("heading", { name: "Resolução das alíquotas devolvida pelo motor" }));

// Regime regular, modo desenvolvedor: erro em um dos itens.
await page.evaluate(() => scrollTo(0, 0));
await page.getByRole("radio", { name: /Regime Regular/ }).click();
await page.getByRole("tab", { name: "Desenvolvedor (JSON)" }).click();
await page.getByLabel("Exemplo fictício").selectOption("erro-por-item-2026");
await page.getByRole("button", { name: "Simular" }).click();
await page.getByText("INCONSISTENCIA_ENTRADA", { exact: true }).waitFor({ timeout: 15000 });
await page.waitForTimeout(500);
await page.screenshot({ path: join(saida, "sim-04-regime-erro.png"), fullPage: true });
posicoes.item2 = await topoDe(page.getByRole("listitem").filter({ hasText: "Item 2" }));

// DANFSe: o XML fictício de exemplo vira o PDF do gerador oficial.
await page.evaluate(() => scrollTo(0, 0));
await page.getByRole("radio", { name: /Gerador DANFSe/ }).click();
await page.getByRole("button", { name: "Gerar DANFSe" }).click();
await page.getByText("PDF gerado").waitFor({ timeout: 15000 });
// Navegador headless não desenha PDF em iframe: para a foto, a página 1 do
// MESMO PDF devolvido pelo gerador é desenhada pelo pdf.js num canvas no lugar
// do iframe. Nada do conteúdo é alterado.
await page.addScriptTag({ url: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" });
await page.evaluate(async () => {
  const lib = window.pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  const iframe = document.querySelector('iframe[title="DANFSe gerado pelo serviço oficial"]');
  const doc = await lib.getDocument({ data: await (await fetch(iframe.src)).arrayBuffer() }).promise;
  const pagina = await doc.getPage(1);
  const largura = iframe.clientWidth;
  const vp = pagina.getViewport({ scale: (largura / pagina.getViewport({ scale: 1 }).width) * 2 });
  const canvas = document.createElement("canvas");
  canvas.width = vp.width;
  canvas.height = vp.height;
  canvas.style.cssText = `width:${largura}px;display:block`;
  await pagina.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
  const caixa = document.createElement("div");
  caixa.style.cssText = `height:${iframe.clientHeight}px;overflow:hidden;background:#fff`;
  caixa.appendChild(canvas);
  iframe.replaceWith(caixa);
});
await rolarAte(page.getByText("PDF gerado"), 110);
await page.screenshot({ path: join(saida, "sim-05-danfse.png") });

// 3) Respostas reais da API pública para o banner e a animação de terminal.
//    Sempre da instância pública, porque o GIF mostra o endereço dela.
const api = "https://efer.online/api/brasil-tax-playground";
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
