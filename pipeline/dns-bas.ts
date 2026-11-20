// A low-level DNS client (plan § 9, brief B.2): it reads what Node's resolver hides — the owner name of every record,
// the AD flag (answer validated by DNSSEC), the response code, the TTL — over UDP, and over TCP when the answer is
// truncated. Wire format by dns-packet (MIT). Personal fields are dropped as soon as they are read (methode § 7):
// the RNAME of a SOA, the CAA properties other than « issue » and « issuewild », every TXT record but SPF.
import dgram from "node:dgram";
import { randomInt } from "node:crypto";
import net from "node:net";
import * as dnsPacket from "dns-packet";

export type TypeRr = "A" | "AAAA" | "CNAME" | "NS" | "SOA" | "DS" | "CAA" | "MX" | "TXT";
export type Code = "NOERROR" | "NXDOMAIN" | "SERVFAIL" | "REFUSED" | "TIMEOUT" | "ERREUR";

export type Donnee =
  | { type: "A"; adresse: string }
  | { type: "AAAA"; adresse: string }
  | { type: "CNAME"; cible: string }
  | { type: "NS"; cible: string }
  | { type: "SOA"; mname: string; serial: number }
  | { type: "DS"; keyTag: number; algorithme: number; typeEmpreinte: number }
  | { type: "CAA"; propriete: "issue" | "issuewild"; valeur: string }
  | { type: "MX"; preference: number; hote: string }
  | { type: "TXT"; spf: string };

export type Enregistrement = { proprietaire: string; ttl: number; donnee: Donnee };

export type Reponse = {
  code: Code;
  /** The resolver validated the answer (DNSSEC). */
  ad: boolean;
  reponses: Enregistrement[];
  /** Milliseconds between the question and the answer. */
  duree: number;
};

export interface ClientDns {
  /** Names the resolver in every observation (« knot-local », « quad9 »…). */
  readonly id: string;
  demander(nom: string, type: TypeRr): Promise<Reponse>;
  fermer(): void;
}

export const normaliserNom = (nom: string) => nom.trim().toLowerCase().replace(/\.$/, "");

const CODES = new Set<Code>(["NOERROR", "NXDOMAIN", "SERVFAIL", "REFUSED"]);

/** One decoded answer record → our record, or null when we do not keep it (unwanted type or personal field). */
export function lireEnregistrement(rr: dnsPacket.Answer): Enregistrement | null {
  const proprietaire = normaliserNom(rr.name);
  const ttl = "ttl" in rr && typeof rr.ttl === "number" ? rr.ttl : 0;
  switch (rr.type) {
    case "A":
    case "AAAA":
      return typeof rr.data === "string" ? { proprietaire, ttl, donnee: { type: rr.type, adresse: rr.data } } : null;
    case "CNAME":
    case "NS":
      return typeof rr.data === "string"
        ? { proprietaire, ttl, donnee: { type: rr.type, cible: normaliserNom(rr.data) } }
        : null;
    case "SOA":
      // The RNAME (often an administrator's e-mail address) is never kept.
      return {
        proprietaire,
        ttl,
        donnee: { type: "SOA", mname: normaliserNom(rr.data.mname), serial: rr.data.serial ?? 0 },
      };
    case "DS":
      return {
        proprietaire,
        ttl,
        donnee: {
          type: "DS",
          keyTag: rr.data.keyTag,
          algorithme: rr.data.algorithm,
          typeEmpreinte: rr.data.digestType,
        },
      };
    case "CAA": {
      // « iodef », « contactemail » and « contactphone » may hold contacts: only the issuers are kept.
      const tag = rr.data.tag.toLowerCase();
      return tag === "issue" || tag === "issuewild"
        ? { proprietaire, ttl, donnee: { type: "CAA", propriete: tag, valeur: rr.data.value.slice(0, 255) } }
        : null;
    }
    case "MX":
      return {
        proprietaire,
        ttl,
        donnee: { type: "MX", preference: rr.data.preference ?? 0, hote: normaliserNom(rr.data.exchange) },
      };
    case "TXT": {
      // Only the SPF record is kept; any other TXT record may hold anything, contacts included.
      const morceaux = Array.isArray(rr.data) ? rr.data : [rr.data];
      const texte = morceaux.map((m) => (typeof m === "string" ? m : m.toString("latin1"))).join("");
      return /^v=spf1(\s|$)/i.test(texte)
        ? { proprietaire, ttl, donnee: { type: "TXT", spf: texte.slice(0, 2048) } }
        : null;
    }
    default:
      return null;
  }
}

/**
 * Decodes a whole answer (the record types we keep), checking that it answers the question asked; « tronquee » says
 * the answer did not fit in UDP and must be asked again over TCP.
 */
export function lireReponse(
  message: Buffer,
  id: number,
  nom: string,
  type: TypeRr,
  duree: number,
): { reponse: Reponse; tronquee: boolean } | null {
  let paquet: dnsPacket.Packet;
  try {
    paquet = dnsPacket.decode(message);
  } catch {
    return null;
  }
  if (paquet.id !== id) return null;
  const question = paquet.questions?.[0];
  if (question === undefined || normaliserNom(question.name) !== nom || question.type !== type) return null;
  const rcode = (paquet as { rcode?: string }).rcode ?? "NOERROR";
  const code: Code = CODES.has(rcode as Code) ? (rcode as Code) : "ERREUR";
  const reponses = (paquet.answers ?? []).flatMap((rr) => {
    const e = lireEnregistrement(rr);
    return e === null ? [] : [e];
  });
  const drapeaux = paquet as { flag_ad?: boolean; flag_tc?: boolean };
  return { reponse: { code, ad: drapeaux.flag_ad === true, reponses, duree }, tronquee: drapeaux.flag_tc === true };
}

const DRAPEAUX = dnsPacket.RECURSION_DESIRED | dnsPacket.AUTHENTIC_DATA;

function question(id: number, nom: string, type: TypeRr): Buffer {
  return dnsPacket.encode({
    type: "query",
    id,
    flags: DRAPEAUX,
    questions: [{ type, name: nom, class: "IN" }],
    additionals: [
      { type: "OPT", name: ".", udpPayloadSize: 1232, flags: 0, options: [] } as unknown as dnsPacket.Answer,
    ],
  });
}

/**
 * A client of one resolver over UDP, falling back to TCP for a truncated answer. One socket, connected to the resolver
 * (the system drops any datagram from another address or port, and the source is checked again), many questions in
 * flight, each with its own random id; an answer must also echo the question asked; a question without answer within
 * `delaiMs` is a TIMEOUT.
 */
export class ClientUdp implements ClientDns {
  readonly id: string;
  readonly #hote: string;
  readonly #port: number;
  readonly #delaiMs: number;
  readonly #socket: dgram.Socket;
  readonly #connecte: Promise<void>;
  readonly #attente = new Map<number, (message: Buffer) => void>();

  constructor(id: string, hote: string, port = 53, delaiMs = 5000) {
    this.id = id;
    this.#hote = hote;
    this.#port = port;
    this.#delaiMs = delaiMs;
    this.#socket = dgram.createSocket(net.isIPv6(hote) ? "udp6" : "udp4");
    this.#socket.on("message", (message: Buffer, source: dgram.RemoteInfo) => {
      // Only the resolver may answer: a datagram from any other address or port is dropped.
      if (source.address !== this.#hote || source.port !== this.#port || message.length < 2) return;
      const recue = message.readUInt16BE(0);
      this.#attente.get(recue)?.(message);
    });
    this.#connecte = new Promise((resolve, reject) => {
      this.#socket.connect(port, hote, (erreur?: Error) => (erreur ? reject(erreur) : resolve()));
    });
    this.#socket.unref();
  }

  #nouvelId(): number {
    for (;;) {
      const id = randomInt(0, 65536);
      if (!this.#attente.has(id)) return id;
    }
  }

  async demander(nomBrut: string, type: TypeRr): Promise<Reponse> {
    const nom = normaliserNom(nomBrut);
    const id = this.#nouvelId();
    const depart = performance.now();
    await this.#connecte;
    const message = await new Promise<Buffer | null>((resolve) => {
      const minuterie = setTimeout(() => {
        this.#attente.delete(id);
        resolve(null);
      }, this.#delaiMs);
      this.#attente.set(id, (m) => {
        clearTimeout(minuterie);
        this.#attente.delete(id);
        resolve(m);
      });
      this.#socket.send(question(id, nom, type));
    });
    const duree = Math.round(performance.now() - depart);
    if (message === null) return { code: "TIMEOUT", ad: false, reponses: [], duree };
    const lue = lireReponse(message, id, nom, type, duree);
    if (lue === null) return { code: "ERREUR", ad: false, reponses: [], duree };
    return lue.tronquee ? this.#parTcp(nom, type, depart) : lue.reponse;
  }

  /** The same question over TCP (RFC 7766): two bytes of length, then the message. */
  async #parTcp(nom: string, type: TypeRr, depart: number): Promise<Reponse> {
    const id = this.#nouvelId();
    const message = await new Promise<Buffer | null>((resolve) => {
      const morceaux: Buffer[] = [];
      const socket = net.connect({ host: this.#hote, port: this.#port });
      const fin = (m: Buffer | null) => {
        socket.destroy();
        resolve(m);
      };
      socket.setTimeout(this.#delaiMs, () => fin(null));
      socket.on("error", () => fin(null));
      socket.on("connect", () => {
        const q = question(id, nom, type);
        const longueur = Buffer.alloc(2);
        longueur.writeUInt16BE(q.length, 0);
        socket.write(Buffer.concat([longueur, q]));
      });
      socket.on("data", (d: Buffer) => {
        morceaux.push(d);
        const tout = Buffer.concat(morceaux);
        if (tout.length >= 2 && tout.length >= 2 + tout.readUInt16BE(0))
          fin(tout.subarray(2, 2 + tout.readUInt16BE(0)));
      });
    });
    const duree = Math.round(performance.now() - depart);
    if (message === null) return { code: "TIMEOUT", ad: false, reponses: [], duree };
    return lireReponse(message, id, nom, type, duree)?.reponse ?? { code: "ERREUR", ad: false, reponses: [], duree };
  }

  fermer(): void {
    this.#socket.close();
  }
}
