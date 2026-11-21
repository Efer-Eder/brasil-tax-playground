import { createRegimeRegularHttpClient } from "@/lib/tax-engine/adapters/regime-regular";
import { createSimplesNacionalHttpClient } from "@/lib/tax-engine/adapters/simples-nacional";
import { readEngineConfig } from "@/lib/tax-engine/config";
import type { EngineCallResult } from "@/lib/tax-engine/http";
import {
  EngineContractError,
  EngineHttpError,
  EngineUnavailableError,
} from "@/lib/tax-engine/errors";
import {
  envelopeOperacaoSchema,
  type ObservabilidadeResposta,
} from "@/lib/tax-engine/schemas/regime-regular";
import type { EngineVersion } from "@/lib/tax-engine/types";

/** Motores de cálculo com observabilidade (o DANFSe gera PDF e tem rota própria). */
export type MotorCalculo = "regime-regular" | "simples-nacional";

/** O que a simulação precisa de um cliente de motor de cálculo. */
export interface AdapterCalculo {
  getVersao(signal?: AbortSignal): Promise<EngineVersion>;
  calcularComObservabilidade(operacao: string, signal?: AbortSignal): Promise<EngineCallResult<ObservabilidadeResposta>>;
}

const CLIENTES: Record<MotorCalculo, (config: { baseUrl: string; timeoutMs: number }) => AdapterCalculo> = {
  "regime-regular": createRegimeRegularHttpClient,
  "simples-nacional": createSimplesNacionalHttpClient,
};
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
      /** Motor que calculou (ausente em registros antigos do histórico = regime regular). */
      engine?: MotorCalculo;
      /** A operação recebida (JSON do corpo original; o motor recebe o texto sem alteração). */
      requisicao: Record<string, unknown>;
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
  createClient?: (config: { baseUrl: string; timeoutMs: number }) => AdapterCalculo;
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
  client: AdapterCalculo,
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

/** Recebe o corpo cru da requisição (texto) e executa a simulação no motor de regime regular. */
export function simularRegimeRegular(rawBody: string, deps: SimularDeps = {}): Promise<SimulacaoResultado> {
  return simularNoMotor("regime-regular", rawBody, deps);
}

/** O mesmo caminho, no motor do Simples Nacional (endpoint não assistido). */
export function simularSimplesNacional(rawBody: string, deps: SimularDeps = {}): Promise<SimulacaoResultado> {
  return simularNoMotor("simples-nacional", rawBody, deps);
}

/**
 * Pipeline comum: confere o envelope, aplica o teto de itens e a fila, envia o
 * texto original ao motor e devolve a resposta sem transformação.
 */
export async function simularNoMotor(
  engine: MotorCalculo,
  rawBody: string,
  deps: SimularDeps = {},
): Promise<SimulacaoResultado> {
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return falha(400, { tipo: "json-invalido", mensagem: "O corpo enviado não é um JSON válido." });
  }

  // Só o envelope é exigido aqui. Campos são validados pelo motor, que devolve
  // erro por item na observabilidade (ver paridade com os payloads do upstream).
  const parsed = envelopeOperacaoSchema.safeParse(json);
  if (!parsed.success) {
    return falha(422, {
      tipo: "validacao",
      mensagem: "O corpo precisa ser um objeto JSON com a lista \"itens\" preenchida.",
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

  const config = readEngineConfig(engine, deps.env ?? process.env);
  if (!config.ok) {
    return falha(503, { tipo: "nao-configurado", mensagem: config.motivo });
  }

  const client = (deps.createClient ?? CLIENTES[engine])(config.config);

  try {
    const executar = <T>(tarefa: () => Promise<T>) => (deps.limitador ? deps.limitador.executar(tarefa) : tarefa());
    // Encaminha o texto original: nada de reescrever números ou a ordem das chaves.
    const resultado = await executar(() => client.calcularComObservabilidade(rawBody));
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
      engine,
      requisicao: parsed.data as Record<string, unknown>,
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
