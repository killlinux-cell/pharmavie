#!/bin/bash
# Mise à jour rapide PharmaVie sur VPS
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$DEPLOY_DIR")"

cd "$ROOT_DIR"
echo ">> git pull..."
git pull

cd "$DEPLOY_DIR"
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

echo ">> rebuild + restart..."
docker compose -f docker-compose.prod.yml up -d --build

echo ">> prisma db push..."
docker compose -f docker-compose.prod.yml exec -T api npx prisma db push --skip-generate

echo ">> Terminé. Health check :"
HEALTH_URL="${NEXT_PUBLIC_API_URL%/}/health"
curl -sf "$HEALTH_URL" && echo "" || echo "Échec : $HEALTH_URL"
