# PharmaVie — Cahier des charges

**Plateforme de santé & pharmacie pour la Côte d'Ivoire**

| | |
|---|---|
| **Version** | 2.0 |
| **Date** | 14 juillet 2026 |
| **Statut** | Document de référence — équipe projet |
| **Production** | https://pharmavie.space |
| **API** | https://api.pharmavie.space/api/v1 |
| **Dépôt** | Monorepo `pharmavie` (API + Web + Mobile) |

---

## Table des matières

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Contexte et vision](#2-contexte-et-vision)
3. [Acteurs et rôles](#3-acteurs-et-rôles)
4. [Architecture technique](#4-architecture-technique)
5. [Applications et modules](#5-applications-et-modules)
6. [État d'avancement par fonctionnalité](#6-état-davancement-par-fonctionnalité)
7. [Données et intégrations](#7-données-et-intégrations)
8. [Sécurité et conformité](#8-sécurité-et-conformité)
9. [Déploiement et exploitation](#9-déploiement-et-exploitation)
10. [Modèle économique](#10-modèle-économique)
11. [Roadmap](#11-roadmap)
12. [Risques et mitigations](#12-risques-et-mitigations)
13. [Organisation projet](#13-organisation-projet)
14. [Critères d'acceptation](#14-critères-dacceptation)
15. [Annexes](#15-annexes)

**Légende des statuts**

| Symbole | Signification |
|---------|---------------|
| ✅ | Implémenté et déployé (ou fonctionnel en dev) |
| 🟡 | Partiellement implémenté — à compléter |
| ⬜ | Non démarré ou Phase 2+ |

---

## 1. Résumé exécutif

**PharmaVie** connecte les citoyens ivoiriens aux pharmacies de proximité : recherche de médicaments, comparaison de prix, commande, orientation santé via assistant IA, et gestion digitale pour les officines.

### Ce qui existe aujourd'hui

Le produit est **opérationnel en production** sur `pharmavie.space` avec :

- **Application mobile Flutter** (clients) — OTP SMS, recherche, carte, commandes, scan code-barres, assistant IA
- **Dashboard web pharmacie** (Next.js) — inventaire, commandes, ordonnances, paramètres
- **Portail admin national** — 756+ pharmacies, sync gardes UNPPCI, gestion utilisateurs
- **API NestJS** — authentification, catalogue, commandes, paiements, prescriptions
- **Base PostgreSQL + PostGIS**, Redis (OTP), déploiement VPS (PM2 + Docker DB)

### Priorités immédiates équipe

1. Import catalogue médicaments complet (AIRP / MEDPRYM)
2. Enrichissement codes EAN pour le scan caméra
3. Finalisation paiement Mobile Money (CinetPay) en production
4. Notifications push mobile
5. Publication stores (Google Play / App Store)

---

## 2. Contexte et vision

### 2.1 Problématique

En Côte d'Ivoire, patients et pharmacies font face à :

- Difficulté à trouver un médicament disponible rapidement, surtout la nuit (pharmacies de garde)
- Absence de transparence sur les prix entre officines
- Peu d'outils numériques pour les pharmacies (stock, commandes en ligne)
- Orientation santé difficile avant consultation médicale

### 2.2 Vision

Devenir **la plateforme de référence** reliant citoyens et pharmacies en Côte d'Ivoire, avec une expérience mobile-first, locale (FCFA, +225, Mobile Money) et conforme aux règles pharmaceutiques.

### 2.3 Objectifs mesurables (12 mois)

| Indicateur | Cible |
|------------|-------|
| Pharmacies référencées | 500+ actives |
| Utilisateurs mobile inscrits | 50 000+ |
| Commandes / mois | 10 000+ |
| Exactitude disponibilité affichée | > 90 % |
| Délai livraison Abidjan | < 2 h |
| Note app stores | ≥ 4,5 / 5 |

### 2.4 Périmètre géographique

| Phase | Zone |
|-------|------|
| **Phase 1 (actuelle)** | Grand Abidjan + annuaire national pharmacies |
| **Phase 2** | Bouaké, Yamoussoukro, San-Pédro |
| **Phase 3** | Couverture nationale complète |

---

## 3. Acteurs et rôles

### 3.1 Matrice des acteurs

| Acteur | Application | Authentification | Rôle principal |
|--------|-------------|------------------|----------------|
| **Client / Patient** | App mobile | OTP SMS (+225) | Recherche, commande, IA, ordonnances |
| **Pharmacien** | Dashboard web | Email ou pseudo + mot de passe | Stock, commandes, validation ordonnances |
| **Personnel pharmacie** | Dashboard web | Email ou pseudo + mot de passe | Préparation commandes, inventaire |
| **Administrateur PharmaVie** | Portail admin | Email ou pseudo + mot de passe | Gestion plateforme, pharmacies, sync gardes |
| **Livreur** | — (Phase 2) | — | Livraison commandes |
| **Spécialiste santé** | Annuaire (lecture) | — | Référencé pour orientation IA |

### 3.2 Personas

**Awa, 32 ans — mère de famille (Abidjan)**  
Cherche un médicament pour son enfant le soir, consulte les pharmacies de garde et compare les prix.

**Kouamé, 45 ans — pharmacien**  
Veut recevoir des commandes en ligne et mettre à jour son stock sans double saisie.

**Admin PharmaVie**  
Onboard les pharmacies, synchronise les gardes UNPPCI, supervise l'activité nationale.

---

## 4. Architecture technique

### 4.1 Schéma d'ensemble

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PHARMAVIE                                    │
├──────────────────┬─────────────────────┬────────────────────────────┤
│  App Mobile      │  Dashboard Web      │  Portail Admin             │
│  Flutter         │  Next.js 15         │  Next.js 15                │
│  iOS / Android   │  /login             │  /admin/login              │
└────────┬─────────┴──────────┬──────────┴─────────────┬──────────────┘
         │                    │                        │
         └────────────────────┼────────────────────────┘
                              │
                   ┌──────────▼──────────┐
                   │   API REST NestJS   │
                   │   /api/v1           │
                   └──────────┬──────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
  ┌──────▼──────┐    ┌────────▼────────┐   ┌──────▼──────┐
  │ PostgreSQL  │    │ Redis           │   │ OpenAI      │
  │ + PostGIS   │    │ (OTP, cache)    │   │ (IA, opt.)  │
  └─────────────┘    └─────────────────┘   └─────────────┘
```

### 4.2 Stack retenue (implémentée)

| Couche | Technologie | Dossier |
|--------|-------------|---------|
| Mobile client | Flutter 3.x / Dart | `apps/mobile` |
| Web pharmacie + admin | Next.js 15, TypeScript, Tailwind | `apps/web` |
| API | NestJS, Prisma ORM | `apps/api` |
| Base de données | PostgreSQL 16 + PostGIS | Docker |
| Cache / OTP | Redis 7 | Docker |
| SMS OTP | Twilio (prod) / mode dev | `apps/api/src/sms` |
| Paiement | CinetPay (intégration) | `apps/api/src/payments` |
| Cartes | flutter_map + OpenStreetMap | Mobile |
| Hébergement | VPS — pharmavie.space | `deploy/simple/` |
| Process manager | PM2 | API + Web |
| Reverse proxy | Nginx + Certbot (HTTPS) | |

### 4.3 Structure du monorepo

```
pharmavie/
├── apps/
│   ├── api/          Backend NestJS + Prisma
│   ├── web/          Dashboard pharmacie + Admin
│   └── mobile/       Application client Flutter
├── deploy/simple/    Scripts déploiement VPS
├── COMPTES_WEB.md    Comptes et accès web
├── CONFIGURATION_TWILIO.md
└── CAHIER_DES_CHARGES.md   (ce document)
```

---

## 5. Applications et modules

### 5.1 Application mobile client (Flutter)

**Public cible :** patients, grand public  
**Connexion :** numéro +225 + code OTP SMS (pas de mot de passe)

| Module | Description |
|--------|-------------|
| Accueil | Recherche rapide, raccourcis (carte, scan, comparateur, IA) |
| Explorer | Carte pharmacies, filtres ville/commune/garde, scan code-barres |
| Panier | Multi-produits, une pharmacie, persistance locale |
| Commande | Retrait ou livraison, ordonnance si Rx, paiement |
| Ordonnances | Envoi photo ordonnance, suivi validation |
| Commandes | Historique et statuts |
| Profil | Favoris, adresses, paramètres |
| Assistant IA | Chat orientation santé (garde-fous médicaux) |
| Comparateur prix | Comparaison offres entre pharmacies |
| Signalement prix | Signaler un prix incorrect |

### 5.2 Dashboard web pharmacie

**URL :** https://pharmavie.space/login  
**Connexion :** email **ou** pseudo + mot de passe

| Module | Description |
|--------|-------------|
| Vue d'ensemble | KPIs jour : commandes, stock, CA, alertes |
| Commandes | Workflow complet + refus, annulation, suppression |
| Inventaire | Stock, prix, ajout catalogue national, **code EAN** |
| Ordonnances | Validation / refus avec aperçu image |
| Paramètres | Horaires, garde, adresse, GPS |

### 5.3 Portail administrateur

**URL :** https://pharmavie.space/admin/login  
**Connexion :** email **ou** pseudo + mot de passe admin

| Module | Description |
|--------|-------------|
| Vue nationale | KPIs, heatmap activité, commandes récentes |
| Pharmacies | CRUD, recherche, GPS, actif/garde, **création compte pharmacien** |
| Sync gardes UNPPCI | Import planning depuis annuaireci.com |
| Commandes | Supervision nationale |
| Ordonnances | Supervision et filtres |
| Utilisateurs | Liste, filtres par rôle, activation/suspension |
| Spécialistes | Annuaire médecins (CRUD) |

---

## 6. État d'avancement par fonctionnalité

### 6.1 Module Client (Mobile)

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Inscription / connexion OTP SMS | ✅ | Twilio en production |
| Recherche médicament (nom, DCI) | ✅ | API live + debounce |
| Scan code-barres (EAN-13) | 🟡 | Fonctionnel ; base EAN à enrichir |
| Carte pharmacies + GPS | ✅ | flutter_map, tri distance |
| Filtres ville / commune / garde | ✅ | |
| Comparateur de prix | ✅ | |
| Panier multi-produits | ✅ | 1 pharmacie |
| Commande retrait / livraison | ✅ | |
| Ordonnance photo (médicaments Rx) | ✅ | |
| Paiement Mobile Money | 🟡 | Intégration CinetPay — config prod |
| Suivi commandes | ✅ | |
| Assistant IA | ✅ | OpenAI optionnel |
| Annuaire spécialistes | ✅ | |
| Pharmacies favorites | ✅ | |
| Signalement prix | ✅ | |
| Notifications push | ⬜ | Préférences en base, pas FCM |
| Connexion biométrique | ⬜ | Phase 2 |
| Mode invité | ⬜ | Phase 2 |
| Rappels médicaments | ⬜ | Phase 2 |
| Avis pharmacies | 🟡 | Modèle en base, UI partielle |

### 6.2 Module Pharmacie (Dashboard Web)

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Connexion email/pseudo + mot de passe | ✅ | |
| Vue d'ensemble KPIs | ✅ | |
| Gestion commandes (workflow) | ✅ | Confirmer → préparer → prête → livrée |
| Refus / annulation / suppression commande | ✅ | |
| Inventaire CRUD | ✅ | Prix, stock, disponibilité |
| Ajout produit catalogue national | ✅ | |
| Saisie code EAN à l'ajout | ✅ | Pour scan caméra mobile |
| Validation ordonnances | ✅ | |
| Paramètres pharmacie (GPS, horaires) | ✅ | |
| Alertes stock bas | 🟡 | Compteur alertes, pas notification push |
| Import CSV / sync ERP | ⬜ | Phase 2 |
| Chat client intégré | ⬜ | Phase 2 |
| Export comptable PDF | ⬜ | Phase 2 |

### 6.3 Module Administration

| Fonctionnalité | Statut | Détail |
|----------------|--------|--------|
| Vue nationale + heatmap | ✅ | |
| Liste / recherche pharmacies | ✅ | 756+ en base |
| Création pharmacie + compte pharmacien | ✅ | Pseudo + mot de passe à la création |
| Sync gardes UNPPCI | ✅ | annuaireci.com |
| Import pharmacies OSM | ✅ | Script `import:pharmacies` |
| Supervision commandes / utilisateurs | ✅ | |
| Gestion spécialistes | ✅ | |
| Modération avis | ⬜ | Phase 2 |
| Réinitialisation mot de passe | ⬜ | À développer |
| Gestion abonnements / commissions | ⬜ | Phase 2 |

### 6.4 Module Livraison

| Fonctionnalité | Statut |
|----------------|--------|
| App livreur | ⬜ Phase 2 |
| Suivi livreur temps réel | ⬜ Phase 2 |
| Frais livraison dynamiques | 🟡 Fixe 1 500 FCFA |

### 6.5 Catalogue médicaments

| Élément | Statut | Détail |
|---------|--------|--------|
| Seed 120 médicaments (LNME/AIRP) | ✅ | Démo / base |
| Import MEDPRYM (milliers) | 🟡 | Script prêt, à lancer sur VPS |
| Codes internes 619… | ✅ | Par produit |
| Codes EAN fabricant (scan boîte) | 🟡 | ~5 produits + saisie pharmacie |
| Prix par pharmacie | ✅ | `pharmacy_products` |

---

## 7. Données et intégrations

### 7.1 Sources de données

| Source | Usage | Statut |
|--------|-------|--------|
| **AIRP / MEDPRYM** | Catalogue national médicaments | 🟡 Import script |
| **OpenStreetMap** | Pharmacies géolocalisées | ✅ |
| **UNPPCI / annuaireci.com** | Planning pharmacies de garde | ✅ Sync hebdo |
| **ean-aliases.ts** | Correspondance EAN → produit | 🟡 Enrichissement manuel |
| **Saisie pharmacie** | EAN à l'ajout inventaire | ✅ |

### 7.2 Intégrations tierces

| Service | Usage | Statut |
|---------|-------|--------|
| **Twilio** | SMS OTP clients | ✅ Prod |
| **CinetPay** | Orange Money, MTN, Wave | 🟡 Config |
| **OpenAI** | Assistant IA | 🟡 Clé API optionnelle |
| **Google Maps** | Itinéraire (lien externe mobile) | ✅ |
| **Firebase FCM** | Push notifications | ⬜ |
| **Nginx + Certbot** | HTTPS | ✅ |

### 7.3 Workflow commande (implémenté)

```
NEW ──→ CONFIRMED ──→ PREPARING ──→ READY ──→ DELIVERING ──→ DELIVERED
 │           │              │           │
 └──→ REJECTED      CANCELLED ←────────┘
```

| Statut API | Libellé FR |
|------------|------------|
| NEW | Nouvelle |
| CONFIRMED | Confirmée |
| PREPARING | En préparation |
| READY | Prête |
| DELIVERING | En livraison |
| DELIVERED | Livrée |
| CANCELLED | Annulée |
| REJECTED | Refusée |

---

## 8. Sécurité et conformité

### 8.1 Authentification

| Canal | Méthode |
|-------|---------|
| App mobile (CLIENT) | OTP SMS — pas de mot de passe |
| Dashboard pharmacie | Email ou pseudo + mot de passe (bcrypt) |
| Portail admin | Email ou pseudo + mot de passe |
| API | JWT Bearer, rôles RBAC |

### 8.2 Rôles (RBAC)

`CLIENT` · `PHARMACIST` · `PHARMACY_STAFF` · `ADMIN` · `DELIVERY` (réservé)

### 8.3 Assistant IA — garde-fous

1. **L'IA informe, elle ne soigne pas** — disclaimer à chaque session
2. **Pas de prescription** — redirection vers professionnel
3. **Détection urgence** — orientation SAMU / urgences
4. **Médicaments sur ordonnance** — workflow validation pharmacien obligatoire

### 8.4 Conformité Côte d'Ivoire (à finaliser)

| Exigence | Statut |
|----------|--------|
| Consultation Ordre des Pharmaciens CI | ⬜ |
| Workflow ordonnance photo | ✅ |
| CGU + politique confidentialité | ⬜ |
| Déclaration protection données (ARTCI) | ⬜ |
| Mentions légales IA | 🟡 |

### 8.5 Sécurité technique

- HTTPS TLS (Let's Encrypt) ✅
- JWT + expiration tokens ✅
- Mots de passe hashés (bcrypt) ✅
- CORS configuré ✅
- Sauvegardes PostgreSQL — à automatiser 🟡

---

## 9. Déploiement et exploitation

### 9.1 Environnements

| Environnement | URL | Usage |
|---------------|-----|-------|
| **Production** | https://pharmavie.space | Public |
| **API prod** | https://api.pharmavie.space/api/v1 | Mobile + Web |
| **Local dev** | localhost:3000 / 3001 | Développement |

### 9.2 Déploiement VPS (méthode recommandée)

```bash
cd /opt/pharmavie
git pull
bash deploy/simple/deploy.sh          # Déploiement standard
bash deploy/simple/deploy.sh --full-data   # + import pharmacies + MEDPRYM
```

**Composants :** PM2 (API + Web), Docker (PostgreSQL + Redis), Nginx, Certbot

### 9.3 Commandes données importantes

```bash
npm run db:push -w @pharmavie/api          # Schéma BDD
npm run db:seed -w @pharmavie/api          # Données de base
npm run import:pharmacies -w @pharmavie/api   # Pharmacies OSM + gardes
npm run import:medprym -w @pharmavie/api      # Catalogue AIRP
npm run inventory:seed -w @pharmavie/api      # Stock pharmacies
npm run ean:seed -w @pharmavie/api            # Codes EAN connus
```

### 9.4 Comptes de test (après seed)

Voir fichier **`COMPTES_WEB.md`** — mot de passe initial : `PharmaVie2026!`

| Rôle | Accès |
|------|-------|
| Admin | https://pharmavie.space/admin/login |
| Pharmacie | https://pharmavie.space/login |
| Client mobile | OTP sur +2250700000003 (dev) |

---

## 10. Modèle économique

### 10.1 Sources de revenus envisagées

1. **Commission** sur commandes livrées (8–12 %)
2. **Abonnement pharmacie** (Starter / Pro / Premium)
3. **Mise en avant** dans les résultats de recherche
4. **Marge livraison**
5. **Partenariats** laboratoires / mutuelles (Phase 3)

### 10.2 Grille abonnement pharmacie (indicatif)

| Plan | Prix/mois | Inclus |
|------|-----------|--------|
| Starter | 0 FCFA | 50 produits, 20 commandes/mois |
| Pro | 25 000 FCFA | Stock illimité, analytics |
| Premium | 75 000 FCFA | Visibilité, support, API |

> Facturation abonnements : **Phase 2** — non implémentée.

---

## 11. Roadmap

### Phase 0 — Fondations ✅ (terminée)

- Architecture monorepo, API, BDD, auth
- Design system web (Tailwind, vert PharmaVie)
- Déploiement production pharmavie.space

### Phase 1 — MVP 🟡 (en cours)

| Livrable | Statut |
|----------|--------|
| App mobile recherche + commande | ✅ |
| Dashboard pharmacie complet | ✅ |
| Portail admin + 756 pharmacies | ✅ |
| Catalogue MEDPRYM complet | 🟡 |
| Paiement Mobile Money prod | 🟡 |
| Scan EAN opérationnel | 🟡 |
| Publication stores | ⬜ |

### Phase 2 — Croissance (Q4 2026 – Q1 2027)

- App livreur + suivi temps réel
- Notifications push (FCM)
- Chat client-pharmacie
- Analytics avancés pharmacie
- Extension Bouaké / Yamoussoukro
- Abonnements et facturation pharmacies

### Phase 3 — Scale (2027+)

- Sync ERP pharmacies
- Partenariats mutuelles
- Programme fidélité
- API ouverte B2B

---

## 12. Risques et mitigations

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Stock pharmacies incorrect | Élevé | Moyenne | Confirmation à la commande, signalement client |
| Responsabilité médicale IA | Critique | Faible | Disclaimers, pas de diagnostic, comité médical |
| Faible adoption pharmacies | Élevé | Moyenne | Onboarding gratuit, formation, support |
| Catalogue incomplet | Élevé | Actuelle | Import MEDPRYM + saisie EAN pharmacies |
| Pannes Mobile Money | Moyen | Moyenne | Multi-opérateurs + espèces |
| Réseau 3G/4G lent | Moyen | Élevée | App légère, cache, messages clairs |

---

## 13. Organisation projet

### 13.1 Équipe recommandée

| Rôle | Responsabilités |
|------|-----------------|
| **Product Owner / Chef de projet** | Priorisation, roadmap, stakeholders |
| **Dev mobile (Flutter)** | App client, stores |
| **Dev fullstack (Next.js + NestJS)** | Web, API, BDD |
| **DevOps** | VPS, CI/CD, monitoring |
| **Designer UX/UI** | Maquettes, design system |
| **QA** | Tests manuels et automatisés |
| **Conseiller pharmacien** | Conformité, workflow ordonnances |
| **Commercial pharmacies** | Onboarding officines CI |

### 13.2 Documentation projet

| Document | Contenu |
|----------|---------|
| `CAHIER_DES_CHARGES.md` | Ce document |
| `COMPTES_WEB.md` | Accès admin et pharmacies |
| `CONFIGURATION_TWILIO.md` | SMS OTP |
| `DEPLOIEMENT_PHARMAVIE_SPACE.md` | Guide déploiement VPS |
| `README.md` | Démarrage développeur |

### 13.3 Export PDF pour l'équipe

1. Ouvrir ce fichier dans **VS Code**, **Typora** ou **GitHub**
2. Exporter en PDF :
   - **VS Code** : extension « Markdown PDF » → clic droit → Export PDF
   - **Typora** : Fichier → Exporter → PDF
   - **Navigateur** : coller le HTML rendu → Imprimer → Enregistrer en PDF
   - **Pandoc** : `pandoc CAHIER_DES_CHARGES.md -o PharmaVie_CDC.pdf --pdf-engine=xelatex -V geometry:margin=2.5cm`

---

## 14. Critères d'acceptation

Une fonctionnalité est **validée** si :

1. Elle fonctionne sur **Android 10+** et **iOS 15+** (mobile)
2. Elle fonctionne sur **Chrome, Safari, Edge** dernières versions (web)
3. Les parcours critiques sont testés manuellement (recherche → commande → préparation)
4. L'API retourne des erreurs explicites (pas de 500 silencieux)
5. Les données sensibles ne sont pas exposées (auth, RBAC)
6. Documentation à jour dans le dépôt

**Parcours critiques à tester avant chaque release :**

1. Client : OTP → recherche → panier → commande
2. Pharmacie : login → commande NEW → confirmée → prête
3. Admin : création pharmacie + compte → sync gardes
4. Scan code-barres → résultat ou message explicite

---

## 15. Annexes

### Annexe A — Glossaire

| Terme | Définition |
|-------|------------|
| **DCI** | Dénomination Commune Internationale (nom générique) |
| **EAN-13 / GTIN** | Code-barres sur la boîte du médicament |
| **AIRP** | Autorité Ivoirienne de Régulation Pharmaceutique |
| **UNPPCI** | Union Nationale des Pharmaciens Privés de CI |
| **Pharmacie de garde** | Permanence 24h/24 (planning hebdomadaire) |
| **Mobile Money** | Orange Money, MTN MoMo, Wave |
| **Rx** | Médicament nécessitant une ordonnance |
| **FCFA** | Franc CFA — devise |
| **OTP** | One-Time Password — code SMS à usage unique |

### Annexe B — Endpoints API principaux

```
POST   /auth/otp/send              OTP mobile
POST   /auth/otp/verify            Connexion client
POST   /auth/login/staff           Connexion pharmacie
POST   /auth/login/admin           Connexion admin
GET    /products/search?q=         Recherche + scan
GET    /products/compare?q=        Comparateur prix
POST   /orders                     Créer commande
PATCH  /orders/:id/status          Workflow pharmacie
DELETE /orders/:id                 Supprimer commande
GET    /pharmacies?lat=&lng=       Pharmacies proches
POST   /pharmacies/:id/inventory   Ajouter stock (+ EAN)
GET    /admin/pharmacies           Liste admin
POST   /admin/pharmacies           Créer pharmacie + compte
POST   /admin/pharmacies/sync-duty Sync gardes UNPPCI
POST   /ai/chat                    Assistant IA
POST   /payments/initiate          Paiement Mobile Money
```

### Annexe C — Identité visuelle

| Élément | Valeur |
|---------|--------|
| Couleur principale | Vert émeraude `#059669` |
| Couleur secondaire | Menthe clair `#ECFDF5` |
| Logo | Icône « P » + croix médicale (app mobile) |
| Typographie web | System UI / Tailwind defaults |

### Annexe D — Budget indicatif MVP restant

| Poste | Estimation |
|-------|------------|
| Finalisation MVP (catalogue, EAN, paiement, stores) | 15–25 M FCFA |
| Infrastructure VPS (12 mois) | 2–4 M FCFA |
| APIs (SMS, IA, paiement) | 2–4 M FCFA |
| Marketing lancement | 5–10 M FCFA |
| Juridique & conformité | 2–3 M FCFA |

---

**PharmaVie** — Plateforme santé & pharmacie, Côte d'Ivoire  
*Document v2.0 — 14 juillet 2026 — À partager avec l'équipe projet.*

*Contact technique : voir dépôt Git et documentation `deploy/simple/`.*
