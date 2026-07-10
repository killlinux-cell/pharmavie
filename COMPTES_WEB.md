# Comptes web — Admin & Pharmacies

Connexion par **email ou pseudo + mot de passe** (plus besoin d'OTP Twilio pour le web).

L'**app mobile client** continue d'utiliser **OTP SMS** (Twilio).

---

## Comptes par défaut (après seed)

Mot de passe commun initial : **`PharmaVie2026!`**

| Rôle | Email | Pseudo | URL |
|------|-------|--------|-----|
| **Admin** | admin@pharmavie.space | `admin` | https://pharmavie.space/admin/login |
| **Pharmacie Plateau** | plateau@pharmavie.space | `pharmacie-plateau` | https://pharmavie.space/login |
| **Pharmacie Cocody** | cocody@pharmavie.space | `pharmacie-cocody` | https://pharmavie.space/login |
| **Pharmacie Marcory** | marcory@pharmavie.space | `pharmacie-marcory` | https://pharmavie.space/login |

> Changez ce mot de passe en production dès la première connexion (via admin ou base de données).

---

## Mettre à jour sur le VPS (après git pull)

```bash
cd /opt/pharmavie
git pull
npm run db:push -w @pharmavie/api
npm run db:seed -w @pharmavie/api
npm run build -w @pharmavie/api
npm run build -w @pharmavie/web
pm2 restart all
```

Le seed **met à jour** les emails, pseudos et mots de passe des comptes existants.

---

## Nouvelle pharmacie — créer un compte

Pour l'instant, l'admin crée le compte via la base ou en étendant le seed.  
Processus manuel SQL (exemple) :

```bash
docker exec -it pharmavie-postgres psql -U pharmavie -d pharmavie
```

Ou demandez à l'admin d'ajouter via le portail utilisateurs (rôle PHARMACIST + affectation pharmacie), puis définir email/username/password en base.

**Prochaine évolution** : formulaire admin « Créer compte pharmacien » avec mot de passe.

---

## API endpoints

| Endpoint | Usage |
|----------|-------|
| `POST /auth/login/admin` | Portail admin |
| `POST /auth/login/staff` | Dashboard pharmacie |
| `POST /auth/otp/send` | App mobile client |
| `POST /auth/otp/verify` | App mobile client |

Body login :

```json
{
  "login": "admin@pharmavie.space",
  "password": "PharmaVie2026!"
}
```

`login` accepte **email** ou **pseudo** (insensible à la casse).

---

## Sécurité

- Ne partagez pas `PharmaVie2026!` publiquement — changez-le après mise en ligne
- Les comptes **CLIENT** n'ont pas de mot de passe → connexion mobile OTP uniquement
- Un client OTP ne peut pas se connecter au web staff
