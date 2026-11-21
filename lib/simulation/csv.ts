/**
 * Exporta a resposta do motor em CSV, uma linha por valor devolvido. Não há
 * conta nenhuma aqui: cada linha é um campo da resposta, com o caminho e o
 * valor exatamente como o motor mandou.
 */

export interface LinhaResultado {
  item: string;
  estadoItem: string;
  caminho: string;
  valor: string;
}

function folhas(valor: unknown, caminho: string, saida: { caminho: string; valor: string }[]) {
  if (valor === null || valor === undefined) return;
  if (Array.isArray(valor)) {
    valor.forEach((v, i) => folhas(v, `${caminho}[${i}]`, saida));
    return;
  }
  if (typeof valor === "object") {
    for (const [k, v] of Object.entries(valor)) folhas(v, caminho ? `${caminho}.${k}` : k, saida);
    return;
  }
  saida.push({ caminho, valor: String(valor) });
}

/** Linhas a partir da resposta da observabilidade (objetos e total). */
export function linhasDaResposta(resposta: unknown): LinhaResultado[] {
  const r = (resposta ?? {}) as { objetos?: Record<string, unknown>[]; total?: unknown; oper?: unknown };
  const linhas: LinhaResultado[] = [];
  for (const obj of r.objetos ?? []) {
    const f: { caminho: string; valor: string }[] = [];
    const { nObj, estadoItem, ...resto } = obj;
    folhas(resto, "", f);
    for (const x of f) linhas.push({ item: String(nObj ?? ""), estadoItem: String(estadoItem ?? ""), ...x });
  }
  for (const [grupo, valor] of [
    ["oper", r.oper],
    ["total", r.total],
  ] as const) {
    const f: { caminho: string; valor: string }[] = [];
    folhas(valor, grupo, f);
    for (const x of f) linhas.push({ item: grupo, estadoItem: "", ...x });
  }
  return linhas;
}

function celula(texto: string): string {
  // Aspas sempre; neutraliza fórmulas de planilha (CSV injection).
  const seguro = /^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto;
  return `"${seguro.replace(/"/g, '""')}"`;
}

/** CSV com separador ";" (padrão de planilhas em pt-BR) e BOM para acentos. */
export function respostaParaCsv(resposta: unknown): string {
  const linhas = linhasDaResposta(resposta);
  const cabecalho = ["item", "estadoItem", "campo", "valor"].map(celula).join(";");
  const corpo = linhas.map((l) => [l.item, l.estadoItem, l.caminho, l.valor].map(celula).join(";"));
  return "﻿" + [cabecalho, ...corpo].join("\r\n") + "\r\n";
}
