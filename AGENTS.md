# Consignes pour les agents de code

## Next.js : lire la documentation embarquée avant de coder

Ce projet utilise Next.js 16.4. Ses API ont changé par rapport aux versions anciennes (rendu, cache, configuration, `proxy.ts` au lieu de `middleware.ts`, ESLint en configuration plate).

**Avant d’écrire ou de modifier du code Next.js**, lire la documentation fournie avec la version installée :

- `node_modules/next/dist/docs/index.md` : le sommaire ;
- `node_modules/next/dist/docs/01-app/` : l’App Router (guides et référence d’API).

Cette documentation correspond exactement à la version du dépôt. Elle prime sur les souvenirs et sur les pages trouvées en ligne. Pour les autres bibliothèques, utiliser Context7.

## Le reste

Les règles du projet sont dans `CLAUDE.md` et dans `.claude/rules/`.
