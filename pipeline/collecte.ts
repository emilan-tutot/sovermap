// The DNS measurement of a whole collection (brief B.2 and B.3, plan § 5 and § 9). Every name of the list is asked in
// random order, 25 names per second at most; the first name of a registrable domain « opens » it — NS, SOA, CAA,
// MX and TXT, then the addresses of its name servers and mail exchangers (once per host for the whole collection) and
// its SPF record expanded — and at most 8 domains open per second, so that the servers of a top-level domain (.fr)
// get at most one referral per new domain. Every single question holds one of the two permits of the zone it goes to
// (the registrable domain of the asked name): at most 2 simultaneous questions per zone, whoever asks. A name or a
// domain that fails is asked again, at most twice, 10 minutes apart; a failure stays a failure, never « no site ».
import type { ClientDns, Reponse, TypeRr } from "./dns-bas";
import { type MesureNom, type MesureZone, mesurerNom, mesurerZone } from "./mesure";
import { Cadence, type Horloge, HORLOGE_REELLE, melanger, type Montee, ParZone } from "./politesse";
import { EchecRecherche, etendreSpf, type ResolveurSpf, type ResultatSpf } from "./spf";

export type OptionsCollecte = {
  nomsParSeconde: number;
  domainesParSeconde: number;
  parZone: number;
  /**
   * New zones per second under one parent (a top-level domain, a public suffix): the first question of a zone asks
   * its parent for the delegation, and the resolver sends most of them to one of the parent's servers. 6 keeps that
   * server under the limit of 10 questions per second, whatever the logs say (brief B.3).
   */
  parentParSeconde: number;
  /** Questions per second to one zone's own servers (its turn of two at a time is not enough when a domain's names
   * all come together): plan § 5, the politeness towards each zone. */
  zoneParSeconde: number;
  /** Called once the first pass has ended (every domain measured), before the attempts: the controls may start. */
  apresPremierePasse?: (resultat: ResultatCollecte) => void;
  /** Names in flight at once (each one may wait for its domain to open, or for a slow server). */
  enVol: number;
  /** The domains' rate climbs from `depart` per second to `domainesParSeconde` (a cold cache never bursts). */
  montee: Montee | null;
  /**
   * The brake (brief B.3, debit-serveurs.ts), waited before every question and every opening of a domain: it resolves
   * when a question about `nom`, in the registered zone `zone`, may go, with true when it held it; `ouverture`: a
   * question that also goes to the zone's parents (the opening of a domain, the first question of a zone).
   */
  frein?: (nom: string, zone: string, ouverture: boolean) => Promise<boolean | void>;
  /**
   * No new attempt starts after this moment (milliseconds since 1970), so that the controls and the building of the
   * day still fit in the job's time limit (collecter.ts).
   */
  echeance?: number;
  reprises: number;
  delaiRepriseMs: number;
  /** The zone a question goes to: the registrable domain of the asked name (Public Suffix List). */
  zoneDe: (nom: string) => string;
  aleatoire?: () => number;
  horloge?: Horloge;
  /** Progress lines (one every 2,000 names), for the job's log. */
  suivi?: (ligne: string) => void;
};

export const POLITESSE: Omit<OptionsCollecte, "zoneDe"> = {
  nomsParSeconde: 25,
  domainesParSeconde: 8,
  parZone: 2,
  parentParSeconde: 6,
  zoneParSeconde: 5,
  enVol: 128,
  montee: { depart: 1, dureeMs: 10 * 60 * 1000 },
  reprises: 2,
  delaiRepriseMs: 10 * 60 * 1000,
};

export type ResultatCollecte = {
  noms: Map<string, MesureNom>;
  domaines: Map<string, MesureZone>;
  /** The addresses of every name server and mail exchanger seen, once per host. */
  hotes: Map<string, MesureNom>;
  spf: Map<string, ResultatSpf>;
  /** Attempts per name and per domain (1 to 3). */
  essais: Map<string, number>;
  debut: number;
  fin: number;
};

/** The client, with the per-zone limit on every question. */
const CODES_EN_ECHEC = new Set(["SERVFAIL", "TIMEOUT", "REFUSED", "ERREUR", "ZONE_MUETTE", "SOUS_ZONE_MUETTE"]);
/**
 * Failures in a row of the questions about a zone's apex (NS, SOA, MX…), with no answer between them, after which the
 * zone is down for the rest of an attempt: its other questions are not sent, and end « ZONE_MUETTE ». A name below the
 * apex that fails (a lame sub-zone, a CNAME into a failing platform) never counts: only the zone itself can be down.
 */
const ZONE_MORTE = 3;
/**
 * Distinct names below a sub-zone (a part of a zone delegated to servers that never answer, such as internal names)
 * that failed in this attempt, no name of it ever having answered in the run, after which the sub-zone is down for the
 * rest of the attempt: its other names are not asked, and end « SOUS_ZONE_MUETTE » (asked again at the next attempt).
 */
const SOUS_ZONE_MORTE = 8;
/**
 * One pace per group of servers: the top-level domains of one registry share its servers (AFNIC: fr, re, pm, yt, tf,
 * wf, and bzh, alsace, corsica, paris; Verisign: com, net), and every parent under a top-level domain (gouv.fr,
 * asso.fr…) is counted with it, at the most cautious.
 */
const REGISTRES: Readonly<Record<string, string>> = {
  fr: "afnic",
  re: "afnic",
  pm: "afnic",
  yt: "afnic",
  tf: "afnic",
  wf: "afnic",
  bzh: "afnic",
  alsace: "afnic",
  corsica: "afnic",
  paris: "afnic",
  com: "verisign",
  net: "verisign",
};
const groupeDuParent = (zone: string) => {
  const tld = zone.slice(zone.lastIndexOf(".") + 1);
  return REGISTRES[tld] ?? tld;
};
/** Slots a first question may take while the brake holds it, before it goes on its last one. */
const CRENEAUX_MAX = 5;

export class ClientParZone implements ClientDns {
  readonly id: string;
  readonly #zones: ParZone;
  /** The zones opened in this attempt, each with the end of its opening (its NS question, at its parent's pace). */
  readonly #premieres = new Map<string, Promise<void>>();
  /** The pace of each group of parent servers, for the questions that go to them. */
  readonly #parents = new Map<string, Cadence>();
  /** The pace of each zone's own servers. */
  readonly #rythmes = new Map<string, Cadence>();
  /**
   * The zones known as delegated: their apex answered its NS or its SOA records. Until then (a zone its parent serves
   * itself, a name that does not exist, an opening that failed), every question of the zone goes to the parent's
   * servers, and takes a slot of their pace.
   */
  readonly #deleguees = new Set<string>();
  /** The zones whose apex failed several times in a row: not asked again before the next attempt. */
  readonly #mortes = new Map<string, number>();
  /** Below the apexes: the names that failed per sub-zone, the sub-zones that ever answered, those down. */
  readonly #sousEchecs = new Map<string, Set<string>>();
  readonly #sousVivantes = new Set<string>();
  readonly #sousMortes = new Set<string>();
  constructor(
    private readonly base: ClientDns,
    private readonly zoneDe: (nom: string) => string,
    parZone: number,
    private readonly frein: OptionsCollecte["frein"] = undefined,
    private readonly parentParSeconde = Number.POSITIVE_INFINITY,
    private readonly horloge: Horloge = HORLOGE_REELLE,
    private readonly zoneParSeconde = Number.POSITIVE_INFINITY,
  ) {
    this.id = base.id;
    this.#zones = new ParZone(parZone);
  }

  /**
   * A new attempt: the zones and sub-zones that were down are asked again (those that ever answered stay known), and
   * every zone opens again with its NS question (its delegation may have left the resolver's cache).
   */
  oublierZonesMortes(): void {
    this.#mortes.clear();
    this.#sousEchecs.clear();
    this.#sousMortes.clear();
    this.#premieres.clear();
  }

  /** The sub-zones between a name and its zone's apex, deepest first (the name itself included). */
  static sousZones(nom: string, zone: string): string[] {
    if (nom === zone || !nom.endsWith(`.${zone}`)) return [];
    const etiquettes = nom.slice(0, -zone.length - 1).split(".");
    return etiquettes.map((_, i) => `${etiquettes.slice(i).join(".")}.${zone}`);
  }

  #noterSousZones(nom: string, zone: string, code: Reponse["code"]): void {
    const sous = ClientParZone.sousZones(nom, zone);
    if (!CODES_EN_ECHEC.has(code)) {
      // An answer: the name and every sub-zone above it are alive, even one that was down.
      for (const s of sous) {
        this.#sousVivantes.add(s);
        this.#sousEchecs.delete(s);
        this.#sousMortes.delete(s);
      }
      return;
    }
    for (const s of sous) this.#sousEchecs.set(s, (this.#sousEchecs.get(s) ?? new Set<string>()).add(nom));
    // The deepest sub-zone with enough failed names, and never an answer, is down; its names then explain no failure of
    // the sub-zones above it (they never add up to kill a shallower one).
    const morte = sous.find(
      (s) => !this.#sousVivantes.has(s) && (this.#sousEchecs.get(s)?.size ?? 0) >= SOUS_ZONE_MORTE,
    );
    if (morte === undefined) return;
    this.#sousMortes.add(morte);
    const expliques = this.#sousEchecs.get(morte) ?? new Set<string>();
    for (const s of sous.slice(sous.indexOf(morte) + 1)) {
      const echecs = this.#sousEchecs.get(s);
      if (echecs !== undefined) for (const n of expliques) echecs.delete(n);
    }
  }

  async demander(nom: string, type: TypeRr): Promise<Reponse> {
    const zone = this.zoneDe(nom);
    const premiere = this.#premieres.get(zone);
    if (premiere === undefined) {
      let finie: () => void = () => {};
      this.#premieres.set(
        zone,
        new Promise<void>((resolve) => {
          finie = resolve;
        }),
      );
      try {
        // Every new zone opens with its own NS question, alone, at its parent's pace, asked once more if it fails: its
        // other questions then know whether they go to the zone's own servers or to its parent's. A zone first reached
        // by a host, an SPF lookup or a platform's name opens the same way.
        let ouverture = await this.#poser(zone, zone, "NS");
        if (CODES_EN_ECHEC.has(ouverture.code) && this.#muette(zone, zone) === null) {
          ouverture = await this.#poser(zone, zone, "NS");
        }
        if (nom === zone && type === "NS") return ouverture;
      } finally {
        finie();
      }
    } else {
      await premiere;
    }
    return this.#poser(nom, zone, type);
  }

  /** The answer a zone, or a sub-zone of the name, that is down gives at once (no question sent), or null. */
  #muette(nom: string, zone: string): Reponse | null {
    if ((this.#mortes.get(zone) ?? 0) >= ZONE_MORTE) return { code: "ZONE_MUETTE", ad: false, reponses: [], duree: 0 };
    if (ClientParZone.sousZones(nom, zone).some((s) => this.#sousMortes.has(s))) {
      return { code: "SOUS_ZONE_MUETTE", ad: false, reponses: [], duree: 0 };
    }
    return null;
  }

  #cadence(table: Map<string, Cadence>, cle: string, parSeconde: number): Cadence {
    let cadence = table.get(cle);
    if (cadence === undefined) {
      cadence = new Cadence(parSeconde, this.horloge);
      table.set(cle, cadence);
    }
    return cadence;
  }

  /**
   * A slot of the parent's pace: the brake before and after it; a question held after its slot takes a new one (five
   * at most), so the questions held together never leave together.
   */
  async #creneauParent(nom: string, zone: string): Promise<void> {
    if (this.frein) await this.frein(nom, zone, true);
    const cadence = this.#cadence(this.#parents, groupeDuParent(zone), this.parentParSeconde);
    for (let creneau = 1; creneau <= CRENEAUX_MAX; creneau += 1) {
      await cadence.attendre();
      if (!this.frein || (await this.frein(nom, zone, true)) !== true) break;
    }
  }

  /**
   * One question: the zone's turn (two at a time), then the paces, then the answer, recorded. A question of a zone
   * not known as delegated takes a slot of its parent's pace while holding the zone's turn: one zone never reserves
   * more than two slots of its parent. Every question keeps the zone's own pace.
   */
  async #poser(nom: string, zone: string, type: TypeRr): Promise<Reponse> {
    const avant = this.#muette(nom, zone);
    if (avant !== null) return avant;
    await this.#zones.prendre(zone);
    try {
      // The zone may have gone down while the question waited for its turn.
      const pendant = this.#muette(nom, zone);
      if (pendant !== null) return pendant;
      if (!this.#deleguees.has(zone)) await this.#creneauParent(nom, zone);
      else if (this.frein) await this.frein(nom, zone, false);
      await this.#cadence(this.#rythmes, zone, this.zoneParSeconde).attendre();
      const r = await this.base.demander(nom, type);
      // Its apex answered its own NS or SOA records: the zone is delegated, its servers answer its questions.
      if (
        nom === zone &&
        r.reponses.some((e) => (e.donnee.type === "NS" || e.donnee.type === "SOA") && e.proprietaire === zone)
      ) {
        this.#deleguees.add(zone);
      }
      if (nom === zone) {
        // Three failures in a row of the apex's questions: the zone is down for this attempt.
        if (CODES_EN_ECHEC.has(r.code)) this.#mortes.set(zone, (this.#mortes.get(zone) ?? 0) + 1);
        else this.#mortes.delete(zone);
      } else {
        this.#noterSousZones(nom, zone, r.code);
      }
      return r;
    } finally {
      this.#zones.rendre(zone);
    }
  }
  fermer(): void {
    this.base.fermer();
  }
}

/** A failed lookup makes the SPF expansion « echec » (its list would be incomplete), never « none ». */
const verifier = (r: Reponse, nom: string): Reponse => {
  if (CODES_EN_ECHEC.has(r.code)) throw new EchecRecherche(`${nom} : ${r.code}`);
  return r;
};

/** The SPF expansion asks through the same polite client. */
export function resolveurSpf(client: ClientDns): ResolveurSpf {
  // Each lookup is asked once in the run, whatever the number of domains that include it; a failure is asked again.
  const memoriser = <T>(f: (cle: string) => Promise<T>): ((cle: string) => Promise<T>) => {
    const deja = new Map<string, Promise<T>>();
    return (cle) => {
      const enCours = deja.get(cle);
      if (enCours !== undefined) return enCours;
      const promesse = f(cle);
      deja.set(cle, promesse);
      promesse.catch(() => deja.delete(cle));
      return promesse;
    };
  };
  const base: ResolveurSpf = {
    spf: async (domaine) => {
      const r = verifier(await client.demander(domaine, "TXT"), domaine);
      for (const e of r.reponses) if (e.donnee.type === "TXT") return e.donnee.spf;
      return null;
    },
    adresses: async (nom) => {
      const [a, aaaa] = (await Promise.all([client.demander(nom, "A"), client.demander(nom, "AAAA")])).map((r) =>
        verifier(r, nom),
      ) as [Reponse, Reponse];
      return [...a.reponses, ...aaaa.reponses].flatMap((e) =>
        e.donnee.type === "A" || e.donnee.type === "AAAA" ? [e.donnee.adresse] : [],
      );
    },
    mx: async (domaine) => {
      const r = verifier(await client.demander(domaine, "MX"), domaine);
      return r.reponses.flatMap((e) => (e.donnee.type === "MX" && e.donnee.hote !== "" ? [e.donnee.hote] : []));
    },
  };
  return { spf: memoriser(base.spf), adresses: memoriser(base.adresses), mx: memoriser(base.mx) };
}

const enEchec = (m: MesureNom) => m.etat === "echec";
const domaineEnEchec = (z: MesureZone) => z.etat === "echec" || z.mxEtat === "echec" || z.echecs.length > 0;

/**
 * Measures every name (and the registrable domain each one belongs to). `noms` maps each name to its registrable
 * domain; the witnesses and the control resolver are asked elsewhere (controle.ts).
 */
export async function collecter(
  noms: ReadonlyMap<string, string>,
  clientBrut: ClientDns,
  options: OptionsCollecte,
): Promise<ResultatCollecte> {
  const horloge = options.horloge ?? HORLOGE_REELLE;
  const client = new ClientParZone(
    clientBrut,
    options.zoneDe,
    options.parZone,
    options.frein,
    options.parentParSeconde,
    horloge,
    options.zoneParSeconde,
  );
  const spfClient = resolveurSpf(client);
  const cadenceNoms = new Cadence(options.nomsParSeconde, horloge);
  const cadenceDomaines = new Cadence(options.domainesParSeconde, horloge, options.montee);
  const resultat: ResultatCollecte = {
    noms: new Map(),
    domaines: new Map(),
    hotes: new Map(),
    spf: new Map(),
    essais: new Map(),
    debut: Date.now(),
    fin: 0,
  };
  const hotesEnCours = new Map<string, Promise<void>>();
  const essai = (cle: string) => resultat.essais.set(cle, (resultat.essais.get(cle) ?? 0) + 1);

  const mesurerHote = (hote: string): Promise<void> => {
    const enCours = hotesEnCours.get(hote);
    if (enCours) return enCours;
    const promesse = mesurerNom(hote, client).then((m) => {
      resultat.hotes.set(hote, m);
    });
    hotesEnCours.set(hote, promesse);
    return promesse;
  };

  const mesurerDomaine = async (domaine: string): Promise<void> => {
    essai(domaine);
    const zone = await mesurerZone(domaine, client);
    resultat.domaines.set(domaine, zone);
    // At most 13 name servers and 10 mail exchangers per domain are asked: a domain that names hundreds of slow hosts
    // can never hold the collection (the records keep as many).
    await Promise.all([...zone.ns.slice(0, 13), ...zone.mx.slice(0, 10).map((m) => m.hote)].map(mesurerHote));
    if (zone.spf !== null) resultat.spf.set(domaine, await etendreSpf(domaine, spfClient));
    else resultat.spf.delete(domaine);
  };

  const mesurerUnNom = async (nom: string): Promise<void> => {
    essai(nom);
    resultat.noms.set(nom, await mesurerNom(nom, client));
  };

  const passe = async (taches: readonly (() => Promise<void>)[]) => {
    const file = [...taches];
    const debut = horloge.maintenant();
    let faites = 0;
    const ouvrier = async () => {
      for (let tache = file.shift(); tache !== undefined; tache = file.shift()) {
        await tache();
        faites += 1;
        if (faites % 2_000 === 0) {
          const parSeconde = faites / Math.max(1, (horloge.maintenant() - debut) / 1000);
          options.suivi?.(
            `${faites} / ${taches.length} domaines (${parSeconde.toFixed(1)} par seconde ; ${resultat.noms.size} noms mesurés)`,
          );
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(options.enVol, file.length) }, ouvrier));
  };

  // First pass, domain by domain, in random order: a domain opens at the domains' pace, its zone's NS question first
  // (alone, at its parent's pace), then its measurement and all its names together, while its delegation is fresh in
  // the resolver's cache (an hour for .fr): no name of it asks its parent again later.
  const parUnite = new Map<string, string[]>();
  for (const [nom, unite] of noms) {
    const liste = parUnite.get(unite);
    if (liste === undefined) parUnite.set(unite, [nom]);
    else liste.push(nom);
  }
  const taille = (u: string) => parUnite.get(u)?.length ?? 0;
  const unites = [...parUnite.keys()];
  const ordreUnites = [
    ...unites.filter((u) => taille(u) >= 50).sort((a, b) => taille(b) - taille(a) || (a < b ? -1 : 1)),
    ...melanger(
      unites.filter((u) => taille(u) < 50),
      options.aleatoire,
    ),
  ];
  await passe(
    ordreUnites.map((unite) => async () => {
      await cadenceDomaines.attendre();
      await options.frein?.(unite, options.zoneDe(unite), true);
      // The measurement is called first: its NS question is the zone's first (client per zone, above).
      await Promise.all([
        mesurerDomaine(unite),
        ...melanger(parUnite.get(unite) ?? [], options.aleatoire).map(async (nom) => {
          await cadenceNoms.attendre();
          await mesurerUnNom(nom);
        }),
      ]);
    }),
  );
  options.apresPremierePasse?.(resultat);

  // Two more attempts, 10 minutes apart, for what failed (names, domains, hosts).
  for (let reprise = 1; reprise <= options.reprises; reprise += 1) {
    const nomsEchoues = [...resultat.noms.values()].filter(enEchec).map((m) => m.nom);
    // A domain whose SPF list is incomplete (a lookup failed) is asked again too.
    const domainesEchoues = [...resultat.domaines.values()]
      .filter((z) => domaineEnEchec(z) || resultat.spf.get(z.domaine)?.statut === "echec")
      .map((z) => z.domaine);
    const hotesEchoues = [...resultat.hotes.values()].filter(enEchec).map((m) => m.nom);
    if (nomsEchoues.length + domainesEchoues.length + hotesEchoues.length === 0) break;
    if (options.echeance !== undefined && Date.now() + options.delaiRepriseMs > options.echeance) {
      options.suivi?.(`reprise ${reprise} abandonnée : l'heure limite approche`);
      break;
    }
    options.suivi?.(
      `reprise ${reprise} dans ${options.delaiRepriseMs / 60_000} min : ${nomsEchoues.length} noms, ` +
        `${domainesEchoues.length} domaines, ${hotesEchoues.length} hôtes`,
    );
    await horloge.dormir(options.delaiRepriseMs);
    client.oublierZonesMortes();
    for (const hote of hotesEchoues) hotesEnCours.delete(hote);
    await passe([
      ...melanger(domainesEchoues, options.aleatoire).map((d) => async () => {
        await cadenceDomaines.attendre();
        await options.frein?.(d, options.zoneDe(d), true);
        await mesurerDomaine(d);
      }),
      ...melanger(hotesEchoues, options.aleatoire).map((h) => async () => {
        await cadenceNoms.attendre();
        await mesurerHote(h);
      }),
      ...melanger(nomsEchoues, options.aleatoire).map((n) => async () => {
        await cadenceNoms.attendre();
        await mesurerUnNom(n);
      }),
    ]);
  }
  resultat.fin = Date.now();
  return resultat;
}
