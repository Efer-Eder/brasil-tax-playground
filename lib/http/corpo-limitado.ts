/**
 * Lê o corpo de uma requisição sem passar do limite: recusa pelo
 * Content-Length quando ele vem, e corta a leitura do fluxo assim que passar
 * do teto (cliente que mente o tamanho ou usa chunked).
 */
export type CorpoLido = { ok: true; texto: string } | { ok: false; motivo: "grande-demais" };

export async function lerCorpoLimitado(request: Request, maxBytes: number): Promise<CorpoLido> {
  const declarado = Number(request.headers.get("content-length"));
  if (Number.isFinite(declarado) && declarado > maxBytes) return { ok: false, motivo: "grande-demais" };
  if (!request.body) return { ok: true, texto: "" };

  const leitor = request.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await leitor.cancel();
      return { ok: false, motivo: "grande-demais" };
    }
    partes.push(value);
  }
  const tudo = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    tudo.set(p, pos);
    pos += p.byteLength;
  }
  return { ok: true, texto: new TextDecoder().decode(tudo) };
}
