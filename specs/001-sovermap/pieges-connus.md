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

14 quinquies bis. **Dependabot signe ses messages de commit avec l'adresse de support de GitHub** (`Signed-off-by: dependabot[bot] <…>`, vu sur la PR n° 3, 20/11/2026). `scan:prive` la refusait, et toute PR de Dependabot échouait en CI. Son auteur (adresse noreply du robot) et son committer (`noreply` de GitHub) passaient déjà.
   - Parade (chantier 2, A.1) : `scanCommitMessage` accepte exactement cette ligne dans un message de commit, et rien d'autre ; la même adresse ailleurs (fichier, autre ligne, auteur) échoue toujours. L'adresse n'est jamais écrite en entier dans le dépôt : le code l'assemble à l'exécution.

## Vercel

14 octies. **Le tout premier déploiement d'un projet part en production**, même sans `--prod` (« This is the project's first deployment, so it was assigned to production »).
    - Parade : avant le premier `vercel deploy` d'un projet neuf, avoir déjà une production voulue, ou republier aussitôt en préversion puis supprimer ce déploiement par son adresse.
14 nonies. **Un projet créé par la ligne de commande garde le préréglage « Other »** : le site compile, mais Vercel ne sert que `public/` (404 partout ailleurs).
    - Parade : `"framework": "nextjs"` dans `vercel.json`, versionné.
14 decies. **`vercel remove … --yes` ne suffit pas à un agent** : la CLI répond « Can't delete 1 deployment without approval » et attend l'accord d'un humain.
    - Parade : une adresse à la fois, `vercel remove <adresse> --confirm-name <adresse>`, seulement quand la consigne écrite du propriétaire couvre cette suppression ; vérifier ensuite par `vercel inspect <adresse>` (« Can't find the deployment »).
14 undecies. **Vercel répond à certaines adresses avant le routage du site** (chantier 2, 20/11/2026).
    - Vu : `/_next/image` reçoit `400 INVALID_IMAGE_OPTIMIZE_REQUEST` du service d'images de la plateforme, même avec `images.unoptimized`, avant toute réécriture de `next.config.ts`.
    - Vu aussi : une réécriture vers une page qui appelle seulement `notFound()` répond bien 404 à une page normale, mais **200** à une navigation interne ou un préchargement (en-tête `RSC: 1`) : Vercel sert le fichier `.rsc` prérendu de cette page. Le local (`next start`) ne le montre pas.
    - Parade : la porte réécrit vers une adresse que rien ne sert (`/_porte-fermee`) ; la liste de `probe:prod` pose chaque famille avec et sans `RSC`, avec et sans préchargement ; et toute fusion qui touche le routage passe d'abord par une préversion vérifiée dans Edge (règle de `CLAUDE.md`).
14 duodecies. **Le « Vercel Security Checkpoint »** (20/11/2026) : après des contrôles rapprochés, Vercel répond `403` avec `x-vercel-mitigated: challenge` aux requêtes du PC ; un navigateur ordinaire passe seul, sans clic.
    - Parade : une seconde au moins entre deux requêtes, une seule passe à la fois ; un Checkpoint n'est ni vert ni rouge : la liste se passe dans Edge (`npm run porte:navigateur`), puis `probe:prod` se relance 30 minutes plus tard. Jamais de contournement.

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
    - Un défilement filmé ne dépasse jamais le bas de la page : arrivé au bout, il filmerait des images fixes au milieu d'un mouvement (vu au troisième tour, quand la page du ministère est devenue plus courte). Le parcours se raccourcit à vitesse constante.

## 3D, styles et polices

25. **three.js dessine en deux passes un matériau transparent visible des deux côtés** (`transparent: true` et `side: DoubleSide`), et il redemande la mise à jour de ce matériau à chaque passe, donc à chaque image : `getParameters` et `getProgramCacheKey` arrivent en tête du profil.
    - Vu au troisième tour : un dixième du fil principal au téléphone (processeur × 4), pour cinq anneaux plats.
    - Parade : `forceSinglePass: true` quand une seule passe suffit (anneau, disque plat), ou `side: FrontSide`.
    - Repérage : un profil du processeur (domaine `Profiler` de CDP) ; un point d'arrêt silencieux (`Debugger.setBreakpointByUrl` avec une condition qui écrit puis renvoie `false`) donne le matériau fautif sans toucher à la page.
26. **Un `ShaderMaterial` de three.js écrit ses couleurs sans la conversion d'affichage** (sRGB) si son fragment shader ne se termine pas par `#include <colorspace_fragment>` : tout ce qu'il dessine sort bien plus sombre que les jetons (#50585E devient #14191C). Les matériaux intégrés (`MeshBasicMaterial`, `LineBasicMaterial`) convertissent, eux.
    - Parade : la direction retenue choisit une seule règle en E.2 (conversion partout, jetons réglés pour l'image) ; les clartés et les contrastes du globe se mesurent sur l'image (une capture à la densité réelle), jamais sur les jetons seuls.
27. **Une feuille de style importée par plusieurs mises en page peut être regroupée avec les polices de l'une d'elles** (Turbopack, regroupement du CSS) : les autres routes préchargent alors ces polices pour rien (44 Ko mesurés sur M2 et M3).
    - Parade : importer la feuille commune une seule fois, dans la mise en page parente ; chaque mise en page enfant n'importe que ses propres polices. Contrôle : compter les `<link rel="preload" as="font">` de chaque route.
28. **`next/font` refuse une option qui n'est pas écrite en toutes lettres** (19/11/2026) : « Font loader values must be explicitly written literals » au build, pour une plage de caractères rangée dans une constante.
    - Parade : écrire chaque valeur dans l'appel ; `app/fonts.ts` répète les plages latin et latin-ext dans chaque police.

## Outils de mesure et de tournage (`scripts/design/`)

29. **Un texte passé par le shell perd ses barres obliques inverses** (T1, plusieurs fois) : une expression régulière, un `\n` ou un `\u00a0` écrits dans un script par un heredoc arrivent abîmés, parfois sans message d'erreur (même entre guillemets : `<<'EOF'`).
    - Parade : écrire ces fichiers avec l'outil d'écriture de l'éditeur, puis les lancer ; jamais par un heredoc.
30. **Une fonction envoyée à une page par un script lancé avec `tsx` y appelle `__name`, qui n'existe pas** (19/11/2026) : « __name is not defined » dans `page.evaluate`.
    - Parade : donner ce nom à la page avant ses scripts (`addInitScript` avec `window.__name = (f) => f;` : `AIDE_TSX` de `scripts/design/commun.ts`).
31. **Sous Git Bash, `MSYS_NO_PATHCONV=1` coupe aussi la traduction des chemins de fichiers** (20/11/2026) : un fichier écrit à la façon de Git Bash (`/c/…`) arrive tel quel, et Node le cherche dans un dossier `c` du disque courant (`C:\c\…`).
    - Parade : avec cette variable (nécessaire pour un chemin de page comme `/` ou `/page-introuvable`, piège 17), écrire les fichiers à la façon de Windows (`C:/…`). Les outils de `scripts/design/` refusent un chemin de page réécrit par Git Bash et le disent.
32. **Une page 404 produit une « erreur de console » dans Edge et WebKit** (20/11/2026) : le navigateur signale le code 404 de la page elle-même (« Failed to load resource »), sans faute de la page.
    - Parade : `scripts/design/controles.ts` ignore ce seul message quand il vise l'adresse de la page ; toute autre erreur compte.
33. **`prettier --write` sur un fichier qui n'était pas encore formaté change des lignes sans rapport** (19/11/2026) : couleurs mises en minuscules, lignes recoupées ; le diff n'est plus chirurgical.
    - Parade : ne formater que ce que l'on change, ou formater le fichier seul dans un commit à part ; relire `git diff` avant d'indexer.
34. **Une étape de tournage qui porte deux mots-clés est lue selon le premier trouvé** (20/11/2026) : un glissement avec `"images": 54` était filmé comme une pause ; seul le contrôle image par image l'a montré (aucun mouvement « glisser » dans sa liste).
    - Parade : `filmer.ts` cherche les actions avant les pauses ; après tout changement d'un parcours, lire la liste des mouvements que donne `verifier-film.ts`.

## Collecte (chantier 2, partie B)

35. **Le Référentiel de la DILA ne met pas les ministères à la racine** (20/11/2026) : l'arbre lit « Administration centrale » › « Gouvernement (Premier ministre et ministères) » › les 20 ministères, avec « Autorités indépendantes » et « Institutions et juridictions » à côté. La racine d'un service n'est donc jamais son ministère.
    - Parade : le ministère d'un service est son plus haut ancêtre (ou lui-même) du type « Administration centrale (ou Ministère) » (`pipeline/dila.ts`) ; ce sont les identifiants du SIG (`id_ministere`).
36. **Les listes officielles hébergent des sites de communes chez des créateurs de sites** (20/11/2026) : e-monsite.com (252 noms), jimdo.com (221), wordpress.com (123)… Leur domaine enregistré est celui de la plateforme : sans précaution, des centaines de communes se fondraient en un seul « domaine ».
    - Parade : `referentiels/plateformes-tierces.json` ; un nom qui en dépend est sa propre unité, hors du périmètre « État ».
37. **Un motif privé du propriétaire peut se trouver dans une donnée publique** (20/11/2026) : le domaine d'une commune en contenait un ; `scan:prive` refuse la ligne.
    - Parade : la ligne est écartée de la copie versée (2 noms, notés au `LISEZMOI`), jamais le garde-fou affaibli. La même question se posera en C.6 pour le fichier des communes.
38. **La Public Suffix List nomme des contributeurs dans ses commentaires** (adresses e-mail comprises).
    - Parade : la copie épinglée garde l'en-tête de licence, la version et les règles seulement (`reduireListeSuffixes`) ; un test vérifie qu'elle donne les mêmes règles et aucune adresse.
39. **Une adresse `mailto:` passe pour un site si on lui ajoute `https://`** : `new URL("https://mailto:x@y.example")` lit « mailto » comme identifiant et `y.example` comme hôte.
    - Parade : `hoteDuSite` refuse tout autre schéma, et toute adresse qui porte un identifiant ou un mot de passe.
40. **Une seule mesure à la fois, et la place en attente se perd** (20/11/2026) : le groupe de concurrence `collecte-mesure` (`collecte.yml`) garde une mesure en cours et une seule en attente ; une nouvelle venue annule celle qui attendait. Un essai de PR lancé pendant qu'un autre tourne peut donc prendre la place de la mesure du jour qui attendait. **Réglé le 21/11/2026** : les essais ont leur propre file (`collecte-mesure-essai`), et un essai ne mesure jamais pendant une collecte du jour, ni dans les 60 minutes avant 03:17 ou 09:47 UTC, ni dans les 120 minutes après (`pipeline/creneau.ts`, depuis le 22/11/2026) : il s'arrête en rouge, avec une phrase, et se relance plus tard.
    - Parade : jamais d'envoi sur une PR qui touche la collecte entre 02:15 et 11:50 UTC ni entre 14:15 et 17:20 UTC (la collecte du jour peut durer 330 minutes depuis le 22/11/2026, celles de 09:47 et de 15:17 partir en retard) ; les essais de PR restent courts (`LIMITE_ESSAI`) ; une mesure annulée ouvre l'issue « Collecte bloquée », et celle de 09:47 refait le jour.
41. **Une date dans une preuve casse l'hystérésis** (20/11/2026) : la date de la liste officielle d'un CDN changeait chaque jour dans la preuve ; deux mesures de suite ne donnaient donc jamais la même fiche, et la fiche publiée ne changeait plus.
    - Parade : une fiche ne porte que des valeurs stables (plan § 4) ; les dates des sources sont dans `etat.json`.
42. **Le dossier `node_modules` suit la dernière branche installée** : après un `npm install` sur une autre branche, `npm run check` ne juge plus la branche courante comme la CI.
    - Parade : `npm ci` après chaque changement de branche dont le fichier de verrouillage diffère.

43. **Une branche `fix/c2-*` publie une préversion à chaque envoi** (21/11/2026) : `vercel.json` ne dispense que `feat/c2-*` (le MEGA ne nomme que celles-là) ; chaque envoi d'une branche `fix/c2-*` qui touche un fichier non inerte (`scripts/vercel-ignore.ts`) coûte donc un déploiement. Toutes les branches du chantier se nomment `feat/c2-…`, même pour une correction.

44. **Un serveur de noms partagé reçoit la somme des rythmes de ses zones** (21/11/2026) : une cadence par zone ne borne pas la charge d'un serveur qui sert des centaines de domaines (hébergeurs, ministères) ; avec 128 domaines en vol, plusieurs de ses zones avançaient ensemble (19 questions en une seconde à l'essai 44861921566). Le rythme se règle par serveur de noms, et une question prend le même instant chez tous les serveurs de sa zone (`instantCommun`).

45. **Un nom qui a des noms en dessous existe** (21/11/2026) : le résolveur simulé des tests répondait NXDOMAIN pour `hebergeur.example` alors que `ns1.hebergeur.example` existait ; dans le vrai DNS, un tel nom répond NOERROR sans données (RFC 8020). Depuis que la collecte ne pose plus de question sous un domaine qui n'existe pas, cette erreur du simulateur cachait des questions : il répond maintenant comme le vrai DNS.

46. **Reprendre un nom à moitié en échec peut lancer une tempête de questions** (21/11/2026) : quand une famille d'adresses échoue durablement (une preuve DNSSEC cassée), chaque reprise du nom relance les questions DNSKEY du résolveur : 37 par seconde vers un même serveur à l'essai 44927717383 (PR n° 6). Seul un SERVFAIL d'une famille laisse le nom « ok » avec l'autre, son hébergement « non déterminé », jamais comparé.

47. **Un `fetch` en `no-store` rend une page dynamique** (21/11/2026) : dans une page de Next, `cache: "no-store"` (ou `revalidate: 0`) rend la route dynamique, ce qui casserait l'ISR prévue pour les pages agrégées (plan § 11). À l'intérieur d'`unstable_cache`, il ne compte pas (`patch-fetch.js` : « Inside unstable-cache we treat it the same as force-no-store on the page », sans marquer la route) : la lecture des données (B.9) passe par `unstable_cache`.

48. **Dans un arbre de travail séparé, `scan:prive` saute les motifs privés** (21/11/2026) : leur fichier est dans `.git/info` du dossier principal, absent d'un arbre créé par `git worktree`, et le crochet `pre-push` lancé depuis cet arbre ne les lit donc pas. Une branche préparée dans un arbre séparé s'envoie depuis le dossier principal.

49. **Arrêter la tâche de fond n'arrête pas le serveur Node** (21/11/2026) : sous Windows, la tâche qui a lancé `npx next start` s'arrête, mais le serveur Node continue d'écouter. Lire la ligne de commande du PID qui écoute (`Get-CimInstance Win32_Process`), vérifier que c'est bien le sien, puis l'arrêter par ce PID, jamais d'après le port.

50. **L'heure d'une entrée du journal se lit, elle ne s'estime pas** (21/11/2026) : une entrée datée de 18:38 a été écrite à 18:21. L'heure se lit (`date -u`) juste avant d'écrire chaque entrée.

51. **Lire tous les chiffres d'un diagnostic avant de l'expliquer** (21/11/2026) : la pire seconde du jour 1 comptait « 1 coupures de zone, 1 zones, DS 19 ». L'explication retenue d'abord, beaucoup d'ouvertures sous `gouv.fr`, l'avait été sans relire ce « 1 zones », qui l'excluait, et une correction avait été préparée pour la mauvaise cause (jamais envoyée). Parade : une hypothèse écrit d'abord les chiffres qui la démentiraient, et on les lit avant d'écrire du code.

52. **Les essais des PR passent l'un après l'autre, pas l'essai lancé à la main** (21/11/2026) : la mesure d'un essai de PR est dans le groupe de concurrence `collecte-mesure-essai` (l'un après l'autre) ; un essai lancé à la main (`workflow_dispatch`, comme celui du disjoncteur) est dans `collecte-mesure-jour`, celui de la collecte quotidienne, et peut tourner en même temps qu'un essai de PR : deux fois la charge sur les mêmes serveurs. Le lancer seulement quand aucun essai de PR ne tourne ni n'attend.

53. **Sous Windows, Python écrit des fins de ligne CRLF en mode texte** (21/11/2026) : un script de mutation qui restaure un fichier avec `write_text` y met des CRLF (vu par git avant l'enregistrement). Restaurer en octets (`read_bytes`, puis `write_bytes`), ou ouvrir avec `newline=""`, puis vérifier l'égalité à l'octet près.

64. **Le rythme ne borne pas les questions en attente** (22/11/2026) : le dernier essai de la PR n° 20 (17:11 UTC) a envoyé 22 questions en une seconde à un serveur du « .fr », avec le même code qu'un essai tout vert une heure plus tôt (9 au plus). À partir de 17:24, ces serveurs ont moins répondu à la machine de l'essai, et le résolveur a redemandé chaque question en attente à leurs autres serveurs (5 de ses questions pour une des nôtres, au lieu de 1,9) ; le frein, qui lit ses journaux, retient nos nouvelles questions, jamais ces reprises. Depuis, pendant la première passe, 8 questions au plus attendent leur réponse parmi celles qui passent par les serveurs d'un même registre (`PARENT_EN_VOL`), et le journal de la tâche dit combien de ces questions ont échoué et combien ont attendu une place. Les reprises vont sans ce plafond : elles sont faites surtout de zones dont les serveurs ne répondent jamais, et chacune occuperait des places jusqu'à 36 s. Et le compte des attentes ne dit pas qu'un jour est dégradé : la place est prise avant le rythme du parent, donc la file de ce rythme compte aussi comme une attente. Trois essais s'étaient suivis en moins d'une heure (16:31, 17:03, 17:11) : deux essais de PR se suivent désormais à une heure d'écart au moins.

65. **Un jour où les serveurs répondent mal, une collecte qui continue ne sert à rien** (22/11/2026) : à 17:11 et 20:14, 16 à 17 % des domaines étaient en échec (aucun confirmé par Quad9) ; le jour aurait été rouge, et la collecte aurait interrogé ces serveurs des heures, en rafales. Depuis, une pause d'urgence de 10 minutes à chaque dépassement (15 % d'échecs sur les 1 000 derniers domaines, comptés comme pour le garde-fou), un arrêt au troisième de suite, et un garde-fou garde le jour non publié. Deux leçons de la relecture : un arrêt doit se tenir au niveau des questions (des centaines de tâches sont en cours quand il est décidé) ; et compter les seules zones aurait manqué la panne du 22/11, qui touchait les noms web. Pour en chercher la cause, regarder d'abord la ligne « questions par les serveurs parents » et les questions du résolveur par zone, dans le résumé : le 22/11, les plus fortes reprises visaient une zone qui n'était pas le « .fr », et les serveurs du « .fr » répondaient normalement depuis un autre réseau. Attention en lisant l'artefact d'un essai : l'état qu'il écrit garde, pour une couche en échec, la valeur du jour publié (le bilan avec l'état publié), si bien que ses fiches ne montrent presque aucun échec (31 noms web au lieu de 811 noms le 22/11 à 20:14) ; les échecs se comptent dans le résumé (garde-fou des 2 %, échecs par code).

67. **La première passe d'un essai n'avait pas d'échéance** (23/11/2026) : seules les reprises avaient une heure limite. En panne, à un domaine par seconde et avec deux pauses d'urgence de 10 minutes, l'essai de la PR n° 25 (07:07) a dépassé la limite de 60 minutes de sa tâche : GitHub l'a coupé quelques minutes avant son troisième dépassement, sans état, sans diagnostic et sans artefact. Depuis, la première passe d'un essai s'arrête à son échéance (20 minutes, `finPremierePasse`) : aucune tâche n'y ouvre plus de domaine, même prise avant (la seconde relecture de la PR n° 25 en avait mesuré 507 ouverts après), ni n'attend plus une place du rythme, et aucune pause ni aucun arrêt n'est plus décidé après elle ; seuls les domaines déjà ouverts finissent, une pause commencée juste avant comprise. Au débit du 23/11, environ 9 minutes ; sur un jour plus dur, où les zones mortes gardent longtemps les places vers les serveurs parents, 14 à 20 minutes (la troisième relecture) : d'où 20 minutes et non 30 : 20 + 10 + 20 + 3, sous les 60 de la tâche. Le résumé dit alors « Essai partiel ». La première passe d'une collecte du jour reste entière (sa tâche a 330 minutes, et l'arrêt d'urgence vient vers 3 000 domaines).

68. **Windows garde certains ports pour le seul TCP** (23/11/2026) : un test du client DNS ouvrait un port UDP au hasard, puis le même numéro en TCP ; une fois sur une dizaine, `listen` répondait `EACCES` (un port réservé du système), et le test attendait jusqu'à sa limite de 15 secondes, rouge. Le test essaie désormais un autre port. Toute paire de ports ouverte dans un test se prépare ainsi, l'erreur écoutée.

69. **`git worktree remove` laisse le dossier sous Windows** (23/11/2026) : sur les chemins profonds de `node_modules`, git répond « Filename too long », retire l'arbre de sa liste, mais laisse ses fichiers. Parade : retirer le dossier avec PowerShell et le préfixe des chemins longs (`Remove-Item -LiteralPath ('\\?\' + chemin) -Recurse -Force`), puis `git worktree prune`.

70. **Un test lent dépasse 5 secondes quand toute la suite tourne** (24/11/2026) : un test qui construit toute la liste de référence à partir des vraies copies, ou qui lance un bash par bloc des workflows (lent à démarrer sous Windows), passait seul (3 à 4 s) et échouait avec toute la suite, sur un PC chargé. Parade : un délai propre à ce test (30 s), jamais un délai global.

71. **GitHub lance un départ planifié des heures après son heure** (23/11/2026) : le départ de 15:17 est parti à 21:40. Le garde « mesure du jour commencée » en fait un départ sans mesure ; un jour manqué se lance à la main avant 18:30 UTC.

72. **`1 << 31` est négatif en JavaScript** (23/11/2026) : les opérations sur les bits travaillent sur des entiers signés de 32 bits ; `maxBuffer: 1 << 31` est refusé par `execFileSync`. Parade : `2 ** 31 - 1`.

73. **Lire des milliers de fichiers d'un commit, un `git show` à la fois, prend des dizaines de minutes** (23/11/2026) : un seul `git cat-file --batch` les lit d'un coup ; sa sortie se lit en octets, jamais en texte, pour suivre la taille de chaque objet.
