// The monthly archive (brief B.8 and F.2):
//   npx tsx pipeline/cli/archiver.ts --donnees <dir> --veille <dir> --mois AAAA-MM --sortie <dir>
// The published state of the last day (the « donnees » branch) with what the daily fragments leave out: each name's
// exact addresses and their TTL, from the last collection's observations (the Actions cache). Two compressed files,
// JSON and CSV, both marked « en préparation » until the opening; nothing from a « control only » source (RIS).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { gunzipSync, gzipSync } from "node:zlib";
import { adressesExactes } from "../archive";
import type { MesureNom } from "../mesure";
import type { EnregistrementDomaine, EnregistrementNom } from "../publication";

const { values: o } = parseArgs({
  options: {
    donnees: { type: "string" },
    veille: { type: "string" },
    mois: { type: "string" },
    sortie: { type: "string" },
  },
});

function lireFragments<T>(dossier: string, sorte: "noms" | "domaines"): T[] {
  const racine = path.join(dossier, sorte);
  if (!existsSync(racine)) return [];
  return readdirSync(racine).flatMap((haut) =>
    readdirSync(path.join(racine, haut))
      .filter((f) => /^[0-9a-f]{2}(\.\d+)?\.json$/.test(f))
      .flatMap(
        (f) => (JSON.parse(readFileSync(path.join(racine, haut, f), "utf8")) as Record<string, T[]>)[sorte] ?? [],
      ),
  );
}

const champ = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function principal(): void {
  const { donnees, veille, mois, sortie } = o;
  if (
    donnees === undefined ||
    veille === undefined ||
    sortie === undefined ||
    mois === undefined ||
    !/^\d{4}-\d{2}$/.test(mois)
  ) {
    throw new Error("options : --donnees <dossier> --veille <dossier> --mois AAAA-MM --sortie <dossier>");
  }
  const etat = JSON.parse(readFileSync(path.join(donnees, "etat.json"), "utf8")) as { date: string };
  // The archive of a month holds a day of that month, never the next one's (brief B.8).
  if (!etat.date.startsWith(`${mois}-`)) throw new Error(`l'état publié est du ${etat.date}, hors du mois ${mois}`);
  const observations = JSON.parse(
    gunzipSync(readFileSync(path.join(veille, "observations.json.gz"))).toString("utf8"),
  ) as {
    date: string;
    noms: [string, MesureNom][];
  };
  // The exact addresses come from the observations of the published day only: when the kept measurement is of
  // another day (one stopped by the circuit breaker, or not published), the archive gives none rather than mix days.
  const memeJour = observations.date === etat.date;
  const exactes = new Map(memeJour ? observations.noms : []);
  const noms = lireFragments<EnregistrementNom>(donnees, "noms").sort((a, b) => (a.nom < b.nom ? -1 : 1));
  const domaines = lireFragments<EnregistrementDomaine>(donnees, "domaines").sort((a, b) =>
    a.domaine < b.domaine ? -1 : 1,
  );
  // A record held back by the hysteresis (an earlier day's content) gets none either (pipeline/archive.ts).
  const adresses = (n: EnregistrementNom) => adressesExactes(n, exactes.get(n.nom));
  const avertissement = "En préparation : le site n'est pas encore ouvert ; ne pas citer avant l'ouverture.";
  mkdirSync(sortie, { recursive: true });
  writeFileSync(
    path.join(sortie, `donnees-${mois}.json.gz`),
    gzipSync(
      JSON.stringify({
        statut: "preparation",
        avertissement,
        mois,
        etatDu: etat.date,
        observationsDu: memeJour ? observations.date : null,
        noms: noms.map((n) => ({ ...n, adressesExactes: adresses(n) })),
        domaines,
      }),
    ),
  );
  const lignes = [
    `# ${avertissement}`,
    "nom,domaine,etat,adresses,ttl_minimal,as,exploitants,categorie,hors_ue,niveau,famille_en_echec",
    ...noms.map((n) => {
      const a = adresses(n);
      return [
        n.nom,
        n.domaine,
        n.etat,
        a.map((x) => x.adresse).join(" "),
        a.length === 0 ? "" : String(Math.min(...a.map((x) => x.ttl))),
        [...new Set(n.reseaux.map((r) => r.as))].join(" "),
        [...new Set(n.exploitants.map((e) => e.societe ?? e.preuve))].join(" "),
        n.categorie,
        String(n.horsUE),
        n.niveau,
        n.familleEnEchec ?? "",
      ]
        .map(champ)
        .join(",");
    }),
  ];
  writeFileSync(path.join(sortie, `donnees-${mois}.csv.gz`), gzipSync(`${lignes.join("\n")}\n`));
  console.log(
    `archives : ${noms.length} noms, ${domaines.length} domaines (état du ${etat.date})` +
      (memeJour ? "." : ` ; observations du ${observations.date} : sans les adresses exactes.`),
  );
}

principal();
