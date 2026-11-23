// The Référentiel de l'organisation administrative de l'État (DILA, docs/sources.md, card 4): the State's central
// services, their hierarchy and their websites. Only the fields named here are read: identifier, name, acronym, type,
// children and websites. Everything else — people, e-mail addresses, phones, postal addresses — is left untouched and
// never kept (methode § 7). The tree reads « Administration centrale » › « Gouvernement (Premier ministre et ministères) » ›
// the ministries › their services: the ministry of a service is its highest ancestor (or itself) of the type
// « Administration centrale (ou Ministère) »; independent authorities and courts have none.
import { nomValide } from "./liste";

import { type Ecarts, garderTexteLibre } from "./personnelles";

export type ServiceDila = {
  id: string;
  nom: string;
  sigle: string | null;
  type: string | null;
  parent: string | null;
  /** The identifier of its ministry (the same identifiers as the SIG's « id_ministere »), or null. */
  ministere: string | null;
  /** The host names of its websites, in ASCII (punycode), sorted. */
  hotes: string[];
};

export type ReferentielDila = {
  fichier: string;
  services: Map<string, ServiceDila>;
  /** The names made plain text for a spreadsheet (nomNeutre), counted in etat.json. */
  neutralises: number;
  /** The names and acronyms left out because they held a personal datum (P13), counted in etat.json. */
  ecarts: Ecarts;
};

const objet = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const texte = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, 300) : null);
/**
 * A free text that passes the control of personal data (P13) before it is cut to its 300 characters: a datum that the
 * cut would split (« nom@exem… ») is seen whole. The control reads 2,000 characters at most, so that no text is long
 * enough to slow it.
 */
const texteControle = (v: unknown, ecarts: Ecarts): string | null => {
  const entier = typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, 2000) : null;
  return garderTexteLibre(entier, "dila", ecarts)?.slice(0, 300).trim() ?? null;
};

export const TYPE_MINISTERE = "Administration centrale (ou Ministère)";

/** The host of a website address (« https://www.x.gouv.fr/page » → « www.x.gouv.fr »), or null. */
export function hoteDuSite(adresse: string): string | null {
  const brute = adresse.trim();
  // Another scheme (mailto:, tel:…) is not a website.
  if (brute === "" || (/^[a-z][a-z0-9+-]*:/i.test(brute) && !/^https?:\/\//i.test(brute))) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(brute) ? brute : `https://${brute}`);
    if (url.username !== "" || url.password !== "") return null;
    return nomValide(url.hostname);
  } catch {
    return null;
  }
}

const ID_VALIDE = /^[A-Za-z0-9-]{1,64}$/;

/** The signs that make a spreadsheet read a cell as a formula, and the spaces and straight quotes before them. */
const FORMULE = /^[\s"=+\-@]+/;

/**
 * A name as plain text for a spreadsheet: tabs and line breaks become spaces; the signs « = + - @ », and the spaces and
 * straight quotes before them, are removed at the start of the name and of each part after « ; » (a French spreadsheet
 * cuts a CSV line at « ; », and reads « ""=1+1 » as a formula).
 */
export function nomNeutre(nom: string): string {
  return nom
    .replace(/[\t\r\n]+/g, " ")
    .split(";")
    .map((partie, i) => (/^[\s"]*[=+\-@]/.test(partie) ? (i === 0 ? "" : " ") + partie.replace(FORMULE, "") : partie))
    .join(";")
    .trim();
}

/** Reads the JSON file of the Référentiel (`{ "service": [...] }`); `fichier` is its dated name, kept for attribution. */
export function lireDila(json: string, fichierBrut: string): ReferentielDila {
  // The name comes from the archive: only its last part, and only a plain file name, is kept (it is published).
  const dernier = fichierBrut.split("/").pop() ?? "";
  const fichier = /^[A-Za-z0-9._-]{1,100}$/.test(dernier) ? dernier : "referentiel-dila.json";
  const brut: unknown = JSON.parse(json);
  if (!objet(brut) || !Array.isArray(brut.service)) throw new Error(`${fichier} : liste « service » attendue`);
  const lus = new Map<string, Omit<ServiceDila, "parent" | "ministere"> & { enfants: string[] }>();
  let neutralises = 0;
  const ecarts: Ecarts = {};
  for (const s of brut.service) {
    if (!objet(s)) continue;
    const id = texte(s.id);
    // Identifiers are short codes (UUIDs today): anything else is left out, so no record ever carries a long or odd one
    // (and its name is neither read nor counted).
    if (id === null || !ID_VALIDE.test(id)) continue;
    // A name or an acronym that holds an e-mail address, a phone or a person's name is never kept (P13): the service
    // is then named by its acronym, or its identifier.
    const nomBrut = texteControle(s.nom, ecarts);
    const sigle = texteControle(s.sigle, ecarts);
    // A name reaches the open CSV files: one a spreadsheet would read as a formula is made plain text, and counted
    // (none, 22/11/2026).
    const nomNet = nomBrut === null ? "" : nomNeutre(nomBrut);
    if (nomBrut !== null && nomNet !== nomBrut) neutralises += 1;
    // A service keeps its place (its websites, its children) whatever its name: without one, its acronym or its
    // identifier names it.
    const nom = nomNet || nomNeutre(sigle ?? "") || id;
    const enfants = (Array.isArray(s.hierarchie) ? s.hierarchie : []).flatMap((h) =>
      objet(h) && h.type_hierarchie === "Service Fils" && texte(h.service) !== null ? [texte(h.service) as string] : [],
    );
    const hotes = (Array.isArray(s.site_internet) ? s.site_internet : []).flatMap((site) => {
      const valeur = objet(site) ? texte(site.valeur) : null;
      const hote = valeur === null ? null : hoteDuSite(valeur);
      return hote === null ? [] : [hote];
    });
    lus.set(id, {
      id,
      nom,
      sigle,
      // A category column keeps its known values only (P13): the one that marks a ministry, the only one read.
      type: texte(s.type_organisme) === TYPE_MINISTERE ? TYPE_MINISTERE : null,
      hotes: [...new Set(hotes)].sort(),
      enfants,
    });
  }
  // A child keeps its first parent in identifier order (a service rarely has two).
  const parents = new Map<string, string>();
  for (const id of [...lus.keys()].sort()) {
    for (const enfant of lus.get(id)?.enfants ?? [])
      if (lus.has(enfant) && !parents.has(enfant)) parents.set(enfant, id);
  }
  const ministereDe = (id: string): string | null => {
    let ministere: string | null = null;
    const vus = new Set<string>();
    for (
      let courant: string | undefined = id;
      courant !== undefined && !vus.has(courant);
      courant = parents.get(courant)
    ) {
      vus.add(courant);
      if (lus.get(courant)?.type === TYPE_MINISTERE) ministere = courant;
    }
    return ministere;
  };
  const services = new Map<string, ServiceDila>();
  for (const [id, s] of lus) {
    services.set(id, {
      id,
      nom: s.nom,
      sigle: s.sigle,
      type: s.type,
      parent: parents.get(id) ?? null,
      ministere: ministereDe(id),
      hotes: s.hotes,
    });
  }
  return { fichier, services, neutralises, ecarts };
}
