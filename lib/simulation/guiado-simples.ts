/**
 * Modelo do formulário guiado do Simples Nacional (endpoint "não assistido"
 * do motor 1.0.2). Tudo é texto, como na tela, e vira o payload em
 * `montarPayloadSimples`. Campos vazios não entram no payload: o formulário
 * nunca preenche alíquota, valor ou código fiscal por conta própria.
 *
 * As alíquotas efetivas são do contribuinte no período (o motor diz que a
 * relação anexo → alíquota "é configurada externamente"): quem simula informa.
 */

/**
 * Tipos de documento aceitos pelo endpoint, como o próprio motor os lista na
 * descrição da operação no OpenAPI 1.0.2.
 */
export const TIPOS_DOCUMENTO_SN = [
  { valor: "55", rotulo: "NF-e" },
  { valor: "65", rotulo: "NFC-e" },
  { valor: "57", rotulo: "CT-e" },
  { valor: "67", rotulo: "CT-e OS" },
  { valor: "63", rotulo: "BP-e" },
  { valor: "93", rotulo: "BP-e TM" },
  { valor: "62", rotulo: "NFCom" },
  { valor: "91", rotulo: "NFS-e" },
] as const;

export const ANEXOS = ["anexoI", "anexoII", "anexoIII", "anexoIV", "anexoV"] as const;
export type Anexo = (typeof ANEXOS)[number];
/** Anexos que têm o par "sem redistribuição do ISS" no contrato (AnexoComIssInput). */
export const ANEXOS_COM_ISS: readonly Anexo[] = ["anexoIII", "anexoIV", "anexoV"];

export interface ParAliquotas {
  pCBSSN: string;
  pIBSSN: string;
}

export interface AnexoGuiado extends ParAliquotas {
  usar: boolean;
  usarSemRedistribuicao: boolean;
  semRedistribuicaoISS: ParAliquotas;
}

export interface ItemSimples {
  numero: number;
  cAtivSN: string;
  cClassTrib: string;
  identificacao: "" | "ncm" | "nbs";
  codigo: string;
  baseCalculo: string;
  valorImpostoSeletivo: string;
  tribISSQN: string;
  tpRetISSQN: string;
  tpBM: string;
}

export interface OperacaoSimples {
  id: string;
  versao: string;
  data: string; // AAAA-MM-DD
  tpDoc: string;
  CRT: string;
  tpRegimeIBSCBS: string;
  opSimpNac: string;
  regApIBSCBSSN: string;
  regApTribSN: string;
  usarCompraGov: boolean;
  tpEnteGov: string;
  /** "" = não informar; "true"/"false" = valor do campo booleano. */
  fatorR: "" | "true" | "false";
  impedimentoSublimite: "" | "true" | "false";
  anexos: Record<Anexo, AnexoGuiado>;
  itens: ItemSimples[];
}

export interface ProblemaCampo {
  caminho: string;
  mensagem: string;
}

const par = (): ParAliquotas => ({ pCBSSN: "", pIBSSN: "" });

export function novoItemSimples(numero: number): ItemSimples {
  return {
    numero,
    cAtivSN: "",
    cClassTrib: "",
    identificacao: "",
    codigo: "",
    baseCalculo: "",
    valorImpostoSeletivo: "",
    tribISSQN: "",
    tpRetISSQN: "",
    tpBM: "",
  };
}

export function novaOperacaoSimples(id = "simulacao-simples"): OperacaoSimples {
  const anexos = Object.fromEntries(
    ANEXOS.map((a) => [a, { usar: false, ...par(), usarSemRedistribuicao: false, semRedistribuicaoISS: par() }]),
  ) as Record<Anexo, AnexoGuiado>;
  return {
    id,
    versao: "3.0.0",
    data: "",
    tpDoc: "",
    CRT: "",
    tpRegimeIBSCBS: "",
    opSimpNac: "",
    regApIBSCBSSN: "",
    regApTribSN: "",
    usarCompraGov: false,
    tpEnteGov: "",
    fatorR: "",
    impedimentoSublimite: "",
    anexos,
    itens: [novoItemSimples(1)],
  };
}

export const ehNfse = (op: Pick<OperacaoSimples, "tpDoc">) => op.tpDoc === "91";

/** Valor decimal em texto, como o motor pede (ponto decimal; vírgula vira ponto). */
export function decimalTexto(t: string): string {
  const s = t.trim();
  if (!s) return "";
  return s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
}

function semVazios(o: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined));
}

function montarPar(p: ParAliquotas): Record<string, unknown> {
  return semVazios({ pCBSSN: decimalTexto(p.pCBSSN), pIBSSN: decimalTexto(p.pIBSSN) });
}

export function montarItemSimples(item: ItemSimples, nfse: boolean): Record<string, unknown> {
  return semVazios({
    numero: item.numero,
    cAtivSN: item.cAtivSN,
    cClassTrib: item.cClassTrib,
    ...(item.identificacao && item.codigo ? { [item.identificacao]: item.codigo } : {}),
    baseCalculo: decimalTexto(item.baseCalculo),
    ...(nfse
      ? { tribISSQN: item.tribISSQN, tpRetISSQN: item.tpRetISSQN, tpBM: item.tpBM }
      : { valorImpostoSeletivo: decimalTexto(item.valorImpostoSeletivo) }),
  });
}

/** Payload do endpoint não assistido, com os campos do vocabulário do documento escolhido. */
export function montarPayloadSimples(op: OperacaoSimples): Record<string, unknown> {
  const nfse = ehNfse(op);
  const aliquotas: Record<string, unknown> = {};
  if (op.fatorR) aliquotas.fatorR = op.fatorR === "true";
  if (op.impedimentoSublimite) aliquotas.impedimentoSublimite = op.impedimentoSublimite === "true";
  for (const a of ANEXOS) {
    const g = op.anexos[a];
    if (!g.usar) continue;
    aliquotas[a] = {
      ...montarPar(g),
      ...(ANEXOS_COM_ISS.includes(a) && g.usarSemRedistribuicao ? { semRedistribuicaoISS: montarPar(g.semRedistribuicaoISS) } : {}),
    };
  }
  return semVazios({
    id: op.id.trim(),
    versao: op.versao.trim(),
    data: op.data,
    tpDoc: op.tpDoc,
    ...(nfse
      ? { opSimpNac: op.opSimpNac, regApIBSCBSSN: op.regApIBSCBSSN, regApTribSN: op.regApTribSN }
      : { CRT: op.CRT, tpRegimeIBSCBS: op.tpRegimeIBSCBS }),
    tpEnteGov: op.usarCompraGov ? op.tpEnteGov : "",
    aliquotasEfetivas: Object.keys(aliquotas).length ? aliquotas : undefined,
    itens: op.itens.map((i) => montarItemSimples(i, nfse)),
  });
}

const DECIMAL_13V2 = /^\d{1,13}(\.\d{1,2})?$/;
const PERCENTUAL = /^\d{1,3}(\.\d+)?$/;

/**
 * Conferência estrutural (formato e obrigatoriedade escritos no contrato).
 * Regras de negócio, como qual par de alíquotas vale, ficam com o motor.
 */
export function validarOperacaoSimples(op: OperacaoSimples): ProblemaCampo[] {
  const p: ProblemaCampo[] = [];
  const nfse = ehNfse(op);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(op.data)) p.push({ caminho: "data", mensagem: "Informe a data do fato gerador" });
  if (!op.tpDoc) p.push({ caminho: "tpDoc", mensagem: "Escolha o tipo de documento" });
  if (op.tpDoc && !nfse && !op.CRT) p.push({ caminho: "CRT", mensagem: "Obrigatório nos documentos com CRT" });
  if (nfse && !op.opSimpNac) p.push({ caminho: "opSimpNac", mensagem: "Obrigatório na NFS-e" });
  if (op.usarCompraGov && !op.tpEnteGov) p.push({ caminho: "tpEnteGov", mensagem: "Escolha o ente ou desligue a compra governamental" });

  for (const a of ANEXOS) {
    const g = op.anexos[a];
    if (!g.usar) continue;
    const pares: [string, ParAliquotas][] = [[`aliquotasEfetivas.${a}`, g]];
    if (ANEXOS_COM_ISS.includes(a) && g.usarSemRedistribuicao) pares.push([`aliquotasEfetivas.${a}.semRedistribuicaoISS`, g.semRedistribuicaoISS]);
    for (const [caminho, x] of pares) {
      for (const k of ["pCBSSN", "pIBSSN"] as const) {
        const v = decimalTexto(x[k]);
        if (v && !PERCENTUAL.test(v)) p.push({ caminho: `${caminho}.${k}`, mensagem: "Percentual em pontos (ex.: 1.1612)" });
      }
      if (!x.pCBSSN.trim()) p.push({ caminho: `${caminho}.pCBSSN`, mensagem: "Informe a alíquota efetiva da CBS ou desligue o anexo" });
    }
  }

  if (nfse && op.itens.length !== 1) p.push({ caminho: "itens", mensagem: "Na NFS-e a operação tem exatamente 1 item" });
  op.itens.forEach((item, i) => {
    const c = `itens.${i}`;
    if (!/^\d{6}$/.test(item.cClassTrib)) p.push({ caminho: `${c}.cClassTrib`, mensagem: "cClassTrib com 6 dígitos" });
    const base = decimalTexto(item.baseCalculo);
    if (!base) p.push({ caminho: `${c}.baseCalculo`, mensagem: "Obrigatório" });
    else if (!DECIMAL_13V2.test(base)) p.push({ caminho: `${c}.baseCalculo`, mensagem: "Valor no formato 13v2 (até 2 casas)" });
    if (item.identificacao && item.codigo) {
      const ok = item.identificacao === "ncm" ? /^\d{8}$/.test(item.codigo) : /^\d{9}$/.test(item.codigo);
      if (!ok) p.push({ caminho: `${c}.${item.identificacao}`, mensagem: item.identificacao === "ncm" ? "NCM com 8 dígitos" : "NBS com 9 dígitos" });
    }
    if (!nfse) {
      const vis = decimalTexto(item.valorImpostoSeletivo);
      if (!vis) p.push({ caminho: `${c}.valorImpostoSeletivo`, mensagem: "Obrigatório nos documentos com CRT (o motor pede 0.00 quando não há IS)" });
      else if (!DECIMAL_13V2.test(vis)) p.push({ caminho: `${c}.valorImpostoSeletivo`, mensagem: "Valor no formato 13v2 (até 2 casas)" });
    }
  });
  return p;
}
