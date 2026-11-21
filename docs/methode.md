# Méthode de mesure de Sovermap

Version 0.2, **provisoire**, du 19/11/2026. Elle intègre les décisions et corrections de l'ARRÊT 1 du chantier T1. Elle sera figée en version 1.0 à l'ouverture. Chaque changement de méthode prend un nouveau numéro et s'inscrit au § 11.

Cette méthode se refait à la main, avec les outils de tout ordinateur :
- Windows : `Resolve-DnsName` (PowerShell) et `nslookup` ;
- macOS et Linux : `dig` ;
- pour les registres : un navigateur.

Les sources citées ici sont décrites, avec leurs licences et leurs conditions, dans `docs/sources.md`.

## 1. Ce que Sovermap montre, et ce qu'il ne montre pas

**Il montre**, pour chaque domaine de la liste de référence :
- s'il répond, et ses serveurs de noms ;
- ses adresses, son réseau (AS), la société qui exploite ce réseau, sa maison mère ultime et le pays du siège de chacune ;
- si un réseau de diffusion (CDN) est placé devant le site ;
- si la société a au moins une offre qualifiée SecNumCloud ;
- des agrégats, et les changements confirmés jour après jour.

**Il ne montre pas** :
- où se trouvent physiquement les serveurs ;
- où sont stockées les données des usagers ;
- les systèmes internes de l'État ;
- si un site respecte la loi ;
- l'hébergeur d'origine caché derrière un CDN (« non observable »).

Une dépendance n'est pas une faute. Un site public peut légalement passer par un CDN étranger. Les règles strictes visent surtout les données sensibles (voir `docs/juridique.md`).

## 2. Vocabulaire

- **Nom** : un nom de la liste de référence, par exemple `www.impots.gouv.fr`. C'est souvent un nom d'hôte, pas seulement un domaine.
- **Zone** : la partie de l'arbre DNS gérée par les mêmes serveurs de noms, par exemple `impots.gouv.fr`.
- **Serveurs de noms (NS)** : les serveurs qui répondent pour une zone.
- **CNAME** : un alias. Le nom renvoie vers un autre nom.
- **Adresse** : une adresse IPv4 (enregistrement A) ou IPv6 (enregistrement AAAA).
- **Préfixe** : le bloc d'adresses annoncé sur Internet qui contient l'adresse.
- **AS (système autonome)** : le réseau qui annonce ce préfixe. Il a un numéro (par exemple AS16276) et un titulaire inscrit dans un registre régional.
- **Société exploitante** : la société qui exploite cet AS.
- **Maison mère ultime** : la société qui contrôle la société exploitante, en haut de la chaîne.
- **CDN (réseau de diffusion)** : un réseau placé devant le site, qui le sert aux visiteurs depuis ses propres serveurs.
- **Diffusé par** : la société dont le réseau sert le site aux visiteurs. C'est le CDN quand il y en a un.
- **Hébergé par** : la société dont le réseau sert le site quand aucun CDN ne s'interpose. Derrière un CDN, l'hébergeur d'origine est « non observable » depuis l'extérieur.

## 3. Périmètre

- **Liste de référence** :
  - au départ, la liste des noms de domaine des organismes publics tenue par la DINUM ;
  - Sovermap part de sa copie archivée, datée du 11/12/2024 (103 398 noms), car la copie à jour n'est pas accessible aux robots (voir `docs/sources.md` et `specs/001-sovermap/pieges-connus.md`) ;
  - d'autres sources ouvertes la complètent (annuaire de l'administration, sites de l'État recensés par le SIG, opérateurs de l'État) ;
  - chaque nom garde sa provenance.
- **Noms internes ou techniques** : ils ne sont ni mesurés ni affichés (décision du 19/11/2026). Un nom est exclu si l'une de ces règles s'applique :
  1. **zone interne** : il appartient au réseau interministériel de l'État (`rie.gouv.fr` et ses sous-domaines) ;
  2. **environnement** : une étiquette de son sous-domaine, ou un de ses morceaux séparés par « - », vaut `preprod`, `preproduction`, `pprd`, `ppd`, `recette`, `rec`, `staging`, `test`, `tests`, `testing`, `dev`, `devel`, `develop`, `development`, `qualif`, `qualification`, `integration`, `sandbox`, `demo`, `review`, `preview`, `uat`, `isoprod` ou `k8sdev` ;
  3. **outil technique** : sa première étiquette commence par `rancher`, `traefik`, `portainer`, `grafana`, `kibana`, `prometheus`, `metabase`, `metrics`, `hasura`, `matrix`, `turn`, `jenkins`, `gitlab`, `sentry`, `argocd`, `vault`, `intra`, `intranet`, `extranet`, `admin`, `webmail`, `mail`, `smtp`, `imap`, `pop`, `mx`, `autodiscover`, `lyncdiscover`, `sip` ou `vpn`.
  4. **sous-zone interne** : une étiquette du sous-domaine, autre que la première, vaut `in` (par exemple `grh.in.phm.education.gouv.fr`) ; une première étiquette `in` reste mesurée, car elle peut être le code d'un pays (décision du propriétaire, 21/11/2026, point 04). Deux garde-fous :
     - le nombre de noms écartés par cette règle est publié chaque jour avec la règle (`etat.json`, `qualite.regleSousZoneInterne`, et la page Qualité) ;
     - à chaque nouvelle liste officielle, 20 de ces noms tirés au hasard sont reposés à Quad9 (une question A chacun, et AAAA quand A répond sans adresse ; le tirage dépend de la date de la liste, si bien qu'un jour non publié retire les mêmes noms). Si l'un répond, la règle est suspendue : ses noms reviennent dans la mesure, et elle se revoit au point suivant. Seule une revue la rétablit. **« Répond » veut dire : NOERROR avec au moins un enregistrement A ou AAAA** (décision du propriétaire, 21/11/2026, point 05). Rien d'autre ne suspend la règle : ni NXDOMAIN, ni NOERROR sans adresse, ni SERVFAIL, ni un délai dépassé. Si Quad9 ne donne de verdict pour aucun des 20 noms (délais dépassés, questions impossibles), le contrôle ne prouve rien : la règle garde son état, et la liste est reposée le lendemain. Le contrôle est publié chaque jour avec ses comptes : noms avec adresse, NXDOMAIN, NOERROR sans adresse, SERVFAIL, délais, autres échecs. Un changement de son état est un changement de règles (B.7 bis), jamais un déménagement.

  Sur la copie du 11/12/2024, ces règles écartent 12 595 noms : 4 788 en zone interne, 6 231 environnements et 1 576 outils. **Il reste 90 803 noms publics**, répartis en 34 068 domaines enregistrés. La quatrième règle (21/11/2026) écarte en plus 2 478 noms de cette copie, et 3 901 noms de la liste mesurée au 21/11/2026 (les deux copies de la DINUM : 3 883 sous education.gouv.fr, 18 sous education.fr) ; il y reste 101 245 noms, en 41 340 domaines enregistrés. La liste des règles est versionnée, chaque nom exclu garde la règle qui l'exclut, et un nom présent dans les deux copies ne compte qu'une fois.
- **Unité comptée (D1, b2)** :
  - le chiffre compte **chaque domaine enregistré une fois**, par son **nom web** : `www.` s'il répond, sinon l'apex ;
  - la collecte mesure aussi les autres noms publics du domaine (par exemple les services de `beta.gouv.fr`, qui ne sont pas internes) ;
  - ces autres noms sont affichés dans sa fiche, sans entrer dans le chiffre.
- **Périmètre « État » du chiffre-titre (D1, a2)** : les domaines en .gouv.fr, plus ceux des services et établissements de l'État recensés par le Référentiel de la DILA et l'Observatoire du SIG, plus ceux des opérateurs de l'annexe au projet de loi de finances. Cela fait environ 1 900 domaines au 18/11/2026.
  - Les plateformes tierces citées comme sites (réseaux sociaux) en sont retirées.
  - Le chiffre limité aux domaines en .gouv.fr (D1, a1) est publié comme sous-chiffre.

## 4. La chaîne des couches

Chaque couche donne sa valeur, sa source, sa date et son niveau de confiance (§ 5).

### Couche 1 — Le domaine
- Valeur : le nom, son type (commune, ministère…), son organisme et son ministère quand ils sont connus, la liste d'origine.
- Source : la liste de référence et ses compléments.

### Couche 2 — Les serveurs de noms
- **Valeur** : la zone qui contient le nom, ses serveurs de noms, et pour chacun : adresse, AS, société.
- **Mesure** : on remonte les étiquettes du nom. On garde le premier niveau dont la réponse NS porte exactement ce nom comme propriétaire.
  - Attention : une requête NS ou SOA sur un nom qui est un CNAME suit l'alias et renvoie la zone de la cible.
- **À la main** :
  - Windows : `Resolve-DnsName -Name impots.gouv.fr -Type NS -Server 9.9.9.9`
  - macOS et Linux : `dig NS impots.gouv.fr @9.9.9.9`
  - puis l'adresse de chaque serveur : `Resolve-DnsName -Name dns1.impots.gouv.fr -Type A -Server 9.9.9.9`
- **DNSSEC** : la zone est signée si son parent publie un enregistrement DS, et ses réponses sont alors validées.
  - Windows : `Resolve-DnsName -Name impots.gouv.fr -Type DS -Server 9.9.9.9`
  - macOS et Linux : `dig DS impots.gouv.fr @9.9.9.9`
  - La validation se lit dans le drapeau AD d'un résolveur qui valide. Avec `dig`, c'est le champ `flags` : `dig SOA impots.gouv.fr @9.9.9.9`.
  - La collecte lit ce drapeau sur les réponses NS et SOA de la zone, sans poser de question DS ; si l'une des deux échoue, le DNSSEC de la zone est « non déterminé ».
  - **La collecte lit le drapeau AD** des réponses NS et SOA de la zone, données par son résolveur qui valide ; elle ne pose plus la question DS, qui irait chaque fois au serveur du domaine de premier niveau (21/11/2026). Le résultat est le même pour une zone dont la chaîne de confiance est saine ; une zone dont la signature est cassée répond en échec (SERVFAIL), publié comme tel.

### Couche 3 — Les adresses
- **Valeur** : la chaîne CNAME complète, puis les adresses IPv4 et IPv6, avec le résolveur, l'heure et la durée de vie (TTL).
- **À la main** :
  - Windows : `Resolve-DnsName -Name www.impots.gouv.fr -Type A -Server 9.9.9.9` (puis `-Type AAAA`). La sortie montre chaque maillon CNAME, puis les adresses.
  - macOS et Linux : `dig www.impots.gouv.fr A @9.9.9.9` (puis `AAAA`).

### Couche 4 — Le réseau
- **Valeur** : pour chaque adresse, le préfixe annoncé et l'AS d'origine.
- **Sources** : deux sources indépendantes au moins, fichiers en masse pour le quotidien et API pour les contrôles (`docs/sources.md`).
- **À la main** : `https://stat.ripe.net/data/network-info/data.json?resource=37.59.183.73` (RIPEstat, lisible dans un navigateur).

### Couche 5 — La société exploitante
- **Valeur** : le titulaire de l'AS selon son registre régional, puis la société retenue par Sovermap.
- **Mesure** : une table tenue à la main relie chaque AS à une société. Chaque ligne a sa source et sa date. Un AS absent de la table reste « non déterminé » au niveau société ; on affiche quand même le nom donné par le registre.
- **À la main** : `https://stat.ripe.net/data/as-overview/data.json?resource=AS16276`, ou le service RDAP du registre régional de l'AS (par exemple `https://rdap.db.ripe.net/autnum/16276` pour le RIPE NCC).

### Couche 6 — La maison mère ultime
- **Valeur** : la société qui contrôle la société exploitante.
- **Sources** : GLEIF (relations « parent ultime »), puis un registre officiel ou le rapport annuel de la maison mère.
  - Toutes les sociétés n'ont pas de LEI : le 18/11/2026, deux sociétés d'essai sur trois n'en avaient pas.
  - Une « exception de déclaration » de GLEIF marque souvent le sommet d'une chaîne, ou un contrôle par des personnes. Elle ne veut pas dire « maison mère inconnue ».
  - Chaque lien de la chaîne est donc confirmé par un rapport annuel ou un registre, avec sa date.
- **À la main** : https://search.gleif.org/ (recherche par nom de société, onglet des relations), puis le rapport annuel de la tête de groupe (« filiales », « organigramme », « Exhibit 21 »).

### Couche 7 — Les pays des sièges
- **Valeur** : le pays du siège de la société exploitante et celui de la maison mère.
- **Classement** : il suit la **maison mère ultime**, car c'est elle qui peut exposer à des lois extraterritoriales. Catégories :
  - France ;
  - Union européenne hors France ;
  - Europe hors UE (Royaume-Uni, Suisse, Norvège…) ;
  - hors d'Europe ;
  - non déterminé.
- **Géolocalisation** : on n'utilise jamais la géolocalisation d'une adresse IP. La carte le dit : « les fils vont vers le pays du siège de la société, pas vers un serveur ».

### Couche 8 — SecNumCloud
- **Valeur** : la société a-t-elle au moins une offre qualifiée SecNumCloud ?
- **Source** : la liste officielle de l'ANSSI. Le site cyber.gouv.fr est protégé contre les robots (constat du 18/11/2026). La liste est donc relevée à la main par une personne, avec sa date. Aucun relevé n'est automatique.
- **Phrase obligatoire** : « Cette société a au moins une offre qualifiée SecNumCloud. Cela ne veut pas dire que ce site l'utilise. »

### Couche 9 — Le CDN
- **Valeur** : le CDN placé devant le site, s'il y en a un.
- **Mesure** : un CDN est reconnu de deux façons :
  - par un maillon de la chaîne CNAME qui se termine par un suffixe connu (par exemple `edgesuite.net` ou `akamai.net`, `fastly.net`, `cdn.cloudflare.net`) ;
  - ou par l'AS de l'adresse, s'il figure dans la liste des AS de CDN.
- **Liste** : elle est tenue à la main, et chaque entrée cite la documentation du fournisseur.
- **Conséquence** : le site est « diffusé par » ce CDN, et son hébergeur d'origine est « non observable ».

### Couche 10 — La messagerie (MX et SPF)
- **Valeur** : les serveurs de messagerie du domaine, et la même chaîne (adresse, réseau, société, maison mère, pays) ; les expéditeurs autorisés par son enregistrement SPF (`v=spf1`), réduits à leurs AS, ses `include` et `redirect` suivis dans la limite de 10 recherches de la RFC 7208 (les macros ne sont jamais évaluées).
- **Décision C2-1** (20/11/2026) : mesurée depuis la collecte v1, avec son propre chiffre, à part du chiffre-titre. Un MX nul (RFC 7505) se dit « nul », l'absence de MX « aucun ». Ce qu'elle montre et ce qu'elle ne montre pas sera écrit en méthode 0.3 (C.2) ; d'ici là, son chiffre est provisoire.
- **À la main** : `Resolve-DnsName -Name impots.gouv.fr -Type MX -Server 9.9.9.9`, ou `dig MX impots.gouv.fr @9.9.9.9`.

## 5. Croisements et niveaux de confiance

- **Confirmé** : pour chaque couche qui entre dans le chiffre selon D1, au moins deux sources indépendantes concordent. Pour l'adresse servie, cela vaut à chaque étape : adresses, réseau, société exploitante, maison mère, pays.
  - Une liste officielle unique vaut source pour sa couche, avec sa date (par exemple la liste SecNumCloud de l'ANSSI).
- **Probable** : une seule source, cohérente.
- **Non déterminé** : les sources manquent ou se contredisent. Le désaccord est montré.

Règles de croisement :
- **Adresses** : le résolveur principal et un résolveur public européen de contrôle (Quad9) doivent donner des adresses du même AS, ou de la même société. Sinon, voir le point de mesure (§ 6).
  - Chaque jour, **tous les domaines du périmètre « État »** sont reposés au résolveur de contrôle, par leur nom web, ainsi que 3 % des autres domaines, tirés au hasard. Le chiffre-titre peut donc être « confirmé » pour chacun de ses domaines.
  - Un domaine hors du périmètre « État » qui n'a pas été reposé ce jour-là reste au mieux « probable » pour sa couche adresse, sauf s'il l'a été lors d'une collecte précédente avec le même résultat.
- **Réseau** : les deux sources préfixe → AS doivent donner le même AS d'origine.
  - Le fichier IPtoASN peut avoir plusieurs jours (celui lu le 18/11/2026 datait du 01/11/2026). Son accord avec la table RIS **du jour** suffit pour « confirmé », quel que soit son âge : RIS dit ce qui est annoncé aujourd'hui, et IPtoASN le confirme.
  - En cas de désaccord, la couche passe en « non déterminé » pour cette adresse.
- **Société** : la table de Sovermap et le titulaire inscrit au registre ne doivent pas se contredire.
- **Maison mère** : GLEIF et un registre officiel, ou un rapport annuel, doivent concorder.

Le chiffre-titre ne compte que le « confirmé ». Il se lit donc « **au moins X %** » des domaines de l'État. On affiche à côté :
- la part hors UE au niveau « probable » ;
- la part « non déterminé ».

## 6. Cas limites

- **CNAME en chaîne** : on suit jusqu'à 10 maillons. Au-delà, ou en cas de boucle, la couche est « non déterminé ».
- **Plusieurs adresses** : toutes sont rattachées.
  - Si elles mènent à des sociétés différentes, le site est servi par plusieurs sociétés. Toutes sont affichées.
  - Le classement prend la catégorie la plus éloignée, et le dit (décision D1 du 19/11/2026 : un domaine compte comme dépendant dès qu'**au moins une** des sociétés qui le servent a sa maison mère hors de l'UE).
- **IPv6 seul** : le site est mesuré par ses adresses AAAA, comme les autres.
- **Domaine qui ne répond pas** : on distingue :
  - le nom n'existe pas (NXDOMAIN) ;
  - le nom existe sans adresse (NODATA) ;
  - un échec (SERVFAIL, délai dépassé).
  Un échec est retenté plus tard ; il n'est jamais confondu avec « pas de site ».
- **CDN** : le site est « diffusé par » le CDN, et l'hébergeur d'origine est « non observable ». Le CDN est reconnu par sa chaîne CNAME ou par la liste de ses AS, jamais par le seul AS de l'adresse.
  - Raison : des caches de CDN sont parfois placés dans le réseau d'un fournisseur d'accès. Leur adresse appartient alors à l'AS de ce fournisseur (exemple 2, § 8).
- **Hébergeur mutualisé** : plusieurs sites partagent la même adresse. C'est normal ; chacun est compté pour lui-même.
- **Plusieurs AS d'origine pour un préfixe** : tous sont gardés. S'ils mènent à des sociétés différentes, la couche est « non déterminé ».
- **Point de mesure** :
  - **Le problème.** Les CDN répondent selon la position du résolveur (géolocalisation par le DNS, option EDNS Client Subnet, RFC 7871). Les adresses servies à une machine aux États-Unis peuvent donc différer de celles servies en France. Elles peuvent même appartenir à un autre réseau.
  - **La parade.** Chaque réponse garde le nom du résolveur et le lieu connu de la machine qui mesure. Un résolveur public européen sert de contrôle. Le classement d'un site derrière un CDN repose sur le CDN, que la position du résolveur ne change pas.
  - Le choix du résolveur principal est décrit dans `specs/001-sovermap/plan.md`.
- **Filiale européenne d'un groupe non européen** : les deux sièges sont affichés, et le classement suit la maison mère ultime.
- **Ancien bloc d'adresses** : le nom historique d'un bloc ne dit pas qui l'exploite aujourd'hui. On suit le titulaire actuel de l'AS d'origine.

## 7. Garde-fous de publication

- **Hystérésis** : un changement (un « déménagement ») n'est publié qu'après deux collectes successives concordantes.
- **Disjoncteur** : si une collecte change plus de 2 % des classements, rien n'est publié, une alerte part, et l'état de la veille reste affiché. Ce seuil est provisoire : il sera justifié par la variation mesurée d'un jour à l'autre pendant les premières semaines de collecte.
- **Domaines témoins** : un petit panel fixe, au comportement connu, est contrôlé à chaque collecte (`referentiels/temoins.json`) : le résolveur de la collecte, Quad9 et Cloudflare doivent tous retrouver chaque témoin tel qu'il est connu. Un écart bloque la publication.
- **Échecs DNS** : au-delà de 2 % de domaines en échec que Quad9 ne confirme pas, rien n'est publié ; ni au-delà de 8 % de pannes confirmées par Quad9, ou de 2 points de plus que la veille (décision du propriétaire, point 02). « La veille » est la mesure de la veille quand elle a été gardée, sinon le dernier jour publié ; une mesure fiable arrêtée par la seule hausse des pannes devient la veille du lendemain, si bien qu'un vrai changement durable (un hébergeur qui s'arrête) est publié le lendemain, au lieu de tout bloquer pour toujours. Un nom dont une seule famille d'adresses répond (par exemple A, quand AAAA échoue) reste mesuré avec elle : sa fiche dit quelle famille a échoué (`familleEnEchec` : ses adresses sont inconnues, jamais « absentes »), son DNSSEC se lit sur les réponses reçues, et son niveau ne dépasse pas « probable » ; cette famille n'est pas reposée (l'échec se répète : une preuve DNSSEC cassée a coûté jusqu'à 18 questions DNSKEY par question à une zone, à l'essai du 21/11/2026), et ces noms sont comptés chaque jour (`qualite.nomsUneFamilleEnEchec`). Un nom dont aucune famille ne répond est en échec, et repris.
- **Échecs** : plusieurs essais espacés. Un échec reste un échec, jamais un « pas de site ».
  - Deux codes disent qu'une question n'a pas été posée pendant un essai, et pourquoi : `ZONE_MUETTE` (le sommet de la zone a échoué trois fois de suite) et `SOUS_ZONE_MUETTE` (huit noms d'une même sous-zone ont échoué, et aucun n'a jamais répondu : souvent des noms internes). Chaque essai suivant les repose.
  - Un domaine qui n'existe pas (sa question NS reçoit NXDOMAIN, sans rien d'autre) n'est plus interrogé : rien n'existe sous un nom qui n'existe pas (RFC 8020). Son SOA, ses CAA, MX et TXT, et chacun de ses noms reçoivent ce NXDOMAIN sans question. Une question NS en échec rend le domaine « en échec », jamais « sans serveurs de noms ».
- **Ordre de la mesure** : domaine par domaine : d'abord les domaines de 50 noms ou plus, du plus grand au plus petit (ce sont les plus longs à mesurer), puis les autres, dans un ordre tiré au hasard. Un domaine s'ouvre par sa question NS, au rythme des serveurs de son registre (6 zones nouvelles par seconde au plus pour les extensions de l'AFNIC, ensemble), à chaque essai ; puis ses noms sont mesurés, quatre à la fois, pendant que sa délégation est connue du résolveur.
- **Politesse** :
  - débit limité, et respect des conditions de chaque source ;
  - un agent utilisateur qui s'identifie, sans adresse e-mail ni nom de compte : `Sovermap-bot/<version> (+https://sovermap.vercel.app)`, puis sovermap.com au chantier 3 ;
  - au plus 10 questions par seconde vers un même serveur DNS faisant autorité. Le rythme est réglé à la source : 6 zones nouvelles par seconde au plus vers les serveurs d'un même registre, et 5 questions par seconde au plus vers chaque serveur de noms, comptées sur toutes les zones qu'il sert (une question prend le même instant chez tous les serveurs de noms de sa zone, quel que soit celui que le résolveur choisit ; un serveur se reconnaît à son nom et à son adresse, lue dans les journaux du résolveur, si bien que deux noms d'un même serveur partagent son rythme ; une zone dont les NS ne répondent pas se règle sur le primaire de son SOA et sur les adresses que le résolveur a interrogées pour elle ; une zone dont les CNAME mènent à une autre zone respecte aussi les serveurs de celle-ci). Le résolveur ajoute parfois ses propres questions aux nôtres (le renvoi vers une sous-zone, un nouvel essai sur un autre serveur, la suite d'un CNAME) : les journaux les comptent, zone par zone, sur la dernière minute (une question qui suit un CNAME compte pour la zone où elle va), et une question d'une zone qui en coûte plus de 1,6 à ses serveurs prend plusieurs instants (6 au plus) ; là où une question a échoué (le sommet de la zone, ou la sous-zone qui porte le nom en échec), les suivantes en prennent 4 (le résolveur y essaie les autres serveurs, plusieurs fois), sans ralentir le reste de la zone ; avant que les journaux puissent le dire, la première question d'un nom profond prend un instant de plus pour chaque nom intermédiaire nouveau, que le résolveur demande d'abord (minimisation de QNAME). Un frein lit en plus les journaux du résolveur : il retient les questions vers un serveur qui a reçu 7 questions dans la seconde, et toutes les questions à 9 ;
  - **tolérance de départ** (décision du propriétaire, 21/11/2026, B.3, corrigée au point 05) : zéro seconde au-delà de 10 reste l'objectif. Une version de la collecte est acceptée si, **en projection sur la collecte complète** (rejouée sur toute la liste, avec les questions du résolveur), au plus 0,1 % des secondes dépassent 10 questions vers un même serveur ; et si, **sur son essai**, aucun serveur ne reçoit jamais plus de 15 questions en une seconde, et au plus une seconde dépasse 10 (ou 0,1 % des secondes actives si c'est plus : sur un essai de moins de 1 000 secondes actives, une seule seconde dépasse déjà 0,1 %). Au-delà, elle est corrigée et essayée de nouveau. Le résumé de chaque collecte applique la même règle que l'essai. Deux chiffres sont publiés chaque jour (`etat.json`, `qualite.debitMaxParServeur`, et la page Qualité) : la part des secondes de la mesure (celles où le résolveur a posé au moins une question ; les attentes entre deux essais n'en sont pas) où au moins un serveur a reçu plus de 10 questions, et le plus grand nombre de questions reçues par un même serveur en une seconde ;
  - aucune requête HTTP vers les sites mesurés en V1 : le DNS seulement.
- **Données personnelles** : aucune. On ne garde ni contacts des registres ni noms de personnes.
- **Lecture par le site** : le serveur du site lit les fichiers publiés de la branche `donnees` ; en cas d'échec, il sert l'état de la veille gardé en cache, avec sa date affichée. Il ne lit jamais les fichiers de Release, fermés aux robots par github.com : la Release `donnees-courant` est pour les personnes (décision du propriétaire, 21/11/2026).

## 8. Essai sur des domaines réels (18/11/2026)

Ces mesures sont des **essais**, faites le 18/11/2026 à partir de 20:57 UTC (heure de Paris : 21:57), pour éprouver la méthode. Elles ne sont pas des résultats publiés.

Conditions de l'essai :
- **résolveurs publics** : Quad9 (9.9.9.9), DNS4EU (86.54.11.100), Cloudflare (1.1.1.1) et Google (8.8.8.8).
  - Les conditions de DNS4EU réservent son service public à un usage personnel. Il a servi ici à quelques dizaines de requêtes d'essai, et il ne servira pas à la collecte (`specs/001-sovermap/plan.md`, § 9).
- **rattachement des adresses** : le fichier IPtoASN (daté du 01/11/2026, domaine public), contrôlé par RIPEstat. Les deux concordent pour toutes les adresses de l'essai. Les noms de titulaires cités ci-dessous sont ceux du fichier IPtoASN.

Les maisons mères sont à confirmer par GLEIF et par un registre (partie C).

### Exemple 1 — www.data.gouv.fr : un hébergement simple
- **CNAME** : `rgs.infra.data.gouv.fr`.
- **Adresses** : 37.59.183.73, .91 et .92, chez les quatre résolveurs ; pas d'IPv6.
- **Réseau** : préfixe 37.59.0.0/16, AS16276, titulaire « OVH SAS ».
- **Serveurs de noms** : `dns200.anycast.me` et `ns200.anycast.me` (46.105.206.200 et 46.105.207.200), sur l'AS16276 (OVH SAS).
- **DNSSEC** : pas d'enregistrement DS.
- **CDN** : aucun.
- **Lecture** : hébergé par OVH SAS (France). La maison mère est à confirmer.

### Exemple 2 — www.impots.gouv.fr : un CDN, et des réponses qui dépendent du résolveur
- **CNAME** : deux maillons, `www.impots.gouv.fr.edgesuite.net` puis `a1352.dscb.akamai.net`. Le CDN Akamai est donc reconnu par la CNAME.
- **Adresses** : elles changent selon le résolveur, mais toutes sont sur l'AS20940, titulaire « Akamai International B.V. » :
  - Quad9 : 23.58.84.14 et .68 ;
  - DNS4EU : 23.220.72.72 et .79 ;
  - Cloudflare : 184.25.102.80 et .96 ;
  - Google : 92.123.237.139 et .160 ;
  - chacun donne aussi deux adresses IPv6.
- **API DNS de Google, avec trois valeurs d'EDNS Client Subnet** (un réseau universitaire français, un réseau de Microsoft Azure aux États-Unis, un réseau américain) : les trois réponses donnent 81.65.241.8 et .17. Ces adresses sont dans l'AS15557, titulaire « Societe Francaise Du Radiotelephone - SFR SA ». C'est un cache Akamai placé dans le réseau d'un fournisseur d'accès français.
- **Serveurs de noms** : `dns1.impots.gouv.fr` et `dns2.impots.gouv.fr` (dns1 : 145.242.11.22), sur l'AS34177, titulaire « Celeste SAS ».
- **Lecture** :
  - diffusé par Akamai : société exploitante Akamai International B.V. (Pays-Bas) ; maison mère à confirmer (attendue : Akamai Technologies, Inc., États-Unis) ;
  - hébergé par : non observable ;
  - le seul AS de l'adresse aurait pu faire croire à un hébergement chez un fournisseur d'accès français : c'est pourquoi le CDN se reconnaît par la CNAME.

### Exemple 3 — www.paris.fr : un CDN, et des serveurs de noms de deux pays
- **CNAME** : `t.sni.global.fastly.net` (CDN Fastly).
- **Adresses** : elles changent selon le résolveur, toutes sur l'AS54113, titulaire « Fastly, Inc. » :
  - Quad9, Cloudflare et Google : 151.101.3.52, 151.101.67.52, 151.101.131.52 et 151.101.195.52 ;
  - DNS4EU : 199.232.171.52.
- **Serveurs de noms** :
  - `mdpdns01.paris.fr` (AS49566, « Ville de Paris ») et `mdpdns02.paris.fr` ;
  - `nsa.perf1.fr` et `nsb.perf1.com` (AS20756, « NAMESHIELD SAS ») ;
  - `nsz.perf1.com` (208.80.124.13, AS16552, « DIGICERT - Tiggee LLC ») ;
  - un même prestataire de noms a donc un serveur sur le réseau d'une autre société, d'un autre pays.
- **Lecture** : diffusé par Fastly, Inc. ; hébergé par : non observable. Les serveurs de noms relèvent de plusieurs sociétés.

### Exemple 4 — www.univ-lyon1.fr : un réseau public
- **CNAME** : `dsi-www-front.univ-lyon1.fr`.
- **Adresse** : 134.214.126.59, chez les quatre résolveurs.
- **Réseau** : préfixe 134.214.0.0/16, AS2060, titulaire « Renater ».
- **Serveurs de noms** :
  - `dns.univ-lyon1.fr` et `dns2.univ-lyon1.fr` (Renater) ;
  - `ccpntc3.in2p3.fr` et `ccpnvx.in2p3.fr` (AS789, « IN2P3 - Renater »).
- **Lecture** : réseau de Renater (France).
- **Limite** : l'AS dit quel réseau sert l'adresse. Il ne dit pas qui gère la machine.

### Exemple 5 — www.economie.gouv.fr : un CDN sans CNAME
- **CNAME** : `economie.gouv.fr` (l'apex), qui ne contient aucun nom de CDN.
- **Adresses** : 141.101.90.96 à .99, chez les quatre résolveurs ; pas d'IPv6.
- **Réseau** : préfixe 141.101.90.0/24, AS13335, titulaire « Cloudflare, Inc. ». Cet AS est dans la liste des CDN.
- **Serveurs de noms** : `dns1`, `dns2` et `dns3.finances.gouv.fr` (AS60855, « LA DIRECTION INTERMINISTERIELLE DU NUMERIQUE »), puis `dns1` et `dns2.impots.gouv.fr` (Celeste SAS).
- **Lecture** : diffusé par Cloudflare, Inc. (reconnu par l'AS) ; hébergé par : non observable.

### Cas limites rencontrés dans la liste de référence (essai de 21:01 UTC)
- **Le nom n'existe plus (NXDOMAIN).** C'est le cas de `www.saint-remy-au-bois.fr`. Windows répond « Le nom DNS n'existe pas ».
- **L'hôte n'existe plus, sa zone si.** C'est le cas de `labonnealternance-new.apprentissage.beta.gouv.fr` : sa zone répond encore, avec des serveurs de noms chez alwaysdata.
- **Réseau interministériel de l'État.** `pro.pnr-certif.gouv.fr` a une adresse sur l'AS60855 (DINUM), en IPv4 seulement.
- **Un ancien bloc d'adresses.** `masaclariti.agriculture.gouv.fr` pointe vers 15.211.0.51, annoncé par l'AS20055, titulaire « Wholesail networks LLC ». La société et sa maison mère sont à établir avant tout classement.
- **Une plateforme de création de sites.** `saintgondon.com` a des adresses sur l'AS16509 (« Amazon.com, Inc. ») et des serveurs de noms `domaincontrol.com`. L'AS dit qui exploite le réseau, pas qui vend le service.
- **Un serveur mutualisé.** `la-garde-adhemar.com` et `mairie-saintmauriceauxricheshommes.fr` ont la même adresse, 46.105.156.177 (OVH SAS), avec des serveurs de noms chez Gandi.

## 9. Ce que l'essai a appris

1. Des sites importants de l'État passent par un CDN. Le CDN se reconnaît par la CNAME (exemples 2 et 3), ou par l'AS quand il n'y a pas de CNAME (exemple 5).
2. Les adresses servies par un CDN changent selon le résolveur. On ne compare donc pas les adresses : on compare les AS, puis les sociétés.
3. Un cache de CDN peut se trouver dans le réseau d'un fournisseur d'accès. D'où la règle : jamais le seul AS de l'adresse.
4. La requête NS ou SOA suit les CNAME. La zone se trouve donc en remontant les étiquettes (§ 4, couche 2).
5. La table AS → société doit couvrir d'abord les AS les plus fréquents. Les autres restent « non déterminé » au niveau société, jusqu'à ce qu'ils soient établis.

## 10. Travaux voisins

Vérifiés le 18/11/2026. Ces travaux sont cités pour situer Sovermap, pas copiés.

| Travail | Ce qu'il mesure | Suivi | Couverture française | Méthode |
|---|---|---|---|---|
| **Bleu Blanc Cloud** (https://bleublanccloud.fr/) | La dépendance numérique des collectivités à des fournisseurs extra-européens : hébergement, messagerie, DNS, SaaS. Note de A à E par organisation. | Campagnes hebdomadaires, historique par organisation ; méthode publique depuis le 29/09/2026 | 1 162 collectivités (communes de plus de 10 000 habitants, départements, régions). Ni ministères ni opérateurs. | Passive : DNS, AS, plages des grands clouds, référentiel de fournisseurs sourcé (siège, maison mère, Cloud Act, SecNumCloud). Lit jusqu'à 5 pages par site. Code EUPL-1.2, données Licence Ouverte 2.0. |
| **eGovernment Benchmark 2026** (Commission européenne) | Indicateurs pilotes de souveraineté : « 37.2% of government websites were found to be hosted on network infrastructure ultimately controlled by organizations headquartered outside the European Union. » | Un relevé (novembre 2025) | Agrégats européens ; aucun chiffre français lu | Adresse → AS → organisation → propriétaire ultime → pays du siège, sans géolocalisation. Rapport sous CC BY 4.0. |
| **Municipalytics** (université IT:U de Linz, https://municipalytics.internetwarte.eu/) | Hébergement, messagerie, DNS et IPv6 des communes de 30 pays | Deux relevés (mars et août 2026) | 34 946 communes, environ 20 300 domaines web mesurés | Géolocalisation de l'adresse, et pays de l'opérateur de l'AS. Pas de maison mère. |
| **Kumar et al., « Of Choices and Control », IMC 2024**, et les billets « Who hosts the government? » de l'Internet Society | L'hébergement des sites gouvernementaux de 61 pays | Une collecte | 669 pages d'accueil françaises | Géolocalisation, et pays d'enregistrement de l'AS |
| **EDRIX** (indice européen de résilience numérique) | Un indice par pays ; le pilier public porte sur environ 3 domaines par pays | Trimestriel | Environ 3 domaines | Société détentrice de l'AS, sans géolocalisation |
| **« EU Digital Sovereignty in Practice »**, IMC 2026 | 1 988 domaines de quatre secteurs dans les 27 États | Une collecte | Incluse ; texte intégral non lu | DNS, certificats, HTTP |
| **Observatoire de l'écosystème numérique de l'État** (SIG) | Audience et qualité de 470 sites en .gouv.fr, avec leur tutelle | Mensuel | Sites de l'État | Pas d'hébergement |
| **Relevés d'août 2026** sur data.gouv.fr | IPv6, DNSSEC et security.txt de 3 581 domaines publics | Une collecte | Domaines tirés de l'Annuaire | Pas d'hébergement |
| **Cartes de la messagerie des mairies** (Next, mxmairies.fr, MXmap) | Le fournisseur de messagerie des communes | Ponctuel, ou relances manuelles | Jusqu'à environ 36 000 mairies | MX et SPF seulement |
| **GSA Site Scanning** (États-Unis), **basisbeveiliging.nl** (Pays-Bas) | Santé, conformité et sécurité des sites publics de leur pays ; basisbeveiliging localise aussi les serveurs | Quotidien | Aucune | Scans actifs |

**Ce qui distingue Sovermap** (faits, sans jugement sur ces travaux) :
1. **Le périmètre.** Toute la liste officielle des domaines du secteur public, État et collectivités, avec la même méthode et à la même date. L'État (ministères, services, opérateurs) n'est suivi par aucun des travaux ci-dessus.
2. **Le rythme.** Une collecte chaque jour, un journal des changements confirmés et des archives datées.
3. **La méthode.** Jamais de géolocalisation d'adresse. Le classement suit la maison mère ultime, avec les preuves couche par couche, refaisables à la main.
4. **La confiance.** Deux sources par couche pour le « confirmé », la part « non déterminé » publiée, et une hystérésis avant tout changement publié.
5. **La retenue.** Aucune requête vers les sites mesurés en V1, et ni note ni classement d'organismes.

## 11. Versions de la méthode

| Version | Date | Changement |
|---------|------|------------|
| 0.1 | 18/11/2026 | Première rédaction, éprouvée sur 21 noms réels. Provisoire. |
| 0.2 | 19/11/2026 | Décisions D1 et corrections de l'ARRÊT 1 : noms internes exclus (§ 3), unité et périmètre (§ 3), contrôle de tous les domaines de l'État (§ 5), règle d'IPtoASN (§ 5), catégorie la plus éloignée (§ 6), agent utilisateur (§ 7). |
| 0.2 (collecte v1) | 20/11/2026 | Sans changement de la règle du chiffre : couche 10 mesurée (C2-1) ; domaine enregistré par la Public Suffix List ; un nom hébergé sur une plateforme tierce (créateur de sites, réseau social) est sa propre unité ; le nom web d'un domaine (www. s'il est dans la liste, sinon l'apex) est ajouté aux noms mesurés s'il n'y est pas ; périmètre « État » provisoire : .gouv.fr et les sites du Référentiel de la DILA (C.5 le complètera) ; témoins et échecs DNS parmi les garde-fous (§ 7). |
| 0.2.1 | 21/11/2026 | Quatrième règle des noms internes, « sous-zone interne », avec ses deux garde-fous (§ 3, décision du propriétaire au point 04) ; un nom exclu ne compte qu'une fois. Ordre et rythme de la mesure, à la source (§ 7) ; tolérance du débit (§ 7, B.3) et ses deux chiffres publiés chaque jour ; DNSSEC lu sur la validation du résolveur ; codes `ZONE_MUETTE` et `SOUS_ZONE_MUETTE` ; un domaine qui n'existe pas n'est plus interrogé, ni ses noms (§ 7) ; rythme par adresse de serveur, et poids d'une question selon ce que le résolveur y ajoute (§ 7). |
