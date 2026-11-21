import { connection } from "next/server";
import { CORS_HEADERS } from "@/lib/cors";
import { statusPublico } from "@/lib/http/publico";
import { checkEngineStatus, type EngineId } from "@/lib/tax-engine";

const MOTORES: readonly EngineId[] = ["regime-regular", "simples-nacional", "danfse"];

/**
 * Estado de um dos motores oficiais configurados neste servidor
 * (`/api/engine/regime-regular/status`, `/simples-nacional/status`,
 * `/danfse/status`). Sempre em tempo de requisição.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/engine/[motor]/status">) {
  await connection();
  const { motor } = await ctx.params;
  if (!MOTORES.includes(motor as EngineId)) {
    return Response.json(
      { ok: false, motivo: `Motor desconhecido: ${motor}.` },
      { status: 404, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } },
    );
  }
  const status = await checkEngineStatus(motor as EngineId);
  return Response.json(statusPublico(status), { headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
