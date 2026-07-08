#!/bin/bash
# Préparation VPS Ubuntu pour PharmaVie
set -euo pipefail

echo "=== PharmaVie — init VPS ==="

if [ "$EUID" -ne 0 ]; then
  echo "Lancez en root ou avec sudo : sudo ./deploy/scripts/init-vps.sh"
  exit 1
fi

apt update && apt upgrade -y
apt install -y git curl ufw

# Docker
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

apt install -y docker-compose-plugin

# Pare-feu
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable || true

echo ""
echo "=== VPS prêt ==="
echo "1. cd /opt/pharmavie/deploy"
echo "2. cp .env.production.example .env && nano .env"
echo "3. docker compose -f docker-compose.prod.yml up -d --build"
echo "4. Voir DEPLOIEMENT_VPS.md pour certificats SSL et seed DB"
