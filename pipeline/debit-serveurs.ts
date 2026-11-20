// The pace towards each authoritative server, measured on the resolver's logs (brief B.3: 10 questions per second at
// most to one server). Knot Resolver writes, at debug level for its « resolv » group, one line per question it sends
// upstream: « => id: '…' querying: '<server name>'@'<address>' zone cut: … ». With Docker's timestamps in front, the
// lines are counted per second and per address; only the highest count is kept (with its second and address).
export type DebitServeurs = {
  /** Upstream questions seen in the logs. */
  questions: number;
  /** Seconds in which one address got more than 10 questions (each one noted; the collection slows down). */
  depassements: number;
  /** The highest number of questions sent to one address within one second, and when. */
  max: number;
  adresse: string | null;
  seconde: string | null;
};

const QUESTION = /querying: '[^']*'@'([^']+)'/;
const HORODATAGE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/;

/** The limit of brief B.3. */
export const LIMITE_PAR_SERVEUR = 10;

export class CompteurServeurs {
  #questions = 0;
  #depassements = 0;
  #chargeCourante = 0;
  #max = 0;
  #adresse: string | null = null;
  #seconde: string | null = null;
  #courante: string | null = null;
  #parAdresse = new Map<string, number>();

  /** One line of `docker logs --timestamps` (its timestamp, then Knot's line). */
  lire(ligne: string): void {
    const question = QUESTION.exec(ligne);
    const temps = HORODATAGE.exec(ligne);
    if (question?.[1] === undefined || temps?.[1] === undefined) return;
    const seconde = temps[1];
    if (seconde !== this.#courante) {
      for (const n of this.#parAdresse.values()) if (n > LIMITE_PAR_SERVEUR) this.#depassements += 1;
      this.#parAdresse = new Map();
      this.#courante = seconde;
      this.#chargeCourante = 0;
    }
    this.#questions += 1;
    const n = (this.#parAdresse.get(question[1]) ?? 0) + 1;
    this.#parAdresse.set(question[1], n);
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
    if (this.#courante === null || maintenant - Date.parse(`${this.#courante}Z`) > 2_000) return 0;
    return this.#chargeCourante;
  }

  resultat(): DebitServeurs {
    let depassements = this.#depassements;
    for (const n of this.#parAdresse.values()) if (n > LIMITE_PAR_SERVEUR) depassements += 1;
    return { questions: this.#questions, depassements, max: this.#max, adresse: this.#adresse, seconde: this.#seconde };
  }
}
