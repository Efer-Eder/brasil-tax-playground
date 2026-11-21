// Extrai do motor oficial o trecho do OpenAPI usado pelo formulário guiado
// (schemas de entrada do cálculo) e grava um retrato versionado.
//
// Uso:
//   node scripts/contrato/extrair-openapi.mjs http://localhost:8080/api
//   node scripts/contrato/extrair-openapi.mjs http://localhost:8082/api simples-nacional
//
// O teste tests/contract/contrato-openapi.test.ts compara esse retrato com o
// motor rodando: se o upstream mudar o contrato, o teste falha.
import { writeFileSync } from "node:fs";

const base = (process.argv[2] ?? "http://localhost:8080/api").replace(/\/+$/, "");
const motor = process.argv[3] ?? "regime-regular";

export const MOTORES = {
  "regime-regular": {
    nome: "calculadora-rtc-regime-regular",
    versao: "/calculadora/dados-abertos/versao",
    schemas: [
      "OperacaoInput",
      "ItemOperacaoInput",
      "ImpostoSeletivoInput",
      "TributacaoRegularInput",
      "ComponentesBaseCalculoInput",
      "CompraGovernamentalInput",
      "AliquotasNominaisInput",
      "AliquotasNominaisImpostoSeletivo",
    ],
  },
  "simples-nacional": {
    nome: "calculadora-rtc-simples-nacional",
    versao: "/versao",
    // Entrada do endpoint "não assistido" (/calculadora/observabilidade/simples-nacional/nao-assistido).
    schemas: [
      "OperacaoSimplesNaoAssistidaInput",
      "ItemSimplesUnificadoInput",
      "AliquotasEfetivasInput",
      "AnexoComIssInput",
      "AnexoParUnicoInput",
      "ParAliquotasInput",
    ],
  },
};
const cfg = MOTORES[motor];
if (!cfg) throw new Error(`motor desconhecido: ${motor}`);
export const SCHEMAS = cfg.schemas;

const [openapi, versao] = await Promise.all([
  fetch(`${base}/api-docs`).then((r) => r.json()),
  fetch(`${base}${cfg.versao}`).then((r) => r.json()),
]);

const schemas = Object.fromEntries(SCHEMAS.map((nome) => [nome, openapi.components.schemas[nome]]));
for (const [nome, s] of Object.entries(schemas)) if (!s) throw new Error(`schema ausente no motor: ${nome}`);

// Rótulos dos campos de SAÍDA, tirados das descrições dos schemas "*Domain"
// do próprio motor. Quando o mesmo nome aparece com textos diferentes, fica o
// texto mais frequente.
const contagem = {};
for (const [nome, sc] of Object.entries(openapi.components.schemas)) {
  if (!nome.endsWith("Domain")) continue;
  for (const [campo, prop] of Object.entries(sc.properties ?? {})) {
    const texto = (prop.description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!texto) continue;
    contagem[campo] ??= {};
    contagem[campo][texto] = (contagem[campo][texto] ?? 0) + 1;
  }
}
const rotulosSaida = Object.fromEntries(
  Object.entries(contagem)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([campo, textos]) => [campo, Object.entries(textos).sort((x, y) => y[1] - x[1])[0][0]]),
);

const destino = `lib/tax-engine/contrato/${motor}.openapi.json`;
writeFileSync(
  destino,
  JSON.stringify(
    {
      origem: `GET /api-docs do motor ${cfg.nome} (OpenAPI ${openapi.openapi})`,
      motor: { versaoApp: versao.versaoApp, versaoDb: versao.versaoDb, dataVersaoDb: versao.dataVersaoDb },
      schemas,
      rotulosSaida,
    },
    null,
    2,
  ) + "\n",
);
console.log(`gravado ${destino} (motor ${versao.versaoApp}/${versao.versaoDb})`);
