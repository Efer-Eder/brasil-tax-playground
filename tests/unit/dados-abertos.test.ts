import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarDadosAbertos, limparCacheDadosAbertos } from "@/lib/tax-engine/dados-abertos";

const ENV = { REGIME_REGULAR_ENGINE_URL: "http://motor.test/api" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

describe("consultarDadosAbertos", () => {
  beforeEach(() => limparCacheDadosAbertos());

  it("maps an allowed resource to the engine path and returns the body untouched", async () => {
    const f = vi.fn<typeof fetch>(async () => json([{ codigo: 4314902, nome: "Porto Alegre" }]));
    const r = await consultarDadosAbertos("municipios", { uf: "RS" }, { env: ENV, fetch: f });
    expect(r).toEqual({ ok: true, status: 200, dados: [{ codigo: 4314902, nome: "Porto Alegre" }] });
    expect(String(f.mock.calls[0][0])).toBe("http://motor.test/api/calculadora/dados-abertos/ufs/municipios?siglaUf=RS");
  });

  it("refuses unknown resources without calling the engine", async () => {
    const f = vi.fn<typeof fetch>();
    expect(await consultarDadosAbertos("aliquota-uf", {}, { env: ENV, fetch: f })).toMatchObject({ ok: false, status: 404 });
    expect(await consultarDadosAbertos("__proto__", {}, { env: ENV, fetch: f })).toMatchObject({ ok: false, status: 404 });
    expect(f).not.toHaveBeenCalled();
  });

  it.each([
    ["municipios", { uf: "rs" }],
    ["municipios", { uf: "RS&x=1" }],
    ["ncm", { ncm: "123", data: "2026-06-01" }],
    ["nbs", { nbs: "122011200", data: "01/06/2026" }],
    ["situacoes-cbs-ibs", { data: "../../versao" }],
  ])("refuses invalid parameters for %s (%o) without calling the engine", async (nome, params) => {
    const f = vi.fn<typeof fetch>();
    expect(await consultarDadosAbertos(nome, params, { env: ENV, fetch: f })).toMatchObject({ ok: false, status: 422 });
    expect(f).not.toHaveBeenCalled();
  });

  it("caches responses until the TTL expires", async () => {
    let agora = 0;
    const f = vi.fn<typeof fetch>(async () => json([{ sigla: "RS" }]));
    const deps = { env: ENV, fetch: f, agora: () => agora };
    await consultarDadosAbertos("ufs", {}, deps);
    await consultarDadosAbertos("ufs", {}, deps);
    expect(f).toHaveBeenCalledTimes(1);
    agora = 25 * 60 * 60 * 1000;
    await consultarDadosAbertos("ufs", {}, deps);
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("does not cache engine errors and reports them", async () => {
    const f = vi.fn<typeof fetch>(async () => json({ title: "Not Found" }, 404));
    const r = await consultarDadosAbertos("ncm", { ncm: "99999999", data: "2026-06-01" }, { env: ENV, fetch: f });
    expect(r).toMatchObject({ ok: false, status: 404, corpo: { title: "Not Found" } });
    await consultarDadosAbertos("ncm", { ncm: "99999999", data: "2026-06-01" }, { env: ENV, fetch: f });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it("reports an unavailable engine and a missing configuration", async () => {
    const f = vi.fn<typeof fetch>(async () => Promise.reject(new TypeError("down")));
    expect(await consultarDadosAbertos("ufs", {}, { env: ENV, fetch: f })).toMatchObject({ ok: false, status: 503 });
    expect(await consultarDadosAbertos("ufs", {}, { env: {}, fetch: f })).toMatchObject({ ok: false, status: 503 });
  });
});
