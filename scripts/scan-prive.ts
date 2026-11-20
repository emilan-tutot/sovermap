// npm run scan:prive : refuses anything personal in what goes to GitHub (brief B.2, decision D6).
// Fails when a tracked file, or a commit absent from origin/main (the lines it adds, its message, its author and
// committer) holds a personal path, the Windows user name, a private pattern, or an e-mail address that is not allowed.
// Runs in `npm run check`, in the CI and in the local pre-push hook. It never prints a private value.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import {
  type Finding,
  type ScanContext,
  ownerFromRemote,
  parseMotifs,
  scanCommitMessage,
  scanIdentity,
  scanText,
} from "./lib/private-scan";

const git = (...args: string[]) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });

function tryGit(...args: string[]): string | null {
  try {
    return git(...args);
  } catch {
    return null;
  }
}

function context(): ScanContext {
  const remote = tryGit("remote", "get-url", "origin");
  const motifsPath = ".git/info/motifs-prives.txt";
  return {
    ownerLogin: remote === null ? (process.env["GITHUB_REPOSITORY_OWNER"] ?? null) : ownerFromRemote(remote),
    windowsUser: process.platform === "win32" ? os.userInfo().username : null,
    motifs: existsSync(motifsPath) ? parseMotifs(readFileSync(motifsPath, "utf8")) : [],
  };
}

const isBinary = (buffer: Buffer) => buffer.subarray(0, 8000).includes(0);

function scanTrackedFiles(ctx: ScanContext): Finding[] {
  const files = git("ls-files", "-z").split("\0").filter((file) => file !== "");
  const findings: Finding[] = [];
  for (const file of files) {
    if (!existsSync(file)) continue;
    const buffer = readFileSync(file);
    if (isBinary(buffer)) continue;
    findings.push(...scanText(buffer.toString("utf8"), file, ctx));
  }
  return findings;
}

function scanUnpublishedCommits(ctx: ScanContext): { findings: Finding[]; count: number } {
  const base = tryGit("rev-parse", "--verify", "--quiet", "origin/main") === null ? [] : ["^origin/main"];
  const shas = (tryGit("rev-list", "HEAD", ...base) ?? "").split("\n").filter((sha) => sha !== "");
  const findings: Finding[] = [];
  for (const sha of shas) {
    const short = sha.slice(0, 7);
    const [authorName = "", authorEmail = "", committerName = "", committerEmail = "", ...message] = git(
      "show",
      "-s",
      "--format=%an%x00%ae%x00%cn%x00%ce%x00%B",
      sha,
    ).split("\0");
    findings.push(...scanIdentity({ authorName, authorEmail, committerName, committerEmail }, `commit ${short}`, ctx));
    findings.push(...scanCommitMessage(message.join("\0"), `commit ${short} (message)`, ctx));
    const added = git("show", "--format=", "--unified=0", "--no-color", "--no-ext-diff", sha)
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .map((line) => line.slice(1))
      .join("\n");
    findings.push(...scanText(added, `commit ${short} (lignes ajoutées)`, ctx));
  }
  return { findings, count: shas.length };
}

const ctx = context();
const fileFindings = scanTrackedFiles(ctx);
const commits = scanUnpublishedCommits(ctx);
const findings = [...fileFindings, ...commits.findings];

const checks = [
  "chemins personnels",
  ctx.ownerLogin === null ? "nom du compte : sauté (compte inconnu)" : "nom du compte hors de l'adresse du dépôt",
  ctx.windowsUser === null ? "nom d'utilisateur Windows : sauté (hors Windows)" : "nom d'utilisateur Windows",
  ctx.motifs.length === 0 ? "motifs privés : sautés (fichier local absent)" : `${ctx.motifs.length} motif(s) privé(s)`,
  "adresses e-mail",
  ctx.ownerLogin === null ? "identité des commits : compte inconnu" : "identité des commits",
];

if (findings.length > 0) {
  for (const finding of findings) console.error(`scan:prive : ${finding.where} : ${finding.kind}`);
  console.error(`\nscan:prive : ÉCHEC, ${findings.length} élément(s) à retirer avant tout envoi.`);
  process.exit(1);
}
console.log(
  `scan:prive : OK (${commits.count} commit(s) non publié(s) relu(s) ; contrôles : ${checks.join(", ")}).`,
);
