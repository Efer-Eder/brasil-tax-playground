import { describe, expect, it, vi } from "vitest";
import { FilaCheiaError, LimitadorConcorrencia, lerLimites } from "@/lib/simulation/limites";
import { simularRegimeRegular } from "@/lib/simulation/regime-regular";
import type { RegimeRegularAdapter } from "@/lib/tax-engine/adapters/regime-regular";

function adiado() {
  let resolver!: () => void;
  const promessa = new Promise<void>((r) => (resolver = r));
  return { promessa, resolver };
}

describe("lerLimites", () => {
  it("uses safe defaults and no item cap when env is empty", () => {
    expect(lerLimites({})).toEqual({ maxConcorrencia: 8, maxFila: 32, maxEsperaMs: 2000, maxItens: null });
  });

  it("reads valid values and ignores invalid ones", () => {
    expect(
      lerLimites({
        SIMULACAO_MAX_CONCORRENCIA: "3",
        SIMULACAO_MAX_FILA: "abc",
        SIMULACAO_MAX_ESPERA_MS: "3000",
        SIMULACAO_MAX_ITENS: "50",
      }),
    ).toEqual({ maxConcorrencia: 3, maxFila: 32, maxEsperaMs: 3000, maxItens: 50 });
  });
});

describe("LimitadorConcorrencia", () => {
  it("never runs more than maxConcorrencia tasks at once", async () => {
    const limitador = new LimitadorConcorrencia({ maxConcorrencia: 2, maxFila: 10, maxEsperaMs: 1000 });
    let ativos = 0;
    let pico = 0;
    const tarefa = async () => {
      ativos++;
      pico = Math.max(pico, ativos);
      await new Promise((r) => setTimeout(r, 10));
      ativos--;
    };
    await Promise.all(Array.from({ length: 8 }, () => limitador.executar(tarefa)));
    expect(pico).toBe(2);
    expect(limitador.emUso).toEqual({ ativos: 0, aguardando: 0 });
  });

  it("rejects immediately when the queue is full", async () => {
    const limitador = new LimitadorConcorrencia({ maxConcorrencia: 1, maxFila: 1, maxEsperaMs: 1000 });
    const bloqueio = adiado();
    const primeira = limitador.executar(() => bloqueio.promessa);
    const segunda = limitador.executar(async () => "ok");
    await expect(limitador.executar(async () => "x")).rejects.toMatchObject({ motivo: "fila-cheia" });
    bloqueio.resolver();
    await primeira;
    await expect(segunda).resolves.toBe("ok");
  });

  it("gives up after maxEsperaMs and frees the queue slot", async () => {
    const limitador = new LimitadorConcorrencia({ maxConcorrencia: 1, maxFila: 5, maxEsperaMs: 20 });
    const bloqueio = adiado();
    const primeira = limitador.executar(() => bloqueio.promessa);
    const erro = await limitador.executar(async () => "x").catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(FilaCheiaError);
    expect((erro as FilaCheiaError).motivo).toBe("espera-esgotada");
    expect(limitador.emUso.aguardando).toBe(0);
    bloqueio.resolver();
    await primeira;
  });

  it("releases the slot when a task fails", async () => {
    const limitador = new LimitadorConcorrencia({ maxConcorrencia: 1, maxFila: 0, maxEsperaMs: 0 });
    await expect(limitador.executar(async () => Promise.reject(new Error("x")))).rejects.toThrow("x");
    await expect(limitador.executar(async () => "ok")).resolves.toBe("ok");
  });
});

describe("simularRegimeRegular with public-instance limits", () => {
  const ENV = { REGIME_REGULAR_ENGINE_URL: "http://engine.test/api" };
  const item = { cst: "000", cClassTrib: "000000", baseCalculo: 1 };
  const operacao = (n: number) =>
    JSON.stringify({
      id: "t",
      versao: "1",
      dhFatoGerador: "2026-06-01T10:00:00-03:00",
      municipio: 1,
      itens: Array.from({ length: n }, (_, i) => ({ numero: i + 1, ...item })),
    });

  it("refuses operations above maxItens with 413 before calling the engine", async () => {
    const createClient = vi.fn();
    const r = await simularRegimeRegular(operacao(3), { env: ENV, createClient, maxItens: 2 });
    expect(r).toMatchObject({ ok: false, httpStatus: 413, erro: { tipo: "limite-itens", maxItens: 2 } });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns 503 ocupado when the limiter is saturated", async () => {
    const limitador = new LimitadorConcorrencia({ maxConcorrencia: 1, maxFila: 0, maxEsperaMs: 0 });
    const bloqueio = adiado();
    const ocupando = limitador.executar(() => bloqueio.promessa);
    const adapter: RegimeRegularAdapter = {
      getVersao: vi.fn(async () => ({})),
      calcularComObservabilidade: vi.fn(),
    };
    const r = await simularRegimeRegular(operacao(1), { env: ENV, createClient: () => adapter, limitador });
    expect(r).toMatchObject({ ok: false, httpStatus: 503, erro: { tipo: "ocupado" } });
    expect(adapter.calcularComObservabilidade).not.toHaveBeenCalled();
    bloqueio.resolver();
    await ocupando;
  });
});
