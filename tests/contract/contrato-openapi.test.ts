import { describe, expect, it } from "vitest";
import contrato from "@/lib/tax-engine/contrato/regime-regular.openapi.json";

/**
 * O retrato do contrato usado pelo formulário guiado precisa ser igual ao
 * OpenAPI do motor rodando. Se falhar, o upstream mudou o contrato: rode
 * `node scripts/contrato/extrair-openapi.mjs <url>` e revise o formulário.
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
