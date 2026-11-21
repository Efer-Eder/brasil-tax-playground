"use client";

import { ArrowLeft, ArrowRight, Check, Code2, Play, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  FUSOS_BRASIL,
  montarPayload,
  novaOperacao,
  novoItem,
  validarOperacaoGuiada,
  type ItemGuiado,
  type OperacaoGuiada,
  type ProblemaCampo,
} from "@/lib/simulation/guiado";
import { campo, camposDe, MOTOR_DO_CONTRATO } from "@/lib/tax-engine/contrato";
import { ENGINES } from "@/lib/tax-engine";
import { CampoSelect, CampoTexto, GrupoOpcional, type OpcaoSelect } from "./campos";
import { useDadosAbertos, type Municipio, type SituacaoTributaria, type Uf } from "./usar-dados-abertos";

const ETAPAS = ["Cenário", "Operação", "Itens", "Revisão", "Resultado"] as const;
type Etapa = 1 | 2 | 3 | 4 | 5;

interface Props {
  enviando: boolean;
  aoSimular: (texto: string) => void;
  aoAbrirNoModoDev: (texto: string) => void;
  /** Resultado da última simulação feita por este formulário (etapa 5). */
  resultado: React.ReactNode | null;
}

const dataValida = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

export function FormularioGuiado({ enviando, aoSimular, aoAbrirNoModoDev, resultado }: Props) {
  const [etapa, setEtapa] = useState<Etapa>(1);
  const [op, setOp] = useState<OperacaoGuiada>(() => novaOperacao());
  const [mostrarErros, setMostrarErros] = useState<Record<number, boolean>>({});

  const payload = useMemo(() => montarPayload(op), [op]);
  const texto = useMemo(() => JSON.stringify(payload, null, 2), [payload]);
  const problemas = useMemo(() => validarOperacaoGuiada(op), [op]);

  const erro = (caminho: string) =>
    mostrarErros[caminho.startsWith("itens") ? 3 : 2] ? problemas.find((p) => p.caminho === caminho)?.mensagem : undefined;

  function avancar() {
    const daEtapa = (p: ProblemaCampo) => (etapa === 2 ? !p.caminho.startsWith("itens") : p.caminho.startsWith("itens"));
    if ((etapa === 2 || etapa === 3) && problemas.some(daEtapa)) {
      setMostrarErros((m) => ({ ...m, [etapa]: true }));
      return;
    }
    setEtapa((e) => Math.min(5, e + 1) as Etapa);
  }

  function simular() {
    if (problemas.length) {
      setMostrarErros({ 2: true, 3: true });
      return;
    }
    aoSimular(texto);
    setEtapa(5);
  }

  const atualizar = (parcial: Partial<OperacaoGuiada>) => setOp((o) => ({ ...o, ...parcial }));
  const atualizarItem = (i: number, parcial: Partial<ItemGuiado>) =>
    setOp((o) => ({ ...o, itens: o.itens.map((it, k) => (k === i ? { ...it, ...parcial } : it)) }));

  return (
    <div className="card overflow-hidden">
      <Passos etapa={etapa} irPara={(e) => e < etapa && setEtapa(e)} />
      <div className="p-6 max-sm:p-4">
        {etapa === 1 && <EtapaCenario />}
        {etapa === 2 && <EtapaOperacao op={op} atualizar={atualizar} erro={erro} />}
        {etapa === 3 && (
          <EtapaItens
            op={op}
            erro={erro}
            atualizarItem={atualizarItem}
            adicionar={() => setOp((o) => ({ ...o, itens: [...o.itens, novoItem(o.itens.length + 1)] }))}
            remover={(i) =>
              setOp((o) => ({
                ...o,
                itens: o.itens.filter((_, k) => k !== i).map((it, k) => ({ ...it, numero: k + 1 })),
              }))
            }
          />
        )}
        {etapa === 4 && <EtapaRevisao problemas={problemas} texto={texto} irPara={setEtapa} />}
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
                    setOp(novaOperacao());
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

function Passos({ etapa, irPara }: { etapa: Etapa; irPara: (e: Etapa) => void }) {
  return (
    <ol className="flex border-b border-line-subtle bg-[rgba(17,18,21,0.72)]" aria-label="Etapas">
      {ETAPAS.map((nome, i) => {
        const n = (i + 1) as Etapa;
        const atual = n === etapa;
        const feita = n < etapa;
        return (
          <li key={nome} className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => irPara(n)}
              disabled={!feita}
              aria-current={atual ? "step" : undefined}
              className={`flex w-full items-center gap-2 border-b-2 px-3 py-3 text-left text-[13px] max-sm:justify-center ${
                atual ? "border-accent text-fg-1" : feita ? "border-transparent text-fg-2 hover:text-fg-1" : "border-transparent text-fg-3"
              }`}
            >
              <span
                className={`grid h-5 w-5 flex-none place-items-center rounded-full font-mono text-[11px] ${
                  feita ? "bg-[var(--success-subtle)] text-ok" : atual ? "bg-[var(--accent-subtle)] text-accent-text" : "bg-surface-2 text-fg-3"
                }`}
              >
                {feita ? <Check className="h-3 w-3" aria-hidden="true" /> : n}
              </span>
              <span className="truncate max-sm:hidden">{nome}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Titulo({ titulo, children }: { titulo: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold tracking-[-0.01em]">{titulo}</h2>
      {children && <p className="mt-1 text-[13px] leading-5 text-fg-2">{children}</p>}
    </div>
  );
}

function EtapaCenario() {
  return (
    <>
      <Titulo titulo="Qual motor vai calcular?">
        Só aparece como disponível o que está integrado e testado neste projeto.
      </Titulo>
      <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Cenário">
        {ENGINES.map((e) => {
          const ativo = e.stage === "em-integracao";
          return (
            <div
              key={e.id}
              role="radio"
              aria-checked={ativo}
              aria-disabled={!ativo}
              className={`rounded-md border p-4 ${ativo ? "border-accent bg-[var(--accent-subtle)]" : "border-line-subtle opacity-60"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold">{e.nome.replace("Calculadora RTC · ", "")}</span>
                <span className={ativo ? "badge ok" : "badge"}>{ativo ? "Disponível" : "Planejado"}</span>
              </div>
              <p className="mt-2 text-xs leading-4 text-fg-2">{e.descricao}</p>
              <p className="mt-2 font-mono text-[11px] text-fg-3">{e.upstreamReferencia}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-4 text-fg-3">
        Motor em uso: calculadora-rtc-regime-regular {MOTOR_DO_CONTRATO.versaoApp}, base {MOTOR_DO_CONTRATO.versaoDb} de{" "}
        {MOTOR_DO_CONTRATO.dataVersaoDb}. Os campos das próximas etapas seguem o contrato publicado por ele.
      </p>
    </>
  );
}

function EtapaOperacao({
  op,
  atualizar,
  erro,
}: {
  op: OperacaoGuiada;
  atualizar: (p: Partial<OperacaoGuiada>) => void;
  erro: (c: string) => string | undefined;
}) {
  const ufs = useDadosAbertos<Uf[]>("ufs", {});
  const municipios = useDadosAbertos<Municipio[]>("municipios", op.uf ? { uf: op.uf } : null);
  const ente = campo("CompraGovernamentalInput", "tpEnteGov");
  const operGov = campo("CompraGovernamentalInput", "tpOperGov");

  return (
    <>
      <Titulo titulo="Dados da operação">Data do fato gerador, local e documento. Listas vêm dos dados abertos do motor.</Titulo>
      <div className="grid gap-4 sm:grid-cols-3">
        <CampoTexto rotulo="Data do fato gerador" contrato={["OperacaoInput", "dhFatoGerador"]} tipo="date" valor={op.data} aoMudar={(v) => atualizar({ data: v })} erro={erro("dhFatoGerador")} obrigatorio />
        <CampoTexto rotulo="Hora" ajuda="Hora local do fato gerador." tipo="time" valor={op.hora} aoMudar={(v) => atualizar({ hora: v })} />
        <CampoSelect
          rotulo="Fuso horário"
          ajuda="Deslocamento em relação ao UTC."
          valor={op.fuso}
          aoMudar={(v) => atualizar({ fuso: v })}
          opcoes={FUSOS_BRASIL.map((f) => ({ valor: f, rotulo: `UTC${f}` }))}
        />
        <CampoSelect
          rotulo="UF"
          contrato={["OperacaoInput", "uf"]}
          valor={op.uf}
          aoMudar={(v) => atualizar({ uf: v, municipio: "" })}
          carregando={ufs.kind === "carregando"}
          opcoes={ufs.kind === "ok" ? ufs.dados.map((u) => ({ valor: u.sigla, rotulo: `${u.sigla} · ${u.nome}` })) : []}
          erro={ufs.kind === "erro" ? `Lista do motor indisponível (${ufs.motivo}).` : erro("uf")}
        />
        <CampoSelect
          rotulo="Município"
          contrato={["OperacaoInput", "municipio"]}
          valor={op.municipio}
          aoMudar={(v) => atualizar({ municipio: v })}
          vazio={op.uf ? "Selecione" : "Escolha a UF primeiro"}
          desabilitado={!op.uf}
          carregando={municipios.kind === "carregando"}
          opcoes={municipios.kind === "ok" ? municipios.dados.map((m) => ({ valor: String(m.codigo), rotulo: `${m.nome} · ${m.codigo}` })) : []}
          erro={municipios.kind === "erro" ? `Lista do motor indisponível (${municipios.motivo}).` : erro("municipio")}
          className="sm:col-span-2"
        />
        <CampoTexto rotulo="Tipo do documento (tpDoc)" contrato={["OperacaoInput", "tpDoc"]} modo="numeric" valor={op.tpDoc} aoMudar={(v) => atualizar({ tpDoc: v })} erro={erro("tpDoc")} mono className="sm:col-span-3" />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <GrupoOpcional
          titulo="Compra governamental (gCompraGov)"
          descricao={campo("OperacaoInput", "gCompraGov").descricao}
          ligado={op.usarCompraGov}
          aoMudar={(v) => atualizar({ usarCompraGov: v })}
        >
          <CampoSelect
            rotulo="Tipo de ente (tpEnteGov)"
            ajuda={ente.descricao}
            obrigatorio={ente.obrigatorio}
            valor={op.compraGov.tpEnteGov}
            aoMudar={(v) => atualizar({ compraGov: { ...op.compraGov, tpEnteGov: v } })}
            opcoes={ente.opcoes.map((o) => ({ valor: String(o.valor), rotulo: `${o.valor} · ${o.rotulo}` }))}
            erro={erro("gCompraGov.tpEnteGov")}
          />
          <CampoSelect
            rotulo="Tipo de operação (tpOperGov)"
            ajuda={operGov.descricao}
            valor={op.compraGov.tpOperGov}
            aoMudar={(v) => atualizar({ compraGov: { ...op.compraGov, tpOperGov: v } })}
            opcoes={operGov.opcoes.map((o) => ({ valor: String(o.valor), rotulo: `${o.valor} · ${o.rotulo}` }))}
          />
        </GrupoOpcional>

        <details className="rounded-md border border-line-subtle">
          <summary className="cursor-pointer p-3 text-[13px] text-fg-2 hover:text-fg-1">Identificação do documento (id e versão)</summary>
          <div className="grid gap-3 border-t border-line-subtle p-3 sm:grid-cols-2">
            <CampoTexto rotulo="id" contrato={["OperacaoInput", "id"]} valor={op.id} aoMudar={(v) => atualizar({ id: v })} erro={erro("id")} mono />
            <CampoTexto rotulo="versao" contrato={["OperacaoInput", "versao"]} valor={op.versao} aoMudar={(v) => atualizar({ versao: v })} erro={erro("versao")} mono />
          </div>
        </details>
      </div>
    </>
  );
}

function opcoesCst(s: SituacaoTributaria[] | null): OpcaoSelect[] {
  return (s ?? []).map((x) => ({ valor: x.codigo, rotulo: `${x.codigo} · ${x.descricao}` }));
}

function opcoesClass(s: SituacaoTributaria[] | null, cst: string): OpcaoSelect[] {
  return (s ?? [])
    .find((x) => x.codigo === cst)
    ?.classificacoesTributarias.map((c) => ({ valor: c.codigo, rotulo: `${c.codigo} · ${c.descricao}` })) ?? [];
}

function EtapaItens({
  op,
  erro,
  atualizarItem,
  adicionar,
  remover,
}: {
  op: OperacaoGuiada;
  erro: (c: string) => string | undefined;
  atualizarItem: (i: number, p: Partial<ItemGuiado>) => void;
  adicionar: () => void;
  remover: (i: number) => void;
}) {
  const data = dataValida(op.data) ? op.data : null;
  const cbsIbs = useDadosAbertos<SituacaoTributaria[]>("situacoes-cbs-ibs", data ? { data } : null);
  const is = useDadosAbertos<SituacaoTributaria[]>("situacoes-is", data ? { data } : null);
  const listaCbsIbs = cbsIbs.kind === "ok" ? cbsIbs.dados : null;
  const listaIs = is.kind === "ok" ? is.dados : null;

  return (
    <>
      <Titulo titulo="Itens da operação">
        CST e cClassTrib vêm da tabela do motor vigente em {op.data || "(data)"}. Grupos opcionais só entram no
        payload quando marcados.
      </Titulo>
      {cbsIbs.kind === "erro" && (
        <p className="mb-4 text-[13px] text-bad" role="alert">
          Não deu para carregar a tabela de CST do motor ({cbsIbs.motivo}).
        </p>
      )}
      <ol className="flex flex-col gap-4">
        {op.itens.map((item, i) => {
          const p = `itens.${i}`;
          const descricaoCodigo = <DescricaoCodigo item={item} data={data} />;
          return (
            <li key={i} className="rounded-md border border-line p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold">Item {item.numero}</h3>
                {op.itens.length > 1 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => remover(i)}>
                    <Trash2 aria-hidden="true" />
                    Remover item
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <CampoSelect
                  rotulo="Identificação"
                  ajuda="NCM para mercadoria, NBS para serviço."
                  valor={item.identificacao}
                  aoMudar={(v) => atualizarItem(i, { identificacao: v as "ncm" | "nbs", codigo: "" })}
                  opcoes={[
                    { valor: "ncm", rotulo: "NCM (mercadoria)" },
                    { valor: "nbs", rotulo: "NBS (serviço)" },
                  ]}
                />
                <div className="sm:col-span-2">
                  <CampoTexto
                    rotulo={item.identificacao === "ncm" ? "Código NCM" : "Código NBS"}
                    contrato={["ItemOperacaoInput", item.identificacao]}
                    modo="numeric"
                    valor={item.codigo}
                    aoMudar={(v) => atualizarItem(i, { codigo: v.replace(/\D/g, "") })}
                    erro={erro(`${p}.${item.identificacao}`)}
                    mono
                  />
                  {descricaoCodigo}
                </div>
                <CampoSelect
                  rotulo="CST"
                  contrato={["ItemOperacaoInput", "cst"]}
                  valor={item.cst}
                  aoMudar={(v) => atualizarItem(i, { cst: v, cClassTrib: "" })}
                  carregando={cbsIbs.kind === "carregando"}
                  opcoes={opcoesCst(listaCbsIbs)}
                  erro={erro(`${p}.cst`)}
                />
                <CampoSelect
                  rotulo="cClassTrib"
                  contrato={["ItemOperacaoInput", "cClassTrib"]}
                  valor={item.cClassTrib}
                  aoMudar={(v) => atualizarItem(i, { cClassTrib: v })}
                  vazio={item.cst ? "Selecione" : "Escolha o CST primeiro"}
                  desabilitado={!item.cst}
                  opcoes={opcoesClass(listaCbsIbs, item.cst)}
                  erro={erro(`${p}.cClassTrib`)}
                  className="sm:col-span-2"
                />
                <CampoTexto rotulo="Base de cálculo (R$)" contrato={["ItemOperacaoInput", "baseCalculo"]} modo="decimal" valor={item.baseCalculo} aoMudar={(v) => atualizarItem(i, { baseCalculo: v })} erro={erro(`${p}.baseCalculo`)} mono />
                <CampoTexto rotulo="Quantidade" contrato={["ItemOperacaoInput", "quantidade"]} modo="decimal" valor={item.quantidade} aoMudar={(v) => atualizarItem(i, { quantidade: v })} erro={erro(`${p}.quantidade`)} mono />
                <CampoTexto rotulo="Unidade" contrato={["ItemOperacaoInput", "unidade"]} valor={item.unidade} aoMudar={(v) => atualizarItem(i, { unidade: v })} erro={erro(`${p}.unidade`)} />
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <GrupoOpcional
                  titulo="Alíquotas nominais (aliquotasNominais)"
                  descricao={campo("ItemOperacaoInput", "aliquotasNominais").descricao}
                  ligado={item.usarAliquotas}
                  aoMudar={(v) => atualizarItem(i, { usarAliquotas: v })}
                >
                  {(["cbs", "ibsEstadual", "ibsMunicipal"] as const).map((k) => (
                    <CampoTexto key={k} rotulo={k} contrato={["AliquotasNominaisInput", k]} modo="decimal" valor={item.aliquotas[k]} aoMudar={(v) => atualizarItem(i, { aliquotas: { ...item.aliquotas, [k]: v } })} erro={erro(`${p}.aliquotasNominais.${k}`)} mono />
                  ))}
                  <CampoTexto rotulo="IS ad valorem" contrato={["AliquotasNominaisImpostoSeletivo", "adValorem"]} modo="decimal" valor={item.aliquotas.isAdValorem} aoMudar={(v) => atualizarItem(i, { aliquotas: { ...item.aliquotas, isAdValorem: v } })} erro={erro(`${p}.aliquotasNominais.impostoSeletivo.adValorem`)} mono />
                  <CampoTexto rotulo="IS ad rem" contrato={["AliquotasNominaisImpostoSeletivo", "adRem"]} modo="decimal" valor={item.aliquotas.isAdRem} aoMudar={(v) => atualizarItem(i, { aliquotas: { ...item.aliquotas, isAdRem: v } })} erro={erro(`${p}.aliquotasNominais.impostoSeletivo.adRem`)} mono />
                </GrupoOpcional>

                <GrupoOpcional
                  titulo="Imposto Seletivo (impostoSeletivo)"
                  descricao={campo("ItemOperacaoInput", "impostoSeletivo").descricao}
                  ligado={item.usarImpostoSeletivo}
                  aoMudar={(v) => atualizarItem(i, { usarImpostoSeletivo: v })}
                >
                  <CampoSelect rotulo="CST do IS" contrato={["ImpostoSeletivoInput", "cst"]} valor={item.impostoSeletivo.cst} aoMudar={(v) => atualizarItem(i, { impostoSeletivo: { ...item.impostoSeletivo, cst: v, cClassTrib: "" } })} carregando={is.kind === "carregando"} opcoes={opcoesCst(listaIs)} erro={erro(`${p}.impostoSeletivo.cst`)} />
                  <CampoSelect rotulo="cClassTrib do IS" contrato={["ImpostoSeletivoInput", "cClassTrib"]} valor={item.impostoSeletivo.cClassTrib} aoMudar={(v) => atualizarItem(i, { impostoSeletivo: { ...item.impostoSeletivo, cClassTrib: v } })} desabilitado={!item.impostoSeletivo.cst} opcoes={opcoesClass(listaIs, item.impostoSeletivo.cst)} erro={erro(`${p}.impostoSeletivo.cClassTrib`)} />
                  {(["baseCalculo", "quantidade", "unidade", "impostoInformado"] as const).map((k) => (
                    <CampoTexto key={k} rotulo={k} contrato={["ImpostoSeletivoInput", k]} modo={k === "unidade" ? "text" : "decimal"} valor={item.impostoSeletivo[k]} aoMudar={(v) => atualizarItem(i, { impostoSeletivo: { ...item.impostoSeletivo, [k]: v } })} erro={erro(`${p}.impostoSeletivo.${k}`)} mono={k !== "unidade"} />
                  ))}
                </GrupoOpcional>

                <GrupoOpcional
                  titulo="Tributação regular (tributacaoRegular)"
                  descricao={campo("ItemOperacaoInput", "tributacaoRegular").descricao}
                  ligado={item.usarTributacaoRegular}
                  aoMudar={(v) => atualizarItem(i, { usarTributacaoRegular: v })}
                >
                  <CampoSelect rotulo="CST" contrato={["TributacaoRegularInput", "cst"]} valor={item.tributacaoRegular.cst} aoMudar={(v) => atualizarItem(i, { tributacaoRegular: { cst: v, cClassTrib: "" } })} opcoes={opcoesCst(listaCbsIbs)} erro={erro(`${p}.tributacaoRegular.cst`)} />
                  <CampoSelect rotulo="cClassTrib" contrato={["TributacaoRegularInput", "cClassTrib"]} valor={item.tributacaoRegular.cClassTrib} aoMudar={(v) => atualizarItem(i, { tributacaoRegular: { ...item.tributacaoRegular, cClassTrib: v } })} desabilitado={!item.tributacaoRegular.cst} opcoes={opcoesClass(listaCbsIbs, item.tributacaoRegular.cst)} erro={erro(`${p}.tributacaoRegular.cClassTrib`)} />
                </GrupoOpcional>

                <GrupoOpcional
                  titulo="Componentes da base de cálculo (gComponentesBC)"
                  descricao={campo("ItemOperacaoInput", "gComponentesBC").descricao}
                  ligado={item.usarComponentesBC}
                  aoMudar={(v) => atualizarItem(i, { usarComponentesBC: v })}
                >
                  {camposDe("ComponentesBaseCalculoInput").map((k) => (
                    <CampoTexto
                      key={k}
                      rotulo={k}
                      contrato={["ComponentesBaseCalculoInput", k]}
                      modo="decimal"
                      valor={item.componentesBC[k as keyof ItemGuiado["componentesBC"]] ?? ""}
                      aoMudar={(v) => atualizarItem(i, { componentesBC: { ...item.componentesBC, [k]: v } })}
                      erro={erro(`${p}.gComponentesBC.${k}`)}
                      mono
                    />
                  ))}
                </GrupoOpcional>
              </div>
            </li>
          );
        })}
      </ol>
      <button type="button" className="btn btn-secondary mt-4" onClick={adicionar}>
        <Plus aria-hidden="true" />
        Adicionar item
      </button>
    </>
  );
}

/** Descrição oficial do NCM/NBS, consultada no motor quando o código está completo. */
function DescricaoCodigo({ item, data }: { item: ItemGuiado; data: string | null }) {
  const completo = item.identificacao === "ncm" ? /^\d{8}$/.test(item.codigo) : /^\d{9}$/.test(item.codigo);
  const r = useDadosAbertos<Record<string, unknown>>(
    item.identificacao,
    completo && data ? { [item.identificacao]: item.codigo, data } : null,
  );
  if (r.kind === "carregando") return <p className="mt-1 text-xs text-fg-3">Consultando o motor…</p>;
  if (r.kind === "erro") return <p className="mt-1 text-xs text-warn">O motor não encontrou este código na data ({r.motivo}).</p>;
  if (r.kind !== "ok") return null;
  const d = r.dados;
  const texto = [d.capitulo, d.posicao, d.item, d.subitem].filter((x) => typeof x === "string" && x).join(" · ");
  return (
    <p className="mt-1 text-xs leading-4 text-fg-2">
      <span className="font-mono text-ok">motor:</span> {texto || "código encontrado"}
      {d.tributadoPeloImpostoSeletivo === true && <span className="badge warn ml-2">tributado pelo IS</span>}
    </p>
  );
}

function EtapaRevisao({ problemas, texto, irPara }: { problemas: ProblemaCampo[]; texto: string; irPara: (e: Etapa) => void }) {
  return (
    <>
      <Titulo titulo="Revisão">
        Este é exatamente o JSON que vai para o motor. A conferência abaixo segue o contrato dele; quem decide é o motor.
      </Titulo>
      {problemas.length ? (
        <div className="mb-4 rounded-md border border-[rgba(224,100,106,0.24)] bg-[var(--danger-subtle)] p-4 text-[13px]" role="alert">
          <p className="font-medium">Faltam ajustes antes de enviar:</p>
          <ul className="mt-2 flex flex-col gap-1">
            {problemas.map((p) => (
              <li key={p.caminho + p.mensagem}>
                <button type="button" className="text-left hover:underline" onClick={() => irPara(p.caminho.startsWith("itens") ? 3 : 2)}>
                  <code className="font-mono text-accent-text">{p.caminho || "(raiz)"}</code>: <span className="text-fg-2">{p.mensagem}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mb-4 flex items-center gap-2 text-[13px] text-ok">
          <Check className="h-4 w-4" aria-hidden="true" />
          Estrutura conforme o contrato do motor.
        </p>
      )}
      <pre className="code max-h-96" aria-label="JSON que será enviado">
        {texto}
      </pre>
    </>
  );
}
