// The polite pace of the collection (brief B.3, plan § 9): names in random order, so that the names of one zone never
// follow each other; at most 25 names per second; at most 2 simultaneous questions per zone; a failure is asked again
// at most twice, 10 minutes apart; a failure stays a failure, never « no site ».

/** A seedable random generator (mulberry32): the tests replay the same order. */
export function generateur(graine: number): () => number {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates: a new array, in random order. */
export function melanger<T>(liste: readonly T[], aleatoire: () => number = Math.random): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i -= 1) {
    const j = Math.floor(aleatoire() * (i + 1));
    const x = copie[i] as T;
    copie[i] = copie[j] as T;
    copie[j] = x;
  }
  return copie;
}

export type Horloge = { maintenant: () => number; dormir: (ms: number) => Promise<void> };

export const HORLOGE_REELLE: Horloge = {
  maintenant: () => performance.now(),
  dormir: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** A rate that starts low and climbs to its target: a cold start never bursts (brief B.3). */
export type Montee = { depart: number; dureeMs: number };

/** At most `parSeconde` starts per second, evenly spaced; with a ramp, from `montee.depart` up to it. */
export class Cadence {
  #prochain = 0;
  #debut: number | null = null;
  constructor(
    private readonly parSeconde: number,
    private readonly horloge: Horloge = HORLOGE_REELLE,
    private readonly montee: Montee | null = null,
  ) {}
  #intervalle(maintenant: number): number {
    if (this.montee === null) return 1000 / this.parSeconde;
    const ecoule = maintenant - (this.#debut ?? maintenant);
    const debit = Math.min(
      this.parSeconde,
      this.montee.depart + ((this.parSeconde - this.montee.depart) * ecoule) / this.montee.dureeMs,
    );
    return 1000 / debit;
  }
  async attendre(): Promise<void> {
    const maintenant = this.horloge.maintenant();
    this.#debut ??= maintenant;
    const depart = Math.max(maintenant, this.#prochain);
    this.#prochain = depart + this.#intervalle(depart);
    if (depart > maintenant) await this.horloge.dormir(depart - maintenant);
  }
}

/** At most `max` tasks at a time for one key (a zone). */
export class ParZone {
  readonly #enCours = new Map<string, number>();
  readonly #attente = new Map<string, (() => void)[]>();
  constructor(private readonly max = 2) {}
  async prendre(zone: string): Promise<void> {
    const n = this.#enCours.get(zone) ?? 0;
    if (n < this.max) {
      this.#enCours.set(zone, n + 1);
      return;
    }
    await new Promise<void>((resolve) => {
      const file = this.#attente.get(zone) ?? [];
      file.push(resolve);
      this.#attente.set(zone, file);
    });
  }
  rendre(zone: string): void {
    const file = this.#attente.get(zone);
    const suivant = file?.shift();
    if (suivant) {
      suivant();
      return;
    }
    const n = (this.#enCours.get(zone) ?? 1) - 1;
    if (n <= 0) this.#enCours.delete(zone);
    else this.#enCours.set(zone, n);
  }
}
