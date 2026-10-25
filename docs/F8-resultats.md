# F8 — Opérations plateforme

## Fonctionnalités ajoutées

- Page `/platform` protégée par connexion administrateur et session HTTP-only courte (8 h).
- Liste des vendeurs avec actions conformes aux transitions autorisées : activer, suspendre, réactiver.
- File des retours en attente avec approbation ou refus par motif prédéfini; les décisions sont auditées.
- Vue des commandes vendeur avec paiement simulé, montant remboursé et solde restant. L'administrateur peut capturer le paiement démo puis effectuer un remboursement plafonné pour une commande vendeur.
- Activité récente du journal d'audit et lien vers l'administration Medusa.
- Les routes de lecture `/admin/vendors` et `/admin/vendor-orders` restent réservées à la plateforme; la liste des remboursements est agrégée par commande vendeur.
- README complété avec les adresses locales du compte client, du portail vendeur et des opérations plateforme.

## Vérifications

- Tests ajoutés pour vérifier que l'accès vendeur n'ouvre pas l'administration et que la plateforme consulte ses vues dédiées.
- `backend`: `npx tsc --noEmit` réussi.
- `storefront`: `npm run typecheck` réussi et `npx next build --webpack` réussi.
- `npx playwright test --list` reconnaît les 17 tests du projet.
- Le test navigateur plateforme échoue avant le lancement du test car le binaire Chromium manque. Le téléchargement Chromium échoue sur la résolution DNS `cdn.playwright.dev`.
- La suite d'intégration ciblée échoue avant le chargement des tests à cause du module natif SWC absent (`@swc/core`).
