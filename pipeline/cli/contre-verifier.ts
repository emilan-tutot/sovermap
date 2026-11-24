// The cross-check of a published state by an independent path (brief C.9; docs/contre-verification.md), run from a
// person's computer, never on the collection's runners: 30 domains drawn by strata (pipeline/contre-verification.ts),
// then their layers asked again elsewhere:
// - the web name's CNAME chain, the domain's name servers and mail exchangers, by the computer's own resolver (never
//   the collection's: another resolver, on another network), a quarter of a second between two questions; a question
//   that fails (a time limit, a server failure) makes its layer « non vérifiable », never « concorde »;
// - the AS of the web name's IPv4 addresses by Team Cymru (DNS, card 24: 100 questions a day at most, counted in a file
//   of the output folder for the whole day), kept for control only: the report says whether it agrees, never what it
//   answers. RIPEstat is no longer asked: it rests on RIS, which the collection already uses (the review of C.9);
// - a CDN by the provider's documented suffixes and AS (referentiels/cdn.json);
// - each operator's ultimate parent by GLEIF (card 31), when the company has a LEI, once per company: the category of
//   its country against the one the state publishes (index/exploitants.json), never one computed again here.
// Writes <sortie>/resultats.json and <sortie>/contre-verification.md, a draft whose disagreements are explained by hand;
// both name the state's commit, so that anyone can draw the same domains again.
//   npx tsx pipeline/cli/contre-verifier.ts --donnees <a checkout of « donnees »> --sortie <folder> [--limite N]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { Resolver } from "node:dns/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  type Controle,
  comparerAs,
  comparerCategorie,
  comparerNoms,
  partConcordante,
  STRATES,
  type Tire,
  tirer,
} from "../contre-verification";
import type { EnregistrementDomaine, EnregistrementNom } from "../publication";
import { categorie } from "../societes";
import { agentUtilisateur, Telechargeur } from "../sources";

const RACINE = process.cwd();
const { values: o } = parseArgs({
  options: { donnees: { type: "string" }, sortie: { type: "string" }, limite: { type: "string" } },
});
if (o.donnees === undefined || o.sortie === undefined) {
  throw new Error("usage : npx tsx pipeline/cli/contre-verifier.ts --donnees <dossier> --sortie <dossier>");
}
if (o.limite !== undefined && !/^[1-9]\d*$/.test(o.limite)) {
  throw new Error(`--limite : un nombre entier de domaines, au moins 1 (reçu « ${o.limite} »)`);
}
const BUDGET_CYMRU = 100;
const SOURCES_CONTROLE = new Set(["Team Cymru"]);
/** A LEI (ISO 17442): what GLEIF answers is checked before it is used in an address or the report. */
const LEI = /^[A-Z0-9]{18}[0-9]{2}$/;

/** What the state publishes of each company: the category of its chain, its ultimate parent and that one's country. */
type ExploitantPublie = { categorie?: string; mere?: string | null; paysMere?: string | null };

/** The published state of a checkout of « donnees »: its records, its operators' index, its day and its commit. */
function lireEtat(dossier: string) {
  const etat = JSON.parse(readFileSync(path.join(dossier, "etat.json"), "utf8")) as { date: string };
  const index = path.join(dossier, "index", "exploitants.json");
  const exploitants = existsSync(index)
    ? (JSON.parse(readFileSync(index, "utf8")) as Record<string, ExploitantPublie>)
    : {};
  const commit = execFileSync("git", ["-C", dossier, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
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
  return { date: etat.date, noms, domaines, exploitants, commit };
}

type Fournisseur = { id: string; suffixes: { suffixe: string }[]; as: { numero: number }[] };
type SocieteRef = { nom: string; pays?: string; mere: string | null; lei?: string };
const cdn = JSON.parse(readFileSync(path.join(RACINE, "referentiels/cdn.json"), "utf8")) as {
  fournisseurs: Fournisseur[];
};
const societes = JSON.parse(readFileSync(path.join(RACINE, "referentiels/societes.json"), "utf8")) as {
  societes: Record<string, SocieteRef>;
};

const resolveur = new Resolver();
const pause = () => new Promise((r) => setTimeout(r, 250));
const telechargeur = new Telechargeur({ agent: agentUtilisateur(process.env["npm_package_version"] ?? "0.1.0") });

/**
 * Team Cymru's questions of the day (UTC), kept in a file of the output folder: a second run the same day, with the
 * same folder, goes on counting, so that the day never exceeds the card's 100 questions (the review of C.9).
 */
const jourUtc = new Date().toISOString().slice(0, 10);
const fichierBudget = path.join(o.sortie, `questions-${jourUtc}.json`);
let cymru = existsSync(fichierBudget)
  ? Number((JSON.parse(readFileSync(fichierBudget, "utf8")) as { cymru?: unknown }).cymru) || 0
  : 0;
const noterBudget = () => {
  mkdirSync(o.sortie ?? ".", { recursive: true });
  writeFileSync(fichierBudget, `${JSON.stringify({ cymru })}\n`);
};

/** No such data, or no such name: an answer (an empty list), never a failure. */
const REPONSES_VIDES = new Set(["ENODATA", "ENOTFOUND"]);

/**
 * A DNS question by the computer's own resolver: its answer; an empty list when the name has no such data or does not
 * exist (an answer); null when the question failed (a time limit, a server failure, a refusal): its layer is then
 * « non vérifiable », never « concorde » (the review of C.9).
 */
async function demander<T>(question: () => Promise<T[]>): Promise<T[] | null> {
  await pause();
  try {
    return await question();
  } catch (e) {
    return REPONSES_VIDES.has((e as { code?: unknown }).code as string) ? [] : null;
  }
}

/** The CNAME chain from a name, link by link (ten at most); null when one of its questions failed. */
async function chaine(nom: string): Promise<string[] | null> {
  const liens: string[] = [];
  let courant = nom;
  for (let i = 0; i < 10; i += 1) {
    const reponse = await demander(() => resolveur.resolveCname(courant));
    if (reponse === null) return null;
    const cible = reponse[0];
    if (cible === undefined) break;
    liens.push(cible.toLowerCase());
    courant = cible;
  }
  return liens;
}

/** The origin AS of an IPv4 address by Team Cymru's DNS interface, within the day's budget; null when unknown. */
async function asCymru(ip: string): Promise<number[] | null> {
  if (cymru >= BUDGET_CYMRU) return null;
  cymru += 1;
  noterBudget();
  const txt = await demander(() => resolveur.resolveTxt(`${ip.split(".").reverse().join(".")}.origin.asn.cymru.com`));
  const champ = txt?.[0]?.join("").split("|")[0]?.trim() ?? "";
  const as = champ
    .split(/\s+/)
    .filter((a) => /^\d+$/.test(a))
    .map(Number);
  return as.length === 0 ? null : as;
}

/** One answer per address: GLEIF is asked once for each LEI, whatever the number of domains. */
const memoire = new Map<string, Promise<unknown>>();
const uneFois = <T>(cle: string, question: () => Promise<T>): Promise<T> => {
  if (!memoire.has(cle)) memoire.set(cle, question());
  return memoire.get(cle) as Promise<T>;
};

/** The LEI of a company's ultimate parent according to GLEIF; « aucun » when it reports none; null when unknown. */
const parentGleif = (lei: string): Promise<string | null> =>
  uneFois(`parent:${lei}`, async () => {
    try {
      const r = await telechargeur.obtenir(
        `https://api.gleif.org/api/v1/lei-records/${lei}/ultimate-parent-relationship`,
      );
      if (r.statut === 404) return "aucun";
      if (r.statut !== 200) return null;
      const corps = JSON.parse(r.corps.toString("utf8")) as {
        data?: { attributes?: { relationship?: { endNode?: { id?: unknown } } } };
      };
      // A received datum: used only if it is a LEI (in an address, then in the report).
      const id = corps.data?.attributes?.relationship?.endNode?.id;
      return typeof id === "string" && LEI.test(id) ? id : null;
    } catch {
      return null;
    }
  });

/** The country of a legal entity's registered address according to GLEIF; null when unknown. */
const paysGleif = (lei: string): Promise<string | null> =>
  uneFois(`pays:${lei}`, async () => {
    try {
      const r = await telechargeur.obtenir(`https://api.gleif.org/api/v1/lei-records/${lei}`);
      if (r.statut !== 200) return null;
      const corps = JSON.parse(r.corps.toString("utf8")) as {
        data?: { attributes?: { entity?: { legalAddress?: { country?: string } } } };
      };
      const pays = corps.data?.attributes?.entity?.legalAddress?.country ?? null;
      return pays !== null && /^[A-Z]{2}$/.test(pays) ? pays : null;
    } catch {
      return null;
    }
  });

/** The companies whose ultimate parent was checked already: one check per company, whatever its domains. */
const societesVerifiees = new Set<string>();

async function verifier(t: Tire, exploitants: Readonly<Record<string, ExploitantPublie>>): Promise<Controle[]> {
  const { domaine: d, web } = t;
  const controles: Controle[] = [];
  const ajouter = (couche: string, verdict: Controle["verdict"], publie: string, independant: string, source: string) =>
    controles.push({ couche, verdict, publie, independant, source });
  // A record too large for its fragment keeps the first of its sorted lists only: compared by inclusion.
  const ecourte = (tronque: boolean) => (tronque ? " (liste écourtée dans la fiche publiée)" : "");

  const liens = await chaine(web.nom);
  ajouter(
    "chaîne CNAME",
    comparerNoms(web.cname, liens, web.tronque === true),
    web.cname.join(" → ") + ecourte(web.tronque === true),
    liens === null ? "question en échec" : liens.join(" → "),
    "résolveur du PC",
  );
  const ns = await demander(() => resolveur.resolveNs(d.domaine));
  ajouter(
    "serveurs de noms",
    comparerNoms(d.zone.ns, ns, d.tronque === true),
    d.zone.ns.join(", ") + ecourte(d.tronque === true),
    ns === null ? "question en échec" : ns.join(", "),
    "résolveur du PC",
  );
  if (d.messagerie.etat === "ok") {
    const mx = await demander(() => resolveur.resolveMx(d.domaine));
    const publies = d.messagerie.mx.map((m) => m.hote);
    const trouves = mx === null ? null : mx.map((m) => m.exchange);
    ajouter(
      "messagerie (MX)",
      comparerNoms(publies, trouves, d.tronque === true),
      publies.join(", ") + ecourte(d.tronque === true),
      trouves === null ? "question en échec" : trouves.join(", "),
      "résolveur du PC",
    );
  }
  // One check of the AS per name, by Team Cymru only: RIPEstat rests on RIS, which the collection already uses to
  // confirm its AS (the review of C.9).
  const adresses = (await demander(() => resolveur.resolve4(web.nom))) ?? [];
  const publies = [...new Set(web.reseaux.map((r) => r.as))];
  const trouves: number[] = [];
  let complet = adresses.length > 0;
  for (const ip of adresses.slice(0, 2)) {
    const as = await asCymru(ip);
    if (as === null) complet = false;
    else trouves.push(...as);
  }
  ajouter(
    "réseau (AS)",
    complet ? comparerAs(publies, trouves) : "non vérifiable",
    publies.join(", "),
    "",
    "Team Cymru",
  );
  if (web.cdn !== null) {
    const f = cdn.fournisseurs.find((x) => x.id === web.cdn?.id);
    if (f === undefined) {
      ajouter("CDN", "non vérifiable", web.cdn.id, "fournisseur absent du référentiel", "référentiel des CDN");
    } else if (web.cdn.methode === "cname") {
      // A documented suffix (« .cdn.cloudflare.net ») ends a link of the chain found elsewhere.
      const parSuffixe =
        liens === null
          ? null
          : f.suffixes.some((s) => liens.some((l) => l.endsWith(s.suffixe) || l === s.suffixe.slice(1)));
      ajouter(
        "CDN (suffixe)",
        parSuffixe === null ? "non vérifiable" : parSuffixe ? "concorde" : "diffère",
        web.cdn.id,
        parSuffixe === null
          ? "chaîne inconnue (question en échec)"
          : parSuffixe
            ? "suffixe documenté dans la chaîne"
            : "aucun suffixe documenté dans la chaîne",
        "documentation du fournisseur",
      );
    } else {
      // Recognised by the collection from the provider's address ranges; checked here by its AS, among those Team Cymru
      // gave for the AS layer (another method on the same answers).
      const parAs = trouves.length === 0 ? null : f.as.some((a) => trouves.includes(a.numero));
      ajouter(
        `CDN (${web.cdn.methode})`,
        parAs === null ? "non vérifiable" : parAs ? "concorde" : "diffère",
        web.cdn.id,
        parAs === null ? "" : parAs ? "un AS du fournisseur" : "aucun AS du fournisseur",
        "Team Cymru (réponses de la couche AS)",
      );
    }
  }
  for (const e of web.exploitants) {
    if (e.societe === null || societesVerifiees.has(e.societe)) continue;
    societesVerifiees.add(e.societe);
    // The published layer: the category of the country of the company's ultimate parent, as the state publishes it
    // (index/exploitants.json); « non déterminé » when the state knows no parent, never computed again here.
    const publie = exploitants[e.societe];
    const mere = publie?.mere ?? null;
    const paysMere = publie?.paysMere ?? null;
    const publiee =
      mere === null || mere === "non-determinee" || paysMere === null ? "non déterminé" : categorie(paysMere);
    const couche = `pays de la maison mère de ${e.societe}`;
    const textePublie = `${publiee} (${mere ?? "?"}, ${paysMere ?? "?"})`;
    const lei = societes.societes[e.societe]?.lei ?? null;
    if (lei === null || !LEI.test(lei)) {
      ajouter(couche, "non vérifiable", textePublie, "pas de LEI", "GLEIF");
      continue;
    }
    const parent = await parentGleif(lei);
    if (parent === null || (parent === "aucun" && mere !== e.societe)) {
      // No answer, or no parent reported while the state knows one: GLEIF does not contradict it.
      ajouter(couche, "non vérifiable", textePublie, parent === null ? "" : "aucune maison mère déclarée", "GLEIF");
      continue;
    }
    const leiHaut = parent === "aucun" ? lei : parent;
    const pays = await paysGleif(leiHaut);
    ajouter(
      couche,
      comparerCategorie(publiee, pays === null ? null : categorie(pays)),
      textePublie,
      `${pays === null ? "?" : categorie(pays)} (${leiHaut}, ${pays ?? "?"})`,
      "GLEIF",
    );
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
  resultats.push({ domaine: t.domaine.domaine, strate: t.strate, controles: await verifier(t, etat.exploitants) });
}

const tous = resultats.flatMap((r) => r.controles);
const { concordent, verifies, part } = partConcordante(tous);
const montrer = (c: Controle) => (SOURCES_CONTROLE.has(c.source) ? "" : c.independant);
mkdirSync(o.sortie, { recursive: true });
writeFileSync(
  path.join(o.sortie, "resultats.json"),
  `${JSON.stringify({ date: etat.date, commit: etat.commit, graine, resultats }, null, 2)}\n`,
);
const lignes = [
  `# Contre-vérification de l'état du ${etat.date} (C.9)`,
  "",
  `État : commit ${etat.commit} de la branche « donnees ».`,
  `Tirage : graine ${graine} (le jour de l'état), ${STRATES.map((s) => `${s.nombre} « ${s.strate} »`).join(", ")}.`,
  `Résultat : ${concordent} contrôles concordent sur ${verifies} vérifiés${part === null ? "" : ` (${(part * 100).toFixed(1)} %)`} ; ${tous.length - verifies} non vérifiables.`,
  `Questions : Team Cymru ${cymru} ce jour (au plus ${BUDGET_CYMRU}).`,
  "Sources de contrôle : Team Cymru ; GLEIF (CC0).",
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
console.log(`contre-vérification : ${concordent} / ${verifies} contrôles concordent ; Team Cymru ${cymru} ce jour.`);
