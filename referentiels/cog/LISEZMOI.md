# Code officiel géographique au 01/01/2026 (INSEE) : copie épinglée (C.6)

Les codes et les noms officiels des communes, des départements, des régions et de l'outre-mer, base de tout rattachement territorial (`docs/sources.md`, fiche 52, décision « retenue » : copie annuelle épinglée, mise à jour par PR comme la Public Suffix List). Lus le 21/11/2026 par l'API tabulaire de data.gouv.fr, par pages de 200 lignes (www.insee.fr ferme ses fichiers `*.csv` aux robots), avec le téléchargeur poli du projet.

| Fichier | Fichier de l'INSEE | Lignes | Colonnes gardées |
|---|---|---|---|
| `communes-2026.csv` | `v_commune_2026.csv` | 37 496, dont 34 875 communes (`typecom` = `COM`) | `typecom`, `com`, `dep`, `reg`, `ctcd`, `libelle`, `comparent` |
| `departements-2026.csv` | `v_departement_2026.csv` | 101 | `dep`, `reg`, `cheflieu`, `libelle` |
| `regions-2026.csv` | `v_region_2026.csv` | 18 | `reg`, `cheflieu`, `libelle` |
| `ctcd-2026.csv` | `v_ctcd_2026.csv` (collectivités territoriales ayant les compétences départementales) | 100 | `ctcd`, `reg`, `cheflieu`, `libelle` |
| `comer-2026.csv` | `v_comer_2026.csv` (collectivités et territoires d'outre-mer) | 9 | `comer`, `libelle` |
| `communes-comer-2026.csv` | `v_commune_comer_2026.csv` (communes des collectivités d'outre-mer) | 95 | `com_comer`, `comer`, `libelle`, `nature_zonage` |

- Les colonnes gardées sont celles d'un rattachement : les codes, le nom officiel et les codes parents. Les noms en capitales, les cantons et les arrondissements départementaux ne sont pas gardés. Lignes triées ; aucune donnée personnelle.
- Piège : `communes-2026.csv` mêle communes (`COM`), arrondissements municipaux de Paris, Lyon et Marseille (`ARM`), communes déléguées (`COMD`) et associées (`COMA`), ces deux dernières avec leur commune de rattachement (`comparent`) : filtrer par `typecom`.

**Licence** : « Licence Ouverte / Open Licence » (`fr-lo`). **Attribution** : « Source : Insee, Code officiel géographique au 01/01/2026 (communes, départements, régions), Licence Ouverte ».
