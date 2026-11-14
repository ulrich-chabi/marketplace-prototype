# Prototype de marketplace multi-vendeurs

Backend Medusa (TypeScript) + PostgreSQL, et site Next.js (`storefront`).
Données de démonstration fictives. Le paiement est simulé par défaut; Stripe peut être activé avec un compte et des clés valides. Livraison, commissions et versements restent simulés.

## Structure

```
marketplace-prototype/
├─ README.md
├─ .gitignore
├─ docs/                  Registre des décisions et comptes rendus
├─ storefront/            Site Next.js (Canada, anglais, CAD), port 8000
│  ├─ .env.local.example  Modèle de configuration (copier en .env.local)
│  └─ src/                Pages, composants, accès au backend
└─ backend/               Backend Medusa (port 9000)
   ├─ .env.template       Modèle de configuration (copier en .env)
   ├─ medusa-config.ts    Configuration pilotée par variables d'environnement
   ├─ package.json
   ├─ src/                Code du projet (modules, API, workflows…)
   └─ integration-tests/  Tests d'intégration
```

## Prérequis (Windows)

- Node.js 22.22+ requis par Medusa (version testée : 22.22.2) — https://nodejs.org
- PostgreSQL 16 ou plus récent (version testée : 16) — https://www.postgresql.org/download/windows/
- Git

## Installation

La configuration des courriels transactionnels de commande est décrite dans [docs/notifications.md](docs/notifications.md). Le checkout de production reste indisponible jusqu'à la configuration vérifiée du paiement Stripe, d'un fournisseur fiscal canadien et des courriels transactionnels.
Le paiement Stripe et le composant sécurisé sont décrits dans [docs/payments-stripe.md](docs/payments-stripe.md). Utilisez uniquement les clés Stripe de test pendant la mise au point; l'autorisation n'est capturée qu'après validation de la commande par la plateforme.

Dans le terminal de VS Code (PowerShell), depuis le dossier du projet :

```powershell
# 1. Créer la base (adapter le chemin et la version de PostgreSQL)
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE marketplace;"

# 2. Configurer
cd backend
copy .env.template .env
# Ouvrir backend\.env et remplacer VOTRE_MOT_DE_PASSE dans DATABASE_URL

# 3. Installer et migrer
npm install
npx medusa db:migrate

# 4. Créer un administrateur (choisir email et mot de passe)
npx medusa user -e votre@email.test -p VotreMotDePasse

# 5. Lancer
npm run dev
```

Vérifications : http://localhost:9000/health (doit répondre 200) puis http://localhost:9000/app (administration).

## Initialisation de la boutique canadienne

Après les migrations, cette commande configure une boutique vide en CAD limitée au Canada et crée une clé publique. Elle n'ajoute aucun produit, vendeur, taxe, paiement ni tarif de livraison :

```powershell
cd backend
npm run seed
```

Copier la clé publique affichée dans `storefront/.env.local` sous `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`. Une base neuve ne contient pas encore de rayon ni de produit; ils doivent venir de vraies données approuvées avant la mise en vente.

Ensuite, deux terminaux :

```powershell
# Terminal 1 : backend
cd backend
npm run dev

# Terminal 2 : site
cd storefront
copy .env.local.example .env.local
npm install
npm run dev
```

Ouvrir http://localhost:8000. Vérifications : `npm run typecheck` puis `npm run build` dans `storefront`.

Espaces du prototype :

- Client : `http://localhost:8000/account` (compte et suivi de commande).
- Vendeur : `http://localhost:8000/sell` (candidature, produits, stock et commandes).
- Opérations plateforme : `http://localhost:8000/platform` (connexion avec le compte créé par `npx medusa user`).
- Administration Medusa : `http://localhost:9000/app`.

### Catalogue fictif pour la démonstration

Le catalogue comprend 20 rayons et jusqu'à 240 types de produits prévus. Il contient actuellement 153 fiches illustrées; chaque fiche a une photo, un crédit et une licence propres. Les vendeurs, marques, modèles, prix et stocks restent fictifs.

Pour rechercher d'autres photos correctement assorties et sous licence réutilisable, lancer depuis `backend`, puis télécharger les nouveaux fichiers depuis la racine du dépôt :

```powershell
npx ts-node --project tsconfig.json src/scripts/expand-demo-images.ts
cd ..
node scripts/download-demo-images.cjs
```

Le catalogue de démonstration est limité aux photos disponibles pour chaque rayon. Pour le remplir, lancer depuis `backend` :

```powershell
npm run seed:demo
```

Le catalogue, les prix, stocks, vendeurs, frais de livraison et la taxe affichée sont des données simulées : ne pas utiliser cette commande sur une boutique ou une base contenant des données réelles. Les photos produit sont recadrées en 800 × 600 WebP; la source, l’auteur et la licence de chaque photo sont indiqués sur `/image-credits`. `npm run seed` continue de configurer une boutique canadienne vide.

Le seed démo configure des estimations provinciales générales pour des biens courants dans les 13 provinces et territoires canadiens. Elles suivent les taux généraux publiés, mais ne couvrent pas les exemptions par produit, le statut d'inscription des vendeurs, les cas particuliers de lieu de fourniture ou les remises fiscales. Elles ne doivent pas servir à encaisser de vraies commandes. Avant tout déploiement, configurez un fournisseur fiscal qualifié et faites confirmer les obligations applicables. Le checkout de production reste désactivé tant que Stripe, la taxe et les courriels de commande ne sont pas configurés. Références : [ARC](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses/charge-collect-which-rate/calculator.html), [Revenu Québec](https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/basic-rules-for-applying-the-gsthst-and-qst/tables-of-gst-and-qst-rates/), [Saskatchewan](https://www.saskatchewan.ca/Business/Taxes-Licensing-and-Reporting/Provincial-Taxes-Policies-and-Bulletins/Provincial-Sales-Tax), [Manitoba](https://www.gov.mb.ca/finance/taxation/taxes/retail.html), [Colombie-Britannique](https://www2.gov.bc.ca/gov/content/taxes/sales-taxes/pst/publications/small-business-guide).

### Tests de bout en bout du site

Les parcours de catalogue et d'achat Playwright ont besoin d'un jeu de données de test isolé. Crée une base réservée aux tests, dirige temporairement `DATABASE_URL` vers celle-ci, puis lance `npm run seed:test` depuis `backend`. Cette commande crée des produits fictifs uniquement pour les tests; ne l'exécute jamais sur la base de la boutique.

```powershell
cd storefront
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path (Get-Location) ".playwright-browsers"
npx playwright install chromium    # une seule fois (téléchargement d'environ 150 Mo)
npm run test:e2e
```

Le navigateur Chromium Playwright doit être installé une fois. Les tests de catalogue et de commande ne sont pas exécutables sur la base canadienne vierge, qui ne contient volontairement aucune annonce.

Pour exécuter les tests navigateur contre un **build local de production** sans clé Stripe, lancer le storefront de test avec `$env:DEMO_CHECKOUT_ENABLED='true'`. Cette option réactive uniquement le paiement fictif utilisé par Playwright; ne jamais la définir sur le déploiement public. En développement (`npm run dev`), les commandes simulées sont déjà disponibles.

## Tests

Après avoir configuré les deux fichiers `.env`, installé Chromium et lancé PostgreSQL, le backend et le storefront, la vérification complète se lance depuis la racine du dépôt :

```powershell
.\scripts\verify-prototype.ps1
```

Le script applique les migrations, utilise `DATABASE_URL` de `backend/.env` pour préparer les tests sans afficher le mot de passe, puis lance intégration, build backend, typecheck, build storefront et navigateur. `-SkipIntegration` et `-SkipBrowser` permettent de lancer les contrôles disponibles lorsqu'une dépendance locale manque.

```powershell
cd backend
$env:DB_HOST="localhost"; $env:DB_USERNAME="postgres"; $env:DB_PASSWORD="VOTRE_MOT_DE_PASSE"
npm run test:integration:http
```

## Production / hébergeur

- Compiler : `npm run build` ; la version à déployer est dans `backend/.medusa/server`
  (y lancer `npm install --omit=dev`, puis `npx medusa start`).
- Variables obligatoires en production : `DATABASE_URL`, `STORE_CORS`, `ADMIN_CORS`,
  `AUTH_CORS`, `JWT_SECRET`, `COOKIE_SECRET`. Le démarrage échoue si l'une manque.
- Optionnelles : `DATABASE_SSL=true`, `REDIS_URL`, `MEDUSA_WORKER_MODE`,
  `MEDUSA_BACKEND_URL`, `DISABLE_MEDUSA_ADMIN`, `PASSWORD_MIN_LENGTH` (4), `LOGIN_MAX_FAILURES` (5),
  `LOGIN_LOCK_MINUTES` (15), `PERSONAL_DATA_RETENTION_DAYS` (90).
- Fichiers téléversés : le dossier local `uploads/` est éphémère chez la plupart des hébergeurs.
  Prévoir un stockage compatible S3 avant d'accepter des images envoyées par des vendeurs.

## Git

```powershell
git init
git add .
git commit -m "Fondation : backend Medusa"
# Créer un dépôt PRIVÉ sur GitHub, puis :
git remote add origin https://github.com/VOTRE_COMPTE/VOTRE_DEPOT.git
git branch -M main
git push -u origin main
```
