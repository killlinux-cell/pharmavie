# PharmaVie — Déploiement SIMPLE sur pharmavie.space

## 🚀 UN SEUL CLIC (3 commandes)

Sur votre VPS en **root** :

```bash
cd /opt/pharmavie
git pull
nano deploy/simple/.env          # ← une seule fois : mettre votre CERTBOT_EMAIL
bash deploy/simple/deploy.sh
```

C'est tout. Le script fait **tout automatiquement** :
- Swap mémoire
- Docker (PostgreSQL + Redis)
- Node.js 20 + PM2 + Nginx + HTTPS
- npm install + build
- Base de données + comptes test
- Démarrage API + Web

### Première fois — avant de lancer le script

```bash
cd /opt/pharmavie
cp deploy/simple/.env.example deploy/simple/.env
nano deploy/simple/.env
```

Changez **uniquement** cette ligne :

```env
CERTBOT_EMAIL=votre@email.com
```

Les mots de passe (`POSTGRES_PASSWORD`, `JWT_SECRET`) sont **générés automatiquement** si vides.

### Import pharmacies Côte d'Ivoire (optionnel, 15-30 min)

```bash
bash deploy/simple/deploy.sh --full-data
```

### Redéployer après une mise à jour

```bash
cd /opt/pharmavie
git pull
bash deploy/simple/deploy.sh
```

---

> **Méthode recommandée** — sans build Docker API/Web (trop lourd sur VPS 2 Go).  
> Docker = PostgreSQL + Redis uniquement. API + Web = Node.js + PM2.

---

## URLs finales

| Service | URL |
|---------|-----|
| Web | https://pharmavie.space |
| Admin | https://pharmavie.space/admin/login |
| API | https://api.pharmavie.space/api/v1 |
| Health | https://api.pharmavie.space/api/v1/health |

---

## DÉJÀ BLOQUÉ AVEC L'ANCIEN DOCKER ?

```bash
cd /opt/pharmavie/deploy
docker compose -f docker-compose.prod.yml down 2>/dev/null || true
bash /opt/pharmavie/deploy/simple/deploy.sh
```

---

## Détail manuel (si le script échoue)

Voir les sections ci-dessous ou les logs :

```bash
cat /var/log/pharmavie-deploy.log
pm2 logs pharmavie-api
```

---

## Comptes test

| Rôle | Connexion web | URL |
|------|---------------|-----|
| Admin | `admin@pharmavie.space` / `PharmaVie2026!` | https://pharmavie.space/admin/login |
| Pharmacien | `pharmacie-plateau` / `PharmaVie2026!` | https://pharmavie.space/login |
| Client mobile | OTP `+2250700000003` | App mobile |

Détails : **[COMPTES_WEB.md](./COMPTES_WEB.md)**

## Vrais numéros de téléphone (SMS OTP via Twilio)

Guide complet : **[CONFIGURATION_TWILIO.md](./CONFIGURATION_TWILIO.md)**

### Résumé rapide — ce qu'il faut mettre sur le VPS

Éditez `/opt/pharmavie/apps/api/.env` :

```env
NODE_ENV=production
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC...          # Console Twilio → Account SID
TWILIO_AUTH_TOKEN=...             # Console Twilio → Auth Token
TWILIO_PHONE_NUMBER=+1...           # Votre numéro Twilio acheté
```

Puis :

```bash
cd /opt/pharmavie && git pull && npm run build -w @pharmavie/api && pm2 restart pharmavie-api
```

### Console Twilio — 3 actions obligatoires

1. **Geo permissions** → activer **Côte d'Ivoire** (Messaging → Settings)
2. **Acheter un numéro** SMS (Phone Numbers → Buy)
3. **Compte Trial** → vérifier vos numéros test (Verified Caller IDs)

### Rôles utilisateurs

| Rôle | Comment |
|------|---------|
| **Client** | Automatique à la 1ère connexion OTP |
| **Pharmacien / Admin** | Créé manuellement par l'admin |

## Mobile

```bash
flutter build apk --dart-define=API_URL=https://api.pharmavie.space/api/v1
```

## Dépannage rapide

| Problème | Commande |
|----------|----------|
| API ne répond pas / Connection refused | `bash deploy/simple/doctor.sh` puis `bash deploy/simple/fix-and-start.sh` |
| Voir erreur API | `pm2 logs pharmavie-api --lines 50` |
| Script échoue | `cat /var/log/pharmavie-deploy.log` |
| Redémarrer tout | `bash deploy/simple/fix-and-start.sh` |
| DB down | `cd deploy/simple && docker compose -f docker-compose.db.yml up -d` |
| DNS pas prêt | Attendre propagation, revérifier `nslookup pharmavie.space` |

## Prérequis DNS (à faire une fois chez votre registrar)

| Type | Nom | Valeur |
|------|-----|--------|
| A | `@` | IP du VPS |
| A | `api` | IP du VPS |

---
