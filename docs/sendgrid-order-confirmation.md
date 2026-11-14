# Courriel de confirmation de commande

Le backend envoie une confirmation uniquement pour une commande ayant une session Stripe. Les commandes démo n'envoient aucun courriel. La configuration requiert `SENDGRID_API_KEY`, `SENDGRID_FROM`, `SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID` et `STOREFRONT_PUBLIC_URL` dans l'environnement du backend; ne jamais placer leurs valeurs dans Git.

## Variables du modèle dynamique SendGrid

Le modèle doit utiliser seulement ces clés:

| Clé | Valeur |
|---|---|
| `order_number` | Numéro visible de la commande |
| `total` | Total formaté selon la devise de la commande |
| `currency` | Code de devise en majuscules |
| `order_date` | Date formatée en anglais canadien |
| `store_name` | `Marketplace Canada` |
| `storefront_url` | URL de la boutique sans barre oblique finale |

Ne pas inclure de code d'accès au suivi, d'empreinte de ce code, d'adresse, de moyen de paiement ou de données vendeur. Le code privé de suivi n'est montré qu'une fois à l'acheteur après la commande et n'est jamais inclus dans la charge utile de courriel.

## Vérification avant activation

1. Créer un modèle dynamique SendGrid avec les seules variables ci-dessus et renseigner les quatre secrets/configurations dans l'environnement de test.
2. Utiliser une session de paiement Stripe en mode test et vérifier la réception, le destinataire, le total CAD et le rendu mobile du courriel.
3. Vérifier qu'une commande de démonstration n'envoie rien et que le code privé de suivi ne figure ni dans le modèle ni dans l'événement envoyé.
4. Confirmer l'identité d'expéditeur et les réglages de domaine auprès du compte SendGrid avant tout usage réel.

Ces essais de compte restent à faire; la validation unitaire du contrat de données ne prouve pas la livraison par SendGrid.
