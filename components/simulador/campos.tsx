"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { campo as campoDoContrato, type NomeSchema } from "@/lib/tax-engine/contrato";

/**
 * Peças de formulário. A ajuda de cada campo vem da descrição publicada
 * pelo próprio motor no OpenAPI (`contrato`), não de texto escrito aqui.
 */

interface BaseProps {
  rotulo: string;
  /** Campo do contrato do motor, para ajuda e obrigatoriedade. */
  contrato?: [NomeSchema, string];
  ajuda?: string;
  erro?: string;
  obrigatorio?: boolean;
  className?: string;
}

function ajudaDe(props: BaseProps) {
  if (props.ajuda !== undefined) return props.ajuda;
  if (!props.contrato) return "";
  return campoDoContrato(props.contrato[0], props.contrato[1]).descricao;
}

function obrigatorioDe(props: BaseProps) {
  if (props.obrigatorio !== undefined) return props.obrigatorio;
  return props.contrato ? campoDoContrato(props.contrato[0], props.contrato[1]).obrigatorio : false;
}

function Moldura({ props, id, children }: { props: BaseProps; id: string; children: React.ReactNode }) {
  const ajuda = ajudaDe(props);
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${props.className ?? ""}`}>
      <label htmlFor={id} className="flex items-center gap-1.5 text-[13px] font-medium text-fg-1">
        {props.rotulo}
        {obrigatorioDe(props) && (
          <span className="font-mono text-[11px] text-fg-3" aria-label="obrigatório">
            obrigatório
          </span>
        )}
      </label>
      {children}
      {props.erro ? (
        <p id={`${id}-erro`} className="text-xs leading-4 text-bad" role="alert">
          {props.erro}
        </p>
      ) : ajuda ? (
        <p id={`${id}-ajuda`} className="text-xs leading-4 text-fg-3">
          {ajuda}
        </p>
      ) : null}
    </div>
  );
}

const classeCampo = (erro?: string) =>
  `field h-9 px-2.5 text-[13px] ${erro ? "border-[rgba(224,100,106,0.6)]" : ""}`;

export function CampoTexto(
  props: BaseProps & {
    valor: string;
    aoMudar: (v: string) => void;
    tipo?: "text" | "date" | "time";
    modo?: "text" | "decimal" | "numeric";
    placeholder?: string;
    mono?: boolean;
  },
) {
  const id = useId();
  return (
    <Moldura props={props} id={id}>
      <input
        id={id}
        type={props.tipo ?? "text"}
        inputMode={props.modo}
        value={props.valor}
        placeholder={props.placeholder}
        onChange={(e) => props.aoMudar(e.target.value)}
        aria-invalid={Boolean(props.erro)}
        aria-describedby={props.erro ? `${id}-erro` : `${id}-ajuda`}
        className={`${classeCampo(props.erro)} ${props.mono ? "font-mono" : ""}`}
        autoComplete="off"
        spellCheck={false}
      />
    </Moldura>
  );
}

export interface OpcaoSelect {
  valor: string;
  rotulo: string;
}

export function CampoSelect(
  props: BaseProps & {
    valor: string;
    aoMudar: (v: string) => void;
    opcoes: OpcaoSelect[];
    vazio?: string;
    carregando?: boolean;
    desabilitado?: boolean;
  },
) {
  const id = useId();
  return (
    <Moldura props={props} id={id}>
      <div className="relative">
        <select
          id={id}
          value={props.valor}
          disabled={props.desabilitado || props.carregando}
          onChange={(e) => props.aoMudar(e.target.value)}
          aria-invalid={Boolean(props.erro)}
          aria-describedby={props.erro ? `${id}-erro` : `${id}-ajuda`}
          className={`${classeCampo(props.erro)} w-full appearance-none pr-8 disabled:opacity-50`}
        >
          <option value="">{props.carregando ? "Carregando do motor…" : (props.vazio ?? "Selecione")}</option>
          {props.opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-fg-3" aria-hidden="true" />
      </div>
    </Moldura>
  );
}

/** Grupo opcional do contrato: só entra no payload quando ligado. */
export function GrupoOpcional({
  titulo,
  descricao,
  ligado,
  aoMudar,
  children,
}: {
  titulo: string;
  descricao: string;
  ligado: boolean;
  aoMudar: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="rounded-md border border-line-subtle">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 p-3 hover:bg-[var(--surface-hover)]">
        <input
          id={id}
          type="checkbox"
          checked={ligado}
          onChange={(e) => aoMudar(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
        />
        <span className="min-w-0">
          <span className="block text-[13px] font-medium">{titulo}</span>
          <span className="block text-xs leading-4 text-fg-3">{descricao}</span>
        </span>
      </label>
      {ligado && <div className="grid gap-3 border-t border-line-subtle p-3 sm:grid-cols-2">{children}</div>}
    </div>
  );
}
