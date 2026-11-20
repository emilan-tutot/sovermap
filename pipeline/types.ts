// Shared types of the collection pipeline (v0, chantier T1, partie C). See docs/methode.md.

export type DnsStatus = "NOERROR" | "NXDOMAIN" | "NODATA" | "SERVFAIL" | "TIMEOUT" | "ERROR";
export type RecordType = "A" | "AAAA" | "CNAME" | "NS";

export type DnsAnswer = { status: DnsStatus; values: string[] };

/** A DNS client: the real one asks a resolver; the tests use a simulated one. */
export interface DnsClient {
  /** Identifies the resolver in every observation (for example « 1.1.1.1 »). */
  readonly id: string;
  query(name: string, type: RecordType): Promise<DnsAnswer>;
}

/** Confidence levels of cahier §4.5. */
export type Niveau = "confirmé" | "probable" | "non déterminé";

/** Country categories of cahier §4.4, from the nearest to the farthest. */
export type Categorie = "France" | "UE hors France" | "Europe hors UE" | "hors d'Europe" | "non déterminé";

export const ORDRE_NIVEAU: readonly Niveau[] = ["non déterminé", "probable", "confirmé"];

/** The weakest of several levels (a chain is only as sure as its weakest link). */
export function niveauMin(...niveaux: Niveau[]): Niveau {
  if (niveaux.length === 0) return "non déterminé";
  return niveaux.reduce((a, b) => (ORDRE_NIVEAU.indexOf(a) <= ORDRE_NIVEAU.indexOf(b) ? a : b));
}
