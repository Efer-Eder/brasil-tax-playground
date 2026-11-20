import { LimitadorConcorrencia, lerLimites } from "@/lib/simulation/limites";
import { simularRegimeRegular } from "@/lib/simulation/regime-regular";
import { CORS_HEADERS } from "@/lib/cors";

/**
 * Limite do corpo aceito pelo BFF. Mesmo valor de
 * `spring.http.codecs.max-in-memory-size` no perfil offline do upstream.
 */
const MAX_BODY_BYTES = 500 * 1024;

const limites = lerLimites();
const limitador = new LimitadorConcorrencia(limites);

/**
 * BFF / API pública: valida a operação e a repassa ao motor oficial
 * configurado em REGIME_REGULAR_ENGINE_URL. Nada é armazenado.
 */
export async function POST(request: Request) {
  const body = await request.text();
  if (new TextEncoder().encode(body).length > MAX_BODY_BYTES) {
    return Response.json(
      { ok: false, httpStatus: 413, erro: { tipo: "json-invalido", mensagem: "Corpo maior que 500 KB." } },
      { status: 413, headers: CORS_HEADERS },
    );
  }

  const resultado = await simularRegimeRegular(body, { maxItens: limites.maxItens, limitador });
  const headers: Record<string, string> = { ...CORS_HEADERS, "Cache-Control": "no-store" };
  if (!resultado.ok && resultado.erro.tipo === "ocupado") headers["Retry-After"] = "5";
  return Response.json(resultado, { status: resultado.httpStatus, headers });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
