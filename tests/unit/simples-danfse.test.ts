import { beforeEach, describe, expect, it, vi } from "vitest";
import { gerarDanfse, lerOpcoesDanfse } from "@/lib/danfse/gerar";
import { simularSimplesNacional } from "@/lib/simulation/regime-regular";
import {
  montarPayloadSimples,
  novaOperacaoSimples,
  validarOperacaoSimples,
  type OperacaoSimples,
} from "@/lib/simulation/guiado-simples";
import { EXEMPLOS_SIMPLES } from "@/lib/simulation/exemplos-simples";
import { createDanfseHttpClient, type DanfseAdapter } from "@/lib/tax-engine/adapters/danfse";
import { createSimplesNacionalHttpClient } from "@/lib/tax-engine/adapters/simples-nacional";
import { readEngineConfig } from "@/lib/tax-engine/config";
import { consultarDadosAbertos, limparCacheDadosAbertos } from "@/lib/tax-engine/dados-abertos";
import { EngineHttpError, EngineUnavailableError } from "@/lib/tax-engine/errors";
import { checkEngineStatus } from "@/lib/tax-engine/status";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

describe("readEngineConfig", () => {
  it("reads each engine from its own variables", () => {
    const env = {
      SIMPLES_NACIONAL_ENGINE_URL: "http://sn.test/api/",
      DANFSE_ENGINE_URL: "http://danfse.test",
      DANFSE_ENGINE_TIMEOUT_MS: "3000",
    };
    expect(readEngineConfig("simples-nacional", env)).toEqual({ ok: true, config: { baseUrl: "http://sn.test/api", timeoutMs: 10_000 } });
    expect(readEngineConfig("danfse", env)).toEqual({ ok: true, config: { baseUrl: "http://danfse.test", timeoutMs: 3000 } });
    const sem = readEngineConfig("regime-regular", env);
    expect(sem.ok).toBe(false);
    if (!sem.ok) expect(sem.motivo).toContain("REGIME_REGULAR_ENGINE_URL");
  });
});

describe("Simples Nacional", () => {
  const ENV = { SIMPLES_NACIONAL_ENGINE_URL: "http://sn.test/api" };

  it("sends the original text to the não assistido endpoint and returns the body untouched", async () => {
    const resposta = { oper: { regimeApuracao: "SN_PLENO" }, objetos: [{ nObj: 1, estadoItem: "CALCULADO" }] };
    const f = vi.fn<typeof fetch>(async (url) =>
      String(url).endsWith("/versao") ? json({ versaoApp: "1.0.2", versaoDb: "V0073" }) : json(resposta),
    );
    const corpo = '{"tpDoc":"55","itens":[{"numero":1,"baseCalculo":"1000.00"}],"data":"2027-03-15"}';
    const r = await simularSimplesNacional(corpo, {
      env: ENV,
      createClient: (c) => createSimplesNacionalHttpClient({ ...c, fetch: f }),
    });
    expect(r).toMatchObject({ ok: true, engine: "simples-nacional", resposta, motor: { versao: { versaoApp: "1.0.2" } } });
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toBe("http://sn.test/api/calculadora/observabilidade/simples-nacional/nao-assistido");
    expect(init?.body).toBe(corpo);
  });

  it("reports not configured without the Simples URL", async () => {
    const r = await simularSimplesNacional('{"itens":[{}]}', { env: { REGIME_REGULAR_ENGINE_URL: "http://x.test/api" } });
    expect(r).toMatchObject({ ok: false, httpStatus: 503, erro: { tipo: "nao-configurado" } });
  });

  it("guided form: builds the payload in the document vocabulary and omits what was not filled", () => {
    const op: OperacaoSimples = novaOperacaoSimples("x");
    op.data = "2027-03-15";
    op.tpDoc = "91";
    op.opSimpNac = "3";
    op.CRT = "1"; // ignorado na NFS-e
    op.fatorR = "true";
    op.anexos.anexoIII = { usar: true, pCBSSN: "2,3874", pIBSSN: "0.0263", usarSemRedistribuicao: false, semRedistribuicaoISS: { pCBSSN: "9", pIBSSN: "9" } };
    op.itens[0] = { ...op.itens[0], cClassTrib: "000001", cAtivSN: "09", identificacao: "nbs", codigo: "114031000", baseCalculo: "10.000,00", tribISSQN: "1", valorImpostoSeletivo: "5" };
    expect(montarPayloadSimples(op)).toEqual({
      id: "x",
      versao: "3.0.0",
      data: "2027-03-15",
      tpDoc: "91",
      opSimpNac: "3",
      aliquotasEfetivas: { fatorR: true, anexoIII: { pCBSSN: "2.3874", pIBSSN: "0.0263" } },
      itens: [{ numero: 1, cAtivSN: "09", cClassTrib: "000001", nbs: "114031000", baseCalculo: "10000.00", tribISSQN: "1" }],
    });
    expect(validarOperacaoSimples(op)).toEqual([]);
  });

  it("guided form: never prefills tax values and points out what is missing", () => {
    const op = novaOperacaoSimples();
    const payload = montarPayloadSimples(op);
    expect(payload).not.toHaveProperty("aliquotasEfetivas");
    expect(JSON.stringify(payload)).not.toMatch(/pCBSSN|pIBSSN|baseCalculo/);
    const caminhos = validarOperacaoSimples({ ...op, tpDoc: "55" }).map((p) => p.caminho);
    expect(caminhos).toEqual(["data", "CRT", "itens.0.cClassTrib", "itens.0.baseCalculo", "itens.0.valorImpostoSeletivo"]);
  });

  it("examples carry only aliquotas published in the engine's OpenAPI", () => {
    const publicadas = new Set(["1.1612", "0.0129", "2.3874", "0.0263", "2.3591", "0.0260"]);
    for (const e of EXEMPLOS_SIMPLES) {
      for (const [, v] of JSON.stringify(e.operacao).matchAll(/"p(?:CBS|IBS)SN":"([^"]+)"/g)) expect(publicadas).toContain(v);
    }
  });

  it("open data: activities and VSN errors go to the Simples engine", async () => {
    limparCacheDadosAbertos();
    const f = vi.fn<typeof fetch>(async () => json([]));
    const env = { REGIME_REGULAR_ENGINE_URL: "http://rr.test/api", SIMPLES_NACIONAL_ENGINE_URL: "http://sn.test/api" };
    await consultarDadosAbertos("atividades-sn", { data: "2027-03-15", tpDoc: "91" }, { env, fetch: f });
    await consultarDadosAbertos("erro-sn", { codigo: "VSN-050" }, { env, fetch: f });
    expect(f.mock.calls.map((c) => String(c[0]))).toEqual([
      "http://sn.test/api/calculadora/simples-nacional/atividades?data=2027-03-15&tpDoc=91",
      "http://sn.test/api/calculadora/observabilidade/simples-nacional/erros?codigo=VSN-050",
    ]);
    expect(await consultarDadosAbertos("atividades-sn", { data: "2027-03-15", tpDoc: "9a" }, { env, fetch: f })).toMatchObject({ status: 422 });
    expect(await consultarDadosAbertos("erro-sn", { codigo: "VSN-1" }, { env, fetch: f })).toMatchObject({ status: 422 });
    expect(f).toHaveBeenCalledTimes(2);
  });
});

describe("DANFSe", () => {
  const ENV = { DANFSE_ENGINE_URL: "http://danfse.test" };
  const XML = '<?xml version="1.0"?><NFSe/>';
  const pdf = new Uint8Array([37, 80, 68, 70]).buffer;
  const cliente = (o: Partial<DanfseAdapter> = {}): DanfseAdapter => ({
    pronto: vi.fn(async () => undefined),
    gerarPdf: vi.fn(async () => ({ pdf })),
    ...o,
  });

  beforeEach(() => vi.restoreAllMocks());

  it.each([
    ["", { ok: true, opcoes: {} }],
    ["stc=2&canhoto=false", { ok: true, opcoes: { stc: "2", canhoto: false } }],
    ["stc=3", { ok: false }],
    ["canhoto=sim", { ok: false }],
  ])("reads the query %s", (q, esperado) => {
    expect(lerOpcoesDanfse(new URLSearchParams(q))).toMatchObject(esperado);
  });

  it("refuses empty or non-XML bodies before calling the service", async () => {
    const c = cliente();
    for (const corpo of ["", "   ", "{\"a\":1}"]) {
      expect(await gerarDanfse(corpo, {}, { env: ENV, createClient: () => c })).toMatchObject({ ok: false, httpStatus: 422 });
    }
    expect(c.gerarPdf).not.toHaveBeenCalled();
  });

  it("forwards the received bytes untouched and returns the PDF bytes", async () => {
    const c = cliente();
    const bytes = new TextEncoder().encode(XML);
    const r = await gerarDanfse(bytes, { stc: "1" }, { env: ENV, createClient: () => c });
    expect(r).toEqual({ ok: true, pdf });
    expect(c.gerarPdf).toHaveBeenCalledWith(bytes, { stc: "1" });
  });

  it("maps the service's 400 to 422 with its message, and outages to 503/504", async () => {
    const recusa = cliente({
      gerarPdf: vi.fn(async () => {
        throw new EngineHttpError("HTTP 400", "danfse", 400, { sucesso: false, mensagem: "infNFSe Id is empty" });
      }),
    });
    expect(await gerarDanfse(XML, {}, { env: ENV, createClient: () => recusa })).toMatchObject({
      ok: false,
      httpStatus: 422,
      erro: { tipo: "erro-do-motor", mensagem: "O gerador recusou o XML: infNFSe Id is empty", statusMotor: 400 },
    });
    const lento = cliente({
      gerarPdf: vi.fn(async () => {
        throw new EngineUnavailableError("timeout", "danfse", "timeout");
      }),
    });
    expect(await gerarDanfse(XML, {}, { env: ENV, createClient: () => lento })).toMatchObject({ ok: false, httpStatus: 504 });
    expect(await gerarDanfse(XML, {}, { env: {} })).toMatchObject({ ok: false, httpStatus: 503, erro: { tipo: "nao-configurado" } });
  });

  it("HTTP client: posts XML with the documented query parameters", async () => {
    const f = vi.fn<typeof fetch>(async () => new Response(pdf, { status: 200, headers: { "Content-Type": "application/pdf" } }));
    const c = createDanfseHttpClient({ baseUrl: "http://danfse.test", timeoutMs: 1000, fetch: f });
    const r = await c.gerarPdf(XML, { stc: "2", canhoto: false });
    expect(new Uint8Array(r.pdf)).toEqual(new Uint8Array(pdf));
    const [url, init] = f.mock.calls[0];
    expect(String(url)).toBe("http://danfse.test/api/danfse?stc=2&canhoto=false");
    expect(init?.headers).toMatchObject({ "Content-Type": "application/xml", Accept: "application/pdf" });
  });

  it("status: ready service reports the packaged version, never an invented one", async () => {
    const f = vi.fn<typeof fetch>(async () => json({ status: "ok" }));
    const com = await checkEngineStatus("danfse", { env: { ...ENV, DANFSE_ENGINE_VERSAO: "1.0.0" }, fetch: f });
    expect(com).toMatchObject({ state: "disponivel", engine: "danfse", versao: { versaoApp: "1.0.0" } });
    expect(String(f.mock.calls[0][0])).toBe("http://danfse.test/health/ready");
    const sem = await checkEngineStatus("danfse", { env: ENV, fetch: f });
    expect(sem).toMatchObject({ state: "disponivel", versao: { descricaoVersaoApp: "upstream 1.0.0 (8d79e6b)" } });
    const fora = await checkEngineStatus("danfse", { env: ENV, fetch: vi.fn<typeof fetch>(async () => json({ status: "unavailable" }, 503)) });
    expect(fora).toMatchObject({ state: "indisponivel" });
  });
});
