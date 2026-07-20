# Publication Google Play Store — PharmaVie

Guide pas à pas pour publier l'application Android **PharmaVie**.

| Info app | Valeur |
|----------|--------|
| **Nom affiché** | PharmaVie |
| **Package ID** | `com.pharmavie.uborasoftware` |
| **Version** | 1.0.0 (build 1) |
| **API prod** | https://api.pharmavie.space/api/v1 |
| **Politique confidentialité** | https://pharmavie.space/confidentialite |

---

## Étape 1 — Compte développeur Google Play

1. Allez sur [Google Play Console](https://play.google.com/console)
2. Créez un compte **Organisation** ou **Personnel** (recommandé : Organisation si vous avez une structure)
3. Payez les **25 USD** (frais unique)
4. Vérifiez votre identité (pièce d'identité, parfois délai 24–48 h)

---

## Étape 2 — Créer la clé de signature (IMPORTANT)

**À faire une seule fois. Sauvegardez le fichier `.jks` en lieu sûr (cloud chiffré + clé USB).**

Ouvrez un terminal dans `apps/mobile/android` :

**Windows** — `keytool` n'est pas dans le PATH par défaut. Utilisez le JDK d'Android Studio :

```powershell
cd d:\pharmavie\apps\mobile\android

# Option A — script assisté (recommandé)
powershell -ExecutionPolicy Bypass -File .\generate-keystore.ps1

# Option B — commande directe
& "C:\Program Files\Android\Android Studio2\jbr\bin\keytool.exe" -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

> Si Android Studio est ailleurs, cherchez : `...\Android Studio\jbr\bin\keytool.exe`  
> Vérifier avec : `flutter doctor -v` → ligne **Java binary at**

**macOS / Linux :**
```bash
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Répondez aux questions (nom, organisation : PharmaVie, pays : CI).

Créez `apps/mobile/android/key.properties` :

```properties
storePassword=VOTRE_MOT_DE_PASSE
keyPassword=VOTRE_MOT_DE_PASSE
keyAlias=upload
storeFile=upload-keystore.jks
```

> ⚠️ Ne commitez **jamais** `key.properties` ni `upload-keystore.jks` (déjà dans `.gitignore`).

---

## Étape 3 — Générer le fichier AAB (Android App Bundle)

```bash
cd apps/mobile
flutter pub get
dart run flutter_launcher_icons
flutter build appbundle --release
```

Fichier produit :
```
apps/mobile/build/app/outputs/bundle/release/app-release.aab
```

Test local avant upload (optionnel) :
```bash
flutter build apk --release
# Installez build/app/outputs/flutter-apk/app-release.apk sur un téléphone
```

---

## Étape 4 — Créer l'application dans Play Console

1. **Créer une application** → Nom : **PharmaVie**
2. **Par défaut** : Gratuit
3. **Catégorie** : Santé et remise en forme (ou Médical — selon validation Google)
4. Déclarez si l'app contient des publicités : **Non** (sauf si vous en ajoutez)

---

## Étape 5 — Fiche Play Store (textes prêts à coller)

### Titre (30 car. max)
```
PharmaVie — Pharmacie CI
```

### Description courte (80 car.)
```
Trouvez vos médicaments, pharmacies de garde et commandez en ligne en Côte d'Ivoire.
```

### Description longue
```
PharmaVie connecte les Ivoiriens aux pharmacies de proximité.

🔍 RECHERCHE
• Trouvez un médicament par nom ou DCI
• Comparez les prix entre pharmacies
• Scan code-barres sur la boîte

🏥 PHARMACIES
• Carte interactive avec pharmacies proches
• Filtre pharmacies de garde (UNPPCI)
• Recherche par nom de pharmacie
• Commandez chez LA pharmacie de votre choix

📦 COMMANDE
• Panier multi-produits
• Retrait en pharmacie ou livraison
• Suivi de commande en temps réel
• Ordonnance photo pour médicaments sur prescription

🤖 ASSISTANT SANTÉ
• Orientation et conseils généraux
• Annuaire de spécialistes
• L'IA informe — consultez un professionnel pour tout diagnostic

🇨🇮 100 % Côte d'Ivoire
• Prix en FCFA
• Numéros +225
• Mobile Money (selon disponibilité)

Téléchargez PharmaVie et simplifiez l'accès à vos médicaments !
```

### Graphiques requis

| Asset | Taille | Fichier source |
|-------|--------|----------------|
| Icône | 512×512 PNG | `apps/mobile/store-assets/play-store-icon-512x512.png` |
| Feature graphic | 1024×500 PNG | `apps/mobile/store-assets/play-store-feature-graphic-1024x500.png` |
| Captures téléphone | Min. 2, max 8 | Voir `apps/mobile/store-assets/CAPTURES_ECRAN.md` |

---

## Étape 6 — Formulaires obligatoires Play Console

### Politique de confidentialité
URL : **https://pharmavie.space/confidentialite**

(Déployez le site web avant de soumettre.)

### Sécurité des données (Data safety)

Déclarez approximativement :

| Donnée | Collectée | Partagée | Obligatoire |
|--------|-----------|----------|-------------|
| Téléphone | Oui | Non (sauf OTP provider) | Oui (compte) |
| Localisation approx./précise | Oui | Non | Non (optionnelle) |
| Photos (ordonnances) | Oui | Oui (pharmacie) | Non |
| Historique commandes | Oui | Oui (pharmacie) | Oui |

Finalités : fonctionnement de l'app, authentification, livraison.

Chiffrement en transit : **Oui** (HTTPS).

### Classification du contenu
Questionnaire IARC (~5 min) → résultat affiché sur la fiche store.

### Public cible
- **18+** recommandé si commandes médicaments / ordonnances
- Ou 13+ avec justification santé (Google peut demander des précisions)

### Permissions sensibles (déclaration)

| Permission | Justification Play Console |
|------------|---------------------------|
| CAMERA | Scan code-barres médicaments |
| LOCATION | Pharmacies proches et distance |
| READ_MEDIA_IMAGES | Upload ordonnance |

---

## Étape 7 — Signature Play App Signing

1. Lors du **premier upload** de l'AAB, Google propose **Play App Signing**
2. Choisissez **Oui** (recommandé)
3. Google conserve la clé de production ; vous gardez la clé upload (`upload-keystore.jks`)

---

## Étape 8 — Déploiement progressif

1. **Test interne** : ajoutez vos emails Gmail (équipe, 5 pharmacies pilotes)
2. **Test fermé** : 20–100 testeurs via lien
3. **Production** : après 3–7 jours sans bug critique

Première soumission : revue Google **1 à 7 jours** (parfois plus pour apps santé).

---

## Étape 9 — Checklist avant « Soumettre »

- [ ] AAB signé avec `upload-keystore.jks` (pas debug)
- [ ] `key.properties` configuré
- [ ] Site https://pharmavie.space/confidentialite en ligne
- [ ] API prod stable (OTP Twilio, commandes)
- [ ] Icône 512×512 uploadée
- [ ] 2+ captures d'écran
- [ ] Data safety rempli
- [ ] Classification contenu faite
- [ ] Email contact@pharmavie.space valide (ou le vôtre)
- [ ] Test complet : inscription OTP → commande → dashboard pharmacie

---

## Commandes récap

```bash
# 1. Icônes
cd apps/mobile && dart run flutter_launcher_icons

# 2. Bundle Play Store
flutter build appbundle --release

# 3. Déployer page confidentialité (VPS)
cd /opt/pharmavie && git pull && npm run build -w @pharmavie/web && pm2 restart pharmavie-web
```

---

## Problèmes fréquents

| Erreur | Solution |
|--------|----------|
| Upload rejected — debug signature | Créez `key.properties` + keystore release |
| Politique confidentialité manquante | Déployez `/confidentialite` |
| Permission CAMERA non justifiée | Remplir le formulaire « Permissions sensibles » |
| App santé — examen renforcé | Joindre description claire : marketplace pharmacie, pas télémédecine |
| Version code déjà utilisée | Incrémentez dans `pubspec.yaml` : `1.0.1+2` |

---

## Contact support Google
[Play Console Help](https://support.google.com/googleplay/android-developer)
