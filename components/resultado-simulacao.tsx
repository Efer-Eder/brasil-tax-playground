"use client";

import { Download, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { extrairMemoriaCalculo } from "@/lib/simulation/memoria";
import type { SimulacaoResultado } from "@/lib/simulation/regime-regular";

const formatar = (valor: unknown) => JSON.stringify(valor, null, 2);

/** Rótulos dos estados de item documentados no upstream (docs/exemplos.md). */
const ESTADO_ITEM: Record<string, { rotulo: string; classe: string }> = {
  CALCULADO: { rotulo: "Calculado", classe: "badge ok" },
  CALCULO_SIMULADO: { rotulo: "Cálculo simulado", classe: "badge warn" },
  INCONSISTENCIA_ENTRADA: { rotulo: "Inconsistência na entrada", classe: "badge bad" },
  NAO_IMPLEMENTADO: { rotulo: "Não implementado no motor", classe: "badge" },
  FALHA_TECNICA: { rotulo: "Falha técnica", classe: "badge bad" },
};

/** Resultado de sucesso: tudo o que é exibido vem de `resultado` (resposta do motor). */
export function ResultadoSucesso({ resultado }: { resultado: Extract<SimulacaoResultado, { ok: true }> }) {
  const objetos = resultado.resposta.objetos;
  const versao = resultado.motor.versao;

  return (
    <>
      <div className="card p-5">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-[13px]">
          <dt className="font-mono text-xs text-fg-3">motor</dt>
          <dd className="font-mono">
            {versao?.versaoApp ?? "versão não informada"} · base {versao?.versaoDb ?? "n/d"} ({versao?.dataVersaoDb ?? "n/d"})
          </dd>
          <dt className="font-mono text-xs text-fg-3">executado em</dt>
          <dd className="font-mono">{new Date(resultado.executadoEm).toLocaleString("pt-BR")}</dd>
          {resultado.warningDadosSimulados && (
            <>
              <dt className="font-mono text-xs text-fg-3">aviso do motor</dt>
              <dd className="text-fg-2">
                <span className="badge warn">x-warning-dados-simulados: {resultado.warningDadosSimulados}</span>{" "}
                O motor marcou este resultado como dados simulados.
              </dd>
            </>
          )}
        </dl>
      </div>

      <ol className="flex flex-col gap-3">
        {objetos.map((objeto) => (
          <ItemResultado key={objeto.nObj} objeto={objeto} />
        ))}
      </ol>

      {"total" in resultado.resposta && resultado.resposta.total !== undefined && (
        <details className="card group p-5">
          <summary className="cursor-pointer text-sm font-medium">Totais devolvidos pelo motor</summary>
          <p className="mt-2 text-xs text-fg-3">Segundo o upstream, os totais somam apenas os itens calculados.</p>
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
  const estado = ESTADO_ITEM[objeto.estadoItem] ?? { rotulo: objeto.estadoItem, classe: "badge" };
  const memoria = extrairMemoriaCalculo(objeto);
  const erros = Array.isArray(objeto.erros) ? (objeto.erros as Record<string, unknown>[]) : [];

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-semibold tracking-[-0.01em]">Item {objeto.nObj}</span>
        <span className={estado.classe}>{estado.rotulo}</span>
        <code className="font-mono text-xs text-fg-3">{objeto.estadoItem}</code>
      </div>

      {erros.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2 text-[13px]">
          {erros.map((erro, i) => (
            <li key={i} className="rounded-md border border-[rgba(224,100,106,0.24)] bg-[var(--danger-subtle)] p-3">
              <p className="font-medium">
                <span className="font-mono">{String(erro.code ?? "")}</span>
                {erro.title ? `: ${String(erro.title)}` : ""}
              </p>
              {erro.detail !== undefined && <p className="mt-1 text-fg-2">{String(erro.detail)}</p>}
              {erro.pointer !== undefined && <p className="mt-1 font-mono text-xs text-fg-3">{String(erro.pointer)}</p>}
            </li>
          ))}
        </ul>
      )}

      {memoria.length > 0 && (
        <div className="mt-4 text-[13px] leading-5">
          <p className="font-mono text-xs text-fg-3">memória de cálculo (texto do motor)</p>
          <ul className="mt-2 flex flex-col gap-2 border-l border-line-strong pl-3 text-fg-2">
            {memoria.map((trecho, i) => (
              <li key={i}>
                <span className="font-mono text-xs text-accent-text">
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
        <details className="mt-4">
          <summary className="cursor-pointer text-[13px] text-fg-2 hover:text-fg-1">Valores do item (JSON do motor)</summary>
          <Json valor={objeto.tribCalc} />
        </details>
      )}
    </li>
  );
}

export function ErroSimulacao({
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
    "limite-itens": "Operação grande demais para esta instância",
    ocupado: "Instância ocupada",
    "nao-configurado": "Motor não configurado",
    indisponivel: "Motor indisponível",
    "erro-do-motor": "O motor recusou a operação",
    contrato: "Resposta inesperada do motor",
    interno: "Erro interno",
  };

  return (
    <div className="flex flex-col gap-3">
      <Alerta titulo={`${titulos[erro.tipo]} (HTTP ${resultado.httpStatus})`}>
        {erro.mensagem}
        {(erro.tipo === "nao-configurado" || erro.tipo === "indisponivel") && " Nenhum valor é exibido sem o motor oficial."}
      </Alerta>
      {erro.tipo === "validacao" && (
        <ul className="card flex flex-col gap-1.5 p-5 text-[13px]">
          {erro.problemas.map((p, i) => (
            <li key={i}>
              <code className="font-mono text-accent-text">{p.caminho}</code>: <span className="text-fg-2">{p.mensagem}</span>
            </li>
          ))}
        </ul>
      )}
      {(erro.tipo === "erro-do-motor" || erro.tipo === "contrato") && (
        <div className="card p-5">
          <p className="font-mono text-xs text-fg-3">
            corpo devolvido pelo motor{erro.tipo === "erro-do-motor" ? ` (HTTP ${erro.statusMotor})` : ""}
          </p>
          <Json valor={erro.corpo} />
        </div>
      )}
      <details className="card p-5">
        <summary className="cursor-pointer text-[13px] text-fg-2 hover:text-fg-1">JSON enviado</summary>
        <pre className="code mt-3 max-h-80">{enviado}</pre>
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
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b border-line-subtle bg-[rgba(17,18,21,0.72)] p-2" role="tablist">
        {(["resposta", "requisicao"] as const).map((id) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${aba === id ? "bg-surface-3 text-fg-1" : "text-fg-2 hover:bg-[var(--surface-hover)] hover:text-fg-1"}`}
          >
            {id === "resposta" ? "Resposta do motor" : "Requisição enviada"}
          </button>
        ))}
        <button type="button" onClick={baixar} className="btn btn-secondary btn-sm ml-auto">
          <Download aria-hidden="true" />
          Exportar JSON
        </button>
      </div>
      <div className="p-3" role="tabpanel">
        <Json valor={aba === "resposta" ? resposta : requisicao} />
      </div>
    </div>
  );
}

function Json({ valor }: { valor: unknown }) {
  return <pre className="code mt-3 max-h-96">{typeof valor === "string" ? valor : formatar(valor)}</pre>;
}

export function Alerta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div role="alert" className="card flex gap-3 border-[rgba(224,100,106,0.24)] bg-[#1a1213] p-5 text-[13px] leading-5">
      <TriangleAlert className="mt-0.5 h-4 w-4 flex-none text-bad" aria-hidden="true" />
      <div>
        <p className="font-semibold text-fg-1">{titulo}</p>
        <p className="mt-1 text-fg-2">{children}</p>
      </div>
    </div>
  );
}
