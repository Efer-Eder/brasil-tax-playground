import { z } from "zod";
import { readEngineConfig, type MotorConfiguravel } from "./config";

/**
 * Consulta aos dados abertos do motor (listas de UF, município, CST,
 * cClassTrib e descrição de NCM/NBS) para o formulário guiado.
 *
 * Só os recursos abaixo são permitidos, com parâmetros validados por regex:
 * o BFF não é um proxy genérico para o motor (evita SSRF e abuso). As
 * respostas são repassadas como vieram e ficam em cache em memória.
 */

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use AAAA-MM-DD");

interface Recurso {
  /** Motor que responde a consulta (padrão: regime regular). */
  motor?: MotorConfiguravel;
  params: z.ZodType<Record<string, string | undefined>>;
  caminho: (p: Record<string, string | undefined>) => string;
  ttlMs: number;
}

const HORA = 60 * 60 * 1000;

/** Query string só com os parâmetros informados, na ordem do schema. */
function consulta(p: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) q.set(k, v);
  return q.toString();
}

export const RECURSOS = {
  ufs: {
    params: z.object({}),
    caminho: () => "/calculadora/dados-abertos/ufs",
    ttlMs: 24 * HORA,
  },
  municipios: {
    params: z.object({ uf: z.string().regex(/^[A-Z]{2}$/, "UF com 2 letras maiúsculas") }),
    caminho: (p) => `/calculadora/dados-abertos/ufs/municipios?siglaUf=${p.uf}`,
    ttlMs: 24 * HORA,
  },
  "situacoes-cbs-ibs": {
    params: z.object({ data }),
    caminho: (p) => `/calculadora/dados-abertos/situacoes-tributarias/cbs-ibs?data=${p.data}`,
    ttlMs: HORA,
  },
  "situacoes-is": {
    params: z.object({ data }),
    caminho: (p) => `/calculadora/dados-abertos/situacoes-tributarias/is?data=${p.data}`,
    ttlMs: HORA,
  },
  ncm: {
    params: z.object({ ncm: z.string().regex(/^\d{8}$/, "NCM com 8 dígitos"), data }),
    caminho: (p) => `/calculadora/dados-abertos/ncm?ncm=${p.ncm}&data=${p.data}`,
    ttlMs: HORA,
  },
  nbs: {
    params: z.object({ nbs: z.string().regex(/^\d{9}$/, "NBS com 9 dígitos"), data }),
    caminho: (p) => `/calculadora/dados-abertos/nbs?nbs=${p.nbs}&data=${p.data}`,
    ttlMs: HORA,
  },
  // Simples Nacional: atividades (cAtivSN) vigentes na data, com os filtros
  // por documento e por cClassTrib que o próprio motor oferece.
  "atividades-sn": {
    motor: "simples-nacional",
    params: z.object({
      data,
      tpDoc: z.string().regex(/^\d{2}$/, "tpDoc com 2 dígitos").optional(),
      cClassTrib: z.string().regex(/^\d{6}$/, "cClassTrib com 6 dígitos").optional(),
    }),
    caminho: (p) => `/calculadora/simples-nacional/atividades?${consulta(p)}`,
    ttlMs: HORA,
  },
  "erro-sn": {
    motor: "simples-nacional",
    params: z.object({ codigo: z.string().regex(/^VSN-\d{3}$/, "Código no formato VSN-000") }),
    caminho: (p) => `/calculadora/observabilidade/simples-nacional/erros?codigo=${p.codigo}`,
    ttlMs: 24 * HORA,
  },
} satisfies Record<string, Recurso>;

export type NomeRecurso = keyof typeof RECURSOS;

export type ResultadoDadosAbertos =
  | { ok: true; status: 200; dados: unknown }
  | { ok: false; status: number; motivo: string; corpo?: unknown };

interface Deps {
  env?: Record<string, string | undefined>;
  fetch?: typeof fetch;
  agora?: () => number;
}

const MAX_CACHE = 500;
const cache = new Map<string, { dados: unknown; expira: number }>();

/** Limpa o cache (testes). */
export function limparCacheDadosAbertos() {
  cache.clear();
}

export async function consultarDadosAbertos(
  nome: string,
  parametros: Record<string, string>,
  deps: Deps = {},
): Promise<ResultadoDadosAbertos> {
  if (!Object.hasOwn(RECURSOS, nome)) {
    return { ok: false, status: 404, motivo: `Recurso desconhecido: ${nome}.` };
  }
  const recurso = RECURSOS[nome as NomeRecurso] as Recurso;
  const p = recurso.params.safeParse(parametros);
  if (!p.success) {
    return { ok: false, status: 422, motivo: p.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }

  const config = readEngineConfig(recurso.motor ?? "regime-regular", deps.env ?? process.env);
  if (!config.ok) return { ok: false, status: 503, motivo: config.motivo };

  const caminho = recurso.caminho(p.data);
  const agora = (deps.agora ?? Date.now)();
  const chave = `${recurso.motor ?? "regime-regular"}:${caminho}`;
  const salvo = cache.get(chave);
  if (salvo && salvo.expira > agora) return { ok: true, status: 200, dados: salvo.dados };

  let res: Response;
  try {
    res = await (deps.fetch ?? globalThis.fetch)(`${config.config.baseUrl}${caminho}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(Math.min(config.config.timeoutMs, 5000)),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 503, motivo: "O motor não respondeu à consulta de dados abertos." };
  }
  const texto = await res.text();
  let corpo: unknown = texto;
  try {
    corpo = JSON.parse(texto);
  } catch {
    /* mantém texto */
  }
  if (!res.ok) {
    return { ok: false, status: res.status === 404 ? 404 : 502, motivo: `O motor respondeu HTTP ${res.status}.`, corpo };
  }

  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
  cache.set(chave, { dados: corpo, expira: agora + recurso.ttlMs });
  return { ok: true, status: 200, dados: corpo };
}
