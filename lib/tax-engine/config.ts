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

export interface RegimeRegularConfig {
  /** URL base com o context-path `/api`, ex.: http://localhost:8080/api */
  baseUrl: string;
  timeoutMs: number;
}

export type ConfigResult<T> =
  | { ok: true; config: T }
  | { ok: false; motivo: string };

/**
 * Lê a configuração do motor de regime regular a partir das variáveis de
 * ambiente. Não há valor padrão para a URL de propósito: sem ela, a aplicação
 * informa que o motor não está configurado em vez de tentar um endereço
 * presumido.
 */
export function readRegimeRegularConfig(
  env: Record<string, string | undefined> = process.env,
): ConfigResult<RegimeRegularConfig> {
  const rawUrl = env.REGIME_REGULAR_ENGINE_URL?.trim();
  if (!rawUrl) {
    return {
      ok: false,
      motivo:
        "A variável REGIME_REGULAR_ENGINE_URL não está definida. Suba o motor oficial localmente e configure a URL (veja docs/upstream-integration.md).",
    };
  }

  const url = urlSchema.safeParse(rawUrl);
  if (!url.success) {
    return {
      ok: false,
      motivo: `REGIME_REGULAR_ENGINE_URL inválida: ${url.error.issues[0]?.message ?? "formato não reconhecido"}.`,
    };
  }

  const rawTimeout = env.REGIME_REGULAR_ENGINE_TIMEOUT_MS?.trim();
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  if (rawTimeout) {
    const timeout = timeoutSchema.safeParse(rawTimeout);
    if (!timeout.success) {
      return {
        ok: false,
        motivo: `REGIME_REGULAR_ENGINE_TIMEOUT_MS inválido: ${timeout.error.issues[0]?.message ?? "valor não reconhecido"}.`,
      };
    }
    timeoutMs = timeout.data;
  }

  return { ok: true, config: { baseUrl: url.data, timeoutMs } };
}
