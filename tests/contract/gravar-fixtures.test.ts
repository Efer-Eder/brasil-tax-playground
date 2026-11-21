import { mkdirSync, writeFileSync } from "node:fs";
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
  for (const exemplo of EXEMPLOS) {
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

  // Dados abertos usados pelo formulário guiado no E2E (servidos pelo replay).
  const dadosAbertos: [string, string][] = [
    ["ufs", "/calculadora/dados-abertos/ufs"],
    ["municipios__uf=RS", "/calculadora/dados-abertos/ufs/municipios?siglaUf=RS"],
    ["situacoes-cbs-ibs__data=2026-06-01", "/calculadora/dados-abertos/situacoes-tributarias/cbs-ibs?data=2026-06-01"],
    ["situacoes-is__data=2026-06-01", "/calculadora/dados-abertos/situacoes-tributarias/is?data=2026-06-01"],
    ["ncm__ncm=22030000_data=2026-06-01", "/calculadora/dados-abertos/ncm?ncm=22030000&data=2026-06-01"],
  ];
  for (const [nome, caminho] of dadosAbertos) {
    it(`dados abertos: ${nome}`, async () => {
      const res = await fetch(`${url}${caminho}`);
      expect(res.status).toBe(200);
      const dir = join(FIXTURES_DIR, "..", "dados-abertos");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, `${nome}.json`), JSON.stringify({ caminho, corpo: await res.json() }) + "\n");
    });
  }
});
