// The pace towards each authoritative server, measured on the resolver's logs (brief B.3: 10 questions per second at
// most to one server). Knot Resolver writes, at debug level for its « resolv » group, one line per question it sends
// upstream: « => id: '…' querying: '<server name>'@'<address>' zone cut: … ». With Docker's timestamps in front, the
// lines are counted per second and per address; only the highest count is kept (with its second and address).
// Each line also names the zone cut the server was asked about: the brake holds back only the questions that would go
// to a busy server (its zone and the zones below it; for a new domain, its parents too), never the whole collection.
export type DebitServeurs = {
  /** Upstream questions seen in the logs. */
  questions: number;
  /** Seconds in which one address got more than 10 questions (each one noted; the collection slows down). */
  depassements: number;
  /** The highest number of questions sent to one address within one second, and when. */
  max: number;
  adresse: string | null;
  seconde: string | null;
  /** The zone cuts whose servers were busy most often (seconds at the brake's threshold or above), for the summary. */
  coupesChaudes: { coupe: string; secondes: number }[];
  /**
   * The three addresses asked most, with their questions by type (NS, DS, A…) and the top-level zones they served
   * (the summary names those zones, never the address).
   */
  adressesChargees: { adresse: string; questions: number; parType: Record<string, number>; tlds: string[] }[];
};

const QUESTION = /querying: '[^']*'@'([^']+)'(?: zone cut: '([^']*)')?(?: qname: '([^']*)')?(?: qtype: '([^']*)')?/;
const HORODATAGE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/;

/** The limit of brief B.3. */
export const LIMITE_PAR_SERVEUR = 10;
/** How long a server is remembered as serving a zone (a shared server serves many: all wait when it is busy). */
const MEMOIRE_SECONDES = 60;
/** The brake engages at 8 questions within a second to one server: the questions that would go to it wait. */
export const SEUIL_FREIN = 8;
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

  /** One line of `docker logs --timestamps` (its timestamp, then Knot's line). */
  lire(ligne: string): void {
    const question = QUESTION.exec(ligne);
    const temps = HORODATAGE.exec(ligne);
    if (question?.[1] === undefined || temps?.[1] === undefined) return;
    const seconde = temps[1];
    if (seconde !== this.#courante) {
      this.#clore();
      this.#parAdresse = new Map();
      this.#coupesParAdresse = new Map();
      this.#courante = seconde;
      this.#chargeCourante = 0;
    }
    this.#questions += 1;
    const n = (this.#parAdresse.get(question[1]) ?? 0) + 1;
    this.#parAdresse.set(question[1], n);
    const t = Date.parse(`${seconde}Z`) / 1000;
    if (question[2] !== undefined) {
      const coupe = coupeNormale(question[2]);
      const coupes = this.#coupesParAdresse.get(question[1]) ?? new Set<string>();
      coupes.add(coupe);
      this.#coupesParAdresse.set(question[1], coupes);
      noter(this.#coupesRecentes, question[1], coupe, t);
    }
    const total = this.#parAdresseTotal.get(question[1]) ?? {
      questions: 0,
      parType: new Map<string, number>(),
      tlds: new Set<string>(),
    };
    if (question[2] !== undefined) {
      const coupe = coupeNormale(question[2]);
      if (coupe !== "" && !coupe.includes(".")) total.tlds.add(coupe);
    }
    total.questions += 1;
    const type = question[4] ?? "?";
    total.parType.set(type, (total.parType.get(type) ?? 0) + 1);
    this.#parAdresseTotal.set(question[1], total);
    if (question[3] !== undefined) {
      const zone = this.zoneDe(coupeNormale(question[3]));
      const coupe = question[2] === undefined ? null : coupeNormale(question[2]);
      // A parent asked for a zone's delegation or its DS (« <zone> NS », QNAME minimisation; « <zone> DS ») does not
      // serve the zone: only its openings wait for it. A zone that is not delegated is learned from its other questions.
      const auParent =
        coupe !== null && coupe !== zone && sous(zone, coupe) && (question[4] === "NS" || question[4] === "DS");
      if (!auParent) noter(this.#zonesRecentes, question[1], zone, t);
    }
    if (t - this.#oubli >= 10) {
      this.#oubli = t;
      for (const memoire of [this.#coupesRecentes, this.#zonesRecentes])
        for (const [adresse, vues] of memoire) {
          for (const [cle, vue] of vues) if (t - vue > MEMOIRE_SECONDES) vues.delete(cle);
          if (vues.size === 0) memoire.delete(adresse);
        }
    }
    this.#chargeCourante = Math.max(this.#chargeCourante, n);
    if (n > this.#max) {
      this.#max = n;
      this.#adresse = question[1];
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

  #frais(maintenant: number): boolean {
    return this.#courante !== null && maintenant - Date.parse(`${this.#courante}Z`) <= 2_000;
  }

  /** The second that ends: its counts above the limit, and its busy zone cuts (for the summary). */
  #clore(): void {
    for (const [adresse, n] of this.#parAdresse) {
      if (n > LIMITE_PAR_SERVEUR) this.#depassements += 1;
      if (n < SEUIL_FREIN) continue;
      for (const coupe of this.#coupesParAdresse.get(adresse) ?? []) {
        this.#secondesChaudes.set(coupe, (this.#secondesChaudes.get(coupe) ?? 0) + 1);
      }
    }
  }

  resultat(): DebitServeurs {
    this.#clore();
    this.#parAdresse = new Map();
    this.#coupesParAdresse = new Map();
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
      max: this.#max,
      adresse: this.#adresse,
      seconde: this.#seconde,
      coupesChaudes,
      adressesChargees,
    };
  }
}
