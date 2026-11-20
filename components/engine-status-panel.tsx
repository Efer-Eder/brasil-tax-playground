"use client";

import { useEffect, useState } from "react";
import type { EngineStatus } from "@/lib/tax-engine/types";

type PanelState = { kind: "carregando" } | { kind: "erro"; motivo: string } | { kind: "ok"; status: EngineStatus };

/**
 * Mostra se o motor oficial está configurado e respondendo. Nunca exibe
 * números de cálculo: apenas o estado da conexão e a versão devolvida pelo
 * próprio motor.
 */
export function EngineStatusPanel() {
  const [state, setState] = useState<PanelState>({ kind: "carregando" });

  async function load(signal?: AbortSignal) {
    setState({ kind: "carregando" });
    try {
      const res = await fetch("/api/engine/status", { cache: "no-store", signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState({ kind: "ok", status: (await res.json()) as EngineStatus });
    } catch (error) {
      if (signal?.aborted) return;
      setState({
        kind: "erro",
        motivo: error instanceof Error ? error.message : "falha desconhecida",
      });
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial do estado do motor
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  return (
    <section
      aria-labelledby="engine-status-title"
      aria-live="polite"
      className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="engine-status-title" className="text-lg font-semibold">
          Motor oficial — regime regular
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Verificar novamente
        </button>
      </div>
      <div className="mt-3 text-sm">
        <StatusBody state={state} />
      </div>
    </section>
  );
}

function StatusBody({ state }: { state: PanelState }) {
  if (state.kind === "carregando") {
    return <p className="text-zinc-500">Verificando…</p>;
  }
  if (state.kind === "erro") {
    return <Badge tone="red" label="Erro">Não foi possível consultar o estado do motor ({state.motivo}).</Badge>;
  }

  const { status } = state;
  switch (status.state) {
    case "nao-configurado":
      return (
        <Badge tone="zinc" label="Não configurado">
          {status.motivo} Enquanto isso, nenhuma simulação é feita e nenhum valor é exibido.
        </Badge>
      );
    case "indisponivel":
      return (
        <Badge tone="red" label="Indisponível">
          {status.motivo} Nenhum cálculo alternativo é usado no lugar do motor.
        </Badge>
      );
    case "disponivel":
      return (
        <div className="space-y-2">
          <Badge tone="green" label="Disponível">
            Respondendo em <code className="font-mono">{status.baseUrl}</code>.
          </Badge>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-zinc-700 dark:text-zinc-300">
            <dt>Versão do app</dt>
            <dd className="font-mono">{status.versao.versaoApp ?? "—"}</dd>
            <dt>Versão da base</dt>
            <dd className="font-mono">{status.versao.versaoDb ?? "—"}</dd>
            <dt>Data da base</dt>
            <dd className="font-mono">{status.versao.dataVersaoDb ?? "—"}</dd>
            <dt>Ambiente</dt>
            <dd className="font-mono">{status.versao.ambiente ?? "—"}</dd>
          </dl>
        </div>
      );
  }
}

const TONES = {
  zinc: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100",
  red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  green: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
} as const;

function Badge({ tone, label, children }: { tone: keyof typeof TONES; label: string; children: React.ReactNode }) {
  return (
    <p>
      <span className={`mr-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{label}</span>
      {children}
    </p>
  );
}
