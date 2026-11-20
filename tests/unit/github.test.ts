import { describe, expect, it, vi } from "vitest";
import { buscarResumoRepo, criarCacheResumo, ultimaPagina, type ResumoRepo } from "@/lib/github/repo";

const json = (body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json", ...headers } });

function fakeGithub(): typeof fetch {
  return vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.endsWith("/repos/dono/repo")) {
      return json({
        full_name: "dono/repo",
        html_url: "https://github.com/dono/repo",
        description: "d",
        stargazers_count: 3,
        forks_count: 1,
        subscribers_count: 2,
        open_issues_count: 2,
        pushed_at: "2026-11-20T00:00:00Z",
        language: "TypeScript",
        topics: ["a"],
        license: { spdx_id: "MIT" },
        default_branch: "main",
      });
    }
    if (u.includes("/commits?per_page=5")) {
      return json([
        {
          sha: "abcdef1234567",
          html_url: "https://github.com/dono/repo/commit/abcdef1",
          commit: { message: "feat: primeira linha\n\ncorpo", author: { name: "Dono", date: "2026-11-20T00:00:00Z" } },
          author: { login: "dono" },
        },
      ]);
    }
    if (u.includes("/commits?per_page=1")) {
      return json([], { link: '<https://api.github.com/x?per_page=1&page=2>; rel="next", <https://api.github.com/x?per_page=1&page=57>; rel="last"' });
    }
    if (u.includes("/issues")) {
      return json([
        { number: 7, title: "bug", html_url: "u7", created_at: "2026-11-20T00:00:00Z", user: { login: "alguem" } },
        { number: 6, title: "bump", html_url: "u6", created_at: "2026-11-20T00:00:00Z", user: { login: "dependabot[bot]" }, pull_request: {} },
      ]);
    }
    if (u.includes("/actions/runs")) {
      const run = (name: string, conclusion: string, t: string) => ({
        name, status: "completed", conclusion, head_sha: "abcdef1234567", updated_at: t, html_url: `run-${name}-${t}`,
      });
      return json({
        workflow_runs: [run("CI", "success", "2026-11-20T02:00:00Z"), run("Secret scan", "success", "2026-11-20T02:00:00Z"), run("CI", "failure", "2026-11-20T01:00:00Z")],
      });
    }
    if (u.includes("/contributors")) {
      return json([
        { login: "dono", html_url: "h", contributions: 57, type: "User" },
        { login: "dependabot[bot]", html_url: "h2", contributions: 3, type: "Bot" },
      ]);
    }
    return new Response("nope", { status: 404 });
  }) as unknown as typeof fetch;
}

describe("ultimaPagina", () => {
  it("reads the last page from the Link header", () => {
    expect(ultimaPagina('<https://api.github.com/x?per_page=1&page=2>; rel="next", <https://api.github.com/x?per_page=1&page=57>; rel="last"')).toBe(57);
    expect(ultimaPagina(null)).toBeNull();
    expect(ultimaPagina('<https://api.github.com/x?page=2>; rel="next"')).toBeNull();
  });
});

describe("buscarResumoRepo", () => {
  it("builds the summary, splits issues from PRs and drops bots from contributors", async () => {
    const r = await buscarResumoRepo("dono/repo", { fetch: fakeGithub(), now: () => new Date("2026-11-20T12:00:00Z") });
    expect(r.repo).toMatchObject({ estrelas: 3, forks: 1, observadores: 2, licenca: "MIT", linguagem: "TypeScript" });
    expect(r.commits.total).toBe(57);
    expect(r.commits.recentes[0]).toMatchObject({ titulo: "feat: primeira linha", rotulo: "abcdef1", autor: "dono" });
    expect(r.issues).toMatchObject({ total: 1, recentes: [{ rotulo: "#7" }] });
    expect(r.prs).toMatchObject({ total: 1, recentes: [{ rotulo: "#6" }] });
    expect(r.contribuidores).toEqual([{ login: "dono", url: "h", contribuicoes: 57 }]);
    expect(r.ci.map((c) => [c.nome, c.conclusao])).toEqual([["CI", "success"], ["Secret scan", "success"]]);
    expect(r.obtidoEm).toBe("2026-11-20T12:00:00.000Z");
  });

  it("explains a rate limit error", async () => {
    const f = vi.fn(async () => new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0" } }));
    await expect(buscarResumoRepo("dono/repo", { fetch: f as unknown as typeof fetch })).rejects.toThrow("Limite de requisições");
  });

  it("sends the token only when configured", async () => {
    const f = fakeGithub();
    await buscarResumoRepo("dono/repo", { fetch: f, token: "t0k" });
    const init = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t0k");
  });
});

describe("criarCacheResumo", () => {
  const resumo = { obtidoEm: "x" } as ResumoRepo;

  it("serves from cache within the TTL and refreshes after it", async () => {
    let agora = 0;
    const buscar = vi.fn(async () => resumo);
    const obter = criarCacheResumo(buscar, 1000, () => agora);
    await obter();
    await obter();
    expect(buscar).toHaveBeenCalledTimes(1);
    agora = 1500;
    await obter();
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it("returns the last good value marked as stale when GitHub fails", async () => {
    let agora = 0;
    const buscar = vi.fn<() => Promise<ResumoRepo>>().mockResolvedValueOnce(resumo).mockRejectedValue(new Error("caiu"));
    const obter = criarCacheResumo(buscar, 1000, () => agora);
    await obter();
    agora = 5000;
    expect(await obter()).toEqual({ ok: true, resumo, desatualizado: true });
  });

  it("reports the failure when there is no previous value", async () => {
    const obter = criarCacheResumo(async () => Promise.reject(new Error("caiu")), 1000);
    expect(await obter()).toEqual({ ok: false, motivo: "caiu" });
  });

  it("makes a single request for concurrent callers", async () => {
    const buscar = vi.fn(async () => resumo);
    const obter = criarCacheResumo(buscar, 1000);
    await Promise.all([obter(), obter(), obter()]);
    expect(buscar).toHaveBeenCalledTimes(1);
  });
});
