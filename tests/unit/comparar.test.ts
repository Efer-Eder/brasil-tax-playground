import { describe, expect, it } from "vitest";
import { comparar, folhasDoJson } from "@/lib/simulation/comparar";

describe("comparar", () => {
  it("flattens a response into field paths with the values as sent", () => {
    const f = folhasDoJson({ objetos: [{ nObj: 1, tribCalc: { vBC: "100.00", lista: [] } }], total: null });
    expect([...f]).toEqual([
      ["objetos[0].nObj", "1"],
      ["objetos[0].tribCalc.vBC", "100.00"],
      ["objetos[0].tribCalc.lista", "[]"],
      ["total", "null"],
    ]);
  });

  it("pairs fields and marks equal, different and one-sided ones, without doing math", () => {
    const a = { oper: { tpDoc: "55" }, objetos: [{ nObj: 1, estadoItem: "CALCULADO", tribCalc: { vBC: "100.00" } }] };
    const b = {
      oper: { tpDoc: "55" },
      objetos: [
        { nObj: 1, estadoItem: "CALCULADO", tribCalc: { vBC: "1200.00" } },
        { nObj: 2, estadoItem: "INCONSISTENCIA_ENTRADA" },
      ],
    };
    const r = comparar(a, b);
    expect(r.resumo).toEqual({ igual: 3, diferente: 1, "so-a": 0, "so-b": 2 });
    expect(r.linhas.find((l) => l.caminho === "objetos[0].tribCalc.vBC")).toEqual({
      caminho: "objetos[0].tribCalc.vBC",
      a: "100.00",
      b: "1200.00",
      situacao: "diferente",
    });
    expect(r.linhas.at(-1)).toEqual({ caminho: "objetos[1].estadoItem", a: null, b: "INCONSISTENCIA_ENTRADA", situacao: "so-b" });
    // Nenhum valor que não esteja em A ou B.
    const valores = new Set(r.linhas.flatMap((l) => [l.a, l.b]).filter((v) => v !== null));
    expect([...valores].every((v) => JSON.stringify(a).includes(v!) || JSON.stringify(b).includes(v!))).toBe(true);
  });

  it("treats the same text as equal and different number formats as different", () => {
    expect(comparar({ v: "12.0" }, { v: "12" }).resumo.diferente).toBe(1);
    expect(comparar({ v: 12 }, { v: "12" }).resumo.igual).toBe(1);
  });
});
