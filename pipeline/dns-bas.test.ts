// Tests of the low-level DNS client: answers built with dns-packet itself, documentation names and addresses only
// (RFC 2606, RFC 5737, RFC 3849). No network.
import * as dnsPacket from "dns-packet";
import { describe, expect, it } from "vitest";
import { lireReponse } from "./dns-bas";

const reponse = (id: number, nom: string, type: string, answers: dnsPacket.Answer[], flags = 0, rcode = "NOERROR") =>
  dnsPacket.encode({
    type: "response",
    id,
    flags: flags | (rcode === "NXDOMAIN" ? 3 : 0),
    questions: [{ type: type as dnsPacket.RecordType, name: nom, class: "IN" }],
    answers,
  });

describe("the low-level DNS client", () => {
  it("reads the owner of every record, the CNAME chain and the AD flag", () => {
    const message = reponse(
      7,
      "www.site.example",
      "A",
      [
        { type: "CNAME", name: "www.site.example", ttl: 300, data: "cdn.fournisseur.example" },
        { type: "A", name: "cdn.fournisseur.example", ttl: 60, data: "192.0.2.10" },
      ],
      dnsPacket.AUTHENTIC_DATA,
    );
    const r = lireReponse(Buffer.from(message), 7, "www.site.example", "A", 12)?.reponse;
    expect(r?.code).toBe("NOERROR");
    expect(r?.ad).toBe(true);
    expect(r?.reponses).toEqual([
      { proprietaire: "www.site.example", ttl: 300, donnee: { type: "CNAME", cible: "cdn.fournisseur.example" } },
      { proprietaire: "cdn.fournisseur.example", ttl: 60, donnee: { type: "A", adresse: "192.0.2.10" } },
    ]);
  });

  it("never keeps the RNAME of a SOA, a CAA contact or a TXT record other than SPF", () => {
    const soa = reponse(1, "site.example", "SOA", [
      {
        type: "SOA",
        name: "site.example",
        ttl: 3600,
        data: {
          mname: "ns1.site.example",
          rname: "hostmaster.site.example",
          serial: 2026112001,
          refresh: 1,
          retry: 1,
          expire: 1,
          minimum: 1,
        },
      },
    ]);
    const lu = JSON.stringify(lireReponse(Buffer.from(soa), 1, "site.example", "SOA", 1)?.reponse);
    expect(lu).toContain("ns1.site.example");
    expect(lu).not.toContain("hostmaster");
    const caa = reponse(2, "site.example", "CAA", [
      { type: "CAA", name: "site.example", ttl: 1, data: { flags: 0, tag: "issue", value: "ac.example" } },
      {
        type: "CAA",
        name: "site.example",
        ttl: 1,
        data: { flags: 0, tag: "iodef", value: "mailto:securite@site.example" },
      },
    ]);
    const lusCaa = lireReponse(Buffer.from(caa), 2, "site.example", "CAA", 1)?.reponse?.reponses ?? [];
    expect(lusCaa.map((r) => r.donnee)).toEqual([{ type: "CAA", propriete: "issue", valeur: "ac.example" }]);
    const txt = reponse(3, "site.example", "TXT", [
      { type: "TXT", name: "site.example", ttl: 1, data: ["v=spf1 ip4:192.0.2.0/24 -all"] },
      { type: "TXT", name: "site.example", ttl: 1, data: ["contact: securite@site.example"] },
    ]);
    const lusTxt = lireReponse(Buffer.from(txt), 3, "site.example", "TXT", 1)?.reponse?.reponses ?? [];
    expect(lusTxt.map((r) => r.donnee)).toEqual([{ type: "TXT", spf: "v=spf1 ip4:192.0.2.0/24 -all" }]);
  });

  it("refuses an answer to another question or with another id", () => {
    const message = Buffer.from(reponse(9, "a.example", "A", []));
    expect(lireReponse(message, 8, "a.example", "A", 1)).toBeNull();
    expect(lireReponse(message, 9, "b.example", "A", 1)).toBeNull();
    expect(lireReponse(message, 9, "a.example", "AAAA", 1)).toBeNull();
  });
});
