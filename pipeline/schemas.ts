// The schemas of the published files (brief B.6: every file is checked against its schema before it is sent). They are
// written in JSON Schema (draft 2020-12, a small subset) and published with the data, in schemas/; the validator below
// knows that subset only: type (with null), properties, required, additionalProperties false, items, enum, pattern,
// maxLength, maxItems, minimum.
type Schema = {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: string | string[];
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean | Schema;
  items?: Schema;
  enum?: unknown[];
  pattern?: string;
  maxLength?: number;
  maxItems?: number;
  minimum?: number;
};

const texte = (maxLength = 300): Schema => ({ type: "string", maxLength });
// A DNS name: letters, digits, hyphens and underscores (_spf, _domainkey…), never markup.
const MOTIF_NOM_DNS = /^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?(\.[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?)*$/;
/** A value read from the DNS may be published as a name only if it looks like one (253 characters at most). */
export const estNomDns = (n: string) => n.length <= 253 && MOTIF_NOM_DNS.test(n);
const nomDns: Schema = {
  type: "string",
  maxLength: 253,
  pattern: "^[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?(\\.[a-z0-9_]([a-z0-9_-]*[a-z0-9_])?)*$",
};
const niveau: Schema = { enum: ["confirmé", "probable", "non déterminé"] };
const categorie: Schema = { enum: ["France", "UE hors France", "Europe hors UE", "hors d'Europe", "non déterminé"] };
const horsUE: Schema = { type: ["boolean", "null"] };
const etatNom: Schema = { enum: ["ok", "nxdomain", "nodata", "echec"] };
const echec: Schema = {
  type: ["object", "null"],
  properties: { code: { type: "string", maxLength: 20 }, confirmePar: { type: ["string", "null"], maxLength: 20 } },
  required: ["code", "confirmePar"],
  additionalProperties: false,
};
const liste = (items: Schema, maxItems = 1000): Schema => ({ type: "array", items, maxItems });
const objet = (properties: Record<string, Schema>, optionnelles: string[] = []): Schema => ({
  type: "object",
  properties,
  required: Object.keys(properties).filter((k) => !optionnelles.includes(k)),
  additionalProperties: false,
});

const exploitant = objet({
  role: { enum: ["hébergé par", "diffusé par"] },
  societe: { type: ["string", "null"], maxLength: 100 },
  preuve: texte(200),
  niveau,
});

const hote = objet({
  hote: nomDns,
  etat: etatNom,
  as: liste({ type: "integer", minimum: 0 }, 100),
  exploitants: liste(exploitant, 100),
  categorie,
  horsUE,
  niveau,
});

export const NOM: Schema = objet(
  {
    nom: nomDns,
    domaine: nomDns,
    provenances: liste(texte(120), 20),
    types: liste(texte(80), 20),
    etat: etatNom,
    echec,
    cname: liste(nomDns, 10),
    dnssec: { type: "boolean" },
    familleEnEchec: { enum: ["A", "AAAA", null] },
    reseaux: liste(
      objet({ as: { type: "integer", minimum: 0 }, plage: { type: ["string", "null"], maxLength: 100 } }),
      100,
    ),
    cdn: { ...objet({ id: texte(60), methode: { enum: ["cname", "plage", "as"] } }), type: ["object", "null"] },
    exploitants: liste(exploitant, 100),
    categorie,
    horsUE,
    niveau,
    controle: { ...objet({ resolveur: texte(60), accord: { type: "boolean" } }), type: ["object", "null"] },
    tronque: { enum: [true] },
    reduit: { enum: [true] },
  },
  ["tronque", "reduit"],
);

export const DOMAINE: Schema = objet(
  {
    domaine: nomDns,
    nomWeb: nomDns,
    perimetre: { enum: ["État", "hors État"] },
    raisons: liste({ enum: ["gouv.fr", "dila"] }, 5),
    plateforme: { type: "boolean" },
    organismes: { type: "integer", minimum: 0 },
    ministeres: liste(texte(80), 50),
    noms: { type: "integer", minimum: 1 },
    zone: objet({
      etat: etatNom,
      echec,
      ns: liste(nomDns, 50),
      soa: { ...nomDns, type: ["string", "null"] },
      ds: { type: ["boolean", "null"] },
      caa: {
        ...liste(objet({ propriete: { enum: ["issue", "issuewild"] }, valeur: texte(255) }), 50),
        type: ["array", "null"],
      },
    }),
    serveursDeNoms: objet({ hotes: liste(hote, 50), categorie, horsUE, niveau }),
    messagerie: objet({
      etat: { enum: ["ok", "aucun", "nul", "echec"] },
      mx: liste(objet({ preference: { type: "integer", minimum: 0 }, hote: nomDns }), 50),
      hotes: liste(hote, 50),
      categorie,
      horsUE,
      niveau,
      spf: {
        ...objet({
          statut: { enum: ["absent", "lu", "limite dépassée", "boucle", "echec"] },
          inclus: liste(nomDns, 50),
          reseaux: liste(objet({ as: { type: "integer", minimum: 0 } }), 50),
          reseauxTotal: { type: "integer", minimum: 0 },
          nonEvalues: { type: "integer", minimum: 0 },
        }),
        type: ["object", "null"],
      },
    }),
    tronque: { enum: [true] },
    reduit: { enum: [true] },
  },
  ["tronque", "reduit"],
);

export const FRAGMENT_NOMS: Schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "fragment-noms.schema.json",
  title: "Sovermap : un fragment de noms mesurés",
  ...objet({ noms: liste(NOM, 500), parties: { type: "integer", minimum: 2 } }, ["parties"]),
};

export const FRAGMENT_DOMAINES: Schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "fragment-domaines.schema.json",
  title: "Sovermap : un fragment de domaines enregistrés",
  ...objet({ domaines: liste(DOMAINE, 500), parties: { type: "integer", minimum: 2 } }, ["parties"]),
};

export const JOURNAL: Schema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "journal.schema.json",
  title: "Sovermap : les changements confirmés d'un jour",
  ...objet({
    date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    etatInitial: { type: "boolean" },
    reglesChangees: { type: "boolean" },
    changements: liste(
      objet({
        domaine: nomDns,
        couche: { enum: ["adresses", "serveursDeNoms", "messagerie"] },
        avant: texte(2000),
        apres: texte(2000),
      }),
      100_000,
    ),
  }),
};

export type Erreur = { chemin: string; attendu: string };

const typeDe = (v: unknown): string =>
  v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v;

/** Checks a value against a schema of the subset; returns the first errors (20 at most). */
export function valider(valeur: unknown, schema: Schema, chemin = "$", erreurs: Erreur[] = []): Erreur[] {
  if (erreurs.length >= 20) return erreurs;
  const t = typeDe(valeur);
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const accepte = types.includes(t) || (t === "integer" && types.includes("number"));
    if (!accepte) {
      erreurs.push({ chemin, attendu: types.join(" ou ") });
      return erreurs;
    }
    if (t === "null") return erreurs;
  }
  if (schema.enum !== undefined && !schema.enum.includes(valeur)) {
    erreurs.push({ chemin, attendu: `une des valeurs ${JSON.stringify(schema.enum)}` });
    return erreurs;
  }
  if (typeof valeur === "string") {
    if (schema.maxLength !== undefined && valeur.length > schema.maxLength)
      erreurs.push({ chemin, attendu: `${schema.maxLength} caractères au plus` });
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(valeur))
      erreurs.push({ chemin, attendu: `le motif ${schema.pattern}` });
  }
  if (typeof valeur === "number" && schema.minimum !== undefined && valeur < schema.minimum) {
    erreurs.push({ chemin, attendu: `au moins ${schema.minimum}` });
  }
  if (Array.isArray(valeur)) {
    if (schema.maxItems !== undefined && valeur.length > schema.maxItems)
      erreurs.push({ chemin, attendu: `${schema.maxItems} éléments au plus` });
    if (schema.items) valeur.forEach((v, i) => valider(v, schema.items as Schema, `${chemin}[${i}]`, erreurs));
  }
  if (t === "object") {
    const o = valeur as Record<string, unknown>;
    for (const cle of schema.required ?? [])
      if (!(cle in o)) erreurs.push({ chemin: `${chemin}.${cle}`, attendu: "présent" });
    for (const [cle, v] of Object.entries(o)) {
      const sous = schema.properties?.[cle];
      if (sous) valider(v, sous, `${chemin}.${cle}`, erreurs);
      else if (schema.additionalProperties === false)
        erreurs.push({ chemin: `${chemin}.${cle}`, attendu: "aucune autre clé" });
    }
  }
  return erreurs.slice(0, 20);
}

/** The schema of a published file, by its path; null for files checked otherwise (indexes, README). */
export function schemaDe(chemin: string): Schema | null {
  if (/^noms\/[0-9a-f]{2}\/[0-9a-f]{2}(\.\d+)?\.json$/.test(chemin)) return FRAGMENT_NOMS;
  if (/^domaines\/[0-9a-f]{2}\/[0-9a-f]{2}(\.\d+)?\.json$/.test(chemin)) return FRAGMENT_DOMAINES;
  if (/^journal\/\d{4}\/\d{2}\/\d{4}-\d{2}-\d{2}\.json$/.test(chemin)) return JOURNAL;
  return null;
}

/** The schemas, as published files. */
export function fichiersSchemas(): Map<string, string> {
  return new Map(
    [FRAGMENT_NOMS, FRAGMENT_DOMAINES, JOURNAL].map((s) => [
      `schemas/${s.$id ?? ""}`,
      `${JSON.stringify(s, null, 2)}\n`,
    ]),
  );
}
