# Registre des sources de Sovermap

Version du 18/11/2026 (chantier T1, partie A), mise à jour le 19/11/2026 avec les décisions de l'ARRÊT 1. Toutes les pages et API citées ont été lues le **18/11/2026**, sauf mention contraire.

## Règles

- **On ne retient que ce qu'on a le droit d'utiliser ET de republier sur un site public.** Dans le doute, on écarte, et on l'écrit.
- **Décisions possibles** :
  - **retenue** ;
  - **retenue en contrôle seulement** : elle sert à vérifier, jamais à classer seule ;
  - **écartée**, éventuellement « pour l'instant », avec ce qu'il faudrait pour la rouvrir ;
  - **en attente** : elle exige une adresse e-mail de contact (jamais d'adresse personnelle : il faudra une adresse sur sovermap.com), ou un relevé manuel.
- **Robots** :
  - jamais de contournement d'un `robots.txt`, d'une protection anti-robots, d'un CAPTCHA ou d'une limite de débit ;
  - le `robots.txt` est lu avant toute autre requête vers un hôte ;
  - l'agent utilisateur s'identifie sans adresse e-mail ;
  - les essais du cadrage (18/11/2026) ont utilisé `Sovermap-cadrage/0.1 (+https://sovermap.com)` ;
  - **depuis le 19/11/2026** (décision du propriétaire), et tant que sovermap.com n'est pas branché, l'agent renvoie au dépôt : `Sovermap-bot/<version> (+https://github.com/<compte>/sovermap)`. Le nom du compte vient d'une variable de configuration. Une fois le domaine branché (T8) : `Sovermap-bot/<version> (+https://sovermap.com)`.
- **Données personnelles** : aucune n'entre dans les données de Sovermap. Plusieurs sources en contiennent ; elles sont signalées fiche par fiche.

## Tableau récapitulatif

| # | Source | Ce qu'on en tire | Licence ou conditions | Accès automatique | Décision |
|---|---|---|---|---|---|
| 1 | Liste des noms de domaine des organismes publics (DINUM, forge de l'ADULLACT) | La liste de référence à jour | etalab-2.0 (affichée sur la forge, relevé humain) | **Non** : robots.txt et anti-robots | **Retenue en relevé manuel** (le propriétaire, au plus une fois par trimestre) ; accès automatique en attente |
| 2 | Copie archivée de cette liste (GitHub, Etalab) | 103 398 noms et leur type, au 11/12/2024 | Licence Ouverte 2.0 | Oui | **Retenue** (base datée) |
| 3 | API Annuaire de l'administration (DILA) | `site_internet` des services | Licence Ouverte ; service API : licence non renseignée | **Non** : `Disallow: /api/` | Écartée comme canal |
| 4 | Référentiel de l'organisation administrative de l'État (DILA) | 7 915 services, 1 135 noms d'hôtes, hiérarchie | Licence Ouverte 2.0 | Oui (fichier quotidien) | **Retenue** |
| 5 | Observatoire de l'écosystème numérique de l'État – sites (SIG) | 742 sites de l'État et leur tutelle (identifiant) | Licence Ouverte 2.0 | Oui, par l'API tabulaire de data.gouv.fr | **Retenue** |
| 6 | Opérateurs de l'État (jaune du PLF 2026) | 431 opérateurs : noms, statuts, missions | Licence Ouverte 2.0 (déclarée par le déposant) | Oui, par l'API tabulaire | Contrôle seulement |
| 7 | Relevés d'août 2026 (3 581 domaines publics) | IPv6, DNSSEC, security.txt | PDDL | Oui, par l'API tabulaire | Contrôle seulement |
| 8 | Principaux établissements d'enseignement supérieur (MESR) | 245 établissements, 243 sites, SIREN | Licence Ouverte | Oui, par l'API tabulaire | **Retenue** |
| 9 | Établissements scolaires (Éducation nationale) | Classement (aucun site web) | Licence Ouverte 2.0 | Oui, par l'API tabulaire | Contrôle seulement |
| 10 | BANATIC (intercommunalités, DGCL) | Nature juridique, 790 sites sur 9 578 | Licence Ouverte 2.0 | Oui, par l'API tabulaire | Contrôle seulement |
| 11 | FINESS (santé) | Classement (aucun site web) | Licence Ouverte 2.0 | Non testé (fichier de 52 Mo) | Écartée pour l'instant |
| 12 | Résolveur local Knot Resolver (CZ.NIC) | Réponses DNS validées | Logiciel libre (licence GPL) | — | **Retenu** (outil de mesure) |
| 13 | Quad9 | Contrôle DNS | Gratuit ; contact avant un gros volume | Oui, petit volume | Contrôle seulement |
| 14 | Cloudflare 1.1.1.1 | Contrôle DNS (témoins) | Conditions générales de Cloudflare | Oui, petit volume | Contrôle seulement |
| 15 | Google Public DNS (API JSON) | Essais ECS (point de mesure) | Conditions des API Google | Oui, petit volume | Contrôle seulement |
| 16 | DNS4EU | — | Usage personnel seulement | — | **Écartée** |
| 17 | FDN | — | DoT et DoH seulement depuis l'extérieur | — | Écartée pour l'instant |
| 18 | IPtoASN | IP → AS, pays d'enregistrement | PDDL 1.0 | Oui (1 fichier par jour) | **Retenue** |
| 19 | RIPE RIS (riswhoisdump) | Préfixe → AS d'origine | Conditions du RIPE NCC (pas de redistribution) | Oui | Contrôle seulement |
| 20 | RIPEstat | Contrôles | Pas de redistribution (art. 3.3) | Oui (moins de 1 000 par jour) | Contrôle seulement |
| 21 | Fichiers de délégation des 5 RIR | Pays d'enregistrement des AS | APNIC et AFRINIC : libres ; les autres : rien d'écrit | Oui | **Retenue** |
| 22 | Fichiers « split » du RIPE | AS → organisation (région RIPE) | « insubstantial part » seulement | Oui | **Retenue, sous réserve** |
| 23 | RDAP des 5 RIR | AS → organisation | Pas de republication (ARIN, APNIC, AFRINIC) | Oui | Contrôle seulement |
| 24 | Team Cymru | IP → AS (troisième avis) | Rien d'écrit | Oui (DNS) | Contrôle seulement |
| 25 | DB-IP « IP to ASN Lite » | Noms d'AS | CC BY 4.0 | Case « I agree » | Écartée (choix du propriétaire, 19/11/2026) |
| 26 | RouteViews, CAIDA, PeeringDB, IPinfo, bgp.tools, bgp.he.net, BGPKIT, IHR | — | Voir la fiche | — | Écartées ou en attente |
| 27 | Listes officielles des CDN (Cloudflare, CloudFront, Fastly, Azure) | Indicateur « CDN » | Pas de licence : listes non republiées | Oui | **Retenue** |
| 28–29 | Suffixes CNAME et AS des CDN | Reconnaissance des CDN | Faits documentés par les fournisseurs | — | **Retenue** (liste tenue à la main) |
| 30 | cdncheck | — | Données d'origine mixte | — | Écartée |
| 31 | GLEIF | LEI, maison mère ultime | CC0 | Oui (60 requêtes par minute) | **Retenue** |
| 32 | API Recherche d'entreprises (DINUM, données Sirene) | Siège, nature juridique | Licence Ouverte 2.0 (données) | Oui (7 par seconde et par IP) | **Retenue** |
| 33 | Fichiers stock Sirene (INSEE) | Idem, en masse | Licence Ouverte 2.0 | **Non** : robots.txt d'insee.fr et de static.data.gouv.fr | Écartée pour l'instant |
| 34 | API Sirene officielle (INSEE) | Idem | Licence Ouverte 2.0 | Compte exigé | Écartée pour l'instant |
| 35 | RNE (INPI) | Registre des entreprises | Licence INPI | Compte exigé | Écartée pour l'instant |
| 36 | SEC EDGAR | Filiales des groupes américains | Information publique | E-mail exigé dans l'agent utilisateur | En attente |
| 37 | Companies House | Sociétés britanniques | Aucune règle d'usage écrite | Clé exigée pour l'API | Écartée pour l'instant |
| 38 | Wikidata | Pays du siège, maison mère (indices) | CC0 | **Non** : robots.txt (SPARQL, API) | Contrôle seulement (lecture manuelle) |
| 39 | Rapports annuels des groupes | Confirmation des maisons mères | Faits seulement, aucune reproduction | Au cas par cas | **Retenue** (méthode) |
| 40 | Liste SecNumCloud de l'ANSSI | Offres qualifiées, par société | Non vérifiée | **Non** : anti-robots | En attente (relevé manuel daté) |
| 41 | Natural Earth | Fond de carte | Domaine public | Oui | **Retenue** |
| 42 | Public Suffix List (Mozilla et contributeurs) | Le domaine enregistré de chaque nom | MPL 2.0 | Oui (copie datée épinglée, mise à jour par PR) | **Retenue** (outil de calcul) |

## Constats qui valent pour tout le projet

1. **Beaucoup de portails publics ferment leurs fichiers aux robots** (robots.txt lus le 18/11/2026) :

| Hôte | Règle | Conséquence |
|---|---|---|
| gitlab.adullact.net | `Disallow: /api/v*`, `/*/raw`, `/*/archive/`, `/*/repository/archive*`, `/*/*.git$`, `/*/*.git/*` ; page anti-robots (Anubis) | La liste de référence à jour n'est pas accessible aux robots |
| static.data.gouv.fr | `Disallow: /resources` | Aucun fichier hébergé par data.gouv.fr ne se télécharge en automatique |
| www.data.gouv.fr | `Disallow: /api/1/datasets/r/` (liens « dernière version ») ; l'API de métadonnées reste ouverte | On lit les métadonnées par l'API |
| tabular-api.data.gouv.fr | Pas de robots.txt (404) | **Voie retenue** pour lire les fichiers CSV de data.gouv.fr, ligne par ligne |
| Portails Opendatasoft (API Annuaire, data.education, data.enseignementsup) | `Disallow: /api/`, `Disallow: /explore/dataset/*/download` | API et exports fermés aux robots |
| echanges.dila.gouv.fr | Pas de robots.txt (404) | Fichiers de la DILA lisibles |
| insee.fr | `Disallow` sur `*.zip`, `*.csv`, `*.xls`, `*.xlsx` | Fichiers de l'INSEE fermés aux robots |
| cyber.gouv.fr, budget.gouv.fr | Page anti-robots (Incapsula), même pour `robots.txt` | Lecture manuelle seulement |
| query.wikidata.org, www.wikidata.org | `Disallow: /sparql`, `/w/`, `/wiki/Special:` | Lecture manuelle des pages seulement |

2. **La voie propre pour data.gouv.fr** est double :
   - l'API de métadonnées (`/api/1/datasets/<id>/`) pour la licence, les dates et les ressources ;
   - l'API tabulaire (`tabular-api.data.gouv.fr`) pour le contenu des CSV.
   C'est le canal programmatique officiel de data.gouv.fr, et aucun robots.txt ne le ferme. Il ne couvre pas les gros fichiers ni les archives compressées.
3. **Données personnelles présentes dans des sources** (à ne jamais recopier) :
   - la colonne `sources` de la liste DINUM (noms de contributeurs) ;
   - le Référentiel de la DILA (noms, fonctions, courriels et téléphones de responsables) ;
   - BANATIC (présidents) ;
   - l'API Recherche d'entreprises (dirigeants, élus) : toujours `minimal=true` ;
   - le RNE et le fichier britannique des personnes qui contrôlent une société.
4. **Écarts pendant les essais du 18/11/2026**, consignés par honnêteté. Rien n'a été contourné.
   - Deux requêtes vers gitlab.adullact.net (API et `git ls-remote`) sont parties dans la même commande que la lecture de son robots.txt. Elles ont reçu la page anti-robots.
   - Un fichier CSV de 188 Ko a été téléchargé sur static.data.gouv.fr avant la lecture complète de son robots.txt. Il a été supprimé sans être ouvert, et aucun chiffre n'en vient.
   - Deux requêtes consécutives vers echanges.dila.gouv.fr ont pu être espacées de moins d'une seconde.
   - Une boucle de redirections sur annuaire-entreprises.data.gouv.fr a été suivie jusqu'à 50 sauts, deux fois, sans contenu.
   - Une liste de fichiers de leidata.gleif.org (876 Ko) a été demandée dans la même commande que la lecture de son robots.txt (qui répond 403).
   - Une requête HEAD est partie vers www.gstatic.com avant la lecture de son `Disallow: /`. Aucun GET n'a suivi.
   - Le texte de la Licence Ouverte 2.0 a été lu par un lien d'etalab.gouv.fr qui redirige vers static.data.gouv.fr/resources, chemin fermé aux robots.
   - Deux requêtes vers assemblee-nationale.fr ont été espacées d'environ 28 s, au lieu des 30 s demandées par son robots.txt.
   - Les bases juridiques de la DILA (LEGI, JORF, CNIL, environ 3 Go) ont été téléchargées une fois. Elles sont publiées pour ce téléchargement en masse, sur un serveur sans robots.txt, et ont été supprimées après lecture.
   - **Parade** : la collecte lit le robots.txt, l'applique, puis seulement télécharge. Elle suit au plus 5 redirections et espace ses requêtes d'au moins une seconde par hôte.

## A. Domaines et organismes

### 1. Liste des noms de domaine des organismes publics (DINUM), sur la forge de l'ADULLACT
- **Producteur** : Direction interministérielle du numérique (DINUM).
- **Adresse** : https://gitlab.adullact.net/dinum/noms-de-domaine-organismes-secteur-public
- **Ce qu'on en tire** : la liste de référence à jour (nom, type, provenance).
- **Licence ou conditions** :
  - etalab-2.0, d'après la forge, vue par le propriétaire dans un navigateur le 18/11/2026. Non relue par un robot.
  - L'ancienne copie porte la Licence Ouverte 2.0 (fiche 2).
- **Limites de débit** : sans objet.
- **Attribution à afficher** : « Source : DINUM, liste des noms de domaine des organismes publics, version du <date>, Licence Ouverte 2.0 ».
- **Téléchargement automatique testé** : **non, impossible sans contournement.**
  - Le robots.txt (https://gitlab.adullact.net/robots.txt, HTTP 200, 3 230 octets) ferme aux robots : `/api/v*`, `/*/raw`, `/*/archive/`, `/*/repository/archive*`, `/*/*.git$` et `/*/*.git/*`.
  - Une page « Making sure you're not a bot! » (Anubis, preuve de travail) répond aux clients automatiques.
  - Date du dernier changement et nombre de domaines de la version actuelle : **non vérifiés**. Le propriétaire a lu « dernière synchronisation il y a environ un mois » le 18/11/2026.
- **Décision : retenue en relevé manuel** (20/11/2026) ; **accès automatique : en attente.**
  - Relevé du 20/11/2026 : fichier `domains.csv` de la branche `master` (commit `aeeec2e9cd70b5dbfe86620321e6958d807cb1d0`, fichiers du 19/11/2026), téléchargé dans son navigateur par le propriétaire ; colonnes lues d'abord (`name`, `http_status`, `https_status`, `SIREN`, `type`, `sources`, `script`) ; seules `name` et `type` sont gardées, la colonne `sources` (noms de contributeurs) n'est écrite nulle part. Copie nettoyée : `referentiels/listes/liste-dinum-2026-11-19.csv` (121 927 lignes lues, 121 869 noms).
  - Pour un accès automatique, il faut une copie ouverte aux robots, par exemple une ressource lisible par l'API tabulaire de data.gouv.fr, ou l'accord de la DINUM.
  - Cette demande passera par une adresse de contact sur sovermap.com (plus tard).
  - D'ici là, la fiche 2 sert de base.
  - **Relevé manuel** (décision du propriétaire, 19/11/2026) : le propriétaire peut télécharger lui-même la liste à jour dans son navigateur, sous licence etalab-2.0, une fois par trimestre au plus. Chaque fichier est daté et versé dans les données (T3).

### 2. Copie archivée de la liste, sur GitHub (Etalab)
- **Producteur** : Etalab (DINUM) et contributeurs.
- **Adresse** : https://github.com/etalab/noms-de-domaine-organismes-publics
  - Dépôt archivé ; dernier envoi le 11/12/2024, d'après l'API GitHub.
  - Fichier : https://raw.githubusercontent.com/etalab/noms-de-domaine-organismes-publics/master/domains.csv
- **Ce qu'on en tire** : 103 398 noms distincts, avec le type d'organisme (Commune 36 597 ; Gouvernement 29 502, tous en .gouv.fr ; vide 13 692 ; Collectivité 11 953 ; Établissement scolaire 6 483 ; EPCI 2 605…).
  - Ce sont des noms d'hôtes : de 2 à 15 étiquettes, soit environ 34 000 domaines enregistrés.
  - Le SIREN n'est rempli que sur une ligne.
- **Licence ou conditions, mot pour mot** :
  - le fichier `LICENCE.md` s'intitule « LICENCE OUVERTE 2.0/OPEN LICENCE 2.0 » et concède la réutilisation « à des fins commerciales ou non » ;
  - le README commence par : « ⚠️ Ce dépôt est désormais maintenu sur [la forge de l'ADULLACT](https://gitlab.adullact.net/dinum/noms-de-domaine-organismes-secteur-public). »
- **Limites de débit** : aucune annoncée. Un seul téléchargement suffit (le dépôt est figé).
- **Attribution à afficher** : « Source : DINUM / Etalab, liste des noms de domaine des organismes publics, copie archivée du 11/12/2024, https://github.com/etalab/noms-de-domaine-organismes-publics, Licence Ouverte 2.0 ».
- **Téléchargement automatique testé** : **oui**.
  - Commande : `curl -A 'Sovermap-cadrage/0.1 (+https://sovermap.com)' <adresse du fichier>` ; résultat : HTTP 200, 11 991 600 octets.
  - raw.githubusercontent.com n'a pas de robots.txt (404).
- **Données personnelles** : la colonne `sources` contient des noms de personnes. Elle n'est jamais reprise : on garde seulement `name` et `type`.
- **Décision : retenue**, comme base datée (« copie du 11/12/2024 »), complétée par les fiches 4, 5 et 8.

### 3. API Annuaire de l'administration et des services publics (DILA)
- **Producteur** : Direction de l'information légale et administrative (DILA), sur la plateforme Opendatasoft.
- **Adresse** : https://api-lannuaire.service-public.gouv.fr/ (fiche : https://www.data.gouv.fr/dataservices/api-annuaire-de-ladministration-et-des-services-publics)
- **Ce qu'on en tire** : coordonnées et champ `site_internet` des services nationaux et des guichets locaux.
- **Licence ou conditions, mot pour mot** :
  - le service API n'a pas de licence renseignée : `"license": null` (https://www.data.gouv.fr/api/1/dataservices/672cf645e35d4f6741f6bfa6/) ;
  - les deux jeux qu'il expose : « Les données sont réutilisables gratuitement sous licence ouverte v2.0 » et « Les réutilisateurs s’obligent à mentionner : * la paternité des données ( Service-Public.gouv.fr /DILA ) ; * l’url d’accès longue de téléchargement ; * le nom du fichier téléchargé ainsi que la date du fichier. » (https://www.data.gouv.fr/api/1/datasets/57343feb88ee3823b0d1b934/) ;
  - service-public.gouv.fr : « La réutilisation des informations mises à disposition sur data.gouv.fr est libre sous réserve de mentionner la source et la date de mise à jour de l'information. » (https://www.service-public.gouv.fr/P10004).
- **Limites de débit** : non documentées (`rate_limiting: null`).
- **Téléchargement automatique testé** : **non**. Son robots.txt (HTTP 200) porte `Disallow: /api/` et `Disallow: /explore/dataset/*/download`. Aucun appel n'a été fait.
  - L'export en masse de la base locale (`lecomarquage.service-public.gouv.fr/donnees_locales_v4/all_latest.tar.bz2`) : 366 264 179 octets, mis à jour le 18/11/2026 (requête HEAD seulement). Le robots.txt de cet hôte répond 403 : le statut de cet accès n'est pas tranché.
- **Décision : écartée comme canal d'appel.** Les données nationales viennent du Référentiel (fiche 4). La base locale (mairies) reste à ouvrir, avec l'accord de la DILA, plus tard.

### 4. Référentiel de l'organisation administrative de l'État (DILA)
- **Producteur** : DILA.
- **Adresse** : https://echanges.dila.gouv.fr/OPENDATA/RefOrgaAdminEtat/FluxAnneeCourante/dila_refOrga_admin_Etat_fr_latest.zip (jeu : https://www.data.gouv.fr/datasets/referentiel-de-lorganisation-administrative-de-letat)
- **Ce qu'on en tire** :
  - 7 915 services centraux de l'État, dont 7 712 avec un `site_internet` ;
  - 1 135 noms d'hôtes, dont 213 en .gouv.fr ;
  - type d'organisme, SIREN (418), et la hiérarchie : la tutelle se retrouve en remontant l'arbre.
  - Seulement 46 services déconcentrés : les préfectures et directions départementales viennent d'ailleurs (fiches 2 et 5).
- **Licence ou conditions, mot pour mot** : « Les données sont réutilisables gratuitement sous licence ouverte v2.0. » ; « Le réutilisateur s’oblige à prendre en compte les demandes de mise à jour de données publiées ponctuellement par la DILA dans le forum de discussion du jeu de données sur data.gouv.fr. » (https://www.data.gouv.fr/api/1/datasets/57343feb88ee3823b0d1b934/).
- **Limites de débit** : aucune annoncée. Un téléchargement par jour (3,2 Mo) suffit.
- **Attribution à afficher** : « Source : Service-Public.gouv.fr / DILA — Référentiel de l'organisation administrative de l'État, fichier dila_refOrga_admin_Etat_fr_<AAAAMMJJ>.zip du <date>, <adresse longue> — Licence Ouverte. »
- **Téléchargement automatique testé** : **oui**. Pas de robots.txt (404). HTTP 200, 3 174 217 octets, `Last-Modified: Wed, 18 Nov 2026 03:32:03 GMT`. Un fichier par jour ouvré.
- **Données personnelles** : noms, fonctions, courriels et téléphones de responsables. Jamais recopiés.
- **Décision : retenue.**

### 5. Observatoire de l'écosystème numérique de l'État – Sites internet (SIG)
- **Producteur** : Service d'information du Gouvernement (SIG).
- **Adresse** : https://www.data.gouv.fr/datasets/observatoire-de-lecosysteme-numerique-de-letat-sites-internet
- **Ce qu'on en tire** :
  - 742 sites dans la version d'octobre 2026, dont 370 en .gouv.fr ;
  - type de site, et tutelle ministérielle sous forme d'identifiant (15 valeurs), sans table de noms dans les fichiers ouverts.
  - La description du jeu (470 sites) est périmée.
- **Licence ou conditions, mot pour mot** : « Licence Ouverte / Open Licence version 2.0 » (`lov2`, https://www.data.gouv.fr/api/1/datasets/669e12f813859414f2fff36e/).
- **Limites de débit** : aucune annoncée. Des réponses 302 vides ont été vues par moments ; rejouées 2 à 3 secondes plus tard, elles ont abouti.
- **Attribution à afficher** : « Source : Service d'information du Gouvernement (SIG), Observatoire de l'écosystème numérique de l'État – Sites internet, mise à jour du <date> — Licence Ouverte 2.0. »
- **Téléchargement automatique testé** : **oui**, par l'API tabulaire (`tabular-api.data.gouv.fr/api/resources/<id>/data/`, 15 pages de 50 lignes, `meta.total` = 742). Le fichier lui-même est sur static.data.gouv.fr, fermé aux robots.
- **Décision : retenue.** La correspondance identifiant → nom de ministère reste à établir (le site source répond 403 aux robots : non vérifié).

### 6. Opérateurs de l'État (annexe « jaune » du projet de loi de finances 2026)
- **Producteur** : l'État (direction du budget) ; la copie ouverte est déposée par un compte individuel sur data.gouv.fr.
- **Adresse** : https://www.data.gouv.fr/datasets/projet-de-loi-de-finances-pour-2026-plf-2026-jaune-operateurs-de-letat-liste-des-operateurs-et-categories
- **Ce qu'on en tire** :
  - 431 lignes, cohérentes avec la description (« En 2026, le périmètre des opérateurs de l’État s’établit à 431 entités. ») ;
  - nom, statut (EPA 220 ; EPSCP 141 ; EPIC 35 ; GIP 16…) et mission ;
  - **aucun site web, aucun SIREN.**
  - Aucun jaune 2027 trouvé au 18/11/2026.
- **Licence ou conditions** : « Licence Ouverte / Open Licence version 2.0 », déclarée par le déposant. Le document source (budget.gouv.fr) n'a pas pu être lu : le site est fermé aux robots.
- **Attribution à afficher** : « Source : projet de loi de finances pour 2026, annexe « Opérateurs de l'État », via data.gouv.fr — Licence Ouverte 2.0. »
- **Téléchargement automatique testé** : oui, par l'API tabulaire (`meta.total` = 431).
- **Décision : retenue en contrôle seulement.** Elle délimite le périmètre « opérateurs » (D1). Les domaines viennent d'un rapprochement par nom et par SIREN, à la main, sourcé (T3).

### 7. Relevés d'août 2026 sur 3 581 domaines publics
- **Producteur** : un compte individuel sur data.gouv.fr. Son nom n'est pas reproduit ici.
- **Adresse** : par exemple https://www.data.gouv.fr/datasets/signature-dnssec-de-3-581-domaines-dorganismes-publics-francais-aout-2026
- **Ce qu'on en tire** : une mesure unique du 25/08/2026 :
  - IPv6 : 541 domaines sur 3 580 (15,1 %) ;
  - DNSSEC : délégation signée pour 639 sur 3 580 (17,8 %) ;
  - security.txt valide : 85 sur 3 240 joignables (2,6 %).
  - Population : « les 10 000 premiers enregistrements de l'Annuaire de l'administration », selon le producteur.
- **Licence ou conditions, mot pour mot** : « Open Data Commons Public Domain Dedication and Licence (PDDL) » (`odc-pddl`). Les noms d'organismes repris de l'Annuaire restent à citer comme venant de la DILA.
- **Téléchargement automatique testé** : oui, par l'API tabulaire (`total` 3 581).
- **Décision : retenue en contrôle seulement.** Elle sert de témoin de cohérence pour les mesures IPv6 et DNSSEC de Sovermap, jamais de source du classement.

### 8. Principaux établissements d'enseignement supérieur (MESR)
- **Producteur** : ministère de l'Enseignement supérieur, de la Recherche et de l'Espace.
- **Adresse** : https://www.data.gouv.fr/datasets/principaux-etablissements-d-enseignement-superieur-mesr
- **Ce qu'on en tire** : 245 établissements, dont 243 avec `url`, plus le SIREN, l'UAI et le statut juridique.
- **Licence ou conditions** : « Licence Ouverte / Open Licence » (`fr-lo`). Version 1 ou 2.0, l'obligation est la même : citer la source et la date.
- **Téléchargement automatique testé** : oui, par l'API tabulaire (le portail d'origine est fermé aux robots).
- **Décision : retenue** (filtre « enseignement supérieur » ; domaines des universités, qui sont des opérateurs de l'État).

### 9. Établissements des premier et second degrés (Éducation nationale)
- **Producteur** : ministère de l'Éducation nationale.
- **Ce qu'on en tire** : 63 556 établissements et leur classement. Aucun site web.
- **Licence ou conditions** : « Licence Ouverte / Open Licence version 2.0 ».
- **Téléchargement automatique testé** : oui, par l'API tabulaire seulement.
- **Décision : retenue en contrôle seulement** (classement).

### 10. BANATIC — intercommunalités (DGCL)
- **Producteur** : direction générale des collectivités locales.
- **Ce qu'on en tire** : 9 578 groupements, leur nature juridique, et un site pour 790 d'entre eux (copie du 27/01/2025).
- **Licence ou conditions** : « Licence Ouverte / Open Licence version 2.0 ».
- **Téléchargement automatique testé** : oui, par l'API tabulaire.
- **Données personnelles** : noms des présidents, jamais copiés.
- **Décision : retenue en contrôle seulement.**

### 11. FINESS — structures (Agence du Numérique en Santé)
- **Ce qu'on en tire** : le classement des établissements de santé, sans site web.
- **Licence ou conditions** : « Licence Ouverte / Open Licence version 2.0 ».
- **Téléchargement automatique testé** : non. Le fichier fait 51 889 104 octets et se trouve sur static.data.gouv.fr, fermé aux robots.
- **Décision : écartée pour l'instant** : elle ne donne aucun domaine.

## B. Mesure DNS

### 12. Knot Resolver (CZ.NIC), résolveur local de la collecte
- **Producteur** : CZ.NIC, registre du .cz (Tchéquie).
- **Adresse** : image officielle `docker.io/cznic/knot-resolver` (« Knot Resolver official Docker image can be found at Docker Hub », https://www.knot-resolver.cz/documentation/latest/deployment-docker.html).
- **Ce qu'on en tire** : les réponses DNS, interrogées directement auprès des serveurs qui font autorité, validées par DNSSEC (« Since version 4.0, DNSSEC validation is enabled by default. », https://www.knot-resolver.cz/documentation/latest/config-dnssec.html).
- **Conditions** :
  - logiciel libre ;
  - l'image est reconstruite chaque semaine (étiquettes datées, la dernière du 17/11/2026) ;
  - Docker Hub limite les téléchargements anonymes à « 100 per IPv4 address or IPv6 /64 subnet » par 6 h (https://docs.docker.com/docker-hub/usage/pulls/).
- **Décision : retenu** (`specs/001-sovermap/plan.md`, § 9).

### 13. Quad9
- **Producteur** : fondation suisse Quad9 (Zurich).
- **Conditions, mot pour mot** : « Yes! Quad9 is completely free for everyone! ISPs, service providers, and other large organizations are encouraged to contact us with details about their infrastructure and DNS traffic volume before sending large-scale DNS traffic to Quad9. » (https://quad9.net/support/faq/).
- **Ce qu'on en tire** : un contrôle quotidien de la couche adresse :
  - **tous les domaines du périmètre « État »**, environ 1 900 ;
  - 3 % des autres domaines, tirés au hasard, environ 960 ;
  - et les témoins.
  Chacun est interrogé par son nom web (A et AAAA). C'est la correction de l'ARRÊT 1, le 19/11/2026.
- **Attention** : 9.9.9.9 bloque les domaines malveillants. Un NXDOMAIN de Quad9 n'est jamais lu comme « pas de site ».
- **Décision : retenue en contrôle seulement** (environ 6 000 requêtes par jour, en moyenne 0,07 par seconde).

### 14. Cloudflare 1.1.1.1
- **Producteur** : Cloudflare, Inc. (États-Unis).
- **Conditions, mot pour mot** : l'usage vaut acceptation des conditions générales de Cloudflare, qui interdisent tout usage qui pourrait « overburden » ses serveurs (https://www.cloudflare.com/website-terms/). Aucune limite chiffrée n'est publiée.
- **Ce qu'on en tire** : « 1.1.1.1 is a DNSSEC-validating resolver. » ; il n'envoie pas l'ECS (https://developers.cloudflare.com/1.1.1.1/faq/).
- **Décision : retenue en contrôle seulement** (domaines témoins).

### 15. Google Public DNS (API JSON)
- **Producteur** : Google LLC (États-Unis).
- **Conditions, mot pour mot** : « Anyone, including Internet Service Providers (ISPs) and large organizations, is free to use Google Public DNS, but we apply rate limits to each client to protect our service. » (https://developers.google.com/speed/public-dns/docs/isp).
- **Ce qu'on en tire** : des essais du point de mesure, avec le paramètre `edns_client_subnet` (« Format is an IP address with a subnet mask. Examples: 1.2.3.4/24 », https://developers.google.com/speed/public-dns/docs/doh/json).
  - On passe toujours un sous-réseau explicite : sans lui, une partie de l'adresse de l'appelant est transmise.
- **Décision : retenue en contrôle seulement** (pilote du point de mesure, en T2).

### 16. DNS4EU
- **Producteur** : Whalebone, s.r.o. (Tchéquie), projet cofinancé par l'Union européenne.
- **Conditions, mot pour mot** : « made available to individuals free of charge, strictly for their use in a personal capacity » ; « The Service is not eligible for enterprises or connectivity providers. » (conditions d'utilisation, PDF de DNS4EU). Et : « Court-ordered domain blocks apply to every variant » (https://joindns4.eu/for-public).
- **Décision : écartée.** C'est un usage personnel, et les réponses peuvent être modifiées par des blocages. Il a servi à quelques dizaines de requêtes d'essai le 18/11/2026, avant la lecture de ces conditions.

### 17. FDN (association française)
- **Conditions** : depuis le 15/03/2025, les personnes extérieures à ses réseaux n'y accèdent qu'en DoT ou DoH, après une attaque (https://www.fdn.fr/renforcement-serveurs-dns-2025/).
- **Décision : écartée pour l'instant.** C'est une petite association déjà attaquée : on ne lui ajoute pas de charge.

## C. Réseau : adresse IP → AS → titulaire, et CDN

Principe : les fichiers en masse font le travail quotidien, par une recherche locale sans aucune requête par adresse. Les API ne servent qu'aux contrôles : 300 requêtes par jour au plus.

**Ce que valent les accords entre sources** : IPtoASN, RIS, Team Cymru et RIPEstat décrivent tous la même réalité, le routage BGP. Quand ils s'accordent, cela prouve l'absence d'erreur de lecture ou de fraîcheur, pas des faits indépendants. Le niveau « confirmé » de la couche réseau exige donc l'accord d'IPtoASN avec RIS (vu par au moins 5 pairs). Team Cymru, qui a son propre flux BGP, sert de troisième avis sur un échantillon.

### 18. IPtoASN
- **Producteur** : iptoasn.com, projet tenu par une seule personne.
- **Adresse** : https://iptoasn.com/data/ip2asn-combined.tsv.gz
- **Ce qu'on en tire** : pour chaque plage d'adresses IPv4 et IPv6, l'AS d'origine, le pays d'enregistrement de l'AS (jamais un lieu) et sa description.
  - 719 149 lignes ; environ 86 900 AS.
- **Licence, mot pour mot** : « Licensed under Public Domain (PDDL v1.0) » (pied de page de https://iptoasn.com/). robots.txt : `Allow: /`.
- **Limites de débit** : aucune pour les fichiers. L'API publique est arrêtée depuis le 31/12/2020.
- **Attribution à afficher** : aucune exigée. Par courtoisie : « IP → AS : IPtoASN (iptoasn.com), PDDL 1.0 ».
- **Téléchargement automatique testé** : **oui**. HTTP 200, 10 955 454 octets, `last-modified` du 01/11/2026.
  - Le site annonce « Updated hourly », mais tous ses fichiers étaient datés du 01/11/2026 le 18/11/2026 : la fraîcheur réelle est **non vérifiée**.
- **Essai croisé** : sur 5 000 adresses tirées au hasard dans les blocs français, IPtoASN et RIS donnent :
  - le même AS pour 4 485 adresses ;
  - un AS différent pour 2 ;
  - et 513 adresses sont « non routées » pour IPtoASN.
- **Décision : retenue**, comme source principale quotidienne.
  - Son accord avec la table RIS **du jour** suffit pour le niveau « confirmé », quel que soit l'âge du fichier IPtoASN (décision du 19/11/2026).
  - La dernière copie datée est gardée, au cas où le projet s'arrêterait.

### 19. RIPE RIS — fichiers riswhoisdump
- **Producteur** : RIPE NCC (Routing Information Service).
- **Adresse** : https://www.ris.ripe.net/dumps/riswhoisdump.IPv4.gz et `riswhoisdump.IPv6.gz`
- **Ce qu'on en tire** : une table « préfixe → AS d'origine, nombre de pairs RIS qui le voient », par exemple `3333	193.0.0.0/21	343`.
- **Conditions, mot pour mot** :
  - conditions générales du RIPE NCC, art. 3.5 : « The User shall not re-package, download, compile, re-distribute or re-Use any or all of the data contained on the Website or on any Publicly Available RIPE NCC Service, unless this is permitted as part of their Use of the Website or the particular Publicly Available RIPE NCC Service. » ;
  - droit d'auteur : « All rights restricted. » ;
  - la page légale propre à RIS est illisible sans JavaScript : non vérifiée.
- **Accès** :
  - www.ris.ripe.net n'a pas de robots.txt ;
  - les fichiers MRT de data.ris.ripe.net sont fermés aux robots (`Disallow: /`).
- **Téléchargement automatique testé** : **oui**. HTTP 200, 5 656 388 octets, fichier généré le 18/11/2026 à 20:47 UTC.
- **Décision : retenue en contrôle seulement.** On la télécharge une fois par jour pour confirmer l'AS donné par IPtoASN, et on n'en republie rien.

### 20. RIPEstat Data API
- **Producteur** : RIPE NCC.
- **Conditions, mot pour mot** (https://www.ripe.net/about-us/legal/ripestat-service-terms-and-conditions) :
  - art. 3.3 : « A User may not re-package, compile, re-distribute the RIPEstat Service and any (or all) of the RIPEstat Data. » ;
  - art. 3.2 : « If Users perform research using the RIPEstat Service, they must notify the RIPE NCC about the results of this research by sending an email to [adresse du service RIPEstat, omise ici]. »
- **Limites, mot pour mot** : « No limit on the amount of requests but please register if you plan to regularly do more than 1000 requests/day » ; « The system limits the usage to 8 concurrent (at the same time) requests coming from one IP address. »
- **À savoir** : `network-info` repose sur RIS (« based on information from RIPE RIS »). Ce n'est donc pas une source indépendante de la fiche 19.
- **Téléchargement automatique testé** : oui, deux appels avec `sourceapp=sovermap-cadrage`, concordants avec IPtoASN.
- **Décision : retenue en contrôle seulement** (140 requêtes par jour au plus).
  - Aucune donnée de RIPEstat n'est republiée. Les exemples de la méthode citent IPtoASN.
  - La page « Vérifier vous-même » renvoie le lecteur vers RIPEstat.
  - Si le propriétaire juge que Sovermap relève de la « research » de l'art. 3.2, une déclaration par e-mail sera faite depuis une adresse sur sovermap.com.

### 21. Fichiers de délégation des cinq registres régionaux (RIR)
- **Producteurs** : RIPE NCC, ARIN, APNIC, LACNIC, AFRINIC.
- **Adresses** : par exemple https://ftp.ripe.net/pub/stats/ripencc/delegated-ripencc-extended-latest (et les équivalents des quatre autres registres).
- **Ce qu'on en tire** : le pays d'**enregistrement** de chaque AS et de chaque bloc, et un identifiant opaque commun aux ressources d'un même titulaire. Ces fichiers ne contiennent aucun nom ni contact.
- **Conditions, mot pour mot** :
  - APNIC : « The files are freely available for download and use on the condition that APNIC will not be held responsible for any loss or damage arising from the use of the information contained in these reports. » AFRINIC dit la même chose.
  - RIPE NCC, ARIN, LACNIC : aucune condition écrite trouvée (doute).
  - Tous rappellent que ces fichiers ne disent pas où une ressource est utilisée aujourd'hui.
- **Téléchargement automatique testé** : **oui**. Fichier du RIPE : 18 139 692 octets, mis à jour le 17/11/2026. Les cinq fichiers pèsent 46 Mo en tout.
- **Attribution à afficher** : « Source : fichiers statistiques des registres Internet régionaux (RIPE NCC, ARIN, APNIC, LACNIC, AFRINIC) ».
- **Décision : retenue**, pour un usage interne quotidien. On ne publie que le pays d'enregistrement des AS observés, étiqueté comme tel.

### 22. Base du RIPE : fichiers « split » `aut-num` et `organisation`
- **Producteur** : RIPE NCC.
- **Adresse** : https://ftp.ripe.net/ripe/dbase/split/ripe.db.aut-num.gz et `ripe.db.organisation.gz`
- **Ce qu'on en tire** : AS → nom de l'organisation titulaire, pour la région du RIPE. Exemple : AS16276 → `org-name: OVH SAS`.
- **Conditions, mot pour mot** (RIPE Database Terms and Conditions) :
  - art. 4.5 : « A User may not re-package, download, compile, re-distribute or re-use any or all of the RIPE Database or the data contained therein unless they do so only with an insubstantial part of the RIPE Database or the data contained therein or when permission to do so is granted by the RIPE NCC. » ;
  - art. 4.4 : pas d'usage publicitaire ou de marketing.
- **Données personnelles** : tous les objets `organisation` portent une adresse e-mail et une adresse postale. On filtre dès la lecture : seuls `aut-num`, `as-name`, `org`, `org-name`, `country` et `org-type` sont gardés.
- **Téléchargement automatique testé** : oui (8 987 986 et 5 450 858 octets). Les fichiers bruts ont été supprimés après lecture.
- **Décision : retenue, sous réserve.** Un téléchargement par semaine. On ne garde et ne publie que le nom des organisations des AS réellement observés, soit une « insubstantial part ». Une relecture juridique de l'art. 4.5 est conseillée avant l'ouverture.

### 23. RDAP des cinq registres
- **Adresses** : https://rdap.db.ripe.net/autnum/<n>, https://rdap.arin.net/registry/autnum/<n>, https://rdap.apnic.net/autnum/<n>, https://rdap.lacnic.net/rdap/autnum/<n>, https://rdap.afrinic.net/rdap/autnum/<n> ; l'amorçage par https://data.iana.org/rdap/asn.json.
- **Conditions, mot pour mot** :
  - ARIN : l'usage est permis « so long as such use does not republish, resell, or make publicly available data contained within the ARIN Whois database » ;
  - APNIC : « no part of the APNIC whois data may be reproduced […] without prior permission of APNIC » ;
  - AFRINIC : « may not be used, reproduced or made available to third parties without the prior written authorisation from AFRINIC » ;
  - LACNIC : page de conditions illisible sans JavaScript (non vérifiée).
- **Téléchargement automatique testé** : oui, un appel par registre. Les réponses contiennent des contacts : seul le nom de l'organisation titulaire est lu, et rien n'est écrit sur disque.
- **Décision : retenue en contrôle seulement.** Hors de la région du RIPE, le nom publié d'une société vient de la table tenue à la main de Sovermap (sources : la société elle-même, ses rapports, un registre d'entreprises, GLEIF). Le registre ne sert qu'à vérifier.

### 24. Team Cymru (IP → AS)
- **Adresse** : https://www.team-cymru.com/ip-asn-mapping ; interface DNS `origin.asn.cymru.com`.
- **Conditions** :
  - aucune licence ni condition écrite trouvée ;
  - « Free, forever. Underwritten by Team Cymru as a community service. » ;
  - « move recurring jobs to the DNS interface ».
- **Téléchargement automatique testé** : oui, deux requêtes DNS, concordantes.
- **Décision : retenue en contrôle seulement** : 100 requêtes DNS par jour au plus, et rien n'est republié. Elle a son propre flux BGP (« sourced from 50+ peers »), donc un avis distinct de celui de RIS.

### 25. DB-IP « IP to ASN Lite »
- **Licence, mot pour mot** : « The free IP to ASN Lite database by DB-IP is licensed under a Creative Commons Attribution 4.0 International License. » Un lien vers DB-IP est exigé sur les pages qui s'en servent.
- **Téléchargement automatique testé** : requête HEAD seulement (7 134 316 octets, novembre 2026). La page demande de cocher « I agree » avant de télécharger : pas de GET.
- **Décision : écartée** (choix du propriétaire, 19/11/2026 : « on s'en passe »). Les noms d'organisation hors de la région du RIPE viennent de la table tenue à la main, vérifiée par le RDAP des registres.

### 26. Sources écartées pour IP → AS
- **RouteViews** (CC BY 4.0) : `archive.routeviews.org` est fermé aux robots (`disallow: /`). Écartée pour l'instant.
- **CAIDA, prefix2as et AS2Org** :
  - « a limited, non-exclusive, non-transferable, non-assignable, and terminable license » ;
  - chaque publication doit être déclarée à CAIDA ;
  - publicdata.caida.org est fermé aux robots.
  - **Écartée.**
- **PeeringDB** : « Except for Internet operational purposes approved by PeeringDB, no part of the PeeringDB data may be reproduced […] without prior permission of PeeringDB » (https://www.peeringdb.com/aup). Le cahier est confirmé. **Écartée.**
- **IPinfo Lite** : un jeton est exigé, la licence est CC BY-SA 4.0 (partage à l'identique), et les données sont mêlées de géolocalisation. Écartée pour l'instant.
- **bgp.tools** : « The preferred user agent format is: acmeco bgp.tools - [adresse e-mail] » (l'exemple d'adresse du site est omis ici). Il faut une adresse e-mail, et aucune licence de données n'existe. **En attente.**
- **bgp.he.net** : aucune condition ni interface machine documentée. **Écartée.**
- **BGPKIT** : aucune licence trouvée. Écartée.
- **Internet Health Report** : CC BY-NC-SA 4.0. Écartée.
- **Bases complètes d'ARIN, APNIC et AFRINIC** : contrat signé, compte ou demande par e-mail. Écartées pour l'instant.

### 27. CDN : listes officielles de plages d'adresses
| Fournisseur | Adresse | Contenu (18/11/2026) | Accès automatique |
|---|---|---|---|
| Cloudflare | https://www.cloudflare.com/ips-v4 et `/ips-v6` | 15 plages IPv4, 6 plages IPv6. La documentation dit « shared by all proxied hostnames » : la liste n'est pas exhaustive. | Oui |
| Amazon CloudFront | https://ip-ranges.amazonaws.com/ip-ranges.json, service `CLOUDFRONT` | 217 préfixes IPv4 | Oui |
| Fastly | https://api.fastly.com/public-ip-list | 21 IPv4, 3 IPv6 : « This list is exhaustive and includes all Fastly-owned IP ranges » | Oui |
| Microsoft Azure Front Door | page de téléchargement des « Service Tags », étiquette `AzureFrontDoor.Frontend` | 229 préfixes, mise à jour chaque semaine | Oui |
| Google | www.gstatic.com/ipranges/ | — | **Non** : robots.txt `Disallow: /`. Une seule requête HEAD est partie par inadvertance ; aucun GET. |
| Akamai | aucune liste publique trouvée | — | — |
| Imperva | my.imperva.com | — | **Non** : robots.txt `Disallow: /` |

- **Conditions** : aucune licence écrite sur ces listes. On s'en sert pour calculer un indicateur (« CDN : oui, fournisseur, date de la liste ») ; **les listes elles-mêmes ne sont pas republiées**.
- **Décision : retenue** (Cloudflare, CloudFront, Fastly, Azure Front Door).

### 28. CDN : suffixes CNAME documentés par les fournisseurs
Chaque suffixe est lu dans la documentation du fournisseur, le 18/11/2026 :
- **Amazon CloudFront** : `.cloudfront.net` (« d111111abcdef8.cloudfront.net »).
- **Akamai** : `edgesuite.net`, `edgekey.net`, `akamaized.net` (« edgesuite.net Standard TLS hostname or Plain HTTP hostname. »).
- **Fastly** : `.fastly.net` (« The format for the CNAME record value is <letter>.sni.global.fastly.net »).
- **Cloudflare** : `.cdn.cloudflare.net`.
- **Azure** : `.azurefd.net` (Front Door) et `.azureedge.net` (Azure CDN).
- **Gcore** : `.gcdn.co`.
- **Bunny** : `.b-cdn.net`.

Restent à lire dans une page officielle avant d'entrer dans la liste :
- `akamaiedge.net`, pourtant vu dans les essais (`docs/methode.md`) ;
- `incapdns.net` (Imperva) ;
- `rsc.cdn77.org` (CDN77).

### 29. CDN : numéros d'AS
- **Ce qu'on en tire** : une piste, relevée dans IPtoASN et à confirmer au registre avant d'entrer dans la liste :
  - Cloudflare : 13335 et ses AS régionaux ;
  - Fastly : 54113 ;
  - Akamai : 20940, 16625, 21342… ;
  - Imperva : 19551 ;
  - Gcore : 199524 ;
  - CDN77 : 60068 ;
  - Bunny : 200325.
- **Règle** : un AS partagé avec de l'hébergement ordinaire ne suffit jamais à conclure à un CDN. C'est le cas d'Amazon 16509, de Microsoft 8075, de Google 15169, d'OVH et de Scaleway, et de l'AS 63949 d'Akamai, ancien hébergeur Linode.

### 30. Listes libres agrégées (cdncheck de ProjectDiscovery)
- **Licence** : code MIT ; données compilées depuis des sources tierces, au droit incertain.
- **Constat** : l'exemple de sa documentation attribue à Akamai des plages qui figurent dans la liste officielle de Fastly.
- **Décision : écartée comme source.** Elle sert seulement d'aide-mémoire des fournisseurs à couvrir.

**La liste tenue à la main** : un fichier versionné, `referentiels/cdn.json` (JSON, validé par l'outil de mesure avant tout usage). Il a un bloc par fournisseur : AS (avec « suffit seul : oui ou non » et la confirmation au registre), listes de plages (adresse, filtre, conditions), suffixes CNAME (documentation, citation, date de lecture), règle de confiance et date de revue. Niveaux :
- **confirmé** : suffixe CNAME documenté, ou adresse dans une plage officielle ;
- **probable** : AS réservé au seul CDN ;
- **non déterminé** : le reste.

## D. Sociétés, maisons mères et pays des sièges

### 31. GLEIF (LEI et relations « qui possède qui »)
- **Producteur** : Global Legal Entity Identifier Foundation (fondation suisse, Bâle).
- **Adresse** : API https://api.gleif.org/api/v1/lei-records ; conditions https://www.gleif.org/en/meta/lei-data-terms-of-use
- **Ce qu'on en tire** : le LEI, le siège, le parent direct et le parent ultime « comptables », ou une exception de déclaration.
- **Licence ou conditions, mot pour mot** :
  - « The data available through the Access Service are provided under the CC0 licence, see CC0 1.0 Universal (CC0 1.0). »
  - « You agree that you shall refrain from creating, in whatever way, the impression that, data and/or services, except the original LEI and LE-RD downloaded by you through the Access Service, are provided or supported or authorized or granted or otherwise associated by or with GLEIF. »
  - La marque et le logo de GLEIF ne s'utilisent pas sans accord.
- **Limites de débit** : « Rate limiting is currently set at 60 requests, per minute, per user, for all users. » (documentation de l'API). Le robots.txt de api.gleif.org permet tout.
- **Attribution à afficher** : aucune exigée. Par courtoisie, sans la marque : « Données LEI : GLEIF, copie du <date> ».
- **Téléchargement automatique testé** : oui, une vingtaine d'appels.
  - OVH SAS (LEI `9695007586GCAKPYJ703`) a pour parent ultime OVH GROUPE (France). La relation est déclarée par l'entité, sans recoupement.
  - Amazon Web Services EMEA SARL et Scaleway SAS **n'ont pas de LEI**.
  - Exceptions rencontrées : `NON_CONSOLIDATING` (Amazon.com, Iliad), `NO_KNOWN_PERSON` (OVH Groupe).
- **Décision : retenue.** Sa couverture est incomplète et ses déclarations non recoupées : toujours une seconde source (fiche 39).

### 32. API Recherche d'entreprises (DINUM, données Sirene de l'INSEE)
- **Producteur** : DINUM (service), INSEE (données Sirene).
- **Adresse** : https://recherche-entreprises.api.gouv.fr (spécification : `/openapi.json`)
- **Ce qu'on en tire** : SIREN, dénomination, nature juridique, siège, `est_administration`. Elle ne dit pas qui possède qui.
- **Licence ou conditions, mot pour mot** :
  - les données Sirene sont sous Licence Ouverte 2.0 : « Dans le cas d’une réutilisation de la base SIRENE de l’INSEE, mentionner l’URL du « Concédant » : www.insee.fr + la date de dernière mise à jour de l’Information réutilisée. » (texte de la licence, https://raw.githubusercontent.com/etalab/licence-ouverte/master/LO.md) ;
  - le service lui-même n'affiche pas de licence propre (réserve mineure).
- **Limites de débit, mot pour mot** : « L'API accepte au maximum 7 requêtes par seconde par adresse IP. Une limite de 30 requêtes par seconde par ASN est aussi en place. Il est donc probable de faire face à cette limite sur les cloud publics. » (openapi.json). Pas de robots.txt (404).
- **Attribution à afficher** : « Source : Insee, base Sirene (www.insee.fr), données du <date> ».
- **Téléchargement automatique testé** : oui. Exemple : SIREN 433115904, Scaleway, nature juridique 5710, siège à Paris.
- **Données personnelles** : la réponse complète contient des dirigeants et des élus. Toujours `minimal=true&include=siege`.
- **Décision : retenue** (quelques centaines d'appels espacés, un par société, avec nouvelle tentative sur 429).

### 33. Fichiers stock Sirene (INSEE)
- **Ce qu'on en tire** : les mêmes informations, en masse (985 Mo pour les unités légales).
- **Licence** : Licence Ouverte 2.0.
- **Téléchargement automatique testé** : non, par requête HEAD seulement. Le robots.txt d'insee.fr ferme `*.zip` et `*.csv`, et celui de static.data.gouv.fr ferme `/resources`.
- **Décision : écartée pour l'instant.** C'est inutile pour quelques centaines de sociétés.

### 34. API Sirene officielle (INSEE)
- **Conditions, mot pour mot** : « Pour accéder à l'API Sirene, vous devez d’abord créer un compte sur le portail, puis souscrire à l'API. »
- **Décision : écartée pour l'instant** (un compte est exigé).

### 35. RNE (INPI)
- **Licence, mot pour mot** : « L’INPI concède au « Réutilisateur » un droit non exclusif et gratuit de libre « Réutilisation » des Informations objet de la présente licence, à des fins commerciales ou non » (licence « Informations du RNE », 2024).
- **Conditions d'accès** : « La connexion se fait via l’appel d’une API à l’aide d’un couple identifiant/mot de passe. » Le robots.txt de ses sites est contradictoire.
- **Décision : écartée pour l'instant** (un compte est exigé ; l'API Recherche d'entreprises suffit).

### 36. SEC EDGAR (États-Unis)
- **Conditions, mot pour mot** :
  - « Information presented on sec.gov is considered public information and may be copied or further distributed by users of the web site without the SEC’s permission. » (https://www.sec.gov/about/privacy-information) ;
  - l'agent utilisateur doit être déclaré, sur le modèle « Sample Company Name » suivi d'une adresse e-mail de contact (l'exemple de la SEC est omis ici) ;
  - « The SEC does not allow "unclassified" bots or automated tools to crawl the site. »
- **Limites** : « no more than 10 requests per second ».
- **Décision : en attente.** Il faut une adresse e-mail dans l'agent utilisateur : une adresse sur sovermap.com, plus tard. Elle servira à confirmer les filiales des groupes américains (Exhibit 21 des formulaires 10-K).

### 37. Companies House (Royaume-Uni)
- **Conditions, mot pour mot** : « We impose no rules or requirements on how the information on the public register is used » ; l'API « requires authentication credentials, in the form of an API key ».
- **Décision : écartée pour l'instant.** Une clé est exigée, et les fichiers en masse dépassent 50 Mo. Pour une société britannique rare : lecture manuelle par une personne.

### 38. Wikidata
- **Licence, mot pour mot** : « All structured data (i.e. the main, Property, Lexeme, and EntitySchema namespaces) is released into the public domain under Creative Commons Zero. » (https://www.wikidata.org/wiki/Wikidata:Licensing).
- **Conditions d'accès** :
  - le robots.txt de query.wikidata.org ferme `/sparql` ;
  - celui de www.wikidata.org ferme `/w/` et `/wiki/Special:`.
- **Décision : retenue en contrôle seulement, par lecture manuelle** d'une page `…/wiki/Q…` par société douteuse. Rien d'automatique.

### 39. Rapports annuels des groupes
- **Ce qu'on en tire** : des **faits** qui confirment une chaîne de détention (« la société X détient 100 % de Y »), avec le document, la page, la date du document et la date de lecture. Le texte n'est pas recopié.
- **Exemple** : le document d'enregistrement universel 2025 d'OVH Groupe, § 1.7.2, déposé à l'AMF le 07/11/2025. Il indique que la société détient directement 100 % d'OVH SAS. Cela confirme GLEIF (fiche 31).
- **Décision : retenue**, comme seconde source de la maison mère.

## E. Qualification et fond de carte

### 40. Liste SecNumCloud de l'ANSSI
- **Producteur** : Agence nationale de la sécurité des systèmes d'information (ANSSI).
- **Adresse** : non confirmée en lecture directe. La page des prestataires qualifiés est sur cyber.gouv.fr.
- **Licence ou conditions** : **non vérifiées**. Le cahier note « etalab-2.0, sauf mention contraire ».
- **Téléchargement automatique testé** : **non**.
  - Le robots.txt et la page répondent par une protection anti-robots (Imperva Incapsula).
  - Rien n'a été contourné.
  - Aucune version ouverte n'existe sur data.gouv.fr (recherches « SecNumCloud », « ANSSI » : 0 résultat).
- **Décision : en attente.**
  - La couche SecNumCloud sera alimentée par un **relevé manuel daté**, fait par une personne dans un navigateur ordinaire.
  - La détection automatique des changements prévue par le cahier n'est pas possible en l'état.
  - Plus tard, et sur décision du propriétaire : demander à l'ANSSI une version ouverte de la liste.

### 41. Natural Earth
- **Producteur** : projet Natural Earth (domaine public).
- **Licence, mot pour mot** : « All versions of Natural Earth raster + vector map data found on this website are in the public domain. » ; « No permission is needed to use Natural Earth. Crediting the authors is unnecessary. » (https://www.naturalearthdata.com/about/terms-of-use/).
- **Ce qu'on en tire** : `ne_50m_admin_0_countries`, version 5.1.1 : 242 pays, 799 734 octets.
  - Le 1:110m ne compte que 177 pays : il perd des petits États.
  - Un point de vue « France » existe, mais seulement au 1:10m (`ne_10m_admin_0_countries_fra`, 4,9 Mo).
- **Téléchargement automatique testé** : oui, depuis https://naciscdn.org/naturalearth/50m/cultural/ne_50m_admin_0_countries.zip (HTTP 200). Les liens de la page du projet sont cassés (404 ou 500).
- **Piège** : `ISO_A3` vaut -99 pour la France. On joint par `ADM0_A3` ou `ISO_A3_EH`.
- **Attribution à afficher** : aucune exigée. Par courtoisie : « Fond de carte : Natural Earth (domaine public) ».
- **Décision : retenue.** Le fichier est copié dans le dépôt, pas téléchargé à chaque build.

## F. Règles de calcul

### 42. Public Suffix List (Mozilla et contributeurs)
- **Producteur** : projet Public Suffix List, tenu par des bénévoles sous l'égide de la Mozilla Foundation.
- **Adresse** : https://publicsuffix.org/list/public_suffix_list.dat (le fichier demande d'être pris là, et seulement là : « Please pull this list from, and only from https://publicsuffix.org/list/public_suffix_list.dat »).
- **Ce qu'on en tire** : la règle qui donne le domaine enregistré d'un nom (`www.service.gouv.fr` → `service.gouv.fr`), l'unité que compte le chiffre (décision D1). Elle remplace la courte liste de suffixes de l'outil v0.
- **Licence, mot pour mot** (en tête du fichier) : « This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. » (lu le 20/11/2026).
  - La MPL 2.0 permet de modifier et de redistribuer le fichier, sous la même licence, en gardant ses mentions de licence (§ 3.4). La copie du dépôt garde l'en-tête de licence, la version, le commit d'origine, les marqueurs de sections et toutes les règles, sans les autres commentaires : ceux-ci nomment des contributeurs et donnent leurs adresses e-mail (aucune donnée personnelle gardée, brief du chantier 2, § 0.2). Les règles sont inchangées (test : même nombre de règles que l'original). L'original complet se retrouve par sa version et son commit.
- **Limites de débit** : aucune chiffrée. Sovermap ne la télécharge pas à chaque collecte : une copie datée est épinglée dans `referentiels/psl/` et se met à jour par une PR (`pipeline/cli/epingler-psl.ts`).
- **robots.txt** (https://publicsuffix.org/robots.txt, lu le 20/11/2026) : `Disallow: /images/` seulement.
- **Téléchargement testé** : oui, le 20/11/2026 : HTTP 200, 342 725 octets, `Last-Modified: Thu, 19 Nov 2026 08:30:26 GMT` ; version `2026-11-19_08-30-20_UTC`, commit `f7796455091118a5617cc7588523b083a8223301`. Copie réduite : 149 382 octets.
- **Données personnelles** : des noms et des adresses e-mail de contributeurs dans les commentaires ; écartés de la copie, jamais lus par la collecte.
- **Attribution à afficher** : par courtoisie : « Domaines enregistrés : Public Suffix List (publicsuffix.org), MPL 2.0, version du <date> ».
- **Décision : retenue** (outil de calcul ; rien de la liste n'est republié dans les données, sinon la copie épinglée dans le code source).

## Attributions à afficher sur la page Données

Liste provisoire. Elle sera relue en T6, avec les dates réelles des fichiers utilisés. Aucune ne suggère un aval du producteur.

**Exigées par la licence ou les conditions :**
- **DINUM / Etalab** : « liste des noms de domaine des organismes publics, copie du 11/12/2024, Licence Ouverte 2.0 » ; et, pour la liste à jour (fiche 1) : « Source : DINUM, liste des noms de domaine des organismes publics, version du <date>, Licence Ouverte 2.0 ».
- **DILA** : « Source : Service-Public.gouv.fr / DILA — Référentiel de l'organisation administrative de l'État, fichier <nom> du <date>, <adresse longue>, Licence Ouverte ».
- **SIG** : « Observatoire de l'écosystème numérique de l'État – Sites internet, mise à jour du <date>, Licence Ouverte 2.0 ».
- **Ministère de l'Enseignement supérieur** : « Principaux établissements d'enseignement supérieur, mis à jour le <date>, Licence Ouverte ».
- **Insee** : « base Sirene (www.insee.fr), données du <date> ».
- **RIPE NCC** : « RIPE Database (RIPE NCC), soumise aux RIPE Database Terms and Conditions » (noms des organisations de la région du RIPE).

**De courtoisie :**
- registres Internet régionaux : « fichiers statistiques des registres Internet régionaux (RIPE NCC, ARIN, APNIC, LACNIC, AFRINIC) » ;
- « IP → AS : IPtoASN (iptoasn.com), PDDL 1.0 » ;
- « Données LEI : GLEIF, copie du <date> », sans la marque GLEIF ;
- « Fond de carte : Natural Earth (domaine public) » ;
- « Domaines enregistrés : Public Suffix List (publicsuffix.org), MPL 2.0, version du <date> ».
