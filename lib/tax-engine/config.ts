import { z } from "zod";

/** Timeout padrão das chamadas ao motor, em milissegundos. */
export const DEFAULT_TIMEOUT_MS = 10_000;

const urlSchema = z
  .url({ protocol: /^https?$/, error: "Use uma URL http(s) completa" })
  .transform((value) => value.replace(/\/+$/, ""));

const timeoutSchema = z.coerce
  .number()
  .int("Use um número inteiro de milissegundos")
  .min(500, "Mínimo de 500 ms")
  .max(120_000, "Máximo de 120000 ms");

export interface EngineConfig {
  /** URL base do motor, ex.: http://localhost:8080/api */
  baseUrl: string;
  timeoutMs: number;
}

/** Mantido pelo nome antigo: é a mesma configuração para qualquer motor. */
export type RegimeRegularConfig = EngineConfig;

export type ConfigResult<T> =
  | { ok: true; config: T }
  | { ok: false; motivo: string };

/** Prefixo das variáveis de ambiente de cada motor. */
export const PREFIXO_MOTOR = {
  "regime-regular": "REGIME_REGULAR_ENGINE",
  "simples-nacional": "SIMPLES_NACIONAL_ENGINE",
  danfse: "DANFSE_ENGINE",
} as const;

export type MotorConfiguravel = keyof typeof PREFIXO_MOTOR;

/**
 * Lê a URL e o timeout de um motor a partir das variáveis de ambiente
 * (`<PREFIXO>_URL` e `<PREFIXO>_TIMEOUT_MS`). Não há valor padrão para a URL
 * de propósito: sem ela, a aplicação informa que o motor não está configurado
 * em vez de tentar um endereço presumido.
 */
export function readEngineConfig(
  motor: MotorConfiguravel,
  env: Record<string, string | undefined> = process.env,
): ConfigResult<EngineConfig> {
  const prefixo = PREFIXO_MOTOR[motor];
  const rawUrl = env[`${prefixo}_URL`]?.trim();
  if (!rawUrl) {
    return {
      ok: false,
      motivo: `A variável ${prefixo}_URL não está definida. Suba o motor oficial localmente e configure a URL (veja docs/upstream-integration.md).`,
    };
  }

  const url = urlSchema.safeParse(rawUrl);
  if (!url.success) {
    return {
      ok: false,
      motivo: `${prefixo}_URL inválida: ${url.error.issues[0]?.message ?? "formato não reconhecido"}.`,
    };
  }

  const rawTimeout = env[`${prefixo}_TIMEOUT_MS`]?.trim();
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  if (rawTimeout) {
    const timeout = timeoutSchema.safeParse(rawTimeout);
    if (!timeout.success) {
      return {
        ok: false,
        motivo: `${prefixo}_TIMEOUT_MS inválido: ${timeout.error.issues[0]?.message ?? "valor não reconhecido"}.`,
      };
    }
    timeoutMs = timeout.data;
  }

  return { ok: true, config: { baseUrl: url.data, timeoutMs } };
}

/** Configuração do motor de regime regular (`REGIME_REGULAR_ENGINE_URL`). */
export function readRegimeRegularConfig(
  env: Record<string, string | undefined> = process.env,
): ConfigResult<EngineConfig> {
  return readEngineConfig("regime-regular", env);
}
