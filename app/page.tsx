import Link from "next/link";
import { ArrowUpRight, Play, Terminal } from "lucide-react";
import { EngineStatusPanel } from "@/components/engine-status-panel";
import { GithubCard } from "@/components/github-card";
import { GithubIcon } from "@/components/icons";
import { LINKS } from "@/lib/links";
import { ENGINES } from "@/lib/tax-engine";

const STAGE = {
  "em-integracao": { rotulo: "Integrado", classe: "badge ok" },
  planejado: { rotulo: "Planejado", classe: "badge" },
} as const;

const INDICE = [
  { n: "01", nome: "Simulador", rota: "/simular", href: "/simular", interno: true },
  { n: "02", nome: "API: status do motor", rota: "GET /engine/status", href: `${LINKS.api}/engine/status`, interno: false },
  { n: "03", nome: "Código", rota: "github.com/Efer-Eder/brasil-tax-playground", href: LINKS.repo, interno: false },
];

export default function Home() {
  return (
    <div className="wrap">
      <Hero />
      <section className="pt-2" aria-label="Estado do motor">
        <EngineStatusPanel />
      </section>
      <Repositorio />
      <ComoFunciona />
      <Api />
      <RodarLocal />
      <Integracoes />
      <Qualidade />
    </div>
  );
}

function Hero() {
  return (
    <section className="pt-24 pb-14 max-sm:pt-14 max-sm:pb-10" aria-labelledby="hero-t">
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-1 py-1 pr-2.5 pl-2 font-mono text-xs leading-4 tracking-[0.02em] text-fg-2">
        <span className="dot" aria-hidden="true" />
        open source · MIT · motor oficial 1.7.2
      </span>
      <h1
        id="hero-t"
        className="mt-6 max-w-[760px] text-[52px] leading-[56px] font-semibold tracking-[-0.035em] max-sm:text-4xl max-sm:leading-10 max-sm:tracking-[-0.03em]"
      >
        Brasil Tax Playground.
        <span className="text-fg-3"> Um playground para os motores open source da Reforma Tributária.</span>
      </h1>
      <p className="mt-5 max-w-[640px] text-[17px] leading-7 tracking-[-0.005em] text-fg-2 max-sm:text-base max-sm:leading-[26px]">
        Você monta uma operação, ela vai para o motor de cálculo que a Receita Federal publicou no GitHub e volta a resposta
        crua: CBS, IBS e IS por item, a memória de cálculo em texto e a versão do motor que gerou cada número. Esta
        aplicação não calcula tributo nenhum; ela só valida o formato, chama o motor e mostra o que ele devolveu.
      </p>
      <div className="mt-8 flex flex-wrap gap-2">
        <Link className="btn btn-primary" href="/simular">
          <Play />
          Abrir o simulador
        </Link>
        <a className="btn btn-secondary" href={LINKS.repo} target="_blank" rel="noopener">
          <GithubIcon />
          Código no GitHub
        </a>
        <Link className="btn btn-ghost" href="/#api">
          <Terminal />
          Usar a API
        </Link>
      </div>
      <nav className="mt-12 max-w-[640px] border-t border-line" aria-label="Acesso rápido">
        {INDICE.map((item) => {
          const conteudo = (
            <>
              <span className="font-mono text-xs text-fg-3">{item.n}</span>
              <span>{item.nome}</span>
              <span className="truncate font-mono text-xs text-fg-3 max-sm:hidden">{item.rota}</span>
              <ArrowUpRight className="h-4 w-4 text-fg-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg-1" />
            </>
          );
          const classe =
            "group grid h-11 grid-cols-[32px_1fr_auto_20px] items-center gap-3 rounded-none border-b border-line-subtle px-1 text-sm hover:bg-[var(--surface-hover)] max-sm:grid-cols-[28px_1fr_20px]";
          return item.interno ? (
            <Link key={item.n} href={item.href} className={classe}>
              {conteudo}
            </Link>
          ) : (
            <a key={item.n} href={item.href} className={classe} target="_blank" rel="noopener">
              {conteudo}
            </a>
          );
        })}
      </nav>
    </section>
  );
}

function SecHead({ label, titulo, id, children }: { label: string; titulo: string; id: string; children?: React.ReactNode }) {
  return (
    <div className="sec-head">
      <div>
        <span className="label">{label}</span>
        <h2 id={id}>{titulo}</h2>
      </div>
      {children && <p>{children}</p>}
    </div>
  );
}

function Repositorio() {
  return (
    <section id="github" className="sec" aria-labelledby="gh-t">
      <SecHead label="/github" titulo="Repositório" id="gh-t">
        Dados ao vivo do GitHub. Issue, PR e estrela contam.
      </SecHead>
      <GithubCard repoUrl={LINKS.repo} />
    </section>
  );
}

function ComoFunciona() {
  const passos = [
    {
      n: "01",
      titulo: "Navegador",
      texto: "Editor da operação em JSON, no formato OperacaoInput do motor. Nada fica salvo.",
      tag: "Next.js 16",
    },
    {
      n: "02",
      titulo: "BFF (route handlers)",
      texto: "Valida só a estrutura com zod, aplica teto de itens, fila e timeout, e repassa a operação sem mexer nela.",
      tag: "zod · fila 3",
    },
    {
      n: "03",
      titulo: "Motor oficial",
      texto: "calculadora-rtc-regime-regular 1.7.2, sem modificações, num container sem porta publicada e sem saída para a internet.",
      tag: "Java 25 · SQLite",
    },
  ];
  const regras = [
    {
      n: "01",
      titulo: "Número só do motor",
      texto: "Nenhuma alíquota, redução ou regra está no código. Se o motor cair, a tela diz que caiu; não existe simulador alternativo.",
    },
    {
      n: "02",
      titulo: "Contrato espelhado",
      texto: "Os schemas copiam a Bean Validation das classes de entrada do upstream, com link para o commit. Regra de negócio fica com o motor.",
    },
    {
      n: "03",
      titulo: "Testado contra o real",
      texto: "Fixtures gravadas do motor de verdade, teste de paridade entre resposta e tela, e regressão que falha se o upstream mudar a saída.",
    },
  ];
  return (
    <section id="como" className="sec" aria-labelledby="como-t">
      <SecHead label="/como-funciona" titulo="Como funciona" id="como-t">
        Três camadas, e só a última sabe fazer conta.
      </SecHead>
      <ol className="grid grid-cols-3 gap-3 max-lg:grid-cols-1">
        {passos.map((p, i) => (
          <li key={p.n} className="card relative flex flex-col gap-3 p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-accent-text">{p.n}</span>
              <span className="badge">{p.tag}</span>
            </div>
            <h3 className="text-base font-semibold tracking-[-0.01em]">{p.titulo}</h3>
            <p className="text-[13px] leading-5 text-fg-2">{p.texto}</p>
            {i < passos.length - 1 && (
              <span aria-hidden="true" className="absolute top-1/2 -right-[9px] z-10 hidden h-4 w-4 -translate-y-1/2 rotate-45 border-t border-r border-line-strong bg-bg lg:block" />
            )}
          </li>
        ))}
      </ol>
      <div className="mt-12 grid grid-cols-3 gap-3 max-lg:grid-cols-1">
        {regras.map((r) => (
          <div key={r.n} className="border-t border-line-strong pt-5">
            <span className="font-mono text-xs text-accent-text">{r.n}</span>
            <h3 className="mt-3 text-base leading-6 font-semibold tracking-[-0.01em]">{r.titulo}</h3>
            <p className="mt-2 max-w-[340px] text-fg-2">{r.texto}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Api() {
  const endpoints = [
    { metodo: "GET", rota: "/engine/status", desc: "Estado do motor e versão (app, base de dados e data da base)." },
    {
      metodo: "POST",
      rota: "/simular/regime-regular",
      desc: "Corpo: OperacaoInput. Resposta: requisição, resposta crua do motor, versão e x-warning-dados-simulados.",
    },
  ];
  const codigos = [
    ["200", "ok", "Cálculo feito. Erro por item vem dentro de objetos[].estadoItem, como no motor."],
    ["400", "bad", "JSON inválido."],
    ["413", "warn", "Mais de 50 itens ou corpo acima de 512 KB."],
    ["422", "warn", "Falhou na validação estrutural; a lista traz o caminho de cada problema."],
    ["429", "warn", "Rate limit. Respeite o Retry-After."],
    ["502", "bad", "O motor recusou (ProblemDetail repassado como veio) ou respondeu fora do contrato."],
    ["503", "info", "Fila cheia ou motor fora do ar. Retry-After quando for fila."],
    ["504", "info", "O motor não respondeu em 8 s."],
  ] as const;
  const limites = [
    ["2 req/s", "por cliente, rajada de 20"],
    ["30 req/s", "no total da instância"],
    ["50 itens", "por operação"],
    ["512 KB", "de corpo"],
    ["3 em paralelo", "chamadas ao motor, fila de 32"],
    ["8 s", "timeout do motor"],
  ];
  return (
    <section id="api" className="sec" aria-labelledby="api-t">
      <SecHead label="/api" titulo="API pública" id="api-t">
        Sem cadastro, sem chave, CORS aberto. Base: <span className="font-mono text-fg-1">{LINKS.api.replace("https://", "")}</span>
      </SecHead>
      <div className="grid grid-cols-12 gap-3">
        <div className="card col-span-7 flex flex-col gap-4 p-6 max-lg:col-span-12">
          <ul className="border-t border-line-subtle">
            {endpoints.map((e) => (
              <li key={e.rota} className="grid grid-cols-[56px_1fr] gap-x-3 gap-y-1 border-b border-line-subtle py-3">
                <span className={e.metodo === "GET" ? "badge ok w-fit" : "badge accent w-fit"}>{e.metodo}</span>
                <span className="font-mono text-[13px]">{e.rota}</span>
                <span className="col-start-2 text-[13px] leading-5 text-fg-2">{e.desc}</span>
              </li>
            ))}
          </ul>
          <pre className="code">
            <span className="c"># Estado do motor{"\n"}</span>
            {`curl ${LINKS.api}/engine/status\n\n`}
            <span className="c"># Uma operação fictícia de 2026 (antes de 2027 o motor não aceita aliquotasNominais){"\n"}</span>
            {`curl -X POST ${LINKS.api}/simular/regime-regular \\
  -H 'Content-Type: application/json' \\
  -d '{"id":"teste","versao":"1.0.0","dhFatoGerador":"2026-06-01T10:00:00-03:00",
       "municipio":4314902,"uf":"RS",
       "itens":[{"numero":1,"ncm":"22030000","cst":"000","cClassTrib":"000001","baseCalculo":100}]}'`}
          </pre>
          <p className="text-[13px] leading-5 text-fg-3">
            Os campos são os do motor oficial. A página <Link className="text-accent-text hover:underline" href="/simular">/simular</Link> tem
            exemplos prontos e mostra a requisição e a resposta lado a lado.
          </p>
        </div>
        <div className="col-span-5 flex flex-col gap-3 max-lg:col-span-12">
          <div className="card p-6">
            <h3 className="text-sm font-semibold">Limites da instância</h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              {limites.map(([valor, desc]) => (
                <div key={valor}>
                  <dt className="font-mono text-base font-medium tabular-nums">{valor}</dt>
                  <dd className="text-xs text-fg-3">{desc}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[13px] leading-5 text-fg-2">
              Os números saíram de teste de carga no servidor (cerca de 30 req/s com 1 item e 6 req/s com 50). Precisa de
              mais? Rode o motor na sua máquina; o passo a passo está no repositório.
            </p>
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-semibold">Códigos de resposta</h3>
            <ul className="mt-3 border-t border-line-subtle font-mono text-xs">
              {codigos.map(([codigo, tom, desc]) => (
                <li key={codigo} className="grid grid-cols-[44px_1fr] items-start gap-3 border-b border-line-subtle py-2">
                  <span className={`badge ${tom} justify-center`}>{codigo}</span>
                  <span className="font-sans text-[13px] leading-5 text-fg-2">{desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function RodarLocal() {
  return (
    <section id="local" className="sec" aria-labelledby="local-t">
      <SecHead label="/rodar-local" titulo="Rodar na sua máquina" id="local-t">
        Node 20.9+ para o app. Java 25 para o motor, se quiser subir o seu.
      </SecHead>
      <div className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
        <div className="card flex flex-col gap-3 p-6">
          <h3 className="text-sm font-semibold">App</h3>
          <pre className="code">
            {`git clone ${LINKS.repo}.git
cd brasil-tax-playground
npm ci
npm run dev`}
          </pre>
          <p className="text-[13px] leading-5 text-fg-2">
            Sem motor configurado, o painel mostra <span className="font-mono">nao-configurado</span> e nenhuma simulação roda. É o
            comportamento esperado.
          </p>
        </div>
        <div className="card flex flex-col gap-3 p-6">
          <h3 className="text-sm font-semibold">Motor oficial (Windows)</h3>
          <pre className="code">
            <span className="c"># fora da pasta do app{"\n"}</span>
            {`git -c core.longpaths=true clone --branch 1.7.2 \\
  ${LINKS.upstreamRegimeRegular}.git
mkdir calculadora\\db
.\\mvnw.cmd flyway:migrate "-Dflyway.configFiles=flyway\\flyway-pro.conf"
.\\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=offline"`}
            <span className="c">{"\n\n"}# no .env.local do app{"\n"}</span>
            {`REGIME_REGULAR_ENGINE_URL=http://localhost:8080/api`}
          </pre>
          <p className="text-[13px] leading-5 text-fg-2">
            Precisa de <span className="font-mono">JAVA_HOME</span> definido. Detalhes e armadilhas em{" "}
            <a className="text-accent-text hover:underline" href={`${LINKS.repo}/blob/main/docs/upstream-integration.md`} target="_blank" rel="noopener">
              docs/upstream-integration.md
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}

function Integracoes() {
  return (
    <section id="motores" className="sec" aria-labelledby="motores-t">
      <SecHead label="/motores" titulo="Motores oficiais" id="motores-t">
        Repositórios da Receita Federal, todos MIT. Ativo aqui só o que está integrado e testado.
      </SecHead>
      <ul className="border-t border-line">
        {ENGINES.map((engine) => (
          <li
            key={engine.id}
            className="grid grid-cols-[112px_1fr_auto] items-center gap-4 border-b border-line-subtle py-3 max-sm:grid-cols-[auto_1fr] max-sm:gap-y-1.5"
          >
            <span>
              <span className={STAGE[engine.stage].classe}>{STAGE[engine.stage].rotulo}</span>
            </span>
            <span className="min-w-0">
              <span className="block font-medium">{engine.nome}</span>
              <span className="block text-[13px] leading-5 text-fg-2">{engine.descricao}</span>
            </span>
            <a
              className="inline-flex items-center gap-1.5 font-mono text-xs text-fg-3 hover:text-fg-1 max-sm:col-span-2"
              href={engine.upstreamRepo}
              target="_blank"
              rel="noopener"
            >
              {engine.upstreamReferencia}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Qualidade() {
  const itens = [
    ["Unitários", "Vitest: validação, erros do motor, fila, cache e o card do GitHub."],
    ["Paridade", "A tela é renderizada a partir de respostas gravadas do motor real e comparada número a número."],
    ["Regressão", "Opcional, contra um motor rodando: falha se o upstream mudar a saída."],
    ["Ponta a ponta", "Playwright contra um servidor que só reproduz respostas gravadas."],
  ];
  return (
    <section id="qualidade" className="sec" aria-labelledby="qual-t">
      <SecHead label="/qualidade" titulo="Testes e CI" id="qual-t">
        CI no Ubuntu e no Windows, mais varredura de segredos. O resultado do último run aparece no card do repositório.
      </SecHead>
      <div className="card grid grid-cols-4 divide-x divide-line-subtle max-lg:grid-cols-2 max-lg:divide-x-0 max-sm:grid-cols-1">
        {itens.map(([titulo, desc]) => (
          <div key={titulo} className="p-6">
            <h3 className="text-sm font-semibold">{titulo}</h3>
            <p className="mt-2 text-[13px] leading-5 text-fg-2">{desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <a className="btn btn-ghost" href={`${LINKS.repo}/actions`} target="_blank" rel="noopener">
          Ver os runs no GitHub
          <ArrowUpRight />
        </a>
      </div>
    </section>
  );
}
