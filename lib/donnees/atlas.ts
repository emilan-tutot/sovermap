// The Atlas (D.2): the day's figures (agregats/chiffres.json) and the threads of the globe (index/pays.json), checked at
// the border; the countries' positions come from the map of the globe (public/globe/monde.json, Natural Earth) and their
// names and Union membership from the repository's countries' table. Server only, pure.
import "server-only";
import type { Fil } from "@/components/globe/geo";
import monde from "@/public/globe/monde.json";
import pays from "@/referentiels/pays.json";

/** One figure: « at least X % » (confirmed) out of a number of domains, with the probable and undetermined shares. */
export type Chiffre = {
  auMoinsPourcent: number;
  domaines: number;
  probablePourcent: number;
  nonDeterminePourcent: number;
};
export type Chiffres = {
  avertissement: string | null;
  chiffreTitre: Chiffre;
  sousChiffreGouvFr: Chiffre | null;
  serveursDeNoms: Chiffre | null;
  messagerie: Chiffre | null;
};

const objet = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const part = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100 ? v : null;

function chiffreDe(v: unknown): Chiffre | null {
  const o = objet(v);
  const auMoinsPourcent = part(o?.["auMoinsPourcent"]);
  const probablePourcent = part(o?.["probablePourcent"]);
  const nonDeterminePourcent = part(o?.["nonDeterminePourcent"]);
  const domaines = o?.["domaines"];
  if (auMoinsPourcent === null || probablePourcent === null || nonDeterminePourcent === null) return null;
  if (typeof domaines !== "number" || !Number.isSafeInteger(domaines) || domaines < 0) return null;
  return { auMoinsPourcent, domaines, probablePourcent, nonDeterminePourcent };
}

/** agregats/chiffres.json, checked: null when the headline figure is not one. */
export function lireChiffres(valeur: unknown): Chiffres | null {
  const o = objet(valeur);
  const chiffreTitre = chiffreDe(o?.["chiffreTitre"]);
  if (o === null || chiffreTitre === null) return null;
  const avertissement = o["avertissement"];
  return {
    avertissement: typeof avertissement === "string" && avertissement.length <= 300 ? avertissement : null,
    chiffreTitre,
    sousChiffreGouvFr: chiffreDe(o["sousChiffreGouvFr"]),
    serveursDeNoms: chiffreDe(o["serveursDeNoms"]),
    messagerie: chiffreDe(o["messagerie"]),
  };
}

const POSITIONS = new Map(monde.pays.map((p) => [p.c, { lat: p.ly, lon: p.lx }]));
const PAYS = new Map(pays.pays.map((p) => [p.a2, { nom: p.fr, ue: p.ue }]));

/**
 * The threads of the globe: from France to each country of a seat of the « État » perimeter's domains, thicker with
 * more domains; a country without a position on the map or a name is left out (said by the table that follows the
 * globe). France itself is the origin, never a thread.
 */
export function filsDe(index: ReadonlyMap<string, { domainesEtat: number }>): Fil[] {
  return [...index]
    .flatMap(([code, v]): Fil[] => {
      const position = POSITIONS.get(code);
      const p = PAYS.get(code);
      if (code === "FR" || v.domainesEtat <= 0 || position === undefined || p === undefined) return [];
      return [{ code, nom: p.nom, lat: position.lat, lon: position.lon, sites: v.domainesEtat, horsUE: !p.ue }];
    })
    .sort((a, b) => b.sites - a.sites || (a.code < b.code ? -1 : 1));
}

/** France, the origin of the threads, with its « État » domains. */
export function origineDe(index: ReadonlyMap<string, { domainesEtat: number }>): Fil {
  const position = POSITIONS.get("FR") ?? { lat: 46.7, lon: 2.55 };
  return {
    code: "FR",
    nom: PAYS.get("FR")?.nom ?? "France",
    ...position,
    sites: index.get("FR")?.domainesEtat ?? 0,
    horsUE: false,
  };
}
