"use client";

import { useState } from "react";
import { EXEMPLOS } from "@/lib/simulation/exemplos";
import { extrairMemoriaCalculo } from "@/lib/simulation/memoria";
import type { SimulacaoResultado } from "@/lib/simulation/regime-regular";

type Estado =
  | { kind: "ocioso" }
  | { kind: "enviando" }
  | { kind: "resultado"; resultado: SimulacaoResultado; enviado: string }
  | { kind: "falha-rede"; mensagem: string };

const formatar = (valor: unknown) => JSON.stringify(valor, null, 2);

/** Rótulos dos estados de item documentados no upstream (docs/exemplos.md). */
const ESTADO_ITEM: Record<string, { rotulo: string; tom: string }> = {
  CALCULADO: { rotulo: "Calculado", tom: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" },
  CALCULO_SIMULADO: { rotulo: "Cálculo simulado", tom: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  INCONSISTENCIA_ENTRADA: { rotulo: "Inconsistência na entrada", tom: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
  NAO_IMPLEMENTADO: { rotulo: "Não implementado no motor", tom: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100" },
  FALHA_TECNICA: { rotulo: "Falha técnica", tom: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
};

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
      const res = await fetch("/api/simular/regime-regular", {
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

  const objetos = resultado.resposta.objetos;

  return (
    <>
      <div className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
          <dt className="text-zinc-500">Motor</dt>
          <dd className="font-mono">
            {resultado.motor.versao?.versaoApp ?? "versão não informada"} · base{" "}
            {resultado.motor.versao?.versaoDb ?? "—"} ({resultado.motor.versao?.dataVersaoDb ?? "—"})
          </dd>
          <dt className="text-zinc-500">Executado em</dt>
          <dd className="font-mono">{new Date(resultado.executadoEm).toLocaleString("pt-BR")}</dd>
          {resultado.warningDadosSimulados && (
            <>
              <dt className="text-zinc-500">Aviso do motor</dt>
              <dd>
                <code>x-warning-dados-simulados: {resultado.warningDadosSimulados}</code> — o motor indicou que há
                dados simulados neste resultado.
              </dd>
            </>
          )}
        </dl>
      </div>

      <ol className="space-y-3">
        {objetos.map((objeto) => (
          <ItemResultado key={objeto.nObj} objeto={objeto} />
        ))}
      </ol>

      {"total" in resultado.resposta && resultado.resposta.total !== undefined && (
        <details className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <summary className="cursor-pointer text-sm font-medium">Totais devolvidos pelo motor</summary>
          <p className="mt-2 text-xs text-zinc-500">Segundo o upstream, os totais somam apenas os itens calculados.</p>
          <Json valor={resultado.resposta.total} />
        </details>
      )}

      <Inspetor
        requisicao={resultado.requisicao}
        resposta={resultado.resposta}
        exportar={{
          ferramenta: "brasil-tax-playground",
          aviso: "Ferramenta independente, não oficial e não substitui orientação contábil ou tributária",
          executadoEm: resultado.executadoEm,
          motor: resultado.motor,
          warningDadosSimulados: resultado.warningDadosSimulados,
          requisicao: resultado.requisicao,
          resposta: resultado.resposta,
        }}
      />
    </>
  );
}

function ItemResultado({ objeto }: { objeto: { nObj: number; estadoItem: string; [k: string]: unknown } }) {
  const estado = ESTADO_ITEM[objeto.estadoItem] ?? { rotulo: objeto.estadoItem, tom: ESTADO_ITEM.NAO_IMPLEMENTADO.tom };
  const memoria = extrairMemoriaCalculo(objeto);
  const erros = Array.isArray(objeto.erros) ? (objeto.erros as Record<string, unknown>[]) : [];

  return (
    <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Item {objeto.nObj}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estado.tom}`}>{estado.rotulo}</span>
        <code className="text-xs text-zinc-500">{objeto.estadoItem}</code>
      </div>

      {erros.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm">
          {erros.map((erro, i) => (
            <li key={i} className="rounded-md bg-red-50 p-2 dark:bg-red-950/40">
              <p className="font-medium">
                {String(erro.code ?? "")} {erro.title ? `— ${String(erro.title)}` : ""}
              </p>
              {erro.detail !== undefined && <p>{String(erro.detail)}</p>}
              {erro.pointer !== undefined && <p className="font-mono text-xs text-zinc-500">{String(erro.pointer)}</p>}
            </li>
          ))}
        </ul>
      )}

      {memoria.length > 0 && (
        <div className="mt-3 space-y-1 text-sm">
          <p className="font-medium">Memória de cálculo (texto do motor)</p>
          <ul className="space-y-1 text-zinc-700 dark:text-zinc-300">
            {memoria.map((trecho, i) => (
              <li key={i}>
                <span className="font-mono text-xs text-zinc-500">
                  {trecho.grupo}
                  {trecho.tributo && `.${trecho.tributo}`}
                </span>{" "}
                {trecho.texto}
              </li>
            ))}
          </ul>
        </div>
      )}

      {"tribCalc" in objeto && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm">Valores do item (JSON do motor)</summary>
          <Json valor={objeto.tribCalc} />
        </details>
      )}
    </li>
  );
}

function ErroSimulacao({
  resultado,
  enviado,
}: {
  resultado: Extract<SimulacaoResultado, { ok: false }>;
  enviado: string;
}) {
  const { erro } = resultado;
  const titulos: Record<typeof erro.tipo, string> = {
    "json-invalido": "JSON inválido",
    validacao: "Operação inválida",
    "nao-configurado": "Motor não configurado",
    indisponivel: "Motor indisponível",
    "erro-do-motor": "O motor recusou a operação",
    contrato: "Resposta inesperada do motor",
    interno: "Erro interno",
  };

  return (
    <div className="space-y-3">
      <Alerta titulo={`${titulos[erro.tipo]} (HTTP ${resultado.httpStatus})`}>
        {erro.mensagem}
        {(erro.tipo === "nao-configurado" || erro.tipo === "indisponivel") &&
          " Nenhum valor é exibido sem o motor oficial."}
      </Alerta>
      {erro.tipo === "validacao" && (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {erro.problemas.map((p, i) => (
            <li key={i}>
              <code>{p.caminho}</code>: {p.mensagem}
            </li>
          ))}
        </ul>
      )}
      {(erro.tipo === "erro-do-motor" || erro.tipo === "contrato") && (
        <div>
          <p className="text-sm font-medium">
            Corpo devolvido pelo motor{erro.tipo === "erro-do-motor" ? ` (HTTP ${erro.statusMotor})` : ""}
          </p>
          <Json valor={erro.corpo} />
        </div>
      )}
      <details>
        <summary className="cursor-pointer text-sm">JSON enviado</summary>
        <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-zinc-50 p-3 font-mono text-xs dark:bg-zinc-950">
          {enviado}
        </pre>
      </details>
    </div>
  );
}

function Inspetor({ requisicao, resposta, exportar }: { requisicao: unknown; resposta: unknown; exportar: unknown }) {
  const [aba, setAba] = useState<"resposta" | "requisicao">("resposta");

  function baixar() {
    const blob = new Blob([formatar(exportar)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `simulacao-regime-regular-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 p-2 dark:border-zinc-800" role="tablist">
        {(["resposta", "requisicao"] as const).map((id) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`rounded-md px-3 py-1 text-sm ${aba === id ? "bg-zinc-200 font-semibold dark:bg-zinc-800" : "hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
          >
            {id === "resposta" ? "Resposta do motor" : "Requisição enviada"}
          </button>
        ))}
        <button
          type="button"
          onClick={baixar}
          className="ml-auto rounded-md border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Exportar JSON
        </button>
      </div>
      <div className="p-2" role="tabpanel">
        <Json valor={aba === "resposta" ? resposta : requisicao} />
      </div>
    </div>
  );
}

function Json({ valor }: { valor: unknown }) {
  return (
    <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-zinc-50 p-3 font-mono text-xs dark:bg-zinc-950">
      {typeof valor === "string" ? valor : formatar(valor)}
    </pre>
  );
}

function Alerta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm dark:border-red-800 dark:bg-red-950/40">
      <p className="font-semibold">{titulo}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}
