import Link from "next/link";
import { fr } from "@/lib/i18n/fr";
import { origineDuSite } from "@/lib/site";

export type Miette = { nom: string; chemin: string };

/**
 * The breadcrumb (D.7): visible, from the Atlas to the page, and its structured data (schema.org BreadcrumbList, with
 * absolute addresses from the configured origin). The data are JSON in a script that is never executed, its « < »
 * escaped as Next.js's documentation advises, so that no name can close the script.
 */
export function FilAriane({ miettes }: { miettes: readonly Miette[] }) {
  const tout: Miette[] = [{ nom: fr.coque.navigation.atlas, chemin: "/" }, ...miettes];
  const origine = origineDuSite();
  const donnees = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: tout.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.nom,
      item: `${origine}${m.chemin}`,
    })),
  };
  return (
    <nav className="fil-ariane" aria-label={fr.coque.filAriane}>
      <ol>
        {tout.map((m, i) => (
          <li key={m.chemin}>
            {i === tout.length - 1 ? (
              <span aria-current="page">{m.nom}</span>
            ) : (
              <Link href={m.chemin} prefetch={false}>
                {m.nom}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(donnees).replace(/</g, "\\u003c") }}
      />
    </nav>
  );
}
