# F2 — Fiche produit complète, panier, comparateur, tests du site

## Ce qui est en place

- **Fiche produit** : image de substitution, caractéristiques, tableau des offres de tous les vendeurs (vendeur, état, prix et livraison, délai de livraison, retours, disponibilité, ajout au panier avec quantité). Les offres sont triées par prix, aucune n'est mise en avant ; la moins chère porte la mention « Lowest price ». Les frais de livraison et la taxe illustrative sont annoncés avant l'achat.
- **Backend** : le détail d'une fiche renvoie, pour chaque offre, l'état (neuf ou reconditionné), la politique du vendeur (délai de livraison, durée de retour), le stock disponible réel (stocké moins réservé) et le tarif de livraison forfaitaire. Trois champs ont été ajoutés au vendeur (migration) ; un script renseigne des valeurs **fictives** pour les vendeurs de démonstration.
- **Panier** (lecture et suppression) : ajout d'une offre (l'offre est relue côté serveur : vendeur et prix ne viennent jamais du navigateur), cookie essentiel httpOnly, compteur dans l'en-tête, lignes regroupées par vendeur, suppression d'une ligne. La commande arrive en F3.
- **Comparateur** : cases « Compare » sur les cartes et la fiche, barre de sélection (2 à 4 produits, conservée d'une page à l'autre), page de comparaison côte à côte (prix, offres, vendeur le moins cher, état, livraison, retours, couleur, modèle), retrait d'une colonne.
- **Tests automatiques du site** (Playwright, 13 tests) : parcours, filtres, pagination, 404, clavier, fiche produit, panier complet, comparateur, accessibilité (axe-core, WCAG 2.2 A et AA) sur les pages principales.

## Vérifications effectuées (environnement de l'assistant : Linux, Node 22.22.2, PostgreSQL 16)

- Backend : 43 tests automatiques réussis (dont 9 sur le catalogue).
- Site : types et compilation réussis ; 13 tests de bout en bout réussis ; aucune violation d'accessibilité détectée automatiquement.

## Défauts trouvés et corrigés pendant le développement

- Le compteur du panier dans l'en-tête restait en retard d'une action : rafraîchi après chaque ajout et suppression.
- La barre de comparaison ne suivait pas le retrait d'une colonne : synchronisée avec la page.
- Tableau de comparaison avec une première colonne démesurée : mise en page corrigée.

## Non fait / limites connues

- Pas de commande ni de paiement (F3) ; la quantité d'une ligne ne se modifie pas encore dans le panier.
- Livraison : un tarif unique de 5 USD par colis vendeur, délais et retours fictifs ; pas de livraison par vendeur réelle.
- Pas de contenu sponsorisé, de recommandations, d'avis ni de notes (aucune donnée ne les porte).
- Les tests de bout en bout dépendent du catalogue de démonstration et d'un navigateur de test à installer (`npx playwright install chromium`). Dans l'environnement de l'assistant, ils ont tourné avec un navigateur déjà présent, non avec celui téléchargé par Playwright : à confirmer chez vous.
- Aucun test automatique ne couvre encore la mise en page sur mobile et tablette.
- Le panier utilise un cookie ; derrière HTTPS, activer `COOKIE_SECURE=true`.
