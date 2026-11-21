// The DNS measurement of the collection (brief B.2, docs/methode.md § 4): per name, A and AAAA with the CNAME chain
// (10 links at most); per zone (the registrable domain), NS, SOA without its RNAME, CAA (issue, issuewild), MX and the
// SPF record (DNSSEC: the AD flag of the NS and SOA answers); per host (name servers, mail exchangers), its addresses. A failure stays a failure (SERVFAIL,
// TIMEOUT, REFUSED), never « no site ». The client is the low-level one (dns-bas.ts); the tests use a simulated one.
import type { ClientDns, Code, Enregistrement, Reponse } from "./dns-bas";

export type Etat = "ok" | "nxdomain" | "nodata" | "echec";
export type AdresseTtl = { adresse: string; ttl: number };

export type MesureNom = {
  nom: string;
  etat: Etat;
  /** The failing answer code, when etat is « echec ». */
  echec: Code | null;
  /** The CNAME targets, in order (10 links at most); a loop or a longer chain fails. */
  cname: string[];
  a: AdresseTtl[];
  aaaa: AdresseTtl[];
  /** The answers that came validated by DNSSEC (the resolver's AD flag), failed ones left out. */
  ad: boolean;
  /**
   * A name that works with one family of addresses while the other's question failed: that failure's code (the name
   * stays « ok »; its addresses of that family are unknown, never « none »).
   */
  echecFamille?: { famille: "A" | "AAAA"; code: Code };
};

const ECHECS = new Set<Code>(["SERVFAIL", "TIMEOUT", "REFUSED", "ERREUR", "ZONE_MUETTE", "SOUS_ZONE_MUETTE"]);

/** The chain from the asked name, through the CNAME records of the answer, and the addresses of its end. */
export function lireChaine(
  nom: string,
  reponse: Reponse,
  type: "A" | "AAAA",
): { cname: string[]; adresses: AdresseTtl[]; boucle: boolean } {
  const cname: string[] = [];
  let courant = nom;
  for (let i = 0; i < 11; i += 1) {
    const lien = reponse.reponses.find((r) => r.proprietaire === courant && r.donnee.type === "CNAME");
    if (lien === undefined || lien.donnee.type !== "CNAME") break;
    if (cname.includes(lien.donnee.cible) || cname.length >= 10) return { cname, adresses: [], boucle: true };
    cname.push(lien.donnee.cible);
    courant = lien.donnee.cible;
  }
  const adresses = reponse.reponses
    .filter(
      (r): r is Enregistrement & { donnee: { type: "A" | "AAAA"; adresse: string } } =>
        r.proprietaire === courant && r.donnee.type === type,
    )
    .map((r) => ({ adresse: r.donnee.adresse, ttl: r.ttl }))
    .sort((x, y) => (x.adresse < y.adresse ? -1 : x.adresse > y.adresse ? 1 : 0));
  return { cname, adresses, boucle: false };
}

export async function mesurerNom(nom: string, client: ClientDns): Promise<MesureNom> {
  // A, then AAAA: the resolver follows a CNAME chain once (the second question reads it from its cache), and a
  // failure of the first already weighs on the second (collecte.ts: where a question failed, the next ones weigh more).
  const ra = await client.demander(nom, "A");
  const raaaa = await client.demander(nom, "AAAA");
  const a = lireChaine(nom, ra, "A");
  const aaaa = lireChaine(nom, raaaa, "AAAA");
  const base = {
    nom,
    cname: a.cname.length >= aaaa.cname.length ? a.cname : aaaa.cname,
    a: a.adresses,
    aaaa: aaaa.adresses,
  };
  if (a.boucle || aaaa.boucle) return { ...base, etat: "echec", echec: "ERREUR", a: [], aaaa: [], ad: false };
  const echec = [ra.code, raaaa.code].find((c) => ECHECS.has(c)) ?? null;
  if (base.a.length + base.aaaa.length > 0) {
    // One family answered: the name works. The other family's failure is kept (`echecFamille`, counted and published
    // with the day's quality), and never asked again: it repeats (a broken DNSSEC proof, a server that refuses AAAA),
    // and each new question cost the servers again, up to 18 DNSKEY questions for one at a zone whose proof is broken
    // (the trial of 21/11/2026). Its DNSSEC is read on the answers that came.
    if (echec === null) return { ...base, etat: "ok", echec: null, ad: ra.ad && raaaa.ad };
    // Only a SERVFAIL repeats (a broken proof, a server that refuses that family); another failure (a timeout, a
    // question not sent because its zone was down) is a failure, asked again at the next attempt.
    if (echec !== "SERVFAIL") return { ...base, etat: "echec", echec, a: [], aaaa: [], ad: false };
    const repondue = ECHECS.has(ra.code) ? raaaa : ra;
    return {
      ...base,
      etat: "ok",
      echec: null,
      ad: repondue.ad,
      echecFamille: { famille: ECHECS.has(ra.code) ? "A" : "AAAA", code: echec },
    };
  }
  if (echec !== null) return { ...base, etat: "echec", echec, a: [], aaaa: [], ad: false };
  if (ra.code === "NXDOMAIN" && raaaa.code === "NXDOMAIN")
    return { ...base, etat: "nxdomain", echec: null, ad: ra.ad && raaaa.ad };
  return { ...base, etat: "nodata", echec: null, ad: ra.ad && raaaa.ad };
}

export type MesureZone = {
  domaine: string;
  etat: Etat;
  echec: Code | null;
  /** The zone's own NS records (owner = the domain), sorted. */
  ns: string[];
  /** The SOA's primary name server and serial; the RNAME (a contact) is never read. */
  soa: { mname: string; serial: number } | null;
  /**
   * DNSSEC: the zone's NS and SOA answers are validated by the resolver (AD), which needs the zone's DS at its parent
   * and a sound chain; null when one of them failed.
   */
  ad: boolean | null;
  /** CAA « issue » and « issuewild » only. */
  caa: { propriete: "issue" | "issuewild"; valeur: string }[];
  /** Mail exchangers, by preference; « nul » for the null MX of RFC 7505 (« 0 . »: no mail). */
  mx: { preference: number; hote: string }[];
  mxEtat: "ok" | "aucun" | "nul" | "echec";
  /** The SPF record, the only TXT record ever kept. */
  spf: string | null;
  /** The questions that failed (SOA, CAA, TXT): their answer is unknown, never « none ». */
  echecs: ("SOA" | "CAA" | "TXT")[];
};

const deType = <T extends Enregistrement["donnee"]["type"]>(reponse: Reponse, proprietaire: string, type: T) =>
  reponse.reponses.filter(
    (r): r is Enregistrement & { donnee: Extract<Enregistrement["donnee"], { type: T }> } =>
      r.proprietaire === proprietaire && r.donnee.type === type,
  );

/** One zone: six questions, at most two at a time (the scheduler holds the per-zone limit). */
export async function mesurerZone(domaine: string, client: ClientDns): Promise<MesureZone> {
  const [rns, rsoa] = await Promise.all([client.demander(domaine, "NS"), client.demander(domaine, "SOA")]);
  // A name that does not exist (NXDOMAIN to NS and SOA) has no CAA, MX nor TXT either: they are not asked (each one
  // would go to the parent's servers, which answered already).
  const absent = rns.code === "NXDOMAIN" && rsoa.code === "NXDOMAIN";
  const sansQuestion: Reponse = { code: "NXDOMAIN", ad: false, reponses: [], duree: 0 };
  // No DS question: it would go to the parent (a top-level domain) for every domain, twice its load. The resolver
  // validates the zone's answers (the AD flag) only when the parent holds the zone's DS and the chain holds.
  const [rcaa, rmx, rtxt] = absent
    ? [sansQuestion, sansQuestion, sansQuestion]
    : await Promise.all([
        client.demander(domaine, "CAA"),
        client.demander(domaine, "MX"),
        client.demander(domaine, "TXT"),
      ]);
  const ns = deType(rns, domaine, "NS")
    .map((r) => r.donnee.cible)
    .sort();
  const soaRr = deType(rsoa, domaine, "SOA")[0];
  const mxs = deType(rmx, domaine, "MX")
    .map((r) => ({ preference: r.donnee.preference, hote: r.donnee.hote }))
    .sort((x, y) => x.preference - y.preference || (x.hote < y.hote ? -1 : 1));
  const nul = mxs.length === 1 && (mxs[0]?.hote ?? "x") === "";
  const echec = [rns.code, rsoa.code].find((c) => ECHECS.has(c)) ?? null;
  // Name servers read: the zone answers. Otherwise a failed NS or SOA question is a failure, never « no name servers »
  // (a SOA read without its NS question is not enough to publish an empty list).
  const etat: Etat =
    ns.length > 0
      ? "ok"
      : echec !== null
        ? "echec"
        : soaRr !== undefined
          ? "ok"
          : rns.code === "NXDOMAIN"
            ? "nxdomain"
            : "nodata";
  return {
    domaine,
    etat,
    echec: etat === "echec" ? echec : null,
    ns,
    soa: soaRr === undefined ? null : { mname: soaRr.donnee.mname, serial: soaRr.donnee.serial },
    ad: ECHECS.has(rns.code) || ECHECS.has(rsoa.code) ? null : rns.ad && rsoa.ad,
    caa: deType(rcaa, domaine, "CAA")
      .map((r) => ({ propriete: r.donnee.propriete, valeur: r.donnee.valeur }))
      .sort((x, y) => (x.propriete + x.valeur < y.propriete + y.valeur ? -1 : 1)),
    mx: nul ? [] : mxs,
    mxEtat: ECHECS.has(rmx.code) ? "echec" : nul ? "nul" : mxs.length > 0 ? "ok" : "aucun",
    spf: deType(rtxt, domaine, "TXT")[0]?.donnee.spf ?? null,
    echecs: (
      [
        ["SOA", rsoa],
        ["CAA", rcaa],
        ["TXT", rtxt],
      ] as const
    ).flatMap(([type, r]) => (ECHECS.has(r.code) ? [type] : [])),
  };
}
