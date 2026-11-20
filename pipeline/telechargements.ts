// The files the collection downloads (docs/sources.md: each one is « retenue » or « retenue en contrôle seulement »),
// politely (sources.ts: robots.txt first, one second per host, an identified agent), with the last copy as a
// fallback (plan § 13.4): a source that fails keeps its last copy, said in etat.json with that copy's date; with no
// copy at all, the source is « en échec » and the layers it feeds say so.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Telechargeur } from "./sources";

export type Source = { id: string; fiche: number; url: string; frequence: "jour" | "semaine" };

const RIR = (id: string, url: string): Source => ({ id: `rir-${id}`, fiche: 21, url, frequence: "jour" });

export const SOURCES: readonly Source[] = [
  {
    id: "dila",
    fiche: 4,
    url: "https://echanges.dila.gouv.fr/OPENDATA/RefOrgaAdminEtat/FluxAnneeCourante/dila_refOrga_admin_Etat_fr_latest.zip",
    frequence: "jour",
  },
  { id: "iptoasn", fiche: 18, url: "https://iptoasn.com/data/ip2asn-combined.tsv.gz", frequence: "jour" },
  { id: "ris-ipv4", fiche: 19, url: "https://www.ris.ripe.net/dumps/riswhoisdump.IPv4.gz", frequence: "jour" },
  { id: "ris-ipv6", fiche: 19, url: "https://www.ris.ripe.net/dumps/riswhoisdump.IPv6.gz", frequence: "jour" },
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
  },
  {
    id: "ripe-organisation",
    fiche: 22,
    url: "https://ftp.ripe.net/ripe/dbase/split/ripe.db.organisation.gz",
    frequence: "semaine",
  },
  { id: "cloudflare-ipv4", fiche: 27, url: "https://www.cloudflare.com/ips-v4", frequence: "jour" },
  { id: "cloudflare-ipv6", fiche: 27, url: "https://www.cloudflare.com/ips-v6", frequence: "jour" },
  { id: "fastly", fiche: 27, url: "https://api.fastly.com/public-ip-list", frequence: "jour" },
];

export type EtatSource = {
  id: string;
  fiche: number;
  url: string;
  etat: "du jour" | "de la semaine" | "de la veille" | "en échec";
  /** The copy's date: its Last-Modified header, else the day it was downloaded. */
  date: string | null;
  octets: number;
  sha256: string | null;
};

type Meta = { date: string; telecharge: string; octets: number; sha256: string };

const AU_PLUS = 300 * 1024 * 1024;
const JOUR = 24 * 60 * 60 * 1000;

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
