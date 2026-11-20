---
paths:
  - "app/**"
  - "next.config.ts"
  - "proxy.ts"
  - "components/**/*.tsx"
  - "lib/**"
---

# Next.js et React

- Lire d’abord la documentation embarquée : `node_modules/next/dist/docs/` (voir `AGENTS.md`).
- Server Components par défaut ; `'use client'` seulement sur les feuilles interactives, jamais sur une page ou un layout.
- API de requête asynchrones (`await params`, `await searchParams`). Pas de `middleware.ts` : `proxy.ts`.
- Le contenu est dans le HTML (rendu serveur ou pré-rendu) : lisible sans JavaScript (cahier §3.10).
- Les données de Sovermap sont lues **par le serveur** (branche `donnees`, `plan.md` § 4), jamais par le navigateur depuis un autre domaine. Cache long, données de la veille servies en cas d’échec.
- Fiches : rendues à la demande et mises en cache par le CDN (`Cache-Control: s-maxage`), pas en ISR (quotas, `plan.md` § 11). Pas de préchargement automatique des listes de liens (`prefetch={false}`).
- Modules serveur : `import "server-only"`. Variables `NEXT_PUBLIC_*` lues littéralement.
- Aucune saisie libre ne déclenche de requête serveur ; la recherche porte sur un index statique, dans le navigateur.
- En-têtes de sécurité : `lib/security/headers.ts` (CSP sans tiers). N’ajouter aucun domaine à la CSP, jamais `vercel.live`.
- Pièges : `next build` part à froid (ne pas rallumer `turbopackFileSystemCacheForBuild`) ; pas d’icône dans `app/` (adresse à hachage) : les icônes sont dans `public/`.
