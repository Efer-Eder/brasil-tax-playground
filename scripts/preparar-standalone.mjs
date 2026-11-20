// Copia os assets estáticos para dentro do build standalone, como o Next
// exige para rodar `node .next/standalone/server.js`.
import { cpSync, existsSync } from "node:fs";

if (!existsSync(".next/standalone/server.js")) {
  console.error("Build standalone não encontrado. Rode `npm run build` antes.");
  process.exit(1);
}
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
if (existsSync("public")) cpSync("public", ".next/standalone/public", { recursive: true });
