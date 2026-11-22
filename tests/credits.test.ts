// The Crédits page lists every dependency, the collection's included (the owner's answer to point 13, § 7): this test
// fails when lib/credits.ts no longer matches package.json, node_modules and the resolver's image.
import { describe, expect, it } from "vitest";
import { LOGICIELS } from "../lib/credits";
import { logicielsDe, versionDuResolveur } from "../scripts/lib/credits";

describe("the free software of the Crédits page", () => {
  it("matches the dependencies and the resolver's image (npx tsx scripts/credits.ts writes it again)", () => {
    expect(LOGICIELS).toEqual(logicielsDe());
  });

  it("reads the resolver's version from the comment of its pinned image", () => {
    expect(versionDuResolveur("  RESOLVEUR: docker.io/x/y@sha256:ab # v6.5.1-20261117\n")).toBe("6.5.1-20261117");
    expect(versionDuResolveur("  RESOLVEUR: docker.io/x/y@sha256:ab\n")).toBeNull();
  });
});
