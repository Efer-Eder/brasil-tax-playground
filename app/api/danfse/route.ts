import { CORS_HEADERS } from "@/lib/cors";
import { gerarDanfse, lerOpcoesDanfse } from "@/lib/danfse/gerar";
import { lerCorpoLimitado } from "@/lib/http/corpo-limitado";
import { LimitadorConcorrencia, lerLimites } from "@/lib/simulation/limites";
import { readEngineConfig } from "@/lib/tax-engine/config";

/**
 * Teto do XML nesta instância. O serviço oficial aceita até 5 MiB por padrão
 * (XML_MAX_SIZE_BYTES); aqui vale o mesmo limite de corpo da API (Nginx).
 */
const MAX_XML_BYTES = 500 * 1024;

const limites = lerLimites();
// Gerar PDF pesa em CPU (~230 ms por nota medidos localmente): no máximo 2 ao
// mesmo tempo e fila curta, para não roubar CPU dos motores de cálculo.
const limitador = new LimitadorConcorrencia({
  ...limites,
  maxConcorrencia: Math.min(limites.maxConcorrencia, 2),
  maxFila: Math.min(limites.maxFila, 8),
});

/**
 * BFF / API pública do gerador oficial de DANFSe (DANFSE_ENGINE_URL).
 * Recebe o XML de uma NFS-e e devolve o PDF exatamente como o serviço gerou.
 * Nada é armazenado.
 */
export async function POST(request: Request) {
  const headers: Record<string, string> = { ...CORS_HEADERS, "Cache-Control": "no-store" };
  const opcoes = lerOpcoesDanfse(new URL(request.url).searchParams);
  if (!opcoes.ok) {
    return Response.json({ ok: false, httpStatus: 422, erro: { tipo: "entrada-invalida", mensagem: opcoes.mensagem } }, { status: 422, headers });
  }

  const corpo = await lerCorpoLimitado(request, MAX_XML_BYTES);
  if (!corpo.ok) {
    return Response.json(
      { ok: false, httpStatus: 413, erro: { tipo: "entrada-invalida", mensagem: "XML maior que 500 KB." } },
      { status: 413, headers },
    );
  }

  const r = await gerarDanfse(corpo.bytes, opcoes.opcoes, { limitador });
  if (r.ok) {
    return new Response(r.pdf, {
      status: 200,
      headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="danfse.pdf"' },
    });
  }
  const config = readEngineConfig("danfse");
  const baseUrl = config.ok ? config.config.baseUrl : undefined;
  const mensagem = baseUrl ? r.erro.mensagem.split(baseUrl).join("(gerador configurado)") : r.erro.mensagem;
  if (r.erro.tipo === "ocupado") headers["Retry-After"] = "5";
  return Response.json({ ...r, erro: { ...r.erro, mensagem } }, { status: r.httpStatus, headers });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
