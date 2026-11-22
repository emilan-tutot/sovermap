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
} as const;

export type Dictionary = typeof fr;
