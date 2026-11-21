import type { NextConfig } from "next";

/**
 * Subcaminho de publicação, definido no BUILD (ex.: /projeto/brasil-tax-playground
 * em efer.online). Vazio = raiz, que é o padrão para rodar localmente.
 */
const basePath = (process.env.NEXT_BASE_PATH ?? "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  output: "standalone",
  poweredByHeader: false,
  // Cabeçalhos de segurança básicos para todas as rotas.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
  // Sem next/image no app; desligar o otimizador evita depender do sharp nativo.
  images: { unoptimized: true },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
