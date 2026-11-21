import { createDanfseHttpClient, type DanfseAdapter, type OpcoesDanfse } from "@/lib/tax-engine/adapters/danfse";
import { readEngineConfig } from "@/lib/tax-engine/config";
import { EngineHttpError, EngineUnavailableError } from "@/lib/tax-engine/errors";
import { FilaCheiaError, type LimitadorConcorrencia } from "@/lib/simulation/limites";

/**
 * Geração do DANFSe pelo serviço oficial. Esta aplicação não monta nem altera
 * o PDF: confere só o mínimo (corpo não vazio, parece XML, parâmetros
 * conhecidos), envia o XML como veio e devolve os bytes que o serviço gerou.
 */
export type ResultadoDanfse =
  | { ok: true; pdf: ArrayBuffer }
  | { ok: false; httpStatus: number; erro: ErroDanfse };

export type ErroDanfse =
  | { tipo: "entrada-invalida"; mensagem: string }
  | { tipo: "ocupado"; mensagem: string }
  | { tipo: "nao-configurado"; mensagem: string }
  | { tipo: "indisponivel"; mensagem: string }
  | { tipo: "erro-do-motor"; mensagem: string; statusMotor: number; corpo: unknown }
  | { tipo: "interno"; mensagem: string };

export interface GerarDanfseDeps {
  env?: Record<string, string | undefined>;
  createClient?: (config: { baseUrl: string; timeoutMs: number }) => DanfseAdapter;
  limitador?: LimitadorConcorrencia;
}

/** Lê `stc` e `canhoto` da query string; recusa valores fora do que o upstream documenta. */
export function lerOpcoesDanfse(params: URLSearchParams): { ok: true; opcoes: OpcoesDanfse } | { ok: false; mensagem: string } {
  const opcoes: OpcoesDanfse = {};
  const stc = params.get("stc");
  if (stc !== null && stc !== "") {
    if (stc !== "0" && stc !== "1" && stc !== "2") return { ok: false, mensagem: "stc aceita 0 (válida), 1 (substituída) ou 2 (cancelada)." };
    opcoes.stc = stc;
  }
  const canhoto = params.get("canhoto");
  if (canhoto !== null && canhoto !== "") {
    if (canhoto !== "true" && canhoto !== "false") return { ok: false, mensagem: "canhoto aceita true ou false." };
    opcoes.canhoto = canhoto === "true";
  }
  return { ok: true, opcoes };
}

/** `xml` pode vir como texto ou como os bytes recebidos (repassados sem recodificar). */
export async function gerarDanfse(
  xml: string | Uint8Array,
  opcoes: OpcoesDanfse,
  deps: GerarDanfseDeps = {},
): Promise<ResultadoDanfse> {
  const texto = (typeof xml === "string" ? xml : new TextDecoder().decode(xml)).replace(/^\uFEFF/, "").trim();
  if (!texto) return falha(422, { tipo: "entrada-invalida", mensagem: "Envie o XML da NFS-e no corpo da requisição." });
  if (!texto.startsWith("<")) {
    return falha(422, { tipo: "entrada-invalida", mensagem: "O corpo não parece um XML (deve começar com \"<\")." });
  }

  const config = readEngineConfig("danfse", deps.env ?? process.env);
  if (!config.ok) return falha(503, { tipo: "nao-configurado", mensagem: config.motivo });

  const client = (deps.createClient ?? createDanfseHttpClient)(config.config);
  const executar = <T>(tarefa: () => Promise<T>) => (deps.limitador ? deps.limitador.executar(tarefa) : tarefa());

  try {
    const { pdf } = await executar(() => client.gerarPdf(xml, opcoes));
    return { ok: true, pdf };
  } catch (error) {
    if (error instanceof FilaCheiaError) {
      return falha(503, { tipo: "ocupado", mensagem: "A instância está no limite de gerações simultâneas. Tente de novo em alguns segundos." });
    }
    if (error instanceof EngineUnavailableError) {
      return falha(error.causa === "timeout" ? 504 : 503, { tipo: "indisponivel", mensagem: error.message });
    }
    if (error instanceof EngineHttpError) {
      // O serviço responde 400 com {sucesso:false, mensagem} para XML que ele não aceita.
      const corpo = error.body as { mensagem?: unknown } | null;
      const mensagem = typeof corpo?.mensagem === "string" ? `O gerador recusou o XML: ${corpo.mensagem}` : error.message;
      return falha(error.status === 400 ? 422 : 502, {
        tipo: "erro-do-motor",
        mensagem,
        statusMotor: error.status,
        corpo: error.body,
      });
    }
    return falha(500, { tipo: "interno", mensagem: "Erro inesperado ao chamar o gerador." });
  }
}

function falha(httpStatus: number, erro: ErroDanfse): ResultadoDanfse {
  return { ok: false, httpStatus, erro };
}
