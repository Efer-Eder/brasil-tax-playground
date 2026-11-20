import type { Metadata } from "next";
import Link from "next/link";
import { SimuladorRegimeRegular } from "@/components/simulador-regime-regular";

export const metadata: Metadata = {
  title: "Simular regime regular · Brasil Tax Playground",
};

export default function SimularPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-10 sm:px-6">
      <nav className="text-sm">
        <Link href="/" className="text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200">
          ← Início
        </Link>
      </nav>
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Simular — regime regular</h1>
        <p className="text-zinc-700 dark:text-zinc-300">
          Edite a operação em JSON e envie ao motor oficial que você está rodando. Tudo o que aparece no resultado
          vem da resposta do motor, sem cálculos feitos por esta aplicação. Os exemplos são fictícios.
        </p>
      </header>
      <SimuladorRegimeRegular />
    </main>
  );
}
