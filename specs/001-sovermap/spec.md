# Spec 001 — Sovermap · Qui héberge l'État ?

Statut : validée le 19/11/2026 (ARRÊT 1 du chantier T1), avec les décisions D1 à D6 du propriétaire et ses corrections (`plan.md`, § 15).
Sources : cahier des charges du 18/11/2026, constitution v1.0.0, registre `docs/sources.md`, méthode `docs/methode.md`.

## 1. Le produit en une phrase

Pour chaque site public français, Sovermap montre, jour après jour :
- chez qui le site est hébergé ou diffusé ;
- à quelle société appartient cet hébergeur, et quelle est sa maison mère ultime ;
- dans quel pays sont les sièges de ces sociétés ;
- quelle part de l'État dépend de sociétés dont la maison mère est hors de l'Union européenne (définition : décision D1 du 19/11/2026, `docs/methode.md` § 3 et § 5).

## 2. Originalité (vérifiée en A.1)

Le détail des voisins, vérifié et daté, est dans `docs/methode.md` (§ 10).

Au 18/11/2026, aucun équivalent complet n'a été trouvé, c'est-à-dire une série au moins mensuelle de l'hébergement des sites publics français, État et collectivités, jusqu'à la maison mère. Le cahier doit pourtant être nuancé, car deux voisins recouvrent une partie de l'idée :
- **Bleu Blanc Cloud** : les collectivités (1 162), avec la même logique de maison mère et de pays du siège, des campagnes hebdomadaires et une note par organisation. Sa méthode est publique depuis le 29/09/2026.
- **L'eGovernment Benchmark 2026** de la Commission européenne : la même chaîne, sur 7 332 sites européens, en un seul relevé.

Ce qui distingue Sovermap :
- l'État (ministères, services, opérateurs) en plus des collectivités, sur toute la liste officielle ;
- une collecte chaque jour, avec un journal des changements confirmés ;
- la maison mère ultime et le pays de son siège, jamais la géolocalisation ;
- des niveaux de confiance, avec la part « non déterminé » publiée ;
- aucune note ni aucun classement d'organismes, et aucune requête vers les sites en V1.

## 3. Récits utilisateurs

### P1 — indispensables à l'ouverture

**R1. Le chiffre-titre.** Une journaliste veut savoir quelle part des sites de l'État dépend de sociétés non européennes.
- Étant donné la dernière collecte réussie, quand elle ouvre l'accueil, alors elle lit :
  - la question « De quels pays dépend l'État ? » ;
  - le chiffre-titre, qui se lit « au moins X % » des domaines de l'État, avec son périmètre, sa date et sa définition (un lien) ;
  - juste à côté, la part hors UE au niveau « probable » et la part « non déterminé ».
- Étant donné que la dernière collecte a plus de 36 h, quand elle ouvre l'accueil, alors la date de la dernière collecte s'affiche bien en vue, avec la mention que les données ne sont pas à jour.

**R2. La Radiographie d'un site.** Un agent public veut comprendre comment un site de son ministère est servi.
- Étant donné un domaine de la liste, quand il ouvre sa fiche, alors il voit les couches de haut en bas : domaine, serveurs de noms, adresses, réseau, société exploitante, maison mère, pays, offres SecNumCloud, CDN. Chaque couche donne sa valeur, sa source, sa date et son niveau de confiance.
- Étant donné le mode « Simple », quand il bascule en « Expert », alors il voit les données brutes (police mono, tableaux), sans changer de page.
- Étant donné un site placé derrière un CDN, alors la fiche dit « diffusé par » (le CDN) et « hébergé par : non observable ».

**R3. Vérifier soi-même.** Un chercheur veut refaire une mesure.
- Étant donné une fiche, quand il ouvre « Vérifier vous-même », alors il obtient les commandes exactes pour Windows (`Resolve-DnsName`, `nslookup`), macOS et Linux (`dig`), et les liens vers les registres. S'il refait la mesure le même jour, depuis le même type de point de mesure, il obtient le même réseau et la même société, ou il comprend pourquoi ce n'est pas le cas (CDN, réponses géolocalisées).

**R4. Trouver.** Un élu cherche le site de sa collectivité.
- Étant donné la barre de recherche, quand il tape un domaine, un organisme, un ministère ou une société, alors la liste connue propose des résultats, et un choix mène à la bonne fiche.
- Ce qu'il tape n'est jamais envoyé à un serveur.

**R5. Citer et télécharger.** Une juriste veut citer un état daté.
- Étant donné une fiche, quand elle clique « Citer cette fiche », alors elle obtient un lien permanent vers l'état de ce jour et une référence prête à copier.
- Étant donné la page Données, alors elle télécharge l'état du jour (CSV et JSON), son schéma, sa licence et ses attributions.

**R6. Méthode et limites.** Un analyste veut savoir ce que le chiffre ne dit pas.
- Étant donné la page Méthode, alors il lit le pas à pas, les deux listes « ce que le site montre » et « ce qu'il ne montre pas », les niveaux de confiance, les garde-fous et l'historique des versions de la méthode.

### P2 — utiles à l'ouverture, ou peu après

**R7. Un pays.** Clic sur un pays de l'Atlas : un panneau s'ouvre (sur le côté à l'ordinateur, par le bas au téléphone). On y voit les sites, regroupés par société puis par ministère.

**R8. Un ministère.** La fiche d'un ministère montre sa « constellation » de sites, colorée par société, ses chiffres et leur évolution.

**R9. Une société.** La fiche d'une société montre qui possède qui, le pays du siège de la société et de sa maison mère, ses offres SecNumCloud (avec la nuance obligatoire) et les sites qu'elle sert.

**R10. Le Journal.** On y lit les changements confirmés (« déménagements »), jour par jour. Un changement n'apparaît qu'après deux collectes concordantes.

**R11. Signaler une erreur.** Une personne signale une erreur par e-mail (adresse sur sovermap.com, plus tard) ou par une issue GitHub publique. Il n'y a aucun formulaire sur le site. La correction est inscrite dans la page Corrections.

### P3 — plus tard

- **R12.** L'anglais complet, après l'ouverture (décision D5 : chantier T11).
- **R13.** « Comparer deux ministères ».
- **R14.** Les archives citables avec un DOI.
- **R15.** La messagerie (MX) comme couche affichée, en V2 (décision D3).

## 4. Exigences

### Données et méthode
- **EX-01** La collecte mesure chaque jour tous les **noms publics** de la liste de référence.
  - Les noms internes ou techniques (réseau interministériel `rie.gouv.fr`, préproduction, recette, outils internes) ne sont ni mesurés ni affichés, selon les règles versionnées de `docs/methode.md` § 3.
  - Sur la copie du 11/12/2024, il reste 90 803 noms publics sur 103 398, répartis en 34 068 domaines enregistrés.
  - Le chiffre compte chaque domaine une fois, par son nom web. Ses autres noms publics sont mesurés et affichés dans sa fiche.
- **EX-02** Pour chaque nom, elle note la chaîne CNAME, les adresses A et AAAA, les serveurs de noms de la zone, l'état DNSSEC, le résolveur utilisé et l'heure. La messagerie (MX) attend la V2 (D3).
- **EX-02 bis** Chaque jour, tous les domaines du périmètre « État » sont reposés au résolveur public de contrôle, ainsi que 3 % des autres domaines, pour permettre le niveau « confirmé » de la couche adresse.
- **EX-03** Chaque adresse est rattachée à son préfixe et à son AS d'origine par au moins deux sources indépendantes (registre `docs/sources.md`).
- **EX-04** Chaque AS est rattaché à une société exploitante, puis à sa maison mère ultime et au pays de chaque siège. Ce rattachement passe par une table tenue à la main, où chaque ligne a sa source et sa date.
- **EX-05** Un CDN est reconnu par ses CNAME ou ses AS, d'après une liste tenue à la main et sourcée. Un site derrière un CDN est « diffusé par » ce CDN, et son hébergeur d'origine est « non observable ».
- **EX-06** Aucune géolocalisation d'adresse IP n'est utilisée.
- **EX-07** Chaque couche reçoit un niveau de confiance : « confirmé », « probable » ou « non déterminé » (cahier §4.5).
  - Le chiffre-titre ne compte que le « confirmé » : il se lit « au moins X % ».
  - Il affiche à côté la part hors UE au niveau « probable » et la part « non déterminé ».
- **EX-08** Un changement n'est publié qu'après deux collectes successives concordantes (hystérésis).
- **EX-09** Si une collecte change plus de 2 % des classements (seuil provisoire, à justifier par la mesure en T2), elle ne publie rien, une alerte part, et l'état de la veille reste affiché (disjoncteur).
- **EX-10** Un panel fixe de domaines témoins est contrôlé à chaque collecte. Un écart bloque la publication.
- **EX-11** Un échec (délai dépassé, SERVFAIL) n'est jamais confondu avec « pas de site » : on fait plusieurs essais espacés, et l'échec est noté.
- **EX-12** Le débit est limité selon les conditions de chaque source.
  - L'agent utilisateur s'identifie sans adresse e-mail et sans nom de compte : `Sovermap-bot/<version> (+https://sovermap.vercel.app)`, puis sovermap.com au chantier 3 (décision du propriétaire, point 03 du chantier 2).
- **EX-13** La collecte ne garde aucune donnée personnelle.

### Publication
- **EX-14** La mise à jour des données ne redéploie pas le site, et ne demande aucune clé si possible (`plan.md`).
- **EX-15** Les données sont lues par le serveur du site, jamais par le navigateur du visiteur depuis un autre domaine.
- **EX-16** Chaque page affiche la date et l'heure de la dernière collecte. Une page d'état existe.
- **EX-17** Les données se téléchargent en CSV et en JSON, avec un schéma documenté, la licence choisie en D4 et les attributions des sources.
- **EX-18** Un instantané est gardé par jour, avec des archives mensuelles.

### Site
- **EX-19** Les pages sont rendues côté serveur ou pré-rendues : le contenu est dans le HTML.
- **EX-20** La recherche ne porte que sur un index statique de la liste connue, dans le navigateur.
- **EX-21** Aucune chaîne n'est écrite en dur dans les composants : tout passe par des clés de traduction.
- **EX-22** En-têtes de sécurité : CSP stricte sans tiers, HSTS, `nosniff`, `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy fermée, COOP. Aucune carte de sources en production.
- **EX-23** La production reste fermée à l'indexation tant que `SITE_INDEXING` ne vaut pas `open` : `robots.txt` qui interdit tout, `noindex` en en-tête et en balise, sitemap vide.
- **EX-23 bis** La porte de la production (chantier 2, A.6, 20/11/2026). La production reste fermée : seule `SITE_PUBLIC=open`, posée seulement à l'ouverture sur décision du propriétaire, l'ouvre ; porte fermée, aucune lecture de données.
  - Porte fermée, seules répondent les adresses de la page d'attente : la racine, ses fichiers et ses icônes, `robots.txt` (qui interdit tout) et le plan du site vide. Toute autre adresse répond par la page 404 : pages, requêtes internes de Next.js, index de recherche, images de partage, plans du site, routes d'API, fichiers de données.
  - Une liste blanche, à un seul endroit (`lib/porte.ts`), appliquée au routage, au build.
  - L'indexation exige la porte ouverte et `SITE_INDEXING=open`.
  - Preuve : `npm run probe:prod` (la production) et `e2e/porte.spec.ts` (le build local) interrogent la même liste d'adresses, au moins une adresse réelle par famille.
- **EX-24** WCAG 2.2 AA ; axe sans violation ; une alternative en texte à la 3D et à chaque graphique.
- **EX-25** Le site écrit, sur l'accueil, la méthode et chaque radiographie, ce qu'il montre et ce qu'il ne montre pas (cahier §2).

## 5. Critères de succès mesurables

- **CS-01** Fraîcheur : 95 % des jours d'un mois ont une collecte publiée ; aucune donnée n'a plus de 36 h sans alerte.
- **CS-02** Couverture : au moins 98 % des noms de la liste reçoivent un état (répond, ne répond pas, échec) à chaque collecte.
- **CS-03** Exactitude : sur 10 domaines contre-vérifiés à la main par un chemin indépendant à chaque chantier, au moins 95 % des couches concordent, et chaque désaccord est expliqué.
- **CS-04** Confiance : la part « non déterminé » du chiffre-titre est publiée. Objectif à l'ouverture : moins de 10 % (à confirmer par l'échantillon de la partie C).
- **CS-05** Durée : une collecte complète tient en moins de 3 h, soit la moitié de la limite d'une tâche GitHub Actions.
- **CS-06** Quotas : l'usage mensuel de Sovermap reste sous 50 % de ce que l'autre projet du propriétaire laisse de chaque quota Vercel Hobby, passage des robots compris (`plan.md`).
- **CS-07** Performance de l'accueil (Pixel 7, « Fast 4G », processeur × 4, cache froid, médiane de 5) : LCP ≤ 1,8 s ; CLS ≤ 0,02 ; INP ≤ 100 ms.
- **CS-08** Accessibilité : 0 violation axe sérieuse ou critique ; contrastes d'au moins 4,5:1 (texte) et 3:1 (contrôles).
- **CS-09** Vie privée : 0 cookie, 0 requête du navigateur vers un autre domaine (contrôle automatique en e2e).

## 6. Exclusions

Le site ne montre pas :
- où se trouvent physiquement les serveurs ;
- où sont stockées les données des usagers ;
- les systèmes internes de l'État (messageries internes, applications métier, bases de données) ;
- si un site respecte la loi ;
- l'hébergeur d'origine caché derrière un CDN (« non observable »).

Il n'y aura pas :
- de jeu ;
- de classement « de la honte », de note morale, ni de commentaire politique ;
- de compte visiteur, de formulaire, de base de données ni de Supabase ;
- de requête HTTP vers les sites mesurés en V1 (le DNS seulement), sauf décision contraire.

Hors du chantier T1 (voir `plan.md`) : la collecte quotidienne complète, l'Atlas réel, les fiches complètes, les textes définitifs, l'anglais, les pages légales finales, le branchement de sovermap.com et l'ouverture au public.
