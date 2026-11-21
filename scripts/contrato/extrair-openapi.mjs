// Extrai do motor oficial o trecho do OpenAPI usado pelo formulário guiado
// (schemas de entrada do cálculo de regime geral) e grava um retrato versionado.
//
// Uso: node scripts/contrato/extrair-openapi.mjs http://localhost:8080/api
//
// O teste tests/contract/contrato-openapi.test.ts compara esse retrato com o
// motor rodando: se o upstream mudar o contrato, o teste falha.
import { writeFileSync } from "node:fs";

const base = (process.argv[2] ?? "http://localhost:8080/api").replace(/\/+$/, "");
export const SCHEMAS = [
  "OperacaoInput",
  "ItemOperacaoInput",
  "ImpostoSeletivoInput",
  "TributacaoRegularInput",
  "ComponentesBaseCalculoInput",
  "CompraGovernamentalInput",
  "AliquotasNominaisInput",
  "AliquotasNominaisImpostoSeletivo",
];

const [openapi, versao] = await Promise.all([
  fetch(`${base}/api-docs`).then((r) => r.json()),
  fetch(`${base}/calculadora/dados-abertos/versao`).then((r) => r.json()),
]);

const schemas = Object.fromEntries(SCHEMAS.map((nome) => [nome, openapi.components.schemas[nome]]));
for (const [nome, s] of Object.entries(schemas)) if (!s) throw new Error(`schema ausente no motor: ${nome}`);

const destino = "lib/tax-engine/contrato/regime-regular.openapi.json";
writeFileSync(
  destino,
  JSON.stringify(
    {
      origem: "GET /api-docs do motor calculadora-rtc-regime-regular (OpenAPI " + openapi.openapi + ")",
      motor: { versaoApp: versao.versaoApp, versaoDb: versao.versaoDb, dataVersaoDb: versao.dataVersaoDb },
      schemas,
    },
    null,
    2,
  ) + "\n",
);
console.log(`gravado ${destino} (motor ${versao.versaoApp}/${versao.versaoDb})`);
