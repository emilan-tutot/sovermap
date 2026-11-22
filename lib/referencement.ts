// The foundations of search-engine indexing (D.7; docs/referencement.md): the robots rule of a page, the sitemaps and
// the site's structured data. Pure: the pages, the sitemap routes and the tests share it.
import type { Metadata } from "next";
import { fr } from "@/lib/i18n/fr";
import { donneesOuvertes } from "@/lib/i18n/fr-donnees";
import { indexingOpen } from "@/lib/site";

type Env = Readonly<Record<string, string | undefined>>;

/**
 * The robots rule of a page: closed to every engine until indexing opens (SITE_INDEXING=open behind an open door);
 * then « index, follow » for a page the indexing policy lists, « noindex, follow » for the others, whose links are
 * still followed (docs/referencement.md).
 */
export function robotsDe(indexable: boolean, env: Env = process.env): { index: boolean; follow: boolean } {
  const ouvert = indexingOpen(env);
  return { index: ouvert && indexable, follow: ouvert };
}

/** At most 50,000 addresses a sitemap (the sitemaps protocol; Google's documentation, read on 22/11/2026). */
export const ADRESSES_PAR_PLAN = 50_000;

/** The sitemaps the index lists, by their paths (spec.md, EX-26). */
export const PLANS = ["/plans/pages.xml", "/plans/radiographies.xml"] as const;

/** The sitemaps are shared an hour by the CDN, and served stale a day while they are read again (D.4). */
export const CACHE_PLANS = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

const ENTETE = '<?xml version="1.0" encoding="UTF-8"?>';
const ESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9";
const echapper = (texte: string) =>
  texte
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** The empty sitemap: /sitemap.xml while the site is closed to indexing (lib/porte.ts expects it, door closed). */
export const PLAN_VIDE = `${ENTETE}\n<urlset xmlns="${ESPACE}">\n</urlset>\n`;

/** The index of the sitemaps, by their absolute addresses. */
export function indexDesPlans(origine: string): string {
  const lignes = PLANS.map((chemin) => `<sitemap><loc>${echapper(`${origine}${chemin}`)}</loc></sitemap>`);
  return `${ENTETE}\n<sitemapindex xmlns="${ESPACE}">\n${lignes.join("\n")}\n</sitemapindex>\n`;
}

/** A page of a sitemap: its path, and the day of its last confirmed change when the data give it (YYYY-MM-DD). */
export type AdressePlan = { chemin: string; date?: string };

/** A sitemap: the pages by their absolute canonical addresses, 50,000 at most (the route says when it cuts). */
export function plan(origine: string, adresses: readonly AdressePlan[]): string {
  const lignes = adresses.slice(0, ADRESSES_PAR_PLAN).map(({ chemin, date }) => {
    const jour = date !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `<lastmod>${date}</lastmod>` : "";
    return `<url><loc>${echapper(`${origine}${chemin}`)}</loc>${jour}</url>`;
  });
  return `${ENTETE}\n<urlset xmlns="${ESPACE}">\n${lignes.join("\n")}\n</urlset>\n`;
}

/** The kinds of page that have a share image (public/partage/<type>.png, drawn by scripts/design/partage.ts). */
export const TYPES_PARTAGE = ["accueil", "radiographie", "ministere", "societe", "pays"] as const;
export type TypePartage = (typeof TYPES_PARTAGE)[number];

/** A page's Open Graph data (D.7): its title and description, and the share image of its kind, a fixed file. */
export function partageDe(type: TypePartage, titre: string, description: string): NonNullable<Metadata["openGraph"]> {
  const t = fr.partage[type];
  return {
    type: "website",
    siteName: fr.site.name,
    locale: "fr_FR",
    title: titre,
    description,
    images: [{ url: `/partage/${type}.png`, width: 1200, height: 630, alt: fr.partage.alt(t.etiquette, t.question) }],
  };
}

/**
 * The open data's structured data (schema.org Dataset, for Google Dataset Search; D.7): its name, its description, its
 * page, its licence, the day it was last published and its CSV files, as the text of a script that is never executed.
 */
export function jsonLdDataset(
  origine: string,
  date: string,
  fichiers: readonly { fichier: string; adresse: string }[],
): string {
  const donnees = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: donneesOuvertes.jeu,
    description: donneesOuvertes.description,
    url: `${origine}/donnees`,
    license: "https://www.etalab.gouv.fr/licence-ouverte-open-licence/",
    isAccessibleForFree: true,
    dateModified: date,
    spatialCoverage: "France",
    distribution: fichiers.map((f) => ({ "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: f.adresse })),
  };
  return JSON.stringify(donnees).replace(/</g, "\\u003c");
}

/** The metadata of a text page (part E): its title, its description, its canonical address and the Atlas's image. */
export function metadonneesTexte(page: { chemin: string; titre: string; description: string }): Metadata {
  return {
    title: page.titre,
    description: page.description,
    alternates: { canonical: page.chemin },
    openGraph: partageDe("accueil", fr.meta.titre(page.titre), page.description),
  };
}

/**
 * The site's structured data (schema.org WebSite: its name and its home page, which Google reads on the home page for
 * the site's name), as the text of a script that is never executed: JSON whose « < » can never close the script.
 */
export function jsonLdSite(origine: string): string {
  const donnees = { "@context": "https://schema.org", "@type": "WebSite", name: fr.site.name, url: `${origine}/` };
  return JSON.stringify(donnees).replace(/</g, "\\u003c");
}
