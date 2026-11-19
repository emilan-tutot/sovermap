import { describe, expect, it } from "vitest";
import { securityHeaders } from "../lib/security/headers";
import { indexingOpen, servedVersion } from "../lib/site";
import { findDesignViolations } from "../scripts/lib/design-rules";
import { decide } from "../scripts/vercel-ignore";

describe("security headers", () => {
  const headers = (indexing: boolean) =>
    Object.fromEntries(securityHeaders({ development: false, indexing }).map((h) => [h.key, h.value]));

  it("allow no third party and close every browser feature", () => {
    const h = headers(false);
    const csp = h["Content-Security-Policy"] ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/https?:\/\//);
    expect(csp).not.toContain("unsafe-eval");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Strict-Transport-Security"]).toContain("max-age=");
    expect(h["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(h["Permissions-Policy"]).toContain("camera=()");
  });

  it("keep the site out of search engines until the launch", () => {
    expect(headers(false)["X-Robots-Tag"]).toBe("noindex, nofollow");
    expect(headers(true)["X-Robots-Tag"]).toBeUndefined();
  });
});

describe("site", () => {
  it("shows the short commit of the build, or « local »", () => {
    expect(servedVersion({ VERCEL_GIT_COMMIT_SHA: "ABCDEF1234567" })).toBe("abcdef1");
    expect(servedVersion({})).toBe("local");
    expect(servedVersion({ VERCEL_GIT_COMMIT_SHA: "pas-un-sha" })).toBe("local");
  });
  it("opens indexing only on SITE_INDEXING=open", () => {
    expect(indexingOpen({ SITE_INDEXING: "open" })).toBe(true);
    expect(indexingOpen({ SITE_INDEXING: "closed" })).toBe(false);
    expect(indexingOpen({})).toBe(false);
  });
});

describe("design rules", () => {
  it("catch the bans of the cahier (§8.3)", () => {
    const rules = (file: string, source: string) => findDesignViolations(file, source).map((v) => v.rule);
    expect(rules("app/page.tsx", `<div className="rounded-xl shadow-lg bg-white">`)).toEqual([
      "no-default-radius",
      "no-default-shadow",
      "no-clinical-white",
    ]);
    expect(rules("app/page.tsx", `<p className="text-[#ff00aa]">`)).toEqual(["no-raw-color"]);
    expect(rules("app/globals.css", `--color-x: #ff00aa;`)).toEqual([]);
    expect(rules("lib/i18n/fr.ts", `x: "un — deux — trois"`)).toEqual(["no-dash-series"]);
    expect(rules("app/page.tsx", `<p className="backdrop-blur-md bg-clip-text">`)).toEqual(["no-glass", "no-rainbow-text"]);
  });
});

describe("vercel-ignore", () => {
  it("always builds production, and skips a preview that only changed documents or tooling", () => {
    expect(decide({ branch: "main", vercelEnv: "production", changed: ["docs/a.md"] }).build).toBe(true);
    expect(decide({ branch: "feat/x", vercelEnv: "preview", changed: ["docs/a.md", "tests/b.test.ts"] }).build).toBe(false);
    expect(decide({ branch: "feat/x", vercelEnv: "preview", changed: ["docs/a.md", "app/page.tsx"] }).build).toBe(true);
    expect(decide({ branch: "feat/x", vercelEnv: "preview", changed: null }).build).toBe(true);
    expect(decide({ branch: null, vercelEnv: "preview", changed: [] }).build).toBe(true);
  });
});
