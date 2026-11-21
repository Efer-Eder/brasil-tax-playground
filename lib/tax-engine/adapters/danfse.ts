import { chamarMotor, chamarMotorJson, type HttpClientOptions } from "../http";
import { z } from "zod";
import type { EngineDescriptor } from "../types";

/**
 * Serviço oficial calculadora-rtc-gerador-danfse (Go). Não é um motor de
 * cálculo: recebe o XML de uma NFS-e e devolve o PDF do DANFSe
 * (`POST /api/danfse`). Não tem endpoint de versão; a prontidão vem de
 * `GET /health/ready`. Ver docs/upstream-integration.md.
 */
export const danfseDescriptor: EngineDescriptor = {
  id: "danfse",
  nome: "Gerador DANFSe",
  descricao: "Serviço oficial que gera o PDF do DANFSe a partir do XML de uma NFS-e (não calcula tributos).",
  upstreamRepo: "https://github.com/ReceitaFederal/calculadora-rtc-gerador-danfse",
  upstreamReferencia: "1.0.0 (8d79e6b)",
  stage: "em-integracao",
};

export const DANFSE_PATHS = {
  pronto: "/health/ready",
  gerar: "/api/danfse",
} as const;

/** Situação da nota (parâmetro `stc` do upstream). */
export const SITUACOES_DANFSE = [
  { valor: "0", rotulo: "válida" },
  { valor: "1", rotulo: "substituída" },
  { valor: "2", rotulo: "cancelada" },
] as const;

export interface OpcoesDanfse {
  stc?: "0" | "1" | "2";
  canhoto?: boolean;
}

export interface DanfseAdapter {
  /** Lança se o serviço não estiver pronto. */
  pronto(signal?: AbortSignal): Promise<void>;
  /** O XML vai como veio: bytes são repassados sem recodificar. */
  gerarPdf(xml: string | Uint8Array, opcoes?: OpcoesDanfse, signal?: AbortSignal): Promise<{ pdf: ArrayBuffer }>;
}

const ENGINE = "danfse" as const;
const prontoSchema = z.looseObject({ status: z.literal("ok") });

export function createDanfseHttpClient(options: HttpClientOptions): DanfseAdapter {
  return {
    async pronto(signal) {
      await chamarMotorJson(ENGINE, options, DANFSE_PATHS.pronto, prontoSchema, { method: "GET" }, signal);
    },
    async gerarPdf(xml, opcoes = {}, signal) {
      const query = new URLSearchParams();
      if (opcoes.stc) query.set("stc", opcoes.stc);
      if (opcoes.canhoto === false) query.set("canhoto", "false");
      const qs = query.size ? `?${query.toString()}` : "";
      const res = await chamarMotor(
        ENGINE,
        options,
        `${DANFSE_PATHS.gerar}${qs}`,
        { method: "POST", headers: { "Content-Type": "application/xml", Accept: "application/pdf" }, body: typeof xml === "string" ? xml : new Blob([xml as Uint8Array<ArrayBuffer>]) },
        signal,
      );
      return { pdf: await res.arrayBuffer() };
    },
  };
}
