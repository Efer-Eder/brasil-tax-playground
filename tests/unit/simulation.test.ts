import { describe, expect, it, vi } from "vitest";
import type { RegimeRegularAdapter } from "@/lib/tax-engine/adapters/regime-regular";
import { EngineContractError, EngineHttpError, EngineUnavailableError } from "@/lib/tax-engine/errors";
import { simularRegimeRegular } from "@/lib/simulation/regime-regular";

const ENV = { REGIME_REGULAR_ENGINE_URL: "http://engine.test/api" };

// Operação estruturalmente válida com valores fictícios (sem alíquotas).
const OPERACAO = {
  id: "teste",
  versao: "1.0.0",
  dhFatoGerador: "2026-06-01T10:00:00-03:00",
  municipio: 1234567,
  itens: [{ numero: 1, cst: "000", cClassTrib: "000000", baseCalculo: 10 }],
};

function adapter(overrides: Partial<RegimeRegularAdapter> = {}): RegimeRegularAdapter {
  return {
    getVersao: vi.fn(async () => ({ versaoApp: "x.y.z" })),
    calcularComObservabilidade: vi.fn(async () => ({
      data: { objetos: [{ nObj: 1, estadoItem: "CALCULADO", qualquer: { coisa: "1.00" } }] },
      status: 200,
      warningDadosSimulados: null,
    })),
    ...overrides,
  };
}

describe("simularRegimeRegular", () => {
  it("rejects invalid JSON with 400 and never calls the engine", async () => {
    const createClient = vi.fn();
    const r = await simularRegimeRegular("{nope", { env: ENV, createClient });
    expect(r).toMatchObject({ ok: false, httpStatus: 400, erro: { tipo: "json-invalido" } });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("reports structural validation problems with paths (422)", async () => {
    const createClient = vi.fn();
    const r = await simularRegimeRegular(JSON.stringify({ ...OPERACAO, itens: [{ numero: 1, cst: "0", cClassTrib: "x" }] }), {
      env: ENV,
      createClient,
    });
    expect(r.ok).toBe(false);
    if (!r.ok && r.erro.tipo === "validacao") {
      expect(r.httpStatus).toBe(422);
      expect(r.erro.problemas.map((p) => p.caminho)).toEqual(expect.arrayContaining(["itens.0.cst", "itens.0.cClassTrib"]));
    } else {
      throw new Error("expected a validation error");
    }
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns 503 nao-configurado when the engine URL is missing", async () => {
    const r = await simularRegimeRegular(JSON.stringify(OPERACAO), { env: {} });
    expect(r).toMatchObject({ ok: false, httpStatus: 503, erro: { tipo: "nao-configurado" } });
  });

  it("returns the engine body untouched with version and timestamp", async () => {
    const a = adapter();
    const r = await simularRegimeRegular(JSON.stringify(OPERACAO), {
      env: ENV,
      createClient: () => a,
      now: () => new Date("2026-11-20T00:00:00Z"),
    });
    expect(r).toEqual({
      ok: true,
      httpStatus: 200,
      requisicao: OPERACAO,
      resposta: { objetos: [{ nObj: 1, estadoItem: "CALCULADO", qualquer: { coisa: "1.00" } }] },
      warningDadosSimulados: null,
      motor: { baseUrl: "http://engine.test/api", versao: { versaoApp: "x.y.z" } },
      executadoEm: "2026-11-20T00:00:00.000Z",
    });
  });

  it("still returns the calculation if the version lookup fails", async () => {
    const a = adapter({ getVersao: vi.fn(async () => Promise.reject(new Error("x"))) });
    const r = await simularRegimeRegular(JSON.stringify(OPERACAO), { env: ENV, createClient: () => a });
    expect(r.ok && r.motor.versao).toBeNull();
  });

  it.each([
    [new EngineUnavailableError("down", "regime-regular", "rede"), 503, "indisponivel"],
    [new EngineUnavailableError("slow", "regime-regular", "timeout"), 504, "indisponivel"],
    [new EngineHttpError("422", "regime-regular", 422, { detail: "x" }), 502, "erro-do-motor"],
    [new EngineContractError("shape", "regime-regular", {}), 502, "contrato"],
    [new Error("boom"), 500, "interno"],
  ])("maps %o to HTTP %i (%s) without fake numbers", async (error, status, tipo) => {
    const a = adapter({ calcularComObservabilidade: vi.fn(async () => Promise.reject(error)) });
    const r = await simularRegimeRegular(JSON.stringify(OPERACAO), { env: ENV, createClient: () => a });
    expect(r).toMatchObject({ ok: false, httpStatus: status, erro: { tipo } });
    expect(r).not.toHaveProperty("resposta");
  });

  it("preserves the engine ProblemDetail body for display", async () => {
    const problem = { title: "Unprocessable", status: 422, detail: "texto" };
    const a = adapter({
      calcularComObservabilidade: vi.fn(async () => Promise.reject(new EngineHttpError("x", "regime-regular", 422, problem))),
    });
    const r = await simularRegimeRegular(JSON.stringify(OPERACAO), { env: ENV, createClient: () => a });
    expect(!r.ok && r.erro).toMatchObject({ statusMotor: 422, corpo: problem });
  });
});

describe("version cache", () => {
  it("queries the engine version once per TTL instead of on every simulation", async () => {
    const { limparCacheVersao } = await import("@/lib/simulation/regime-regular");
    limparCacheVersao();
    const a = adapter();
    let agora = new Date("2026-11-20T00:00:00Z").getTime();
    const deps = { env: ENV, createClient: () => a, cacheVersaoMs: 60_000, now: () => new Date(agora) };

    const r1 = await simularRegimeRegular(JSON.stringify(OPERACAO), deps);
    await simularRegimeRegular(JSON.stringify(OPERACAO), deps);
    expect(a.getVersao).toHaveBeenCalledTimes(1);
    expect(r1.ok && r1.motor.versao).toEqual({ versaoApp: "x.y.z" });

    agora += 61_000;
    await simularRegimeRegular(JSON.stringify(OPERACAO), deps);
    expect(a.getVersao).toHaveBeenCalledTimes(2);
    limparCacheVersao();
  });
});
