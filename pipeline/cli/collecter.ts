// The daily collection (brief B, plan § 4 to § 13):
//   npx tsx pipeline/cli/collecter.ts --travail <dir> [--veille <dir>] [--donnees <dir>] [--resolveur 127.0.0.1:5300]
//     [--controle 9.9.9.9] [--temoins 1.1.1.1] [--conteneur <docker name>] [--date AAAA-MM-JJ] [--limite N]
//     [--noms-par-seconde 25] [--iptoasn <ip2asn-combined-AAAA-MM-JJ.tsv.gz>] [--essai] [--essai-disjoncteur]
// Downloads of the day, the reference list, the DNS measurement at the polite pace with its controls, the
// classification, yesterday classified again with today's rules, the guards, and the state to publish, written to
// <travail>/sortie/. Exit 0: every guard passes and <travail>/sortie/ may be published; exit 2: a guard failed and
// nothing may be published (<travail>/resume.md says why); exit 1: an error. Outside GitHub Actions, 200 names at most.
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { gunzipSync, gzipSync } from "node:zlib";
import { estPlage, type PlagesOfficielles, type ReferentielCdn } from "../cdn";
import { collecter, POLITESSE } from "../collecte";
import { ClientCadence, controler, planDeControle, type ReferentielTemoins, verifierTemoins } from "../controle";
import { coucheAdresses, type ContexteV1, coucheReseauPubliable } from "../couches";
import { CompteurServeurs, type DebitServeurs } from "../debit-serveurs";
import { lireDila, type ReferentielDila } from "../dila";
import { ClientUdp } from "../dns-bas";
import { construireEtat, type Controles, type Mesures, type Pannes } from "../etat-du-jour";
import { verifierLimite } from "../garde";
import { type MesureNom, mesurerNom } from "../mesure";
import { construireListe, type CopieListe } from "../perimetre";
import { generateur, melanger } from "../politesse";
import { domaineEnregistrable, lireListeSuffixes } from "../psl";
import {
  bilan,
  chiffres,
  type EnregistrementDomaine,
  type EnregistrementNom,
  type Etat,
  type Fichiers,
  fragments,
  index,
  journal,
  jsonStable,
  SEUIL_DISJONCTEUR,
  SEUIL_ECHECS,
  sha256,
  VERSION_SCHEMA,
} from "../publication";
import { paysDesAs, titulairesRipe } from "../registres";
import { TableIpToAsn, TableRis } from "../reseau";
import { fichiersSchemas, schemaDe, valider } from "../schemas";
import { chaineDepuisSociete, type ReferentielAs, type ReferentielSocietes, validerReferentiels } from "../societes";
import { Telechargeur } from "../sources";
import type { ResultatSpf } from "../spf";
import { type EtatSource, releverManuel, telechargerSources } from "../telechargements";
import { validerListeFastly } from "../valider";
import { lireZip } from "../zip";

/** Point 02, Q2: confirmed breakdowns above 8 % of the domains, or up by more than 2 points in a day, stop it all. */
const SEUIL_PANNES = 0.08;
/** The brake engages at 8 questions within a second to one server, under the limit of 10 (brief B.3). */
const SEUIL_FREIN = 8;
const HAUSSE_PANNES = 0.02;

/** The method's version (docs/methode.md § 11): 0.2 until the rule C2-4 of chantier 2 (part C). */
const METHODE = "0.2";
const RACINE = process.cwd();

const { values: o } = parseArgs({
  options: {
    travail: { type: "string" },
    veille: { type: "string" },
    donnees: { type: "string" },
    resolveur: { type: "string", default: "127.0.0.1:5300" },
    controle: { type: "string", default: "9.9.9.9" },
    temoins: { type: "string", default: "1.1.1.1" },
    conteneur: { type: "string" },
    date: { type: "string" },
    limite: { type: "string" },
    "noms-par-seconde": { type: "string", default: "25" },
    // A local trial may wait less between two attempts (the collection on the runners keeps 10 minutes).
    "delai-reprise-minutes": { type: "string", default: "10" },
    // IPtoASN, surveyed by hand (docs/sources.md, card 18): its files are closed to robots, never downloaded here.
    iptoasn: { type: "string" },
    essai: { type: "boolean", default: false },
    // Brief B.11: a trial that trips the circuit breaker on purpose (nothing is published).
    "essai-disjoncteur": { type: "boolean", default: false },
  },
});

const lire = (...morceaux: string[]) => readFileSync(path.join(...morceaux), "utf8");
const json = <T>(...morceaux: string[]) => JSON.parse(lire(...morceaux)) as T;
const adresseEtPort = (valeur: string): [string, number] => {
  const [hote, port] = valeur.split(":");
  return [hote ?? valeur, port === undefined ? 53 : Number(port)];
};

// ---------------------------------------------------------------------------------------------------------------
// The referentials of the repository (the rules of the day).

function referentiels() {
  const copies: CopieListe[] = readdirSync(path.join(RACINE, "referentiels/listes"))
    .flatMap((f) => {
      const date = /^liste-dinum-(\d{4}-\d{2}-\d{2})\.csv$/.exec(f)?.[1];
      return date === undefined ? [] : [{ date, csv: lire(RACINE, "referentiels/listes", f) }];
    })
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const fichierPsl = readdirSync(path.join(RACINE, "referentiels/psl"))
    .filter((f) => /^public_suffix_list-\d{4}-\d{2}-\d{2}\.dat$/.test(f))
    .sort()
    .at(-1);
  if (fichierPsl === undefined) throw new Error("referentiels/psl : aucune Public Suffix List épinglée");
  const psl = lireListeSuffixes(lire(RACINE, "referentiels/psl", fichierPsl));
  const plateformes = json<{ version: string; domaines: string[] }>(RACINE, "referentiels/plateformes-tierces.json");
  const temoins = json<ReferentielTemoins>(RACINE, "referentiels/temoins.json");
  const cdn = json<ReferentielCdn>(RACINE, "referentiels/cdn.json");
  const societes = json<ReferentielSocietes>(RACINE, "referentiels/societes.json");
  const tableAs = json<ReferentielAs>(RACINE, "referentiels/as-societes.json");
  const erreurs = validerReferentiels(cdn, tableAs, societes);
  if (erreurs.length > 0) throw new Error(`référentiels invalides :\n- ${erreurs.join("\n- ")}`);
  const regles = {
    listes: copies.map((c) => c.date),
    psl: psl.version,
    plateformes: plateformes.version,
    cdn: cdn.version,
    societes: societes.version,
    as: tableAs.version,
    methode: METHODE,
  };
  return { copies, psl, plateformes: new Set(plateformes.domaines), temoins, cdn, societes, tableAs, regles };
}
type Referentiels = ReturnType<typeof referentiels>;

// ---------------------------------------------------------------------------------------------------------------
// The classification context, from a folder of downloaded sources (today's or yesterday's).

function contexteDe(dossier: string, ref: Referentiels, risDuJour: boolean): ContexteV1 {
  const fichier = (id: string) => path.join(dossier, "sources", id);
  const texte = (id: string) => (existsSync(fichier(id)) ? readFileSync(fichier(id), "utf8") : "");
  const gz = (id: string) => (existsSync(fichier(id)) ? gunzipSync(readFileSync(fichier(id))).toString("utf8") : "");
  const plages: PlagesOfficielles = {};
  const cloudflare = [...texte("cloudflare-ipv4").split(/\r?\n/), ...texte("cloudflare-ipv6").split(/\r?\n/)]
    .map((l) => l.trim())
    .filter((l) => l !== "" && estPlage(l));
  if (cloudflare.length > 0)
    plages.cloudflare = { plages: cloudflare, source: "https://www.cloudflare.com/ips-v4 et /ips-v6", date: "" };
  if (existsSync(fichier("fastly"))) {
    try {
      const fastly = validerListeFastly(JSON.parse(texte("fastly")) as unknown).filter(estPlage);
      plages.fastly = { plages: fastly, source: "https://api.fastly.com/public-ip-list", date: "" };
    } catch {
      // A list of another shape is left out: the CDN is then recognised by its CNAME suffix or its AS only.
    }
  }
  return {
    iptoasn: new TableIpToAsn(gz("iptoasn")),
    // Without the day's RIS files, the network layer cannot be « confirmé » (plan § 13.4).
    ris: new TableRis(risDuJour ? [gz("ris-ipv4"), gz("ris-ipv6")] : []),
    cdn: ref.cdn,
    plages,
    coucheReseau: coucheReseauPubliable,
    tableAs: ref.tableAs,
    societes: ref.societes,
    paysAs: paysDesAs(["ripencc", "arin", "apnic", "lacnic", "afrinic"].map((r) => texte(`rir-${r}`))),
    titulairesRipe: new Map(),
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Observations kept for tomorrow (the Actions cache, never published: they hold RIS's answers).

type Observations = {
  date: string;
  noms: [string, MesureNom][];
  domaines: [string, Mesures["domaines"] extends Map<string, infer Z> ? Z : never][];
  hotes: [string, MesureNom][];
  spf: [string, ResultatSpf][];
  controleNoms: [string, { resolveur: string; mesure: MesureNom }][];
  controleMx: [string, string[] | null][];
  /** The failures Quad9 confirmed (point 02, Q2). */
  pannes?: { noms: string[]; zones: string[] };
};

function lireObservations(
  dossier: string,
): { mesures: Mesures; controles: Controles; pannes: Pannes; date: string } | null {
  const fichier = path.join(dossier, "observations.json.gz");
  if (!existsSync(fichier)) return null;
  const o = JSON.parse(gunzipSync(readFileSync(fichier)).toString("utf8")) as Observations;
  return {
    date: o.date,
    mesures: { noms: new Map(o.noms), domaines: new Map(o.domaines), hotes: new Map(o.hotes), spf: new Map(o.spf) },
    controles: { noms: new Map(o.controleNoms), mx: new Map(o.controleMx) },
    pannes: { noms: new Set(o.pannes?.noms ?? []), zones: new Set(o.pannes?.zones ?? []), resolveur: "quad9" },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The published state (the « donnees » branch, checked out read-only).

type EtatJson = {
  date: string;
  jours: number;
  versions: { regles: Record<string, unknown> };
  qualite?: { pannesConfirmeesPourcent?: number };
};

function lirePublie(dossier: string | undefined): { etat: Etat; meta: EtatJson } | null {
  if (dossier === undefined || !existsSync(path.join(dossier, "etat.json"))) return null;
  const meta = json<EtatJson>(dossier, "etat.json");
  const noms = new Map<string, EnregistrementNom>();
  const domaines = new Map<string, EnregistrementDomaine>();
  for (const sorte of ["noms", "domaines"] as const) {
    const racine = path.join(dossier, sorte);
    if (!existsSync(racine)) continue;
    for (const haut of readdirSync(racine)) {
      for (const f of readdirSync(path.join(racine, haut))) {
        if (!/^[0-9a-f]{2}\.json$/.test(f)) continue;
        const contenu = json<Record<string, unknown[]>>(racine, haut, f);
        for (const e of contenu[sorte] ?? []) {
          if (sorte === "noms") noms.set((e as EnregistrementNom).nom, e as EnregistrementNom);
          else domaines.set((e as EnregistrementDomaine).domaine, e as EnregistrementDomaine);
        }
      }
    }
  }
  return { etat: { noms, domaines }, meta };
}

// ---------------------------------------------------------------------------------------------------------------

/** Knot Resolver's debug lines, read from the container's logs while the collection runs (brief B.3). */
function suivreDebit(conteneur: string | undefined): {
  frein: (() => Promise<void>) | undefined;
  arreter: () => DebitServeurs | null;
} {
  if (conteneur === undefined) return { frein: undefined, arreter: () => null };
  const compteur = new CompteurServeurs();
  const enfant = spawn("docker", ["logs", "-f", "--timestamps", "--since", "1s", conteneur], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const flux of [enfant.stdout, enfant.stderr])
    createInterface({ input: flux }).on("line", (l) => compteur.lire(l));
  let enErreur = false;
  enfant.on("error", () => {
    enErreur = true;
  });
  return {
    // The brake (brief B.3, point 02): while one address already got SEUIL_FREIN questions within the current second,
    // every new question waits (10 seconds at most, so a stalled log never stops the collection).
    frein: async () => {
      for (let i = 0; i < 40 && compteur.charge(Date.now()) >= SEUIL_FREIN; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    },
    arreter: () => {
      enfant.kill();
      return enErreur ? null : compteur.resultat();
    },
  };
}

async function principal(): Promise<number> {
  const travail = o.travail;
  if (travail === undefined) throw new Error("option manquante : --travail <dossier>");
  const proprietaire = process.env.SOVERMAP_GITHUB_OWNER;
  if (proprietaire === undefined || !/^[A-Za-z0-9-]{1,39}$/.test(proprietaire)) {
    throw new Error("SOVERMAP_GITHUB_OWNER absent ou invalide (le nom du compte qui publie, pour l'agent utilisateur)");
  }
  const maintenant = new Date();
  const date = o.date ?? maintenant.toISOString().slice(0, 10);
  const heure = maintenant.toISOString();
  rmSync(path.join(travail, "sortie"), { recursive: true, force: true });
  mkdirSync(path.join(travail, "sortie"), { recursive: true });
  const version = json<{ version: string }>(RACINE, "package.json").version;
  const agent = `Sovermap-bot/${version} (+https://github.com/${proprietaire}/sovermap)`;
  const ref = referentiels();

  // Downloads, then the reference list.
  const sources: EtatSource[] = await telechargerSources(
    new Telechargeur({ agent }),
    travail,
    o.veille ?? null,
    maintenant,
  );
  // IPtoASN: the copy surveyed by hand (the workflow takes the latest one from the release « sources-iptoasn »);
  // without it, the last copy kept in the cache; never a download from iptoasn.com.
  const copieVeille = o.veille === undefined ? null : path.join(o.veille, "sources", "iptoasn");
  if (o.iptoasn !== undefined) {
    sources.push(releverManuel(travail, "iptoasn", 18, o.iptoasn, maintenant));
  } else if (copieVeille !== null && existsSync(copieVeille) && existsSync(`${copieVeille}.meta.json`)) {
    const meta = json<{ date: string; octets: number; sha256: string }>(`${copieVeille}.meta.json`);
    if (path.resolve(copieVeille) !== path.resolve(travail, "sources", "iptoasn")) {
      copyFileSync(copieVeille, path.join(travail, "sources", "iptoasn"));
      copyFileSync(`${copieVeille}.meta.json`, path.join(travail, "sources", "iptoasn.meta.json"));
    }
    sources.push({
      id: "iptoasn",
      fiche: 18,
      url: "relevé manuel",
      etat: "de la veille",
      date: meta.date,
      octets: meta.octets,
      sha256: meta.sha256,
    });
  } else {
    sources.push({
      id: "iptoasn",
      fiche: 18,
      url: "relevé manuel",
      etat: "en échec",
      date: null,
      octets: 0,
      sha256: null,
    });
  }
  const ageJours = (date: string | null) =>
    date === null ? null : Math.floor((maintenant.getTime() - Date.parse(date)) / 86_400_000);
  const source = (id: string) => sources.find((s) => s.id === id);
  let dila: ReferentielDila | null = null;
  if (source("dila")?.etat !== "en échec") {
    const entrees = lireZip(readFileSync(path.join(travail, "sources", "dila")), (n) => n.endsWith(".json"));
    const [nom, contenu] = [...entrees.entries()].find(([n]) => n.endsWith(".json")) ?? [];
    if (nom !== undefined && contenu !== undefined) dila = lireDila(contenu.toString("utf8"), nom);
  }
  const liste = construireListe(ref.copies, dila, ref.psl, ref.plateformes);
  const zoneDe = (nom: string) => domaineEnregistrable(nom, ref.psl) ?? nom;
  const graine = Number(date.replaceAll("-", ""));
  let aMesurer = [...liste.noms.values()];
  if (o.limite !== undefined) aMesurer = melanger(aMesurer, generateur(graine)).slice(0, Number(o.limite));
  verifierLimite(aMesurer.length);
  const unites = new Set(aMesurer.map((e) => e.domaine));
  const domainesMesures = [...liste.domaines.values()].filter((d) => unites.has(d.domaine));
  // Each unit's web name is measured too (it carries the domain's addresses layer).
  const noms = new Map<string, string>(aMesurer.map((e) => [e.nom, e.domaine]));
  for (const d of domainesMesures) noms.set(d.nomWeb, d.domaine);

  // The measurement, with Quad9 and Cloudflare alongside, at their own pace.
  const [hote, port] = adresseEtPort(o.resolveur);
  const knot = new ClientUdp("knot", hote, port, 12_000);
  const quad9 = new ClientCadence(new ClientUdp("quad9", o.controle, 53, 8_000), 2);
  const cloudflare = new ClientCadence(new ClientUdp("cloudflare", o.temoins, 53, 8_000), 2);
  const nomsTemoins = ref.temoins.temoins.map((t) => t.nom);
  const plan = planDeControle(domainesMesures, nomsTemoins, generateur(graine + 1));
  const debit = suivreDebit(o.conteneur);
  const suivi = (ligne: string) => console.log(`collecte : ${ligne}`);
  const [mesures, controleQuad9, controleCloudflare] = await Promise.all([
    collecter(noms, knot, {
      ...POLITESSE,
      nomsParSeconde: Number(o["noms-par-seconde"]),
      delaiRepriseMs: Number(o["delai-reprise-minutes"]) * 60_000,
      zoneDe,
      suivi,
      ...(debit.frein === undefined ? {} : { frein: debit.frein }),
    }),
    controler(quad9, plan.noms, plan.mx),
    controler(cloudflare, nomsTemoins, []),
  ]);
  // The hosts of the « État » domains (name servers, mail exchangers), asked to Quad9 once they are known.
  const hotesEtat = [
    ...new Set(
      domainesMesures
        .filter((d) => d.perimetre === "État")
        .flatMap((d) => {
          const z = mesures.domaines.get(d.domaine);
          return z === undefined ? [] : [...z.ns, ...z.mx.map((m) => m.hote)];
        }),
    ),
  ].sort();
  const controleHotes = await controler(quad9, hotesEtat, []);
  const temoinsKnot = new Map(await Promise.all(nomsTemoins.map(async (n) => [n, await mesurerNom(n, knot)] as const)));
  // Point 02, Q2: every domain still failing after its attempts is asked once to Quad9 (NS when its zone fails, the
  // web name's address otherwise). A failure Quad9 shares is the domain's own breakdown, published « échec, confirmé
  // par Quad9 »; the others are the collection's, and only they count in the guard of 2 %.
  const ECHECS_DNS = new Set(["SERVFAIL", "TIMEOUT", "REFUSED", "ERREUR"]);
  const pannes: Pannes = { noms: new Set<string>(), zones: new Set<string>(), resolveur: "quad9" };
  const aConfirmer = domainesMesures.filter(
    (d) => mesures.domaines.get(d.domaine)?.etat === "echec" || mesures.noms.get(d.nomWeb)?.etat === "echec",
  );
  const confirmer = async () => {
    for (let d = aConfirmer.shift(); d !== undefined; d = aConfirmer.shift()) {
      const zoneEnEchec = mesures.domaines.get(d.domaine)?.etat === "echec";
      const r = await quad9.demander(zoneEnEchec ? d.domaine : d.nomWeb, zoneEnEchec ? "NS" : "A");
      if (!ECHECS_DNS.has(r.code)) continue;
      if (zoneEnEchec) (pannes.zones as Set<string>).add(d.domaine);
      if (mesures.noms.get(d.nomWeb)?.etat === "echec") (pannes.noms as Set<string>).add(d.nomWeb);
    }
  };
  await Promise.all(Array.from({ length: 8 }, confirmer));
  const debitServeurs = debit.arreter();
  for (const c of [knot, quad9, cloudflare]) c.fermer();
  const controles: Controles = {
    noms: new Map(
      [...controleQuad9.noms, ...controleHotes.noms].map(([n, m]) => [
        n,
        { resolveur: controleQuad9.resolveur, mesure: m },
      ]),
    ),
    mx: controleQuad9.mx,
  };
  const observations: Observations = {
    date,
    noms: [...mesures.noms],
    domaines: [...mesures.domaines],
    hotes: [...mesures.hotes],
    spf: [...mesures.spf],
    controleNoms: [...controles.noms],
    controleMx: [...controles.mx],
    pannes: { noms: [...pannes.noms].sort(), zones: [...pannes.zones].sort() },
  };
  writeFileSync(path.join(travail, "observations.json.gz"), gzipSync(JSON.stringify(observations)));

  // Today's state.
  const risDuJour = source("ris-ipv4")?.etat === "du jour" && source("ris-ipv6")?.etat === "du jour";
  const contexte = contexteDe(travail, ref, risDuJour);
  const jour = construireEtat(liste, mesures, controles, contexte, heure, pannes);

  // The guards (brief B.7): witnesses, DNS failures, circuit breaker, schemas.
  const profil = (m: MesureNom) => {
    const c = coucheAdresses(m, null, "hors État", contexte, heure);
    return { etat: m.etat, cdn: c.cdn?.id ?? null, as: [...new Set(c.reseaux.map((r) => r.as))] };
  };
  const temoins = verifierTemoins(
    ref.temoins.temoins,
    [
      { resolveur: "knot", noms: temoinsKnot },
      { resolveur: "quad9", noms: controleQuad9.noms },
      { resolveur: "cloudflare", noms: controleCloudflare.noms },
    ],
    profil,
  );
  const mesuresNoms = [...jour.noms.values()];
  const echecs = mesuresNoms.filter((n) => n.etat === "echec").length;
  const echecsParCode: Record<string, number> = {};
  for (const m of mesures.noms.values())
    if (m.etat === "echec") echecsParCode[m.echec ?? "ERREUR"] = (echecsParCode[m.echec ?? "ERREUR"] ?? 0) + 1;
  const tauxEchec = mesuresNoms.length === 0 ? 1 : echecs / mesuresNoms.length;
  // The guard counts the units (the domains of decision D1): a domain fails when its zone or its web name fails. One
  // broken zone that holds hundreds of names of the list does not block the publication by itself.
  const unitesEnEchec = [...jour.domaines.values()].filter(
    (d) => d.zone.etat === "echec" || jour.noms.get(d.nomWeb)?.etat === "echec",
  );
  const domainesEnEchec = unitesEnEchec.length;
  const pannesConfirmees = unitesEnEchec.filter(
    (d) =>
      (d.zone.echec?.confirmePar ?? null) !== null || (jour.noms.get(d.nomWeb)?.echec?.confirmePar ?? null) !== null,
  ).length;
  const echecsNonConfirmes = domainesEnEchec - pannesConfirmees;
  const part = (x: number) => (jour.domaines.size === 0 ? 1 : x / jour.domaines.size);
  const tauxEchecDomaines = part(echecsNonConfirmes);
  const tauxPannes = part(pannesConfirmees);

  const veilleObs = o.veille === undefined ? null : lireObservations(o.veille);
  const veille =
    veilleObs === null || o.veille === undefined
      ? null
      : construireEtat(
          liste,
          veilleObs.mesures,
          veilleObs.controles,
          contexteDe(o.veille, ref, true),
          heure,
          veilleObs.pannes,
        );
  const publie = lirePublie(o.donnees);
  const reglesChangees = publie !== null && jsonStable(publie.meta.versions.regles) !== jsonStable(ref.regles);
  // The confirmed breakdowns of the last published day, for the second safety of point 02 (Q2).
  const pannesVeille =
    publie?.meta.qualite?.pannesConfirmeesPourcent === undefined
      ? null
      : publie.meta.qualite.pannesConfirmeesPourcent / 100;
  const b = bilan(jour, veille, publie?.etat ?? null, reglesChangees);

  // The files.
  const asVus = new Set<number>();
  for (const n of b.etat.noms.values()) for (const r of n.reseaux) asVus.add(r.as);
  for (const d of b.etat.domaines.values())
    for (const h of [...d.serveursDeNoms.hotes, ...d.messagerie.hotes]) for (const a of h.as) asVus.add(a);
  const ripe: ReadonlyMap<number, { orgName: string | null }> =
    source("ripe-aut-num")?.etat !== "en échec" && source("ripe-organisation")?.etat !== "en échec"
      ? titulairesRipe(
          gunzipSync(readFileSync(path.join(travail, "sources", "ripe-aut-num"))).toString("utf8"),
          gunzipSync(readFileSync(path.join(travail, "sources", "ripe-organisation"))).toString("utf8"),
          asVus,
        )
      : new Map();
  const descriptions = new Map<number, string | null>();
  for (const a of asVus) {
    descriptions.set(a, contexte.iptoasn.descriptionAs(a));
  }
  const organismes = new Map(
    [...(dila?.services.values() ?? [])].map((s) => [s.id, { nom: s.nom, sigle: s.sigle, ministere: s.ministere }]),
  );
  // Each company with its ultimate parent and the country category of its chain (the v0 rules, societes.ts).
  const societes = new Map(
    Object.entries(ref.societes.societes).map(([cle, s]) => {
      const chaine = chaineDepuisSociete(cle, ref.societes);
      return [
        cle,
        {
          nom: s.nom,
          pays: s.pays,
          mere: chaine.mere?.cle ?? null,
          paysMere: chaine.mere?.pays ?? null,
          categorie: chaine.categorie,
        },
      ] as const;
    }),
  );
  const fichiers: Fichiers = new Map([
    ...fragments("noms", b.etat.noms),
    ...fragments("domaines", b.etat.domaines),
    ...index(b.etat, {
      as: new Map(
        [...asVus].map((a) => [
          a,
          {
            description: descriptions.get(a) ?? null,
            paysEnregistrement: contexte.paysAs.get(a) ?? null,
            titulaire: ripe.get(a)?.orgName ?? null,
          },
        ]),
      ),
      societes,
      organismes,
      organismesDe: new Map([...liste.domaines].map(([cle, d]) => [cle, d.organismes])),
    }),
    ["agregats/chiffres.json", `${jsonStable(chiffres(b.etat, METHODE))}\n`],
    [`journal/${date.slice(0, 4)}/${date.slice(5, 7)}/${date}.json`, journal(date, b)],
    ...fichiersSchemas(),
    ["README.md", readFileSync(path.join(RACINE, "pipeline/donnees/README.md"), "utf8")],
    ["vercel.json", `${JSON.stringify({ git: { deploymentEnabled: false } }, null, 2)}\n`],
  ]);
  const erreursSchema = [...fichiers].flatMap(([chemin, texte]) => {
    const schema = schemaDe(chemin);
    return schema === null ? [] : valider(JSON.parse(texte), schema).map((e) => `${chemin} ${e.chemin} : ${e.attendu}`);
  });

  const gardes = [
    {
      nom: "témoins concordants",
      ok: temoins.concordants,
      detail: temoins.verdicts
        .filter((v) => !v.ok)
        .map((v) => `${v.nom} (${v.resolveur})`)
        .join(", "),
    },
    {
      nom: "échecs non confirmés sous 2 %",
      ok: tauxEchecDomaines < SEUIL_ECHECS,
      detail:
        `domaines : ${echecsNonConfirmes} sur ${jour.domaines.size} (${(100 * tauxEchecDomaines).toFixed(2)} %) ; ` +
        `noms en échec : ${echecs} sur ${mesuresNoms.length}`,
    },
    {
      nom: "pannes confirmées sous 8 % et à moins de 2 points de la veille",
      ok: tauxPannes <= SEUIL_PANNES && (pannesVeille === null || tauxPannes - pannesVeille <= HAUSSE_PANNES),
      detail:
        `${pannesConfirmees} sur ${jour.domaines.size} (${(100 * tauxPannes).toFixed(2)} %)` +
        (pannesVeille === null ? "" : ` ; la veille : ${(100 * pannesVeille).toFixed(2)} %`),
    },
    {
      nom: "disjoncteur sous 2 %",
      ok: !o["essai-disjoncteur"] && (b.disjoncteur.part === null || b.disjoncteur.part < SEUIL_DISJONCTEUR),
      detail: o["essai-disjoncteur"]
        ? "essai : disjoncteur déclenché exprès"
        : b.disjoncteur.part === null
          ? "veille absente : sans objet"
          : `${b.disjoncteur.changes} sur ${b.disjoncteur.compares} (${(100 * b.disjoncteur.part).toFixed(2)} %)`,
    },
    { nom: "schémas valides", ok: erreursSchema.length === 0, detail: erreursSchema.slice(0, 5).join(" ; ") },
  ];
  const publiable = gardes.every((g) => g.ok);

  const sommes = Object.fromEntries(
    [...fichiers]
      .filter(
        ([chemin]) =>
          /^(noms|domaines)\/[0-9a-f]{2}\/sommes\.json$/.test(chemin) || /^(index|agregats|journal)\//.test(chemin),
      )
      .map(([chemin, texte]) => [chemin, sha256(texte)])
      .sort(([a], [b2]) => ((a ?? "") < (b2 ?? "") ? -1 : 1)),
  );
  const fin = new Date();
  const hier = new Date(Date.parse(`${date}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const etatJson = {
    statut: "preparation",
    avertissement: "En préparation : le site n'est pas ouvert ; ne pas citer avant l'ouverture.",
    schema: VERSION_SCHEMA,
    date,
    essai: o.essai,
    collecte: {
      debut: heure,
      fin: fin.toISOString(),
      dureeMinutes: Math.round((fin.getTime() - maintenant.getTime()) / 60_000),
      pointDeMesure: "serveur de GitHub Actions (ubuntu-24.04)",
      resolveur: "Knot Resolver 6.5.1, validation DNSSEC",
    },
    versions: { regles: ref.regles, dila: dila?.fichier ?? null, schema: VERSION_SCHEMA },
    sources: sources.map((s) => ({
      id: s.id,
      fiche: s.fiche,
      etat: s.etat,
      date: s.date,
      ageJours: ageJours(s.date),
      octets: s.octets,
      sha256: s.sha256,
    })),
    lecturesEnEchec: sources.filter((s) => s.etat === "de la veille" || s.etat === "en échec").length,
    qualite: {
      nomsDeLaListe: liste.noms.size,
      nomsMesures: mesuresNoms.length,
      couverturePourcent: liste.noms.size === 0 ? 0 : Math.round((1000 * mesuresNoms.length) / liste.noms.size) / 10,
      echecs,
      echecsParCode,
      tauxEchecPourcent: Math.round(10000 * tauxEchec) / 100,
      domainesEnEchec,
      echecsNonConfirmes,
      tauxEchecNonConfirmesPourcent: Math.round(10000 * tauxEchecDomaines) / 100,
      pannesConfirmees,
      pannesConfirmeesPourcent: Math.round(10000 * tauxPannes) / 100,
      domaines: b.etat.domaines.size,
      domainesEtat: [...b.etat.domaines.values()].filter((d) => d.perimetre === "État").length,
      exclus: Object.fromEntries(liste.exclus),
      temoins: {
        concordants: temoins.concordants,
        ecarts: temoins.verdicts.filter((v) => !v.ok).map((v) => `${v.nom} (${v.resolveur})`),
      },
      controle: { resolveur: "quad9", noms: plan.noms.length + hotesEtat.length, mx: plan.mx.length },
      debitMaxParServeur: debitServeurs,
      disjoncteur: b.disjoncteur,
    },
    journal: { etatInitial: b.etatInitial, reglesChangees: b.reglesChangees, changements: b.changements.length },
    jours:
      publie === null
        ? 1
        : publie.meta.date === hier
          ? publie.meta.jours + 1
          : publie.meta.date === date
            ? publie.meta.jours
            : 1,
    sommes,
  };
  fichiers.set("etat.json", `${JSON.stringify(etatJson, null, 2)}\n`);

  for (const [chemin, texte] of fichiers) {
    const cible = path.join(travail, "sortie", chemin);
    mkdirSync(path.dirname(cible), { recursive: true });
    writeFileSync(cible, texte);
  }
  const resume = [
    `## Collecte du ${date}${o.essai ? " (essai)" : ""}`,
    "",
    `- Noms mesurés : ${mesuresNoms.length} sur ${liste.noms.size} ; domaines : ${b.etat.domaines.size} ; durée : ${etatJson.collecte.dureeMinutes} min.`,
    `- Changements confirmés : ${b.changements.length}${b.etatInitial ? " (état initial)" : ""}${b.reglesChangees ? " (règles nouvelles : rien au journal)" : ""}.`,
    `- Débit maximal vers un même serveur faisant autorité : ${
      debitServeurs === null
        ? "non mesuré"
        : `${debitServeurs.max} questions en une seconde (${debitServeurs.adresse ?? "?"}, ${debitServeurs.seconde ?? "?"}) ; secondes au-delà de 10 : ${debitServeurs.depassements}`
    }.`,
    `- Sources lues de la veille ou en échec : ${etatJson.lecturesEnEchec}.`,
    `- IPtoASN (relevé manuel) : ${(() => {
      const ip = sources.find((s) => s.id === "iptoasn");
      const age = ageJours(ip?.date ?? null);
      return age === null
        ? "absent"
        : `copie du ${(ip?.date ?? "").slice(0, 10)}, âgée de ${age} jours${age > 80 ? " : plus de 80 jours, à renouveler" : ""}`;
    })()}.`,
    `- Échecs DNS par code : ${
      Object.entries(echecsParCode)
        .map(([c, n]) => `${c} ${n}`)
        .join(", ") || "aucun"
    }.`,
    "",
    "| Garde-fou | Résultat | Détail |",
    "|---|---|---|",
    ...gardes.map((g) => `| ${g.nom} | ${g.ok ? "vert" : "**rouge**"} | ${g.detail || "—"} |`),
    "",
    publiable
      ? "Tous les garde-fous sont verts : l'état du jour peut être publié."
      : "**Un garde-fou est rouge : rien n'est publié, l'état de la veille reste.**",
  ].join("\n");
  writeFileSync(path.join(travail, "resume.md"), `${resume}\n`);
  writeFileSync(path.join(travail, "rapport.json"), `${JSON.stringify({ date, publiable, gardes }, null, 2)}\n`);
  console.log(resume);
  return publiable ? 0 : 2;
}

principal().then(
  (code) => process.exit(code),
  (erreur: unknown) => {
    console.error(`collecte : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    process.exit(1);
  },
);
