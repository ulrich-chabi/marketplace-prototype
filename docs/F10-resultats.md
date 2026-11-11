# F10 — Vérification finale du prototype

## Vérifications réussies

- Migration marketplace F6 appliquée sur PostgreSQL local; `npx medusa db:migrate` confirme ensuite que la base est à jour.
- `scripts/verify-prototype.ps1` : réussite complète sur Medusa 2.22.6, incluant TypeScript backend, migrations, tests HTTP (49/49), build backend, TypeScript storefront, build de production et tests navigateur (19/19).
- Tests backend : 6 suites, 49 tests réussis.
- Tests navigateur : 19 tests réussis sur le storefront de production, dont compte client, espace vendeur, opérations plateforme, panier/commande/suivi/retour, largeur 360/768 px et axe.
- Storefront : Next.js 16.4.3 et SDK Medusa 2.22.6; `npm audit` : 0 vulnérabilité et build/typecheck réussis.
- Backend : Medusa, CLI, framework, admin SDK, tests et SDK storefront alignés en 2.22.6; Vite 7.3.8. `npm audit` : 17 avis (0 critical, 0 high, 7 moderate, 10 low); en production : 12 avis (0 critical, 0 high, 7 moderate, 5 low). Les avis résiduels sont transitifs dans l'arbre Medusa, et npm ne propose pas de correctif compatible pour eux. Les tests et les parcours démo sont validés, mais un service public reste exclu jusqu'à revue de ces avis et durcissement de la configuration.
- Les fichiers `.env` locaux sont ignorés. Les deux modèles d'environnement sans secret (`backend/.env.template` et `storefront/.env.local.example`) sont versionnés pour qu'un clone neuf puisse être configuré. Le navigateur Playwright est ignoré.
- `git diff --check` ne détecte pas de problème d'espacement.

## Limite sécurité à conserver visible

- Les avis backend restants n'ont pas de mise à jour compatible disponible. Ils sont consignés au lieu d'appliquer des changements forcés susceptibles de casser le framework.
- Le prototype reste local, avec données fictives, paiements, expédition et remboursements simulés. Le mot de passe prototype de 4 caractères, les valeurs de politiques fictives, l'hébergement et les décisions de diffusion restent à durcir ou confirmer avant un usage réel.

## Conclusion de portée

Le prototype local est construit et ses parcours automatisés passent. Ce résultat ne vaut pas autorisation de mise en production : les avis backend modérés/faibles, le mot de passe démo, les politiques fictives, le choix d'hébergement et les contrôles opérationnels restent des prérequis avant un service public ou commercial.
