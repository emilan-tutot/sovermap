// The Référentiel de l'organisation administrative de l'État (DILA, docs/sources.md, card 4): the State's central
// services, their hierarchy and their websites. Only the fields named here are read: identifier, name, acronym, type,
// children and websites. Everything else — people, e-mail addresses, phones, postal addresses — is left untouched and
// never kept (methode § 7). The tree reads « Administration centrale » › « Gouvernement (Premier ministre et ministères) » ›
// the ministries › their services: the ministry of a service is its highest ancestor (or itself) of the type
// « Administration centrale (ou Ministère) »; independent authorities and courts have none.
import { nomValide } from "./liste";

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

export type ReferentielDila = { fichier: string; services: Map<string, ServiceDila> };

const objet = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const texte = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, 300) : null);

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

/** Reads the JSON file of the Référentiel (`{ "service": [...] }`); `fichier` is its dated name, kept for attribution. */
export function lireDila(json: string, fichierBrut: string): ReferentielDila {
  // The name comes from the archive: only its last part, and only a plain file name, is kept (it is published).
  const dernier = fichierBrut.split("/").pop() ?? "";
  const fichier = /^[A-Za-z0-9._-]{1,100}$/.test(dernier) ? dernier : "referentiel-dila.json";
  const brut: unknown = JSON.parse(json);
  if (!objet(brut) || !Array.isArray(brut.service)) throw new Error(`${fichier} : liste « service » attendue`);
  const lus = new Map<string, Omit<ServiceDila, "parent" | "ministere"> & { enfants: string[] }>();
  for (const s of brut.service) {
    if (!objet(s)) continue;
    const id = texte(s.id);
    const brut = texte(s.nom);
    // A name a spreadsheet would read as a formula (« = + - @ » first), or with a tab or a carriage return, is refused:
    // it would reach the open CSV files as it is (none does, 22/11/2026).
    const nom = brut === null || /^[=+\-@]|[\t\r]/.test(brut) ? null : brut;
    // Identifiers are short codes (UUIDs today): anything else is left out, so no record ever carries a long or odd one.
    if (id === null || nom === null || !ID_VALIDE.test(id)) continue;
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
      sigle: texte(s.sigle),
      type: texte(s.type_organisme),
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
  return { fichier, services };
}
