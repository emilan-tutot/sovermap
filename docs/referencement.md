# Le référencement de Sovermap

Version du 22/11/2026 (chantier 2, D.7). Ce sont les fondations : **l'indexation reste fermée** jusqu'à l'ouverture (chantier 3), sur décision du propriétaire. Tant qu'elle est fermée, `robots.txt` interdit tout, chaque page porte `noindex, nofollow` (balise et en-tête `X-Robots-Tag`) et le plan du site est vide.

Rien ici ne recommande un hébergeur : les pages décrivent des dépendances, sans jamais dire qu'un site est « conforme » ou « non conforme » (`docs/juridique.md`).

## 1. Ce qui est en place

| Point du brief (D.7) | Où | Preuve |
|---|---|---|
| Adresse canonique absolue, venue de la configuration | `metadataBase` (`lib/site.ts`, `NEXT_PUBLIC_SITE_URL`, `https://sovermap.com` au chantier 3) et `alternates.canonical` de chaque page | `e2e-site/site.spec.ts` : chaque type de page |
| Adresses en français, lisibles et stables | `specs/001-sovermap/spec.md`, EX-26 | — |
| Un titre unique (le sujet d'abord, « · Sovermap » à la fin), une description d'environ 155 caractères, dans le dictionnaire | `lib/i18n/fr.ts` ; `title.template` de `app/layout.tsx` | `e2e-site/site.spec.ts` (titre, description de 50 à 180 caractères) |
| Un seul H1 par page | chaque page | `e2e-site/site.spec.ts` |
| Fil d'Ariane visible et `BreadcrumbList` | `components/coque/FilAriane.tsx` | `tests/fil-ariane.test.ts` |
| `WebSite` sur l'accueil | `components/atlas/Atlas.tsx`, `lib/referencement.ts` | `tests/referencement.test.ts`, `e2e-site/site.spec.ts` |
| Index des plans du site et sous-plans (50 000 adresses au plus chacun) | `app/sitemap.xml/route.ts`, `app/plans/pages.xml/route.ts`, `app/plans/radiographies.xml/route.ts` | `tests/referencement.test.ts`, `e2e-site/site.spec.ts`, `e2e/porte.spec.ts` |
| Plans fermés porte fermée ou indexation fermée | `lib/referencement.ts` (`robotsDe`), `lib/porte.ts` | `tests/referencement.test.ts`, `probe:prod`, `e2e/porte.spec.ts` |
| Aucune balise `hreflang` tant que les pages anglaises n'existent pas (T11) | — | aucune dans le code |
| Liens internes (pays, sociétés, ministères, fiches) | Radiographie, pages des sociétés, des ministères et des pays, recherche | — |
| Images de partage dessinées par le code, par type de page, sans tiers | `scripts/design/partage.ts`, `public/partage/` (une image fixe par type, proposition A du point 11 ; la page d'attente garde `public/partage.png`) ; `partageDe` (`lib/referencement.ts`) | `e2e-site/site.spec.ts`, `e2e/porte.spec.ts` |

**L'adresse canonique.** Elle ne garde jamais la requête : le mode expert de la Radiographie (`?mode=expert`) est la même page que le mode simple. Seule exception : une page de la liste d'une société au-delà de la première (`/societes/<clé>?page=2`) est sa propre adresse canonique, car elle montre d'autres domaines ; une page qui n'existe pas montre la première, et l'adresse canonique le dit.

**Les plans du site.**
- `/sitemap.xml` : l'index, construit une fois au build (un fichier, aucune fonction, aucune donnée lue). Vide tant que l'indexation est fermée, comme la porte l'attend (`lib/porte.ts`).
- `/plans/pages.xml` : l'accueil, les listes, chaque ministère, chaque société, chaque pays qui sert au moins un domaine, le journal et la page Qualité.
- `/plans/radiographies.xml` : les Radiographies du périmètre « État » (environ 1 900 domaines : plan § 7), lues dans `index/domaines.json`, chacune avec le jour du dernier changement de sa page (`lastmod`) : celui où la collecte a publié un autre enregistrement pour le domaine ou pour son nom web. Le premier jour où ces dates sont publiées, un domaine inchangé prend la date de l'état de la veille (la plus tardive possible) ; ensuite, la date suit chaque changement.
- Les deux sous-plans sont rendus à la demande avec les données du jour, gardés une heure par le CDN (`s-maxage=3600`), sans écriture ISR (D.4). Ils répondent 404 tant que l'indexation est fermée ; porte fermée, la porte répond 404 avant eux.
- Les adresses sont absolues et canoniques. Ni `changefreq` ni `priority` : Google les ignore.

## 2. Les données structurées : ce que Google en fait aujourd'hui

Documentation de Google Search Central, lue le 22/11/2026 (les pages n'affichaient pas leur date de mise à jour dans la lecture automatique).

| Type | À quoi il sert aujourd'hui | Décision |
|---|---|---|
| `BreadcrumbList` | Montre la place de la page dans le site, dans les résultats sur ordinateur | Gardé, sur chaque page sauf l'accueil |
| `WebSite` | Donne le nom du site dans les résultats (ordinateur et mobile) ; seulement sur la page d'accueil ; `name` et `url` exigés | Ajouté sur l'accueil, avec `name` et `url`. Sans `alternateName` : la question « Qui héberge l'État ? » n'est pas un autre nom du site |
| Champ de recherche des liens annexes (`SearchAction`) | Retiré des résultats de Google le 21/11/2024 ; le balisage n'est plus utilisé | Pas ajouté |
| `Organization` | Aide Google à reconnaître l'organisation, son logo dans les résultats et son panneau de connaissances | **Pas ajouté** : il présenterait Sovermap comme une organisation. Décision du propriétaire (point 11, Q4, réponse du point 13) : pas de balise `Organization` tant qu'aucune structure juridique n'existe ; un test le vérifie (`tests/referencement.test.ts`) |
| `Dataset` | Rend un jeu de données visible dans Google Dataset Search ; `name` et `description` (50 à 5 000 caractères) exigés ; `license`, `creator`, `distribution` recommandés | Ajouté sur la page Données (`app/donnees/page.tsx`, `jsonLdDataset` de `lib/referencement.ts`) ; test : `tests/donnees-ouvertes.test.ts` |

## 3. La politique d'indexation

Proposée au point 11 du chantier 2, appliquée en attendant la réponse du propriétaire (elle se défait). Elle n'agit qu'après l'ouverture : avant, tout est fermé.

| Page | Règle | Pourquoi |
|---|---|---|
| Accueil (Atlas) | `index, follow` | Le chiffre, sa définition, les pays |
| Ministères : la liste et chaque ministère | `index, follow` | Répond à « Ministère des Armées : qui héberge ses sites ? », avec ces mots dans le titre |
| Sociétés : la liste et chaque société | `index, follow` | Répond à « quels sites publics sert telle société » |
| Démarches : la liste (C.8) | `index, follow` | Répond à « qui héberge le site de telle démarche en ligne », une seule page, avec le nom de chaque démarche |
| Pays qui servent au moins un domaine | `index, follow` | Répond à « quels sites publics dépendent d'une société des États-Unis » |
| Pays sans aucun domaine | `noindex, follow` | Une page vide n'apporte rien à qui cherche |
| Radiographies du périmètre « État » | `index, follow` | La fiche d'un site de l'État, sourcée couche par couche (environ 1 900) |
| Radiographies hors du périmètre « État » | `noindex, follow` | Plus de 30 000 fiches faites sur un même modèle (plan § 7) ressembleraient à du contenu de masse ou à des pages-portes (voir le § 5) ; elles restent lisibles par tous, et leurs liens sont suivis |
| Journal : la liste | `index, follow` | Ce qui change, et comment c'est confirmé |
| Journal : chaque jour | `noindex, follow` | Une page par jour, toutes du même modèle ; ce qui compte est dans les Radiographies qu'elles citent |
| Qualité | `index, follow` | La fraîcheur et les contrôles du jour |
| Régions et départements (C.6) | `index, follow` | Quand ces pages existeront |
| Communes et groupements (C.6) | `noindex, follow` | Des milliers de pages sur un même modèle, sauf proposition chiffrée à un point |

**Mise en œuvre.** `robotsDe(indexable)` (`lib/referencement.ts`) donne la règle de chaque page ; une page en `noindex` n'entre dans aucun plan du site. Après l'ouverture, `robots.txt` ne doit bloquer aucune de ces pages : une page bloquée par `robots.txt` n'est jamais lue, et son `noindex` non plus (documentation de Google, « Block Search indexing with noindex »).

## 4. Les recherches visées, et la page qui y répond

Les recherches viennent du brief et du propriétaire, jamais d'un outil de Google (aucune extraction automatique de ses suggestions ni de ses tendances). Le brief parle de « quatre recherches du propriétaire » : elles ne sont écrites dans aucun fichier du chantier ; les quatre premières lignes ci-dessous sont l'option recommandée au point 11, en attendant sa réponse.

| Recherche | Page qui répond | Pourquoi |
|---|---|---|
| qui héberge les sites de l'État | L'accueil (`/`) | Sa question est le titre ; le chiffre, sa définition et les pays des sièges suivent |
| Ministère des Armées : qui héberge ses sites ? (et chaque ministère) | `/ministeres/<nom>` | Le titre est cette question ; la page donne chaque site, la société qui le sert et le pays du siège de sa maison mère |
| qui héberge impots.gouv.fr (et chaque site de l'État) | `/radiographie/<domaine>` | Le titre est « <domaine> : qui héberge ce site ? » ; chaque couche a sa source et sa date |
| sites publics hébergés par des sociétés américaines, CLOUD Act | `/pays/etats-unis`, puis « Pourquoi ça compte » (E) | La page dit le pays du siège, jamais l'emplacement des serveurs ; « Pourquoi ça compte » explique le CLOUD Act, une source par phrase |
| souveraineté numérique de l'État, SecNumCloud | « Pourquoi ça compte » et Méthode (E) | Les textes, cités et datés ; la couche SecNumCloud des Radiographies |
| quels sites publics sert telle société (OVH, Cloudflare…) | `/societes/<clé>` | Les domaines servis, la chaîne de propriété et le pays du siège |

## 5. Les règles anti-spam de Google, relues le 22/11/2026

- **Contenu de masse** (« scaled content abuse ») : beaucoup de pages faites d'abord pour se classer, sans valeur pour le lecteur, quelle que soit la façon de les produire (par exemple, des pages générées en série sans rien ajouter, ou des contenus recopiés et assemblés).
- **Pages-portes** (« doorway abuse ») : des pages faites pour se classer sur des recherches voisines, qui mènent vers une page moins utile que la destination (par exemple, une page par ville qui renvoie toutes vers la même).
- Des pages faites sur un même modèle ne sont pas interdites en soi : chacune doit apporter quelque chose. D'où la politique du § 3 : seules sont proposées aux moteurs les pages qui répondent à une question réelle (un ministère, une société, un pays, un site de l'État) ; les fiches en série restent lisibles par tous, mais en `noindex, follow`.
- Jamais de texte caché, de mots-clés empilés, de pages-portes ni de liens achetés.

## 6. Ce qui reste

**Avant l'ouverture (chantier 2) :**
- la préversion, porte ouverte : les plans du site, les images de partage, le cache du CDN et les données `Dataset` de la page Données, vérifiés dans Edge.

**Au chantier 3 (l'ouverture) :**
- `NEXT_PUBLIC_SITE_URL=https://sovermap.com`, puis `SITE_INDEXING=open`, sur décision du propriétaire ;
- Google Search Console (propriété de domaine, envoi de `/sitemap.xml`) et Bing Webmaster Tools ;
- la déclaration de la réutilisation sur data.gouv.fr ;
- des liens d'autres sites (presse, associations, communs numériques), jamais achetés ;
- relire les règles anti-spam de Google, et cette page.
