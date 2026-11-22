import Link from "next/link";
import type { ReactNode } from "react";
import { fr } from "@/lib/i18n/fr";
import { servedVersion } from "@/lib/site";

/**
 * The shell of every page (DESIGN.md §9): a skip link, the header with the wordmark, the content, the footer with the
 * served version. The navigation of the site (Atlas, Ministères, Sociétés, Journal, Méthode, Données, FR · EN) joins
 * the header when its pages exist: until the launch, production shows only the waiting page.
 */
export function Coque({ children, large = false }: { children: ReactNode; large?: boolean }) {
  return (
    <div className="coque">
      <a className="evitement" href="#contenu">
        {fr.coque.evitement}
      </a>
      <header className="entete">
        <Link className="logo" href="/" aria-label={fr.coque.logo} prefetch={false}>
          {fr.site.name}
        </Link>
      </header>
      <main id="contenu" className={large ? "contenu contenu-large" : "contenu"}>
        {children}
      </main>
      <footer className="pied">
        <p>
          {fr.footer.version} <span className="valeur">{servedVersion()}</span>
        </p>
        <p>{fr.footer.independent}</p>
      </footer>
    </div>
  );
}
