# Configuration Twilio — SMS OTP PharmaVie

Guide complet pour envoyer les codes OTP aux **vrais numéros ivoiriens** (+225).

---

## PARTIE 1 — Console Twilio (twilio.com)

### 1.1 — Récupérer Account SID et Auth Token

1. Connectez-vous sur [https://console.twilio.com](https://console.twilio.com)
2. Page d'accueil **Account Info** :
   - **Account SID** → commence par `AC...`
   - **Auth Token** → cliquez « Show » pour le voir

Notez-les (vous en aurez besoin pour le VPS).

---

### 1.2 — Acheter un numéro Twilio (expéditeur SMS)

1. Menu **Phone Numbers** → **Manage** → **Buy a number**
2. Pays : choisissez un pays où Twilio vend des numéros SMS (USA, UK, etc.)
   - Twilio n'a pas toujours de numéros locaux CI, un numéro **US/UK** fonctionne pour envoyer **vers** la Côte d'Ivoire
3. Cochez **SMS** capability
4. Achetez le numéro (~1 $/mois)

Notez le numéro au format **E.164** : ex. `+12025551234`

> **Compte Trial (gratuit)** : vous avez un numéro trial. Les SMS ne partent **que vers les numéros vérifiés** (étape 1.4).

---

### 1.3 — Activer la Côte d'Ivoire (OBLIGATOIRE)

Sans cette étape, les SMS vers +225 **échouent**.

1. Menu **Messaging** → **Settings** → **Geo permissions**
2. Section **SMS Geographic Permissions**
3. Cherchez **Côte d'Ivoire (CI)** ou **Ivory Coast**
4. **Activez** l'envoi vers la Côte d'Ivoire
5. Sauvegardez

---

### 1.4 — Compte Trial : vérifier vos numéros de test

Si vous êtes encore en **Trial** (pas payé) :

1. Menu **Phone Numbers** → **Manage** → **Verified Caller IDs**
2. **Add a new Caller ID**
3. Ajoutez votre numéro ivoirien : `+22507XXXXXXXX`
4. Twilio vous envoie un code de vérification par SMS/appel
5. Répétez pour chaque numéro de test

> En Trial, **seuls les numéros vérifiés** reçoivent l'OTP.  
> Pour **tous les utilisateurs** : passez en compte **payant** (Upgrade) sur Twilio.

---

### 1.5 — (Optionnel) Messaging Service

Alternative au numéro fixe — utile en production :

1. **Messaging** → **Services** → **Create Messaging Service**
2. Nom : `PharmaVie OTP`
3. Ajoutez votre numéro Twilio au service
4. Notez le **Messaging Service SID** → commence par `MG...`

---

## PARTIE 2 — VPS (fichier .env)

### 2.1 — Éditer la config API

```bash
nano /opt/pharmavie/apps/api/.env
```

### 2.2 — Ajouter / modifier ces lignes

```env
NODE_ENV=production

# Twilio SMS OTP
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=votre_auth_token_ici
TWILIO_PHONE_NUMBER=+12025551234
```

Remplacez par **vos vraies valeurs** Twilio.

**Si vous utilisez un Messaging Service** (au lieu du numéro) :

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=votre_auth_token_ici
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# TWILIO_PHONE_NUMBER=   ← laissez vide si vous utilisez MG...
```

### 2.3 — Mettre à jour deploy/simple/.env (optionnel)

Pour que `deploy.sh` regénère le bon `.env` :

```bash
nano /opt/pharmavie/deploy/simple/.env
```

```env
NODE_ENV=production
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

---

## PARTIE 3 — Déployer le code + redémarrer

### Sur votre PC (commit + push)

```powershell
cd d:\pharmavie
git add .
git commit -m "feat: SMS OTP via Twilio"
git push
```

### Sur le VPS

```bash
cd /opt/pharmavie
git pull
npm run build -w @pharmavie/api
pm2 restart pharmavie-api
pm2 logs pharmavie-api --lines 20
```

---

## PARTIE 4 — Tester

### 4.1 — Test API direct

```bash
curl -X POST https://api.pharmavie.space/api/v1/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"phone":"+22507XXXXXXXX"}'
```

Remplacez par **votre numéro** (vérifié si compte Trial).

Réponse attendue :

```json
{"success":true,"message":"Code OTP envoyé par SMS",...}
```

### 4.2 — Test app mobile

1. APK buildé avec `https://api.pharmavie.space/api/v1`
2. Profil → Se connecter
3. Numéro `+22507XXXXXXXX`
4. Recevoir le SMS → saisir le code

### 4.3 — Vérifier les logs Twilio

Console Twilio → **Monitor** → **Logs** → **Messaging**  
Vous voyez chaque SMS : statut `delivered`, `failed`, etc.

---

## Récap — ce que vous devez mettre

| Où | Variable | Exemple | Où le trouver |
|----|----------|---------|---------------|
| Twilio | Account SID | `ACa1b2c3...` | Console → Account Info |
| Twilio | Auth Token | `abc123...` | Console → Account Info → Show |
| Twilio | Phone Number | `+12025551234` | Phone Numbers → votre numéro |
| Twilio | (optionnel) Messaging Service SID | `MG...` | Messaging → Services |
| VPS | `SMS_PROVIDER` | `twilio` | — |
| VPS | `NODE_ENV` | `production` | — |
| Twilio Console | Geo permission CI | Activé | Messaging → Geo permissions |
| Twilio Console | Verified numbers | Votre +225 | Trial uniquement |

---

## Dépannage

| Problème | Cause | Solution |
|----------|-------|----------|
| SMS non reçu (Trial) | Numéro non vérifié | Verified Caller IDs sur Twilio |
| Error 21408 | CI non autorisé | Geo permissions → activer Côte d'Ivoire |
| Error 21211 | Numéro invalide | Format `+22507XXXXXXXX` |
| Error 21608 | Numéro non vérifié (Trial) | Vérifier le numéro dans Twilio |
| 401 Unauthorized | Mauvais SID/Token | Revérifier `.env` |
| OTP dans logs mais pas SMS | `NODE_ENV=development` | Passer en `production` + Twilio configuré |
| Compte Trial limité | Trial | Upgrade compte Twilio (~20 $ de crédit offert) |

---

## Coûts Twilio (indicatif)

| Poste | Prix approx. |
|-------|--------------|
| Numéro US | ~1 $/mois |
| SMS vers CI (+225) | ~0,04–0,08 $/SMS |
| Compte payant | Crédit minimum ~20 $ |

Surveillez la consommation : **Console → Billing → Usage**.

---

## Sécurité

- **Ne commitez jamais** `TWILIO_AUTH_TOKEN` sur GitHub
- Gardez-le uniquement dans `apps/api/.env` sur le VPS
- Régénérez le Auth Token si exposé : Twilio Console → Account → Auth Token → Rotate

---

**C'est tout.** Une fois configuré, tout nouvel utilisateur avec un numéro `+225` reçoit son OTP par SMS et son compte client est créé automatiquement.
