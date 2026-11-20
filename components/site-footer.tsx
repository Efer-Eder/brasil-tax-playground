import { LINKS } from "@/lib/links";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface-1 max-sm:mt-16">
      <div className="wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-6 text-[13px] text-fg-3">
        <p>
          Projeto open source (MIT) de Efer Nascimento. Sem vínculo com a Receita Federal; o motor oficial tem licença e
          mantenedores próprios.
        </p>
        <div className="flex gap-1">
          <a className="rounded-md px-2.5 py-1.5 text-fg-2 hover:bg-[var(--surface-hover)] hover:text-fg-1" href={LINKS.repo} target="_blank" rel="noopener">
            GitHub
          </a>
          <a className="rounded-md px-2.5 py-1.5 text-fg-2 hover:bg-[var(--surface-hover)] hover:text-fg-1" href={LINKS.upstreamRegimeRegular} target="_blank" rel="noopener">
            Motor oficial
          </a>
          <a className="rounded-md px-2.5 py-1.5 text-fg-2 hover:bg-[var(--surface-hover)] hover:text-fg-1" href={LINKS.site}>
            efer.online
          </a>
        </div>
        <p className="w-full border-t border-line-subtle pt-4 font-mono text-xs">
          brasil-tax-playground · MIT · motor calculadora-rtc-regime-regular (MIT, Receita Federal do Brasil)
        </p>
      </div>
    </footer>
  );
}
