import { chamarMotorJson, type EngineCallResult, type HttpClientOptions } from "../http";
import { observabilidadeRespostaSchema, versaoSchema, type ObservabilidadeResposta } from "../schemas/regime-regular";
import type { EngineDescriptor, EngineVersion } from "../types";

/**
 * Motor oficial calculadora-rtc-simples-nacional (Java/Spring Boot, porta
 * padrão 8082, context-path `/api`). Usa o endpoint "não assistido", que o
 * próprio motor indica no lugar do clássico (marcado como OBSOLETO no OpenAPI
 * 1.0.2): atende NF-e, NFC-e, CT-e, BP-e, NFCom e NFS-e com o mesmo contrato,
 * e as alíquotas efetivas do contribuinte vêm no corpo, informadas por quem
 * chama. Ver docs/upstream-integration.md.
 */
export const simplesNacionalDescriptor: EngineDescriptor = {
  id: "simples-nacional",
  nome: "Calculadora RTC · Simples Nacional",
  descricao: "API REST oficial que calcula CBS e IBS nas operações do Simples Nacional.",
  upstreamRepo: "https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional",
  upstreamReferencia: "1.0.2 (a926d5a)",
  stage: "em-integracao",
};

export const SIMPLES_NACIONAL_PATHS = {
  versao: "/versao",
  observabilidade: "/calculadora/observabilidade/simples-nacional/nao-assistido",
} as const;

export interface SimplesNacionalAdapter {
  getVersao(signal?: AbortSignal): Promise<EngineVersion>;
  /** Uma string vai ao motor exatamente como está; um objeto é serializado. */
  calcularComObservabilidade(
    operacao: Record<string, unknown> | string,
    signal?: AbortSignal,
  ): Promise<EngineCallResult<ObservabilidadeResposta>>;
}

const ENGINE = "simples-nacional" as const;

export function createSimplesNacionalHttpClient(options: HttpClientOptions): SimplesNacionalAdapter {
  return {
    async getVersao(signal) {
      const r = await chamarMotorJson(ENGINE, options, SIMPLES_NACIONAL_PATHS.versao, versaoSchema, { method: "GET" }, signal);
      return r.data;
    },
    calcularComObservabilidade(operacao, signal) {
      // A resposta tem o mesmo envelope do regime regular (objetos[].nObj/estadoItem).
      return chamarMotorJson(
        ENGINE,
        options,
        SIMPLES_NACIONAL_PATHS.observabilidade,
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
