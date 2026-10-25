# Parcours jusqu'au prototype complet

Ce parcours traduit les décisions validées dans `decisions.md` en étapes de livraison. « Prêt » signifie ici que le prototype local documenté fonctionne et que ses parcours principaux ont été vérifiés; cela ne signifie ni déploiement public ni transactions réelles.

| Étape | Portée | État |
|---|---|---|
| F1–F4 | Catalogue, navigation, comparaison, panier, commande simulée et suivi invité | Livré; voir les comptes rendus F1–F4 |
| F5 | Compte client : inscription, connexion, profil, historique et rattachement des nouvelles commandes | Implémenté; parcours avec backend réel à exécuter |
| F6 | Demandes de retour cohérentes avec les politiques fictives du vendeur; décision et suivi plateforme | Implémenté; tests d'intégration et navigateur à exécuter dans un environnement complet |
| F7 | Espace vendeur : état du compte, offres, stock et commandes; actions autorisées selon le rôle et l'état du vendeur | Implémenté; parcours réel à vérifier avec backend et navigateur |
| F8 | Interface opérateur : activation/suspension, remboursements plafonnés et journal des actions | Implémenté; parcours admin réel à vérifier |
| F9 | Parcours mobile/tablette, accessibilité, pages légales, états d'erreur et cohérence UI | À faire |
| F10 | Revue de sécurité/données, documentation d'installation et de vérification, suite complète de tests | À faire |

Chaque étape doit ajouter ou adapter ses tests et passer les vérifications disponibles avant d'être marquée livrée. Les limites dues à l'environnement (base, réseau ou navigateur absent) sont consignées; une vérification bloquée n'est pas considérée comme réussie.

## Critères d'arrêt

- Les parcours validés dans le registre des décisions fonctionnent de bout en bout dans le prototype.
- Les contrôles TypeScript, compilation, tests d'intégration et tests navigateur passent, ou une limite externe clairement identifiée est levée avant validation finale.
- Les données restent fictives, les paiements/livraisons/commissions/versements sont simulés et aucune clé ni donnée sensible n'est versionnée.
- Les commandes de lancement et vérification permettent au propriétaire de démarrer et contrôler le site et l'administration sur sa machine.
- Les décisions encore proposées ou à confirmer sont soit validées, soit rendues explicites avec leurs conséquences avant de déclarer la livraison terminée.
