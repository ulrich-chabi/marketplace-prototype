# Courriels de commande

Le backend déclenche un événement après la création de la commande et l'enregistrement de l'empreinte de suivi. Le code privé de suivi n'est jamais transmis au fournisseur de courriel. L'envoi est assuré par le module de notification SendGrid de Medusa.

## Configuration SendGrid

1. Vérifier un expéditeur dans SendGrid et créer une clé API limitée à l'envoi de courriels.
2. Créer un modèle dynamique avec le contenu de [`sendgrid-order-confirmation.html`](sendgrid-order-confirmation.html), puis activer une version du modèle.
3. Copier la clé API, l'adresse d'expédition vérifiée et l'identifiant `d-…` du modèle dans les variables d'environnement du backend :

   - `SENDGRID_API_KEY`
   - `SENDGRID_FROM`
   - `SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID`
   - `STOREFRONT_PUBLIC_URL` (URL HTTPS publique du site)

4. Redémarrer le backend et vérifier la réception d'un courriel avec une commande de test contrôlée.

Le fichier `.env.template` contient les noms des variables, jamais de secrets. SendGrid n'est pas configuré dans le dépôt. En développement, l'absence de ces réglages ignore l'envoi. En production, le checkout renvoie 503 tant que le paiement, les taxes et l'envoi de courriels ne sont pas configurés avec des fournisseurs réels. Les paiements et la taxe de démonstration ne conviennent pas à une vente réelle.

Le fournisseur SendGrid Medusa attend l'identifiant du modèle dynamique dans `template` et reçoit les variables de personnalisation dans `data`, conformément à la [documentation Medusa](https://docs.medusajs.com/resources/architectural-modules/notification/sendgrid). Le service stocke les données de notification : seuls le numéro de commande, le total, la devise, la date, le nom et l'URL de la boutique lui sont fournis.
