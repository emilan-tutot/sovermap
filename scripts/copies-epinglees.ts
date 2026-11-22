// Once a month (.github/workflows/copies.yml; the owner's answer to point 13, § 8): is a newer version out of a copy
// the collection pins? The Knot Resolver image (Docker Hub's tags, card 12), the Public Suffix List (publicsuffix.org,
// card 42) and the INSEE's COG (data.gouv.fr's API, card 48). Each host's robots.txt is read first and obeyed, with a
// second between two requests to a host and the project's user agent (pipeline/sources.ts). Writes a report in French
// to the standard output; exits 0 when every copy is current, 3 when a newer version exists, 1 when a source cannot be
// read.
//   npx tsx scripts/copies-epinglees.ts > rapport.md
import { readdirSync, readFileSync } from "node:fs";
import { agentUtilisateur, Telechargeur } from "../pipeline/sources";
import {
  etiquetteRecente,
  etiquettesDe,
  imageEpinglee,
  millesimeEpingle,
  millesimeRecent,
  versionPsl,
} from "./lib/copies";

const lire = (chemin: string) => readFileSync(chemin, "utf8");
const version = (JSON.parse(lire("package.json")) as { version: string }).version;
const telechargeur = new Telechargeur({
  agent: agentUtilisateur(version),
  tailleMax: 5 * 1024 * 1024,
  delaiMs: 60_000,
});
const texte = async (adresse: string): Promise<string> => {
  const r = await telechargeur.obtenir(adresse);
  if (r.statut !== 200) throw new Error(`HTTP ${r.statut} (${new URL(adresse).hostname})`);
  return r.corps.toString("utf8");
};

type Ligne = { nom: string; epinglee: string; recente: string; aRenouveler: boolean; geste: string };
const lignes: Ligne[] = [];
const erreurs: string[] = [];
/** An error's message, with its network cause when fetch gives one (« fetch failed » alone says nothing). */
const message = (e: unknown): string => {
  if (!(e instanceof Error)) return String(e);
  const cause = e.cause as { code?: unknown; message?: unknown } | undefined;
  const detail = typeof cause?.code === "string" ? cause.code : typeof cause?.message === "string" ? cause.message : "";
  return detail === "" ? e.message : `${e.message} (${detail})`;
};

try {
  const image = imageEpinglee(lire(".github/workflows/collecte.yml"));
  if (image === null) throw new Error("l'image épinglée du résolveur est introuvable dans collecte.yml");
  const etiquettes = etiquettesDe(
    JSON.parse(
      await texte(
        "https://hub.docker.com/v2/namespaces/cznic/repositories/knot-resolver/tags?page_size=50&ordering=last_updated",
      ),
    ),
  );
  const recente = etiquetteRecente(etiquettes, image.etiquette);
  if (recente === null) throw new Error("aucune étiquette datée de la même version majeure");
  lignes.push({
    nom: "Image de Knot Resolver (fiche 12)",
    epinglee: image.etiquette,
    recente: recente.nom,
    aRenouveler: recente.digest !== image.digest,
    geste:
      "remplacer l'empreinte et l'étiquette de RESOLVEUR dans .github/workflows/collecte.yml, par une PR avec son essai",
  });
} catch (e) {
  erreurs.push(`Image de Knot Resolver : ${message(e)}`);
}

try {
  const copie = readdirSync("referentiels/psl")
    .filter((f) => /^public_suffix_list-[0-9]{4}-[0-9]{2}-[0-9]{2}[.]dat$/.test(f))
    .sort()
    .at(-1);
  if (copie === undefined) throw new Error("aucune copie dans referentiels/psl");
  const epinglee = versionPsl(lire(`referentiels/psl/${copie}`));
  const recente = versionPsl(await texte("https://publicsuffix.org/list/public_suffix_list.dat"));
  if (epinglee === null || recente === null) throw new Error("ligne « VERSION » introuvable");
  lignes.push({
    nom: "Public Suffix List (fiche 42)",
    epinglee,
    recente,
    aRenouveler: recente !== epinglee,
    geste: "une nouvelle copie datée dans referentiels/psl/, par une PR avec son essai",
  });
} catch (e) {
  erreurs.push(`Public Suffix List : ${message(e)}`);
}

try {
  const sources = (JSON.parse(lire("referentiels/pays.json")) as { sources?: Record<string, unknown> }).sources ?? {};
  const epingle = millesimeEpingle(sources);
  const recent = millesimeRecent(
    JSON.parse(await texte("https://www.data.gouv.fr/api/1/datasets/58c984b088ee386cdb1261f3/")),
  );
  if (epingle === null || recent === null) throw new Error("millésime introuvable");
  lignes.push({
    nom: "COG de l'INSEE, pays et territoires (fiche 48)",
    epinglee: String(epingle),
    recente: String(recent),
    aRenouveler: recent > epingle,
    geste: "relire le nouveau millésime, puis referentiels/pays.json et la fiche 48, par une PR",
  });
} catch (e) {
  erreurs.push(`COG de l'INSEE : ${message(e)}`);
}

const aRenouveler = lignes.filter((l) => l.aRenouveler);
const sortie = [
  "## Les copies épinglées",
  "",
  "| Copie | Épinglée | La plus récente | À renouveler |",
  "|---|---|---|---|",
  ...lignes.map((l) => `| ${l.nom} | ${l.epinglee} | ${l.recente} | ${l.aRenouveler ? "**oui**" : "non"} |`),
  "",
  ...(aRenouveler.length === 0 ? ["Toutes les copies lues sont à jour."] : ["Le geste, pour chacune :"]),
  ...aRenouveler.map((l) => `- ${l.nom} : ${l.geste}.`),
  ...(erreurs.length === 0 ? [] : ["", "Lectures impossibles :", ...erreurs.map((e) => `- ${e}`)]),
];
console.log(sortie.join("\n"));
process.exitCode = erreurs.length > 0 ? 1 : aRenouveler.length > 0 ? 3 : 0;
