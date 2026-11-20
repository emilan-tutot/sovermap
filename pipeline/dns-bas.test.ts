// Tests of the low-level DNS client: answers built with dns-packet itself, documentation names and addresses only
// (RFC 2606, RFC 5737, RFC 3849). No network.
import dgram from "node:dgram";
import * as dnsPacket from "dns-packet";
import { describe, expect, it } from "vitest";
import { ClientUdp, lireReponse } from "./dns-bas";

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

  it("drops an answer from any address or port but the resolver's", async () => {
    const resolveur = dgram.createSocket("udp4");
    const usurpateur = dgram.createSocket("udp4");
    await new Promise<void>((ok) => resolveur.bind(0, "127.0.0.1", () => ok()));
    await new Promise<void>((ok) => usurpateur.bind(0, "127.0.0.1", () => ok()));
    const reponseA = (id: number, adresse: string) =>
      dnsPacket.encode({
        type: "response",
        id,
        flags: 0,
        questions: [{ type: "A", name: "a.example", class: "IN" }],
        answers: [{ type: "A", name: "a.example", ttl: 1, data: adresse }],
      });
    resolveur.on("message", (question, client) => {
      const id = dnsPacket.decode(question).id ?? 0;
      // Another port answers first, with the right id and question; the resolver answers 50 ms later.
      usurpateur.send(reponseA(id, "203.0.113.66"), client.port, client.address);
      setTimeout(() => resolveur.send(reponseA(id, "192.0.2.1"), client.port, client.address), 50);
    });
    const client = new ClientUdp("essai", "127.0.0.1", resolveur.address().port, 2000);
    try {
      const r = await client.demander("a.example", "A");
      expect(r.reponses.map((e) => e.donnee)).toEqual([{ type: "A", adresse: "192.0.2.1" }]);
    } finally {
      client.fermer();
      resolveur.close();
      usurpateur.close();
    }
  });

  it("tells a truncated answer, to be asked again over TCP", () => {
    const tronquee = Buffer.from(reponse(4, "a.example", "TXT", [], dnsPacket.TRUNCATED_RESPONSE));
    expect(lireReponse(tronquee, 4, "a.example", "TXT", 1)?.tronquee).toBe(true);
  });

  it("refuses an answer to another question or with another id", () => {
    const message = Buffer.from(reponse(9, "a.example", "A", []));
    expect(lireReponse(message, 8, "a.example", "A", 1)).toBeNull();
    expect(lireReponse(message, 9, "b.example", "A", 1)).toBeNull();
    expect(lireReponse(message, 9, "a.example", "AAAA", 1)).toBeNull();
  });
});
