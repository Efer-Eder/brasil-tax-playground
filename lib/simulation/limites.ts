/**
 * Limites operacionais da instância (não são regras fiscais).
 *
 * Servem para que uma instância pública não seja derrubada: limitam quantas
 * chamadas ao motor rodam ao mesmo tempo, quantas esperam na fila e por
 * quanto tempo, e o tamanho de uma operação. Todos vêm de variáveis de
 * ambiente; sem elas, o comportamento local é o de antes (sem teto de itens).
 */
import { z } from "zod";

const inteiro = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export interface LimitesSimulacao {
  /** Chamadas simultâneas ao motor. */
  maxConcorrencia: number;
  /** Requisições aguardando vaga; acima disso, recusa na hora (503). */
  maxFila: number;
  /** Espera máxima por uma vaga, em ms; depois disso, 503. */
  maxEsperaMs: number;
  /** Itens por operação; null = sem teto. */
  maxItens: number | null;
}

export function lerLimites(env: Record<string, string | undefined> = process.env): LimitesSimulacao {
  const ler = (nome: string, padrao: number, min: number, max: number) => {
    const bruto = env[nome]?.trim();
    if (!bruto) return padrao;
    const r = inteiro(min, max).safeParse(bruto);
    return r.success ? r.data : padrao;
  };
  const maxItensBruto = env.SIMULACAO_MAX_ITENS?.trim();
  const maxItens = maxItensBruto ? inteiro(1, 10_000).safeParse(maxItensBruto) : null;
  return {
    maxConcorrencia: ler("SIMULACAO_MAX_CONCORRENCIA", 8, 1, 256),
    maxFila: ler("SIMULACAO_MAX_FILA", 32, 0, 10_000),
    maxEsperaMs: ler("SIMULACAO_MAX_ESPERA_MS", 2_000, 0, 60_000),
    maxItens: maxItens?.success ? maxItens.data : null,
  };
}

export class FilaCheiaError extends Error {
  constructor(readonly motivo: "fila-cheia" | "espera-esgotada") {
    super(motivo === "fila-cheia" ? "Fila de simulações cheia." : "Tempo de espera por vaga esgotado.");
  }
}

/**
 * Semáforo simples com fila limitada e espera máxima. Não depende de nada
 * externo: o estado vive no processo (uma instância do app).
 */
export class LimitadorConcorrencia {
  private ativos = 0;
  private readonly fila: { liberar: () => void; timer: ReturnType<typeof setTimeout> | null }[] = [];

  constructor(private readonly limites: Pick<LimitesSimulacao, "maxConcorrencia" | "maxFila" | "maxEsperaMs">) {}

  get emUso() {
    return { ativos: this.ativos, aguardando: this.fila.length };
  }

  async executar<T>(tarefa: () => Promise<T>): Promise<T> {
    await this.adquirir();
    try {
      return await tarefa();
    } finally {
      this.soltar();
    }
  }

  private adquirir(): Promise<void> {
    if (this.ativos < this.limites.maxConcorrencia) {
      this.ativos++;
      return Promise.resolve();
    }
    if (this.fila.length >= this.limites.maxFila) {
      return Promise.reject(new FilaCheiaError("fila-cheia"));
    }
    return new Promise((resolve, reject) => {
      const entrada = {
        liberar: () => {
          if (entrada.timer) clearTimeout(entrada.timer);
          this.ativos++;
          resolve();
        },
        timer: null as ReturnType<typeof setTimeout> | null,
      };
      entrada.timer = setTimeout(() => {
        const i = this.fila.indexOf(entrada);
        if (i >= 0) this.fila.splice(i, 1);
        reject(new FilaCheiaError("espera-esgotada"));
      }, this.limites.maxEsperaMs);
      this.fila.push(entrada);
    });
  }

  private soltar() {
    this.ativos--;
    const proximo = this.fila.shift();
    if (proximo) proximo.liberar();
  }
}
