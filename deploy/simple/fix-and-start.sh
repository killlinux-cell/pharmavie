#!/bin/bash
# Corrige et redémarre API + Web + Nginx
set -euo pipefail

cd /opt/pharmavie

chmod +x deploy/simple/start-api.sh deploy/simple/start-web.sh

# Vérifier .env
if [[ ! -f apps/api/.env ]]; then
  echo "✗ apps/api/.env manquant — relancez: bash deploy/simple/deploy.sh"
  exit 1
fi

# Vérifier build
if [[ ! -f apps/api/dist/src/main.js ]]; then
  echo ">> Build API..."
  npm run build -w @pharmavie/api
fi

# DB
cd deploy/simple
docker compose -f docker-compose.db.yml up -d
sleep 3

# PM2
cd /opt/pharmavie
pm2 delete all 2>/dev/null || true
pm2 start deploy/simple/ecosystem.config.cjs
pm2 save

echo ">> Attente démarrage API (15 sec)..."
for i in $(seq 1 15); do
  if curl -sf http://127.0.0.1:3001/api/v1/health > /dev/null 2>&1; then
    echo "✔ API OK"
    break
  fi
  sleep 1
  [[ $i -eq 15 ]] && echo "✗ API ne répond pas — voir: pm2 logs pharmavie-api"
done

# Nginx
if [[ -f /etc/nginx/sites-available/pharmavie.space ]]; then
  nginx -t && systemctl reload nginx
  echo "✔ Nginx rechargé"
else
  echo ">> Configuration Nginx..."
  cp deploy/simple/nginx-pharmavie.space.conf /etc/nginx/sites-available/pharmavie.space
  ln -sf /etc/nginx/sites-available/pharmavie.space /etc/nginx/sites-enabled/pharmavie.space
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl enable nginx && systemctl restart nginx
  echo "✔ Nginx configuré"
fi

pm2 status
echo ""
echo "Testez : curl http://127.0.0.1:3001/api/v1/health"
echo "Puis   : https://pharmavie.space"
