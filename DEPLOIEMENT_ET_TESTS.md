# PharmaVie — Déploiement et tests

Guide pas à pas pour installer le projet en local, le préparer pour la production et commencer à le tester.

---

## 1. Prérequis

### Obligatoires (backend + web)

| Outil | Version minimale | Vérification |
|-------|------------------|--------------|
| **Node.js** | 20+ | `node -v` |
| **npm** | 10+ | `npm -v` |
| **Docker Desktop** | récent | `docker --version` |
| **Git** | — | `git --version` |

Docker est utilisé pour **PostgreSQL** (port 5433) et **Redis** (port 6379).

### Pour l'app mobile (Flutter)

| Outil | Version minimale | Vérification |
|-------|------------------|--------------|
| **Flutter SDK** | 3.9+ | `flutter --version` |
| **Android Studio** | — | SDK Android + émulateur ou téléphone USB |
| **Xcode** (macOS) | — | simulateur iOS uniquement |

Sur Windows, pour tester sur un **Google Pixel** ou autre téléphone Android :
- Activer **Options développeur** + **Débogage USB**
- Installer les drivers USB si besoin
- Câble USB ou Wi-Fi debugging

---

## 2. Installation locale (première fois)

Depuis la racine du dépôt (`pharmavie/`) :

```bash
# 1. Cloner le projet (si ce n'est pas déjà fait)
git clone <url-du-repo> pharmavie
cd pharmavie

# 2. Installer les dépendances npm (monorepo)
npm install

# 3. Variables d'environnement
copy .env.example apps\api\.env
copy .env.example apps\web\.env.local
```

Sous Linux/macOS, remplacer `copy` par `cp`.

### Contenu des fichiers `.env`

**`apps/api/.env`** — minimum requis :

```env
DATABASE_URL="postgresql://pharmavie:pharmavie_dev@localhost:5433/pharmavie?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="change-me-in-production-use-long-random-string"
JWT_EXPIRES_IN="7d"
PORT=3001
CORS_ORIGIN="http://localhost:3000"

# Optionnel
OPENAI_API_KEY=""
CINETPAY_API_KEY=""
CINETPAY_SITE_ID=""
```

**`apps/web/.env.local`** :

```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
```

Pour un déploiement sur serveur, adapter les URLs (`CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`).

---

## 3. Démarrer l'infrastructure

```bash
# Lancer PostgreSQL + Redis
npm run docker:up

# Vérifier que les conteneurs tournent
docker ps
```

Vous devez voir `pharmavie-postgres` (port **5433**) et `pharmavie-redis` (port **6379**).

---

## 4. Base de données et données de test

```bash
# Créer / synchroniser le schéma Prisma
npm run db:push -w @pharmavie/api

# Données de base : pharmacies de démo, produits, comptes test
npm run db:seed -w @pharmavie/api

# (Recommandé) Importer les pharmacies CI + gardes UNPPCI
npm run import:pharmacies

# (Recommandé) Remplir l'inventaire prix/stock pour toutes les pharmacies
npm run inventory:seed
```

| Commande | Durée approx. | Rôle |
|----------|---------------|------|
| `db:seed` | ~30 s | 3 pharmacies démo, médicaments, utilisateurs test |
| `import:pharmacies` | 1–5 min | ~700+ pharmacies réelles (OSM + UNPPCI) |
| `inventory:seed` | 2–10 min | Prix/stock simulés pour le comparateur |

Interface Prisma (optionnel) :

```bash
npm run db:studio
```

---

## 5. Lancer l'application en développement

```bash
npm run dev
```

Démarre en parallèle :
- **API NestJS** → http://localhost:3001
- **Web Next.js** → http://localhost:3000

### Vérification rapide

| Test | URL / commande |
|------|----------------|
| API vivante | http://localhost:3001/api/v1/health |
| Landing | http://localhost:3000 |
| Login pharmacie | http://localhost:3000/login |
| Portail admin | http://localhost:3000/admin/login |

### En cas d'erreur Next.js

Si le web affiche des erreurs (`routes-manifest.json` manquant, modules introuvables) :

```bash
# Arrêter npm run dev (Ctrl+C), puis :
npm run dev:fresh
```

Ne pas lancer `clean:web` pendant que `dev` tourne.

---

## 6. Comptes de test (OTP)

Pas de mot de passe : connexion par **numéro ivoirien + code OTP**.

En mode développement, le **code OTP** s'affiche :
- dans la **console de l'API**
- dans l'**interface web / mobile** (champ ou bannière dev)

| Rôle | Téléphone | Où se connecter |
|------|-----------|-----------------|
| **Client** | +2250700000003 | App mobile → Profil → Se connecter |
| **Pharmacien (Plateau)** | +2250700000002 | http://localhost:3000/login |
| **Pharmacien (Cocody)** | +2250700000022 | Dashboard web |
| **Pharmacien (Marcory)** | +2250700000023 | Dashboard web |
| **Admin** | +2250700000099 | http://localhost:3000/admin/login |

### Parcours nouveau client (mobile)

1. Ouvrir l'app → onglet **Profil** → **Se connecter**
2. Saisir un numéro `+225XXXXXXXX` (n'importe quel numéro en dev)
3. **Recevoir le code OTP** → saisir les 6 chiffres
4. À la **première connexion**, le compte est **créé automatiquement** (pas d'écran d'inscription séparé)
5. Modifier prénom/nom : **Profil** → carte utilisateur → **Modifier mon profil**

---

## 7. Tester l'app mobile

### Émulateur Android

```bash
cd apps/mobile
flutter pub get
flutter run
```

Par défaut, l'API pointe vers `http://10.0.2.2:3001/api/v1` (alias localhost de l'émulateur).

### Téléphone physique (ex. Google Pixel)

1. PC et téléphone sur le **même Wi-Fi**
2. Trouver l'IP du PC :
   ```bash
   ipconfig
   ```
   Exemple : `192.168.1.42`
3. L'API doit tourner : `npm run dev` (port **3001**)
4. Autoriser le port **3001** dans le pare-feu Windows si la connexion échoue
5. Lancer Flutter avec l'IP du PC :

   ```bash
   cd apps/mobile
   flutter run --dart-define=API_URL=http://192.168.1.42:3001/api/v1
   ```

6. Brancher le téléphone en USB, accepter le débogage USB

> **Important** : sur un vrai téléphone, `localhost` ne fonctionne pas — utiliser l'IP LAN du PC.

### Build APK (test hors IDE)

```bash
cd apps/mobile
flutter build apk --dart-define=API_URL=https://votre-api.exemple.com/api/v1
```

L'APK se trouve dans `apps/mobile/build/app/outputs/flutter-apk/app-release.apk`.

---

## 8. Scénarios de test recommandés

### A. Client mobile

| # | Scénario | Étapes |
|---|----------|--------|
| 1 | Connexion OTP | Profil → numéro → code OTP |
| 2 | Recherche médicament | Accueil → taper un nom (ex. paracétamol) |
| 3 | Pharmacies proches | Carte / liste → filtre ville-commune |
| 4 | Comparateur de prix | Explorer → comparateur → recherche produit |
| 5 | Ordonnance | Explorer → Ordonnances → photo ou galerie |
| 6 | Commande | Ajouter au panier → checkout → paiement |
| 7 | Mes commandes | Profil → Historique commandes |

### B. Dashboard pharmacien (web)

| # | Scénario | URL |
|---|----------|-----|
| 1 | Login OTP | /login avec +2250700000002 |
| 2 | Voir commandes | /dashboard |
| 3 | Valider ordonnance | /dashboard/prescriptions |
| 4 | Gérer inventaire | /dashboard/inventory |
| 5 | Paramètres pharmacie | /dashboard/settings |

### C. Portail admin (web)

| # | Scénario | URL |
|---|----------|-----|
| 1 | Login admin | /admin/login avec +2250700000099 |
| 2 | Vue nationale | /admin |
| 3 | Gestion pharmacies | /admin/pharmacies |
| 4 | Sync gardes UNPPCI | Bouton sur /admin/pharmacies |
| 5 | Supervision ordonnances | /admin/prescriptions |

### D. API (curl / Postman)

```bash
# Health check
curl http://localhost:3001/api/v1/health

# Envoyer OTP
curl -X POST http://localhost:3001/api/v1/auth/otp/send \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"+2250700000003\"}"

# Vérifier OTP (remplacer CODE par le code affiché en console)
curl -X POST http://localhost:3001/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"+2250700000003\",\"code\":\"CODE\"}"
```

---

## 9. Déploiement production (vue d'ensemble)

> **Guide VPS complet (pharmavie.space)** : voir [`DEPLOIEMENT_PHARMAVIE_SPACE.md`](./DEPLOIEMENT_PHARMAVIE_SPACE.md)  
> Guide VPS générique : [`DEPLOIEMENT_VPS.md`](./DEPLOIEMENT_VPS.md)  
> Fichiers Docker/Nginx : dossier [`deploy/`](./deploy/)

Le projet n'inclut pas encore de Dockerfile applicatif complet. Voici l'architecture cible :

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Flutter    │────▶│  API NestJS │────▶│  PostgreSQL  │
│  (APK/Store)│     │  :3001      │     │  + Redis     │
└─────────────┘     └──────┬──────┘     └──────────────┘
                           │
                    ┌──────▼──────┐
                    │  Next.js    │
                    │  :3000      │
                    └─────────────┘
```

### Checklist production

#### Serveur / hébergement

- [ ] VPS ou cloud (ex. DigitalOcean, AWS, OVH, Render, Railway)
- [ ] PostgreSQL managé ou conteneur PostGIS
- [ ] Redis managé ou conteneur
- [ ] Nom de domaine + certificat HTTPS (Let's Encrypt)
- [ ] Volume persistant pour `apps/api/uploads/` (ordonnances)

#### Variables d'environnement production

| Variable | Action |
|----------|--------|
| `JWT_SECRET` | Chaîne aléatoire longue (64+ caractères) |
| `DATABASE_URL` | URL PostgreSQL production |
| `REDIS_URL` | URL Redis production |
| `CORS_ORIGIN` | URL du front web (https://…) |
| `NEXT_PUBLIC_API_URL` | URL publique API (https://api…/api/v1) |
| `OPENAI_API_KEY` | Si assistant IA activé |
| `CINETPAY_*` | Paiements Mobile Money réels |

#### Build et lancement

```bash
# À la racine
npm install
npm run build

# API
cd apps/api
npx prisma migrate deploy    # ou db push selon stratégie
npm run start:prod           # écoute PORT (3001)

# Web
cd apps/web
npm run start                # Next.js production (3000)
```

Recommandations :
- Utiliser **PM2**, **systemd** ou un orchestrateur (Docker Compose, Kubernetes) pour garder les processus actifs
- Placer un **reverse proxy** (Nginx, Caddy, Traefik) devant API et web
- Configurer les **sauvegardes** PostgreSQL quotidiennes

#### Mobile production

```bash
cd apps/mobile
flutter build apk --release --dart-define=API_URL=https://api.votredomaine.ci/api/v1
# ou
flutter build appbundle --release --dart-define=API_URL=https://api.votredomaine.ci/api/v1
```

Publier sur Google Play / App Store selon vos processus.

#### SMS OTP en production

En dev, l'OTP est loggé en clair. En production, brancher un fournisseur SMS ivoirien (Orange, MTN, Twilio, etc.) dans le module auth de l'API.

---

## 10. Commandes utiles (référence)

```bash
# Développement
npm run dev                  # API + Web
npm run dev:api              # API seule
npm run dev:web              # Web seule
npm run dev:fresh            # Web après nettoyage cache

# Docker
npm run docker:up
npm run docker:down

# Base de données
npm run db:push -w @pharmavie/api
npm run db:seed -w @pharmavie/api
npm run db:migrate -w @pharmavie/api
npm run db:studio

# Données métier
npm run import:pharmacies
npm run import:pharmacies -- --duty-only   # sync gardes uniquement
npm run inventory:seed

# Build production
npm run build
```

---

## 11. Dépannage fréquent

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| `P1001` / Can't reach PostgreSQL | Docker arrêté | `npm run docker:up` puis relancer |
| Port 5433 déjà utilisé | Autre PostgreSQL local | Arrêter l'autre service ou changer le port dans `docker-compose.yml` |
| Mobile ne joint pas l'API | Mauvaise URL / pare-feu | `--dart-define=API_URL=http://IP_PC:3001/api/v1` + ouvrir port 3001 |
| OTP introuvable | Redis down | `docker ps`, relancer redis |
| Erreur Next.js au démarrage | Cache `.next` corrompu | `npm run dev:fresh` |
| « Format image non supporté » (ordonnance) | Type MIME Pixel/HEIC | Mettre à jour API + mobile (dernière version du code) |
| Comparateur vide | Pas d'inventaire | `npm run inventory:seed` |
| Peu de pharmacies | Import non fait | `npm run import:pharmacies` |

---

## 12. Structure du monorepo

```
pharmavie/
├── apps/
│   ├── api/          # Backend NestJS + Prisma
│   ├── web/          # Dashboard pharmacie + admin (Next.js)
│   └── mobile/       # App client (Flutter)
├── packages/
│   └── shared/       # Types partagés
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## 13. Ordre de démarrage recommandé (résumé)

```bash
npm install
copy .env.example apps\api\.env
copy .env.example apps\web\.env.local
npm run docker:up
npm run db:push -w @pharmavie/api
npm run db:seed -w @pharmavie/api
npm run import:pharmacies
npm run inventory:seed
npm run dev
```

Puis :
- **Web** : http://localhost:3000
- **Mobile** : `cd apps/mobile && flutter run --dart-define=API_URL=http://<IP_PC>:3001/api/v1`

Bon test.
