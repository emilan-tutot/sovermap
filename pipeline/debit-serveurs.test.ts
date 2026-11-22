// Tests of the count of upstream questions per server, on made-up log lines (documentation addresses, RFC 5737).
import { describe, expect, it } from "vitest";
import { CompteurServeurs } from "./debit-serveurs";

const ligne = (
  seconde: string,
  adresse: string,
  coupe = "exemple.",
  qname = "www.exemple.",
  qtype = "A",
  serveur = "ns1.exemple.",
) =>
  `2026-11-21T03:17:${seconde}.123456789Z [resolv] [12345.01] => id: '12345' querying: '${serveur}'@'${adresse}' zone cut: '${coupe}' qname: '${qname}' qtype: '${qtype}' proto: 'udp'`;

describe("the pace towards each authoritative server", () => {
  it("names a server by the public suffixes it answers for, those of several labels included", () => {
    const c = new CompteurServeurs(
      (nom) => nom.split(".").slice(-2).join("."),
      (zone) => zone === "gouv.exemple",
    );
    for (const l of [
      ligne("05", "192.0.2.53", "gouv.exemple.", "www.site.gouv.exemple.", "DS"),
      ligne("05", "192.0.2.53", "exemple.", "gouv.exemple.", "NS"),
      ligne("05", "192.0.2.53", "site.exemple.", "www.site.exemple.", "A"),
    ]) {
      c.lire(l);
    }
    // gouv.exemple is a public suffix, exemple a top-level domain; site.exemple is neither, and is never named.
    expect(c.resultat().adressesChargees[0]?.tlds).toEqual(["exemple", "gouv.exemple"]);
  });

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
      amplifications: [],
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

  it("counts a second once when two servers are above 10 in it, and only the seconds with questions", () => {
    const c = new CompteurServeurs((nom) => nom.split(".").slice(-2).join("."));
    for (let i = 0; i < 11; i += 1) c.lire(ligne("10", "192.0.2.53", "a.exemple.", `n${i}.a.exemple.`, "NS"));
    for (let i = 0; i < 11; i += 1) c.lire(ligne("10", "198.51.100.53", `z${i}.exemple.`, `www.z${i}.exemple.`));
    c.lire(ligne("19", "192.0.2.53"));
    const r = c.resultat();
    // Two seconds with questions (10 and 19): the waits between them are not seconds of the measurement.
    expect(r).toMatchObject({ depassements: 2, secondesAuDela: 1, secondes: 2 });
    // The shared server: eleven zone cuts, eleven registered zones and eleven names in its worst second.
    expect(r.auDela).toContainEqual({
      tlds: [],
      secondes: 1,
      max: 11,
      coupes: 11,
      zones: 11,
      noms: 11,
      auParent: 0,
      zonesVues: ["z0.exemple", "z1.exemple", "z10.exemple", "z2.exemple", "z3.exemple"],
      parType: { A: 11 },
    });
  });

  it("starts a second's counts again at each second, and keeps the units of the list before the cut", () => {
    const zoneDe = (nom: string) =>
      nom
        .split(".")
        .slice(nom.endsWith("gouv.exemple") ? -3 : -2)
        .join(".");
    const unites = new Set(["site.gouv.exemple", "mairie.exemple"]);
    const c = new CompteurServeurs(
      zoneDe,
      (zone) => zone === "gouv.exemple",
      (zone) => unites.has(zone),
    );
    // A shared server: eleven third parties' zones, then a unit of the list, last in alphabetical order.
    for (let i = 0; i < 11; i += 1) c.lire(ligne("40", "198.51.100.53", `a${i}.exemple.`, `www.a${i}.exemple.`));
    c.lire(ligne("40", "198.51.100.53", "mairie.exemple.", "www.mairie.exemple."));
    // A server of gouv.exemple: twelve new zones' DS in one second, then its worst, one zone's DS thirteen times.
    for (let i = 0; i < 12; i += 1) c.lire(ligne("40", "192.0.2.53", "gouv.exemple.", `b${i}.gouv.exemple.`, "DS"));
    for (let i = 0; i < 13; i += 1) c.lire(ligne("41", "192.0.2.53", "gouv.exemple.", "site.gouv.exemple.", "DS"));
    const r = c.resultat();
    expect(r.auDela).toContainEqual(
      expect.objectContaining({ max: 12, zones: 12, noms: 12, zonesVues: ["mairie.exemple"] }),
    );
    expect(r.auDela).toContainEqual(
      expect.objectContaining({
        secondes: 2,
        max: 13,
        zones: 1,
        noms: 1,
        auParent: 13,
        zonesVues: ["site.gouv.exemple"],
      }),
    );
  });

  it("tells a zone's DS asked again and again at its parent from a burst of its sub-zones", () => {
    const zoneDe = (nom: string) =>
      nom
        .split(".")
        .slice(nom.endsWith("gouv.exemple") ? -3 : -2)
        .join(".");
    const c = new CompteurServeurs(zoneDe, (zone) => zone === "gouv.exemple");
    // One zone's DS, twelve times in one second, at a server of its parent gouv.exemple.
    for (let i = 0; i < 12; i += 1) c.lire(ligne("30", "192.0.2.53", "gouv.exemple.", "site.gouv.exemple.", "DS"));
    // Eleven sub-zones of one zone, each with its DS at that zone's server.
    for (let i = 0; i < 11; i += 1) c.lire(ligne("30", "198.51.100.53", "site.exemple.", `s${i}.site.exemple.`, "DS"));
    const r = c.resultat();
    expect(r.auDela).toContainEqual(
      expect.objectContaining({
        max: 12,
        coupes: 1,
        zones: 1,
        noms: 1,
        auParent: 12,
        zonesVues: ["site.gouv.exemple"],
      }),
    );
    expect(r.auDela).toContainEqual(
      expect.objectContaining({ max: 11, coupes: 1, zones: 1, noms: 11, auParent: 0, zonesVues: ["site.exemple"] }),
    );
  });

  it("tells the addresses of a name server, and what our questions to a zone cost its servers", () => {
    const c = new CompteurServeurs((nom) => nom.split(".").slice(-2).join("."));
    // Our 20 questions to a.exemple, and the resolver's 50 to its servers and a sub-zone's (its referrals).
    const t = Date.parse("2026-11-21T03:17:10.200Z");
    for (let i = 0; i < 20; i += 1) c.noterEnvoi("a.exemple", t);
    for (let i = 0; i < 50; i += 1) {
      c.lire(ligne("10", "192.0.2.53", i % 2 === 0 ? "a.exemple." : "sous.a.exemple.", `n${i}.sous.a.exemple.`));
    }
    // A question to its parent (the delegation) is not one to the zone's servers.
    c.lire(ligne("10", "198.51.100.1", "exemple.", "a.exemple.", "NS", "a.nic.exemple."));
    expect(c.adresses("NS1.exemple.")).toEqual(["192.0.2.53"]);
    expect(c.adresses("a.nic.exemple")).toEqual(["198.51.100.1"]);
    // The addresses asked about a cut: the zone's, its sub-zone's, its parent's, apart.
    expect(c.adressesDeCoupe("a.exemple.")).toEqual(["192.0.2.53"]);
    expect(c.adressesDeCoupe("exemple")).toEqual(["198.51.100.1"]);
    expect(c.cout("a.exemple", Date.parse("2026-11-21T03:17:13.000Z"))).toBe(2.5);
    // Too few questions of ours tell nothing yet; a minute later, it is forgotten.
    expect(c.cout("b.exemple", t)).toBe(1);
    expect(c.cout("a.exemple", Date.parse("2026-11-21T03:19:00.000Z"))).toBe(1);
    expect(c.resultat().amplifications).toEqual([{ zone: "a.exemple", envois: 20, amont: 50, parType: { A: 50 } }]);
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
