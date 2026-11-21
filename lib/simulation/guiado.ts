import { COMPONENTES_BC, operacaoSchema } from "@/lib/tax-engine/schemas/regime-regular";

/**
 * Modelo do formulário guiado. Tudo é texto (como os campos da tela) e vira o
 * payload do motor em `montarPayload`. Campos vazios não entram no payload:
 * o formulário nunca preenche valor fiscal por conta própria.
 */

export type Componente = (typeof COMPONENTES_BC)[number];

export interface ItemGuiado {
  numero: number;
  identificacao: "ncm" | "nbs";
  codigo: string;
  cst: string;
  cClassTrib: string;
  baseCalculo: string;
  quantidade: string;
  unidade: string;
  usarAliquotas: boolean;
  aliquotas: { cbs: string; ibsEstadual: string; ibsMunicipal: string; isAdValorem: string; isAdRem: string };
  usarImpostoSeletivo: boolean;
  impostoSeletivo: {
    cst: string;
    cClassTrib: string;
    baseCalculo: string;
    quantidade: string;
    unidade: string;
    impostoInformado: string;
  };
  usarTributacaoRegular: boolean;
  tributacaoRegular: { cst: string; cClassTrib: string };
  usarComponentesBC: boolean;
  componentesBC: Partial<Record<Componente, string>>;
}

export interface OperacaoGuiada {
  id: string;
  versao: string;
  data: string; // AAAA-MM-DD
  hora: string; // HH:MM
  fuso: string; // -03:00
  uf: string;
  municipio: string;
  tpDoc: string;
  usarCompraGov: boolean;
  compraGov: { tpEnteGov: string; tpOperGov: string };
  itens: ItemGuiado[];
}

/** Fusos horários oficiais do Brasil continental e insular. */
export const FUSOS_BRASIL = ["-02:00", "-03:00", "-04:00", "-05:00"] as const;

export function novoItem(numero: number): ItemGuiado {
  return {
    numero,
    identificacao: "ncm",
    codigo: "",
    cst: "",
    cClassTrib: "",
    baseCalculo: "",
    quantidade: "",
    unidade: "",
    usarAliquotas: false,
    aliquotas: { cbs: "", ibsEstadual: "", ibsMunicipal: "", isAdValorem: "", isAdRem: "" },
    usarImpostoSeletivo: false,
    impostoSeletivo: { cst: "", cClassTrib: "", baseCalculo: "", quantidade: "", unidade: "", impostoInformado: "" },
    usarTributacaoRegular: false,
    tributacaoRegular: { cst: "", cClassTrib: "" },
    usarComponentesBC: false,
    componentesBC: {},
  };
}

/**
 * Operação vazia. `id` e `versao` são identificadores do documento, não dados
 * fiscais. A data do fato gerador começa vazia: o formulário não escolhe por
 * quem preenche.
 */
export function novaOperacao(data?: Date, id = "simulacao"): OperacaoGuiada {
  return {
    id,
    versao: "1.0.0",
    data: data ? data.toISOString().slice(0, 10) : "",
    hora: "10:00",
    fuso: "-03:00",
    uf: "",
    municipio: "",
    tpDoc: "",
    usarCompraGov: false,
    compraGov: { tpEnteGov: "", tpOperGov: "" },
    itens: [novoItem(1)],
  };
}

/**
 * Lê número escrito à brasileira ou com ponto ("1.234,56", "1234.56", "0,9").
 * Vazio vira `undefined` (campo omitido); texto inválido vira NaN (o schema acusa).
 */
export function lerDecimal(texto: string): number | undefined {
  const t = texto.trim();
  if (!t) return undefined;
  const normal = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  return /^-?\d+(\.\d+)?$/.test(normal) ? Number(normal) : Number.NaN;
}

function lerInteiro(texto: string): number | undefined {
  const t = texto.trim();
  if (!t) return undefined;
  return /^\d+$/.test(t) ? Number(t) : Number.NaN;
}

/** Remove chaves com `undefined` e objetos que ficaram vazios. */
function limpar<T extends Record<string, unknown>>(obj: T): Partial<T> | undefined {
  const saida = Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== "")) as Partial<T>;
  return Object.keys(saida).length ? saida : undefined;
}

export function montarItem(item: ItemGuiado): Record<string, unknown> {
  const aliquotasIs = limpar({
    adValorem: lerDecimal(item.aliquotas.isAdValorem),
    adRem: lerDecimal(item.aliquotas.isAdRem),
  });
  return {
    numero: item.numero,
    ...(item.codigo.trim() ? { [item.identificacao]: item.codigo.trim() } : {}),
    cst: item.cst,
    cClassTrib: item.cClassTrib,
    ...limpar({
      baseCalculo: lerDecimal(item.baseCalculo),
      quantidade: lerDecimal(item.quantidade),
      unidade: item.unidade.trim() || undefined,
    }),
    ...(item.usarImpostoSeletivo
      ? {
          impostoSeletivo: {
            cst: item.impostoSeletivo.cst,
            cClassTrib: item.impostoSeletivo.cClassTrib,
            baseCalculo: lerDecimal(item.impostoSeletivo.baseCalculo) ?? Number.NaN,
            ...limpar({
              quantidade: lerDecimal(item.impostoSeletivo.quantidade),
              unidade: item.impostoSeletivo.unidade.trim() || undefined,
              impostoInformado: lerDecimal(item.impostoSeletivo.impostoInformado),
            }),
          },
        }
      : {}),
    ...(item.usarTributacaoRegular
      ? { tributacaoRegular: { cst: item.tributacaoRegular.cst, cClassTrib: item.tributacaoRegular.cClassTrib } }
      : {}),
    ...(item.usarComponentesBC
      ? {
          gComponentesBC:
            limpar(Object.fromEntries(COMPONENTES_BC.map((c) => [c, lerDecimal(item.componentesBC[c] ?? "")]))) ?? {},
        }
      : {}),
    ...(item.usarAliquotas
      ? {
          aliquotasNominais: {
            ...limpar({
              cbs: lerDecimal(item.aliquotas.cbs),
              ibsEstadual: lerDecimal(item.aliquotas.ibsEstadual),
              ibsMunicipal: lerDecimal(item.aliquotas.ibsMunicipal),
            }),
            ...(aliquotasIs ? { impostoSeletivo: aliquotasIs } : {}),
          },
        }
      : {}),
  };
}

export function montarPayload(op: OperacaoGuiada): Record<string, unknown> {
  return {
    id: op.id.trim(),
    versao: op.versao.trim(),
    ...(op.data ? { dhFatoGerador: `${op.data}T${op.hora || "00:00"}:00${op.fuso}` } : {}),
    ...(op.municipio.trim() ? { municipio: lerInteiro(op.municipio) } : {}),
    ...(op.uf ? { uf: op.uf } : {}),
    ...(op.tpDoc.trim() ? { tpDoc: lerInteiro(op.tpDoc) } : {}),
    ...(op.usarCompraGov
      ? {
          gCompraGov: {
            ...(op.compraGov.tpEnteGov ? { tpEnteGov: lerInteiro(op.compraGov.tpEnteGov) } : {}),
            ...(op.compraGov.tpOperGov ? { tpOperGov: lerInteiro(op.compraGov.tpOperGov) } : {}),
          },
        }
      : {}),
    itens: op.itens.map(montarItem),
  };
}

export interface ProblemaCampo {
  /** Caminho no payload, ex.: "itens.0.cst". */
  caminho: string;
  mensagem: string;
}

/**
 * Confere o payload contra o espelho do contrato. É apoio para o usuário:
 * quem decide é o motor. NaN (número digitado errado) vira mensagem própria.
 */
export function validarPayload(payload: Record<string, unknown>): ProblemaCampo[] {
  const r = operacaoSchema.safeParse(payload);
  if (r.success) return [];
  return r.error.issues.map((i) => ({
    caminho: i.path.join("."),
    mensagem: /received undefined/i.test(i.message)
      ? "Obrigatório"
      : /received NaN|expected number/i.test(i.message)
        ? "Número inválido"
        : i.message,
  }));
}

/**
 * Conferência do modo guiado: o espelho do contrato mais a data do fato
 * gerador, que o motor exige (ela ou o campo obsoleto dataHoraEmissao).
 */
export function validarOperacaoGuiada(op: OperacaoGuiada): ProblemaCampo[] {
  const problemas = validarPayload(montarPayload(op));
  if (!op.data) problemas.unshift({ caminho: "dhFatoGerador", mensagem: "Informe a data do fato gerador" });
  return problemas;
}

/** Etapa do formulário onde um problema deve aparecer. */
export function etapaDoProblema(caminho: string): 2 | 3 {
  return caminho.startsWith("itens") ? 3 : 2;
}
