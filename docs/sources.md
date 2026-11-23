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
  - du 19/11/2026 au 20/11/2026, l'agent renvoyait au dépôt (`Sovermap-bot/<version> (+https://github.com/<compte>/sovermap)`), donc au nom d'un compte personnel ;
  - **depuis le 21/11/2026** (décision du propriétaire, point 03 du chantier 2) : `Sovermap-bot/<version> (+https://sovermap.vercel.app)`, sans nom de compte, jamais construit à partir de git ; une fois sovermap.com branché (chantier 3) : `Sovermap-bot/<version> (+https://sovermap.com)`.
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
| 27 | Listes officielles des CDN (Cloudflare, CloudFront, Fastly, Azure ; Imperva) | Indicateur « CDN » ; preuve du titulaire d'un AS | Pas de licence : listes non republiées | Oui (Imperva : par l'API de son portail de documentation) | **Retenue** |
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
| 56 | Légifrance (DILA) | — | — | **Non** : défi anti-robots sur le `robots.txt` | Écartée |
| 40 | Catalogue des services qualifiés SecNumCloud de l'ANSSI | Services qualifiés, fournisseur, dates, décision | Licence etalab-2.0 (mention du site de l'ANSSI) | **Non** : anti-robots | **Retenue** (relevé manuel daté) |
| 41 | Natural Earth | Fond de carte | Domaine public | Oui | **Retenue** |
| 42 | Public Suffix List (Mozilla et contributeurs) | Le domaine enregistré de chaque nom | MPL 2.0 | Oui (copie datée épinglée, mise à jour par PR) | **Retenue** (outil de calcul) |
| 43 | Table « Countries and territories » (EU Vocabularies) | Codes ISO, noms fr et en, UE, EEE, continent | Notice de réutilisation de la Commission (décision 2011/833/UE) | Oui, par SPARQL | **Retenue** |
| 44 | Code de rédaction interinstitutionnel, annexes A5 et A6 | Noms officiels de l'UE (7 lignes), contrôle | Réutilisation libre, source mentionnée ; modifications signalées | Oui | **Retenue** (noms) et contrôle |
| 45 | Liste des pays de l'UE (european-union.europa.eu) | Les 27 États membres | CC BY 4.0 | Oui | Contrôle seulement |
| 46 | Décisions d'adéquation (Commission européenne) | 16 pays et territoires, portée | CC BY 4.0 | Oui (429 sur `/document/download/`) | **Retenue** |
| 47 | Cellar (Office des publications) | Numéros, dates et titres des décisions | Aucune licence propre écrite ; faits seulement | Oui, par SPARQL | **Retenue** (faits) |
| 48 | COG de l'INSEE, pays et territoires étrangers 2026 | Contrôle des codes ISO | Licence Ouverte | Oui, par l'API tabulaire | Contrôle seulement |
| 49 | EUR-Lex, AELE, ISO | — | — | **Non** (anti-robots ; robots.txt fermé aux agents d'IA ; non consultée) | Écartées ou non lues |
| 50 | Annuaire de l'administration, base locale (DILA), copie de la DINUM sur Hugging Face | 86 201 guichets locaux : nom, types, sites, SIREN, SIRET, commune, code postal | Licence Ouverte 2.0 ; attribution DILA exigée | Oui, par plages (1,2 % des octets) | **Retenue** |
| 51 | API Découpage administratif (geo.api.gouv.fr, DINUM) | SIREN → commune → EPCI → département → région | Aucune licence écrite pour les données ; 50 appels/s/IP | Oui | **Retenue sous réserve** (outil de rattachement ; jamais les contours) |
| 52 | COG de l'INSEE au 01/01/2026 (communes, départements, régions, outre-mer) | Codes et noms officiels (34 875 communes) | Licence Ouverte | Oui, par l'API tabulaire | **Retenue** |
| 53 | ADMIN EXPRESS COG CARTO PE 2026 (IGN) | Fond de carte : 18 régions, 101 départements, métropole et DROM | Licence Ouverte 2.0 | Oui, par le WFS de la Géoplateforme | **Retenue** |
| 54 | Contours administratifs (data.gouv.fr), Natural Earth admin-1, pages de l'IGN | — | ODbL ; domaine public ; non lues | Voir la fiche | Écartées ou non retenues |
| 55 | Observatoire de la qualité des démarches en ligne (DINUM) | Démarches, ministère, volumes, adresses | Licence Ouverte 2.0 | **Non** : `robots.txt` (`/resources`) | **Retenue** (relevé manuel daté, par édition) |

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
  - **Piège** (22/11/2026) : la colonne `type` a contenu, pour une ligne, « Ajout Manuel » suivi du nom d'un contributeur. Seuls les 18 types connus sont gardés (`TYPES_LISTE`, `pipeline/liste.ts`) ; toute autre valeur est vidée à la lecture.
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
  - Relevé du 20/11/2026 : fichier `domains.csv` de la branche `master` (commit `aeeec2e9cd70b5dbfe86620321e6958d807cb1d0`, fichiers du 19/11/2026), téléchargé dans son navigateur par le propriétaire ; colonnes lues d'abord (`name`, `http_status`, `https_status`, `SIREN`, `type`, `sources`, `script`) ; seules `name` et `type` sont gardées, la colonne `sources` (noms de contributeurs) n'est écrite nulle part. Copie nettoyée : `referentiels/listes/liste-dinum-2026-11-19.csv` (121 927 lignes lues, 121 867 noms ; 2 noms écartés parce qu'ils contiennent un motif refusé par le contrôle de vie privée du dépôt).
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
- **Complément du 21/11/2026 (C.6)** : la base locale est lue dans la copie publiée par la DINUM (fiche 50), sous Licence Ouverte 2.0 ; l'accès direct au serveur de la DILA reste non tranché.

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
- **Piège** (C.5, 22/11/2026) : dans la copie du 01/11/2026, 15 consulats (`consulfrance.org`) portent l'identifiant ministériel du Premier ministre et de la DILA, quand les 17 autres et les 158 ambassades portent celui des Affaires étrangères. Le ministère d'un domaine est donc celui du Référentiel de la DILA quand elle lui en donne un (c'est le cas de `consulfrance.org`) ; celui du SIG ne sert qu'à défaut, et seulement les jours où le Référentiel est lu, qui seul nomme les ministères.
- **Décision : retenue.** Les noms des ministères viennent du Référentiel de la DILA (fiche 4), qui emploie les mêmes identifiants.
- **Copie datée** (C.5, 21/11/2026) : le fichier « audience-liste-sites » de l'édition d'octobre 2026 (mis en ligne le 01/11/2026 ; le jeu publie désormais cinq fichiers d'audience par mois), lu par l'API tabulaire (15 pages de 50 lignes) : 742 sites, dans `referentiels/perimetre/sig-2026-11-01.csv` (site, identifiant de ministère, type de site).
- **Les noms des ministères** : les 15 identifiants de ministère du SIG sont ceux du Référentiel de la DILA, dont les entrées donnent les noms officiels : 15 sur 15 vérifiés le 21/11/2026.

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
- **Rapprochement** (21/11/2026) : 431 opérateurs lus par l'API tabulaire (9 pages). Par le nom, le sigle et le nom complet : 87 trouvés parmi les établissements du MESR (fiche 8), 148 au Référentiel de la DILA avec un site et 1 sans site (fiche 4) ; 195 restent à rattacher à leur domaine, à la main, avec une source pour chacun (certains sont déjà dans le périmètre par leur site, comme `ademe.fr` au SIG).

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
- **Attribution à afficher** : « Source : ministère de l'Enseignement supérieur, de la Recherche et de l'Espace, Principaux établissements d'enseignement supérieur, version du <date> — Licence Ouverte. »
- **Décision : retenue** (filtre « enseignement supérieur » ; domaines des universités, qui sont des opérateurs de l'État).
- **Copie datée** (C.5, 21/11/2026) : le fichier CSV du 21/11/2026, lu par l'API tabulaire (5 pages de 50 lignes) : 245 établissements ; les 152 établissements publics de l'État qui ont un site, dans `referentiels/perimetre/mesr-2026-11-21.csv` (site, nom, SIREN, type) ; les 85 établissements privés et 8 établissements publics locaux (7 écoles d'art en établissements publics de coopération culturelle, SIREN en 2… ; le CREPS de Toulouse, passé à la région en 2016) sont écartés ; aucune autre colonne n'est gardée (ni téléphone, ni adresse, ni compte de réseau social).

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
- **robots.txt** : lu le 23/11/2026 avec l'agent du projet : `https://dns.google/robots.txt` répond 404 (aucun fichier) ; selon la RFC 9309, rien n'est interdit. Le pilote le relit au départ.
- **Le pilote (B.4, outil du 23/11/2026)** : `scripts/pilote-ecs.ts`, lancé une seule fois, à la main, sur les runners de GitHub (`.github/workflows/pilote-ecs.yml`, qui attend d'abord un créneau libre de toute collecte), jamais sur le PC.
  - Les domaines : 300 au plus, tirés au hasard (une graine : le jour) parmi ceux dont le nom web répondait derrière un CDN à l'état publié.
  - Les questions : une question A par nom web et par sous-réseau, deux sous-réseaux explicites (`90.0.0.0/24`, attribué en France au RIPE, réseau d'Orange ; `24.0.0.0/24`, attribué aux États-Unis à l'ARIN, réseau de Comcast), par le téléchargeur poli du projet : `robots.txt` lu d'abord et suivi (une erreur de serveur sur lui interdit tout), une question par seconde au plus, 15 secondes au plus chacune, agent du projet ; arrêt au premier refus de l'API (403, 429) ou à la première page qui n'est pas sa réponse, après 5 erreurs de suite, et à 20 minutes.
  - La société : chaque réponse est classée par la méthode elle-même (le CDN d'abord, par son suffixe CNAME, une plage officielle ou un AS réservé ; l'AS de l'adresse seulement sans CDN), avec les listes officielles des CDN (fiche 27) téléchargées comme la collecte les télécharge ; un domaine « change » quand la comparaison de la méthode (celle de son résolveur de contrôle) n'est pas d'accord d'un sous-réseau à l'autre.
  - La part : sur les domaines comparés (chaque sous-réseau a reçu une adresse) ; le seuil de 1 % se juge sur les comptes exacts ; sous 100 domaines comparés, un seul domaine pèserait plus de 1 % : « non déterminé ».
  - Le rapport va dans l'artefact de l'exécution (gardé 30 jours, téléchargeable par tout compte GitHub, comme les données publiées), même si le pilote s'arrête avant la fin ; le journal public ne donne que des comptes.
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
- **Licence, mot pour mot** : « Licensed under Public Domain (PDDL v1.0) » (pied de page de https://iptoasn.com/). robots.txt (lecture du 18/11/2026) : `Allow: /`.
- **robots.txt relu le 20/11/2026** (https://iptoasn.com/robots.txt, en entier) : un premier groupe `User-agent: *` permet tout (`Allow: /`, `Crawl-delay: 1`), mais le dernier groupe `User-agent: *`, commenté « Disallow heavy downloads for bots (they should use direct links) », ferme `Disallow: /data/*.gz$`. Les deux groupes se combinent (RFC 9309) : la règle la plus longue, celle qui ferme les fichiers `.gz`, l'emporte. **Le téléchargement automatique du fichier est donc interdit aux robots** ; le téléchargeur de la collecte l'a refusé (essai du 20/11/2026).
- **Limites de débit** : aucune pour les fichiers. L'API publique est arrêtée depuis le 31/12/2020.
- **Attribution à afficher** : aucune exigée. Par courtoisie : « IP → AS : IPtoASN (iptoasn.com), PDDL 1.0 ».
- **Téléchargement automatique testé** : **oui**. HTTP 200, 10 955 454 octets, `last-modified` du 01/11/2026.
  - Le site annonce « Updated hourly », mais tous ses fichiers étaient datés du 01/11/2026 le 18/11/2026 : la fraîcheur réelle est **non vérifiée**.
- **Essai croisé** : sur 5 000 adresses tirées au hasard dans les blocs français, IPtoASN et RIS donnent :
  - le même AS pour 4 485 adresses ;
  - un AS différent pour 2 ;
  - et 513 adresses sont « non routées » pour IPtoASN.
- **Décision : retenue en relevé manuel par le propriétaire** (réponse au point 02 du chantier 2, 20/11/2026). La collecte ne télécharge jamais ce fichier depuis iptoasn.com.
  - Le propriétaire le télécharge lui-même dans son navigateur, environ une fois par trimestre (à redemander au point qui suit ses 80 jours) ; la copie, datée du jour du relevé, est versée dans la Release `sources-iptoasn` du dépôt, d'où la collecte la prend, sans geste de sa part.
  - Premier relevé : 20/11/2026, `ip2asn-combined-2026-11-20.tsv.gz`, 10 955 454 octets, SHA-256 `1634a0e449f3ee11088bba85493447a51007b44dff3ac18328f1f2d9127c0a9e`, 719 149 lignes (la version servie portait la date du 01/11/2026).
  - L'âge de la copie est publié chaque jour (`etat.json`, `sources`, `ageJours`) et le sera sur la page Qualité ; quand RIS la contredit le jour même, le niveau est « non déterminé ».
  - Pour le chantier 3 : demander à l'auteur, depuis une adresse sovermap.com, si un téléchargement automatique quotidien est permis (option C).
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
- **Adresses** (vérifiées le 20/11/2026 : HTTP 200) :
  - https://ftp.ripe.net/pub/stats/ripencc/delegated-ripencc-extended-latest
  - https://ftp.arin.net/pub/stats/arin/delegated-arin-extended-latest (12 929 688 octets)
  - https://ftp.apnic.net/stats/apnic/delegated-apnic-extended-latest (9 314 823 octets)
  - https://ftp.lacnic.net/pub/stats/lacnic/delegated-lacnic-extended-latest (4 587 589 octets)
  - https://ftp.afrinic.net/pub/stats/afrinic/delegated-afrinic-extended-latest (1 009 177 octets)
- **robots.txt** (lus le 20/11/2026) : ARIN, APNIC et LACNIC n'en ont pas (404) ; AFRINIC ferme seulement `/rfc`, `/db` et `/OVA` ; le RIPE NCC, seulement des documents et des mesures Atlas. `/pub/stats/` et `/stats/` restent ouverts partout.
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
- **Décision : retenue** (Cloudflare, CloudFront, Fastly, Azure Front Door). **Imperva** (21/11/2026, C.3) : sa liste officielle est retenue comme preuve du titulaire de l'AS 19551 (même titulaire au fichier de délégation de l'ARIN, fiche 21), pas encore lue par la collecte (format non pris en charge). De même, les listes de Cloudflare et de Fastly prouvent le titulaire des AS 13335 et 54113.

**Complément du 21/11/2026 (C.3)** : les relais de sécurité.

| Fournisseur | Adresse | Contenu (21/11/2026) | Accès automatique |
|---|---|---|---|
| Imperva | article « Allowlisting Imperva IP addresses and Setting IP restriction rules [c85245b7] », https://docs-cybersec.thalesgroup.com/bundle/z-kb-articles-knowledgebase-support/page/290228110.html | 11 plages IPv4, 1 plage IPv6, mise à jour du 06/08/2026 : « The following IPs are used by Cloud WAF services. » | Page rendue en JavaScript ; texte lisible par l'API du portail (`docs-cybersec-be.thalesgroup.com/api/bundle/<livre>/page/<page>`, `robots.txt` : `Allow: /api/`), en JSON avec un tableau HTML : format non pris en charge par la collecte aujourd'hui. L'API `my.imperva.com/api/integration/v1/ips` reste fermée (`Disallow: /`, relu le 21/11/2026). |
| Radware | aucune liste lisible | — | **Non** : support.radware.com fermé aux robots (`Disallow: /`, 21/11/2026) ; documentation derrière le portail client |
| OGO Security | aucune liste publique trouvée | — | — |

### 28. CDN : suffixes CNAME documentés par les fournisseurs
Chaque suffixe est lu dans la documentation du fournisseur, le 18/11/2026 :
- **Amazon CloudFront** : `.cloudfront.net` (« d111111abcdef8.cloudfront.net »).
- **Akamai** : `edgesuite.net`, `edgekey.net`, `akamaized.net` (« edgesuite.net Standard TLS hostname or Plain HTTP hostname. »).
- **Fastly** : `.fastly.net` (« The format for the CNAME record value is <letter>.sni.global.fastly.net »).
- **Cloudflare** : `.cdn.cloudflare.net`.
- **Azure** : `.azurefd.net` (Front Door) et `.azureedge.net` (Azure CDN).
- **Gcore** : `.gcdn.co`.
- **Bunny** : `.b-cdn.net`.

**Complément du 21/11/2026 (C.3)** :
- **Imperva** (documentation passée chez Thales : docs.imperva.com redirige vers docs-cybersec.thalesgroup.com) : `impervadns.net` (« The domain used for this purpose was recently changed from impervadns.net to ng.impervadns.net. », note de version du 21/01/2024) et `incapdns.net` (« the impervadns.net and incapdns.net domains. These domains support all websites onboarded », note du 10/10/2021). Lus le 21/11/2026 par l'API du portail. Réserve d'Imperva : « the structure of the domain used for CNAMEs is subject to change ».
- **Akamai** : `akamaiedge.net` (« "map": "e;dscb.akamaiedge.net" », API Edge Hostnames, page « Get an edge hostname », mise à jour du 01/03/2026, lue le 21/11/2026). La page de terminologie ne le nomme pas.
- **CDN77** : `rsc.cdn77.org` (article « Configuring CNAME », mis à jour le 10/09/2024 ; sa capture officielle montre « www.cdn77.com. 1058 IN CNAME 1669655317.rsc.cdn77.org. » ; lu le 21/11/2026).
- **Restent sans page officielle lisible (21/11/2026)** :
  - `radwarecloud.net` (Radware) : support fermé aux robots, documentation derrière le portail client ;
  - `ogosecurity.com` (OGO Security) : aucune documentation technique publique.
- **Ne sont pas des CDN** (plateformes d'hébergement) : `wixdns.net` (Wix : CNAME `pointing.wixdns.net` pour « connect an existing domain » à un site Wix) et `jimdo.com` (Jimdo : article « Comment fonctionne l'hébergement chez Jimdo », titre lu dans le plan du site).
- CDN77 n'entre dans `referentiels/cdn.json` qu'avec sa société (`datacamp-limited`, deux sources, C.1).


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

**Complément du 21/11/2026 (C.3)** :
- **AS confirmés au registre** par les sources retenues (fiches 18, 21 et 22 ; le RDAP, fiche 23, ne sert qu'au contrôle), relus le 21/11/2026 sur les copies du 19 et du 20/11/2026 :

| Fournisseur | AS | Preuve | Suffit seul |
|---|---|---|---|
| Cloudflare | 13335 | IPtoASN « CLOUDFLARENET - Cloudflare, Inc. » ; ARIN : US | oui |
| Fastly | 54113 | IPtoASN « FASTLY - Fastly, Inc. » ; ARIN : US | oui |
| Akamai | 20940 | RIPE : « AKAMAI-ASN1 », Akamai International B.V. (NL) | oui |
| Imperva | 19551 | IPtoASN « INCAPSULA - Incapsula Inc » ; ARIN : même titulaire que six plages de la liste officielle | oui |
| Radware | 48851, 198949 | RIPE : Radware Ltd (IL), même titulaire | oui |
| CDN77 | 60068 | RIPE : « CDN77 », Datacamp Limited (GB) | non : usage des 4 AS du titulaire non documenté ; le suffixe suffit |
| OGO Security | aucun | ni la base du RIPE ni IPtoASN ; relais sur AS16276 (OVH SAS) et AS15826 (NFrance Conseil) | — (AS partagés : jamais seuls) |

- **Vus, non retenus** : Radware 213232 (même titulaire, jamais observé), 15823 « RADWARE-AS » (autre fiche d'organisation), 25773 « RADWARE-CLOUD-SERVICES » (ARIN, Radware Inc., autre société) ; Imperva 62571 « IMPERVA-INC-US-SJ-COLO » (autre titulaire) et 14960 (même titulaire que 19551, rien d'annoncé). Gcore 199524 et Bunny 200325 : non vérifiés ici.

- **Radware, relais de sécurité sans documentation officielle lisible** (21/11/2026) : ses deux AS « suffisent seuls », au niveau « probable », par la règle du brief (C.2) : un relais placé devant un site se traite comme un CDN, prouvé par une documentation officielle, sinon « probable ». CDN77, lui, est un CDN dont le suffixe est prouvé : son AS n'a pas besoin de suffire seul.

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

### 56. Légifrance (DILA) : textes juridiques
- **Producteur** : Direction de l'information légale et administrative (DILA).
- **Adresse** : https://www.legifrance.gouv.fr
- **`robots.txt`** (lu le 21/11/2026) : HTTP 403, une page de défi anti-robots (« Just a moment... ») à la place du fichier : le site est **fermé aux robots**. Rien d'autre n'y a été demandé.
- **Écart corrigé** : `referentiels/societes.json` citait, pour le rattachement de la DINUM à l'État, le décret n° 2019-1088 du 25 octobre 2019 (lu le 19/11/2026, pendant la partie B), sans fiche au registre. La citation est retirée le 21/11/2026 (C.1) : ce rattachement repose sur le Référentiel de l'organisation administrative de l'État (fiche 4) et sur Sirene (fiche 32).
- **Décision : écartée** (fermée aux robots). Si un texte devenait nécessaire, une personne le lirait dans un navigateur ordinaire, pour un relevé manuel daté.

## E. Qualification et fond de carte

### 40. Catalogue des services qualifiés SecNumCloud de l'ANSSI
- **Producteur** : Agence nationale de la sécurité des systèmes d'information (ANSSI).
- **Document** : « Catalogue des produits et services certifiés, qualifiés ou agréés », édition de novembre 2026, mis à jour le 19/11/2026 à 18:34:21, 136 pages ; § 3.3.1 « Les services qualifiés » (pages 78 et 79). Le catalogue dit lui-même être mis à jour au moins une fois par mois, et se télécharger sur cyber.gouv.fr (« Découvrir les solutions certifiées qualifiées »).
- **Licence, mot pour mot** (pied de la page de l'ANSSI, déposée par le propriétaire) : « Sauf mention explicite de propriété intellectuelle détenue par des tiers, les contenus de ce site sont proposés sous licence etalab-2.0 ». On n'en reprend que des faits : fournisseur, service, type, dates, numéro de décision.
- **Téléchargement automatique testé** : **non**, et il ne se fera pas.
  - Le `robots.txt` et la page de cyber.gouv.fr répondent par une protection anti-robots (Imperva Incapsula). Rien n'a été contourné.
  - Aucune version ouverte n'existe sur data.gouv.fr (recherches « SecNumCloud », « ANSSI » : 0 résultat, au chantier T1).
- **Relevé manuel daté** : le propriétaire a téléchargé le catalogue (PDF) et la page « Prestataires de services d'informatique en nuage (SecNumCloud) » dans un navigateur ordinaire, et les a déposés le 20/11/2026 ; le tableau a été relevé le 21/11/2026, ligne par ligne, dans `referentiels/secnumcloud.json` (30 services de 13 fournisseurs).
  - La page de l'ANSSI ne liste que des prestataires **en cours de qualification** (ceux qui ont accepté de le rendre public) : ils ne sont jamais repris. Seuls comptent les services qualifiés du catalogue.
  - Le rapprochement des fournisseurs avec les sociétés du référentiel (par exemple « Cegedim » : le groupe, ou sa filiale Cegedim.cloud ?) demande deux sources : il est fait en C.4, ci-dessous (« Les décisions de qualification »).
- **Les décisions de qualification** (rapprochement, C.4, 22/11/2026) : chaque service qualifié du catalogue porte le numéro de sa décision (`decision` dans `referentiels/secnumcloud.json`). La décision est un PDF de l'ANSSI, sur un autre hôte que le catalogue : `https://messervices.cyber.gouv.fr/visas/<année>_<numéro>_np.pdf` (par exemple la décision n° 3395 du 31/07/2026, déjà lue au chantier T1 pour `docs/juridique.md`).
  - **`robots.txt`** de messervices.cyber.gouv.fr, lu le 22/11/2026 à 05:43 UTC (HTTP 200, 116 octets) : « User-agent: * », « Allow: / » ; seuls `/connexion` et `/oidc/` sont fermés. Aucune protection anti-robots sur cet hôte ; rien n'a été contourné.
  - **Usage** : les décisions des seuls fournisseurs qui peuvent correspondre à une de nos sociétés (Cegedim, Ecritel, Orange Business Services, Outscale, OVH, Worldline : 10 décisions), lues une à une, deux secondes d'écart au moins, avec l'agent `Sovermap-bot/<version> (+https://sovermap.vercel.app)`. On n'en reprend que des faits : la société qui porte la qualification (sa raison sociale, son numéro d'immatriculation et sa ville), et le numéro et la date de la décision.
  - **Deux sources par lien**, de deux producteurs : l'ANSSI (le catalogue donne le fournisseur et le numéro de la décision ; la décision, la raison sociale, le numéro d'immatriculation et la ville) et l'Insee, par Sirene (API Recherche d'entreprises, fiche 32), déjà dans les sources de nos sociétés, pour le SIREN.
  - **Conditions de messervices.cyber.gouv.fr**, mot pour mot (page « Mentions légales », lue le 22/11/2026 à 07:37 UTC ; elles ne reprennent pas la licence etalab-2.0 de cyber.gouv.fr) : « Sauf mention expresse contraire, tous les contenus protégeables par le droit de la Propriété intellectuelle ne peuvent être reproduits ou réutilisés sans l'autorisation expresse de l'ANSSI. » Aucune décision n'est reproduite ni republiée : seuls des faits en sont repris (ci-dessus), qui ne sont pas protégeables, comme pour la fiche 47 (« faits seulement »).
  - Une décision illisible ou introuvable, ou une raison sociale qui ne correspond à aucune de nos sociétés : le lien reste vide (`societe: null`), jamais deviné. Un groupe n'hérite jamais de la qualification d'une filiale, ni l'inverse.
  - **Résultat** (22/11/2026, `rapprochement` dans `referentiels/secnumcloud.json`) : 7 décisions lues, 3 introuvables à l'adresse attendue (HTTP 404 : Ecritel n° 4267 et 4268, OVH n° 559). 6 services liés à 4 sociétés : Cegedim.cloud, OVH SAS (2), Orange Business Services (2), Outscale (qualification valable jusqu'au 30/11/2026). Cegedim.cloud : la décision écrit « 790 163 066 R.C.S. Nanterre », qui n'est pas un SIREN (clé de Luhn fausse) ; la raison sociale et la ville décident, et concordent avec Sirene (790 173 066). Worldline : la décision nomme Worldline France (SIREN 509 750 105), absente du référentiel ; ni Worldline ni Worldline IGSA ne sont liées.
- **Ce qu'on en tire** : la couche 8 (`docs/methode.md`), avec sa phrase obligatoire : « Cette société a au moins une offre qualifiée SecNumCloud. Cela ne veut pas dire que ce site l'utilise. »
- **Pièges** : une qualification a une date de fin (Outscale : 30/11/2026 ; OVH, Hosted Private Cloud : 29/12/2026) ; un service peut changer de nom d'une édition à l'autre ; l'extraction du PDF en texte mélange les cellules sur plusieurs lignes (relire le tableau en mode « table »).
- **Mise à jour** : un nouveau relevé manuel à chaque nouvelle édition mensuelle, déposé par le propriétaire ; la date de l'édition est publiée avec la couche. Plus tard, et sur décision du propriétaire : demander à l'ANSSI une version ouverte de la liste.
- **Décision : retenue (relevé manuel daté).**

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

- **Complément du 21/11/2026 (partie C.7)** :
  - **robots.txt** de naciscdn.org : HTTP 403 (`AccessDenied`, serveur S3). Un `robots.txt` inaccessible (4xx) n'interdit rien (RFC 9309 ; c'est la règle de `pipeline/sources.ts`).
  - **Fichier relu** : `ne_50m_admin_0_countries.zip`, HTTP 200, 799 734 octets, `Last-Modified: Fri, 13 May 2022 05:21:46 GMT`, version 5.1.1, 242 unités (le même fichier qu'à la fiche 41).
  - **Piège confirmé** : `ISO_A3` vaut -99 pour 8 unités, dont la France et la Norvège (`ISO_A3_EH` donne FRA et NOR).
  - **Jointure** : `ISO_A2_EH` = code alpha-2. Quand plusieurs unités ont le même code (AU : AUS, IOA, ATC), on garde celle dont `ADM0_A3` = code alpha-3.
    - 236 lignes ont une unité. Quatre ont un `ADM0_A3` différent du code ISO : AX → ALD, EH → SAH, PS → PSX, SS → SDS.
    - 13 lignes n'ont pas d'unité propre au 1:50m :
      - les départements d'outre-mer (GF, GP, MQ, RE, YT) sont dans l'unité FRA : sa boîte englobante va de -61,8° à 55,8° de longitude et descend à -21,4° de latitude ;
      - SJ est dans NOR (jusqu'à 80,5° N), BQ dans NLD, TK dans NZL, CC et CX dans IOA ;
      - BV, GI et UM : absents, ou compris dans une autre unité (non vérifié).
  - **6 unités sans ligne ISO propre** :
    - SOL (Somaliland), CYN (Chypre du Nord), KAS (glacier de Siachen) ;
    - KOS (Kosovo ; `ISO_A2_EH` = XK, code qui n'est pas attribué par la norme) ;
    - IOA (Territoires australiens de l'océan Indien : îles Christmas et Cocos, codées AU) ;
    - ATC (îles Ashmore-et-Cartier, codées AU).

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
- **Copie renouvelée** le 22/11/2026 (robots.txt relu le même jour : « Disallow: /images/ » seulement) : version `2026-11-21_04-33-45_UTC`, commit `87a2c1b8de5886a133ff4da21b2aa6fec88d8739`, 342 871 octets, réduite par `pipeline/cli/epingler-psl.ts` dans `referentiels/psl/public_suffix_list-2026-11-21.dat` (l'ancienne copie retirée) ; 3 règles ajoutées (`fj.kg`, `wordsmithmcpcontent.com`, `staging.wordsmithmcpcontent.com`) et 1 retirée (`xihuan`) : aucune ne touche un suffixe des sites mesurés. Un changement de règles (sa version est dans `etat.json`).
- **Données personnelles** : des noms et des adresses e-mail de contributeurs dans les commentaires ; écartés de la copie, jamais lus par la collecte.
- **Attribution à afficher** : par courtoisie : « Domaines enregistrés : Public Suffix List (publicsuffix.org), MPL 2.0, version du <date> ».
- **Décision : retenue** (outil de calcul ; rien de la liste n'est republié dans les données, sinon la copie épinglée dans le code source).

## G. Pays, appartenances et décisions d'adéquation

Toutes les pages, API et fichiers de cette section ont été lus le **21/11/2026**, avec l'agent `Sovermap-bot/0.1.0 (+https://sovermap.vercel.app)`, le `robots.txt` de chaque hôte lu d'abord, dans une requête à part. Le référentiel qui en sort est `referentiels/pays.json` (249 lignes).


### 43. Table « Countries and territories » (EU Vocabularies, Office des publications de l'UE)
- **Producteur** : Office des publications de l'Union européenne (éditeur) ; auteur : Eurostat (d'après la fiche de la table).
- **Adresse** : https://op.europa.eu/en/web/eu-vocabularies/dataset/-/resource?uri=http://publications.europa.eu/resource/dataset/country
  - Données lues par le point d'accès SPARQL de l'Office : https://publications.europa.eu/webapi/rdf/sparql, graphe `http://publications.europa.eu/resource/authority/country`.
  - C'est la voie que l'Office propose lui-même : sa page https://op.europa.eu/en/web/eu-vocabularies/samples donne des requêtes toutes faites vers ce point d'accès (CSV, JSON, HTML).
- **Ce qu'on en tire** (version `20260923-0`, la dernière au 21/11/2026) :
  - 283 fiches portent un code de type `ISO_3166_1_ALPHA_2` : 253 courantes, 30 dépréciées (URSS, Yougoslavie, Zaïre…).
  - Parmi les 253 courantes, 4 codes ne désignent pas un pays d'après les définitions de la table elle-même ; ils sont écartés :
    - `EU` : l'Union européenne ;
    - `IC` : « Spanish autonomous community and archipelago in the Atlantic Ocean » (îles Canaries), sans code alpha-3 ;
    - `CP` : « public land belonging to France » (Clipperton) ;
    - `CQ` : « part of the Channel Islands […] which forms part of the Bailiwick of Guernsey » (Sercq).
  - Restent **249 lignes**, autant que les codes officiellement attribués par la norme ISO 3166-1. Ce compte n'a pas été relu auprès de l'ISO (fiche 49).
  - Pour chaque ligne :
    - les codes alpha-2, alpha-3 et numérique ;
    - le code du Code de rédaction (`EL` pour la Grèce, `UK` pour le Royaume-Uni) ;
    - les noms courts en français et en anglais (`skos:prefLabel`) ;
    - les appartenances (`dct:type` → `membership-classification/…`) : `EU` sur 35 fiches (dont l'Union elle-même), `EEA` sur 37, `EFTA` sur 5 ;
    - le continent (`geosparql:sfWithin` → `continent/…`) : `EUROPE` (52 fiches), `ASIA EUROPE` (AZ, GE, KZ, RU, TR)…
  - La table dit suivre le Code de rédaction pour les noms : « For the names of countries and territories, the corporate list synchronises with the Interinstitutional Style Guide (ISG, Section 7.1 and Annexes A5 and A6) ».
- **Pièges relevés** :
  - le nom anglais de Nauru est « Naoero » ;
  - le nom de la Corée (« Corée du Sud ») précède le changement du Code du 14/10/2026 (fiche 44) ;
  - le nom préféré de la Palestine porte un astérisque, « Palestine* », qui renvoie à la note de l'UE citée dans la table : « This designation shall not be construed as recognition of a State of Palestine and is without prejudice to the individual positions of the Member States on this issue. » L'autre nom de la même fiche (`skos:altLabel`) est « Palestine » ; l'INSEE (fiche 48) et Natural Earth disent aussi « Palestine » ;
  - le code numérique manque pour le Népal et Sainte-Hélène (Sovermap ne s'en sert pas).
- **Licence ou conditions, mot pour mot** :
  - fiche de la table : « License: European Commission reuse notice » ;
  - définition de cette licence dans la table des licences de l'UE (`http://publications.europa.eu/resource/authority/licence/COM_REUSE`, lue par SPARQL) : « According to the European Commission reuse notice, reuse is authorised, provided the source is acknowledged. The reuse policy of the European Commission is implemented by the Decision of 12 December 2011. The general principle of reuse can be subject to conditions which may be specified in individual copyright notices. Therefore users are advised to refer to the copyright notices of the individual websites maintained under Europa and of the individual documents. Reuse is not applicable to documents subject to intellectual property rights of third parties. » ; la décision visée est la décision 2011/833/UE (http://data.europa.eu/eli/dec/2011/833/oj) ;
  - avis de droits d'auteur de l'Office (https://op.europa.eu/en/web/about-us/legal-notices/publications-office-of-the-european-union-copyright) : « The editorial content of this website, which is owned by the EU, is licensed under the Creative Commons Attribution 4.0 International licence. » et « If you need further information regarding copyright issues, including the conditions under which the content of the CELLAR, and of the EU Vocabularies may be re-used, please contact us » (adresse omise ici).
  - **Réserve** : la norme ISO 3166 appartient à l'ISO. La table ne reprend que les codes, « correlated with the ISO 3166 international standard ». Sovermap ne publie que ces codes courts, déjà employés dans ses données (`"pays": "US"`). Les conditions de l'ISO n'ont pas été lues.
- **Limites de débit** : aucune annoncée. Quatre requêtes SPARQL sur la table le 21/11/2026 (et deux pour la fiche 47), espacées d'au moins 2 s.
- **robots.txt** : le `robots.txt` de publications.europa.eu renvoie (HTTP 301) vers https://op.europa.eu/robots.txt (HTTP 200, 1 989 octets).
  - Règles : `Allow: /` pour tous ; fermés notamment `/*p_p_id=`, `/*p_p_lifecycle=`, `/*/web/eu-vocabularies/dataset?*` et `/*/web/style-guide/*`.
  - Les liens de téléchargement de la page de la table passent par un portlet (`p_p_id=`) : ils n'ont pas été utilisés.
  - `/webapi/rdf/sparql` reste ouvert.
- **Attribution à afficher** : « Codes et noms des pays : Office des publications de l'Union européenne, EU Vocabularies, table « Countries and territories », version 20260923-0, © Union européenne, réutilisation autorisée (décision 2011/833/UE) ».
- **Téléchargement automatique testé** : **oui**. Requête GET sur le point d'accès, `format=text/csv` : HTTP 200, 64 528 octets, 283 lignes.
  - Requête (résumé) : pour chaque `skos:Concept` du graphe qui a un `euvoc:xlNotation` de type `notation-type/ISO_3166_1_ALPHA_2`, lire les notations `ISO_3166_1_ALPHA_3`, `ISO_3166_1_NUM` et `ISG_COU` sans `euvoc:endDate`, les `skos:prefLabel` `fr` et `en`, `euvoc:status`, `authority:deprecated`, `owl:versionInfo`, les `dct:type` en `membership-classification/` et les `geosparql:sfWithin` en `continent/`.
  - Garder `concept-status/CURRENT`, puis retirer `EU`, `IC`, `CP` et `CQ`.
- **Données personnelles** : aucune.
- **Décision : retenue**, comme source principale : codes ISO, noms, appartenance à l'UE et à l'EEE, continent. La table paraît environ quatre fois par an (versions 20260105, 20260318, 20260617 et 20260923 en 2026) ; on relit la dernière à chaque mise à jour du référentiel.

### 44. Code de rédaction interinstitutionnel, annexes A5 et A6 (Office des publications de l'UE)
- **Producteur** : Office des publications de l'Union européenne, pour les institutions de l'UE.
- **Adresse** :
  - https://style-guide.europa.eu/fr/content/-/isg/topic?identifier=annex-a6-country-and-territory-codes (et `…=annex-a5-list-countries-territories-currencies`) ;
  - le tableau est servi à part, dans une iframe : https://style-guide.europa.eu/o/opportal-service/isg?resource=fr/annex-a6-country-and-territory-codes.html (`en/…` pour l'anglais).
- **Ce qu'on en tire** :
  - **Annexe A6** (« Codes des États et territoires », dernière modification du 14/10/2026) : 248 codes à deux lettres et les noms courts, sans article, en français et en anglais. Les codes suivent l'usage de l'UE : `EL` (Grèce), `UK` (Royaume-Uni) et `CP` (Clipperton). La Palestine (`PS`) et les îles BES (`BQ`) n'y figurent pas.
  - **Annexe A5** (« Liste des États, territoires et monnaies », dernière modification du 15/10/2026) : noms courts avec article, noms longs, capitales, monnaies. On y lit le changement du 14/10/2026 : « République de Corée, nom court: «République de Corée (la)» au lieu de «Corée du Sud (la)» ».
  - Comparaison avec la table de l'UE (fiche 43) : l'annexe A6 couvre 247 des 249 lignes. Les deux noms concordent sur 240 d'entre elles et diffèrent sur 7, où `pays.json` garde le nom du Code (en gras, le nom qui change) :

    | Code | Table de l'UE (fr / en) | Code de rédaction (fr / en) |
    |---|---|---|
    | BF | Burkina Faso / Burkina Faso | **Burkina** / Burkina Faso |
    | CC | Îles des Cocos / Cocos (Keeling) Islands | **Îles Cocos** / Cocos (Keeling) Islands |
    | FO | Îles Féroé / Faroes | **Féroé** / Faroes |
    | GF | Guyane / French Guiana | **Guyane (française)** / French Guiana |
    | KR | Corée du Sud / South Korea | **République de Corée** / **Republic of Korea** |
    | NR | Nauru / Naoero | Nauru / **Nauru** |
    | VA | Saint-Siège / Holy See | **Saint-Siège/État de la Cité du Vatican** / **Holy See/Vatican City** |
- **Licence ou conditions, mot pour mot** (https://style-guide.europa.eu/fr/legal-notice, texte servi par `…/isg?resource=fr/legal-notice.html`) :
  - « © Union européenne, 2000-2026 » ;
  - « Le Code de rédaction interinstitutionnel peut être réutilisé à des fins commerciales et non commerciales, gratuitement et sans autorisation écrite, moyennant la mention de la source et le respect des conditions suivantes: lorsque la réutilisation implique la traduction de la totalité ou d'une partie du Code dans une langue autre que celles des éditions publiées officiellement par l'Office des publications, ou des modifications des données ou du texte du Code, l'utilisateur final de l'information doit en être clairement informé. Une clause sur la non-responsabilité de l'Office des publications doit être ajoutée; les logos et les marques ne sont pas couverts par l'autorisation générale susmentionnée. » ;
  - « La politique de réutilisation des documents de la Commission européenne est mise en œuvre sur la base de la décision 2011/833/UE de la Commission du 12 décembre 2011 relative à la réutilisation des documents de la Commission ».
  - Conséquence : les noms sont repris tels quels. S'il fallait en modifier un, la page Données le dirait, avec une clause de non-responsabilité de l'Office des publications.
- **robots.txt** (https://style-guide.europa.eu/robots.txt, HTTP 200, 491 octets) :
  - fermés : `/*/search-results*`, `/*/advanced-search*`, `/*/dashboard*`, `/*/my-profile*`, `/*/my-cards-lists*`, `/c/portal/`, `/*/content/-/isg/side-by-side*`, `/*/web/*` ;
  - ouverts : les pages `/fr/content/-/isg/topic?…` et le contenu `/o/opportal-service/isg?…`.
  - L'ancienne adresse du Code sur op.europa.eu (`/*/web/style-guide/*`) est fermée aux robots.
- **Attribution à afficher** : « Noms des pays : Code de rédaction interinstitutionnel, annexe A6, Office des publications de l'Union européenne, © Union européenne, 2000-2026 ».
- **Téléchargement automatique testé** : **oui** (HTTP 200) :
  - annexe A6 : 82 099 octets en français, 80 058 en anglais ;
  - annexe A5 : 1 174 219 octets en français, 886 669 en anglais.
  - Le plan du site (`sitemap-isg_0-xml`) pèse 14,8 Mo : inutile de le relire, les adresses sont stables.
- **Données personnelles** : aucune (les adresses de contact de l'Office ne sont pas reprises).
- **Décision : retenue** pour les noms des 7 lignes ci-dessus, et en contrôle pour les 240 autres lignes qu'elle couvre.

### 45. Liste des pays de l'Union européenne (european-union.europa.eu)
- **Producteur** : Commission européenne ; gestionnaire du site : direction générale de la communication.
- **Adresse** : https://european-union.europa.eu/principles-countries-history/eu-countries_fr (deux pages : 20 pays, puis 7 avec `?page=1`).
- **Ce qu'on en tire** : les **27 États membres**, avec l'année d'adhésion (et, selon le cas, l'année d'entrée dans la zone euro et dans l'espace Schengen) : Allemagne, Autriche, Belgique, Bulgarie, Chypre, Croatie, Danemark, Espagne, Estonie, Finlande, France, Grèce, Hongrie, Irlande, Italie, Lettonie, Lituanie, Luxembourg, Malte, Pays-Bas, Pologne, Portugal, Roumanie, Slovaquie, Slovénie, Suède, Tchéquie.
  - La liste concorde avec les 27 États marqués `EU` dans la table de l'UE (fiche 43).
  - La table marque aussi `EU` 7 territoires qui ont leur propre code ISO : AX, GF, GP, MF, MQ, RE, YT.
- **Licence ou conditions, mot pour mot** (https://european-union.europa.eu/legal-notice_fr) :
  - « © Union européenne, 1995-2026 » ;
  - « Sauf indication contraire (par exemple, dans des déclarations spécifiques concernant les droits d'auteur), les contenus détenus par l'UE sur ce site web font l'objet d'une licence sous Creative Commons Attribution 4.0 International (CC BY 4.0). Cela signifie que la réutilisation est autorisée moyennant citation appropriée et indication de toute modification. »
- **robots.txt** (https://european-union.europa.eu/robots.txt, HTTP 200, 1 647 octets) : il ferme `/core/`, `/profiles/`, `/admin/`, `/search/` et `/user/…` ; les pages de contenu sont ouvertes.
- **Attribution à afficher** : « Liste des États membres : Union européenne, european-union.europa.eu, CC BY 4.0 ».
- **Téléchargement automatique testé** : **oui**. HTTP 200 : 119 098 et 104 450 octets ; avis juridique : 92 361 octets.
- **Données personnelles** : aucune.
- **Décision : retenue en contrôle seulement** : elle confirme les 27 États de la fiche 43.

### 46. Décisions d'adéquation de l'UE (Commission européenne)
- **Producteur** : Commission européenne.
- **Adresse** : https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en
  - Il n'y a pas de version française : `…_fr` renvoie à la page anglaise (`?prefLang=fr`).
- **Ce qu'on en tire** :
  - la liste officielle, mot pour mot : « The European Commission has so far recognised: Andorra, Argentina, Brazil, Canada (commercial organisations), Faroe Islands, Guernsey, Israel, Isle of Man, Japan, Jersey, New Zealand, Republic of Korea, Switzerland, the United Kingdom under the GDPR and the LED, as amended in December 2025 through one renewal decision under the GDPR and one renewal decision under the LED, the United States (commercial organisations participating in the EU-US Data Privacy Framework), Uruguay, and the European Patent Organisation as providing adequate protection. »
    - Cela fait 16 pays ou territoires, plus l'Organisation européenne des brevets, organisation internationale sans ligne ISO.
    - Chaque nom renvoie à sa décision (numéros CELEX), ce qui donne la référence ; la date vient de la fiche 47.
  - l'effet : « personal data can flow from the EU (and Norway, Liechtenstein and Iceland) to that third country without any further safeguard being necessary » ;
  - la limite : « With the exception of the United Kingdom, these adequacy decisions do not cover data exchanges in the law enforcement sector which are governed by the Law Enforcement Directive (Article 36 of Directive (EU) 2016/680). »
  - Royaume-Uni : la décision de renouvellement au titre du RGPD (C(2025) 8771 final du 19.12.2025, PDF lu sur le même site) prévoit : « This Decision shall expire on 27 December 2031 ».
  - Corée : premier réexamen conclu le 23/07/2026 (rapport COM(2026) 384 final, PDF lu sur le même site).
  - Kenya : seulement une déclaration du 16/11/2026, « The EU and Kenya advance towards a landmark mutual data adequacy arrangement » ; aucune décision au 21/11/2026.
- **Portée** : `pays.json` dit « partielle » dans deux cas :
  - quand la liste restreint la portée : Canada (« commercial organisations ») et États-Unis (« commercial organisations participating in the EU-US Data Privacy Framework ») ;
  - quand le titre officiel de la décision la restreint (fiche 47) : Israël et Uruguay (« concernant le traitement automatisé des données à caractère personnel »).
  - Sinon « totale ». Pour le Japon et la Corée, le titre nomme la loi nationale (« en vertu de la loi sur la protection des informations à caractère personnel ») ; c'est dit dans `precision`, sans changer la portée.
- **Licence ou conditions, mot pour mot** (https://commission.europa.eu/legal-notice_en) :
  - « © European Union, 1995-2026 » ;
  - « Unless otherwise indicated (e.g. in individual copyright notices), content owned by the EU on this website is licensed under the Creative Commons Attribution 4.0 International (CC BY 4.0) licence. This means that reuse is allowed, provided appropriate credit is given and changes are indicated. »
- **Limites de débit** :
  - les pages ordinaires ont répondu 200 ;
  - `/document/download/…` a répondu 429 (« Too Many Requests », « Please try again later ») à 2 requêtes sur 5, espacées de 2 s, puis à une nouvelle tentative une dizaine de minutes plus tard. Plus aucune requête n'a été faite à ce chemin ce jour-là : les références et les dates viennent de la fiche 47.
  - Un document de ce chemin (rapport de 2024 sur les onze décisions de la directive 95/46/CE) redirige vers EUR-Lex, fermé aux robots (fiche 49).
- **robots.txt** (https://commission.europa.eu/robots.txt, HTTP 200, 1 643 octets) : il ferme `/core/`, `/profiles/`, `/admin/`, `/search/` et `/user/…` ; `/law/…`, `/legal-notice_en` et `/document/download/…` sont ouverts.
- **Attribution à afficher** : « Décisions d'adéquation : Commission européenne, commission.europa.eu, CC BY 4.0 ».
- **Téléchargement automatique testé** : **oui** :
  - page : HTTP 200, 204 566 octets ;
  - rapport sur la Corée : 162 060 octets ; renouvellement britannique : 404 648 octets.
- **Données personnelles** : aucune.
- **Décision : retenue** : la liste des pays et la portée des décisions. À relire à chaque mise à jour du référentiel : un accord avec le Kenya est en préparation (déclaration du 16/11/2026).

### 47. Cellar de l'Office des publications : métadonnées des actes de l'UE
- **Producteur** : Office des publications de l'Union européenne. Le Cellar est son dépôt commun de publications et de métadonnées ; EUR-Lex en est l'un des principaux utilisateurs, d'après la page du Cellar.
- **Adresse** : point d'accès SPARQL https://publications.europa.eu/webapi/rdf/sparql (ontologie CDM) ; présentation : https://op.europa.eu/en/web/cellar/home
- **Ce qu'on en tire** : pour chaque décision de la fiche 46, des faits : le numéro, la date (`cdm:work_date_document`), le type d'acte et le titre officiel, en français et en anglais.
  - 16 actes retrouvés par leur numéro CELEX : les décisions des 15 pays de la liste hors Brésil, et la décision britannique (UE) 2021/1773 au titre de la directive (UE) 2016/680. S'y ajoutent les 6 décisions d'exécution adoptées depuis le 01/06/2025 dont le titre anglais contient « adequate » :
    - (UE) 2025/1225 et 2025/1226 : prolongations techniques pour le Royaume-Uni ;
    - (UE) 2025/1382 : Organisation européenne des brevets ;
    - (UE) 2025/2571 et 2025/2574 : renouvellements pour le Royaume-Uni ;
    - (UE) 2026/179 : Brésil.
  - Les titres précisent la portée :
    - Israël et Uruguay : « concernant le traitement automatisé des données à caractère personnel » ;
    - Canada : « assuré par la loi canadienne sur la protection des renseignements personnels et les documents électroniques » ;
    - États-Unis : « assuré par le cadre de protection des données UE - États-Unis ».
  - Le titre officiel de la décision féroïenne écrit son numéro « 2010/146/ », sans suffixe : `pays.json` écrit « Décision 2010/146 ».
  - C'est la voie machine que propose l'éditeur du Journal officiel ; EUR-Lex est fermé aux robots (fiche 49).
- **Licence ou conditions, mot pour mot** :
  - la page du Cellar annonce : « Dissemination of the metadata as Linked Open Data » et « it is open to all EU citizens and provides machine-readable data » ;
  - l'avis de l'Office renvoie, pour les conditions de réutilisation du Cellar, à une demande par e-mail (citation à la fiche 43). **Aucune licence propre au Cellar n'est écrite.**
  - Les actes de la Commission relèvent de sa politique de réutilisation, la décision 2011/833/UE, citée par la notice `COM_REUSE` (fiche 43) et par l'avis du Code de rédaction (fiche 44).
- **robots.txt** : celui de publications.europa.eu (fiche 43) ; `/webapi/rdf/sparql` est ouvert.
- **Attribution à afficher** : « Références des décisions : Office des publications de l'Union européenne, Cellar ».
- **Téléchargement automatique testé** : **oui**. Deux requêtes SPARQL (HTTP 200 ; 11 424 et 4 110 octets).
  - La première filtre par `cdm:resource_legal_id_celex` (16 valeurs, `xsd:string`) ; la seconde, par `cdm:work_date_document` ≥ 2025-06-01, type `resource-type/DEC_IMPL` et « adequate » dans le titre anglais.
- **Données personnelles** : aucune.
- **Décision : retenue pour des faits seulement** (numéro, date, courtes citations des titres officiels), comme la fiche 39 ; aucun texte n'est reproduit. Doute : pas de licence écrite propre au Cellar. Si Sovermap publiait davantage que ces références, il faudrait d'abord la demander à l'Office.

### 48. Code officiel géographique : pays et territoires étrangers au 01/01/2026 (INSEE)
- **Producteur** : Institut national de la statistique et des études économiques (INSEE).
- **Adresse** : https://www.data.gouv.fr/datasets/code-officiel-geographique-1
  - Ressource `2ada949d-c383-4bbc-95f0-c01a3391d822`, « Millésime 2026 : Pays et territoires étrangers au 01/01/2026 », du 24/02/2026.
  - Le fichier est sur insee.fr : https://www.insee.fr/fr/statistiques/fichier/8740222/v_pays_territoire_2026.csv
- **Ce qu'on en tire** :
  - 229 lignes : 196 États (`ACTUAL` = 1) et 33 territoires (`ACTUAL` = 4) ;
  - pour chacune : code INSEE (99xxx), nom court et nom long en français, codes ISO alpha-2, alpha-3 et numérique ;
  - 215 lignes ont un code alpha-2 (213 distincts), une fois la Namibie rétablie (voir le piège ci-dessous). Beaucoup de territoires sont regroupés, sans code ISO : par exemple « Dépendances de la Couronne britannique », qui réunit Guernesey, Jersey et l'île de Man. Le Kosovo n'a pas de code ISO.
  - Contrôle : sur les 249 lignes de `pays.json`, 213 paires alpha-2 / alpha-3 sont confirmées, **aucun désaccord**. Les 36 autres lignes sont absentes du fichier (outre-mer français, territoires regroupés).
  - **Piège** : l'API tabulaire lit le code « NA » de la Namibie comme une valeur vide (`CODEISO2: null`) ; il est rétabli d'après `CODEISO3` = NAM.
  - Avertissement du producteur : « La mention d'une entité géographique dans la présente base de données n'emporte pas de reconnaissance diplomatique par la République française. »
- **Licence ou conditions, mot pour mot** : « Licence Ouverte / Open Licence » (`fr-lo`, https://www.data.gouv.fr/api/1/datasets/58c984b088ee386cdb1261f3/ ; texte : https://www.etalab.gouv.fr/wp-content/uploads/2014/05/Licence_Ouverte.pdf). Comme pour la fiche 8 : citer la source et la date.
- **robots.txt** :
  - www.insee.fr ferme `*.csv`, `*.zip`, `*.xls` et `*.xlsx` : le fichier n'a pas été téléchargé ;
  - www.data.gouv.fr ouvre `/api/1/datasets/<id>/` ;
  - tabular-api.data.gouv.fr n'a pas de robots.txt (404).
- **Attribution à afficher** : « Source : Insee, Code officiel géographique, pays et territoires étrangers au 01/01/2026, Licence Ouverte ».
- **Téléchargement automatique testé** : **oui**, par l'API tabulaire : 5 pages de 50 lignes, `meta.total` = 229.
- **Données personnelles** : aucune.
- **Décision : retenue en contrôle seulement** (codes ISO), avec un second producteur, français.

### 49. Sources écartées ou non lues pour les pays (21/11/2026)
- **EUR-Lex** (eur-lex.europa.eu) : même son `robots.txt` répond par un défi anti-robots (HTTP 202, `x-amzn-waf-action: challenge`, corps vide). Le site est **fermé aux robots**, et rien n'y a été lu. Les références des décisions viennent du Cellar (fiche 47).
- **AELE** (www.efta.int) : le `robots.txt` (HTTP 200) met `Disallow: /` pour `ClaudeBot`, `anthropic-ai`, `Claude-Web`, `ChatGPT-User`, `GPTBot`, `CCBot`, entre autres.
  - Le groupe `*` reste ouvert, avec `Crawl-delay: 5`.
  - Ce relevé est fait par un agent d'IA : le site n'a pas été lu, par respect de cette intention.
  - L'EEE vient de la seule fiche 43. Pour une seconde source, une lecture par une personne, ou par la collecte (qui n'est pas un agent d'IA), reste possible.
- **ISO** (iso.org, plateforme de consultation en ligne) : non consultée.
  - La norme ISO 3166 appartient à l'ISO. Les codes viennent de la table de l'UE (fiche 43) et de l'INSEE (fiche 48).
  - Le statut exact de `EU`, `IC`, `CP` et `CQ` dans la norme (« exceptionnellement réservés ») n'a pas été vérifié à la source.
- **Liens de téléchargement d'EU Vocabularies** (portlet `p_p_id=`) : fermés par le `robots.txt` d'op.europa.eu ; remplacés par le point d'accès SPARQL.
- **Anciennes pages du Code de rédaction sur op.europa.eu** (`/*/web/style-guide/*`) : fermées par `robots.txt` ; le site style-guide.europa.eu est ouvert (fiche 44).
- **Fichiers de l'INSEE sur insee.fr** (`*.csv`) : fermés aux robots ; lus par l'API tabulaire de data.gouv.fr (fiche 48).

### Règles de `referentiels/pays.json`
- **Lignes** : les fiches courantes de la table de l'UE (fiche 43) qui ont un code ISO 3166-1 alpha-2, moins `EU`, `IC`, `CP` et `CQ` : **249**.
- **`a2`, `a3`** : la table (fiche 43). L'INSEE (fiche 48) en confirme 213, sans aucun désaccord.
- **`adm0_a3`** : Natural Earth au 1:50m (fiche 41), joint par `ISO_A2_EH`, jamais par `ISO_A3`. Il vaut `null` pour 13 lignes.
- **`fr`, `en`** : la table, sauf quand l'annexe A6 du Code de rédaction (fiche 44) diffère : c'est alors le nom du Code (7 lignes). L'astérisque de « Palestine* » est retiré (nom sans astérisque de la même table).
- **`ue`** : appartenance `EU` de la table, soit 34 lignes : les 27 États (confirmés par la fiche 45) et 7 territoires qui ont leur propre code (AX, GF, GP, MF, MQ, RE, YT).
- **`eee`** : appartenance `EEA` de la table, soit 37 lignes : 30 États (les 27, l'Islande, le Liechtenstein et la Norvège) et les mêmes 7 territoires. D'après la table, le Svalbard et Jan Mayen (SJ) n'en fait pas partie.
- **`europeHorsUe`** : continent `EUROPE` dans la table (seul ou avec `ASIA`) et `ue` faux. Cela donne 28 lignes : AD, AL, AZ, BA, BY, CH, FO, GB, GE, GG, GI, IM, IS, JE, KZ, LI, MC, MD, ME, MK, NO, RS, RU, SJ, SM, TR, UA, VA. Cinq sont classées à la fois en Asie et en Europe : AZ, GE, KZ, RU, TR.
- **`adequation`** : les 16 lignes de la liste de la Commission (fiche 46), avec la référence et la date tirées du Cellar (fiche 47). La portée suit la règle de la fiche 46 : partielle pour CA, IL, US et UY. Aucune autre ligne n'en reçoit, pas même les territoires d'un pays adéquat.
- **`sources`** : les fiches qui donnent ou confirment la ligne ; **`lu`** : 2026-11-21.

### Écarts du 21/11/2026, consignés par honnêteté
- Un document de commission.europa.eu (`/document/download/f62d70a4…`) a redirigé vers eur-lex.europa.eu, dont le `robots.txt` répond par un défi anti-robots. L'outil a suivi la redirection automatiquement : **une requête GET a atteint EUR-Lex** (HTTP 200, 237 857 octets). Le fichier a été supprimé sans être ouvert, et aucun chiffre n'en vient.
  - **Parade** : ensuite, aucune redirection n'a plus été suivie automatiquement ; chaque saut a été lu, puis vérifié contre le `robots.txt` de son hôte.
- Les réponses 429 de commission.europa.eu ont été respectées : une seule nouvelle tentative, une dizaine de minutes plus tard, puis plus rien sur ce chemin.

## H. Territoires : annuaire local, codes officiels, fond de carte

Toutes les pages, API et fichiers de cette section ont été lus le **21/11/2026**, entre 18:36 et 18:50 UTC, avec l'agent `Sovermap-bot/0.1.0 (+https://sovermap.vercel.app)`, avec `curl` sans `-L` : aucune redirection n'a été suivie automatiquement. Le `robots.txt` de chaque hôte a été lu d'abord, dans une requête à part. En tout : 39 requêtes, au moins 6 secondes entre deux requêtes vers un même hôte, aucune réponse de plus de 1 778 584 octets.

### 50. Annuaire de l'administration, base de données locales (DILA), copie retraitée par la DINUM sur Hugging Face
- **Producteur** : Direction de l'information légale et administrative (DILA), jeu « Service-public.gouv.fr - Annuaire de l’administration - Base de données locales » (data.gouv.fr, jeu `53699fe4a3a729239d206227`, publié sous l'organisation « Premier ministre »).
- **Relais** : organisation `AgentPublic` sur Hugging Face, projet MediaTech.
  - Le README renvoie au code du projet sur `github.com/etalab-ia/mediatech` (Etalab, à la DINUM) et à un questionnaire sur `grist.numerique.gouv.fr`.
  - La page de l'organisation ne nomme aucune administration, et Hugging Face ne l'a pas vérifiée (`isVerified: false`, API `/api/organizations/AgentPublic/overview`).
  - La DINUM comme relais vient donc du brief et de ces deux indices, pas d'une déclaration lue.
- **Adresse** : https://huggingface.co/datasets/AgentPublic/local-administrations-directory
  - Métadonnées : `https://huggingface.co/api/datasets/AgentPublic/local-administrations-directory?blobs=true`.
  - Jeu source cité par le README : https://www.data.gouv.fr/datasets/service-public-fr-annuaire-de-l-administration-base-de-donnees-locales/ ; ce nom redirige (HTTP 308) vers `…/service-public-gouv-fr-annuaire-de-ladministration-base-de-donnees-locales/`.
  - Fichier d'origine de la DILA, d'après data.gouv.fr : https://lecomarquage.service-public.gouv.fr/donnees_locales_v4/all_latest.tar.bz2 (mis à jour le 21/11/2026 à 03:38 UTC). Il n'a pas été contacté (fiche 3).
- **Ce qu'on en tire** :
  - **L'état courant** (configuration `latest`, celle par défaut) : dossier `data/local-administrations-directory-latest/`, deux fichiers Parquet, commit `6c62e5089ef2266a30246ac91fda44816d779377` du 14/11/2026 à 00:38:54 UTC (« Updating local-administrations-directory dataset ») :

    | Fichier | Octets | SHA-256 | Lignes | Groupes de lignes | Pied de page |
    |---|---|---|---|---|---|
    | `local_administrations_directory_part_0.parquet` | 260 729 184 | `ef21b3f90768ae2fab1289f89f9eb863b70987d5058c475897d5b09baa3c378e` | 50 000 | 1 | 8 451 octets |
    | `local_administrations_directory_part_1.parquet` | 188 820 189 | `b14872e951bc4ae77edc2da0c61da0b5a182c4871d3230434a75902e073d0dd0` | 36 201 | 1 | 8 531 octets |

  - Total : 449 549 373 octets et **86 201 lignes**. La DILA annonce « plus de 86 000 guichets publics locaux ». Le brief disait 85 865 lignes au 20/11/2026 : écart non expliqué.
  - **Les copies datées** : 33. Une en août 2025, en un seul fichier de 614 888 247 octets ; puis 32 en deux fichiers, du 24/10/2025 au 30/10/2026. Depuis le 06/03/2026, une copie tous les 14 jours, deux fois 21 jours. Le dossier `-latest` est réécrit à chaque copie ; la copie du 14/11/2026 n'a pas encore son dossier daté. Le dépôt pèse 19 856 696 429 octets en tout.
  - **La fraîcheur** : la colonne `modification_date` du second fichier va du 2023-08-09 au **2026-11-12**. La copie reprend donc un fichier de la DILA du 12/11/2026 au plus tôt (le premier fichier n'a pas été lu).
  - **Les 24 colonnes**, lues dans le pied de page (dans l'ordre du fichier) : `chunk_id`, `doc_id`, `chunk_xxh64`, `types`, `name`, `mission_description`, `addresses`, `phone_numbers` (liste), `mails` (liste), `urls` (liste), `social_medias` (liste), `mobile_applications` (liste), `opening_hours`, `contact_forms` (liste), `additional_information`, `modification_date`, `siret`, `siren`, `people_in_charge`, `organizational_chart` (liste), `hierarchy`, `directory_url`, `chunk_text`, `embeddings_bge-m3`. Toutes les valeurs sont du texte UTF-8, seules ou en listes, et peuvent être vides.
  - **Les colonnes utiles** (brief) : `name`, `types`, `urls`, `siren`, `siret`, `addresses` (pour la commune et le code postal), `hierarchy`, `modification_date`. Elles pèsent 1,2 % des octets (voir « Lecture des colonnes utiles »). Le lecteur (`pipeline/annuaire-local.ts`) en lit sept : `hierarchy` n'est pas lue, car elle ne servirait qu'avec `chunk_id` (voir plus bas).
  - **Essai sur le second fichier** :
    - `types` : 228 valeurs distinctes, aucune vide ; les plus fréquentes : `mairie` 14 938, `ccas` 5 056, `police_municipale` 1 507, `france_services` 1 299, `gendarmerie` 1 282, `epci` 528 ; aussi `cg (Collectivité locale)` 45 et `cr (Collectivité locale)` 12. Les valeurs mêlent un code (`mairie`) et, parfois, une catégorie entre parenthèses ;
    - `hierarchy` : 35 856 lignes sur 36 201 sans lien ; 345 lignes avec des liens `{type_hierarchie, service}` : « Service Fils » 1 396 liens, « Autre hiérarchie » 125.
- **Licence ou conditions, mot pour mot** :
  - jeu Hugging Face : `license: etalab-2.0` (métadonnées de la fiche) ; README : « **Open License (Etalab)** — This dataset is publicly available and can be reused under the conditions of the Etalab open license. » ;
  - jeu source de la DILA (https://www.data.gouv.fr/api/1/datasets/service-public-gouv-fr-annuaire-de-ladministration-base-de-donnees-locales/) : `"license": "fr-lo"` ; dans la description :
    - « Les données sont réutilisables gratuitement sous licence ouverte v2.0. » ;
    - « Les réutilisateurs s’obligent à mentionner : * la paternité des données ( Service-Public.gouv.fr /DILA ) ; * l’url d’accès longue de téléchargement ; * le nom du fichier téléchargé ainsi que la date du fichier. » ;
    - « Le réutilisateur s’oblige à prendre en compte les demandes de mise à jour de données publiées ponctuellement par la DILA dans le forum de discussion du jeu de données sur data.gouv.fr. »
  - Réserve : `fr-lo` désigne la Licence Ouverte sans version ; la description dit « v2.0 » (même écart qu'à la fiche 48).
- **Pourquoi c'est une publication ouverte, et pas un contournement de la fiche 3** :
  - la fiche 3 écarte un **canal** : l'API Annuaire, fermée par son `robots.txt` (`Disallow: /api/`), et le serveur de la DILA, dont le statut n'est pas tranché. Sovermap n'appelle ni l'un ni l'autre ;
  - les **données**, elles, sont sous Licence Ouverte 2.0 : la DILA en permet la réutilisation, rediffusion comprise, sans autorisation préalable, contre la mention exigée ci-dessus. Ses conditions ne réservent pas la diffusion à son propre serveur ;
  - la copie est une **publication distincte**, sous la même licence, faite par une administration (avec la réserve sur le relais), sur un hôte ouvert aux robots (`Allow: /`), sans compte ni condition d'accès (`gated: false`, `private: false`), et faite pour être réutilisée (le README montre comment la charger) ;
  - un `robots.txt` protège le serveur qui le publie : lire la copie ne sollicite pas les serveurs de la DILA ;
  - les obligations de la DILA suivent les données : Sovermap affiche l'attribution exigée et tient compte des demandes de mise à jour publiées sur le forum du jeu ;
  - limite honnête : la copie est **retraitée** (champs regroupés en JSON, texte et vecteurs ajoutés) ; elle peut s'écarter du fichier d'origine. La provenance publiée le dit : « annuaire local (DILA, copie DINUM du <date>) ».
- **Limites de débit** : annoncées par les en-têtes de Hugging Face, sans compte :
  - `RateLimit-Policy: "fixed window";"api";q=500;w=300` : 500 appels d'API par fenêtre de 5 minutes ;
  - `RateLimit-Policy: "fixed window";"resolvers";q=3000;w=300` : 3 000 téléchargements par fenêtre de 5 minutes ;
  - `X-HF-Warning: unauthenticated; Warning: You are sending unauthenticated requests to the HF Hub. Please set a HF_TOKEN to enable higher rate limits and faster downloads.` Aucun jeton n'est nécessaire ; Sovermap n'en utilise pas.
- **robots.txt** :
  - https://huggingface.co/robots.txt (HTTP 200, 68 octets) : `User-agent: *`, `Allow: /` ;
  - les fichiers redirigent (HTTP 302, adresse signée) vers `us.aws.cdn.hf.co` (stockage Xet, `x-hf-cdn-pop: aws-eu-west-3`) ; son `robots.txt` répond 404 : rien n'y est interdit.
- **Téléchargement automatique testé** : **oui, par plages, sans jamais un fichier entier** :
  - métadonnées (HTTP 200, 21 716 octets), README épinglé au commit (9 705 octets), liste du dossier `-latest` avec `?expand=true` (2 121 octets : tailles, SHA-256, commit et date) ;
  - `HEAD` sur `…/resolve/<commit>/<fichier>` : HTTP 302, `X-Linked-Size`, `X-Linked-ETag` (le SHA-256), `X-Xet-Hash`, `X-Repo-Commit`, `Location` vers le CDN ;
  - plages sur le CDN : HTTP 206, `content-range` exact, `accept-ranges: bytes` ; pieds de page des deux fichiers et trois colonnes utiles du second (`types` 22 727 octets, `hierarchy` 38 908, `modification_date` 44 654), décodées.
- **Pièges** :
  - le README annonce `addresses`, `hierarchy` et `people_in_charge` en listes de dictionnaires ; dans le Parquet, ce sont **des chaînes JSON**. On ne peut donc pas lire seulement la commune et le code postal : il faut lire toute la colonne `addresses` (adresse, code postal, commune, pays, longitude, latitude des guichets), puis n'en garder que la commune et le code postal ;
  - **le pied de page contient des données personnelles** : ses statistiques min/max gardent une valeur de chaque colonne (jusqu'à 256 octets), y compris de `mails`, `phone_numbers` et `people_in_charge`. Des adresses e-mail y ont été trouvées. Le lecteur les écarte dès la lecture du pied (la bibliothèque hyparquet les décode alors en mémoire, le temps de cette lecture), sans jamais les garder ni les écrire ;
  - toujours lire par le commit (`resolve/<commit>/…`), jamais par `main` : les positions des colonnes ne valent que pour un fichier donné ;
  - l'adresse signée du CDN expire (durée non mesurée) : la demander juste avant les plages ;
  - fichiers écrits par DuckDB 1.3.2 : compression ZSTD, un seul groupe de lignes par fichier, pas d'index de pages, pages de données « v1 », encodage par dictionnaire pour les colonnes répétitives ;
  - `chunk_id` et `doc_id` sont identiques (README) ; `hierarchy.service` désigne vraisemblablement le `chunk_id` d'une autre ligne (non vérifié). Pour suivre `hierarchy`, il faudrait aussi lire `chunk_id` ;
  - aucun code Insee de commune dans les colonnes : le rattachement passe par le SIREN (fiche 51) ou par la commune et le code postal (fiche 52) ;
  - le README commence par un bandeau de questionnaire : sans effet sur les données.
- **Données personnelles** : `people_in_charge` (noms, titres et grades de responsables), `mails`, `phone_numbers`, `chunk_text` (qui reprend les responsables) et `embeddings_bge-m3` (vecteurs calculés sur `chunk_text`). Jamais lues, jamais recopiées. Voir aussi le piège du pied de page. **Le texte libre gardé** (le nom du guichet et sa commune) passe par le contrôle de la consigne P13 (`pipeline/personnelles.ts`, 23/11/2026).
  - Un nom qui contient une adresse e-mail, un téléphone ou une forme de nom de personne n'est jamais gardé. Le guichet est alors nommé par sa nature et sa commune (« Mairie d'Exemple »). Une commune dans ce cas est laissée vide.
  - L'écart est compté dans `copie.json`, par sorte, jamais recopié.
  - Le texte est contrôlé en entier (2 000 caractères au plus), avant d'être coupé (300 pour le nom, 120 pour la commune).
  - La collecte quotidienne rejoue le même contrôle en relisant `guichets.jsonl`, et compte ses écarts dans `etat.json`.
  - `copie.json` porte la version des règles de lecture (`regles`). Une copie lue sous d'autres règles est relue, même si ses fichiers n'ont pas changé : une correction atteint `donnees` sans attendre une nouvelle copie.
  - La date de l'état est la modification la plus récente de toutes les lignes lues.
- **Attribution à afficher** : « Source : Service-Public.gouv.fr / DILA — Annuaire de l'administration, Base de données locales, fichier all_latest.tar.bz2 (https://lecomarquage.service-public.gouv.fr/donnees_locales_v4/all_latest.tar.bz2) dans son état du <date>, repris dans la copie retraitée par la DINUM (https://huggingface.co/datasets/AgentPublic/local-administrations-directory/resolve/<commit>/data/local-administrations-directory-latest/local_administrations_directory_part_0.parquet et …_part_1.parquet, copie du <date du commit>) — Licence Ouverte 2.0. » La date de l'état est la plus récente `modification_date` lue.
- **Décision : retenue**, lue par un workflow à chaque nouvelle copie (SHA-256 changé), colonnes utiles seulement, par plages ; provenance « annuaire local ».

### Lecture des colonnes utiles (méthode pour le workflow)

Chiffres du commit `6c62e508…` du 14/11/2026. Les positions changent à chaque copie : le pied de page se relit à chaque fois.

1. **Repérer une nouvelle copie** : `GET https://huggingface.co/api/datasets/AgentPublic/local-administrations-directory/tree/main/data/local-administrations-directory-latest?expand=true` donne, pour chaque fichier, sa taille, son SHA-256 (`lfs.oid`) et son commit (`lastCommit.id`, `lastCommit.date`). SHA-256 inchangés : on s'arrête là.
2. **Ouvrir chaque fichier par son commit** : `GET …/resolve/<commit>/<fichier>` répond 302 vers `us.aws.cdn.hf.co` (adresse signée) ; `X-Linked-Size` donne la taille.
3. **Lire la longueur du pied** : `Range: bytes=<taille-8>-<taille-1>`, soit 8 octets : la longueur sur 4 octets, puis `PAR1`.
4. **Lire exactement le pied** : 8 451 octets pour le premier fichier, 8 531 pour le second. Il donne le schéma, le nombre de lignes, et pour chaque colonne sa position (`dictionary_page_offset` ou `data_page_offset`) et sa taille (`total_compressed_size`). Écarter aussitôt les statistiques.
5. **Lire seulement les colonnes utiles** : le lecteur demande une plage par colonne et par groupe de lignes, jamais à cheval sur une autre colonne ; le pied n'est pas cru, et une plage utile qui chevaucherait une autre colonne est refusée. Le tableau suivant, relevé pendant l'étude, regroupait les colonnes voisines et comptait `hierarchy` :

   | Fichier | Plage (octets) | Taille | Colonnes |
   |---|---|---|---|
   | part_0 | 2305432-2815688 | 510 257 | `types` + `name` |
   | part_0 | 2875266-4722733 | 1 847 468 | `addresses` |
   | part_0 | 5432276-5795784 | 363 509 | `urls` |
   | part_0 | 6811008-7163526 | 352 519 | `modification_date` + `siret` + `siren` |
   | part_0 | 7359358-7424559 | 65 202 | `hierarchy` |
   | part_1 | 1670078-2045964 | 375 887 | `types` + `name` |
   | part_1 | 2096304-3437294 | 1 340 991 | `addresses` |
   | part_1 | 3954797-4224803 | 270 007 | `urls` |
   | part_1 | 4949551-5209515 | 259 965 | `modification_date` + `siret` + `siren` |
   | part_1 | 5351675-5390582 | 38 908 | `hierarchy` |

6. **Décoder** : pages ZSTD (Node 26 : `zlib.zstdDecompressSync`), encodage par dictionnaire ou simple ; `addresses` et `hierarchy` sont du JSON à analyser ; ne garder de `addresses` que `commune` et `code_postal`.

- **Bilan de l'étude** : 10 plages et **5 424 713 octets** au lieu de 449 549 373, soit 1,21 % ; environ 17 requêtes par copie (1 liste, puis par fichier : 1 redirection, 2 pour le pied, 5 plages). Le lecteur, sans `hierarchy` et une plage par colonne, en fait un peu plus, pour un peu moins d'octets.
- Les colonnes exclues pèsent 435 911 120 octets (96,97 %), dont 432 809 548 pour les seuls vecteurs.
- Avec `chunk_id` en plus (pour suivre `hierarchy`) : 12 plages, 7 057 818 octets (1,57 %).
- **Prouvé** : `types`, `hierarchy` et `modification_date` du second fichier, lus par plage et décodés (pages « v1 », dictionnaire, aucune valeur vide).
- **Pas encore essayé** : `name`, `addresses`, `siren`, `siret` (pages sans dictionnaire, à vérifier) et `urls`, colonne de listes : il faut décoder aussi les niveaux de répétition. Une bibliothèque Parquet (dépendance à choisir) ou un petit lecteur maison (environ 150 lignes pour l'essai) suffit.

### 51. API Découpage administratif (geo.api.gouv.fr)
- **Producteur** : Direction interministérielle du numérique (DINUM), d'après le catalogue des API de data.gouv.fr (fiche `672cf6946a8456f417812b0f`, « API Découpage Administratif - (API Geo) », du 07/11/2024).
- **Adresse** : https://geo.api.gouv.fr ; fiche : https://www.data.gouv.fr/dataservices/api-decoupage-administratif-api-geo ; documentation : https://geo.api.gouv.fr/decoupage-administratif ; définition OpenAPI : https://geo.api.gouv.fr/definition.yml (non lue).
- **Ce qu'on en tire** :
  - les 18 régions (13 de métropole ; 01 Guadeloupe, 02 Martinique, 03 Guyane, 04 La Réunion, 06 Mayotte) ;
  - les 101 départements, avec leur région et leur `zone` : `metro` 96, `drom` 5 (971, 972, 973, 974, 976) ;
  - pour chaque commune : code Insee, nom, codes postaux, **SIREN**, **code de l'EPCI** (son SIREN), département et région. Essai : les 17 communes de Mayotte, toutes avec un SIREN et un EPCI ;
  - c'est la clé du rattachement : SIREN de la mairie (fiche 50) → commune → EPCI → département → région ;
  - les EPCI ont aussi leur point d'entrée, d'après le catalogue (non testé).
- **Licence ou conditions, mot pour mot** :
  - catalogue de data.gouv.fr : `"license": null` ; `"access_type": "open"` ;
  - « [Toutes les données utilisées](https://github.com/etalab/api-communes#données-sources) sont sous licences Open Data. » ;
  - « Partenaires de l'API » : « Direction interminstérielle du numérique », « Insee », « OpenStreetMap » ;
  - le README du code (https://raw.githubusercontent.com/etalab/api-communes/master/README.md, lu le 21/11/2026) n'a plus de section sur les sources ; il dit seulement « # Licence » « MIT », pour le code. La page de documentation ne parle ni des sources ni des licences ;
  - **aucune licence n'est donc écrite pour les données de l'API.**
- **Limites de débit, mot pour mot** : « 50 appels / seconde / IP » ; « L'API est disponible à hauteur de 50 appels par seconde et par adresse IP. » Réponses en `cache-control: public, max-age=3600, immutable`.
- **robots.txt** (https://geo.api.gouv.fr/robots.txt, HTTP 200, 43 octets) : `User-agent: *`, `Disallow: # your rules here`. Le `Disallow` est vide : tout est ouvert.
- **Téléchargement automatique testé** : **oui** (HTTP 200) :
  - `/regions` : 653 octets ;
  - `/departements?fields=code,nom,codeRegion,zone` : 6 593 octets ;
  - `/communes?codeDepartement=976&fields=nom,code,codesPostaux,siren,codeEpci,codeDepartement,codeRegion&format=json` : 2 458 octets ;
  - toutes les communes en un seul appel : non essayé (sans doute plus de 2 Mo) ; un appel par département (101) suffirait.
- **Pièges** :
  - les contours servis par l'API viennent du jeu « Contours administratifs », sous ODbL (fiche 54) : **jamais** `geometry`, `contour` ni la position des mairies ;
  - les codes postaux viennent sans doute de la base de La Poste, dont la licence n'a pas été lue : ne pas les publier ; le SIREN suffit au rattachement ;
  - les collectivités d'outre-mer (Saint-Pierre-et-Miquelon, Saint-Barthélemy, Saint-Martin, Wallis-et-Futuna, Polynésie française, Nouvelle-Calédonie) ne sont pas dans `/departements` ;
  - les codes de département sont des chaînes (`2A`, `2B`, `976`).
- **Données personnelles** : aucune dans les champs lus. L'adresse de contact de la fiche n'est pas reprise.
- **Attribution à afficher** : aucune exigée (aucune licence écrite). Par courtoisie : « Rattachements : API Découpage administratif (geo.api.gouv.fr), DINUM ».
- **Décision : retenue sous réserve, comme outil de rattachement** (SIREN → commune → EPCI → département → région).
  - Rien de l'API n'est republié tel quel : les codes et les noms affichés viennent du COG (fiche 52).
  - Jamais les contours, la position des mairies ni les codes postaux.
  - Réserve à lever : une licence écrite pour les données de l'API (question à la DINUM, plus tard, par une adresse sur sovermap.com).

### 52. Code officiel géographique au 01/01/2026 : communes, départements, régions, outre-mer (INSEE)
- **Producteur** : Institut national de la statistique et des études économiques (INSEE).
- **Adresse** : https://www.data.gouv.fr/datasets/code-officiel-geographique-1 (jeu `58c984b088ee386cdb1261f3`, déjà cité à la fiche 48 ; mis à jour le 07/11/2026). Ressources du 24/02/2026, lisibles par l'API tabulaire :

  | Ressource | Fichier sur insee.fr | Identifiant |
  |---|---|---|
  | Communes, arrondissements municipaux, communes déléguées et associées | `v_commune_2026.csv` | `c5800591-813b-4ce2-9a3f-739a9c5d9558` |
  | Départements | `v_departement_2026.csv` | `e5f32177-5841-4a46-9c17-f8ff94bd38fc` |
  | Régions | `v_region_2026.csv` | `f7057d4e-0078-45de-95b7-2a0ce6594807` |
  | Collectivités territoriales ayant les compétences départementales | `v_ctcd_2026.csv` | `2f280951-f937-46c3-a695-cefd72d1e687` |
  | Collectivités et territoires d'outre-mer | `v_comer_2026.csv` | `62cf1ca1-f3db-4f49-bfa1-69aca93d34f1` |
  | Communes des collectivités d'outre-mer | `v_commune_comer_2026.csv` | `f47969be-310d-4871-b6c4-6005dbf46a00` |

- **Ce qu'on en tire** :
  - **34 875 communes** au 01/01/2026 (`TYPECOM` = `COM`) ;
  - colonnes : `TYPECOM`, `COM` (code Insee), `REG`, `DEP`, `CTCD`, `ARR`, `TNCC`, `NCC`, `NCCENR`, `LIBELLE`, `CAN`, `COMPARENT` ;
  - les codes et les noms officiels, et le rattachement de chaque commune à son département et à sa région ;
  - ni SIREN ni code postal : d'où la fiche 51.
- **Licence ou conditions, mot pour mot** : « Licence Ouverte / Open Licence » (`fr-lo`), comme à la fiche 48.
- **robots.txt** :
  - www.insee.fr ferme `*.csv` (fiche 48) : les fichiers ne se téléchargent pas sur insee.fr ;
  - www.data.gouv.fr (relu le 21/11/2026) laisse ouverte l'API de métadonnées `/api/1/datasets/<id>/` ;
  - tabular-api.data.gouv.fr : pas de `robots.txt` (404, relu le 21/11/2026).
- **Téléchargement automatique testé** : **oui**, par l'API tabulaire : `…/api/resources/c5800591-813b-4ce2-9a3f-739a9c5d9558/data/?TYPECOM__exact=COM&page_size=3`, HTTP 200, 1 197 octets, `meta.total` = 34 875.
- **Pièges** :
  - un même fichier mêle communes, arrondissements municipaux (Paris, Lyon, Marseille), communes déléguées et associées : filtrer par `TYPECOM` ;
  - l'outre-mer hors DROM est dans deux fichiers à part ;
  - des pages de 200 lignes ont été acceptées par l'API tabulaire (lecture du 21/11/2026, `referentiels/cog/LISEZMOI.md`), soit environ 175 requêtes pour les 34 875 lignes des communes. Le COG change une fois par an : une copie épinglée dans `referentiels/`, mise à jour par PR comme la PSL (fiche 42), est plus simple.
- **Données personnelles** : aucune.
- **Attribution à afficher** : « Source : Insee, Code officiel géographique au 01/01/2026 (communes, départements, régions), Licence Ouverte ».
- **Décision : retenue** : codes et noms officiels, base de tout rattachement territorial ; copie annuelle épinglée.

### 53. ADMIN EXPRESS COG CARTO PE, édition 2026 (IGN) : fond de carte des régions et des départements
- **Producteur** : Institut national de l'information géographique et forestière (IGN), établissement public.
- **Adresse** :
  - fiche data.gouv.fr de l'IGN : https://www.data.gouv.fr/datasets/admin-express-admin-express-cog-admin-express-cog-carto-admin-express-cog-carto-pe-admin-express-cog-carto-plus-pe (jeu `5808de39c751df1e0679df72`, moissonné du catalogue de la Géoplateforme, identifiant `IGNF_ADMIN-EXPRESS`, mis à jour le 19/11/2026) ;
  - service WFS de la Géoplateforme : https://data.geopf.fr/wfs/ows, couches `ADMINEXPRESS-COG-CARTO-PE.2026:region` et `ADMINEXPRESS-COG-CARTO-PE.2026:departement` (aussi en `.LATEST` et `.2025`) ;
  - fiche produit https://geoservices.ign.fr/adminexpress : non lue (voir robots.txt).
- **Ce qu'on en tire** (GeoJSON, WGS 84, `urn:ogc:def:crs:EPSG::4326`) :

  | Couche | Entités | Octets | Compressé (gzip) | Points |
  |---|---|---|---|---|
  | Régions | 18 : 13 de métropole et 5 d'outre-mer | 772 459 | 303 410 | 30 445 |
  | Départements | 101 : 96 de métropole et 971, 972, 973, 974, 976 | 1 778 584 | 694 278 | 69 726 |

  - propriétés : `cleabs`, `code_insee`, `code_insee_de_la_region` (départements), `code_siren`, `nom_officiel`, `nom_officiel_en_majuscules` ; Corse en `2A` et `2B` ;
  - les DROM sont à leur vraie place (Mayotte vers 45° E et 13° S) : des encarts restent à dessiner ;
  - résolution : « 1/500000 » ; dernière édition : « ADMIN EXPRESS - Edition Novembre 2026 » (métadonnées) ;
  - les collectivités d'outre-mer n'y sont pas : le produit couvre « le territoire métropolitain et les départements d'outre-mer ».
- **Licence ou conditions, mot pour mot** :
  - data.gouv.fr : `"license": "lov2"` ;
  - catalogue de l'IGN (champs `license` et `rights`) : « Licence Ouverte / Open License (compatible ODC-BY, CC-BY 2.0) https://www.etalab.gouv.fr/wp-content/uploads/2018/11/open-licence.pdf » ; `accessRights` : `…/LimitationsOnPublicAccess/noLimitations` ;
  - provenance : « Depuis la version 4.0, plusieurs améliorations : ajout d'une généralisation petite échelle, transformation des pseudo-cantons en vrai cantons, cohérence géométrique avec les strates administratives. »
- **Limites de débit** : aucune lue.
- **robots.txt** :
  - https://data.geopf.fr/robots.txt : 404 (rien d'interdit) ;
  - https://geoservices.ign.fr/robots.txt : 301 vers https://cartes.gouv.fr/robots.txt. Saut non suivi : aucune page de ces deux hôtes n'a été lue.
- **Téléchargement automatique testé** : **oui**. WFS 2.0.0 `GetFeature`, `OUTPUTFORMAT=application/json`, `SRSNAME=EPSG:4326` : HTTP 200, réponse en morceaux (sans `Content-Length`), `numberMatched` = `numberReturned` (18 et 101).
- **Pour une version simplifiée servie par le site, il faudrait** :
  1. une copie datée des deux couches dans `referentiels/`, une par millésime (`.2026`, jamais `.LATEST`), avec sa date et son SHA-256, mise à jour par PR comme la PSL ;
  2. une simplification qui garde les frontières communes (arcs partagés, par exemple en TopoJSON), puis l'arrondi des coordonnées. Ordre de grandeur mesuré par un essai grossier (Douglas-Peucker anneau par anneau, sans topologie, 3 décimales) :
     - départements à 0,005° (environ 500 m) : 18 731 points, 300 627 octets (89 291 compressés) ;
     - départements à 0,01° : 11 031 points, 184 831 octets (54 579 compressés) ;
     - régions à 0,005° : 124 583 octets (37 697 compressés) ;
  3. des encarts pour les cinq DROM : un choix visible, donc trois propositions (règle du projet) ;
  4. un fichier statique, sans lecture de données à la demande. S'il ouvre une famille d'adresses nouvelle : une adresse réelle dans `ADRESSES_PORTE` (`lib/porte.ts`), vérifiée par `probe:prod` et `e2e/porte.spec.ts` ;
  5. l'outil de simplification : une dépendance à choisir (licence à lire) ou un petit script maison ;
  6. l'attribution sur la page Données, qui dit que les contours sont simplifiés.
- **Pièges** :
  - le jeu dérivé « Contours administratifs » de data.gouv.fr, déjà simplifié, est sous **ODbL** (fiche 54) : ne jamais le prendre à sa place ;
  - `.LATEST` change sans prévenir : toujours un millésime ;
  - coordonnées très précises : 1,78 Mo brut pour les départements.
- **Données personnelles** : aucune.
- **Attribution à afficher** : « Fond de carte : IGN, ADMIN EXPRESS COG CARTO PE, édition <mois année>, Licence Ouverte 2.0 ; contours simplifiés par Sovermap ».
- **Décision : retenue** : fond de carte des régions et des départements, métropole et DROM. Natural Earth (fiche 41) reste le fond du monde.
- **Copie épinglée le 23/11/2026** (`referentiels/fond-de-carte/`, sa notice) : la couche des départements seule, `.2026`, 1 778 584 octets (la taille lue le 21/11/2026), SHA-256 `70edeac239cb3363edda6e045a2650c7b4bdeb211aca09a1b453969b466aba2c`, trois propriétés gardées. Les régions ne sont pas téléchargées : leurs frontières se tirent de celles des départements (chacun porte le code de sa région), si bien que les deux ne peuvent jamais différer ; la décision ne change pas. Simplification : un petit script maison (`pipeline/carte.ts`), sans dépendance, qui garde les frontières communes (chaque frontière simplifiée une seule fois pour les deux voisins). Encarts des DROM : dans une colonne à gauche, chacun à sa propre échelle (la meilleure version, montrée en planche au propriétaire ; elle se défait).

### 54. Sources écartées ou non retenues pour les territoires (21/11/2026)
- **Contours administratifs** (data.gouv.fr, jeu `683424e996857155175d4f68`, organisation « data.gouv.fr », mis à jour le 04/05/2026) : **écartée**.
  - Licence : `"license": "odc-odbl"`.
  - Mot pour mot : « Le jeu de données a été constitué sur https://github.com/datagouv/contours-administratifs à partir : du produit Admin Express de l’IGN ; des données OpenStreetMap (OSM) pour les communes et zonages couvrant les COM, à l’exception des Îles de la Polynésie française […] et de la Nouvelle Calédonie […] » ; et : « Ce jeu de données est utilisé par l’API Découpage Administratif ».
  - Il serait commode (versions toutes prêtes à 1000 m : départements 337 867 octets, 99 413 compressés ; régions 147 941 octets, 42 566 compressés), mais l'ODbL est exclue. Conséquence : jamais les contours de geo.api.gouv.fr (fiche 51).
- **Natural Earth au 1:10m, admin-1** (`ne_10m_admin_1_states_provinces.zip`) : **non retenue pour l'instant**.
  - Requête `HEAD` seulement : HTTP 200, 14 909 524 octets, `Last-Modified: Fri, 13 May 2022 05:20:49 GMT`.
  - robots.txt de naciscdn.org : HTTP 403 (objet absent ; un 4xx n'interdit rien).
  - Domaine public (fiche 41). Contenu pour la France non lu (trop gros pour cet essai) : découpage et date des limites non vérifiés.
  - ADMIN EXPRESS (fiche 53), officiel et de novembre 2026, suffit. Natural Earth reste le recours pour les collectivités d'outre-mer, au niveau du pays (fichier de la fiche 41).
- **Pages de l'IGN** (geoservices.ign.fr, cartes.gouv.fr) : non lues (`robots.txt` redirigé). La licence vient de la fiche data.gouv.fr de l'IGN (fiche 53).
- **Base locale sur le serveur de la DILA** (`lecomarquage.service-public.gouv.fr`) et **API « compétence géographique des services locaux »** (`api-lannuaire.service-public.gouv.fr`, fermée par `Disallow: /api/`, fiche 3) : pas contactées.
- **Codes postaux de La Poste** : non lus ; licence inconnue ; pas utilisés.

## I. Démarches en ligne

### 55. Observatoire de la qualité des démarches en ligne (DINUM)
- **Producteur** : Direction interministérielle du numérique (DINUM), observatoire « Vos Démarches Essentielles » (VDE).
- **Jeu** : « Observatoire de la qualité des démarches en ligne » sur data.gouv.fr (identifiant `5d0a5c09634f412301dba116`), lu par l'API de data.gouv.fr le 21/11/2026.
- **Licence** : Licence Ouverte 2.0 (champ `license` du jeu : « lov2 »).
- **Fichiers** : une édition par trimestre, en ODS, une seule feuille (`T_VDE`).
  - Dernière édition : « Observatoire 2 - édition 15 (octobre-2026) », publiée le 20/10/2026, 43 521 octets.
  - Précédente : édition 14 (juillet-2026), publiée le 28/09/2026, 43 045 octets ; 245 démarches.
- **Téléchargement automatique testé** : **non**, et il ne se fera pas.
  - Le `robots.txt` de static.data.gouv.fr (le même que celui de www.data.gouv.fr, lu le 21/11/2026) ferme `/resources` à tous les robots.
  - L'API (`/api/1/datasets/`) reste ouverte, sauf `/api/1/datasets/r/` (les redirections vers les fichiers) : elle sert seulement à connaître la dernière édition et sa date.
- **Relevé manuel daté** : le propriétaire dépose le fichier de chaque édition. Le 20/11/2026, il a déposé l'édition 14, alors que l'édition 15 existait : celle-ci reste à déposer.
- **Ce qu'on en tire** : pour chaque démarche, son nom, son identifiant, son périmètre ministériel, son administration, sa volumétrie (totale et en ligne) et son adresse (« URL Démarche »), pour relier la démarche au nom mesuré qui la sert.
  - Les colonnes de notes (satisfaction, accessibilité, clarté du langage, autonomie, DLNUF) ne sont pas reprises : Sovermap décrit des dépendances, pas la qualité d'une démarche.
- **Pièges** : des volumétries vides ou « À venir » ; des adresses sur des noms absents de la liste de la DINUM (les mesurer est un changement de liste, B.7 bis, jamais un déménagement).
- **Attribution à afficher** : « Source : DINUM, Observatoire de la qualité des démarches en ligne, édition <n> (<mois année>), Licence Ouverte 2.0 ».
- **Décision : retenue (relevé manuel daté, par édition)** ; en attente de l'édition 15.

## Attributions à afficher sur la page Données

Liste provisoire. Elle sera relue en T6, avec les dates réelles des fichiers utilisés. Aucune ne suggère un aval du producteur.

**Exigées par la licence ou les conditions :**
- **DINUM / Etalab** : « liste des noms de domaine des organismes publics, copie du 11/12/2024, Licence Ouverte 2.0 » ; et, pour la liste à jour (fiche 1) : « Source : DINUM, liste des noms de domaine des organismes publics, version du <date>, Licence Ouverte 2.0 ».
- **DILA** : « Source : Service-Public.gouv.fr / DILA — Référentiel de l'organisation administrative de l'État, fichier <nom> du <date>, <adresse longue>, Licence Ouverte ».
- **SIG** : « Observatoire de l'écosystème numérique de l'État – Sites internet, mise à jour du <date>, Licence Ouverte 2.0 ».
- **Ministère de l'Enseignement supérieur** : « Principaux établissements d'enseignement supérieur, mis à jour le <date>, Licence Ouverte ».
- **Insee** : « base Sirene (www.insee.fr), données du <date> ».
- **RIPE NCC** : « RIPE Database (RIPE NCC), soumise aux RIPE Database Terms and Conditions » (noms des organisations de la région du RIPE).
- **Office des publications de l'Union européenne** (fiches 43 et 44) : « Source : Office des publications de l'Union européenne, EU Vocabularies (table « Countries and territories ») et Code de rédaction interinstitutionnel, lus le <date> ».
- **Union européenne, CC BY 4.0** (fiches 45 et 46) : « © Union européenne, <date>, CC BY 4.0 » (liste des États membres, décisions d'adéquation de la Commission).
- **Insee, Licence Ouverte** (fiche 48), si le contrôle des codes est cité : « Insee, Code officiel géographique, pays et territoires étrangers au 01/01/2026 ».
- **DILA** (fiche 50) : « Source : Service-Public.gouv.fr / DILA — Annuaire de l'administration, Base de données locales, fichier all_latest.tar.bz2 (https://lecomarquage.service-public.gouv.fr/donnees_locales_v4/all_latest.tar.bz2) dans son état du <date>, repris dans la copie retraitée par la DINUM (Hugging Face, AgentPublic/local-administrations-directory, copie du <date du commit>) — Licence Ouverte 2.0 ».
- **Insee** (fiche 52) : « Source : Insee, Code officiel géographique au 01/01/2026 (communes, départements, régions), Licence Ouverte ».
- **IGN** (fiche 53) : « Fond de carte : IGN, ADMIN EXPRESS COG CARTO PE, édition <mois année>, Licence Ouverte 2.0 ; contours simplifiés par Sovermap ».
- **DINUM** (fiche 55), si les démarches sont montrées : « Source : DINUM, Observatoire de la qualité des démarches en ligne, édition <n> (<mois année>), Licence Ouverte 2.0 ».

**De courtoisie :**
- registres Internet régionaux : « fichiers statistiques des registres Internet régionaux (RIPE NCC, ARIN, APNIC, LACNIC, AFRINIC) » ;
- « IP → AS : IPtoASN (iptoasn.com), PDDL 1.0 » ;
- « Données LEI : GLEIF, copie du <date> », sans la marque GLEIF ;
- « Fond de carte : Natural Earth (domaine public) » ;
- « Domaines enregistrés : Public Suffix List (publicsuffix.org), MPL 2.0, version du <date> » ;
- « Références des décisions de l'UE : Cellar, Office des publications de l'Union européenne » (fiche 47).
- « Rattachements : API Découpage administratif (geo.api.gouv.fr), DINUM » (fiche 51).
