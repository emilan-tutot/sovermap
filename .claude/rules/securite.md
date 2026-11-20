---
paths:
  - "lib/security/**"
  - "next.config.ts"
  - "vercel.json"
  - ".github/**"
  - "scripts/**"
  - "package.json"
---

# Sécurité et chaîne d’approvisionnement

- Surface minimale : un site statique ou mis en cache ; aucune route serveur qui exploite une saisie libre ; aucune requête vers une adresse fournie par un visiteur.
- CSP stricte sans aucun tiers, HSTS, `nosniff`, `frame-ancestors 'none'`, Referrer-Policy, Permissions-Policy fermée, COOP : `lib/security/headers.ts`, vérifiés par les tests et par `probe:prod`.
- Aucune carte de sources en production (`productionBrowserSourceMaps: false`, `npm run scan:build`). Aucun message d’erreur détaillé, aucun mode de débogage.
- Secrets : aucun n’est nécessaire. Jamais d’affichage (« présent » ou « absent »), jamais dans un fichier, une commande ou un journal. Les fichiers `.env*` ne se lisent pas (réglage du projet).
- Dépendances peu nombreuses, versions exactes, `package-lock.json` versionné ; Dependabot chaque semaine ; `npm audit --omit=dev --audit-level=high` dans la CI. npm 11 : un script d’installation n’est approuvé (`allowScripts`) qu’après lecture.
- GitHub Actions : épinglées par SHA (avec la version en commentaire), `permissions: contents: read` par défaut, `persist-credentials: false`, image `ubuntu-24.04` épinglée, aucun `apt-get`, aucun `playwright install --with-deps`.
- `main` est protégée par un ensemble de règles (PR obligatoire, ni push forcé, ni suppression) ; fusion en « squash » seulement ; signalement privé des failles (`SECURITY.md`).
- Vie privée : `npm run scan:prive` (fichiers suivis et commits non publiés) avant chaque envoi ; le crochet local `pre-push` le lance et refuse toute branche `proto/*`.
- Avant l’ouverture (T9) : audit complet par `/security-review` et un sous-agent neuf, puis une attaque simulée de notre propre site.
