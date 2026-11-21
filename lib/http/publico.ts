import type { SimulacaoResultado } from "@/lib/simulation/regime-regular";
import type { EngineStatus } from "@/lib/tax-engine/types";

/**
 * Remove das respostas públicas o endereço interno do motor (ex.:
 * http://rtc-engine:8080/api). Ele só interessa a quem opera a instância.
 */
function esconder(texto: string, baseUrl: string | undefined): string {
  return baseUrl ? texto.split(baseUrl).join("(motor configurado)") : texto;
}

export function statusPublico(status: EngineStatus): Record<string, unknown> {
  if (status.state === "nao-configurado") return { ...status };
  const { baseUrl, ...resto } = status;
  return "motivo" in resto ? { ...resto, motivo: esconder(resto.motivo, baseUrl) } : resto;
}

export function simulacaoPublica(r: SimulacaoResultado, baseUrl?: string): SimulacaoResultado {
  if (r.ok) return { ...r, motor: { baseUrl: "", versao: r.motor.versao } };
  return { ...r, erro: { ...r.erro, mensagem: esconder(r.erro.mensagem, baseUrl) } } as SimulacaoResultado;
}
