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
  sha256,
} from "../pipeline/publication";

const [dossier] = process.argv.slice(2);
if (dossier === undefined) throw new Error("usage : npx tsx scripts/donnees-essai.ts <dossier>");

const DATE_ESSAI = "2026-11-21";
const MINISTERE = "00000000-0000-4000-8000-000000000001";

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
  reseaux: [{ as: societe === "cdn-us" ? 64500 : 64496, plage: "192.0.2.0-192.0.2.255" }],
  cdn: role === "diffusé par" ? { id: "cloudflare", methode: "cname" } : null,
  exploitants: societe === null ? [] : [{ role, societe, preuve: "AS64496", niveau: "probable" }],
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
    ["mairie.example", domaine("mairie.example", "hors État", [])],
  ]),
  noms: new Map([
    ["www.service.example", nom("www.service.example", "service.example", "hebergeur-fr", "hébergé par", "France")],
    ["www.nuage.example", nom("www.nuage.example", "nuage.example", "cdn-us", "diffusé par", "hors d'Europe")],
    ["www.mairie.example", nom("www.mairie.example", "mairie.example", null, "hébergé par", "non déterminé")],
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
    ]),
    societes: new Map([
      [
        "hebergeur-fr",
        { nom: "Hébergeur Exemple", pays: "FR", mere: "hebergeur-fr", paysMere: "FR", categorie: "France" },
      ],
      ["cdn-us", { nom: "CDN Exemple, Inc.", pays: "US", mere: "cdn-us", paysMere: "US", categorie: "hors d'Europe" }],
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
