import { describe, expect, it } from "vitest";
import { simularRegimeRegular } from "@/lib/simulation/regime-regular";
import { carregarFixtures } from "../fixtures/regime-regular";

/**
 * Regressão contra o motor real: reenvia a requisição de cada fixture e exige
 * a mesma resposta. Se o upstream mudar os outputs (nova versão, nova base),
 * este teste falha e as fixtures precisam ser revisadas e regravadas.
 */
const url = process.env.CONTRACT_ENGINE_URL;
const regravando = process.env.RECORD_FIXTURES === "1";

describe.skipIf(!url || regravando)("regressão: motor real × fixtures gravadas", () => {
  for (const fixture of carregarFixtures()) {
    it(`${fixture.exemploId} (gravada com ${fixture.motor.versao.versaoApp}/${fixture.motor.versao.versaoDb})`, async () => {
      const resultado = await simularRegimeRegular(JSON.stringify(fixture.requisicao), {
        env: { REGIME_REGULAR_ENGINE_URL: url },
      });
      if (!resultado.ok) throw new Error(JSON.stringify(resultado.erro));
      expect(resultado.motor.versao).toEqual(fixture.motor.versao);
      expect(resultado.warningDadosSimulados).toBe(fixture.warningDadosSimulados);
      expect(resultado.resposta).toEqual(fixture.resposta);
    });
  }
});
