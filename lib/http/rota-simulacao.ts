import { CORS_HEADERS } from "@/lib/cors";
import { lerCorpoLimitado } from "@/lib/http/corpo-limitado";
import { simulacaoPublica } from "@/lib/http/publico";
import { LimitadorConcorrencia, lerLimites } from "@/lib/simulation/limites";
import { simularNoMotor, type MotorCalculo } from "@/lib/simulation/regime-regular";
import { readEngineConfig } from "@/lib/tax-engine/config";

/**
 * Limite do corpo aceito pelo BFF. Mesmo valor de
 * `spring.http.codecs.max-in-memory-size` no perfil offline do upstream.
 */
const MAX_BODY_BYTES = 500 * 1024;

/**
 * Cria o handler POST de `/api/simular/<motor>`: confere o envelope e repassa
 * a operação, sem reescrever, ao motor oficial configurado. Nada é
 * armazenado. Cada motor tem a própria fila (são processos separados).
 */
export function criarRotaSimulacao(engine: MotorCalculo) {
  const limites = lerLimites();
  const limitador = new LimitadorConcorrencia(limites);

  return async function POST(request: Request) {
    const corpo = await lerCorpoLimitado(request, MAX_BODY_BYTES);
    if (!corpo.ok) {
      return Response.json(
        { ok: false, httpStatus: 413, erro: { tipo: "json-invalido", mensagem: "Corpo maior que 500 KB." } },
        { status: 413, headers: CORS_HEADERS },
      );
    }

    const resultado = await simularNoMotor(engine, corpo.texto, {
      maxItens: limites.maxItens,
      limitador,
      cacheVersaoMs: 60_000,
    });
    const config = readEngineConfig(engine);
    const headers: Record<string, string> = { ...CORS_HEADERS, "Cache-Control": "no-store" };
    if (!resultado.ok && resultado.erro.tipo === "ocupado") headers["Retry-After"] = "5";
    return Response.json(simulacaoPublica(resultado, config.ok ? config.config.baseUrl : undefined), {
      status: resultado.httpStatus,
      headers,
    });
  };
}

export function opcoesCors() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
