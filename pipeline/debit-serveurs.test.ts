// Tests of the count of upstream questions per server, on made-up log lines (documentation addresses, RFC 5737).
import { describe, expect, it } from "vitest";
import { CompteurServeurs } from "./debit-serveurs";

const ligne = (seconde: string, adresse: string, coupe = "exemple.", qname = "www.exemple.", qtype = "A") =>
  `2026-11-21T03:17:${seconde}.123456789Z [resolv] [12345.01] => id: '12345' querying: 'ns1.exemple.'@'${adresse}' zone cut: '${coupe}' qname: '${qname}' qtype: '${qtype}' proto: 'udp'`;

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
      secondes: 2,
      secondesAuDela: 0,
      auDela: [],
      max: 3,
      adresse: "198.51.100.53",
      seconde: "2026-11-21T03:17:06",
      tldsMax: ["exemple"],
      coupesChaudes: [],
      adressesChargees: [
        { adresse: "198.51.100.53", questions: 4, parType: { A: 4 }, tlds: ["exemple"] },
        { adresse: "192.0.2.53", questions: 3, parType: { A: 3 }, tlds: ["exemple"] },
      ],
    });
  });

  it("tells the load of the current second, notes every second above 10, and stays quiet when the logs lag", () => {
    const c = new CompteurServeurs();
    for (let i = 0; i < 12; i += 1) c.lire(ligne("07", "192.0.2.53"));
    expect(c.charge(Date.parse("2026-11-21T03:17:07.500Z"))).toBe(12);
    expect(c.charge(Date.parse("2026-11-21T03:17:20.000Z"))).toBe(0);
    c.lire(ligne("08", "192.0.2.53"));
    expect(c.charge(Date.parse("2026-11-21T03:17:08.200Z"))).toBe(1);
    // One second above 10 out of two; the server is told by its top-level zone, its worst second by what it served.
    expect(c.resultat()).toMatchObject({
      depassements: 1,
      max: 12,
      secondes: 2,
      secondesAuDela: 1,
      auDela: [{ tlds: ["exemple"], secondes: 1, max: 12, coupes: 1, zones: 1, parType: { A: 12 } }],
    });
  });

  it("counts a second once when two servers are above 10 in it, and the seconds from the first question to the last", () => {
    const c = new CompteurServeurs((nom) => nom.split(".").slice(-2).join("."));
    for (let i = 0; i < 11; i += 1) c.lire(ligne("10", "192.0.2.53", "a.exemple.", `n${i}.a.exemple.`, "NS"));
    for (let i = 0; i < 11; i += 1) c.lire(ligne("10", "198.51.100.53", `z${i}.exemple.`, `www.z${i}.exemple.`));
    c.lire(ligne("19", "192.0.2.53"));
    const r = c.resultat();
    expect(r).toMatchObject({ depassements: 2, secondesAuDela: 1, secondes: 10 });
    // The shared server: eleven zone cuts and eleven registered zones in its worst second.
    expect(r.auDela).toContainEqual({ tlds: [], secondes: 1, max: 11, coupes: 11, zones: 11, parType: { A: 11 } });
  });

  it("holds back only the questions that would go to a busy server, and every question near the limit", () => {
    const t = Date.parse("2026-11-21T03:17:05.500Z");
    const zone = new CompteurServeurs();
    for (let i = 0; i < 8; i += 1) zone.lire(ligne("05", "192.0.2.53", "mairie.example."));
    // The busy server serves mairie.example: its questions wait, the others go.
    expect(zone.freine("www.mairie.example", "mairie.example", false, t)).toBe(true);
    expect(zone.freine("www.autre.example", "autre.example", false, t)).toBe(false);
    const parent = new CompteurServeurs();
    for (let i = 0; i < 8; i += 1) parent.lire(ligne("05", "198.51.100.53", "example."));
    // A busy top-level server: an open domain's questions go (its delegation is known); a new domain waits.
    expect(parent.freine("www.autre.example", "autre.example", false, t)).toBe(false);
    expect(parent.freine("nouveau.example", "nouveau.example", true, t)).toBe(true);
    // Never on a stale log; and every question waits at 9 questions to one server.
    expect(parent.freine("nouveau.example", "nouveau.example", true, t + 5_000)).toBe(false);
    parent.lire(ligne("05", "198.51.100.53", "example."));
    expect(parent.freine("www.autre.example", "autre.example", false, t)).toBe(true);
    // A shared server busy now holds back the zones it served in the last minute, even when not asked this second.
    const partage = new CompteurServeurs();
    partage.lire(ligne("01", "203.0.113.53", "autre.example.", "www.autre.example."));
    for (let i = 0; i < 8; i += 1) partage.lire(ligne("05", "203.0.113.53", "mairie.example.", "www.mairie.example."));
    expect(partage.freine("mail.autre.example", "autre.example", false, t)).toBe(true);
    expect(partage.freine("www.tierce.example", "tierce.example", false, t)).toBe(false);
    // A busy top-level server asked for delegations (NS) and DS only: the zones' own questions go, openings wait.
    const delegations = new CompteurServeurs((n) => n.split(".").slice(-2).join("."));
    for (let i = 0; i < 4; i += 1) {
      delegations.lire(ligne("05", "192.0.2.1", "example.", `zone${i}.example.`, "NS"));
      delegations.lire(ligne("05", "192.0.2.1", "example.", `zone${i}.example.`, "DS"));
    }
    expect(delegations.freine("www.zone0.example", "zone0.example", false, t)).toBe(false);
    expect(delegations.freine("zone0.example", "zone0.example", true, t)).toBe(true);
    // The summary names the zones whose servers were busy.
    parent.lire(ligne("06", "198.51.100.53", "example."));
    expect(parent.resultat().coupesChaudes).toEqual([{ coupe: "example", secondes: 1 }]);
  });
});
