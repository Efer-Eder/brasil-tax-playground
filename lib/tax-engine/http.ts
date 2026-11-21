import type { z } from "zod";
import type { EngineConfig } from "./config";
import { EngineContractError, EngineHttpError, EngineUnavailableError } from "./errors";
import type { EngineId } from "./types";

/** Resposta crua do motor, preservada para o inspetor técnico. */
export interface EngineCallResult<T> {
  data: T;
  status: number;
  /**
   * Valor cru do header `x-warning-dados-simulados`, ou null se ausente.
   * No regime regular 1.7.2 é um código numérico do enum
   * `TipoWarningDadosSimulados` (ex.: "6" = CASO_CALCULOS_SIMULADOS).
   * Repassado sem interpretação.
   */
  warningDadosSimulados: string | null;
}

export interface HttpClientOptions extends EngineConfig {
  fetch?: typeof fetch;
}

const WARNING_HEADER = "x-warning-dados-simulados";

/**
 * Faz uma chamada ao motor com timeout e traduz as falhas para os erros da
 * camada de integração. Comum aos motores; cada adapter só define caminhos e
 * schemas.
 */
export async function chamarMotor(
  engine: EngineId,
  options: HttpClientOptions,
  path: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<Response> {
  const doFetch = options.fetch ?? globalThis.fetch;
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs);
  const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let response: Response;
  try {
    response = await doFetch(`${options.baseUrl}${path}`, {
      ...init,
      headers: { Accept: "application/json", ...init.headers },
      signal: combined,
      cache: "no-store",
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeoutSignal.aborted) {
      throw new EngineUnavailableError(`O motor não respondeu em ${options.timeoutMs} ms.`, engine, "timeout");
    }
    throw new EngineUnavailableError(`Não foi possível conectar ao motor em ${options.baseUrl}.`, engine, "rede");
  }

  if (!response.ok) {
    const body = await lerCorpo(response);
    throw new EngineHttpError(`O motor respondeu HTTP ${response.status}.`, engine, response.status, body);
  }
  return response;
}

/** Chamada JSON: confere o envelope com `schema` e devolve o corpo como o motor mandou. */
export async function chamarMotorJson<S extends z.ZodType>(
  engine: EngineId,
  options: HttpClientOptions,
  path: string,
  schema: S,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<EngineCallResult<z.infer<S>>> {
  const response = await chamarMotor(engine, options, path, init, signal);
  const body = await lerCorpo(response);

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new EngineContractError(
      "A resposta do motor não corresponde ao contrato esperado. O upstream pode ter mudado.",
      engine,
      body,
    );
  }

  return {
    // O schema só confere o envelope; o corpo segue exatamente como o motor mandou.
    data: body as z.infer<S>,
    status: response.status,
    warningDadosSimulados: response.headers.get(WARNING_HEADER),
  };
}

export async function lerCorpo(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
