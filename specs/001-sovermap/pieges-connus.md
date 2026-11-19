# Pièges connus

Chaque piège est noté avec sa date, ce qu'on a vu et la parade. On complète ce fichier à chaque chantier.

## Sources et collecte

1. **La forge qui héberge la liste officielle des domaines est fermée aux robots** (18/11/2026).
   - Vu : le robots.txt de gitlab.adullact.net interdit `/api/v*`, `/*/raw`, `/*/archive/`, `/*/repository/archive*` et les chemins Git (`/*/*.git$`, `/*/*.git/*`). Une page anti-robots à preuve de travail (Anubis) répond aux clients automatiques.
   - Parade : aucun accès automatique à cette forge. On part de la copie archivée sur GitHub (datée), et on demande au producteur une copie ouverte (par exemple sur data.gouv.fr). Voir `docs/sources.md`.
2. **data.gouv.fr ferme aux robots les liens « dernière version »** (`Disallow: /api/1/datasets/r/`, 18/11/2026).
   - Parade : lire l'adresse directe de la ressource dans l'API (`/api/1/datasets/<id>/`), puis télécharger ce fichier.
3. **La liste officielle contient des noms d'hôtes, pas seulement des domaines.**
   - Vu : de 2 à 15 étiquettes, avec des `www.` en double de l'apex, et des sous-domaines techniques tirés des journaux de certificats (`staging.`, `matomo.`…).
   - Parade : D1 fixe l'unité comptée. Les doublons sont regroupés par domaine enregistré, selon une règle écrite dans la méthode.
4. **La liste officielle contient des noms de personnes.**
   - Vu : la colonne `sources` porte, pour des milliers de lignes, « Ajout manuel de » suivi d'un nom.
   - Parade : ne jamais reprendre cette colonne. On garde le nom de domaine et le type, avec la provenance « liste DINUM ».
5. **GitHub n'identifie pas la Licence Ouverte 2.0.** Son API répond « NOASSERTION ».
   - Parade : lire le fichier `LICENCE.md` lui-même et le citer.
5 bis. **Beaucoup de portails publics ferment leurs fichiers aux robots** (18/11/2026) :
   - `static.data.gouv.fr` : `Disallow: /resources`, donc tous les fichiers hébergés par data.gouv.fr ;
   - les portails Opendatasoft (API Annuaire de la DILA, data.education, data.enseignementsup) : `Disallow: /api/` et `Disallow: /explore/dataset/*/download` ;
   - insee.fr : `Disallow` sur `*.zip`, `*.csv`, `*.xls`, `*.xlsx` ;
   - cyber.gouv.fr (ANSSI) et budget.gouv.fr : une page anti-robots (Incapsula) répond, même pour `robots.txt` ;
   - Wikidata : `/sparql`, `/w/` et `/wiki/Special:` sont fermés aux robots génériques.
   - **Parade** :
     - pour les jeux de data.gouv.fr, l'API tabulaire `tabular-api.data.gouv.fr` (pas de robots.txt, lu le 18/11/2026) ;
     - les serveurs des producteurs quand ils sont ouverts (par exemple `echanges.dila.gouv.fr`) ;
     - sinon, un relevé manuel daté, fait par une personne, ou une demande d'accès au producteur.
5 ter. **Lire le robots.txt avant toute autre requête vers un hôte, jamais dans la même commande.** Le 18/11/2026, plusieurs requêtes d'essai sont parties dans la même commande que la lecture du robots.txt, avant d'en tirer la règle. Rien n'a été contourné, et les fichiers reçus ont été supprimés sans être ouverts. La collecte lit le robots.txt, l'applique, puis seulement télécharge.
5 quater. **L'API Recherche d'entreprises limite aussi par réseau** : « 7 requêtes par seconde par adresse IP » et « 30 requêtes par seconde par ASN » (openapi.json, lu le 18/11/2026). Depuis un cloud public partagé (GitHub Actions), la limite par ASN peut être atteinte par d'autres. Parade : peu d'appels, espacés, et une nouvelle tentative sur 429.

## DNS

6. **Une requête NS ou SOA sur un nom qui est un CNAME suit le CNAME.** Elle renvoie la zone et les serveurs de noms de la cible.
   - Vu (18/11/2026) :
     - NS sur `www.` d'un ministère renvoie les NS de l'apex ;
     - SOA sur `www.` d'un site derrière un CDN renvoie la zone du CDN (`akamai.net`, `fastly.net`, `cloudflare.net`).
   - Parade : remonter les étiquettes du nom. On garde le premier niveau dont la réponse NS porte exactement ce nom comme propriétaire. Cela demande de lire les noms propriétaires des enregistrements (bibliothèque DNS bas niveau, mode Expert).
7. **Les CDN répondent selon la position du résolveur.**
   - Vu (18/11/2026) : le même nom servi par Akamai donne des adresses différentes chez cinq résolveurs. Un résolveur public consulté depuis la France a même reçu des adresses de caches Akamai placés dans le réseau d'un fournisseur d'accès français : l'AS de l'adresse est alors celui du fournisseur d'accès, pas celui d'Akamai.
   - Parade : reconnaître le CDN par sa chaîne CNAME ou par la liste de ses AS, jamais par le seul AS de l'adresse. Noter le résolveur et le point de mesure de chaque réponse. Voir `docs/methode.md`.
8. **Le résolveur du poste révèle le fournisseur d'accès de celui qui mesure.**
   - Parade : les documents publics ne citent que des réponses de résolveurs publics nommés.
8 bis. **Les résolveurs publics ont des conditions** (lues le 18/11/2026) :
   - DNS4EU est réservé à un usage personnel, et des blocages ordonnés par un juge s'appliquent à toutes ses variantes ;
   - Quad9 demande d'être prévenu avant un grand volume, et 9.9.9.9 filtre les domaines malveillants ;
   - Google Public DNS transmet une partie de l'adresse de l'appelant si on ne lui passe pas de sous-réseau ECS explicite.
   - Parade : un résolveur local validant pour le volume ; les résolveurs publics pour un contrôle de faible volume seulement.
8 ter. **Docker Hub limite les téléchargements anonymes** : 100 par adresse IPv4 (ou /64 en IPv6) par 6 h, et les runners partagent des adresses. Parade : garder l'image du résolveur dans le cache des Actions, et réessayer en espaçant.
9. **Un préfixe peut avoir plusieurs AS d'origine** (MOAS).
   - Vu : un préfixe universitaire annoncé par deux AS du même réseau national.
   - Parade : garder tous les AS d'origine. Si leurs sociétés diffèrent, la couche est « non déterminé ».

## Réseaux et sociétés

10. **Le nom d'un ancien bloc d'adresses ne dit pas toujours qui l'exploite aujourd'hui.**
    - Vu : un bloc historique d'un grand constructeur informatique, annoncé par une société au nom différent.
    - Parade : le rattachement AS → société → maison mère passe par une table tenue à la main, chaque ligne avec sa source.
11. **L'AS dit qui exploite le réseau, pas qui vend le service.**
    - Vu : des sites de communes créés avec une plateforme de sites web, servis depuis des adresses d'un grand cloud.
    - Parade : la fiche affiche la société du réseau. Elle ne devine jamais un revendeur.
12. **Un même serveur mutualisé sert plusieurs organismes** (même adresse). C'est normal, ce n'est pas une erreur.
13. **Un prestataire de serveurs de noms français peut confier un de ses serveurs à une société étrangère.**
    - Vu : un serveur secondaire d'un prestataire français, sur le réseau d'une société américaine.
    - Parade : mesurer chaque serveur de noms, pas seulement le premier.
14. **Filiale européenne, maison mère non européenne.**
    - Vu : un AS au nom d'une société néerlandaise dont la maison mère est américaine.
    - Parade : afficher les deux sièges ; le classement suit la maison mère ultime (cahier §4.4).
14 bis. **GLEIF ne couvre pas toutes les sociétés, et ses « exceptions » ne veulent pas dire « inconnu ».**
    - Vu (18/11/2026) : sur trois sociétés d'essai, deux n'ont pas de LEI. Les exceptions `NON_CONSOLIDATING` et `NO_KNOWN_PERSON` marquent souvent le sommet d'une chaîne, ou un contrôle par des personnes.
    - Parade : toujours une seconde source (rapport annuel, registre), et chaque lien daté.
14 ter. **Homonymes.** « OVH » n'est pas « OVH GROUPE » ; une recherche « ILIAD » donne 10 entités ; un élément Wikidata peut mêler le groupe coté et sa société d'exploitation.
    - Parade : joindre par un identifiant (SIREN, LEI), jamais par le nom seul.
14 quater. **Natural Earth : `ISO_A3` vaut -99 pour la France** (et quelques autres pays). Parade : joindre par `ADM0_A3` ou `ISO_A3_EH`.
14 sexies. **Société exploitante hors de l'UE, maison mère dans l'UE.**
    - Vu (échantillon du 19/11/2026) : Imperva, Inc. (États-Unis), détenue par Thales (France), sert deux sites de l'État ; la règle de la maison mère ultime les classait « France ».
    - Parade (décision de l'ARRÊT 2, méthode 0.3 en T3) : le domaine compte comme dépendant dès que la société qui le sert ou sa maison mère ultime est hors de l'UE ; le plus éloigné des deux sièges fait la catégorie et le fil ; la fiche affiche les deux.
14 septies. **Un proxy de sécurité cache l'hébergeur comme un CDN.**
    - Vu : Radware (`radwarecloud.net`), F5, OGO Security (sur OVH ou NFrance) et Claranet (`c.global.clara.net`) placés devant des sites, comptés « hébergé par ».
    - Parade (T3) : les traiter comme des CDN (« diffusé par »), d'après une liste sourcée par la documentation de chaque fournisseur ; quand le proxy tourne sur le réseau d'une autre société, la fiche affiche les deux sociétés, et la plus éloignée compte.

## Documents

14 quinquies. **Une citation peut contenir une adresse e-mail** : celle d'un service, ou un exemple tiré d'une documentation. Le contrôle `scan:prive` n'accepte que les adresses noreply de GitHub et d'Anthropic, celles en `@sovermap.com` et les exemples en `example.com` ou `.example`. Parade : remplacer l'adresse par « [adresse omise] » dans la citation, et le dire.

## Vercel

14 octies. **Le tout premier déploiement d'un projet part en production**, même sans `--prod` (« This is the project's first deployment, so it was assigned to production »).
    - Parade : avant le premier `vercel deploy` d'un projet neuf, avoir déjà une production voulue, ou republier aussitôt en préversion puis supprimer ce déploiement par son adresse.
14 nonies. **Un projet créé par la ligne de commande garde le préréglage « Other »** : le site compile, mais Vercel ne sert que `public/` (404 partout ailleurs).
    - Parade : `"framework": "nextjs"` dans `vercel.json`, versionné.
14 decies. **`vercel remove … --yes` ne suffit pas à un agent** : la CLI répond « Can't delete 1 deployment without approval » et attend l'accord d'un humain.
    - Parade : une adresse à la fois, `vercel remove <adresse> --confirm-name <adresse>`, seulement quand la consigne écrite du propriétaire couvre cette suppression ; vérifier ensuite par `vercel inspect <adresse>` (« Can't find the deployment »).

## Poste et outils (Windows)

15. **PowerShell 5.1** : pas de `&&` ; écrire les fichiers JSON sans BOM.
16. **Python** : `python3` est un faux exécutable du Microsoft Store, il faut taper `python`. En mode isolé (`-I`), `PYTHONIOENCODING` est ignoré : utiliser `sys.stdout.reconfigure(encoding='utf-8')`.
17. **Git Bash** réécrit un argument qui commence par `/` en chemin Windows. Par exemple, `gh api /users/...` devient un chemin. Il faut écrire `gh api users/...`.
18. **Le site local** tourne sur le port 3100. Le 3000 peut servir à un autre projet. On n'arrête jamais un processus d'après son port, seulement par son PID.
19. **Les pages GitHub protégées** (« Confirm access ») demandent un mot de passe : on ne les automatise pas.
20. **`ubuntu-latest` passe à Ubuntu 26.04 en novembre 2026** (annonce d'actions/runner-images, lue le 18/11/2026). Parade : épingler `ubuntu-24.04` dans les workflows.
21. **Cloudflare Registrar impose les serveurs de noms de Cloudflare.** Changer de DNS impose de transférer le domaine chez un autre registraire.
22. **Arrêter une tâche de fond n'arrête pas toujours une boucle de Git Bash** : la boucle `for` d'un script relance le tour suivant à chaque processus arrêté.
    - Parade : le script écrit d'abord son propre numéro (`echo $$ > fichier`) ; on arrête la boucle par ce numéro, puis ses enfants, toujours par PID.
23. **`npx --no-install <outil>` échoue quand une version plus récente que celle du cache existe** (« npx canceled due to missing packages »).
    - Parade : appeler l'outil déjà présent dans le cache de npx par son chemin, ou épingler sa version ; aucune installation nouvelle sans accord.
24. **Filmer une page animée sans à-coups** (vidéos des propositions de design) :
    - Vu : la diffusion d'écran du navigateur (screencast) suit son propre rythme (45 à 51 images par seconde) et rend des images en pixels CSS ; ramenée à 30 images par seconde, elle saute un pas puis le répète. Une capture CDP lancée depuis une seconde session sort aussi en pixels CSS. Une animation CSS mise en pause ne se termine jamais : une transition de vue reste alors devant la page. Deux mouvements de doigt arrivés dans la même image réelle sont fusionnés.
    - Parade : une horloge virtuelle installée avant les scripts de la page (`requestAnimationFrame`, `performance.now`, animations CSS et transitions de vue avancées à la main, puis terminées par `finish()`) ; une image par pas de 1/30 s, prise par la capture de Playwright à l'échelle « device » ; chaque mouvement de glisser attendu avant l'image ; vérification image par image sur le MP4 (`tblend` et `signalstats` de ffmpeg).
