# Assets Google Play Store — PharmaVie

Dossier des visuels prêts pour la Play Console.

| Fichier | Dimensions | Usage Play Console |
|---------|------------|-------------------|
| `play-store-feature-graphic-1024x500.png` | 1024 × 500 | **Feature graphic** (bannière fiche store) |
| `play-store-icon-512x512.png` | 512 × 512 | **Icône haute résolution** |
| `screenshots/` | 1080 × 1920 | **6 captures prêtes** (mockups marketing — voir note ci-dessous) |
| `screenshots-real/` | 1080 × 1920 | Captures app réelle (script `scripts/capture-play-store-screenshots.ps1`) |

## Captures dans `screenshots/`

**6 fichiers PNG** sont déjà présents pour uploader sur Play Console :

1. `01-accueil-recherche.png`
2. `02-recherche-pharmacie.png`
3. `03-catalogue-pharmacie.png`
4. `04-carte-pharmacies.png`
5. `05-panier.png`
6. `06-commande-suivi.png`

> **Note :** ce sont des **visuels marketing** générés (style PharmaVie). Google préfère des **vraies captures** de l'app. Pour les remplacer :
> ```powershell
> cd apps/mobile
> powershell -ExecutionPolicy Bypass -File .\scripts\capture-play-store-screenshots.ps1
> ```
> Puis copiez `screenshots-real/*.png` vers `screenshots/`.

## Import dans Play Console

1. **Play Console** → Votre app → **Fiche Play Store** → **Assets principaux**
2. **Feature graphic** → uploadez `play-store-feature-graphic-1024x500.png`
3. **Icône** → uploadez `play-store-icon-512x512.png`
4. **Captures d'écran téléphone** → uploadez les PNG du dossier `screenshots/` (voir `CAPTURES_ECRAN.md`)

## Regénérer la bannière

La source IA est dans `.cursor/projects/.../assets/play-store-feature-graphic-source.png`.  
Recadrez avec :

```bash
python scripts/resize-play-store-assets.py
```

(Si le script existe — sinon refaire le crop 1024×500 depuis la source.)
