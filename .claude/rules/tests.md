---
paths:
  - "e2e/**"
  - "tests/**"
  - "pipeline/**/*.test.ts"
  - "playwright.config.ts"
  - "vitest.config.mts"
---

# Tests

- Unitaires : Vitest (`tests/`, `pipeline/**/*.test.ts`), sans réseau. Pour la collecte : résolveur simulé, adresses et AS de documentation, domaines en `.example`.
- Bout en bout : Playwright sur un **build de production** servi sur le port **3100** (`webServer` : `npm run build && npm run start`), jamais sur un serveur de développement ni sur le port 3000.
- Navigateurs : `desktop` et `pixel-7` sur Edge (`PW_CHANNEL`, `msedge` par défaut), `firefox` sur le Firefox du poste (`moz-firefox`), `webkit` (navigateur de Playwright). En CI : `PW_CHANNEL=chrome`, le Chrome du runner, sans rien télécharger.
- Chaque page publique : statut, aucune requête vers un autre domaine, aucune erreur de console, axe sans violation sérieuse ou critique, aucun défilement horizontal.
- Un lancement de Firefox peut échouer une fois par lenteur : relancer le test seul avant de conclure.
- Un test qui contient des exemples d’adresses e-mail ou de chemins personnels les assemble à l’exécution (`scan:prive` reste vert).
- Mesures de performance (LCP, CLS, INP, images par seconde) : protocole de `journal-design.md`, médiane de 5 passages, jamais une seule mesure.
