import { describe, expect, it } from "vitest";
import contrato from "@/lib/tax-engine/contrato/regime-regular.openapi.json";
import contratoSimples from "@/lib/tax-engine/contrato/simples-nacional.openapi.json";

/**
 * O retrato do contrato usado pelo formulário guiado precisa ser igual ao
 * OpenAPI do motor rodando. Se falhar, o upstream mudou o contrato: rode
 * `node scripts/contrato/extrair-openapi.mjs <url> [simples-nacional]` e revise o
 * formulário.
 */
const url = process.env.CONTRACT_ENGINE_URL;

describe.skipIf(!url)("contrato: retrato do OpenAPI × motor rodando", () => {
  it("os schemas de entrada usados pelo formulário são os mesmos do motor", async () => {
    const openapi = await (await fetch(`${url}/api-docs`)).json();
    for (const [nome, schema] of Object.entries(contrato.schemas)) {
      expect(openapi.components.schemas[nome], nome).toEqual(schema);
    }
  });
});

const urlSimples = process.env.CONTRACT_SIMPLES_URL;

describe.skipIf(!urlSimples)("contrato do Simples Nacional: retrato do OpenAPI × motor rodando", () => {
  it("os schemas de entrada do endpoint não assistido são os mesmos do motor", async () => {
    const openapi = await (await fetch(`${urlSimples}/api-docs`)).json();
    for (const [nome, schema] of Object.entries(contratoSimples.schemas)) {
      expect(openapi.components.schemas[nome], nome).toEqual(schema);
    }
  });
});
