import { createRegimeRegularHttpClient, type RegimeRegularAdapter } from "./adapters/regime-regular";
import { readRegimeRegularConfig } from "./config";
import { TaxEngineError } from "./errors";
import type { EngineStatus } from "./types";

export interface CheckStatusDeps {
  env?: Record<string, string | undefined>;
  /** Permite injetar um adapter (testes). */
  createClient?: typeof createRegimeRegularHttpClient;
  now?: () => Date;
}

/**
 * Verifica se o motor de regime regular está configurado e respondendo.
 * Nunca lança: sempre devolve um estado explícito para a UI exibir.
 */
export async function checkRegimeRegularStatus(deps: CheckStatusDeps = {}): Promise<EngineStatus> {
  const config = readRegimeRegularConfig(deps.env ?? process.env);
  if (!config.ok) {
    return { state: "nao-configurado", engine: "regime-regular", motivo: config.motivo };
  }

  const client: RegimeRegularAdapter = (deps.createClient ?? createRegimeRegularHttpClient)(config.config);

  try {
    const versao = await client.getVersao();
    return {
      state: "disponivel",
      engine: "regime-regular",
      baseUrl: config.config.baseUrl,
      versao,
      verificadoEm: (deps.now?.() ?? new Date()).toISOString(),
    };
  } catch (error) {
    const motivo =
      error instanceof TaxEngineError ? error.message : "Erro inesperado ao consultar o motor.";
    return {
      state: "indisponivel",
      engine: "regime-regular",
      baseUrl: config.config.baseUrl,
      motivo,
    };
  }
}
