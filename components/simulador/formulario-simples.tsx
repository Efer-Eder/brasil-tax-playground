"use client";

import { ArrowLeft, ArrowRight, Code2, Play, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ANEXOS,
  ANEXOS_COM_ISS,
  ehNfse,
  montarPayloadSimples,
  novaOperacaoSimples,
  novoItemSimples,
  TIPOS_DOCUMENTO_SN,
  validarOperacaoSimples,
  type Anexo,
  type AnexoGuiado,
  type ItemSimples,
  type OperacaoSimples,
  type ProblemaCampo,
} from "@/lib/simulation/guiado-simples";
import { campo, MOTOR_SIMPLES_DO_CONTRATO, type NomeSchema } from "@/lib/tax-engine/contrato";
import { Passos, Revisao, Titulo } from "./assistente";
import { CampoSelect, CampoTexto, GrupoOpcional, type OpcaoSelect } from "./campos";
import { useDadosAbertos, type SituacaoTributaria } from "./usar-dados-abertos";

const ETAPAS = ["Operação", "Alíquotas", "Itens", "Revisão", "Resultado"] as const;
type Etapa = 1 | 2 | 3 | 4 | 5;

const OP = "OperacaoSimplesNaoAssistidaInput" as const;
const ITEM = "ItemSimplesUnificadoInput" as const;
const ALIQ = "AliquotasEfetivasInput" as const;

/** Etapa em que cada campo aparece (para mostrar erros e voltar a ela). */
function etapaDoCampo(caminho: string): Etapa {
  if (caminho.startsWith("aliquotasEfetivas")) return 2;
  if (caminho.startsWith("itens")) return 3;
  return 1;
}

/** Opções escritas na descrição do campo pelo próprio motor. */
function opcoesDoContrato(schema: NomeSchema, nome: string): OpcaoSelect[] {
  return campo(schema, nome).opcoes.map((o) => ({ valor: String(o.valor), rotulo: `${o.valor} · ${o.rotulo}` }));
}

interface Atividade {
  codigo: string;
  descricao: string;
  rotuloAnexo: string;
  admissivelNoDocumento?: boolean;
  compativelComClassTrib?: boolean;
  disponivel: boolean;
}

interface Props {
  enviando: boolean;
  aoSimular: (texto: string) => void;
  aoAbrirNoModoDev: (texto: string) => void;
  resultado: React.ReactNode | null;
}

/**
 * Formulário guiado do Simples Nacional. Gera o mesmo JSON do modo
 * desenvolvedor e envia pelo mesmo caminho (/api/simular/simples-nacional).
 */
export function FormularioSimples({ enviando, aoSimular, aoAbrirNoModoDev, resultado }: Props) {
  const [etapa, setEtapa] = useState<Etapa>(1);
  const [op, setOp] = useState<OperacaoSimples>(() => novaOperacaoSimples());
  const [mostrarErros, setMostrarErros] = useState<Record<number, boolean>>({});

  const texto = useMemo(() => JSON.stringify(montarPayloadSimples(op), null, 2), [op]);
  const problemas = useMemo(() => validarOperacaoSimples(op), [op]);
  const erro = (caminho: string) =>
    mostrarErros[etapaDoCampo(caminho)] ? problemas.find((p) => p.caminho === caminho)?.mensagem : undefined;

  function avancar() {
    if (etapa <= 3 && problemas.some((p: ProblemaCampo) => etapaDoCampo(p.caminho) === etapa)) {
      setMostrarErros((m) => ({ ...m, [etapa]: true }));
      return;
    }
    setEtapa((e) => Math.min(5, e + 1) as Etapa);
  }

  function simular() {
    if (problemas.length) {
      setMostrarErros({ 1: true, 2: true, 3: true });
      return;
    }
    aoSimular(texto);
    setEtapa(5);
  }

  const atualizar = (parcial: Partial<OperacaoSimples>) => setOp((o) => ({ ...o, ...parcial }));
  const atualizarItem = (i: number, parcial: Partial<ItemSimples>) =>
    setOp((o) => ({ ...o, itens: o.itens.map((it, k) => (k === i ? { ...it, ...parcial } : it)) }));
  const atualizarAnexo = (a: Anexo, parcial: Partial<AnexoGuiado>) =>
    setOp((o) => ({ ...o, anexos: { ...o.anexos, [a]: { ...o.anexos[a], ...parcial } } }));

  return (
    <div className="card overflow-hidden">
      <Passos etapas={ETAPAS} etapa={etapa} irPara={(e) => setEtapa(e as Etapa)} />
      <div className="p-6 max-sm:p-4">
        {etapa === 1 && <EtapaOperacao op={op} atualizar={atualizar} erro={erro} />}
        {etapa === 2 && <EtapaAliquotas op={op} atualizar={atualizar} atualizarAnexo={atualizarAnexo} erro={erro} />}
        {etapa === 3 && (
          <EtapaItens
            op={op}
            erro={erro}
            atualizarItem={atualizarItem}
            adicionar={() => setOp((o) => ({ ...o, itens: [...o.itens, novoItemSimples(o.itens.length + 1)] }))}
            remover={(i) =>
              setOp((o) => ({ ...o, itens: o.itens.filter((_, k) => k !== i).map((it, k) => ({ ...it, numero: k + 1 })) }))
            }
          />
        )}
        {etapa === 4 && <Revisao problemas={problemas} texto={texto} aoClicarProblema={(p) => setEtapa(etapaDoCampo(p.caminho))} />}
        {etapa === 5 && (
          <div className="flex flex-col gap-3">
            {resultado ?? <p className="text-[13px] text-fg-3">Envie a operação na etapa de revisão.</p>}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line-subtle pt-4">
          {etapa > 1 && etapa < 5 && (
            <button type="button" className="btn btn-ghost" onClick={() => setEtapa((e) => (e - 1) as Etapa)}>
              <ArrowLeft aria-hidden="true" />
              Voltar
            </button>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            {etapa === 4 && (
              <button type="button" className="btn btn-secondary" onClick={() => aoAbrirNoModoDev(texto)}>
                <Code2 aria-hidden="true" />
                Abrir no modo desenvolvedor
              </button>
            )}
            {etapa < 4 && (
              <button type="button" className="btn btn-primary" onClick={avancar}>
                Próximo
                <ArrowRight aria-hidden="true" />
              </button>
            )}
            {etapa === 4 && (
              <button type="button" className="btn btn-primary" onClick={simular} disabled={enviando}>
                <Play aria-hidden="true" />
                {enviando ? "Enviando ao motor…" : "Simular"}
              </button>
            )}
            {etapa === 5 && (
              <>
                <button type="button" className="btn btn-secondary" onClick={() => setEtapa(3)}>
                  Editar a operação
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setOp(novaOperacaoSimples());
                    setMostrarErros({});
                    setEtapa(1);
                  }}
                >
                  Nova simulação
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EtapaOperacao({
  op,
  atualizar,
  erro,
}: {
  op: OperacaoSimples;
  atualizar: (p: Partial<OperacaoSimples>) => void;
  erro: (c: string) => string | undefined;
}) {
  const nfse = ehNfse(op);
  return (
    <>
      <Titulo titulo="Documento e regime">
        O motor do Simples Nacional ({MOTOR_SIMPLES_DO_CONTRATO.versaoApp}, base {MOTOR_SIMPLES_DO_CONTRATO.versaoDb}) recebe o
        regime no vocabulário do documento: CRT nos documentos com CRT, opção pelo Simples na NFS-e.
      </Titulo>
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoTexto rotulo="Data do fato gerador" contrato={[OP, "data"]} tipo="date" valor={op.data} aoMudar={(v) => atualizar({ data: v })} erro={erro("data")} obrigatorio />
        <CampoSelect
          rotulo="Tipo de documento (tpDoc)"
          contrato={[OP, "tpDoc"]}
          obrigatorio
          valor={op.tpDoc}
          aoMudar={(v) => atualizar({ tpDoc: v, itens: v === "91" ? op.itens.slice(0, 1) : op.itens })}
          opcoes={TIPOS_DOCUMENTO_SN.map((d) => ({ valor: d.valor, rotulo: `${d.valor} · ${d.rotulo}` }))}
          erro={erro("tpDoc")}
          className="sm:col-span-2"
        />
        {op.tpDoc && !nfse && (
          <>
            <CampoSelect rotulo="CRT" contrato={[OP, "CRT"]} obrigatorio valor={op.CRT} aoMudar={(v) => atualizar({ CRT: v })} opcoes={opcoesDoContrato(OP, "CRT")} erro={erro("CRT")} />
            <CampoSelect
              rotulo="Regime do IBS e da CBS (tpRegimeIBSCBS)"
              contrato={[OP, "tpRegimeIBSCBS"]}
              valor={op.tpRegimeIBSCBS}
              aoMudar={(v) => atualizar({ tpRegimeIBSCBS: v })}
              vazio="Não informar"
              opcoes={opcoesDoContrato(OP, "tpRegimeIBSCBS")}
              className="sm:col-span-2"
            />
          </>
        )}
        {nfse && (
          <>
            <CampoSelect rotulo="Opção pelo Simples (opSimpNac)" contrato={[OP, "opSimpNac"]} obrigatorio valor={op.opSimpNac} aoMudar={(v) => atualizar({ opSimpNac: v })} opcoes={opcoesDoContrato(OP, "opSimpNac")} erro={erro("opSimpNac")} />
            <CampoSelect rotulo="Apuração do IBS e da CBS (regApIBSCBSSN)" contrato={[OP, "regApIBSCBSSN"]} valor={op.regApIBSCBSSN} aoMudar={(v) => atualizar({ regApIBSCBSSN: v })} vazio="Não informar" opcoes={opcoesDoContrato(OP, "regApIBSCBSSN")} />
            <CampoSelect rotulo="Apuração dos tributos (regApTribSN)" contrato={[OP, "regApTribSN"]} valor={op.regApTribSN} aoMudar={(v) => atualizar({ regApTribSN: v })} vazio="Não informar" opcoes={opcoesDoContrato(OP, "regApTribSN")} />
          </>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <GrupoOpcional
          titulo="Compra governamental (tpEnteGov)"
          descricao={campo(OP, "tpEnteGov").descricao}
          ligado={op.usarCompraGov}
          aoMudar={(v) => atualizar({ usarCompraGov: v })}
        >
          <CampoSelect rotulo="Tipo de ente" ajuda="" valor={op.tpEnteGov} aoMudar={(v) => atualizar({ tpEnteGov: v })} opcoes={opcoesDoContrato(OP, "tpEnteGov")} erro={erro("tpEnteGov")} />
        </GrupoOpcional>
        <details className="rounded-md border border-line-subtle">
          <summary className="cursor-pointer p-3 text-[13px] text-fg-2 hover:text-fg-1">Identificação (id e versão)</summary>
          <div className="grid gap-3 border-t border-line-subtle p-3 sm:grid-cols-2">
            <CampoTexto rotulo="id" contrato={[OP, "id"]} valor={op.id} aoMudar={(v) => atualizar({ id: v })} mono />
            <CampoTexto rotulo="versao" contrato={[OP, "versao"]} valor={op.versao} aoMudar={(v) => atualizar({ versao: v })} mono />
          </div>
        </details>
      </div>
    </>
  );
}

const BOOLEANO: OpcaoSelect[] = [
  { valor: "true", rotulo: "true" },
  { valor: "false", rotulo: "false" },
];

function EtapaAliquotas({
  op,
  atualizar,
  atualizarAnexo,
  erro,
}: {
  op: OperacaoSimples;
  atualizar: (p: Partial<OperacaoSimples>) => void;
  atualizarAnexo: (a: Anexo, p: Partial<AnexoGuiado>) => void;
  erro: (c: string) => string | undefined;
}) {
  return (
    <>
      <Titulo titulo="Alíquotas efetivas do contribuinte">
        {campo(OP, "aliquotasEfetivas").descricao}. Esta aplicação não fornece nem calcula alíquotas: informe a linha do
        contribuinte no período, em pontos percentuais. Marque só os anexos que vai usar; o motor escolhe o anexo e o par de
        cada item.
      </Titulo>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelect rotulo="Fator r (fatorR)" contrato={[ALIQ, "fatorR"]} valor={op.fatorR} aoMudar={(v) => atualizar({ fatorR: v as OperacaoSimples["fatorR"] })} vazio="Não informar" opcoes={BOOLEANO} />
        <CampoSelect rotulo="Impedimento pelo sublimite" contrato={[ALIQ, "impedimentoSublimite"]} valor={op.impedimentoSublimite} aoMudar={(v) => atualizar({ impedimentoSublimite: v as OperacaoSimples["impedimentoSublimite"] })} vazio="Não informar" opcoes={BOOLEANO} />
      </div>
      <div className="mt-4 flex flex-col gap-3">
        {ANEXOS.map((a) => {
          const g = op.anexos[a];
          const comIss = ANEXOS_COM_ISS.includes(a);
          const schemaPar = comIss ? "AnexoComIssInput" : "AnexoParUnicoInput";
          return (
            <GrupoOpcional key={a} titulo={`Anexo ${a.replace("anexo", "")} (${a})`} descricao={campo(ALIQ, a).descricao} ligado={g.usar} aoMudar={(v) => atualizarAnexo(a, { usar: v })}>
              <CampoTexto rotulo="pCBSSN (%)" contrato={[schemaPar, "pCBSSN"]} modo="decimal" valor={g.pCBSSN} aoMudar={(v) => atualizarAnexo(a, { pCBSSN: v })} erro={erro(`aliquotasEfetivas.${a}.pCBSSN`)} mono />
              <CampoTexto rotulo="pIBSSN (%)" contrato={[schemaPar, "pIBSSN"]} modo="decimal" valor={g.pIBSSN} aoMudar={(v) => atualizarAnexo(a, { pIBSSN: v })} erro={erro(`aliquotasEfetivas.${a}.pIBSSN`)} mono />
              {comIss && (
                <div className="sm:col-span-2">
                  <GrupoOpcional
                    titulo="Par sem redistribuição do ISS (semRedistribuicaoISS)"
                    descricao={campo("AnexoComIssInput", "semRedistribuicaoISS").descricao}
                    ligado={g.usarSemRedistribuicao}
                    aoMudar={(v) => atualizarAnexo(a, { usarSemRedistribuicao: v })}
                  >
                    <CampoTexto rotulo="pCBSSN (%)" contrato={["ParAliquotasInput", "pCBSSN"]} modo="decimal" valor={g.semRedistribuicaoISS.pCBSSN} aoMudar={(v) => atualizarAnexo(a, { semRedistribuicaoISS: { ...g.semRedistribuicaoISS, pCBSSN: v } })} erro={erro(`aliquotasEfetivas.${a}.semRedistribuicaoISS.pCBSSN`)} mono />
                    <CampoTexto rotulo="pIBSSN (%)" contrato={["ParAliquotasInput", "pIBSSN"]} modo="decimal" valor={g.semRedistribuicaoISS.pIBSSN} aoMudar={(v) => atualizarAnexo(a, { semRedistribuicaoISS: { ...g.semRedistribuicaoISS, pIBSSN: v } })} erro={erro(`aliquotasEfetivas.${a}.semRedistribuicaoISS.pIBSSN`)} mono />
                  </GrupoOpcional>
                </div>
              )}
            </GrupoOpcional>
          );
        })}
      </div>
    </>
  );
}

function rotuloAtividade(a: Atividade): string {
  const avisos = [a.admissivelNoDocumento === false && "não admitida neste documento", a.compativelComClassTrib === false && "incompatível com a cClassTrib"]
    .filter(Boolean)
    .join("; ");
  return `${a.codigo} · ${a.descricao} (Anexo ${a.rotuloAnexo})${avisos ? ` [${avisos}]` : ""}`;
}

function EtapaItens({
  op,
  erro,
  atualizarItem,
  adicionar,
  remover,
}: {
  op: OperacaoSimples;
  erro: (c: string) => string | undefined;
  atualizarItem: (i: number, p: Partial<ItemSimples>) => void;
  adicionar: () => void;
  remover: (i: number) => void;
}) {
  const nfse = ehNfse(op);
  const data = /^\d{4}-\d{2}-\d{2}$/.test(op.data) ? op.data : null;
  // cClassTrib vêm da tabela do motor de regime regular: os dois motores usam a mesma base.
  const situacoes = useDadosAbertos<SituacaoTributaria[]>("situacoes-cbs-ibs", data ? { data } : null);
  const classificacoes = useMemo(() => {
    if (situacoes.kind !== "ok") return [];
    const vistos = new Map<string, string>();
    for (const s of situacoes.dados) for (const c of s.classificacoesTributarias) if (!vistos.has(c.codigo)) vistos.set(c.codigo, c.descricao);
    return [...vistos].sort(([a], [b]) => a.localeCompare(b)).map(([valor, d]) => ({ valor, rotulo: `${valor} · ${d}` }));
  }, [situacoes]);

  return (
    <>
      <Titulo titulo="Itens">
        Atividades do Simples (cAtivSN) vigentes em {op.data || "(data)"} para o documento escolhido, direto do motor.
        {nfse && " Na NFS-e a operação tem exatamente 1 item."}
      </Titulo>
      {situacoes.kind === "erro" && (
        <p className="mb-4 text-[13px] text-bad" role="alert">
          Não deu para carregar as classificações do motor ({situacoes.motivo}).
        </p>
      )}
      <ol className="flex flex-col gap-4">
        {op.itens.map((item, i) => (
          <ItemFormulario
            key={i}
            item={item}
            indice={i}
            op={op}
            data={data}
            classificacoes={classificacoes}
            carregandoClassificacoes={situacoes.kind === "carregando"}
            erro={erro}
            atualizarItem={atualizarItem}
            remover={op.itens.length > 1 ? () => remover(i) : undefined}
          />
        ))}
      </ol>
      {!nfse && (
        <button type="button" className="btn btn-secondary mt-4" onClick={adicionar}>
          <Plus aria-hidden="true" />
          Adicionar item
        </button>
      )}
    </>
  );
}

function ItemFormulario({
  item,
  indice: i,
  op,
  data,
  classificacoes,
  carregandoClassificacoes,
  erro,
  atualizarItem,
  remover,
}: {
  item: ItemSimples;
  indice: number;
  op: OperacaoSimples;
  data: string | null;
  classificacoes: OpcaoSelect[];
  carregandoClassificacoes: boolean;
  erro: (c: string) => string | undefined;
  atualizarItem: (i: number, p: Partial<ItemSimples>) => void;
  remover?: () => void;
}) {
  const nfse = ehNfse(op);
  const p = `itens.${i}`;
  const filtros = data && op.tpDoc ? { data, tpDoc: op.tpDoc, ...(/^\d{6}$/.test(item.cClassTrib) ? { cClassTrib: item.cClassTrib } : {}) } : null;
  const atividades = useDadosAbertos<Atividade[]>("atividades-sn", filtros);

  return (
    <li className="rounded-md border border-line p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[15px] font-semibold">Item {item.numero}</h3>
        {remover && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={remover}>
            <Trash2 aria-hidden="true" />
            Remover item
          </button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoSelect
          rotulo="cClassTrib"
          contrato={[ITEM, "cClassTrib"]}
          obrigatorio
          valor={item.cClassTrib}
          aoMudar={(v) => atualizarItem(i, { cClassTrib: v })}
          carregando={carregandoClassificacoes}
          vazio={data ? "Selecione" : "Informe a data na etapa 1"}
          desabilitado={!data}
          opcoes={classificacoes}
          erro={erro(`${p}.cClassTrib`)}
          className="sm:col-span-3"
        />
        <CampoSelect
          rotulo="Atividade (cAtivSN)"
          contrato={[ITEM, "cAtivSN"]}
          valor={item.cAtivSN}
          aoMudar={(v) => atualizarItem(i, { cAtivSN: v })}
          carregando={atividades.kind === "carregando"}
          vazio={filtros ? "Não informar" : "Informe data e documento na etapa 1"}
          desabilitado={!filtros}
          opcoes={atividades.kind === "ok" ? atividades.dados.map((a) => ({ valor: a.codigo, rotulo: rotuloAtividade(a) })) : []}
          erro={atividades.kind === "erro" ? `Lista do motor indisponível (${atividades.motivo}).` : undefined}
          className="sm:col-span-3"
        />
        <CampoSelect
          rotulo="Identificação"
          ajuda="NCM para mercadoria, NBS para serviço. Opcional; a obrigatoriedade depende da classificação e do documento."
          valor={item.identificacao}
          aoMudar={(v) => atualizarItem(i, { identificacao: v as ItemSimples["identificacao"], codigo: "" })}
          vazio="Não informar"
          opcoes={[
            { valor: "ncm", rotulo: "NCM (mercadoria)" },
            { valor: "nbs", rotulo: "NBS (serviço)" },
          ]}
        />
        {item.identificacao && (
          <CampoTexto
            rotulo={item.identificacao === "ncm" ? "Código NCM" : "Código NBS"}
            contrato={[ITEM, item.identificacao]}
            modo="numeric"
            valor={item.codigo}
            aoMudar={(v) => atualizarItem(i, { codigo: v.replace(/\D/g, "") })}
            erro={erro(`${p}.${item.identificacao}`)}
            mono
            className="sm:col-span-2"
          />
        )}
        <CampoTexto rotulo="Base de cálculo (R$)" contrato={[ITEM, "baseCalculo"]} obrigatorio modo="decimal" valor={item.baseCalculo} aoMudar={(v) => atualizarItem(i, { baseCalculo: v })} erro={erro(`${p}.baseCalculo`)} mono className={item.identificacao ? "" : "sm:col-span-2"} />
        {!nfse && (
          <CampoTexto rotulo="Imposto Seletivo já calculado (R$)" contrato={[ITEM, "valorImpostoSeletivo"]} obrigatorio modo="decimal" valor={item.valorImpostoSeletivo} aoMudar={(v) => atualizarItem(i, { valorImpostoSeletivo: v })} erro={erro(`${p}.valorImpostoSeletivo`)} mono />
        )}
        {nfse && (
          <>
            <CampoSelect rotulo="Tributação do ISSQN" contrato={[ITEM, "tribISSQN"]} valor={item.tribISSQN} aoMudar={(v) => atualizarItem(i, { tribISSQN: v })} vazio="Não informar" opcoes={opcoesDoContrato(ITEM, "tribISSQN")} />
            <CampoSelect rotulo="Retenção do ISSQN" contrato={[ITEM, "tpRetISSQN"]} valor={item.tpRetISSQN} aoMudar={(v) => atualizarItem(i, { tpRetISSQN: v })} vazio="Não informar" opcoes={opcoesDoContrato(ITEM, "tpRetISSQN")} />
            <CampoSelect rotulo="Benefício municipal (tpBM)" contrato={[ITEM, "tpBM"]} valor={item.tpBM} aoMudar={(v) => atualizarItem(i, { tpBM: v })} vazio="Sem benefício" opcoes={opcoesDoContrato(ITEM, "tpBM")} />
          </>
        )}
      </div>
    </li>
  );
}
