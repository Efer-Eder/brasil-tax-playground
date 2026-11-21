/**
 * Histórico de simulações guardado só no navegador (localStorage). Nada vai
 * para o servidor. Limite de registros para não crescer sem controle; se o
 * armazenamento estiver indisponível ou corrompido, o histórico fica vazio.
 */

export interface RegistroHistorico {
  id: string;
  criadoEm: string;
  titulo: string;
  modo: "guiado" | "desenvolvedor";
  /** Texto exato enviado ao motor. */
  requisicao: string;
  resposta: unknown;
  motor: { versaoApp?: string; versaoDb?: string } | null;
  warningDadosSimulados: string | null;
}

export const CHAVE_HISTORICO = "btp:historico:v1";
export const LIMITE_HISTORICO = 20;

type Armazenamento = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function armazenamento(s?: Armazenamento | null): Armazenamento | null {
  if (s !== undefined) return s;
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function lerHistorico(s?: Armazenamento | null): RegistroHistorico[] {
  const a = armazenamento(s);
  if (!a) return [];
  try {
    const bruto = a.getItem(CHAVE_HISTORICO);
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? lista.filter((r) => r && typeof r.id === "string" && typeof r.requisicao === "string") : [];
  } catch {
    return [];
  }
}

function gravar(lista: RegistroHistorico[], s?: Armazenamento | null): boolean {
  const a = armazenamento(s);
  if (!a) return false;
  try {
    a.setItem(CHAVE_HISTORICO, JSON.stringify(lista));
    return true;
  } catch {
    // Cota cheia: tenta guardar só a metade mais recente.
    try {
      a.setItem(CHAVE_HISTORICO, JSON.stringify(lista.slice(0, Math.ceil(lista.length / 2))));
      return true;
    } catch {
      return false;
    }
  }
}

/** Adiciona no topo e corta no limite. Devolve a lista nova. */
export function adicionarAoHistorico(
  registro: RegistroHistorico,
  s?: Armazenamento | null,
): RegistroHistorico[] {
  const lista = [registro, ...lerHistorico(s).filter((r) => r.id !== registro.id)].slice(0, LIMITE_HISTORICO);
  gravar(lista, s);
  return lista;
}

export function removerDoHistorico(id: string, s?: Armazenamento | null): RegistroHistorico[] {
  const lista = lerHistorico(s).filter((r) => r.id !== id);
  gravar(lista, s);
  return lista;
}

export function limparHistorico(s?: Armazenamento | null): void {
  try {
    armazenamento(s)?.removeItem(CHAVE_HISTORICO);
  } catch {
    /* sem armazenamento */
  }
}

/** Título curto a partir do payload: id, data e quantidade de itens. */
export function tituloDaRequisicao(texto: string): string {
  try {
    const p = JSON.parse(texto) as { id?: unknown; dhFatoGerador?: unknown; itens?: unknown[] };
    const data = typeof p.dhFatoGerador === "string" ? p.dhFatoGerador.slice(0, 10) : "sem data";
    const n = Array.isArray(p.itens) ? p.itens.length : 0;
    return `${String(p.id ?? "operação")} · ${data} · ${n} ${n === 1 ? "item" : "itens"}`;
  } catch {
    return "operação";
  }
}
