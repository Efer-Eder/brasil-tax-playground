/** Prefixa caminhos usados em `fetch` no navegador com o basePath do build. */
export function withBasePath(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}
