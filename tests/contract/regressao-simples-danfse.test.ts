import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { simularSimplesNacional } from "@/lib/simulation/regime-regular";
import { normalizar } from "./normalizar";

/**
 * Regressão contra os serviços reais do Simples Nacional e do DANFSe: reenvia
 * a requisição de cada fixture gravada e exige a mesma resposta (o PDF tem de
 * ser idêntico byte a byte; o gerador é determinístico). Se o upstream mudar o
 * resultado, o teste falha: revise a mudança e só então regrave as fixtures
 * (tests/contract/gravar-fixtures-simples-danfse.test.ts). Nunca ajuste o
 * teste para passar.
 *
 *   $env:CONTRACT_SIMPLES_URL="http://localhost:8082/api"
 *   $env:CONTRACT_DANFSE_URL="http://localhost:8083"
 *   npm run test:contract
 */
const simples = process.env.CONTRACT_SIMPLES_URL;
const danfse = process.env.CONTRACT_DANFSE_URL;
const regravando = process.env.RECORD_FIXTURES === "1";

const pasta = (nome: string) => fileURLToPath(new URL(`../fixtures/${nome}/`, import.meta.url));
const ler = (dir: string, arquivo: string) => JSON.parse(readFileSync(dir + arquivo, "utf8"));

describe.skipIf(!simples || regravando)("regressão: motor do Simples Nacional × fixtures gravadas", () => {
  const dir = pasta("simples-nacional");
  for (const arquivo of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const fixture = ler(dir, arquivo);
    it(`${fixture.exemploId} (gravada com ${fixture.motor.versao.versaoApp}/${fixture.motor.versao.versaoDb})`, async () => {
      const r = await simularSimplesNacional(JSON.stringify(fixture.requisicao), { env: { SIMPLES_NACIONAL_ENGINE_URL: simples } });
      if (!r.ok) throw new Error(JSON.stringify(r.erro));
      expect(r.motor.versao).toEqual(fixture.motor.versao);
      expect(normalizar(r.resposta)).toEqual(normalizar(fixture.resposta));
    });
  }
});

describe.skipIf(!danfse || regravando)("regressão: gerador de DANFSe × fixtures gravadas", () => {
  const dir = pasta("danfse");

  it("o PDF do XML de exemplo é idêntico ao gravado", async () => {
    const exemplo = ler(dir, "exemplo.json");
    const res = await fetch(`${danfse}/api/danfse`, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: exemplo.xml,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/pdf");
    const pdf = Buffer.from(await res.arrayBuffer());
    const gravado = readFileSync(dir + "exemplo.pdf");
    expect(pdf.byteLength).toBe(exemplo.bytes);
    expect(createHash("sha256").update(pdf).digest("hex")).toBe(createHash("sha256").update(gravado).digest("hex"));
  });

  it("a recusa de XML sem Id é a mesma", async () => {
    const erro = ler(dir, "erro-sem-id.json");
    const res = await fetch(`${danfse}/api/danfse`, { method: "POST", headers: { "Content-Type": "application/xml" }, body: erro.xml });
    expect(res.status).toBe(erro.status);
    expect(await res.json()).toEqual(erro.corpo);
  });
});
