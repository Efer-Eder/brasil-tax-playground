import { connection } from "next/server";
import { CORS_HEADERS } from "@/lib/cors";
import { statusPublico } from "@/lib/http/publico";
import { checkRegimeRegularStatus } from "@/lib/tax-engine";

/**
 * Estado do motor oficial de regime regular configurado neste servidor.
 * Roda sempre em tempo de requisição (a configuração e a disponibilidade do
 * motor mudam sem rebuild).
 */
export async function GET() {
  await connection();
  const status = await checkRegimeRegularStatus();
  return Response.json(statusPublico(status), { headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
