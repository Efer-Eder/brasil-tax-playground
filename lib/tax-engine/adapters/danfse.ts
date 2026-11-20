import type { EngineDescriptor } from "../types";

/**
 * PLANEJADO — sem integração neste projeto ainda.
 *
 * Não é um motor de cálculo: o upstream (serviço HTTP em Go) gera o PDF do
 * DANFSe a partir do XML de uma NFS-e (`POST /api/danfse`). Nenhum adapter foi
 * implementado nem testado aqui. Ver docs/upstream-integration.md.
 */
export const danfseDescriptor: EngineDescriptor = {
  id: "danfse",
  nome: "Gerador DANFSe",
  descricao: "Serviço oficial que gera o PDF do DANFSe a partir do XML de uma NFS-e (não calcula tributos).",
  upstreamRepo: "https://github.com/ReceitaFederal/calculadora-rtc-gerador-danfse",
  upstreamReferencia: "1.0.0 (8d79e6b)",
  stage: "planejado",
};
