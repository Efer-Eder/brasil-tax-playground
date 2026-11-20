import { connection } from "next/server";
import { checkRegimeRegularStatus } from "@/lib/tax-engine";

/**
 * Estado do motor oficial de regime regular configurado neste servidor.
 * Roda sempre em tempo de requisição (a configuração e a disponibilidade do
 * motor mudam sem rebuild).
 */
export async function GET() {
  await connection();
  const status = await checkRegimeRegularStatus();
  return Response.json(status, { headers: { "Cache-Control": "no-store" } });
}
