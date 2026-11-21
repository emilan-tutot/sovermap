// Polite downloads from the sources of docs/sources.md (rules of the brief, § 0.2, and of .claude/rules/data.md): the
// robots.txt of a host is read first, in a request of its own, and obeyed; at least one second between two requests to
// one host; five redirects at most, each one checked against the robots.txt of its host; an identified user agent
// (agentUtilisateur below), without any e-mail address and without any account name. A refusal is a refusal: the
// caller keeps yesterday's copy of the source and says so in etat.json.

/**
 * The project's address in the agent string (point 03 of chantier 2): the site, never the repository's address, which
 * names a person's account. sovermap.com takes its place in chantier 3.
 */
export const ADRESSE_DU_PROJET = "https://sovermap.vercel.app";

/** The agent string of every download: the project's name, its version and its address; never built from git. */
export const agentUtilisateur = (version: string) => `Sovermap-bot/${version} (+${ADRESSE_DU_PROJET})`;

export type Robots = { regles: { autorise: boolean; chemin: string }[]; delaiSecondes: number | null };

/** The rules of the robots.txt that apply to our agent: the group « Sovermap-bot » if any, else « * ». */
export function lireRobots(texte: string, agent = "sovermap-bot"): Robots {
  type Groupe = { agents: string[]; regles: { autorise: boolean; chemin: string }[]; delai: number | null };
  const groupes: Groupe[] = [];
  let courant: Groupe | null = null;
  let dernierEtaitAgent = false;
  for (const brute of texte.split(/\r?\n/)) {
    const ligne = brute.replace(/#.*$/, "").trim();
    if (ligne === "") continue;
    const deux = ligne.indexOf(":");
    if (deux < 0) continue;
    const cle = ligne.slice(0, deux).trim().toLowerCase();
    const valeur = ligne.slice(deux + 1).trim();
    if (cle === "user-agent") {
      if (courant === null || !dernierEtaitAgent) {
        courant = { agents: [], regles: [], delai: null };
        groupes.push(courant);
      }
      courant.agents.push(valeur.toLowerCase());
      dernierEtaitAgent = true;
      continue;
    }
    dernierEtaitAgent = false;
    if (courant === null) continue;
    if (cle === "allow" || cle === "disallow") {
      if (valeur !== "" || cle === "allow") courant.regles.push({ autorise: cle === "allow", chemin: valeur });
    } else if (cle === "crawl-delay") {
      const d = Number(valeur);
      if (Number.isFinite(d) && d >= 0) courant.delai = d;
    }
  }
  const pour = (nom: string) => groupes.filter((g) => g.agents.some((a) => a === nom));
  const choisis = pour(agent).length > 0 ? pour(agent) : pour("*");
  return {
    regles: choisis.flatMap((g) => g.regles),
    delaiSecondes: choisis.map((g) => g.delai).find((d) => d !== null) ?? null,
  };
}

/**
 * RFC 9309 path matching without any regular expression (a robots.txt is data, and a crafted rule must never make a
 * matcher backtrack for ever): « * » matches any sequence, a final « $ » anchors the end, otherwise the rule is a
 * prefix. The classic two-pointer wildcard match: at most |rule| × |path| steps.
 */
export function correspond(regle: string, chemin: string): boolean {
  const ancree = regle.endsWith("$");
  const motif = ancree ? regle.slice(0, -1) : `${regle}*`;
  let i = 0;
  let j = 0;
  let etoile = -1;
  let reprise = 0;
  while (j < chemin.length) {
    if (i < motif.length && motif[i] === "*") {
      etoile = i;
      i += 1;
      reprise = j;
    } else if (i < motif.length && motif[i] === chemin[j]) {
      i += 1;
      j += 1;
    } else if (etoile >= 0) {
      i = etoile + 1;
      reprise += 1;
      j = reprise;
    } else {
      return false;
    }
  }
  while (i < motif.length && motif[i] === "*") i += 1;
  return i === motif.length;
}

/** RFC 9309: the longest matching rule wins; on a tie, « allow » wins; no matching rule: allowed. */
export function autorise(robots: Robots, chemin: string): boolean {
  let meilleure: { autorise: boolean; longueur: number } | null = null;
  for (const r of robots.regles) {
    if (r.chemin === "") continue;
    if (!correspond(r.chemin, chemin)) continue;
    const longueur = r.chemin.length;
    if (meilleure === null || longueur > meilleure.longueur || (longueur === meilleure.longueur && r.autorise)) {
      meilleure = { autorise: r.autorise, longueur };
    }
  }
  return meilleure?.autorise ?? true;
}

export type Reponse = { url: string; statut: number; entetes: Headers; corps: Buffer };

export class RefusRobots extends Error {}

/** One polite downloader for a whole collection: it remembers each host's robots.txt and last request. */
export class Telechargeur {
  readonly #robots = new Map<string, Robots>();
  readonly #derniere = new Map<string, number>();
  readonly #agent: string;
  readonly #fetch: typeof fetch;
  readonly #dormir: (ms: number) => Promise<void>;

  readonly #tailleMax: number;
  readonly #delaiMs: number;

  constructor(options: {
    agent: string;
    fetch?: typeof fetch;
    dormir?: (ms: number) => Promise<void>;
    /** A body larger than this is refused as it arrives (300 MiB by default). */
    tailleMax?: number;
    /** Time limit of one request (5 minutes by default). */
    delaiMs?: number;
  }) {
    this.#agent = options.agent;
    this.#tailleMax = options.tailleMax ?? 300 * 1024 * 1024;
    this.#delaiMs = options.delaiMs ?? 5 * 60 * 1000;
    this.#fetch = options.fetch ?? fetch;
    this.#dormir = options.dormir ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  /** At least one second (or the host's Crawl-delay, if longer) between two requests to one host. */
  async #attendre(hote: string, delaiSecondes: number | null): Promise<void> {
    const espacement = Math.max(1000, (delaiSecondes ?? 0) * 1000);
    const attente = (this.#derniere.get(hote) ?? 0) + espacement - Date.now();
    if (attente > 0) await this.#dormir(attente);
    this.#derniere.set(hote, Date.now());
  }

  async #robotsDe(url: URL): Promise<Robots> {
    const connu = this.#robots.get(url.host);
    if (connu) return connu;
    await this.#attendre(url.host, null);
    const reponse = await this.#fetch(`${url.protocol}//${url.host}/robots.txt`, {
      headers: { "user-agent": this.#agent },
      redirect: "follow",
    });
    // RFC 9309: an unreachable robots.txt (4xx) allows everything; a server error (5xx) forbids everything.
    const robots =
      reponse.status >= 500
        ? { regles: [{ autorise: false, chemin: "/" }], delaiSecondes: null }
        : reponse.ok
          ? lireRobots(await reponse.text())
          : { regles: [], delaiSecondes: null };
    this.#robots.set(url.host, robots);
    return robots;
  }

  /** The body, read piece by piece: refused as soon as it is, or says it will be, larger than the limit. */
  async #corps(reponse: Response): Promise<Buffer> {
    const annonce = Number(reponse.headers.get("content-length") ?? "0");
    if (annonce > this.#tailleMax) throw new Error(`fichier trop grand : ${annonce} octets annoncés`);
    if (reponse.body === null) return Buffer.alloc(0);
    const morceaux: Uint8Array[] = [];
    let total = 0;
    const lecteur = reponse.body.getReader();
    for (;;) {
      const { done, value } = await lecteur.read();
      if (done) break;
      total += value.byteLength;
      if (total > this.#tailleMax) {
        await lecteur.cancel();
        throw new Error(`fichier trop grand : plus de ${this.#tailleMax} octets`);
      }
      morceaux.push(value);
    }
    return Buffer.concat(morceaux);
  }

  /** A GET that obeys robots.txt at every hop (5 redirects at most). */
  async obtenir(adresse: string, entetes: Record<string, string> = {}): Promise<Reponse> {
    let url = new URL(adresse);
    for (let saut = 0; saut <= 5; saut += 1) {
      if (url.protocol !== "https:") throw new Error(`adresse non https refusée : ${url.host}`);
      const robots = await this.#robotsDe(url);
      if (!autorise(robots, url.pathname + url.search))
        throw new RefusRobots(`${url.host}${url.pathname} : interdit par robots.txt`);
      await this.#attendre(url.host, robots.delaiSecondes);
      const reponse = await this.#fetch(url, {
        headers: { "user-agent": this.#agent, ...entetes },
        redirect: "manual",
        signal: AbortSignal.timeout(this.#delaiMs),
      });
      if (reponse.status >= 300 && reponse.status < 400) {
        const suivante = reponse.headers.get("location");
        if (suivante === null) throw new Error(`redirection sans adresse : ${url.host}`);
        url = new URL(suivante, url);
        continue;
      }
      return {
        url: url.toString(),
        statut: reponse.status,
        entetes: reponse.headers,
        corps: await this.#corps(reponse),
      };
    }
    throw new Error(`plus de 5 redirections : ${adresse}`);
  }
}
