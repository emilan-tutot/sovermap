# Listes officielles des noms de domaine des organismes publics (copies nettoyées)

Chaque fichier `liste-dinum-AAAA-MM-JJ.csv` est une copie nettoyée de la liste des noms de domaine des organismes publics tenue par la DINUM, à la date de son nom. Deux colonnes seulement : `name` (le nom, en minuscules ; un nom accentué sous sa forme ASCII, dite punycode, comme le DNS le demande) et `type` (le type d'organisme donné par la liste). Toutes les autres colonnes sont écartées à la lecture, et la colonne `sources`, qui nomme des contributeurs, n'est jamais écrite nulle part (brief du chantier 2, C.5). Le nettoyage : `pipeline/cli/nettoyer-liste.ts`.

| Fichier | Origine | Lignes lues | Noms gardés |
|---|---|---|---|
| `liste-dinum-2024-12-11.csv` | Copie archivée sur GitHub (Etalab), `domains.csv`, dernier envoi du 11/12/2024 ; lue une seule fois, en mémoire, le 20/11/2026 | 103 398 | 103 271 |
| `liste-dinum-2026-11-19.csv` | Liste à jour de la forge de l'ADULLACT (branche `master`, commit `aeeec2e9`, fichiers du 19/11/2026), téléchargée à la main par le propriétaire le 20/11/2026 | 121 927 | 121 867 |

- Copie de 2024 : 125 noms accentués ont été écartés à son unique lecture, par un contrôle de forme corrigé ensuite. La copie n'est pas relue (une seule lecture, règle du propriétaire). Ces noms restent mesurés s'ils figurent dans la liste à jour, qui les donne sous leur forme ASCII.
- Liste à jour : 58 lignes en moins, car le même nom accentué y figure sous ses deux écritures.
- Dans chaque liste, 2 noms (le domaine d'une commune et son `www.`) sont écartés à la main : ils contiennent un motif que le contrôle de vie privée du dépôt (`npm run scan:prive`) refuse. Ils ne sont ni mesurés ni publiés.
- Ensemble : 122 209 noms distincts. 102 929 sont dans les deux listes, 18 938 seulement dans la liste à jour et 342 seulement dans la copie de 2024.

**Licence** : Licence Ouverte 2.0 (Etalab) ; la forge affiche « etalab-2.0 ». **Attribution** : « Source : DINUM, liste des noms de domaine des organismes publics, version du <date>, Licence Ouverte 2.0 ». Voir `docs/sources.md`, fiches 1 et 2.
