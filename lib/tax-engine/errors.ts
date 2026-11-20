import type { EngineId } from "./types";

/** Base de todos os erros da camada de integração. */
export class TaxEngineError extends Error {
  constructor(
    message: string,
    readonly engine: EngineId,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** A URL do motor não foi informada (ou é inválida) no ambiente. */
export class EngineNotConfiguredError extends TaxEngineError {}

/** O motor não respondeu: rede, DNS, conexão recusada ou timeout. */
export class EngineUnavailableError extends TaxEngineError {
  constructor(
    message: string,
    engine: EngineId,
    readonly causa: "timeout" | "rede",
  ) {
    super(message, engine);
  }
}

/**
 * O motor respondeu com status HTTP de erro. O upstream do regime regular
 * usa ProblemDetail (RFC 7807) — ver ADR007 do repositório oficial —, então o
 * corpo é preservado como veio para ser exibido no inspetor técnico.
 */
export class EngineHttpError extends TaxEngineError {
  constructor(
    message: string,
    engine: EngineId,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message, engine);
  }
}

/** O motor respondeu 2xx, mas o corpo não corresponde ao contrato esperado. */
export class EngineContractError extends TaxEngineError {
  constructor(
    message: string,
    engine: EngineId,
    readonly body: unknown,
  ) {
    super(message, engine);
  }
}
