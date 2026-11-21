// A simulated resolver for the tests of the collection: a small zone written in the test, answers built like a
// recursive resolver's (A and AAAA follow the CNAME chain, the chain comes with the answer), a list of names that
// fail, and a trace of every question (per zone: how many were in flight at once). No network.
import type { ClientDns, Donnee, Reponse, TypeRr } from "./dns-bas";

export type ZoneSimulee = Record<string, Partial<Record<TypeRr, Donnee[]>>>;

export class ResolveurSimule implements ClientDns {
  readonly id = "simulé";
  readonly questions: string[] = [];
  /** The highest number of questions in flight at once, per zone. */
  readonly maxEnVol = new Map<string, number>();
  readonly #enVol = new Map<string, number>();

  constructor(
    private readonly zone: ZoneSimulee,
    private readonly zoneDe: (nom: string) => string,
    private readonly echecs: ReadonlySet<string> = new Set(),
  ) {}

  async demander(nom: string, type: TypeRr): Promise<Reponse> {
    this.questions.push(`${nom} ${type}`);
    const z = this.zoneDe(nom);
    const enVol = (this.#enVol.get(z) ?? 0) + 1;
    this.#enVol.set(z, enVol);
    this.maxEnVol.set(z, Math.max(this.maxEnVol.get(z) ?? 0, enVol));
    await new Promise((resolve) => setTimeout(resolve, 1));
    this.#enVol.set(z, (this.#enVol.get(z) ?? 1) - 1);
    // A failure for every question about a name (« nom »), or for one type only (« nom TYPE »).
    if (this.echecs.has(nom) || this.echecs.has(`${nom} ${type}`)) {
      return { code: "SERVFAIL", ad: false, reponses: [], duree: 1 };
    }
    const reponses: Reponse["reponses"] = [];
    let courant = nom;
    for (let i = 0; i < 12; i += 1) {
      const entree = this.zone[courant];
      if (entree === undefined) {
        // A name with names under it exists, empty (an empty non-terminal): NODATA, never NXDOMAIN (RFC 8020).
        const auDessus = Object.keys(this.zone).some((n) => n.endsWith(`.${courant}`));
        return { code: reponses.length > 0 || auDessus ? "NOERROR" : "NXDOMAIN", ad: false, reponses, duree: 1 };
      }
      const alias = type === "CNAME" ? undefined : entree.CNAME?.[0];
      if (alias?.type === "CNAME") {
        reponses.push({ proprietaire: courant, ttl: 300, donnee: alias });
        courant = alias.cible;
        continue;
      }
      for (const donnee of entree[type] ?? []) reponses.push({ proprietaire: courant, ttl: 300, donnee });
      return { code: "NOERROR", ad: true, reponses, duree: 1 };
    }
    return { code: "NOERROR", ad: false, reponses, duree: 1 };
  }

  fermer(): void {}
}
