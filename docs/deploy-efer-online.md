# Instância pública em efer.online

- App: <https://efer.online/projeto/brasil-tax-playground/>
- API pública: `https://efer.online/api/brasil-tax-playground/<endpoint>`
  - `GET  /api/brasil-tax-playground/engine/status`
  - `POST /api/brasil-tax-playground/simular/regime-regular` (corpo = `OperacaoInput` do motor, JSON)

A instância roda o **motor oficial** `calculadora-rtc-regime-regular` 1.7.2 (`32df719`), sem modificações, ao lado do app. Ela continua **independente e não oficial**: os números vêm do motor, nada é armazenado e não há cadastro, cookies ou telemetria.

## Arquitetura

```text
Cloudflare ──HTTPS──> Nginx (VPS)
                       ├─ /projeto/brasil-tax-playground/      -> 127.0.0.1:3020 (app)
                       ├─ /projeto/brasil-tax-playground/api/  -> 127.0.0.1:3020 (app)  [rate limit API]
                       └─ /api/brasil-tax-playground/*         -> idem, prefixo trocado  [rate limit API]
Docker Compose "brasil-tax-playground"
  app        (Next.js standalone, 256 MB, 0,75 CPU)  redes: interna + publica
  rtc-engine (motor oficial, JVM, 640 MB, 1,0 CPU)   rede:  interna (internal: true, sem porta publicada)
```

- O motor não tem porta publicada nem saída para a internet. Só o app fala com ele.
- Arquivos: `deploy/docker-compose.yml`, `deploy/engine/Dockerfile`, `deploy/app/Dockerfile`, `deploy/nginx/*.conf`, `deploy/deploy.ps1`, `deploy/remoto.sh`.
- Na VPS: `/opt/projects/brasil-tax-playground/releases/<UTC>` e `current` → release ativa (5 mantidas). Nginx: `/etc/nginx/conf.d/brasil-tax-playground.conf` (zonas) e `/etc/nginx/snippets/brasil-tax-playground.conf` (rotas), incluído no server `efer.online` logo após a linha `server_name`. Backups em `/var/backups/nginx/`.

## Medições que embasam os limites

Script: `node scripts/carga-motor.mjs <url> <segundos> <concorrências> <itens>`. Operação fictícia de 2026 sem alíquotas.

### 1. Local, motor com as flags de produção (heap 320 MB, SerialGC, **preso a 2 núcleos**)

| Itens/op | Concorrência | req/s | p50 | p95 | p99 |
|---|---|---|---|---|---|
| 1 | 1 | 289 | 3,1 ms | 4,5 ms | 9,1 ms |
| 1 | 2 | 407 | 4,9 ms | 6,5 ms | 8,5 ms |
| 1 | 4 | 470 | 7,4 ms | 14 ms | 36 ms |
| 1 | 8 | 608 | 10 ms | 27 ms | 74 ms |
| 1 | 16 | 672 | 19 ms | 49 ms | 169 ms |
| 50 | 2 | 23,5 | 81 ms | 111 ms | 130 ms |
| 50 | 4 | 25,3 | 157 ms | 210 ms | 236 ms |

Memória: RSS de 377 MB ao subir e **pico de 441 MB** sob carga (heap máx. 320 MB). Sem heap limitado, o motor chegou a 518 MB.

### 2. Na VPS, depois do deploy (2026-11-20)

Motor direto, de dentro da rede Docker:

| Itens/op | Concorrência | req/s | p50 | p95 |
|---|---|---|---|---|
| 1 | 1 | 90 | 9,9 ms | 19 ms |
| 1 | 3 | 190 | 14 ms | 30 ms |

Pela API do app (`127.0.0.1:3020`, sem Cloudflare), com o app a 0,75 CPU e o motor a 1,0 CPU:

| Itens/op | Concorrência | req/s | p50 | p95 |
|---|---|---|---|---|
| 1 | 1 | 17–28 | 31–52 ms | 55–87 ms |
| 1 | 3 | 24 | 112 ms | 192 ms |
| 1 | 6 | 33 | 177 ms | 259 ms |
| 50 | 3 | 5,6 | 520 ms | 598 ms |

Memória sob carga: motor 399–474 MB (teto 640 MB), app 66–72 MB (teto 256 MB). Nenhum erro.

A CPU da VPS é ~3× mais lenta por requisição que a máquina local. O app (Next.js) acrescenta ~20 ms por chamada. Tirar o teto de CPU do app não mudou a latência (31 ms × 32 ms), então o teto não é o gargalo. **Capacidade real da API: ~30 req/s com 1 item e ~6 req/s com 50 itens.**

### Custo por requisição (local, 2 núcleos)

Com 2 núcleos saturados:

- 1 item: 2 núcleos / 407 req/s ≈ **4,9 ms de CPU por operação**;
- 50 itens: 2 núcleos / 25 req/s ≈ **80 ms de CPU por operação**.

Aproximação linear: **custo ≈ 3,4 ms + 1,5 ms × itens** (CPU-ms).

### Orçamento na VPS

VPS: 2 vCPU, ~3,9 GB de RAM, ~1,9 GB disponíveis antes do deploy, compartilhada com outros serviços.

| Recurso | Decisão | Motivo |
|---|---|---|
| CPU | motor `cpus: 1.0`, app `cpus: 0.75` | A soma dos tetos (1,75) fica abaixo dos 2 vCPU: sempre sobra ≥ 0,25 núcleo para os outros serviços, mesmo com o playground saturado. |
| RAM do motor | `mem_limit: 640m`, `-Xmx320m` | Pico medido 441 MB + ~45% de folga. Sem swap extra (`memswap_limit` = limite). |
| RAM do app | `mem_limit: 256m`, `--max-old-space-size=160` | Next standalone usa ~100–150 MB. |
| Total novo | ≤ 896 MB de teto (uso real esperado ~550 MB) | Cabe nos ~1,9 GB disponíveis, sobrando > 1 GB. |

### Limites do app (fila antes do motor)

| Variável | Valor | Conta |
|---|---|---|
| `SIMULACAO_MAX_CONCORRENCIA` | 3 | Com 1,0 CPU, 3 chamadas simultâneas já levam o motor a ~190 req/s (p95 30 ms) na VPS. Mais que isso só aumenta a fila dentro da JVM. |
| `SIMULACAO_MAX_ITENS` | 50 | Pior caso medido na VPS: p95 ~600 ms com 3 em paralelo. Operações maiores: dividir ou rodar o motor localmente. |
| `SIMULACAO_MAX_FILA` | 32 | Com 1 item (~30 req/s), 32 na fila esperam ~1 s. Com 50 itens (~6 req/s), quem estiver além de ~18 na fila estoura os 3 s e recebe 503: é o comportamento desejado. |
| `SIMULACAO_MAX_ESPERA_MS` | 3000 | Acima disso responde 503 `ocupado` com `Retry-After: 5`, em vez de acumular. |
| `REGIME_REGULAR_ENGINE_TIMEOUT_MS` | 8000 | ~13× o p95 do pior caso na VPS; só dispara se o motor travar. |
| Cache da versão do motor | 60 s | A versão só muda com novo deploy; evita uma segunda chamada ao motor por simulação. |


### Rate limit no Nginx

O site fica atrás do Cloudflare e o Nginx não usa `real_ip`, então a chave por cliente é `CF-Connecting-IP` (com `$binary_remote_addr` como reserva).

| Zona | Taxa | Burst | Conta |
|---|---|---|---|
| API por cliente (`btp_api_ip`) | 2 req/s | 20 | Uso humano/integração folgado. Com a capacidade de ~30 req/s, cabem ~15 clientes no ritmo máximo ao mesmo tempo. |
| API total (`btp_api_total`) | 30 req/s | 60 | Igual à capacidade medida com 1 item. Com operações grandes (~6 req/s), quem segura é a fila do app, que devolve 503 rápido. |
| Páginas por cliente (`btp_web_ip`) | 10 req/s | 60 | Primeira carga busca ~15–25 assets. |
| Conexões por cliente | 10 (API) / 20 (páginas) | — | Evita segurar muitos sockets. |

Excedeu → **429** em JSON com `Retry-After: 2`. Conferido pelo caminho público: 40 requisições simultâneas do mesmo cliente → 10 × 200 e 30 × 429 (o limite de 10 conexões corta primeiro). Corpo máximo da API: 512 KB (`client_max_body_size`), igual ao limite do app e ao `max-in-memory-size` do upstream.

### Timeouts em camadas

| Camada | Timeout |
|---|---|
| Cloudflare → Nginx | padrão do Cloudflare (100 s) |
| Nginx → app | conexão 2 s, envio 10 s, leitura **15 s**; corpo do cliente 10 s |
| App: espera na fila | **3 s** → 503 `ocupado` |
| App → motor | **8 s** → 504 `indisponivel` |

A ordem garante que o app sempre responde (8 s + 3 s < 15 s) antes de o Nginx desistir.

## Como publicar uma nova versão

Pré-requisitos locais: Node 24, Java 25 com `JAVA_HOME`, acesso SSH à VPS e um clone do motor na tag desejada, com `flyway:migrate` e `clean package` já executados (ver [upstream-integration.md](upstream-integration.md)).

```powershell
.\deploy\deploy.ps1 -Vps root@<ip-da-vps> -Key <caminho-da-chave> -EngineDir C:\caminho\calculadora-rtc-regime-regular -Nginx
```

Sem `-Nginx`, só app e motor são atualizados. O script gera o build standalone com `NEXT_BASE_PATH=/projeto/brasil-tax-playground`, empacota tudo, envia, roda `docker compose build/up`, espera o status `disponivel` e, com `-Nginx`, instala as configs com backup e `nginx -t` (restaura sozinho se falhar).

Ao trocar a versão do motor: regravar as fixtures (`npm run fixtures:gravar`) e atualizar `upstreamReferencia` e a tag da imagem no Compose.

## Como reverter

```bash
cd /opt/projects/brasil-tax-playground
ln -sfn releases/<release-anterior> current && cd current && docker compose up -d --build
# Nginx (se preciso):
cp -a /var/backups/nginx/efer.online.brasil-tax-backup-<UTC> /etc/nginx/sites-available/efer.online
nginx -t && systemctl reload nginx
# Remover tudo:
docker compose -p brasil-tax-playground down
rm /etc/nginx/conf.d/brasil-tax-playground.conf /etc/nginx/snippets/brasil-tax-playground.conf
# e apagar a linha "include /etc/nginx/snippets/brasil-tax-playground.conf;" do site, depois nginx -t && reload
```
