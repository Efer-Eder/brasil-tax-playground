"use client";

import { Copy, GitCompareArrows, History, RotateCcw, Trash2 } from "lucide-react";
import type { RegistroHistorico } from "@/lib/simulation/historico";

interface Props {
  registros: RegistroHistorico[];
  aoReabrir: (r: RegistroHistorico) => void;
  aoDuplicar: (r: RegistroHistorico) => void;
  aoRemover: (id: string) => void;
  aoLimpar: () => void;
  /** Ids marcados para comparar (no máximo 2). */
  selecionados: string[];
  aoAlternarSelecao: (id: string) => void;
  aoComparar: () => void;
}

/** Histórico guardado só neste navegador (localStorage). */
export function HistoricoPainel({
  registros,
  aoReabrir,
  aoDuplicar,
  aoRemover,
  aoLimpar,
  selecionados,
  aoAlternarSelecao,
  aoComparar,
}: Props) {
  return (
    <section aria-labelledby="historico-t" className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle bg-[rgba(17,18,21,0.72)] px-4 py-2.5">
        <h2 id="historico-t" className="inline-flex items-center gap-2 font-mono text-xs text-fg-3">
          <History className="h-3.5 w-3.5" aria-hidden="true" />
          histórico neste navegador ({registros.length})
        </h2>
        {registros.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {registros.length > 1 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={aoComparar} disabled={selecionados.length !== 2}>
                <GitCompareArrows aria-hidden="true" />
                Comparar selecionadas ({selecionados.length}/2)
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={aoLimpar}>
              Limpar histórico
            </button>
          </div>
        )}
      </div>
      {registros.length === 0 ? (
        <p className="p-5 text-[13px] leading-5 text-fg-3">
          As simulações feitas aqui ficam guardadas só neste navegador (até 20). Nada vai para o servidor. Evite usar dados reais de
          clientes.
        </p>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {registros.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              {registros.length > 1 && (
                <input
                  type="checkbox"
                  checked={selecionados.includes(r.id)}
                  disabled={!selecionados.includes(r.id) && selecionados.length >= 2}
                  onChange={() => aoAlternarSelecao(r.id)}
                  aria-label={`Selecionar ${r.titulo} para comparar`}
                  className="h-4 w-4 flex-none accent-[var(--accent)]"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[13px]">{r.titulo}</p>
                <p className="font-mono text-[11px] text-fg-3">
                  {new Date(r.criadoEm).toLocaleString("pt-BR")} · {r.engine ?? "regime-regular"} · {r.modo} · motor {r.motor?.versaoApp ?? "n/d"}
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => aoReabrir(r)} aria-label={`Reabrir resultado de ${r.titulo}`}>
                  <RotateCcw aria-hidden="true" />
                  Reabrir
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => aoDuplicar(r)} aria-label={`Duplicar ${r.titulo} no modo desenvolvedor`}>
                  <Copy aria-hidden="true" />
                  Duplicar
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => aoRemover(r.id)} aria-label={`Remover ${r.titulo}`}>
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
