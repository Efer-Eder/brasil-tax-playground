export const DISCLAIMER =
  "Ferramenta independente, não oficial e não substitui orientação contábil ou tributária";

/** Rótulo persistente exibido em todas as páginas (fixo no topo). */
export function DisclaimerBanner() {
  return (
    <div
      role="note"
      aria-label="Aviso legal"
      className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      {DISCLAIMER}
    </div>
  );
}
