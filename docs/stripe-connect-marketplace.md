# Architecture financière Stripe Connect — marketplace canadienne

État : analyse technique, intégration non commencée. Dernière vérification des documents Stripe : 14 novembre 2026.

## État du code observé

- Le backend active le fournisseur Stripe standard lorsque `STRIPE_API_KEY` est défini et configure une autorisation avec capture manuelle (`capture: false`).
- Une commande parent et plusieurs commandes vendeur sont créées pour un panier multi-vendeurs.
- Les remboursements réels utilisent le paiement de la commande parent; le registre `vendor_refund` conserve le montant imputé à chaque commande vendeur.
- Aucun modèle de compte Stripe connecté, de transfert vendeur ou de rapprochement de versement n'est présent.
- Le checkout de production reste bloqué jusqu'à la configuration de plusieurs fournisseurs requis.

Ces faits décrivent le prototype actuel; ils ne constituent pas une intégration Connect.

## Flux recommandé à valider

Stripe décrit les paiements séparés des transferts comme le modèle adapté lorsqu'un panier peut impliquer plusieurs comptes connectés, comme dans une marketplace de commerce électronique. Le paiement est encaissé sur le compte de la plateforme puis des transferts distincts sont envoyés aux vendeurs. Stripe débite alors le compte de la plateforme des frais, remboursements et litiges. Voir [le comparatif officiel des types de paiement Connect](https://docs.stripe.com/connect/charges) et [la documentation des paiements séparés et transferts](https://docs.stripe.com/connect/separate-charges-and-transfers).

Séquence technique proposée, à confirmer dans le compte Stripe de la plateforme :

1. Intégrer l'ouverture de compte connecté et l'onboarding hébergé Stripe; conserver uniquement l'identifiant de compte et les états/capacités nécessaires, jamais de coordonnées bancaires.
2. Refuser les paiements marketplace tant que chaque vendeur concerné n'a pas terminé les exigences Stripe nécessaires aux paiements et versements.
3. Créer un paiement CAD au niveau de la commande parent, avec idempotence et autorisation/capture contrôlée.
4. Ventiler le montant entre vendeurs à partir des commandes vendeur; ne transférer que le montant libérable selon la règle de livraison/retour retenue et la liquidité disponible sur le compte plateforme.
5. Garder chaque transfert lié à la commande parent et vendeur, avec une clé idempotente et un registre immuable des montants, devise, commission, transfert et état de rapprochement.
6. Sur remboursement ou litige, enregistrer l'événement Stripe, rembourser le client et récupérer la part vendeur par reversal lorsque c'est possible; traiter explicitement les soldes vendeur insuffisants et les échecs asynchrones.
7. Rapprocher les événements et transactions de solde Stripe avec le registre interne avant de marquer un transfert ou versement comme final.

Un transfert vers un compte connecté et le versement bancaire Stripe de ce compte sont deux mouvements différents. Le tableau de bord et le registre doivent afficher leurs états séparément.

## Décisions requises avant le code de transfert

Ces paramètres ont une incidence sur les contrats, les fonds et la comptabilité; aucune valeur n'est donc codée par défaut.

- Commission plateforme : pourcentage, montant fixe ou combinaison; base de calcul et traitement des remises.
- Allocation du transport, des taxes, des frais de paiement et des remboursements entre vendeurs et plateforme.
- Événement qui libère les fonds (expédition, livraison confirmée ou fin de fenêtre de retour) et réserves à conserver.
- Responsabilité de la plateforme face aux frais Stripe, remboursements, litiges, soldes négatifs et vendeurs insolvables.
- Pays, types juridiques et statut fiscal autorisés des vendeurs, et produit Connect/paramètres de responsabilité à choisir avec Stripe.
- Règles de retours, d'annulation et de remboursement après transfert vendeur.

Le marché et la clientèle restent canadiens. La résidence canadienne des vendeurs doit également devenir une règle explicite si les transferts transfrontaliers ne sont pas souhaités.

## Gates de validation

Avant d'activer ce flux : profil marketplace et paramètres Connect confirmés par Stripe; onboarding d'un vendeur test au Canada; scénarios panier multi-vendeurs, capture, paiement échoué, transfert répété, remboursement partiel, reversal impossible, litige et webhook dupliqué passés en sandbox; rapprochement comptable revu; contrats et règles financières approuvés. Les paiements réels restent désactivés tant que ces gates ne sont pas franchis.
