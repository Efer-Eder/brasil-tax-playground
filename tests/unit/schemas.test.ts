import { describe, expect, it } from "vitest";
import { operacaoSchema, versaoSchema } from "@/lib/tax-engine/schemas/regime-regular";

/**
 * Estrutura de uma operação válida. Os números são FICTÍCIOS e servem apenas
 * para exercitar a validação estrutural — não representam alíquotas reais.
 */
function operacaoFicticia() {
  return {
    id: "teste-estrutural-1",
    versao: "1.0.0",
    dhFatoGerador: "2027-03-10T10:00:00-03:00",
    municipio: 1234567,
    uf: "XX",
    itens: [
      {
        numero: 1,
        ncm: "00000000",
        cst: "000",
        cClassTrib: "000000",
        baseCalculo: 100,
        aliquotasNominais: { cbs: 1, ibsEstadual: 1, ibsMunicipal: 1 },
      },
    ],
  };
}

describe("operacaoSchema (structural mirror of upstream OperacaoInput)", () => {
  it("accepts a structurally valid operation", () => {
    expect(operacaoSchema.safeParse(operacaoFicticia()).success).toBe(true);
  });

  it("keeps fields it does not model (passthrough to the engine)", () => {
    const input = { ...operacaoFicticia(), campoFuturo: 1, gCompraGov: { tpEnteGov: 1, extra: true } };
    const parsed = operacaoSchema.parse(input);
    expect(parsed).toHaveProperty("campoFuturo", 1);
    expect(parsed.gCompraGov).toHaveProperty("extra", true);
  });

  it("accepts null in optional fields and the deprecated dataHoraEmissao, like the engine", () => {
    const base = operacaoFicticia();
    const { dhFatoGerador: _omitida, ...semData } = base;
    void _omitida;
    const input = {
      ...semData,
      dataHoraEmissao: "2026-01-01T09:50:05-03:00",
      itens: [{ ...base.itens[0], nbs: null, unidade: null }],
    };
    expect(operacaoSchema.safeParse(input).success).toBe(true);
  });

  it("requires at least one item", () => {
    const result = operacaoSchema.safeParse({ ...operacaoFicticia(), itens: [] });
    expect(result.success).toBe(false);
  });

  it("requires dhFatoGerador with an offset", () => {
    const result = operacaoSchema.safeParse({ ...operacaoFicticia(), dhFatoGerador: "2027-03-10T10:00:00" });
    expect(result.success).toBe(false);
  });

  it.each([
    ["cst with letters", { cst: "0A0" }],
    ["cst with wrong length", { cst: "0000" }],
    ["cClassTrib with 5 digits", { cClassTrib: "00000" }],
    ["negative baseCalculo", { baseCalculo: -1 }],
    ["baseCalculo with 3 decimals", { baseCalculo: 1.234 }],
    ["percentage above 100", { aliquotasNominais: { cbs: 100.5 } }],
    ["percentage with 5 decimals", { aliquotasNominais: { cbs: 1.23456 } }],
    ["item numero 0", { numero: 0 }],
  ])("rejects %s", (_label, override) => {
    const base = operacaoFicticia();
    const result = operacaoSchema.safeParse({ ...base, itens: [{ ...base.itens[0], ...override }] });
    expect(result.success).toBe(false);
  });

  it("rejects a municipio code above 7 digits", () => {
    expect(operacaoSchema.safeParse({ ...operacaoFicticia(), municipio: 12_345_678 }).success).toBe(false);
  });

  it("rejects a UF that is not 2 characters", () => {
    expect(operacaoSchema.safeParse({ ...operacaoFicticia(), uf: "XYZ" }).success).toBe(false);
  });

  it("validates the nested impostoSeletivo group", () => {
    const base = operacaoFicticia();
    const item = { ...base.itens[0], impostoSeletivo: { cst: "000", cClassTrib: "000000" } };
    expect(operacaoSchema.safeParse({ ...base, itens: [item] }).success).toBe(false);
  });
});

describe("versaoSchema", () => {
  it("accepts the documented VersaoOutput fields and unknown extras", () => {
    const parsed = versaoSchema.parse({ versaoApp: "x", versaoDb: "y", novoCampo: 1 });
    expect(parsed.versaoApp).toBe("x");
  });

  it("rejects non-object bodies", () => {
    expect(versaoSchema.safeParse("ok").success).toBe(false);
  });
});
