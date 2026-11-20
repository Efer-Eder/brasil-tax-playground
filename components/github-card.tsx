"use client";

import { ArrowUpRight, CircleDot, GitCommitHorizontal, GitFork, GitPullRequest, Star, Eye, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { GithubIcon } from "@/components/icons";
import { withBasePath } from "@/lib/base-path";
import type { ItemLink, ResumoRepo } from "@/lib/github/repo";

type Resposta = { ok: true; resumo: ResumoRepo; desatualizado: boolean } | { ok: false; motivo: string };
type Estado = { kind: "carregando" } | { kind: "pronto"; resposta: Resposta } | { kind: "erro"; motivo: string };

const relativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

function haQuanto(iso: string): string {
  const seg = (new Date(iso).getTime() - Date.now()) / 1000;
  const passos: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unidade, s] of passos) {
    if (Math.abs(seg) >= s) return relativo.format(Math.round(seg / s), unidade);
  }
  return "agora";
}

/** Card ao vivo do repositório, com dados da API pública do GitHub (via /api/github). */
export function GithubCard({ repoUrl }: { repoUrl: string }) {
  const [estado, setEstado] = useState<Estado>({ kind: "carregando" });

  useEffect(() => {
    const controller = new AbortController();
    fetch(withBasePath("/api/github"), { signal: controller.signal })
      .then(async (res) => setEstado({ kind: "pronto", resposta: (await res.json()) as Resposta }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setEstado({ kind: "erro", motivo: error instanceof Error ? error.message : "falha desconhecida" });
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="card overflow-hidden" aria-live="polite">
      <div className="flex h-10 items-center justify-between gap-3 border-b border-line-subtle bg-[rgba(17,18,21,0.72)] px-4 font-mono text-[11px] text-fg-3">
        <span className="inline-flex min-w-0 items-center gap-2">
          <GithubIcon size={12} />
          <span className="truncate">{repoUrl.replace("https://", "")}</span>
        </span>
        <span>{rodape(estado)}</span>
      </div>
      <Corpo estado={estado} repoUrl={repoUrl} />
    </div>
  );
}

function rodape(estado: Estado) {
  if (estado.kind !== "pronto" || !estado.resposta.ok) return "api.github.com";
  const { resumo, desatualizado } = estado.resposta;
  return `${desatualizado ? "último dado bom · " : ""}atualizado ${haQuanto(resumo.obtidoEm)}`;
}

function Corpo({ estado, repoUrl }: { estado: Estado; repoUrl: string }) {
  if (estado.kind === "carregando") {
    return <p className="p-6 text-[13px] text-fg-3">Buscando dados do repositório…</p>;
  }
  const motivo = estado.kind === "erro" ? estado.motivo : !estado.resposta.ok ? estado.resposta.motivo : null;
  if (motivo !== null || estado.kind !== "pronto" || !estado.resposta.ok) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 text-[13px] text-fg-2">
        <span>Não deu para falar com a API do GitHub agora ({motivo}). Os dados ficam no próprio repositório.</span>
        <a className="btn btn-secondary btn-sm" href={repoUrl} target="_blank" rel="noopener">
          Abrir no GitHub
          <ArrowUpRight aria-hidden="true" />
        </a>
      </div>
    );
  }

  const r = estado.resposta.resumo;
  const numeros = [
    { icone: Star, valor: r.repo.estrelas, rotulo: "estrelas" },
    { icone: GitFork, valor: r.repo.forks, rotulo: "forks" },
    { icone: Eye, valor: r.repo.observadores ?? "n/d", rotulo: "observando" },
    { icone: GitCommitHorizontal, valor: r.commits.total ?? "n/d", rotulo: "commits" },
    { icone: CircleDot, valor: r.issues.total, rotulo: "issues abertas" },
    { icone: GitPullRequest, valor: r.prs.total, rotulo: "PRs abertos" },
  ];

  return (
    <div>
      <dl className="grid grid-cols-6 divide-x divide-line-subtle border-b border-line-subtle max-lg:grid-cols-3 max-lg:divide-x-0 max-sm:grid-cols-2">
        {numeros.map(({ icone: Icone, valor, rotulo }) => (
          <div key={rotulo} className="flex flex-col gap-1 px-5 py-4">
            <dt className="inline-flex items-center gap-1.5 font-mono text-[11px] text-fg-3">
              <Icone className="h-3.5 w-3.5" aria-hidden="true" />
              {rotulo}
            </dt>
            <dd className="text-xl font-semibold tabular-nums tracking-[-0.02em]">{valor}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-3 divide-x divide-line-subtle max-lg:grid-cols-1 max-lg:divide-x-0 max-lg:divide-y">
        <Lista titulo="Commits recentes" itens={r.commits.recentes} vazio="Sem commits." mais={`${repoUrl}/commits/${r.repo.branch}`} />
        <Lista
          titulo="Issues e PRs abertos"
          itens={[...r.issues.recentes, ...r.prs.recentes].slice(0, 5)}
          vazio="Nada aberto agora. Achou um problema? Abra uma issue."
          mais={`${repoUrl}/issues`}
        />
        <div className="p-5">
          <h3 className="inline-flex items-center gap-1.5 font-mono text-xs text-fg-3">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Contribuidores
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {r.contribuidores.map((c) => (
              <li key={c.login} className="flex items-center justify-between gap-3 text-[13px]">
                <a className="font-mono hover:text-accent-text" href={c.url} target="_blank" rel="noopener">
                  @{c.login}
                </a>
                <span className="font-mono text-xs tabular-nums text-fg-3">{c.contribuicoes} commits</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] leading-5 text-fg-2">
            PR é bem-vindo. Só uma regra: nada de alíquota ou regra fiscal no código, número vem do motor.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn btn-secondary btn-sm" href={repoUrl} target="_blank" rel="noopener">
              <Star aria-hidden="true" />
              Dar estrela
            </a>
            <a className="btn btn-ghost btn-sm" href={`${repoUrl}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noopener">
              Como contribuir
            </a>
          </div>
        </div>
      </div>

      {r.ci.length > 0 && (
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line-subtle px-5 py-3" aria-label="Último CI na branch principal">
          {r.ci.map((c) => (
            <li key={c.nome}>
              <a className="inline-flex items-center gap-2 text-[13px] hover:text-fg-1" href={c.url} target="_blank" rel="noopener">
                <span className={classeCi(c)}>{rotuloCi(c)}</span>
                <span className="text-fg-2">{c.nome}</span>
                <span className="font-mono text-[11px] text-fg-3">
                  {c.sha} · {haQuanto(c.data)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {(r.repo.licenca || r.repo.linguagem || r.repo.topicos.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line-subtle px-5 py-3">
          {r.repo.licenca && <span className="badge">{r.repo.licenca}</span>}
          {r.repo.linguagem && <span className="badge">{r.repo.linguagem}</span>}
          {r.repo.topicos.map((t) => (
            <span key={t} className="badge accent">
              {t}
            </span>
          ))}
          <span className="ml-auto font-mono text-[11px] text-fg-3">último push {haQuanto(r.repo.ultimoPush)}</span>
        </div>
      )}
    </div>
  );
}

function Lista({ titulo, itens, vazio, mais }: { titulo: string; itens: ItemLink[]; vazio: string; mais: string }) {
  return (
    <div className="flex flex-col p-5">
      <h3 className="font-mono text-xs text-fg-3">{titulo}</h3>
      {itens.length === 0 ? (
        <p className="mt-3 text-[13px] leading-5 text-fg-2">{vazio}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {itens.map((i) => (
            <li key={i.url} className="min-w-0">
              <a className="group block" href={i.url} target="_blank" rel="noopener">
                <span className="block truncate text-[13px] group-hover:text-accent-text">{i.titulo}</span>
                <span className="font-mono text-[11px] text-fg-3">
                  {i.rotulo} · {i.autor ?? "?"} · {i.data ? haQuanto(i.data) : ""}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <a className="mt-auto inline-flex items-center gap-1 pt-4 font-mono text-[11px] text-fg-3 hover:text-fg-1" href={mais} target="_blank" rel="noopener">
        ver todos
        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
      </a>
    </div>
  );
}

type Ci = ResumoRepo["ci"][number];

function rotuloCi(c: Ci) {
  if (c.status !== "completed") return "rodando";
  return { success: "passou", failure: "falhou", cancelled: "cancelado" }[c.conclusao ?? ""] ?? (c.conclusao ?? "n/d");
}

function classeCi(c: Ci) {
  if (c.status !== "completed") return "badge info";
  if (c.conclusao === "success") return "badge ok";
  if (c.conclusao === "failure") return "badge bad";
  return "badge";
}
