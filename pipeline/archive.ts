// The monthly archive's exact addresses (brief B.8, F.2): they come from the last day's measurement, and are given to a
// published record only when they match it. A record held back by the hysteresis still shows an earlier day's
// content: pairing it with today's addresses would mix two days (the code review of PR 6, finding 7).
import type { MesureNom } from "./mesure";
import type { EnregistrementNom } from "./publication";
import { adresseEnEntier } from "./reseau";

/** Is an address inside a published IPtoASN range (« start-end »)? */
export function dansLaPlage(adresse: string, plage: string): boolean {
  const [debut = "", fin = "", ...reste] = plage.split("-");
  if (reste.length > 0) return false;
  try {
    const a = adresseEnEntier(adresse);
    const d = adresseEnEntier(debut);
    const f = adresseEnEntier(fin);
    return a.famille === d.famille && a.famille === f.famille && a.valeur >= d.valeur && a.valeur <= f.valeur;
  } catch {
    return false;
  }
}

/**
 * The exact addresses (with their TTL) the archive gives a published record: those of the day's measurement, only
 * when the measurement matches the record (the same state and CNAME chain, and every address inside one of the
 * record's ranges); none otherwise, and none when the record has no known range to check them against.
 */
export function adressesExactes(
  enregistrement: Pick<EnregistrementNom, "etat" | "cname" | "reseaux">,
  mesure: MesureNom | undefined,
): MesureNom["a"] {
  if (mesure === undefined || mesure.etat !== "ok" || enregistrement.etat !== "ok") return [];
  const adresses = [...mesure.a, ...mesure.aaaa];
  if (adresses.length === 0 || JSON.stringify(mesure.cname) !== JSON.stringify(enregistrement.cname)) return [];
  const plages = enregistrement.reseaux.flatMap((r) => (r.plage === null ? [] : [r.plage]));
  if (plages.length === 0) return [];
  // Every address in one of the record's ranges, and every range holding one of the addresses: the same networks.
  const memes =
    adresses.every((x) => plages.some((p) => dansLaPlage(x.adresse, p))) &&
    plages.every((p) => adresses.some((x) => dansLaPlage(x.adresse, p)));
  return memes ? adresses : [];
}
