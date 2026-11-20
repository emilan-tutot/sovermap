// Tests of the day's downloads: a fake downloader and temporary folders (no network). Hosts under `.example`.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Reponse, Telechargeur } from "./sources";
import { type Source, telechargerSources } from "./telechargements";

const dossiers: string[] = [];
const temporaire = () => {
  const d = mkdtempSync(path.join(tmpdir(), "sovermap-essai-"));
  dossiers.push(d);
  return d;
};
afterEach(() => {
  for (const d of dossiers.splice(0)) rmSync(d, { recursive: true, force: true });
});

const SOURCES: Source[] = [
  { id: "quotidien", fiche: 1, url: "https://a.example/q", frequence: "jour" },
  { id: "hebdo", fiche: 2, url: "https://a.example/h", frequence: "semaine" },
];

function faux(reponses: Record<string, string | null>): Telechargeur & { demandes: string[] } {
  const demandes: string[] = [];
  return {
    demandes,
    obtenir: async (url: string): Promise<Reponse> => {
      demandes.push(url);
      const corps = reponses[url];
      if (corps === null || corps === undefined) throw new Error("réseau");
      return {
        url,
        statut: 200,
        entetes: new Headers({ "last-modified": "Thu, 19 Nov 2026 08:30:26 GMT" }),
        corps: Buffer.from(corps),
      };
    },
  } as unknown as Telechargeur & { demandes: string[] };
}

describe("the day's downloads", () => {
  it("keeps the file and its date, then falls back on the last copy when a source fails", async () => {
    const hier = temporaire();
    const premier = await telechargerSources(
      faux({ "https://a.example/q": "q1", "https://a.example/h": "h1" }),
      hier,
      null,
      new Date("2026-11-20T03:17:00Z"),
      SOURCES,
    );
    expect(premier.map((s) => `${s.id} ${s.etat} ${s.date}`)).toEqual([
      "quotidien du jour 2026-11-19T08:30:26.000Z",
      "hebdo du jour 2026-11-19T08:30:26.000Z",
    ]);
    const aujourdhui = temporaire();
    const t = faux({ "https://a.example/q": null, "https://a.example/h": "h2" });
    const second = await telechargerSources(t, aujourdhui, hier, new Date("2026-11-21T03:17:00Z"), SOURCES);
    expect(second.map((s) => `${s.id} ${s.etat}`)).toEqual(["quotidien de la veille", "hebdo de la semaine"]);
    expect(t.demandes).toEqual(["https://a.example/q"]);
    expect(readFileSync(path.join(aujourdhui, "sources", "quotidien"), "utf8")).toBe("q1");
  });

  it("says « en échec » when there is no copy at all", async () => {
    const r = await telechargerSources(faux({}), temporaire(), null, new Date(), SOURCES);
    expect(r.map((s) => s.etat)).toEqual(["en échec", "en échec"]);
  });
});
