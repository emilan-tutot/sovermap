// Tests of the data pages' shared cache (D.4): nothing behind a closed door; behind an open door, a day for a record and
// an hour for an aggregated page, on Vercel's CDN only.
import { describe, expect, it } from "vitest";
import { CACHE_AGREGAT, CACHE_FICHE, enTetesDeCache } from "@/lib/cache";
import { PAGES_DE_TEXTE } from "@/lib/i18n/fr-textes";

const valeurDe = (regles: ReturnType<typeof enTetesDeCache>, source: string) =>
  regles.find((r) => r.source === source)?.headers;

describe("the data pages' shared cache (D.4)", () => {
  it("adds nothing behind a closed door", () => {
    expect(enTetesDeCache({})).toEqual([]);
    expect(enTetesDeCache({ SITE_PUBLIC: "closed" })).toEqual([]);
  });

  it("keeps a record a day and an aggregated page an hour, through Vercel's CDN header only", () => {
    const regles = enTetesDeCache({ SITE_PUBLIC: "open" });
    expect(valeurDe(regles, "/radiographie/:domaine")).toEqual([
      { key: "Vercel-CDN-Cache-Control", value: CACHE_FICHE },
    ]);
    expect(valeurDe(regles, "/journal/:date")).toEqual([{ key: "Vercel-CDN-Cache-Control", value: CACHE_FICHE }]);
    for (const source of ["/", "/societes/:cle", "/ministeres/:slug", "/pays/:slug", "/qualite"]) {
      expect(valeurDe(regles, source)).toEqual([{ key: "Vercel-CDN-Cache-Control", value: CACHE_AGREGAT }]);
    }
    expect(regles.flatMap((r) => r.headers.map((h) => h.key))).not.toContain("Cache-Control");
    expect(CACHE_FICHE).toBe("max-age=86400, stale-while-revalidate=604800");
    expect(CACHE_AGREGAT).toBe("max-age=3600, stale-while-revalidate=86400");
  });

  it("keeps every text page an hour too: they carry the date of the last collection (the review of PR 22)", () => {
    const regles = enTetesDeCache({ SITE_PUBLIC: "open" });
    for (const page of PAGES_DE_TEXTE) {
      expect(valeurDe(regles, page.chemin), page.chemin).toEqual([
        { key: "Vercel-CDN-Cache-Control", value: CACHE_AGREGAT },
      ]);
    }
  });
});
