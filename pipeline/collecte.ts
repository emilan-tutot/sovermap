// The DNS measurement of a whole collection (brief B.2 and B.3, plan § 5 and § 9). Every name of the list is asked in
// random order, 25 names per second at most; the first name of a registrable domain « opens » it — NS, SOA, CAA,
// MX and TXT, then the addresses of its name servers and mail exchangers (once per host for the whole collection) and
// its SPF record expanded — and at most 8 domains open per second, so that the servers of a top-level domain (.fr)
// get at most one referral per new domain. Every single question holds one of the two permits of the zone it goes to
// (the registrable domain of the asked name): at most 2 simultaneous questions per zone, whoever asks; and, in the
// first pass, at most 8 questions waiting for their answer among those that go through the servers of one registry
// (the openings, the questions of zones not known as delegated), so that servers that answer late never have more
// than these pending with the resolver. A name or a domain that fails is asked again, at most twice, 10 minutes apart;
// a failure stays a failure, never « no site ».
import type { ClientDns, Reponse, TypeRr } from "./dns-bas";
import { type MesureNom, type MesureZone, mesurerNom, mesurerZone } from "./mesure";
import { Cadence, type Horloge, HORLOGE_REELLE, instantCommun, melanger, type Montee, ParZone } from "./politesse";
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
  /**
   * Questions per second to one name server (a host named in a zone's NS records), counted over every zone it serves:
   * a question of a delegated zone takes the same instant at each of its zone's name servers, so that no server, shared
   * by hundreds of domains or not, gets more of our questions than this in a second, whichever one the resolver picks
   * (brief B.3). A zone whose servers are not known keeps a pace of its own.
   */
  serveurParSeconde: number;
  /**
   * What the resolver's logs tell, for the pace (debit-serveurs.ts): `cout`, how many questions one of ours to a zone
   * lately cost that zone's servers (the resolver adds its own: a sub-zone's referral, a retry on another server);
   * `envoi`, called as each of our questions leaves; `adresses`, the addresses the resolver uses for a name server
   * (two names of one server then share its pace).
   */
  journal?: {
    cout: (zone: string) => number;
    envoi: (zone: string) => void;
    adresses: (hote: string) => readonly string[];
    /** The addresses the resolver asked about a zone cut (a zone whose NS records do not answer still has servers). */
    adressesDeCoupe: (coupe: string) => readonly string[];
  };
  /** Names of one domain in flight at once in the first pass: a large domain never holds the names' pace alone. */
  nomsParDomaine: number;
  /** Called once the first pass has ended (every domain measured), before the attempts: the controls may start. */
  apresPremierePasse?: (resultat: ResultatCollecte) => void;
  /** Called each time a domain's zone is measured (first pass and attempts): a control may take its hosts at once. */
  apresDomaine?: (domaine: string, zone: MesureZone) => void;
  /**
   * Domains in flight at once in the first pass (each one waits for its opening, then for its name servers' pace):
   * enough that the domains of a busy shared server never hold all the places.
   */
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
  /**
   * No task of a retry pass starts after this moment: what is left keeps its failure, and the job always ends in time
   * (the review of 22/11/2026: a retry that started late had no end).
   */
  finReprises?: number;
  /**
   * The emergency stop, in the first pass only. A domain fails as for the guard of 2 % (collecter.ts): its zone's
   * question, its MX question or its web name failed (`nomWebDe`; without it, any of its names). When `part` of the
   * last `fenetre` domains failed (a breach), the collection pauses `pauseMs`: every question is held (no domain opens,
   * those under way wait), then released at one shared pace, and the count starts from zero. A full count under the
   * threshold lifts the alert; at the `depassements`-th breach in a row, or at a breach after `pausesMax` pauses that
   * day, it stops for good: the client answers « ERREUR » without asking anything any more, the retries are skipped,
   * `surArret` is called, and a guard keeps the day unpublished. An outage of some twenty minutes, at the network of
   * the machine or at a large host, thus costs pauses rather than the day, as long as the first pass, longer by them,
   * leaves time for the retries (the retries start before `echeance` only). The trials of 22/11/2026 at 17:11 and
   * 20:14 had 15 to 17 % of their domains failed (none confirmed by Quad9); the published days 1 and 2, 0.7 and 1 %
   * after their retries.
   */
  arret: { fenetre: number; part: number; pauseMs: number; depassements: number; pausesMax: number };
  /** The web name of a domain, for the emergency stop's count. */
  nomWebDe?: (domaine: string) => string | undefined;
  /** Called once, when the emergency stop is decided, with its reason (the controls stop too). */
  surArret?: (raison: string) => void;
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
  serveurParSeconde: 5,
  enVol: 512,
  nomsParDomaine: 4,
  montee: { depart: 1, dureeMs: 10 * 60 * 1000 },
  reprises: 2,
  delaiRepriseMs: 10 * 60 * 1000,
  arret: { fenetre: 1_000, part: 0.15, pauseMs: 10 * 60 * 1000, depassements: 3, pausesMax: 3 },
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
  /** Why the collection stopped before its end (the emergency stop), or null: a stopped day is never published. */
  arret: string | null;
  /**
   * The domains under way when the collection stopped: their questions not yet asked got « ERREUR » without being
   * asked, so their failures say nothing of their servers (the diagnosis marks them; Quad9 is not asked about them).
   */
  inacheves: Set<string>;
};

/** The pace at which the questions held by an emergency pause go out again, by default: the names' (POLITESSE). */
const REPRISE_PAR_SECONDE = 25;

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
  // Its own keys only: a label read in the DNS (« constructor ») is a top-level domain like any other.
  return (Object.hasOwn(REGISTRES, tld) ? REGISTRES[tld] : undefined) ?? tld;
};
/** Slots a first question may take while the brake holds it, before it goes on its last one. */
const CRENEAUX_MAX = 5;
/**
 * Questions waiting for their answer at once, per group of parent servers, among those that go through them (the
 * openings of domains, and the questions of a zone not known as delegated). When those servers answer late or not at
 * all, the resolver asks each pending question again on their other servers: their number, more than our pace, then
 * makes the load (the trial of 22/11/2026, from 17:24 UTC: 22 questions in a second to a server of .fr, five of the
 * resolver's for one of ours). A place is taken before the parent's pace and its brake, and held until the answer, the
 * child zone's servers included: the pace keeps its six openings per second while they answer within 1.3 s on
 * average, but a zone whose servers never answer holds places for up to 36 s (its two openings, then its SOA and the
 * first question of one of its names, 12 s each, until the client gives up). The cap holds in the first pass only: the
 * retries are made mostly of such zones, and with it a retry of a few hundred of them would last most of an hour. After
 * a first pass when a registry's servers answered badly, the retries reopen its zones at the pace and under the brake
 * only, as before this cap; a decision by registry, from the counts the job's log now gives, may come later (the three
 * reviews of 22/11/2026).
 */
export const PARENT_EN_VOL = 8;
/**
 * Upstream questions one of ours may cost and still keep a server, at our full pace (5 per second), under 8: a zone
 * whose questions cost more takes several instants per question (4 at most).
 */
const AMPLIFICATION_PERMISE = 1.6;
const POIDS_MAX = 6;
/** Zones a zone's CNAMEs may lead to, whose servers its questions also respect (the first ones seen). */
const SUITES_MAX = 4;

export class ClientParZone implements ClientDns {
  readonly id: string;
  readonly #zones: ParZone;
  /** The zones opened in this attempt, each with the end of its opening (its NS question, at its parent's pace). */
  readonly #premieres = new Map<string, Promise<void>>();
  /** The questions in flight to each group of parent servers (PARENT_EN_VOL at most). */
  readonly #parentsEnVol = new ParZone(PARENT_EN_VOL);
  /**
   * The questions that took a place (total), those that failed, those that waited for a place, and how long in all
   * (milliseconds of the clock; the wait for the parent's pace counts, since the place is taken before it).
   */
  readonly #attenteParents = { questions: 0, ms: 0, total: 0, echecs: 0 };
  /** The cap holds in the first pass only (leverPlafondParents). */
  #plafonne = true;
  #arrete = false;
  #pauseJusqua = 0;
  /** The pace at which the questions held by an emergency pause go out again (created with the first pause). */
  #repriseCadence: Cadence | null = null;
  #repriseParSeconde = REPRISE_PAR_SECONDE;
  /** The pace of each group of parent servers, for the questions that go to them. */
  readonly #parents = new Map<string, Cadence>();
  /** The pace of each zone's own servers. */
  readonly #rythmes = new Map<string, Cadence>();
  /** The name servers of each delegated zone (its NS records, from its opening): their paces are shared. */
  readonly #serveurs = new Map<string, string[]>();
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
  /** The zones whose opening answered NXDOMAIN and nothing else: nothing exists under them (RFC 8020). */
  readonly #inexistantes = new Set<string>();
  /**
   * Where a question failed in this run: the apexes, and below them the sub-zone that holds each failed name (the name
   * itself when it sits right under the apex). The resolver tries their other servers, and again: their questions
   * weigh more, never the rest of the zone (a large domain with one dead sub-zone keeps its pace).
   */
  readonly #apexEnPanne = new Set<string>();
  readonly #sousEnPanne = new Set<string>();
  /** The zones each zone's CNAMEs lead to: the resolver's next question goes to their servers. */
  readonly #suites = new Map<string, Set<string>>();
  /** The names between a zone and the names asked, already counted (a margin: the resolver may ask their DS). */
  readonly #intermediairesVus = new Set<string>();
  constructor(
    private readonly base: ClientDns,
    private readonly zoneDe: (nom: string) => string,
    parZone: number,
    private readonly frein: OptionsCollecte["frein"] = undefined,
    private readonly parentParSeconde = Number.POSITIVE_INFINITY,
    private readonly horloge: Horloge = HORLOGE_REELLE,
    private readonly serveurParSeconde = Number.POSITIVE_INFINITY,
    private readonly journal: OptionsCollecte["journal"] = undefined,
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
        let ouverture = await this.#poser(zone, zone, "NS", true);
        if (CODES_EN_ECHEC.has(ouverture.code) && this.#muette(zone, zone) === null) {
          ouverture = await this.#poser(zone, zone, "NS", true);
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

  /**
   * The answer known without asking: a zone that does not exist has nothing under it (its other questions get its
   * NXDOMAIN), and a zone or sub-zone that is down is not asked again in this attempt.
   */
  #sansQuestion(nom: string, zone: string, ouverture: boolean): Reponse | null {
    if (this.#arrete) return { code: "ERREUR", ad: false, reponses: [], duree: 0 };
    if (!ouverture && this.#inexistantes.has(zone)) return { code: "NXDOMAIN", ad: false, reponses: [], duree: 0 };
    return this.#muette(nom, zone);
  }

  /**
   * The pace keys of a question of a zone: the zone itself; its name servers, by name (its NS records, else its SOA's
   * primary) and by the addresses the resolver used for them (two names of one server share its pace); the addresses
   * the resolver asked about the zone's cut; and the same for the zones its CNAMEs lead to. A question takes the same
   * instant at every key: no server, known by any of these, gets more than its pace.
   */
  #cles(zone: string): string[] {
    const cles = new Set<string>();
    for (const z of [zone, ...(this.#suites.get(zone) ?? [])]) {
      cles.add(z);
      for (const adresse of this.journal?.adressesDeCoupe(z) ?? []) cles.add(adresse);
      for (const hote of this.#serveurs.get(z) ?? []) {
        cles.add(hote);
        for (const adresse of this.journal?.adresses(hote) ?? []) cles.add(adresse);
      }
    }
    return [...cles];
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
   * not known as delegated takes a place among the questions in flight to its parent's servers and a slot of its
   * parent's pace while holding the zone's turn: one zone never reserves more than two of either. Every question keeps
   * the zone's own pace.
   */
  async #poser(nom: string, zone: string, type: TypeRr, ouverture = false): Promise<Reponse> {
    // The emergency pause: a question waits for its end before anything; one that meets it just before it goes out
    // gives its places back and starts again, so that the questions held go out at the servers' pace afterwards.
    for (;;) {
      let retenue = false;
      while (!this.#arrete && this.horloge.maintenant() < this.#pauseJusqua) {
        retenue = true;
        await this.horloge.dormir(this.#pauseJusqua - this.horloge.maintenant());
      }
      // The questions held go out again one at a time, at the names' pace, before their own turns and paces.
      if (retenue) await this.#reprise.attendre();
      const r = await this.#poserUneFois(nom, zone, type, ouverture);
      if (r !== null) return r;
    }
  }

  /** One attempt of #poser; null when the emergency pause came while the question waited for its turn. */
  async #poserUneFois(nom: string, zone: string, type: TypeRr, ouverture: boolean): Promise<Reponse | null> {
    const avant = this.#sansQuestion(nom, zone, ouverture);
    if (avant !== null) return avant;
    await this.#zones.prendre(zone);
    /** The group of parent servers whose place the question holds, until its answer. */
    let auParent: string | null = null;
    /** How long it waited for that place (null: not at all); counted once, when the question goes out. */
    let attenteAuParent: number | null = null;
    try {
      // The zone may have gone down while the question waited for its turn.
      const pendant = this.#sansQuestion(nom, zone, ouverture);
      if (pendant !== null) return pendant;
      // An opening asks the parent for the delegation, at every attempt too: while the cap holds, a place among the
      // questions waiting for an answer through the parent's servers (PARENT_EN_VOL); then a slot of the parent's pace.
      if (ouverture || !this.#deleguees.has(zone)) {
        if (this.#plafonne) {
          const groupe = groupeDuParent(zone);
          const debut = this.horloge.maintenant();
          const attendu = await this.#parentsEnVol.prendre(groupe);
          auParent = groupe;
          attenteAuParent = attendu ? this.horloge.maintenant() - debut : null;
        }
        await this.#creneauParent(nom, zone);
      } else if (this.frein) await this.frein(nom, zone, false);
      // The same instant at each of the zone's name servers (shared by many zones), or at the zone's own pace; a
      // question that costs the servers more than one question takes more: what the logs measured for the zone; four
      // where a question failed (the resolver tries the other servers, and again: up to 5 questions for one of ours);
      // and, before the logs can tell, one more for each new name between the zone and the asked name (the resolver
      // asked those first, with QNAME minimisation; it no longer minimises, since 22/11/2026, but the weight stays, as a
      // margin: it may still ask the DS of such a name).
      const intermediaires =
        nom === zone
          ? []
          : ClientParZone.sousZones(nom, zone)
              .slice(1)
              .filter((n) => !this.#intermediairesVus.has(n));
      const enPanne =
        nom === zone
          ? this.#apexEnPanne.has(zone)
          : ClientParZone.sousZones(nom, zone).some((s) => this.#sousEnPanne.has(s));
      const poids = Math.min(
        POIDS_MAX,
        Math.max(
          enPanne ? 4 : 1,
          Math.ceil((this.journal?.cout(zone) ?? 1) / AMPLIFICATION_PERMISE),
          1 + intermediaires.length,
        ),
      );
      await instantCommun(
        this.#cles(zone).map((cle) => this.#cadence(this.#rythmes, cle, this.serveurParSeconde)),
        this.horloge,
        poids,
      );
      // The emergency stop or pause may have come while the question waited for its instant: it is not asked (now).
      if (this.#arrete) return { code: "ERREUR", ad: false, reponses: [], duree: 0 };
      if (this.horloge.maintenant() < this.#pauseJusqua) return null;
      if (auParent !== null) {
        this.#attenteParents.total += 1;
        if (attenteAuParent !== null) {
          this.#attenteParents.questions += 1;
          this.#attenteParents.ms += attenteAuParent;
        }
      }
      this.journal?.envoi(zone);
      const r = await this.base.demander(nom, type);
      if (auParent !== null && CODES_EN_ECHEC.has(r.code)) this.#attenteParents.echecs += 1;
      for (const n of intermediaires) this.#intermediairesVus.add(n);
      if (CODES_EN_ECHEC.has(r.code)) {
        if (nom === zone) this.#apexEnPanne.add(zone);
        else {
          const sous = ClientParZone.sousZones(nom, zone);
          this.#sousEnPanne.add(sous[1] ?? nom);
        }
      }
      // The zones the answer's CNAMEs lead to: the resolver asked their servers too, for this question of ours.
      const suites = new Set<string>();
      for (const e of r.reponses) {
        if (e.donnee.type !== "CNAME") continue;
        const cible = this.zoneDe(e.donnee.cible.toLowerCase().replace(/\.$/, ""));
        if (cible !== zone) suites.add(cible);
      }
      for (const cible of suites) {
        this.journal?.envoi(cible);
        const connues = this.#suites.get(zone) ?? new Set<string>();
        if (connues.size < SUITES_MAX) connues.add(cible);
        this.#suites.set(zone, connues);
      }
      if (ouverture) {
        if (r.code === "NXDOMAIN" && r.reponses.length === 0) this.#inexistantes.add(zone);
        else this.#inexistantes.delete(zone);
      }
      // Its apex answered its own NS or SOA records: the zone is delegated, its servers answer its questions.
      if (
        nom === zone &&
        r.reponses.some((e) => (e.donnee.type === "NS" || e.donnee.type === "SOA") && e.proprietaire === zone)
      ) {
        this.#deleguees.add(zone);
        const serveurs = r.reponses.flatMap((e) =>
          e.donnee.type === "NS" && e.proprietaire === zone ? [e.donnee.cible.toLowerCase().replace(/\.$/, "")] : [],
        );
        // No NS records (they did not answer): the SOA's primary names one of the zone's servers at least.
        const primaire = r.reponses.flatMap((e) =>
          e.donnee.type === "SOA" && e.proprietaire === zone ? [e.donnee.mname.toLowerCase().replace(/\.$/, "")] : [],
        );
        if (serveurs.length > 0) this.#serveurs.set(zone, [...new Set(serveurs)].sort());
        else if (primaire.length > 0 && !this.#serveurs.has(zone)) this.#serveurs.set(zone, [...new Set(primaire)]);
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
      if (auParent !== null) this.#parentsEnVol.rendre(auParent);
      this.#zones.rendre(zone);
    }
  }

  /**
   * The questions that took a place among those in flight to a parent's servers (total), those that failed, those that
   * waited for a place, and how long in all (ms).
   */
  get attenteParents(): Readonly<{ questions: number; ms: number; total: number; echecs: number }> {
    return { ...this.#attenteParents };
  }

  /**
   * From now on (the retries), no question waits for a place among those of its parent's servers (PARENT_EN_VOL): the
   * retries are mostly zones whose servers never answer, each of which would hold places until the client gives up.
   */
  leverPlafondParents(): void {
    this.#plafonne = false;
  }

  /** The emergency stop (OptionsCollecte.arret): from now on, every question gets « ERREUR » without being asked. */
  arreter(): void {
    this.#arrete = true;
  }

  /**
   * The emergency pause (OptionsCollecte.arret): until `jusqua` (the client's clock), no question is asked; each one
   * waits before its turn and its pace, so the questions held go out at the servers' pace afterwards.
   */
  pauser(jusqua: number, repriseParSeconde = REPRISE_PAR_SECONDE): void {
    this.#pauseJusqua = jusqua;
    if (repriseParSeconde !== this.#repriseParSeconde) {
      this.#repriseParSeconde = repriseParSeconde;
      this.#repriseCadence = null;
    }
  }

  get #reprise(): Cadence {
    this.#repriseCadence ??= new Cadence(this.#repriseParSeconde, this.horloge);
    return this.#repriseCadence;
  }

  fermer(): void {
    this.base.fermer();
  }
}

/** Runs `faire` on each element, `n` at a time, in order. */
async function enParallele<T>(elements: readonly T[], n: number, faire: (x: T) => Promise<void>): Promise<void> {
  let suivant = 0;
  const ouvrier = async () => {
    while (suivant < elements.length) {
      const x = elements[suivant] as T;
      suivant += 1;
      await faire(x);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, n), elements.length) }, ouvrier));
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
    options.serveurParSeconde,
    options.journal,
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
    arret: null,
    inacheves: new Set(),
  };
  /** The first pass's domains opened and not yet counted: those still under way at a stop are « inachevés ». */
  const ouverts = new Set<string>();
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

  // The emergency stop (OptionsCollecte.arret): the outcome of the first pass's last domains, in a sliding window; a
  // breach pauses, a full count under the threshold lifts the alert, the last breach in a row stops. A domain opened
  // before a pause is not counted after it (`epoque`).
  let premierePasse = true;
  let mesuresPremierePasse = 0;
  let fenetre: boolean[] = [];
  let enEchecDansFenetre = 0;
  let epoque = 0;
  let pauseJusqua = 0;
  /** The breaches in a row: each but the last brings a pause; a full count under the threshold resets them. */
  let depassements = 0;
  /** The pauses of the day (at most `pausesMax`: a breach beyond them stops). */
  let pauses = 0;
  const seuil = `seuil : ${Math.round(100 * options.arret.part)} %`;
  const minutesPause = Math.round(options.arret.pauseMs / 60_000);
  const enEchecPourArret = (unite: string): boolean => {
    const zone = resultat.domaines.get(unite);
    if (zone?.etat === "echec" || zone?.mxEtat === "echec") return true;
    const web = options.nomWebDe?.(unite);
    const noms = web === undefined ? (parUnite.get(unite) ?? []) : [web];
    return noms.some((n) => resultat.noms.get(n)?.etat === "echec");
  };
  const noterUnite = (unite: string, sonEpoque: number) => {
    if (!premierePasse || resultat.arret !== null || sonEpoque !== epoque) return;
    mesuresPremierePasse += 1;
    const echec = enEchecPourArret(unite);
    fenetre.push(echec);
    if (echec) enEchecDansFenetre += 1;
    if (fenetre.length > options.arret.fenetre && fenetre.shift() === true) enEchecDansFenetre -= 1;
    if (fenetre.length < options.arret.fenetre) return;
    const constat = `${enEchecDansFenetre} des ${fenetre.length} derniers domaines en échec (${seuil})`;
    if (enEchecDansFenetre < options.arret.part * options.arret.fenetre) {
      if (depassements > 0) options.suivi?.(`alerte levée après ${mesuresPremierePasse} domaines : ${constat}`);
      depassements = 0;
      return;
    }
    depassements += 1;
    if (depassements < options.arret.depassements && pauses < options.arret.pausesMax) {
      // A pause, then a new count.
      pauses += 1;
      epoque += 1;
      pauseJusqua = horloge.maintenant() + options.arret.pauseMs;
      client.pauser(pauseJusqua, options.nomsParSeconde);
      fenetre = [];
      enEchecDansFenetre = 0;
      options.suivi?.(
        `pause d'urgence de ${minutesPause} min après ${mesuresPremierePasse} domaines (dépassement ${depassements} ` +
          `sur ${options.arret.depassements}) : ${constat} ; la mesure reprend ensuite, et recompte`,
      );
      return;
    }
    resultat.arret =
      depassements >= options.arret.depassements
        ? `arrêt d'urgence après ${mesuresPremierePasse} domaines : ${constat}, au dépassement ${depassements} de ` +
          `suite (une pause de ${minutesPause} min après chacun des précédents)`
        : `arrêt d'urgence après ${mesuresPremierePasse} domaines : ${constat}, toutes les pauses du jour prises ` +
          `(${pauses} sur ${options.arret.pausesMax})`;
    // The domain that brought the stop is counted; the others under way end without being asked any more.
    for (const u of ouverts) if (u !== unite) resultat.inacheves.add(u);
    client.arreter();
    options.surArret?.(resultat.arret);
    options.suivi?.(`${resultat.arret} ; plus aucune question, le jour ne sera pas publié`);
  };

  const mesurerDomaine = async (domaine: string): Promise<void> => {
    essai(domaine);
    const zone = await mesurerZone(domaine, client);
    resultat.domaines.set(domaine, zone);
    options.apresDomaine?.(domaine, zone);
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

  const passe = async (taches: readonly (() => Promise<void>)[], fin?: { a: number; etiquette: string }) => {
    const file = [...taches];
    const debut = horloge.maintenant();
    let faites = 0;
    let coupee = false;
    const ouvrier = async () => {
      for (let tache = file.shift(); tache !== undefined; tache = file.shift()) {
        // The emergency stop: no task is taken once the collection decided to stop (those under way end).
        if (resultat.arret !== null) {
          file.length = 0;
          break;
        }
        // The wall clock, like `echeance` (the review of PR 20: the measuring clock counts from the process's start, and
        // compared with a date it never cut anything).
        if (fin !== undefined && Date.now() >= fin.a) {
          if (!coupee)
            options.suivi?.(`${fin.etiquette} arrêtée à l'heure limite : ${file.length + 1} tâches non reprises`);
          coupee = true;
          file.length = 0;
          break;
        }
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
      // The emergency pause: a domain whose turn comes during it waits for its end, then takes a slot of the domains'
      // pace again; after a stop, none opens. Only a domain opened after the last pause counts for the stop.
      for (;;) {
        await cadenceDomaines.attendre();
        await options.frein?.(unite, options.zoneDe(unite), true);
        if (resultat.arret !== null) return;
        if (horloge.maintenant() >= pauseJusqua) break;
        await horloge.dormir(pauseJusqua - horloge.maintenant());
      }
      const sonEpoque = epoque;
      ouverts.add(unite);
      // The measurement is called first: its NS question is the zone's first (client per zone, above). Its names go a
      // few at a time: a large domain never takes every slot of the names' pace at once.
      await Promise.all([
        mesurerDomaine(unite),
        enParallele(melanger(parUnite.get(unite) ?? [], options.aleatoire), options.nomsParDomaine, async (nom) => {
          await cadenceNoms.attendre();
          await mesurerUnNom(nom);
        }),
      ]);
      noterUnite(unite, sonEpoque);
      ouverts.delete(unite);
    }),
  );
  premierePasse = false;
  // The cap on the questions waiting through the parents' servers holds in the first pass only (PARENT_EN_VOL); the
  // job's log tells how its questions went, for a later decision on the retries.
  const attente = client.attenteParents;
  options.suivi?.(
    `questions par les serveurs parents, première passe : ${attente.total}, dont ${attente.echecs} en échec ; ` +
      `${attente.questions} ont attendu une place (${Math.round(attente.ms / 1000)} s en tout ; ${PARENT_EN_VOL} au ` +
      `plus en attente par registre) ; reprises sans plafond`,
  );
  client.leverPlafondParents();
  options.apresPremierePasse?.(resultat);

  // Two more attempts, 10 minutes apart, for what failed (names, domains, hosts).
  for (let reprise = 1; reprise <= options.reprises; reprise += 1) {
    if (resultat.arret !== null) {
      options.suivi?.(`reprise ${reprise} sautée : arrêt d'urgence`);
      break;
    }
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
    await passe(
      [
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
      ],
      options.finReprises === undefined ? undefined : { a: options.finReprises, etiquette: `reprise ${reprise}` },
    );
  }
  resultat.fin = Date.now();
  return resultat;
}
