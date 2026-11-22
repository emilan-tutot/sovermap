# Plan — Spec 001 Sovermap

Statut : validé le 19/11/2026 (ARRÊT 1 du chantier T1). Les décisions D1 à D6 du propriétaire et ses six corrections sont inscrites au § 15. Le message du propriétaire est conservé hors du dépôt.
Chaque limite citée renvoie à sa source et à sa date de lecture (18/11/2026). Ce qui n'est pas sourcé est marqué **hypothèse**.

## 1. Architecture

```
                 chaque jour, vers 03:17 UTC
  GitHub Actions ─────────────────────────────► branche « donnees » (état du jour, fragmenté)
  (collecte.yml, ubuntu-24.04)                  + Release mensuelle (archive citable)
     │  DNS : résolveur de la collecte (§ 9)              │
     │  IP → AS : fichiers en masse (§ 8)                 │ lu par le serveur du site,
     │  AS → société → maison mère : tables tenues        │ mis en cache (§ 4, § 11)
     │       à la main dans le dépôt (referentiels/)      ▼
     └─ contrôles : témoins, hystérésis, disjoncteur   Vercel (site Next.js, région cdg1)
                                                          │ HTML rendu côté serveur
                                                          ▼
                                              navigateur du visiteur (aucun tiers)
```

- **Dépôt** `sovermap`, **public** sous le compte GitHub actuel du propriétaire (décision D6, option A) :
  - le site (Next.js) ;
  - `pipeline/` (la collecte, en TypeScript, testée) ;
  - `referentiels/` (tables tenues à la main et sourcées : AS → société, société → maison mère → pays, CDN, SecNumCloud) ;
  - `docs/` et `specs/`.
- **Données** : une branche orpheline `donnees`, écrite chaque jour par le robot de GitHub Actions, sans aucun commit sur `main` ; une Release par mois pour les archives (§ 10).
- **Site** : Vercel Hobby, relié au dépôt (décisions D2, option 0, et D6, option A). Les pages agrégées sont mises en cache (ISR). Les fiches sont rendues à la demande et mises en cache par le CDN (§ 11).
- **Domaine** : sovermap.com chez Cloudflare. Il sera branché en T8 ; le choix du DNS (option 1 de D2) se fera alors.

## 2. Décisions d'architecture et raisons

- **AD-01. TypeScript partout** (site et collecte). Une seule chaîne d'outils, un seul audit de dépendances, des tests communs. La collecte n'a besoin que de Node.js, déjà présent sur le runner.
- **AD-02. Les données hors de `main`.**
  - Le brief interdit tout commit direct sur `main`, et les règles de `main` exigent une PR.
  - La branche `donnees` reçoit l'état du jour ; c'est ce que le robot y pousse.
  - Vercel ne construit jamais cette branche (§ 11).
- **AD-03. Aucune clé.**
  - Le site lit des fichiers publics du dépôt.
  - La collecte n'utilise que le `GITHUB_TOKEN` fourni par Actions, avec les permissions minimales (`contents: write` pour la seule tâche de publication).
  - Aucune revalidation à la demande : elle exigerait un secret partagé entre GitHub et Vercel.
- **AD-04. Fiches rendues à la demande et mises en cache par le CDN**, pas en ISR. L'ISR coûte des écritures (200 000 unités de 8 Ko par mois sur Hobby), et 100 000 fiches les épuiseraient (§ 11).
- **AD-05. Tables tenues à la main** pour AS → société → maison mère → pays.
  - Aucune source ouverte ne donne la maison mère ultime de façon fiable.
  - Une table courte, sourcée ligne par ligne, couvre l'essentiel des adresses.
  - Le reste est « non déterminé » au niveau société.
- **AD-06. Le CDN se reconnaît par sa CNAME ou par sa liste d'AS**, jamais par le seul AS de l'adresse. L'essai du 18/11/2026 a montré un cache de CDN dans le réseau d'un fournisseur d'accès (`docs/methode.md`, exemple 2).
- **AD-07. Unité comptée : le domaine enregistré** (décision D1, b2, § 15).
  - La liste contient 103 398 noms. Une fois écartés les noms internes ou techniques, il reste 90 803 noms publics, répartis en 34 068 domaines enregistrés (copie du 11/12/2024, comptée le 19/11/2026).
  - Chaque domaine compte une fois, par son nom web. Ses autres noms publics sont mesurés et affichés dans sa fiche.

## 3. Faits et hypothèses

| Élément | Statut | Valeur et source |
|---|---|---|
| Taille de la liste de référence | Fait | 103 398 noms (copie GitHub du 11/12/2024, comptée le 18/11/2026) |
| Liste à jour accessible aux robots | Fait | Non : robots.txt et anti-robots de la forge (`docs/sources.md`) |
| Durée maximale d'une tâche Actions | Fait | 6 h (docs.github.com, « Actions limits », lu le 18/11/2026) |
| Minutes Actions d'un dépôt public | Fait | « free and unlimited » sur les runners standards (docs.github.com, lu le 18/11/2026) |
| Désactivation des tâches planifiées | Fait | 60 jours sans activité, dépôt public (docs.github.com, lu le 18/11/2026) |
| Ce qui compte comme « activité » | **Hypothèse** | Un envoi sur une branche du dépôt compte ; non défini par la documentation |
| Pays des runners | Inconnu | « AWS ou Azure », sans région (docs.github.com, lu le 18/11/2026) |
| Quotas Vercel Hobby | Fait | § 11 (vercel.com/docs et vercel.com/pricing, lus le 18/11/2026) |
| Effet d'un dépassement Vercel | Fait | Équipe mise en pause, production en 503, sans reprise automatique ; en général 30 jours d'attente (vercel.com/docs, lu le 18/11/2026) |
| Trafic humain à l'ouverture | **Hypothèse** | 5 000 visites par mois, 4 pages par visite |
| Passage des robots d'indexation | **Hypothèse** | 100 000 pages par mois au plus, une fois le site ouvert |
| Coût d'un rendu de fiche | **Hypothèse** | 30 ms de CPU, 40 Ko de HTML compressé ; à mesurer en T4 |
| Variation quotidienne des classements | **Hypothèse** | Moins de 0,5 % des domaines ; à mesurer en T2 pour fixer le disjoncteur |

## 4. Mise à jour quotidienne, sans redéploiement et sans clé

1. **Collecte.** GitHub Actions lance `collecte.yml` chaque jour à 03:17 UTC, hors du début d'heure, que la documentation dit chargé.
2. **Publication.** Si les contrôles passent (§ 13), la tâche écrit l'état du jour dans la branche `donnees` :
   - des fichiers JSON fragmentés de 8 Ko au plus, groupés dans des sous-dossiers de moins de 3 000 entrées ;
   - un index par organisme, par ministère et par société ;
   - le journal des changements ;
   - `etat.json`, qui porte la date, la version de la méthode et les sommes de contrôle.

   **Ce que la partie B du chantier 2 a fixé** (20/11/2026, `pipeline/publication.ts`) :
   - `noms/<aa>/<bb>.json` et `domaines/<aa>/<bb>.json` : le seau d'un enregistrement est fait des quatre premiers chiffres hexadécimaux du SHA-256 de son nom, si bien qu'il ne change jamais de fichier ; 256 seaux au plus par dossier, avec les sommes de contrôle de chaque dossier (`sommes.json`) ; un seau de plus de 8 Ko est découpé en parties numérotées (`<bb>.json`, `<bb>.1.json`…), de 8 Ko au plus chacune, la première disant combien il y en a (`parties`) ; un enregistrement pèse 3 Ko au plus (`borner.ts`), et un enregistrement qui ne passe pas son schéma est publié réduit (`reduit`), compté dans `etat.json`, sans bloquer les autres ;
   - des valeurs stables et triées, écrites en JSON déterministe : ni heure ni TTL par nom (**écart à EX-02** : l'heure est dans `etat.json`, les TTL et les adresses exactes dans l'archive mensuelle), et, pour une adresse, son AS et sa plage d'IPtoASN, jamais l'adresse exacte (celles des CDN tournent chaque jour) ni le préfixe de RIS (source « en contrôle seulement ») ;
   - les index : par AS, par exploitant (avec la liste des domaines de chacun), par pays, par organisme et par ministère (Référentiel de la DILA) ; les territoires viendront en C.6 ;
   - les clés en français, comme le code (`"statut": "preparation"`, B.6) ; les noms anglais de D5 et F.1 viendront avec les fichiers ouverts de la partie F ;
   - l'hystérésis porte sur tout le contenu d'un enregistrement : il ne change que si deux collectes de suite donnent le même nouveau contenu ; le journal ne garde que les changements d'hébergement (adresses, serveurs de noms, messagerie), jamais un passage par un échec ;
   - les observations brutes de la veille (et ses fichiers sources) restent dans le cache des Actions, jamais publiées : elles servent au reclassement de la veille avec les règles du jour (B.7 bis) et au disjoncteur.
   - les règles (`etat.json`, `versions.regles`) comptent les listes, les référentiels, la méthode, la version des schémas et du classement, et la date de la copie d'IPtoASN : la veille est classée avec la copie du jour, si bien qu'une nouvelle copie est un changement de règles, jamais un déménagement ;
   - une mesure fiable arrêtée par le seul disjoncteur, ou par la seule hausse des pannes confirmées (plus de 2 points sur la veille), devient la veille du lendemain, avec sa part de pannes : un vrai changement est publié s'il est revu le lendemain (sinon ces garde-fous resteraient rouges pour toujours) ; la collecte de 09:47 ne refait pas un jour dont la mesure est ainsi gardée, ni, depuis le 22/11/2026, un jour dont la mesure a seulement commencé (le témoin « mesure commencée », gardé dans le cache d'Actions avant la première question : un jour ne se mesure qu'une fois, même après un garde-fou rouge ou une coupure) ;
   - la publication refuse un jour qui n'est pas plus récent que le jour publié (une relance tardive ne republie jamais un jour ancien, ni deux fois le même jour) ; la tâche « jour » s'arrête en rouge, avec une issue, quand l'API de GitHub ne répond pas, au lieu de croire le jour à faire ; la collecte prend la date de cette tâche, jamais celle de l'horloge ;
   - l'archive mensuelle ne donne les adresses exactes du jour qu'aux fiches qu'elles confirment (même état, même chaîne de CNAME, chaque adresse dans une plage de la fiche) : une fiche retenue par l'hystérésis n'en reçoit pas (`pipeline/archive.ts`) ;
   - une fiche qui ne peut pas être construite (une erreur, ou une valeur que son schéma refuse) est publiée réduite à son identité (`reduit`), jamais comparée, et ne remplace jamais une fiche déjà publiée ; au-delà de 0,1 % de fiches réduites, rien n'est publié ;
   - un fichier téléchargé mal formé (une page d'erreur servie avec le code 200, un fichier coupé) compte comme un téléchargement manqué : la copie de la veille sert ;
   - quand rien n'est publié, l'exécution finit en rouge, à côté de l'issue « Collecte bloquée ».
3. **Lecture.** Le serveur du site lit ces fichiers publics, par `https://raw.githubusercontent.com/<compte>/sovermap/donnees/…`, sans clé :
   - mise en cache côté serveur (§ 11) ;
   - pages servies par le CDN de Vercel ;
   - aucun redéploiement : le site découvre la nouvelle date dans `etat.json` au plus tard une heure après la publication ;
   - le nom du compte vient d'une variable de configuration, jamais écrite en dur dans le code.

   **Ce que la partie B du chantier 2 a fixé** (21/11/2026, `lib/donnees/lecture.ts`) :
   - deux caches, qui ne gardent que ce qui a été bien lu : le cache de données de Next (`unstable_cache` : sur Vercel, partagé par les fonctions et gardé d'un déploiement à l'autre), où `etat.json` est relu sur GitHub au plus une fois par heure, et chaque autre fichier une fois par somme de contrôle ; devant lui, une copie dans la mémoire de la fonction (2 000 fichiers au plus), pour qu'une page ne relise pas le cache partagé à chaque requête (quotas, § 11) ;
   - quand une relecture échoue, Next garde l'entrée périmée : l'état servi est le dernier bien lu, avec sa date (le jour de la collecte, dans `etat.json`), et jamais un jour plus ancien que celui déjà servi (une copie périmée de raw.githubusercontent.com) ;
   - l'état de chaque jour est aussi gardé dans le cache partagé, sous sa date, par la première fonction qui le voit (depuis sa mémoire, sans relire GitHub). Un fichier du jour qui ne peut pas être lu cède la place à sa version de la veille, avec son jour, lue dans les caches seulement (GitHub n'a que celle du jour), même dans une fonction qui vient de démarrer, si cette version y est déjà ; la veille est le jour d'avant quand `etat.json` compte au moins deux jours publiés de suite, sinon le dernier état que la fonction a en mémoire. La garantie vaut par fichier, pas par nom : un fichier que l'état du jour ne publie plus n'est jamais servi depuis la veille ; mais quand l'état du jour ne peut pas être lu jusqu'au fichier (le `sommes.json` de son dossier, ou le fichier lui-même), la veille est servie telle qu'elle était, avec sa date, si bien qu'un nom sorti de la liste ce jour-là peut y figurer encore, daté de la veille ; l'état de la veille, une fois lu, reste dans la mémoire de la fonction ;
   - après un échec, GitHub est laissé tranquille une minute, par fonction : tout entier après un 429, un 5xx ou une erreur du réseau ; ce seul fichier après un fichier illisible, absent ou d'une autre somme ; une lecture en cours sert à toutes les requêtes qui l'attendent ;
   - chaque fichier est vérifié contre sa somme (celles des dossiers et des fichiers de tête dans `etat.json`, celles des fragments dans le `sommes.json` de leur dossier) : un fichier qui ne correspond pas, comme une copie périmée juste après une publication, n'est jamais gardé ;
   - chaque lecture en échec (429, 5xx, erreur du réseau, fichier illisible, somme différente) s'écrit dans les journaux du serveur, avec le chemin et le code, rien d'autre ;
   - porte fermée, aucune lecture : le module le vérifie avant toute lecture ; l'agent utilisateur est celui de la collecte (`Sovermap-bot/<version>`) ;
   - pour la partie D : une page sans données (« indisponible ») ne se met jamais en cache (sinon le CDN la garderait un jour entier) ; la page Qualité dit le jour de l'état servi ; l'ISR d'une page s'ajoute à l'heure de la copie en mémoire (jusqu'à 2 h pour voir une nouvelle date) : régler les deux ensemble pour tenir « au plus tard une heure » (§ 4.3), par exemple 30 minutes chacune ;
   - à mesurer en T4, avec les 429 : le coût du cache de Next sur la page Usage de Vercel (`etat.json` pesait 56 Ko dans l'essai, soit 7 unités de 8 Ko par lecture du cache partagé, au plus une fois par heure et par fonction, plus une lecture de l'état du jour par fonction et par jour).

   **Risque de lecture**, ajouté le 19/11/2026 :
   - le journal des modifications de GitHub du 08/05/2025 annonce des limites pour les accès sans authentification, dont « downloading files from raw.githubusercontent.com » ; leur valeur n'est pas publiée ;
   - sans l'option payante « Static IPs », les fonctions de Vercel sortent par des adresses IP dynamiques, partagées avec d'autres clients. Une limite par adresse peut donc être atteinte par d'autres.

   **Parade, construite en T2 et mesurée au plus tard en T4** :
   - **un cache long côté serveur.** Les données ne changent qu'une fois par jour : on ne relit `etat.json` qu'une fois par heure, et les fragments seulement quand leur somme de contrôle a changé ;
   - **les données de la veille servies en cas d'échec**, avec leur date affichée. Un échec de lecture ne casse jamais une page ;
   - ~~un canal de secours sans clé : le même état publié en Release, lu seulement si raw.githubusercontent.com répond 429 ou 5xx~~. **Abandonné le 21/11/2026** (décision du propriétaire, point 03 du chantier 2) : le `robots.txt` de github.com ferme aux robots tout téléchargement de Release (`Disallow: /*/*/download/*`, pour tout agent, lu le 20/11/2026), et l'API de GitHub, sans jeton, ne permet que 60 requêtes par heure et par adresse IP, partagées avec les autres sites de Vercel. **Le site ne lit pas le canal de secours** ; la Release `donnees-courant` reste, remplacée chaque jour, pour les personnes (page Données, F.1). Le secours du site est l'état de la veille gardé en cache, avec sa date affichée ;
   - **la mesure en T4** : le nombre de réponses 429 ou 5xx sur 30 jours, à publier dans `journal-design.md`. Au-delà de 1 % de lectures en échec, une autre architecture de lecture est décidée.
4. **Archives.** Le premier de chaque mois, une Release `donnees-AAAA-MM` reçoit l'état complet (CSV et JSON compressés).
   - Une Release accepte 1 000 fichiers de moins de 2 Gio chacun, sans limite de taille totale ni de bande passante (docs.github.com, « About releases », lu le 18/11/2026).

## 5. Durée d'une collecte complète

**Mesuré au jour 1 (21/11/2026, B.11)** :
- 101 827 noms mesurés (la quatrième règle en écarte 3 901), 41 720 domaines. Première passe finie à 151 min ; une reprise (1 133 noms, après 10 min d'attente), la seconde abandonnée par l'heure limite ; mesure et reprises finies à 173 min ; contrôle des hôtes de l'État (2 053 hôtes, lancé après la première passe) fini à 185 min ; confirmation des 284 domaines en échec à 188 min (256 pannes confirmées) : **189 min en tout**, au-delà de la cible de 3 h.
- **Le goulot** : la politesse envers les serveurs des domaines de premier niveau (6 ouvertures par seconde par registre, et non 8 comme dans le calcul ci-dessous) : 41 720 ouvertures prennent au moins 116 min. Découper la collecte en tâches parallèles (B.8) n'y ferait rien gagner, puisque ces serveurs sont partagés : chaque tâche devrait se partager le même rythme.
- **Le remède** (21/11/2026) : le contrôle des hôtes de l'État part dès qu'un domaine de l'État est mesuré, pendant la première passe, au même rythme de Quad9 (2 questions par seconde, partagées avec le contrôle du plan, qui finit vers 102 min). La queue de 34 min disparaît : durée attendue, environ 177 min. La marge reste mince ; si une collecte dépasse encore 3 h, l'heure limite des reprises se revoit, jamais la politesse.

**Recalculé le 20/11/2026 (chantier 2, partie B), avec la messagerie (C2-1)** :
- **Noms mesurés** : 105 728 (les deux listes réunies, 122 209 noms distincts, moins 30 157 noms internes ou techniques, plus les sites du Référentiel de la DILA et 507 noms web ajoutés), dans **41 720 unités** (domaines enregistrés, ou noms d'une plateforme tierce), dont 1 903 dans le périmètre « État ».
- **Requêtes au résolveur** : A et AAAA par nom (≈ 212 000) ; NS, SOA, DS, CAA, MX et TXT par domaine (≈ 250 000) ; A et AAAA de chaque serveur de noms et de messagerie, une fois par hôte (**hypothèse** : 15 000 hôtes, ≈ 30 000) ; les recherches SPF, 10 au plus par domaine (**hypothèse** : ≈ 20 000). Total : **≈ 510 000 requêtes**.
- **Contrôle à Quad9** (2 par seconde, en parallèle) : nom web et MX des 1 903 domaines « État », nom web de 3 % des autres, témoins, puis adresses des serveurs de noms et de messagerie de l'État : **≈ 10 000 requêtes**, soit environ 1 h 20 de temps propre, dont 15 à 20 min après la mesure.
- **Débit** : 25 noms par seconde, et 8 domaines ouverts par seconde au plus (une seule demande de délégation par domaine nouveau aux serveurs d'un domaine de premier niveau) ; 2 questions simultanées par zone ; 8 questions au plus en attente de réponse parmi celles qui passent par les serveurs d'un même registre, pendant la première passe, et pendant les reprises si les questions de la première passe à ces serveurs ont souvent échoué (depuis le 22/11/2026). Les ouvertures de domaines fixent le rythme : 41 720 ÷ 8 ≈ 1 h 27.
- **Durée attendue** : environ 1 h 30 pour la première passe, 2 h avec les deux reprises (10 min d'attente chacune) et le contrôle des hôtes de l'État : **sous les 3 h** (CS-05). La première collecte complète le mesurera (B.11).

Calcul d'origine (19/11/2026, sans la messagerie) :

- **Noms à mesurer** : environ 96 000.
  - Ce sont les 90 803 noms publics de la liste, une fois écartés les noms internes ou techniques (`docs/methode.md` § 3).
  - S'y ajoutent les compléments des sources de l'État. **Hypothèse** : 6 %.
- **Requêtes par nom** : A, AAAA, et la chaîne CNAME qui vient avec. NS, SOA et DS ne se demandent qu'une fois par zone (environ 34 000 zones). Pas de MX en V1 (D3).
  - Total : 2 × 96 000 + 3 × 34 000 ≈ 294 000 requêtes au résolveur.
- **Contrôle** (§ 9) : environ 6 000 requêtes de plus, à Quad9.
- **Débit poli** :
  - 25 noms par seconde au plus, toutes requêtes comprises, soit environ 75 à 100 requêtes par seconde au résolveur ;
  - et 10 requêtes par seconde au plus vers un même serveur faisant autorité.
- **Durée** : 96 000 ÷ 25 ≈ 3 840 s, soit environ **1 h 05**. Avec les nouvelles tentatives (2 au plus, espacées de 10 min), le contrôle et le rattachement aux tables (local, quelques minutes) : **moins de 2 h**.
- **Marge** : la limite d'une tâche est de **6 h** (docs.github.com, lu le 18/11/2026). L'objectif est moins de 3 h (critère CS-05). Si la liste grossit, la collecte se découpe en 2 à 4 tâches d'une même exécution (une matrice accepte 256 tâches).

## 6. Tâche planifiée retardée ou sautée : le contrôle de fraîcheur

- La documentation de GitHub prévient : une tâche planifiée peut être retardée, et en cas de forte charge, « some queued jobs may be dropped » (lu le 18/11/2026).
- **Parades** :
  1. **Deux déclenchements** : 03:17 UTC, puis 09:47 UTC. Le second ne fait rien si la mesure du jour a commencé (le témoin « mesure commencée », depuis le 22/11/2026).
  2. **Contrôle de fraîcheur dans le site.** Si `etat.json` a plus de 36 h :
     - chaque page affiche bien en vue la date de la dernière collecte et la mention « données en retard » ;
     - la page d'état passe au rouge.
     Ce contrôle ne dépend pas de GitHub Actions : il reste visible même si toutes les tâches planifiées sont désactivées.
  3. **Contrôle de fraîcheur dans GitHub**, une tâche planifiée toutes les 6 h :
     - si la dernière collecte a plus de 36 h, elle ouvre une issue « Collecte en retard », ou la commente si elle est déjà ouverte ;
     - GitHub envoie alors un e-mail au propriétaire.
  4. **Échec d'une collecte** : la tâche échoue en rouge, et GitHub envoie son e-mail habituel d'échec.

## 7. La règle des 60 jours

- **Le texte** : « In a public repository, scheduled workflows are automatically disabled when no repository activity has occurred in 60 days. » (docs.github.com, « Events that trigger workflows », lu le 18/11/2026). L'« activité » n'y est pas définie.
- **Parades** :
  1. La collecte pousse chaque jour un commit sur la branche `donnees`. Le dépôt a donc une activité quotidienne (**hypothèse** : un envoi sur une branche compte comme activité).
  2. Dependabot ouvre des PR chaque semaine. Les PR fusionnées par le propriétaire sont aussi de l'activité.
  3. Le contrôle de fraîcheur du site (§ 6, point 2) rend visible toute désactivation sous 36 h.
  4. **Geste de secours**, écrit dans le README : Actions › choisir le workflow › « Enable workflow ».
- **Limite connue** : un workflow désactivé ne peut pas se réactiver lui-même. L'API `PUT …/actions/workflows/{id}/enable` existe, mais la documentation ne dit pas que le `GITHUB_TOKEN` peut l'appeler (lu le 18/11/2026).

## 8. Requêtes par jour et par source

Principe :
- les **fichiers en masse** font le quotidien, par une recherche locale, sans requête par adresse ;
- les **API** ne servent qu'aux contrôles, une requête à la fois, avec au moins une seconde entre deux requêtes vers un même hôte ;
- le robots.txt de chaque hôte est lu avant tout (`docs/sources.md`).

| Source | Usage | Requêtes | Volume | Limite documentée (lue le 18/11/2026) |
|---|---|---|---|---|
| Serveurs DNS qui font autorité, par notre résolveur local | Mesure (§ 5), messagerie comprise | ≈ 510 000 par jour au résolveur (recalcul du 20/11/2026), réparties sur des milliers de serveurs | — | Plafond que nous fixons : 10 requêtes par seconde par serveur, réglé à la source (6 zones nouvelles par seconde au plus vers les serveurs d'un même registre ; 5 questions par seconde au plus vers chaque serveur de noms, toutes zones comprises) et mesuré chaque jour sur les journaux du résolveur (`etat.json`, `qualite.debitMaxParServeur` : part des secondes au-delà de 10 et maximum) ; tolérance de départ : 0,1 % des secondes, jamais plus de 15 (point 04) ; mesure domaine par domaine, les plus grands d'abord ; 8 domaines nouveaux par seconde au plus |
| Quad9 | Contrôle : nom web et MX de tous les domaines du périmètre « État », 3 % des autres, les témoins, et les hôtes des serveurs de noms et de messagerie de l'État | ≈ 10 000 par jour, à 2 par seconde | — | Pas de plafond chiffré ; contact demandé avant un « large-scale DNS traffic » |
| Cloudflare 1.1.1.1 | Contrôle (témoins) | ≈ 100 par jour | — | Aucune limite publiée |
| IPtoASN | IP → AS | 1 fichier par jour | 10,9 Mo | Aucune ; fichiers faits pour cet usage |
| RIS (riswhoisdump IPv4 et IPv6) | Confirmation de l'AS | 2 fichiers par jour | 7 Mo | Aucune écrite |
| Fichiers de délégation des 5 registres | Pays d'enregistrement | 5 fichiers par jour | 46 Mo | Aucune écrite |
| Fichiers « split » du RIPE | AS → organisation | 2 fichiers par semaine | 14,4 Mo | « insubstantial part » seulement (art. 4.5) |
| Listes des CDN (Cloudflare, CloudFront, Fastly ; Azure chaque semaine) | Indicateur CDN | 4 par jour, plus 2 par semaine | 2,8 Mo par jour | Aucune écrite. Partie B : Cloudflare (2 fichiers) et Fastly ; CloudFront et Azure avec C.3 |
| Team Cymru (DNS) | Troisième avis sur l'AS | ≤ 100 par jour | — | Interface DNS conseillée pour un usage régulier |
| RIPEstat | Contrôles | ≤ 140 par jour | — | Inscription au-delà de 1 000 par jour ; 8 requêtes simultanées par IP |
| RDAP des registres | Titulaire d'un nouvel AS | ≤ 50 par jour | — | Usage raisonnable ; 3 connexions simultanées (RIPE) |
| Référentiel de la DILA | Organismes de l'État | 1 fichier par jour ouvré | 3,2 Mo | Aucune annoncée |
| API tabulaire de data.gouv.fr (SIG, MESR, PLF, BANATIC) | Organismes et sites | ≈ 40 par semaine | < 1 Mo | Aucune annoncée |
| GLEIF | Maison mère | quelques dizaines par mois (mise à jour des tables) | — | 60 requêtes par minute |
| API Recherche d'entreprises | Siège, nature juridique | quelques dizaines par mois | — | 7 requêtes par seconde par IP ; 30 par seconde par ASN |

**Total quotidien** : environ 12 fichiers (70 Mo) et 400 requêtes de contrôle, plus la mesure DNS elle-même.

**Ce qui reste manuel** :
- la liste SecNumCloud de l'ANSSI, relevée à la main chaque mois et datée ;
- la vérification des maisons mères dans les rapports annuels ;
- la lecture de Wikidata en cas de doute.

## 9. Le résolveur DNS, sans miroir apt

**Contraintes** (cahier §4.3, brief) :
- un résolveur récursif local qui valide DNSSEC, indépendant des grands résolveurs ;
- un résolveur public de contrôle ;
- aucun `apt-get install` ;
- un débit poli.

**Ce que contient le runner `ubuntu-24.04`** (image 20261111.370.1, dépôt actions/runner-images, lu le 18/11/2026) :
- présents : Docker 28.0.4, Node.js 22 et 24, Python 3.12, et `dig` (paquet dnsutils) ;
- absents : tout résolveur récursif (ni unbound, ni knot).
- L'étiquette `ubuntu-latest` passe à Ubuntu 26.04 en novembre 2026 : on épingle donc `ubuntu-24.04`.

**Options relevées** :

| Option | Pour | Contre | Verdict |
|---|---|---|---|
| **Knot Resolver**, image Docker officielle de CZ.NIC (Tchéquie), épinglée par empreinte | Image officielle : « Knot Resolver official Docker image can be found at Docker Hub » (knot-resolver.cz). Reconstruite chaque semaine (étiquettes datées, la dernière du 17/11/2026). Validation DNSSEC par défaut depuis la version 4. Indépendante des grands résolveurs. | Docker Hub limite les téléchargements anonymes à « 100 per IPv4 address or IPv6 /64 subnet » par 6 h (docs.docker.com, lu le 18/11/2026), et les runners partagent des adresses. L'empreinte épinglée vieillit chaque semaine. | **Retenue** |
| Unbound (NLnet Labs) | Résolveur de référence | Aucune image Docker officielle (espace Docker Hub de NLnet Labs lu le 18/11/2026). Les images tierces sont une chaîne d'approvisionnement non maîtrisée. Compiler sur le runner est fragile sans apt. | Écartée |
| Résolveur par défaut du runner (Azure ou AWS) | Déjà là | Pas indépendant. Validation DNSSEC non documentée. Azure plafonne à 1 000 requêtes par seconde par machine. | Témoin de repli seulement |
| Résolveurs publics seuls | Simple | Pas conforme au cahier. Leurs conditions limitent l'usage en masse (ci-dessous). | Repli d'urgence seulement, étiqueté comme tel |

**Résolveurs publics : leurs conditions** (pages lues le 18/11/2026) :
- **DNS4EU** (Whalebone, Tchéquie) : réservé à un usage « strictly for their use in a personal capacity » ; « not eligible for enterprises ». Les blocages ordonnés par un juge s'appliquent à toutes ses variantes. **Exclu** : il a seulement servi à quelques dizaines de requêtes d'essai le 18/11/2026.
- **Quad9** (fondation suisse) : gratuit pour tous, mais les grands volumes doivent les contacter d'abord (« before sending large-scale DNS traffic »). L'adresse 9.9.9.9 filtre aussi les domaines malveillants : un NXDOMAIN de Quad9 n'est jamais lu comme « pas de site ».
- **Cloudflare 1.1.1.1** (États-Unis) : valide DNSSEC, n'envoie pas l'ECS, n'affiche aucune limite chiffrée.
- **Google Public DNS** (États-Unis) : limite par adresse IP. Son API JSON accepte un sous-réseau `edns_client_subnet` explicite : il faut toujours en passer un, sinon une partie de l'adresse de l'appelant est transmise.
- **FDN** (association française) : joignable de l'extérieur en DoT ou DoH seulement depuis mars 2025, après une attaque.

**Architecture retenue (V1)** :
1. **Démarrage** : la tâche de collecte lance `cznic/knot-resolver@sha256:<empreinte>` en réseau hôte, sur un port local.
   - L'image est gardée dans le cache des Actions (10 Go par dépôt, évincée après 7 jours sans accès) : un seul téléchargement par semaine.
   - Docker Hub n'est consulté que si le cache manque, avec de nouvelles tentatives espacées.
2. **Interrogation** : le pipeline interroge ce résolveur avec une bibliothèque DNS bas niveau, pour lire les noms propriétaires (pièges connus, 6), le drapeau AD et le code de réponse.
3. **Contrôle**, d'un faible volume (correction de l'ARRÊT 1, 19/11/2026) :
   - chaque jour, Quad9 reçoit à nouveau, par leur nom web (A et AAAA) :
     - **tous les domaines du périmètre « État »**, environ 1 900 ;
     - 3 % des autres domaines, tirés au hasard, environ 960 ;
     - et les témoins.
   - Cela fait environ 2 900 domaines, soit **environ 6 000 requêtes par jour**, en moyenne 0,07 par seconde. Le chiffre-titre peut ainsi être « confirmé » pour chacun de ses domaines (`docs/methode.md` § 5) ;
   - les témoins sont aussi reposés à Cloudflare ;
   - les écarts sont consignés.
4. **Politesse** :
   - les noms sont mélangés au hasard, pour ne jamais enchaîner les noms d'une même zone ;
   - 25 noms par seconde au plus ;
   - au plus 2 requêtes simultanées par zone ;
   - un plafond de 10 requêtes par seconde par serveur faisant autorité, mesuré en T2 sur les journaux du résolveur.
   La plus grosse zone de la liste (4 788 noms) reçoit ainsi environ 1 nom par seconde.
5. **Point de mesure** :
   - Les runners tournent chez AWS ou Azure, sans région documentée (docs.github.com, lu le 18/11/2026). Une réponse communautaire de 2021 et un incident de mai 2026 les placent aux États-Unis.
   - Chaque observation porte donc l'étiquette « mesuré depuis un runner GitHub (États-Unis probable) ». La méthode affiche : « Mesures prises depuis des serveurs probablement situés aux États-Unis ; une adresse servie peut différer pour un visiteur en France. »
   - Le classement d'un site derrière un CDN repose sur le CDN (CNAME ou AS), que le point de mesure ne change pas.
6. **Pilote** (T2) : sur les domaines derrière un CDN, mesurer avec 2 ou 3 sous-réseaux ECS explicites (France, États-Unis) par l'API JSON de Google. On obtient ainsi la part de domaines dont la **société** change selon le point de mesure. Si elle dépasse 1 %, on ajoute une architecture de contrôle européenne (décision chiffrée en T2).

## 10. Où vivent les données, et la taille du dépôt dans un an

- **Branche `donnees`** :
  - l'état courant (environ 110 000 fiches de 300 octets, soit environ 33 Mo non compressés), fragmenté en fichiers de 8 Ko au plus ;
  - le journal des changements.
  Git ne stocke que ce qui change. **Hypothèse** : 1 % des fiches change chaque jour, soit environ 330 Ko de lignes par jour avant compression, et 20 à 40 Mo par an dans l'historique.
- **Mesuré au jour 1 (21/11/2026)** : l'état initial pèse 117 Mo bruts et **25,1 Mo compressés** dans Git (82 876 fichiers : environ 52 000 fragments de noms et 31 000 de domaines, 31 index ; le plus gros fichier, `index/organismes.json`, fait 1,5 Mo), soit plus que l'hypothèse ci-dessus (des fiches plus riches que 300 octets, et l'index des organismes). La croissance par jour se mesure à partir du jour 2 : pour tenir la cible de moins de 200 Mo dans un an (ci-dessous), elle doit rester sous 0,5 Mo compressé par jour en moyenne (25 Mo d'état initial, puis 365 jours). La Release `donnees-courant` (14,3 Mo compressés) est remplacée chaque jour.
- **Releases mensuelles** : 12 par an, d'environ 5 à 10 Mo compressés chacune. Elles ne comptent pas dans la taille du dépôt Git.
- **Code** : moins de 50 Mo, polices comprises.
- **Taille du dépôt dans un an** : moins de 200 Mo. La documentation recommande « ideally less than 1 GB, and less than 5 GB is strongly recommended » (docs.github.com, lu le 18/11/2026).
- **Garde-fous** :
  - aucun fichier au-dessus de 50 Mio (seuil d'avertissement ; blocage à 100 Mio) ;
  - au plus 3 000 entrées par dossier (limite recommandée de « Directory width ») ;
  - au plus 6 envois par minute (recommandation de GitHub).
- **Règles respectées** : aucun commit sur `main`. La branche `donnees` n'est pas protégée par l'ensemble de règles de `main`. Depuis le 21/11/2026, un ensemble de règles à elle interdit sa suppression et tout push forcé, sans exception (n° 27811110). La règle « seul le robot des Actions y écrit » se pose sous surveillance d'une publication (une erreur ferait manquer un jour) ; si une règle fait lancer CodeQL sur `donnees`, elle est retirée et l'écart noté ici (B.6).

## 11. Quotas de Vercel Hobby

Les quotas sont mensuels et communs à toute l'équipe Hobby, que Sovermap partage avec un autre projet du propriétaire.

**Relevé du propriétaire sur 30 jours, au 18/11/2026** (rapport d'inventaire) :
- 285 000 requêtes CDN ;
- 1 h 02 de CPU actif ;
- 121 000 invocations ;
- 6,41 Go de Fast Data Transfer et 1,02 Go de Fast Origin Transfer ;
- 15 000 lectures ISR et 0 écriture.

**Cible** : moins de 50 % de ce qui reste, passage des robots compris.

| Quota (Hobby) | Limite | Autre projet | Reste | Cible Sovermap | Estimation Sovermap (hypothèses § 3) |
|---|---|---|---|---|---|
| CDN Requests | 1 000 000 | 285 000 | 715 000 | ≤ 357 000 | ≈ 230 000 (visites 130 000 + robots 100 000) |
| Function Invocations | 1 000 000 | 121 000 | 879 000 | ≤ 439 000 | ≈ 115 000 (fiches hors cache 100 000 + agrégats et pages d'état) |
| Active CPU | 4 h | 1 h 02 | 2 h 58 | ≤ 1 h 29 | ≈ 58 min (115 000 × 30 ms) |
| Fast Data Transfer | 100 Go | 6,41 Go | 93,6 Go | ≤ 46,8 Go | ≈ 12 Go |
| Fast Origin Transfer | 10 Go | 1,02 Go | 8,98 Go | ≤ 4,49 Go | ≈ 4,0 Go (115 000 × 35 Ko) : **le quota le plus tendu** |
| ISR Writes (unités de 8 Ko) | 200 000 | 0 | 200 000 | ≤ 100 000 | ≈ 60 000 (400 pages agrégées × 5 unités × 30 jours) |
| ISR Reads (unités de 8 Ko) | 1 000 000 | 15 000 | 985 000 | ≤ 492 000 | ≈ 60 000 |
| Provisioned Memory | 360 Go-h | 3,6 Go-h | 356 Go-h | ≤ 178 Go-h | ≈ 30 Go-h (115 000 invocations × 1 s × 1 Go au plus, en comptant large) |
| Déploiements par jour | 100 | — | — | ≤ 10 | Quelques-uns (fusions) ; depuis le 20/11/2026, aucune préversion automatique pour les branches `feat/c2-*` (`vercel.json`) : préversions à la demande (`npx vercel deploy`, jamais `--prod`) |
| Durée d'un build | 45 min par build ; 1 build à la fois | — | — | ≤ 10 min | ≈ 3 min (**hypothèse** : fiches et agrégats rendus à la demande, donc rien de lourd au build) |

Sources :
- vercel.com/docs/plans/hobby et vercel.com/pricing (ISR), lus le 18/11/2026 ;
- l'ISR se compte en unités de 8 Ko : « One write unit equals 8 KB of data written to the ISR cache » ;
- aucune écriture n'est comptée si la page régénérée n'a pas changé (vercel.com/docs/incremental-static-regeneration/limits-and-pricing, lu le 18/11/2026).

**Ce que cela impose** :
- **Fiches** : rendues à la demande, avec `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800`. Une fiche servie depuis le cache du CDN ne coûte ni invocation ni ISR.
- **Pages agrégées** (environ 400 : accueil, ministères, sociétés, pays) : ISR avec `revalidate` d'une heure. Elles ne s'écrivent qu'une fois par jour, quand les données changent.
- **Données lues par le serveur** :
  - un cache en mémoire dans la fonction, et des fragments de 8 Ko au plus, soit une unité par lecture si le cache de données de Vercel sert ;
  - le cache de `fetch` est partagé par les deux projets de l'équipe, et limité à 2 Mo par entrée (vercel.com/docs/runtime-cache, lu le 18/11/2026).
- **Robots** :
  - jusqu'à l'ouverture, `robots.txt` interdit tout ;
  - à l'ouverture, le sitemap ne liste que les pages agrégées et les domaines du périmètre « État » ;
  - les robots d'IA sont réglés par décision au lancement.
- **Préfetch** : aucun préchargement automatique des liens de listes (`prefetch={false}`). Sans cela, une liste de 50 fiches coûterait 50 requêtes.
- **Surveillance** : la page Usage de Vercel est relevée chaque semaine en T4 et en T10. Un dépassement mettrait en pause les deux sites (« A paused Hobby team doesn't resume on its own », vercel.com/docs, lu le 18/11/2026). Cela justifie la marge de 50 %, et la question D2.

## 12. Données lues par le serveur, jamais par le navigateur (zéro tiers)

- Le navigateur ne parle qu'au domaine du site. La CSP le garantit : `default-src 'self'`, `connect-src 'self'`, sans aucun autre domaine.
- Les fichiers de données sont lus par les fonctions du site (côté serveur), puis rendus en HTML.
- La recherche utilise un index statique servi par le site lui-même.
- Un test e2e vérifie qu'aucune requête du navigateur ne quitte le domaine (critère CS-09).

## 13. Quand une collecte échoue

1. **Contrôles avant publication**, dans cet ordre :
   - domaines témoins conformes ;
   - taux d'échec DNS sous 2 % ;
   - disjoncteur : moins de 2 % de classements changés ;
   - schéma des fichiers valide.
2. **Si un contrôle échoue** :
   - rien n'est écrit dans `donnees`, et l'état de la veille reste servi ;
   - la tâche échoue en rouge, et GitHub envoie un e-mail au propriétaire ;
   - une issue « Collecte bloquée » s'ouvre, avec le contrôle en cause.
3. **Ce que voient les visiteurs** :
   - la date de la dernière collecte réussie, toujours affichée ;
   - au-delà de 36 h, la mention « données en retard » (§ 6).
4. **Une source en panne** (fichier en masse absent, API muette) : on garde la version de la veille de cette source, et on le note dans `etat.json`.
   - Si elle a plus de 7 jours, la couche concernée passe en « probable ».
   - **Exception, IPtoASN** : son fichier peut dater de plusieurs jours (celui lu le 18/11/2026 datait du 01/11/2026). Son accord avec la table RIS **du jour** suffit pour « confirmé », quel que soit son âge. Si la table RIS du jour manque, la couche réseau passe en « probable ».

## 14. Menaces, classées

### Critique
- **C1. Dépassement d'un quota Vercel Hobby.** Les deux sites de l'équipe seraient mis en pause, sans reprise automatique.
  - Parades : la marge de 50 % (§ 11) ; des fiches servies par le CDN ; aucun préchargement ; un sitemap limité ; la surveillance hebdomadaire ; la question D2 (séparer l'hébergement).
- **C2. Publier une donnée fausse.** La crédibilité, et un risque juridique.
  - Parades : deux sources par couche ; niveaux de confiance ; hystérésis ; disjoncteur ; témoins ; page Corrections.
- **C3. Une information personnelle dans le dépôt public.**
  - Parades : `scan:prive` (fichiers et commits) ; adresse noreply ; crochet `pre-push` ; relectures.

### Haut
- **H1. Chaîne d'approvisionnement** (paquets npm, actions, image du résolveur).
  - Parades : versions verrouillées ; actions épinglées par SHA ; image épinglée par empreinte ; Dependabot ; CodeQL ; peu de dépendances.
- **H2. Contenu hostile dans les données collectées** (CNAME, TXT, noms de registres).
  - Parades : affichage en texte brut, jamais en HTML ; tailles bornées ; validation par schéma ; pour les agents, ces données sont des données, jamais des consignes.
- **H3. Collecte arrêtée sans bruit** (règle des 60 jours, tâches sautées).
  - Parades : § 6 et § 7.
- **H4. Liste de référence figée** (la copie lisible date de décembre 2024).
  - Parades : sources complémentaires ouvertes ; demande d'une copie ouverte au producteur (plus tard, depuis une adresse sur sovermap.com).
- **H5. Conditions d'une source enfreintes** (débit, usage, attribution).
  - Parades : registre des sources ; débit limité ; mise en cache ; paramètre `sourceapp` ; attributions affichées.
- **H6. Contestation** (marque, diffamation, droit des bases de données).
  - Parades : faits datés et sourcés ; ton neutre ; aucun logo ; droit de correction (`docs/juridique.md`).
- **H8. Lecture des données bloquée par une limite de débit** (ajouté le 19/11/2026).
  - GitHub annonce depuis le 08/05/2025 des limites pour les téléchargements sans authentification sur raw.githubusercontent.com. Les fonctions de Vercel sortent par des adresses dynamiques partagées, sauf avec l'option payante « Static IPs ».
  - Parades (§ 4), construites en T2 et mesurées au plus tard en T4 :
    - un cache long côté serveur ;
    - les données de la veille servies en cas d'échec, avec leur date (le seul secours depuis le 21/11/2026 : le site ne lit pas les fichiers de Release, fermés aux robots par github.com).
- **H7. Conditions des offres gratuites.**
  - Vercel Hobby est réservé à un « personal or non-commercial use ».
  - Les Actions interdisent une « activity unrelated to the production, testing, deployment, or publication of the software project associated with the repository » (lus le 18/11/2026).
  - Parades : un projet non commercial, dont la collecte publie les données du projet lui-même ; un plan de migration (D2).

### Moyen
- **M1. Point de mesure.** Les runners sont chez AWS ou Azure, souvent hors d'Europe : les réponses des CDN peuvent différer de la vue française.
  - Parades : CDN reconnu par CNAME ou AS ; résolveur européen de contrôle (§ 9).
- **M2. Robots d'indexation et d'IA** qui consomment les quotas.
  - Parades : `robots.txt` ; `noindex` jusqu'à l'ouverture ; sitemap limité ; décision sur les robots d'IA au lancement.
- **M3. Une API de contrôle indisponible** (RIPEstat, GLEIF). Les fichiers en masse prennent le relais, et la couche passe en « probable ».
- **M4. Abus de la recherche.** Elle ne fait aucune requête serveur : il n'y a pas de surface.
- **M5. Une table tenue à la main qui vieillit** (rachats de sociétés). Chaque ligne a une date de revue, et une alerte se déclenche au-delà de 12 mois.

### Bas
- **B1. Sous-domaine orphelin de sovermap.com** (plus tard) : aucun enregistrement DNS orphelin ; CAA et DNSSEC à étudier en T8.
- **B2. Changement des offres gratuites** : surveillance des journaux de modifications de GitHub et de Vercel.
- **B3. Disparition d'une source en masse** tenue par une seule personne : au moins deux sources par couche.

## 15. Décisions

### Décisions du propriétaire (ARRÊT 1, 19/11/2026)

| Décision | Choix | Précisions du propriétaire |
|---|---|---|
| **D1** Chiffre-titre et périmètre | a2 (a1 publié comme sous-chiffre), b2, c1, d1, e1, et la définition proposée | La catégorie « Europe hors UE » reste visible. Le chiffre ne compte que le « confirmé » : il se lit « au moins X % », avec à côté la part hors UE au niveau « probable » et la part « non déterminé ». |
| **D2** Chaîne de Sovermap | Option 0 | Page « Sovermap passé à sa propre radiographie » ; réexamen en T9 ; option 1 (DNS européen) gardée ouverte, décision en T8. |
| **D3** Couches de la V1 | Le web seul | La messagerie (MX) en V2. **Modifiée le 20/11/2026 (C2-1)** : la messagerie entre dans le chantier 2, avec son propre chiffre. |
| **D4** Licences | B | Code sous EUPL 1.2 ; données sous Licence Ouverte 2.0 ; titulaire « Les contributeurs de Sovermap ». |
| **D5** Anglais | Après l'ouverture | Chantier T11, en dernier, après l'ouverture ; les autres chantiers gardent leur numéro (§ 17). |
| **D6** Identité publique | A | Dépôt public sous le compte actuel, Vercel relié au dépôt. Règles de `scan:prive` ci-dessous. |

**Corrections apportées le 19/11/2026** :
1. **Contrôle des adresses** : tous les domaines du périmètre « État » sont reposés chaque jour au résolveur de contrôle, plus 3 % des autres (§ 8, § 9 ; `docs/sources.md`, fiche 13).
2. **Noms internes ou techniques** : ni mesurés, ni affichés. Il reste 90 803 noms publics, en 34 068 domaines (§ 5 ; `docs/methode.md` § 3 ; spec, EX-01).
3. **`scan:prive` et D6** : voir l'option A de D6, ci-dessous.
4. **Lecture des données** : risque de limite de débit, et parades (§ 4 ; H8 au § 14).
5. **IPtoASN** : son accord avec la table RIS du jour suffit pour « confirmé » (§ 13). L'agent utilisateur renvoie à https://sovermap.vercel.app, puis à sovermap.com, jamais au dépôt (`docs/sources.md`, Règles ; point 03 du chantier 2).
6. **Sources** : on se passe de DB-IP. Le propriétaire peut télécharger lui-même la liste officielle à jour dans son navigateur, une fois par trimestre au plus (T3, § 17).

### Décisions du propriétaire (ARRÊT 2, 19/11/2026)

- **Direction artistique** : A, « La Veille orbitale », gardée en principe pour son globe rond ; un second tour compare « A corrigée » et quatre variantes de palette (A1 à A4) avant le choix définitif. B et C sont effacées.
- **Pour T3** (méthode, version 0.3 ; rien ne change avant T3, ni la méthode, ni l'outil de mesure, ni les chiffres de l'échantillon) :
  1. **Société exploitante hors de l'UE, maison mère dans l'UE** (cas Imperva, Inc., détenue par Thales) : un domaine compte comme dépendant dès que la société qui le sert **ou** sa maison mère ultime a son siège hors de l'UE. Sa catégorie et son fil suivent le plus éloigné des deux sièges ; la fiche affiche les deux.
  2. **Proxys de sécurité** placés devant les sites : traités comme des CDN (« diffusé par »), d'après une liste sourcée par la documentation de chaque fournisseur. Radware, F5 et OGO Security sont à confirmer ainsi ; Claranet aussi (proxy ou hébergeur ?). Quand le proxy tourne sur le réseau d'une autre société (OGO Security sur OVH ou NFrance), la fiche affiche les deux sociétés, et la plus éloignée compte.

### Décisions du propriétaire (ARRÊT 2 bis, 19/11/2026)

- **Direction artistique** : pas encore le choix final. « A corrigée » et « Brume » (A3) sont gardées ; un troisième tour ajoute trois propositions (M1 « Ardoise », M2 « Galet », M3 « Équinoxe ») ; la partie E attend la réponse à l'ARRÊT 2 ter. A1, A2 et A4 sont effacées.
- **Propreté** : une règle durable entre dans `CLAUDE.md` (dossiers rangés par usage, scripts jetables hors du dépôt, aucun fichier fantôme, `git status` propre à chaque arrêt, liste des suppressions dans chaque rapport).
- **Pour la suite** (à noter seulement, rien n'est commencé) :
  1. Après T1, tout le reste (T2 à T11, dans le même ordre) se fera en **deux grands chantiers**, de plusieurs jours chacun, avec un point toutes les deux ou trois heures (questions, et propositions de design en vidéo). Le découpage est proposé dans le rapport final de T1.
  2. **L'anglais (T11)** : tout le site, de A à Z, avec un petit bouton FR / EN ; ensuite, chaque texte ajouté ou modifié l'est dans les deux langues, dans le même commit, et la CI refuse un texte sans sa traduction.

### Décisions du propriétaire (ARRÊT 2 ter, 19/11/2026)

- **Direction artistique** : pas encore le choix final. « Brume » et « Galet » (M2) sont gardées ; un quatrième tour ajoute deux propositions qui les mélangent (« Brume douce », « Brume galet ») ; la partie E attend la réponse à l'ARRÊT 2 quater, qui sera la dernière. A corrigée, M1 et M3 sont effacées.
- **Couleurs de la 3D** : la conversion des couleurs vers l'écran (sRGB) s'applique partout ; les jetons de Brume sont recalés pour garder l'aspect affiché (écart OKLab de 0,02 au plus, mesuré sur l'image).
- **Autonomie** : une règle durable entre dans `CLAUDE.md` (les actions du projet qui se refont ou se rattrapent se décident seules et se notent au journal ; ce qui est irréversible ou hors du projet se regroupe en un seul message, à un arrêt).
- **Pour la suite** (à noter seulement) : les notes de l'ARRÊT 2 bis restent valables. Retouche : aux points des grands chantiers, les propositions de design se montrent en planches d'images, et en vidéo seulement quand il faut juger un mouvement.

### Décisions du propriétaire (chantier 2, point 05, 21/11/2026)

- **Le garde-fou de la quatrième règle (Q1 : A)** : un nom « répond » s'il reçoit NOERROR avec au moins un enregistrement A ou AAAA ; NXDOMAIN, NOERROR sans adresse, SERVFAIL et délai dépassé ne suspendent pas la règle ; un contrôle sans aucune réponse de Quad9 ne compte pas. La règle est rétablie (changement de règles, B.7 bis). Le contrôle est publié chaque jour avec ses comptes (noms avec adresse, NXDOMAIN, NOERROR sans adresse, SERVFAIL, délais).
- **La tolérance du débit, corrigée** : sur la projection de la collecte complète (rejouée sur toute la liste, avec les questions du résolveur), au plus 0,1 % des secondes au-dessus de 10 ; sur l'essai, jamais plus de 15 questions par seconde vers un même serveur, et au plus une seconde au-dessus de 10, ou 0,1 % des secondes actives si c'est plus. Zéro seconde reste l'objectif, après le jour 1.
- **La page Qualité (partie D)** montrera, avec leur texte : la quatrième règle, le nombre de noms qu'elle écarte, le dernier contrôle de Quad9 avec ses comptes, et les deux chiffres du débit (part des secondes au-delà de 10, maximum). D'ici là, ils sont publiés dans `etat.json` (`qualite.regleSousZoneInterne`, `qualite.debitMaxParServeur`).
- **Le rythme du travail** : un point n'arrête plus le travail ; les options recommandées s'appliquent tout de suite quand elles se défont ; les seuls arrêts sont un choix qui ne se défait pas, la vie privée du propriétaire ou ce que le site dit de lui (E.4), ce qui coûte de l'argent, l'ouverture de la porte, un interdit, une commande refusée sans laquelle rien n'avance ; jamais d'attente à vide (les parties C, D et E avancent en parallèle) ; une seule relecture neuve par PR, juste avant sa fusion (`CLAUDE.md`).
- Les décisions prises seul au point 05 sont validées : toutes les branches en `feat/c2-…` ; méthode 0.2.1 (0.3 reste pour la partie C) ; rythme par serveur ; A puis AAAA ; poids des sous-zones en panne. Dans le doute sur la règle de la préversion, toujours une préversion.

### Décisions du propriétaire (chantier 2, point 04, 21/11/2026)

- **Noms internes (Q1 : A)** : quatrième règle de la méthode § 3, « sous-zone interne : une étiquette du sous-domaine, autre que la première, vaut in » (3 901 noms de la liste mesurée au 21/11/2026, sous education.gouv.fr et education.fr). Deux garde-fous : le nombre de noms écartés par cette règle est publié sur la page Qualité, avec la règle ; à chaque nouvelle liste officielle, 20 de ces noms tirés au hasard sont reposés à Quad9 : si l'un répond, la règle se revoit au point suivant et ces noms reviennent dans la mesure. C'est un changement de règles (B.7 bis), jamais un déménagement.
- **Tolérance du débit (B.3)** : zéro seconde au-dessus de 10 reste l'objectif. Pour lancer le jour 1 : sur l'essai, et en projection sur la collecte complète, au plus 0,1 % des secondes au-dessus de 10 questions vers un même serveur, et jamais plus de 15. Ces deux chiffres sont publiés chaque jour sur la page Qualité, et on continue de les faire baisser. Au-delà : corriger et relancer. La durée garde sa cible de B.11 (moins de 3 h pour la mesure) ; au-delà, la collecte se découpe selon B.8, aux mêmes règles.
- **Sécurité** : après chaque fusion, lire les alertes ouvertes de code scanning, puis les traiter, ou les noter au point suivant (`CLAUDE.md`).
- Les décisions prises seul au point 04 sont validées : DNSSEC lu sur la validation du résolveur ; un domaine qui n'existe pas n'est pas interrogé sur CAA, MX et TXT ; la mesure domaine par domaine ; les codes `ZONE_MUETTE` et `SOUS_ZONE_MUETTE` ; plus de reprise après 165 minutes.

### Décisions du propriétaire (chantier 2, point 03, 21/11/2026)

- **Source IP → AS** : IPtoASN reste relevé à la main (tous les 80 jours environ), RIS en contrôle ; quand RIS le contredit le jour même, le niveau est « non déterminé ». Aucun logo de société sur le site (RIS publié l'aurait imposé).
- **Canal de secours (B.9 bis)** : le site ne le lit pas (§ 4) ; la Release `donnees-courant` reste pour les personnes ; le secours du site est l'état de la veille gardé en cache, avec sa date affichée.
- **Agent utilisateur** : `Sovermap-bot/<version> (+https://sovermap.vercel.app)`, sans nom de compte (§ 15, D6) ; au chantier 3, sovermap.com, et le dépôt passe dans une organisation GitHub gratuite « sovermap ».

### Décisions du propriétaire (chantier 2, 20/11/2026)

- **C2-1 — La messagerie entre dans le chantier 2** (D3 modifiée). Couche 10 de la méthode : les serveurs de messagerie (MX) et les expéditeurs autorisés (SPF), avec la même chaîne (adresse, réseau, exploitant, maison mère, pays). Elle a son propre chiffre, affiché à côté ; elle n'entre pas dans le chiffre-titre.
- **C2-2 — Les territoires** : les sites des collectivités se rangent aussi par région, département et commune (ou groupement), avec une carte de France.
- **C2-3 — Les dépendances** : ESLint 10 fusionné quand tout est vert ; TypeScript 7 attend que `typescript-eslint` l'accepte. Ensuite, Dependabot ne propose plus de montée de version majeure ; les majeures se regardent au début de chaque chantier.
- **C2-4 — La règle de l'ARRÊT 2 (cas Imperva)** : un domaine compte comme dépendant si la société qui le sert **ou** sa maison mère ultime a son siège hors de l'UE (texte vérifié dans les consignes de l'ARRÊT 2 du 19/11/2026). La définition du chiffre-titre (D1) change en conséquence avec la méthode 0.3 (chantier 2, partie C), qui en publie l'effet chiffré.
- **La production** reste sur la page d'attente jusqu'à l'ouverture (chantier 3), derrière la porte de la production (spec, EX-23 bis).

Ci-dessous, les options étudiées pour chaque décision, avec leurs effets. Les recommandations datent du 18/11/2026.

### D1 — Le chiffre-titre et le périmètre

**Ce qu'on sait de la liste** (copie du 11/12/2024, comptée le 18/11/2026) :
- 103 398 noms, mais environ 34 000 domaines enregistrés ;
- 29 502 noms de type « Gouvernement », tous en .gouv.fr, répartis en environ 1 200 domaines enregistrés ;
- 43 000 noms sont des sous-domaines techniques ou internes : par exemple 4 788 sous `rie.gouv.fr` (le réseau interministériel) et 1 944 sous `beta.gouv.fr`.
- **Les sources de l'État ajoutent des domaines.**
  - Le Référentiel de la DILA (`docs/sources.md`, fiche 4) donne 769 domaines enregistrés, dont 432 absents de la liste. Ce sont surtout des agences et des établissements publics : `anr.fr`, `andra.fr`, `arcom.fr`, `agence-biomedecine.fr`…
  - L'Observatoire du SIG en ajoute 57.
  - Union des trois : environ **1 900 domaines enregistrés**, dont 1 190 en .gouv.fr (estimation du 18/11/2026). Il faut en retirer les plateformes tierces citées comme sites, comme `facebook.com` ou `x.com`.

**a) Quels domaines (le périmètre « État »)**
- **a1.** Les domaines en .gouv.fr seulement (environ 1 190). C'est simple et objectif, mais les opérateurs qui ont leur propre domaine y manquent (par exemple `francetravail.fr` ou les universités).
- **a2.** Les domaines en .gouv.fr, plus ceux des services et établissements de l'État recensés par le Référentiel de la DILA et l'Observatoire du SIG, plus ceux des opérateurs de l'annexe au projet de loi de finances. Cela fait environ 1 900 domaines, filtrés par type d'organisme. C'est plus complet : l'essentiel existe dès maintenant, et le rattachement des opérateurs restants se fait en T3.
- **a3.** Toute la liste (État, collectivités, santé, enseignement). Ce n'est plus « l'État ».
- **Recommandation : a2**, avec a1 publié dès le départ comme sous-chiffre (« domaines en .gouv.fr »), le temps que les opérateurs soient rattachés.

**b) Quelle unité**
- **b1.** Chaque nom de la liste. Cela gonfle le chiffre avec des sous-domaines techniques (`staging.`, `matomo.`, machines du réseau interministériel).
- **b2.** Le domaine enregistré (environ 34 000, dont environ 1 200 en .gouv.fr). Chacun est mesuré par son nom web : `www.` s'il répond, sinon l'apex. Les autres noms sont listés dans sa fiche.
- **b3.** Les seuls apex et `www.` (environ 60 000 noms, avec des doublons).
- **Recommandation : b2.** C'est l'unité qu'un lecteur comprend (« un domaine, un site »), et elle allège les quotas : environ 34 000 fiches au lieu de 103 000.

**c) Quelle couche compte**
- **c1.** L'adresse servie : le réseau qui sert le site aux visiteurs, donc le CDN s'il y en a un.
- **c2.** Les serveurs de noms.
- **c3.** Le CDN seul.
- **c4.** « Au moins une couche » hors frontière.
- **Recommandation : c1.** C'est la société par qui passent les échanges avec les usagers. Les serveurs de noms ont leur propre chiffre, publié à côté, sans entrer dans le chiffre-titre.

**d) Quelle frontière**
- **d1.** Hors Union européenne.
- **d2.** Hors d'Europe (UE, AELE, Royaume-Uni…).
- **Recommandation : d1.** La loi SREN et SecNumCloud visent la protection contre les droits extra-européens (`docs/juridique.md`). Le classement garde quand même la catégorie « Europe hors UE », visible sur la carte.

**e) Un site derrière un CDN, dont l'origine n'est pas observable**
- **e1.** Il compte au nom du CDN : c'est lui qui sert le site.
- **e2.** Il passe en « non déterminé ».
- **e3.** Il est compté deux fois.
- **Recommandation : e1.** Le CDN reçoit et sert chaque échange avec les visiteurs. La fiche dit toujours « hébergé par : non observable ».

**Définition du chiffre-titre (adoptée le 19/11/2026) :**
- Le chiffre-titre est la part des domaines du périmètre « État » dont l'adresse servie dépend d'au moins une société dont la maison mère ultime a son siège hors de l'Union européenne.
- Il ne compte que le « confirmé » : il se lit donc « **au moins X %** ». À côté, on affiche la part hors UE au niveau « probable » et la part « non déterminé ».
- Le numérateur ne compte que le « confirmé ».
- Le dénominateur compte les domaines du périmètre qui répondent.
- La part « non déterminé » s'affiche à côté.

### D2 — La chaîne de Sovermap

Le site parle de souveraineté. Sa propre chaîne sera donc regardée de près. Relevé du 18/11/2026 :

| Maillon | Aujourd'hui | Pays | Alternative gratuite européenne vérifiée | Ses conditions | Ce qu'elle change |
|---|---|---|---|---|---|
| **Site** | Vercel Inc. (offre Hobby) | États-Unis | statichost.eu (Suède) : 1 site, 10 Go de bande passante et 100 minutes de build par mois, domaine personnalisé, en-têtes libres. Ou Codeberg Pages (association, Allemagne). | statichost.eu : « best effort », sans clause « non commercial » trouvée. Codeberg Pages : projets libres seulement ; ni HSTS, ni `nosniff`, ni COOP (liste d'en-têtes fermée). | **Site statique seulement** : aucune offre gratuite européenne vérifiée ne fait du rendu serveur Next.js avec un domaine personnalisé. Il faudrait reconstruire et redéployer le site chaque jour (contraire à EX-14), et 10 Go par mois ne suffisent pas pour des dizaines de milliers de fiches. |
| **Code et collecte** | GitHub Inc. (Actions) | États-Unis, filiale de Microsoft | Codeberg (association, Allemagne), CI Woodpecker sur demande | Projets libres ; « CI access is provided as-is and might break at any time ». Les Forgejo Actions hébergées s'arrêtent après 2 à 10 minutes. | La collecte (1 à 2 h par jour) ne tient pas dans les Forgejo Actions. Woodpecker exige une demande d'accès, et sa durée maximale n'est pas vérifiée. |
| **DNS du domaine** | Cloudflare Inc. (registraire et DNS) | États-Unis | deSEC (association, Allemagne) : DNS gratuit, DNSSEC automatique | « deSEC does not guarantee availability for its free services ». | **Cloudflare Registrar n'accepte pas d'autres serveurs de noms** (« all domains on Cloudflare Registrar use Cloudflare nameservers »). Passer chez deSEC impose de transférer le domaine chez un autre registraire, ce qui est payant : un an de renouvellement. |

**Pour** garder la chaîne actuelle :
- elle est gratuite, fiable et déjà en place ;
- elle remplit toutes les exigences : rendu serveur, données sans redéploiement, en-têtes de sécurité ;
- le code et les données ouverts restent portables : on peut partir plus tard.

**Contre** :
- les trois maillons sont des sociétés américaines ;
- les journaux techniques des visiteurs sont tenus par Vercel ;
- Vercel Hobby exige un usage « personal or non-commercial », et ses quotas sont partagés avec un autre site (menace C1) ;
- les conditions des Actions excluent une activité « unrelated to the production, testing, deployment, or publication of the software project ». La collecte publie les données du projet lui-même ; c'est notre lecture, à surveiller (`docs/juridique.md`).

**Le regard d'un journaliste** : « Un site qui compte les sites de l'État dépendants de sociétés américaines est lui-même servi par trois sociétés américaines. » La seule réponse tenable est la transparence. La page « Sovermap passé à sa propre radiographie » appliquera au site sa propre méthode. Elle dira :
- ce qui le sert et pourquoi ;
- ce qu'une alternative européenne coûterait (site statique reconstruit chaque jour, domaine transféré, CI incertaine) ;
- la date du prochain réexamen.

**Options** :
- **0.** Garder Vercel, GitHub et Cloudflare, et réexaminer avant l'ouverture (T9).
- **1.** Garder, mais passer le DNS chez deSEC lors du branchement du domaine (T8). Cela demande un transfert payant du domaine.
- **2.** Site statique européen (statichost.eu) reconstruit chaque jour par la collecte. Il faut alors renoncer à EX-14, réduire les fiches, et dépasser la bande passante gratuite dès que le trafic grandit.
- **3.** Tout européen : site statique, Codeberg avec Woodpecker, deSEC. C'est cohérent avec le propos, mais c'est le plus fragile : CI sur demande, en-têtes de sécurité incomplets.

**Recommandation : 0**, avec la page de radiographie de Sovermap dès l'ouverture, et un réexamen daté en T9. L'option 1 se décide en T8, au vu du prix du transfert ; c'est une option payante, signalée comme telle et non choisie.

### D3 — Les couches mesurées en première version

**Options :**
- **Le web seul**, avec les serveurs de noms. C'est la chaîne décrite dans `docs/methode.md`.
- **Le web et la messagerie (MX)**. Cela ajoute environ 110 000 requêtes par jour, soit environ 25 % de collecte en plus, et une table de plus pour les services de messagerie.
- **Davantage** (par exemple les certificats, ou des requêtes HTTP vers les sites). Cela sort du « DNS seulement » de la V1, et ouvre des questions de droit et de politesse.

**Recommandation : le web seul en V1, et la messagerie en V2.**
- Le cahier exclut les « messageries internes ».
- Une couche MX doit d'abord dire précisément ce qu'elle montre : la passerelle qui reçoit le courrier, pas l'endroit où il est stocké.
- Elle se prépare mieux une fois le chiffre-titre stable.

**Ce que cela change** : la journaliste qui cherche « quels ministères passent par un service de messagerie américain » attendra la V2.

### D4 — Les licences

Le titulaire s'écrit toujours « Les contributeurs de Sovermap ».

**Options :**
- **A.** Code sous licence MIT, données sous Licence Ouverte 2.0 (Etalab). C'est le plus simple et le plus réutilisable.
- **B.** Code sous EUPL 1.2, données sous Licence Ouverte 2.0.
  - L'EUPL est la licence libre de l'Union européenne. Elle existe en français, et elle est compatible avec les grandes licences libres.
  - Elle oblige à publier les modifications du code redistribué.
- **C.** Code sous AGPL 3.0, données sous ODbL 1.0. C'est le partage à l'identique le plus fort. Il freine les réutilisations.

**Recommandation : B.**
- La Licence Ouverte 2.0 est la licence de référence des données publiques françaises. Elle n'exige que la mention de la source et de la date, comme celle des principales sources de Sovermap.
- L'EUPL est cohérente avec un projet qui parle de souveraineté.
- Les obligations de chaque licence sont vérifiées dans `docs/juridique.md`.

### D5 — L'anglais

**Options :**
- **Dès l'ouverture.** Les pages principales et les fiches existent en anglais. Cela double la relecture des textes ; une traduction faite par une IA demande une relecture éditoriale (`docs/juridique.md`, article 50).
- **Ensuite** (chantier T11, après l'ouverture : décision du 19/11/2026). Les clés de traduction et le `hreflang` sont prêts dès T1.

**Recommandation : ensuite.**
- Le public d'abord visé lit le français.
- La relecture éditoriale du propriétaire est la ressource la plus rare.

**Ce que cela change** : les chercheurs étrangers attendront T11. Les fichiers de données et leur schéma peuvent avoir, dès l'ouverture, des noms de champs en anglais.

### D6 — L'identité publique

**Ce que l'inventaire a montré (point 7)** :
- le nom du compte GitHub peut révéler une identité réelle : **oui** ;
- l'identifiant de l'équipe Vercel : **oui** ;
- le profil GitHub public est vide.

**Où ces noms apparaîtraient :**
- **Dépôt public** :
  - le nom du compte en propriétaire du dépôt ;
  - dans chaque commit, l'adresse noreply `<ID>+<compte>@users.noreply.github.com`.
- **Vercel relié au dépôt** : l'identifiant de l'équipe dans les liens des contrôles et dans les commentaires du robot de Vercel.

**Options :**
- **A. Accepter.** Le dépôt est public sous le compte actuel, et Vercel est relié au dépôt.
  - C'est cohérent avec une vitrine professionnelle.
  - Rien d'autre de personnel n'est publié : ni nom réel dans les fichiers, ni e-mail, ni photo.
- **B. Dépôt privé.**
  - Les minutes d'Actions des dépôts privés sont comptées. La collecte quotidienne (environ 2 h par jour, soit environ 60 h par mois) dépasserait vite ce que l'offre gratuite inclut ; le montant exact est à vérifier sur la page de facturation.
  - Le site devrait lire les données avec une clé.
  - La promesse « code et données ouverts » tomberait.
  - **Déconseillé.**
- **C. Un compte GitHub neutre**, créé par le propriétaire lui-même avant la partie B (ce chantier ne crée aucun compte). Il porte le dépôt, et ses commits ne montrent que ce nom neutre.
  - Vercel Hobby ne relie pas les dépôts d'une organisation GitHub (« Vercel does not support connecting a project on your Hobby team to Git repositories owned by Git organizations », vercel.com/docs/limits, lu le 18/11/2026). Le compte neutre doit donc être un compte personnel, pas une organisation.
  - L'identifiant de l'équipe Vercel resterait visible si Vercel est relié au dépôt.
- **D. Ne pas relier Vercel au dépôt** (brief, B.5).
  - Les préversions passent seulement par la CLI.
  - La production attend une décision ultérieure.
  - Cela se combine avec A ou C.

**Recommandation : A.** C'est la seule option qui garde à la fois un dépôt public, une collecte gratuite, un site sans clé et aucun compte nouveau. L'exposition se limite au nom du compte et à l'identifiant de l'équipe.

**Décision du 19/11/2026 : A.** Le contrôle `scan:prive` (B.2) autorise exactement deux choses :
1. le nom du compte et son adresse noreply (`<ID>+<compte>@users.noreply.github.com`) **comme auteur et committer des commits** ;
2. l'adresse du dépôt (`github.com/<compte>/sovermap`, `raw.githubusercontent.com/<compte>/sovermap`), si le code en a besoin.

**Toute autre apparition** du prénom, du nom ou du nom d'utilisateur Windows est refusée : dans un fichier, un message de commit, une page.

**Dans le code**, le nom du compte vient d'une variable de configuration (par exemple `SOVERMAP_GITHUB_OWNER`), jamais écrite en dur. Les adresses de lecture des données se construisent à partir de cette variable.

**Modifié le 21/11/2026 (point 03 du chantier 2)** : l'agent utilisateur ne contient plus l'adresse du dépôt, donc plus le nom du compte : `Sovermap-bot/<version> (+https://sovermap.vercel.app)`, puis sovermap.com au chantier 3 ; il ne se construit jamais à partir de git. Aucun fichier du dépôt, aucun workflow et aucune donnée publiée ne contient le nom du compte, pas même dans l'adresse du dépôt : `scan:prive` le refuse partout (seuls restent permis le compte et son adresse noreply comme auteur des commits). Au chantier 3, avant l'ouverture, le dépôt passe dans une organisation GitHub gratuite « sovermap » (`tasks.md`).

**Si cette exposition est refusée : C + D.** Le propriétaire crée un compte GitHub neutre et relance `gh auth login`. Vercel n'est pas relié au dépôt. Cela demande environ 30 minutes de gestes au propriétaire, et la production attend un chantier ultérieur.

- **Les limites de temps de la collecte (22/11/2026, décision seule, après le jour 2 ; se défait)** : la première passe du jour 2 a duré 216 minutes sur un réseau lent, sa reprise a sauté, et la tâche a fini à 221 minutes de ses 240. Désormais : la tâche du jour peut durer 330 minutes (GitHub en permet 360) ; une reprise part jusqu'à 255 minutes (au lieu de 165, validé au point 04), aucune de ses tâches n'est prise après 290 (une tâche déjà prise peut finir), et les contrôles s'arrêtent à 300 (au lieu de 210). Un essai dure 60 minutes au plus, avec ses propres limites (35, 45 et 48 minutes), et n'en part aucun dans les 60 minutes avant une collecte programmée ni dans les 120 minutes après. Un témoin « mesure commencée » (le cache d'Actions) empêche toute seconde mesure le même jour (consigne du propriétaire, point 13, § 8). La cible reste de moins de 3 heures ; le découpage de B.8 suivra si elle est encore dépassée.
- **Les questions en attente vers un registre, plafonnées (22/11/2026, décision seule : plus de politesse ; se défait)** : le dernier essai de la PR n° 20 (17:11 UTC) a dépassé la tolérance du débit (22 questions en une seconde vers un serveur du « .fr », 128 secondes au-delà de 10) et son garde-fou des échecs (15,35 % des domaines ; Quad9 n'en confirme aucun), avec le même code de mesure qu'un essai tout vert une heure plus tôt. Quand les serveurs d'un registre répondent tard, le résolveur redemande chaque question en attente à leurs autres serveurs : 8 questions au plus attendent désormais leur réponse à la fois parmi celles qui passent par les serveurs d'un même registre (`PARENT_EN_VOL`). Une place est prise avant le rythme du parent et son frein, et tenue jusqu'à la réponse, serveurs de la zone fille compris : le rythme garde ses six ouvertures par seconde tant qu'elles répondent en moins de 1,3 s en moyenne, mais une zone dont les serveurs ne répondent jamais en tient une pour chaque question à son sommet, jusqu'à l'abandon du client (12 s), trois de suite avant d'être tenue pour morte : jusqu'à 36 s. Le plafond tient donc pendant la première passe ; les reprises le gardent si au moins 10 % des questions de la première passe à ces serveurs ont échoué (`PART_ECHECS_GARDE` : les serveurs d'un registre ont mal répondu ce jour-là ; un jour ordinaire, les zones mortes en font 2 à 7 %), et vont sans lui sinon, car elles sont alors faites surtout de zones mortes (deux relectures neuves du 22/11/2026 : avec lui, une reprise de quelques centaines de zones mortes durerait près d'une heure). Le journal de la tâche dit, après la première passe, combien de questions sont passées par les serveurs parents, combien ont échoué, combien ont attendu une place, et si les reprises gardent le plafond. Limite connue : la première passe n'a pas d'heure limite ; un jour où le plafond retient beaucoup, elle peut atteindre la limite de la tâche (330 minutes), qui finit alors « annulée » et ne publie rien. Et deux essais de PR se suivent à une heure d'écart au moins (règle de travail, piège 64).

## 16. Questions pour plus tard (listées seulement)

- L'identité de l'éditeur dans les mentions légales.
- La politique envers les robots d'IA.
- Le branchement de sovermap.com et son DNS.
- L'adresse de contact sur sovermap.com, pour les corrections et pour les sources qui demandent un contact.
- La demande au producteur de la liste de référence d'une copie ouverte aux robots.
- Un dépôt citable avec DOI (par exemple Zenodo).
- « Comparer deux ministères ».

## 17. Chantiers suivants, et leur preuve de fin

| Chantier | Contenu | Preuve de fin |
|---|---|---|
| **T2 — Collecte quotidienne** | Pipeline v1 : résolveur (§ 9), sources en masse, branche `donnees`, témoins, hystérésis, disjoncteur, contrôle de fraîcheur, alertes. | 14 jours de suite publiés ; collecte de moins de 3 h ; moins de 2 % d'échecs ; disjoncteur et contrôle de fraîcheur déclenchés exprès une fois chacun. |
| **T3 — Référentiels** | Tables AS → société → maison mère → pays, sourcées ligne par ligne ; liste des CDN ; relevé SecNumCloud ; opérateurs de l'État rattachés à leurs domaines (D1). Liste officielle à jour : en attendant une copie ouverte aux robots, le propriétaire peut la télécharger lui-même dans son navigateur (licence etalab-2.0), une fois par trimestre au plus ; le fichier est daté et versé dans les données. Méthode 0.3 (décision de l’ARRÊT 2, § 15) : dépendance dès que la société qui sert le site ou sa maison mère ultime est hors de l’UE, le plus éloigné des deux sièges fait la catégorie et le fil ; proxys de sécurité traités comme des CDN, d’après la documentation de chaque fournisseur (Radware, F5, OGO Security ; Claranet à trancher). | Au moins 95 % des adresses du périmètre « État » en « confirmé » ; 10 domaines contre-vérifiés à la main, au moins 95 % d'accord. |
| **T4 — L'Atlas réel et les fiches** | Accueil 3D avec les vraies données ; pays, radiographie, ministère, société, journal, recherche ; budgets (§ 11). | e2e verts ; axe sans violation ; LCP ≤ 1,8 s ; quotas Vercel mesurés sur 30 jours sous la cible. |
| **T5 — Textes et pages légales** | « Pourquoi ça compte », méthode, glossaire, mentions légales, confidentialité, accessibilité, crédits, corrections ; relecture éditoriale du propriétaire. | Chaque page relue et datée ; chaque fait sourcé ; déclaration d'accessibilité publiée. |
| **T6 — Données ouvertes** | Téléchargements CSV et JSON, schéma, licence (D4), attributions, archives mensuelles. | Fichiers valides selon le schéma ; première archive mensuelle publiée. |
| ~~T7~~ | Numéro libre : l'anglais est passé en T11 (décision D5 du 19/11/2026). Les autres chantiers gardent leur numéro. | — |
| **T8 — Le domaine** | sovermap.com branché ; www redirigé en 308 ; CAA ; DNSSEC étudié ; adresse de contact ; surveillance du domaine (reprise d'un outil générique d'un autre projet du propriétaire). | `probe:prod` vert sur sovermap.com ; aucun enregistrement DNS orphelin. |
| **T9 — Avant l'ouverture** | Audit complet du dépôt ; attaque simulée de notre propre site ; vrais iPhone et Android ; lecteur d'écran. | Rapports d'audit et d'essais, défauts corrigés. |
| **T10 — Ouverture** | `SITE_INDEXING=open` ; sitemap ; Search Console ; réutilisation déclarée sur data.gouv.fr ; décision sur les robots d'IA. | Site indexé ; 30 jours d'usage sous les cibles du § 11. |
| **T11 — L'anglais** (D5, après l'ouverture) | Traduction des clés, relecture éditoriale, `hreflang` ; tout le site, de A à Z, avec un petit bouton FR / EN ; ensuite, chaque texte ajouté ou modifié l'est dans les deux langues dans le même commit, et la CI refuse un texte sans sa traduction (décision de l'ARRÊT 2 bis, § 15). | 100 % des clés traduites et relues. |

**Organisation** (décision de l'ARRÊT 2 bis, 19/11/2026, § 15) : après T1, les chantiers T2 à T11 se font, dans cet ordre, en deux grands chantiers de plusieurs jours, avec un point toutes les deux ou trois heures ; le découpage est proposé dans le rapport final de T1. À ces points, les propositions de design se montrent en planches d'images, et en vidéo seulement quand il faut juger un mouvement (retouche de l'ARRÊT 2 ter, § 15).
