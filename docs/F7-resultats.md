# F7 — Espace vendeur

## Fonctionnalités ajoutées

- Page `/sell` pour déposer une candidature vendeur, se connecter et consulter son statut.
- Route authentifiée `GET /vendors` limitée au vendeur connecté, y compris avant activation.
- Un vendeur actif peut créer une fiche produit avec un prix USD et un stock initial, consulter ses produits/variantes, ajuster son stock et lire ses commandes.
- Un vendeur en attente voit son statut et attend l'approbation plateforme. Un vendeur suspendu peut lire ses commandes, mais ne peut pas modifier les fiches ni le stock.
- Jeton vendeur gardé dans un cookie HTTP-only; chaque appel transmet explicitement son jeton. Les règles serveur existantes restent la barrière d'autorisation.
- Le pied de page mène au portail vendeur. Paiement et expédition demeurent simulés.

## Vérifications

- `backend`: `npx tsc --noEmit` réussi.
- `storefront`: `npm run typecheck` réussi.
- `storefront`: `npx next build --webpack` réussi après une première erreur temporaire `EPERM` à la création d'un dossier `.next`.
- Tests ajoutés : statut vendeur actif/en attente, formulaires d'entrée, accès aux pages et contrôle d'accessibilité.
- Les tests d'intégration et Playwright restent à exécuter sur l'installation locale complète; voir les blocages SWC et Chromium consignés dans `F6-resultats.md`.

## Limites de cette version

- Les vendeurs peuvent créer des fiches et gérer le stock, mais pas modifier ou supprimer une fiche déjà créée.
- Les commandes sont consultables; le traitement d'expédition réel n'existe pas dans le prototype.
