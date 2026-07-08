# PharmaVie — Guide complet

## Démarrage rapide

```bash
npm install
npm run docker:up
npm run db:push -w @pharmavie/api
npm run db:seed -w @pharmavie/api
npm run dev
```

> Si le web affiche des erreurs 500 (`routes-manifest.json` manquant), **arrêtez** le serveur puis :
> ```bash
> npm run dev:fresh
> ```
> Ne lancez jamais `clean:web` en même temps que `dev` — cela corrompt le cache Next.js.

| Service | URL |
|---------|-----|
| Landing | http://localhost:3000 |
| Login pharmacie | http://localhost:3000/login |
| **Portail admin** | http://localhost:3000/admin/login |
| Dashboard | http://localhost:3000/dashboard |
| Dashboard admin | http://localhost:3000/admin |
| API | http://localhost:3001/api/v1/health |

> PostgreSQL sur le port **5433** (évite conflit avec PostgreSQL Windows)

En cas d'erreur Next.js (`Cannot find module './xxx.js'` ou `routes-manifest.json`) :
```bash
npm run dev:fresh
```

## Comptes test OTP

| Rôle | Téléphone | Application |
|------|-----------|-------------|
| Pharmacien — Plateau | +2250700000002 | Dashboard web http://localhost:3000/login |
| Pharmacien — Cocody | +2250700000022 | Dashboard web |
| Pharmacien — Marcory | +2250700000023 | Dashboard web |
| Client | +2250700000003 | App mobile |
| Admin | +2250700000099 | Portail admin http://localhost:3000/admin/login |

Le code OTP s'affiche dans la console API et dans l'UI en mode dev.

### App mobile sur téléphone physique

1. PC et téléphone sur le **même Wi-Fi**
2. Trouver l'IP locale du PC : `ipconfig` → ex. `192.168.1.42`
3. Démarrer l'API : `npm run dev` (port **3001**)
4. Autoriser le port 3001 dans le pare-feu Windows si besoin
5. Lancer Flutter :
   ```bash
   cd apps/mobile
   flutter run --dart-define=API_URL=http://192.168.1.42:3001/api/v1
   ```
   Remplacez `192.168.1.42` par votre IP réelle.

6. Activer le **mode développeur** + **débogage USB** sur Android, brancher le câble USB

> L'émulateur utilise `10.0.2.2` — sur un vrai téléphone il faut l'IP du PC, pas `localhost`.

---

## Fonctionnalités implémentées

### API (NestJS)
- Auth OTP + JWT, `/auth/me`
- Pharmacies (lecture publique + PATCH paramètres)
- Recherche produits + catalogue national
- Commandes (création client, workflow pharmacie, stats)
- Inventaire pharmacie (CRUD stock/prix)
- Assistant IA (garde-fous médicaux, OpenAI optionnel)
- Paiements Mobile Money (Orange, MTN, Wave, espèces) + webhook
- Health check DB + Redis

### Dashboard web (Next.js)
- Login OTP pharmacien
- Vue d'ensemble (KPIs live)
- Commandes (transitions + refus avec motif)
- **Ordonnances** (validation / refus avec aperçu image)
- Inventaire (debounce, édition, ajout produit, toggle dispo)
- Paramètres pharmacie (horaires, garde, adresse, **coordonnées GPS**)

### Portail admin (Next.js — Phase 2)
- Login OTP admin dédié (`/admin/login`)
- Vue d'ensemble nationale (KPIs, heatmap activité, commandes récentes)
- Gestion pharmacies (**création**, édition adresse/GPS, actif / de garde, assignation staff)
- Supervision commandes et utilisateurs
- **Ordonnances** (supervision nationale, filtres par statut)

### App mobile (Flutter)
- Recherche médicaments (API live, debounce)
- **Panier multi-produits** (1 pharmacie, persistance locale, badge FAB)
- **Pharmacies proches** (GPS + fallback Abidjan, tri par distance)
- Carte interactive centrée sur votre position
- **Itinéraire GPS** vers la pharmacie (Google Maps)
- OTP client
- **Commande + paiement** (retrait/livraison, Mobile Money, lien ordonnance validée pour Rx)
- Assistant IA
- Mes commandes (refresh)

### Mobile — URL API
- Émulateur Android : `http://10.0.2.2:3001/api/v1` (défaut)
- Simulateur iOS / Chrome : lancer avec  
  `flutter run --dart-define=API_URL=http://localhost:3001/api/v1`

---

## Endpoints principaux

```
POST   /auth/otp/send
POST   /auth/otp/verify
GET    /auth/me
GET    /pharmacies?lat=&lng=&radius=
GET    /admin/overview              (admin)
GET    /admin/pharmacies            (admin)
POST   /admin/pharmacies            (admin — créer pharmacie)
PATCH  /admin/pharmacies/:id        (admin — inclut latitude/longitude)
GET    /admin/orders                (admin)
GET    /admin/users                 (admin)
GET    /products/search?q=
GET    /products/catalog?q=          (pharmacien)
POST   /orders                       (client, prescriptionId optionnel pour Rx)
GET    /orders
PATCH  /orders/:id/status          (pharmacien)
GET    /prescriptions               (client / pharmacien / admin)
PATCH  /prescriptions/:id/status  (pharmacien — valider / refuser)
GET    /pharmacies/:id/inventory
POST   /pharmacies/:id/inventory
PATCH  /pharmacies/:id/inventory/:itemId
PATCH  /pharmacies/:id             (paramètres)
POST   /ai/chat
POST   /payments/initiate
POST   /payments/webhook
```

---

## Variables d'environnement

Copier `.env.example` vers `apps/api/.env` et `apps/web/.env.local`.

| Variable | Usage |
|----------|-------|
| DATABASE_URL | PostgreSQL (port 5433) |
| REDIS_URL | OTP |
| JWT_SECRET | Tokens |
| OPENAI_API_KEY | IA (optionnel) |
| CINETPAY_API_KEY | Paiement prod |

---

## Structure

```
apps/api       Backend NestJS + Prisma
apps/web       Dashboard pharmacie Next.js
apps/mobile    App client Flutter
packages/shared Types partagés
```
