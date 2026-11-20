// The daily controls (brief B.4, plan § 9 and § 13): Quad9 gets, at 2 questions per second at most and alongside the
// measurement, the web name and the MX of every domain of the « État » perimeter, the web names of 3 % of the other
// domains drawn at random, and the witnesses; Cloudflare 1.1.1.1 gets the witnesses only. Their answers make the
// address layer « confirmé » when they agree (methode § 5); the witnesses, whose behaviour is known and dated in
// referentiels/temoins.json, must all be found again, or nothing is published (methode § 7).
import type { ClientDns, Reponse, TypeRr } from "./dns-bas";
import { type Etat, type MesureNom, mesurerNom } from "./mesure";
import { Cadence, type Horloge, HORLOGE_REELLE, melanger } from "./politesse";

export type Temoin = {
  nom: string;
  attendu: { etat: Etat; cdn?: string | null; as?: number[] };
  releve: { le: string; preuve: string };
};

export type ReferentielTemoins = { version: string; temoins: Temoin[] };

/** What a witness shows: its state, its CDN (by provider) and the AS numbers of its addresses. */
export type Profil = { etat: Etat; cdn: string | null; as: number[] };

/** A client that waits its turn: `parSeconde` questions per second at most, whoever asks. */
export class ClientCadence implements ClientDns {
  readonly id: string;
  readonly #cadence: Cadence;
  constructor(
    private readonly base: ClientDns,
    parSeconde: number,
    horloge: Horloge = HORLOGE_REELLE,
  ) {
    this.id = base.id;
    this.#cadence = new Cadence(parSeconde, horloge);
  }
  async demander(nom: string, type: TypeRr): Promise<Reponse> {
    await this.#cadence.attendre();
    return this.base.demander(nom, type);
  }
  fermer(): void {
    this.base.fermer();
  }
}

/** The share of the other domains asked to Quad9 each day (brief B.4). */
export const PART_ECHANTILLON = 0.03;

/** The names and domains the control resolver gets today. */
export function planDeControle(
  domaines: readonly { domaine: string; nomWeb: string; perimetre: "État" | "hors État" }[],
  temoins: readonly string[],
  aleatoire: () => number,
): { noms: string[]; mx: string[] } {
  const etat = domaines.filter((d) => d.perimetre === "État");
  const autres = domaines.filter((d) => d.perimetre !== "État");
  const echantillon = melanger(autres, aleatoire).slice(0, Math.round(autres.length * PART_ECHANTILLON));
  return {
    noms: [...new Set([...etat.map((d) => d.nomWeb), ...echantillon.map((d) => d.nomWeb), ...temoins])].sort(),
    mx: etat.map((d) => d.domaine).sort(),
  };
}

export type ResultatControle = {
  resolveur: string;
  noms: Map<string, MesureNom>;
  /** The MX hosts seen by the control resolver, per domain (null when its answer failed). */
  mx: Map<string, string[] | null>;
};

/** Asks the control resolver, a few questions in flight, at its own pace (the client is a ClientCadence). */
export async function controler(
  client: ClientDns,
  noms: readonly string[],
  mx: readonly string[],
  enVol = 8,
): Promise<ResultatControle> {
  const resultat: ResultatControle = { resolveur: client.id, noms: new Map(), mx: new Map() };
  const taches: (() => Promise<void>)[] = [
    ...noms.map((nom) => async () => {
      resultat.noms.set(nom, await mesurerNom(nom, client));
    }),
    ...mx.map((domaine) => async () => {
      const r = await client.demander(domaine, "MX");
      resultat.mx.set(
        domaine,
        r.code === "NOERROR" || r.code === "NXDOMAIN"
          ? r.reponses.flatMap((e) => (e.donnee.type === "MX" && e.donnee.hote !== "" ? [e.donnee.hote] : [])).sort()
          : null,
      );
    }),
  ];
  const ouvrier = async () => {
    for (let t = taches.shift(); t !== undefined; t = taches.shift()) await t();
  };
  await Promise.all(Array.from({ length: Math.min(enVol, taches.length) }, ouvrier));
  return resultat;
}

export type VerdictTemoin = {
  nom: string;
  resolveur: string;
  ok: boolean;
  vu: Profil | null;
  attendu: Temoin["attendu"];
};

/** Does a profile show what the witness is known to show? */
export function conforme(attendu: Temoin["attendu"], vu: Profil): boolean {
  if (vu.etat !== attendu.etat) return false;
  if (attendu.cdn !== undefined && vu.cdn !== attendu.cdn) return false;
  if (attendu.as !== undefined && !attendu.as.some((a) => vu.as.includes(a))) return false;
  return true;
}

/**
 * Every witness, as each resolver saw it (the collection's own, Quad9, Cloudflare). They agree when every resolver
 * finds every witness as it is known; otherwise the collection publishes nothing.
 */
export function verifierTemoins(
  temoins: readonly Temoin[],
  vues: readonly { resolveur: string; noms: ReadonlyMap<string, MesureNom> }[],
  profil: (m: MesureNom) => Profil,
): { concordants: boolean; verdicts: VerdictTemoin[] } {
  const verdicts: VerdictTemoin[] = [];
  for (const t of temoins) {
    for (const v of vues) {
      const m = v.noms.get(t.nom);
      const vu = m === undefined ? null : profil(m);
      verdicts.push({
        nom: t.nom,
        resolveur: v.resolveur,
        ok: vu !== null && conforme(t.attendu, vu),
        vu,
        attendu: t.attendu,
      });
    }
  }
  return { concordants: verdicts.length > 0 && verdicts.every((v) => v.ok), verdicts };
}
