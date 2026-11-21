// Servidor de REPLAY para testes ponta a ponta — NÃO é um motor de cálculo.
//
// Responde apenas com respostas gravadas do motor oficial real
// (tests/fixtures/regime-regular/*.json). Uma requisição de cálculo só é
// atendida se for idêntica à requisição de alguma fixture; qualquer outra
// recebe 422 explicando que não há gravação. Assim a CI exercita a UI sem
// Java e sem nenhum número que não tenha vindo do motor.
import { readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { isDeepStrictEqual } from "node:util";

const dir = new URL("../fixtures/regime-regular/", import.meta.url);
const fixtures = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")));

// Dados abertos gravados do motor (formulário guiado), indexados pelo caminho exato.
const dirDados = new URL("../fixtures/dados-abertos/", import.meta.url);
const dadosAbertos = new Map(
  readdirSync(dirDados)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const { caminho, corpo } = JSON.parse(readFileSync(new URL(f, dirDados), "utf8"));
      return [caminho, corpo];
    }),
);

const port = Number(process.env.FIXTURE_ENGINE_PORT ?? 18080);

function json(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

createServer((req, res) => {
  if (req.method === "GET" && req.url === "/api/calculadora/dados-abertos/versao") {
    return json(res, 200, fixtures[0].motor.versao);
  }
  if (req.method === "GET" && req.url.startsWith("/api/calculadora/dados-abertos/")) {
    const corpo = dadosAbertos.get(req.url.slice("/api".length));
    return corpo === undefined
      ? json(res, 404, { title: "Sem gravação", status: 404, detail: "Replay: não há dados abertos gravados para esta consulta." })
      : json(res, 200, corpo);
  }
  if (req.method === "POST" && req.url === "/api/calculadora/observabilidade/regime-geral") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        return json(res, 400, { title: "Bad Request", status: 400, detail: "JSON inválido (replay)" });
      }
      const fixture = fixtures.find((f) => isDeepStrictEqual(f.requisicao, parsed));
      if (!fixture) {
        return json(res, 422, {
          title: "Sem gravação",
          status: 422,
          detail: "Servidor de replay de testes: não há resposta gravada do motor para esta requisição.",
        });
      }
      const headers = fixture.warningDadosSimulados ? { "x-warning-dados-simulados": fixture.warningDadosSimulados } : {};
      return json(res, fixture.status, fixture.resposta, headers);
    });
    return;
  }
  json(res, 404, { title: "Not Found", status: 404 });
}).listen(port, "127.0.0.1", () => {
  console.log(`fixture-engine (replay) ouvindo em http://127.0.0.1:${port}/api com ${fixtures.length} fixtures`);
});
