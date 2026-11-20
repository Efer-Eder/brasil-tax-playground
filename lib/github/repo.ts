import { z } from "zod";

/**
 * Resumo do repositório no GitHub para o card da página do projeto.
 *
 * Usa a API REST pública (sem token: 60 req/h por IP). Cada atualização faz
 * 6 chamadas; com o cache de 15 min do chamador isso dá ~24 req/h. Um
 * GITHUB_TOKEN opcional no ambiente aumenta o limite, mas não é necessário.
 */


const repoSchema = z.looseObject({
  full_name: z.string(),
  html_url: z.string(),
  description: z.string().nullable(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  subscribers_count: z.number().optional(),
  open_issues_count: z.number(),
  pushed_at: z.string(),
  language: z.string().nullable(),
  topics: z.array(z.string()).optional(),
  license: z.looseObject({ spdx_id: z.string().nullable() }).nullable(),
  default_branch: z.string(),
});

const commitSchema = z.looseObject({
  sha: z.string(),
  html_url: z.string(),
  commit: z.looseObject({
    message: z.string(),
    author: z.looseObject({ name: z.string(), date: z.string() }).nullable(),
  }),
  author: z.looseObject({ login: z.string() }).nullable(),
});

const issueSchema = z.looseObject({
  number: z.number(),
  title: z.string(),
  html_url: z.string(),
  created_at: z.string(),
  user: z.looseObject({ login: z.string() }).nullable(),
  pull_request: z.unknown().optional(),
});

const runsSchema = z.looseObject({
  workflow_runs: z.array(
    z.looseObject({
      name: z.string().nullable(),
      status: z.string().nullable(),
      conclusion: z.string().nullable(),
      head_sha: z.string(),
      updated_at: z.string(),
      html_url: z.string(),
    }),
  ),
});

const contribuidorSchema = z.looseObject({
  login: z.string(),
  html_url: z.string(),
  contributions: z.number(),
  type: z.string(),
});

export interface ItemLink {
  titulo: string;
  url: string;
  data: string;
  autor: string | null;
  rotulo: string;
}

export interface ResumoRepo {
  repo: {
    nome: string;
    url: string;
    descricao: string | null;
    estrelas: number;
    forks: number;
    observadores: number | null;
    licenca: string | null;
    linguagem: string | null;
    topicos: string[];
    ultimoPush: string;
    branch: string;
  };
  commits: { total: number | null; recentes: ItemLink[] };
  issues: { total: number; recentes: ItemLink[] };
  prs: { total: number; recentes: ItemLink[] };
  contribuidores: { login: string; url: string; contribuicoes: number }[];
  /** Último run de cada workflow em pushes na branch principal. */
  ci: { nome: string; status: string; conclusao: string | null; sha: string; data: string; url: string }[];
  obtidoEm: string;
}

export class GithubError extends Error {}

/** Lê o número da última página do cabeçalho Link (`rel="last"`). */
export function ultimaPagina(link: string | null): number | null {
  if (!link) return null;
  const m = link.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  return m ? Number(m[1]) : null;
}

interface Opcoes {
  fetch?: typeof fetch;
  /** Base da API (padrão: https://api.github.com). */
  apiBase?: string;
  token?: string;
  timeoutMs?: number;
  now?: () => Date;
}

export async function buscarResumoRepo(repo: string, opcoes: Opcoes = {}): Promise<ResumoRepo> {
  const doFetch = opcoes.fetch ?? globalThis.fetch;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "brasil-tax-playground",
  };
  if (opcoes.token) headers.Authorization = `Bearer ${opcoes.token}`;

  async function get(caminho: string) {
    const res = await doFetch(`${opcoes.apiBase ?? "https://api.github.com"}${caminho}`, {
      headers,
      signal: AbortSignal.timeout(opcoes.timeoutMs ?? 5000),
      cache: "no-store",
    });
    if (!res.ok) {
      const restante = res.headers.get("x-ratelimit-remaining");
      throw new GithubError(
        restante === "0" ? "Limite de requisições da API do GitHub atingido." : `GitHub respondeu HTTP ${res.status}.`,
      );
    }
    return res;
  }

  const base = `/repos/${repo}`;
  const [resRepo, resCommits, resTotal, resIssues, resContrib, resRuns] = await Promise.all([
    get(base),
    get(`${base}/commits?per_page=5`),
    get(`${base}/commits?per_page=1`),
    get(`${base}/issues?state=open&per_page=100`),
    get(`${base}/contributors?per_page=10`),
    get(`${base}/actions/runs?event=push&per_page=10`),
  ]);

  const dadosRepo = repoSchema.parse(await resRepo.json());
  const commits = z.array(commitSchema).parse(await resCommits.json());
  await resTotal.body?.cancel();
  const totalCommits = ultimaPagina(resTotal.headers.get("link"));
  const abertas = z.array(issueSchema).parse(await resIssues.json());
  const contribuidores = z.array(contribuidorSchema).parse(await resContrib.json());
  const runs = runsSchema.parse(await resRuns.json()).workflow_runs;
  const ci: ResumoRepo["ci"] = [];
  for (const run of runs) {
    const nome = run.name ?? "workflow";
    if (ci.some((c) => c.nome === nome)) continue;
    ci.push({
      nome,
      status: run.status ?? "desconhecido",
      conclusao: run.conclusion,
      sha: run.head_sha.slice(0, 7),
      data: run.updated_at,
      url: run.html_url,
    });
  }

  const issues = abertas.filter((i) => i.pull_request === undefined);
  const prs = abertas.filter((i) => i.pull_request !== undefined);
  const paraItem = (i: z.infer<typeof issueSchema>): ItemLink => ({
    titulo: i.title,
    url: i.html_url,
    data: i.created_at,
    autor: i.user?.login ?? null,
    rotulo: `#${i.number}`,
  });

  return {
    repo: {
      nome: dadosRepo.full_name,
      url: dadosRepo.html_url,
      descricao: dadosRepo.description,
      estrelas: dadosRepo.stargazers_count,
      forks: dadosRepo.forks_count,
      observadores: dadosRepo.subscribers_count ?? null,
      licenca: dadosRepo.license?.spdx_id ?? null,
      linguagem: dadosRepo.language,
      topicos: dadosRepo.topics ?? [],
      ultimoPush: dadosRepo.pushed_at,
      branch: dadosRepo.default_branch,
    },
    commits: {
      // Sem cabeçalho Link há uma página só: o total é o que veio.
      total: totalCommits ?? (commits.length < 5 ? commits.length : null),
      recentes: commits.map((c) => ({
        titulo: c.commit.message.split("\n")[0],
        url: c.html_url,
        data: c.commit.author?.date ?? "",
        autor: c.author?.login ?? c.commit.author?.name ?? null,
        rotulo: c.sha.slice(0, 7),
      })),
    },
    issues: { total: issues.length, recentes: issues.slice(0, 5).map(paraItem) },
    prs: { total: prs.length, recentes: prs.slice(0, 5).map(paraItem) },
    contribuidores: contribuidores
      .filter((c) => c.type === "User")
      .map((c) => ({ login: c.login, url: c.html_url, contribuicoes: c.contributions })),
    ci,
    obtidoEm: (opcoes.now?.() ?? new Date()).toISOString(),
  };
}

/**
 * Cache em memória com validade e "último valor bom": se o GitHub falhar,
 * devolve o resumo anterior marcado como desatualizado em vez de nada.
 */
export function criarCacheResumo(buscar: () => Promise<ResumoRepo>, ttlMs: number, agora: () => number = Date.now) {
  let ultimo: { resumo: ResumoRepo; em: number } | null = null;
  let emAndamento: Promise<ResumoRepo> | null = null;

  return async function obter(): Promise<
    { ok: true; resumo: ResumoRepo; desatualizado: boolean } | { ok: false; motivo: string }
  > {
    if (ultimo && agora() - ultimo.em < ttlMs) return { ok: true, resumo: ultimo.resumo, desatualizado: false };
    try {
      // Uma busca por vez, mesmo com várias requisições chegando juntas.
      emAndamento ??= buscar().finally(() => (emAndamento = null));
      const resumo = await emAndamento;
      ultimo = { resumo, em: agora() };
      return { ok: true, resumo, desatualizado: false };
    } catch (error) {
      if (ultimo) return { ok: true, resumo: ultimo.resumo, desatualizado: true };
      return { ok: false, motivo: error instanceof Error ? error.message : "Falha ao consultar o GitHub." };
    }
  };
}
