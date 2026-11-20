// The pace towards each authoritative server, measured on the resolver's logs (brief B.3: 10 questions per second at
// most to one server). Knot Resolver writes, at debug level for its « resolv » group, one line per question it sends
// upstream: « => id: '…' querying: '<server name>'@'<address>' zone cut: … ». With Docker's timestamps in front, the
// lines are counted per second and per address; only the highest count is kept (with its second and address).
export type DebitServeurs = {
  /** Upstream questions seen in the logs. */
  questions: number;
  /** The highest number of questions sent to one address within one second, and when. */
  max: number;
  adresse: string | null;
  seconde: string | null;
};

const QUESTION = /querying: '[^']*'@'([^']+)'/;
const HORODATAGE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/;

export class CompteurServeurs {
  #questions = 0;
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
      this.#parAdresse = new Map();
      this.#courante = seconde;
    }
    this.#questions += 1;
    const n = (this.#parAdresse.get(question[1]) ?? 0) + 1;
    this.#parAdresse.set(question[1], n);
    if (n > this.#max) {
      this.#max = n;
      this.#adresse = question[1];
      this.#seconde = seconde;
    }
  }

  resultat(): DebitServeurs {
    return { questions: this.#questions, max: this.#max, adresse: this.#adresse, seconde: this.#seconde };
  }
}
