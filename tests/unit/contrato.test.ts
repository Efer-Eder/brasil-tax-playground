import { describe, expect, it } from "vitest";
import { campo, camposDe, MOTOR_DO_CONTRATO, textoLimpo } from "@/lib/tax-engine/contrato";
import { COMPONENTES_BC } from "@/lib/tax-engine/schemas/regime-regular";

describe("contrato do motor (retrato do OpenAPI)", () => {
  it("identifies the engine version it was extracted from", () => {
    expect(MOTOR_DO_CONTRATO.versaoApp).toBe("1.7.2");
  });

  it("reads required fields and limits", () => {
    expect(campo("OperacaoInput", "municipio")).toMatchObject({ obrigatorio: true, minimo: 0, maximo: 9999999 });
    expect(campo("ItemOperacaoInput", "cst")).toMatchObject({ obrigatorio: true, tamanhoMinimo: 3, tamanhoMaximo: 3 });
    expect(campo("OperacaoInput", "dhFatoGerador").obrigatorio).toBe(false);
  });

  it("parses the value lists the engine writes in its descriptions", () => {
    const ente = campo("CompraGovernamentalInput", "tpEnteGov");
    expect(ente.opcoes).toContainEqual({ valor: 1, rotulo: "União" });
    expect(ente.opcoes).toHaveLength(6);
    expect(ente.descricao).toBe("Tipo de ente governamental.");
    expect(campo("CompraGovernamentalInput", "tpOperGov").opcoes).toHaveLength(5);
  });

  it("keeps the local schema in sync with the contract's base components", () => {
    expect([...COMPONENTES_BC].sort()).toEqual(camposDe("ComponentesBaseCalculoInput").sort());
  });

  it("fails loudly when a field disappears from the contract", () => {
    expect(() => campo("ItemOperacaoInput", "naoExiste")).toThrow(/não existe no contrato/);
  });

  it("strips HTML from Swagger descriptions", () => {
    expect(textoLimpo("<p>Linha</p> <b>forte</b>")).toBe("Linha forte");
  });
});
