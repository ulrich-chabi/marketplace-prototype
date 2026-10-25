# F3 — Passage en caisse et commande simulée

## Ce qui est en place

- Le panier affiche une estimation avant paiement : sous-total, livraison à 5 USD par vendeur, taxe fictive à 1 % et total estimé.
- La page de commande recueille les coordonnées et une adresse américaine de démonstration. Le site rappelle d'utiliser uniquement des données fictives.
- Le backend calcule le nombre de vendeurs depuis les liens réels entre les produits et les vendeurs. Le navigateur ne choisit ni le prix ni le nombre de colis facturés.
- Le backend configure la taxe fictive de 1 %, y compris lorsque le catalogue a déjà été créé.
- Le paiement passe par le fournisseur Medusa `pp_system_default`, sans transaction réelle. La commande suit ensuite le workflow multi-vendeur existant.
- Une page de confirmation affiche la référence de commande et le total renvoyé par le backend. Le cookie panier est supprimé après la commande.
- Le test Playwright du parcours de commande a été ajouté; le test d'intégration Medusa vérifie le nombre de vendeurs renvoyé par le backend.

## Vérifications effectuées

- `storefront`: vérification TypeScript réussie.
- `storefront`: compilation de production avec webpack réussie.
- `backend`: vérification TypeScript réussie.
- `git diff --check`: réussi.
- Le test Playwright n'a pas démarré car Chromium n'est pas installé dans cet environnement.
- Le test d'intégration backend n'a pas démarré : le chargement natif de SWC a échoué avant l'exécution des tests. Aucun test n'a donc été compté comme réussi pour ces deux suites.

## Limites

- Toutes les coordonnées saisies sont fictives et utilisées uniquement dans l'environnement de démonstration.
- La livraison, les taxes et le paiement restent simulés. L'adresse est limitée aux États-Unis et le paiement n'est jamais capturé.
- Le total affiché avant commande est une estimation; le total de confirmation vient de Medusa.
- Le test complet doit encore être exécuté sur la machine locale après le démarrage de PostgreSQL et l'installation du navigateur Playwright.
