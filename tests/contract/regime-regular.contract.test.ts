import { describe, expect, it } from "vitest";
import { createRegimeRegularHttpClient } from "@/lib/tax-engine/adapters/regime-regular";
import { readRegimeRegularConfig } from "@/lib/tax-engine/config";
import { ESTADOS_ITEM, type OperacaoInput } from "@/lib/tax-engine/schemas/regime-regular";

/**
 * Testes de contrato contra um motor oficial REAL (opt-in).
 *
 * Só rodam quando CONTRACT_ENGINE_URL aponta para uma instância do
 * calculadora-rtc-regime-regular, ex.:
 *   $env:CONTRACT_ENGINE_URL="http://localhost:8080/api"; npm run test:contract
 *
 * Verificam apenas a FORMA das respostas — nenhum valor tributário é
 * afirmado aqui, porque a fonte desses valores é o próprio motor.
 */
const config = readRegimeRegularConfig({ REGIME_REGULAR_ENGINE_URL: process.env.CONTRACT_ENGINE_URL });

describe.skipIf(!config.ok)("contrato: motor oficial de regime regular", () => {
  const client = config.ok ? createRegimeRegularHttpClient(config.config) : undefined;

  it("GET /calculadora/dados-abertos/versao devolve VersaoOutput", async () => {
    const versao = await client!.getVersao();
    expect(typeof versao.versaoApp).toBe("string");
    expect(typeof versao.versaoDb).toBe("string");
  });

  it("POST /calculadora/observabilidade/regime-geral devolve um objeto por item com estado conhecido", async () => {
    // Operação fictícia de 2026 (antes de 2027 o upstream proíbe aliquotasNominais).
    const operacao: OperacaoInput = {
      id: "contrato-observabilidade",
      versao: "1.0.0",
      dhFatoGerador: "2026-06-01T10:00:00-03:00",
      municipio: 4314902,
      uf: "RS",
      itens: [
        { numero: 1, ncm: "22030000", cst: "000", cClassTrib: "000001", baseCalculo: 100 },
        // cClassTrib inexistente: deve virar erro do item, não da operação inteira.
        { numero: 2, ncm: "22030000", cst: "000", cClassTrib: "999999", baseCalculo: 100 },
      ],
    };

    const result = await client!.calcularComObservabilidade(operacao);

    expect(result.status).toBe(200);
    expect(result.data.objetos).toHaveLength(2);
    for (const objeto of result.data.objetos) {
      expect(ESTADOS_ITEM).toContain(objeto.estadoItem);
    }
    expect(result.data.objetos[1].estadoItem).not.toBe("CALCULADO");
  });
});
