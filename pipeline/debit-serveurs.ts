// The pace towards each authoritative server, measured on the resolver's logs (brief B.3: 10 questions per second at
// most to one server). Knot Resolver writes, at debug level for its « resolv » group, one line per question it sends
// upstream: « => id: '…' querying: '<server name>'@'<address>' zone cut: … ». With Docker's timestamps in front, the
// lines are counted per second and per address; only the highest count is kept (with its second and address).
// Each line also names the zone cut the server was asked about: the brake holds back only the questions that would go
// to a busy server (its zone and the zones below it; for a new domain, its parents too), never the whole collection.
export type DebitServeurs = {
  /** Upstream questions seen in the logs. */
  questions: number;
  /** Seconds in which one address got more than 10 questions (each address and second noted once). */
  depassements: number;
  /**
   * Seconds in which the resolver asked at least one question (the seconds of the measurement, waits left out), and
   * those in which at least one address got more than 10: the tolerance's figures (docs/methode.md, B.3).
   */
  secondes: number;
  secondesAuDela: number;
  /**
   * The addresses that got more than 10 questions within a second (at most 5, the most such seconds first), as the
   * summary tells them, never by their address: the top-level zones they served, and in their worst second, the zone
   * cuts, the registered zones of the names and the question types.
   */
  auDela: {
    tlds: string[];
    secondes: number;
    max: number;
    coupes: number;
    zones: number;
    parType: Record<string, number>;
  }[];
  /**
   * The highest number of questions sent to one address within one second, and when; `tldsMax`: the top-level zones
   * that address served (what is published: never the address itself).
   */
  max: number;
  adresse: string | null;
  seconde: string | null;
  tldsMax: string[];
  /** The zone cuts whose servers were busy most often (seconds at the brake's threshold or above), for the summary. */
  coupesChaudes: { coupe: string; secondes: number }[];
  /**
   * The three addresses asked most, with their questions by type (NS, DS, A…) and the top-level zones they served
   * (the summary names those zones, never the address).
   */
  adressesChargees: { adresse: string; questions: number; parType: Record<string, number>; tlds: string[] }[];
  /**
   * The zones whose servers got the most questions per question of ours (at least 20 of ours): the resolver's own
   * questions (a sub-zone's referral, a retry) that the pace weighs; for the summary.
   */
  amplifications: { zone: string; envois: number; amont: number; parType: Record<string, number> }[];
};

const QUESTION = /querying: '([^']*)'@'([^']+)'(?: zone cut: '([^']*)')?(?: qname: '([^']*)')?(?: qtype: '([^']*)')?/;
const HORODATAGE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/;

/** The limit of brief B.3. */
export const LIMITE_PAR_SERVEUR = 10;
/** How long a server is remembered as serving a zone (a shared server serves many: all wait when it is busy). */
const MEMOIRE_SECONDES = 60;
/** The brake engages at 7 questions within a second to one server (3 under the limit): the questions that would go to it wait. */
export const SEUIL_FREIN = 7;
/** At 9, one question more and the limit is near: every question waits, whatever its zone (a backstop). */
export const SEUIL_ARRET = LIMITE_PAR_SERVEUR - 1;

/** A zone cut as Knot writes it (« exemple. », « . » for the root), in lower case, without its final dot. */
const coupeNormale = (c: string) => c.toLowerCase().replace(/\.$/, "");
/** Notes that `adresse` was seen with `cle` at second `t`. */
const noter = (memoire: Map<string, Map<string, number>>, adresse: string, cle: string, t: number) => {
  const vues = memoire.get(adresse) ?? new Map<string, number>();
  vues.set(cle, t);
  memoire.set(adresse, vues);
};

/** Adds one to the count of `cle` at second `t`. */
const compter = (table: Map<string, Map<number, number>>, cle: string, t: number) => {
  const secondes = table.get(cle) ?? new Map<number, number>();
  secondes.set(t, (secondes.get(t) ?? 0) + 1);
  table.set(cle, secondes);
};

/** Is `nom` the zone `coupe` or below it? The root (« ») holds every name. */
export const sous = (nom: string, coupe: string) => coupe === "" || nom === coupe || nom.endsWith(`.${coupe}`);

export class CompteurServeurs {
  /** `zoneDe`: the registered zone of a name, the same as the collection's (its questions are held by zone). */
  constructor(private readonly zoneDe: (nom: string) => string = (nom) => nom) {}

  #questions = 0;
  #depassements = 0;
  #chargeCourante = 0;
  #max = 0;
  #adresse: string | null = null;
  #seconde: string | null = null;
  #courante: string | null = null;
  #parAdresse = new Map<string, number>();
  #coupesParAdresse = new Map<string, Set<string>>();
  #secondesChaudes = new Map<string, number>();
  /** Per address, the zone cuts it served and the registered zones of the names it was asked about, last minute. */
  #coupesRecentes = new Map<string, Map<string, number>>();
  #zonesRecentes = new Map<string, Map<string, number>>();
  #oubli = 0;
  #parAdresseTotal = new Map<string, { questions: number; parType: Map<string, number>; tlds: Set<string> }>();
  #secondesVues = new Set<number>();
  #secondesAuDela = 0;
  /** The addresses the resolver used for each name server (its name, without the final dot). */
  #adressesParHote = new Map<string, Set<string>>();
  /** Per registered zone and per second: our questions (the client tells them) and the resolver's to its servers. */
  #envois = new Map<string, Map<number, number>>();
  #amont = new Map<string, Map<number, number>>();
  #envoisTotal = new Map<string, number>();
  #amontTotal = new Map<string, { n: number; parType: Map<string, number> }>();
  /** Within the current second, per address: the registered zones of the names asked, and the question types. */
  #zonesParAdresse = new Map<string, Set<string>>();
  #typesParAdresse = new Map<string, Map<string, number>>();
  #auDela = new Map<
    string,
    { secondes: number; max: number; coupes: number; zones: number; parType: Map<string, number> }
  >();

  /** One line of `docker logs --timestamps` (its timestamp, then Knot's line). */
  lire(ligne: string): void {
    const question = QUESTION.exec(ligne);
    const temps = HORODATAGE.exec(ligne);
    if (question?.[2] === undefined || temps?.[1] === undefined) return;
    const seconde = temps[1];
    if (seconde !== this.#courante) {
      this.#clore();
      this.#parAdresse = new Map();
      this.#coupesParAdresse = new Map();
      this.#zonesParAdresse = new Map();
      this.#typesParAdresse = new Map();
      this.#courante = seconde;
      this.#chargeCourante = 0;
    }
    this.#questions += 1;
    const n = (this.#parAdresse.get(question[2]) ?? 0) + 1;
    this.#parAdresse.set(question[2], n);
    const t = Date.parse(`${seconde}Z`) / 1000;
    this.#secondesVues.add(t);
    const hote = (question[1] ?? "").toLowerCase().replace(/\.$/, "");
    if (hote !== "") {
      const adresses = this.#adressesParHote.get(hote) ?? new Set<string>();
      adresses.add(question[2]);
      this.#adressesParHote.set(hote, adresses);
    }
    if (question[3] !== undefined && question[4] !== undefined) {
      // A question to the zone's own servers, or to a sub-zone's: what our pace weighs (never one to its parent).
      const zoneAmont = this.zoneDe(coupeNormale(question[4]));
      if (sous(coupeNormale(question[3]), zoneAmont)) {
        compter(this.#amont, zoneAmont, t);
        const total = this.#amontTotal.get(zoneAmont) ?? { n: 0, parType: new Map<string, number>() };
        total.n += 1;
        const type = question[5] ?? "?";
        total.parType.set(type, (total.parType.get(type) ?? 0) + 1);
        this.#amontTotal.set(zoneAmont, total);
      }
    }
    const typeDeLaSeconde = question[5] ?? "?";
    const types = this.#typesParAdresse.get(question[2]) ?? new Map<string, number>();
    types.set(typeDeLaSeconde, (types.get(typeDeLaSeconde) ?? 0) + 1);
    this.#typesParAdresse.set(question[2], types);
    if (question[4] !== undefined) {
      const zones = this.#zonesParAdresse.get(question[2]) ?? new Set<string>();
      zones.add(this.zoneDe(coupeNormale(question[4])));
      this.#zonesParAdresse.set(question[2], zones);
    }
    if (question[3] !== undefined) {
      const coupe = coupeNormale(question[3]);
      const coupes = this.#coupesParAdresse.get(question[2]) ?? new Set<string>();
      coupes.add(coupe);
      this.#coupesParAdresse.set(question[2], coupes);
      noter(this.#coupesRecentes, question[2], coupe, t);
    }
    const total = this.#parAdresseTotal.get(question[2]) ?? {
      questions: 0,
      parType: new Map<string, number>(),
      tlds: new Set<string>(),
    };
    if (question[3] !== undefined) {
      const coupe = coupeNormale(question[3]);
      if (coupe !== "" && !coupe.includes(".")) total.tlds.add(coupe);
    }
    total.questions += 1;
    const type = question[5] ?? "?";
    total.parType.set(type, (total.parType.get(type) ?? 0) + 1);
    this.#parAdresseTotal.set(question[2], total);
    if (question[4] !== undefined) {
      const zone = this.zoneDe(coupeNormale(question[4]));
      const coupe = question[3] === undefined ? null : coupeNormale(question[3]);
      // A parent asked for a zone's delegation or its DS (« <zone> NS », QNAME minimisation; « <zone> DS ») does not
      // serve the zone: only its openings wait for it. A zone that is not delegated is learned from its other questions.
      const auParent =
        coupe !== null && coupe !== zone && sous(zone, coupe) && (question[5] === "NS" || question[5] === "DS");
      if (!auParent) noter(this.#zonesRecentes, question[2], zone, t);
    }
    if (t - this.#oubli >= 10) {
      this.#oubli = t;
      for (const memoire of [this.#coupesRecentes, this.#zonesRecentes])
        for (const [adresse, vues] of memoire) {
          for (const [cle, vue] of vues) if (t - vue > MEMOIRE_SECONDES) vues.delete(cle);
          if (vues.size === 0) memoire.delete(adresse);
        }
      for (const parSeconde of [this.#envois, this.#amont])
        for (const [zone, secondes] of parSeconde) {
          for (const s of secondes.keys()) if (t - s > 2 * MEMOIRE_SECONDES) secondes.delete(s);
          if (secondes.size === 0) parSeconde.delete(zone);
        }
    }
    this.#chargeCourante = Math.max(this.#chargeCourante, n);
    if (n > this.#max) {
      this.#max = n;
      this.#adresse = question[2];
      this.#seconde = seconde;
    }
  }

  /**
   * The most questions one address got within the current second, as the logs tell it now; 0 when the logs are more
   * than 2 seconds behind `maintenant` (milliseconds since 1970), so a silent log never holds the collection.
   */
  charge(maintenant: number): number {
    return this.#frais(maintenant) ? this.#chargeCourante : 0;
  }

  /**
   * Must a question about `nom` (in the registered zone `zone`) wait, as the logs tell it now? A server that got
   * SEUIL_FREIN questions within the current second holds back every question of a zone it was asked about in the last
   * minute (a shared server serves many zones; a zone that is not delegated is served by its parent's servers), and of
   * a zone cut it served between the zone and the name. A question that goes to the parents too (`ouverture`: the
   * first question of a zone, the DS) also waits for a busy parent: a top-level domain, a public suffix. Every question
   * waits when one server reached SEUIL_ARRET. Never when the logs are more than 2 seconds behind (a silent log never
   * holds the collection).
   */
  freine(nom: string, zone: string, ouverture: boolean, maintenant: number): boolean {
    if (!this.#frais(maintenant)) return false;
    for (const [adresse, n] of this.#parAdresse) {
      if (n >= SEUIL_ARRET) return true;
      if (n < SEUIL_FREIN) continue;
      if (this.#zonesRecentes.get(adresse)?.has(zone)) return true;
      for (const coupe of this.#coupesRecentes.get(adresse)?.keys() ?? []) {
        if (sous(nom, coupe) && sous(coupe, zone)) return true;
        if (ouverture && sous(zone, coupe)) return true;
      }
    }
    return false;
  }

  /** The addresses the resolver used for a name server, as its logs tell (none yet: an empty list). */
  adresses(hote: string): string[] {
    return [...(this.#adressesParHote.get(hote.toLowerCase().replace(/\.$/, "")) ?? [])].sort();
  }

  /** One of our questions to `zone` leaves now (`maintenant`: milliseconds since 1970). */
  noterEnvoi(zone: string, maintenant: number): void {
    compter(this.#envois, zone, Math.floor(maintenant / 1000));
    this.#envoisTotal.set(zone, (this.#envoisTotal.get(zone) ?? 0) + 1);
  }

  /**
   * How many questions one of ours to `zone` cost its servers over the last minute (the last 2 seconds left out: the
   * logs may not have them yet); 1 while fewer than 8 of ours tell it.
   */
  cout(zone: string, maintenant: number): number {
    const fin = Math.floor(maintenant / 1000) - 2;
    const somme = (secondes: Map<number, number> | undefined) => {
      let n = 0;
      for (const [s, k] of secondes ?? []) if (s > fin - MEMOIRE_SECONDES && s <= fin) n += k;
      return n;
    };
    const envois = somme(this.#envois.get(zone));
    return envois < 8 ? 1 : Math.max(1, somme(this.#amont.get(zone)) / envois);
  }

  #frais(maintenant: number): boolean {
    return this.#courante !== null && maintenant - Date.parse(`${this.#courante}Z`) <= 2_000;
  }

  /** The second that ends: its counts above the limit, and its busy zone cuts (for the summary). */
  #clore(): void {
    let auDela = false;
    for (const [adresse, n] of this.#parAdresse) {
      if (n > LIMITE_PAR_SERVEUR) {
        this.#depassements += 1;
        auDela = true;
        const s = this.#auDela.get(adresse) ?? {
          secondes: 0,
          max: 0,
          coupes: 0,
          zones: 0,
          parType: new Map<string, number>(),
        };
        s.secondes += 1;
        if (n > s.max) {
          s.max = n;
          s.coupes = this.#coupesParAdresse.get(adresse)?.size ?? 0;
          s.zones = this.#zonesParAdresse.get(adresse)?.size ?? 0;
          s.parType = new Map(this.#typesParAdresse.get(adresse) ?? []);
        }
        this.#auDela.set(adresse, s);
      }
      if (n < SEUIL_FREIN) continue;
      for (const coupe of this.#coupesParAdresse.get(adresse) ?? []) {
        this.#secondesChaudes.set(coupe, (this.#secondesChaudes.get(coupe) ?? 0) + 1);
      }
    }
    if (auDela) this.#secondesAuDela += 1;
  }

  resultat(): DebitServeurs {
    this.#clore();
    this.#parAdresse = new Map();
    this.#coupesParAdresse = new Map();
    this.#zonesParAdresse = new Map();
    this.#typesParAdresse = new Map();
    const coupesChaudes = [...this.#secondesChaudes]
      .sort(([a, x], [b, y]) => y - x || (a < b ? -1 : 1))
      .slice(0, 5)
      .map(([coupe, secondes]) => ({ coupe: coupe === "" ? "." : coupe, secondes }));
    const adressesChargees = [...this.#parAdresseTotal]
      .sort(([a, x], [b, y]) => y.questions - x.questions || (a < b ? -1 : 1))
      .slice(0, 3)
      .map(([adresse, t]) => ({
        adresse,
        questions: t.questions,
        parType: Object.fromEntries([...t.parType].sort(([, x], [, y]) => y - x)),
        tlds: [...t.tlds].sort(),
      }));
    return {
      questions: this.#questions,
      depassements: this.#depassements,
      secondes: this.#secondesVues.size,
      secondesAuDela: this.#secondesAuDela,
      auDela: [...this.#auDela]
        .sort(([a, x], [b, y]) => y.secondes - x.secondes || y.max - x.max || (a < b ? -1 : 1))
        .slice(0, 5)
        .map(([adresse, s]) => ({
          tlds: [...(this.#parAdresseTotal.get(adresse)?.tlds ?? [])].sort(),
          secondes: s.secondes,
          max: s.max,
          coupes: s.coupes,
          zones: s.zones,
          parType: Object.fromEntries([...s.parType].sort(([, x], [, y]) => y - x)),
        })),
      max: this.#max,
      adresse: this.#adresse,
      seconde: this.#seconde,
      tldsMax: this.#adresse === null ? [] : [...(this.#parAdresseTotal.get(this.#adresse)?.tlds ?? [])].sort(),
      coupesChaudes,
      adressesChargees,
      amplifications: [...this.#envoisTotal]
        .filter(([, envois]) => envois >= 20)
        .map(([zone, envois]) => ({ zone, envois, amont: this.#amontTotal.get(zone) }))
        .sort((a, b) => (b.amont?.n ?? 0) / b.envois - (a.amont?.n ?? 0) / a.envois || (a.zone < b.zone ? -1 : 1))
        .slice(0, 5)
        .map(({ zone, envois, amont }) => ({
          zone,
          envois,
          amont: amont?.n ?? 0,
          parType: Object.fromEntries([...(amont?.parType ?? [])].sort(([, x], [, y]) => y - x)),
        })),
    };
  }
}
