// npm run probe:prod -- --url <origin> [--commit <sha>] [--wait <seconds>] [--open]
// The deployed site as a stranger and a robot see it (brief B.5 and E.7):
//   1. it serves the expected commit (meta « sovermap-version »), waiting up to --wait seconds;
//   2. the security headers of cahier §6, and a CSP without any third party;
//   3. until the launch (unless --open): closed to indexing (X-Robots-Tag, meta robots), and the closed production
//      door at every address of lib/porte.ts (brief of chantier 2, A.6): the waiting page at the root, robots.txt
//      that forbids everything, the empty sitemap, the 404 page everywhere else, and nowhere a sign of data;
//   4. no source map, no cookie, nothing served that must not be (/.env, /.git), a real 404.
// Adapted from a generic tool of another project of the owner.
import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { ADRESSES_PORTE } from "../lib/porte";
import { ecartsPorte } from "./lib/porte-controle";

const { values } = parseArgs({
  options: {
    url: { type: "string", default: process.env["SOVERMAP_PRODUCTION_URL"] ?? "" },
    commit: { type: "string" },
    wait: { type: "string", default: "0" },
    open: { type: "boolean", default: false },
  },
});

class ProbeFailure extends Error {}
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function get(url: string): Promise<{ status: number; text: string; headers: Headers }> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "no-store", redirect: "manual" });
      return { status: response.status, text: await response.text(), headers: response.headers };
    } catch (error) {
      lastError = error;
      await pause(2_000);
    }
  }
  throw lastError;
}

const servedVersion = (html: string) => html.match(/<meta name="sovermap-version" content="([^"]*)"/)?.[1] ?? null;

async function main() {
  const origin = (values.url ?? "").replace(/\/$/, "");
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(origin)) throw new ProbeFailure("--url attend une origine https (ou SOVERMAP_PRODUCTION_URL).");
  const commit = (values.commit ?? process.env["GITHUB_SHA"] ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }))
    .trim()
    .slice(0, 7)
    .toLowerCase();
  const waitSeconds = Number(values.wait);
  if (!Number.isFinite(waitSeconds) || waitSeconds < 0) throw new ProbeFailure("--wait attend un nombre de secondes.");

  // 1. The expected commit.
  const deadline = Date.now() + waitSeconds * 1000;
  let home = await get(`${origin}/`);
  while (servedVersion(home.text) !== commit && Date.now() < deadline) {
    console.log(`probe:prod : la production sert ${servedVersion(home.text) ?? "?"}, en attente de ${commit}…`);
    await pause(20_000);
    home = await get(`${origin}/`);
  }
  const problems: string[] = [];
  if (home.status !== 200) problems.push(`/ répond ${home.status}`);
  if (servedVersion(home.text) !== commit) problems.push(`la production sert ${servedVersion(home.text) ?? "?"}, pas ${commit}`);

  // 2. Security headers.
  const h = home.headers;
  const csp = h.get("content-security-policy") ?? "";
  if (!csp.includes("default-src 'self'") || !csp.includes("frame-ancestors 'none'")) problems.push("CSP absente ou incomplète");
  if (/https?:\/\//.test(csp)) problems.push("la CSP autorise un autre domaine");
  if (!(h.get("strict-transport-security") ?? "").includes("max-age=")) problems.push("HSTS absent");
  if (h.get("x-content-type-options") !== "nosniff") problems.push("nosniff absent");
  if (h.get("x-frame-options") !== "DENY") problems.push("X-Frame-Options absent");
  if (!h.get("referrer-policy")) problems.push("Referrer-Policy absente");
  if (h.get("cross-origin-opener-policy") !== "same-origin") problems.push("COOP absente");
  if (!(h.get("permissions-policy") ?? "").includes("camera=()")) problems.push("Permissions-Policy absente ou ouverte");
  if (h.get("set-cookie")) problems.push("un cookie est posé");

  // 3. Indexing, and the closed production door at every address of its list.
  if (!values.open) {
    if (!(h.get("x-robots-tag") ?? "").includes("noindex")) problems.push("en-tête X-Robots-Tag noindex absent");
    if (!/<meta name="robots" content="noindex, ?nofollow"/.test(home.text)) problems.push("balise robots noindex absente");
    for (const adresse of ADRESSES_PORTE) {
      const reponse = await get(`${origin}${adresse.chemin}`);
      problems.push(
        ...ecartsPorte(adresse, {
          status: reponse.status,
          contentType: reponse.headers.get("content-type") ?? "",
          texte: reponse.text,
        }),
      );
    }
  }

  // 4. No source map, nothing private served, a real 404.
  const scripts = [...home.text.matchAll(/<script[^>]+src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1] ?? "");
  for (const src of scripts.slice(0, 5)) {
    const map = await get(`${origin}${src}.map`);
    if (map.status === 200) problems.push(`carte de sources servie : ${src}.map`);
  }
  for (const route of ["/.env", "/.env.local", "/.git/config", "/.git/HEAD"]) {
    const page = await get(`${origin}${route}`);
    if (page.status === 200) problems.push(`${route} est servi`);
  }
  const missing = await get(`${origin}/page-qui-n-existe-pas`);
  if (missing.status !== 404) problems.push(`une page inconnue répond ${missing.status}, pas 404`);

  if (problems.length > 0) {
    for (const problem of problems) console.error(`probe:prod : ${problem}`);
    throw new ProbeFailure(`${problems.length} écart(s).`);
  }
  console.log(
    `probe:prod : OK (${origin}) : commit ${commit}, en-têtes de sécurité, ${values.open ? "indexation ouverte" : `fermé à l'indexation, porte fermée sur ${ADRESSES_PORTE.length} adresses`}, aucune carte de sources, aucun cookie, fichiers privés non servis, 404.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof ProbeFailure ? `probe:prod : ÉCHEC : ${error.message}` : error);
  process.exit(1);
});
