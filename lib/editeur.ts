// Who publishes Sovermap (brief E.4; the owner's answer to point 11, Q6, 22/11/2026): option A by default, staying
// anonymous with a contact address of the site; options B (the publisher's whole identity) and C (the name only) stay
// in the code until a lawyer checks them in chantier 3. Nothing real is ever in the repository: the values are
// Production variables of Vercel, of the « Sensitive » kind, that the owner creates himself (chantier 3). Pure: the page
// passes its environment.

export type Editeur =
  | { mode: "anonyme"; contact: string | null }
  | { mode: "identite"; nom: string; prenoms: string; domicile: string; telephone: string; contact: string | null }
  | { mode: "nom"; nom: string; contact: string | null };

/** The host the law asks to name (LCEN, article 1-1), as Vercel's own pages give it (read on 22/11/2026). */
export const HEBERGEUR = {
  nom: "Vercel Inc.",
  adresse: "440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis",
} as const;

/** One value of the environment: plain text of one line, 200 characters at most; null when absent or empty. */
function texte(env: Readonly<Record<string, string | undefined>>, nom: string): string | null {
  const brut = env[nom]?.trim() ?? "";
  if (brut === "") return null;
  if (brut.length > 200 || /\p{Cc}/u.test(brut)) throw new Error(`${nom} : une ligne de texte, 200 caractères au plus`);
  return brut;
}

/** A value an option needs: absent, the build stops rather than publish incomplete legal notices. */
function requis(env: Readonly<Record<string, string | undefined>>, nom: string, mode: string): string {
  const valeur = texte(env, nom);
  if (valeur === null) throw new Error(`EDITEUR_MODE=${mode} demande ${nom}`);
  return valeur;
}

/** The publisher from the Production variables (EDITEUR_MODE: « anonyme » by default, « identite » or « nom »). */
export function editeurDe(env: Readonly<Record<string, string | undefined>>): Editeur {
  const mode = texte(env, "EDITEUR_MODE") ?? "anonyme";
  const contact = texte(env, "CONTACT_EDITION");
  switch (mode) {
    case "anonyme":
      return { mode, contact };
    case "identite":
      return {
        mode,
        nom: requis(env, "EDITEUR_NOM", mode),
        prenoms: requis(env, "EDITEUR_PRENOMS", mode),
        domicile: requis(env, "EDITEUR_DOMICILE", mode),
        telephone: requis(env, "EDITEUR_TELEPHONE", mode),
        contact,
      };
    case "nom":
      return { mode, nom: requis(env, "EDITEUR_NOM", mode), contact };
    default:
      throw new Error(`EDITEUR_MODE : « anonyme », « identite » ou « nom » (reçu « ${mode} »)`);
  }
}
