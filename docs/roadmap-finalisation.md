# Parcours jusqu'à une marketplace canadienne exploitable

Les étapes F1–F10 livrent la base du prototype local. Elles ne signifient ni déploiement public ni transactions réelles. Les étapes F11–F17 prolongent ce travail jusqu'à une marketplace exploitable, avec vérifications externes obligatoires avant tout lancement.

| Étape | Portée | État |
|---|---|---|
| F1–F4 | Catalogue, navigation, comparaison, panier, commande simulée et suivi invité | Livré; voir les comptes rendus F1–F4 |
| F5 | Compte client : inscription, connexion, profil, historique et rattachement des nouvelles commandes | Livré et contrôlé dans la suite backend et les parcours navigateur |
| F6 | Demandes de retour cohérentes avec les politiques fictives du vendeur; décision et suivi plateforme | Livré et contrôlé dans 49 tests HTTP et 19 parcours navigateur |
| F7 | Espace vendeur : état du compte, offres, stock et commandes; actions autorisées selon le rôle et l'état du vendeur | Livré et contrôlé dans les suites d'intégration, navigateur, responsive et accessibilité |
| F8 | Interface opérateur : activation/suspension, remboursements plafonnés et journal des actions | Livré et contrôlé dans les suites d'intégration et navigateur |
| F9 | Parcours mobile/tablette, accessibilité, pages d'information, états d'erreur et cohérence UI | Livré; 19 tests navigateur réussis, axe sans violation détectée sur les pages testées |
| F10 | Revue de sécurité/données, documentation d'installation et de vérification, suite complète de tests | Livré pour le périmètre de prototype local; avis de dépendances backend modérés/faibles consignés, aucune mise en production autorisée |
| F11 | Catalogue démo distinct : chaque fiche possède un visuel identifié, des crédits et des offres de vendeurs | En cours; 153 images distinctes et vérifiées, 20 rayons couverts. Le seed expose les photos disponibles par rayon, jusqu'à 12 produits, et les nouveaux choix restent limités aux correspondances visuelles correctes |
| F12 | Courriels transactionnels de commande; ne jamais envoyer le code privé de suivi | Code et modèle SendGrid prêts; compte, clés et envoi de test à vérifier |
| F13 | Paiement Stripe sécurisé, autorisation, capture opérateur et webhooks | Code intégré; clés de test, activation de la région et test Stripe à faire |
| F14 | Taxe canadienne réelle par province, territoire, produit et vendeur | En cours : checkout de production désormais limité à Avalara en production, avec configuration et vérification explicites du catalogue et du code de livraison. Le fournisseur n'est pas encore intégré/activé; classification des annonces, obligations du vendeur et essais sandbox restent à faire |
| F15 | Tarifs et étiquettes de livraison, suivi transporteur, retours et capture liée à l'expédition | En cours : le checkout utilise désormais le panier recalculé après ajout des méthodes de livraison, et affiche le montant Medusa s'il existe. Le forfait démo demeure à 5 CAD par vendeur; ShipStation n'est pas intégré, les poids/dimensions et adresses d'origine vendeur manquent, et aucun tarif/étiquette/suivi réel n'est encore produit |
| F16 | Versements vendeurs, commissions, rapprochement comptable et remboursements réels | Non commencé; l'intégration de paiements marketplace et les règles financières restent à définir |
| F17 | Conditions, confidentialité, conformité, hébergement, sauvegardes et préparation au lancement | Non terminé; les pages actuelles décrivent le prototype et ne constituent pas des conditions commerciales approuvées |

Chaque étape doit ajouter ou adapter ses tests et passer les vérifications disponibles avant d'être marquée livrée. Les limites dues à l'environnement (base, réseau ou navigateur absent) sont consignées; une vérification bloquée n'est pas considérée comme réussie.

Les étapes F11–F17 prolongent le périmètre local F1–F10 vers l'objectif d'une marketplace exploitable au Canada. Une étape qui attend des clés Stripe, SendGrid ou un fournisseur fiscal ne sera pas déclarée terminée avant un essai réel en environnement de test. En production, la création d'une session de paiement doit rester bloquée avant toute autorisation tant que les fournisseurs nécessaires ne sont pas prêts.

## Critères de validation de la base locale

- Les parcours validés dans le registre des décisions fonctionnent de bout en bout dans le prototype.
- Les contrôles TypeScript, compilation, tests d'intégration et tests navigateur passent, ou une limite externe clairement identifiée est levée avant validation finale.
- Les données restent fictives, les paiements/livraisons/commissions/versements sont simulés et aucune clé ni donnée sensible n'est versionnée.
- Les commandes de lancement et vérification permettent au propriétaire de démarrer et contrôler le site et l'administration sur sa machine.
- Les décisions restantes sont classées hors périmètre ou associées à une conséquence vérifiable avant tout usage public; voir `decisions.md`.

## Conditions de fin de l'objectif complet

- F11–F17 sont terminées et vérifiées, dont un essai complet de commande Stripe en environnement de test, les taxes canadiennes applicables, l'expédition réelle, les retours/remboursements et les versements vendeurs.
- Le catalogue, les vendeurs, les descriptions, les politiques et les images sont autorisés, cohérents et utilisables pour une boutique canadienne; les données de démo restent clairement distinctes.
- Les textes commerciaux et de confidentialité sont approuvés par le propriétaire et les professionnels requis; l'hébergement, les secrets, les sauvegardes, les alertes et les procédures d'exploitation sont configurés.
- Les suites unitaires, intégration, navigateur, accessibilité, builds et parcours de paiement/commande ont des résultats documentés sur les paramètres de production prévus.
