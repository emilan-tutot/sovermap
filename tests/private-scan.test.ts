import { describe, expect, it } from "vitest";
import {
  emailAllowed,
  ownerFromRemote,
  parseMotifs,
  type ScanContext,
  scanIdentity,
  scanText,
  withoutAllowedContexts,
} from "../scripts/lib/private-scan";

// Fictitious values only (no real name, no real account). The personal-looking samples are assembled at run time, so
// that this file itself never holds a full pattern and passes `npm run scan:prive`.
const ctx: ScanContext = { ownerLogin: "jean-exemple", windowsUser: "jexem", motifs: ["Jean", "Exemple", "Autre Projet"] };
const at = "@";
const mail = (local: string, domain: string) => `${local}${at}${domain}`;
const winPath = ["C:", "Users", "jexem", "x"].join("\\");
const bashPath = ["", "c", "Users", "quelqu-un"].join("/");

describe("emailAllowed", () => {
  it("accepts GitHub and Anthropic no-reply addresses, the project domain and examples", () => {
    for (const email of [
      mail("123+jean-exemple", "users.noreply.github.com"),
      mail("noreply", "github.com"),
      mail("noreply", "anthropic.com"),
      mail("contact", "sovermap.com"),
      mail("a", "example.com"),
      mail("b", "test.example"),
    ]) {
      expect(emailAllowed(email), email).toBe(true);
    }
  });
  it("refuses any other address", () => {
    for (const email of [mail("jean", "gmail.com"), mail("x", "outlook.fr"), mail("y", "anthropic.com")]) {
      expect(emailAllowed(email), email).toBe(false);
    }
  });
});

describe("withoutAllowedContexts", () => {
  it("removes only the repository addresses (decision D6)", () => {
    const text = "https://github.com/jean-exemple/sovermap et https://raw.githubusercontent.com/Jean-Exemple/sovermap/donnees/x";
    expect(withoutAllowedContexts(text, "jean-exemple")).toBe("https://<dépôt> et https://<dépôt>/donnees/x");
    expect(withoutAllowedContexts("https://github.com/jean-exemple/autre", "jean-exemple")).toContain("jean-exemple");
  });
});

describe("scanText", () => {
  it("finds a personal path, the Windows user, a private pattern and a personal address, without printing them", () => {
    const text = [winPath, `voir ${bashPath}`, "signé Jean", `écrire à ${mail("jean", "gmail.com")}`].join("\n");
    const findings = scanText(text, "f.md", ctx);
    const kinds = findings.map((f) => f.kind).join(" | ");
    expect(kinds).toContain("dossier d'utilisateur Windows");
    expect(kinds).toContain("nom d'utilisateur Windows");
    expect(kinds).toContain("motif privé n° 1");
    expect(kinds).toContain("adresse e-mail non autorisée (@gmail.com)");
    for (const finding of findings) expect(finding.kind.toLowerCase()).not.toContain(`jean${at}`);
  });
  it("accepts the repository address and the account's no-reply address", () => {
    const text = `https://github.com/jean-exemple/sovermap\nCo-Authored-By: Claude <${mail("noreply", "anthropic.com")}>`;
    expect(scanText(text, "README.md", ctx)).toEqual([]);
  });
  it("refuses the account name outside the repository address", () => {
    expect(scanText("auteur : jean-exemple", "x.md", ctx).length).toBeGreaterThan(0);
  });
  it("finds a pattern of the other project whatever its case", () => {
    expect(scanText("vu dans AUTRE PROJET", "x.md", ctx)[0]?.kind).toBe("motif privé n° 3");
  });
});

describe("scanIdentity", () => {
  const own = { name: "jean-exemple", email: mail("1234+jean-exemple", "users.noreply.github.com") };
  it("accepts the account with its no-reply address, and GitHub's robots", () => {
    expect(
      scanIdentity({ authorName: own.name, authorEmail: own.email, committerName: own.name, committerEmail: own.email }, "c", ctx),
    ).toEqual([]);
    expect(
      scanIdentity(
        { authorName: own.name, authorEmail: own.email, committerName: "GitHub", committerEmail: mail("noreply", "github.com") },
        "c",
        ctx,
      ),
    ).toEqual([]);
    expect(
      scanIdentity(
        {
          authorName: "github-actions[bot]",
          authorEmail: mail("41898282+github-actions[bot]", "users.noreply.github.com"),
          committerName: "github-actions[bot]",
          committerEmail: mail("41898282+github-actions[bot]", "users.noreply.github.com"),
        },
        "c",
        ctx,
      ),
    ).toEqual([]);
  });
  it("refuses a personal address, a real name or another account's no-reply address", () => {
    const bad = [
      { authorName: own.name, authorEmail: mail("jean", "gmail.com") },
      { authorName: "Jean Exemple", authorEmail: own.email },
      { authorName: own.name, authorEmail: mail("99+quelqu-un", "users.noreply.github.com") },
    ];
    for (const b of bad) {
      expect(scanIdentity({ ...b, committerName: own.name, committerEmail: own.email }, "c", ctx).length).toBe(1);
    }
  });
});

describe("helpers", () => {
  it("reads the private patterns file and the owner from the remote", () => {
    expect(parseMotifs("# commentaire\n\nJean\n  Exemple  \n")).toEqual(["Jean", "Exemple"]);
    expect(ownerFromRemote("https://github.com/jean-exemple/sovermap.git")).toBe("jean-exemple");
    expect(ownerFromRemote(`git${at}github.com:jean-exemple/sovermap.git`)).toBe("jean-exemple");
    expect(ownerFromRemote("https://github.com/jean-exemple/autre.git")).toBeNull();
  });
});
