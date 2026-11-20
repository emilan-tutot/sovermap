---
paths:
  - "components/**"
  - "app/**/*.tsx"
  - "app/**/*.css"
  - "**/*.css"
  - "DESIGN.md"
  - "lib/i18n/**"
  - "lib/design/**"
---

# Interface, charte, accessibilité

- La charte est normative (`DESIGN.md`, après le choix de la direction). Avant : les interdits du cahier §8.3, contrôlés par `npm run lint:design`.
- Couleurs, rayons, ombres, courbes : jetons `@theme` de `app/globals.css` seulement ; aucune couleur brute ailleurs.
- Une seule couleur d’accent ; des traits fins ; la police mono réservée aux couches de la radiographie et aux valeurs brutes.
- Chiffres tabulaires (`tabular-nums`) dans les tableaux et les compteurs ; titres équilibrés (`text-wrap: balance`).
- N’animer que ce qui a un sens (les fils qui se tracent, les couches qui se déplient), et seulement `transform` et `opacity`. `prefers-reduced-motion` respecté partout.
- WCAG 2.2 AA : texte ≥ 4,5:1, contrôles ≥ 3:1, focus toujours visible, tout au clavier, cibles tactiles ≥ 44 px, axe sans violation.
- Téléphone d’abord : `dvh`/`svh`, zones sûres (`env(safe-area-inset-*)`), aucun défilement horizontal de 360 à 1920 px, rien qui ne marche qu’au survol.
- Aucune chaîne en dur : `lib/i18n/fr.ts` (l’anglais suivra clé pour clé en T11). Aucun tic d’écriture d’IA (§8.3, « Contenus »).
- Aucun logo de société, aucun drapeau : des noms en texte simple. Aucune image de banque d’images.
- La 3D (une seule scène, sur l’accueil) : WebGL 2, repli statique, pause hors écran, densité de pixels ≤ 2, ne piège jamais le défilement ni le geste « retour » au téléphone (cahier §8.4).
