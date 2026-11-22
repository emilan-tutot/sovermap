// The free software Sovermap is made of, for the Crédits page (E.1; the owner's answer to point 13, § 7): every
// dependency of package.json (the site's and the collection's), with the version and the licence its own package
// gives, and the resolver the collection runs, whose image .github/workflows/collecte.yml pins. Only reads files.
import { readFileSync } from "node:fs";
import path from "node:path";

export type Logiciel = { nom: string; version: string; licence: string };

/** The resolver's version, from the comment of its pinned image (« RESOLVEUR: …@sha256:… # v6.5.1-20261117 »). */
export function versionDuResolveur(workflow: string): string | null {
  return /^\s*RESOLVEUR: \S+ # v(\S+)\s*$/m.exec(workflow)?.[1] ?? null;
}

/** The free software of the Crédits page, in the order of package.json's dependencies, the resolver last. */
export function logicielsDe(racine = "."): Logiciel[] {
  const lire = (...morceaux: string[]) =>
    JSON.parse(readFileSync(path.join(racine, ...morceaux), "utf8")) as Record<string, unknown>;
  const dependances = Object.keys((lire("package.json")["dependencies"] ?? {}) as Record<string, string>).sort();
  const logiciels = dependances.map((nom): Logiciel => {
    const paquet = lire("node_modules", nom, "package.json");
    return { nom, version: String(paquet["version"] ?? ""), licence: String(paquet["license"] ?? "") };
  });
  const version = versionDuResolveur(readFileSync(path.join(racine, ".github/workflows/collecte.yml"), "utf8"));
  if (version === null) throw new Error("collecte.yml : la version du résolveur est introuvable");
  return [...logiciels, { nom: "Knot Resolver (CZ.NIC)", version, licence: "GPL" }];
}
