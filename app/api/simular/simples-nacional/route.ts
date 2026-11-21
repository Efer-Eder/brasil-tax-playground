import { criarRotaSimulacao, opcoesCors } from "@/lib/http/rota-simulacao";

/**
 * BFF / API pública do motor do Simples Nacional (SIMPLES_NACIONAL_ENGINE_URL),
 * endpoint "não assistido" do upstream. As alíquotas efetivas vêm no corpo,
 * informadas por quem chama: esta aplicação não fornece nem calcula nenhuma.
 */
export const POST = criarRotaSimulacao("simples-nacional");
export const OPTIONS = opcoesCors;
