import { describe, expect, it } from "vitest";
import {
  etapaDoProblema,
  lerDecimal,
  montarPayload,
  novaOperacao,
  novoItem,
  validarOperacaoGuiada,
  validarPayload,
  type OperacaoGuiada,
} from "@/lib/simulation/guiado";

function preenchida(): OperacaoGuiada {
  const op = novaOperacao(new Date("2026-06-01T12:00:00Z"));
  op.uf = "RS";
  op.municipio = "4314902";
  op.itens[0] = { ...op.itens[0], codigo: "22030000", cst: "000", cClassTrib: "000001", baseCalculo: "100,00" };
  return op;
}

describe("lerDecimal", () => {
  it.each([
    ["", undefined],
    ["100", 100],
    ["100,5", 100.5],
    ["1.234,56", 1234.56],
    ["1234.56", 1234.56],
    ["abc", Number.NaN],
    ["1,2,3", Number.NaN],
  ])("%s -> %s", (texto, esperado) => {
    expect(lerDecimal(texto)).toBe(esperado);
  });
});

describe("montarPayload", () => {
  it("builds the engine payload with only the fields the user filled", () => {
    expect(montarPayload(preenchida())).toEqual({
      id: "simulacao",
      versao: "1.0.0",
      dhFatoGerador: "2026-06-01T10:00:00-03:00",
      municipio: 4314902,
      uf: "RS",
      itens: [{ numero: 1, ncm: "22030000", cst: "000", cClassTrib: "000001", baseCalculo: 100 }],
    });
  });

  it("never adds tax rates the user did not type", () => {
    const op = preenchida();
    op.itens[0].usarAliquotas = true;
    op.itens[0].aliquotas.cbs = "8,8";
    const item = (montarPayload(op).itens as Record<string, unknown>[])[0];
    expect(item.aliquotasNominais).toEqual({ cbs: 8.8 });
  });

  it("uses NBS when the item is a service", () => {
    const op = preenchida();
    op.itens[0] = { ...op.itens[0], identificacao: "nbs", codigo: "122011200" };
    const item = (montarPayload(op).itens as Record<string, unknown>[])[0];
    expect(item).toMatchObject({ nbs: "122011200" });
    expect(item).not.toHaveProperty("ncm");
  });

  it("includes optional groups only when turned on, as in the engine contract", () => {
    const op = preenchida();
    op.usarCompraGov = true;
    op.compraGov = { tpEnteGov: "1", tpOperGov: "" };
    op.itens[0].usarImpostoSeletivo = true;
    op.itens[0].impostoSeletivo = { cst: "000", cClassTrib: "000001", baseCalculo: "150", quantidade: "12", unidade: "LT", impostoInformado: "" };
    op.itens[0].usarComponentesBC = true;
    op.itens[0].componentesBC = { vProd: "1000", vDesc: "50" };
    op.itens[0].usarAliquotas = true;
    op.itens[0].aliquotas.isAdValorem = "10";
    const p = montarPayload(op);
    expect(p.gCompraGov).toEqual({ tpEnteGov: 1 });
    expect((p.itens as Record<string, unknown>[])[0]).toMatchObject({
      impostoSeletivo: { cst: "000", cClassTrib: "000001", baseCalculo: 150, quantidade: 12, unidade: "LT" },
      gComponentesBC: { vProd: 1000, vDesc: 50 },
      aliquotasNominais: { impostoSeletivo: { adValorem: 10 } },
    });
  });

  it("numbers items in order", () => {
    const op = preenchida();
    op.itens.push({ ...novoItem(2), cst: "000", cClassTrib: "000001" });
    expect((montarPayload(op).itens as { numero: number }[]).map((i) => i.numero)).toEqual([1, 2]);
  });
});

describe("validarOperacaoGuiada", () => {
  it("does not pick a date on its own and requires one", () => {
    const op = novaOperacao();
    expect(op.data).toBe("");
    expect(montarPayload(op)).not.toHaveProperty("dhFatoGerador");
    expect(validarOperacaoGuiada(op)[0]).toEqual({ caminho: "dhFatoGerador", mensagem: "Informe a data do fato gerador" });
    expect(validarOperacaoGuiada(preenchida())).toEqual([]);
  });
});

describe("validarPayload", () => {
  it("accepts a well-formed guided operation", () => {
    expect(validarPayload(montarPayload(preenchida()))).toEqual([]);
  });

  it("points to the field path and translates bad numbers", () => {
    const op = preenchida();
    op.municipio = "";
    op.itens[0].cst = "";
    op.itens[0].baseCalculo = "dez";
    const problemas = validarPayload(montarPayload(op));
    expect(problemas).toEqual(
      expect.arrayContaining([
        { caminho: "municipio", mensagem: "Obrigatório" },
        expect.objectContaining({ caminho: "itens.0.cst" }),
        { caminho: "itens.0.baseCalculo", mensagem: "Número inválido" },
      ]),
    );
    expect(etapaDoProblema("municipio")).toBe(2);
    expect(etapaDoProblema("itens.0.cst")).toBe(3);
  });
});
