# Cahier des charges — PharmaVie
## Plateforme de santé & pharmacie pour la Côte d'Ivoire

**Version :** 1.0  
**Date :** 2 juillet 2026  
**Statut :** Document de référence pour la conception et le développement

---

## 1. Contexte et vision

### 1.1 Problématique
En Côte d'Ivoire, les patients peinent souvent à :
- localiser un médicament disponible rapidement ;
- comparer les prix entre pharmacies ;
- commander et se faire livrer sans se déplacer ;
- obtenir une orientation fiable avant de consulter un professionnel de santé.

Les pharmacies, de leur côté, manquent d'outils numériques pour gérer leurs stocks en temps réel, recevoir des commandes et fidéliser leur clientèle.

### 1.2 Vision
**PharmaVie** est la plateforme de référence qui connecte les citoyens ivoiriens aux pharmacies de proximité, avec une expérience fluide, moderne et utile au quotidien.

### 1.3 Objectifs mesurables (12 mois)
| Objectif | Cible |
|----------|-------|
| Pharmacies partenaires actives | 200+ |
| Utilisateurs inscrits | 50 000+ |
| Commandes traitées / mois | 10 000+ |
| Taux de disponibilité affiché correct | > 90 % |
| Délai moyen de livraison (Abidjan) | < 2 h |
| Note moyenne app stores | ≥ 4,5 / 5 |

### 1.4 Périmètre géographique
- **Phase 1 :** Grand Abidjan (Cocody, Plateau, Yopougon, Marcory, Treichville, etc.)
- **Phase 2 :** Bouaké, Yamoussoukro, San-Pédro
- **Phase 3 :** Couverture nationale

---

## 2. Acteurs et personas

### 2.1 Acteurs du système
| Acteur | Rôle |
|--------|------|
| **Client / Patient** | Recherche, commande, suit livraison, utilise l'assistant IA |
| **Pharmacien / Gérant** | Gère stock, commandes, prix, livraisons via dashboard web |
| **Personnel pharmacie** | Prépare commandes, met à jour disponibilités |
| **Livreur** | Récupère et livre les commandes (interne ou partenaire) |
| **Médecin / Spécialiste** | Référencé pour orientation (pas de consultation in-app en V1) |
| **Administrateur PharmaVie** | Modération, analytics, support, onboarding pharmacies |
| **Régulateur / Conformité** | ANSM locale, ordre des pharmaciens (consultation externe) |

### 2.2 Personas clés

**Awa, 32 ans — mère de famille (Abidjan)**  
Cherche des médicaments pour son enfant à 21 h, veut savoir quelle pharmacie de garde a le produit et à quel prix.

**Kouamé, 45 ans — pharmacien propriétaire**  
Gère 3 employés, veut digitaliser les commandes et réduire les ruptures de stock grâce à un inventaire clair.

**Jean, 28 ans — étudiant**  
Utilise l'assistant IA pour comprendre des symptômes légers avant de décider s'il consulte.

---

## 3. Architecture produit (écosystème)

```
┌─────────────────────────────────────────────────────────────────┐
│                        PHARMAVIE                                 │
├──────────────┬────────────────────┬─────────────────────────────┤
│  App Mobile  │  Dashboard Web     │  Portail Admin              │
│  (Clients)   │  (Pharmacies)      │  (Équipe PharmaVie)         │
│  iOS/Android │  Responsive PWA    │  Back-office                │
└──────┬───────┴─────────┬──────────┴──────────────┬──────────────┘
       │                 │                         │
       └─────────────────┼─────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   API Backend       │
              │   (REST + WebSocket)│
              └──────────┬──────────┘
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
┌──────▼──────┐  ┌───────▼───────┐  ┌──────▼──────┐
│ PostgreSQL  │  │ Redis / Cache │  │ IA / LLM    │
│ + PostGIS   │  │ Notifications │  │ Symptômes   │
└─────────────┘  └───────────────┘  └─────────────┘
```

### 3.1 Applications à développer
1. **Application mobile client** (Flutter ou React Native — cross-platform)
2. **Dashboard web pharmacie** (React / Next.js — responsive, utilisable sur tablette en officine)
3. **Application livreur** (module léger ou app dédiée — Phase 2)
4. **Portail administrateur** (gestion plateforme)
5. **API centrale** + services (auth, commandes, stock, géolocalisation, IA)

---

## 4. Exigences fonctionnelles

### 4.1 Module Client (Application mobile)

#### 4.1.1 Authentification & profil
- [ ] Inscription par numéro de téléphone (+225) avec OTP SMS
- [ ] Connexion biométrique (empreinte / Face ID)
- [ ] Profil : nom, adresses enregistrées, historique commandes
- [ ] Mode invité limité (recherche sans commande)

#### 4.1.2 Recherche de médicaments
- [ ] Recherche par nom commercial, DCI (dénomination commune), code-barres (scan)
- [ ] Filtres : distance, prix, disponibilité, pharmacie de garde
- [ ] Carte interactive des pharmacies avec pins colorés (disponible / rupture / garde)
- [ ] Affichage : prix TTC, stock estimé, distance, horaires, note utilisateurs
- [ ] Comparaison côte à côte (jusqu'à 5 pharmacies)

#### 4.1.3 Commande & livraison
- [ ] Panier multi-produits, multi-pharmacies (si autorisé)
- [ ] Choix : retrait en pharmacie ou livraison à domicile
- [ ] Paiement : Mobile Money (Orange Money, MTN MoMo, Wave), espèces à la livraison
- [ ] Suivi commande en temps réel (statuts + carte livreur en Phase 2)
- [ ] Notifications push à chaque changement de statut
- [ ] Historique et factures PDF

#### 4.1.4 Assistant IA santé (orientation — pas diagnostic)
- [ ] Chat conversationnel en français (et nouchi optionnel Phase 2)
- [ ] Collecte structurée : symptômes, durée, antécédents, âge
- [ ] Réponses pédagogiques avec **avertissement médical obligatoire**
- [ ] Recommandation de type de professionnel ( généraliste, pédiatre, gynécologue, etc.)
- [ ] Carte des spécialistes / centres de santé à proximité (annuaire partenaire)
- [ ] Escalade vers pharmacie de garde ou urgences si signes graves détectés
- [ ] **Interdiction explicite** : prescription, diagnostic définitif, substitution médicamenteuse

#### 4.1.5 Fonctionnalités sociales & confiance
- [ ] Avis et notes sur pharmacies (modérés)
- [ ] Signalement produit indisponible / prix incorrect
- [ ] Pharmacies favorites
- [ ] Rappels de prise médicamenteuse (Phase 2)

---

### 4.2 Module Pharmacie (Dashboard web)

#### 4.2.1 Onboarding pharmacie
- [ ] Inscription avec vérification licence / autorisation d'exercice
- [ ] Fiche pharmacie : nom, adresse GPS, téléphone, horaires, photo, services (garde, livraison)
- [ ] Configuration équipe : rôles (admin, préparateur, caissier)

#### 4.2.2 Gestion des produits & inventaire
- [ ] Catalogue produits (base nationale + ajout manuel)
- [ ] Entrées / sorties de stock (réception, vente, casse, péremption)
- [ ] Alertes : stock bas, péremption proche (< 30 jours)
- [ ] Import CSV / sync ERP pharmacie (Phase 2)
- [ ] Mise à jour prix en masse ou unitaire
- [ ] Statut disponibilité publié automatiquement sur l'app client

#### 4.2.3 Gestion des commandes
- [ ] File d'attente commandes (nouvelle → confirmée → préparée → livrée)
- [ ] Acceptation / refus avec motif (rupture, ordonnance manquante)
- [ ] Impression bon de préparation
- [ ] Attribution livreur interne ou PharmaVie Delivery
- [ ] Statistiques : CA journalier, produits les plus demandés

#### 4.2.4 Communication client
- [ ] Chat intégré avec client (question sur substitut, disponibilité)
- [ ] Réponses rapides prédéfinies
- [ ] Notifications commandes entrantes (son + push web)

#### 4.2.5 Tableau de bord & analytics
- [ ] KPIs : ventes, commandes en cours, taux de rupture, panier moyen
- [ ] Graphiques : évolution hebdomadaire / mensuelle
- [ ] Export comptable (CSV, PDF)

---

### 4.3 Module Administration (Portail PharmaVie)

- [ ] Validation et suspension comptes pharmacies
- [ ] Modération avis et signalements
- [ ] Gestion catalogue national médicaments
- [ ] Configuration tarifs commission / abonnement
- [ ] Tableau de bord national (heatmap demandes, zones sous-desservies)
- [ ] Support tickets clients et pharmacies
- [ ] Logs audit et conformité

---

### 4.4 Module Livraison (Phase 2)

- [ ] App livreur : courses disponibles, navigation, preuve livraison (photo + signature)
- [ ] Calcul frais livraison dynamique (distance, trafic Abidjan)
- [ ] Paiement livreur et reversement pharmacie

---

## 5. Exigences IA — Assistant santé

### 5.1 Principes non négociables
1. **L'IA informe, elle ne soigne pas** — disclaimers visibles à chaque session
2. **Pas de prescription** — redirection vers professionnel habilité
3. **Détection d'urgence** — mots-clés et règles pour orienter vers SAMU / urgences
4. **Traçabilité** — journalisation des échanges (anonymisée) pour amélioration et audit
5. **Validation humaine** — contenu médical validé par comité consultatif (pharmacien + médecin)

### 5.2 Fonctionnalités IA
| Fonction | Description | Priorité |
|----------|-------------|----------|
| Tri symptômes | Questions adaptatives (arbre décisionnel + LLM) | MVP |
| Orientation spécialiste | Suggestion type de praticien + carte | MVP |
| FAQ médicaments | Interactions, posologie générale (sources officielles) | Phase 2 |
| Recherche vocale | Dictée en français local | Phase 2 |
| Résumé pour pharmacien | Contexte commande (avec consentement patient) | Phase 2 |

### 5.3 Garde-fous techniques
- Prompt system strict avec refus de diagnostic
- Liste noire médicaments sur ordonnance → redirection pharmacie
- Rate limiting et modération contenu
- Conformité RGPD / loi ivoirienne sur les données personnelles

---

## 6. Exigences UX / UI — Design system cohérent

### 6.1 Principes de design
- **Clarté avant tout** : typographie lisible, contrastes WCAG AA
- **Confiance** : palette médicale moderne (verts apaisants, blancs, accents chaleureux)
- **Rapidité perçue** : skeleton loaders, transitions < 300 ms
- **Cohérence** : même design system sur mobile, web pharmacie et admin
- **Contexte local** : icônes Mobile Money, formats +225, franc CFA (FCFA)

### 6.2 Design system PharmaVie (à produire en amont)
- [ ] Tokens : couleurs, espacements, rayons, ombres
- [ ] Typographie : Inter ou Plus Jakarta Sans + fallback système
- [ ] Composants : boutons, cartes pharmacie, badges stock, modales, toasts
- [ ] Iconographie : Lucide ou Phosphor (style uniforme)
- [ ] Mode sombre (Phase 2)

### 6.3 Parcours critiques à prototyper (Figma)
1. Recherche médicament → résultats carte → commande
2. Réception commande côté pharmacie → préparation → clôture
3. Conversation assistant IA → orientation spécialiste
4. Onboarding pharmacie complet

### 6.4 Performance UX
- First Contentful Paint < 1,5 s (4G)
- Recherche médicament : résultats < 500 ms
- Offline partiel : historique commandes + favoris en cache

---

## 7. Exigences techniques

### 7.1 Stack recommandée
| Couche | Technologie suggérée |
|--------|---------------------|
| Mobile | Flutter (performance + un seul codebase) |
| Web pharmacie / admin | Next.js 15 + TypeScript |
| Backend | Node.js (NestJS) ou Python (FastAPI) |
| Base de données | PostgreSQL + PostGIS (géolocalisation) |
| Cache / temps réel | Redis + WebSocket (Socket.io) |
| Recherche | Meilisearch ou Elasticsearch |
| IA | OpenAI API / Claude API + couche règles métier |
| Hébergement | AWS af-south-1 (Le Cap) ou GCP — latence CI |
| CDN | Cloudflare |
| Auth | JWT + refresh tokens, OTP via Africa's Talking ou Twilio |
| Paiement | Agrégateur CinetPay / PayDunya (Mobile Money CI) |
| Maps | Google Maps ou Mapbox |
| Notifications | Firebase Cloud Messaging |
| Stockage fichiers | S3-compatible |

### 7.2 Sécurité
- HTTPS partout, certificats TLS 1.3
- Chiffrement données sensibles au repos (AES-256)
- RBAC strict (client, pharmacien, admin, livreur)
- Audit log des actions sensibles
- Pentest avant lancement public
- Sauvegardes quotidiennes, RPO < 1 h, RTO < 4 h

### 7.3 Scalabilité
- Architecture modulaire (microservices progressifs)
- API stateless, horizontal scaling
- Objectif : 10 000 requêtes/min en pic

---

## 8. Modèle économique

### 8.1 Sources de revenus
1. **Commission** sur commandes livrées (8–12 %)
2. **Abonnement pharmacie** : tier Gratuit (limité) / Pro / Premium
3. **Mise en avant** : pharmacies sponsorisées dans résultats recherche
4. **Livraison** : marge sur frais livraison
5. **Partenariats** : laboratoires, mutuelles (Phase 3)

### 8.2 Grille abonnement pharmacie (indicatif)
| Plan | Prix/mois | Inclus |
|------|-----------|--------|
| Starter | 0 FCFA | 50 produits, 20 commandes/mois |
| Pro | 25 000 FCFA | Illimité stock, analytics, chat |
| Premium | 75 000 FCFA | + visibilité, support prioritaire, API sync |

---

## 9. Conformité & réglementaire (Côte d'Ivoire)

- [ ] Consultation Ordre des Pharmaciens de Côte d'Ivoire
- [ ] Respect vente médicaments sur ordonnance (workflow validation ordonnance photo)
- [ ] Déclaration CNIL équivalente : ARTCI / protection données personnelles
- [ ] Conditions générales d'utilisation + politique confidentialité
- [ ] Mentions légales assistant IA (disclaimer médical)
- [ ] Facturation conforme (TVA, reçus)

---

## 10. Intégrations tierces

| Service | Usage |
|---------|-------|
| Orange Money / MTN MoMo / Wave | Paiements |
| Africa's Talking | SMS OTP |
| Google Maps / Mapbox | Géolocalisation |
| Firebase | Push notifications |
| OpenAI / Anthropic | Assistant IA |
| CinetPay / PayDunya | Agrégation paiement |

---

## 11. Plan de déploiement par phases

### Phase 0 — Fondations (6–8 semaines)
- Design system Figma complet
- Architecture technique + CI/CD
- API auth, profils, catalogue médicaments pilote (500 références)
- Landing page + pré-inscription pharmacies

### Phase 1 — MVP (10–12 semaines)
- App client : recherche, carte, commande retrait pharmacie
- Dashboard pharmacie : stock, commandes, prix
- Paiement Mobile Money
- Assistant IA basique (orientation symptômes légers)
- Lancement pilote : 20 pharmacies Abidjan

### Phase 2 — Croissance (8–10 semaines)
- Livraison à domicile + app livreur
- Chat client-pharmacie
- Analytics avancés pharmacie
- Extension Bouaké / Yamoussoukro
- Ordonnance photo + validation

### Phase 3 — Scale (continu)
- Sync ERP pharmacies
- Partenariats mutuelles / assurances
- Programme fidélité
- API ouverte B2B

---

## 12. Critères d'acceptation globaux

Une fonctionnalité est **validée** si :
1. Elle respecte le design system PharmaVie
2. Elle fonctionne sur Android 10+ et iOS 15+ (client) / Chrome, Safari, Edge dernières versions (web)
3. Les tests unitaires couvrent ≥ 70 % du code métier critique
4. Les tests E2E passent sur les 3 parcours critiques
5. Accessibilité : navigation clavier web, labels ARIA, tailles touch ≥ 44 px mobile
6. Documentation API à jour (OpenAPI / Swagger)
7. Revue sécurité et conformité médicale approuvée

---

## 13. Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Données stock pharmacies incorrectes | Élevé | Sync obligatoire à la confirmation commande, pénalités réputation |
| Responsabilité médicale IA | Critique | Disclaimers, pas de diagnostic, comité médical, assurance RC Pro |
| Faible adoption pharmacies | Élevé | Onboarding gratuit, formation sur site, support dédié |
| Pannes Mobile Money | Moyen | Multi-opérateurs + paiement espèces |
| Concurrence (Jumia Health, etc.) | Moyen | Différenciation locale, IA, relation pharmacien |
| Lenteur réseau 3G/4G | Moyen | App légère, cache agressif, mode dégradé |

---

## 14. Équipe projet recommandée

| Rôle | Effectif |
|------|----------|
| Product Owner / Chef de projet | 1 |
| Designer UX/UI | 1 |
| Dev mobile (Flutter) | 1–2 |
| Dev fullstack (Next.js + API) | 2 |
| DevOps / Infra | 1 |
| QA | 1 |
| Conseiller médical / pharmacien | 1 (consultant) |
| Commercial pharmacies (CI) | 1–2 |

---

## 15. Budget indicatif (MVP — 6 mois)

| Poste | Estimation |
|-------|------------|
| Développement (équipe) | 45–70 M FCFA |
| Design & branding | 5–8 M FCFA |
| Infrastructure cloud (6 mois) | 3–5 M FCFA |
| APIs tierces (maps, SMS, IA, paiement) | 2–4 M FCFA |
| Marketing lancement pilote | 5–10 M FCFA |
| Juridique & conformité | 2–3 M FCFA |
| **Total MVP** | **~62–100 M FCFA** |

*Budget à affiner selon choix stack et recrutement local vs remote.*

---

## 16. Prochaines étapes immédiates

1. **Valider** ce cahier des charges avec un pharmacien et un médecin ivoiriens
2. **Nommer** le produit définitif (PharmaVie ?) et réserver domaines + réseaux sociaux
3. **Produire** maquettes Figma des 4 parcours critiques
4. **Constituer** la base médicaments pilote (partenariat grossiste ou open data)
5. **Recruter** 5 pharmacies pilotes à Abidjan pour co-construction
6. **Choisir** stack technique et initialiser le dépôt Git
7. **Consultation juridique** : ordre des pharmaciens + ARTCI

---

## Annexe A — Glossaire

| Terme | Définition |
|-------|------------|
| DCI | Dénomination Commune Internationale (nom générique du médicament) |
| Pharmacie de garde | Pharmacie ouverte en dehors des horaires habituels (rotation locale) |
| Mobile Money | Paiement via téléphone (Orange Money, MTN MoMo, Wave) |
| MVP | Minimum Viable Product — première version utilisable |
| PostGIS | Extension PostgreSQL pour données géographiques |

---

## Annexe B — Statuts commande (workflow)

```
NOUVELLE → CONFIRMÉE_PHARMACIE → EN_PRÉPARATION → PRÊTE
    ↓                                      ↓
 REFUSÉE                              EN_LIVRAISON → LIVRÉE
                                              ↓
                                         ANNULÉE
```

---

*Document rédigé pour le projet PharmaVie — Plateforme santé Côte d'Ivoire.*  
*À réviser après validation stakeholders et retours pilote.*
