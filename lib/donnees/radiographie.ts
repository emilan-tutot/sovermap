// The Radiographie of a domain (D.2; spec R2, R3, R5): what its page shows, assembled from the day's records (checked
// against their schemas by lib/donnees/fiches.ts), the day's indexes (checked here, at the border: they are outside
// inputs too) and two referentials of the repository (the countries' French names, the CDN's names). Pure: the page
// reads the files, this module assembles them.
import type { EnregistrementDomaine, EnregistrementNom, Hote } from "@/pipeline/publication";
import cdn from "@/referentiels/cdn.json";
import pays from "@/referentiels/pays.json";
import type { EtatPublie } from "./lecture";

export type Niveau = "confirmé" | "probable" | "non déterminé";
export type Categorie = "France" | "UE hors France" | "Europe hors UE" | "hors d'Europe" | "non déterminé";

/** A company of the day's index (index/exploitants.json). `mere` is its ultimate parent's key: itself at the top. */
export type Maillon = { cle: string; nom: string; pays: string };
export type SocieteIndex = {
  nom: string;
  pays: string;
  mere: string | null;
  paysMere: string | null;
  categorie: Categorie;
  /** The companies above it, from its direct parent up (published from 23/11/2026; none before). */
  maillons: Maillon[];
};
export type IndexSocietes = ReadonlyMap<string, SocieteIndex>;
/** What the day's index publishes of an AS (index/as.json): its holder only for the AS of the referentials' companies. */
export type IndexAs = ReadonlyMap<number, { titulaire: string | null; pays: string | null }>;
/** The ministries of the day's index (index/ministeres.json): their names, by the Référentiel's identifier. */
export type IndexMinisteres = ReadonlyMap<string, string>;

const CATEGORIES: readonly Categorie[] = [
  "France",
  "UE hors France",
  "Europe hors UE",
  "hors d'Europe",
  "non déterminé",
];
const NIVEAUX: readonly Niveau[] = ["confirmé", "probable", "non déterminé"];
const objet = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const texte = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() !== "" && v.length <= max ? v.trim() : null;
const codePays = (v: unknown): string | null => (typeof v === "string" && /^[A-Z]{2}$/.test(v) ? v : null);

/** index/exploitants.json, checked entry by entry: an entry that is not one is left out. */
export function lireIndexSocietes(valeur: unknown): IndexSocietes | null {
  const o = objet(valeur);
  if (o === null) return null;
  const index = new Map<string, SocieteIndex>();
  for (const [cle, brut] of Object.entries(o)) {
    const e = objet(brut);
    if (e === null || !/^[a-z0-9-]{1,100}$/.test(cle)) continue;
    const nom = texte(e["nom"], 200);
    const paysSociete = codePays(e["pays"]);
    const categorie = CATEGORIES.find((c) => c === e["categorie"]);
    const mere = e["mere"] === null ? null : texte(e["mere"], 100);
    if (nom === null || paysSociete === null || categorie === undefined) continue;
    const maillons = (Array.isArray(e["maillons"]) ? (e["maillons"] as unknown[]) : []).slice(0, 10).flatMap((m) => {
      const o = objet(m);
      const cleMaillon = texte(o?.["cle"], 100);
      const nomMaillon = texte(o?.["nom"], 200);
      const paysMaillon = codePays(o?.["pays"]);
      return cleMaillon === null || nomMaillon === null || paysMaillon === null
        ? []
        : [{ cle: cleMaillon, nom: nomMaillon, pays: paysMaillon }];
    });
    index.set(cle, { nom, pays: paysSociete, mere, paysMere: codePays(e["paysMere"]), categorie, maillons });
  }
  return index;
}

/** index/as.json, checked entry by entry. */
export function lireIndexAs(valeur: unknown): IndexAs | null {
  const o = objet(valeur);
  if (o === null) return null;
  const index = new Map<number, { titulaire: string | null; pays: string | null }>();
  for (const [cle, brut] of Object.entries(o)) {
    const e = objet(brut);
    if (e === null || !/^\d{1,10}$/.test(cle)) continue;
    index.set(Number(cle), { titulaire: texte(e["titulaire"], 200), pays: codePays(e["paysEnregistrement"]) });
  }
  return index;
}

/** index/ministeres.json, checked entry by entry. */
export function lireIndexMinisteres(valeur: unknown): IndexMinisteres | null {
  const o = objet(valeur);
  if (o === null) return null;
  const index = new Map<string, string>();
  for (const [cle, brut] of Object.entries(o)) {
    const nom = texte(objet(brut)?.["nom"], 200);
    if (nom !== null && /^[0-9a-f-]{36}$/.test(cle)) index.set(cle, nom);
  }
  return index;
}

const NOMS_PAYS = new Map<string, string>(pays.pays.map((p) => [p.a2, p.fr]));
/** A country's French name, from its ISO code; null for a code that is not a country's (« EU » in a registry). */
export const nomPays = (code: string | null): string | null => (code === null ? null : (NOMS_PAYS.get(code) ?? null));
const NOMS_CDN = new Map<string, string>(cdn.fournisseurs.map((f) => [f.id, f.nom]));

/** The ultimate parent: its name is null when the day's index does not publish it (before 23/11/2026). */
export type MereVue = { cle: string; nom: string | null; pays: string | null } | "sommet" | null;
export type SocieteVue = {
  cle: string;
  nom: string;
  pays: string;
  mere: MereVue;
  categorie: Categorie;
  maillons: Maillon[];
};
export type ExploitantVu = {
  role: "hébergé par" | "diffusé par";
  societe: SocieteVue | null;
  preuve: string;
  niveau: Niveau;
};
export type HoteVu = {
  hote: string;
  etat: string;
  as: number[];
  exploitants: ExploitantVu[];
  categorie: Categorie;
  niveau: Niveau;
};
export type Provenance = { source: "dinum" | "dila" | "sig" | "mesr" | "domaine"; date: string | null };

export type Radiographie = {
  domaine: string;
  nomWeb: string;
  perimetre: "État" | "hors État";
  raisons: string[];
  ministeres: string[];
  /** Other measured names of the domain, besides its web name. */
  autresNoms: number;
  /** The web name's measure; null when the day's state does not publish its record. */
  web: {
    provenances: Provenance[];
    etat: EnregistrementNom["etat"];
    echec: { code: string; confirmePar: string | null } | null;
    cname: string[];
    dnssec: boolean;
    familleEnEchec: "A" | "AAAA" | null;
    reseaux: { as: number; plage: string | null; titulaire: string | null; pays: string | null }[];
    cdn: { id: string; nom: string; methode: string } | null;
    exploitants: ExploitantVu[];
    categorie: Categorie;
    niveau: Niveau;
    controle: { resolveur: string; accord: boolean } | null;
    /** Its lists were shortened to stay within its size, or it could not be built that day (identity only). */
    partiel: boolean;
  } | null;
  serveurs: { ns: string[]; hotes: HoteVu[]; categorie: Categorie; niveau: Niveau; dnssec: boolean | null };
  messagerie: {
    etat: string;
    mx: { preference: number; hote: string }[];
    hotes: HoteVu[];
    categorie: Categorie;
    niveau: Niveau;
  };
};

/** The sources the layers cite, with their dates and versions, from etat.json (a missing or odd field gives null). */
export type SourcesRadiographie = {
  /** The day of the collection. */
  collecte: string;
  /** The dates of the official list's copies. */
  listes: string[];
  /** When IPtoASN's copy was surveyed, and the day's RIS. */
  iptoasn: string | null;
  ris: string | null;
  /** Versions of the referentials (AS → company, companies, CDN). */
  referentiels: { as: string | null; societes: string | null; cdn: string | null };
};

export function sourcesDe(etat: EtatPublie): SourcesRadiographie {
  const regles = objet(objet(etat.brut["versions"])?.["regles"]);
  const sources = Array.isArray(etat.brut["sources"]) ? (etat.brut["sources"] as unknown[]).slice(0, 50) : [];
  const dateDe = (id: string): string | null => {
    const d = texte(sources.map(objet).find((s) => s?.["id"] === id)?.["date"], 40);
    return d !== null && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10) : null;
  };
  const version = (cle: string): string | null => {
    const v = regles?.[cle];
    return typeof v === "string" && /^\d{1,3}(\.\d{1,3}){1,2}$/.test(v) ? v : null;
  };
  const listes = regles?.["listes"];
  return {
    collecte: etat.date,
    listes: (Array.isArray(listes) ? (listes as unknown[]) : [])
      .filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
      .slice(0, 10),
    iptoasn: dateDe("iptoasn"),
    ris: dateDe("ris-ipv4"),
    referentiels: { as: version("as"), societes: version("societes"), cdn: version("cdn") },
  };
}

/** A company as the page names it: its name, country and ultimate parent (« sommet »: it is the top of its chain). */
export function societeVue(cle: string | null, societes: IndexSocietes): SocieteVue | null {
  if (cle === null) return null;
  const s = societes.get(cle);
  if (s === undefined) return null;
  const sommet = s.maillons.at(-1);
  const nomMere = sommet?.cle === s.mere ? sommet.nom : (societes.get(s.mere ?? "")?.nom ?? null);
  const mere: MereVue =
    s.mere === null ? null : s.mere === cle ? "sommet" : { cle: s.mere, nom: nomMere, pays: s.paysMere };
  return { cle, nom: s.nom, pays: s.pays, mere, categorie: s.categorie, maillons: s.maillons };
}

const niveauDe = (v: string): Niveau => NIVEAUX.find((n) => n === v) ?? "non déterminé";
const categorieDe = (v: string): Categorie => CATEGORIES.find((c) => c === v) ?? "non déterminé";

function exploitantsVus(liste: EnregistrementNom["exploitants"], societes: IndexSocietes): ExploitantVu[] {
  return liste.map((e) => ({
    role: e.role === "diffusé par" ? "diffusé par" : "hébergé par",
    societe: societeVue(e.societe, societes),
    preuve: e.preuve,
    niveau: niveauDe(e.niveau),
  }));
}

function hotesVus(hotes: readonly Hote[], societes: IndexSocietes): HoteVu[] {
  return hotes.map((h) => ({
    hote: h.hote,
    etat: h.etat,
    as: h.as,
    exploitants: exploitantsVus(h.exploitants, societes),
    categorie: categorieDe(h.categorie),
    niveau: niveauDe(h.niveau),
  }));
}

/** A provenance of the list (« dinum:2024-12-11 », « dila:<file> », « sig:2026-11-01 », « domaine »), read. */
export function provenanceDe(brute: string): Provenance | null {
  const [source = "", reste = ""] = brute.split(/:(.*)/s);
  if (source === "domaine") return { source, date: null };
  if (source !== "dinum" && source !== "dila" && source !== "sig" && source !== "mesr") return null;
  const date = /(\d{4})-?(\d{2})-?(\d{2})/.exec(reste);
  return { source, date: date === null ? null : `${date[1]}-${date[2]}-${date[3]}` };
}

/** The Radiographie of a domain, from its record, its web name's record (or null) and the day's indexes. */
export function radiographieDe(
  domaine: EnregistrementDomaine,
  web: EnregistrementNom | null,
  index: { societes: IndexSocietes; as: IndexAs; ministeres: IndexMinisteres },
): Radiographie {
  return {
    domaine: domaine.domaine,
    nomWeb: domaine.nomWeb,
    perimetre: domaine.perimetre,
    raisons: domaine.raisons,
    ministeres: domaine.ministeres.map((m) => index.ministeres.get(m) ?? m),
    autresNoms: Math.max(0, domaine.noms - 1),
    web:
      web === null
        ? null
        : {
            provenances: web.provenances.flatMap((p) => provenanceDe(p) ?? []),
            etat: web.etat,
            echec: web.echec,
            cname: web.cname,
            dnssec: web.dnssec,
            familleEnEchec: web.familleEnEchec,
            reseaux: web.reseaux.map((r) => ({
              as: r.as,
              plage: r.plage,
              titulaire: index.as.get(r.as)?.titulaire ?? null,
              pays: index.as.get(r.as)?.pays ?? null,
            })),
            cdn: web.cdn === null ? null : { ...web.cdn, nom: NOMS_CDN.get(web.cdn.id) ?? web.cdn.id },
            exploitants: exploitantsVus(web.exploitants, index.societes),
            categorie: categorieDe(web.categorie),
            niveau: niveauDe(web.niveau),
            controle: web.controle,
            partiel: web.tronque === true || web.reduit === true,
          },
    serveurs: {
      ns: domaine.zone.ns,
      hotes: hotesVus(domaine.serveursDeNoms.hotes, index.societes),
      categorie: categorieDe(domaine.serveursDeNoms.categorie),
      niveau: niveauDe(domaine.serveursDeNoms.niveau),
      dnssec: domaine.zone.ds,
    },
    messagerie: {
      etat: domaine.messagerie.etat,
      mx: domaine.messagerie.mx,
      hotes: hotesVus(domaine.messagerie.hotes, index.societes),
      categorie: categorieDe(domaine.messagerie.categorie),
      niveau: niveauDe(domaine.messagerie.niveau),
    },
  };
}
