# Constitution de Sovermap

Version 1.0.0 — proposée le 18/11/2026, validée par le propriétaire le 19/11/2026 (ARRÊT 1 du chantier T1).

Sovermap répond à une question : de quels pays dépend l'État pour ses sites publics ? C'est un instrument de mesure public. Il doit être exact, sobre et beau. En cas de doute, on choisit la version la plus retenue, la plus vérifiable et la plus simple.

## Principes

1. **Exactitude prouvée.** Chaque valeur publiée a sa source, sa date et sa méthode. Les couches qui comptent sont croisées par au moins deux sources indépendantes. Si les sources manquent ou se contredisent, on écrit « non déterminé » et on montre le désaccord. On ne suppose jamais.
   *Contrôle :* tests du pipeline ; contre-vérification d'un échantillon à chaque chantier.

2. **Légalité et loyauté.** On n'utilise que des sources qu'on a le droit d'utiliser et de republier, inscrites au registre `docs/sources.md`. Les licences sont respectées et les attributions affichées. Le ton reste neutre et factuel : on décrit des dépendances, on ne désigne pas de coupables. Toute personne peut demander une correction, et chaque correction est journalisée en public.
   *Contrôle :* registre des sources tenu à jour ; page Corrections.

3. **Vie privée par conception.** Le site ne pose aucun cookie et n'utilise aucun traceur. Le navigateur du visiteur ne charge rien d'un autre domaine : ni script, ni police, ni service. La collecte ne garde aucune donnée personnelle, en particulier aucun contact des registres. Le dépôt public ne contient ni nom réel, ni adresse e-mail personnelle, ni chemin personnel.
   *Contrôle :* `npm run scan:prive` avant chaque envoi ; CSP sans tiers ; test des en-têtes en production.

4. **Autonomie.** Les données se mettent à jour chaque jour, sans intervention humaine et sans redéployer le site. Une panne se voit : la date de la dernière collecte est affichée, et une collecte douteuse ne publie rien de faux.
   *Contrôle :* contrôle de fraîcheur (alerte au-delà de 36 h) ; disjoncteur ; domaines témoins.

5. **Sobriété et beauté.** La charte (`DESIGN.md`, écrite après le choix de la direction) est normative. Les interdits du cahier (§8.3) s'appliquent partout.
   *Contrôle :* `npm run lint:design` ; relecture de toute PR d'interface.

6. **Accessibilité et parité mobile.** Cible : WCAG 2.2 AA. Le téléphone est aussi soigné que l'ordinateur.
   *Contrôle :* axe sans violation ; contrastes mesurés ; essais aux largeurs du brief.

7. **Performance mesurée.** Chaque chantier a des budgets chiffrés (LCP, CLS, INP, poids du JavaScript, images par seconde de la 3D), mesurés selon un protocole écrit.
   *Contrôle :* mesures notées dans `journal-design.md`.

8. **Sécurité.** La surface est minimale : un site essentiellement statique ou mis en cache. Aucune saisie libre ne déclenche de requête côté serveur. Les dépendances sont peu nombreuses, verrouillées et à jour. Les secrets ne s'affichent jamais.
   *Contrôle :* CI (audit, CodeQL, secret scanning) ; `/security-review` avant chaque fusion importante.

9. **Vérifiabilité.** Le code et les données sont ouverts. N'importe qui peut refaire la méthode à la main. La version servie est affichée.
   *Contrôle :* `docs/methode.md` et ses commandes ; numéro de version dans le pied de page.

## Gouvernance

- Cette constitution prime sur les autres documents du projet. Le cahier des charges, la spec et le plan s'y conforment.
- Tout changement passe par une PR numérotée, intitulée « Constitution vX.Y.Z », avec sa raison :
  - version majeure : un principe retiré ou changé de sens ;
  - version mineure : un principe ajouté ou précisé ;
  - correctif : une formulation, sans changement de sens.
- Le propriétaire valide toute PR qui touche à la constitution.
- `CLAUDE.md` reste sous 180 lignes et ne contredit jamais cette page.
