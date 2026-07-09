#!/bin/bash
# Diagnostic rapide PharmaVie sur VPS
set -euo pipefail

echo "════ DIAGNOSTIC PHARMAVIE ════"
echo ""

echo "▶ 1. Fichiers .env"
ls -la /opt/pharmavie/apps/api/.env 2>/dev/null && echo "  API .env OK" || echo "  ✗ API .env MANQUANT"
ls -la /opt/pharmavie/apps/web/.env.local 2>/dev/null && echo "  Web .env.local OK" || echo "  ✗ Web .env.local MANQUANT"
echo ""

echo "▶ 2. Build API"
ls -la /opt/pharmavie/apps/api/dist/src/main.js 2>/dev/null && echo "  dist/src/main.js OK" || echo "  ✗ dist/src/main.js MANQUANT — lancez: npm run build -w @pharmavie/api"
echo ""

echo "▶ 3. Docker (PostgreSQL + Redis)"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "pharmavie|NAMES" || echo "  ✗ Conteneurs non démarrés"
docker exec pharmavie-postgres pg_isready -U pharmavie 2>/dev/null && echo "  PostgreSQL OK" || echo "  ✗ PostgreSQL KO"
docker exec pharmavie-redis redis-cli ping 2>/dev/null && echo "  Redis OK" || echo "  ✗ Redis KO"
echo ""

echo "▶ 4. PM2"
pm2 status || true
echo ""
echo "  Logs API (20 dernières lignes) :"
pm2 logs pharmavie-api --lines 20 --nostream 2>/dev/null || echo "  pas de logs"
echo ""

echo "▶ 5. Ports locaux"
curl -sf http://127.0.0.1:3001/api/v1/health && echo "  API :3001 OK" || echo "  ✗ API :3001 KO"
curl -sf -o /dev/null http://127.0.0.1:3000 && echo "  Web :3000 OK" || echo "  ✗ Web :3000 KO"
echo ""

echo "▶ 6. Nginx"
systemctl is-active nginx 2>/dev/null && echo "  Nginx actif" || echo "  ✗ Nginx inactif — lancez: systemctl start nginx"
nginx -t 2>&1 | tail -1
echo ""

echo "▶ 7. Test manuel API (5 sec)"
cd /opt/pharmavie/apps/api
set -a && source .env 2>/dev/null && set +a
timeout 5 node dist/src/main.js 2>&1 | head -5 || echo "  (timeout ou erreur ci-dessus)"
echo ""

echo "════ FIN DIAGNOSTIC ════"
echo "Si API KO : bash deploy/simple/fix-and-start.sh"
