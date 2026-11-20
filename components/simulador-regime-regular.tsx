"use client";

import { Play } from "lucide-react";
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
    <div className="grid items-start gap-3 lg:grid-cols-2">
      <form onSubmit={simular} className="card flex flex-col gap-4 p-6" aria-label="Operação">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-mono text-xs text-fg-3">Exemplo fictício</span>
            <select
              value={exemploId}
              onChange={(e) => carregarExemplo(e.target.value)}
              className="field h-9 px-2.5 text-[13px]"
            >
              {EXEMPLOS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.titulo}
                </option>
              ))}
            </select>
          </label>
        </div>
        {exemploAtual && <p className="text-[13px] leading-5 text-fg-2">{exemploAtual.descricao}</p>}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-mono text-xs text-fg-3">Operação (JSON enviado ao motor)</span>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            spellCheck={false}
            rows={22}
            className="field p-3 font-mono text-xs leading-5"
          />
        </label>
        <p className="text-xs leading-5 text-fg-3">
          Campos conforme <code>OperacaoInput</code> do motor 1.7.2. A partir de 2027 o motor exige{" "}
          <code>aliquotasNominais</code> por item; este app não sugere valores de alíquota.
        </p>
        <button
          type="submit"
          disabled={estado.kind === "enviando"}
          className="btn btn-primary self-start"
        >
          <Play aria-hidden="true" />
          {estado.kind === "enviando" ? "Enviando ao motor…" : "Simular"}
        </button>
      </form>

      <section aria-live="polite" aria-label="Resultado" className="flex min-w-0 flex-col gap-3">
        <Resultado estado={estado} />
      </section>
    </div>
  );
}

function Resultado({ estado }: { estado: Estado }) {
  if (estado.kind === "ocioso") {
    return <Vazio>O resultado aparece aqui depois do envio. Tudo que aparecer vem da resposta do motor.</Vazio>;
  }
  if (estado.kind === "enviando") {
    return <Vazio>Aguardando resposta do motor…</Vazio>;
  }
  if (estado.kind === "falha-rede") {
    return <Alerta titulo="Não foi possível falar com este app">{estado.mensagem}</Alerta>;
  }
  const { resultado, enviado } = estado;
  if (!resultado.ok) return <ErroSimulacao resultado={resultado} enviado={enviado} />;
  return <ResultadoSucesso resultado={resultado} />;
}

function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <div className="card border-dashed border-line-strong bg-transparent p-6 text-[13px] leading-5 text-fg-3">{children}</div>
  );
}
