#!/bin/bash
# =============================================================================
# PharmaVie — Déploiement automatique (1 commande)
# Usage :
#   cd /opt/pharmavie
#   git pull
#   bash deploy/simple/deploy.sh
#
# Options :
#   --full-data    Import pharmacies CI + inventaire (15-30 min, 1ère fois)
#   --skip-build   Ne pas rebuilder (juste redémarrer PM2)
#   --help
# =============================================================================
set -euo pipefail

ROOT="/opt/pharmavie"
DEPLOY_ENV="$ROOT/deploy/simple/.env"
COMPOSE_DB="$ROOT/deploy/simple/docker-compose.db.yml"
ECOSYSTEM="$ROOT/deploy/simple/ecosystem.config.cjs"
NGINX_SITE="/etc/nginx/sites-available/pharmavie.space"
LOG_FILE="/var/log/pharmavie-deploy.log"

FULL_DATA=false
SKIP_BUILD=false

for arg in "$@"; do
  case "$arg" in
    --full-data)  FULL_DATA=true ;;
    --skip-build) SKIP_BUILD=true ;;
    --help|-h)
      echo "Usage: bash deploy/simple/deploy.sh [--full-data] [--skip-build]"
      exit 0
      ;;
  esac
done

# --- Couleurs ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
step=0
log()  { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"; }
ok()   { echo -e "${GREEN}✔ $*${NC}" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}⚠ $*${NC}" | tee -a "$LOG_FILE"; }
fail() { echo -e "${RED}✗ $*${NC}" | tee -a "$LOG_FILE"; exit 1; }
next() { step=$((step+1)); echo ""; echo -e "${GREEN}════ ÉTAPE $step ════${NC} $*"; echo "" | tee -a "$LOG_FILE"; }

# --- Vérifications ---
next "Vérifications initiales"

if [[ "$(id -u)" -ne 0 ]]; then
  fail "Lancez en root : sudo bash deploy/simple/deploy.sh"
fi

if [[ ! -d "$ROOT/apps/api" ]]; then
  fail "Projet introuvable dans $ROOT — clonez ou copiez le code d'abord."
fi

cd "$ROOT"
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"

# --- Arrêter ancien Docker applicatif (si présent) ---
docker compose -f "$ROOT/deploy/docker-compose.prod.yml" down 2>/dev/null || true
docker stop pharmavie-prod-nginx-init 2>/dev/null || true

# --- Fichier .env déploiement ---
next "Configuration deploy/simple/.env"

if [[ ! -f "$DEPLOY_ENV" ]]; then
  cp "$ROOT/deploy/simple/.env.example" "$DEPLOY_ENV"
  warn "Fichier .env créé — ÉDITEZ CERTBOT_EMAIL avant de continuer si besoin :"
  warn "  nano $DEPLOY_ENV"
fi

# shellcheck disable=SC1090
source "$DEPLOY_ENV"

WEB_DOMAIN="${WEB_DOMAIN:-pharmavie.space}"
API_DOMAIN="${API_DOMAIN:-api.pharmavie.space}"
NODE_ENV="${NODE_ENV:-development}"

grep -q '^JWT_SECRET=' "$DEPLOY_ENV" || echo 'JWT_SECRET=' >> "$DEPLOY_ENV"
grep -q '^CERTBOT_EMAIL=' "$DEPLOY_ENV" || echo 'CERTBOT_EMAIL=' >> "$DEPLOY_ENV"

if [[ -z "${CERTBOT_EMAIL:-}" || "$CERTBOT_EMAIL" == "votre@email.com" ]]; then
  fail "Définissez CERTBOT_EMAIL dans $DEPLOY_ENV (votre vraie adresse email)"
fi

if [[ -z "${POSTGRES_PASSWORD:-}" || "$POSTGRES_PASSWORD" == CHANGEZ* ]]; then
  POSTGRES_PASSWORD="$(openssl rand -hex 16)"
  if grep -q '^POSTGRES_PASSWORD=' "$DEPLOY_ENV"; then
    sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|" "$DEPLOY_ENV"
  else
    echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" >> "$DEPLOY_ENV"
  fi
  ok "POSTGRES_PASSWORD généré automatiquement"
fi

if [[ -z "${JWT_SECRET:-}" ]]; then
  JWT_SECRET="$(openssl rand -hex 32)"
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" "$DEPLOY_ENV"
  ok "JWT_SECRET généré automatiquement"
fi

# Recharger après génération
# shellcheck disable=SC1090
source "$DEPLOY_ENV"

# --- Générer apps/api/.env et apps/web/.env.local ---
next "Génération apps/api/.env et apps/web/.env.local"

cat > "$ROOT/apps/api/.env" <<EOF
DATABASE_URL="postgresql://pharmavie:${POSTGRES_PASSWORD}@localhost:5433/pharmavie?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="${JWT_SECRET}"
JWT_EXPIRES_IN="7d"
PORT=3001
CORS_ORIGIN="https://${WEB_DOMAIN}"
NODE_ENV=${NODE_ENV}
OPENAI_API_KEY=${OPENAI_API_KEY:-}
CINETPAY_API_KEY=${CINETPAY_API_KEY:-}
CINETPAY_SITE_ID=${CINETPAY_SITE_ID:-}
SMS_PROVIDER=${SMS_PROVIDER:-twilio}
TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID:-}
TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN:-}
TWILIO_PHONE_NUMBER=${TWILIO_PHONE_NUMBER:-}
TWILIO_MESSAGING_SERVICE_SID=${TWILIO_MESSAGING_SERVICE_SID:-}
AFRICASTALKING_USERNAME=${AFRICASTALKING_USERNAME:-}
AFRICASTALKING_API_KEY=${AFRICASTALKING_API_KEY:-}
SMS_SENDER_ID=${SMS_SENDER_ID:-PharmaVie}
EOF

cat > "$ROOT/apps/web/.env.local" <<EOF
NEXT_PUBLIC_API_URL=https://${API_DOMAIN}/api/v1
EOF

ok "Fichiers .env API et Web créés"

# --- SWAP (évite les coupures npm) ---
next "Swap mémoire (2 Go)"

if ! swapon --show | grep -q /swapfile; then
  if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ok "Swap activé"
else
  ok "Swap déjà actif"
fi
free -h | tee -a "$LOG_FILE"

# --- Paquets système ---
next "Installation paquets (Docker, Node 20, PM2, Nginx, Certbot)"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq

if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  ok "Docker installé"
else
  ok "Docker déjà installé"
fi

apt-get install -y -qq docker-compose-plugin git nginx certbot python3-certbot-nginx curl ca-certificates gnupg

if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
  ok "Node.js 20 installé"
else
  ok "Node.js $(node -v) déjà installé"
fi

if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
  ok "PM2 installé"
else
  ok "PM2 déjà installé"
fi

# --- Pare-feu ---
if command -v ufw &>/dev/null; then
  ufw allow OpenSSH 2>/dev/null || true
  ufw allow 80/tcp 2>/dev/null || true
  ufw allow 443/tcp 2>/dev/null || true
  ufw --force enable 2>/dev/null || true
fi

# --- PostgreSQL + Redis ---
next "Démarrage PostgreSQL + Redis (Docker)"

cd "$ROOT/deploy/simple"
docker compose -f docker-compose.db.yml up -d

log "Attente PostgreSQL..."
for i in $(seq 1 30); do
  if docker exec pharmavie-postgres pg_isready -U pharmavie -q 2>/dev/null; then
    ok "PostgreSQL prêt"
    break
  fi
  sleep 2
  [[ $i -eq 30 ]] && fail "PostgreSQL ne démarre pas — vérifiez : docker logs pharmavie-postgres"
done

# --- npm install + build ---
if [[ "$SKIP_BUILD" == false ]]; then
  next "npm install (peut prendre 5-10 min)"

  cd "$ROOT"
  export NODE_OPTIONS="--max-old-space-size=1536"
  npm install 2>&1 | tee -a "$LOG_FILE"
  ok "npm install terminé"

  next "Build API + Web"

  npm run db:generate -w @pharmavie/api
  npm run build -w @pharmavie/api
  npm run build -w @pharmavie/web
  ok "Build terminé"
else
  warn "Build ignoré (--skip-build)"
fi

# --- Base de données ---
next "Base de données"

cd "$ROOT"
npm run db:push -w @pharmavie/api

# Seed seulement si table User vide
USER_COUNT=$(docker exec pharmavie-postgres psql -U pharmavie -d pharmavie -tAc "SELECT COUNT(*) FROM \"User\";" 2>/dev/null || echo "0")
if [[ "$USER_COUNT" == "0" ]]; then
  log "Première installation — seed des données de base..."
  npm run db:seed -w @pharmavie/api
  ok "Seed terminé"
else
  ok "Base déjà initialisée ($USER_COUNT utilisateurs) — seed ignoré"
fi

if [[ "$FULL_DATA" == true ]]; then
  next "Import catalogue médicaments AIRP/MEDPRYM (10-60 min)"
  if [[ -f "$ROOT/apps/api/prisma/data/medprym-cache.json" ]]; then
    npm run import:medprym -w @pharmavie/api -- --import-only
  else
    npm run import:medprym -w @pharmavie/api
  fi
  ok "Catalogue médicaments importé"

  next "Import pharmacies + inventaire (15-30 min)"
  npm run import:pharmacies -w @pharmavie/api
  npm run inventory:seed -w @pharmavie/api -- --products=500
  ok "Données complètes importées"
else
  warn "Import pharmacies non lancé. Pour les ajouter : bash deploy/simple/deploy.sh --full-data"
fi

# --- PM2 ---
next "Démarrage API + Web (PM2)"

chmod +x "$ROOT/deploy/simple/start-api.sh" "$ROOT/deploy/simple/start-web.sh" 2>/dev/null || true

pm2 delete pharmavie-api 2>/dev/null || true
pm2 delete pharmavie-web 2>/dev/null || true
pm2 start "$ECOSYSTEM"
pm2 save

# pm2 startup (une seule fois)
if ! pm2 ping &>/dev/null || ! test -f /etc/systemd/system/pm2-root.service; then
  STARTUP_CMD=$(pm2 startup systemd -u root --hp /root 2>&1 | tail -1)
  if [[ -n "$STARTUP_CMD" ]]; then
    eval "$STARTUP_CMD" 2>/dev/null || true
  fi
  pm2 save
fi

sleep 5
pm2 status

# Test local (avec retry)
log "Attente API..."
API_OK=false
for i in $(seq 1 20); do
  if curl -sf http://127.0.0.1:3001/api/v1/health > /dev/null 2>&1; then
    API_OK=true
    break
  fi
  sleep 2
done

if [[ "$API_OK" == true ]]; then
  ok "API répond sur :3001"
else
  warn "API ne répond pas — lancez : bash deploy/simple/doctor.sh"
  pm2 logs pharmavie-api --lines 30 --nostream || true
fi

# --- Nginx ---
next "Configuration Nginx"

cp "$ROOT/deploy/simple/nginx-pharmavie.space.conf" "$NGINX_SITE"

# Adapter les domaines si différents de pharmavie.space
if [[ "$WEB_DOMAIN" != "pharmavie.space" || "$API_DOMAIN" != "api.pharmavie.space" ]]; then
  sed -i "s/pharmavie.space/${WEB_DOMAIN}/g" "$NGINX_SITE"
  sed -i "s/api.pharmavie.space/${API_DOMAIN}/g" "$NGINX_SITE"
fi

ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/pharmavie.space
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx
ok "Nginx configuré"

# --- HTTPS ---
next "Certificat HTTPS (Let's Encrypt)"

if [[ -d "/etc/letsencrypt/live/${WEB_DOMAIN}" ]]; then
  ok "Certificat SSL déjà présent — renouvellement auto via certbot"
  certbot renew --dry-run 2>/dev/null || true
else
  log "Obtention certificat pour ${WEB_DOMAIN} et ${API_DOMAIN}..."
  certbot --nginx \
    -d "$WEB_DOMAIN" \
    -d "$API_DOMAIN" \
    --email "$CERTBOT_EMAIL" \
    --agree-tos \
    --no-eff-email \
    --redirect \
    --non-interactive
  ok "HTTPS activé"
fi

# --- Vérifications finales ---
next "Vérifications finales"

echo ""
HEALTH=$(curl -sf "https://${API_DOMAIN}/api/v1/health" 2>/dev/null || curl -sf "http://${API_DOMAIN}/api/v1/health" 2>/dev/null || echo "ERREUR")
if [[ "$HEALTH" != "ERREUR" ]]; then
  ok "API accessible : https://${API_DOMAIN}/api/v1/health"
else
  warn "API pas encore accessible publiquement — attendez 1 min ou vérifiez DNS"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   DÉPLOIEMENT TERMINÉ — PharmaVie${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Web    : https://${WEB_DOMAIN}"
echo "  Admin  : https://${WEB_DOMAIN}/admin/login"
echo "  API    : https://${API_DOMAIN}/api/v1/health"
echo ""
echo "  Comptes test :"
echo "    Admin      +2250700000099"
echo "    Pharmacien +2250700000002"
echo "    Client     +2250700000003"
echo ""
if [[ "$NODE_ENV" == "development" ]]; then
  echo "  OTP visible dans : pm2 logs pharmavie-api"
else
  echo "  OTP : configurez SMS (NODE_ENV=production)"
fi
echo ""
echo "  Commandes utiles :"
echo "    pm2 status"
echo "    pm2 logs pharmavie-api"
echo "    pm2 logs pharmavie-web"
echo "    bash deploy/simple/deploy.sh          # redéployer"
echo "    bash deploy/simple/deploy.sh --full-data  # + pharmacies CI"
echo ""
echo "  Mobile APK :"
echo "    flutter build apk --dart-define=API_URL=https://${API_DOMAIN}/api/v1"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
