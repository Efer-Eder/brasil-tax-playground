"use client";

import { Braces, Check, ClipboardCopy, FileUp, Play, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { EXEMPLOS, type ExemploOperacao } from "@/lib/simulation/exemplos";
import { validarPayload, type ProblemaCampo } from "@/lib/simulation/guiado";
import type { MotorCalculo } from "@/lib/simulation/regime-regular";

const formatar = (valor: unknown) => JSON.stringify(valor, null, 2);
const LIMITE_ARQUIVO = 500 * 1024;

type Conferencia =
  | { kind: "nada" }
  | { kind: "json-invalido"; mensagem: string }
  | { kind: "problemas"; problemas: ProblemaCampo[] }
  | { kind: "ok" };

function conferir(texto: string, motor: MotorCalculo): Conferencia {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch (e) {
    return { kind: "json-invalido", mensagem: e instanceof Error ? e.message : "JSON inválido" };
  }
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { kind: "json-invalido", mensagem: "O corpo precisa ser um objeto JSON." };
  }
  // Regime regular: espelho do contrato de entrada. Simples Nacional: só o
  // envelope (os erros de campo vêm do motor, por item).
  const problemas =
    motor === "regime-regular"
      ? validarPayload(json as Record<string, unknown>)
      : Array.isArray((json as { itens?: unknown }).itens) && (json as { itens: unknown[] }).itens.length
        ? []
        : [{ caminho: "itens", mensagem: "Informe ao menos um item" }];
  return problemas.length ? { kind: "problemas", problemas } : { kind: "ok" };
}

interface Props {
  motor: MotorCalculo;
  exemplos?: ExemploOperacao[];
  texto: string;
  aoMudarTexto: (t: string) => void;
  enviando: boolean;
  aoSimular: (texto: string) => void;
  resultado: React.ReactNode;
}

/**
 * Modo desenvolvedor: JSON direto. Usa o mesmo envio do modo guiado. A
 * conferência local segue o contrato do motor e é só apoio: dá para enviar
 * mesmo assim, e quem decide é o motor.
 */
export function EditorDesenvolvedor({ motor, exemplos = EXEMPLOS, texto, aoMudarTexto, enviando, aoSimular, resultado }: Props) {
  const [exemploId, setExemploId] = useState("");
  const [conferencia, setConferencia] = useState<Conferencia>({ kind: "nada" });
  const [copiado, setCopiado] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);

  function carregarExemplo(id: string) {
    const exemplo = exemplos.find((e) => e.id === id);
    setExemploId(id);
    if (exemplo) aoMudarTexto(formatar(exemplo.operacao));
    setConferencia({ kind: "nada" });
  }

  async function importar(f: File | undefined) {
    if (!f) return;
    if (f.size > LIMITE_ARQUIVO) {
      setConferencia({ kind: "json-invalido", mensagem: "Arquivo maior que 500 KB." });
      return;
    }
    aoMudarTexto(await f.text());
    setExemploId("");
    setConferencia({ kind: "nada" });
  }

  function simular(event: React.FormEvent) {
    event.preventDefault();
    const c = conferir(texto, motor);
    setConferencia(c);
    if (c.kind === "ok") aoSimular(texto);
  }

  const exemploAtual = exemplos.find((e) => e.id === exemploId);

  return (
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <form onSubmit={simular} className="card flex flex-col gap-4 p-6" aria-label="Operação">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-mono text-xs text-fg-3">Exemplo fictício</span>
            <select value={exemploId} onChange={(e) => carregarExemplo(e.target.value)} className="field h-9 px-2.5 text-[13px]">
              <option value="">Escolha um exemplo</option>
              {exemplos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.titulo}
                </option>
              ))}
            </select>
          </label>
          <input
            ref={arquivo}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Importar arquivo JSON"
            onChange={(e) => {
              void importar(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button type="button" className="btn btn-secondary" onClick={() => arquivo.current?.click()}>
            <FileUp aria-hidden="true" />
            Importar JSON
          </button>
        </div>
        {exemploAtual && <p className="text-[13px] leading-5 text-fg-2">{exemploAtual.descricao}</p>}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-mono text-xs text-fg-3">Operação (JSON enviado ao motor, sem alteração)</span>
          <textarea
            value={texto}
            onChange={(e) => {
              aoMudarTexto(e.target.value);
              setConferencia({ kind: "nada" });
            }}
            spellCheck={false}
            rows={22}
            className="field p-3 font-mono text-xs leading-5"
          />
        </label>

        <ConferenciaVisual c={conferencia} aoEnviarMesmoAssim={() => aoSimular(texto)} enviando={enviando} />

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={enviando} className="btn btn-primary">
            <Play aria-hidden="true" />
            {enviando ? "Enviando ao motor…" : "Simular"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setConferencia(conferir(texto, motor))}>
            <ShieldCheck aria-hidden="true" />
            Validar
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              try {
                aoMudarTexto(formatar(JSON.parse(texto)));
              } catch {
                setConferencia(conferir(texto, motor));
              }
            }}
          >
            <Braces aria-hidden="true" />
            Formatar
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              void navigator.clipboard?.writeText(texto).then(() => {
                setCopiado(true);
                setTimeout(() => setCopiado(false), 1500);
              });
            }}
          >
            {copiado ? <Check aria-hidden="true" /> : <ClipboardCopy aria-hidden="true" />}
            {copiado ? "Copiado" : "Copiar"}
          </button>
        </div>
        {motor === "regime-regular" ? (
          <p className="text-xs leading-5 text-fg-3">
            Campos conforme <code>OperacaoInput</code> do motor 1.7.2. A partir de 2027 o motor exige <code>aliquotasNominais</code> por
            item; este app não sugere valores de alíquota.
          </p>
        ) : (
          <p className="text-xs leading-5 text-fg-3">
            Campos conforme <code>OperacaoSimplesNaoAssistidaInput</code> do motor 1.0.2. As alíquotas efetivas
            (<code>aliquotasEfetivas</code>) são do contribuinte e vêm de quem simula; este app não sugere valores.
          </p>
        )}
      </form>

      <section aria-live="polite" aria-label="Resultado" className="flex min-w-0 flex-col gap-3">
        {resultado}
      </section>
    </div>
  );
}

function ConferenciaVisual({
  c,
  aoEnviarMesmoAssim,
  enviando,
}: {
  c: Conferencia;
  aoEnviarMesmoAssim: () => void;
  enviando: boolean;
}) {
  if (c.kind === "nada") return null;
  if (c.kind === "ok") {
    return (
      <p className="flex items-center gap-2 text-[13px] text-ok">
        <Check className="h-4 w-4" aria-hidden="true" />
        Estrutura conforme o contrato do motor.
      </p>
    );
  }
  return (
    <div role="alert" className="rounded-md border border-[rgba(224,100,106,0.24)] bg-[var(--danger-subtle)] p-4 text-[13px]">
      {c.kind === "json-invalido" ? (
        <p>
          <span className="font-medium">JSON inválido:</span> <span className="text-fg-2">{c.mensagem}</span>
        </p>
      ) : (
        <>
          <p className="font-medium">Operação inválida (conferência local pelo contrato do motor)</p>
          <ul className="mt-2 flex flex-col gap-1">
            {c.problemas.map((p) => (
              <li key={p.caminho + p.mensagem}>
                <code className="font-mono text-accent-text">{p.caminho || "(raiz)"}</code>: <span className="text-fg-2">{p.mensagem}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={aoEnviarMesmoAssim} disabled={enviando}>
            Enviar ao motor mesmo assim
          </button>
          <p className="mt-2 text-xs text-fg-3">O motor é quem decide: no modo de observabilidade ele devolve o erro de cada item.</p>
        </>
      )}
    </div>
  );
}
