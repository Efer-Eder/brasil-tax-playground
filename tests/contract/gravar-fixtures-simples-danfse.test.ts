import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { XML_NFSE_EXEMPLO } from "@/lib/danfse/exemplo";
import { EXEMPLOS_SIMPLES } from "@/lib/simulation/exemplos-simples";
import { simularSimplesNacional } from "@/lib/simulation/regime-regular";

/**
 * Grava respostas REAIS do motor do Simples Nacional e do gerador de DANFSe
 * para o replay do E2E. Só roda com RECORD_FIXTURES=1 e as URLs definidas:
 *
 *   $env:RECORD_FIXTURES="1"
 *   $env:CONTRACT_ENGINE_URL="http://localhost:8080/api"            # cClassTrib (regime regular)
 *   $env:CONTRACT_SIMPLES_URL="http://localhost:8082/api"
 *   $env:CONTRACT_DANFSE_URL="http://localhost:8083"
 *   npx vitest run tests/contract/gravar-fixtures-simples-danfse.test.ts
 */
const regime = process.env.CONTRACT_ENGINE_URL;
const simples = process.env.CONTRACT_SIMPLES_URL;
const danfse = process.env.CONTRACT_DANFSE_URL;
const gravar = process.env.RECORD_FIXTURES === "1";

const RAIZ = fileURLToPath(new URL("../fixtures/", import.meta.url));
const UPSTREAM_SN = "ReceitaFederal/calculadora-rtc-simples-nacional@1.0.2 (f90b652)";
const UPSTREAM_DANFSE = "ReceitaFederal/calculadora-rtc-gerador-danfse@1.0.0 (8d79e6b)";

function salvar(pasta: string, nome: string, conteudo: string | Uint8Array) {
  const dir = join(RAIZ, pasta);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, nome), conteudo);
}

describe.skipIf(!gravar || !simples || !regime)("gravar fixtures do Simples Nacional", () => {
  for (const exemplo of EXEMPLOS_SIMPLES) {
    it(exemplo.id, async () => {
      const r = await simularSimplesNacional(JSON.stringify(exemplo.operacao), { env: { SIMPLES_NACIONAL_ENGINE_URL: simples } });
      if (!r.ok) throw new Error(`motor recusou ${exemplo.id}: ${JSON.stringify(r.erro)}`);
      const fixture = {
        exemploId: exemplo.id,
        gravadoEm: r.executadoEm,
        motor: { upstream: UPSTREAM_SN, endpoint: "POST /calculadora/observabilidade/simples-nacional/nao-assistido", versao: r.motor.versao },
        requisicao: r.requisicao,
        status: r.httpStatus,
        warningDadosSimulados: r.warningDadosSimulados,
        resposta: r.resposta,
      };
      salvar("simples-nacional", `${exemplo.id}.json`, JSON.stringify(fixture, null, 2) + "\n");
    });
  }

  // Dados abertos do formulário guiado do Simples (E2E): motor dono + caminho exato.
  const consultas: [string, "regime-regular" | "simples-nacional", string][] = [
    ["situacoes-cbs-ibs__data=2027-03-15", "regime-regular", "/calculadora/dados-abertos/situacoes-tributarias/cbs-ibs?data=2027-03-15"],
    ["sn-atividades__data=2027-03-15_tpDoc=91", "simples-nacional", "/calculadora/simples-nacional/atividades?data=2027-03-15&tpDoc=91"],
    [
      "sn-atividades__data=2027-03-15_tpDoc=91_cClassTrib=000001",
      "simples-nacional",
      "/calculadora/simples-nacional/atividades?data=2027-03-15&tpDoc=91&cClassTrib=000001",
    ],
  ];
  for (const [nome, motor, caminho] of consultas) {
    it(`dados abertos: ${nome}`, async () => {
      const base = motor === "simples-nacional" ? simples : regime;
      const res = await fetch(`${base}${caminho}`);
      expect(res.status).toBe(200);
      salvar("dados-abertos", `${nome}.json`, JSON.stringify({ motor, caminho, corpo: await res.json() }) + "\n");
    });
  }
});

describe.skipIf(!gravar || !danfse)("gravar fixtures do gerador de DANFSe", () => {
  it("PDF do XML fictício de exemplo", async () => {
    const res = await fetch(`${danfse}/api/danfse`, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: XML_NFSE_EXEMPLO,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    const pdf = new Uint8Array(await res.arrayBuffer());
    salvar("danfse", "exemplo.pdf", pdf);
    salvar(
      "danfse",
      "exemplo.json",
      JSON.stringify({ upstream: UPSTREAM_DANFSE, gravadoEm: new Date().toISOString(), consulta: "", xml: XML_NFSE_EXEMPLO, bytes: pdf.byteLength }, null, 2) + "\n",
    );
  });

  it("recusa de XML sem Id", async () => {
    const xml = '<?xml version="1.0" encoding="UTF-8"?><NFSe><Id></Id></NFSe>';
    const res = await fetch(`${danfse}/api/danfse`, { method: "POST", headers: { "Content-Type": "application/xml" }, body: xml });
    expect(res.status).toBe(400);
    salvar(
      "danfse",
      "erro-sem-id.json",
      JSON.stringify({ upstream: UPSTREAM_DANFSE, xml, status: res.status, corpo: await res.json() }, null, 2) + "\n",
    );
  });
});
