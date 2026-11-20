// Mede latência e vazão do motor (ou da API pública) para dimensionar limites.
//
// Uso:
//   node scripts/carga-motor.mjs <url-do-endpoint> [segundos-por-nivel] [niveis] [itens]
// Ex.: node scripts/carga-motor.mjs http://localhost:8080/api/calculadora/observabilidade/regime-geral 10 1,2,4,8,16 1
//
// Envia operações fictícias de 2026 (sem alíquotas). Não grava nada.
const [url, segArg = "10", niveisArg = "1,2,4,8,16", itensArg = "1"] = process.argv.slice(2);
if (!url) {
  console.error("informe a URL do endpoint");
  process.exit(1);
}
const segundos = Number(segArg);
const niveis = niveisArg.split(",").map(Number);
const itens = Number(itensArg);

const corpo = JSON.stringify({
  id: "carga",
  versao: "1.0.0",
  dhFatoGerador: "2026-06-01T10:00:00-03:00",
  municipio: 4314902,
  uf: "RS",
  itens: Array.from({ length: itens }, (_, i) => ({
    numero: i + 1,
    ncm: "22030000",
    cst: "000",
    cClassTrib: "000001",
    baseCalculo: 100.0,
  })),
});

function pct(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

async function nivel(concorrencia) {
  const fim = Date.now() + segundos * 1000;
  const lat = [];
  const status = {};
  async function worker() {
    while (Date.now() < fim) {
      const t0 = performance.now();
      try {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: corpo });
        await r.arrayBuffer();
        status[r.status] = (status[r.status] ?? 0) + 1;
      } catch {
        status.erro = (status.erro ?? 0) + 1;
      }
      lat.push(performance.now() - t0);
    }
  }
  const t0 = Date.now();
  await Promise.all(Array.from({ length: concorrencia }, worker));
  const dur = (Date.now() - t0) / 1000;
  lat.sort((a, b) => a - b);
  return {
    concorrencia,
    reqs: lat.length,
    rps: +(lat.length / dur).toFixed(1),
    p50: +pct(lat, 50).toFixed(1),
    p95: +pct(lat, 95).toFixed(1),
    p99: +pct(lat, 99).toFixed(1),
    status,
  };
}

// Aquecimento (JIT e caches do motor).
await nivel(2).catch(() => {});
console.log(`itens/op=${itens} segundos/nivel=${segundos}`);
for (const c of niveis) console.log(JSON.stringify(await nivel(c)));
