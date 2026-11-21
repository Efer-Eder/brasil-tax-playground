import contrato from "./regime-regular.openapi.json";
import contratoSimples from "./simples-nacional.openapi.json";

/**
 * Leitura do contrato de entrada do motor (retrato do OpenAPI publicado pelo
 * próprio motor, gerado por scripts/contrato/extrair-openapi.mjs). O
 * formulário guiado usa isso para rótulos de ajuda, obrigatoriedade, limites e
 * listas de valores, em vez de textos escritos à mão.
 */

export type NomeSchema = keyof typeof contrato.schemas | keyof typeof contratoSimples.schemas;

/** Motor dono de cada retrato (para os rótulos de saída). */
export type MotorContrato = "regime-regular" | "simples-nacional";

interface PropriedadeOpenApi {
  type?: string | string[];
  description?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  deprecated?: boolean;
}

const SCHEMAS = { ...contrato.schemas, ...contratoSimples.schemas } as unknown as Record<
  NomeSchema,
  { required?: string[]; properties: Record<string, PropriedadeOpenApi> }
>;

export interface OpcaoContrato {
  valor: number;
  rotulo: string;
}

export interface CampoContrato {
  nome: string;
  descricao: string;
  obrigatorio: boolean;
  tipo?: string | string[];
  minimo?: number;
  maximo?: number;
  tamanhoMinimo?: number;
  tamanhoMaximo?: number;
  padrao?: string;
  obsoleto: boolean;
  /**
   * Valores listados na própria descrição do motor: `<li>1 = União` no
   * regime regular; `1 (Simples), 2 (...)` ou `— 1 tributável; 2 ...` no
   * Simples Nacional.
   */
  opcoes: OpcaoContrato[];
}

export const MOTOR_DO_CONTRATO = contrato.motor;
export const MOTOR_SIMPLES_DO_CONTRATO = contratoSimples.motor;

/** Remove o HTML das descrições do Swagger e normaliza espaços. */
export function textoLimpo(html: string | undefined): string {
  if (!html) return "";
  return html
    .replace(/<li>/gi, "; ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s*;\s*/g, "; ")
    .replace(/\s+/g, " ")
    .replace(/:\s*;\s*/g, ": ")
    .trim();
}

function opcoesDaDescricao(html: string | undefined): OpcaoContrato[] {
  if (!html) return [];
  const li = [...html.matchAll(/<li>\s*(\d+)\s*=\s*([^<\n]+)/gi)];
  if (li.length) return li.map((m) => ({ valor: Number(m[1]), rotulo: m[2].trim() }));
  // Simples Nacional: "1 (Simples), 2 (excesso de sublimite) ou 3 (...)". Vale a
  // primeira ocorrência de cada número: o texto segue com "proibido com 1 ou 2 (VSN-031)".
  const parenteses = [...html.matchAll(/(?:^|[\s,:])(\d)\s+\(([^)]+)\)/g)].filter(
    (m, i, todos) => todos.findIndex((x) => x[1] === m[1]) === i,
  );
  if (parenteses.length >= 2) return parenteses.map((m) => ({ valor: Number(m[1]), rotulo: m[2].trim() }));
  // Simples Nacional: "— 1 operação tributável; 2 imunidade; 3 ...".
  const lista = html.split("—")[1];
  if (lista) {
    const itens = [...lista.matchAll(/(?:^|;)\s*(\d)\s+([^;.]+)/g)];
    if (itens.length >= 2) return itens.map((m) => ({ valor: Number(m[1]), rotulo: m[2].trim() }));
  }
  return [];
}

/** Descreve um campo do contrato; lança erro se o campo não existir (contrato mudou). */
export function campo(schema: NomeSchema, nome: string): CampoContrato {
  const s = SCHEMAS[schema];
  const p = s.properties[nome];
  if (!p) throw new Error(`Campo ${schema}.${nome} não existe no contrato do motor.`);
  const opcoes = opcoesDaDescricao(p.description);
  let descricao = textoLimpo(p.description);
  if (opcoes.length) descricao = descricao.replace(/\s*Valores:.*$/i, "").trim();
  return {
    nome,
    descricao,
    obrigatorio: (s.required ?? []).includes(nome),
    tipo: p.type,
    minimo: p.minimum,
    maximo: p.maximum,
    tamanhoMinimo: p.minLength,
    tamanhoMaximo: p.maxLength,
    padrao: p.pattern,
    obsoleto: Boolean(p.deprecated),
    opcoes,
  };
}

/** Nomes dos campos de um schema, na ordem do contrato. */
export function camposDe(schema: NomeSchema): string[] {
  return Object.keys(SCHEMAS[schema].properties);
}

/** Descrição de um campo de saída do motor (vBC, pCBS, vIBSUF...), ou null se o motor não descreve. */
export function rotuloSaida(campo: string, motor: MotorContrato = "regime-regular"): string | null {
  const fonte = motor === "simples-nacional" ? contratoSimples : contrato;
  const r = (fonte as { rotulosSaida?: Record<string, string> }).rotulosSaida;
  return r?.[campo] ?? null;
}
