// G.4 and each point: the runs of GitHub Actions since a day, by workflow and event: their number and their minutes,
// from each run's start to its last update (an estimate of the wall time; a public repository's minutes are free).
// Read only, through gh, page by page. With a date filter, GitHub gives 1 000 runs at most, without saying so: the
// tool warns when it reaches that number (take a later day).   npx tsx scripts/mesures/minutes-actions.ts [AAAA-MM-JJ]
import { execFileSync } from "node:child_process";

const [depuis = "2026-11-19"] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(depuis)) throw new Error("date attendue : AAAA-MM-JJ");
const sortie = execFileSync(
  "gh",
  [
    "api",
    "--paginate",
    `repos/{owner}/{repo}/actions/runs?per_page=100&created=>=${depuis}`,
    "--jq",
    ".workflow_runs[] | [.name, .event, .run_started_at, .updated_at] | @tsv",
  ],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);
const parFlux = new Map<string, { passages: number; minutes: number }>();
for (const ligne of sortie.split("\n").filter((l) => l !== "")) {
  const [nom = "", evenement = "", debut = "", fin = ""] = ligne.split("\t");
  const minutes = (Date.parse(fin) - Date.parse(debut)) / 60_000;
  const flux = parFlux.get(`${nom} (${evenement})`) ?? { passages: 0, minutes: 0 };
  flux.passages += 1;
  flux.minutes += Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  parFlux.set(`${nom} (${evenement})`, flux);
}
let passages = 0;
let minutes = 0;
for (const [cle, flux] of [...parFlux].sort((a, b) => b[1].minutes - a[1].minutes)) {
  console.log(`${cle} : ${flux.passages} passages, ${Math.round(flux.minutes)} min`);
  passages += flux.passages;
  minutes += flux.minutes;
}
console.log(`total depuis le ${depuis} : ${passages} passages, ${Math.round(minutes)} min (durée murale)`);
if (passages >= 1000)
  console.log(
    "attention : 1 000 passages, le plus que GitHub rend avec ce filtre ; le compte est sans doute incomplet",
  );
