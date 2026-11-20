// French dictionary: the one source of every text shown or read aloud by the site, metadata included. No text is
// written in a component: `npm run lint:design` refuses it (DESIGN.md §9). English comes after the launch (decision D5,
// chantier T11) and will follow this file key for key. French typography: a non-breaking space before « : ; ! ? » and
// inside « », compound names never split (DESIGN.md §6).
const NBSP = " ";

export const fr = {
  site: {
    name: "Sovermap",
    question: `Qui héberge l’État${NBSP}?`,
    description:
      `Pour chaque site public français${NBSP}: chez qui il est hébergé ou diffusé, à quelle société il appartient et dans quel pays est son siège, jour après jour.`,
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
    descriptionScene:
      `Globe${NBSP}: des fils partent de la France vers les pays des sièges des maisons mères. La liste des pays suit.`,
    chargement: "Chargement de la carte en relief",
    recentrer: "Recentrer",
    explorer: "Explorer le globe",
    terminer: "Terminer l’exploration",
    aideTactile: `Glissez pour tourner. Touchez «${NBSP}Terminer l’exploration${NBSP}» pour reprendre le défilement.`,
    repli: `Carte fixe${NBSP}: animations réduites, économie de données ou WebGL indisponible.`,
  },
} as const;

export type Dictionary = typeof fr;
