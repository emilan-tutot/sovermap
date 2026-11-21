# Sovermap · Qui héberge l’État ?

Sovermap est un instrument de mesure public. Pour chaque site public français, il montre, jour après jour :
- chez qui le site est hébergé ou diffusé ;
- à quelle société appartient cet hébergeur, et quelle est sa maison mère ;
- dans quel pays sont les sièges ;
- quelle part de l’État dépend de sociétés dont la maison mère est hors de l’Union européenne.

**État du projet** : en construction (chantier 2). Le site n’est pas ouvert : la production ne montre qu’une page d’attente, derrière une porte fermée (`SITE_PUBLIC`, [`lib/porte.ts`](lib/porte.ts)). Les données brutes de la collecte quotidienne sont publiées dans la branche `donnees`, marquées « en préparation » : à ne pas citer avant l’ouverture.

## Principes

- **Des faits, pas des jugements.** Le site décrit des dépendances, sans désigner de coupables. Il n’écrit jamais qu’un site est « conforme » ou non.
- **Des preuves.** Chaque valeur a sa source, sa date et sa méthode. Ce qui n’est pas sûr est écrit « non déterminé ».
- **Refaisable à la main.** La méthode donne les commandes (`Resolve-DnsName`, `nslookup`, `dig`) pour vérifier chaque mesure.
- **Aucune géolocalisation.** Les pays sont ceux des sièges des sociétés, pas ceux des serveurs.
- **Vie privée.** Aucun cookie, aucun traceur, aucun service tiers dans le navigateur.

## Documents

| Document | Contenu |
|---|---|
| [`docs/methode.md`](docs/methode.md) | La méthode de mesure, pas à pas, et ses limites |
| [`docs/sources.md`](docs/sources.md) | Le registre des sources, avec leurs licences et leurs conditions |
| [`docs/juridique.md`](docs/juridique.md) | Le cadre juridique (ce n’est pas un avis juridique) |
| [`.specify/memory/constitution.md`](.specify/memory/constitution.md) | Les principes du projet |
| [`specs/001-sovermap/`](specs/001-sovermap/) | La spécification, le plan et les tâches |

## La collecte quotidienne

- Chaque jour à 03:17 UTC (et à 09:47 UTC si la première n’a pas abouti), GitHub Actions mesure par le DNS tous les noms de la liste de référence ([`collecte.yml`](.github/workflows/collecte.yml), [`pipeline/`](pipeline/)), puis publie l’état du jour dans la branche `donnees` si tous les garde-fous sont verts. Sinon, rien n’est publié et une issue « Collecte bloquée » s’ouvre.
- Toutes les 6 h, [`fraicheur.yml`](.github/workflows/fraicheur.yml) ouvre une issue « Collecte en retard » si la dernière collecte a plus de 36 h ; le 1er de chaque mois, [`archives.yml`](.github/workflows/archives.yml) publie l’archive du mois écoulé.
- **Geste de secours** : GitHub coupe un workflow planifié après 60 jours sans activité du dépôt. Pour le rallumer : onglet **Actions**, choisir le workflow (« Collecte », « Fraîcheur » ou « Archives ») dans la liste de gauche, puis le bouton **Enable workflow**.
- Un essai depuis un poste de travail passe par Quad9 et porte sur 200 noms au plus : `npx tsx pipeline/cli/collecter.ts --travail <dossier> --resolveur 9.9.9.9:53 --limite 200 --essai`.

## Signaler une erreur

Ouvrez une [issue](../../issues) en décrivant le domaine, la couche en cause et la source qui vous semble juste. Les issues sont publiques : n’y mettez aucune donnée personnelle. Pour une faille de sécurité, voir [`SECURITY.md`](SECURITY.md).

## Développement

- Node.js 26 (`.nvmrc`), npm.
- `npm install`, puis `npm run dev` : le site local tourne sur le port 3100.
- `npm run check` : lint, types, tests et contrôle des informations personnelles (`scan:prive`).
- `npm run build`, `npm run e2e` : build de production et tests de bout en bout.

## Licences

- **Code** : [EUPL 1.2](LICENSE), la licence libre de l’Union européenne.
- **Données** : [Licence Ouverte 2.0 (Etalab)](LICENCE-DONNEES.md).
- Titulaire des droits : **Les contributeurs de Sovermap**.
- Les sources réutilisées gardent leur licence et leur attribution ([`docs/sources.md`](docs/sources.md)).

Sovermap est un site indépendant, sans lien avec l’État ni avec les sociétés mesurées.

---

## In English

Sovermap (“Who hosts the French State?”) is an independent, open measuring instrument. Every day it records, for each French public-sector website, which network serves it, which company operates that network, the company’s ultimate parent and the country of each headquarters, and the share of State websites that depend on companies headquartered outside the European Union. It never geolocates IP addresses, publishes its sources and method, and sets no cookie. The project is under construction: the site is not open yet and no data is published. Code: EUPL 1.2. Data: Licence Ouverte 2.0 (Etalab).
