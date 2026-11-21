import { criarRotaSimulacao, opcoesCors } from "@/lib/http/rota-simulacao";

/** BFF / API pública do motor de regime regular (REGIME_REGULAR_ENGINE_URL). */
export const POST = criarRotaSimulacao("regime-regular");
export const OPTIONS = opcoesCors;
