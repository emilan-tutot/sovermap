// The files the collection downloads (docs/sources.md: each one is « retenue » or « retenue en contrôle seulement »),
// politely (sources.ts: robots.txt first, one second per host, an identified agent), with the last copy as a
// fallback (plan § 13.4): a source that fails keeps its last copy, said in etat.json with that copy's date; with no
// copy at all, the source is « en échec » and the layers it feeds say so.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { lireDila } from "./dila";
import type { Telechargeur } from "./sources";
import { validerListeFastly } from "./valider";
import { lireZip } from "./zip";

export type Source = {
  id: string;
  fiche: number;
  url: string;
  frequence: "jour" | "semaine";
  /**
   * Throws when the body is not what the source gives (an error page served with status 200, a cut file): the
   * download then counts as failed, and yesterday's copy serves (plan § 13.4). Nothing malformed reaches the day.
   */
  verifier?: (corps: Buffer) => void;
};

/** A gzip file that opens and is not empty. */
const gzip = (corps: Buffer): void => {
  if (gunzipSync(corps).length === 0) throw new Error("fichier gzip vide");
};
/** The Référentiel of the DILA: a zip that holds its JSON file of services. */
const archiveDila = (corps: Buffer): void => {
  const [nom, contenu] = [...lireZip(corps, (n) => n.endsWith(".json")).entries()][0] ?? [];
  if (nom === undefined || contenu === undefined) throw new Error("aucun fichier JSON dans l'archive");
  lireDila(contenu.toString("utf8"), nom);
};
/** A delegation file of a registry: lines « registry|country|asn|… ». */
const delegations = (corps: Buffer): void => {
  if (!/^[a-z]+\|[A-Z]{2}\|asn\|/m.test(corps.toString("latin1"))) throw new Error("aucune ligne d'AS");
};
/** A list of ranges, one per line. */
const listePlages = (corps: Buffer): void => {
  if (!/^[0-9a-f.:]+\/\d{1,3}$/im.test(corps.toString("utf8"))) throw new Error("aucune plage");
};
const listeFastly = (corps: Buffer): void => {
  if (validerListeFastly(JSON.parse(corps.toString("utf8")) as unknown).length === 0) throw new Error("liste vide");
};

const RIR = (id: string, url: string): Source => ({
  id: `rir-${id}`,
  fiche: 21,
  url,
  frequence: "jour",
  verifier: delegations,
});

export const SOURCES: readonly Source[] = [
  {
    id: "dila",
    fiche: 4,
    url: "https://echanges.dila.gouv.fr/OPENDATA/RefOrgaAdminEtat/FluxAnneeCourante/dila_refOrga_admin_Etat_fr_latest.zip",
    frequence: "jour",
    verifier: archiveDila,
  },
  {
    id: "ris-ipv4",
    fiche: 19,
    url: "https://www.ris.ripe.net/dumps/riswhoisdump.IPv4.gz",
    frequence: "jour",
    verifier: gzip,
  },
  {
    id: "ris-ipv6",
    fiche: 19,
    url: "https://www.ris.ripe.net/dumps/riswhoisdump.IPv6.gz",
    frequence: "jour",
    verifier: gzip,
  },
  RIR("ripencc", "https://ftp.ripe.net/pub/stats/ripencc/delegated-ripencc-extended-latest"),
  RIR("arin", "https://ftp.arin.net/pub/stats/arin/delegated-arin-extended-latest"),
  RIR("apnic", "https://ftp.apnic.net/stats/apnic/delegated-apnic-extended-latest"),
  RIR("lacnic", "https://ftp.lacnic.net/pub/stats/lacnic/delegated-lacnic-extended-latest"),
  RIR("afrinic", "https://ftp.afrinic.net/pub/stats/afrinic/delegated-afrinic-extended-latest"),
  {
    id: "ripe-aut-num",
    fiche: 22,
    url: "https://ftp.ripe.net/ripe/dbase/split/ripe.db.aut-num.gz",
    frequence: "semaine",
    verifier: gzip,
  },
  {
    id: "ripe-organisation",
    fiche: 22,
    url: "https://ftp.ripe.net/ripe/dbase/split/ripe.db.organisation.gz",
    frequence: "semaine",
    verifier: gzip,
  },
  {
    id: "cloudflare-ipv4",
    fiche: 27,
    url: "https://www.cloudflare.com/ips-v4",
    frequence: "jour",
    verifier: listePlages,
  },
  {
    id: "cloudflare-ipv6",
    fiche: 27,
    url: "https://www.cloudflare.com/ips-v6",
    frequence: "jour",
    verifier: listePlages,
  },
  {
    id: "fastly",
    fiche: 27,
    url: "https://api.fastly.com/public-ip-list",
    frequence: "jour",
    verifier: listeFastly,
  },
];

export type EtatSource = {
  id: string;
  fiche: number;
  url: string;
  etat: "du jour" | "de la semaine" | "de la veille" | "relevé manuel" | "en échec";
  /** The copy's date: its Last-Modified header, else the day it was downloaded. */
  date: string | null;
  octets: number;
  sha256: string | null;
};

type Meta = { date: string; telecharge: string; octets: number; sha256: string };

const AU_PLUS = 300 * 1024 * 1024;
const JOUR = 24 * 60 * 60 * 1000;

/**
 * A source surveyed by hand (IPtoASN, whose files are closed to robots, docs/sources.md card 18): the owner's copy,
 * dated by its survey (`<name>-AAAA-MM-JJ.<ext>`), reaches the runners through a release of the repository and is put
 * among the day's sources; never downloaded from its producer by the collection.
 */
export function releverManuel(
  travail: string,
  id: string,
  fiche: number,
  fichier: string,
  maintenant: Date,
): EtatSource {
  const releve = /-(\d{4}-\d{2}-\d{2})\.[a-z.]+$/.exec(path.basename(fichier))?.[1];
  if (releve === undefined) throw new Error(`${fichier} : nom sans date de relevé (-AAAA-MM-JJ)`);
  const corps = readFileSync(fichier);
  const dossier = path.join(travail, "sources");
  mkdirSync(dossier, { recursive: true });
  const meta: Meta = {
    date: `${releve}T00:00:00.000Z`,
    telecharge: maintenant.toISOString(),
    octets: corps.length,
    sha256: createHash("sha256").update(corps).digest("hex"),
  };
  writeFileSync(path.join(dossier, id), corps);
  writeFileSync(path.join(dossier, `${id}.meta.json`), `${JSON.stringify(meta)}\n`);
  return {
    id,
    fiche,
    url: `relevé manuel du ${releve}`,
    etat: "relevé manuel",
    date: meta.date,
    octets: meta.octets,
    sha256: meta.sha256,
  };
}

/**
 * Downloads every source into `travail/sources/` (a file and its `.meta.json`). `veille` is the folder of the last
 * successful collection (its `sources/`), used for the weekly files that are still fresh and as the fallback.
 */
export async function telechargerSources(
  telechargeur: Telechargeur,
  travail: string,
  veille: string | null,
  maintenant: Date,
  sources: readonly Source[] = SOURCES,
): Promise<EtatSource[]> {
  const dossier = path.join(travail, "sources");
  mkdirSync(dossier, { recursive: true });
  const etats: EtatSource[] = [];
  for (const s of sources) {
    const cible = path.join(dossier, s.id);
    const ancienne = veille === null ? null : path.join(veille, "sources", s.id);
    const metaAncienne: Meta | null =
      ancienne !== null && existsSync(`${ancienne}.meta.json`)
        ? (JSON.parse(readFileSync(`${ancienne}.meta.json`, "utf8")) as Meta)
        : null;
    const reprendre = (etat: EtatSource["etat"]) => {
      if (ancienne === null || metaAncienne === null || !existsSync(ancienne)) return false;
      // The same folder may serve as today's and yesterday's (a local trial): the copy is then already in place.
      if (path.resolve(ancienne) !== path.resolve(cible)) {
        copyFileSync(ancienne, cible);
        copyFileSync(`${ancienne}.meta.json`, `${cible}.meta.json`);
      }
      etats.push({ ...s, etat, date: metaAncienne.date, octets: metaAncienne.octets, sha256: metaAncienne.sha256 });
      return true;
    };
    if (
      s.frequence === "semaine" &&
      metaAncienne !== null &&
      maintenant.getTime() - Date.parse(metaAncienne.telecharge) < 6.5 * JOUR &&
      reprendre("de la semaine")
    ) {
      continue;
    }
    try {
      const r = await telechargeur.obtenir(s.url);
      if (r.statut !== 200) throw new Error(`HTTP ${r.statut}`);
      if (r.corps.length === 0 || r.corps.length > AU_PLUS) throw new Error(`taille ${r.corps.length}`);
      s.verifier?.(r.corps);
      const derniere = r.entetes.get("last-modified");
      const meta: Meta = {
        date:
          derniere && !Number.isNaN(Date.parse(derniere)) ? new Date(derniere).toISOString() : maintenant.toISOString(),
        telecharge: maintenant.toISOString(),
        octets: r.corps.length,
        sha256: createHash("sha256").update(r.corps).digest("hex"),
      };
      writeFileSync(cible, r.corps);
      writeFileSync(`${cible}.meta.json`, `${JSON.stringify(meta)}\n`);
      etats.push({ ...s, etat: "du jour", date: meta.date, octets: meta.octets, sha256: meta.sha256 });
    } catch {
      if (!reprendre("de la veille")) etats.push({ ...s, etat: "en échec", date: null, octets: 0, sha256: null });
    }
  }
  return etats;
}
