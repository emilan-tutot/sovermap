// A small published state for the end-to-end tests of the full site (D.8), written by the collection's own publication
// code (pipeline/publication.ts: fragments, indexes, figures, checksums), so that it always has the real format: three
// made-up domains under .example (RFC 2606), documentation AS numbers (RFC 5398), no person, no network.
//   npx tsx scripts/donnees-essai.ts <dossier>
// The site reads it instead of GitHub when SOVERMAP_DONNEES_LOCALES names that folder (lib/donnees/lecture.ts; never on
// Vercel).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  chiffres,
  type EnregistrementDomaine,
  type EnregistrementNom,
  type Etat,
  fragments,
  index,
  jsonStable,
  seau,
  sha256,
} from "../pipeline/publication";

const [dossier] = process.argv.slice(2);
if (dossier === undefined) throw new Error("usage : npx tsx scripts/donnees-essai.ts <dossier>");

const DATE_ESSAI = "2026-11-21";
const MINISTERE = "00000000-0000-4000-8000-000000000001";

/** The AS of each made-up company: the CDN's, the relay's (an American subsidiary of a French group), the host's. */
const AS_DE: Readonly<Record<string, number>> = { "cdn-us": 64500, "relais-us": 64501, "bouclier-il": 64502 };
const asDe = (societe: string | null) => (societe === null ? 64496 : (AS_DE[societe] ?? 64496));

const nom = (
  n: string,
  domaine: string,
  societe: string | null,
  role: "hébergé par" | "diffusé par",
  categorie: EnregistrementNom["categorie"],
): EnregistrementNom => ({
  nom: n,
  domaine,
  provenances: ["dinum:2026-11-19"],
  types: [],
  etat: "ok",
  echec: null,
  cname: role === "diffusé par" ? [`${domaine}.cdn.example`] : [],
  dnssec: false,
  familleEnEchec: null,
  reseaux: [{ as: asDe(societe), plage: "192.0.2.0-192.0.2.255" }],
  cdn: role === "diffusé par" ? { id: "cloudflare", methode: "cname" } : null,
  exploitants:
    societe === null
      ? []
      : [{ role, societe, preuve: `AS${asDe(societe)}`, niveau: "probable", niveauSociete: "probable" }],
  categorie,
  horsUE: categorie === "hors d'Europe" ? true : categorie === "non déterminé" ? null : false,
  niveau: "probable",
  controle: { resolveur: "quad9", accord: true },
});

const domaine = (d: string, perimetre: "État" | "hors État", ministeres: string[]): EnregistrementDomaine => ({
  domaine: d,
  nomWeb: `www.${d}`,
  perimetre,
  raisons: perimetre === "État" ? ["dila"] : [],
  plateforme: false,
  organismes: ministeres.length,
  ministeres,
  noms: 2,
  zone: { etat: "ok", echec: null, ns: [`ns1.${d}`, `ns2.${d}`], soa: `ns1.${d}`, ds: false, caa: [] },
  serveursDeNoms: { hotes: [], categorie: "France", horsUE: false, niveau: "probable" },
  messagerie: {
    etat: "aucun",
    mx: [],
    hotes: [],
    categorie: "non déterminé",
    horsUE: null,
    niveau: "non déterminé",
    spf: null,
  },
});

const etat: Etat = {
  domaines: new Map([
    ["service.example", domaine("service.example", "État", [MINISTERE])],
    ["nuage.example", domaine("nuage.example", "État", [MINISTERE])],
    ["relais.example", domaine("relais.example", "État", [MINISTERE])],
    ["mairie.example", domaine("mairie.example", "hors État", [])],
    ["bouclier.example", domaine("bouclier.example", "hors État", [])],
    ["panne.example", domaine("panne.example", "hors État", [])],
    ["nompanne.example", domaine("nompanne.example", "hors État", [])],
  ]),
  noms: new Map([
    ["www.service.example", nom("www.service.example", "service.example", "hebergeur-fr", "hébergé par", "France")],
    ["www.nuage.example", nom("www.nuage.example", "nuage.example", "cdn-us", "diffusé par", "hors d'Europe")],
    // The Imperva case (rule C2-4): served by an American subsidiary of a French group, « hors d'Europe » by its seat.
    ["www.relais.example", nom("www.relais.example", "relais.example", "relais-us", "hébergé par", "hors d'Europe")],
    ["www.mairie.example", nom("www.mairie.example", "mairie.example", null, "hébergé par", "non déterminé")],
    // A company outside Europe whose parent is unknown: « hors d'Europe » whatever that parent, but no retained seat.
    [
      "www.bouclier.example",
      nom("www.bouclier.example", "bouclier.example", "bouclier-il", "hébergé par", "hors d'Europe"),
    ],
    ["www.panne.example", nom("www.panne.example", "panne.example", null, "hébergé par", "non déterminé")],
    ["www.nompanne.example", nom("www.nompanne.example", "nompanne.example", null, "hébergé par", "non déterminé")],
  ]),
};

const figures = chiffres(etat, "0.2.1");
// The figures' history (agregats/historique.json, its real format): a made-up day before and the day, so that the
// Atlas's time slider shows (it appears from two published days); the day brings new rules.
const veille = { perimetre: "État", domaines: 2, horsUEConfirme: 0, horsUEProbable: 0, nonDetermine: 1 };
const historique = {
  jours: [
    {
      date: "2026-11-20",
      methode: "0.2.0",
      reglesChangees: false,
      chiffreTitre: { ...veille, auMoinsPourcent: 0, probablePourcent: 0, nonDeterminePourcent: 50 },
    },
    { date: DATE_ESSAI, methode: "0.2.1", reglesChangees: true, chiffreTitre: figures["chiffreTitre"] },
  ],
};

const fichiers = new Map<string, string>([
  ...fragments("noms", etat.noms),
  ...fragments("domaines", etat.domaines),
  ...index(etat, {
    as: new Map([
      [64496, { description: "EXEMPLE-HEBERGEUR", paysEnregistrement: "FR", titulaire: "Hébergeur Exemple SAS" }],
      [64500, { description: "EXEMPLE-CDN", paysEnregistrement: "US", titulaire: "CDN Exemple, Inc." }],
      [64501, { description: "EXEMPLE-RELAIS", paysEnregistrement: "US", titulaire: "Relais Exemple, Inc." }],
      [64502, { description: "EXEMPLE-BOUCLIER", paysEnregistrement: "IL", titulaire: "Bouclier Exemple Ltd" }],
    ]),
    societes: new Map([
      [
        "hebergeur-fr",
        {
          maillons: [],
          controle: null,
          nom: "Hébergeur Exemple",
          pays: "FR",
          mere: "hebergeur-fr",
          paysMere: "FR",
          paysRetenu: "FR",
          categorie: "France",
        },
      ],
      [
        "cdn-us",
        {
          maillons: [],
          controle: null,
          nom: "CDN Exemple, Inc.",
          pays: "US",
          mere: "cdn-us",
          paysMere: "US",
          paysRetenu: "US",
          categorie: "hors d'Europe",
        },
      ],
      [
        "relais-us",
        {
          maillons: [{ cle: "groupe-fr", nom: "Groupe Exemple SA", pays: "FR" }],
          controle: null,
          nom: "Relais Exemple, Inc.",
          pays: "US",
          mere: "groupe-fr",
          paysMere: "FR",
          paysRetenu: "US",
          categorie: "hors d'Europe",
        },
      ],
      [
        "bouclier-il",
        {
          maillons: [],
          controle: null,
          nom: "Bouclier Exemple Ltd",
          pays: "IL",
          mere: null,
          paysMere: null,
          paysRetenu: null,
          categorie: "hors d'Europe",
        },
      ],
      [
        "groupe-fr",
        {
          maillons: [],
          controle: null,
          nom: "Groupe Exemple SA",
          pays: "FR",
          mere: "groupe-fr",
          paysMere: "FR",
          paysRetenu: "FR",
          categorie: "France",
        },
      ],
    ]),
    organismes: new Map([[MINISTERE, { nom: "Ministère de l’Exemple", sigle: null, ministere: null }]]),
    organismesDe: new Map(),
  }),
  ["agregats/chiffres.json", `${jsonStable(figures)}\n`],
  ["agregats/historique.json", `${jsonStable(historique)}\n`],
  [
    `journal/${DATE_ESSAI.slice(0, 4)}/${DATE_ESSAI.slice(5, 7)}/${DATE_ESSAI}.json`,
    `${jsonStable({ date: DATE_ESSAI, etatInitial: true, reglesChangees: false, changements: [] })}\n`,
  ],
]);
// index/domaines.json, until the collection's own index writes it (its branch merges after the second day): every
// domain, with 1 for the « État » perimeter, in the published format.
if (!fichiers.has("index/domaines.json")) {
  const domaines = [...etat.domaines.values()]
    .map((d) => [d.domaine, d.perimetre === "État" ? 1 : 0] as const)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  fichiers.set("index/domaines.json", `${jsonStable({ domaines })}\n`);
}
// The territories' index (D.2), until the collection's own writes it (pipeline/territoires-index.ts, branch of the
// territories), in its published format: a commune with the town hall's site, and a made-up group of communes.
const listeTerritoire = (d: string) => {
  const web = etat.noms.get(`www.${d}`);
  return [{ domaine: d, categorie: web?.categorie ?? "non déterminé", horsUE: web?.horsUE ?? null }];
};
if (!fichiers.has("index/territoires.json")) {
  fichiers.set(
    "index/territoires.json",
    `${jsonStable({
      regions: { "53": { nom: "Bretagne", domaines: 2, conseil: [] } },
      departements: { "35": { nom: "Ille-et-Vilaine", region: "53", domaines: 2, conseil: [] } },
      groupements: { "200000001": "35" },
    })}\n`,
  );
  fichiers.set(
    "index/territoires/35.json",
    `${jsonStable({
      departement: "35",
      conseil: [],
      communes: [{ code: "35238", nom: "Rennes", domaines: listeTerritoire("mairie.example") }],
      groupements: [{ nom: "Métropole Exemple", siren: "200000001", domaines: listeTerritoire("nuage.example") }],
    })}\n`,
  );
}
// A domain whose record cannot be read: its file is altered after its checksum was taken, so that the reader finds
// it unreadable, with no copy of the day before. Its Radiographie must answer an error, never a page that Vercel's
// CDN would keep (lib/donnees/indisponible.ts, D.4). Its bucket holds no other domain of the state.
const [hautPanne, basPanne] = seau("panne.example").split("/");
const fichierPanne = `domaines/${hautPanne}/${basPanne}.json`;
if ([...etat.domaines.keys()].some((d) => d !== "panne.example" && seau(d) === seau("panne.example"))) {
  throw new Error("données d'essai : panne.example partage son fichier avec un autre domaine");
}
fichiers.set(fichierPanne, `${fichiers.get(fichierPanne) ?? ""} `);
// A domain whose own record reads, but not its web name's: its Radiographie must answer an error too, never its layers
// « non déterminé » as facts (the review of PR 22). Its web name's bucket holds no other name of the state.
const [hautNomPanne, basNomPanne] = seau("www.nompanne.example").split("/");
const fichierNomPanne = `noms/${hautNomPanne}/${basNomPanne}.json`;
if ([...etat.noms.keys()].some((n) => n !== "www.nompanne.example" && seau(n) === seau("www.nompanne.example"))) {
  throw new Error("données d'essai : www.nompanne.example partage son fichier avec un autre nom");
}
fichiers.set(fichierNomPanne, `${fichiers.get(fichierNomPanne) ?? ""} `);
const sommes = Object.fromEntries(
  [...fichiers]
    .filter(([c]) => /^(noms|domaines)\/[0-9a-f]{2}\/sommes\.json$/.test(c) || /^(index|agregats|journal)\//.test(c))
    .map(([c, texte]) => [c, sha256(texte)])
    .sort(([a], [b]) => ((a ?? "") < (b ?? "") ? -1 : 1)),
);
fichiers.set(
  "etat.json",
  `${jsonStable({
    statut: "preparation",
    avertissement: "Données d'essai, inventées.",
    date: DATE_ESSAI,
    jours: 1,
    collecte: { debut: `${DATE_ESSAI}T18:00:00.000Z`, fin: `${DATE_ESSAI}T21:00:00.000Z` },
    versions: { regles: { listes: ["2026-11-19"], as: "0.2", societes: "0.2", cdn: "0.2", methode: "0.2.1" } },
    sources: [
      { id: "iptoasn", fiche: 18, etat: "du jour", date: `${DATE_ESSAI}T00:00:00.000Z`, ageJours: 0 },
      { id: "ris-ipv4", fiche: 19, etat: "du jour", date: `${DATE_ESSAI}T00:00:00.000Z`, ageJours: 0 },
    ],
    journal: { etatInitial: true, reglesChangees: false, changements: 0 },
    sommes,
  })}\n`,
);
for (const [chemin, texte] of fichiers) {
  const cible = path.join(dossier, chemin);
  mkdirSync(path.dirname(cible), { recursive: true });
  writeFileSync(cible, texte);
}
console.log(`données d'essai : ${fichiers.size} fichiers écrits dans ${dossier}`);
