import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ObservabilidadeResposta, OperacaoInput } from "@/lib/tax-engine/schemas/regime-regular";
import type { EngineVersion } from "@/lib/tax-engine/types";

/**
 * Fixture GRAVADA a partir do motor oficial real (nunca escrita à mão).
 * Gerada por `npm run fixtures:gravar` — ver tests/contract/gravar-fixtures.test.ts.
 */
export interface FixtureRegimeRegular {
  exemploId: string;
  gravadoEm: string;
  motor: {
    upstream: string;
    endpoint: string;
    versao: EngineVersion;
  };
  requisicao: OperacaoInput;
  status: number;
  warningDadosSimulados: string | null;
  resposta: ObservabilidadeResposta;
}

export const FIXTURES_DIR = fileURLToPath(new URL("./", import.meta.url));

export function carregarFixtures(): FixtureRegimeRegular[] {
  return readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(new URL(`./${f}`, import.meta.url), "utf8")) as FixtureRegimeRegular);
}
