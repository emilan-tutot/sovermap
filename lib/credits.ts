// Written by scripts/credits.ts, never by hand: the free software of the Crédits page (the dependencies of
// package.json, and the resolver the collection runs). tests/credits.test.ts fails when it no longer matches.
import type { Logiciel } from "@/scripts/lib/credits";

export const LOGICIELS: readonly Logiciel[] = [
  { nom: "dns-packet", version: null, licence: "MIT" },
  { nom: "hyparquet", version: null, licence: "MIT" },
  { nom: "next", version: null, licence: "MIT" },
  { nom: "react", version: null, licence: "MIT" },
  { nom: "react-dom", version: null, licence: "MIT" },
  { nom: "server-only", version: null, licence: "MIT" },
  { nom: "three", version: null, licence: "MIT" },
  { nom: "Knot Resolver (CZ.NIC)", version: "6.5.1-20261117", licence: "GPL" },
];
