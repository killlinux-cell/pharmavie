# Assets Google Play Store — PharmaVie

Dossier des visuels prêts pour la Play Console.

| Fichier | Dimensions | Usage Play Console |
|---------|------------|-------------------|
| `play-store-feature-graphic-1024x500.png` | 1024 × 500 | **Feature graphic** (bannière fiche store) |
| `play-store-icon-512x512.png` | 512 × 512 | **Icône haute résolution** |
| `screenshots/` | 1080 × 1920 (recommandé) | Captures téléphone (à remplir par vous) |

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
