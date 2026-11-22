// The words of the error page (app/error.tsx). It is a client component: its words are kept apart from the dictionary,
// so that the browser never loads the whole of it for two sentences.
export const erreur = {
  titre: "Données indisponibles",
  texte: "Les données du jour n’ont pas pu être lues. Réessayez dans quelques minutes.",
} as const;
