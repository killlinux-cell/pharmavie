# PharmaVie — Déploiement sur VPS

Guide complet pour déployer PharmaVie sur un VPS Ubuntu (DigitalOcean, OVH, Hetzner, Contabo…).

---

## Architecture cible

```
Internet
   │
   ▼
┌──────────────────────────────────────┐
│  VPS Ubuntu 22.04+                   │
│  Nginx (80/443)                      │
│    ├── pharmavie.ci        → Web     │
│    └── api.pharmavie.ci    → API     │
│                                      │
│  Docker Compose                      │
│    ├── postgres (PostGIS)            │
│    ├── redis                         │
│    ├── api  (NestJS :3001)           │
│    └── web  (Next.js :3000)          │
└──────────────────────────────────────┘

App mobile Flutter → https://api.pharmavie.ci/api/v1
```

---

## 1. Prérequis VPS

| Élément | Minimum recommandé |
|---------|-------------------|
| OS | Ubuntu 22.04 LTS ou 24.04 LTS |
| RAM | 2 Go (4 Go recommandé) |
| CPU | 2 vCPU |
| Disque | 40 Go SSD |
| Ports ouverts | 22 (SSH), 80 (HTTP), 443 (HTTPS) |

### Noms de domaine (exemple)

| Sous-domaine | Rôle |
|--------------|------|
| `pharmavie.ci` | Site web + dashboard pharmacie + admin |
| `api.pharmavie.ci` | API REST + fichiers uploads (ordonnances) |

Créez deux enregistrements DNS **A** pointant vers l'IP publique du VPS.

---

## 2. Préparation du serveur

Connectez-vous en SSH :

```bash
ssh root@VOTRE_IP_VPS
```

### Option A — Script automatique

```bash
apt update && apt install -y git
git clone https://github.com/VOTRE_ORG/pharmavie.git /opt/pharmavie
cd /opt/pharmavie
chmod +x deploy/scripts/init-vps.sh
./deploy/scripts/init-vps.sh
```

### Option B — Manuel

```bash
# Mises à jour
apt update && apt upgrade -y

# Utilisateur dédié (recommandé)
adduser pharmavie
usermod -aG sudo pharmavie
su - pharmavie

# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Se reconnecter pour appliquer le groupe docker

# Docker Compose plugin
sudo apt install -y docker-compose-plugin git

# Cloner le projet
git clone https://github.com/VOTRE_ORG/pharmavie.git /opt/pharmavie
cd /opt/pharmavie
```

---

## 3. Configuration environnement

```bash
cd /opt/pharmavie/deploy
cp .env.production.example .env
nano .env
```

### Variables obligatoires

```env
# Domaines (sans https://)
WEB_DOMAIN=pharmavie.ci
API_DOMAIN=api.pharmavie.ci

# URLs publiques (avec https://)
NEXT_PUBLIC_API_URL=https://api.pharmavie.ci/api/v1
CORS_ORIGIN=https://pharmavie.ci

# Secrets — générer avec : openssl rand -hex 32
JWT_SECRET=VOTRE_SECRET_LONG_ET_ALEATOIRE
POSTGRES_PASSWORD=mot_de_passe_postgres_fort

# Production
NODE_ENV=production
```

### Variables optionnelles

```env
OPENAI_API_KEY=sk-...
CINETPAY_API_KEY=...
CINETPAY_SITE_ID=...
```

---

## 4. Certificats HTTPS (Let's Encrypt)

Avant le premier `docker compose up`, obtenez les certificats :

```bash
cd /opt/pharmavie/deploy

# Démarrer nginx temporaire HTTP pour validation
docker compose -f docker-compose.prod.yml up -d nginx

# Certificats (remplacer les domaines et l'email)
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d pharmavie.ci \
  -d api.pharmavie.ci \
  --email admin@pharmavie.ci \
  --agree-tos \
  --no-eff-email
```

> **Alternative sans certificat au début** : commentez les blocs SSL dans `deploy/nginx/pharmavie.conf` et testez en HTTP, puis activez HTTPS.

---

## 5. Déploiement

```bash
cd /opt/pharmavie/deploy

# Build + démarrage de tous les services
docker compose -f docker-compose.prod.yml up -d --build

# Vérifier les logs
docker compose -f docker-compose.prod.yml logs -f api
```

### Initialiser la base de données (première fois)

```bash
# Schéma Prisma
docker compose -f docker-compose.prod.yml exec api npx prisma db push

# Données de base (comptes test, produits démo)
docker compose -f docker-compose.prod.yml exec api npm run db:seed

# Pharmacies Côte d'Ivoire + gardes (5–10 min)
docker compose -f docker-compose.prod.yml exec api npm run import:pharmacies

# Inventaire comparateur de prix (5–15 min)
docker compose -f docker-compose.prod.yml exec api npm run inventory:seed
```

### Vérifications

```bash
curl https://api.pharmavie.ci/api/v1/health
curl -I https://pharmavie.ci
```

---

## 6. App mobile en production

Rebuild l'APK avec l'URL publique de l'API :

```bash
cd apps/mobile
flutter build apk --release \
  --dart-define=API_URL=https://api.pharmavie.ci/api/v1
```

L'APK se trouve dans `build/app/outputs/flutter-apk/app-release.apk`.

Pour Google Play :

```bash
flutter build appbundle --release \
  --dart-define=API_URL=https://api.pharmavie.ci/api/v1
```

---

## 7. Comptes et OTP en production

| Rôle | Téléphone test (seed) | URL |
|------|----------------------|-----|
| Admin | +2250700000099 | https://pharmavie.ci/admin/login |
| Pharmacien | +2250700000002 | https://pharmavie.ci/login |
| Client | +2250700000003 | App mobile |

> **Important** : en production (`NODE_ENV=production`), le code OTP **n'est plus affiché** dans l'interface. Il faut brancher un **fournisseur SMS** (Orange CI, MTN, Twilio…) dans `apps/api/src/auth/`.

En attendant l'intégration SMS, vous pouvez consulter l'OTP dans les logs Redis ou ajouter temporairement un env `NODE_ENV=development` **uniquement pour les tests** (non recommandé en prod réelle).

---

## 8. Mises à jour (re-déploiement)

```bash
cd /opt/pharmavie
git pull origin main

cd deploy
docker compose -f docker-compose.prod.yml up -d --build

# Migrations schéma si le modèle Prisma a changé
docker compose -f docker-compose.prod.yml exec api npx prisma db push
```

Script raccourci :

```bash
chmod +x deploy/scripts/redeploy.sh
./deploy/scripts/redeploy.sh
```

---

## 9. Sauvegardes

### Base PostgreSQL

```bash
# Sauvegarde manuelle
docker compose -f deploy/docker-compose.prod.yml exec postgres \
  pg_dump -U pharmavie pharmavie > backup_$(date +%Y%m%d).sql

# Restauration
cat backup_20250708.sql | docker compose -f deploy/docker-compose.prod.yml exec -T postgres \
  psql -U pharmavie pharmavie
```

### Fichiers uploads (ordonnances)

```bash
docker compose -f deploy/docker-compose.prod.yml exec api tar czf - /app/uploads \
  > uploads_backup_$(date +%Y%m%d).tar.gz
```

Cron quotidien (exemple) :

```bash
crontab -e
# Tous les jours à 3h
0 3 * * * cd /opt/pharmavie/deploy && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U pharmavie pharmavie > /opt/backups/db_$(date +\%Y\%m\%d).sql
```

---

## 10. Pare-feu (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Ne pas exposer les ports 5433 ou 6379 publiquement — PostgreSQL et Redis restent sur le réseau Docker interne.

---

## 11. Fichiers de déploiement (référence)

```
deploy/
├── docker-compose.prod.yml    # Stack production
├── Dockerfile.api             # Image NestJS
├── Dockerfile.web               # Image Next.js
├── .env.production.example      # Modèle variables
├── nginx/
│   └── pharmavie.conf           # Reverse proxy HTTPS
└── scripts/
    ├── init-vps.sh              # Préparation serveur
    └── redeploy.sh                # Mise à jour rapide
```

---

## 12. Dépannage VPS

| Problème | Solution |
|----------|----------|
| `502 Bad Gateway` | `docker compose logs api web` — service pas démarré |
| Certificat SSL expiré | `docker compose run --rm certbot renew` |
| API ne répond pas | Vérifier `DATABASE_URL`, postgres healthy |
| CORS bloqué | Vérifier `CORS_ORIGIN` = URL exacte du web |
| Mobile ne connecte pas | URL `https://` (pas http), certificat valide |
| OTP non reçu | SMS non configuré — voir section 7 |
| Upload ordonnance échoue | Volume `uploads_data` monté, permissions OK |
| Manque de RAM | `docker stats` — passer à 4 Go RAM |

### Commandes utiles

```bash
cd /opt/pharmavie/deploy

docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs api --tail 100
docker compose -f docker-compose.prod.yml restart api
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 13. Checklist avant mise en ligne

- [ ] Domaines DNS configurés (A records)
- [ ] `.env` rempli avec secrets forts
- [ ] HTTPS actif (Let's Encrypt)
- [ ] `curl https://api.../api/v1/health` → OK
- [ ] Login admin web fonctionne
- [ ] App mobile buildée avec bonne `API_URL`
- [ ] Fournisseur SMS OTP branché (prod réelle)
- [ ] Sauvegardes DB planifiées
- [ ] Pare-feu UFW activé
- [ ] Comptes test seed changés ou désactivés si prod publique

---

## 14. Coûts indicatifs

| Poste | Estimation mensuelle |
|-------|---------------------|
| VPS 4 Go (Hetzner/OVH) | 8–15 € |
| Nom de domaine .ci | variable |
| SMS OTP | selon volume |
| OpenAI (assistant IA) | selon usage |

---

Pour les tests locaux sur PC (sans VPS), voir **`DEPLOIEMENT_ET_TESTS.md`**.
