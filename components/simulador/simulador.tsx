"use client";

import { Code2, ListChecks } from "lucide-react";
import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/base-path";
import { EXEMPLOS } from "@/lib/simulation/exemplos";
import {
  adicionarAoHistorico,
  lerHistorico,
  limparHistorico,
  removerDoHistorico,
  tituloDaRequisicao,
  type RegistroHistorico,
} from "@/lib/simulation/historico";
import type { SimulacaoResultado } from "@/lib/simulation/regime-regular";
import { Alerta, ErroSimulacao, ResultadoSucesso } from "../resultado-simulacao";
import { EditorDesenvolvedor } from "./editor-desenvolvedor";
import { FormularioGuiado } from "./formulario-guiado";
import { HistoricoPainel } from "./historico-painel";

type Modo = "guiado" | "desenvolvedor";

type Estado =
  | { kind: "ocioso" }
  | { kind: "enviando"; modo: Modo }
  | { kind: "resultado"; modo: Modo; resultado: SimulacaoResultado; enviado: string }
  | { kind: "falha-rede"; modo: Modo; mensagem: string };

/**
 * Página do simulador. Os dois modos usam a mesma função `enviar`, que chama
 * a mesma rota do BFF (/api/simular/regime-regular): não há caminho de
 * cálculo diferente entre eles.
 */
export function Simulador() {
  const [modo, setModo] = useState<Modo>("guiado");
  const [textoDev, setTextoDev] = useState(() => JSON.stringify(EXEMPLOS[0].operacao, null, 2));
  const [estado, setEstado] = useState<Estado>({ kind: "ocioso" });
  const [historico, setHistorico] = useState<RegistroHistorico[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- histórico vem do localStorage só no cliente
    setHistorico(lerHistorico());
  }, []);

  async function enviar(texto: string, origem: Modo) {
    setEstado({ kind: "enviando", modo: origem });
    try {
      const res = await fetch(withBasePath("/api/simular/regime-regular"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: texto,
      });
      const resultado = (await res.json()) as SimulacaoResultado;
      setEstado({ kind: "resultado", modo: origem, resultado, enviado: texto });
      if (resultado.ok) {
        setHistorico(
          adicionarAoHistorico({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            criadoEm: resultado.executadoEm,
            titulo: tituloDaRequisicao(texto),
            modo: origem,
            requisicao: texto,
            resposta: resultado.resposta,
            motor: resultado.motor.versao,
            warningDadosSimulados: resultado.warningDadosSimulados,
          }),
        );
      }
    } catch (error) {
      setEstado({ kind: "falha-rede", modo: origem, mensagem: error instanceof Error ? error.message : "falha desconhecida" });
    }
  }

  const resultadoDo = (m: Modo): React.ReactNode => {
    if (estado.kind === "ocioso" || estado.modo !== m) {
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
    let requisicao: Record<string, unknown> = {};
    try {
      requisicao = JSON.parse(r.requisicao);
    } catch {
      /* mantém vazio */
    }
    setModo("desenvolvedor");
    setTextoDev(r.requisicao);
    setEstado({
      kind: "resultado",
      modo: "desenvolvedor",
      enviado: r.requisicao,
      resultado: {
        ok: true,
        httpStatus: 200,
        requisicao,
        resposta: r.resposta as never,
        warningDadosSimulados: r.warningDadosSimulados,
        motor: { baseUrl: "", versao: r.motor },
        executadoEm: r.criadoEm,
      },
    });
  }

  const enviando = estado.kind === "enviando";

  return (
    <div className="flex flex-col gap-6">
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
        <FormularioGuiado
          enviando={enviando}
          aoSimular={(t) => void enviar(t, "guiado")}
          aoAbrirNoModoDev={(t) => {
            setTextoDev(t);
            setModo("desenvolvedor");
          }}
          resultado={resultadoDo("guiado")}
        />
      </div>
      <div role="tabpanel" hidden={modo !== "desenvolvedor"}>
        <EditorDesenvolvedor
          texto={textoDev}
          aoMudarTexto={setTextoDev}
          enviando={enviando}
          aoSimular={(t) => void enviar(t, "desenvolvedor")}
          resultado={resultadoDo("desenvolvedor")}
        />
      </div>

      <HistoricoPainel
        registros={historico}
        aoReabrir={reabrir}
        aoDuplicar={(r) => {
          setTextoDev(r.requisicao);
          setModo("desenvolvedor");
          setEstado({ kind: "ocioso" });
        }}
        aoRemover={(id) => setHistorico(removerDoHistorico(id))}
        aoLimpar={() => {
          limparHistorico();
          setHistorico([]);
        }}
      />
    </div>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <div className="card border-dashed border-line-strong bg-transparent p-6 text-[13px] leading-5 text-fg-3">{children}</div>;
}
