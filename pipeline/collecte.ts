// The DNS measurement of a whole collection (brief B.2 and B.3, plan § 5 and § 9). Every name of the list is asked in
// random order, 25 names per second at most; the first name of a registrable domain « opens » it — NS, SOA, DS, CAA,
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
  /** Called once the first pass has ended (every domain measured), before the attempts: the controls may start. */
  apresPremierePasse?: (resultat: ResultatCollecte) => void;
  /** Names in flight at once (each one may wait for its domain to open, or for a slow server). */
  enVol: number;
  /** The domains' rate climbs from `depart` per second to `domainesParSeconde` (a cold cache never bursts). */
  montee: Montee | null;
  /**
   * The brake (brief B.3, debit-serveurs.ts), waited before every question and every opening of a domain: it resolves
   * when a question about `nom`, in the registered zone `zone`, may go; `ouverture`: a question that also goes to the
   * zone's parents (the opening of a domain, the first question of a zone, a DS question).
   */
  frein?: (nom: string, zone: string, ouverture: boolean) => Promise<void>;
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
const CODES_EN_ECHEC = new Set(["SERVFAIL", "TIMEOUT", "REFUSED", "ERREUR"]);
/** Failures in a row, with no answer between them, after which a zone is down for the rest of an attempt. */
const ZONE_MORTE = 3;

export class ClientParZone implements ClientDns {
  readonly id: string;
  readonly #zones: ParZone;
  /**
   * The zones already asked in this run, each with the end of its first question: that question also goes to the
   * zone's parents (the delegation); the zone's other questions wait for its answer, after which the delegation is
   * known (they never ask the parents in parallel).
   */
  readonly #premieres = new Map<string, Promise<void>>();
  /** The pace of each parent zone, for the first questions of its zones. */
  readonly #parents = new Map<string, Cadence>();
  /** The zones that failed several times in a row, and how: they are not asked again before the next attempt. */
  readonly #mortes = new Map<string, { suite: number; code: Reponse["code"] }>();
  constructor(
    private readonly base: ClientDns,
    private readonly zoneDe: (nom: string) => string,
    parZone: number,
    private readonly frein: OptionsCollecte["frein"] = undefined,
    private readonly parentParSeconde = Number.POSITIVE_INFINITY,
    private readonly horloge: Horloge = HORLOGE_REELLE,
  ) {
    this.id = base.id;
    this.#zones = new ParZone(parZone);
  }

  /** A new attempt: the zones that failed are asked again. */
  oublierZonesMortes(): void {
    this.#mortes.clear();
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
        // The parent of a zone: the zone without its first label (« fr » for mairie.fr, « gouv.fr » for x.gouv.fr).
        const parent = zone.includes(".") ? zone.slice(zone.indexOf(".") + 1) : "";
        let cadence = this.#parents.get(parent);
        if (cadence === undefined) {
          cadence = new Cadence(this.parentParSeconde, this.horloge);
          this.#parents.set(parent, cadence);
        }
        await cadence.attendre();
        return await this.#poser(nom, zone, type, true);
      } finally {
        finie();
      }
    }
    await premiere;
    // A DS question goes to the parents too.
    return this.#poser(nom, zone, type, type === "DS");
  }

  async #poser(nom: string, zone: string, type: TypeRr, ouverture: boolean): Promise<Reponse> {
    const morte = this.#mortes.get(zone);
    if (morte !== undefined && morte.suite >= ZONE_MORTE)
      return { code: morte.code, ad: false, reponses: [], duree: 0 };
    if (this.frein) await this.frein(nom, zone, ouverture);
    await this.#zones.prendre(zone);
    try {
      // The load may have changed while the question waited for its turn in the zone.
      if (this.frein) await this.frein(nom, zone, ouverture);
      const r = await this.base.demander(nom, type);
      // Three failures in a row and no answer: the zone is down for this attempt; its other names fail at once and
      // are asked again at the next attempt (its servers are not asked in vain, and no worker waits behind it).
      if (CODES_EN_ECHEC.has(r.code)) {
        this.#mortes.set(zone, { suite: (this.#mortes.get(zone)?.suite ?? 0) + 1, code: r.code });
      } else {
        this.#mortes.delete(zone);
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
  return {
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

  // A domain opens at the domains' pace (its first questions go to its parents). Its measurement then runs on its own
  // (hosts, SPF, slow servers can take seconds): its names go as soon as it has opened, never held behind it.
  const ouverts = new Map<string, Promise<void>>();
  const mesuresDomaines: Promise<void>[] = [];
  const ouvrir = (domaine: string): Promise<void> => {
    const deja = ouverts.get(domaine);
    if (deja) return deja;
    const ouverture = cadenceDomaines.attendre().then(async () => {
      await options.frein?.(domaine, options.zoneDe(domaine), true);
    });
    ouverts.set(domaine, ouverture);
    mesuresDomaines.push(ouverture.then(() => mesurerDomaine(domaine)));
    return ouverture;
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
          options.suivi?.(`${faites} / ${taches.length} (${parSeconde.toFixed(1)} par seconde)`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(options.enVol, file.length) }, ouvrier));
  };

  // First pass: every name, in random order; each one opens its domain first; then the domains' measurements end.
  const ordre = melanger([...noms.keys()], options.aleatoire);
  await passe(
    ordre.map((nom) => async () => {
      await cadenceNoms.attendre();
      await ouvrir(noms.get(nom) ?? nom);
      await mesurerUnNom(nom);
    }),
  );
  await Promise.all(mesuresDomaines);
  options.apresPremierePasse?.(resultat);

  // Two more attempts, 10 minutes apart, for what failed (names, domains, hosts).
  for (let reprise = 1; reprise <= options.reprises; reprise += 1) {
    const nomsEchoues = [...resultat.noms.values()].filter(enEchec).map((m) => m.nom);
    const domainesEchoues = [...resultat.domaines.values()].filter(domaineEnEchec).map((z) => z.domaine);
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
