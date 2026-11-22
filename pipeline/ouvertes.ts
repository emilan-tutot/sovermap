// The open data of the day (brief F.1): the day's published state as CSV and JSON files, by domain, by operator, by
// ministry and by country, with English field names (decision D5) described in French in their Table Schema
// (datapackage.json), with the licences, the method's version and the files' checksums. They go to the
// « donnees-courant » release, next to the backup file, never into the history of the « donnees » branch.
// Nothing here comes from a source kept for control only (RIS, RIPEstat, RDAP, Team Cymru): the records hold none.
import { createHash } from "node:crypto";
import type { EnregistrementDomaine, EnregistrementNom, Etat, Organisme, Societe } from "./publication";
import type { Categorie, Niveau } from "./types";

export const CATEGORIES_EN: Record<Categorie, string> = {
  France: "france",
  "UE hors France": "eu_outside_france",
  "Europe hors UE": "europe_outside_eu",
  "hors d'Europe": "outside_europe",
  "non déterminé": "undetermined",
};
export const NIVEAUX_EN: Record<Niveau, string> = {
  confirmé: "confirmed",
  probable: "probable",
  "non déterminé": "undetermined",
};
const ROLES_EN: Record<string, string> = { "hébergé par": "hosted_by", "diffusé par": "delivered_by" };

type Valeur = string | number | boolean | null;
type Ligne = Record<string, Valeur>;
type Champ = { name: string; type: "string" | "integer" | "boolean" | "date"; description: string };

/** A CSV field (RFC 4180): empty for null; quoted when it holds a comma, a quote or a line break, its quotes doubled. */
export function champCsv(v: Valeur): string {
  if (v === null) return "";
  const texte = typeof v === "boolean" ? (v ? "true" : "false") : String(v);
  return /[",\r\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

/** A CSV file: its header, then one line a row, in the fields' order; lines end with CRLF (RFC 4180). */
export function csv(champs: readonly Champ[], lignes: readonly Ligne[]): string {
  const noms = champs.map((c) => c.name);
  return [noms.join(","), ...lignes.map((l) => noms.map((n) => champCsv(l[n] ?? null)).join(","))]
    .map((l) => `${l}\r\n`)
    .join("");
}

const CHAMPS_DOMAINES: readonly Champ[] = [
  { name: "domain", type: "string", description: "Le domaine enregistré." },
  { name: "state_scope", type: "boolean", description: "Vrai si le domaine est dans le périmètre « État »." },
  {
    name: "state_reasons",
    type: "string",
    description: "Les raisons de son entrée dans le périmètre « État », séparées par « ; » (gouv.fr, dila, sig, mesr).",
  },
  {
    name: "web_name",
    type: "string",
    description: "Le nom web mesuré pour le domaine (www. s'il répond, sinon le domaine).",
  },
  { name: "web_status", type: "string", description: "L'état de la mesure du nom web (ok, ou la raison d'un échec)." },
  {
    name: "role",
    type: "string",
    description:
      "hosted_by (hébergé par) ou delivered_by (diffusé par un CDN) ; vide quand aucun exploitant n'est établi.",
  },
  {
    name: "operator",
    type: "string",
    description: "La clé de l'exploitant, société ou organisme public, qui sert le nom web (voir sovermap-operators).",
  },
  { name: "operator_name", type: "string", description: "Le nom de cet exploitant." },
  { name: "operator_country", type: "string", description: "Le pays de son siège (code ISO 3166-1 alpha-2)." },
  { name: "parent", type: "string", description: "La clé de sa maison mère ultime ; vide si elle n'est pas établie." },
  { name: "parent_name", type: "string", description: "Le nom de la maison mère ultime." },
  { name: "parent_country", type: "string", description: "Le pays de son siège (code ISO 3166-1 alpha-2)." },
  {
    name: "category",
    type: "string",
    description:
      "Le pays du siège de la maison mère : france, eu_outside_france (Union européenne hors France), europe_outside_eu, outside_europe ou undetermined.",
  },
  {
    name: "outside_eu",
    type: "boolean",
    description: "Vrai si la maison mère a son siège hors de l'Union européenne ; vide si ce n'est pas déterminé.",
  },
  {
    name: "level",
    type: "string",
    description: "Le niveau de confiance : confirmed (deux sources par couche), probable (une source) ou undetermined.",
  },
  { name: "cdn", type: "string", description: "Le réseau de diffusion placé devant le site, s'il y en a un." },
  {
    name: "nameservers_category",
    type: "string",
    description: "La même catégorie, pour les serveurs de noms du domaine.",
  },
  { name: "mail_category", type: "string", description: "La même catégorie, pour la messagerie du domaine." },
  {
    name: "ministries",
    type: "string",
    description:
      "Les identifiants des ministères du Référentiel de la DILA qui rattachent le domaine, séparés par « ; ».",
  },
  { name: "last_change", type: "date", description: "Le jour du dernier changement de sa page sur le site." },
];

const CHAMPS_SOCIETES: readonly Champ[] = [
  {
    name: "operator",
    type: "string",
    description: "La clé de l'exploitant, société ou organisme public, dans les référentiels de Sovermap.",
  },
  { name: "name", type: "string", description: "Le nom de l'exploitant." },
  { name: "country", type: "string", description: "Le pays de son siège (code ISO 3166-1 alpha-2)." },
  { name: "parent", type: "string", description: "La clé de sa maison mère ultime ; vide si elle n'est pas établie." },
  { name: "parent_country", type: "string", description: "Le pays du siège de la maison mère ultime." },
  { name: "category", type: "string", description: "La catégorie de ce pays (voir sovermap-domains, champ category)." },
  {
    name: "chain",
    type: "string",
    description:
      "Les clés des sociétés au-dessus de lui, de sa mère directe à sa maison mère ultime, séparées par « ; ».",
  },
  { name: "domains", type: "integer", description: "Le nombre de domaines dont elle sert le nom web ce jour-là." },
  { name: "state_domains", type: "integer", description: "Dont ceux du périmètre « État »." },
];

const CHAMPS_MINISTERES: readonly Champ[] = [
  { name: "ministry", type: "string", description: "L'identifiant du ministère dans le Référentiel de la DILA." },
  { name: "name", type: "string", description: "Le nom du ministère." },
  { name: "domains", type: "integer", description: "Le nombre de domaines qui lui sont rattachés." },
  { name: "outside_eu_confirmed", type: "integer", description: "Dont servis hors de l'UE, « confirmé »." },
  { name: "outside_eu_probable", type: "integer", description: "Dont servis hors de l'UE, « probable »." },
  { name: "undetermined", type: "integer", description: "Dont « non déterminé »." },
];

const CHAMPS_PAYS: readonly Champ[] = [
  { name: "country", type: "string", description: "Le pays du siège des maisons mères (code ISO 3166-1 alpha-2)." },
  {
    name: "domains",
    type: "integer",
    description: "Le nombre de domaines servis par un exploitant dont la maison mère établie a son siège dans ce pays.",
  },
  { name: "state_domains", type: "integer", description: "Dont ceux du périmètre « État »." },
];

/** The company that serves a web name: the one that delivers it when a CDN does, otherwise the first that hosts it. */
function servant(web: EnregistrementNom | undefined) {
  const exploitants = web?.exploitants ?? [];
  return exploitants.find((e) => e.role === "diffusé par") ?? exploitants.find((e) => e.role === "hébergé par") ?? null;
}

export type Referentiels = {
  societes: ReadonlyMap<string, Societe>;
  organismes: ReadonlyMap<string, Organisme>;
  /** The day of each domain's last change on the site (joursDeChangement). */
  jours: ReadonlyMap<string, string>;
};

/** The rows of the domains' file, sorted by domain. */
export function lignesDomaines(etat: Etat, refs: Referentiels): Ligne[] {
  return [...etat.domaines.values()]
    .filter((d) => d.reduit !== true)
    .sort((a, b) => (a.domaine < b.domaine ? -1 : a.domaine > b.domaine ? 1 : 0))
    .map((d: EnregistrementDomaine): Ligne => {
      const web = etat.noms.get(d.nomWeb);
      const s = servant(web);
      const societe = s?.societe === null || s === null ? undefined : refs.societes.get(s.societe);
      const mere = societe?.mere === null || societe === undefined ? undefined : refs.societes.get(societe.mere);
      return {
        domain: d.domaine,
        state_scope: d.perimetre === "État",
        state_reasons: d.raisons.join(";"),
        web_name: d.nomWeb,
        web_status: web?.etat ?? null,
        role: s === null ? null : (ROLES_EN[s.role] ?? null),
        operator: s?.societe ?? null,
        operator_name: societe?.nom ?? null,
        operator_country: societe?.pays ?? null,
        parent: societe?.mere ?? null,
        parent_name: mere?.nom ?? null,
        parent_country: societe?.paysMere ?? null,
        category: web === undefined ? CATEGORIES_EN["non déterminé"] : CATEGORIES_EN[web.categorie],
        outside_eu: web?.horsUE ?? null,
        level: web === undefined ? NIVEAUX_EN["non déterminé"] : NIVEAUX_EN[web.niveau],
        cdn: web?.cdn?.id ?? null,
        nameservers_category: CATEGORIES_EN[d.serveursDeNoms.categorie],
        mail_category: CATEGORIES_EN[d.messagerie.categorie],
        ministries: [...d.ministeres].sort().join(";"),
        last_change: refs.jours.get(d.domaine) ?? null,
      };
    });
}

/** The rows of the operators' file: every company of the referential, with its counts of the day. */
export function lignesSocietes(domaines: readonly Ligne[], refs: Referentiels): Ligne[] {
  const compte = new Map<string, { tous: number; etat: number }>();
  for (const d of domaines) {
    if (typeof d["operator"] !== "string") continue;
    const c = compte.get(d["operator"]) ?? { tous: 0, etat: 0 };
    c.tous += 1;
    if (d["state_scope"] === true) c.etat += 1;
    compte.set(d["operator"], c);
  }
  return [...refs.societes]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([cle, s]): Ligne => ({
      operator: cle,
      name: s.nom,
      country: s.pays,
      parent: s.mere,
      parent_country: s.paysMere,
      category: CATEGORIES_EN[s.categorie],
      chain: s.maillons.map((m) => m.cle).join(";"),
      domains: compte.get(cle)?.tous ?? 0,
      state_domains: compte.get(cle)?.etat ?? 0,
    }));
}

/** The rows of the ministries' file: each ministry named by a domain, with its counts of the day. */
export function lignesMinisteres(etat: Etat, refs: Referentiels): Ligne[] {
  const parMinistere = new Map<string, { domaines: number; confirme: number; probable: number; indetermine: number }>();
  for (const d of etat.domaines.values()) {
    if (d.reduit === true) continue;
    const web = etat.noms.get(d.nomWeb);
    for (const m of d.ministeres) {
      const c = parMinistere.get(m) ?? { domaines: 0, confirme: 0, probable: 0, indetermine: 0 };
      c.domaines += 1;
      if (web?.horsUE === true && web.niveau === "confirmé") c.confirme += 1;
      else if (web?.horsUE === true && web.niveau === "probable") c.probable += 1;
      if (web === undefined || web.horsUE === null || web.niveau === "non déterminé") c.indetermine += 1;
      parMinistere.set(m, c);
    }
  }
  return [...parMinistere]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, c]): Ligne => ({
      ministry: id,
      name: refs.organismes.get(id)?.nom ?? null,
      domains: c.domaines,
      outside_eu_confirmed: c.confirme,
      outside_eu_probable: c.probable,
      undetermined: c.indetermine,
    }));
}

/** The rows of the countries' file: a country counted only for an established seat of an ultimate parent. */
export function lignesPays(domaines: readonly Ligne[]): Ligne[] {
  const parPays = new Map<string, { tous: number; etat: number }>();
  for (const d of domaines) {
    if (typeof d["parent"] !== "string" || typeof d["parent_country"] !== "string") continue;
    const c = parPays.get(d["parent_country"]) ?? { tous: 0, etat: 0 };
    c.tous += 1;
    if (d["state_scope"] === true) c.etat += 1;
    parPays.set(d["parent_country"], c);
  }
  return [...parPays]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([pays, c]): Ligne => ({ country: pays, domains: c.tous, state_domains: c.etat }));
}

const sha256 = (texte: string) => createHash("sha256").update(texte, "utf8").digest("hex");

/**
 * The open files of the day: each table as CSV and JSON, their data package (Table Schema, licences, the method's
 * version, the day), and their checksums (SHA256SUMS, the format of `sha256sum`).
 */
export function fichiersOuverts(
  etat: Etat,
  refs: Referentiels,
  jour: { date: string; methode: string },
): Map<string, string> {
  const domaines = lignesDomaines(etat, refs);
  const tables: [string, string, readonly Champ[], Ligne[]][] = [
    ["domains", "Chaque domaine enregistré mesuré ce jour-là, couche par couche.", CHAMPS_DOMAINES, domaines],
    [
      "operators",
      "Chaque exploitant des référentiels de Sovermap, société ou organisme public, avec ses domaines du jour.",
      CHAMPS_SOCIETES,
      lignesSocietes(domaines, refs),
    ],
    [
      "ministries",
      "Chaque ministère qui rattache des domaines, avec ses parts du jour.",
      CHAMPS_MINISTERES,
      lignesMinisteres(etat, refs),
    ],
    ["countries", "Chaque pays de siège de maison mère, avec ses domaines du jour.", CHAMPS_PAYS, lignesPays(domaines)],
  ];
  const fichiers = new Map<string, string>();
  for (const [nom, , champs, lignes] of tables) {
    fichiers.set(`sovermap-${nom}.csv`, csv(champs, lignes));
    fichiers.set(
      `sovermap-${nom}.json`,
      `${JSON.stringify({ date: jour.date, method: jour.methode, rows: lignes })}\n`,
    );
  }
  const paquet = {
    name: "sovermap",
    title: "Sovermap : qui héberge les sites publics français",
    description: `L'état publié du ${jour.date} : pour chaque site public mesuré, l'exploitant qui le sert et le pays du siège de sa maison mère.`,
    version: jour.date,
    created: jour.date,
    sovermap: { method: jour.methode },
    licenses: [
      {
        name: "etalab-2.0",
        title: "Licence Ouverte 2.0",
        path: "https://www.etalab.gouv.fr/licence-ouverte-open-licence/",
      },
    ],
    contributors: [{ title: "Les contributeurs de Sovermap", role: "author" }],
    resources: tables.map(([nom, description, champs]) => ({
      name: nom,
      path: `sovermap-${nom}.csv`,
      format: "csv",
      mediatype: "text/csv",
      encoding: "utf-8",
      description,
      schema: { fields: champs },
    })),
  };
  fichiers.set("datapackage.json", `${JSON.stringify(paquet, null, 2)}\n`);
  const sommes = [...fichiers]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([nom, texte]) => `${sha256(texte)}  ${nom}\n`)
    .join("");
  fichiers.set("SHA256SUMS", sommes);
  return fichiers;
}
