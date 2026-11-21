"use client";

import { Code2, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { EXEMPLOS } from "@/lib/simulation/exemplos";
import { EXEMPLOS_SIMPLES } from "@/lib/simulation/exemplos-simples";
import {
  adicionarAoHistorico,
  lerHistorico,
  limparHistorico,
  removerDoHistorico,
  tituloDaRequisicao,
  type RegistroHistorico,
} from "@/lib/simulation/historico";
import type { MotorCalculo, SimulacaoResultado } from "@/lib/simulation/regime-regular";
import { ENGINES, type EngineId } from "@/lib/tax-engine";
import { Alerta, ErroSimulacao, ResultadoSucesso } from "../resultado-simulacao";
import { DanfsePainel } from "./danfse-painel";
import { EditorDesenvolvedor } from "./editor-desenvolvedor";
import { FormularioGuiado } from "./formulario-guiado";
import { FormularioSimples } from "./formulario-simples";
import { HistoricoPainel } from "./historico-painel";

type Modo = "guiado" | "desenvolvedor";

type Estado =
  | { kind: "ocioso" }
  | { kind: "enviando"; modo: Modo; motor: MotorCalculo }
  | { kind: "resultado"; modo: Modo; motor: MotorCalculo; resultado: SimulacaoResultado; enviado: string }
  | { kind: "falha-rede"; modo: Modo; motor: MotorCalculo; mensagem: string };

const EXEMPLOS_DO_MOTOR = { "regime-regular": EXEMPLOS, "simples-nacional": EXEMPLOS_SIMPLES } as const;

/**
 * Página do simulador. Escolhido o motor, os dois modos usam a mesma função
 * `enviar`, que chama a mesma rota do BFF (/api/simular/<motor>): não há
 * caminho de cálculo diferente entre eles. O DANFSe tem painel próprio
 * (entra XML, sai PDF).
 */
export function Simulador() {
  const [motor, setMotor] = useState<EngineId>("regime-regular");
  const [modo, setModo] = useState<Modo>("guiado");
  const [textoDev, setTextoDev] = useState<Record<MotorCalculo, string>>(() => ({
    "regime-regular": JSON.stringify(EXEMPLOS[0].operacao, null, 2),
    "simples-nacional": JSON.stringify(EXEMPLOS_SIMPLES[0].operacao, null, 2),
  }));
  const [estado, setEstado] = useState<Estado>({ kind: "ocioso" });
  const [historico, setHistorico] = useState<RegistroHistorico[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- histórico vem do localStorage só no cliente
    setHistorico(lerHistorico());
  }, []);

  async function enviar(texto: string, origem: Modo, alvo: MotorCalculo) {
    setEstado({ kind: "enviando", modo: origem, motor: alvo });
    try {
      const res = await fetch(withBasePath(`/api/simular/${alvo}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: texto,
      });
      const resultado = (await res.json()) as SimulacaoResultado;
      setEstado({ kind: "resultado", modo: origem, motor: alvo, resultado, enviado: texto });
      if (resultado.ok) {
        setHistorico(
          adicionarAoHistorico({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            criadoEm: resultado.executadoEm,
            titulo: tituloDaRequisicao(texto),
            modo: origem,
            engine: alvo,
            requisicao: texto,
            resposta: resultado.resposta,
            motor: resultado.motor.versao,
            warningDadosSimulados: resultado.warningDadosSimulados,
          }),
        );
      }
    } catch (error) {
      setEstado({
        kind: "falha-rede",
        modo: origem,
        motor: alvo,
        mensagem: error instanceof Error ? error.message : "falha desconhecida",
      });
    }
  }

  const resultadoDo = (m: Modo, alvo: MotorCalculo): React.ReactNode => {
    if (estado.kind === "ocioso" || estado.modo !== m || estado.motor !== alvo) {
      return m === "desenvolvedor" ? <Vazio>O resultado aparece aqui depois do envio. Tudo que aparecer vem da resposta do motor.</Vazio> : null;
    }
    if (estado.kind === "enviando") return <Vazio>Aguardando resposta do motor…</Vazio>;
    if (estado.kind === "falha-rede") return <Alerta titulo="Não foi possível falar com este app">{estado.mensagem}</Alerta>;
    return estado.resultado.ok ? (
      <ResultadoSucesso resultado={estado.resultado} />
    ) : (
      <ErroSimulacao resultado={estado.resultado} enviado={estado.enviado} />
    );
  };

  function reabrir(r: RegistroHistorico) {
    const alvo: MotorCalculo = r.engine ?? "regime-regular";
    let requisicao: Record<string, unknown> = {};
    try {
      requisicao = JSON.parse(r.requisicao);
    } catch {
      /* mantém vazio */
    }
    setMotor(alvo);
    setModo("desenvolvedor");
    setTextoDev((t) => ({ ...t, [alvo]: r.requisicao }));
    setEstado({
      kind: "resultado",
      modo: "desenvolvedor",
      motor: alvo,
      enviado: r.requisicao,
      resultado: {
        ok: true,
        httpStatus: 200,
        engine: alvo,
        requisicao,
        resposta: r.resposta as never,
        warningDadosSimulados: r.warningDadosSimulados,
        motor: { baseUrl: "", versao: r.motor },
        executadoEm: r.criadoEm,
      },
    });
  }

  const enviando = estado.kind === "enviando";
  const motorCalculo: MotorCalculo | null = motor === "danfse" ? null : motor;

  return (
    <div className="flex flex-col gap-6">
      <SeletorMotor motor={motor} aoMudar={setMotor} />

      {motorCalculo === null ? (
        <DanfsePainel />
      ) : (
        <>
          <div role="tablist" aria-label="Modo de uso" className="inline-flex w-fit gap-1 rounded-lg border border-line bg-surface-1 p-1">
            {(
              [
                ["guiado", "Guiado", ListChecks],
                ["desenvolvedor", "Desenvolvedor (JSON)", Code2],
              ] as const
            ).map(([id, rotulo, Icone]) => (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={modo === id}
                onClick={() => setModo(id)}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium ${
                  modo === id ? "bg-surface-3 text-fg-1" : "text-fg-2 hover:bg-[var(--surface-hover)] hover:text-fg-1"
                }`}
              >
                <Icone className="h-4 w-4" aria-hidden="true" />
                {rotulo}
              </button>
            ))}
          </div>

          <div role="tabpanel" hidden={modo !== "guiado"}>
            {motorCalculo === "regime-regular" ? (
              <FormularioGuiado
                enviando={enviando}
                aoSimular={(t) => void enviar(t, "guiado", "regime-regular")}
                aoAbrirNoModoDev={(t) => {
                  setTextoDev((x) => ({ ...x, "regime-regular": t }));
                  setModo("desenvolvedor");
                }}
                resultado={resultadoDo("guiado", "regime-regular")}
              />
            ) : (
              <FormularioSimples
                enviando={enviando}
                aoSimular={(t) => void enviar(t, "guiado", "simples-nacional")}
                aoAbrirNoModoDev={(t) => {
                  setTextoDev((x) => ({ ...x, "simples-nacional": t }));
                  setModo("desenvolvedor");
                }}
                resultado={resultadoDo("guiado", "simples-nacional")}
              />
            )}
          </div>
          <div role="tabpanel" hidden={modo !== "desenvolvedor"}>
            <EditorDesenvolvedor
              key={motorCalculo}
              motor={motorCalculo}
              exemplos={[...EXEMPLOS_DO_MOTOR[motorCalculo]]}
              texto={textoDev[motorCalculo]}
              aoMudarTexto={(t) => setTextoDev((x) => ({ ...x, [motorCalculo]: t }))}
              enviando={enviando}
              aoSimular={(t) => void enviar(t, "desenvolvedor", motorCalculo)}
              resultado={resultadoDo("desenvolvedor", motorCalculo)}
            />
          </div>

          <HistoricoPainel
            registros={historico}
            aoReabrir={reabrir}
            aoDuplicar={(r) => {
              const alvo: MotorCalculo = r.engine ?? "regime-regular";
              setMotor(alvo);
              setTextoDev((x) => ({ ...x, [alvo]: r.requisicao }));
              setModo("desenvolvedor");
              setEstado({ kind: "ocioso" });
            }}
            aoRemover={(id) => setHistorico(removerDoHistorico(id))}
            aoLimpar={() => {
              limparHistorico();
              setHistorico([]);
            }}
          />
        </>
      )}
    </div>
  );
}

/** Escolha do motor oficial. Só aparece como disponível o que está integrado e testado aqui. */
function SeletorMotor({ motor, aoMudar }: { motor: EngineId; aoMudar: (m: EngineId) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 text-[13px] font-medium text-fg-2">Qual motor oficial vai responder?</legend>
      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Motor">
        {ENGINES.map((e) => {
          const ativo = e.stage === "em-integracao";
          const escolhido = motor === e.id;
          return (
            <button
              key={e.id}
              type="button"
              role="radio"
              aria-checked={escolhido}
              disabled={!ativo}
              onClick={() => aoMudar(e.id)}
              className={`rounded-md border p-4 text-left transition-colors ${
                escolhido
                  ? "border-accent bg-[var(--accent-subtle)]"
                  : ativo
                    ? "border-line hover:border-line-strong hover:bg-[var(--surface-hover)]"
                    : "border-line-subtle opacity-60"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold">{e.nome.replace("Calculadora RTC · ", "")}</span>
                <span className={ativo ? "badge ok" : "badge"}>{ativo ? "Disponível" : "Planejado"}</span>
              </span>
              <span className="mt-2 block text-xs leading-4 text-fg-2">{e.descricao}</span>
              <span className="mt-2 block font-mono text-[11px] text-fg-3">{e.upstreamReferencia}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <div className="card border-dashed border-line-strong bg-transparent p-6 text-[13px] leading-5 text-fg-3">{children}</div>;
}
