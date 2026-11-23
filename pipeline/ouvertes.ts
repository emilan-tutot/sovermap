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
  {
    name: "web_status",
    type: "string",
    description:
      "L'état de la mesure du nom web : ok (il répond par des adresses), nxdomain (le nom n'existe pas), nodata (il existe, sans adresse) ou echec (aucune réponse sûre après les reprises).",
  },
  {
    name: "roles",
    type: "string",
    description:
      "Pour chaque exploitant connu du nom web, dans l'ordre des champs suivants, hosted_by (hébergé par) ou delivered_by (diffusé par un CDN), séparés par « ; » ; vide quand aucun exploitant n'est établi.",
  },
  {
    name: "operators",
    type: "string",
    description:
      "Les clés des exploitants connus qui servent le nom web, sociétés ou organismes publics, séparées par « ; » (voir sovermap-operators) : un CDN d'abord, puis les hébergeurs.",
  },
  { name: "operator_names", type: "string", description: "Leurs noms, dans le même ordre, séparés par « ; »." },
  {
    name: "operator_countries",
    type: "string",
    description: "Les pays de leurs sièges (codes ISO 3166-1 alpha-2), dans le même ordre, séparés par « ; ».",
  },
  {
    name: "parents",
    type: "string",
    description:
      "Les clés de leurs maisons mères ultimes, dans le même ordre, séparées par « ; » ; un élément vide quand elle n'est pas établie.",
  },
  {
    name: "parent_countries",
    type: "string",
    description:
      "Les pays des sièges de ces maisons mères, dans le même ordre, séparés par « ; » ; un élément vide quand la maison mère n'est pas établie.",
  },
  {
    name: "retained_countries",
    type: "string",
    description:
      "Les pays de leurs sièges retenus (pour chacun, le plus éloigné de son propre siège et de celui de sa maison mère ultime : décision de l'ARRÊT 2, méthode 0.3), dans le même ordre, séparés par « ; » ; un élément vide quand il n'est pas établi (maison mère inconnue).",
  },
  {
    name: "unknown_networks",
    type: "integer",
    description: "Le nombre de réseaux (AS) du nom web dont l'exploitant n'est pas dans les référentiels de Sovermap.",
  },
  {
    name: "category",
    type: "string",
    description:
      "La catégorie de la couche web, selon la règle du chiffre (D1 modifiée par C2-4, méthode 0.3) : la plus lointaine parmi les sièges retenus de ses exploitants (pour chacun, le plus éloigné de son propre siège et de celui de sa maison mère ultime) : france, eu_outside_france (Union européenne hors France), europe_outside_eu, outside_europe ou undetermined.",
  },
  {
    name: "outside_eu",
    type: "boolean",
    description:
      "Vrai si au moins un exploitant de la couche web a son siège, ou sa maison mère ultime le sien, hors de l'Union européenne (règle C2-4, méthode 0.3) ; vide si ce n'est pas déterminé.",
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
  {
    name: "retained_country",
    type: "string",
    description:
      "Le pays de son siège retenu : le plus éloigné du sien et de celui de sa maison mère ultime (décision de l'ARRÊT 2) ; vide quand il n'est pas établi (maison mère inconnue).",
  },
  {
    name: "category",
    type: "string",
    description: "La catégorie de son siège retenu (voir sovermap-domains, champ category).",
  },
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
  {
    name: "answering",
    type: "integer",
    description: "Dont ceux dont le nom web répond ce jour-là : les trois parts suivantes se comptent parmi eux.",
  },
  { name: "outside_eu_confirmed", type: "integer", description: "Dont servis hors de l'UE, « confirmé »." },
  { name: "outside_eu_probable", type: "integer", description: "Dont servis hors de l'UE, « probable »." },
  { name: "undetermined", type: "integer", description: "Dont « non déterminé »." },
];

const CHAMPS_PAYS: readonly Champ[] = [
  {
    name: "country",
    type: "string",
    description:
      "Le pays d'un siège retenu, établi (code ISO 3166-1 alpha-2 ; voir sovermap-operators, champ retained_country).",
  },
  {
    name: "domains",
    type: "integer",
    description:
      "Le nombre de domaines dont le nom web est servi par au moins un exploitant dont le siège retenu, établi, est dans ce pays (le plus éloigné du sien et de celui de sa maison mère ultime) (les serveurs de noms et la messagerie ne sont pas comptés ici).",
  },
  { name: "state_domains", type: "integer", description: "Dont ceux du périmètre « État »." },
];

/** The known operators of a web name, each once: the one that delivers it when a CDN does, then those that host it. */
function servants(web: EnregistrementNom | undefined) {
  const exploitants = web?.exploitants ?? [];
  const ordre = [
    ...exploitants.filter((e) => e.role === "diffusé par"),
    ...exploitants.filter((e) => e.role !== "diffusé par"),
  ];
  const vus = new Set<string>();
  return ordre.flatMap((e) => {
    if (e.societe === null || vus.has(e.societe)) return [];
    vus.add(e.societe);
    return [{ role: e.role, societe: e.societe }];
  });
}

/** The domain fields that hold one value per known operator, in the same order, « ; » between two. */
const ALIGNES = [
  "roles",
  "operators",
  "operator_names",
  "operator_countries",
  "parents",
  "parent_countries",
  "retained_countries",
] as const;

/** A list as one field: its elements separated by « ; », null when it is empty; a « ; » inside a value (a company's
 * name) becomes a comma, so the lists stay aligned. */
const liste = (valeurs: readonly string[]): string | null =>
  valeurs.length === 0 ? null : valeurs.map((v) => v.replaceAll(";", ",")).join(";");

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
      const servis = servants(web);
      const societes = servis.map((s) => refs.societes.get(s.societe));
      return {
        domain: d.domaine,
        state_scope: d.perimetre === "État",
        state_reasons: d.raisons.join(";"),
        web_name: d.nomWeb,
        web_status: web?.etat ?? null,
        roles: liste(servis.map((s) => ROLES_EN[s.role] ?? "")),
        operators: liste(servis.map((s) => s.societe)),
        operator_names: liste(societes.map((s) => s?.nom ?? "")),
        operator_countries: liste(societes.map((s) => s?.pays ?? "")),
        parents: liste(societes.map((s) => s?.mere ?? "")),
        parent_countries: liste(societes.map((s) => (s?.mere === null || s === undefined ? "" : (s.paysMere ?? "")))),
        retained_countries: liste(societes.map((s) => s?.paysRetenu ?? "")),
        unknown_networks: (web?.exploitants ?? []).filter((e) => e.societe === null).length,
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
    const cles = typeof d["operators"] === "string" ? new Set(d["operators"].split(";")) : new Set<string>();
    for (const cle of cles) {
      const c = compte.get(cle) ?? { tous: 0, etat: 0 };
      c.tous += 1;
      if (d["state_scope"] === true) c.etat += 1;
      compte.set(cle, c);
    }
  }
  return [...refs.societes]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([cle, s]): Ligne => ({
      operator: cle,
      name: s.nom,
      country: s.pays,
      parent: s.mere,
      parent_country: s.paysMere,
      retained_country: s.paysRetenu,
      category: CATEGORIES_EN[s.categorie],
      chain: s.maillons.map((m) => m.cle).join(";"),
      domains: compte.get(cle)?.tous ?? 0,
      state_domains: compte.get(cle)?.etat ?? 0,
    }));
}

/**
 * The rows of the ministries' file: each ministry named by a domain, with its counts of the day; the three shares among
 * the domains whose web name answers (a name that does not answer is not « non déterminé », docs/methode.md).
 */
export function lignesMinisteres(etat: Etat, refs: Referentiels): Ligne[] {
  type Compte = { domaines: number; repondent: number; confirme: number; probable: number; indetermine: number };
  const parMinistere = new Map<string, Compte>();
  for (const d of etat.domaines.values()) {
    if (d.reduit === true) continue;
    const web = etat.noms.get(d.nomWeb);
    for (const m of d.ministeres) {
      const c = parMinistere.get(m) ?? { domaines: 0, repondent: 0, confirme: 0, probable: 0, indetermine: 0 };
      c.domaines += 1;
      if (web?.etat === "ok") {
        c.repondent += 1;
        if (web.horsUE === true && web.niveau === "confirmé") c.confirme += 1;
        else if (web.horsUE === true && web.niveau === "probable") c.probable += 1;
        if (web.horsUE === null || web.niveau === "non déterminé") c.indetermine += 1;
      }
      parMinistere.set(m, c);
    }
  }
  return [...parMinistere]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, c]): Ligne => ({
      ministry: id,
      name: refs.organismes.get(id)?.nom ?? null,
      domains: c.domaines,
      answering: c.repondent,
      outside_eu_confirmed: c.confirme,
      outside_eu_probable: c.probable,
      undetermined: c.indetermine,
    }));
}

/**
 * The rows of the countries' file: a country counted once a domain, only for an established retained seat (the farther
 * of an operator's own and its ultimate parent's, ARRÊT 2; none when the parent is unknown), as index/pays.json does.
 */
export function lignesPays(domaines: readonly Ligne[]): Ligne[] {
  const parPays = new Map<string, { tous: number; etat: number }>();
  for (const d of domaines) {
    const retenus = typeof d["retained_countries"] === "string" ? d["retained_countries"].split(";") : [];
    const etablis = new Set(retenus.filter((p) => p !== ""));
    for (const p of etablis) {
      const c = parPays.get(p) ?? { tous: 0, etat: 0 };
      c.tous += 1;
      if (d["state_scope"] === true) c.etat += 1;
      parPays.set(p, c);
    }
  }
  return [...parPays]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([p, c]): Ligne => ({ country: p, domains: c.tous, state_domains: c.etat }));
}

const sha256 = (texte: string) => createHash("sha256").update(texte, "utf8").digest("hex");

/**
 * A source read for the day, as etat.json publishes it: its identifier, its card in the registry of sources, its
 * state and the date of its copy. Never its address: one of them names the repository's account.
 */
export type SourceDuJour = { id: string; fiche: number; etat: string; date: string | null };

/** The cards of the sources the collection reads for control only (RIS, card 19): nothing of them is in these files. */
const FICHES_CONTROLE = new Set([19]);
const AVERTISSEMENT = "En préparation : le site n'est pas ouvert ; ne pas citer avant l'ouverture.";

/**
 * The open files of the day: each table as CSV and JSON, their data package (Table Schema, licences, the method's
 * version, the day), and their checksums (SHA256SUMS, the format of `sha256sum`).
 */
export function fichiersOuverts(
  etat: Etat,
  refs: Referentiels,
  jour: { date: string; heure: string; methode: string; sources: readonly SourceDuJour[] },
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
    ["countries", "Chaque pays d'un siège retenu, avec ses domaines du jour.", CHAMPS_PAYS, lignesPays(domaines)],
  ];
  const fichiers = new Map<string, string>();
  for (const [nom, , champs, lignes] of tables) {
    fichiers.set(`sovermap-${nom}.csv`, csv(champs, lignes));
    fichiers.set(
      `sovermap-${nom}.json`,
      `${JSON.stringify({ status: "preparation", warning: AVERTISSEMENT, date: jour.date, method: jour.methode, rows: lignes })}\n`,
    );
  }
  const paquet = {
    name: "sovermap",
    title: "Sovermap : qui héberge les sites publics français",
    description: `L'état publié du ${jour.date} : pour chaque site public mesuré, l'exploitant qui le sert, et les pays de son siège et de celui de sa maison mère.`,
    version: jour.date,
    created: jour.heure,
    sovermap: { method: jour.methode, status: "preparation", warning: AVERTISSEMENT },
    licenses: [
      {
        name: "etalab-2.0",
        title: "Licence Ouverte 2.0",
        path: "https://www.etalab.gouv.fr/licence-ouverte-open-licence/",
      },
    ],
    contributors: [{ title: "Les contributeurs de Sovermap", role: "author" }],
    // The sources read that day, with the date of each copy; their exact attributions: the registry of sources.
    sources: jour.sources.map((s) => ({
      title: `${s.id} (fiche ${s.fiche} du registre des sources de Sovermap)`,
      date: s.date,
      state: s.etat,
      ...(FICHES_CONTROLE.has(s.fiche)
        ? {
            usage:
              "contrôle seulement : confirme le niveau des adresses ; aucune de ses valeurs n'est dans ces fichiers",
          }
        : {}),
    })),
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

/**
 * The open files checked against their own data package, before anything is sent (brief F.3): each CSV's header is its
 * schema's fields, and each JSON row has those fields, each of its type (or null). The errors, a few of them.
 */
export function verifierOuvertes(fichiers: ReadonlyMap<string, string>): string[] {
  const erreurs: string[] = [];
  const texteDe = (nom: string): string | null => {
    const texte = fichiers.get(nom);
    if (texte === undefined) erreurs.push(`${nom} : absent`);
    return texte ?? null;
  };
  const brut = texteDe("datapackage.json");
  if (brut === null) return erreurs;
  const paquet = JSON.parse(brut) as {
    resources?: { name: string; path: string; schema: { fields: Champ[] } }[];
  };
  if ((paquet.resources ?? []).length === 0) erreurs.push("datapackage.json : aucune table");
  const types: Record<Champ["type"], (v: unknown) => boolean> = {
    string: (v) => typeof v === "string",
    integer: (v) => typeof v === "number" && Number.isSafeInteger(v),
    boolean: (v) => typeof v === "boolean",
    date: (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v),
  };
  for (const r of paquet.resources ?? []) {
    const noms = r.schema.fields.map((f) => f.name);
    const csv = texteDe(r.path);
    const texteJson = texteDe(r.path.replace(/\.csv$/, ".json"));
    if (csv === null || texteJson === null) continue;
    const lignesCsv = csv.split("\r\n");
    if (lignesCsv[0] !== noms.join(",")) erreurs.push(`${r.path} : en-tête différent du schéma`);
    const json = JSON.parse(texteJson) as { rows?: unknown[] };
    // One CSV line per row, with the header and the final line break (a value never holds a line break: none does).
    if (lignesCsv.length !== (json.rows ?? []).length + 2)
      erreurs.push(`${r.path} : nombre de lignes différent du JSON`);
    for (const [i, ligne] of (json.rows ?? []).entries()) {
      const l = (ligne ?? {}) as Record<string, unknown>;
      if (Object.keys(l).sort().join(",") !== [...noms].sort().join(",")) erreurs.push(`${r.name} ${i} : champs`);
      const longueurs = new Set(
        ALIGNES.filter((c) => c in l).map((c) => (typeof l[c] === "string" ? (l[c] as string).split(";").length : 0)),
      );
      if (longueurs.size > 1) erreurs.push(`${r.name} ${i} : listes d'exploitants de longueurs différentes`);
      for (const f of r.schema.fields) {
        const v = l[f.name];
        if (v !== null && !types[f.type](v)) erreurs.push(`${r.name} ${i} ${f.name} : ${f.type} attendu`);
      }
      if (erreurs.length >= 5) return erreurs;
    }
  }
  return erreurs;
}
