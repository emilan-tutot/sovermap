// The day's state as published in the « donnees » branch (brief B.6, B.7 and B.7 bis, plan § 10). Records hold only
// stable values (no time, no TTL, no exact address: the AS and its IPtoASN range), sorted; the details of an AS or a
// company live once in an index. Records go into fragments of 8 KB at most — the bucket is the first four hex digits
// of the SHA-256 of the name, so a record never moves — in folders of 256 entries at most. A record changes only when
// two collections in a row agree on its new content (hysteresis); a change of hosting then enters the journal, never a
// change of rules or of the list; on the first day the initial state is published, without changes.
import { createHash } from "node:crypto";
import type { CoucheAdresses, CoucheHotes, CoucheSpf } from "./couches";
import type { Categorie, Niveau } from "./types";

export const VERSION_SCHEMA = 1;
export const TAILLE_MAX_FRAGMENT = 8 * 1024;
export const SEUIL_DISJONCTEUR = 0.02;
export const SEUIL_ECHECS = 0.02;

export type Exploitant = { role: string; societe: string | null; preuve: string; niveau: Niveau };

/** A failure after every attempt: its DNS code, and the resolver that confirmed it (« quad9 »), if any. */
export type Echec = { code: string; confirmePar: string | null };

export type EnregistrementNom = {
  nom: string;
  domaine: string;
  provenances: string[];
  types: string[];
  etat: CoucheAdresses["etat"];
  echec: Echec | null;
  cname: string[];
  dnssec: boolean;
  /** The family of addresses whose question failed while the other answered: its addresses are unknown, never « none ». */
  familleEnEchec: "A" | "AAAA" | null;
  reseaux: { as: number; plage: string | null }[];
  cdn: { id: string; methode: string } | null;
  exploitants: Exploitant[];
  categorie: Categorie;
  horsUE: boolean | null;
  niveau: Niveau;
  controle: { resolveur: string; accord: boolean } | null;
  /** The record was shortened to stay within its size (borner.ts): its lists are partial. */
  tronque?: true;
  /**
   * The record could not be built today (an error, or a value its schema refuses): only its identity is given. Never
   * compared (circuit breaker, journal), and never published in place of an earlier record (etat-du-jour.ts).
   */
  reduit?: true;
};

export type Hote = {
  hote: string;
  etat: CoucheAdresses["etat"];
  as: number[];
  exploitants: Exploitant[];
  categorie: Categorie;
  horsUE: boolean | null;
  niveau: Niveau;
};

export type EnregistrementDomaine = {
  domaine: string;
  nomWeb: string;
  perimetre: "État" | "hors État";
  raisons: string[];
  plateforme: boolean;
  /** How many bodies of the DILA's Référentiel name it as a website (the list itself: index/organismes.json). */
  organismes: number;
  ministeres: string[];
  noms: number;
  zone: {
    etat: string;
    echec: Echec | null;
    ns: string[];
    soa: string | null;
    /**
     * DNSSEC: the zone's answers are validated by the resolver (the AD flag), which needs its DS at its parent and a
     * sound chain; null: unknown (the zone's question failed).
     */
    ds: boolean | null;
    /** null: the CAA question failed. */
    caa: { propriete: string; valeur: string }[] | null;
  };
  serveursDeNoms: { hotes: Hote[]; categorie: Categorie; horsUE: boolean | null; niveau: Niveau };
  messagerie: {
    etat: string;
    mx: { preference: number; hote: string }[];
    hotes: Hote[];
    categorie: Categorie;
    horsUE: boolean | null;
    niveau: Niveau;
    spf: CoucheSpf | null;
  };
  /** The record was shortened to stay within its size (borner.ts): its lists are partial. */
  tronque?: true;
  /**
   * The record could not be built today (an error, or a value its schema refuses): only its identity is given. Never
   * compared (circuit breaker, journal), and never published in place of an earlier record (etat-du-jour.ts).
   */
  reduit?: true;
};

export type Etat = { noms: Map<string, EnregistrementNom>; domaines: Map<string, EnregistrementDomaine> };

/** A deterministic JSON text: keys sorted at every level (arrays keep their order, already sorted by the builders). */
export function jsonStable(valeur: unknown): string {
  return JSON.stringify(valeur, (_cle, v: unknown) =>
    v !== null && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : v,
  );
}

export const sha256 = (texte: string) => createHash("sha256").update(texte).digest("hex");

/** The bucket of a name: « ab/cd » for the first four hex digits of its SHA-256. */
export function seau(cle: string): string {
  const h = sha256(cle);
  return `${h.slice(0, 2)}/${h.slice(2, 4)}`;
}

export const exploitantsDe = (couche: {
  exploitants: { role: string; societe: string | null; preuve: string; niveau: Niveau }[];
}) => couche.exploitants.map((e) => ({ role: e.role, societe: e.societe, preuve: e.preuve, niveau: e.niveau }));

export function hoteDe(h: CoucheHotes["hotes"][number]): Hote {
  return {
    hote: h.hote,
    etat: h.couche.etat,
    as: [...new Set(h.couche.reseaux.map((r) => r.as))].sort((a, b) => a - b),
    exploitants: exploitantsDe(h.couche),
    categorie: h.couche.categorie,
    horsUE: h.couche.horsUE,
    niveau: h.couche.niveau,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Signatures: what a change of hosting is (the journal and the circuit breaker look at these only).

export type Couche = "adresses" | "serveursDeNoms" | "messagerie";
const cles = (e: Exploitant[]) => [...new Set(e.map((x) => x.societe ?? x.preuve))].sort().join(",");

export function signatures(d: EnregistrementDomaine, web: EnregistrementNom | undefined): Record<Couche, string> {
  // A reduced record says nothing about its layers: undetermined, never compared.
  if (d.reduit) return { adresses: "nul", serveursDeNoms: "nul", messagerie: "nul" };
  // A web name measured on one family only says nothing whole about its hosting: never compared either.
  const adresses =
    web?.reduit || (web?.familleEnEchec ?? null) !== null
      ? "nul"
      : web === undefined || web.etat !== "ok"
        ? (web?.etat ?? "absent")
        : `${web.categorie}|${web.horsUE}|${cles(web.exploitants)}|${web.cdn?.id ?? ""}`;
  const ns = d.serveursDeNoms;
  const serveursDeNoms =
    d.zone.etat !== "ok"
      ? d.zone.etat
      : `${ns.categorie}|${ns.horsUE}|${ns.hotes.map((h) => cles(h.exploitants)).join(";")}`;
  const m = d.messagerie;
  const messagerie =
    m.etat !== "ok" ? m.etat : `${m.categorie}|${m.horsUE}|${m.hotes.map((h) => cles(h.exploitants)).join(";")}`;
  return { adresses, serveursDeNoms, messagerie };
}

// A layer that one of the two days did not determine (a failure, no MX, a reduced record, or a category « non
// déterminé », such as a host measured on one family) is never compared: only what both days determined is.
const indetermine = (s: string) =>
  ["echec", "absent", "nxdomain", "nodata", "aucun", "nul", "non déterminé"].includes(s.split("|")[0] ?? "");

// ---------------------------------------------------------------------------------------------------------------
// Hysteresis, journal and circuit breaker.

export type Changement = { domaine: string; couche: Couche; avant: string; apres: string };

export type Bilan = {
  etat: Etat;
  changements: Changement[];
  etatInitial: boolean;
  reglesChangees: boolean;
  /** Share of the domains measured both days whose hosting changed between yesterday and today (same rules). */
  disjoncteur: { compares: number; changes: number; part: number | null };
};

/**
 * The state to publish. `jour`: today's records; `veille`: yesterday's observations classified with today's rules
 * (null when the cache was lost); `publie`: the published state (null on the first day); `reglesChangees`: the
 * list, the referentials or the method changed since the published state (brief B.7 bis).
 */
export function bilan(jour: Etat, veille: Etat | null, publie: Etat | null, reglesChangees: boolean): Bilan {
  // Layer by layer, like the journal: a layer undetermined on either side (a failure, no MX…) is not compared.
  const comparer = (): Bilan["disjoncteur"] => {
    if (veille === null) return { compares: 0, changes: 0, part: null };
    let compares = 0;
    let changes = 0;
    for (const [domaine, d] of jour.domaines) {
      const hier = veille.domaines.get(domaine);
      if (hier === undefined) continue;
      const a = signatures(d, jour.noms.get(d.nomWeb));
      const b = signatures(hier, veille.noms.get(hier.nomWeb));
      const couches = (["adresses", "serveursDeNoms", "messagerie"] as const).filter(
        (c) => !indetermine(a[c]) && !indetermine(b[c]),
      );
      if (couches.length === 0) continue;
      compares += 1;
      if (couches.some((c) => a[c] !== b[c])) changes += 1;
    }
    return { compares, changes, part: compares === 0 ? null : changes / compares };
  };
  const disjoncteur = comparer();
  if (publie === null) return { etat: jour, changements: [], etatInitial: true, reglesChangees, disjoncteur };

  // On a day of new rules, the published state is rebased on yesterday, classified with the new rules: nothing of the
  // rules' effect ever enters the journal.
  // A record of yesterday that was reduced is replaced by today's (the new rules), else left out: never the published
  // one, classified with the old rules (its difference would enter tomorrow's journal).
  const sansReduits = <T extends { reduit?: true }>(hier: Map<string, T>, aujourdhui: Map<string, T>) =>
    new Map(
      [...hier].flatMap(([cle, e]) => {
        const remplacant = e.reduit ? aujourdhui.get(cle) : e;
        return remplacant === undefined || remplacant.reduit ? [] : [[cle, remplacant] as const];
      }),
    );
  const base: Etat =
    reglesChangees && veille !== null
      ? { noms: sansReduits(veille.noms, jour.noms), domaines: sansReduits(veille.domaines, jour.domaines) }
      : publie;
  const garder = <T extends { reduit?: true }>(
    cle: string,
    aujourdhui: T,
    hier: Map<string, T> | undefined,
    publies: Map<string, T>,
  ): T => {
    const avant = publies.get(cle);
    if (avant === undefined) return aujourdhui; // A name or domain new to the list.
    // A record that could not be built today never replaces the published one.
    if (aujourdhui.reduit && !avant.reduit) return avant;
    const v = hier?.get(cle);
    const texte = jsonStable(aujourdhui);
    return v !== undefined && jsonStable(v) === texte && jsonStable(avant) !== texte ? aujourdhui : avant;
  };
  const noms = new Map<string, EnregistrementNom>();
  for (const [nom, e] of jour.noms) noms.set(nom, garder(nom, e, veille?.noms, base.noms));
  const domaines = new Map<string, EnregistrementDomaine>();
  for (const [domaine, d] of jour.domaines) domaines.set(domaine, garder(domaine, d, veille?.domaines, base.domaines));

  const changements: Changement[] = [];
  if (!(reglesChangees && veille !== null)) {
    for (const [domaine, d] of domaines) {
      const avant = base.domaines.get(domaine);
      if (avant === undefined) continue;
      const a = signatures(avant, base.noms.get(avant.nomWeb));
      const b = signatures(d, noms.get(d.nomWeb));
      for (const couche of ["adresses", "serveursDeNoms", "messagerie"] as const) {
        if (a[couche] !== b[couche] && !indetermine(a[couche]) && !indetermine(b[couche])) {
          changements.push({ domaine, couche, avant: a[couche], apres: b[couche] });
        }
      }
    }
  }
  return { etat: { noms, domaines }, changements, etatInitial: false, reglesChangees, disjoncteur };
}

// ---------------------------------------------------------------------------------------------------------------
// Files.

export type Fichiers = Map<string, string>;

/**
 * The fragments of one kind of record (« noms » or « domaines »), and each folder's checksums. A bucket whose records
 * weigh more than 8 KB together is cut into numbered parts (`<bb>.json`, `<bb>.1.json`…), each of 8 KB at most — always
 * possible, a record weighing 3 KB at most (borner.ts); the first part says how many there are (`parties`).
 */
export function fragments<T>(
  dossier: string,
  enregistrements: Iterable<[string, T]>,
  seauDe: (cle: string) => string = seau,
): Fichiers {
  const parSeau = new Map<string, [string, T][]>();
  for (const [cle, e] of enregistrements) {
    const s = seauDe(cle);
    parSeau.set(s, [...(parSeau.get(s) ?? []), [cle, e]]);
  }
  const fichiers: Fichiers = new Map();
  const sommes = new Map<string, Record<string, string>>();
  const ecrire = (liste: T[], parties: number) =>
    `${jsonStable({ [dossier]: liste, ...(parties > 1 ? { parties } : {}) })}\n`;
  for (const [s, liste] of [...parSeau.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    liste.sort(([a], [b]) => (a < b ? -1 : 1));
    // Records in key order, packed while they fit (with room for « parties » in the first part).
    const parts: T[][] = [];
    let courante: T[] = [];
    for (const [, e] of liste) {
      const essai = [...courante, e];
      if (courante.length > 0 && Buffer.byteLength(ecrire(essai, 99)) > TAILLE_MAX_FRAGMENT) {
        parts.push(courante);
        courante = [e];
      } else {
        courante = essai;
      }
    }
    parts.push(courante);
    const [haut, bas] = s.split("/") as [string, string];
    parts.forEach((part, k) => {
      const texte = ecrire(part, k === 0 ? parts.length : 1);
      if (Buffer.byteLength(texte) > TAILLE_MAX_FRAGMENT) {
        throw new Error(
          `${dossier}/${s} : un enregistrement dépasse à lui seul 8 Ko (${Buffer.byteLength(texte)} octets)`,
        );
      }
      const nom = k === 0 ? `${bas}.json` : `${bas}.${k}.json`;
      fichiers.set(`${dossier}/${haut}/${nom}`, texte);
      sommes.set(haut, { ...(sommes.get(haut) ?? {}), [nom]: sha256(texte) });
    });
  }
  for (const [haut, liste] of sommes) fichiers.set(`${dossier}/${haut}/sommes.json`, `${jsonStable(liste)}\n`);
  return fichiers;
}

export type Societe = { nom: string; pays: string; mere: string | null; paysMere: string | null; categorie: Categorie };
export type Organisme = { nom: string; sigle: string | null; ministere: string | null };

/** The indexes (brief B.6): by AS, company, country, ministry and body. */
export function index(
  etat: Etat,
  details: {
    as: ReadonlyMap<
      number,
      { description: string | null; paysEnregistrement: string | null; titulaire: string | null }
    >;
    societes: ReadonlyMap<string, Societe>;
    organismes: ReadonlyMap<string, Organisme>;
    /** The bodies that name each domain as a website. */
    organismesDe: ReadonlyMap<string, readonly string[]>;
  },
): Fichiers {
  const fichiers: Fichiers = new Map();
  const asVus = new Set<number>();
  const parSociete = new Map<string, Set<string>>();
  const parPays = new Map<string, { domaines: Set<string>; etat: Set<string> }>();
  const parOrganisme = new Map<string, Set<string>>();
  const parMinistere = new Map<string, Set<string>>();
  const noter = <K>(m: Map<K, Set<string>>, k: K, v: string) => m.set(k, (m.get(k) ?? new Set()).add(v));
  for (const n of etat.noms.values()) for (const r of n.reseaux) asVus.add(r.as);
  for (const d of etat.domaines.values()) {
    const web = etat.noms.get(d.nomWeb);
    const exploitants = [
      ...(web?.exploitants ?? []),
      ...d.serveursDeNoms.hotes.flatMap((h) => h.exploitants),
      ...d.messagerie.hotes.flatMap((h) => h.exploitants),
    ];
    for (const h of [...d.serveursDeNoms.hotes, ...d.messagerie.hotes]) for (const a of h.as) asVus.add(a);
    for (const e of exploitants) {
      if (e.societe === null) continue;
      noter(parSociete, e.societe, d.domaine);
      const pays = details.societes.get(e.societe)?.paysMere ?? details.societes.get(e.societe)?.pays;
      if (pays) {
        const p = parPays.get(pays) ?? { domaines: new Set(), etat: new Set() };
        p.domaines.add(d.domaine);
        if (d.perimetre === "État") p.etat.add(d.domaine);
        parPays.set(pays, p);
      }
    }
    for (const o of details.organismesDe.get(d.domaine) ?? []) noter(parOrganisme, o, d.domaine);
    for (const m of d.ministeres) noter(parMinistere, m, d.domaine);
  }
  const trie = (s: Set<string>) => [...s].sort();
  fichiers.set(
    "index/as.json",
    `${jsonStable(Object.fromEntries([...asVus].sort((a, b) => a - b).map((a) => [String(a), details.as.get(a) ?? null])))}\n`,
  );
  fichiers.set(
    "index/exploitants.json",
    `${jsonStable(
      Object.fromEntries(
        [...parSociete.keys()]
          .sort()
          .map((cle) => [cle, { ...(details.societes.get(cle) ?? null), domaines: parSociete.get(cle)?.size ?? 0 }]),
      ),
    )}\n`,
  );
  for (const [cle, domaines] of parSociete)
    fichiers.set(`index/exploitants/${cle}.json`, `${jsonStable({ exploitant: cle, domaines: trie(domaines) })}\n`);
  fichiers.set(
    "index/pays.json",
    `${jsonStable(Object.fromEntries([...parPays.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([p, v]) => [p, { domaines: v.domaines.size, domainesEtat: v.etat.size }])))}\n`,
  );
  fichiers.set(
    "index/organismes.json",
    `${jsonStable(Object.fromEntries([...parOrganisme.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([o, v]) => [o, { ...(details.organismes.get(o) ?? null), domaines: trie(v) }])))}\n`,
  );
  fichiers.set(
    "index/ministeres.json",
    `${jsonStable(Object.fromEntries([...parMinistere.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([m, v]) => [m, { nom: details.organismes.get(m)?.nom ?? null, domaines: trie(v) }])))}\n`,
  );
  return fichiers;
}

export type Part = {
  domaines: number;
  horsUEConfirme: number;
  horsUEProbable: number;
  nonDetermine: number;
  auMoinsPourcent: number;
  probablePourcent: number;
  nonDeterminePourcent: number;
};

function part(couches: { horsUE: boolean | null; niveau: Niveau }[]): Part {
  const n = couches.length;
  const confirme = couches.filter((c) => c.horsUE === true && c.niveau === "confirmé").length;
  const probable = couches.filter((c) => c.horsUE === true && c.niveau === "probable").length;
  const nonDetermine = couches.filter((c) => c.horsUE === null || c.niveau === "non déterminé").length;
  const pourcent = (x: number) => (n === 0 ? 0 : Math.round((1000 * x) / n) / 10);
  return {
    domaines: n,
    horsUEConfirme: confirme,
    horsUEProbable: probable,
    nonDetermine,
    auMoinsPourcent: pourcent(confirme),
    probablePourcent: pourcent(probable),
    nonDeterminePourcent: pourcent(nonDetermine),
  };
}

/** The figures (decision D1; the name servers' and mail figures stand apart), all marked « en préparation ». */
export function chiffres(etat: Etat, methode: string): Record<string, unknown> {
  const domainesEtat = [...etat.domaines.values()].filter((d) => d.perimetre === "État");
  const web = (d: EnregistrementDomaine) => etat.noms.get(d.nomWeb);
  const repondent = domainesEtat.filter((d) => web(d)?.etat === "ok");
  const couche = (d: EnregistrementDomaine) => web(d) as EnregistrementNom;
  return {
    statut: "preparation",
    avertissement: "En préparation : provisoire, à ne pas citer avant l'ouverture du site.",
    methode,
    chiffreTitre: { perimetre: "État", ...part(repondent.map(couche)) },
    sousChiffreGouvFr: {
      perimetre: "État, .gouv.fr",
      ...part(repondent.filter((d) => d.raisons.includes("gouv.fr")).map(couche)),
    },
    serveursDeNoms: {
      perimetre: "État",
      ...part(domainesEtat.filter((d) => d.zone.etat === "ok").map((d) => d.serveursDeNoms)),
    },
    messagerie: {
      perimetre: "État",
      ...part(domainesEtat.filter((d) => d.messagerie.etat === "ok").map((d) => d.messagerie)),
    },
  };
}

/** The journal of the day (brief B.6): the confirmed changes; on the first day, the initial state only. */
export function journal(date: string, b: Bilan): string {
  return `${jsonStable({
    date,
    etatInitial: b.etatInitial,
    reglesChangees: b.reglesChangees,
    changements: [...b.changements].sort((x, y) => (x.domaine + x.couche < y.domaine + y.couche ? -1 : 1)),
  })}\n`;
}
