"use client";

import { useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { EXEMPLOS } from "@/lib/simulation/exemplos";
import type { SimulacaoResultado } from "@/lib/simulation/regime-regular";
import { Alerta, ErroSimulacao, ResultadoSucesso } from "./resultado-simulacao";

type Estado =
  | { kind: "ocioso" }
  | { kind: "enviando" }
  | { kind: "resultado"; resultado: SimulacaoResultado; enviado: string }
  | { kind: "falha-rede"; mensagem: string };

const formatar = (valor: unknown) => JSON.stringify(valor, null, 2);

export function SimuladorRegimeRegular() {
  const [texto, setTexto] = useState(() => formatar(EXEMPLOS[0].operacao));
  const [exemploId, setExemploId] = useState(EXEMPLOS[0].id);
  const [estado, setEstado] = useState<Estado>({ kind: "ocioso" });

  function carregarExemplo(id: string) {
    const exemplo = EXEMPLOS.find((e) => e.id === id);
    if (!exemplo) return;
    setExemploId(id);
    setTexto(formatar(exemplo.operacao));
    setEstado({ kind: "ocioso" });
  }

  async function simular(event: React.FormEvent) {
    event.preventDefault();
    setEstado({ kind: "enviando" });
    try {
      const res = await fetch(withBasePath("/api/simular/regime-regular"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: texto,
      });
      const resultado = (await res.json()) as SimulacaoResultado;
      setEstado({ kind: "resultado", resultado, enviado: texto });
    } catch (error) {
      setEstado({
        kind: "falha-rede",
        mensagem: error instanceof Error ? error.message : "falha desconhecida",
      });
    }
  }

  const exemploAtual = EXEMPLOS.find((e) => e.id === exemploId);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={simular} className="space-y-3" aria-label="Operação">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Exemplo fictício</span>
            <select
              value={exemploId}
              onChange={(e) => carregarExemplo(e.target.value)}
              className="rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 dark:border-zinc-700"
            >
              {EXEMPLOS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.titulo}
                </option>
              ))}
            </select>
          </label>
        </div>
        {exemploAtual && <p className="text-sm text-zinc-600 dark:text-zinc-400">{exemploAtual.descricao}</p>}
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Operação (JSON enviado ao motor)</span>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            spellCheck={false}
            rows={22}
            className="w-full rounded-md border border-zinc-300 bg-zinc-50 p-3 font-mono text-xs leading-relaxed dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <p className="text-xs text-zinc-500">
          Campos conforme <code>OperacaoInput</code> do motor 1.7.2. A partir de 2027 o motor exige{" "}
          <code>aliquotasNominais</code> por item; este app não sugere valores de alíquota.
        </p>
        <button
          type="submit"
          disabled={estado.kind === "enviando"}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {estado.kind === "enviando" ? "Enviando ao motor…" : "Simular"}
        </button>
      </form>

      <section aria-live="polite" aria-label="Resultado" className="min-w-0 space-y-4">
        <Resultado estado={estado} />
      </section>
    </div>
  );
}

function Resultado({ estado }: { estado: Estado }) {
  if (estado.kind === "ocioso") {
    return <p className="text-sm text-zinc-500">O resultado aparece aqui depois do envio.</p>;
  }
  if (estado.kind === "enviando") {
    return <p className="text-sm text-zinc-500">Aguardando resposta do motor…</p>;
  }
  if (estado.kind === "falha-rede") {
    return <Alerta titulo="Não foi possível falar com este app">{estado.mensagem}</Alerta>;
  }
  const { resultado, enviado } = estado;
  if (!resultado.ok) return <ErroSimulacao resultado={resultado} enviado={enviado} />;
  return <ResultadoSucesso resultado={resultado} />;
}
