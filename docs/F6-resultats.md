# F6 — Demandes de retour

## Fonctionnalités ajoutées

- Une personne qui détient le code privé d'une commande peut demander le retour d'une ligne et choisir une quantité et un motif prédéfini.
- L'API vérifie la commande, le code d'accès, l'appartenance de la ligne, la fenêtre de retour fictive propre au vendeur et les demandes encore actives pour cette ligne.
- Les demandes sont conservées dans le module marketplace, consultables par la plateforme et décidables une seule fois (approved/rejected).
- La décision plateforme est inscrite dans le journal d'audit. Les notes sont limitées à des codes prédéfinis.
- Le suivi de commande montre l'état de la demande. L'expédition et les remboursements restent simulés; approuver une demande ne déclenche pas automatiquement de remboursement.
- La page d'information sur les retours décrit le fonctionnement du prototype.

## Vérifications

- `backend`: `npx tsc --noEmit` réussi.
- `storefront`: `npm run typecheck` réussi.
- `storefront`: `npx next build --webpack` réussi.
- Tests ajoutés : demande admissible, code invalide, quantité déjà demandée, décision plateforme et parcours client.
- Migration F6 appliquée sur la base PostgreSQL locale.
- La suite HTTP complète passe : 6 suites, 49 tests réussis, dont 20 scénarios marketplace/retours.
- La suite Playwright complète passe : 19 tests réussis, y compris la création de commande et la demande de retour.
- Un conflit avec la route de retour native Medusa a été corrigé en déplaçant l'API marketplace vers `/store/marketplace-returns`.

## À rejouer sur le poste

Le script racine `scripts/verify-prototype.ps1` rejoue migrations, tests backend, typecheck et build. Pour Playwright, démarrer l'API et le storefront, puis lancer `npm run test:e2e` depuis `storefront`.
