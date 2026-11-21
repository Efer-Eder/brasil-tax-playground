"use client";

import { Check } from "lucide-react";

/** Peças comuns dos formulários guiados (barra de etapas, títulos e revisão). */

export function Passos({
  etapas,
  etapa,
  irPara,
}: {
  etapas: readonly string[];
  etapa: number;
  irPara: (e: number) => void;
}) {
  return (
    <ol className="flex border-b border-line-subtle bg-[rgba(17,18,21,0.72)]" aria-label="Etapas">
      {etapas.map((nome, i) => {
        const n = i + 1;
        const atual = n === etapa;
        const feita = n < etapa;
        return (
          <li key={nome} className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => feita && irPara(n)}
              disabled={!feita}
              aria-current={atual ? "step" : undefined}
              className={`flex w-full items-center gap-2 border-b-2 px-3 py-3 text-left text-[13px] max-sm:justify-center ${
                atual ? "border-accent text-fg-1" : feita ? "border-transparent text-fg-2 hover:text-fg-1" : "border-transparent text-fg-3"
              }`}
            >
              <span
                className={`grid h-5 w-5 flex-none place-items-center rounded-full font-mono text-[11px] ${
                  feita ? "bg-[var(--success-subtle)] text-ok" : atual ? "bg-[var(--accent-subtle)] text-accent-text" : "bg-surface-2 text-fg-3"
                }`}
              >
                {feita ? <Check className="h-3 w-3" aria-hidden="true" /> : n}
              </span>
              <span className="truncate max-sm:hidden">{nome}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function Titulo({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold tracking-[-0.01em]">{titulo}</h2>
      {children && <p className="mt-1 text-[13px] leading-5 text-fg-2">{children}</p>}
    </div>
  );
}

export interface Problema {
  caminho: string;
  mensagem: string;
}

/** Revisão: o JSON exato que vai ao motor e a conferência estrutural pelo contrato. */
export function Revisao({
  problemas,
  texto,
  aoClicarProblema,
}: {
  problemas: Problema[];
  texto: string;
  aoClicarProblema: (p: Problema) => void;
}) {
  return (
    <>
      <Titulo titulo="Revisão">
        Este é exatamente o JSON que vai para o motor. A conferência abaixo segue o contrato dele; quem decide é o motor.
      </Titulo>
      {problemas.length ? (
        <div className="mb-4 rounded-md border border-[rgba(224,100,106,0.24)] bg-[var(--danger-subtle)] p-4 text-[13px]" role="alert">
          <p className="font-medium">Faltam ajustes antes de enviar:</p>
          <ul className="mt-2 flex flex-col gap-1">
            {problemas.map((p) => (
              <li key={p.caminho + p.mensagem}>
                <button type="button" className="text-left hover:underline" onClick={() => aoClicarProblema(p)}>
                  <code className="font-mono text-accent-text">{p.caminho || "(raiz)"}</code>: <span className="text-fg-2">{p.mensagem}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mb-4 flex items-center gap-2 text-[13px] text-ok">
          <Check className="h-4 w-4" aria-hidden="true" />
          Estrutura conforme o contrato do motor.
        </p>
      )}
      <pre className="code max-h-96" aria-label="JSON que será enviado">
        {texto}
      </pre>
    </>
  );
}
