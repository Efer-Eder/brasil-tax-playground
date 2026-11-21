import { describe, expect, it } from "vitest";
import { linhasDaResposta, respostaParaCsv } from "@/lib/simulation/csv";
import {
  CHAVE_HISTORICO,
  LIMITE_HISTORICO,
  adicionarAoHistorico,
  lerHistorico,
  limparHistorico,
  removerDoHistorico,
  tituloDaRequisicao,
  type RegistroHistorico,
} from "@/lib/simulation/historico";
import { carregarFixtures } from "../fixtures/regime-regular";

function memoria() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}

const registro = (id: string): RegistroHistorico => ({
  id,
  criadoEm: "2026-11-21T00:00:00Z",
  titulo: id,
  modo: "guiado",
  requisicao: '{"id":"x","itens":[{}]}',
  resposta: { objetos: [] },
  motor: { versaoApp: "1.7.2" },
  warningDadosSimulados: null,
});

describe("histórico local", () => {
  it("adds newest first, deduplicates and caps the list", () => {
    const s = memoria();
    for (let i = 0; i < LIMITE_HISTORICO + 5; i++) adicionarAoHistorico(registro(`r${i}`), s);
    adicionarAoHistorico(registro("r24"), s);
    const lista = lerHistorico(s);
    expect(lista).toHaveLength(LIMITE_HISTORICO);
    expect(lista[0].id).toBe("r24");
    expect(lista.filter((r) => r.id === "r24")).toHaveLength(1);
  });

  it("removes and clears", () => {
    const s = memoria();
    adicionarAoHistorico(registro("a"), s);
    adicionarAoHistorico(registro("b"), s);
    expect(removerDoHistorico("a", s).map((r) => r.id)).toEqual(["b"]);
    limparHistorico(s);
    expect(lerHistorico(s)).toEqual([]);
  });

  it("survives corrupted or unavailable storage", () => {
    const s = memoria();
    s.m.set(CHAVE_HISTORICO, "{not json");
    expect(lerHistorico(s)).toEqual([]);
    expect(lerHistorico(null)).toEqual([]);
    expect(adicionarAoHistorico(registro("x"), null)).toHaveLength(1);
    const cheio = { ...memoria(), setItem: () => { throw new Error("QuotaExceededError"); } };
    expect(() => adicionarAoHistorico(registro("y"), cheio)).not.toThrow();
  });

  it("builds a short title from the request", () => {
    expect(tituloDaRequisicao('{"id":"op1","dhFatoGerador":"2026-06-01T10:00:00-03:00","itens":[{},{}]}')).toBe(
      "op1 · 2026-06-01 · 2 itens",
    );
    expect(tituloDaRequisicao("nope")).toBe("operação");
  });
});

describe("CSV da resposta do motor", () => {
  const [fixture] = carregarFixtures().filter((f) => f.exemploId === "erro-por-item-2026");

  it("has one row per value returned by the engine, values untouched", () => {
    const linhas = linhasDaResposta(fixture.resposta);
    expect(linhas).toContainEqual({
      item: "1",
      estadoItem: "CALCULADO",
      caminho: "tribCalc.IBSCBS.gIBSCBS.gCBS.vCBS",
      valor: "0.90",
    });
    expect(linhas.some((l) => l.item === "2" && l.estadoItem === "INCONSISTENCIA_ENTRADA" && l.valor === "REG-005")).toBe(true);
    expect(linhas.some((l) => l.item === "total")).toBe(true);
  });

  it("quotes cells, uses ';' and neutralizes spreadsheet formulas", () => {
    const csv = respostaParaCsv({ objetos: [{ nObj: 1, estadoItem: "X", campo: '=HYPERLINK("x")', texto: 'a"b' }] });
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain(`"1";"X";"campo";"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(`"texto";"a""b"`);
  });
});
