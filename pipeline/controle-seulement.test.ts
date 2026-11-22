// Brief F.3: nothing published comes from a source kept « en contrôle seulement » in the registry (docs/sources.md: it
// checks, never classifies alone, and is never republished). Beside the canary of couches.test.ts (no value of RIS in
// the network layer), three proofs:
// - of the files the collection downloads, RIS's two tables are the only ones kept for control;
// - a control resolver (Quad9, Cloudflare 1.1.1.1) leaves in a published name its own name and whether it agreed,
//   nothing else: the published schema refuses any other value there, an address or an AS above all;
// - the collection never asks RIPEstat, an RDAP server or Team Cymru: none of their addresses is in its code.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NOM, valider } from "./schemas";
import { SOURCES } from "./telechargements";

const RACINE = process.cwd();

/** The registry's decision for each fiche, from the summary table of docs/sources.md (its first table). */
function decisions(): Map<number, string> {
  const lignes = readFileSync(path.join(RACINE, "docs/sources.md"), "utf8").split("\n");
  const debut = lignes.findIndex((l) => l.startsWith("| # | Source |"));
  const d = new Map<number, string>();
  if (debut === -1) return d;
  for (const ligne of lignes.slice(debut + 2)) {
    if (!ligne.startsWith("|")) break;
    const cellules = ligne.split("|").map((c) => c.trim());
    d.set(Number(cellules[1]), (cellules.at(-2) ?? "").replace(/\*/g, ""));
  }
  return d;
}

/** Every file under a folder. */
const lister = (dossier: string): string[] =>
  readdirSync(dossier, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile())
    .map((e) => path.join(e.parentPath, e.name));

describe("nothing republished from a source kept for control only (F.3)", () => {
  it("downloads, of the sources kept for control only, RIS's two tables and nothing else", () => {
    const d = decisions();
    expect(d.size).toBeGreaterThan(40);
    for (const s of SOURCES) expect(d.get(s.fiche), `fiche ${s.fiche} (${s.id})`).toBeDefined();
    const controle = SOURCES.filter((s) => /contrôle seulement/i.test(d.get(s.fiche) ?? "")).map((s) => s.id);
    expect(controle).toEqual(["ris-ipv4", "ris-ipv6"]);
    expect(d.get(19)).toMatch(/contrôle seulement/i);
  });

  it("keeps of a control resolver only its name and whether it agreed: the published schema refuses anything else", () => {
    const controle = NOM.properties?.["controle"];
    expect(controle).toBeDefined();
    if (controle === undefined) return;
    expect(valider({ resolveur: "quad9", accord: true }, controle)).toEqual([]);
    expect(valider(null, controle)).toEqual([]);
    expect(valider({ resolveur: "quad9", accord: false, adresses: ["192.0.2.1"] }, controle)).not.toEqual([]);
    expect(valider({ resolveur: "quad9", accord: false, as: [64496] }, controle)).not.toEqual([]);
  });

  it("never asks RIPEstat, an RDAP server or Team Cymru: none of their addresses is in the collection's code", () => {
    const fichiers = [
      ...lister(path.join(RACINE, "pipeline")).filter((f) => /\.m?ts$/.test(f) && !/\.test\.m?ts$/.test(f)),
      ...lister(path.join(RACINE, ".github/workflows")),
    ];
    expect(fichiers.length).toBeGreaterThan(20);
    const adresses = /stat\.ripe\.net|rdap\.[a-z]|cymru\.com/;
    expect(fichiers.filter((f) => adresses.test(readFileSync(f, "utf8"))).map((f) => path.relative(RACINE, f))).toEqual(
      [],
    );
  });
});
