import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Simulador } from "@/components/simulador/simulador";

export const metadata: Metadata = {
  title: "Simulador · Brasil Tax Playground",
};

export default function SimularPage() {
  return (
    <div className="wrap pt-12 max-sm:pt-8">
      <Link href="/" className="btn btn-ghost btn-sm -ml-3">
        <ArrowLeft aria-hidden="true" />
        Voltar ao projeto
      </Link>
      <header className="mt-6 mb-8 max-w-[720px]">
        <span className="font-mono text-xs tracking-[0.02em] text-fg-3">/simular</span>
        <h1 className="mt-2 text-[32px] leading-10 font-semibold tracking-[-0.03em] max-sm:text-[28px] max-sm:leading-9">
          Simulador do regime regular
        </h1>
        <p className="mt-3 text-[15px] leading-6 text-fg-2">
          Monte a operação passo a passo ou escreva o JSON direto. Os dois modos enviam para o mesmo motor oficial pelo mesmo
          caminho, e o resultado é a resposta dele, sem nenhuma conta feita por esta aplicação. Os exemplos são fictícios.
        </p>
      </header>
      <Simulador />
    </div>
  );
}
