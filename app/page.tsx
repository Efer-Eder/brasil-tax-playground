import { EngineStatusPanel } from "@/components/engine-status-panel";
import { ENGINES } from "@/lib/tax-engine";

const STAGE_LABEL = {
  "em-integracao": "Em integração",
  planejado: "Planejado",
} as const;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-10 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Em desenvolvimento</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Brasil Tax Playground</h1>
        <p className="text-lg text-zinc-700 dark:text-zinc-300">
          Uma interface educacional para estudar e testar os motores de cálculo de código aberto da Reforma
          Tributária do Consumo, executados por você mesmo, localmente.
        </p>
      </header>

      <section aria-labelledby="escopo" className="space-y-3">
        <h2 id="escopo" className="text-xl font-semibold">
          O que este projeto faz (e o que não faz)
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-zinc-700 dark:text-zinc-300">
          <li>
            Trata dos tributos da reforma: <strong>CBS</strong> (Contribuição sobre Bens e Serviços),{" "}
            <strong>IBS</strong> (Imposto sobre Bens e Serviços) e <strong>IS</strong> (Imposto Seletivo).
          </li>
          <li>
            Todo valor exibido vem da resposta do <strong>motor de código aberto publicado pela Receita Federal</strong>
            , rodando na sua máquina ou infraestrutura. Esta aplicação não contém alíquotas, fórmulas nem regras
            fiscais próprias.
          </li>
          <li>
            Não interpreta legislação, não emite parecer e não substitui um profissional de contabilidade ou
            tributação.
          </li>
          <li>
            Quando o motor não está configurado ou não responde, a interface diz isso — nunca mostra números
            simulados no lugar.
          </li>
        </ul>
      </section>

      <EngineStatusPanel />

      <section aria-labelledby="integracoes" className="space-y-3">
        <h2 id="integracoes" className="text-xl font-semibold">
          Integrações
        </h2>
        <ul className="space-y-3">
          {ENGINES.map((engine) => (
            <li key={engine.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{engine.nome}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                  {STAGE_LABEL[engine.stage]}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{engine.descricao}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Upstream:{" "}
                <a className="underline underline-offset-2" href={engine.upstreamRepo} rel="noreferrer">
                  {engine.upstreamRepo.replace("https://github.com/", "")}
                </a>{" "}
                · referência consultada {engine.upstreamReferencia}
              </p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-zinc-500">
          O formulário de simulação ainda não existe. O próximo passo é integrar o regime regular de ponta a ponta;
          veja o ROADMAP no repositório.
        </p>
      </section>

      <footer className="border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800">
        Projeto open source sob licença MIT. Sem vínculo com a Receita Federal; os motores oficiais têm licença e
        mantenedores próprios.
      </footer>
    </main>
  );
}
