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

<!-- brume-douce : début -->
## Brume douce, direction retenue : contrôles D.4 (ARRÊT 2 quater, avant E.2)

Choisie le 19/11/2026 (ARRÊT 2 quater). Mesures faites sur la branche locale des prototypes (`/proto/bd`), sur la version finale de la direction, avec le protocole ci-dessus et les outils de `scripts/design/` ; portées ici en E.2.

| Date | Version | Écran | Mesure | Valeur | Conditions | Preuve |
|------|---------|-------|--------|--------|------------|--------|
| 19/11/2026 | Brume douce | 7 écrans | Défilement horizontal (9 largeurs) | aucun | Edge, Firefox, WebKit | scripts/design/controles.ts |
| 19/11/2026 | Brume douce | 7 écrans | axe, violations sérieuses ou critiques | 0 | Edge, Firefox, WebKit, 390 et 1707 px | scripts/design/controles.ts |
| 19/11/2026 | Brume douce | 7 écrans | Erreurs de console ; requêtes vers un autre domaine | 0 ; 0 | Edge, Firefox, WebKit | scripts/design/controles.ts |
| 19/11/2026 | Brume douce | Accueil | Premier écran : question, chiffre, recherche, globe entier, « Recentrer » ; au téléphone, globe juste après le chiffre et sa définition, recherche sous le globe ; étiquettes sans chevauchement | 1707 × 799 : tient ; 1920 × 1080 : tient ; 360 × 732 : tient | Edge sans fenêtre, après le tracé des fils | scripts/design/premier-ecran.ts |
| 19/11/2026 | Brume douce | Accueil | Étiquettes du globe : l'une sur l'autre ; hors de l'ordre nord-sud ; filet croisé ; sur un fil (glissements compris) | 0 ; 0 ; 0 ; 0 (234 relevés) | Téléphone (Pixel 9) et ordinateur (1707 × 799), 12 s de rotation, un relevé toutes les 100 ms | scripts/design/etiquettes.ts |
| 19/11/2026 | Brume douce | Accueil | LCP (sur le texte) | 724 ms | Pixel 7, Fast 4G, processeur × 4, cache froid, médiane de 5 | scripts/design/vitesse.ts |
| 19/11/2026 | Brume douce | Accueil | CLS | 0 | Pixel 7, Fast 4G, processeur × 4, cache froid, médiane de 5 | scripts/design/vitesse.ts |
| 19/11/2026 | Brume douce | Accueil | INP (deux touchers) | 72 ms | Pixel 7, Fast 4G, processeur × 4, cache froid, médiane de 5 | scripts/design/vitesse.ts |
| 19/11/2026 | Brume douce | Accueil | JavaScript transféré : avant le chargement ; 3D, après | 163 Ko ; 136 Ko | Pixel 7, Fast 4G, processeur × 4, cache froid, médiane de 5 | scripts/design/vitesse.ts |
| 19/11/2026 | Brume douce | `/` | JavaScript transféré (compressé) | 299 Ko | Edge, sans bridage, 3D comprise sur l'accueil | scripts/design/vitesse.ts |
| 19/11/2026 | Brume douce | `/site/www.impots.gouv.fr` | JavaScript transféré (compressé) | 163 Ko | Edge, sans bridage, 3D comprise sur l'accueil | scripts/design/vitesse.ts |
| 19/11/2026 | Brume douce | `/pourquoi` | JavaScript transféré (compressé) | 163 Ko | Edge, sans bridage, 3D comprise sur l'accueil | scripts/design/vitesse.ts |
| 19/11/2026 | Brume douce | `/ministere/enseignement-superieur-recherche` | JavaScript transféré (compressé) | 163 Ko | Edge, sans bridage, 3D comprise sur l'accueil | scripts/design/vitesse.ts |
| 19/11/2026 | Brume douce | Accueil | Images par seconde de la 3D, ordinateur | 211 (médiane), 189 au plus bas ; densité 1,5 | Edge sans fenêtre, ANGLE (Intel, Intel(R) UHD Graphics (0x00004688) Direct3D11 vs_5_0 ps_5_0, D3D11), sans synchronisation sur l’écran, 1707 × 799 px, échelle 1,5, 12 s de rotation | scripts/design/fps.ts |
| 19/11/2026 | Brume douce | Accueil | Images par seconde de la 3D, téléphone | 214 (médiane), 154 au plus bas ; densité 2 | Pixel 9 émulé, processeur × 4, 12 s de rotation | scripts/design/fps.ts |
| 19/11/2026 | Brume douce | Vidéo ordinateur | Images répétées ou sautées pendant les mouvements | aucune (9 mouvements, 1439 images à 30 par seconde, 2560 × 1198 px) | Horloge virtuelle, une image tous les 1/30 s, mesure sur le MP4 | scripts/design/verifier-film.ts |
| 19/11/2026 | Brume douce | Vidéo téléphone | Images répétées ou sautées pendant les mouvements | aucune (10 mouvements, 1496 images à 30 par seconde, 1080 × 2196 px) | Horloge virtuelle, une image tous les 1/30 s, mesure sur le MP4 | scripts/design/verifier-film.ts |
| 19/11/2026 | Brume douce | Accueil | Contrastes mesurés sur l'image : fond #D7DADD (clarté OKLCH 0,887) ; texte, texte secondaire, accent, globe | 10,98:1 ; 5,4:1 ; 5,9:1 ; 14,3:1 | Ordinateur, 1707 × 799, échelle 1,5 ; cœur des lettres contre une plage du fond | scripts/design/contrastes-image.ts |

### Contrastes et clarté du fond de Brume douce (WCAG 2.2 ; OKLCH ; jetons, et globe mesuré sur l’image)

```
Brume douce · fond #D7DADD, clarté OKLCH 0,887 · globe rendu #05080B, clarté 0,132 (mesurée sur l'image)
   encre / fond                     10,98:1 OK (texte, seuil 4,5)
   discret / fond                   5,40:1 OK (texte, seuil 4,5)
   accent / fond                    5,90:1 OK (texte, seuil 4,5)
   encre / surface                  11,65:1 OK (texte, seuil 4,5)
   discret / surface                5,72:1 OK (texte, seuil 4,5)
   encre / surface-2                10,05:1 OK (texte, seuil 4,5)
   discret / surface-2              4,94:1 OK (texte, seuil 4,5)
   accent / surface                 6,26:1 OK (texte, seuil 4,5)
   sur-accent / accent              7,36:1 OK (texte, seuil 4,5)
   controle / fond                  5,40:1 OK (contrôle, seuil 3)
   controle / surface               5,72:1 OK (contrôle, seuil 3)
   fil hors UE #466FFF / globe      4,76:1 OK (objet graphique, rendu, seuil 3)
   fil UE #AAB7C4 / globe           9,83:1 OK (objet graphique, rendu, seuil 3)
   côtes #9BA5AF / globe            8,03:1 OK (objet graphique, rendu, seuil 3)
   filets #C0CCD8 / globe           12,30:1 OK (objet graphique, rendu, seuil 3)
   globe rendu / fond de page       14,30:1 (information, sans seuil : le halo, les côtes et les fils dessinent le globe)
```
<!-- brume-douce : fin -->

## Chantier 2, partie D : premières versions des pages du site complet (22/11/2026, build local porte ouverte, données du jour 1)

Mesuré par `scripts/design/vitesse.ts` (Pixel 7, « Fast 4G », processeur × 4, cache froid, médiane de 5 passages) et `scripts/design/controles.ts` (Edge, Firefox, WebKit ; 9 largeurs de 360 à 1 920 px ; axe à 390 et 1 707 px), branche `feat/c2-site-donnees`.

| Page | LCP | CLS | INP | JavaScript (compressé) |
|---|---|---|---|---|
| `/` (l'Atlas, porte ouverte) | 620 ms (la définition du chiffre) | 0 | 56 ms (le champ de recherche) | 158 Ko avant le chargement, 136 Ko de 3D après |
| `/radiographie/impots.gouv.fr` | 616 ms | 0 | non mesuré | 145 Ko |
| `/ministeres/ministere-de-la-culture` | 628 ms | 0 | non mesuré | 144 Ko |

Budgets (DESIGN.md § 13) : LCP 1,8 s, CLS 0,02, INP 100 ms au plus : tenus. Contrôles sur 11 pages : 0 défilement horizontal, 0 erreur de console, 0 requête vers un autre domaine ; axe : 0, après la correction des blocs de commandes de la Radiographie (`scrollable-region-focusable`, six fois à 390 px avant). Le serveur local lit les données sur GitHub : le premier rendu d'une page n'est pas compté (une requête de mise en route avant les passages).

Images par seconde du globe de l'Atlas, avec les fils du jour 1 (`scripts/design/fps.ts`, Edge sans fenêtre, ANGLE Intel UHD Graphics, Direct3D 11, 12 s de rotation lente) : ordinateur 240 (au plus bas 240, densité 1,5) ; Pixel 9 émulé, processeur × 4 : 234 (au plus bas 225, densité 2). Cibles : 60 et 30.
