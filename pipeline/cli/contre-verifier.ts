// The cross-check of a published state by an independent path (brief C.9; docs/contre-verification.md), run from a
// person's computer, never on the collection's runners: 30 domains drawn by strata (pipeline/contre-verification.ts),
// then their layers asked again elsewhere:
// - the web name's CNAME chain, the domain's name servers and mail exchangers, by the computer's own resolver (never
//   the collection's: another resolver, on another network), a quarter of a second between two questions;
// - the AS of the web name's IPv4 addresses by Team Cymru (DNS, card 24: 100 questions a day at most) and by RIPEstat
//   (card 20: 140 requests a day at most); both are kept for control only: the report says whether they agree, never
//   what they answer;
// - a CDN by the provider's documented suffixes and AS (referentiels/cdn.json);
// - an operator's ultimate parent by GLEIF (card 31), when the company has a LEI.
// Writes <sortie>/resultats.json and <sortie>/contre-verification.md, a draft whose disagreements are explained by hand.
//   npx tsx pipeline/cli/contre-verifier.ts --donnees <a checkout of « donnees »> --sortie <folder> [--limite N]
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { Resolver } from "node:dns/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  type Controle,
  comparerAs,
  comparerNoms,
  partConcordante,
  STRATES,
  type Tire,
  tirer,
} from "../contre-verification";
import type { EnregistrementDomaine, EnregistrementNom } from "../publication";
import { agentUtilisateur, Telechargeur } from "../sources";

const RACINE = process.cwd();
const { values: o } = parseArgs({
  options: { donnees: { type: "string" }, sortie: { type: "string" }, limite: { type: "string" } },
});
if (o.donnees === undefined || o.sortie === undefined) {
  throw new Error("usage : npx tsx pipeline/cli/contre-verifier.ts --donnees <dossier> --sortie <dossier>");
}
const BUDGET_CYMRU = 100;
const BUDGET_RIPESTAT = 140;
const SOURCES_CONTROLE = new Set(["Team Cymru", "RIPEstat"]);

/** The published state of a checkout of « donnees »: its records, and its day. */
function lireEtat(dossier: string) {
  const etat = JSON.parse(readFileSync(path.join(dossier, "etat.json"), "utf8")) as { date: string };
  const noms = new Map<string, EnregistrementNom>();
  const domaines = new Map<string, EnregistrementDomaine>();
  for (const sorte of ["noms", "domaines"] as const) {
    const racine = path.join(dossier, sorte);
    if (!existsSync(racine)) continue;
    for (const haut of readdirSync(racine)) {
      for (const f of readdirSync(path.join(racine, haut))) {
        if (!/^[0-9a-f]{2}(\.\d+)?\.json$/.test(f)) continue;
        const contenu = JSON.parse(readFileSync(path.join(racine, haut, f), "utf8")) as Record<string, unknown[]>;
        for (const e of contenu[sorte] ?? []) {
          if (sorte === "noms") noms.set((e as EnregistrementNom).nom, e as EnregistrementNom);
          else domaines.set((e as EnregistrementDomaine).domaine, e as EnregistrementDomaine);
        }
      }
    }
  }
  return { date: etat.date, noms, domaines };
}

type Fournisseur = { id: string; suffixes: { suffixe: string }[]; as: { numero: number }[] };
type SocieteRef = { nom: string; mere: string | null; lei?: string };
const cdn = JSON.parse(readFileSync(path.join(RACINE, "referentiels/cdn.json"), "utf8")) as {
  fournisseurs: Fournisseur[];
};
const societes = JSON.parse(readFileSync(path.join(RACINE, "referentiels/societes.json"), "utf8")) as {
  societes: Record<string, SocieteRef>;
};

const resolveur = new Resolver();
const pause = () => new Promise((r) => setTimeout(r, 250));
const telechargeur = new Telechargeur({ agent: agentUtilisateur(process.env["npm_package_version"] ?? "0.1.0") });
let cymru = 0;
let ripestat = 0;

/** A DNS question by the computer's own resolver: its answer, or null when the name has none or does not answer. */
async function demander<T>(question: () => Promise<T>): Promise<T | null> {
  await pause();
  try {
    return await question();
  } catch {
    return null;
  }
}

/** The CNAME chain from a name, link by link (ten at most). */
async function chaine(nom: string): Promise<string[]> {
  const liens: string[] = [];
  let courant = nom;
  for (let i = 0; i < 10; i += 1) {
    const cible = (await demander(() => resolveur.resolveCname(courant)))?.[0];
    if (cible === undefined) break;
    liens.push(cible.toLowerCase());
    courant = cible;
  }
  return liens;
}

/** The origin AS of an IPv4 address by Team Cymru's DNS interface, within its budget. */
async function asCymru(ip: string): Promise<number[] | null> {
  if (cymru >= BUDGET_CYMRU) return null;
  cymru += 1;
  const txt = await demander(() => resolveur.resolveTxt(`${ip.split(".").reverse().join(".")}.origin.asn.cymru.com`));
  const champ = txt?.[0]?.join("").split("|")[0]?.trim() ?? "";
  const as = champ
    .split(/\s+/)
    .filter((a) => /^\d+$/.test(a))
    .map(Number);
  return as.length === 0 ? null : as;
}

/** The origin AS of an IPv4 address by RIPEstat (network-info), within its budget. */
async function asRipestat(ip: string): Promise<number[] | null> {
  if (ripestat >= BUDGET_RIPESTAT) return null;
  ripestat += 1;
  try {
    const r = await telechargeur.obtenir(
      `https://stat.ripe.net/data/network-info/data.json?resource=${encodeURIComponent(ip)}&sourceapp=sovermap`,
    );
    if (r.statut !== 200) return null;
    const asns = (JSON.parse(r.corps.toString("utf8")) as { data?: { asns?: unknown[] } }).data?.asns ?? [];
    const as = asns.map(Number).filter((a) => Number.isSafeInteger(a) && a > 0);
    return as.length === 0 ? null : as;
  } catch {
    return null;
  }
}

/** The LEI of a company's ultimate parent according to GLEIF; « aucun » when it reports none; null when unknown. */
async function parentGleif(lei: string): Promise<string | null> {
  try {
    const r = await telechargeur.obtenir(
      `https://api.gleif.org/api/v1/lei-records/${lei}/ultimate-parent-relationship`,
    );
    if (r.statut === 404) return "aucun";
    if (r.statut !== 200) return null;
    const corps = JSON.parse(r.corps.toString("utf8")) as {
      data?: { attributes?: { relationship?: { endNode?: { id?: string } } } };
    };
    return corps.data?.attributes?.relationship?.endNode?.id ?? null;
  } catch {
    return null;
  }
}

/** The top of a company's chain in the referential, and its LEI. */
function sommet(cle: string): { cle: string; lei: string | null } {
  let courant = cle;
  for (let i = 0; i < 10; i += 1) {
    const mere = societes.societes[courant]?.mere;
    if (mere === null || mere === undefined || mere === courant || mere === "non-determinee") break;
    courant = mere;
  }
  return { cle: courant, lei: societes.societes[courant]?.lei ?? null };
}

async function verifier(t: Tire): Promise<Controle[]> {
  const { domaine: d, web } = t;
  const controles: Controle[] = [];
  const ajouter = (couche: string, verdict: Controle["verdict"], publie: string, independant: string, source: string) =>
    controles.push({ couche, verdict, publie, independant, source });

  const liens = await chaine(web.nom);
  ajouter("chaîne CNAME", comparerNoms(web.cname, liens), web.cname.join(" → "), liens.join(" → "), "résolveur du PC");
  const ns = await demander(() => resolveur.resolveNs(d.domaine));
  ajouter(
    "serveurs de noms",
    comparerNoms(d.zone.ns, ns),
    d.zone.ns.join(", "),
    (ns ?? []).join(", "),
    "résolveur du PC",
  );
  if (d.messagerie.etat === "ok") {
    const mx = await demander(() => resolveur.resolveMx(d.domaine));
    const publies = d.messagerie.mx.map((m) => m.hote);
    const trouves = mx?.map((m) => m.exchange) ?? null;
    ajouter(
      "messagerie (MX)",
      comparerNoms(publies, trouves),
      publies.join(", "),
      (trouves ?? []).join(", "),
      "résolveur du PC",
    );
  }
  const adresses = (await demander(() => resolveur.resolve4(web.nom))) ?? [];
  const publies = [...new Set(web.reseaux.map((r) => r.as))];
  for (const [source, chercher] of [
    ["Team Cymru", asCymru],
    ["RIPEstat", asRipestat],
  ] as const) {
    const trouves: number[] = [];
    let complet = adresses.length > 0;
    for (const ip of adresses.slice(0, 2)) {
      const as = await chercher(ip);
      if (as === null) complet = false;
      else trouves.push(...as);
    }
    ajouter(`réseau (AS)`, complet ? comparerAs(publies, trouves) : "non vérifiable", publies.join(", "), "", source);
  }
  if (web.cdn !== null) {
    const f = cdn.fournisseurs.find((x) => x.id === web.cdn?.id);
    const parSuffixe = f?.suffixes.some((s) => liens.some((l) => l.endsWith(s.suffixe.replace(/^\./, "")))) ?? false;
    ajouter(
      "CDN",
      f === undefined ? "non vérifiable" : parSuffixe ? "concorde" : "diffère",
      web.cdn.id,
      parSuffixe ? "suffixe documenté dans la chaîne" : "aucun suffixe documenté dans la chaîne",
      "documentation du fournisseur",
    );
  }
  for (const e of web.exploitants) {
    if (e.societe === null) continue;
    const lei = societes.societes[e.societe]?.lei;
    const haut = sommet(e.societe);
    if (lei === undefined) {
      ajouter(`maison mère de ${e.societe}`, "non vérifiable", haut.cle, "pas de LEI", "GLEIF");
      continue;
    }
    const parent = await parentGleif(lei);
    const verdict =
      parent === null
        ? "non vérifiable"
        : parent === "aucun"
          ? haut.cle === e.societe
            ? "concorde"
            : "diffère"
          : parent === haut.lei
            ? "concorde"
            : "diffère";
    ajouter(`maison mère de ${e.societe}`, verdict, haut.cle, parent ?? "", "GLEIF");
  }
  return controles;
}

const etat = lireEtat(o.donnees);
const graine = Number(etat.date.replaceAll("-", ""));
// --limite N: the first N domains of the draw only (a trial of the tool, within the day's budgets).
const tires = tirer(etat.domaines, etat.noms, graine).slice(0, o.limite === undefined ? undefined : Number(o.limite));
const resultats: { domaine: string; strate: string; controles: Controle[] }[] = [];
for (const t of tires) {
  console.log(`contre-vérification : ${t.domaine.domaine} (${t.strate})`);
  resultats.push({ domaine: t.domaine.domaine, strate: t.strate, controles: await verifier(t) });
}

const tous = resultats.flatMap((r) => r.controles);
const { concordent, verifies, part } = partConcordante(tous);
const montrer = (c: Controle) => (SOURCES_CONTROLE.has(c.source) ? "" : c.independant);
mkdirSync(o.sortie, { recursive: true });
writeFileSync(
  path.join(o.sortie, "resultats.json"),
  `${JSON.stringify({ date: etat.date, graine, resultats }, null, 2)}\n`,
);
const lignes = [
  `# Contre-vérification de l'état du ${etat.date} (C.9)`,
  "",
  `Tirage : graine ${graine} (le jour de l'état), ${STRATES.map((s) => `${s.nombre} « ${s.strate} »`).join(", ")}.`,
  `Résultat : ${concordent} couches concordent sur ${verifies} vérifiées${part === null ? "" : ` (${(part * 100).toFixed(1)} %)`} ; ${tous.length - verifies} non vérifiables.`,
  `Questions : Team Cymru ${cymru} (au plus ${BUDGET_CYMRU}), RIPEstat ${ripestat} (au plus ${BUDGET_RIPESTAT}).`,
  "",
  "| Domaine | Strate | Couche | Verdict | Publié | Trouvé ailleurs | Source |",
  "|---|---|---|---|---|---|---|",
  ...resultats.flatMap((r) =>
    r.controles.map(
      (c) => `| ${r.domaine} | ${r.strate} | ${c.couche} | ${c.verdict} | ${c.publie} | ${montrer(c)} | ${c.source} |`,
    ),
  ),
  "",
];
writeFileSync(path.join(o.sortie, "contre-verification.md"), `${lignes.join("\n")}\n`);
console.log(
  `contre-vérification : ${concordent} / ${verifies} couches concordent ; Cymru ${cymru}, RIPEstat ${ripestat}.`,
);
