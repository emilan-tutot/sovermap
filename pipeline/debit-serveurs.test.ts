// Tests of the count of upstream questions per server, on made-up log lines (documentation addresses, RFC 5737).
import { describe, expect, it } from "vitest";
import { CompteurServeurs } from "./debit-serveurs";

const ligne = (seconde: string, adresse: string) =>
  `2026-11-21T03:17:${seconde}.123456789Z [resolv] [12345.01] => id: '12345' querying: 'ns1.exemple.'@'${adresse}' zone cut: 'exemple.' qname: 'www.exemple.' qtype: 'A' proto: 'udp'`;

describe("the pace towards each authoritative server", () => {
  it("keeps the highest count of questions to one address within one second", () => {
    const c = new CompteurServeurs();
    for (const l of [
      ligne("05", "192.0.2.53"),
      ligne("05", "192.0.2.53"),
      ligne("05", "198.51.100.53"),
      ligne("06", "192.0.2.53"),
      ligne("06", "198.51.100.53"),
      ligne("06", "198.51.100.53"),
      ligne("06", "198.51.100.53"),
      "2026-11-21T03:17:06.5Z [iterat] <= answer received",
      "une ligne sans horodatage querying: 'x.'@'203.0.113.1'",
    ]) {
      c.lire(l);
    }
    expect(c.resultat()).toEqual({
      questions: 7,
      depassements: 0,
      max: 3,
      adresse: "198.51.100.53",
      seconde: "2026-11-21T03:17:06",
    });
  });

  it("tells the load of the current second, notes every second above 10, and stays quiet when the logs lag", () => {
    const c = new CompteurServeurs();
    for (let i = 0; i < 12; i += 1) c.lire(ligne("07", "192.0.2.53"));
    expect(c.charge(Date.parse("2026-11-21T03:17:07.500Z"))).toBe(12);
    expect(c.charge(Date.parse("2026-11-21T03:17:20.000Z"))).toBe(0);
    c.lire(ligne("08", "192.0.2.53"));
    expect(c.charge(Date.parse("2026-11-21T03:17:08.200Z"))).toBe(1);
    expect(c.resultat()).toMatchObject({ depassements: 1, max: 12 });
  });
});
