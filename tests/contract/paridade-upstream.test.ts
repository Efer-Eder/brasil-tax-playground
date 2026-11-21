import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { simularRegimeRegular } from "@/lib/simulation/regime-regular";

/**
 * Paridade com os payloads de teste do próprio upstream
 * (calculadora-rtc-regime-regular, MIT, Receita Federal do Brasil).
 *
 * Para cada JSON de entrada oficial:
 *   1. envia direto ao motor (POST /calculadora/observabilidade/regime-geral);
 *   2. envia pelo caminho da aplicação (simularRegimeRegular, o mesmo do BFF);
 *   3. compara o resultado e registra a classificação.
 *
 * Opt-in: precisa de um motor rodando (CONTRACT_ENGINE_URL) e de um clone do
 * upstream na tag em uso (UPSTREAM_TESTS_DIR = <clone>/src/test/resources).
 * Os payloads não são copiados para este repositório.
 *
 *   $env:CONTRACT_ENGINE_URL="http://localhost:18081/api"
 *   $env:UPSTREAM_TESTS_DIR="C:\...\calculadora-rtc-regime-regular\src\test\resources"
 *   npm run test:paridade
 *
 * O relatório completo vai para test-results/paridade-upstream.json.
 */
const url = process.env.CONTRACT_ENGINE_URL;
const dir = process.env.UPSTREAM_TESTS_DIR;

/** Pastas com entradas de cálculo; "validacoes" são entradas inválidas de propósito. */
const PASTAS = ["entradas/calculoscorretos", "entradas/arredondamento", "entradas/tpdoc", "entradas/validacoes", "roc"];

type Classificacao =
  | "igual"
  | "erro-igual"
  | "ambos-recusam"
  | "diferente"
  | "app-recusa-entrada-aceita"
  | "app-aceita-entrada-recusada";

interface Caso {
  arquivo: string;
  classificacao: Classificacao;
  statusMotor: number;
  statusApp: number;
  detalhe?: string;
}

/**
 * Normalização usada SÓ para comparar (o app exibe a resposta como veio):
 * - `timestamp` do ProblemDetail muda a cada chamada;
 * - o próprio motor devolve listas de erros de validação em ordem não
 *   determinística (duas chamadas diretas iguais podem vir em ordens diferentes).
 */
function normalizar(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    const itens = valor.map(normalizar);
    const ehListaDeErros = itens.every((i) => i && typeof i === "object" && ("pointer" in i || "code" in i));
    return ehListaDeErros ? itens.map((i) => JSON.stringify(i)).sort().map((i) => JSON.parse(i)) : itens;
  }
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor)
        .filter(([k]) => k !== "timestamp")
        .map(([k, v]) => [k, normalizar(v)]),
    );
  }
  return valor;
}

const iguais = (a: unknown, b: unknown) => JSON.stringify(normalizar(a)) === JSON.stringify(normalizar(b));

function listar(raiz: string): string[] {
  const out: string[] = [];
  const andar = (d: string) => {
    for (const nome of readdirSync(d)) {
      const p = join(d, nome);
      if (statSync(p).isDirectory()) andar(p);
      else if (nome.endsWith(".json")) out.push(p);
    }
  };
  andar(raiz);
  return out.sort();
}

async function motorDireto(corpo: string) {
  const res = await fetch(`${url}/calculadora/observabilidade/regime-geral`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: corpo,
  });
  const texto = await res.text();
  let body: unknown = texto;
  try {
    body = JSON.parse(texto);
  } catch {
    /* mantém texto */
  }
  return { status: res.status, body };
}

describe.skipIf(!url || !dir)("paridade: payloads oficiais do upstream", () => {
  const arquivos = dir ? PASTAS.flatMap((p) => listar(join(dir, p))) : [];
  const casos: Caso[] = [];

  it(`há payloads oficiais para comparar (${arquivos.length})`, () => {
    expect(arquivos.length).toBeGreaterThan(20);
  });

  for (const arquivo of arquivos) {
    const nome = relative(dir!, arquivo).replace(/\\/g, "/");
    it(nome, async () => {
      const corpo = readFileSync(arquivo, "utf8");
      const direto = await motorDireto(corpo);
      const app = await simularRegimeRegular(corpo, { env: { REGIME_REGULAR_ENGINE_URL: url } });

      let classificacao: Classificacao;
      let detalhe: string | undefined;
      if (direto.status === 200 && app.ok) {
        classificacao = iguais(app.resposta, direto.body) ? "igual" : "diferente";
      } else if (direto.status === 200 && !app.ok) {
        classificacao = "app-recusa-entrada-aceita";
        detalhe = JSON.stringify(app.erro).slice(0, 400);
      } else if (direto.status !== 200 && app.ok) {
        classificacao = "app-aceita-entrada-recusada";
      } else if (!app.ok && app.erro.tipo === "erro-do-motor") {
        classificacao =
          app.erro.statusMotor === direto.status && iguais(app.erro.corpo, direto.body)
            ? "erro-igual"
            : "diferente";
      } else {
        classificacao = "ambos-recusam";
        detalhe = !app.ok ? `app: ${app.erro.tipo}; motor: HTTP ${direto.status}` : undefined;
      }

      casos.push({ arquivo: nome, classificacao, statusMotor: direto.status, statusApp: app.httpStatus, detalhe });
      expect(["igual", "erro-igual", "ambos-recusam"], `${nome}: ${classificacao} ${detalhe ?? ""}`).toContain(
        classificacao,
      );
    });
  }

  it("grava o relatório", () => {
    mkdirSync("test-results", { recursive: true });
    const resumo: Record<string, number> = {};
    for (const c of casos) resumo[c.classificacao] = (resumo[c.classificacao] ?? 0) + 1;
    writeFileSync(
      "test-results/paridade-upstream.json",
      JSON.stringify({ geradoEm: new Date().toISOString(), motor: url, total: casos.length, resumo, casos }, null, 2) + "\n",
    );
    expect(casos.length).toBe(arquivos.length);
  });
});
