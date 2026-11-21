import { createDanfseHttpClient, danfseDescriptor } from "./adapters/danfse";
import { createRegimeRegularHttpClient } from "./adapters/regime-regular";
import { createSimplesNacionalHttpClient } from "./adapters/simples-nacional";
import { readEngineConfig, type EngineConfig } from "./config";
import { TaxEngineError } from "./errors";
import type { EngineId, EngineStatus, EngineVersion } from "./types";

export interface CheckStatusDeps {
  env?: Record<string, string | undefined>;
  /** Permite injetar um adapter de regime regular (testes). */
  createClient?: typeof createRegimeRegularHttpClient;
  /** Permite injetar `fetch` para qualquer motor (testes). */
  fetch?: typeof fetch;
  now?: () => Date;
}

/** Consulta a versão (ou a prontidão, no DANFSe) de cada motor. */
async function sondar(
  engine: EngineId,
  config: EngineConfig,
  deps: CheckStatusDeps,
): Promise<EngineVersion> {
  const opcoes = { ...config, fetch: deps.fetch };
  if (engine === "regime-regular") return (deps.createClient ?? createRegimeRegularHttpClient)(opcoes).getVersao();
  if (engine === "simples-nacional") return createSimplesNacionalHttpClient(opcoes).getVersao();
  // O gerador não publica versão: informa a tag que esta instância empacotou.
  await createDanfseHttpClient(opcoes).pronto();
  const versao = (deps.env ?? process.env).DANFSE_ENGINE_VERSAO?.trim();
  return versao ? { versaoApp: versao } : { descricaoVersaoApp: `upstream ${danfseDescriptor.upstreamReferencia}` };
}

/**
 * Verifica se um motor está configurado e respondendo. Nunca lança: sempre
 * devolve um estado explícito para a UI exibir.
 */
export async function checkEngineStatus(engine: EngineId, deps: CheckStatusDeps = {}): Promise<EngineStatus> {
  const config = readEngineConfig(engine, deps.env ?? process.env);
  if (!config.ok) return { state: "nao-configurado", engine, motivo: config.motivo };

  try {
    const versao = await sondar(engine, config.config, deps);
    return {
      state: "disponivel",
      engine,
      baseUrl: config.config.baseUrl,
      versao,
      verificadoEm: (deps.now?.() ?? new Date()).toISOString(),
    };
  } catch (error) {
    const motivo = error instanceof TaxEngineError ? error.message : "Erro inesperado ao consultar o motor.";
    return { state: "indisponivel", engine, baseUrl: config.config.baseUrl, motivo };
  }
}

/** Verifica o motor de regime regular (rota histórica `/api/engine/status`). */
export function checkRegimeRegularStatus(deps: CheckStatusDeps = {}): Promise<EngineStatus> {
  return checkEngineStatus("regime-regular", deps);
}
