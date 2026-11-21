import { describe, expect, it } from "vitest";
import { lerCorpoLimitado } from "@/lib/http/corpo-limitado";
import { simulacaoPublica, statusPublico } from "@/lib/http/publico";

describe("lerCorpoLimitado", () => {
  it("reads a body within the limit", async () => {
    const r = await lerCorpoLimitado(new Request("http://x", { method: "POST", body: '{"a":1}' }), 100);
    expect(r).toMatchObject({ ok: true, texto: '{"a":1}' });
  });

  it("refuses by Content-Length before reading", async () => {
    const req = new Request("http://x", { method: "POST", body: "x", headers: { "content-length": "999999" } });
    expect(await lerCorpoLimitado(req, 100)).toEqual({ ok: false, motivo: "grande-demais" });
  });

  it("stops reading a stream that goes past the limit", async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull(c) {
        c.enqueue(new Uint8Array(64));
      },
    });
    const req = new Request("http://x", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    expect(await lerCorpoLimitado(req, 1000)).toEqual({ ok: false, motivo: "grande-demais" });
  });

  it("keeps UTF-8 characters split across chunks", async () => {
    const bytes = new TextEncoder().encode('{"t":"ção"}');
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(bytes.slice(0, 7));
        c.enqueue(bytes.slice(7));
        c.close();
      },
    });
    const req = new Request("http://x", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    expect(await lerCorpoLimitado(req, 1000)).toMatchObject({ ok: true, texto: '{"t":"ção"}' });
  });
});

describe("respostas públicas sem o endereço interno do motor", () => {
  const base = "http://rtc-engine:8080/api";

  it("removes baseUrl from the engine status and from its messages", () => {
    expect(statusPublico({ state: "indisponivel", engine: "regime-regular", baseUrl: base, motivo: `Não foi possível conectar ao motor em ${base}.` })).toEqual({
      state: "indisponivel",
      engine: "regime-regular",
      motivo: "Não foi possível conectar ao motor em (motor configurado).",
    });
    expect(
      statusPublico({ state: "disponivel", engine: "regime-regular", baseUrl: base, versao: { versaoApp: "1.7.2" }, verificadoEm: "t" }),
    ).not.toHaveProperty("baseUrl");
  });

  it("removes baseUrl from simulation results", () => {
    const r = simulacaoPublica(
      {
        ok: true,
        httpStatus: 200,
        requisicao: {},
        resposta: { objetos: [] },
        warningDadosSimulados: null,
        motor: { baseUrl: base, versao: { versaoApp: "1.7.2" } },
        executadoEm: "t",
      },
      base,
    );
    expect(JSON.stringify(r)).not.toContain("rtc-engine");
    const e = simulacaoPublica({ ok: false, httpStatus: 503, erro: { tipo: "indisponivel", mensagem: `sem conexão com ${base}` } }, base);
    expect(JSON.stringify(e)).not.toContain("rtc-engine");
  });
});
