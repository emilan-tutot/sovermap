// Image-by-image check of a film made by filmer.ts: during every movement it recorded, each image must differ from the
// previous one (no repeated image, hence no skipped step either), and in the movements at constant speed the difference
// must stay regular. The difference is the mean luma of |image n − image n−1| (ffmpeg tblend + signalstats), measured
// on the encoded MP4, as it will be watched.
//   npx tsx scripts/design/verifier-film.ts <film.mp4>
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { ecrireMesures, fr } from "./commun";

const [film = ""] = process.argv.slice(2);
const fiche = JSON.parse(readFileSync(`${film}.segments.json`, "utf8")) as {
  parcours: string;
  appareil: string;
  images: number;
  taille: string;
  segments: { nom: string; debut: number; fin: number; constante: boolean }[];
};
const sortie = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", film, "-vf", "tblend=all_mode=difference,signalstats,metadata=mode=print:key=lavfi.signalstats.YAVG:file=-", "-f", "null", "-"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
// diff[k] = difference between image k and image k + 1.
const diff = [...sortie.stdout.matchAll(/lavfi\.signalstats\.YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
const REPETITION = 0.02;
let defauts = 0;
const details: Record<string, unknown>[] = [];
console.log(`${film} : ${fiche.images} images, ${diff.length} différences mesurées`);
for (const s of fiche.segments) {
  const valeurs = diff.slice(Math.max(0, s.debut - 1), s.fin);
  const repetees = valeurs.map((v, i) => ({ v, image: s.debut + i })).filter((x) => x.v < REPETITION);
  const tri = [...valeurs].sort((a, b) => a - b);
  const mediane = tri[Math.floor(tri.length / 2)] ?? 0;
  const moyenne = valeurs.reduce((a, b) => a + b, 0) / Math.max(1, valeurs.length);
  const ecart = Math.sqrt(valeurs.reduce((a, b) => a + (b - moyenne) ** 2, 0) / Math.max(1, valeurs.length));
  const variation = moyenne > 0 ? ecart / moyenne : 0;
  const irregulier = s.constante && variation > 0.35;
  const defaut = repetees.length > 0 || irregulier;
  if (defaut) defauts += 1;
  details.push({ ...s, mediane, variation, repetees: repetees.map((x) => x.image) });
  console.log(
    `  ${defaut ? "DÉFAUT" : "ok    "} ${s.nom.padEnd(32)} images ${s.debut}–${s.fin} (${valeurs.length}) ; écart image à image : min ${fr(tri[0] ?? 0, 3)}, médiane ${fr(mediane, 3)}, max ${fr(tri[tri.length - 1] ?? 0, 3)}, variation ${(100 * variation).toFixed(0)} %${repetees.length ? ` ; images répétées : ${repetees.map((x) => x.image).join(", ")}` : ""}`,
  );
}
const nom = path.basename(film);
ecrireMesures(`verification-${nom}.json`, { film: nom, parcours: fiche.parcours, appareil: fiche.appareil, images: fiche.images, taille: fiche.taille, mouvements: fiche.segments.length, defauts, details });
console.log(defauts === 0 ? "vérification image par image : aucune image répétée ni sautée pendant les mouvements" : `vérification image par image : ${defauts} mouvement(s) en défaut`);
process.exit(defauts === 0 ? 0 : 1);
