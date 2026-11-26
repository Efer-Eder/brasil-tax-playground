import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Brasil Tax Playground · efer.online",
  description:
    "Playground open source para os motores da Reforma Tributária do Consumo (CBS, IBS e IS) publicados pela Receita Federal. Ferramenta independente e não oficial.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='1' y='1' width='30' height='30' rx='8' fill='%2316171B' stroke='%23343640'/%3E%3Cpath d='M10.5 16.5h10a5 5 0 1 0-1.6 3.7' fill='none' stroke='%23EDEEF0' stroke-width='2.4' stroke-linecap='round'/%3E%3Ccircle cx='24' cy='24' r='2.4' fill='%237377F0'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0C0E",
  colorScheme: "dark",
};

/**
 * As páginas são renderizadas por requisição: a Content-Security-Policy usa um
 * nonce novo a cada resposta (proxy.ts), e o Next só consegue aplicá-lo aos
 * próprios scripts quando a página é gerada na hora. `instant = false` diz ao
 * Next que esta rota pode bloquear a navegação até o HTML chegar (não há shell
 * estático com scripts sem nonce).
 */
export const instant = false;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="relative flex min-h-full flex-col overflow-x-hidden">
        <a
          href="#conteudo"
          className="absolute -top-12 left-4 z-[60] rounded-md border border-line-strong bg-surface-3 px-3 py-2 text-[13px] focus:top-3"
        >
          Pular para o conteúdo
        </a>
        <div className="backdrop" aria-hidden="true" />
        <SiteHeader />
        <main id="conteudo" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
