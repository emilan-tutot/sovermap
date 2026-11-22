# Périmètre « État » : copies nettoyées des listes ouvertes (C.5)

Le périmètre « État » (décision D1, a2 ; `docs/methode.md`, § 3) réunit les domaines en `.gouv.fr`, les sites du Référentiel de la DILA (lu chaque jour), et ceux de deux listes ouvertes, copiées ici à une date donnée. Une copie nouvelle entre par PR ; c'est un changement de règles, jamais un déménagement (B.7 bis). La collecte lit la copie la plus récente de chaque source (`sig-AAAA-MM-JJ.csv`, `mesr-AAAA-MM-JJ.csv`).

| Fichier | Origine | Lignes lues | Lignes gardées |
|---|---|---|---|
| `sig-2026-11-01.csv` | Service d'information du Gouvernement (SIG), Observatoire de l'écosystème numérique de l'État – Sites internet, fichier « audience-liste-sites » de l'édition d'octobre 2026 (mis en ligne le 01/11/2026), lu le 21/11/2026 par l'API tabulaire de data.gouv.fr (fiche 5) | 742 | 742 |
| `mesr-2026-11-21.csv` | Ministère de l'Enseignement supérieur, de la Recherche et de l'Espace, « Principaux établissements d'enseignement supérieur », fichier CSV du 21/11/2026, lu le 21/11/2026 par l'API tabulaire de data.gouv.fr (fiche 8) | 245 | 152 |

- **SIG** : trois colonnes. `site` est le nom du site tel que le SIG le publie ; `ministere`, l'identifiant de sa tutelle ministérielle (15 valeurs ; ce sont les identifiants du Référentiel de la DILA, fiche 4, qui donne leurs noms : 15 sur 15 vérifiés le 21/11/2026) ; `type`, le type de site selon le SIG.
- **MESR** : seulement les établissements publics de l'État qui ont un site (152). Sont écartés les 85 établissements privés, et 8 établissements publics locaux : 7 écoles d'art constituées en établissements publics de coopération culturelle, dont le SIREN commence par 2 (celui des collectivités et de leurs établissements), et le CREPS de Toulouse (les CREPS sont passés aux régions en 2016). Le site d'un établissement hébergé sous le domaine d'un tiers (`www.ifao.egnet.net`) reste dans la copie, mais ce domaine est une plateforme tierce (`referentiels/plateformes-tierces.json`) : le site est sa propre unité, jamais « État ». Quatre colonnes : `site` (l'hôte de leur adresse web), `nom`, `siren` (deux numéros séparés par « ; » pour deux établissements, tels que publiés) et `type`.
- Aucune autre colonne n'est gardée : ni téléphone, ni adresse postale, ni compte de réseau social, ni aucun identifiant de personne.

**Licences** : SIG : Licence Ouverte 2.0 (`lov2`). MESR : Licence Ouverte (`fr-lo`) ; version 1 ou 2.0, l'obligation est la même : citer la source et la date.

**Attributions** :
- « Source : Service d'information du Gouvernement (SIG), Observatoire de l'écosystème numérique de l'État – Sites internet, mise à jour du 01/11/2026 — Licence Ouverte 2.0. »
- « Source : ministère de l'Enseignement supérieur, de la Recherche et de l'Espace, Principaux établissements d'enseignement supérieur, version du 21/11/2026 — Licence Ouverte. »

Voir `docs/sources.md`, fiches 5 et 8.
