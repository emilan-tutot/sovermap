# Journal de design

Les mesures de design, avec leur date, leur protocole et leur résultat. Seules les mesures de la direction choisie entrent dans `feat/t1-socle` (E.2). Les mesures des prototypes restent sur la branche locale `proto/t1`.

## Protocole (brief D.4, cahier §8.9)

- **Largeurs**, sans défilement horizontal : 360, 390, 412, 768, 1024, 1280, 1440, 1707 × 799 et 1920 px.
- **Navigateurs** : Edge (`channel: 'msedge'`), Firefox, WebKit (Playwright).
- **Accessibilité** : axe, 0 violation sérieuse ou critique ; contrastes mesurés (4,5:1 pour le texte, 3:1 pour les contrôles).
- **Vitesse de l'accueil** : LCP ≤ 1,8 s, CLS ≤ 0,02, INP ≤ 100 ms.
  - Conditions : profil Pixel 7, « Fast 4G », processeur × 4, cache froid, médiane de 5 passages.
  - Le LCP porte sur le texte. La 3D a son propre budget, mesuré.
- **3D** : images par seconde à l'ordinateur (cible 60) et en émulation de téléphone (au moins 30).
- **Poids** : JavaScript par route.
- **Console** : aucune erreur.

## Mesures

| Date | Direction | Écran | Mesure | Valeur | Conditions | Preuve |
|------|-----------|-------|--------|--------|------------|--------|
| — | — | — | — | — | — | — |
