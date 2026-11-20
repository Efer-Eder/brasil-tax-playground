#!/usr/bin/env bash
# Executado NA VPS pelo deploy.ps1 (enviado como arquivo, não inline).
# Uso: bash remoto.sh <pacote.tgz> <aplicar-nginx:0|1>
set -euo pipefail

PACOTE="$1"
APLICAR_NGINX="${2:-0}"
BASE=/opt/projects/brasil-tax-playground
TS=$(date -u +%Y%m%dT%H%M%SZ)
REL="$BASE/releases/$TS"
SITE=/etc/nginx/sites-available/efer.online
INCLUDE_LINE='    include /etc/nginx/snippets/brasil-tax-playground.conf;'

echo "== release $TS"
mkdir -p "$REL"
tar -xzf "$PACOTE" -C "$REL"
rm -f "$PACOTE"
ln -sfn "$REL" "$BASE/current"

cd "$BASE/current"
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up -d

echo "== aguardando app e motor"
ok=0
for i in $(seq 1 90); do
  if curl -fsS --max-time 3 http://127.0.0.1:3020/projeto/brasil-tax-playground/api/engine/status 2>/dev/null | grep -q '"state":"disponivel"'; then
    ok=1; break
  fi
  sleep 2
done
docker compose -f docker-compose.yml ps
if [ "$ok" != 1 ]; then
  echo "ERRO: app/motor não ficaram disponíveis"; docker compose -f docker-compose.yml logs --tail 60; exit 1
fi
echo "app e motor disponíveis"

if [ "$APLICAR_NGINX" = 1 ]; then
  echo "== nginx"
  mkdir -p /var/backups/nginx && chmod 700 /var/backups/nginx
  cp -a "$SITE" "/var/backups/nginx/efer.online.brasil-tax-backup-$TS"
  [ -f /etc/nginx/conf.d/brasil-tax-playground.conf ] && cp -a /etc/nginx/conf.d/brasil-tax-playground.conf "/var/backups/nginx/conf.d-brasil-tax-playground.$TS"
  [ -f /etc/nginx/snippets/brasil-tax-playground.conf ] && cp -a /etc/nginx/snippets/brasil-tax-playground.conf "/var/backups/nginx/snippet-brasil-tax-playground.$TS"

  install -m 644 nginx/conf.d-brasil-tax-playground.conf /etc/nginx/conf.d/brasil-tax-playground.conf
  install -m 644 nginx/snippet-brasil-tax-playground.conf /etc/nginx/snippets/brasil-tax-playground.conf

  if ! grep -qF 'snippets/brasil-tax-playground.conf' "$SITE"; then
    # Só no primeiro server_name que contém efer.online, logo após essa linha.
    awk -v linha="$INCLUDE_LINE" '
      { print }
      !feito && /server_name .*efer\.online/ { print linha; feito=1 }
    ' "$SITE" > "$SITE.tmp.$TS"
    mv "$SITE.tmp.$TS" "$SITE"
  fi

  if nginx -t; then
    systemctl reload nginx
    echo "nginx recarregado"
  else
    echo "ERRO: nginx -t falhou; restaurando"
    cp -a "/var/backups/nginx/efer.online.brasil-tax-backup-$TS" "$SITE"
    rm -f /etc/nginx/conf.d/brasil-tax-playground.conf /etc/nginx/snippets/brasil-tax-playground.conf
    [ -f "/var/backups/nginx/conf.d-brasil-tax-playground.$TS" ] && cp -a "/var/backups/nginx/conf.d-brasil-tax-playground.$TS" /etc/nginx/conf.d/brasil-tax-playground.conf
    [ -f "/var/backups/nginx/snippet-brasil-tax-playground.$TS" ] && cp -a "/var/backups/nginx/snippet-brasil-tax-playground.$TS" /etc/nginx/snippets/brasil-tax-playground.conf
    nginx -t && systemctl reload nginx
    exit 1
  fi
fi

# Mantém as 5 releases mais recentes.
ls -1dt "$BASE"/releases/* | tail -n +6 | xargs -r rm -rf
echo "== ok $TS"
