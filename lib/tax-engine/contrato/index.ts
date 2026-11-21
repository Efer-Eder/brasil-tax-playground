import contrato from "./regime-regular.openapi.json";

/**
 * Leitura do contrato de entrada do motor (retrato do OpenAPI publicado pelo
 * próprio motor, gerado por scripts/contrato/extrair-openapi.mjs). O
 * formulário guiado usa isso para rótulos de ajuda, obrigatoriedade, limites e
 * listas de valores, em vez de textos escritos à mão.
 */

export type NomeSchema = keyof typeof contrato.schemas;

interface PropriedadeOpenApi {
  type?: string;
  description?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  deprecated?: boolean;
}

export interface OpcaoContrato {
  valor: number;
  rotulo: string;
}

export interface CampoContrato {
  nome: string;
  descricao: string;
  obrigatorio: boolean;
  tipo?: string;
  minimo?: number;
  maximo?: number;
  tamanhoMinimo?: number;
  tamanhoMaximo?: number;
  padrao?: string;
  obsoleto: boolean;
  /** Valores listados na própria descrição do motor (`<li>1 = União`). */
  opcoes: OpcaoContrato[];
}

export const MOTOR_DO_CONTRATO = contrato.motor;

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
  return [...html.matchAll(/<li>\s*(\d+)\s*=\s*([^<\n]+)/gi)].map((m) => ({
    valor: Number(m[1]),
    rotulo: m[2].trim(),
  }));
}

/** Descreve um campo do contrato; lança erro se o campo não existir (contrato mudou). */
export function campo(schema: NomeSchema, nome: string): CampoContrato {
  const s = contrato.schemas[schema] as { required?: string[]; properties: Record<string, PropriedadeOpenApi> };
  const p = s.properties[nome];
  if (!p) throw new Error(`Campo ${schema}.${nome} não existe no contrato do motor ${contrato.motor.versaoApp}.`);
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
  return Object.keys((contrato.schemas[schema] as { properties: object }).properties);
}
