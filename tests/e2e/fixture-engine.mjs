// Servidor de REPLAY para testes ponta a ponta — NÃO é um motor de cálculo.
//
// Responde apenas com respostas gravadas dos motores oficiais reais
// (tests/fixtures/<motor>/*). Uma requisição só é atendida se for idêntica à
// de alguma fixture; qualquer outra recebe erro explicando que não há
// gravação. Assim a CI exercita a UI sem Java, sem Go e sem nenhum número ou
// PDF que não tenha vindo dos motores.
//
// Prefixos: /api (regime regular), /sn/api (Simples Nacional), /danfse (gerador).
import { readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { isDeepStrictEqual } from "node:util";

function carregar(pasta) {
  const dir = new URL(`../fixtures/${pasta}/`, import.meta.url);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")));
}
const fixtures = carregar("regime-regular");
const fixturesSimples = carregar("simples-nacional");
const dirDanfse = new URL("../fixtures/danfse/", import.meta.url);
const danfseExemplo = JSON.parse(readFileSync(new URL("exemplo.json", dirDanfse), "utf8"));
const danfsePdf = readFileSync(new URL("exemplo.pdf", dirDanfse));
const danfseErro = JSON.parse(readFileSync(new URL("erro-sem-id.json", dirDanfse), "utf8"));

// Dados abertos gravados do motor (formulário guiado), indexados pelo caminho exato.
const dirDados = new URL("../fixtures/dados-abertos/", import.meta.url);
const dadosAbertos = new Map(
  readdirSync(dirDados)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const { motor = "regime-regular", caminho, corpo } = JSON.parse(readFileSync(new URL(f, dirDados), "utf8"));
      return [`${motor}:${caminho}`, corpo];
    }),
);

const port = Number(process.env.FIXTURE_ENGINE_PORT ?? 18080);

function json(res, status, body, headers = {}) {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
}

function lerCorpo(req, aoTerminar) {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => aoTerminar(body));
}

function replayCalculo(req, res, lista) {
  lerCorpo(req, (body) => {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return json(res, 400, { title: "Bad Request", status: 400, detail: "JSON inválido (replay)" });
    }
    const fixture = lista.find((f) => isDeepStrictEqual(f.requisicao, parsed));
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
}

function dadoAberto(res, motor, caminho) {
  const corpo = dadosAbertos.get(`${motor}:${caminho}`);
  return corpo === undefined
    ? json(res, 404, { title: "Sem gravação", status: 404, detail: "Replay: não há dados abertos gravados para esta consulta." })
    : json(res, 200, corpo);
}

createServer((req, res) => {
  // Simples Nacional
  if (req.method === "GET" && req.url === "/sn/api/versao") return json(res, 200, fixturesSimples[0].motor.versao);
  if (req.method === "GET" && req.url.startsWith("/sn/api/calculadora/simples-nacional/")) {
    return dadoAberto(res, "simples-nacional", req.url.slice("/sn/api".length));
  }
  if (req.method === "POST" && req.url === "/sn/api/calculadora/observabilidade/simples-nacional/nao-assistido") {
    return replayCalculo(req, res, fixturesSimples);
  }
  // Gerador de DANFSe
  if (req.method === "GET" && req.url === "/danfse/health/ready") return json(res, 200, { status: "ok" });
  if (req.method === "POST" && req.url.startsWith("/danfse/api/danfse")) {
    return lerCorpo(req, (body) => {
      if (body === danfseExemplo.xml && req.url === "/danfse/api/danfse") {
        res.writeHead(200, { "Content-Type": "application/pdf" });
        return res.end(danfsePdf);
      }
      if (body === danfseErro.xml) return json(res, danfseErro.status, danfseErro.corpo);
      return json(res, 400, { sucesso: false, mensagem: "replay: não há PDF gravado para este XML" });
    });
  }
  // Regime regular
  if (req.method === "GET" && req.url === "/api/calculadora/dados-abertos/versao") {
    return json(res, 200, fixtures[0].motor.versao);
  }
  if (req.method === "GET" && req.url.startsWith("/api/calculadora/dados-abertos/")) {
    return dadoAberto(res, "regime-regular", req.url.slice("/api".length));
  }
  if (req.method === "POST" && req.url === "/api/calculadora/observabilidade/regime-geral") {
    return replayCalculo(req, res, fixtures);
  }
  json(res, 404, { title: "Not Found", status: 404 });
}).listen(port, "127.0.0.1", () => {
  console.log(
    `fixture-engine (replay) em http://127.0.0.1:${port}: ${fixtures.length} regime regular, ${fixturesSimples.length} Simples, DANFSe`,
  );
});
