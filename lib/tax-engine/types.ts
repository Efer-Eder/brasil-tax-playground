/**
 * Tipos compartilhados da camada de integração com os motores oficiais.
 *
 * Nada aqui contém alíquotas, regras ou cálculos fiscais: os números exibidos
 * pela aplicação vêm sempre da resposta do motor oficial auto-hospedado.
 */

export type EngineId = "regime-regular" | "simples-nacional" | "danfse";

/** Situação da integração dentro deste projeto (não do upstream). */
export type IntegrationStage = "em-integracao" | "planejado";

export interface EngineDescriptor {
  id: EngineId;
  nome: string;
  descricao: string;
  /** Repositório oficial de origem. */
  upstreamRepo: string;
  /** Tag/commit consultado ao escrever docs/upstream-integration.md. */
  upstreamReferencia: string;
  stage: IntegrationStage;
}

/** Resultado da verificação de disponibilidade de um motor. */
export type EngineStatus =
  | {
      state: "nao-configurado";
      engine: EngineId;
      motivo: string;
    }
  | {
      state: "indisponivel";
      engine: EngineId;
      motivo: string;
      baseUrl: string;
    }
  | {
      state: "disponivel";
      engine: EngineId;
      baseUrl: string;
      versao: EngineVersion;
      verificadoEm: string;
    };

/**
 * Campos de `GET /calculadora/dados-abertos/versao` do regime regular
 * (VersaoOutput.java no upstream). Todos opcionais porque o contrato pode
 * mudar; a UI mostra apenas o que o motor devolver.
 */
export interface EngineVersion {
  versaoApp?: string;
  descricaoVersaoApp?: string;
  versaoDb?: string;
  descricaoVersaoDb?: string;
  dataVersaoDb?: string;
  ambiente?: string;
}
