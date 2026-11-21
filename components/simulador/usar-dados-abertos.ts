"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/base-path";

export type EstadoDados<T> =
  | { kind: "inativo" }
  | { kind: "carregando" }
  | { kind: "ok"; dados: T }
  | { kind: "erro"; motivo: string };

const memoria = new Map<string, unknown>();

/**
 * Busca um recurso de dados abertos do motor pelo BFF (lista branca). Sem
 * parâmetros obrigatórios preenchidos (`null`), não busca nada.
 */
export function useDadosAbertos<T>(recurso: string, params: Record<string, string> | null): EstadoDados<T> {
  const chave = params ? `${recurso}?${new URLSearchParams(params).toString()}` : null;
  const [estado, setEstado] = useState<EstadoDados<T>>({ kind: "inativo" });

  useEffect(() => {
    if (!chave) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sem parâmetros, nada a buscar
      setEstado({ kind: "inativo" });
      return;
    }
    if (memoria.has(chave)) {
      setEstado({ kind: "ok", dados: memoria.get(chave) as T });
      return;
    }
    const controller = new AbortController();
    setEstado({ kind: "carregando" });
    fetch(withBasePath(`/api/dados-abertos/${chave}`), { signal: controller.signal })
      .then(async (res) => {
        const corpo = await res.json().catch(() => null);
        if (!res.ok) throw new Error((corpo as { motivo?: string } | null)?.motivo ?? `HTTP ${res.status}`);
        memoria.set(chave, corpo);
        setEstado({ kind: "ok", dados: corpo as T });
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) setEstado({ kind: "erro", motivo: e instanceof Error ? e.message : "falha" });
      });
    return () => controller.abort();
  }, [chave]);

  return estado;
}

export interface Uf {
  codigo: number;
  nome: string;
  sigla: string;
}
export interface Municipio {
  codigo: number;
  nome: string;
}
export interface SituacaoTributaria {
  codigo: string;
  descricao: string;
  classificacoesTributarias: { codigo: string; descricao: string }[];
}
