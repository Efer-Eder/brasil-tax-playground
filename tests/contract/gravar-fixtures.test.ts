import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { simularRegimeRegular } from "@/lib/simulation/regime-regular";
import { EXEMPLOS } from "@/lib/simulation/exemplos";
import { FIXTURES_DIR, type FixtureRegimeRegular } from "../fixtures/regime-regular";

/**
 * Grava as respostas REAIS do motor para os exemplos que chegam até ele.
 * Só roda com RECORD_FIXTURES=1 e CONTRACT_ENGINE_URL definidos:
 *
 *   $env:CONTRACT_ENGINE_URL="http://localhost:8080/api"; $env:RECORD_FIXTURES="1"; npm run fixtures:gravar
 */
const url = process.env.CONTRACT_ENGINE_URL;
const gravar = process.env.RECORD_FIXTURES === "1" && !!url;

/** Referência do upstream usada para gerar as fixtures (atualize ao trocar de versão). */
const UPSTREAM = "ReceitaFederal/calculadora-rtc-regime-regular@1.7.2 (32df719)";

describe.skipIf(!gravar)("gravar fixtures do motor oficial", () => {
  for (const exemplo of EXEMPLOS.filter((e) => e.id !== "invalido-estrutural")) {
    it(exemplo.id, async () => {
      const resultado = await simularRegimeRegular(JSON.stringify(exemplo.operacao), {
        env: { REGIME_REGULAR_ENGINE_URL: url },
      });
      if (!resultado.ok) throw new Error(`motor recusou ${exemplo.id}: ${JSON.stringify(resultado.erro)}`);
      expect(resultado.motor.versao).not.toBeNull();

      const fixture: FixtureRegimeRegular = {
        exemploId: exemplo.id,
        gravadoEm: resultado.executadoEm,
        motor: {
          upstream: UPSTREAM,
          endpoint: "POST /calculadora/observabilidade/regime-geral",
          versao: resultado.motor.versao!,
        },
        requisicao: resultado.requisicao,
        status: resultado.httpStatus,
        warningDadosSimulados: resultado.warningDadosSimulados,
        resposta: resultado.resposta,
      };
      writeFileSync(join(FIXTURES_DIR, `${exemplo.id}.json`), JSON.stringify(fixture, null, 2) + "\n");
    });
  }
});
