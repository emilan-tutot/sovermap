// Claude Code `Stop` hook: a QUICK check (types, ESLint on the changed files, lint:design) before Claude stops.
// Input: the event JSON on stdin. Exit 0 = let Claude stop; exit 2 + a message on stderr = make it continue and fix.
//
// No loop: when `stop_hook_active` is true, Claude is ALREADY stopping after one refusal: exit 0 at once. A wanted stop
// (a question to the owner, an ARRÊT of the brief) therefore always goes through: at most one refusal in a row.
// Nothing to check (no code file changed since the last success) = exit 0 without running anything.
// Adapted from a generic hook of another project of the owner. The full check stays `npm run check`, before each commit.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const input = await new Promise((resolve) => {
  let raw = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    raw += chunk;
  });
  process.stdin.on("end", () => resolve(raw));
  if (process.stdin.isTTY) resolve("");
});

let event = {};
try {
  event = input.trim() === "" ? {} : JSON.parse(input);
} catch {
  process.exit(0);
}
if (event.stop_hook_active === true) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
// Never through a shell: file names go straight to the tools as arguments, so no name can inject a command.
const run = (command, args, timeout) => spawnSync(command, args, { cwd: root, encoding: "utf8", shell: false, timeout });
// The tools of the repository, run by this very Node (no npx, no shell).
const tool = (relative, args, timeout) => run(process.execPath, [path.join(root, relative), ...args], timeout);
const SAFE_NAME = /^[\w./@+-]+$/;

const status = run("git", ["status", "--porcelain", "--untracked-files=all"], 15_000);
if (status.status !== 0) process.exit(0);
const CODE = /\.(ts|tsx|mts|css|json)$/;
const changed = status.stdout
  .split("\n")
  .map((line) => line.slice(3).trim().replace(/^"|"$/g, ""))
  .filter(
    (file) =>
      file !== "" &&
      CODE.test(file) &&
      !file.startsWith("docs/") &&
      !file.startsWith("specs/") &&
      !file.startsWith(".claude/") &&
      !file.startsWith("essais/") &&
      !file.startsWith("echantillon/"),
  );
if (changed.length === 0) process.exit(0);

// Already checked as it is? (a signature of the changed files' content)
const hash = createHash("sha256");
for (const file of [...changed].sort()) {
  const full = path.join(root, file);
  hash.update(file);
  if (existsSync(full)) hash.update(readFileSync(full));
}
const signature = hash.digest("hex");
const stampDir = path.join(root, "node_modules", ".cache");
const stamp = path.join(stampDir, "stop-check-ok");
try {
  if (existsSync(stamp) && readFileSync(stamp, "utf8") === signature) process.exit(0);
} catch {
  // No stamp: check.
}

const failures = [];
const started = Date.now();

const types = tool("node_modules/typescript/bin/tsc", ["--noEmit"], 50_000);
if (types.status !== 0) {
  failures.push(`Types (tsc --noEmit) :\n${(types.stdout + types.stderr).trim().split("\n").slice(0, 25).join("\n")}`);
}

const lintable = changed.filter(
  (file) => /\.(ts|tsx|mts)$/.test(file) && SAFE_NAME.test(file) && existsSync(path.join(root, file)),
);
if (lintable.length > 0 && Date.now() - started < 45_000) {
  const lint = tool("node_modules/eslint/bin/eslint.js", ["--no-warn-ignored", "--", ...lintable], 45_000);
  if (lint.status !== 0) {
    failures.push(`ESLint :\n${(lint.stdout + lint.stderr).trim().split("\n").slice(0, 25).join("\n")}`);
  }
}
if (Date.now() - started < 50_000) {
  const design = tool("node_modules/tsx/dist/cli.mjs", ["scripts/lint-design.ts"], 30_000);
  if (design.status !== 0) {
    failures.push(`lint:design :\n${(design.stdout + design.stderr).trim().split("\n").slice(0, 25).join("\n")}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(
    `Vérification rapide en échec (types et lint) : corrigez, ou dites pourquoi vous vous arrêtez malgré tout.\n\n${failures.join("\n\n")}\n`,
  );
  process.exit(2);
}
try {
  mkdirSync(stampDir, { recursive: true });
  writeFileSync(stamp, signature);
} catch {
  // Not serious: the next check will run again.
}
process.exit(0);
