# F9 — Responsive, accessibilité et contenus

## Améliorations

- Ajout d'un contrôle Playwright d'absence de débordement horizontal à 360 px et 768 px sur l'accueil, le compte, les portails vendeur/plateforme, les informations de confidentialité et le comparateur.
- Extension du parcours automatisé d'accessibilité aux pages vendeur, plateforme, retours et confidentialité.
- Suppression des mentions `[year]`, `[owner]`, `Hero image` et des textes d'information « à rédiger » affichés au public.
- Contenus d'information alignés sur les décisions du prototype : vendeurs/produits fictifs, frais et taxes simulés, modalités de retour, absence de publicité et résumé des données locales.
- CTA d'inscription vendeur relié au portail réel; illustrations SVG explicitement marquées comme visuels de démonstration.
- Contraste calculé pour les paires principales : blanc/terracotta 6,38:1; blanc/teal 5,74:1; muted/sand 5,45:1; muted/cream 7,02:1.

## Vérifications

- `storefront`: `npm run typecheck` et `npx next build --webpack` réussis.
- `npm run test:e2e` : 19 tests réussis, dont le contrôle axe WCAG 2.2 A/AA automatisé et les largeurs de 360 px et 768 px.
- L'accessibilité automatisée ne remplace pas une revue manuelle au clavier, lecteur d'écran et contraste des contenus réellement publiés.

Les pages Terms et Privacy indiquent explicitement qu'elles décrivent le prototype et ne constituent pas des documents de production. Une diffusion publique est hors du périmètre validé.
