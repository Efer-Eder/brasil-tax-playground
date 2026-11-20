import type { EngineDescriptor } from "../types";

/**
 * PLANEJADO — sem integração neste projeto ainda.
 *
 * O upstream existe (API Java/Spring Boot, porta padrão 8082, endpoint
 * `POST /api/calculadora/observabilidade/simples-nacional`), mas nenhum
 * adapter foi implementado nem testado aqui. Ver docs/upstream-integration.md.
 */
export const simplesNacionalDescriptor: EngineDescriptor = {
  id: "simples-nacional",
  nome: "Calculadora RTC · Simples Nacional",
  descricao: "API REST oficial que calcula CBS e IBS nas operações do Simples Nacional.",
  upstreamRepo: "https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional",
  upstreamReferencia: "1.0.2 (a926d5a)",
  stage: "planejado",
};
