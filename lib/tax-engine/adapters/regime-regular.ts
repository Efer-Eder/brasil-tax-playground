import { chamarMotorJson, type EngineCallResult, type HttpClientOptions } from "../http";
import {
  observabilidadeRespostaSchema,
  versaoSchema,
  type ObservabilidadeResposta,
  type OperacaoInput,
} from "../schemas/regime-regular";
import type { EngineDescriptor, EngineVersion } from "../types";

export type { EngineCallResult, HttpClientOptions } from "../http";

export const regimeRegularDescriptor: EngineDescriptor = {
  id: "regime-regular",
  nome: "Calculadora RTC · Regime Regular",
  descricao:
    "API REST oficial (Java/Spring Boot) que calcula CBS, IBS e Imposto Seletivo nas operações do regime regular.",
  upstreamRepo: "https://github.com/ReceitaFederal/calculadora-rtc-regime-regular",
  upstreamReferencia: "1.7.2 (f1eebd7)",
  stage: "em-integracao",
};

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

/** Caminhos relativos à URL base (que já inclui o context-path `/api`). */
export const REGIME_REGULAR_PATHS = {
  versao: "/calculadora/dados-abertos/versao",
  observabilidade: "/calculadora/observabilidade/regime-geral",
} as const;

const ENGINE = "regime-regular" as const;

export function createRegimeRegularHttpClient(
  options: HttpClientOptions,
): RegimeRegularAdapter {
  return {
    async getVersao(signal) {
      const result = await chamarMotorJson(ENGINE, options, REGIME_REGULAR_PATHS.versao, versaoSchema, { method: "GET" }, signal);
      return result.data;
    },
    calcularComObservabilidade(operacao, signal) {
      return chamarMotorJson(
        ENGINE,
        options,
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
