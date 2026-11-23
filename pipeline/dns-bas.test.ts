// Tests of the low-level DNS client: answers built with dns-packet itself, documentation names and addresses only
// (RFC 2606, RFC 5737, RFC 3849). No network.
import dgram from "node:dgram";
import net from "node:net";
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
    // The RNAME (the zone's contact address, « hostmaster.site.example » for hostmaster@site.example) is never kept.
    expect(lu).not.toContain("hostmaster");
    expect(lu).not.toContain("rname");
    const caa = reponse(2, "site.example", "CAA", [
      { type: "CAA", name: "site.example", ttl: 1, data: { flags: 0, tag: "issue", value: "ac.example" } },
      {
        type: "CAA",
        name: "site.example",
        ttl: 1,
        data: { flags: 0, tag: "iodef", value: "mailto:securite@site.example" },
      },
      {
        type: "CAA",
        name: "site.example",
        ttl: 1,
        data: { flags: 0, tag: "issuewild", value: "AC2.example; accounturi=https://ac2.example/compte/1234" },
      },
      { type: "CAA", name: "site.example", ttl: 1, data: { flags: 0, tag: "issue", value: ";" } },
    ]);
    const lusCaa = lireReponse(Buffer.from(caa), 2, "site.example", "CAA", 1)?.reponse?.reponses ?? [];
    // Only the issuer's name: never a parameter (an account, a contact), never an iodef address.
    expect(lusCaa.map((r) => r.donnee)).toEqual([
      { type: "CAA", propriete: "issue", valeur: "ac.example" },
      { type: "CAA", propriete: "issuewild", valeur: "ac2.example" },
      { type: "CAA", propriete: "issue", valeur: "" },
    ]);
    const txt = reponse(3, "site.example", "TXT", [
      { type: "TXT", name: "site.example", ttl: 1, data: ["v=spf1 ip4:192.0.2.0/24 -all"] },
      { type: "TXT", name: "site.example", ttl: 1, data: ["contact: securite@site.example"] },
    ]);
    const lusTxt = lireReponse(Buffer.from(txt), 3, "site.example", "TXT", 1)?.reponse?.reponses ?? [];
    expect(lusTxt.map((r) => r.donnee)).toEqual([{ type: "TXT", spf: "v=spf1 ip4:192.0.2.0/24 -all" }]);
    // An e-mail address written inside an SPF record is dropped as soon as it is read.
    const contact = ["securite", "site.example"].join("@");
    const spfAvecContact = reponse(5, "site.example", "TXT", [
      { type: "TXT", name: "site.example", ttl: 1, data: [`v=spf1 include:spf.site.example ${contact} -all`] },
    ]);
    const lusSpf = lireReponse(Buffer.from(spfAvecContact), 5, "site.example", "TXT", 1)?.reponse?.reponses ?? [];
    expect(lusSpf.map((r) => r.donnee)).toEqual([{ type: "TXT", spf: "v=spf1 include:spf.site.example -all" }]);
    expect(JSON.stringify(lusSpf)).not.toContain("@");
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

  it("ends a TCP question when the server closes without a whole answer, well before the time limit", async () => {
    // One port for UDP and TCP. Windows keeps some ports for TCP alone (listen: EACCES, 23/11/2026, trap 68): another
    // port is tried, never a test left waiting.
    let udp: dgram.Socket | null = null;
    let tcp: net.Server | null = null;
    for (let essai = 0; essai < 20 && tcp === null; essai += 1) {
      const u = dgram.createSocket("udp4");
      await new Promise<void>((ok) => u.bind(0, "127.0.0.1", () => ok()));
      const t = net.createServer((s) => s.end());
      const ouvert = await new Promise<boolean>((ok) => {
        t.once("error", () => ok(false));
        t.listen(u.address().port, "127.0.0.1", () => ok(true));
      });
      if (ouvert) [udp, tcp] = [u, t];
      else u.close();
    }
    if (udp === null || tcp === null) throw new Error("aucun port libre à la fois en UDP et en TCP");
    const port = udp.address().port;
    // The UDP answer is truncated: the client asks again over TCP, where the server closes at once.
    const serveurUdp = udp;
    serveurUdp.on("message", (q, client) => {
      const id = dnsPacket.decode(q).id ?? 0;
      serveurUdp.send(reponse(id, "a.example", "TXT", [], dnsPacket.TRUNCATED_RESPONSE), client.port, client.address);
    });
    // Three bounds far apart (the client's limit, 30 s; the expected end, under 8 s even on a loaded machine; the test's
    // own limit, 15 s): a client that waited for its limit fails, and a slow machine alone does not.
    const client = new ClientUdp("essai", "127.0.0.1", port, 30_000);
    try {
      const debut = performance.now();
      expect((await client.demander("a.example", "TXT")).code).toBe("TIMEOUT");
      expect(performance.now() - debut).toBeLessThan(8_000);
    } finally {
      client.fermer();
      udp.close();
      tcp.close();
    }
  }, 15_000);

  it("ends a question at once on a datagram that is not a DNS message (ERREUR, not a TIMEOUT)", async () => {
    const resolveur = dgram.createSocket("udp4");
    await new Promise<void>((ok) => resolveur.bind(0, "127.0.0.1", () => ok()));
    resolveur.on("message", (q, client) => {
      // The right id, then bytes that decode to nothing.
      const illisible = Buffer.from([0, 0, 0xff, 0xff, 0xff]);
      illisible.writeUInt16BE(dnsPacket.decode(q).id ?? 0, 0);
      resolveur.send(illisible, client.port, client.address);
    });
    // The same three bounds as above.
    const client = new ClientUdp("essai", "127.0.0.1", resolveur.address().port, 30_000);
    try {
      const debut = performance.now();
      expect((await client.demander("a.example", "A")).code).toBe("ERREUR");
      expect(performance.now() - debut).toBeLessThan(8_000);
    } finally {
      client.fermer();
      resolveur.close();
    }
  }, 15_000);

  it("ignores a late answer to another question that had the same id", async () => {
    const resolveur = dgram.createSocket("udp4");
    await new Promise<void>((ok) => resolveur.bind(0, "127.0.0.1", () => ok()));
    resolveur.on("message", (q, client) => {
      const id = dnsPacket.decode(q).id ?? 0;
      // First an answer to another name with the same id, then the right one.
      resolveur.send(reponse(id, "autre.example", "A", []), client.port, client.address);
      setTimeout(
        () =>
          resolveur.send(
            reponse(id, "a.example", "A", [{ type: "A", name: "a.example", ttl: 1, data: "192.0.2.1" }]),
            client.port,
            client.address,
          ),
        30,
      );
    });
    const client = new ClientUdp("essai", "127.0.0.1", resolveur.address().port, 2_000);
    try {
      const r = await client.demander("a.example", "A");
      expect(r.code).toBe("NOERROR");
      expect(r.reponses.map((e) => e.donnee)).toEqual([{ type: "A", adresse: "192.0.2.1" }]);
    } finally {
      client.fermer();
      resolveur.close();
    }
  });

  it("survives a resolver that does not listen yet: the question ends as a TIMEOUT", async () => {
    const ferme = dgram.createSocket("udp4");
    await new Promise<void>((ok) => ferme.bind(0, "127.0.0.1", () => ok()));
    const port = ferme.address().port;
    await new Promise<void>((ok) => ferme.close(() => ok()));
    const client = new ClientUdp("essai", "127.0.0.1", port, 300);
    try {
      expect((await client.demander("a.example", "A")).code).toBe("TIMEOUT");
    } finally {
      client.fermer();
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
