import { connection } from "next/server";
import { CORS_HEADERS } from "@/lib/cors";
import { consultarDadosAbertos } from "@/lib/tax-engine/dados-abertos";

/**
 * Dados abertos do motor usados pelo formulário guiado (lista branca em
 * lib/tax-engine/dados-abertos.ts). A resposta é a do motor, sem alteração.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/dados-abertos/[recurso]">) {
  await connection();
  const { recurso } = await ctx.params;
  const parametros = Object.fromEntries(new URL(request.url).searchParams);
  const r = await consultarDadosAbertos(recurso, parametros);
  const headers = { ...CORS_HEADERS, "Cache-Control": r.ok ? "public, max-age=300" : "no-store" };
  return r.ok
    ? Response.json(r.dados, { headers })
    : Response.json({ ok: false, motivo: r.motivo, corpo: r.corpo }, { status: r.status, headers });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
