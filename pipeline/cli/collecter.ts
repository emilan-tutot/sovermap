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
import { collecter, type OptionsCollecte, POLITESSE } from "../collecte";
import {
  ClientCadence,
  ControleEnContinu,
  controler,
  planDeControle,
  type ReferentielTemoins,
  verifierTemoins,
} from "../controle";
import { coucheAdresses, type ContexteV1, coucheReseauPubliable } from "../couches";
import { CompteurServeurs, type DebitServeurs } from "../debit-serveurs";
import { diagnosticDesEchecs } from "../diagnostic";
import { lireDila, type ReferentielDila } from "../dila";
import { ClientUdp } from "../dns-bas";
import { construireEtat, type Controles, type Mesures, type Pannes } from "../etat-du-jour";
import { type Garde, gardesPannes, veilleUtilisable as veilleUtilisableDe, verifierLimite } from "../garde";
import { type MesureNom, type MesureZone, mesurerNom } from "../mesure";
import { REGLES_EXCLUSION } from "../noms";
import {
  type AdressesDemarches,
  cleDemarches,
  construireListe,
  type CopieListe,
  type CopiePerimetre,
  lireCopiePerimetre,
} from "../perimetre";
import {
  controleDu,
  type EtatRegleInterne,
  lireEtatRegleInterne,
  reposerNoms,
  TEXTE_REGLE_INTERNE,
} from "../regle-interne";
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
import { agentUtilisateur, Telechargeur } from "../sources";
import type { ResultatSpf } from "../spf";
import { type EtatSource, releverManuel, telechargerSources } from "../telechargements";
import { validerListeFastly } from "../valider";
import { lireZip } from "../zip";

/** Records built reduced (an error, or a value their schema refuses): above 0.1 % of all, nothing is published. */
const SEUIL_REDUITES = 0.001;

/** The version of the records' building (couches.ts, etat-du-jour.ts): a change rebases the state like new rules. */
const VERSION_CLASSEMENT = 1;

/** After an emergency stop, the failures asked again to Quad9, for the diagnosis only (the day is never published). */
const CONFIRMATIONS_APRES_ARRET = 50;

/** The method's version (docs/methode.md § 11): 0.2 until the rule C2-4 of chantier 2 (part C). */
const METHODE = "0.2.6";
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
    // The time limits of the day's job (330 minutes); a trial, capped at 60 minutes, passes shorter ones (collecte.yml).
    "echeance-minutes": { type: "string", default: "255" },
    "fin-reprises-minutes": { type: "string", default: "290" },
    "fin-controles-minutes": { type: "string", default: "300" },
    // IPtoASN, surveyed by hand (docs/sources.md, card 18): its files are closed to robots, never downloaded here.
    iptoasn: { type: "string" },
    essai: { type: "boolean", default: false },
    // Brief B.11: a trial that trips the circuit breaker on purpose (nothing is published).
    "essai-disjoncteur": { type: "boolean", default: false },
  },
});

/**
 * The time limits, in whole minutes, checked as soon as they are read (the review of PR 20): a wrong value stops the
 * run before any download, any question and the mark « measurement started ».
 */
const LIMITES = ((): readonly [number, number, number] => {
  const [echeance = 0, finReprises = 0, finControles = 0] = (
    ["echeance-minutes", "fin-reprises-minutes", "fin-controles-minutes"] as const
  ).map((nom) => {
    const minutes = Number(o[nom]);
    if (!Number.isInteger(minutes) || minutes < 1) {
      throw new Error(`--${nom} : un nombre entier de minutes, au moins 1 (reçu « ${o[nom] ?? ""} »)`);
    }
    return minutes;
  });
  if (!(echeance <= finReprises && finReprises <= finControles)) {
    throw new Error("--echeance-minutes, --fin-reprises-minutes et --fin-controles-minutes doivent aller croissant");
  }
  return [echeance, finReprises, finControles];
})();

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
  // The dated copies of the « État » perimeter's open lists (brief C.5): the latest of each source, read and checked
  // (pipeline/perimetre.ts, lireCopiePerimetre).
  const FICHIERS_PERIMETRE = {
    sig: /^sig-(\d{4}-\d{2}-\d{2})\.csv$/,
    mesr: /^mesr-(\d{4}-\d{2}-\d{2})\.csv$/,
  } as const;
  const fichiersPerimetre = readdirSync(path.join(RACINE, "referentiels/perimetre"));
  const perimetre: CopiePerimetre[] = (["sig", "mesr"] as const).flatMap((source) => {
    const fichier = fichiersPerimetre
      .filter((f) => FICHIERS_PERIMETRE[source].test(f))
      .sort()
      .at(-1);
    const date = fichier === undefined ? undefined : FICHIERS_PERIMETRE[source].exec(fichier)?.[1];
    if (fichier === undefined || date === undefined) return [];
    return [lireCopiePerimetre(source, date, lire(RACINE, "referentiels/perimetre", fichier))];
  });
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
  // The démarches' addresses of the Observatoire's latest edition (fiche 55, C.8), read and checked here: each one a
  // host name (pipeline/perimetre.ts checks it again), its edition dated.
  const observatoire = json<{ source?: { publiee?: unknown; edition?: unknown }; demarches?: unknown }>(
    RACINE,
    "referentiels/demarches.json",
  );
  const publiee = observatoire.source?.publiee;
  const edition = observatoire.source?.edition;
  if (
    typeof publiee !== "string" ||
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(publiee) ||
    typeof edition !== "number" ||
    !Number.isSafeInteger(edition) ||
    edition < 1 ||
    !Array.isArray(observatoire.demarches)
  )
    throw new Error("referentiels/demarches.json : édition, date de l'édition ou démarches illisibles");
  const demarches: AdressesDemarches = {
    date: publiee,
    hotes: [
      ...new Set(
        observatoire.demarches.flatMap((d: unknown) => {
          const hote = typeof d === "object" && d !== null ? (d as { hote?: unknown }).hote : undefined;
          return typeof hote === "string" && hote.length <= 253 ? [hote] : [];
        }),
      ),
    ].sort(),
  };
  const regles = {
    listes: copies.map((c) => c.date),
    perimetre: perimetre.map((c) => `${c.source}:${c.date}:${c.empreinte}`),
    // A new edition, or the same one read again with other addresses, is a change of list (B.7 bis): nothing goes to
    // the journal that day (pipeline/perimetre.ts, cleDemarches).
    demarches: cleDemarches(edition, demarches),
    psl: psl.version,
    plateformes: plateformes.version,
    cdn: cdn.version,
    societes: societes.version,
    as: tableAs.version,
    methode: METHODE,
    schema: VERSION_SCHEMA,
    classement: VERSION_CLASSEMENT,
  };
  return {
    copies,
    perimetre,
    demarches,
    psl,
    plateformes: new Set(plateformes.domaines),
    temoins,
    cdn,
    societes,
    tableAs,
    regles,
  };
}
type Referentiels = ReturnType<typeof referentiels>;

// ---------------------------------------------------------------------------------------------------------------
// The classification context, from a folder of downloaded sources (today's or yesterday's).

// IPtoASN is the day's copy for yesterday too: a new copy surveyed by hand is a change of rules (brief B.7 bis), never
// a move of the hosting.
function contexteDe(dossier: string, ref: Referentiels, risDuJour: boolean, iptoasn: string): ContexteV1 {
  const fichier = (id: string) => path.join(dossier, "sources", id);

  const texte = (id: string) => (existsSync(fichier(id)) ? readFileSync(fichier(id), "utf8") : "");
  const gz = (id: string) => (existsSync(fichier(id)) ? gunzipSync(readFileSync(fichier(id))).toString("utf8") : "");
  const plages: PlagesOfficielles = {};
  const cloudflare = [...texte("cloudflare-ipv4").split(/\r?\n/), ...texte("cloudflare-ipv6").split(/\r?\n/)]
    .map((l) => l.trim())
    .filter((l) => l !== "" && estPlage(l));
  if (cloudflare.length > 0)
    plages.cloudflare = {
      plages: cloudflare,
      source: "https://www.cloudflare.com/ips-v4 et /ips-v6",
      date: "",
    };
  if (existsSync(fichier("fastly"))) {
    try {
      const fastly = validerListeFastly(JSON.parse(texte("fastly")) as unknown).filter(estPlage);
      plages.fastly = { plages: fastly, source: "https://api.fastly.com/public-ip-list", date: "" };
    } catch {
      // A list of another shape is left out: the CDN is then recognised by its CNAME suffix or its AS only.
    }
  }
  return {
    iptoasn: new TableIpToAsn(existsSync(iptoasn) ? gunzipSync(readFileSync(iptoasn)).toString("utf8") : ""),
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
  /** The day's share of domains with a confirmed breakdown: tomorrow's guard compares with it. */
  tauxPannes?: number;
};

function lireObservations(
  dossier: string,
): { mesures: Mesures; controles: Controles; pannes: Pannes; date: string; tauxPannes: number | null } | null {
  const fichier = path.join(dossier, "observations.json.gz");
  if (!existsSync(fichier)) return null;
  const o = JSON.parse(gunzipSync(readFileSync(fichier)).toString("utf8")) as Observations;
  return {
    date: o.date,
    mesures: { noms: new Map(o.noms), domaines: new Map(o.domaines), hotes: new Map(o.hotes), spf: new Map(o.spf) },
    controles: { noms: new Map(o.controleNoms), mx: new Map(o.controleMx) },
    pannes: { noms: new Set(o.pannes?.noms ?? []), zones: new Set(o.pannes?.zones ?? []), resolveur: "quad9" },
    tauxPannes:
      typeof o.tauxPannes === "number" && Number.isFinite(o.tauxPannes) && o.tauxPannes >= 0 && o.tauxPannes <= 1
        ? o.tauxPannes
        : null,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The published state (the « donnees » branch, checked out read-only).

type EtatJson = {
  date: string;
  jours: number;
  versions: { regles: Record<string, unknown> };
  qualite?: { pannesConfirmeesPourcent?: number; regleSousZoneInterne?: unknown };
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
        // A bucket and its parts (<bb>.json, <bb>.1.json…).
        if (!/^[0-9a-f]{2}(\.\d+)?\.json$/.test(f)) continue;
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

/** The brake's waits, for the summary: how many questions waited, and for how long in all (brief B.3). */
type Attentes = { ouvertures: number; questions: number; secondes: number };

function suivreDebit(
  conteneur: string | undefined,
  zoneDe: (nom: string) => string,
  estSuffixe: (zone: string) => boolean,
  estUnite: (zone: string) => boolean,
): {
  frein: OptionsCollecte["frein"];
  journal: OptionsCollecte["journal"];
  arreter: () => { debit: DebitServeurs | null; attentes: Attentes };
} {
  const attentes: Attentes = { ouvertures: 0, questions: 0, secondes: 0 };
  if (conteneur === undefined) {
    return { frein: undefined, journal: undefined, arreter: () => ({ debit: null, attentes }) };
  }
  const compteur = new CompteurServeurs(zoneDe, estSuffixe, estUnite);
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
    // The brake (brief B.3, point 02): a question that would go to a server already at SEUIL_FREIN questions within
    // the current second waits, and every question waits at SEUIL_ARRET (debit-serveurs.ts); 10 seconds at most, so
    // a stalled log never stops the collection.
    frein: async (nom, zone, ouverture) => {
      if (!compteur.freine(nom, zone, ouverture, Date.now())) return false;
      const debut = Date.now();
      if (ouverture) attentes.ouvertures += 1;
      else attentes.questions += 1;
      // A random step (100 to 300 ms) spreads the questions that waited, instead of releasing them all at once.
      while (Date.now() - debut < 10_000 && compteur.freine(nom, zone, ouverture, Date.now())) {
        await new Promise((resolve) => setTimeout(resolve, 100 + Math.floor(Math.random() * 200)));
      }
      attentes.secondes += (Date.now() - debut) / 1000;
      return true;
    },
    // What the logs tell the pace: the cost of a zone's questions, our questions, the servers' addresses.
    journal: {
      cout: (zone) => compteur.cout(zone, Date.now()),
      envoi: (zone) => compteur.noterEnvoi(zone, Date.now()),
      adresses: (hote) => compteur.adresses(hote),
      adressesDeCoupe: (coupe) => compteur.adressesDeCoupe(coupe),
    },
    arreter: () => {
      enfant.kill();
      return { debit: enErreur ? null : compteur.resultat(), attentes };
    },
  };
}

async function principal(): Promise<number> {
  const travail = o.travail;
  if (travail === undefined) throw new Error("option manquante : --travail <dossier>");
  const maintenant = new Date();
  const date = o.date ?? maintenant.toISOString().slice(0, 10);
  const heure = maintenant.toISOString();
  rmSync(path.join(travail, "sortie"), { recursive: true, force: true });
  mkdirSync(path.join(travail, "sortie"), { recursive: true });
  const version = json<{ version: string }>(RACINE, "package.json").version;
  const agent = agentUtilisateur(version);
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
  const graine = Number(date.replaceAll("-", ""));
  const quad9 = new ClientCadence(new ClientUdp("quad9", o.controle, 53, 8_000), 2);
  // The fourth rule of the method (§ 3, point 04): at each new list, 20 of its names are asked again to Quad9; if one
  // answers, the rule is suspended and its names are measured, until it is reviewed at the next point.
  const listeAvecRegle = construireListe(
    ref.copies,
    dila,
    ref.psl,
    ref.plateformes,
    ".gouv.fr",
    REGLES_EXCLUSION,
    ref.perimetre,
    ref.demarches,
  );
  const nomsRegle = [...(listeAvecRegle.ecartes.get("sous-zone interne") ?? [])];
  const derniereListe = ref.copies.at(-1)?.date ?? "";
  const etatVeille =
    o.donnees !== undefined && existsSync(path.join(o.donnees, "etat.json"))
      ? json<EtatJson>(o.donnees, "etat.json")
      : null;
  const regleVeille = lireEtatRegleInterne(etatVeille?.qualite?.regleSousZoneInterne);
  const regleInterne: EtatRegleInterne =
    regleVeille !== null && controleDu(regleVeille, derniereListe, METHODE) === "garder"
      ? regleVeille
      : // Drawn by the list, not by the day: a check that a red day did not publish draws the same names again.
        await reposerNoms(
          quad9,
          nomsRegle,
          generateur(Number(derniereListe.replaceAll("-", "")) + 2),
          date,
          derniereListe,
          METHODE,
          regleVeille,
        );
  const liste =
    regleInterne.etat === "suspendue"
      ? construireListe(
          ref.copies,
          dila,
          ref.psl,
          ref.plateformes,
          ".gouv.fr",
          { sousZoneInterne: false },
          ref.perimetre,
          ref.demarches,
        )
      : listeAvecRegle;
  const zoneDe = (nom: string) => domaineEnregistrable(nom, ref.psl) ?? nom;
  // Each unit's web name is measured too (it carries the domain's addresses layer); a trial draws a sample whose
  // names, web names included, never exceed its limit.
  const echantillon = (nombre: number) => {
    const tires = melanger([...liste.noms.values()], generateur(graine)).slice(0, nombre);
    const unites = new Set(tires.map((e) => e.domaine));
    const domaines = [...liste.domaines.values()].filter((d) => unites.has(d.domaine));
    const choisis = new Map<string, string>(tires.map((e) => [e.nom, e.domaine]));
    for (const d of domaines) choisis.set(d.nomWeb, d.domaine);
    return { domaines, noms: choisis };
  };
  let tirage = echantillon(liste.noms.size);
  if (o.limite !== undefined) {
    const limite = Number(o.limite);
    if (!Number.isInteger(limite) || limite < 1) {
      throw new Error(`--limite : un nombre entier de noms, au moins 1 (reçu « ${o.limite} »)`);
    }
    for (let nombre = limite; nombre > 0; nombre = Math.floor(nombre * 0.9)) {
      tirage = echantillon(nombre);
      if (tirage.noms.size <= limite) break;
    }
    if (tirage.noms.size > limite) throw new Error(`--limite ${limite} : trop petite pour un nom et son nom web`);
  }
  const domainesMesures = tirage.domaines;
  const noms = tirage.noms;
  verifierLimite(noms.size);

  // The measurement, with Quad9 and Cloudflare alongside, at their own pace.
  const [hote, port] = adresseEtPort(o.resolveur);
  const knot = new ClientUdp("knot", hote, port, 12_000);
  const cloudflare = new ClientCadence(new ClientUdp("cloudflare", o.temoins, 53, 8_000), 2);
  const nomsTemoins = ref.temoins.temoins.map((t) => t.nom);
  const plan = planDeControle(domainesMesures, nomsTemoins, generateur(graine + 1));
  // Only the ICANN section's suffixes (such as gouv.fr) name a server: never the private section's, which are
  // companies' platforms. Only the units of the list name a busy second's zones.
  const debit = suivreDebit(
    o.conteneur,
    zoneDe,
    (zone) => ref.psl.icann?.has(zone) === true,
    (zone) => liste.domaines.has(zone),
  );
  const suivi = (ligne: string) => console.log(`collecte : ${ligne}`);
  const minutes = () => Math.round((Date.now() - maintenant.getTime()) / 60_000);
  // The controls after the measurement stop at 300 minutes: what is left keeps its level without control (« probable »),
  // and the job always has time to build and keep the day (it stops at 330 minutes, within GitHub's 6 hours). Day 2's
  // first pass took 216 minutes on a slow network, and its retries were dropped: the margins leave room for them. A
  // retry starts until 255 minutes, and none of its tasks is taken after 290 (one already taken may still end); the
  // options were checked as soon as they were read (LIMITES).
  const [echeanceMinutes, finReprisesMinutes, finControlesMinutes] = LIMITES;
  const minutesDe = (minutes: number) => maintenant.getTime() + minutes * 60_000;
  // The emergency stop brings the controls' deadline to its instant: Quad9 is asked nothing more for a lost day.
  let finControles = minutesDe(finControlesMinutes);
  const finDesControles = () => finControles;
  /** The confirmations of the failures keep their own deadline: after a stop, a few of them are still asked. */
  const finConfirmations = minutesDe(finControlesMinutes);
  // The hosts of the « État » domains (name servers, mail exchangers), asked to Quad9 as soon as each domain is
  // measured: Quad9's pace is shared with the control of the plan, which ends long before the first pass, so the hosts
  // fill the time Quad9 would otherwise wait (the day's tail was this control, run after the first pass).
  const domainesEtat = new Set(domainesMesures.filter((d) => d.perimetre === "État").map((d) => d.domaine));
  const nomsWeb = new Map(domainesMesures.map((d) => [d.domaine, d.nomWeb] as const));
  const controleHotesEnCours = new ControleEnContinu(quad9, 8, finDesControles);
  const hotesDeZone = (zone: MesureZone) => [...zone.ns.slice(0, 13), ...zone.mx.slice(0, 10).map((x) => x.hote)];
  const [mesures, controleQuad9, controleCloudflare] = await Promise.all([
    collecter(noms, knot, {
      ...POLITESSE,
      nomsParSeconde: Number(o["noms-par-seconde"]),
      delaiRepriseMs: Number(o["delai-reprise-minutes"]) * 60_000,
      echeance: minutesDe(echeanceMinutes),
      finReprises: minutesDe(finReprisesMinutes),
      zoneDe,
      suivi,
      nomWebDe: (domaine) => nomsWeb.get(domaine),
      surArret: () => {
        finControles = Date.now();
      },
      apresDomaine: (domaine, zone) => {
        if (domainesEtat.has(domaine)) controleHotesEnCours.ajouter(hotesDeZone(zone));
      },
      apresPremierePasse: () =>
        suivi(
          `première passe finie à ${minutes()} min ; ${controleHotesEnCours.noms.length} hôtes de l'État au contrôle`,
        ),
      ...(debit.frein === undefined ? {} : { frein: debit.frein }),
      ...(debit.journal === undefined ? {} : { journal: debit.journal }),
    }),
    controler(quad9, plan.noms, plan.mx, 8, finDesControles),
    controler(cloudflare, nomsTemoins, []),
  ]);
  suivi(`mesure, reprises et contrôles parallèles finis à ${minutes()} min`);
  // Every « État » domain was announced by the measurement (first pass and attempts): nothing more is added.
  const controleHotes = await controleHotesEnCours.fermer();
  const hotesControles = controleHotesEnCours.noms;
  suivi(`contrôle de ${hotesControles.length} hôtes de l'État fini à ${minutes()} min`);
  const temoinsKnot = new Map(await Promise.all(nomsTemoins.map(async (n) => [n, await mesurerNom(n, knot)] as const)));
  // Point 02, Q2: every domain still failing after its attempts is asked once to Quad9 (NS when its zone fails, the
  // web name's address otherwise). A failure Quad9 shares is the domain's own breakdown, published « échec, confirmé
  // par Quad9 »; the others are the collection's, and only they count in the guard of 2 %.
  const ECHECS_DNS = new Set(["SERVFAIL", "TIMEOUT", "REFUSED", "ERREUR"]);
  const pannes: Pannes = { noms: new Set<string>(), zones: new Set<string>(), resolveur: "quad9" };
  const aConfirmer = domainesMesures.filter(
    (d) =>
      mesures.domaines.get(d.domaine)?.etat === "echec" ||
      mesures.domaines.get(d.domaine)?.mxEtat === "echec" ||
      mesures.noms.get(d.nomWeb)?.etat === "echec",
  );
  // The domains whose MX question alone failed, and Quad9's too (for the guard only: nothing else is published).
  const pannesMx = new Set<string>();
  const confirmer = async () => {
    for (let d = aConfirmer.shift(); d !== undefined && Date.now() < finConfirmations; d = aConfirmer.shift()) {
      const zoneEnEchec = mesures.domaines.get(d.domaine)?.etat === "echec";
      const webEnEchec = mesures.noms.get(d.nomWeb)?.etat === "echec";
      const [nom, type] = zoneEnEchec
        ? [d.domaine, "NS" as const]
        : webEnEchec
          ? [d.nomWeb, "A" as const]
          : [d.domaine, "MX" as const];
      const r = await quad9.demander(nom, type);
      if (!ECHECS_DNS.has(r.code)) continue;
      if (zoneEnEchec) (pannes.zones as Set<string>).add(d.domaine);
      if (webEnEchec) (pannes.noms as Set<string>).add(d.nomWeb);
      if (type === "MX") pannesMx.add(d.domaine);
    }
  };
  // A stopped day is never published: a few confirmations are kept for the diagnosis, the rest is not asked.
  if (mesures.arret !== null && aConfirmer.length > CONFIRMATIONS_APRES_ARRET) {
    suivi(`arrêt d'urgence : ${CONFIRMATIONS_APRES_ARRET} des ${aConfirmer.length} pannes seulement reposées à Quad9`);
    aConfirmer.splice(CONFIRMATIONS_APRES_ARRET);
  }
  const nombreAConfirmer = aConfirmer.length;
  await Promise.all(Array.from({ length: 8 }, confirmer));
  suivi(`confirmation de ${nombreAConfirmer} pannes finie à ${minutes()} min`);
  const { debit: debitServeurs, attentes: attentesFrein } = debit.arreter();
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

  // Today's state.
  const risDuJour = source("ris-ipv4")?.etat === "du jour" && source("ris-ipv6")?.etat === "du jour";
  const copieIptoasn = path.join(travail, "sources", "iptoasn");
  const contexte = contexteDe(travail, ref, risDuJour, copieIptoasn);
  const rapportJour = { erreurs: 0, reduits: 0 };
  const jour = construireEtat(liste, mesures, controles, contexte, heure, pannes, rapportJour);

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
  // The names that work with one family of addresses while the other's question failed (never asked again).
  const famillesEnEchec = [...mesures.noms.values()].filter((m) => m.echecFamille !== undefined).length;
  const echecsParCode: Record<string, number> = {};
  for (const m of mesures.noms.values())
    if (m.etat === "echec") echecsParCode[m.echec ?? "ERREUR"] = (echecsParCode[m.echec ?? "ERREUR"] ?? 0) + 1;
  const tauxEchec = mesuresNoms.length === 0 ? 1 : echecs / mesuresNoms.length;
  // The guard counts the units (the domains of decision D1): a domain fails when its zone, its mail exchangers' question
  // or its web name fails. One
  // broken zone that holds hundreds of names of the list does not block the publication by itself.
  const unitesEnEchec = [...jour.domaines.values()].filter(
    (d) => d.zone.etat === "echec" || d.messagerie.etat === "echec" || jour.noms.get(d.nomWeb)?.etat === "echec",
  );
  const domainesEnEchec = unitesEnEchec.length;
  const pannesConfirmees = unitesEnEchec.filter(
    (d) =>
      (d.zone.echec?.confirmePar ?? null) !== null ||
      (jour.noms.get(d.nomWeb)?.echec?.confirmePar ?? null) !== null ||
      pannesMx.has(d.domaine),
  ).length;
  const echecsNonConfirmes = domainesEnEchec - pannesConfirmees;
  const part = (x: number) => (jour.domaines.size === 0 ? 1 : x / jour.domaines.size);
  const tauxEchecDomaines = part(echecsNonConfirmes);
  const tauxPannes = part(pannesConfirmees);
  // The day's observations, kept as tomorrow's yesterday when the day is trustworthy, with its breakdowns' share.
  observations.tauxPannes = tauxPannes;
  writeFileSync(path.join(travail, "observations.json.gz"), gzipSync(JSON.stringify(observations)));
  // The failing domains, for the diagnosis of a degraded day: beside the output, never in it (the run's artifact only).
  writeFileSync(
    path.join(travail, "diagnostic.json"),
    `${JSON.stringify({ date, essai: o.essai, domaines: diagnosticDesEchecs(jour) })}\n`,
  );

  const veilleObs = o.veille === undefined ? null : lireObservations(o.veille);
  const veille =
    veilleObs === null || o.veille === undefined
      ? null
      : construireEtat(
          liste,
          veilleObs.mesures,
          veilleObs.controles,
          contexteDe(o.veille, ref, true, copieIptoasn),
          heure,
          veilleObs.pannes,
        );
  const publie = lirePublie(o.donnees);
  // The rules: the lists and referentials of the repository, and the date of the IPtoASN copy.
  // A suspended fourth rule changes the rules of the day (B.7 bis): its names coming back are never moves.
  const regles = { ...ref.regles, iptoasn: source("iptoasn")?.date ?? null, sousZoneInterne: regleInterne.etat };
  const reglesChangees = publie !== null && jsonStable(publie.meta.versions.regles) !== jsonStable(regles);
  // New rules without yesterday (the cache was lost): the records keep the published classification, so etat.json keeps
  // the published rules too, and the rebase happens on the next day that has a yesterday (brief B.7 bis).
  const reglesPubliees = reglesChangees && veille === null ? (publie?.meta.versions.regles ?? regles) : regles;
  // The confirmed breakdowns of the day before, for the second safety of point 02 (Q2): yesterday's kept measurement
  // when there is one (a day stopped by this guard alone is kept: a lasting change passes the next day), else the last
  // published day.
  const pannesVeille =
    veilleObs?.tauxPannes ??
    (publie?.meta.qualite?.pannesConfirmeesPourcent === undefined
      ? null
      : publie.meta.qualite.pannesConfirmeesPourcent / 100);
  const gardePannes = gardesPannes(tauxPannes, pannesVeille);
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
            // A description or a holder's name may name a person (an AS held by an individual): both are published
            // only for the AS of the companies of referentiels/ (MEGA § 0.2, no personal data).
            description: ref.tableAs.as[String(a)] === undefined ? null : (descriptions.get(a) ?? null),
            paysEnregistrement: contexte.paysAs.get(a) ?? null,
            titulaire: ref.tableAs.as[String(a)] === undefined ? null : (ripe.get(a)?.orgName ?? null),
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

  const partReduites = (rapportJour.reduits + rapportJour.erreurs) / Math.max(1, jour.noms.size + jour.domaines.size);
  const gardes: Garde[] = [
    // The emergency stop (collecte.ts): a collection stopped before its end is never published.
    { nom: "collecte menée à son terme", ok: mesures.arret === null, detail: mesures.arret ?? "" },
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
      nom: "pannes confirmées sous 8 %",
      ok: gardePannes.plafond,
      detail: `${pannesConfirmees} sur ${jour.domaines.size} (${(100 * tauxPannes).toFixed(2)} %)`,
    },
    {
      nom: "pannes confirmées à moins de 2 points de la veille",
      ok: gardePannes.hausse,
      relatifALaVeille: true,
      detail:
        pannesVeille === null
          ? "veille absente : sans objet"
          : `${(100 * tauxPannes).toFixed(2)} % ; la veille : ${(100 * pannesVeille).toFixed(2)} %`,
    },
    {
      nom: "disjoncteur sous 2 %",
      relatifALaVeille: true,
      ok: !o["essai-disjoncteur"] && (b.disjoncteur.part === null || b.disjoncteur.part < SEUIL_DISJONCTEUR),
      detail: o["essai-disjoncteur"]
        ? "essai : disjoncteur déclenché exprès"
        : b.disjoncteur.part === null
          ? "veille absente : sans objet"
          : `${b.disjoncteur.changes} sur ${b.disjoncteur.compares} (${(100 * b.disjoncteur.part).toFixed(2)} %)`,
    },
    {
      nom: "fiches réduites sous 0,1 %",
      ok: partReduites < SEUIL_REDUITES,
      detail: `${rapportJour.reduits + rapportJour.erreurs} sur ${jour.noms.size + jour.domaines.size} (schéma refusé : ${rapportJour.reduits} ; erreur : ${rapportJour.erreurs})`,
    },
    { nom: "schémas valides", ok: erreursSchema.length === 0, detail: erreursSchema.slice(0, 5).join(" ; ") },
  ];
  const publiable = gardes.every((g) => g.ok);
  // A trustworthy measurement (every guard green but, maybe, those that compare with yesterday: the circuit breaker,
  // the breakdowns' day-to-day rise) becomes tomorrow's yesterday: after a real change, the next day compares with it,
  // and the change is confirmed (no manual gesture, never red for ever).
  const veilleUtilisable = veilleUtilisableDe(gardes);

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
    versions: { regles: reglesPubliees, dila: dila?.fichier ?? null, schema: VERSION_SCHEMA },
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
      nomsUneFamilleEnEchec: famillesEnEchec,
      tauxEchecPourcent: Math.round(10000 * tauxEchec) / 100,
      enregistrementsReduits: rapportJour.reduits,
      enregistrementsEnErreur: rapportJour.erreurs,
      domainesEnEchec,
      echecsNonConfirmes,
      tauxEchecNonConfirmesPourcent: Math.round(10000 * tauxEchecDomaines) / 100,
      pannesConfirmees,
      pannesConfirmeesPourcent: Math.round(10000 * tauxPannes) / 100,
      domaines: b.etat.domaines.size,
      domainesEtat: [...b.etat.domaines.values()].filter((d) => d.perimetre === "État").length,
      exclus: Object.fromEntries(liste.exclus),
      // The fourth rule, its text and the names it sets aside (0 while suspended), with its last check at Quad9.
      regleSousZoneInterne: {
        texte: TEXTE_REGLE_INTERNE,
        noms: liste.exclus.get("sous-zone interne") ?? 0,
        nomsConcernes: nomsRegle.length,
        ...regleInterne,
      },
      temoins: {
        concordants: temoins.concordants,
        ecarts: temoins.verdicts.filter((v) => !v.ok).map((v) => `${v.nom} (${v.resolveur})`),
      },
      controle: { resolveur: "quad9", noms: plan.noms.length + hotesControles.length, mx: plan.mx.length },
      debitMaxParServeur:
        debitServeurs === null
          ? null
          : {
              questions: debitServeurs.questions,
              // The two figures of the tolerance (methode B.3): the share of seconds above 10, and the highest count.
              secondes: debitServeurs.secondes,
              secondesAuDela: debitServeurs.secondesAuDela,
              partAuDelaPourcent:
                debitServeurs.secondes === 0
                  ? 0
                  : Math.round((100_000 * debitServeurs.secondesAuDela) / debitServeurs.secondes) / 1000,
              max: debitServeurs.max,
              // The server's top-level zones, never its address.
              serveur: debitServeurs.tldsMax,
              seconde: debitServeurs.seconde,
            },
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
  // The registered zones of a busy second that are units of the list (public bodies' domains, published anyway): named;
  // never a third party's.
  const dontListe = (zones: readonly string[]) => {
    const nommees = zones.filter((z) => liste.domaines.has(z));
    return nommees.length === 0 ? "" : `, dont ${nommees.map((z) => `« ${z} »`).join(", ")}`;
  };
  const resume = [
    `## Collecte du ${date}${o.essai ? " (essai)" : ""}`,
    "",
    `- Noms mesurés : ${mesuresNoms.length} sur ${liste.noms.size} ; domaines : ${b.etat.domaines.size} ; durée : ${etatJson.collecte.dureeMinutes} min.`,
    `- Règle « sous-zone interne » (méthode § 3) : ${
      regleInterne.etat === "appliquée"
        ? `${liste.exclus.get("sous-zone interne") ?? 0} noms écartés`
        : `suspendue, ses ${nomsRegle.length} noms sont mesurés (à revoir au point suivant)`
    } ; noms reposés à Quad9 le ${regleInterne.controle.date} (liste du ${regleInterne.liste || "?"}) : ${regleInterne.controle.poses} noms, dont avec adresse ${regleInterne.controle.codes.avecAdresse}, NXDOMAIN ${regleInterne.controle.codes.nxdomain}, NOERROR sans adresse ${regleInterne.controle.codes.sansAdresse}, SERVFAIL ${regleInterne.controle.codes.servfail}, délais ${regleInterne.controle.codes.delai}, autres ${regleInterne.controle.codes.autre}.`,
    `- Changements confirmés : ${b.changements.length}${b.etatInitial ? " (état initial)" : ""}${b.reglesChangees ? " (règles nouvelles : rien au journal)" : ""}.`,
    `- Débit maximal vers un même serveur faisant autorité : ${
      debitServeurs === null
        ? "non mesuré"
        : `${debitServeurs.max} questions en une seconde (${debitServeurs.tldsMax.length > 0 ? `un serveur de « ${debitServeurs.tldsMax.join(", ")} »` : "un serveur d'une autre zone"}, ${debitServeurs.seconde ?? "?"}) ; secondes au-delà de 10 : ${debitServeurs.secondesAuDela} sur ${debitServeurs.secondes} (${
            debitServeurs.secondes === 0
              ? "0"
              : String(Math.round((100_000 * debitServeurs.secondesAuDela) / debitServeurs.secondes) / 1000).replace(
                  ".",
                  ",",
                )
          } %) ; tolérance d'une collecte (jamais plus de 15, et au plus une seconde au-delà de 10, ou 0,1 % des secondes si c'est plus) : ${
            debitServeurs.max <= 15 &&
            debitServeurs.secondesAuDela <= Math.max(1, Math.floor(debitServeurs.secondes / 1000))
              ? "tenue"
              : "dépassée"
          }`
    }.`,
    // The servers above 10, by the top-level zones they serve, never by their address: in their worst second, how many
    // zone cuts and registered zones they were asked about (the units of the list named), how many distinct names, how
    // many questions to a parent of their zone (a DS asked again and again), and which questions: what tells a shared
    // server, a zone's retries and a burst of sub-zones apart.
    `- Au-delà de 10, par serveur : ${
      (debitServeurs?.auDela ?? [])
        .map(
          (s) =>
            `${s.tlds.length > 0 ? `un serveur de « ${s.tlds.join(", ")} »` : "un serveur d'une autre zone"} : ${s.secondes} s, au plus ${s.max} (pire seconde : ${s.coupes} coupures de zone, ${s.zones} zones${dontListe(s.zonesVues)}, ${s.noms} noms distincts, ${s.auParent} au parent de leur zone, ${Object.entries(
              s.parType,
            )
              .map(([type, n]) => `${type} ${n}`)
              .join(", ")})`,
        )
        .join(" ; ") || "aucun"
    }.`,
    // The zones whose servers got the most questions per question of ours, which the pace weighs: named only when they
    // are units of the list (public bodies' domains, published anyway), never a third party's.
    `- Questions du résolveur par question de la collecte (les zones qui en ajoutent le plus) : ${
      (debitServeurs?.amplifications ?? [])
        .map(
          (a) =>
            `${liste.domaines.has(a.zone) ? a.zone : "une autre zone"} : ${String(Math.round((10 * a.amont) / a.envois) / 10).replace(".", ",")} (${a.amont} pour ${a.envois} ; ${Object.entries(
              a.parType,
            )
              .map(([type, n]) => `${type} ${n}`)
              .join(", ")})`,
        )
        .join(" ; ") || "aucune"
    }.`,
    // Only the top-level zones are named in this public summary; the others (a host's customers, a CDN…) are counted.
    `- Frein : ${attentesFrein.ouvertures} questions vers une zone parente (ouverture d’un domaine, première question d’une zone) et ${attentesFrein.questions} autres questions ont attendu (${Math.round(attentesFrein.secondes)} s en tout) ; secondes chargées par zone : ${
      [
        ...(debitServeurs?.coupesChaudes ?? [])
          .filter((c) => !c.coupe.includes(".") || c.coupe === ".")
          .map((c) => `${c.coupe} (${c.secondes} s)`),
        ...(debitServeurs?.coupesChaudes ?? [])
          .filter((c) => c.coupe.includes(".") && c.coupe !== ".")
          .map((c) => `une autre zone (${c.secondes} s)`),
      ].join(", ") || "aucune"
    }.`,
    // The busiest servers named by the top-level zones they serve, never by their address (a ministry's, a host's).
    `- Serveurs les plus demandés : ${
      (debitServeurs?.adressesChargees ?? [])
        .map(
          (a) =>
            `${a.tlds.length > 0 ? `un serveur de « ${a.tlds.join(", ")} »` : "un serveur d'une autre zone"} (${a.questions} questions : ${Object.entries(
              a.parType,
            )
              .map(([type, n]) => `${type} ${n}`)
              .join(", ")})`,
        )
        .join(" ; ") || "non mesuré"
    }.`,
    `- Sources lues de la veille ou en échec : ${etatJson.lecturesEnEchec}.`,
    `- Enregistrements réduits (schéma) : ${rapportJour.reduits} ; en erreur : ${rapportJour.erreurs}.`,
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
    } ; noms qui marchent avec une seule famille d'adresses (l'autre en échec, jamais reprise) : ${famillesEnEchec}.`,
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
  writeFileSync(
    path.join(travail, "rapport.json"),
    `${JSON.stringify({ date, publiable, veilleUtilisable, gardes }, null, 2)}\n`,
  );
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
