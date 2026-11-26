/**
 * Content-Security-Policy das páginas. Scripts só com o nonce da requisição
 * (e os que eles carregam, via 'strict-dynamic'); nada de fora, nada inline
 * sem nonce. O PDF do DANFSe é exibido de um blob: gerado no navegador.
 */
export function politicaDeSeguranca(nonce: string, desenvolvimento = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${desenvolvimento ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${desenvolvimento ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}
