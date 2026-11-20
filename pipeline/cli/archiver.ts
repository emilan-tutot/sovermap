// The monthly archive (brief B.8 and F.2):
//   npx tsx pipeline/cli/archiver.ts --donnees <dir> --veille <dir> --mois AAAA-MM --sortie <dir>
// The published state of the last day (the « donnees » branch) with what the daily fragments leave out: each name's
// exact addresses and their TTL, from the last collection's observations (the Actions cache). Two compressed files,
// JSON and CSV, both marked « en préparation » until the opening; nothing from a « control only » source (RIS).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { gunzipSync, gzipSync } from "node:zlib";
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
      .filter((f) => /^[0-9a-f]{2}\.json$/.test(f))
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
  const observations = JSON.parse(
    gunzipSync(readFileSync(path.join(veille, "observations.json.gz"))).toString("utf8"),
  ) as {
    date: string;
    noms: [string, MesureNom][];
  };
  const exactes = new Map(observations.noms);
  const noms = lireFragments<EnregistrementNom>(donnees, "noms").sort((a, b) => (a.nom < b.nom ? -1 : 1));
  const domaines = lireFragments<EnregistrementDomaine>(donnees, "domaines").sort((a, b) =>
    a.domaine < b.domaine ? -1 : 1,
  );
  const adresses = (n: string) => {
    const m = exactes.get(n);
    return m === undefined ? [] : [...m.a, ...m.aaaa];
  };
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
        observationsDu: observations.date,
        noms: noms.map((n) => ({ ...n, adressesExactes: adresses(n.nom) })),
        domaines,
      }),
    ),
  );
  const lignes = [
    `# ${avertissement}`,
    "nom,domaine,etat,adresses,ttl_minimal,as,exploitants,categorie,hors_ue,niveau",
    ...noms.map((n) => {
      const a = adresses(n.nom);
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
      ]
        .map(champ)
        .join(",");
    }),
  ];
  writeFileSync(path.join(sortie, `donnees-${mois}.csv.gz`), gzipSync(`${lignes.join("\n")}\n`));
  console.log(`archives : ${noms.length} noms, ${domaines.length} domaines (état du ${etat.date}).`);
}

principal();
