import { describe, expect, it } from "vitest";
import { extrairMemoriaCalculo } from "@/lib/simulation/memoria";

describe("extrairMemoriaCalculo", () => {
  it("collects memoriaCalculo texts verbatim with their group", () => {
    const objeto = {
      nObj: 1,
      tribCalc: {
        IS: { memoriaCalculo: "texto IS" },
        IBSCBS: { gIBSCBS: { vBC: "1" }, memoriaCalculo: { cbs: "texto cbs", ibsUF: "texto uf", n: 1 } },
      },
    };
    expect(extrairMemoriaCalculo(objeto)).toEqual([
      { grupo: "IS", tributo: "", texto: "texto IS" },
      { grupo: "IBSCBS", tributo: "cbs", texto: "texto cbs" },
      { grupo: "IBSCBS", tributo: "ibsUF", texto: "texto uf" },
    ]);
  });

  it("returns an empty list when there is nothing to show", () => {
    expect(extrairMemoriaCalculo({ nObj: 2, estadoItem: "INCONSISTENCIA_ENTRADA", erros: [] })).toEqual([]);
    expect(extrairMemoriaCalculo(null)).toEqual([]);
  });
});
