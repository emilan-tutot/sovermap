// DNS observation of one name (docs/methode.md § 4, couches 2 et 3). v0: the client is Node's resolver pointed at a
// public resolver; the collection of T2 uses a local validating resolver (plan § 9).
import { Resolver } from "node:dns/promises";
import { domaineEnregistre, normaliser } from "./noms";
import type { DnsAnswer, DnsClient, DnsStatus, RecordType } from "./types";

const STATUTS: Record<string, DnsStatus> = {
  ENOTFOUND: "NXDOMAIN",
  ENODATA: "NODATA",
  ESERVFAIL: "SERVFAIL",
  ETIMEOUT: "TIMEOUT",
  ECONNREFUSED: "ERROR",
  EREFUSED: "ERROR",
};

export class NodeDnsClient implements DnsClient {
  readonly id: string;
  readonly #resolver: Resolver;
  readonly #pauseMs: number;

  constructor(server: string, pauseMs = 150) {
    this.id = server;
    this.#resolver = new Resolver({ timeout: 4000, tries: 2 });
    this.#resolver.setServers([server]);
    this.#pauseMs = pauseMs;
  }

  async query(name: string, type: RecordType): Promise<DnsAnswer> {
    await new Promise((resolve) => setTimeout(resolve, this.#pauseMs));
    try {
      const values =
        type === "A"
          ? await this.#resolver.resolve4(name)
          : type === "AAAA"
            ? await this.#resolver.resolve6(name)
            : type === "CNAME"
              ? await this.#resolver.resolveCname(name)
              : await this.#resolver.resolveNs(name);
      return { status: "NOERROR", values: values.map((v) => normaliser(v)).sort() };
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      return { status: STATUTS[code] ?? "ERROR", values: [] };
    }
  }
}

export type ObservationDns = {
  nom: string;
  resolveur: string;
  heure: string;
  /** NOERROR when the name has at least one address; otherwise the reason. */
  statut: DnsStatus;
  chaineCname: string[];
  a: string[];
  aaaa: string[];
  zone: string | null;
  ns: string[];
  /** First IPv4 address of each name server. */
  adressesNs: Record<string, string | null>;
};

/** Observes one name: CNAME chain (10 links at most), A, AAAA, the zone and its name servers. */
export async function observer(
  nomBrut: string,
  client: DnsClient,
  maintenant: () => Date = () => new Date(),
): Promise<ObservationDns> {
  const nom = normaliser(nomBrut);
  const heure = maintenant().toISOString();
  const chaineCname: string[] = [];
  let courant = nom;
  for (let i = 0; i < 10; i += 1) {
    const reponse = await client.query(courant, "CNAME");
    const cible = reponse.values[0];
    if (reponse.status !== "NOERROR" || cible === undefined || chaineCname.includes(cible)) break;
    chaineCname.push(cible);
    courant = cible;
  }
  const a = await client.query(nom, "A");
  const aaaa = await client.query(nom, "AAAA");

  // The zone: the first suffix, from the name up to the registrable domain, that is not an alias and has NS records.
  let zone: string | null = null;
  let ns: string[] = [];
  const labels = nom.split(".");
  const plancher = domaineEnregistre(nom).split(".").length;
  for (let i = 0; labels.length - i >= plancher; i += 1) {
    const suffixe = labels.slice(i).join(".");
    if (suffixe !== nom || chaineCname.length === 0) {
      const alias = suffixe === nom ? null : await client.query(suffixe, "CNAME");
      if (alias !== null && alias.status === "NOERROR" && alias.values.length > 0) continue;
      const reponse = await client.query(suffixe, "NS");
      if (reponse.status === "NOERROR" && reponse.values.length > 0) {
        zone = suffixe;
        ns = reponse.values;
        break;
      }
    }
  }
  const adressesNs: Record<string, string | null> = {};
  for (const serveur of ns) {
    const reponse = await client.query(serveur, "A");
    adressesNs[serveur] = reponse.values[0] ?? null;
  }

  const adresses = a.values.length + aaaa.values.length;
  const statut: DnsStatus =
    adresses > 0
      ? "NOERROR"
      : [a.status, aaaa.status].includes("NXDOMAIN")
        ? "NXDOMAIN"
        : ([a.status, aaaa.status].find((s) => s === "SERVFAIL" || s === "TIMEOUT" || s === "ERROR") ?? "NODATA");
  return {
    nom,
    resolveur: client.id,
    heure,
    statut,
    chaineCname,
    a: a.values,
    aaaa: aaaa.values,
    zone,
    ns,
    adressesNs,
  };
}
