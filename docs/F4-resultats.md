# F4 — Compte démo et suivi de commande

## Ce qui est en place

- La page **Account** permet de consulter une commande en entrant sa référence technique (`order_…`) et le code privé affiché après la commande.
- Le dernier suivi est conservé dans un cookie `httpOnly`, pour retrouver la commande dans le même navigateur. Le client peut l'effacer.
- À la création, le backend génère un code aléatoire de 256 bits et ne stocke que son empreinte SHA-256 dans la commande.
- La route de suivi renvoie le statut de commande, le statut d'expédition simulée, le paiement simulé, le total et les articles. Elle ne renvoie ni email ni adresse.
- Un code invalide et une commande inconnue produisent la même erreur 404.
- Le code d'accès peut être conservé par le client pour retrouver la commande depuis un autre appareil. La page lui conseille de le garder privé.

## Vérifications effectuées

- `backend`: vérification TypeScript réussie.
- `storefront`: vérification TypeScript réussie.
- `storefront`: compilation de production avec webpack réussie.
- Tests d'intégration ajoutés : recherche avec code valide, absence de données personnelles, rejet d'un code invalide.
- Test de bout en bout enrichi : commande simulée puis affichage de son statut dans **Account**.
- Les suites d'intégration et Playwright n'ont pas été exécutées ici : le chargement natif de SWC échoue dans Jest et Chromium n'est pas installé.

## Limites

- Le compte est un suivi de commande invité, sans création de profil ni connexion client.
- Aucun transporteur réel n'est connecté; le statut d'expédition reste celui du prototype.
- Une commande n'est consultable qu'avec son numéro de référence et son code privé. Si le code est perdu et absent du navigateur courant, le suivi n'est pas récupérable.
