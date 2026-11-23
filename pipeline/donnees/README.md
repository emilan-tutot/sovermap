# Données de Sovermap — en préparation

**Ne pas citer.** Ces données sont en préparation : le site Sovermap n'est pas encore ouvert, la méthode est provisoire et les chiffres peuvent changer sans préavis. Elles deviendront citables à l'ouverture du site, avec une référence prête à copier.

Cette branche est écrite par les workflows de Sovermap sur GitHub Actions : chaque jour par la collecte automatique (workflow « Collecte »), et chaque semaine (ou lors d'une relance à la main), pour `territoires/annuaire/` seulement, par le workflow « Annuaire local ». Personne ne la modifie à la main, et son historique ne se réécrit jamais.

## Ce qu'elle contient

- `etat.json` : la date et l'heure de la collecte, les versions de la liste, des référentiels et de la méthode, l'état et la date de chaque source, la qualité de la collecte (couverture, échecs, témoins, contrôles), les sommes de contrôle de chaque dossier, et `"statut": "preparation"`.
- `noms/` : un enregistrement par nom mesuré (état DNS, chaîne CNAME, réseaux, CDN, exploitants, catégorie, niveau de confiance), en fragments de 8 Ko au plus.
- `domaines/` : un enregistrement par domaine enregistré (nom web, périmètre, zone, serveurs de noms, messagerie), en fragments de 8 Ko au plus.
- `index/` : les numéros d'AS, les exploitants (avec leur chaîne de propriété et le contrôle du sommet), les pays des sièges, les organismes, les ministères et la liste des domaines enregistrés (`index/domaines.json` : 1 pour le périmètre « État », puis le jour du dernier changement de sa page, celui où son enregistrement publié ou celui de son nom web a changé) ; et les territoires : `index/territoires.json` (chaque région et chaque département, avec son nom officiel, son nombre de domaines et les domaines de son conseil) et `index/territoires/<département>.json` (ses communes et ses groupements de communes, chacun avec ses domaines et leur catégorie), rangés par code, jamais par part hors UE.
- `agregats/chiffres.json` : les chiffres, provisoires (« en préparation ») ; `agregats/historique.json` : les mêmes chiffres jour après jour, avec la version de la méthode et les jours de règles nouvelles.
- `journal/` : les changements d'hébergement confirmés par deux collectes concordantes, jour par jour. Un changement de liste, de référentiel ou de méthode n'y entre jamais.
- `territoires/annuaire/` : l'annuaire local de l'administration (DILA), tel que Sovermap le garde : `guichets.jsonl`, un guichet par ligne (nom, type, noms d'hôte de ses sites, SIREN, SIRET, commune, code postal, date de sa dernière modification ; rien sur les personnes), et `copie.json` (les fichiers de la copie lue, avec leurs sommes SHA-256, leurs commits et leurs dates, le nombre de guichets, la date de l'état de l'annuaire, l'heure de lecture).
- `schemas/` : les schémas JSON des fragments et du journal.

Le fragment d'un nom est `noms/<aa>/<bb>.json`, où `aabb` sont les quatre premiers chiffres hexadécimaux de l'empreinte SHA-256 du nom (de même pour `domaines/`). Un fragment qui dépasserait 8 Ko est découpé en parties : `<bb>.json`, puis `<bb>.1.json`, `<bb>.2.json`…, la première disant combien il y en a (`parties`). Chaque dossier a ses sommes de contrôle (`sommes.json`). Les heures, les durées de vie (TTL) et les adresses exactes ne sont pas ici : elles iront dans les archives mensuelles (Releases `donnees-AAAA-MM`).

Un enregistrement marqué `tronque` a des listes raccourcies (il dépassait 3 Ko). Un enregistrement marqué `reduit` n'a pas pu être construit ce jour-là : il ne donne que son identité, et il ne remplace jamais un enregistrement déjà publié.

## Méthode

Voir `docs/methode.md` sur la branche `main`. La mesure ne pose que des questions DNS : aucune requête vers les sites mesurés, aucune géolocalisation d'adresse IP. Le point de mesure est un serveur de GitHub Actions.

## Licence et attributions

- Données : Licence Ouverte 2.0 (Etalab), titulaire « Les contributeurs de Sovermap », sauf les noms d'organisations tirés de la base du RIPE NCC, qui restent soumis aux RIPE Database Terms and Conditions.
- Attributions : DINUM (liste des noms de domaine des organismes publics), DILA (Référentiel de l'organisation administrative de l'État), SIG (Observatoire de l'écosystème numérique de l'État – Sites internet), ministère de l'Enseignement supérieur, de la Recherche et de l'Espace (Principaux établissements d'enseignement supérieur), RIPE NCC (base du RIPE), registres Internet régionaux, IPtoASN (PDDL 1.0), Public Suffix List (MPL 2.0) ; le texte exact et les dates des fichiers : `docs/sources.md` sur la branche `main`, et `etat.json`.
- Annuaire local (`territoires/annuaire/`) : « Source : Service-Public.gouv.fr / DILA — Annuaire de l'administration, Base de données locales, fichier all_latest.tar.bz2 (https://lecomarquage.service-public.gouv.fr/donnees_locales_v4/all_latest.tar.bz2) dans son état du `etat`, repris dans la copie retraitée par la DINUM (https://huggingface.co/datasets/AgentPublic/local-administrations-directory, fichiers `local_administrations_directory_part_0.parquet` et `…_part_1.parquet` à leur `commit`, copie du `date`) — Licence Ouverte 2.0. » La date de l'état (`etat`), les commits et les dates de la copie sont dans `territoires/annuaire/copie.json`.
