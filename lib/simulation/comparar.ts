/**
 * Comparação de duas simulações guardadas no histórico. Só emparelha os
 * campos que os motores devolveram (ou que foram enviados) e diz se o valor é
 * igual, diferente ou existe só de um lado. Não faz conta nenhuma: nada de
 * subtração, percentual ou interpretação fiscal; os valores aparecem
 * exatamente como o motor mandou.
 */

export type Situacao = "igual" | "diferente" | "so-a" | "so-b";

export interface LinhaComparacao {
  /** Caminho do campo no JSON, ex.: objetos[0].tribCalc.IBSCBS.gIBSCBS.vBC */
  caminho: string;
  a: string | null;
  b: string | null;
  situacao: Situacao;
}

export interface Comparacao {
  linhas: LinhaComparacao[];
  resumo: Record<Situacao, number>;
}

/** Folhas de um JSON como caminho → valor em texto (como o motor mandou). */
export function folhasDoJson(valor: unknown, caminho = "", saida = new Map<string, string>()): Map<string, string> {
  if (valor === null || valor === undefined) {
    if (caminho) saida.set(caminho, String(valor));
    return saida;
  }
  if (Array.isArray(valor)) {
    if (!valor.length && caminho) saida.set(caminho, "[]");
    valor.forEach((v, i) => folhasDoJson(v, `${caminho}[${i}]`, saida));
    return saida;
  }
  if (typeof valor === "object") {
    const entradas = Object.entries(valor);
    if (!entradas.length && caminho) saida.set(caminho, "{}");
    for (const [k, v] of entradas) folhasDoJson(v, caminho ? `${caminho}.${k}` : k, saida);
    return saida;
  }
  saida.set(caminho, String(valor));
  return saida;
}

/** Emparelha os campos de A e B, na ordem em que aparecem (A primeiro). */
export function comparar(a: unknown, b: unknown): Comparacao {
  const fa = folhasDoJson(a);
  const fb = folhasDoJson(b);
  const caminhos = [...fa.keys(), ...[...fb.keys()].filter((k) => !fa.has(k))];
  const resumo: Record<Situacao, number> = { igual: 0, diferente: 0, "so-a": 0, "so-b": 0 };
  const linhas = caminhos.map((caminho): LinhaComparacao => {
    const va = fa.get(caminho) ?? null;
    const vb = fb.get(caminho) ?? null;
    const situacao: Situacao = va === null ? "so-b" : vb === null ? "so-a" : va === vb ? "igual" : "diferente";
    resumo[situacao]++;
    return { caminho, a: va, b: vb, situacao };
  });
  return { linhas, resumo };
}
