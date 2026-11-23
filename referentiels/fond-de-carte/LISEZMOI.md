# ADMIN EXPRESS COG CARTO PE, édition 2026 (IGN) : copie épinglée (C.6)

Le fond de carte des départements (`docs/sources.md`, fiche 53, décision « retenue »), lu le 23/11/2026 par le service WFS de la Géoplateforme, avec le téléchargeur poli du projet (`robots.txt` de data.geopf.fr lu d'abord : 404, rien d'interdit).

| Fichier | Couche | Entités | Réponse du service | Copie |
|---|---|---|---|---|
| `departements-2026.geojson` | `ADMINEXPRESS-COG-CARTO-PE.2026:departement` | 101 : 96 de métropole, 971, 972, 973, 974 et 976 | 1 778 584 octets, SHA-256 `70edeac239cb3363edda6e045a2650c7b4bdeb211aca09a1b453969b466aba2c` | 1 763 198 octets |

- Propriétés gardées : `code_insee`, `code_insee_de_la_region`, `nom_officiel`. Les autres (`cleabs`, `code_siren`, le nom en capitales) ne sont pas gardées. Coordonnées telles que reçues (WGS 84, longitude d'abord), un département par ligne ; lues à la frontière (`pipeline/carte.ts`).
- Les régions ne sont pas copiées : chaque département porte le code de sa région, et les frontières des régions se tirent de celles des départements ; ainsi aucune frontière ne diffère entre deux couches.
- Topologie vérifiée le 23/11/2026 : sur 41 812 arêtes, 27 755 sont partagées par exactement deux départements (frontières intérieures) et 14 057 par un seul (côtes et frontières du pays) ; aucune ne l'est par trois.
- Le dessin servi par le site, `lib/carte/fond-de-carte.json`, se tire de cette copie par `npx tsx pipeline/cli/fond-de-carte.ts deriver` : Lambert-93 pour la métropole, chaque département d'outre-mer dans son encart, à sa propre échelle ; chaque frontière simplifiée une seule fois pour les deux voisins, donc aucun trou entre eux. Un test vérifie que le fichier est, à l'octet près, celui que l'outil redonne (`pipeline/carte.test.ts`).
- Une édition nouvelle vient par PR, comme la Public Suffix List : changer le millésime dans `pipeline/cli/fond-de-carte.ts`, puis `npx tsx pipeline/cli/fond-de-carte.ts epingler` et `deriver`. Jamais la couche `.LATEST`, qui change sans prévenir.

**Licence** : Licence Ouverte 2.0 (`lov2`). **Attribution**, partout où la carte s'affiche : « Fond de carte : IGN, ADMIN EXPRESS COG CARTO PE, édition novembre 2026, Licence Ouverte 2.0 ; contours simplifiés par Sovermap ».
