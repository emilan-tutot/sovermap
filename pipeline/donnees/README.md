# Données de Sovermap — en préparation

**Ne pas citer.** Ces données sont en préparation : le site Sovermap n'est pas encore ouvert, la méthode est provisoire et les chiffres peuvent changer sans préavis. Elles deviendront citables à l'ouverture du site, avec une référence prête à copier.

Cette branche est écrite chaque jour par la collecte automatique de Sovermap (GitHub Actions, workflow « Collecte »). Personne ne la modifie à la main, et son historique ne se réécrit jamais.

## Ce qu'elle contient

- `etat.json` : la date et l'heure de la collecte, les versions de la liste, des référentiels et de la méthode, l'état et la date de chaque source, la qualité de la collecte (couverture, échecs, témoins, contrôles), les sommes de contrôle de chaque dossier, et `"statut": "preparation"`.
- `noms/` : un enregistrement par nom mesuré (état DNS, chaîne CNAME, réseaux, CDN, exploitants, catégorie, niveau de confiance), en fragments de 8 Ko au plus.
- `domaines/` : un enregistrement par domaine enregistré (nom web, périmètre, zone, serveurs de noms, messagerie), en fragments de 8 Ko au plus.
- `index/` : les numéros d'AS, les exploitants, les pays, les organismes et les ministères.
- `agregats/chiffres.json` : les chiffres, provisoires (« en préparation »).
- `journal/` : les changements d'hébergement confirmés par deux collectes concordantes, jour par jour. Un changement de liste, de référentiel ou de méthode n'y entre jamais.
- `schemas/` : les schémas JSON des fragments et du journal.

Le fragment d'un nom est `noms/<aa>/<bb>.json`, où `aabb` sont les quatre premiers chiffres hexadécimaux de l'empreinte SHA-256 du nom (de même pour `domaines/`). Un fragment qui dépasserait 8 Ko est découpé en parties : `<bb>.json`, puis `<bb>.1.json`, `<bb>.2.json`…, la première disant combien il y en a (`parties`). Chaque dossier a ses sommes de contrôle (`sommes.json`). Les heures, les durées de vie (TTL) et les adresses exactes ne sont pas ici : elles iront dans les archives mensuelles (Releases `donnees-AAAA-MM`).

Un enregistrement marqué `tronque` a des listes raccourcies (il dépassait 3 Ko). Un enregistrement marqué `reduit` n'a pas pu être construit ce jour-là : il ne donne que son identité, et il ne remplace jamais un enregistrement déjà publié.

## Méthode

Voir `docs/methode.md` sur la branche `main`. La mesure ne pose que des questions DNS : aucune requête vers les sites mesurés, aucune géolocalisation d'adresse IP. Le point de mesure est un serveur de GitHub Actions.

## Licence et attributions

- Données : Licence Ouverte 2.0 (Etalab), titulaire « Les contributeurs de Sovermap », sauf les noms d'organisations tirés de la base du RIPE NCC, qui restent soumis aux RIPE Database Terms and Conditions.
- Attributions : DINUM (liste des noms de domaine des organismes publics), DILA (Référentiel de l'organisation administrative de l'État), SIG (Observatoire de l'écosystème numérique de l'État – Sites internet), ministère de l'Enseignement supérieur, de la Recherche et de l'Espace (Principaux établissements d'enseignement supérieur), RIPE NCC (base du RIPE), registres Internet régionaux, IPtoASN (PDDL 1.0), Public Suffix List (MPL 2.0) ; le texte exact et les dates des fichiers : `docs/sources.md` sur la branche `main`, et `etat.json`.
