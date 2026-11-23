# La contre-vérification

Ce document vérifie les données publiées par un autre chemin que celui de la collecte, sur un échantillon tiré au hasard (brief du chantier 2, C.9). Il est daté : chaque passage s'ajoute, le plus récent en tête.

## 1. Le principe

La collecte de chaque jour suit un seul chemin : le résolveur de la collecte, sur les machines de GitHub, puis la table IPtoASN et les référentiels tenus à la main (`docs/methode.md`, § 4). Une erreur sur ce chemin se répéterait partout sans se voir. La contre-vérification reprend 30 domaines de l'état publié et refait chaque couche par un chemin qui ne partage rien avec la collecte : un autre résolveur, sur un autre réseau, une autre base des réseaux et un registre des sociétés.

L'objectif : au moins 95 % des contrôles faits concordent, et chaque désaccord est expliqué ci-dessous, un par un.

## 2. Le tirage

- **30 domaines, par strates**, dans cet ordre : 10 de l'État (hors opérateurs), 5 opérateurs de l'État, 5 collectivités, 5 derrière un CDN, 5 pour la messagerie. Un domaine n'est tiré qu'une fois, dans la première strate qui le prend ; une strate qui ne le prend pas le laisse aux suivantes.
- **Opérateur** : un domaine du périmètre « État » par l'Observatoire du SIG ou par la liste du MESR ; si l'état n'a pas ces listes, par le Référentiel de la DILA, hors de gouv.fr. **Collectivité** : un domaine hors du périmètre « État » dont un nom porte, dans la liste de la DINUM, un type de collectivité (commune, EPCI, collectivité, conseil départemental, conseil régional). **CDN** : le nom web est diffusé par un CDN reconnu. **Messagerie** : le domaine publie des serveurs de messagerie (MX).
- **Seuls les domaines mesurés ce jour-là** peuvent être tirés : le nom web a répondu, et la fiche n'a pas été réduite à l'essentiel par sa taille. Une fiche **écourtée** (`tronque` : ses listes ne gardent que leurs premiers noms triés, `pipeline/borner.ts`) peut être tirée : ses listes se comparent par inclusion (§ 3).
- **Le hasard est écrit** : les candidats de chaque strate sont triés par nom, puis mélangés avec une graine, le jour de l'état (AAAAMMJJ). N'importe qui refait le même tirage sur le même commit de la branche `donnees` (§ 7).

## 3. Les couches, et le chemin indépendant de chacune

| Couche | Ce qui est publié | Le chemin indépendant | Concordance |
|---|---|---|---|
| Chaîne CNAME du nom web | le résolveur de la collecte | le résolveur de l'ordinateur qui vérifie | les mêmes noms |
| Serveurs de noms (NS) | le résolveur de la collecte | le résolveur de l'ordinateur | les mêmes serveurs (une liste écourtée : chacun de ses serveurs est trouvé) |
| Messagerie (MX) | le résolveur de la collecte | le résolveur de l'ordinateur | les mêmes serveurs (même règle) |
| Réseau (AS) des adresses IPv4 du nom web | la table IPtoASN | Team Cymru, sur deux adresses au plus | chaque AS trouvé ailleurs est un AS publié |
| CDN | un suffixe documenté, une plage officielle ou un AS du fournisseur | le suffixe dans la chaîne trouvée ailleurs ; sinon un AS du fournisseur parmi ceux que Team Cymru donne (les mêmes réponses que la couche AS, par une autre méthode) | le même fournisseur |
| Pays de la maison mère, une fois par société | l'état publié (`index/exploitants.json` : la maison mère ultime et le pays de son siège) | la GLEIF : la maison mère ultime qui consolide les comptes, et le pays de son siège | la même catégorie (France, UE hors France, Europe hors UE, hors d'Europe) |

- **Le taux compte des contrôles** : un par couche et par domaine, et un par société pour sa maison mère, quel que soit le nombre de ses domaines.
- **Un contrôle est non vérifiable**, et ne compte pas dans le taux, dans quatre cas :
  - une question du chemin indépendant échoue (délai dépassé, panne d'un serveur) ; « pas de donnée » et « pas de nom » sont, eux, des réponses ;
  - la société n'a pas de LEI ;
  - l'état publie une maison mère « non déterminé » ;
  - la GLEIF ne déclare aucune maison mère, alors que l'état en publie une : la GLEIF ne la contredit pas, elle ne dit rien.
- **RIPEstat n'est plus interrogé** (depuis le 23/11/2026) : ses réponses viennent de RIS, que la collecte utilise déjà pour confirmer ses AS ; ce n'est donc pas un chemin indépendant.

Deux écarts attendus ne sont pas des erreurs, et sont expliqués comme tels : un enregistrement DNS qui a changé entre le jour de l'état et le jour de la vérification ; une maison mère « comptable » (celle de la GLEIF) plus basse que la maison mère qui contrôle (celle des référentiels, § 4 de la méthode).

## 4. La politesse

- Le DNS seulement vers les domaines mesurés : aucune requête HTTP, aucune connexion vers leurs sites.
- Le résolveur de l'ordinateur : un quart de seconde entre deux questions.
- Team Cymru (fiche 24 du registre des sources) : 100 questions par jour au plus, comptées pour toute la journée (UTC) dans un fichier du dossier de sortie ; un second passage le même jour, avec le même dossier, continue le compte. Le contrôle seulement : ce document dit si Team Cymru concorde, jamais ce qu'il répond.
- La GLEIF (fiche 31) : deux questions au plus par société (sa maison mère ultime, puis le pays de celle-ci), une seconde au moins entre deux requêtes, avec l'agent utilisateur du projet ; un identifiant reçu n'est employé que s'il a la forme d'un LEI.

## 5. Les conditions de RIPEstat

RIPEstat n'a servi qu'au passage du 22/11/2026.

- **L'article 3.2** des conditions du service RIPEstat (https://www.ripe.net/about-us/legal/ripestat-service-terms-and-conditions, relues le 22/11/2026) :
  - l'usage suit l'objet du service, que l'article 3.1 décrit (l'analyse et la surveillance des réseaux, leur débogage, la recherche) ;
  - un utilisateur qui fait une recherche avec RIPEstat en déclare les résultats au RIPE NCC, par un e-mail à l'adresse du service que donne l'article (« they must notify the RIPE NCC about the results of this research ») ;
  - quand il publie ces résultats, il cite le RIPE NCC et la source des données de RIPEstat, si elle est autre.
- **L'article 3.3** interdit de redistribuer les données de RIPEstat : aucune n'est publiée ici, seulement la concordance.
- **Ce que fait Sovermap** : le passage du 22/11/2026 cite « RIPE NCC, RIPEstat (données de RIS, du RIPE NCC) ». La déclaration par e-mail se fera au chantier 3, depuis une adresse sur sovermap.com (décision du propriétaire du 22/11/2026, point 13, Q2 A).

## 6. Les passages

### Passage du 23/11/2026 : l'état du jour 3

- **L'état vérifié** : la collecte du 23/11/2026 (publiée à 15:13 UTC), commit `85166b9c5dd241bd9832345af77dda5449f93b5c` de la branche `donnees`. Vérification depuis un ordinateur, à 17:45 UTC, avec l'outil corrigé après sa relecture neuve.
- **Le tirage** : graine 20261123 ; 30 domaines : 10 de l'État, 5 opérateurs, 5 collectivités, 5 derrière un CDN (tous les cinq derrière Cloudflare ce jour-là), 5 pour la messagerie.
- **Le résultat** : **121 contrôles concordent sur 121 faits (100 %)**, au-dessus de l'objectif de 95 % ; 8 contrôles non vérifiables. Questions à Team Cymru ce jour : 82 (au plus 100).
- **Par couche** : chaîne CNAME 30 sur 30 ; serveurs de noms 30 sur 30 ; messagerie 23 sur 23 ; réseau (AS) 25 sur 25 ; CDN 8 sur 8 ; maison mère 5 sur 5 (Worldline, Cloudflare, SFR, Cegedim.cloud, OVH). Une fiche écourtée (mairie-sagnes-et-goudoulet.fr) : ses serveurs de noms et de messagerie sont tous trouvés.
- **Les huit contrôles non vérifiables** :
  - cinq « réseaux » (armeflhor.fr, legiondhonneur.fr, isae-supaero.fr, saintegemmelaplaine.fr, ml-nordmeusien.fr) : Team Cymru n'a pas répondu pour une de leurs adresses ;
  - la maison mère de Gandi : la GLEIF n'en déclare aucune, et l'état n'en publie pas ;
  - celles de France Travail et de Nameshield : pas de LEI.
- **La panne de Team Cymru** : un premier passage, à 17:30 UTC, a trouvé le service DNS de Team Cymru en panne (une même question en échec par le résolveur de l'ordinateur et par Quad9) : 28 contrôles AS sur 30 non vérifiables. Le passage ci-dessus a été refait après une seule question de vérification ; les questions des deux passages, et les trois de vérification, comptent dans le budget du jour.
- **Attribution** : Team Cymru ; GLEIF (CC0).

### Passage du 22/11/2026 : l'état du jour 2 (corrigé le 23/11/2026)

- **L'état vérifié** : la collecte du 22/11/2026 (mesure de 11:26 à 15:05 UTC, publiée à 15:06), commit `0d8887de9` de la branche `donnees`, méthode 0.2.1, référentiels 0.2. Vérification depuis un ordinateur, à partir de 16:10 UTC.
- **Le tirage** : graine 20261122 ; 30 domaines : 10 de l'État, 5 opérateurs, 5 collectivités, 5 derrière un CDN (tous les cinq derrière Cloudflare ce jour-là), 5 pour la messagerie.
- **Le résultat annoncé**, « 160 couches concordent sur 162 vérifiées (98,8 %) », **ne tient pas**, d'après la relecture neuve du 23/11/2026 :
  - les deux désaccords (les serveurs de noms d'emploi.gouv.fr et de ccomptes.fr) venaient de fiches écourtées, qui ne gardaient que leurs quatre premiers serveurs triés, et non d'un serveur ajouté depuis le jour 1 ;
  - les deux contrôles de la maison mère de Gandi, publiée « non déterminé », avaient été comptés « concorde » ;
  - la couche AS était comptée deux fois (Team Cymru et RIPEstat), et les contrôles de maison mère une fois par domaine.
  
  Recompté par la relecture avec un seul contrôle AS par nom : 132 sur 134 (98,5 %). L'objectif de 95 % reste atteint dans chacun de ses recomptes. Le passage du 23/11/2026, fait avec l'outil corrigé, le remplace.
- **Attribution** : RIPE NCC, RIPEstat (données de RIS, du RIPE NCC) ; Team Cymru ; GLEIF (CC0).

## 7. Refaire la contre-vérification

```
git worktree add --detach ../donnees <commit de l'état>
npx tsx pipeline/cli/contre-verifier.ts --donnees ../donnees --sortie <dossier>
```

L'outil écrit `<dossier>/contre-verification.md`, un brouillon (le tableau couche par couche, sans les valeurs de Team Cymru), et `<dossier>/resultats.json`, qui nomment tous deux le commit de l'état ; le compte des questions du jour à Team Cymru est dans `<dossier>/questions-<jour>.json`. L'outil tourne depuis un ordinateur, jamais sur les machines de la collecte : sinon, le chemin ne serait plus indépendant. Les désaccords s'expliquent ensuite à la main, ici.
