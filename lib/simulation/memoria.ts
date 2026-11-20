export interface TrechoMemoria {
  /** Caminho do grupo no JSON do motor, ex.: "IBSCBS". */
  grupo: string;
  /** Chave dentro de memoriaCalculo, ex.: "cbs", "ibsUF". */
  tributo: string;
  texto: string;
}

/**
 * Extrai, sem reescrever, os textos de `memoriaCalculo` que o motor devolve
 * dentro de `tribCalc` de um item. A ordem segue a do JSON.
 */
export function extrairMemoriaCalculo(objeto: unknown): TrechoMemoria[] {
  const trechos: TrechoMemoria[] = [];

  function visitar(valor: unknown, caminho: string[]) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) return;
    for (const [chave, filho] of Object.entries(valor)) {
      if (chave === "memoriaCalculo") {
        const grupo = caminho.filter((p) => p !== "tribCalc").join(".") || "(item)";
        if (typeof filho === "string") {
          trechos.push({ grupo, tributo: "", texto: filho });
        } else if (filho && typeof filho === "object") {
          for (const [tributo, texto] of Object.entries(filho)) {
            if (typeof texto === "string") trechos.push({ grupo, tributo, texto });
          }
        }
      } else {
        visitar(filho, [...caminho, chave]);
      }
    }
  }

  visitar(objeto, []);
  return trechos;
}
