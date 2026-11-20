import { describe, expect, it, vi } from "vitest";
import {
  REGIME_REGULAR_PATHS,
  createRegimeRegularHttpClient,
} from "@/lib/tax-engine/adapters/regime-regular";
import {
  EngineContractError,
  EngineHttpError,
  EngineUnavailableError,
} from "@/lib/tax-engine/errors";
import type { OperacaoInput } from "@/lib/tax-engine/schemas/regime-regular";
import { checkRegimeRegularStatus } from "@/lib/tax-engine/status";

const BASE = "http://engine.test/api";

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...init.headers },
    ...init,
  });
}

function client(fetchImpl: typeof fetch, timeoutMs = 1000) {
  return createRegimeRegularHttpClient({ baseUrl: BASE, timeoutMs, fetch: fetchImpl });
}

// Corpo mínimo; o conteúdo é irrelevante aqui porque o fetch é simulado.
const operacao = { id: "t", versao: "1", dhFatoGerador: "2027-01-01T00:00:00-03:00", municipio: 1, itens: [] } as unknown as OperacaoInput;

describe("createRegimeRegularHttpClient", () => {
  it("calls the version endpoint under the configured base URL", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ versaoApp: "1.7.2" }));
    const versao = await client(fetchMock).getVersao();
    expect(versao.versaoApp).toBe("1.7.2");
    expect(fetchMock).toHaveBeenCalledWith(`${BASE}${REGIME_REGULAR_PATHS.versao}`, expect.objectContaining({ method: "GET" }));
  });

  it("posts the operation as JSON and returns the engine body untouched", async () => {
    const body = { objetos: [{ nObj: 1, estadoItem: "CALCULO_SIMULADO", tribCalc: { qualquer: "coisa" } }] };
    const fetchMock = vi.fn<typeof fetch>(async () =>
      jsonResponse(body, { headers: { "x-warning-dados-simulados": "6" } }),
    );

    const result = await client(fetchMock).calcularComObservabilidade(operacao);

    expect(result.data).toEqual(body);
    expect(result.warningDadosSimulados).toBe("6");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}${REGIME_REGULAR_PATHS.observabilidade}`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual(operacao);
  });

  it("maps connection failures to EngineUnavailableError(rede)", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    const error = await client(fetchMock).getVersao().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EngineUnavailableError);
    expect((error as EngineUnavailableError).causa).toBe("rede");
  });

  it("maps a hung engine to EngineUnavailableError(timeout)", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const error = await client(fetchMock, 50).getVersao().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EngineUnavailableError);
    expect((error as EngineUnavailableError).causa).toBe("timeout");
  });

  it("preserves ProblemDetail bodies on HTTP errors", async () => {
    const problem = { title: "Unprocessable", status: 422, detail: "texto do motor" };
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(problem, { status: 422 }));
    const error = await client(fetchMock).calcularComObservabilidade(operacao).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EngineHttpError);
    expect((error as EngineHttpError).status).toBe(422);
    expect((error as EngineHttpError).body).toEqual(problem);
  });

  it("keeps non-JSON error bodies as text", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("Bad gateway", { status: 502 }));
    const error = await client(fetchMock).getVersao().catch((e: unknown) => e);
    expect((error as EngineHttpError).body).toBe("Bad gateway");
  });

  it("raises EngineContractError when a 2xx body breaks the contract", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse({ inesperado: true }));
    const error = await client(fetchMock).calcularComObservabilidade(operacao).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EngineContractError);
  });
});

describe("checkRegimeRegularStatus", () => {
  it("returns nao-configurado without touching the network", async () => {
    const createClient = vi.fn();
    const status = await checkRegimeRegularStatus({ env: {}, createClient });
    expect(status.state).toBe("nao-configurado");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns indisponivel (never fake data) when the engine is down", async () => {
    const status = await checkRegimeRegularStatus({
      env: { REGIME_REGULAR_ENGINE_URL: BASE },
      createClient: (config) =>
        createRegimeRegularHttpClient({
          ...config,
          fetch: async () => {
            throw new TypeError("ECONNREFUSED");
          },
        }),
    });
    expect(status).toEqual({
      state: "indisponivel",
      engine: "regime-regular",
      baseUrl: BASE,
      motivo: expect.stringContaining("Não foi possível conectar"),
    });
    expect(status).not.toHaveProperty("versao");
  });

  it("returns disponivel with the version reported by the engine", async () => {
    const status = await checkRegimeRegularStatus({
      env: { REGIME_REGULAR_ENGINE_URL: BASE },
      now: () => new Date("2026-11-20T12:00:00Z"),
      createClient: (config) =>
        createRegimeRegularHttpClient({ ...config, fetch: async () => jsonResponse({ versaoApp: "v", versaoDb: "d" }) }),
    });
    expect(status).toEqual({
      state: "disponivel",
      engine: "regime-regular",
      baseUrl: BASE,
      versao: { versaoApp: "v", versaoDb: "d" },
      verificadoEm: "2026-11-20T12:00:00.000Z",
    });
  });
});
