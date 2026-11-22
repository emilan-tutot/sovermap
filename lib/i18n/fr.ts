// French dictionary: the one source of every text shown or read aloud by the site, metadata included. No text is
// written in a component: `npm run lint:design` refuses it (DESIGN.md §9). English comes after the launch (decision D5,
// chantier T11) and will follow this file key for key. French typography: a non-breaking space before « : ; ! ? » and
// inside « », compound names never split (DESIGN.md §6).
const NBSP = " ";

export const fr = {
  site: {
    name: "Sovermap",
    question: `Qui héberge l’État${NBSP}?`,
    description: `Pour chaque site public français${NBSP}: chez qui il est hébergé ou diffusé, à quelle société il appartient et dans quel pays est son siège, jour après jour.`,
  },
  meta: {
    /** The title of a page, followed by the name of the site. */
    titre: (page: string) => `${page} · Sovermap`,
    accueil: `Sovermap · Qui héberge l’État${NBSP}?`,
  },
  coque: {
    evitement: "Aller au contenu",
    logo: "Sovermap, accueil",
    /** The navigation of the full site (DESIGN.md §9), behind an open door only. */
    navigation: {
      libelle: "Navigation principale",
      atlas: "Atlas",
      ministeres: "Ministères",
      societes: "Sociétés",
      journal: "Journal",
    },
    filAriane: "Fil d’Ariane",
  },
  attente: {
    title: "En préparation",
    lead: "Sovermap mesurera chaque jour l’hébergement des sites publics français, couche par couche, avec ses sources et sa méthode.",
    status: "Le site n’est pas encore ouvert. Aucune donnée n’est publiée pour l’instant.",
    /** The text alternative of the waiting page's share image (public/partage.png). */
    partage: `Sovermap · Qui héberge l’État${NBSP}? Le site est en préparation.`,
  },
  footer: {
    version: `Version servie${NBSP}:`,
    independent: "Site indépendant, sans lien avec l’État.",
  },
  notFound: {
    code: "404",
    title: "Page introuvable",
    lead: "Cette adresse ne correspond à aucune page de Sovermap.",
    back: "Retour à l’accueil",
  },
  globe: {
    titre: "Les fils de la France vers les pays des sièges",
    honnetete: "Les fils vont vers le pays du siège de la maison mère, pas vers l’emplacement d’un serveur.",
    descriptionScene: `Globe${NBSP}: des fils partent de la France vers les pays des sièges des maisons mères. La liste des pays suit.`,
    chargement: "Chargement de la carte en relief",
    recentrer: "Recentrer",
    explorer: "Explorer le globe",
    terminer: "Terminer l’exploration",
    aideTactile: `Glissez pour tourner. Touchez «${NBSP}Terminer l’exploration${NBSP}» pour reprendre le défilement.`,
    repli: `Carte fixe${NBSP}: animations réduites, économie de données ou WebGL indisponible.`,
  },
  /** Every page of the full site (plan § 6, point 2). */
  fraicheur: {
    derniereCollecte: (date: string) => `Dernière collecte${NBSP}: ${date}`,
    dateHeure: (date: string, heure: string) => `${date}, ${heure}${NBSP}UTC`,
    enRetard: "Données en retard",
    retard: (heures: string) => `Dernière collecte il y a ${heures}${NBSP}h, au-delà de 36${NBSP}h.`,
  },
  /** The Quality page (D.2, EX-16): what the day's collection measured and how it was checked. */
  qualite: {
    titre: "Qualité et fraîcheur",
    chapo: "Ce que la collecte du jour a mesuré, comment elle a été contrôlée, et l’âge de chacune de ses sources.",
    nonPublie: "non publié",
    /** The day and the end of the collection (etat.json says when it ended, not when it was published). */
    entete: (date: string, heure: string) => `Collecte du ${date}, finie à ${heure}${NBSP}UTC`,
    /** A time in UTC, never cut from its zone. */
    heureUtc: (heure: string) => `${heure}${NBSP}UTC`,
    jours: (n: number) => (n === 1 ? "1er jour publié" : `${n} jours publiés de suite`),
    sections: {
      collecte: "La collecte",
      couverture: "La couverture",
      echecs: "Les échecs",
      controles: "Les contrôles",
      gardeFous: "Les garde-fous",
      debit: "La politesse envers les serveurs",
      sources: "Les sources",
    },
    collecte: {
      debut: "Début",
      fin: "Fin",
      duree: "Durée",
      point: "Point de mesure",
      methode: "Méthode",
    },
    couverture: {
      noms: "Noms mesurés",
      surListe: (n: string) => `sur ${n} noms de la liste`,
      domaines: "Domaines",
      dontEtat: `dont périmètre «${NBSP}État${NBSP}»`,
    },
    echecs: {
      noms: "Noms en échec",
      parCode: "Par code",
      pannes: "Domaines en panne confirmée",
    },
    controles: {
      temoins: "Témoins (Quad9 et Cloudflare)",
      concordants: "concordants",
      discordants: "en désaccord",
      regle: `Règle «${NBSP}sous-zone interne${NBSP}»`,
      nomsEcartes: (n: string) => `${n} noms écartés`,
      controleRegle: (date: string, poses: string, avecAdresse: string) =>
        `${poses} noms reposés à Quad9 le ${date}${NBSP}; ${avecAdresse} avec une adresse`,
    },
    debit: {
      maximum: "Le plus de questions en une seconde vers un même serveur",
      auDela: "Secondes au-delà de 10 questions",
      surSecondes: (n: string, total: string, part: string) => `${n} sur ${total} (${part})`,
      tolerance: `Tolérance${NBSP}: jamais plus de 15, et au plus 0,1${NBSP}% des secondes au-delà de 10.`,
    },
    sources: {
      fiche: "Fiche",
      source: "Source",
      date: "Date",
      etat: "État",
    },
    /** The guards of the day's collection and their limits (proposals B and C). */
    gardeFous: {
      echecs: "Échecs non confirmés par le résolveur de contrôle",
      pannes: "Domaines en panne confirmée",
      debitPart: "Secondes au-delà de 10 questions vers un même serveur",
      debitMax: "Le plus de questions en une seconde vers un même serveur",
      fraicheur: "Âge de la dernière collecte",
      heures: (h: string) => `${h}${NBSP}h`,
      limite: (s: string) => `limite${NBSP}: ${s}`,
      tenu: "dans la limite",
      depasse: "au-delà de la limite",
      lecture: (libelle: string, valeur: string, limite: string) => `${libelle}${NBSP}: ${valeur}, ${limite}.`,
      colonnes: { controle: "Contrôle", valeur: "Valeur", limite: "Limite", resultat: "Résultat" },
    },
  },
  /** The Radiographie of a domain (D.2; spec R2, R3, R5): its layers, from the site to the country of a seat. */
  radiographie: {
    titre: (domaine: string) => `${domaine}${NBSP}: qui héberge ce site${NBSP}?`,
    description: (domaine: string) =>
      `Radiographie de ${domaine}${NBSP}: serveurs de noms, adresses, réseau, société exploitante, maison mère et pays du siège, chacun avec sa source, sa date et son niveau de confiance.`,
    surtitre: "Radiographie",
    chapo:
      "Les couches du site, de son nom au pays du siège de la société qui le sert. Chaque couche donne sa source, sa date et son niveau de confiance.",
    indisponible: "Les données de ce domaine n’ont pas pu être lues. Réessayez plus tard.",
    modes: { libelle: "Affichage", simple: "Simple", expert: "Expert" },
    collecte: (date: string) => `Collecte du ${date}`,
    couches: "Les couches",
    chaine: "La chaîne, du site au pays du siège",
    source: "Source",
    date: "Date",
    niveau: "Niveau",
    nonDetermine: "non déterminé",
    partiel: "Fiche partielle ce jour-là (listes raccourcies ou fiche réduite).",
    categories: {
      France: "France",
      "UE hors France": "UE hors France",
      "Europe hors UE": "Europe hors UE",
      "hors d'Europe": "hors d’Europe",
      "non déterminé": "non déterminé",
    },
    niveaux: { confirmé: "confirmé", probable: "probable", "non déterminé": "non déterminé" },
    /** A company and its country: « Celeste · France ». */
    societe: (nom: string, pays: string) => `${nom} · ${pays}`,
    /** An AS: « AS34177 », and its holder when the day's index publishes it. */
    as: (numero: number, titulaire: string | null) =>
      titulaire === null ? `AS${numero}` : `AS${numero} · ${titulaire}`,
    liste: (valeurs: readonly string[]) => valeurs.join(", "),
    /** A list whose items hold commas. */
    listeLongue: (valeurs: readonly string[]) => valeurs.join(`${NBSP}; `),
    site: "Le site",
    resolveurs: { quad9: "Quad9", cloudflare: "Cloudflare" },
    /** « Niveau : probable », « Preuve : AS34177 ». */
    champ: (libelle: string, valeur: string) => `${libelle}${NBSP}: ${valeur}`,
    /** « Périmètre « État » (domaine en .gouv.fr, Référentiel de la DILA) ». */
    avecRaisons: (perimetre: string, raisons: readonly string[]) =>
      raisons.length === 0 ? perimetre : `${perimetre} (${raisons.join(", ")})`,
    /** « Hébergé par Celeste · France ». */
    role: (role: string, societe: string) => `${role} ${societe}`,
    domaine: {
      titre: "Le domaine",
      nomWeb: "Nom web",
      etat: `Périmètre «${NBSP}État${NBSP}»`,
      horsEtat: `Hors du périmètre «${NBSP}État${NBSP}»`,
      raisons: {
        "gouv.fr": "domaine en .gouv.fr",
        dila: "Référentiel de la DILA",
        sig: "Observatoire du SIG",
        mesr: "MESR",
      },
      ministeres: "Ministères",
      autresNoms: (n: number) => (n === 1 ? "1 autre nom mesuré" : `${n} autres noms mesurés`),
      provenances: {
        dinum: "Liste des noms de domaine des organismes publics (DINUM)",
        dila: "Référentiel de l’organisation administrative de l’État (DILA)",
        sig: "Observatoire de l’écosystème numérique de l’État, sites internet (SIG)",
        mesr: "Principaux établissements d’enseignement supérieur (MESR)",
        domaine: "Ajouté comme nom web de son domaine",
      },
      copies: (source: string, dates: readonly string[]) =>
        dates.length === 0
          ? source
          : dates.length === 1
            ? `${source}, copie du ${dates[0]}`
            : `${source}, copies du ${dates.slice(0, -1).join(", du ")} et du ${dates.at(-1)}`,
    },
    serveurs: {
      titre: "Les serveurs de noms",
      valeur: (n: number) => (n === 1 ? "1 serveur de noms" : `${n} serveurs de noms`),
      dnssec: "DNSSEC",
      dnssecOui: "réponses validées",
      dnssecNon: "réponses non validées",
      source: "DNS, résolveur de la collecte",
    },
    adresses: {
      titre: "Les adresses",
      ok: "Le nom web répond",
      nxdomain: "Le nom web n’existe pas (NXDOMAIN)",
      nodata: "Le nom web existe, sans adresse (NODATA)",
      echec: (code: string) => `Question en échec (${code})`,
      echecConfirme: (code: string, par: string) => `Question en échec (${code}), confirmé par ${par}`,
      familleEnEchec: (famille: string) => `Adresses ${famille}${NBSP}: question en échec, inconnues`,
      cname: "Chaîne CNAME",
      plages: "Plages d’adresses",
      plage: (debut: string, fin: string) => `${debut} à ${fin}`,
      controle: (resolveur: string, accord: boolean) =>
        accord
          ? `Contrôle par ${resolveur}${NBSP}: même réponse`
          : `Contrôle par ${resolveur}${NBSP}: réponse différente`,
      source: "DNS, résolveur de la collecte, et résolveur de contrôle",
    },
    reseau: {
      titre: "Le réseau",
      aucun: "Aucun réseau",
      enregistre: (pays: string) => `enregistré${NBSP}: ${pays}`,
      source: (iptoasn: string, ris: string) =>
        `IPtoASN, relevé du ${iptoasn}${NBSP}; RIS du RIPE${NBSP}NCC, du ${ris}`,
    },
    exploitant: {
      titre: "La société exploitante",
      role: { "hébergé par": "Hébergé par", "diffusé par": "Diffusé par" },
      preuve: "Preuve",
      aucune: "Aucune société établie",
      source: (version: string) =>
        `Référentiels de Sovermap, version ${version} (sources de chaque ligne dans le registre)`,
    },
    mere: {
      titre: "La maison mère",
      sommet: (nom: string) => `${nom}, au sommet de sa chaîne`,
      nomNonPublie: "nom non publié ce jour-là",
      /** « qui possède qui »: « OVH SAS → OVH Groupe ». */
      chaine: (noms: readonly string[]) => noms.join(" → "),
    },
    pays: {
      titre: "Le pays du siège",
      /** « États-Unis · hors d’Europe »; « France » once, never « France · France ». */
      valeur: (pays: string, categorie: string) => (pays === categorie ? pays : `${pays} · ${categorie}`),
    },
    cdn: {
      titre: "Le CDN",
      aucun: "Aucun CDN reconnu",
      methode: { cname: "reconnu par son CNAME", plage: "reconnu par sa plage d’adresses", as: "reconnu par son AS" },
      source: (version: string) =>
        `Référentiel des CDN de Sovermap, version ${version}, et listes officielles des fournisseurs`,
    },
    secnumcloud: {
      titre: "Les offres SecNumCloud",
      valeur: "Pas encore reliées aux sociétés (chantier en cours)",
      source: "Catalogue des services qualifiés de l’ANSSI",
    },
    messagerie: {
      titre: "La messagerie",
      aucun: "Aucun serveur de messagerie",
      nul: "Messagerie refusée (MX nul)",
      echec: "Question en échec",
    },
    verifier: {
      titre: "Vérifier vous-même",
      chapo: "Les mêmes questions DNS, posées depuis votre ordinateur au résolveur public Quad9.",
      windows: "Windows (PowerShell)",
      macLinux: "macOS et Linux",
      /** The commands: values, never translated. */
      commandeWindows: (type: string, nom: string) => `Resolve-DnsName -Name ${nom} -Type ${type} -Server 9.9.9.9`,
      commandeDig: (type: string, nom: string) => `dig ${type} ${nom} @9.9.9.9`,
    },
  },
  /** The companies (D.2, R9): who hosts or delivers the measured sites, who owns whom. */
  societes: {
    titre: "Les sociétés",
    description: `Les sociétés qui hébergent ou diffusent les sites publics mesurés par Sovermap${NBSP}: qui possède qui, et le pays du siège de leur maison mère.`,
    chapo:
      "Les sociétés qui hébergent ou diffusent les sites mesurés, dans l’ordre alphabétique. Un organisme public y figure avec sa nature, jamais comme une société.",
    entete: (n: string) => `${n}${NBSP}sociétés et organismes`,
    domaines: (n: number, texte: string) => (n === 1 ? "1 domaine servi" : `${texte} domaines servis`),
    siege: (pays: string, categorie: string) =>
      `Siège de la maison mère${NBSP}: ${pays === categorie ? pays : `${pays} · ${categorie}`}`,
    siegeInconnu: "Maison mère non déterminée",
    controle: (texte: string) => `Contrôle${NBSP}: ${texte}`,
    surtitre: "Exploitant",
    titrePage: (nom: string) => `${nom}${NBSP}: les sites publics servis`,
    descriptionPage: (nom: string) =>
      `Les domaines des sites publics servis par ${nom}, sa chaîne de propriété et le pays du siège de sa maison mère.`,
    pays: (pays: string) => `Pays${NBSP}: ${pays}`,
    chaine: "Qui possède qui",
    sommet: "Au sommet de sa chaîne.",
    mereInconnue: `Maison mère non déterminée${NBSP}: aucune source permise ne l’établit.`,
    chaineNonPubliee: "Chaîne de propriété non publiée ce jour-là.",
    listeDomaines: "Les domaines servis",
    page: (p: number, n: number) => `Page ${p} sur ${n}`,
    precedente: "Page précédente",
    suivante: "Page suivante",
    pagination: "Pages de la liste",
    source: (version: string) => `Source${NBSP}: référentiels de Sovermap, version ${version}, et collecte du jour.`,
  },
  /** The ministries (D.2, R8): the sites the DILA's Référentiel links to each ministry, and who serves them. */
  ministeres: {
    titre: "Les ministères",
    description: `Les ministères et les services de l’État auxquels le Référentiel de la DILA rattache des sites${NBSP}: qui les héberge ou les diffuse, et le pays du siège de sa maison mère.`,
    chapo:
      "Les ministères et les services de l’État auxquels le Référentiel de l’organisation administrative de l’État (DILA) rattache des sites mesurés, dans l’ordre alphabétique.",
    entete: (n: string) => `${n}${NBSP}ministères et services`,
    domaines: (n: number, texte: string) => (n === 1 ? "1 domaine" : `${texte} domaines`),
    surtitre: "Ministère",
    titrePage: (nom: string) => `${nom}${NBSP}: qui héberge ses sites${NBSP}?`,
    descriptionPage: (nom: string) =>
      `Les sites de ${nom}${NBSP}: la société qui sert chacun d’eux et le pays du siège de sa maison mère.`,
    repartition: "Le pays du siège de la maison mère",
    repartitionNote:
      "Pour chaque domaine, la société qui sert son nom web (celle qui le diffuse quand un CDN s’interpose, sinon celle qui l’héberge).",
    groupes: "Les domaines, par société",
    sansSociete: "Société non déterminée",
    ligne: (categorie: string, n: string) => `${categorie}${NBSP}: ${n}`,
    /** The constellation (DESIGN.md §5). */
    constellation: {
      titre: "La constellation",
      legende: "Légende de la constellation",
      genres: {
        "hors-ue": "Maison mère hors de l’Union européenne",
        ue: "Maison mère en France ou dans l’Union",
        inconnu: "Société ou maison mère non déterminée",
      },
      taille: "Un disque par site ; un groupe par société, plus grand avec plus de sites.",
      libelleGroupe: (nom: string, n: number, genre: string) =>
        `${nom}${NBSP}: ${n === 1 ? "1 site" : `${n}${NBSP}sites`}, ${genre.toLowerCase()}`,
    },
    source: `Source${NBSP}: Référentiel de l’organisation administrative de l’État (DILA), et collecte du jour.`,
  },
  /** The journal (D.2, R10): the changes of hosting confirmed by two successive collections, day by day. */
  journal: {
    titre: "Le journal",
    description: `Les changements d’hébergement des sites publics confirmés par deux collectes successives, jour par jour.`,
    chapo:
      "Les changements d’hébergement confirmés par deux collectes successives, jour par jour. Un changement de liste, de référentiel ou de méthode n’y entre jamais.",
    etatInitial: `État initial${NBSP}: le premier jour publié, rien à comparer.`,
    reglesChangees: `Règles nouvelles ce jour-là${NBSP}: la veille a été reclassée, rien n’entre au journal.`,
    changements: (n: number, texte: string) =>
      n === 0 ? "Aucun changement confirmé" : n === 1 ? "1 changement confirmé" : `${texte} changements confirmés`,
    jour: (date: string) => `Le ${date}`,
    titreJour: (date: string) => `Le journal du ${date}`,
    descriptionJour: (date: string) => `Les changements d’hébergement des sites publics confirmés le ${date}.`,
    couches: { adresses: "Les adresses", serveursDeNoms: "Les serveurs de noms", messagerie: "La messagerie" },
    avantApres: (avant: string, apres: string) => `${avant} → ${apres}`,
    retour: "Tous les jours",
  },
  /** A country (D.2, R7): the companies whose ultimate parent has its seat there. */
  pays: {
    surtitre: "Pays du siège",
    titrePage: (nom: string) => `${nom}${NBSP}: les sites publics servis depuis ses sociétés`,
    descriptionPage: (nom: string) =>
      `${nom}${NBSP}: les sociétés dont la maison mère y a son siège, et les domaines des sites publics qu’elles servent.`,
    honnetete: "Le pays du siège de la maison mère, pas l’emplacement des serveurs.",
    domaines: (n: string, etat: string) =>
      `${n}${NBSP}domaines servis, dont ${etat}${NBSP}du périmètre «${NBSP}État${NBSP}»`,
    societes: "Les sociétés",
    aucune: "Aucune société dont la maison mère a son siège dans ce pays, ce jour-là.",
  },
  /** The Atlas (D.2): the question, the headline figure and its neighbours, the globe and its table. */
  atlas: {
    auMoins: (pourcent: string) => `Au moins ${pourcent}`,
    definition: (domaines: string) =>
      `des ${domaines}${NBSP}domaines du périmètre «${NBSP}État${NBSP}» sont servis par au moins une société dont la maison mère a son siège hors de l’Union européenne, établi par deux sources indépendantes à chaque étape («${NBSP}confirmé${NBSP}»).`,
    probable: (pourcent: string) => `Probable${NBSP}: ${pourcent} de plus`,
    nonDetermine: (pourcent: string) => `Non déterminé${NBSP}: ${pourcent}`,
    collecte: (date: string) => `Collecte du ${date}`,
    sousChiffres: "À côté",
    gouvFr: (pourcent: string, domaines: string) => `Domaines en .gouv.fr${NBSP}: au moins ${pourcent} de ${domaines}`,
    serveursDeNoms: (pourcent: string, domaines: string) =>
      `Serveurs de noms${NBSP}: au moins ${pourcent} de ${domaines} domaines`,
    messagerie: (pourcent: string, domaines: string) =>
      `Messagerie${NBSP}: au moins ${pourcent} de ${domaines} domaines`,
    tableau: "Les pays des sièges, en tableau",
    colonnes: {
      pays: "Pays du siège",
      domaines: `Domaines du périmètre «${NBSP}État${NBSP}»`,
      categorie: "Union européenne",
    },
    horsUE: "hors UE",
    dansUE: "dans l’UE",
    panneau: (nom: string, n: string) => `${nom}${NBSP}: ${n}${NBSP}domaines du périmètre «${NBSP}État${NBSP}»`,
    voirPays: "Voir la page du pays",
    fermer: "Fermer",
  },
  /** The search (D.2, R4). */
  recherche: {
    libelle: "Chercher un site, un ministère, une société ou un pays",
    exemple: "impots.gouv.fr, Culture, OVH, États-Unis…",
    chargement: "Chargement de l’index…",
    erreur: "La recherche n’a pas pu se charger. Réessayez plus tard.",
    nombre: (n: number) => (n === 0 ? "Aucun résultat" : n === 1 ? "1 résultat" : `${n}${NBSP}résultats`),
    categories: { d: "Domaine", s: "Exploitant", m: "Ministère ou service de l’État", p: "Pays du siège" },
    categorieEtat: `Domaine, périmètre «${NBSP}État${NBSP}»`,
  },
} as const;

export type Dictionary = typeof fr;
