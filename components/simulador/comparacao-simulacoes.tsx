"use client";

import { GitCompareArrows, X } from "lucide-react";
import { useMemo, useState } from "react";
import { comparar, type LinhaComparacao, type Situacao } from "@/lib/simulation/comparar";
import type { RegistroHistorico } from "@/lib/simulation/historico";
import { rotuloSaida } from "@/lib/tax-engine/contrato";

const SITUACAO: Record<Situacao, { rotulo: string; classe: string }> = {
  igual: { rotulo: "igual", classe: "badge" },
  diferente: { rotulo: "diferente", classe: "badge warn" },
  "so-a": { rotulo: "só em A", classe: "badge accent" },
  "so-b": { rotulo: "só em B", classe: "badge accent" },
};

/**
 * Duas simulações do histórico lado a lado. A tabela mostra os campos que os
 * motores devolveram (e, à parte, os que foram enviados), com os valores
 * exatamente como vieram. Esta aplicação não calcula diferença nenhuma.
 */
export function ComparacaoSimulacoes({
  a,
  b,
  aoFechar,
}: {
  a: RegistroHistorico;
  b: RegistroHistorico;
  aoFechar: () => void;
}) {
  const [mostrarIguais, setMostrarIguais] = useState(false);
  const resposta = useMemo(() => comparar(a.resposta, b.resposta), [a, b]);
  const requisicao = useMemo(() => comparar(lerJson(a.requisicao), lerJson(b.requisicao)), [a, b]);
  const motorA = a.engine ?? "regime-regular";
  const motorB = b.engine ?? "regime-regular";
  const mesmoMotor = motorA === motorB;

  return (
    <section aria-labelledby="comparacao-t" className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-subtle bg-[rgba(17,18,21,0.72)] px-4 py-2.5">
        <h2 id="comparacao-t" className="inline-flex items-center gap-2 text-sm font-semibold">
          <GitCompareArrows className="h-4 w-4 text-accent-text" aria-hidden="true" />
          Comparação de duas simulações
        </h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={aoFechar}>
          <X aria-hidden="true" />
          Fechar comparação
        </button>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {([["A", a, motorA], ["B", b, motorB]] as const).map(([letra, r, motor]) => (
          <div key={letra} className="rounded-md border border-line-subtle p-3">
            <p className="font-mono text-xs text-accent-text">{letra}</p>
            <p className="mt-1 truncate font-mono text-[13px]">{r.titulo}</p>
            <p className="mt-1 font-mono text-[11px] text-fg-3">
              {new Date(r.criadoEm).toLocaleString("pt-BR")} · {motor} · motor {r.motor?.versaoApp ?? "n/d"} · base {r.motor?.versaoDb ?? "n/d"}
            </p>
          </div>
        ))}
        {!mesmoMotor && (
          <p className="text-[13px] text-warn sm:col-span-2" role="note">
            As duas simulações são de motores diferentes; os campos são de contratos diferentes.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-subtle px-5 py-3 text-[13px]">
        <Resumo resumo={resposta.resumo} />
        <label className="ml-auto inline-flex items-center gap-2">
          <input type="checkbox" checked={mostrarIguais} onChange={(e) => setMostrarIguais(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          Mostrar campos iguais
        </label>
      </div>

      <div className="px-5 pb-5">
        <Tabela
          titulo="Resposta do motor"
          linhas={resposta.linhas}
          mostrarIguais={mostrarIguais}
          rotulo={(campo) => (mesmoMotor ? rotuloSaida(campo, motorA) : null)}
        />
        <details className="mt-4">
          <summary className="cursor-pointer text-[13px] text-fg-2 hover:text-fg-1">
            Requisições enviadas ({requisicao.resumo.diferente + requisicao.resumo["so-a"] + requisicao.resumo["so-b"]} diferenças)
          </summary>
          <Tabela titulo="Requisição" linhas={requisicao.linhas} mostrarIguais={mostrarIguais} rotulo={() => null} />
        </details>
      </div>
    </section>
  );
}

function Resumo({ resumo }: { resumo: Record<Situacao, number> }) {
  return (
    <p className="flex flex-wrap gap-2" aria-label="Resumo da comparação">
      {(Object.keys(SITUACAO) as Situacao[]).map((s) => (
        <span key={s} className={SITUACAO[s].classe}>
          {SITUACAO[s].rotulo}: {resumo[s]}
        </span>
      ))}
    </p>
  );
}

function Tabela({
  titulo,
  linhas,
  mostrarIguais,
  rotulo,
}: {
  titulo: string;
  linhas: LinhaComparacao[];
  mostrarIguais: boolean;
  rotulo: (campo: string) => string | null;
}) {
  const visiveis = mostrarIguais ? linhas : linhas.filter((l) => l.situacao !== "igual");
  if (!visiveis.length) {
    return <p className="mt-3 text-[13px] text-fg-3">{titulo}: nenhum campo diferente.</p>;
  }
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <caption className="mb-2 text-left font-mono text-xs text-fg-3">{titulo} (valores como vieram)</caption>
        <thead>
          <tr className="border-b border-line text-left font-mono text-[11px] text-fg-3">
            <th scope="col" className="py-1.5 pr-3 font-normal">campo</th>
            <th scope="col" className="py-1.5 pr-3 font-normal">descrição (motor)</th>
            <th scope="col" className="py-1.5 pr-3 text-right font-normal">A</th>
            <th scope="col" className="py-1.5 pr-3 text-right font-normal">B</th>
            <th scope="col" className="py-1.5 font-normal">situação</th>
          </tr>
        </thead>
        <tbody>
          {visiveis.map((l) => {
            const campo = l.caminho.split(".").at(-1)?.replace(/\[\d+\]$/, "") ?? l.caminho;
            return (
              <tr key={l.caminho} className="border-b border-line-subtle align-top">
                <td className="py-1.5 pr-3 font-mono text-xs text-accent-text">{l.caminho}</td>
                <td className="py-1.5 pr-3 text-fg-2">{rotulo(campo) ?? ""}</td>
                <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{l.a ?? <span className="text-fg-3">ausente</span>}</td>
                <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{l.b ?? <span className="text-fg-3">ausente</span>}</td>
                <td className="py-1.5">
                  <span className={SITUACAO[l.situacao].classe}>{SITUACAO[l.situacao].rotulo}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function lerJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}
