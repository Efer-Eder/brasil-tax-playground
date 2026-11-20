import { connection } from "next/server";
import { CORS_HEADERS } from "@/lib/cors";
import { buscarResumoRepo, criarCacheResumo } from "@/lib/github/repo";

const REPO = process.env.GITHUB_REPO ?? "Efer-Eder/brasil-tax-playground";

// 15 min: 6 chamadas por atualização ≈ 24 req/h, abaixo das 60/h sem token.
const obter = criarCacheResumo(
  () =>
    buscarResumoRepo(REPO, {
      token: process.env.GITHUB_TOKEN || undefined,
      apiBase: process.env.GITHUB_API_BASE || undefined,
    }),
  15 * 60 * 1000,
);

/** Resumo público do repositório (estrelas, commits, issues, PRs, contribuidores e último CI). */
export async function GET() {
  await connection();
  const resultado = await obter();
  return Response.json(resultado, {
    status: resultado.ok ? 200 : 502,
    headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=60" },
  });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
