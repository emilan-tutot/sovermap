import { describe, expect, it } from "vitest";
import {
  DEPENDABOT_SIGNOFF,
  emailAllowed,
  ownerFromRemote,
  parseMotifs,
  type ScanContext,
  scanCommitMessage,
  scanIdentity,
  scanText,
} from "../scripts/lib/private-scan";

// Fictitious values only (no real name, no real account). The personal-looking samples are assembled at run time, so
// that this file itself never holds a full pattern and passes `npm run scan:prive`.
const ctx: ScanContext = {
  ownerLogin: "jean-exemple",
  windowsUser: "jexem",
  motifs: ["Jean", "Exemple", "Autre Projet"],
};
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
  it("accepts a no-reply address, and refuses the account name, even in the repository's address (point 03)", () => {
    expect(scanText(`Co-Authored-By: Claude <${mail("noreply", "anthropic.com")}>`, "README.md", ctx)).toEqual([]);
    for (const texte of [
      "https://github.com/jean-exemple/sovermap",
      "https://raw.githubusercontent.com/Jean-Exemple/sovermap/donnees/etat.json",
      "auteur : jean-exemple",
    ]) {
      expect(scanText(texte, "x.md", ctx).map((f) => f.kind)).toContain("nom du compte");
    }
  });
  it("refuses the account name by itself, even without any private pattern or Windows user", () => {
    const seul: ScanContext = { ownerLogin: "jean-exemple", windowsUser: null, motifs: [] };
    expect(scanText("merci jean-exemple", "x.md", seul).map((f) => f.kind)).toEqual(["nom du compte"]);
    expect(scanText("https://jean-exemple.github.io", "x.md", seul)).toHaveLength(1);
    expect(scanText("https://github.com/jean-exemple/sovermap", "x.md", seul)).toHaveLength(1);
  });
  it("finds a pattern of the other project whatever its case", () => {
    expect(scanText("vu dans AUTRE PROJET", "x.md", ctx)[0]?.kind).toBe("motif privé n° 3");
  });
});

describe("scanIdentity", () => {
  const own = { name: "jean-exemple", email: mail("1234+jean-exemple", "users.noreply.github.com") };
  it("accepts the account with its no-reply address, and GitHub's robots", () => {
    expect(
      scanIdentity(
        { authorName: own.name, authorEmail: own.email, committerName: own.name, committerEmail: own.email },
        "c",
        ctx,
      ),
    ).toEqual([]);
    expect(
      scanIdentity(
        {
          authorName: own.name,
          authorEmail: own.email,
          committerName: "GitHub",
          committerEmail: mail("noreply", "github.com"),
        },
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

describe("Dependabot's sign-off line (brief of chantier 2, A.1)", () => {
  const support = mail("support", "github.com");
  const message = (...lines: string[]) =>
    ["build(deps-dev): Bump eslint from 9.39.5 to 10.15.0", "", "Bumps eslint.", "", ...lines].join("\n");

  it("is the exact line Dependabot writes", () => {
    expect(DEPENDABOT_SIGNOFF).toBe(`Signed-off-by: dependabot[bot] <${support}>`);
  });
  it("passes in a commit message, alone or with Windows line ends", () => {
    expect(scanCommitMessage(message(DEPENDABOT_SIGNOFF), "commit a (message)", ctx)).toEqual([]);
    expect(scanCommitMessage(message(DEPENDABOT_SIGNOFF).replace(/\n/g, "\r\n"), "commit a (message)", ctx)).toEqual(
      [],
    );
  });
  it("still refuses the same address anywhere else: another line of a message, a file, a changed line", () => {
    const kinds = (findings: { kind: string }[]) => findings.map((f) => f.kind);
    for (const line of [
      `Signed-off-by: quelqu-un <${support}>`,
      `${DEPENDABOT_SIGNOFF} et plus`,
      ` ${DEPENDABOT_SIGNOFF}`,
      `écrire à ${support}`,
      `écrire à ${mail("security", "github.com")}`,
    ]) {
      expect(kinds(scanCommitMessage(message(line), "commit a (message)", ctx)), line).toEqual([
        "adresse e-mail non autorisée (@github.com)",
      ]);
    }
    expect(scanText(DEPENDABOT_SIGNOFF, "f.md", ctx)).toHaveLength(1);
  });
  it("keeps GitHub's committer address valid, and refuses the support address as an author", () => {
    const robot = {
      authorName: "dependabot[bot]",
      authorEmail: mail("49699333+dependabot[bot]", "users.noreply.github.com"),
    };
    expect(
      scanIdentity({ ...robot, committerName: "GitHub", committerEmail: mail("noreply", "github.com") }, "c", ctx),
    ).toEqual([]);
    expect(
      scanIdentity(
        {
          authorName: "dependabot[bot]",
          authorEmail: support,
          committerName: "GitHub",
          committerEmail: mail("noreply", "github.com"),
        },
        "c",
        ctx,
      ),
    ).toHaveLength(1);
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
