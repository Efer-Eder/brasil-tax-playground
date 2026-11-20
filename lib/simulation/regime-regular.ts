import {
  createRegimeRegularHttpClient,
  type RegimeRegularAdapter,
} from "@/lib/tax-engine/adapters/regime-regular";
import { readRegimeRegularConfig } from "@/lib/tax-engine/config";
import {
  EngineContractError,
  EngineHttpError,
  EngineUnavailableError,
} from "@/lib/tax-engine/errors";
import {
  operacaoSchema,
  type ObservabilidadeResposta,
  type OperacaoInput,
} from "@/lib/tax-engine/schemas/regime-regular";
import type { EngineVersion } from "@/lib/tax-engine/types";
import { FilaCheiaError, type LimitadorConcorrencia } from "./limites";

/**
 * Resultado de uma simulação, no formato que o BFF devolve ao navegador.
 *
 * Em sucesso, `resposta` é o corpo devolvido pelo motor, sem transformação —
 * a UI exibe e exporta exatamente o que o motor produziu.
 */
export type SimulacaoResultado =
  | {
      ok: true;
      httpStatus: 200;
      requisicao: OperacaoInput;
      resposta: ObservabilidadeResposta;
      warningDadosSimulados: string | null;
      motor: { baseUrl: string; versao: EngineVersion | null };
      executadoEm: string;
    }
  | {
      ok: false;
      httpStatus: number;
      erro: SimulacaoErro;
    };

export type SimulacaoErro =
  | { tipo: "json-invalido"; mensagem: string }
  | { tipo: "validacao"; mensagem: string; problemas: { caminho: string; mensagem: string }[] }
  | { tipo: "limite-itens"; mensagem: string; maxItens: number }
  | { tipo: "ocupado"; mensagem: string }
  | { tipo: "nao-configurado"; mensagem: string }
  | { tipo: "indisponivel"; mensagem: string }
  | { tipo: "erro-do-motor"; mensagem: string; statusMotor: number; corpo: unknown }
  | { tipo: "contrato"; mensagem: string; corpo: unknown }
  | { tipo: "interno"; mensagem: string };

export interface SimularDeps {
  env?: Record<string, string | undefined>;
  createClient?: (config: { baseUrl: string; timeoutMs: number }) => RegimeRegularAdapter;
  now?: () => Date;
  /** Teto de itens por operação (instância pública). */
  maxItens?: number | null;
  /** Limita chamadas simultâneas ao motor (instância pública). */
  limitador?: LimitadorConcorrencia;
  /**
   * Guarda a versão do motor por este tempo (ms) em vez de consultá-la a cada
   * simulação. A versão só muda quando o motor é atualizado.
   */
  cacheVersaoMs?: number;
}

const cacheVersao = new Map<string, { versao: EngineVersion; expiraEm: number }>();

/** Limpa o cache de versão (testes). */
export function limparCacheVersao() {
  cacheVersao.clear();
}

async function obterVersao(
  client: RegimeRegularAdapter,
  baseUrl: string,
  ttlMs: number | undefined,
  agora: number,
): Promise<EngineVersion | null> {
  if (ttlMs) {
    const salvo = cacheVersao.get(baseUrl);
    if (salvo && salvo.expiraEm > agora) return salvo.versao;
  }
  const versao = await client.getVersao().catch(() => null);
  if (ttlMs && versao) cacheVersao.set(baseUrl, { versao, expiraEm: agora + ttlMs });
  return versao;
}

/** Recebe o corpo cru da requisição (texto) e executa a simulação. */
export async function simularRegimeRegular(rawBody: string, deps: SimularDeps = {}): Promise<SimulacaoResultado> {
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return falha(400, { tipo: "json-invalido", mensagem: "O corpo enviado não é um JSON válido." });
  }

  const parsed = operacaoSchema.safeParse(json);
  if (!parsed.success) {
    return falha(422, {
      tipo: "validacao",
      mensagem: "A operação não passou na validação estrutural (antes de chegar ao motor).",
      problemas: parsed.error.issues.map((issue) => ({
        caminho: issue.path.length ? issue.path.join(".") : "(raiz)",
        mensagem: issue.message,
      })),
    });
  }

  if (deps.maxItens && parsed.data.itens.length > deps.maxItens) {
    return falha(413, {
      tipo: "limite-itens",
      mensagem: `Esta instância aceita até ${deps.maxItens} itens por operação (recebidos ${parsed.data.itens.length}). Divida a operação ou rode o motor localmente.`,
      maxItens: deps.maxItens,
    });
  }

  const config = readRegimeRegularConfig(deps.env ?? process.env);
  if (!config.ok) {
    return falha(503, { tipo: "nao-configurado", mensagem: config.motivo });
  }

  const client = (deps.createClient ?? createRegimeRegularHttpClient)(config.config);

  try {
    const executar = <T>(tarefa: () => Promise<T>) => (deps.limitador ? deps.limitador.executar(tarefa) : tarefa());
    const resultado = await executar(() => client.calcularComObservabilidade(parsed.data));
    // A versão é informativa: se falhar, o cálculo continua válido.
    const versao = await obterVersao(
      client,
      config.config.baseUrl,
      deps.cacheVersaoMs,
      (deps.now?.() ?? new Date()).getTime(),
    );
    return {
      ok: true,
      httpStatus: 200,
      requisicao: parsed.data,
      resposta: resultado.data,
      warningDadosSimulados: resultado.warningDadosSimulados,
      motor: { baseUrl: config.config.baseUrl, versao },
      executadoEm: (deps.now?.() ?? new Date()).toISOString(),
    };
  } catch (error) {
    if (error instanceof FilaCheiaError) {
      return falha(503, {
        tipo: "ocupado",
        mensagem: "A instância está no limite de simulações simultâneas. Tente de novo em alguns segundos.",
      });
    }
    if (error instanceof EngineUnavailableError) {
      return falha(error.causa === "timeout" ? 504 : 503, { tipo: "indisponivel", mensagem: error.message });
    }
    if (error instanceof EngineHttpError) {
      return falha(502, {
        tipo: "erro-do-motor",
        mensagem: error.message,
        statusMotor: error.status,
        corpo: error.body,
      });
    }
    if (error instanceof EngineContractError) {
      return falha(502, { tipo: "contrato", mensagem: error.message, corpo: error.body });
    }
    return falha(500, { tipo: "interno", mensagem: "Erro inesperado ao chamar o motor." });
  }
}

function falha(httpStatus: number, erro: SimulacaoErro): SimulacaoResultado {
  return { ok: false, httpStatus, erro };
}
