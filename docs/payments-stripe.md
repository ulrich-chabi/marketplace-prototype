# Paiements Stripe au Canada

Le checkout peut utiliser le Payment Element Stripe en CAD. Sans clé publique configurée, seul le checkout de démonstration local est affiché. Le mode démo est désactivé sur le site en production. Le backend refuse aussi de finaliser une commande de production sans un vrai fournisseur de paiement, un fournisseur fiscal et les courriels de confirmation.

## Mise en place

1. Créer un compte Stripe canadien et commencer avec les clés de test.
2. Dans `backend/.env`, ajouter `STRIPE_API_KEY` (clé secrète `sk_test_…`) et enregistrer le `STRIPE_WEBHOOK_SECRET` fourni après l'étape webhook ci-dessous. Garder ces valeurs privées.
3. Dans `storefront/.env.local`, ajouter la clé publique de test `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…`). Comme Next.js intègre les variables `NEXT_PUBLIC_*` au build, reconstruire le storefront après toute modification de cette clé.
4. Redémarrer backend et storefront. Dans l'administration Medusa, ouvrir **Settings → Regions**, modifier la région Canada et activer **Stripe**. Le fournisseur régional doit apparaître comme `pp_stripe_stripe`.
5. En local, configurer Stripe CLI pour transférer les webhooks vers `http://localhost:9000/hooks/payment/stripe_stripe`; copier la clé de signature `whsec_…` dans `STRIPE_WEBHOOK_SECRET`. Pour le site déployé, enregistrer l'URL publique `https://<domaine-backend>/hooks/payment/stripe_stripe`.
6. Écouter les événements Stripe `payment_intent.amount_capturable_updated`, `payment_intent.succeeded`, `payment_intent.payment_failed` et `payment_intent.partially_funded`.
7. Valider le parcours avec les cartes de test Stripe et confirmer dans le tableau Stripe qu'aucun paiement réel n'est encaissé. Ne remplacer les clés de test par les clés live qu'après avoir complété la fiscalité canadienne, les contrats, la livraison, les retours, la protection contre la fraude et la configuration de production.

Le compte Stripe, les clés, les webhooks et l'activation du fournisseur dans la région sont des prérequis externes qui ne peuvent pas être créés par le dépôt. Le mode réel ne doit pas être activé avant vérification de ces paramètres. Au checkout, Stripe autorise le montant sans le capturer. La plateforme doit ensuite confirmer la préparation de la commande et capturer le paiement depuis **Seller orders and payments**; cette étape n'est pas encore automatisée à partir d'une expédition réelle. Consultez la [documentation Medusa sur le fournisseur Stripe](https://docs.medusajs.com/resources/commerce-modules/payment/payment-provider/stripe) pour les identifiants de fournisseur et les événements webhook, et le guide du [Payment Element](https://docs.medusajs.com/resources/storefront-development/checkout/payment/stripe) pour le flux de paiement navigateur.
