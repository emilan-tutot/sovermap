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
    accueil: `Qui héberge l’État${NBSP}? · Sovermap`,
  },
  coque: {
    evitement: "Aller au contenu",
    logo: "Sovermap, accueil",
    /** The navigation of the full site (DESIGN.md §9), behind an open door only. */
    navigation: {
      libelle: "Navigation principale",
      /** The compact menu's button, on a phone (DESIGN.md § 9). */
      menu: "Menu",
      atlas: "Atlas",
      ministeres: "Ministères",
      societes: "Sociétés",
      territoires: "Territoires",
      demarches: "Démarches",
      journal: "Journal",
      methode: "Méthode",
      donnees: "Données",
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
  /**
   * The share images of the full site (D.7, proposal A « la question »: public/partage/<type>.png, drawn by
   * scripts/design/partage.ts), one per kind of page: its kind, its question, one sentence; and their text alternative.
   */
  partage: {
    accueil: {
      etiquette: "Atlas",
      question: `Qui héberge l’État${NBSP}?`,
      phrase: `Chaque site public français${NBSP}: la société qui le sert, sa maison mère et le pays de leurs sièges, jour après jour.`,
    },
    radiographie: {
      etiquette: "Radiographie",
      question: `Qui héberge ce site${NBSP}?`,
      phrase: "Du nom du site au pays du siège de la société qui le sert, couche par couche, chacune avec sa source.",
    },
    ministere: {
      etiquette: "Ministère",
      question: `Qui héberge ses sites${NBSP}?`,
      phrase: `Les sites d’un ministère${NBSP}: l’exploitant de chacun, sa maison mère et le pays de leurs sièges.`,
    },
    societe: {
      etiquette: "Exploitant",
      question: `Quels sites publics sert-il${NBSP}?`,
      phrase: "Les domaines qu’il sert, sa chaîne de propriété jusqu’à la maison mère, et le pays de son siège.",
    },
    pays: {
      etiquette: "Pays du siège",
      question: `Quels sites publics dépendent de ses exploitants${NBSP}?`,
      phrase: "Le pays du siège, jamais l’emplacement des serveurs.",
    },
    alt: (etiquette: string, question: string) => `Sovermap · ${etiquette}${NBSP}: ${question}`,
  },
  /** The text pages (part E): their shared words. Each page's own words: lib/i18n/fr-textes.ts. */
  textes: {
    sources: "Les sources",
    revision: (date: string) => `Révisé le ${date}.`,
    iaNonRelu: `Ce texte a été rédigé avec l’aide d’une intelligence artificielle${NBSP}; l’éditeur ne l’a pas encore relu.`,
    iaRelu: "Textes rédigés avec l’aide d’une IA.",
    voirCredits: "Voir les Crédits.",
  },
  footer: {
    version: `Version servie${NBSP}:`,
    independent: "Site indépendant, sans lien avec l’État.",
    /** The links to the text pages, behind an open door. */
    liens: "Pages du site",
  },
  notFound: {
    code: "404",
    title: "Page introuvable",
    lead: "Cette adresse ne correspond à aucune page de Sovermap.",
    back: "Retour à l’accueil",
  },
  /** « Citer cette page » (point 13, § 10): the page's title, the date of its data and its address, as plain text. */
  citer: {
    titre: "Citer cette page",
    /** Before the address, which follows in its own element (it may wrap anywhere), then a full stop. */
    modele: (titre: string, date: string) => `Sovermap, «${NBSP}${titre}${NBSP}», données du ${date}, `,
    fin: ".",
    /** The browser's own share sheet, when it has one (point 13, § 10). */
    partager: "Partager",
  },
  globe: {
    titre: "Les fils de la France vers les pays des sièges",
    honnetete:
      "Les fils vont vers le pays du siège retenu, le plus éloigné de celui de la société et de celui de sa maison mère, pas vers l’emplacement d’un serveur.",
    descriptionScene: `Globe${NBSP}: des fils partent de la France vers les pays des sièges retenus des sociétés. La liste des pays suit.`,
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
    description: `La qualité des données du jour${NBSP}: la date de la dernière collecte, l’âge de chaque source, la couverture, les échecs et les contrôles qui l’ont validée.`,
    chapo: "Ce que la collecte du jour a mesuré, comment elle a été contrôlée, et l’âge de chacune de ses sources.",
    nonPublie: "non publié",
    /** The day and the end of the collection (the day's state says when it ended, not when it was published). */
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
      tolerance: `La tolérance juge l’essai de chaque nouvelle version de la collecte${NBSP}: jamais plus de 15, et au plus 0,1${NBSP}% des secondes au-delà de 10. Ces chiffres comptent toutes les questions du jour, celles du résolveur comprises (sa validation DNSSEC, par exemple)${NBSP}; un dépassement n’empêche pas la publication du jour${NBSP}: il est publié ici, et étudié.`,
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
      /** The pace's limits judge the trial of a new version of the collection, never the day's publication. */
      toleranceEssais: (s: string) => `tolérance des essais${NBSP}: ${s}`,
      dansTolerance: "dans la tolérance",
      auDelaTolerance: "au-delà de la tolérance, étudié",
      lecture: (libelle: string, valeur: string, limite: string) => `${libelle}${NBSP}: ${valeur}, ${limite}.`,
      colonnes: { controle: "Contrôle", valeur: "Valeur", limite: "Limite", resultat: "Résultat" },
    },
  },
  /** The Radiographie of a domain (D.2; spec R2, R3, R5): its layers, from the site to the country of a seat. */
  radiographie: {
    titre: (domaine: string) => `${domaine}${NBSP}: qui héberge ce site${NBSP}?`,
    description: (domaine: string) =>
      `Radiographie de ${domaine}${NBSP}: serveurs de noms, adresses, réseau, société, maison mère et pays du siège, chacun avec sa source et sa date.`,
    surtitre: "Radiographie",
    chapo:
      "Les couches du site, de son nom au pays du siège de la société qui le sert. Chaque couche donne sa source, sa date et son niveau de confiance.",
    /** What the page does not show (spec EX-25), under its chapô, which says what it shows. */
    limites: `Cette fiche ne montre ni où se trouvent les serveurs, ni où sont stockées les données des usagers, ni si ce site respecte la loi${NBSP}; derrière un CDN, l’hébergeur d’origine n’est pas observable (voir `,
    limitesLien: "ce que Sovermap montre, et ce qu’il ne montre pas",
    limitesFin: ").",
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
      titre: "L’exploitant",
      role: { "hébergé par": "Hébergé par", "diffusé par": "Diffusé par" },
      preuve: "Preuve",
      aucune: "Aucun exploitant établi",
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
      /** Both seats, when the company's and its ultimate parent's differ (rule C2-4: the farther one is retained). */
      deuxSieges: (paysSociete: string, paysMere: string) =>
        `Siège de la société${NBSP}: ${paysSociete}${NBSP}; de sa maison mère${NBSP}: ${paysMere}.`,
      sansMere: "Maison mère non déterminée.",
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
    titre: "Les sociétés et organismes",
    /** The breadcrumb of the list and of each operator's page (the navigation keeps « Sociétés », DESIGN.md §8). */
    miette: "Sociétés et organismes",
    description: `Les sociétés et organismes publics qui hébergent ou diffusent les sites publics mesurés par Sovermap${NBSP}: qui possède qui, et les pays de leur siège et de celui de leur maison mère.`,
    chapo:
      "Les sociétés et les organismes publics qui hébergent ou diffusent les sites mesurés, dans l’ordre alphabétique. Un organisme public n’y est jamais appelé société.",
    entete: (n: string) => `${n}${NBSP}sociétés et organismes`,
    domaines: (n: number, texte: string) => (n === 1 ? "1 domaine servi" : `${texte} domaines servis`),
    siege: (pays: string, categorie: string) =>
      `Siège retenu${NBSP}: ${pays === categorie ? pays : `${pays} · ${categorie}`}`,
    siegeExplication:
      "Le siège retenu est le plus éloigné de son propre siège et de celui de sa maison mère : c’est lui qui fait la catégorie, et le fil de l’Atlas.",
    siegeInconnu: "Maison mère non déterminée",
    /** The table's columns (point 11, Q2 A). */
    colonnes: { societe: "Société ou organisme", siege: "Siège retenu", domaines: "Domaines servis" },
    /** The seat in the table's column, whose header already names it. */
    siegeCourt: (pays: string, categorie: string) => (pays === categorie ? pays : `${pays} · ${categorie}`),
    controle: (texte: string) => `Contrôle${NBSP}: ${texte}`,
    surtitre: "Exploitant",
    titrePage: (nom: string) => `${nom}${NBSP}: les sites publics servis`,
    descriptionPage: (nom: string) =>
      `Les domaines des sites publics servis par ${nom}, sa chaîne de propriété, et les pays de son siège et de celui de sa maison mère.`,
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
  /** The démarches' page (C.8, D.2): the online démarches of the DINUM's Observatoire, the most used first. */
  demarches: {
    titre: "Les démarches en ligne",
    description: `Les démarches en ligne les plus utilisées, suivies par l’Observatoire de la DINUM${NBSP}: le nom de leur adresse, et qui le sert ce jour-là.`,
    chapo:
      "Les démarches en ligne que suit l’Observatoire de la qualité des démarches en ligne de la DINUM, les plus utilisées d’abord, d’après la volumétrie de l’édition. Pour chacune, le nom de son adresse et l’exploitant qui le sert le jour de la collecte. Sovermap ne dit rien de la qualité d’une démarche.",
    entete: (n: string, edition: string, periode: string) =>
      `${n}${NBSP}démarches, d’après l’édition ${edition} (${periode})`,
    colonnes: {
      demarche: "Démarche",
      perimetre: "Périmètre de l’Observatoire",
      volume: "Volumétrie",
      adresse: "Nom de son adresse",
      servie: "Servie par",
      siege: "Siège retenu",
    },
    sansVolume: "non donnée",
    sansAdresse: "aucune adresse utilisable dans l’édition",
    nonMesure: "nom non mesuré",
    sansSociete: "exploitant non déterminé",
    /** The state of the name of its address, when it does not answer with addresses. */
    etats: {
      nxdomain: "le nom n’existe pas",
      nodata: "le nom existe, sans adresse",
      echec: "question en échec ce jour-là",
    },
    partiel: "fiche partielle ce jour-là",
    /** Between two companies that serve one name. */
    separateur: ", ",
    /** A note after a value: « (nom non mesuré) ». */
    note: (texte: string) => `(${texte})`,
    source: (edition: string, periode: string) =>
      `Source${NBSP}: DINUM, Observatoire de la qualité des démarches en ligne, édition ${edition} (${periode}), Licence Ouverte 2.0${NBSP}; la mesure des noms, Sovermap.`,
    /** The link from the ministries' list. */
    lien: "Voir aussi les démarches en ligne les plus utilisées, et qui sert chacune.",
  },
  /** The ministries (D.2, R8): the sites the DILA's Référentiel links to each ministry, and who serves them. */
  ministeres: {
    titre: "Les ministères",
    description: `Les ministères et les services de l’État auxquels le Référentiel de la DILA rattache des sites${NBSP}: qui les héberge ou les diffuse, et le pays de son siège ou de sa maison mère.`,
    chapo:
      "Les ministères et les services de l’État auxquels le Référentiel de l’organisation administrative de l’État (DILA) rattache des sites mesurés, dans l’ordre alphabétique.",
    entete: (n: string) => `${n}${NBSP}ministères et services`,
    domaines: (n: number, texte: string) => (n === 1 ? "1 domaine" : `${texte} domaines`),
    /** The table's columns (point 11, Q2 A). */
    colonnes: { ministere: "Ministère ou service", domaines: "Domaines" },
    surtitre: "Ministère",
    titrePage: (nom: string) => `${nom}${NBSP}: qui héberge ses sites${NBSP}?`,
    descriptionPage: (nom: string) =>
      `Les sites de ${nom}${NBSP}: la société ou l’organisme qui sert chacun d’eux, et le pays de son siège ou de celui de sa maison mère.`,
    repartition: "Le pays du siège retenu",
    repartitionNote:
      "Pour chaque domaine, l’exploitant qui sert son nom web (celui qui le diffuse quand un CDN s’interpose, sinon celui qui l’héberge).",
    groupes: "Les domaines, par exploitant",
    sansSociete: "Exploitant non déterminé",
    ligne: (categorie: string, n: string) => `${categorie}${NBSP}: ${n}`,
    /** The constellation (DESIGN.md §5). */
    constellation: {
      titre: "La constellation",
      legende: "Légende de la constellation",
      genres: {
        "hors-ue": "Maison mère hors de l’Union européenne",
        ue: "Maison mère en France ou dans l’Union",
        inconnu: "Exploitant ou maison mère non déterminés",
      },
      taille: "Un disque par site ; un groupe par exploitant, plus grand avec plus de sites.",
      libelleGroupe: (nom: string, n: number, genre: string) =>
        `${nom}${NBSP}: ${n === 1 ? "1 site" : `${n}${NBSP}sites`}, ${genre.toLowerCase()}`,
    },
    source: `Source${NBSP}: Référentiel de l’organisation administrative de l’État (DILA), et collecte du jour.`,
  },
  /**
   * The territories (D.2, decision C2-2; addresses: spec EX-26): the sites of the local authorities by région,
   * département, commune and group of communes. Facts, never a ranking: lists in the order of their names.
   */
  territoires: {
    titre: "Les territoires",
    description: `Les sites des collectivités territoriales, par région, département, commune et groupement de communes${NBSP}: qui les sert, et le pays des sièges.`,
    chapo:
      "Les sites des collectivités mesurés par Sovermap, rangés par région, département, commune et groupement de communes, d’après l’annuaire de l’administration. Des faits, jamais un classement.",
    surtitres: {
      region: "Région",
      departement: "Département",
      collectivite: "Collectivité d’outre-mer",
      commune: "Commune",
      groupement: "Groupement de communes",
    },
    titrePage: (nom: string) => `${nom}${NBSP}: qui héberge les sites de ses collectivités${NBSP}?`,
    titreCommune: (nom: string) => `${nom}${NBSP}: qui héberge les sites de la commune${NBSP}?`,
    titreGroupement: (nom: string) => `${nom}${NBSP}: qui héberge ses sites${NBSP}?`,
    descriptionPage: (nom: string) =>
      `${nom}${NBSP}: les sites de ses collectivités mesurés par Sovermap, l’exploitant qui sert chacun et la catégorie du pays des sièges.`,
    carte: "Carte de France des régions et des départements, avec les départements d’outre-mer en encarts",
    carteRegion: (nom: string) => `Carte de la région ${nom} et de ses départements`,
    carteDepartement: (nom: string) => `Carte situant le département ${nom} dans sa région`,
    carteCollectivite: (nom: string) => `Carte situant la collectivité ${nom}`,
    regions: "Les régions",
    departements: "Les départements",
    outreMer: "Les collectivités d’outre-mer",
    conseilRegional: "Les sites du conseil régional",
    conseilDepartemental: "Les sites du conseil départemental",
    conseilCollectivite: "Les sites de la collectivité",
    communes: "Les communes",
    groupements: "Les groupements de communes",
    sites: "Les sites",
    colonnes: {
      region: "Région",
      departement: "Département",
      commune: "Commune",
      groupement: "Groupement de communes",
      domaine: "Domaine",
      categorie: "Siège retenu",
      domaines: "Domaines",
    },
    aucun: "Aucun site mesuré ce jour-là.",
    sansSiren: `Un groupement sans numéro SIREN dans l’annuaire n’a pas de page à lui${NBSP}: son nom n’est pas un lien.`,
    source: `Source${NBSP}: annuaire de l’administration, base de données locales (DILA), et Code officiel géographique (INSEE)${NBSP}; un rattachement «${NBSP}probable${NBSP}» (une seule source).`,
    fond: `Fond de carte${NBSP}: IGN, ADMIN EXPRESS COG CARTO PE, édition novembre 2026, Licence Ouverte 2.0${NBSP}; contours simplifiés par Sovermap.`,
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
    /** The Journal's Atom feed (point 13, § 10). */
    flux: {
      titre: "Sovermap, le journal",
      auteur: "Sovermap",
      lien: "Le journal en flux Atom",
    },
  },
  /** A country (D.2, R7): the companies whose ultimate parent has its seat there. */
  pays: {
    surtitre: "Pays du siège",
    titrePage: (nom: string) => `${nom}${NBSP}: les sites publics servis par ses exploitants`,
    descriptionPage: (nom: string) =>
      `${nom}${NBSP}: les exploitants dont le siège retenu y est (le leur ou celui de leur maison mère, le plus éloigné), et les domaines des sites publics qu’ils servent.`,
    honnetete:
      "Le pays du siège retenu (celui de l’exploitant ou de sa maison mère, le plus éloigné), pas l’emplacement des serveurs.",
    domaines: (n: string, etat: string) =>
      `${n}${NBSP}domaines servis, dont ${etat}${NBSP}du périmètre «${NBSP}État${NBSP}»`,
    societes: "Les exploitants",
    aucune: "Aucun exploitant dont le siège retenu est dans ce pays, ce jour-là.",
  },
  /** The Atlas (D.2): the question, the headline figure and its neighbours, the globe and its table. */
  atlas: {
    auMoins: (pourcent: string) => `Au moins ${pourcent}`,
    definition: (domaines: string) =>
      `des ${domaines}${NBSP}domaines du périmètre «${NBSP}État${NBSP}» sont servis par au moins une société qui a son siège, ou dont la maison mère a le sien, hors de l’Union européenne, établi par deux sources indépendantes à chaque étape («${NBSP}confirmé${NBSP}»).`,
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
    panneau: (n: string) => `${n}${NBSP}domaines du périmètre «${NBSP}État${NBSP}» servis depuis ce pays du siège`,
    voirPays: "Voir la page du pays",
    fermer: "Fermer",
    /** What the site shows and does not show (spec EX-25), in short; the whole text is the Method's first section. */
    limites: {
      titre: "Ce que Sovermap montre, et ce qu’il ne montre pas",
      montre: `Pour chaque site public de la liste, Sovermap montre qui le sert, couche par couche${NBSP}: ses serveurs de noms, ses adresses, son réseau, l’exploitant de ce réseau, sa maison mère et le pays de leurs sièges, avec la source, la date et le niveau de confiance de chaque couche.`,
      neMontrePas: `Il ne montre ni où se trouvent les serveurs, ni où sont stockées les données des usagers, ni si un site respecte la loi${NBSP}: une dépendance n’est pas une faute (voir `,
      lien: "la méthode",
      fin: ").",
    },
    /** The time slider (D.2), from two published days. */
    temps: {
      libelle: "Le chiffre, jour après jour",
      jour: (date: string, auMoins: string, probable: string, nonDetermine: string) =>
        `Le ${date}${NBSP}: au moins ${auMoins}${NBSP}; probable${NBSP}: ${probable} de plus${NBSP}; non déterminé${NBSP}: ${nonDetermine}.`,
      reglesChangees: (methode: string) =>
        `Règles nouvelles ce jour-là (méthode ${methode})${NBSP}: un écart avec la veille vient des règles, jamais d’un déménagement.`,
    },
  },
  /** The search (D.2, R4). */
  recherche: {
    libelle: "Chercher un site, un ministère, une société ou un pays",
    exemple: "impots.gouv.fr, Culture, OVH, États-Unis…",
    chargement: "Chargement de l’index…",
    erreur: "La recherche n’a pas pu se charger. Réessayez plus tard.",
    nombre: (n: number) => (n === 0 ? "Aucun résultat" : n === 1 ? "1 résultat" : `${n}${NBSP}résultats`),
    categories: { d: "Domaine", s: "Exploitant", m: "Ministère ou service de l’État", p: "Pays du siège" },
    /** An operator that is a public body: its nature, never « Exploitant » alone (D.3, correction 1). */
    natures: {
      administration: "Administration de l’État",
      gip: "Groupement d’intérêt public",
      etablissement: "Établissement public",
      securiteSociale: "Organisme de sécurité sociale",
    },
    categorieEtat: `Domaine, périmètre «${NBSP}État${NBSP}»`,
  },
} as const;

export type Dictionary = typeof fr;
