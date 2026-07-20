# Captures d'écran Play Store — PharmaVie

Guide **écran par écran** pour produire **6 à 8 captures** au format **1080 × 1920 px** (portrait).

Placez les fichiers finaux dans :
```
apps/mobile/store-assets/screenshots/
  01-accueil-recherche.png
  02-recherche-pharmacie.png
  03-catalogue-pharmacie.png
  04-carte-pharmacies.png
  05-panier.png
  06-commande-suivi.png
  07-assistant-ia.png        (optionnel)
  08-profil-decouvrir.png    (optionnel)
```

---

## Prérequis avant de capturer

- [ ] Téléphone Android **1080p minimum** (ou émulateur Pixel 6)
- [ ] App en mode **release** ou **profile** pointée vers **api.pharmavie.space**
- [ ] Compte client connecté (OTP test)
- [ ] **2–3 pharmacies** avec stock visible en base
- [ ] Mode clair (pas mode sombre système)
- [ ] Barre de statut propre : **100 % batterie, bon réseau, pas de notifications gênantes**
- [ ] Langue téléphone : **français**

### Astuce qualité Play Store

- Capture native : **Volume bas + Power** (Android)
- Ou Android Studio → **Device Manager** → icône caméra (1080×2400 → recadrez en 1080×1920)
- Évitez les captures avec clavier ouvert
- Même appareil / même ratio pour toutes les images

---

## Capture 1 — Accueil + recherche médicament

| | |
|---|---|
| **Fichier** | `01-accueil-recherche.png` |
| **Onglet** | Accueil (1er onglet) |
| **Message vendu** | « Trouvez vos médicaments rapidement » |

### Étapes

1. Ouvrir l'app → onglet **Accueil**
2. Laisser le GPS actif (ville affichée, ex. Abidjan)
3. Onglet recherche : **Médicament** sélectionné (pas Pharmacie)
4. Taper **« Paracétamol »** ou **« Doliprane »** — laisser les résultats s'afficher
5. Faire défiler pour montrer **au moins 2 résultats** avec prix et distance
6. Capturer quand la liste est visible (pas le loader)

### Vérifier sur la capture

- Logo PharmaVie + slogan visibles
- Résultats avec prix en **FCFA**
- Badge « Dispo » sur au moins un produit

---

## Capture 2 — Recherche par nom de pharmacie

| | |
|---|---|
| **Fichier** | `02-recherche-pharmacie.png` |
| **Message vendu** | « Choisissez votre pharmacie par son nom » |

### Étapes

1. Accueil → basculer sur **Pharmacie** (sous la barre de recherche)
2. Taper le nom d'une pharmacie réelle en base (ex. partie du nom : **« Pharmacie »**, **« Plateau »**, **« Cocody »**)
3. Attendre la liste **Pharmacies trouvées**
4. Capturer avec **2–3 pharmacies** listées (nom, adresse, distance)

### Vérifier

- Toggle **Médicament / Pharmacie** visible
- Texte « X pharmacie(s) » dans l'en-tête de section

---

## Capture 3 — Catalogue d'une pharmacie (commander chez elle)

| | |
|---|---|
| **Fichier** | `03-catalogue-pharmacie.png` |
| **Message vendu** | « Commandez chez LA pharmacie de votre choix » |

### Étapes

1. Depuis capture 2 → **taper** sur une pharmacie
2. Écran **Commander dans cette pharmacie**
3. Laisser le catalogue charger (produits visibles)
4. Optionnel : taper **« para »** dans la recherche interne pour filtrer
5. Capturer avec **4+ produits**, prix et bouton panier visibles

### Vérifier

- Nom de la pharmacie dans le titre (AppBar)
- Bandeau info (de garde / nombre de produits) si présent
- Prix en FCFA

---

## Capture 4 — Carte interactive + pharmacies de garde

| | |
|---|---|
| **Fichier** | `04-carte-pharmacies.png` |
| **Onglet / écran** | Découvrir → **Carte interactive** (ou chip Carte depuis Accueil) |

### Étapes

1. Ouvrir **Carte interactive**
2. Attendre le chargement des marqueurs
3. Zoomer sur **Abidjan** (plusieurs pins visibles)
4. Optionnel : activer filtre **De garde**
5. Capturer la carte avec **marqueurs verts** + votre position (point bleu)

### Vérifier

- Carte OpenStreetMap lisible
- Au moins **5 pins** pharmacies
- Filtres en haut visibles (Toutes / De garde / Avec stock)

---

## Capture 5 — Panier

| | |
|---|---|
| **Fichier** | `05-panier.png` |
| **Message vendu** | « Panier simple, une pharmacie à la fois » |

### Étapes

1. Depuis le catalogue (capture 3) → **ajouter 2 produits** au panier
2. Ouvrir **Panier** (FAB ou icône panier)
3. Capturer avec **2 lignes**, quantités, sous-total en FCFA
4. Nom de la **pharmacie** visible en haut du panier

### Vérifier

- Sous-total cohérent
- Bouton **Commander** / **Passer commande** visible en bas

---

## Capture 6 — Suivi de commande

| | |
|---|---|
| **Fichier** | `06-commande-suivi.png` |
| **Onglet** | **Commandes** (2e onglet) |

### Étapes

1. Si aucune commande : passez **une commande test** (retrait + espèces) depuis le panier
2. Onglet **Commandes**
3. Ouvrir le **détail** d'une commande (bottom sheet ou écran détail)
4. Capturer avec **statut coloré** (Nouvelle / Confirmée / En préparation…) et **timeline** de progression

### Vérifier

- Numéro commande (#PV-…)
- Montant total
- Statut en **français**

---

## Capture 7 (optionnel) — Assistant IA

| | |
|---|---|
| **Fichier** | `07-assistant-ia.png` |
| **Onglet** | **Assistant IA** |

### Étapes

1. Onglet Assistant IA
2. Envoyer : **« J'ai mal à la tête, que faire ? »**
3. Attendre la réponse
4. Capturer conversation avec **disclaimer** santé visible si affiché

### Vérifier

- Interface chat moderne
- Pas de contenu médical choquant

---

## Capture 8 (optionnel) — Découvrir / scan

| | |
|---|---|
| **Fichier** | `08-profil-decouvrir.png` |
| **Écran** | Onglet **Découvrir** OU écran **Scan code-barres** |

### Option A — Découvrir

1. Onglet Découvrir avec la grille de fonctionnalités (Carte, Scan, Comparateur…)
2. Capture propre montrant la diversité des outils

### Option B — Scan (plus impactant)

1. Découvrir → **Scan code-barres**
2. Mode démo / résultat produit trouvé après scan
3. Capture du **résultat produit** (pas la caméra floue)

---

## Ordre d'upload recommandé (Play Console)

Google montre les captures **dans l'ordre** — mettez les plus vendeuses en premier :

1. `01-accueil-recherche.png` — accroche principale
2. `03-catalogue-pharmacie.png` — différenciateur « choisir sa pharmacie »
3. `02-recherche-pharmacie.png`
4. `04-carte-pharmacies.png`
5. `05-panier.png`
6. `06-commande-suivi.png`

Minimum Play Store : **2 captures**. Recommandé : **6–8**.

---

## Tablette (optionnel)

Si vous ciblez aussi tablettes, refaites **3–4 captures** en 1200×1920 ou 1600×2560 sur émulateur tablette 10". Non obligatoire pour la première publication.

---

## Checklist finale assets

- [ ] `play-store-feature-graphic-1024x500.png`
- [ ] `play-store-icon-512x512.png`
- [ ] Minimum 2 screenshots téléphone
- [ ] Idéalement 6 screenshots
- [ ] Aucune donnée personnelle réelle (masquez numéros si besoin)
- [ ] Textes en français, pas de placeholder « Lorem ipsum »

---

## Données de test suggérées

| Élément | Valeur |
|---------|--------|
| Recherche produit | Paracétamol, Ibuprofène |
| Recherche pharmacie | Nom partiel d'une officine partenaire |
| Ville | Abidjan |
| Paiement test | Espèces au retrait |

Une fois les PNG dans `store-assets/screenshots/`, uploadez-les dans **Play Console → Fiche Play Store → Captures d'écran téléphone**.
