import { NextResponse, type NextRequest } from "next/server";
import { politicaDeSeguranca } from "@/lib/http/csp";

/**
 * Content-Security-Policy com nonce por requisição para as páginas. O Next lê
 * o nonce do cabeçalho da requisição e o aplica aos próprios scripts.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = politicaDeSeguranca(nonce, process.env.NODE_ENV === "development");

  const cabecalhos = new Headers(request.headers);
  cabecalhos.set("x-nonce", nonce);
  cabecalhos.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: cabecalhos } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // A raiz entra à parte: com basePath, a página inicial é o próprio basePath
    // (sem barra no fim) e não casa com o padrão abaixo.
    "/",
    {
      // Páginas; a API devolve JSON/PDF e tem cabeçalhos próprios.
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
