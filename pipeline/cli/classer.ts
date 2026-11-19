// Phase 2 of the collection v0: classifies the observations of mesurer.ts with the network tables, the official CDN
// range lists and the hand-kept tables of referentiels/, then computes the headline figure (decision D1).
//   npx tsx pipeline/cli/classer.ts --observations <obs.json> --iptoasn <ip2asn-combined.tsv.gz> --date-iptoasn <AAAA-MM-JJ>
//     --ris4 <riswhoisdump.IPv4.gz> --ris6 <riswhoisdump.IPv6.gz> --plages <dossier> --sortie <classement.json>
// The CDN range folder holds cloudflare-ips-v4.txt, cloudflare-ips-v6.txt and fastly-public-ip-list.json.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { gunzipSync } from "node:zlib";
import type { PlagesOfficielles, ReferentielCdn } from "../cdn";
import { chiffreTitre, classer, type Classement, type Contexte, type Perimetre } from "../classement";
import type { ObservationDns } from "../dns";
import { coucheReseau, TableIpToAsn, TableRis } from "../reseau";
import { chaineDepuisAs, type ReferentielAs, type ReferentielSocietes, validerReferentiels } from "../societes";

const { values: o } = parseArgs({
  options: {
    observations: { type: "string" },
    iptoasn: { type: "string" },
    "date-iptoasn": { type: "string" },
    ris4: { type: "string" },
    ris6: { type: "string" },
    plages: { type: "string" },
    referentiels: { type: "string", default: "referentiels" },
    sortie: { type: "string" },
  },
});
for (const cle of ["observations", "iptoasn", "date-iptoasn", "ris4", "ris6", "plages", "sortie"] as const) {
  if (o[cle] === undefined) {
    console.error(`option manquante : --${cle}`);
    process.exit(1);
  }
}
const chemin = (
  cle: "observations" | "iptoasn" | "date-iptoasn" | "ris4" | "ris6" | "plages" | "sortie" | "referentiels",
) => o[cle] ?? "";
const lireJson = <T>(fichier: string): T => JSON.parse(readFileSync(fichier, "utf8")) as T;
const gz = (fichier: string) => gunzipSync(readFileSync(fichier)).toString("utf8");

// Hand-kept tables, validated before any use.
const dossier = chemin("referentiels");
const cdn = lireJson<ReferentielCdn>(path.join(dossier, "cdn.json"));
const tableAs = lireJson<ReferentielAs>(path.join(dossier, "as-societes.json"));
const societes = lireJson<ReferentielSocietes>(path.join(dossier, "societes.json"));
const erreurs = validerReferentiels(cdn, tableAs, societes);
if (erreurs.length > 0) {
  console.error(`Tables de référence invalides :\n- ${erreurs.join("\n- ")}`);
  process.exit(1);
}

// Network tables and official CDN ranges.
const texteRis4 = gz(chemin("ris4"));
const risGenere = /generated at (.+?)\./.exec(texteRis4)?.[1] ?? "inconnue";
const iptoasn = new TableIpToAsn(gz(chemin("iptoasn")));
const ris = new TableRis([texteRis4, gz(chemin("ris6"))]);
const plages: PlagesOfficielles = {};
const dossierPlages = chemin("plages");
const lignes = (f: string) =>
  readFileSync(path.join(dossierPlages, f), "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^[0-9a-f:.]+\/\d+$/i.test(l));
if (existsSync(path.join(dossierPlages, "cloudflare-ips-v4.txt"))) {
  plages.cloudflare = {
    plages: [...lignes("cloudflare-ips-v4.txt"), ...lignes("cloudflare-ips-v6.txt")],
    source: "https://www.cloudflare.com/ips-v4 et /ips-v6",
    date: "2026-11-19",
  };
}
if (existsSync(path.join(dossierPlages, "fastly-public-ip-list.json"))) {
  const f = lireJson<{ addresses?: string[]; ipv6_addresses?: string[] }>(
    path.join(dossierPlages, "fastly-public-ip-list.json"),
  );
  plages.fastly = {
    plages: [...(f.addresses ?? []), ...(f.ipv6_addresses ?? [])],
    source: "https://api.fastly.com/public-ip-list",
    date: "2026-11-19",
  };
}
const contexte: Contexte = { iptoasn, ris, cdn, plages, tableAs, societes };

type Entree = { nom: string; perimetre: Perimetre; groupe: string; raison: string };
const obs = lireJson<{
  principal: string;
  controle: string;
  debut: string;
  resultats: { entree: Entree; principale: ObservationDns; controle: ObservationDns }[];
}>(chemin("observations"));

const domaines = obs.resultats.map(({ entree, principale, controle }) => {
  const c = classer(principale, controle, entree.perimetre, contexte);
  const serveursDeNoms = Object.entries(principale.adressesNs).map(([nom, adresse]) => {
    if (adresse === null)
      return {
        nom,
        adresse,
        asn: null,
        titulaireRegistre: null,
        societe: null,
        maisonMere: null,
        categorie: "non déterminé",
        niveau: "non déterminé",
      };
    const r = coucheReseau(adresse, iptoasn, ris);
    const asn = r.asns[0] ?? null;
    const chaine = asn === null ? null : chaineDepuisAs(asn, tableAs, societes);
    return {
      nom,
      adresse,
      asn,
      titulaireRegistre: r.descriptionAs,
      societe: chaine?.societe?.nom ?? null,
      maisonMere: chaine?.mere ? `${chaine.mere.nom} (${chaine.mere.pays})` : null,
      categorie: chaine?.categorie ?? "non déterminé",
      niveau: chaine?.niveau ?? "non déterminé",
    };
  });
  return {
    ...c,
    groupe: entree.groupe,
    raison: entree.raison,
    heure: principale.heure,
    resolveur: principale.resolveur,
    chaineCname: principale.chaineCname,
    zone: principale.zone,
    serveursDeNoms,
  };
});

const etat = (c: Classement) => c.perimetre === "État";
const sortie = {
  etiquette: "échantillon : ne pas citer",
  genere_le: new Date().toISOString(),
  methode: "docs/methode.md, version 0.2",
  sources: {
    resolveurs: { principal: obs.principal, controle: obs.controle, mesure_le: obs.debut },
    iptoasn: { fichier: path.basename(chemin("iptoasn")), date: chemin("date-iptoasn"), licence: "PDDL 1.0" },
    ris: { genere_le: risGenere, usage: "contrôle seulement, rien n'est republié" },
    plages_cdn: Object.fromEntries(
      Object.entries(plages).map(([id, p]) => [id, { source: p.source, date: p.date, nombre: p.plages.length }]),
    ),
    referentiels: { cdn: cdn.version, as: tableAs.version, societes: societes.version },
  },
  chiffre: chiffreTitre(domaines),
  sous_chiffre_gouv_fr: chiffreTitre(domaines, (c) => c.nom.endsWith(".gouv.fr")),
  domaines,
};
writeFileSync(chemin("sortie"), JSON.stringify(sortie, null, 2) + "\n", "utf8");

const court = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s).padEnd(n);
for (const d of domaines) {
  const servants = d.servants
    .map(
      (s) =>
        `${s.role} ${s.chaine.societe?.nom ?? s.preuve} → ${s.chaine.mere ? `${s.chaine.mere.nom} (${s.chaine.mere.pays})` : "?"}`,
    )
    .join(" ; ");
  const horsUE = d.horsUE === null ? "?" : d.horsUE ? "oui" : "non";
  console.log(
    `${etat(d) ? "É" : " "} ${court(d.nom, 36)} ${court(servants || d.statut, 92)} ${court(d.categorie, 15)} hors UE : ${horsUE.padEnd(3)} ${d.niveau}`,
  );
}
const f = sortie.chiffre;
console.log(
  `\nChiffre-titre (échantillon : ne pas citer) : au moins ${f.auMoinsPourcent} % des ${f.domaines} domaines « État » dépendent d'une société dont la maison mère est hors de l'UE (${f.horsUEConfirme} confirmés) ; probable : ${f.probablePourcent} % (${f.horsUEProbable}) ; non déterminé : ${f.nonDeterminePourcent} % (${f.nonDetermine}).`,
);
const g = sortie.sous_chiffre_gouv_fr;
console.log(
  `Sous-chiffre .gouv.fr : au moins ${g.auMoinsPourcent} % des ${g.domaines} domaines ; probable : ${g.probablePourcent} % ; non déterminé : ${g.nonDeterminePourcent} %.`,
);
