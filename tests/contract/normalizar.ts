/**
 * Normalização usada SÓ para comparar respostas do motor nos testes (o app
 * exibe a resposta como veio):
 * - `timestamp` do ProblemDetail muda a cada chamada;
 * - o próprio motor 1.7.2 devolve listas de erros de validação em ordem não
 *   determinística (duas chamadas iguais podem vir em ordens diferentes).
 */
export function normalizar(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    const itens = valor.map(normalizar);
    const ehListaDeErros =
      itens.length > 0 && itens.every((i) => i && typeof i === "object" && ("pointer" in i || "code" in i));
    return ehListaDeErros ? itens.map((i) => JSON.stringify(i)).sort().map((i) => JSON.parse(i)) : itens;
  }
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor)
        .filter(([k]) => k !== "timestamp")
        .map(([k, v]) => [k, normalizar(v)]),
    );
  }
  return valor;
}

export const iguais = (a: unknown, b: unknown) => JSON.stringify(normalizar(a)) === JSON.stringify(normalizar(b));
