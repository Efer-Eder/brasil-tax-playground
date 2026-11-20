import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brasil Tax Playground",
  description:
    "Interface educacional para estudar os motores de código aberto da Reforma Tributária do Consumo (CBS, IBS e IS). Ferramenta independente e não oficial.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <DisclaimerBanner />
        {children}
      </body>
    </html>
  );
}
