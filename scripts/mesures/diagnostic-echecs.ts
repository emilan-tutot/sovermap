// A degraded run or trial (the owner's answer to point 17, § 3): its failing domains (its artifact's diagnostic.json),
// sorted by the operator of their zone's name servers, by the question that failed, by parent zone, and by what serves
// their web name (its CNAME target's zone and its operator, from the run's own records, which keep the published day's
// values for a failed name: trap 65). Does one operator hold the failures? Local files only; asks nothing.
//   npx tsx scripts/mesures/diagnostic-echecs.ts <dossier du fichier joint décompressé> [premiers=12]
import { readFileSync } from "node:fs";
import path from "node:path";
import { chaine, type Fiche, liste, lireFiches, objet } from "./etat-publie";

const [dossier = ".", premiersTexte = "12"] = process.argv.slice(2);
const premiers = Math.max(1, Number(premiersTexte) || 12);
const diagnostic = objet(JSON.parse(readFileSync(path.join(dossier, "diagnostic.json"), "utf8")));
if (diagnostic === null) throw new Error("diagnostic.json illisible");
const domaines = lireFiches(path.join(dossier, "sortie"), "domaines");
const noms = lireFiches(path.join(dossier, "sortie"), "noms");

type Comptes = Map<string, number>;
const ajouter = (m: Comptes, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
const chaines = (v: unknown): string[] =>
  liste(v).flatMap((e) => {
    const s = chaine(e);
    return s === null ? [] : [s];
  });
const parent = (d: string) => d.split(".").slice(1).join(".") || ".";
const zoneDe = (hote: string) => hote.split(".").slice(-2).join(".");

/** The operators of records that carry « exploitants » (a company, else its proof), or « (inconnu) ». */
function exploitantsDe(porteurs: readonly unknown[]): string[] {
  const ops = new Set<string>();
  for (const p of porteurs) {
    for (const e of liste(objet(p)?.["exploitants"])) {
      const nom = chaine(objet(e)?.["societe"]) ?? chaine(objet(e)?.["preuve"]);
      if (nom !== null) ops.add(nom);
    }
  }
  return ops.size === 0 ? ["(inconnu)"] : [...ops];
}
const exploitantsNs = (d: Fiche | undefined) => exploitantsDe(liste(objet(d?.["serveursDeNoms"])?.["hotes"]));
const exploitantsWeb = (n: Fiche | undefined) => exploitantsDe(n === undefined ? [] : [n]);
function cibleWeb(n: Fiche | undefined): string {
  const cnames = chaines(n?.["cname"]);
  const fin = cnames[cnames.length - 1];
  return fin === undefined ? "(sans CNAME)" : zoneDe(fin);
}
const comptes = () => ({
  ns: new Map<string, number>(),
  parent: new Map<string, number>(),
  cible: new Map<string, number>(),
  web: new Map<string, number>(),
});

// The denominators: every domain of the run, by the same keys.
const tous = comptes();
for (const d of domaines.values()) {
  const web = noms.get(chaine(d["nomWeb"]) ?? "");
  for (const o of exploitantsNs(d)) ajouter(tous.ns, o);
  ajouter(tous.parent, parent(chaine(d["domaine"]) ?? ""));
  ajouter(tous.cible, cibleWeb(web));
  for (const o of exploitantsWeb(web)) ajouter(tous.web, o);
}

const enEchec = comptes();
const parQuestion: Comptes = new Map();
const lignes = liste(diagnostic["domaines"]).flatMap((l) => {
  const o = objet(l);
  return o === null ? [] : [o];
});
for (const l of lignes) {
  const domaine = chaine(l["domaine"]) ?? "";
  const web = noms.get(chaine(l["nomWeb"]) ?? "");
  // The run's own view of the zone's servers (their operators), else the published one.
  const duJour = liste(l["serveursDeNoms"]);
  const ops = duJour.length > 0 ? [...new Set(duJour.flatMap((h) => chaines(objet(h)?.["exploitants"])))] : [];
  for (const o of ops.length > 0 ? ops : exploitantsNs(domaines.get(domaine))) ajouter(enEchec.ns, o);
  ajouter(enEchec.parent, parent(domaine));
  const echecWeb = chaine(l["web"]);
  if (echecWeb !== null) {
    ajouter(enEchec.cible, cibleWeb(web));
    for (const o of exploitantsWeb(web)) ajouter(enEchec.web, o);
    ajouter(parQuestion, `nom web (A, AAAA) ${echecWeb}`);
  }
  const echecZone = chaine(l["zone"]);
  if (echecZone !== null) ajouter(parQuestion, `zone (NS, SOA) ${echecZone}`);
  if (l["messagerie"] === true) ajouter(parQuestion, "messagerie (MX)");
}

const essai = diagnostic["essai"] === true ? " (essai)" : "";
console.log(`date ${chaine(diagnostic["date"]) ?? "?"}${essai} : ${lignes.length} domaines en échec sur ${domaines.size}`);
console.log("\npar question en échec :");
for (const [k, n] of [...parQuestion].sort((a, b) => b[1] - a[1])) console.log(`  ${n}\t${k}`);
function tableau(titre: string, echecs: Comptes, denominateurs: Comptes): void {
  console.log(`\n${titre} (échecs / domaines, part) :`);
  for (const [k, n] of [...echecs].sort((a, b) => b[1] - a[1]).slice(0, premiers)) {
    const de = denominateurs.get(k) ?? 0;
    console.log(`  ${n}\t/ ${de}\t${de === 0 ? "?" : ((100 * n) / de).toFixed(1)} %\t${k}`);
  }
}
tableau("par exploitant des serveurs de noms", enEchec.ns, tous.ns);
tableau("par zone parente", enEchec.parent, tous.parent);
tableau("noms web en échec, par zone de leur cible CNAME", enEchec.cible, tous.cible);
tableau("noms web en échec, par exploitant de leurs adresses (valeurs du jour publié)", enEchec.web, tous.web);
