// French dictionary: the source of every text shown by the site (no hard-coded string in a component).
// English comes after the launch (decision D5, chantier T11) and will follow this file key for key.
export const fr = {
  site: {
    name: "Sovermap",
    question: "Qui héberge l’État ?",
    description:
      "Pour chaque site public français : chez qui il est hébergé ou diffusé, à quelle société il appartient et dans quel pays est son siège, jour après jour.",
  },
  attente: {
    title: "En préparation",
    lead: "Sovermap mesurera chaque jour l’hébergement des sites publics français, couche par couche, avec ses sources et sa méthode.",
    status: "Le site n’est pas encore ouvert. Aucune donnée n’est publiée pour l’instant.",
  },
  footer: {
    version: "Version servie",
    independent: "Site indépendant, sans lien avec l’État.",
  },
  notFound: {
    title: "Page introuvable",
    lead: "Cette adresse ne correspond à aucune page de Sovermap.",
    back: "Retour à l’accueil",
  },
} as const;

export type Dictionary = typeof fr;
