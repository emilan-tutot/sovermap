# Tâches — Spec 001 Sovermap

Une case par point du brief. Une case cochée porte sa preuve. Les rapports cités en preuve sont remis au propriétaire, hors du dépôt.

## T1 — Inventaire, cadrage vérifié, socle et trois prototypes

### Partie 0 — Inventaire (lecture seule)
- [x] 0.1 Droits : session non administrateur. Preuve : `IsInRole(Administrator)` = False (rapport d'inventaire, point 1).
- [x] 0.2 Dossier du projet vide, sans `.git`. Preuve : rapport d'inventaire, point 2.
- [x] 0.3 Poste : Windows, terminal, PowerShell, Git Bash, disque, versions des outils, navigateurs. Preuve : rapport d'inventaire, point 3.
- [x] 0.4 Claude Code : version, modèle, effort, permissions, réglages. Preuve : rapport d'inventaire, point 4.
- [x] 0.5 Extensions : plugins, skills, agents, MCP, CLAUDE.md global. Preuve : rapport d'inventaire, point 5.
- [x] 0.6 Connexions en lecture seule : gh, Vercel, Edge, Cloudflare, Google ; double authentification. Preuve : rapport d'inventaire, point 6.
- [x] 0.7 GitHub et identité publique. Preuve : rapport d'inventaire, point 7.
- [x] 0.8 Fichiers génériques de l'autre projet : présence seulement. Preuve : rapport d'inventaire, point 8.
- [x] 0.9 Besoins du chantier et recommandations. Preuve : rapport d'inventaire, point 9.
- [x] ARRÊT 0 : rapport d'inventaire remis ; « reprends » reçu le 18/11/2026, avec les recommandations 1, 5, 6, 7, 8 et 9 validées.
- [x] Réglages validés appliqués après sauvegarde : `idleCompaction` à false ; trois lignes `autoMode` ; plugins Supabase coupés pour ce projet (`.claude/settings.local.json`, non versionné).
- [x] Message unique envoyé au propriétaire (18/11/2026).

### Partie A — Cadrage vérifié
- [x] A.1 Originalité. Preuve : `docs/methode.md` § 10 (13 voisins vérifiés le 18/11/2026) et `spec.md` § 2. Il n'existe aucun équivalent complet, mais deux voisins partiels ont été ajoutés au cahier : Bleu Blanc Cloud et l'eGovernment Benchmark 2026.
- [x] A.2 Registre des sources. Preuve : `docs/sources.md`, 41 fiches. Accès à la liste officielle testé : la forge est fermée aux robots (robots.txt et Anubis) ; la copie GitHub archivée est lisible (103 398 noms, 11/12/2024).
- [x] A.3 Méthode. Preuve : `docs/methode.md`, éprouvée le 18/11/2026 sur 21 noms réels, avec 5 exemples détaillés et 6 cas limites.
- [x] A.4 Cadre juridique. Preuve : `docs/juridique.md`, textes lus le 18/11/2026 dans les bases officielles (DILA, EUR-Lex, govinfo, sites du Parlement), avec 11 points non vérifiés listés.
- [x] A.5 Documents de méthode. Preuve : `.specify/memory/constitution.md`, `spec.md`, `plan.md` (§ 1 à 17), ce fichier, `pieges-connus.md`, `journal-design.md`.
- [x] A.6 Décisions D1 à D6. Preuve : `plan.md` § 15, chacune avec ses options, une recommandation et ses effets.
- [x] ARRÊT 1. Preuve : « validé » reçu le 19/11/2026, avec les choix D1 à D6 et six corrections (`plan.md` § 15).
- [x] Corrections de l'ARRÊT 1 appliquées. Preuve :
  - contrôle de tous les domaines de l'État (plan § 8 et § 9, `sources.md` fiche 13) ;
  - noms internes exclus, 90 803 noms publics (`methode.md` § 3, spec EX-01, plan § 5) ;
  - règles de `scan:prive` (plan § 15, D6) ;
  - risque de lecture (plan § 4, H8) ;
  - IPtoASN et agent utilisateur (plan § 13, `sources.md`) ;
  - DB-IP écartée et relevé manuel trimestriel (plan T3, `sources.md`).
  - Copies de `01_cadrage` remplacées.

### Partie B — Socle
- [ ] B.1 Dépôt GitHub : réglages e-mail vérifiés, `git init`, identité noreply, crochet `pre-push` (preuve : refus de `proto/t1`), premier commit README, création du dépôt, `origin/HEAD`, branche `feat/t1-socle`, réglages par l'API, fichiers README, SECURITY, licences.
- [ ] B.2 Outillage : Next.js, React, TypeScript strict, Tailwind v4, ESLint, Prettier, Vitest, Playwright (port 3100), axe ; scripts npm dont `scan:prive` ; `.gitignore`, `.gitattributes`, `.env.example` ; `CLAUDE.md`, `AGENTS.md`, `.claude/settings.json`, crochet Stop, `.claude/rules/`.
- [ ] B.3 Reprise des fichiers génériques de l'autre projet (lecture seule, puis adaptation) ; mémoire de ce projet.
- [ ] B.4 CI (`ci.yml`), Dependabot ; PR de `feat/t1-socle` ouverte en brouillon ; durée de chaque passage notée.
- [ ] B.5 Vercel : projet `sovermap` (selon D2 et D6), région `cdg1`, préversions protégées, barre d'outils coupée, rétention, fermeture à l'indexation, en-têtes ; première préversion verte.

### Partie C — Échantillon de vraies données
- [x] C.1 40 à 60 domaines choisis, avec le pourquoi de chaque choix. Preuve : 58 domaines (38 « État », 20 hors État), chacun vérifié dans une liste retenue ; tableau des raisons dans `echantillon.md`, § 1 (19/11/2026).
- [x] C.2 Outil de mesure v0 dans `pipeline/`, avec ses tests (résolveur simulé, adresses et AS de documentation, domaines en `.example`). Preuve : 16 tests Vitest sans réseau (`pipeline/pipeline.test.ts`), dont la validation des tables de `referentiels/` ; `npm run check` vert (19/11/2026).
- [x] C.3 Mesure selon `docs/methode.md` : deux sources par couche, provenance, horodatage, confiance, « diffusé par » et « hébergé par ». Preuve : mesure du 19/11/2026 par deux résolveurs, chaque couche avec sa source, son heure et son niveau ; détail dans `echantillon.md` (dossier du propriétaire, hors du dépôt).
- [x] C.4 10 domaines contre-vérifiés par un chemin indépendant ; taux d'accord et désaccords expliqués. Preuve : client DNS de Windows, Team Cymru et RIPEstat ; taux d'accord et écarts dans `echantillon.md`, § 5.
- [x] C.5 Chiffre-titre de l'échantillon (« échantillon : ne pas citer »). Preuve : calculé selon la définition provisoire de D1, dans `echantillon.md`, § 4 ; aucun résultat dans le dépôt.
- [x] C.6 Résultats hors de Git (`echantillon/`). Preuve : `git check-ignore` vrai pour `echantillon/` ; `echantillon.md` remis dans le dossier du propriétaire (19/11/2026).

### Partie D — Trois prototypes
- [x] D.1 Branche locale `proto/t1`, jamais poussée ; routes `/proto/a`, `/proto/b`, `/proto/c` ; bandeau « Prototype ». Preuve : `git branch -vv` (aucune branche suivie pour `proto/t1`), crochet `pre-push` ; données de l'échantillon dans un commit local seulement (19/11/2026).
- [x] D.2 Les écrans dans chaque direction : accueil, pays, radiographie, « Pourquoi ça compte », ministère, en-tête et pied de page. Preuve : les 2 planches de `02_propositions` (5 écrans × 3 directions, ordinateur et téléphone).
- [x] D.3 La 3D de chaque direction, avec son repli statique. Preuve : three.js 0.187, chargé après le premier affichage ; repli SVG de la même scène ; pause hors de l'écran, densité plafonnée à 2, qualité adaptative ; au téléphone, rotation après « Explorer le globe » seulement.
- [x] D.4 Contrôles : largeurs, navigateurs, axe, LCP, CLS, INP, images par seconde, poids JavaScript, console. Preuve : `journal-design.md` de `proto/t1` (63 contrôles sans défaut dans Edge, Firefox et WebKit ; budgets de vitesse tenus dans les trois directions) ; seules les mesures de la direction choisie entreront ici (E.2).
- [x] D.5 6 vidéos, 2 planches, `LISEZMOI.txt`. Preuve : `Downloads\Sovermap-T1\02_propositions` (vidéos MP4 de 44 à 46 s, filmées dans Edge avec l'accélération graphique, sans fenêtre visible).
- [x] D.6 Préversion par la CLI (jamais `--prod`), adresses notées au journal, vérifiées dans Edge. Preuve : `journal-T1.md` ; le tout premier envoi a été placé en production par Vercel (premier déploiement du projet) puis supprimé ; le préréglage « Other » du projet est corrigé par `vercel.json` (`framework: nextjs`).
- [x] ARRÊT 2 : direction A gardée en principe (19/11/2026), pour son globe rond ; second tour sur A seule avant le choix définitif.

### Second tour de l'ARRÊT 2 (A seule, consignes du 19/11/2026)
- [x] S.1 Consignes recopiées mot pour mot (dossier du propriétaire) ; notes « Pour T3 » inscrites au plan (§ 15 et T3) et dans `pieges-connus.md`. Preuve : `consignes-arret2.md` (dossier du propriétaire) ; `plan.md` § 15 « Décisions du propriétaire (ARRÊT 2) » et ligne T3 du § 17 ; `pieges-connus.md` 14 sexies et 14 septies.
- [x] S.2 B.5 terminé : accès de l'application Vercel au dépôt, lien Git, preuve. Preuve : « vercel git connect » répond « Connected » ; « vercel project inspect » montre le dépôt GitHub relié et la branche de production `main` (`journal-T1.md`, 19/11/2026). La première préversion verte par Git viendra au premier envoi de code (E.2) : un envoi de documents seuls est ignoré par `scripts/vercel-ignore.ts`.
- [x] S.3 Sauvegarde de `proto/t1` (E.1), puis effacement de tout ce qui est propre à B et C : code, styles, polices et dépendances inutiles, tests, captures, 4 vidéos, 2 planches, `LISEZMOI.txt`. `proto/t1` reste. Preuve : archive locale de `proto/t1` (dossier du propriétaire) ; commit local d'effacement sur `proto/t1` ; quatre polices désinstallées ; `journal-T1.md`.
- [x] S.4 « A corrigée » : corrections a à i (premier écran, globe sans cadre, téléphone, Radiographie en deux colonnes, ministère, mode Expert, graphique, typographie française, vidéos régulières à la densité réelle) et montée en gamme (éclairage du globe, fils et lueur, anneaux d'arrivée, transitions de vue). Preuve (branche locale `proto/t1`) : premier écran mesuré, il tient dans les 15 cas (1707 × 799, 1920 × 1080, 360 × 732 ; étiquettes sans chevauchement) ; vidéos tournées sur une horloge virtuelle et vérifiées image par image ; `journal-design.md` de `proto/t1`.
- [x] S.5 Variantes A1 « Nuit polaire », A2 « Encre et laiton », A3 « Brume », A4 « Pierre » : seules la palette et la matière du globe changent. Preuve : routes `/proto/a1` à `/proto/a4` de `proto/t1` ; contrastes WCAG 2.2 suffisants dans les cinq (texte 4,5:1, contrôles et fils 3:1).
- [x] S.6 Pour les cinq : contrôles D.4, 10 vidéos, 2 planches, `LISEZMOI.txt` ; nouvelle préversion vérifiée dans Edge ; anciennes préversions listées, comptées, supprimées une par une par leur adresse. Preuve : 105 écrans contrôlés (5 versions × 7 écrans × Edge, Firefox, WebKit, à 9 largeurs) sans défilement horizontal, sans violation axe sérieuse ni critique, sans erreur de console ni requête étrangère ; vitesse de l'accueil : LCP 600 à 628 ms, CLS 0, INP 40 à 48 ms ; 10 vidéos sans image répétée ni sautée ; préversion vérifiée dans Edge ; 4 anciennes préversions supprimées une par une, une seule reste en ligne (`journal-T1.md`).
- [ ] ARRÊT 2 bis : question en texte (A corrigée, A1, A2, A3, A4), avec une recommandation. La réponse suivante est la dernière : appliquée sans autre question, puis toute la partie E (E.1 refaite ; en E.3, les quatre directions non retenues et leurs 8 vidéos).

### Partie E — Après le choix
- [ ] E.1 Sauvegarde de `proto/t1` (archive locale, supprimée en E.8).
- [ ] E.2 Portage de la direction choisie : `DESIGN.md`, jetons, polices locales, `lint:design`, coque, composant 3D, mesures.
- [ ] E.3 Effacement complet des deux autres directions, de leurs vidéos et préversions (une par une, après comptage). Preuve : recherche sans trace.
- [ ] E.4 Liste des visuels à créer ailleurs (20 au plus).
- [ ] E.5 Recherche de la marque « Sovermap » (INPI, EUIPO), sans dépôt.
- [ ] E.6 Relectures : `/code-review` (niveau high) et `/security-review` sur `main...feat/t1-socle`.
- [ ] E.7 Fusion : PR prête, CI verte, contrôles obligatoires, squash, `probe:prod`, production vérifiée, CodeQL.
- [ ] E.8 Ménage : branches, processus, dossiers temporaires, `essais/`, `echantillon/`, sauvegarde ; fichiers du brief rangés.
- [ ] Rapport final en trois blocs.
