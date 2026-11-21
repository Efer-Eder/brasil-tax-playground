import type { z } from "zod";
import type { RegimeRegularConfig } from "../config";
import {
  EngineContractError,
  EngineHttpError,
  EngineUnavailableError,
} from "../errors";
import {
  observabilidadeRespostaSchema,
  versaoSchema,
  type ObservabilidadeResposta,
  type OperacaoInput,
} from "../schemas/regime-regular";
import type { EngineDescriptor, EngineVersion } from "../types";

export const regimeRegularDescriptor: EngineDescriptor = {
  id: "regime-regular",
  nome: "Calculadora RTC · Regime Regular",
  descricao:
    "API REST oficial (Java/Spring Boot) que calcula CBS, IBS e Imposto Seletivo nas operações do regime regular.",
  upstreamRepo: "https://github.com/ReceitaFederal/calculadora-rtc-regime-regular",
  upstreamReferencia: "1.7.2 (f1eebd7)",
  stage: "em-integracao",
};

/** Resposta crua do motor, preservada para o inspetor técnico. */
export interface EngineCallResult<T> {
  data: T;
  status: number;
  /**
   * Valor cru do header `x-warning-dados-simulados`, ou null se ausente.
   * No upstream 1.7.2 é um código numérico do enum `TipoWarningDadosSimulados`
   * (ex.: "6" = CASO_CALCULOS_SIMULADOS). Repassado sem interpretação.
   */
  warningDadosSimulados: string | null;
}

/**
 * Contrato que a UI/BFF usa para falar com o motor de regime regular.
 * Implementações: HTTP (abaixo). Testes usam `fetch` injetado.
 */
export interface RegimeRegularAdapter {
  getVersao(signal?: AbortSignal): Promise<EngineVersion>;
  /**
   * Envia a operação ao motor. Uma string é enviada exatamente como está
   * (sem reescrever números nem a ordem das chaves); um objeto é serializado.
   */
  calcularComObservabilidade(
    operacao: OperacaoInput | string,
    signal?: AbortSignal,
  ): Promise<EngineCallResult<ObservabilidadeResposta>>;
}

export interface HttpClientOptions extends RegimeRegularConfig {
  fetch?: typeof fetch;
}

/** Caminhos relativos à URL base (que já inclui o context-path `/api`). */
export const REGIME_REGULAR_PATHS = {
  versao: "/calculadora/dados-abertos/versao",
  observabilidade: "/calculadora/observabilidade/regime-geral",
} as const;

const ENGINE = "regime-regular" as const;
const WARNING_HEADER = "x-warning-dados-simulados";

export function createRegimeRegularHttpClient(
  options: HttpClientOptions,
): RegimeRegularAdapter {
  const doFetch = options.fetch ?? globalThis.fetch;

  async function request<S extends z.ZodType>(
    path: string,
    schema: S,
    init: RequestInit,
    signal?: AbortSignal,
  ): Promise<EngineCallResult<z.infer<S>>> {
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
        throw new EngineUnavailableError(
          `O motor não respondeu em ${options.timeoutMs} ms.`,
          ENGINE,
          "timeout",
        );
      }
      throw new EngineUnavailableError(
        `Não foi possível conectar ao motor em ${options.baseUrl}.`,
        ENGINE,
        "rede",
      );
    }

    const body = await readBody(response);

    if (!response.ok) {
      throw new EngineHttpError(
        `O motor respondeu HTTP ${response.status}.`,
        ENGINE,
        response.status,
        body,
      );
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new EngineContractError(
        "A resposta do motor não corresponde ao contrato esperado. O upstream pode ter mudado.",
        ENGINE,
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

  return {
    async getVersao(signal) {
      const result = await request(REGIME_REGULAR_PATHS.versao, versaoSchema, { method: "GET" }, signal);
      return result.data;
    },
    calcularComObservabilidade(operacao, signal) {
      return request(
        REGIME_REGULAR_PATHS.observabilidade,
        observabilidadeRespostaSchema,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: typeof operacao === "string" ? operacao : JSON.stringify(operacao),
        },
        signal,
      );
    },
  };
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
