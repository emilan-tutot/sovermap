# La contre-vérification

Ce document vérifie les données publiées par un autre chemin que celui de la collecte, sur un échantillon tiré au hasard (brief du chantier 2, C.9). Il est daté : chaque passage s'ajoute, le plus récent en tête.

## 1. Le principe

La collecte de chaque jour suit un seul chemin : le résolveur de la collecte, sur les machines de GitHub, puis la table IPtoASN et les référentiels tenus à la main (`docs/methode.md`, § 4). Une erreur sur ce chemin se répéterait partout sans se voir. La contre-vérification reprend 30 domaines de l'état publié et refait chaque couche par un chemin qui ne partage rien avec la collecte : un autre résolveur, sur un autre réseau, d'autres bases et un registre.

L'objectif : au moins 95 % des couches vérifiées concordent, et chaque désaccord est expliqué ci-dessous, un par un.

## 2. Le tirage

- **30 domaines, par strates**, dans cet ordre : 10 de l'État (hors opérateurs), 5 opérateurs de l'État, 5 collectivités, 5 derrière un CDN, 5 pour la messagerie. Un domaine n'est tiré qu'une fois, dans la première strate qui le prend.
- **Opérateur** : un domaine du périmètre « État » par l'Observatoire du SIG ou par la liste du MESR ; si l'état n'a pas ces listes, par le Référentiel de la DILA, hors de gouv.fr. **Collectivité** : un domaine hors du périmètre « État » dont un nom porte, dans la liste de la DINUM, un type de collectivité (commune, EPCI, collectivité, conseil départemental, conseil régional). **CDN** : le nom web est diffusé par un CDN reconnu. **Messagerie** : le domaine publie des serveurs de messagerie (MX).
- **Seuls les domaines mesurés ce jour-là** peuvent être tirés : le nom web a répondu, l'enregistrement est complet.
- **Le hasard est écrit** : les candidats de chaque strate sont triés par nom, puis mélangés avec une graine, le jour de l'état (AAAAMMJJ). N'importe qui refait le même tirage (§ 6).

## 3. Les couches, et le chemin indépendant de chacune

| Couche | Ce qui est publié | Le chemin indépendant | Concordance |
|---|---|---|---|
| Chaîne CNAME du nom web | le résolveur de la collecte | le résolveur de l'ordinateur qui vérifie | les mêmes noms |
| Serveurs de noms (NS) | le résolveur de la collecte | le résolveur de l'ordinateur | les mêmes serveurs |
| Messagerie (MX) | le résolveur de la collecte | le résolveur de l'ordinateur | les mêmes serveurs |
| Réseau (AS) des adresses IPv4 du nom web | la table IPtoASN | Team Cymru, puis RIPEstat, chacun à part, sur deux adresses au plus | chaque AS trouvé ailleurs est un AS publié |
| CDN | un suffixe documenté, une plage officielle ou un AS du fournisseur | le suffixe dans la chaîne trouvée ailleurs ; sinon un AS du fournisseur parmi ceux trouvés ailleurs | le même fournisseur |
| Pays de la maison mère | les référentiels (`referentiels/societes.json`) | la GLEIF : la maison mère ultime qui consolide les comptes, et le pays de son siège | la même catégorie (France, UE hors France, Europe hors UE, hors d'Europe) |

Une couche est **non vérifiable**, et ne compte pas dans le taux, quand le chemin indépendant ne répond pas, quand la société n'a pas de LEI, ou quand la GLEIF ne déclare aucune maison mère alors que les référentiels en connaissent une : la GLEIF ne la contredit pas, elle ne dit rien.

Deux écarts attendus ne sont pas des erreurs, et sont expliqués comme tels : un enregistrement DNS qui a changé entre le jour de l'état et le jour de la vérification ; une maison mère « comptable » (celle de la GLEIF) plus basse que la maison mère qui contrôle (celle des référentiels, § 4 de la méthode).

## 4. La politesse

- Le DNS seulement vers les domaines mesurés : aucune requête HTTP, aucune connexion vers leurs sites.
- Le résolveur de l'ordinateur : un quart de seconde entre deux questions.
- Team Cymru (fiche 24 du registre des sources) : 100 questions par jour au plus. RIPEstat (fiche 20) : 140 requêtes par jour au plus. Tous deux servent au contrôle seulement : ce document dit s'ils concordent, jamais ce qu'ils répondent.
- La GLEIF (fiche 31) : une seule question par LEI, une seconde au moins entre deux requêtes, avec l'agent utilisateur du projet.

## 5. Les passages

<!-- Le passage sur l'état du jour 2 (22/11/2026) s'écrit ici : date, état, graine, résultat, tableau, désaccords expliqués. -->

## 6. Refaire la contre-vérification

```
git worktree add --detach ../donnees origin/donnees
npx tsx pipeline/cli/contre-verifier.ts --donnees ../donnees --sortie <dossier>
```

L'outil écrit `<dossier>/contre-verification.md`, un brouillon (le tableau couche par couche, sans les valeurs de Team Cymru ni de RIPEstat), et `<dossier>/resultats.json`. Il tourne depuis un ordinateur, jamais sur les machines de la collecte : sinon, le chemin ne serait plus indépendant. Les désaccords s'expliquent ensuite à la main, ici.
