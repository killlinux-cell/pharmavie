# PharmaVie — Déploiement complet sur pharmavie.space

Guide **pas à pas**, sans étape sautée, pour déployer PharmaVie sur votre VPS avec le domaine **pharmavie.space**.

---

## Ce que vous allez obtenir

| URL | Service |
|-----|---------|
| https://pharmavie.space | Site web (dashboard pharmacie + admin) |
| https://api.pharmavie.space/api/v1 | API REST |
| https://api.pharmavie.space/uploads/... | Images ordonnances |
| App mobile | Pointe vers `https://api.pharmavie.space/api/v1` |

---

## ÉTAPE 0 — Ce dont vous avez besoin AVANT de commencer

Cochez mentalement chaque point :

- [ ] Un **VPS Ubuntu 22.04 ou 24.04** (minimum 2 Go RAM, 4 Go recommandé)
- [ ] L'**IP publique** du VPS (ex. `203.0.113.50`)
- [ ] Accès **SSH** au VPS (mot de passe root ou clé SSH)
- [ ] Le domaine **pharmavie.space** acheté et accessible
- [ ] Le **code source** PharmaVie sur votre PC (`d:\pharmavie`)
- [ ] **Docker Desktop** n'est PAS nécessaire sur le VPS — on installe Docker sur le VPS directement
- [ ] Sur votre PC : **Git** (optionnel) ou possibilité de copier les fichiers en SCP

Notez ces informations (vous en aurez besoin) :

```
IP VPS     : ___________________
User SSH   : root (ou autre) ___________________
Email SSL  : ___________________  (pour Let's Encrypt)
```

---

## ÉTAPE 1 — Configurer le DNS chez votre registrar

Connectez-vous au panneau de gestion de **pharmavie.space** (Namecheap, Cloudflare, OVH, etc.).

Créez **2 enregistrements DNS de type A** :

| Type | Nom / Host | Valeur | TTL |
|------|------------|--------|-----|
| A | `@` | `IP_DE_VOTRE_VPS` | 300 (ou Auto) |
| A | `api` | `IP_DE_VOTRE_VPS` | 300 (ou Auto) |

**Exemple** si votre VPS est `203.0.113.50` :

| Enregistrement | Résultat |
|----------------|----------|
| `@` → 203.0.113.50 | `pharmavie.space` |
| `api` → 203.0.113.50 | `api.pharmavie.space` |

### Vérifier la propagation DNS (depuis votre PC Windows)

Ouvrez PowerShell :

```powershell
nslookup pharmavie.space
nslookup api.pharmavie.space
```

Les deux doivent renvoyer l'IP de votre VPS.  
Si ce n'est pas le cas, **attendez 5 à 30 minutes** (parfois jusqu'à 24 h) avant de continuer l'étape SSL.

---

## ÉTAPE 2 — Se connecter au VPS en SSH

Depuis PowerShell ou un terminal :

```bash
ssh root@IP_DE_VOTRE_VPS
```

Remplacez `IP_DE_VOTRE_VPS` par votre IP réelle.  
Acceptez la clé SSH (`yes`) et entrez votre mot de passe.

Vous devez voir un prompt du type :

```
root@votre-serveur:~#
```

---

## ÉTAPE 3 — Mettre à jour le serveur

```bash
apt update && apt upgrade -y
```

Attendez la fin (peut prendre 2–5 minutes).

---

## ÉTAPE 4 — Créer un utilisateur dédié (recommandé)

```bash
adduser pharmavie
```

- Choisissez un mot de passe fort
- Appuyez sur Entrée pour les champs optionnels (Full Name, etc.)

Donnez les droits sudo :

```bash
usermod -aG sudo pharmavie
```

Connectez-vous avec cet utilisateur :

```bash
su - pharmavie
```

> Toutes les commandes suivantes sont exécutées en tant que `pharmavie` (ou `root` si vous préférez, en ajoutant `sudo`).

---

## ÉTAPE 5 — Installer Docker et Git

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt install -y docker-compose-plugin git
```

**Important** : déconnectez-vous et reconnectez-vous pour que le groupe `docker` soit actif :

```bash
exit
ssh pharmavie@IP_DE_VOTRE_VPS
```

Vérifiez :

```bash
docker --version
docker compose version
git --version
```

---

## ÉTAPE 6 — Configurer le pare-feu

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Tapez `y` pour confirmer.

Vérifiez :

```bash
sudo ufw status
```

Vous devez voir : `22`, `80`, `443` autorisés.

---

## ÉTAPE 7 — Transférer le code sur le VPS

### Option A — Via Git (si le projet est sur GitHub/GitLab)

```bash
sudo mkdir -p /opt/pharmavie
sudo chown $USER:$USER /opt/pharmavie
git clone https://github.com/VOTRE_COMPTE/pharmavie.git /opt/pharmavie
cd /opt/pharmavie
```

### Option B — Depuis votre PC Windows (SCP)

Sur **votre PC** (PowerShell), pas sur le VPS :

```powershell
scp -r d:\pharmavie pharmavie@IP_DE_VOTRE_VPS:/opt/pharmavie
```

Puis sur le **VPS** :

```bash
cd /opt/pharmavie
ls -la
```

Vous devez voir : `apps/`, `deploy/`, `package.json`, `docker-compose.yml`, etc.

---

## ÉTAPE 8 — Générer les secrets de production

Sur le **VPS** :

```bash
openssl rand -hex 32
```

Notez le résultat → ce sera votre `JWT_SECRET`.

```bash
openssl rand -hex 24
```

Notez le résultat → ce sera votre `POSTGRES_PASSWORD`.

---

## ÉTAPE 9 — Créer le fichier `.env` de production

```bash
cd /opt/pharmavie/deploy
cp .env.production.example .env
nano .env
```

Remplacez **tout le contenu** par (en adaptant les secrets) :

```env
WEB_DOMAIN=pharmavie.space
API_DOMAIN=api.pharmavie.space

NEXT_PUBLIC_API_URL=https://api.pharmavie.space/api/v1
CORS_ORIGIN=https://pharmavie.space

JWT_SECRET=COLLER_ICI_LE_RESULTAT_OPENSSL_32
POSTGRES_PASSWORD=COLLER_ICI_LE_RESULTAT_OPENSSL_24

JWT_EXPIRES_IN=7d
NODE_ENV=production

OPENAI_API_KEY=
CINETPAY_API_KEY=
CINETPAY_SITE_ID=
```

Sauvegardez : `Ctrl+O`, Entrée, `Ctrl+X`.

Vérifiez :

```bash
cat .env
```

---

## ÉTAPE 10 — Obtenir le certificat HTTPS (Let's Encrypt)

> **Pourquoi cette étape avant tout ?** Nginx a besoin des certificats SSL pour démarrer en HTTPS. On les obtient d'abord en HTTP.

### 10.1 — Nginx temporaire (HTTP seulement)

```bash
cd /opt/pharmavie/deploy
cp nginx/pharmavie.init.conf nginx/pharmavie.active.conf
```

Démarrez uniquement nginx temporaire :

```bash
docker compose -f docker-compose.prod.yml up -d nginx-init
```

Vérifiez :

```bash
docker compose -f docker-compose.prod.yml ps
curl -I http://pharmavie.space
```

### 10.2 — Demander les certificats

Remplacez `VOTRE_EMAIL` par votre vraie adresse :

```bash
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d pharmavie.space \
  -d api.pharmavie.space \
  --email VOTRE_EMAIL \
  --agree-tos \
  --no-eff-email
```

Réponse attendue : `Successfully received certificate`.

Si erreur `Connection refused` ou `DNS problem` → retournez à l'**ÉTAPE 1** et vérifiez le DNS.

### 10.3 — Activer la configuration HTTPS complète

```bash
cp nginx/pharmavie.conf nginx/pharmavie.active.conf
docker compose -f docker-compose.prod.yml stop nginx-init
```

---

## ÉTAPE 11 — Build et démarrage de toute la stack

```bash
cd /opt/pharmavie/deploy
docker compose -f docker-compose.prod.yml up -d --build
```

⏱️ La première fois : **5 à 15 minutes** (téléchargement images + build).

Suivez les logs :

```bash
docker compose -f docker-compose.prod.yml logs -f api
```

Attendez le message : `PharmaVie API running on http://localhost:3001/api/v1`  
Quittez les logs : `Ctrl+C`.

Vérifiez que tous les conteneurs tournent :

```bash
docker compose -f docker-compose.prod.yml ps
```

Tous doivent être `running` (ou `healthy` pour postgres/redis).

---

## ÉTAPE 12 — Initialiser la base de données

Exécutez **dans l'ordre**, une commande à la fois.

### 12.1 — Schéma Prisma

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma db push
```

Réponse attendue : `Your database is now in sync`.

### 12.2 — Données de base (comptes test, médicaments démo)

```bash
docker compose -f docker-compose.prod.yml exec api npm run db:seed
```

### 12.3 — Import pharmacies Côte d'Ivoire (~5 min)

```bash
docker compose -f docker-compose.prod.yml exec api npm run import:pharmacies
```

### 12.4 — Inventaire comparateur de prix (~5–15 min)

```bash
docker compose -f docker-compose.prod.yml exec api npm run inventory:seed
```

---

## ÉTAPE 13 — Vérifications finales

### 13.1 — API

```bash
curl https://api.pharmavie.space/api/v1/health
```

Réponse attendue (JSON) : statut OK avec base de données et Redis.

### 13.2 — Site web

Ouvrez dans un navigateur :

- https://pharmavie.space
- https://pharmavie.space/login
- https://pharmavie.space/admin/login

### 13.3 — Test connexion OTP (admin)

1. Allez sur https://pharmavie.space/admin/login
2. Numéro : `+2250700000099`
3. Cliquez **Envoyer OTP**

> En production, l'OTP n'apparaît pas à l'écran. Consultez les logs API :

```bash
docker compose -f docker-compose.prod.yml logs api --tail 50
```

Cherchez une ligne contenant le code OTP (si le mode dev est actif) ou configurez SMS (ÉTAPE 16).

| Rôle | Téléphone | URL |
|------|-----------|-----|
| Admin | +2250700000099 | https://pharmavie.space/admin/login |
| Pharmacien | +2250700000002 | https://pharmavie.space/login |
| Client | +2250700000003 | App mobile |

---

## ÉTAPE 14 — Build app mobile (sur votre PC Windows)

Sur **votre PC**, pas sur le VPS :

```powershell
cd d:\pharmavie\apps\mobile
flutter pub get
flutter build apk --release --dart-define=API_URL=https://api.pharmavie.space/api/v1
```

L'APK est généré ici :

```
d:\pharmavie\apps\mobile\build\app\outputs\flutter-apk\app-release.apk
```

Transférez-le sur votre téléphone et installez-le.

### Test sur téléphone

1. Connectez-vous : Profil → `+2250700000003` → OTP
2. Testez : recherche médicament, pharmacies, ordonnance, comparateur

---

## ÉTAPE 15 — Renouvellement automatique SSL

Démarrez le conteneur certbot (renouvellement tous les 12 h) :

```bash
cd /opt/pharmavie/deploy
docker compose -f docker-compose.prod.yml --profile certbot-renew up -d certbot-renew
```

---

## ÉTAPE 16 — OTP / SMS en production (obligatoire avant ouverture publique)

En `NODE_ENV=production`, le code OTP **n'est plus affiché** dans l'interface.

Pour une mise en ligne réelle, branchez un fournisseur SMS dans :

```
apps/api/src/auth/auth.service.ts
```

Fournisseurs possibles : Orange CI API, MTN, Twilio, AfricasTalking.

**Solution temporaire pour vos tests** (non recommandé en public) :

Dans `deploy/.env`, mettez :

```env
NODE_ENV=development
```

Puis :

```bash
docker compose -f docker-compose.prod.yml up -d --build api
```

L'OTP réapparaîtra dans les logs et l'UI. Repassez en `production` avant d'ouvrir au public.

---

## ÉTAPE 17 — Sauvegardes (à configurer)

### Créer le dossier backups

```bash
sudo mkdir -p /opt/backups
sudo chown $USER:$USER /opt/backups
```

### Sauvegarde manuelle base de données

```bash
cd /opt/pharmavie/deploy
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U pharmavie pharmavie > /opt/backups/db_$(date +%Y%m%d).sql
```

### Sauvegarde uploads (ordonnances)

```bash
docker compose -f docker-compose.prod.yml exec -T api \
  tar czf - /app/apps/api/uploads > /opt/backups/uploads_$(date +%Y%m%d).tar.gz
```

### Automatiser (cron quotidien 3h)

```bash
crontab -e
```

Ajoutez :

```cron
0 3 * * * cd /opt/pharmavie/deploy && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U pharmavie pharmavie > /opt/backups/db_$(date +\%Y\%m\%d).sql
```

---

## ÉTAPE 18 — Mises à jour futures

Quand vous modifiez le code :

```bash
cd /opt/pharmavie
git pull
# ou re-copier via scp depuis votre PC

cd deploy
chmod +x scripts/redeploy.sh
./scripts/redeploy.sh
```

---

## Commandes utiles au quotidien

```bash
cd /opt/pharmavie/deploy

# État des services
docker compose -f docker-compose.prod.yml ps

# Logs API
docker compose -f docker-compose.prod.yml logs api --tail 100 -f

# Logs Web
docker compose -f docker-compose.prod.yml logs web --tail 100 -f

# Redémarrer un service
docker compose -f docker-compose.prod.yml restart api

# Tout arrêter
docker compose -f docker-compose.prod.yml down

# Tout redémarrer
docker compose -f docker-compose.prod.yml up -d
```

---

## Dépannage

| Problème | Cause | Solution |
|----------|-------|----------|
| `nslookup` ne résout pas | DNS pas propagé | Attendre, revérifier ÉTAPE 1 |
| Certbot échoue | Port 80 fermé ou DNS incorrect | `sudo ufw status`, revérifier DNS |
| Nginx ne démarre pas | Certificats manquants | Refaire ÉTAPE 10 |
| `502 Bad Gateway` | API ou Web down | `docker compose logs api web` |
| CORS error dans le navigateur | Mauvais CORS_ORIGIN | `.env` → `CORS_ORIGIN=https://pharmavie.space` puis rebuild |
| Mobile ne connecte pas | Mauvaise URL API | Rebuild APK avec `https://api.pharmavie.space/api/v1` |
| OTP invisible | Mode production | Voir ÉTAPE 16 |
| `P1001` / DB error | Postgres pas prêt | `docker compose ps`, attendre `healthy` |
| Manque de RAM | VPS 2 Go saturé | `docker stats`, passer à 4 Go |

---

## Checklist finale avant ouverture au public

- [ ] https://pharmavie.space accessible
- [ ] https://api.pharmavie.space/api/v1/health OK
- [ ] Login admin fonctionne
- [ ] Login pharmacien fonctionne
- [ ] App mobile connectée à l'API production
- [ ] OTP SMS configuré (`NODE_ENV=production`)
- [ ] Sauvegardes DB planifiées
- [ ] Secrets `.env` forts et non partagés
- [ ] Comptes test modifiés ou désactivés

---

## Récapitulatif des URLs pharmavie.space

```
Site web      : https://pharmavie.space
Admin         : https://pharmavie.space/admin/login
Pharmacien    : https://pharmavie.space/login
API           : https://api.pharmavie.space/api/v1
Health check  : https://api.pharmavie.space/api/v1/health
Mobile API    : https://api.pharmavie.space/api/v1
```

---

## Fichiers de configuration du projet

```
deploy/
├── docker-compose.prod.yml       # Stack Docker production
├── Dockerfile.api                # Image backend
├── Dockerfile.web                # Image frontend
├── .env.production.example       # Modèle (pharmavie.space)
├── .env                          # Vos secrets (à créer sur le VPS)
├── nginx/
│   ├── pharmavie.conf            # Nginx HTTPS (production)
│   ├── pharmavie.init.conf       # Nginx HTTP (obtention SSL)
│   └── pharmavie.active.conf     # Config active (copiée automatiquement)
└── scripts/
    ├── init-vps.sh
    ├── redeploy.sh
    └── api-entrypoint.sh
```

---

**Vous avez terminé.** PharmaVie tourne sur **pharmavie.space**.

Pour les tests locaux sur PC : voir `DEPLOIEMENT_ET_TESTS.md`.
