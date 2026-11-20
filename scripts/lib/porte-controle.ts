// What a closed production door must answer at each address of lib/porte.ts (brief of chantier 2, A.6). One pure
// function, shared by `npm run probe:prod` (the production, from outside) and the e2e tests (the local build), so that
// both ask the same addresses and expect the same answers.
import { fr } from "../../lib/i18n/fr";
import type { AdressePorte } from "../../lib/porte";

export type Reponse = { status: number; contentType: string; texte: string };

/**
 * Signs of Sovermap data. None may ever appear behind a closed door, written plainly, as HTML entities (checked on the
 * decoded text) or escaped inside a string of Next.js' page payload (\"statut\":).
 */
export const SIGNES_DE_DONNEES: readonly RegExp[] = [
  /raw\.githubusercontent\.com/i,
  /etat\.json/i,
  /donnees-courant/i,
  /\\?"statut\\?"\s*:/i,
];

/** The few entities React or a server may write in HTML, decoded, to compare texts as a reader sees them. */
export function texteLisible(html: string): string {
  return html
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/&#x27;|&#39;|&apos;/gi, "'")
    .replace(/&quot;|&#34;|&#x22;/gi, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

const estHtml = (r: Reponse) => /text\/html/i.test(r.contentType);

/** The problems of one answer, in French; an empty list when the closed door answers as it must. */
export function ecartsPorte(adresse: AdressePorte, reponse: Reponse): string[] {
  const ecarts: string[] = [];
  const ou =
    adresse.entetes === undefined ? adresse.chemin : `${adresse.chemin} (${Object.keys(adresse.entetes).join(", ")})`;
  const texte = texteLisible(reponse.texte);
  const statut = (attendu: number) => {
    if (reponse.status !== attendu) ecarts.push(`${ou} répond ${reponse.status}, pas ${attendu}`);
  };
  switch (adresse.attendu) {
    case "attente":
      statut(200);
      if (!estHtml(reponse)) ecarts.push(`${ou} n'est pas une page HTML`);
      for (const attendu of [fr.site.question, fr.attente.title, fr.attente.status]) {
        if (!texte.includes(attendu)) ecarts.push(`${ou} : la page d'attente ne dit pas « ${attendu} »`);
      }
      if (!/<link rel="icon" href="\/icon\.svg"/.test(reponse.texte))
        ecarts.push(`${ou} : l'icône de la page d'attente manque`);
      break;
    case "attente-rsc":
      statut(200);
      if (!/text\/x-component/i.test(reponse.contentType))
        ecarts.push(`${ou} n'est pas une réponse de navigation interne`);
      if (!reponse.texte.includes(fr.attente.status)) ecarts.push(`${ou} : ce n'est pas la page d'attente`);
      break;
    case "robots-ferme":
      statut(200);
      if (!/^Disallow:\s*\/\s*$/m.test(texte)) ecarts.push(`${ou} n'interdit pas tout`);
      if (/^Allow:/im.test(texte)) ecarts.push(`${ou} autorise une adresse`);
      break;
    case "plan-vide":
      statut(200);
      if (/<url>|<sitemap>/i.test(texte)) ecarts.push(`${ou} n'est pas vide`);
      break;
    case "fichier":
      statut(200);
      if (estHtml(reponse)) ecarts.push(`${ou} répond une page HTML, pas son fichier`);
      break;
    case "introuvable":
      statut(404);
      if (estHtml(reponse) && !texte.includes(fr.notFound.title))
        ecarts.push(`${ou} : ce n'est pas la page 404 du site`);
      break;
    case "refusee":
      if (reponse.status < 400 || reponse.status > 499)
        ecarts.push(`${ou} répond ${reponse.status}, pas un refus (4xx)`);
      if (/^image\//i.test(reponse.contentType)) ecarts.push(`${ou} sert une image`);
      break;
    default: {
      const jamais: never = adresse.attendu;
      ecarts.push(`${ou} : réponse attendue inconnue (${String(jamais)})`);
    }
  }
  for (const signe of SIGNES_DE_DONNEES) {
    if (signe.test(reponse.texte) || signe.test(texte))
      ecarts.push(`${ou} montre un signe de données (${signe.source})`);
  }
  return ecarts;
}
