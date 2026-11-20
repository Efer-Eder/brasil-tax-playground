"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/base-path";
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
      const res = await fetch(withBasePath("/api/engine/status"), { cache: "no-store", signal });
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
    <div aria-labelledby="engine-status-title" aria-live="polite" className="card overflow-hidden">
      <div className="flex h-10 items-center justify-between gap-3 border-b border-line-subtle bg-[rgba(17,18,21,0.72)] px-4 font-mono text-[11px] text-fg-3">
        <span id="engine-status-title">motor oficial · regime regular</span>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-fg-2 hover:bg-[var(--surface-hover)] hover:text-fg-1"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Verificar novamente
        </button>
      </div>
      <div className="p-5 text-sm">
        <StatusBody state={state} />
      </div>
    </div>
  );
}

function StatusBody({ state }: { state: PanelState }) {
  if (state.kind === "carregando") {
    return <p className="text-fg-3">Consultando o motor…</p>;
  }
  if (state.kind === "erro") {
    return (
      <Linha classe="badge bad" rotulo="Erro">
        Não foi possível consultar o estado do motor ({state.motivo}).
      </Linha>
    );
  }

  const { status } = state;
  switch (status.state) {
    case "nao-configurado":
      return (
        <Linha classe="badge" rotulo="Não configurado">
          {status.motivo} Sem motor, nenhuma simulação roda e nenhum valor aparece.
        </Linha>
      );
    case "indisponivel":
      return (
        <Linha classe="badge bad" rotulo="Indisponível">
          {status.motivo} Não existe cálculo alternativo no lugar do motor.
        </Linha>
      );
    case "disponivel":
      return (
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
          <Linha classe="badge ok" rotulo="Disponível">
            Respondendo agora. Os números abaixo são os que o próprio motor informa.
          </Linha>
          <dl className="grid grid-cols-4 gap-x-8 gap-y-1 max-sm:grid-cols-2">
            <Dado rotulo="versão do app" valor={status.versao.versaoApp} />
            <Dado rotulo="versão da base" valor={status.versao.versaoDb} />
            <Dado rotulo="data da base" valor={status.versao.dataVersaoDb} />
            <Dado rotulo="ambiente" valor={status.versao.ambiente} />
          </dl>
        </div>
      );
  }
}

function Linha({ classe, rotulo, children }: { classe: string; rotulo: string; children: React.ReactNode }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-fg-2">
      <span className={classe}>
        {classe.includes("ok") && <span className="dot" aria-hidden="true" style={{ boxShadow: "none" }} />}
        {rotulo}
      </span>
      <span>{children}</span>
    </p>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor?: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] leading-3 tracking-[0.04em] text-fg-3 uppercase">{rotulo}</dt>
      <dd className="font-mono text-base font-medium tabular-nums">{valor ?? "n/d"}</dd>
    </div>
  );
}
