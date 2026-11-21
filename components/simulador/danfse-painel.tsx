"use client";

import { Download, FileText, FileUp, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { XML_NFSE_EXEMPLO } from "@/lib/danfse/exemplo";
import { SITUACOES_DANFSE } from "@/lib/tax-engine/adapters/danfse";
import { Alerta } from "../resultado-simulacao";

const LIMITE_ARQUIVO = 500 * 1024;

type Estado =
  | { kind: "ocioso" }
  | { kind: "enviando" }
  | { kind: "pdf"; url: string; bytes: number; geradoEm: string }
  | { kind: "erro"; titulo: string; mensagem: string; corpo?: unknown };

/**
 * Gerador de DANFSe: envia o XML da NFS-e ao serviço oficial (pelo BFF
 * /api/danfse) e mostra o PDF que ele devolveu. Esta aplicação não monta nem
 * altera o PDF, e o gerador não calcula tributos.
 */
export function DanfsePainel() {
  const [xml, setXml] = useState(XML_NFSE_EXEMPLO);
  const [stc, setStc] = useState("");
  const [canhoto, setCanhoto] = useState(true);
  const [estado, setEstado] = useState<Estado>({ kind: "ocioso" });
  const arquivo = useRef<HTMLInputElement>(null);

  // Libera o PDF anterior da memória.
  const urlAtual = estado.kind === "pdf" ? estado.url : null;
  useEffect(() => () => {
    if (urlAtual) URL.revokeObjectURL(urlAtual);
  }, [urlAtual]);

  async function importar(f: File | undefined) {
    if (!f) return;
    if (f.size > LIMITE_ARQUIVO) {
      setEstado({ kind: "erro", titulo: "Arquivo grande demais", mensagem: "Esta instância aceita XML de até 500 KB." });
      return;
    }
    setXml(await f.text());
    setEstado({ kind: "ocioso" });
  }

  async function gerar(event: React.FormEvent) {
    event.preventDefault();
    setEstado({ kind: "enviando" });
    const q = new URLSearchParams();
    if (stc) q.set("stc", stc);
    if (!canhoto) q.set("canhoto", "false");
    try {
      const res = await fetch(withBasePath(`/api/danfse${q.size ? `?${q}` : ""}`), {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: xml,
      });
      if (res.ok && res.headers.get("content-type")?.includes("application/pdf")) {
        const blob = await res.blob();
        setEstado({ kind: "pdf", url: URL.createObjectURL(blob), bytes: blob.size, geradoEm: new Date().toISOString() });
        return;
      }
      const corpo = (await res.json().catch(() => null)) as { erro?: { mensagem?: string; corpo?: unknown } } | null;
      setEstado({
        kind: "erro",
        titulo: `O gerador não devolveu o PDF (HTTP ${res.status})`,
        mensagem: corpo?.erro?.mensagem ?? "Resposta inesperada.",
        corpo: corpo?.erro?.corpo,
      });
    } catch (e) {
      setEstado({ kind: "erro", titulo: "Não foi possível falar com este app", mensagem: e instanceof Error ? e.message : "falha" });
    }
  }

  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <form onSubmit={gerar} className="card flex flex-col gap-4 p-6" aria-label="XML da NFS-e">
        <div className="flex flex-wrap items-end gap-3">
          <button type="button" className="btn btn-secondary" onClick={() => setXml(XML_NFSE_EXEMPLO)}>
            <FileText aria-hidden="true" />
            Exemplo fictício
          </button>
          <input
            ref={arquivo}
            type="file"
            accept="application/xml,text/xml,.xml"
            className="hidden"
            aria-label="Importar arquivo XML"
            onChange={(e) => {
              void importar(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={() => arquivo.current?.click()}>
            <FileUp aria-hidden="true" />
            Importar XML
          </button>
        </div>
        <p className="text-[13px] leading-5 text-fg-2">
          O exemplo é uma NFS-e fictícia (CNPJ e CPF zerados, ambiente de homologação, sem tributos). Não use notas reais de
          clientes numa instância pública.
        </p>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-mono text-xs text-fg-3">XML da NFS-e (enviado ao gerador sem alteração)</span>
          <textarea value={xml} onChange={(e) => setXml(e.target.value)} spellCheck={false} rows={20} className="field p-3 font-mono text-xs leading-5" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            Situação da nota (stc)
            <select value={stc} onChange={(e) => setStc(e.target.value)} className="field h-9 px-2.5 text-[13px] font-normal">
              <option value="">Padrão do gerador</option>
              {SITUACOES_DANFSE.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.valor} · {s.rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-[13px]">
            <input type="checkbox" checked={canhoto} onChange={(e) => setCanhoto(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
            Incluir canhoto
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={estado.kind === "enviando" || !xml.trim()} className="btn btn-primary">
            <Play aria-hidden="true" />
            {estado.kind === "enviando" ? "Gerando…" : "Gerar DANFSe"}
          </button>
        </div>
        <p className="text-xs leading-5 text-fg-3">
          O gerador oficial lê o XML da NFS-e e desenha o DANFSe. Ele não calcula tributos: o PDF mostra o que está no XML.
        </p>
      </form>

      <section aria-live="polite" aria-label="DANFSe gerado" className="flex min-w-0 flex-col gap-3">
        {estado.kind === "ocioso" && (
          <div className="card border-dashed border-line-strong bg-transparent p-6 text-[13px] leading-5 text-fg-3">
            O PDF aparece aqui, exatamente como o gerador oficial devolveu.
          </div>
        )}
        {estado.kind === "enviando" && (
          <div className="card border-dashed border-line-strong bg-transparent p-6 text-[13px] text-fg-3">Aguardando o gerador…</div>
        )}
        {estado.kind === "erro" && (
          <>
            <Alerta titulo={estado.titulo}>{estado.mensagem}</Alerta>
            {estado.corpo !== undefined && (
              <div className="card p-5">
                <p className="font-mono text-xs text-fg-3">corpo devolvido pelo gerador</p>
                <pre className="code mt-3 max-h-80">{JSON.stringify(estado.corpo, null, 2)}</pre>
              </div>
            )}
          </>
        )}
        {estado.kind === "pdf" && (
          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line-subtle bg-[rgba(17,18,21,0.72)] p-3">
              <span className="badge ok">PDF gerado</span>
              <span className="font-mono text-xs text-fg-3">{(estado.bytes / 1024).toFixed(1)} KB</span>
              <a href={estado.url} download={`danfse-${estado.geradoEm.replace(/[:.]/g, "-")}.pdf`} className="btn btn-secondary btn-sm ml-auto">
                <Download aria-hidden="true" />
                Baixar PDF
              </a>
            </div>
            <iframe title="DANFSe gerado pelo serviço oficial" src={estado.url} className="h-[720px] w-full bg-white max-sm:h-[480px]" />
          </div>
        )}
      </section>
    </div>
  );
}
