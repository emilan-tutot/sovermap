// The rules of `npm run scan:prive` (brief B.2, decision D6 of 19/11/2026), as pure functions, tested in tests/.
// Nothing personal is ever written here: the owner's account name comes from the `origin` remote, the Windows user
// name from the system at run time, and the other private patterns from `.git/info/motifs-prives.txt`, which Git
// never versions. A finding never prints the private value it matched.

export type ScanContext = {
  /** Account that owns the repository (from the `origin` remote), or null when unknown. */
  ownerLogin: string | null;
  /** Windows user name, read at run time; null outside Windows (the check is then skipped). */
  windowsUser: string | null;
  /** Private patterns (first name, display name, hosting team id, other project), case-insensitive. */
  motifs: readonly string[];
};

export type Finding = { where: string; kind: string };

const PERSONAL_PATH = /[a-z]:[\\/]+users[\\/]|\/c\/users\//i;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

/** Addresses that may appear anywhere: GitHub and Anthropic no-reply addresses, the project's own domain, examples. */
export function emailAllowed(email: string): boolean {
  const e = email.toLowerCase();
  const domain = e.slice(e.lastIndexOf("@") + 1);
  return (
    domain === "users.noreply.github.com" ||
    e === "noreply@github.com" ||
    e === "noreply@anthropic.com" ||
    domain === "sovermap.com" ||
    domain.endsWith(".sovermap.com") ||
    ["example.com", "example.org", "example.net"].includes(domain) ||
    domain.endsWith(".example")
  );
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Removes the two contexts where the account name is allowed (decision D6): the repository's addresses. */
export function withoutAllowedContexts(text: string, ownerLogin: string | null): string {
  if (ownerLogin === null || ownerLogin === "") return text;
  const login = escapeRegExp(ownerLogin);
  return text.replace(new RegExp(`(?:raw\\.githubusercontent\\.com|github\\.com)/${login}/sovermap`, "gi"), "<dépôt>");
}

/** The private items found in one text (a file, a commit message, the lines a commit adds). */
export function scanText(text: string, where: string, context: ScanContext): Finding[] {
  const findings: Finding[] = [];
  const cleaned = withoutAllowedContexts(text, context.ownerLogin);
  const lines = cleaned.split(/\r?\n/);
  const lower = lines.map((line) => line.toLowerCase());
  const at = (index: number) => `${where}:${index + 1}`;

  lines.forEach((line, index) => {
    if (PERSONAL_PATH.test(line)) findings.push({ where: at(index), kind: "chemin vers un dossier d'utilisateur Windows" });
    for (const match of line.matchAll(EMAIL)) {
      const email = match[0];
      if (!emailAllowed(email)) {
        findings.push({ where: at(index), kind: `adresse e-mail non autorisée (@${email.split("@")[1] ?? "?"})` });
      }
    }
  });

  // The account name is allowed only in the repository's addresses, removed above (decision D6, CLAUDE.md).
  const login = context.ownerLogin?.toLowerCase() ?? "";
  if (login.length >= 3) {
    lower.forEach((line, index) => {
      if (line.includes(login)) findings.push({ where: at(index), kind: "nom du compte hors de l'adresse du dépôt" });
    });
  }

  const user = context.windowsUser?.toLowerCase() ?? "";
  if (user.length >= 3) {
    lower.forEach((line, index) => {
      if (line.includes(user)) findings.push({ where: at(index), kind: "nom d'utilisateur Windows" });
    });
  }

  context.motifs.forEach((motif, motifIndex) => {
    const needle = motif.trim().toLowerCase();
    if (needle.length < 3) return;
    lower.forEach((line, index) => {
      if (line.includes(needle)) findings.push({ where: at(index), kind: `motif privé n° ${motifIndex + 1}` });
    });
  });
  return findings;
}

export type CommitIdentity = { authorName: string; authorEmail: string; committerName: string; committerEmail: string };

/** Robots whose name and no-reply address may sign a commit (GitHub's merges, Actions, Dependabot). */
const BOT_NAMES = new Set(["github", "github-actions[bot]", "dependabot[bot]"]);
const BOT_EMAIL = /^(?:\d+\+[a-z0-9-]+\[bot\]@users\.noreply\.github\.com|noreply@github\.com)$/;

/**
 * Author and committer of a commit (decision D6): the account name with its own no-reply address, or a known robot.
 * Anything else is a finding; the value itself is never printed.
 */
export function scanIdentity(identity: CommitIdentity, where: string, context: ScanContext): Finding[] {
  const findings: Finding[] = [];
  const login = context.ownerLogin?.toLowerCase() ?? null;
  const ownNoReply =
    login === null ? null : new RegExp(`^\\d+\\+${escapeRegExp(login)}@users\\.noreply\\.github\\.com$`);
  const check = (name: string, email: string, role: string) => {
    const n = name.trim().toLowerCase();
    const e = email.trim().toLowerCase();
    const isOwner = login !== null && n === login && ownNoReply !== null && ownNoReply.test(e);
    const isBot = BOT_NAMES.has(n) && BOT_EMAIL.test(e);
    if (!isOwner && !isBot) {
      findings.push({ where: `${where} (${role})`, kind: "identité non autorisée (ni le compte avec son adresse noreply, ni un robot)" });
    }
  };
  check(identity.authorName, identity.authorEmail, "auteur");
  check(identity.committerName, identity.committerEmail, "committer");
  return findings;
}

/** Reads the private patterns file: one pattern per line, blank lines and « # » comments ignored. */
export function parseMotifs(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
}

/** The account name from the `origin` remote address, or null. */
export function ownerFromRemote(url: string): string | null {
  const match = url.trim().match(/github\.com[/:]([^/]+)\/sovermap(?:\.git)?\/?$/i);
  return match?.[1] ?? null;
}
