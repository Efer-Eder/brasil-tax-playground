import Link from "next/link";
import { GithubIcon } from "@/components/icons";
import { LINKS } from "@/lib/links";

/** Cabeçalho no padrão do efer.online, com o aviso legal fixo logo abaixo. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50">
      <div className="h-14 border-b border-line bg-[rgba(11,12,14,0.8)] backdrop-blur-[8px]">
        <div className="wrap flex h-full items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <a href={LINKS.site} className="inline-flex items-center gap-2.5 p-1 -ml-1 text-sm font-semibold tracking-[-0.01em]">
              <span
                aria-hidden="true"
                className="relative grid h-6 w-6 place-items-center rounded-[7px] border border-line-strong bg-surface-2 pb-0.5 text-sm leading-none after:absolute after:right-[3px] after:bottom-[3px] after:h-1 after:w-1 after:rounded-[1px] after:bg-accent"
              >
                e
              </span>
              <span>
                efer<span className="font-medium text-fg-3">.online</span>
              </span>
            </a>
            <span className="text-fg-3" aria-hidden="true">
              /
            </span>
            <Link href="/" className="truncate rounded-md px-1 text-sm font-medium text-fg-2 hover:text-fg-1">
              brasil-tax-playground
            </Link>
          </div>
          <nav aria-label="Principal" className="flex items-center gap-1">
            <Link href="/simular" className="hidden rounded-md px-2.5 py-1.5 text-[13px] font-medium text-fg-2 hover:bg-[var(--surface-hover)] hover:text-fg-1 sm:inline-block">
              Simulador
            </Link>
            <Link href="/#api" className="hidden rounded-md px-2.5 py-1.5 text-[13px] font-medium text-fg-2 hover:bg-[var(--surface-hover)] hover:text-fg-1 sm:inline-block">
              API
            </Link>
            <a
              href={LINKS.repo}
              target="_blank"
              rel="noopener"
              aria-label="Código no GitHub"
              className="ml-2 grid h-8 w-8 place-items-center rounded-md border border-line text-fg-2 hover:text-fg-1"
            >
              <GithubIcon />
            </a>
          </nav>
        </div>
      </div>
      <div
        role="note"
        aria-label="Aviso legal"
        className="border-b border-[rgba(217,165,74,0.24)] bg-[#17140f] px-4 py-1.5 text-center font-mono text-xs leading-4 text-warn"
      >
        Ferramenta independente, não oficial e não substitui orientação contábil ou tributária
      </div>
    </header>
  );
}
