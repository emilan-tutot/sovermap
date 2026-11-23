# DESIGN.md · Brume douce

**La direction en deux phrases.** Sovermap est un instrument de mesure clair et sobre : un fond gris doux à peine bleuté, un texte anthracite, un seul bleu cobalt pour ce qui sort de l’Union européenne. Au centre de l’Atlas, un globe sombre vu d’orbite, éclairé finement, d’où partent des fils lumineux vers les pays des sièges.

Choisie par le propriétaire à l’ARRÊT 2 quater (19/11/2026), après quatre tours de propositions filmées (chantier T1). Cette charte est normative : une règle qui n’y est pas n’existe pas ; un écart se corrige ou s’écrit ici, par une PR. Mesures datées : `specs/001-sovermap/journal-design.md`. Outils de mesure : `scripts/design/`.

## 1. Principes

1. **Exact avant tout.** Chaque chiffre a son unité, sa date et son périmètre ; rien d’inventé ; ce qui est provisoire est étiqueté. Le site décrit, il ne juge pas : jamais « conforme », jamais de rouge d’alarme ni de vert « validé ».
2. **Une seule couleur d’accent**, et elle a un sens : dans les données, l’accent veut dire « hors de l’Union européenne », partout (fils, anneaux, chiffres des étiquettes, barres, graphiques, verdicts).
3. **Le texte d’abord.** Le texte et le chiffre s’affichent avant la 3D ; la 3D arrive en fondu ; un repli statique montre la même scène.
4. **Rien d’animé au repos**, sauf la rotation lente du globe, coupée au premier contact et par « réduire les animations ».
5. **Téléphone d’abord**, aussi beau à l’ordinateur.
6. **Mesuré, pas supposé** : contrastes, vitesse et fluidité se mesurent, sur l’image quand la couleur passe par la 3D.
7. **Le niveau visé**, les mots du propriétaire : « toujours méga futuriste, classe, élégant, épuré, à la pointe de la technologie, très professionnel, et pas de slop AI design ».

## 2. Règles adoptées, adaptées ou rejetées

| Règle | Statut | Raison |
|---|---|---|
| Globe rond et sombre vu d’orbite (direction A, « La Veille orbitale ») | Adoptée | Gardé par le propriétaire dès l’ARRÊT 2, « surtout pour son globe rond ». |
| Polices de A : Chakra Petch, Manrope, IBM Plex Mono | Adoptée | Gardées dans les quatre tours ; préférées à celles de Galet à l’ARRÊT 2 ter. |
| Une seule couleur d’accent, traits fins, mono réservée aux valeurs brutes | Adoptée | Cahier § 8.2. |
| Page sombre de A (fond OKLCH 0,149) | Rejetée | « Un peu trop sombre » (ARRÊT 2 bis). |
| Fond gris bleuté de Brume (0,913) | Adaptée | « Trop froide et trop claire » : fond à mi-chemin entre Brume et Galet, teinte de Brume très atténuée (0,887). |
| Noirs et bleus de Brume (texte, globe, accent, fils) | Adoptée | « Dans Brume, les polices, les noirs et les bleus » (ARRÊT 2 ter). |
| Globe gris ardoise de Galet, titres en serif, bleu de Prusse | Rejetés | Non retenus à l’ARRÊT 2 quater. |
| Mise en page « instrument » de M3 (globe au centre) | Rejetée | Non retenue à l’ARRÊT 2 ter. |
| Cadre autour du globe | Rejetée | ARRÊT 2, défaut b : le globe sans cadre, aussi grand que le premier écran le permet. |
| Couleurs de la 3D sans conversion vers l’écran | Rejetée | ARRÊT 2 ter, défaut b : la conversion s’applique partout (§ 4). |
| Directions B et C, variantes A1, A2, A4, M1 à M3 | Rejetées | Effacées aux ARRÊTS 2 à 2 quater. |

## 3. Jetons

**Une seule source** : le bloc `@theme` de `app/globals.css` (Tailwind CSS v4), avec `--*: initial` (les défauts de Tailwind sont remis à zéro). Son miroir en JavaScript, pour la 3D seulement : `lib/design/tokens.ts` ; un test vérifie qu’ils concordent. `lint:design` refuse toute couleur brute ailleurs.

| Jeton | Valeur | Rôle |
|---|---|---|
| `--color-fond` | `#D7DADD` (OKLCH L 0,887, C 0,005, h 248°) | Fond de page, uni ; ni beige ni violacé |
| `--color-surface` | `#DEE0E2` | Panneaux, champs |
| `--color-surface-2` | `#CED1D4` | Surfaces en retrait, couche lue |
| `--color-encre` | `#20252C` | Texte (jamais noir pur) |
| `--color-discret` | `#4D555D` | Texte secondaire |
| `--color-accent` | `#1F45B0` | L’accent unique, cobalt profond |
| `--color-sur-accent` | `#EEF2F6` | Texte sur l’accent |
| `--color-trait`, `--color-trait-fort` | encre à 14 % et 32 % | Traits fins |
| `--color-filet` | `#C0CCD8` | Filets des étiquettes du globe (couleur des côtes) |
| `--color-controle` | `#4D555D` | Bordure des contrôles |
| `--font-titre`, `--font-texte`, `--font-mono` | § 6 | |
| `--radius-trait` | 2 px | Le seul rayon ; rayon intérieur = rayon extérieur − marge |
| `--ease-courbe` | `cubic-bezier(0.2, 0.7, 0.2, 1)` | La seule courbe |
| Échelle de texte | 0,75 · 0,875 · 1 · 1,0625 (lecture) · 1,125 · 1,25 · 1,5 rem ; titres `clamp(2rem, …, 3,25rem)` | Aucune taille hors de l’échelle |
| Ombres | aucune | Cahier § 8.3 |

**Contrastes mesurés** (WCAG 2.2 ; détail : `journal-design.md`) : texte 10,98:1, texte secondaire 5,40:1 (4,94:1 sur `surface-2`), accent 5,90:1, texte sur l’accent 7,36:1, contrôles 5,40:1. Sur l’image : 10,98, 5,4 et 5,9:1, valeurs identiques. Sur le globe (couleurs affichées) : fil hors UE 4,76:1, fil UE 9,83:1, côtes 8,03:1, filets 12,30:1 ; globe contre la page 14,3:1 (information).

## 4. Surfaces et matières

- **Page** : unie, sans dégradé, sans texture, sans verre. Les zones se séparent par l’espace et par des traits fins.
- **Le globe** : sphère sombre (affichée `#05080B`, clarté 0,132), lumière fine venue d’en haut à gauche, ombre douce du côté opposé, jamais noire ; halo d’atmosphère discret ; côtes en filets ; graticule pointillé. Matière : satin très léger, grain fixé à la surface.
- **Couleurs de la 3D (décision de l’ARRÊT 2 ter)** : tout shader convertit ses couleurs vers l’écran (sRGB) par `#include <colorspace_fragment>`, comme les matériaux intégrés de three.js ; un jeton de la 3D est donc la couleur affichée. Les jetons de Brume ont été recalés pour garder l’aspect que le propriétaire aimait : globe éclairé dont chaque terme est divisé par 12,92 (la pente de la courbe sRGB dans les tons sombres), fils et lueur aux couleurs qu’ils montraient. Écart mesuré sur l’image, mêmes instants avant et après : OKLab 0,0091 au plus (seuil 0,02). Les images de repli et les mesures suivent les mêmes valeurs.
- **Lueur** : la lumière qui court une fois le long d’un fil se mélange vers le blanc à l’écran (dans l’espace affiché). Restent permis : l’éclairage du globe, la lueur des fils et le surlignage de la couche lue. Interdits : un fond, un bouton ou un texte en dégradé.

## 5. Signes propres au site

- **Les fils** : de la France vers le pays du siège de la maison mère, plus épais avec plus de sites ; opaques, au-dessus de la carte (les côtes ne se voient pas à travers) ; leur hauteur suit leur longueur : un lien court reste presque à plat, aucun fil ne fait de crochet, sous aucun angle. Ils se tracent à l’arrivée, l’un après l’autre ; un fil s’efface quand son pays passe derrière le globe.
- **Les anneaux** : fins, aux pays d’arrivée et autour de la France ; accent pour les pays hors UE, neutre lumineux pour la France et l’UE.
- **Les étiquettes du globe** : de chaque côté, une colonne, de haut en bas dans l’ordre de leurs points (nord au sud) ; un filet ne croise jamais un autre filet ni une étiquette ; une étiquette ne couvre jamais un fil, un point ni une autre étiquette ; elle garde sa place et glisse quand elle doit bouger, sans jamais sauter. Règles codées dans `components/globe/etiquettes.ts`, testées (`tests/design.test.ts`) et mesurées pendant la rotation (`scripts/design/etiquettes.ts`).
- **La carte des territoires** (23/11/2026, montrée au point 17 ; se défait) : le fond de carte de l’IGN, dessiné une fois (`lib/carte/fond-de-carte.json`), rendu par le serveur en SVG, sans script ; la métropole en Lambert-93, les cinq départements d’outre-mer en encarts dans une colonne à gauche, chacun à sa propre échelle ; jamais l’accent (il veut dire « hors UE ») ; trois teintes : le département de la page (`--color-discret`), sa région (`--color-surface-2`), les alentours (`--color-surface`) ; les frontières des régions plus épaisses ; l’attribution de l’IGN sous la carte. Elle montre, elle ne mène nulle part : les listes de la page sont ses liens et son équivalent en texte.
- **Les couches** de la Radiographie : numérotées, chacune avec sa source et sa date ; la couche lue s’allume, la coupe de la chaîne (du site au pays du siège) la suit.
- **La constellation** d’un ministère : un disque par site, groupé par la société qui le sert, son nom contre son groupe ; un disque plein accent = maison mère hors UE ; une légende qui explique la couleur et la taille ; les mêmes noms partout.
- **Le logo** (choix du propriétaire, 20/11/2026) : un cercle, un arc qui le traverse dans sa moitié haute (une demi-ellipse, comme une orbite autour du globe) et deux points pleins là où l’arc touche le cercle : « le fil » entre deux pays. Une seule couleur (`--color-encre`), un seul trait. Géométrie relevée sur le dessin du propriétaire et codée dans `lib/design/logo.ts`, pour un cercle de rayon 1 : trait 0,0735 ; points de rayon 0,0865, à 12,65° au-dessus du diamètre horizontal ; sommet de l’arc à 0,616 ; demi-hauteur de l’arc 0,6451. L’icône d’onglet épaissit ses traits (0,16), grossit nettement ses points (0,28) et abaisse son arc (sommet à 0,52), pour que les points se voient et qu’un vide reste sous l’anneau à 16 px (point 02 du chantier 2), et passe au clair (`--color-fond`) sur un onglet sombre ; l’icône d’écran d’accueil (180 × 180) et l’image de partage (1200 × 630) gardent le dessin fidèle, sur le fond du site. Tous ces fichiers sont tirés du code par `scripts/design/icones.ts`.
- **Signes d’action** (dessinés pour le site, même trait) : un plus qui devient un moins pour ce qui s’ouvre sur place, une flèche pour une autre page, un chevron pour un panneau. Ce qui s’ouvre ou mène ailleurs se reconnaît au repos, sans survol.

## 6. Typographie

| Famille | Graisses | Rôle | Licence |
|---|---|---|---|
| Chakra Petch | 500, 600 | Mot-symbole, titres, chiffre-titre | SIL OFL 1.1 |
| Manrope (variable) | 200 à 800 | Texte, étiquettes, contrôles | SIL OFL 1.1 |
| IBM Plex Mono | 400, 500 | Valeurs brutes et couches de la Radiographie seulement | SIL OFL 1.1 |

- Fichiers `.woff2` dans `app/fonts/` (sous-ensembles latin et latin-ext, déclarés sous un même nom avec leurs plages de caractères : `app/fonts.ts`), servis par `next/font/local` ; jamais de téléchargement chez Google ; licences dans `public/licenses/`. Glyphes français vérifiés dans le sous-ensemble latin : « » À Ç É Œ œ ’ et l’espace insécable.
- Tailles minimales : 12 px pour tout texte (étiquettes, graphiques, téléphone compris) ; 16 px pour le texte courant.
- Chiffres tabulaires (`tabular-nums`) dans les tableaux, compteurs et valeurs ; chiffres proportionnels dans une phrase (une virgule décimale ne s’élargit pas).
- Titres équilibrés (`text-wrap: balance`), paragraphes `pretty`.
- **Typographie française** (ARRÊT 2, défaut h) : espace insécable avant « : ; ! ? » et après « « », avant « » » ; jamais dans une valeur brute, une heure, une adresse, une commande ou un lien. Les capitales espacées seulement pour la question de l’accueil et les libellés de trois mots au plus.
- **Coupures** (ARRÊT 2 f, ARRÊT 2 bis f et h) : on ne coupe jamais au milieu d’un mot ; une adresse IP, un préfixe, une date, une heure, un numéro d’AS ou de LEI passent entiers à la ligne ; seuls un nom de domaine ou une adresse web trop longs se coupent, après un point ou une barre oblique (une IPv6, après un deux-points) ; un nom composé (États-Unis, Royaume-Uni) ne se coupe jamais ; un appel de note est collé à son mot ; un « · » ne commence jamais une ligne. Codé dans `components/texte/` et testé.
- **Dates** : à la française dans les textes (19/11/2026) ; le format ISO et l’heure UTC seulement dans les valeurs brutes.
- **Parenthèses** : jamais deux à la suite ni l’une dans l’autre ; « Nom · Pays ».
- **Polices interdites** : Inter, Geist, Space Grotesk, toute police de science-fiction de jeu vidéo, et les polices des directions écartées (Newsreader, IBM Plex Sans Condensed, Cormorant Garamond, Literata, Schibsted Grotesk, Archivo, Source Sans 3). Une police nouvelle : libre (OFL), auto-hébergée, avec tous les caractères français et des chiffres tabulaires.

## 7. Mouvement

- Une seule courbe (`--ease-courbe`). Durées : 200 ms (étiquettes, filets), 240 à 360 ms (panneau, transitions de vue), 900 ms (fondu d’arrivée de la scène, après 400 ms) ; tracé d’un fil 1,7 s, les suivants à 0,35 s d’écart, lueur une seule fois.
- N’animer que `transform` et `opacity`.
- Transitions de vue entre l’Atlas, le panneau d’un pays et la Radiographie (le nom du site vole dans le titre), toujours avec un repli.
- Rien d’animé au repos, sauf la rotation lente du globe, coupée au premier contact et par « réduire les animations ». « Réduire les animations » est respecté partout (`prefers-reduced-motion`).

## 8. L’objet principal : la carte et la Radiographie

- **Une seule scène 3D**, sur l’accueil : `components/globe/Globe.tsx` (three.js, WebGL 2), gardée pour l’Atlas réel et pas affichée en production en T1. Elle se charge après le premier affichage et apparaît en fondu ; pause hors de l’écran ; densité de pixels plafonnée à 2 ; qualité qui suit les images par seconde. Repli statique de la même scène (`public/globe/repli.svg`, étiquettes en HTML par-dessus) sans WebGL, avec « réduire les animations » ou l’économie de données.
- **Interaction** : glisser pour tourner (ordinateur) ; toucher d’activation « Explorer le globe » au téléphone (la 3D ne capture jamais le défilement ni le geste « retour ») ; clic sur un pays pour ouvrir son panneau ; « Recentrer » ; au clavier, la liste des pays équivaut à la carte.
- **Honnêteté** : la carte montre les pays des sièges, pas l’emplacement des serveurs, et elle l’écrit.
- **Premier écran de l’accueil** (ARRÊT 2 a et c, ARRÊT 2 bis d) : à 1707 × 799 comme à 1920 × 1080, la question, le chiffre, la recherche, tout le globe et « Recentrer » ; au téléphone (360 × 732), le globe juste après le chiffre et sa définition, les deux sous-chiffres collés au chiffre, la recherche juste sous le globe. Mesuré par `scripts/design/premier-ecran.ts`.
- **Le chiffre-titre** se lit « au moins X % » ; à côté, la part hors UE au niveau « probable » et la part « non déterminé ».
- **La Radiographie** (ARRÊT 2 d) : à l’ordinateur, deux colonnes, les couches à gauche, la coupe de la chaîne à droite (SVG ou CSS, sans WebGL), qui reste visible et met en lumière la couche lue. « Pays du siège » donne le pays puis sa catégorie (« États-Unis · hors d’Europe »). Mode Expert : au téléphone, l’étiquette au-dessus de la valeur, en pleine largeur ; jamais de redite.

## 9. Composants

- **Coque** (`components/coque/Coque.tsx`) : lien d’évitement, en-tête avec le mot-symbole, contenu, pied de page avec la version servie et « Site indépendant, sans lien avec l’État ». La navigation (Atlas, Ministères, Sociétés, Territoires, Journal, Méthode, Données, FR · EN) rejoint l’en-tête quand ses pages existent : cinq éléments au plus dans une barre, sinon un menu compact. Appliqué le 23/11/2026 (montré au point 17 ; se défait) : la barre à l’ordinateur, où les sept éléments tiennent ; au téléphone (sous 48 rem), un menu compact, « Menu », élément natif `<details>` sans script, son signe dessiné (un plus qui devient un moins).
- **Panneau d’un pays** : sur le côté à l’ordinateur ; au téléphone, sur toute la hauteur, sous l’en-tête, et la page ne défile pas dessous (ARRÊT 2 ter, défaut a). Son bord ne coupe jamais un mot : ce qu’il couvrirait s’efface.
- **Recherche** unique : ce qui commence par la saisie passe d’abord, puis ce qui la contient.
- **Squelettes** pendant les chargements ; panneaux annoncés aux lecteurs d’écran.
- **Microcopie et dictionnaire** : tout texte affiché ou lu (accessibilité et métadonnées comprises) vient d’un seul dictionnaire, `lib/i18n/fr.ts`, en français seul pour l’instant ; l’anglais suivra clé pour clé (T11). `lint:design` refuse tout texte écrit dans un composant (règle `no-hardcoded-text`).
- **Icônes** : peu nombreuses, dessinées pour le site, de même épaisseur de trait ; aucun jeu d’icônes générique, aucun logo de société, aucun drapeau.

## 10. Parité mobile

Zones sûres (`env(safe-area-inset-*)`), unités `dvh` et `svh`, cibles tactiles d’au moins 44 px, rien qui ne marche qu’au survol, aucun défilement horizontal de 360 à 1920 px. Appareils de test : Edge, Firefox et WebKit en émulation (profil Pixel), écran du propriétaire (1707 × 799 à l’échelle 1,5) ; un vrai iPhone et un vrai Android avant l’ouverture.

## 11. WCAG 2.2 AA : critère et preuve

| Critère | Preuve |
|---|---|
| Contraste du texte ≥ 4,5:1, des contrôles et objets graphiques ≥ 3:1 | `scripts/design/contrastes.ts` (jetons) et `scripts/design/contrastes-image.ts` (sur l’image) ; § 3 |
| Aucune violation axe sérieuse ou critique | `e2e/public.spec.ts`, `scripts/design/controles.ts` |
| Focus visible, tout au clavier | Contour de 2 px à l’accent ; relecture de chaque PR d’interface |
| Information jamais portée par la seule couleur ni par la seule 3D | Liste des pays avec leurs nombres ; légendes écrites |
| « Réduire les animations » respecté | Règle globale dans `app/globals.css` ; repli statique du globe |
| Un tableau de données pour chaque graphique | Relecture |

## 12. Interdits et leur contrôle

| Interdit (cahier § 8.3 et propriétaire) | Contrôle |
|---|---|
| Couleur brute hors des jetons | `lint:design` : `no-raw-color` |
| Coins trop ronds, ombres démesurées | `no-default-radius`, `no-default-shadow` |
| Dégradé violet, néon, violet en général | `no-violet-family` ; relecture |
| Blanc clinique pur | `no-clinical-white` |
| Faux verre, orbes flous | `no-glass` |
| Texte arc-en-ciel, texte ou fond en dégradé | `no-rainbow-text` ; relecture |
| Liseré de couleur à gauche | `no-left-accent-border` |
| Animations décoratives | `no-generic-motion` |
| Inter, Geist, Space Grotesk | `banned-fonts` |
| Emojis | `no-emoji` |
| Tirets cadratins en série | `no-dash-series` |
| Texte écrit dans un composant | `no-hardcoded-text` |
| Grille « bento », trois cartes côte à côte, fausse fenêtre de terminal, badges, étiquettes redondantes, ornements | Relecture |
| Rouge d’alarme, vert « validé », « conforme » | Relecture ; `docs/juridique.md` |

## 13. Budgets de performance et protocole

- **Budgets** (cahier § 8.9) : LCP ≤ 1,8 s (sur le texte), CLS ≤ 0,02, INP ≤ 100 ms ; 3D ≥ 60 images par seconde à l’ordinateur, ≥ 30 sur un téléphone moyen ; poids du JavaScript de la 3D mesuré et justifié.
- **Protocole** : profil Pixel 7, « Fast 4G », processeur × 4, cache froid, médiane de 5 passages ; images par seconde en temps réel (Edge sans fenêtre, accélération graphique), jamais déduites d’une vidéo. Outils : `scripts/design/vitesse.ts`, `scripts/design/fps.ts`.
- **Mesures de Brume douce** (19/11/2026) : LCP 724 ms, CLS 0, INP 72 ms ; JavaScript 163 Ko avant le chargement, 136 Ko de 3D chargés après ; 3D 211 images par seconde à l’ordinateur, 214 au téléphone (au plus bas 154).
- **Pièges connus de la 3D** : un matériau transparent visible des deux côtés se dessine en une passe (`forceSinglePass`) ; une feuille de style commune s’importe une seule fois (`specs/001-sovermap/pieges-connus.md`, 25 à 27).

## 14. Liste de livraison de toute PR d’interface

1. `npm run check` vert (lint dont `lint:design`, types, tests, `scan:prive`).
2. Aucun défilement horizontal de 360 à 1920 px ; Edge, Firefox et WebKit ; axe sans violation sérieuse ni critique ; console sans erreur ; aucune requête vers un autre domaine.
3. Contrastes mesurés, sur l’image si la couleur passe par la 3D ou une image.
4. Premier écran vérifié (1707 × 799, 1920 × 1080, 360 × 732) si l’accueil change.
5. Budgets du § 13 mesurés si la page porte la 3D ou change de poids.
6. Tout changement visible du design : trois propositions vraiment différentes, montrées en planches d’images (`scripts/design/planches.ts`), et en vidéo seulement quand il faut juger un mouvement (`scripts/design/filmer.ts`, vérifiée image par image par `scripts/design/verifier-film.ts`) ; une seule question au propriétaire.
7. Les mesures datées dans `journal-design.md` ; cette charte mise à jour si une règle change.

Les outils de `scripts/design/` donnent leur mode d’emploi en tête de fichier. Ils mesurent le build de production local (port 3100) et écrivent leurs mesures hors du dépôt, dans le dossier temporaire. Sous Git Bash, on les lance avec `MSYS_NO_PATHCONV=1` (pièges 17 et 31 de `specs/001-sovermap/pieges-connus.md`).
