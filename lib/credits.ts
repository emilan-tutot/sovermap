// Written by scripts/credits.ts, never by hand: the free software of the Crédits page (the dependencies of
// package.json, and the resolver the collection runs). tests/credits.test.ts fails when it no longer matches.
import type { Logiciel } from "@/scripts/lib/credits";

export const LOGICIELS: readonly Logiciel[] = [
  { nom: "dns-packet", version: "5.6.1", licence: "MIT" },
  { nom: "next", version: "16.4.6", licence: "MIT" },
  { nom: "react", version: "19.3.1", licence: "MIT" },
  { nom: "react-dom", version: "19.3.1", licence: "MIT" },
  { nom: "server-only", version: "0.0.1", licence: "MIT" },
  { nom: "three", version: "0.187.0", licence: "MIT" },
  { nom: "Knot Resolver (CZ.NIC)", version: "6.5.1-20261117", licence: "GPL" },
];
