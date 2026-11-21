// The monthly archive never pairs a record with another day's exact addresses: documentation addresses (RFC 5737,
// RFC 3849) and names (RFC 2606) only.
import { describe, expect, it } from "vitest";
import { adressesExactes, dansLaPlage } from "./archive";
import type { MesureNom } from "./mesure";

const mesure = (a: string[], cname: string[] = []): MesureNom => ({
  nom: "www.mairie.example",
  etat: "ok",
  echec: null,
  cname,
  a: a.map((adresse) => ({ adresse, ttl: 300 })),
  aaaa: [],
  ad: false,
});
const publie = { etat: "ok" as const, cname: [], reseaux: [{ as: 64500, plage: "192.0.2.0-192.0.2.255" }] };

describe("the monthly archive's exact addresses", () => {
  it("gives the day's addresses to a record they match", () => {
    expect(adressesExactes(publie, mesure(["192.0.2.10"]))).toEqual([{ adresse: "192.0.2.10", ttl: 300 }]);
    expect(dansLaPlage("2001:db8::1", "2001:db8::-2001:db8::ffff")).toBe(true);
    expect(dansLaPlage("192.0.2.10", "2001:db8::-2001:db8::ffff")).toBe(false);
  });

  it("gives none to a record held back by the hysteresis: the site moved, the record still shows the day before", () => {
    // Moved to another network: the published record (held back) is still the old one.
    expect(adressesExactes(publie, mesure(["198.51.100.10"]))).toEqual([]);
    // A new CNAME chain, or a state that is not the record's.
    expect(adressesExactes(publie, mesure(["192.0.2.10"], ["site.plateforme.example"]))).toEqual([]);
    expect(adressesExactes({ ...publie, etat: "echec" }, mesure(["192.0.2.10"]))).toEqual([]);
    // No range to check them against, or no measurement of that day.
    expect(adressesExactes({ ...publie, reseaux: [{ as: 64500, plage: null }] }, mesure(["192.0.2.10"]))).toEqual([]);
    expect(adressesExactes(publie, undefined)).toEqual([]);
    // The record shows two networks, today's addresses only one of them: not the same day's networks.
    const deux = { ...publie, reseaux: [...publie.reseaux, { as: 64501, plage: "198.51.100.0-198.51.100.255" }] };
    expect(adressesExactes(deux, mesure(["192.0.2.10"]))).toEqual([]);
    expect(adressesExactes(deux, mesure(["192.0.2.10", "198.51.100.10"]))).toHaveLength(2);
  });
});
