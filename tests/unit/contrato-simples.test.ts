import { describe, expect, it } from "vitest";
import { campo, camposDe, MOTOR_SIMPLES_DO_CONTRATO, rotuloSaida } from "@/lib/tax-engine/contrato";

describe("contrato do Simples Nacional (retrato do OpenAPI 1.0.2)", () => {
  it("records the engine version it came from", () => {
    expect(MOTOR_SIMPLES_DO_CONTRATO.versaoApp).toBe("1.0.2");
  });

  it("reads options written as 'N (label)'", () => {
    expect(campo("OperacaoSimplesNaoAssistidaInput", "CRT").opcoes).toEqual([
      { valor: 1, rotulo: "Simples" },
      { valor: 2, rotulo: "excesso de sublimite" },
      { valor: 3, rotulo: "regime normal" },
      { valor: 4, rotulo: "MEI" },
    ]);
    expect(campo("OperacaoSimplesNaoAssistidaInput", "opSimpNac").opcoes.map((o) => o.valor)).toEqual([1, 2, 3, 4]);
    // "... proibido com 1 ou 2 (VSN-031)" não pode virar uma segunda opção 2.
    expect(campo("OperacaoSimplesNaoAssistidaInput", "regApIBSCBSSN").opcoes).toEqual([
      { valor: 1, rotulo: "IBS e CBS pelo Simples" },
      { valor: 2, rotulo: "CBS pelo Simples e IBS pelo regime regular" },
      { valor: 3, rotulo: "os dois pelo regime regular" },
    ]);
    expect(campo("OperacaoSimplesNaoAssistidaInput", "regApTribSN").opcoes.map((o) => o.valor)).toEqual([1, 2, 3]);
    expect(campo("OperacaoSimplesNaoAssistidaInput", "tpEnteGov").opcoes.map((o) => o.rotulo)).toEqual([
      "União",
      "Estado",
      "Distrito Federal",
      "Município",
    ]);
  });

  it("reads options written as '— 1 label; 2 label'", () => {
    expect(campo("ItemSimplesUnificadoInput", "tribISSQN").opcoes).toEqual([
      { valor: 1, rotulo: "operação tributável" },
      { valor: 2, rotulo: "imunidade" },
      { valor: 3, rotulo: "exportação de serviço" },
      { valor: 4, rotulo: "não incidência" },
    ]);
    expect(campo("ItemSimplesUnificadoInput", "tpRetISSQN").opcoes.map((o) => o.valor)).toEqual([1, 2, 3]);
    expect(campo("ItemSimplesUnificadoInput", "tpBM").opcoes.map((o) => o.valor)).toEqual([1, 2, 3, 4]);
  });

  it("lists the aliquota groups in contract order", () => {
    expect(camposDe("AliquotasEfetivasInput")).toEqual([
      "fatorR",
      "impedimentoSublimite",
      "anexoI",
      "anexoII",
      "anexoIII",
      "anexoIV",
      "anexoV",
    ]);
  });

  it("labels output fields from the Simples snapshot", () => {
    expect(rotuloSaida("vCBSSN", "simples-nacional")).toBeTruthy();
    expect(rotuloSaida("vCBSSN")).toBeNull();
  });
});
